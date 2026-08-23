# Smart Hostel Student Information System

A production web portal for hostel students to register, log in, and manage their own records — with a full Admin panel to manage two hostels' data, approvals, leave requests, complaints, notices, and gallery, kept completely separate per hostel.

**Live site:** https://eatm-hostel-student-system.vercel.app

---

## Overview

Built for **Einstein Academy of Technology and Management**, this system covers two hostels — **Main Boys Hostel** and **E-Block Hostel** — with fully independent data, approvals, and notices per hostel, managed through a single Admin account.

## Features

### Public Pages
- **Home** — hostel photo, college info, Student Login and Admin Login entry points
- **Student Registration** — full profile form with email verification via a 6-digit OTP before submission
- **Notice Board** — combined notices from both hostels, tagged by hostel
- **Gallery** — hostel photos, Admin-uploaded only
- **Contact** — warden name, phone, and email per hostel

### Student Dashboard (after login)
- **Profile** — view all details; edit contact info (phone, email, course, session, branch, blood group, photo, parents' phone numbers, address); identity fields (name, Regd No, room, DOB, category, admission date) are locked and Admin-only
- **Digital ID Card** — auto-generated, printable/downloadable, with a QR code that opens a public, limited-detail verification page (no address or parents' info exposed)
- **Leave Application** — apply with dates and reason, track status, get emailed on approval/rejection
- **Complain Box** — submit complaints, track status, get emailed on resolution
- **Change Password**

### Admin Dashboard (separate login, one account manages both hostels)
- Choose which hostel to manage after login — data is never mixed between hostels
- **Pending Registrations** — approve or reject (with a reason, emailed to the applicant)
- **Room-wise Student Table** — auto-sorted by room number, with a full detail View, Edit, Delete (to Trash), and Mark Passed Out / Inactive
- **Trash** — deleted and rejected records, restorable or permanently deletable
- **Leave Requests** and **Complaints** management, with automatic email notifications on status changes
- **Notice Board** and **Gallery** management
- **Hostel Contact Info** — set warden name/phone/email shown on the public Contact page

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (ES modules) |
| Authentication & Database | Firebase Authentication + Firestore |
| Photo & Gallery Storage | Cloudinary (unsigned upload preset) |
| Email (OTP, notifications) | Brevo (transactional email API) |
| OTP Proxy | Cloudflare Worker + Workers KV (keeps the Brevo API key off the client) |
| Hosting | Vercel |

No backend server or paid plan is required — every service used is on a free tier.

---

## Architecture Notes

- **Firebase config** (`js/firebase-config.js`) is safe to be public; it is not a secret. Actual data access is controlled by Firestore Security Rules (`firestore.rules`).
- **Student login** uses Registration No + Password. Since Firebase Authentication signs in by email, a lightweight public `directory/{regdNo}` document maps each Regd No to its account email and status, without exposing the full private profile.
- **Full student profiles** (`hostels/{hostelId}/students/{uid}`) are readable only by the student themselves or the Admin.
- **ID card QR verification** reads a separate lean `idcards/{uid}` document containing only the fields meant to be shown when the card is scanned — never the student's address or parents' details.
- **OTP delivery**: the frontend calls a Cloudflare Worker, which holds the Brevo API key as a server-side secret and generates/verifies 6-digit codes stored temporarily in Workers KV (10-minute expiry).
- **Admin access** is controlled via an `adminUIDs/{uid}` marker document, checked by Firestore Rules — no separate admin app or role field on the user object.

## Folder Structure

```
HostelSystem/
├── index.html                  Home page
├── student-login.html          Student login
├── register.html                Student registration (OTP + full profile form)
├── student-dashboard.html      Student dashboard
├── admin-login.html             Admin login
├── admin-choose-hostel.html    Hostel selector (post Admin login)
├── admin-dashboard.html        Admin dashboard
├── notice-board.html            Public notice board
├── gallery.html                  Public gallery
├── contact.html                  Public contact page
├── view-id.html                  Public QR / ID verification page
├── css/
│   └── style.css                 Shared stylesheet
├── js/
│   ├── firebase-config.js       Firebase + Cloudinary + Worker config
│   ├── student-login.js
│   ├── register.js
│   ├── student-dashboard.js
│   ├── admin-login.js
│   ├── admin-dashboard.js
│   ├── notice-board.js
│   ├── gallery.js
│   ├── contact.js
│   └── view-id.js
├── cloudflare-worker/
│   └── worker.js                 OTP + notification email proxy (deployed separately to Cloudflare)
└── firestore.rules                Firestore Security Rules (published via Firebase Console)
```

---

## Setup (for a fresh deployment)

### 1. Firebase
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore Database** (Standard edition, Production/locked rules — see below).
4. Copy your Web App config into `js/firebase-config.js`.
5. Publish the contents of `firestore.rules` under Firestore → Rules.
6. Create the Admin account manually:
   - Authentication → Users → Add user (email + password)
   - Firestore → `admins/{yourAdminID}` → field `email` = that admin's email
   - Firestore → `adminUIDs/{thatUser'sUID}` → field `isAdmin` = `true`

### 2. Cloudinary
1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Note your **Cloud Name**.
3. Settings → Upload → Add an **unsigned** upload preset; note its name.
4. Update `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in `js/firebase-config.js`.

### 3. Brevo (email/OTP)
1. Create a free account at [brevo.com](https://brevo.com).
2. Verify a sender email under Senders, Domains & IPs.
3. Generate an API key under SMTP & API.

### 4. Cloudflare Worker (OTP proxy)
1. Create a Worker at [dash.cloudflare.com](https://dash.cloudflare.com) → Compute → Workers & Pages.
2. Create a **KV namespace** and bind it to the Worker as `OTP_STORE`.
3. Add `BREVO_API_KEY` as an encrypted **Secret** in the Worker's settings.
4. Paste the contents of `cloudflare-worker/worker.js` into the Worker and deploy.
5. Update `OTP_WORKER_URL` in `js/firebase-config.js` with the deployed Worker's URL.

### 5. Deploy
- Push this repository to GitHub.
- Import it into [Vercel](https://vercel.com) (no build command needed — static site).
- After deployment, add the Vercel domain under Firebase → Authentication → Settings → Authorized domains.

---

## Security

- Firestore access is fully governed by `firestore.rules` — students can only read/write their own records, and only the fields the UI marks editable; the Admin role is verified server-side via the `adminUIDs` collection.
- Passwords are handled entirely by Firebase Authentication and are never stored or visible in Firestore, including to the Admin.
- The Brevo API key never reaches the browser — it lives only as a Cloudflare Worker secret.
- The QR/ID-card verification page exposes a deliberately limited field set and never shows address or parents' contact details.

## License

Internal project for Einstein Academy of Technology and Management. All rights reserved.