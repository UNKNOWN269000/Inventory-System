import { useEffect, useMemo, useState } from "react";
import {
  IconArrow,
  IconCheck,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconFingerprint,
  IconLayoutGrid,
  IconLock,
  IconUser,
  IconWhatsapp,
  IconX,
} from "./Icons";
import { cn } from "../utils/cn";
import logoUrl from "../logo.png";
import { LOGIN_WEBHOOK_URL, SIGNUP_WEBHOOK_URL } from "../config";
import {
  clearRememberedUser,
  getRememberedUser,
  isBiometricSupported,
  setRememberedUser,
  verifyBiometric,
  type RememberedUser,
} from "../utils/biometric";

type GateState =
  | { kind: "open" }
  | { kind: "locked"; user: RememberedUser }
  | { kind: "verifying"; user: RememberedUser }
  | { kind: "error"; user: RememberedUser; message: string };

type Mode = "login" | "signup";

const SECTION_OPTIONS = [
  { value: "", label: "Select your section" },
  { value: "Extrusion", label: "Extrusion" },
  { value: "Mill Finish", label: "Mill Finish" },
  { value: "PowderCoat", label: "Powder Coat" },
  { value: "Anodizing", label: "Anodizing" },
];

interface FormState {
  name: string;
  username: string;
  section: string;
  password: string;
  confirmPassword: string;
  remember: boolean;
}

const initialState: FormState = {
  name: "",
  username: "",
  section: "",
  password: "",
  confirmPassword: "",
  remember: false,
};

// Strip special symbols (letters, digits, and spaces are allowed)
const USERNAME_PATTERN = /[^A-Za-z0-9\s]/g;

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  return score; // 0..5
}

const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
const strengthColor = [
  "bg-red-500",
  "bg-red-400",
  "bg-amber-400",
  "bg-yellow-300",
  "bg-[#00ff00]/70",
  "bg-[#00ff00]",
];

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<FormState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupPopup, setSignupPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState>({ kind: "open" });
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  // ── Biometric "Remember me" gate ───────────────────────
  // On mount, check localStorage. If a user is remembered, lock the
  // form behind a biometric prompt and auto-fill the username.
  useEffect(() => {
    setBiometricAvailable(isBiometricSupported());
    const remembered = getRememberedUser();
    if (remembered) {
      setGate({ kind: "locked", user: remembered });
    } else {
      setGate({ kind: "open" });
    }
  }, []);

  // Reset popup / error when mode flips
  useEffect(() => {
    setSignupPopup(false);
    setError(null);
  }, [mode]);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (signupPopup) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [signupPopup]);

  // Close on Escape
  useEffect(() => {
    if (!signupPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSignupPopup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupPopup]);

  const closeSignupPopup = () => {
    setSignupPopup(false);
    setForm(initialState);
    switchMode("login");
  };

  // Run the platform biometric prompt. On success, unlock the form
  // and pre-fill the username. On cancel/error, stay locked and show
  // a message so the user can try again or use a different account.
  const runBiometricCheck = async () => {
    if (gate.kind !== "locked") return;
    const user = gate.user;
    setGate({ kind: "verifying", user });

    const ok = await verifyBiometric();
    if (ok) {
      setForm((f) => ({ ...f, username: user.username, remember: true }));
      setGate({ kind: "open" });
    } else {
      setGate({
        kind: "error",
        user,
        message: "Verification cancelled or unavailable. Please try again.",
      });
    }
  };

  // Auto-prompt on mount when a user is remembered.
  useEffect(() => {
    if (gate.kind === "locked" && biometricAvailable) {
      runBiometricCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.kind, biometricAvailable]);

  const useDifferentAccount = () => {
    clearRememberedUser();
    setGate({ kind: "open" });
    setForm(initialState);
  };

  const handleChange = (
    key: keyof FormState
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === "checkbox" ? target.checked : target.value;

    // Username: strip special symbols (letters, digits, and spaces are allowed)
    if (key === "username" && typeof value === "string") {
      const cleaned = value.replace(USERNAME_PATTERN, "");
      setForm((f) => ({ ...f, username: cleaned }));
      return;
    }

    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Signup-only validation
    if (mode === "signup") {
      if (!form.section) {
        setFocused("section");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setFocused("confirmPassword");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        // ── SIGN UP: doPost ─────────────────────────────────────
        // The script appends [Date, Name, Username, Password, Role, "Pending"]
        const payload = {
          name: form.name,
          username: form.username,
          password: form.password,
          role: form.section, // Section dropdown value → "Role" column
        };

        // Fire the request in the background — we don't wait for it.
        // The popup opens immediately so the user always sees
        // "Request sent to Admin Successfully" on click.
        fetch(SIGNUP_WEBHOOK_URL, {
          method: "POST",
          // text/plain avoids a CORS preflight (Apps Script can't reply to OPTIONS)
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          redirect: "follow",
        }).catch(() => {
          // Silently swallow — the request is fire-and-forget.
        });

        // Tiny delay so the button shows "Sending…" briefly, then popup
        setTimeout(() => {
          setLoading(false);
          setSignupPopup(true);
        }, 400);
      } else {
        // ── SIGN IN: doGet ──────────────────────────────────────
        // The script reads ?username=&password= and returns
        //   { status: "success", link: <Column F> }   on success
        //   { status: "error",   message: <reason> }  on failure
        const params = new URLSearchParams({
          username: form.username,
          password: form.password,
        });

        const res = await fetch(`${LOGIN_WEBHOOK_URL}?${params.toString()}`, {
          method: "GET",
          redirect: "follow",
        });

        const result = await res.json().catch(() => ({} as any));

        if (res.ok && result.status === "success") {
          setLoading(false);
          // If "Remember me" is checked, persist this user so future
          // visits are gated by biometric verification.
          if (form.remember) {
            setRememberedUser(form.username);
          } else {
            clearRememberedUser();
          }
          // Optional: redirect to the link returned in Column F
          if (result.link && typeof result.link === "string" && /^https?:\/\//.test(result.link)) {
            // Uncomment to auto-redirect:
            // window.location.href = result.link;
          }
        } else {
          throw new Error(result.message || "Invalid username or password");
        }
      }
    } catch (err) {
      setLoading(false);
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(msg);
    }
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setForm(initialState);
    setMode(m);
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-black text-white lg:min-h-0">
      {/* ── Biometric "Remember me" gate ─────────────────────── */}
      {gate.kind !== "open" && (
        <BiometricGate
          state={gate}
          onVerify={runBiometricCheck}
          onUseDifferent={useDifferentAccount}
        />
      )}

      {/* Background accents for mobile / form side */}
      <div
        className="pointer-events-none absolute -left-24 -top-12 h-56 w-56 rounded-full opacity-25 blur-[80px] sm:h-72 sm:w-72 sm:blur-[100px] lg:-left-32"
        style={{ background: "#00ff00" }}
      />
      <div
        className="pointer-events-none absolute -right-24 -bottom-12 h-64 w-64 rounded-full opacity-15 blur-[90px] sm:h-80 sm:w-80 sm:blur-[120px] lg:-right-32"
        style={{ background: "#00ff00" }}
      />
      <div className="absolute inset-0 grid-bg opacity-15 sm:opacity-20" />

      {/* Top bar (mobile logo) */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2 sm:px-8 sm:pt-6 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-[#00ff00] blur-md opacity-60" />
            <img
              src={logoUrl}
              alt="Ultra Aluminum Pvt Ltd logo"
              className="relative h-9 w-9 rounded-full border-2 border-[#00ff00] object-cover shadow-[0_0_20px_rgba(0,255,0,0.5)] sm:h-10 sm:w-10"
            />
          </div>
          <span className="truncate text-base font-bold tracking-tight sm:text-lg">
            Ultra Aluminum
          </span>
        </div>
      </div>

      {/* Center form */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-6 sm:px-8 sm:py-8">
        <div className="w-full max-w-md">
          {/* Mode toggle pill */}
          <div className="animate-slide-up mb-6 flex justify-center sm:mb-8">
            <div
              className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-sm"
              role="tablist"
            >
              {/* Animated background slider */}
              <div
                className={cn(
                  "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#00ff00] shadow-[0_0_20px_rgba(0,255,0,0.4)] transition-transform duration-500 ease-out",
                  mode === "login" ? "translate-x-[2px]" : "translate-x-[calc(100%+2px)]"
                )}
              />
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={cn(
                  "relative z-10 min-w-[110px] rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 sm:min-w-[120px] sm:px-6",
                  mode === "login" ? "text-black" : "text-white/60 hover:text-white"
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={cn(
                  "relative z-10 min-w-[110px] rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-300 sm:min-w-[120px] sm:px-6",
                  mode === "signup" ? "text-black" : "text-white/60 hover:text-white"
                )}
              >
                Sign up
              </button>
            </div>
          </div>

          {/* Heading */}
          <div className="animate-slide-up mb-6 text-center sm:mb-8" key={mode + "-heading"}>
            <h2 className="text-[1.65rem] font-bold leading-tight tracking-tight sm:text-4xl">
              {mode === "login" ? "Member Sign In" : "Create Account"}
            </h2>
            <p className="mt-2 px-2 text-sm text-white/50 sm:px-0">
              {mode === "login"
                ? "Access your Ultra Aluminum partner & order portal"
                : "Register to request quotes, track orders, and more"}
            </p>
          </div>

          {/* Divider */}
          <div className="animate-slide-up mb-6 flex items-center gap-3 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <span className="whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.18em] text-white/50 sm:text-[11px] sm:tracking-[0.2em]">
              continue with username
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" key={mode + "-form"}>
            {/* Full Name (signup only) */}
            {mode === "signup" && (
              <div className="animate-slide-up">
                <Field
                  id="name"
                  label="Full Name"
                  icon={<IconUser className="h-4 w-4" />}
                  focused={focused === "name"}
                >
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange("name")}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    placeholder="Alex Carter"
                    autoComplete="name"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/30 outline-none"
                  />
                </Field>
              </div>
            )}

            {/* Section (signup only) */}
            {mode === "signup" && (
              <div className="animate-slide-up">
                <SelectField
                  id="section"
                  label="Section"
                  icon={<IconLayoutGrid className="h-4 w-4" />}
                  focused={focused === "section"}
                  value={form.section}
                  onChange={handleChange("section")}
                  onFocus={() => setFocused("section")}
                  onBlur={() => setFocused(null)}
                  options={SECTION_OPTIONS}
                  required
                />
              </div>
            )}

            {/* Username */}
            <div className="animate-slide-up">
              <Field
                id="username"
                label="Username"
                icon={<IconUser className="h-4 w-4" />}
                focused={focused === "username"}
              >
                <input
                  id="username"
                  type="text"
                  required
                  value={form.username}
                  onChange={handleChange("username")}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  placeholder="alex_Carter"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder-white/30 outline-none"
                />
              </Field>
            </div>

            {/* Password */}
            <div className="animate-slide-up">
              <Field
                id="password"
                label="Password"
                icon={<IconLock className="h-4 w-4" />}
                focused={focused === "password"}
                right={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="mr-2 rounded p-1.5 text-white/40 transition hover:text-[#00ff00]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                }
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={handleChange("password")}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={mode === "login" ? "go" : "next"}
                  className="w-full bg-transparent pl-11 pr-12 py-3.5 text-sm text-white placeholder-white/30 outline-none"
                />
              </Field>

              {/* Password strength (signup only) */}
              {mode === "signup" && form.password.length > 0 && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Password strength</span>
                    <span
                      className={cn(
                        "font-semibold",
                        strength >= 4 ? "text-[#00ff00]" : strength >= 2 ? "text-amber-400" : "text-red-400"
                      )}
                    >
                      {strengthLabel[strength]}
                    </span>
                  </div>
                  <div className="flex h-1.5 gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-full flex-1 rounded-full transition-all duration-300",
                          i < strength
                            ? strengthColor[strength]
                            : "bg-white/10"
                        )}
                      />
                    ))}
                  </div>
                  <ul className="grid grid-cols-1 gap-1.5 pt-1 text-[11px] text-white/40 sm:grid-cols-2">
                    <Req met={form.password.length >= 8} label="8+ characters" />
                    <Req met={/[A-Z]/.test(form.password)} label="Uppercase letter" />
                    <Req met={/[0-9]/.test(form.password)} label="Number" />
                    <Req met={/[^A-Za-z0-9]/.test(form.password)} label="Special char" />
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password (signup only) */}
            {mode === "signup" && (
              <div className="animate-slide-up">
                <Field
                  id="confirmPassword"
                  label="Confirm password"
                  icon={<IconLock className="h-4 w-4" />}
                  focused={focused === "confirmPassword"}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="mr-2 rounded p-1.5 text-white/40 transition hover:text-[#00ff00]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <IconEyeOff className="h-4 w-4" />
                      ) : (
                        <IconEye className="h-4 w-4" />
                      )}
                    </button>
                  }
                >
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    onFocus={() => setFocused("confirmPassword")}
                    onBlur={() => setFocused(null)}
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="done"
                    className="w-full bg-transparent pl-11 pr-12 py-3.5 text-sm text-white placeholder-white/30 outline-none"
                  />
                </Field>

                {/* Match indicator */}
                {form.confirmPassword.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] animate-fade-in">
                    {form.password === form.confirmPassword ? (
                      <>
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00ff00]/20 text-[#00ff00]">
                          <IconCheck className="h-2.5 w-2.5" strokeWidth={4} />
                        </span>
                        <span className="text-[#00ff00]">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                          <span className="block h-1.5 w-1.5 rounded-full bg-red-400" />
                        </span>
                        <span className="text-red-400">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Remember / Forgot (login) */}
            {mode === "login" && (
              <div className="flex flex-col-reverse items-start gap-2 pt-1 text-sm animate-slide-up sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <Checkbox
                  checked={form.remember}
                  onChange={handleChange("remember")}
                  label="Remember me"
                />
                <a
                  href="#"
                  className="font-medium text-white/50 transition hover:text-[#00ff00]"
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="animate-fade-in flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
              >
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                  !
                </span>
                <span className="flex-1 leading-relaxed">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-300/60 transition hover:text-red-300"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#00ff00] text-sm font-bold text-black transition-all duration-300",
                "hover:shadow-[0_0_30px_rgba(0,255,0,0.5)] hover:bg-[#1aff1a]",
                "active:scale-[0.98]",
                loading && "cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                )}
              />
              {loading ? (
                <>
                  <Spinner />
                  <span>{mode === "login" ? "Signing you in…" : "Sending request…"}</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

          </form>

          {/* Switch link */}
          <p className="mt-8 text-center text-sm text-white/50 animate-slide-up">
              {mode === "login" ? "New to Ultra Aluminum?" : "Already a member?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-[#00ff00] transition hover:underline"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
            </p>
        </div>
      </div>

      {/* ── Signup Success Popup ─────────────────────────── */}
      {signupPopup && (
        <SignupSuccessPopup onClose={closeSignupPopup} />
      )}
    </div>
  );
}

/* ---------- Signup Success Popup ---------- */

const ADMIN_WHATSAPP_NUMBER = "94759825269";
const ADMIN_WHATSAPP_MESSAGE =
  encodeURIComponent(
    "Hello Admin, I just submitted a new account request on the Ultra Aluminum portal. Please review and approve. Thank you."
  );
const ADMIN_WHATSAPP_URL = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${ADMIN_WHATSAPP_MESSAGE}`;

function SignupSuccessPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-success-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="safe-pad relative z-10 w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900 to-black shadow-[0_0_60px_rgba(0,255,0,0.15)]">
        {/* Top glow */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-50 blur-3xl"
          style={{ background: "#00ff00" }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-white/20 hover:text-white"
        >
          <IconX className="h-4 w-4" />
        </button>

        <div className="relative px-5 pt-10 pb-6 text-center sm:px-7 sm:pb-7">
          {/* Success icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#00ff00] bg-[#00ff00]/10 pulse-glow">
            <IconCheck className="h-8 w-8 text-[#00ff00]" strokeWidth={3} />
          </div>

          <h3
            id="signup-success-title"
            className="text-xl font-bold tracking-tight text-white sm:text-2xl"
          >
            Request sent to Admin
            <br />
            <span className="text-[#00ff00]">Successfully</span>
          </h3>

          {/* Admin WhatsApp button (with phone number) */}
          <a
            href={ADMIN_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] text-sm font-bold text-white transition-all hover:bg-[#1ebe5b] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)] active:scale-[0.98]"
          >
            <IconWhatsapp className="h-5 w-5" />
            <span>Admin = WhatsApp</span>
            <span className="hidden sm:inline">· +94759825269</span>
          </a>

          {/* To Login button */}
          <button
            type="button"
            onClick={onClose}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#00ff00]/40 bg-[#00ff00]/5 text-sm font-semibold text-[#00ff00] transition-all hover:border-[#00ff00] hover:bg-[#00ff00]/10 active:scale-[0.98]"
          >
            <span>To Login</span>
            <IconArrow className="h-4 w-4" />
          </button>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            Press Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Biometric "Remember me" Gate ---------- */

function BiometricGate({
  state,
  onVerify,
  onUseDifferent,
}: {
  state: Extract<GateState, { kind: "locked" | "verifying" | "error" }>;
  onVerify: () => void;
  onUseDifferent: () => void;
}) {
  const verifying = state.kind === "verifying";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="biometric-gate-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

      {/* Aurora accent */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[100px]"
        style={{ background: "#00ff00" }}
      />

      {/* Card */}
      <div className="safe-pad relative z-10 w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900 to-black p-6 text-center shadow-[0_0_60px_rgba(0,255,0,0.15)] sm:p-8">
        {/* Top brand row */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00ff00] blur-md opacity-60" />
            <img
              src={logoUrl}
              alt="Ultra Aluminum logo"
              className="relative h-9 w-9 rounded-full border-2 border-[#00ff00] object-cover shadow-[0_0_20px_rgba(0,255,0,0.5)]"
            />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Ultra Aluminum
          </span>
        </div>

        {/* Fingerprint ring */}
        <div className="relative mx-auto mb-6 h-28 w-28">
          {/* Pulsing rings */}
          <div
            className={cn(
              "absolute inset-0 rounded-full border border-[#00ff00]/40",
              verifying && "animate-ping"
            )}
          />
          <div
            className={cn(
              "absolute inset-3 rounded-full border border-[#00ff00]/30",
              verifying && "animate-pulse"
            )}
          />
          {/* Icon */}
          <div
            className={cn(
              "absolute inset-6 flex items-center justify-center rounded-full border-2 border-[#00ff00] bg-[#00ff00]/10 transition-all",
              verifying && "pulse-glow"
            )}
          >
            <IconFingerprint
              className={cn(
                "h-9 w-9 text-[#00ff00] transition-transform",
                verifying && "scale-110"
              )}
            />
          </div>
        </div>

        <h2
          id="biometric-gate-title"
          className="text-xl font-bold tracking-tight text-white sm:text-2xl"
        >
          {verifying ? "Verifying…" : "Welcome back"}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {verifying ? (
            <>Confirm with your fingerprint or face to continue.</>
          ) : (
            <>
              Sign in as <span className="font-semibold text-white">{state.user.username}</span>
              <br />
              Verify with your device to unlock the form.
            </>
          )}
        </p>

        {/* Error message */}
        {state.kind === "error" && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 animate-fade-in">
            {state.message}
          </p>
        )}

        {/* Verify button */}
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying}
          className={cn(
            "mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#00ff00] text-sm font-bold text-black transition-all",
            "hover:shadow-[0_0_30px_rgba(0,255,0,0.5)] hover:bg-[#1aff1a]",
            "active:scale-[0.98]",
            verifying && "cursor-not-allowed opacity-80"
          )}
        >
          {verifying ? (
            <>
              <Spinner />
              <span>Verifying…</span>
            </>
          ) : (
            <>
              <IconFingerprint className="h-5 w-5" />
              <span>{state.kind === "error" ? "Try again" : "Verify & continue"}</span>
            </>
          )}
        </button>

        {/* Use a different account */}
        <button
          type="button"
          onClick={onUseDifferent}
          disabled={verifying}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-xl text-xs font-medium text-white/50 transition hover:text-[#00ff00] disabled:opacity-50"
        >
          Use a different account
        </button>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
          Secured by your device
        </p>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function SelectField({
  id,
  label,
  icon,
  focused,
  value,
  onChange,
  onFocus,
  onBlur,
  options,
  required,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  focused: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="ml-1 block text-xs font-medium uppercase tracking-wider text-white/50"
      >
        {label}
      </label>
      <div
        className={cn(
          "group relative flex items-center rounded-xl border bg-white/[0.03] backdrop-blur-sm transition-all duration-300",
          focused
            ? "border-[#00ff00]/60 bg-[#00ff00]/[0.04] shadow-[0_0_0_4px_rgba(0,255,0,0.08)]"
            : value
            ? "border-white/20"
            : "border-white/10 hover:border-white/20"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors",
            focused ? "text-[#00ff00]" : "text-white/40"
          )}
        >
          {icon}
        </div>
        <select
          id={id}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(
            "w-full appearance-none bg-transparent pl-11 pr-10 py-3.5 text-sm outline-none",
            value ? "text-white" : "text-white/30"
          )}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.value === ""}
              className="bg-neutral-900 text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div
          className={cn(
            "pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors",
            focused ? "text-[#00ff00]" : "text-white/40"
          )}
        >
          <IconChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  focused,
  right,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  focused: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="ml-1 block text-xs font-medium uppercase tracking-wider text-white/50"
      >
        {label}
      </label>
      <div
        className={cn(
          "group relative flex items-center rounded-xl border bg-white/[0.03] backdrop-blur-sm transition-all duration-300",
          focused
            ? "border-[#00ff00]/60 bg-[#00ff00]/[0.04] shadow-[0_0_0_4px_rgba(0,255,0,0.08)]"
            : "border-white/10 hover:border-white/20"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors",
            focused ? "text-[#00ff00]" : "text-white/40"
          )}
        >
          {icon}
        </div>
        <div className="flex-1">{children}</div>
        {right}
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-white/60 select-none hover:text-white/80">
      <span className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={cn(
            "block h-4 w-4 rounded border transition-all duration-200",
            checked
              ? "border-[#00ff00] bg-[#00ff00]"
              : "border-white/20 bg-white/5 peer-hover:border-white/40"
          )}
        />
        <IconCheck
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-black transition-all duration-200",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
          strokeWidth={3.5}
        />
      </span>
      <span className="text-xs">{label}</span>
    </label>
  );
}

function Req({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors duration-200",
        met ? "text-[#00ff00]" : "text-white/40"
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all",
          met ? "border-[#00ff00] bg-[#00ff00]/20" : "border-white/20"
        )}
      >
        {met && <IconCheck className="h-2.5 w-2.5" strokeWidth={4} />}
      </span>
      {label}
    </li>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
    >
      <circle cx="12" cy="12" r="9" strokeOpacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}
