# ArchMail — High-Performance Bulk Email Dispatcher & Bounce Tracker

<div align="center">

![ArchMail Banner](https://img.shields.io/badge/ArchMail-Email%20Dispatcher-179299?style=for-the-badge&logo=archlinux&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A powerful, high-throughput email dispatching engine designed for power users, marketing teams, and developers. Featuring multi-account round-robin rotation, real-time live inbox delivery verification, instant IMAP bounce detection, AI spam scoring, and interval pacing to protect sender reputation.

</div>

---

## 🌟 Key Features

- **Multi-Account Round-Robin Rotation**: Connect multiple Gmail, Google Workspace, Outlook, Amazon SES, or custom SMTP relays. ArchMail automatically rotates through active accounts to distribute sending limits and avoid mailbox throttling.
- **100% Client-Side Privacy Vault**: No credentials, SMTP passwords, or recipient contacts are stored on the server or in any database. Everything lives in the user's local browser memory and encrypted localStorage. Each visitor has their own completely isolated, private environment.
- **Real Inbox Delivery (No Fake Simulation)**: Direct SMTP handshake and TLS/SSL delivery via Nodemailer engine to ensure real deliverability to recipient inboxes. Optional Sandbox mode available for dry-run testing.
- **Interval Scheduler & Throttling**: Configure precise delays between messages (e.g. 2–15 seconds) with randomized jitter to emulate human behavior and keep your sender score high.
- **Bounce & Error Telemetry**: Real-time response tracking (SMTP 250 OK, 550 User Unknown, 535 Auth Failed) with latency calculations and live exportable event logs.
- **AI-Powered Spam Score & Optimization**: Integrated with Google Gemini to analyze subject lines and body copy, calculating spam probability scores and recommending trigger-word replacements before sending.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `bun`

### 1. Clone the repository

```bash
git clone https://github.com/AldersonVoid/archmail.git
cd archmail
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

Copy the example environment configuration:

```bash
cp .env.example .env
```

Edit `.env` to set your custom port, Gemini API key (optional), or Firebase credentials (optional).

### 4. Run the development server

```bash
npm run dev
```

The application will be live at `http://localhost:3000`.

### 5. Build for production

```bash
npm run build
npm start
```

---

## 🔐 Authentication Methods Explained

ArchMail supports two flexible authentication mechanisms:

### Method 1: Gmail App Password (Recommended for High Deliverability)
Gmail App Passwords bypass OAuth token expiration and consent screen restrictions, allowing high-throughput, persistent SMTP connections.

1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is turned **ON**.
3. Navigate to **App passwords** (or search "App passwords" in the top search bar).
4. Enter an application name (e.g., `ArchMail`) and click **Create**.
5. Copy the generated **16-character password** (e.g., `xxxx yyyy zzzz wwww`).
6. In ArchMail, open **Account Manager** &rarr; **Add Account** &rarr; Enter your Gmail address and paste the 16-character code into the **Password** field.

---

### Method 2: Firebase Google OAuth (1-Click Sign-in)

> **Note**: Firebase is strictly optional. If you use App Passwords or Custom SMTP, you do not need Firebase.

If you want users to sign in with Google in one click using OAuth, follow the setup instructions below.

#### Step-by-Step Firebase Connection Guide:

1. **Create a Firebase Project:**
   - Navigate to the [Firebase Console](https://console.firebase.google.com/).
   - Click **Add Project** and give your project a name (e.g., `archmail-auth`).
   - Choose whether to enable Google Analytics (optional) and click **Create Project**.

2. **Enable Google Authentication:**
   - In the left sidebar, go to **Build** &rarr; **Authentication**.
   - Click **Get Started**, then select the **Sign-in method** tab.
   - Choose **Google** from the provider list.
   - Toggle **Enable**, select a support email for your project, and click **Save**.

3. **Configure Authorized Domains:**
   - Under **Authentication** &rarr; **Settings** &rarr; **Authorized domains**.
   - Click **Add domain** and register:
     - `localhost` (added by default)
     - Your custom domain or server IP (e.g. `yourdomain.com` or `demo4.181883.xyz`).

4. **Register a Web App & Get API Keys:**
   - Go to **Project Settings** (gear icon in the top left) &rarr; **General**.
   - Under **Your apps**, click the **Web** icon (`</>`).
   - Enter an app nickname (e.g., `ArchMail Web`) and click **Register app**.
   - You will see a `firebaseConfig` snippet containing:
     - `apiKey`
     - `authDomain`
     - `projectId`
     - `storageBucket`
     - `messagingSenderId`
     - `appId`

5. **Add Keys to Your `.env` File:**
   Open or create `.env` in your project root and paste the values matching the template:

   ```env
   VITE_FIREBASE_API_KEY="AIzaSyYourActualApiKeyHere"
   VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project"
   VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
   VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"
   VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"
   ```

6. **Restart the Server:**
   Restart your dev or production server (`npm run build && npm start`) to apply the environment variables.

---

## 🛠️ Project Structure

```text
archmail/
├── src/
│   ├── components/         # UI components (Header, Accounts, Dispatcher, Logs)
│   ├── utils/
│   │   ├── firebaseConfig.ts # Environment-aware Firebase configuration loader
│   │   ├── gmailAuth.ts    # Google OAuth & token session manager
│   │   ├── smtpClient.ts   # Client-side SMTP API dispatch interface
│   │   └── spamAnalyzer.ts # AI spam heuristic & scoring engine
│   ├── App.tsx             # Main dashboard controller & multi-account state
│   └── main.tsx            # React application entry point
├── server.ts               # Express backend proxy for Nodemailer SMTP dispatch
├── vite.config.ts          # Vite build pipeline & server configuration
├── .env.example            # Environment variables template
├── firebase-config.example.json # Firebase schema configuration example
└── package.json            # Scripts & project dependencies
```

---

## 🛡️ Security & Privacy Notice

- **Zero Credentials on GitHub**: No sensitive API keys, OAuth secrets, or credentials are baked into the codebase.
- **Client-Side Only Storage**: All accounts added by users remain strictly inside their personal browser's `localStorage` (`archmail_client_vault_v1`). Other visitors visiting the same deployed instance cannot view, access, or use accounts added by someone else.
- **Direct Mail Delivery**: Emails are routed directly through your configured relay host (e.g., `smtp.gmail.com:465` or `587`) with end-to-end TLS encryption.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  Developed by <a href="https://github.com/AldersonVoid">AldersonVoid</a>
</div>
