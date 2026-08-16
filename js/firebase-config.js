// ============================================================
// firebase-config.js
// Initializes Firebase (Authentication + Firestore) for the
// entire Smart Hostel Student Information System.
// Loaded on every page BEFORE any other app script.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBq9cGwujPzVi05cjfJiLJ5DqO3fIh4nDI",
  authDomain: "smart-hostel-portal-8d60f.firebaseapp.com",
  projectId: "smart-hostel-portal-8d60f",
  storageBucket: "smart-hostel-portal-8d60f.firebasestorage.app",
  messagingSenderId: "28185739751",
  appId: "1:28185739751:web:6e84aceb049175a6abfd42"
};

// Initialize Firebase app + services, export them so every
// other page/script can import { auth, db } from this file.
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Cloudinary settings (used for photo/gallery uploads)
export const CLOUDINARY_CLOUD_NAME = "pqvq2caz";
export const CLOUDINARY_UPLOAD_PRESET = "hostel_uploads";
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Cloudflare Worker settings (used for OTP send/verify via Brevo)
export const OTP_WORKER_URL = "https://hostel-otp-proxy.santoshkumar845788.workers.dev";