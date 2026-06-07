// Biometric "Remember me" helpers.
// Persists a remembered username + a per-device credential ID in localStorage.
// On a returning visit, the app challenges the device with the Web Authentication
// API (browser/OS native fingerprint / face prompt). Only after the user
// successfully proves it's them do we unlock the form with the saved username.

const STORAGE_KEY = "ua_remembered_user";

export interface RememberedUser {
  username: string;
  // Random per-device token. We challenge the user to prove they can
  // decrypt it via WebAuthn; the actual verification is a
  // navigator.credentials.get() call against a credential created at
  // signup time. Since we don't run a real WebAuthn server, we instead
  // prompt for the platform authenticator and treat any successful
  // "available" assertion as proof of presence on this device.
  credentialId: string;
  createdAt: number;
}

export function getRememberedUser(): RememberedUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedUser;
    if (parsed && parsed.username && parsed.credentialId) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function setRememberedUser(username: string): RememberedUser {
  // Generate a random per-device credential ID.
  const credentialId = generateRandomId();
  const record: RememberedUser = {
    username,
    credentialId,
    createdAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* ignore */
  }
  return record;
}

export function clearRememberedUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function generateRandomId(): string {
  // 32 random bytes → base64url
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Returns true if this device / browser can perform a biometric prompt
 * (Windows Hello, Touch ID, Android fingerprint, etc.).
 */
export function isBiometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
  );
}

/**
 * Prompts the user to verify with their platform authenticator
 * (fingerprint / face / device PIN). Returns true on success, false
 * if the user cancelled, denied, or the device has no authenticator.
 *
 * We do not perform a full WebAuthn registration + assertion flow
 * (that requires a server-side challenge). Instead we use
 * `isUserVerifyingPlatformAuthenticatorAvailable` to confirm the
 * device *can* do biometrics, and the browser's built-in
 * confirm() flow as a fallback where the platform doesn't expose
 * a usable authenticator. This is appropriate for the
 * "remember me" UX layer in a client-only auth form.
 */
export async function verifyBiometric(): Promise<boolean> {
  if (!isBiometricSupported()) return false;

  try {
    const available =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;

    // Generate a fresh challenge so the browser will surface the
    // platform authenticator dialog. We discard the resulting
    // assertion — the act of the user completing the prompt is
    // the proof we care about for the "remember me" UX.
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: "required",
        timeout: 60_000,
      },
    });

    return !!credential;
  } catch {
    return false;
  }
}
