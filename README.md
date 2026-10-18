# Hikmah Library and Study Lounge

> **Tagline:** *"Where Wisdom Meets Focus"*  
> **Architecture:** 100% Free-Forever Cloud Deployment (Cloudflare Pages + Firebase Spark Free Tier)  
> **Security:** Strict Role-Based Access Control, End-to-End Encrypted Member Chat, Audited Disciplinary 10-Warning System

---

## 🏛️ System Overview

**Hikmah Library & Study Lounge** is a production-grade, responsive, full-stack library management system engineered for quiet study lounges, academic libraries, and competitive exam centers. 

It provides an **Administrative Console** for the library management team and a separate **Member Self-Service Portal** for registered scholars, ensuring complete data isolation, privacy, and zero administrative snooping on member-to-member conversations.

---

## 🔑 Initial Access Credentials

### 1. Master Administrator Account (For Handover to Library Owner)
- **Portal URL:** Click **"Admin Login"** in the navigation header
- **Username / Email:** `admin@hikmahlibrary.com` (or `admin`)
- **Default Password:** `AdminHikmah#2025!`
- **Mobile OTP Password Recovery:** Registered to `+91 99999 88888` (Test OTP code: `123456`)
- *Note:* The owner can immediately change this password inside **Admin Console → System & Handover** using their own phone number with the built-in Mobile OTP verification tool!

### 2. Sample Member Accounts (For Demonstration & Testing)
| Member Name | Unique Member ID | Study Shift / Goal | Warning Level | Default Password |
|---|---|---|---|---|
| **Bilal Ahmed** | `HIK-2025-001` | Morning Shift (06:00 - 14:00) / UPSC | 1 / 10 | `Member@123` |
| **Ayesha Khan** | `HIK-2025-002` | Evening Shift (14:00 - 22:00) / CA Final | 0 / 10 | `Member@123` |
| **Zaid Siddiqui** | `HIK-2025-003` | Full Day (07:00 - 22:00) / Medical NEET | 4 / 10 | `Member@123` |
| **Omar Farooq** | `HIK-2025-005` | Night Focus (20:00 - 06:00) / Judiciary | 9 / 10 (Review) | `Member@123` |

---

## 🌟 Core Modules & Features

### 1. Public Website & Study Lounge Showcase
- **Hero & Philosophy:** Highlighting quiet focus, ergonomic desks, and academic excellence.
- **Facilities Grid:** Soundproof cabins, dual 300 Mbps fiber Wi-Fi, individual desk sockets, 24/7 power backup, RO water, and prayer area.
- **Continuous Looping Tour Video:** HTML5 auto-playing ambient study video in continuous loop (with custom video link switcher for the owner).
- **Photo Gallery:** High-resolution study cabins, reading halls, and lounge images with filter tabs.
- **Library Rules & Code of Conduct:** Clear policies on silence, clean desks, attendance, and conduct.
- **Designed & Developed by Syed Card:** Elegant developer profile in the footer ready with photo placeholder, bio, and credentials.

### 2. Administrative Console
- **Dashboard Overview:** Real-time KPI summary cards (Total Members, Active, Suspended, Today's Attendance, Watchlist).
- **Member Directory:** Auto-generates unique Member IDs (`HIK-2025-XXX`), stores shifts, contact info, and status. One-click suspend/reactivate.
- **Attendance Management:** Date-based registry with Present, Absent, Late, Excused. Duplicate prevention check. Mandatory reason logging for corrections.
- **Monthly Attendance Reports:** Automatic attendance percentage calculations. Highlighting members below 75%. One-click CSV export.
- **Disciplinary 10-Warning System:** Issue warnings with mandatory reason and severity. 10-segment visual color meter. Audited correction workflow to void mistakes.
- **Registration Review & Cancellations:** Automatic flag at 10 warnings. Admin review screen to confirm cancellation, revoke portal access, and preserve historical attendance/audit logs.
- **News, Fee Notices, & Announcements:** Publish announcements with due dates and amounts. Pin to top.
- **Administrative Audit Trail:** Immutable log of all system actions, timestamps, and admin signatures.
- **Owner Handover & Phone OTP:** Direct mobile verification tool to update administrator password securely.

### 3. Member Self-Service Portal
- **Member ID Authentication:** Mapped directly to individual accounts without exposing phone or email to peers.
- **Personal Dashboard:** Desk assignment, shift details, registration status.
- **Attendance Registry:** Historical daily check-ins and monthly percentage rate.
- **Disciplinary Status:** Real-time `X/10` visual progress bar with violation log.
- **Announcements & Fee Deadlines:** Bulletins, payment deadlines, and instructions.
- **Private Member-to-Member E2E Encrypted Chat:**
  - 1-on-1 private messaging using **Web Crypto API (SubtleCrypto AES-GCM 256-Bit)**.
  - No phone numbers or emails displayed in directory.
  - Ephemeral temporary sessions: "End & Purge Session" clears local view and deletes server ciphertext.
  - **Zero Admin Access:** Administrators have NO access to decryption keys, message transcripts, or search tools.

---

## 🔒 Security & Privacy Guarantees

1. **Principle of Least Privilege:** Members can only view their own personal profile, attendance, and warning records.
2. **End-to-End Encryption (E2EE):**
   - Cipher: AES-GCM 256-bit with unique random 96-bit IV per message.
   - Key derivation: Client-side PBKDF2 with SHA-256 (100,000 iterations).
   - Keys reside exclusively in client RAM and are discarded upon session termination.
3. **Database Security Rules (`firestore.rules`):**
   - Admin collection access is strictly restricted.
   - Admins are explicitly blocked from querying or reading `temporary_chat_messages`.
   - Audit logs are append-only and cannot be altered or deleted.
4. **No Secrets in Frontend:** API keys in `.env` are restricted client identifiers; all authorization is enforced at the database security rules layer.

---

## ⚡ 100% Free Forever Hosting Architecture

| Service | Provider | Free Tier Specification |
|---|---|---|
| **Frontend Web Hosting** | Cloudflare Pages / Vercel | Unlimited bandwidth, global CDN, custom domain, 100% free |
| **Real-time Database** | Google Cloud Firestore (Spark Plan) | 50,000 reads/day, 20,000 writes/day, 1 GB storage, 100% free |
| **User Authentication** | Firebase Authentication | Unlimited email/password accounts, 10,000 Phone Auth SMS/month free |
| **Media & Photo Storage** | Firebase Storage / Cloudinary | 5 GB free storage & 1 GB/day download bandwidth |

> **Dual Storage Engine:** The application functions 100% immediately out of the box with persistent local browser storage. When you enter your 6 Firebase keys into `.env`, it seamlessly connects to live Cloud Firestore without touching any component code!

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Verification Test Suite
```bash
npm test
```
*Executes all 24 automated unit and security tests verifying RBAC, warning progression, attendance duplicate checks, and Web Crypto E2E encryption.*

### 3. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173/`.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized static bundle in the `dist/` folder ready for zero-cost deployment.

---

## 🌐 Free Deployment Instructions

### Option A: Deploy to Cloudflare Pages (Recommended - 100% Free Forever)
1. Push your repository to GitHub.
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages → Create Application → Pages → Connect to Git**.
3. Select your repository `hikmah-library`.
4. Configure build settings:
   - **Framework Preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**. Your website will be live globally on `*.pages.dev` in under 60 seconds with free SSL and custom domain support!

### Option B: Deploy to Vercel (Alternative)
1. Go to [vercel.com](https://vercel.com) and import the repository.
2. Vercel automatically detects Vite. Click **Deploy**.

---

## ☁️ Connecting Live Firebase (Optional)

1. Create a free account at [firebase.google.com](https://firebase.google.com/).
2. Create a project named **"hikmah-library"** (choose the free **Spark Plan**).
3. In Firebase Console:
   - Go to **Firestore Database** → Click **Create Database** (Start in production mode).
   - Paste the contents of `firestore.rules` into the Firestore **Rules** tab and click **Publish**.
   - Go to **Authentication** → Enable **Email/Password** and **Phone** sign-in methods.
4. Copy your project configuration keys into a `.env` file:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=hikmah-library.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=hikmah-library
   VITE_FIREBASE_STORAGE_BUCKET=hikmah-library.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
   ```
5. Re-run `npm run dev` or rebuild. The system badge will update to **"Live Firebase Connected"** automatically.

---

## 🤝 Handover to the Library Owner

1. Give the owner the Admin URL and initial credentials:
   - Username: `admin@hikmahlibrary.com`
   - Password: `AdminHikmah#2025!`
2. Instruct the owner to sign in and navigate to the **System & Handover** tab.
3. The owner can enter their personal mobile phone number and reset the password using the built-in Mobile OTP verification tool.

---

## 👨‍💻 Architecture & Development
- **Designed & Developed by:** Syed — Full-Stack Web Architect & Cybersecurity Engineer
- **Website:** Hikmah Library & Study Lounge — Where Wisdom Meets Focus
- **License:** Proprietary / Custom Client License
