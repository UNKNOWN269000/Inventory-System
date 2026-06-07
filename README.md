# Ultra Aluminum — Login & Signup Portal

A modern, dark-themed authentication portal for **Ultra Aluminum Pvt Ltd**, built with **React 19 + Vite 7 + Tailwind CSS v4** and wired to a Google Apps Script backend (signup + login + admin approval workflow).

**Color palette:** `#00ff00` (neon green) on a deep black background.

---

## ✨ Features

- 🔐 **Two-step signup** — full form (Full Name, Section dropdown, Username, Password, Confirm Password) + a success popup that opens immediately on submit
- 📲 **Admin WhatsApp handoff** — the success popup links the user straight to the admin's WhatsApp to expedite approval
- 🧠 **Biometric "Remember me"** — opt in once and the form is gated by your device's fingerprint / face on every return visit (uses the Web Authentication API)
- 🛡️ **No passwords leave the form silently** — the apps script handles the credentials row in the *login Passwords & Roles* sheet
- 🎨 **Polished UI** — animated aurora background, grid texture, password strength meter, password-match indicator, slide-up field stagger, scale-in modal, hover micro-interactions
- 📱 **Fully responsive** — split-screen on desktop, single column on mobile

---

## 🛠️ Tech stack

| Layer    | Tool                                       |
|----------|--------------------------------------------|
| UI       | React 19                                   |
| Bundler  | Vite 7 + `vite-plugin-singlefile`          |
| Styling  | Tailwind CSS v4 (via `@tailwindcss/vite`)  |
| Icons    | Custom inline SVGs (no icon library)       |
| Backend  | Google Apps Script Web App (POST + GET)    |
| Hosting  | Netlify (recommended)                      |
| Source   | GitHub                                     |

---

## 🚀 Deploy to Netlify from GitHub

You have two options. **Option A (recommended)** lets Netlify pick up every push to `main` and redeploy automatically.

### Option A — Connect the GitHub repo (continuous deploy)

1. **Push the project to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ultra-aluminum-portal.git
   git push -u origin main
   ```

2. **Create a Netlify site**
   - Go to https://app.netlify.com → **Add new site** → **Import an existing project**
   - Pick **GitHub** and authorize Netlify
   - Select the `ultra-aluminum-portal` repository

3. **Configure the build (most fields auto-fill from `netlify.toml`)**
   | Field          | Value           |
   |----------------|-----------------|
   | Branch         | `main`          |
   | Build command  | `npm run build` |
   | Publish dir    | `dist`          |
   | Node version   | `20`            |

4. Click **Deploy site**. The first build takes ~1 minute. Once it's done you'll get a `*.netlify.app` URL.

5. **Custom domain (optional)** — Site settings → Domain management → Add custom domain. Netlify auto-provisions HTTPS via Let's Encrypt.

### Option B — One-off drag-and-drop deploy

If you don't want to wire up GitHub:

```bash
npm install
npm run build
```

Then drag the `dist/` folder onto https://app.netlify.com/drop. Netlify will give you a temporary URL.

---

## 🧩 Google Apps Script backend

The portal talks to **two separate Google Apps Script Web App deployments**:

- **Signup URL** (`SIGNUP_WEBHOOK_URL`) → `doPost` → appends a new row to the sheet
- **Login URL** (`LOGIN_WEBHOOK_URL`) → `doGet` → looks up username + password in the sheet

The URLs live in **`src/config.ts`** — open that file and paste in your own `/exec` URLs after you've deployed each script:

```ts
export const SIGNUP_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycb.../exec";

export const LOGIN_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycb.../exec";
```

### Sheet layout — `login Passwords & Roles`

| A                | B (Name) | C (Username) | D (Password) | E (Role)    | F (Status / Link) |
|------------------|----------|--------------|--------------|-------------|-------------------|
| (auto: Date)     | Alex …   | alex_Carter  | ••••••••     | Extrusion   | Pending           |

- **A** is filled automatically by the script with `new Date()`.
- **F** defaults to `"Pending"` on signup. The admin can later replace it with a URL (e.g. a Google Drive link to a contract), and the login script returns it as `result.link` so the client can redirect on success.

### Deploying the scripts

1. Open https://sheets.google.com and create a sheet called **`login Passwords & Roles`** with the headers above in row 1.
2. In Google Drive → **New** → **More** → **Google Apps Script**.
3. Paste the two scripts you already have (`doPost` for signup, `doGet` + helpers for login).
4. **Deploy** → **New deployment** → type **Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Copy the `/exec` URL, paste it into `src/config.ts`, and redeploy.

> ⚠️ **CORS note** — the client sends POSTs as `Content-Type: text/plain;charset=utf-8` to avoid a CORS preflight, which Apps Script can't reply to. `e.postData.contents` still parses correctly in the script.

---

## 🧪 Local development

```bash
# Install deps
npm install

# Start the Vite dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

---

## 📁 Project structure

```
.
├── index.html                      # Vite entry HTML
├── netlify.toml                    # Netlify build + redirect config
├── public/
│   └── _redirects                  # SPA fallback (mirrors netlify.toml)
├── src/
│   ├── App.tsx                     # Split-screen shell
│   ├── main.tsx                    # React root
│   ├── index.css                   # Tailwind + custom animations
│   ├── config.ts                   # Webhook URLs (signup + login)
│   ├── logo.png                    # Company logo (circular crop)
│   ├── vite-env.d.ts               # Asset import types
│   ├── components/
│   │   ├── AuthForm.tsx            # Form + biometric gate + success popup
│   │   ├── BrandingPanel.tsx       # Left-side hero
│   │   └── Icons.tsx               # Inline SVG icon set
│   └── utils/
│       ├── cn.ts                   # Tailwind className merger
│       └── biometric.ts            # WebAuthn "Remember me" helpers
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔒 Security notes

- **Passwords are stored in plain text in the Google Sheet.** This is intentional for the demo / internal-use workflow but **must not** be used for any production / public-facing deployment. Hash + salt on the server side before storing.
- The `Remember me` feature uses the Web Authentication API and stores **only** the username + a per-device random token in `localStorage` — never the password.
- The Apps Script Web App is currently deployed with `Who has access: Anyone`. Restrict it to your organization once the prototype is finalized.

---

## 📜 License

Private — © 2026 Ultra Aluminum Pvt Ltd.
