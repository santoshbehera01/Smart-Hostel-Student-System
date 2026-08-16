// ============================================================
// register.js — register.html logic
// Flow:
//   1. Student fills Email, clicks "Send OTP" -> Cloudflare Worker
//      generates a 6-digit code, emails it via Brevo.
//   2. Student enters the code, clicks "Verify Email" -> Worker
//      checks it. On success, the rest of the form unlocks.
//   3. Student fills the rest of the form and submits.
//   4. We check Registration No / Phone / Email uniqueness across
//      BOTH hostels, upload the photo to Cloudinary, create a
//      Firebase Auth account, then write the student's record to
//      Firestore under that hostel with status: "pending".
// ============================================================

import { auth, db, CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET, OTP_WORKER_URL } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTEL_IDS = ["main-boys-hostel", "e-block-hostel"];
let emailVerified = false;
let verifiedEmail = "";

const form = document.getElementById('registerForm');
const errorBox = document.getElementById('registerError');
const successBox = document.getElementById('registerSuccess');
const submitBtn = document.getElementById('submitBtn');

function showError(msg){
  errorBox.textContent = msg;
  errorBox.classList.add('show');
  successBox.classList.remove('show');
}
function showSuccess(msg){
  successBox.textContent = msg;
  successBox.classList.add('show');
  errorBox.classList.remove('show');
}
function clearMessages(){
  errorBox.classList.remove('show');
  successBox.classList.remove('show');
}

/* ---------- Step 1: Send OTP ---------- */
document.getElementById('sendOtpBtn').addEventListener('click', async () => {
  clearMessages();
  const email = document.getElementById('email').value.trim();
  const name = document.getElementById('name').value.trim();

  if(!email){
    showError('Please enter your Email ID first.');
    return;
  }

  const sendBtn = document.getElementById('sendOtpBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  try{
    const res = await fetch(`${OTP_WORKER_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });
    const data = await res.json();

    if(data.success){
      showSuccess('OTP sent! Please check your email (and spam folder) for the 6-digit code.');
      document.getElementById('otpSection').classList.remove('hidden');
    } else {
      showError(data.message || 'Could not send OTP. Please try again.');
    }
  } catch(err){
    console.error(err);
    showError('Could not send OTP — please check your internet connection and try again.');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send OTP';
  }
});

/* ---------- Step 2: Verify OTP ---------- */
document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
  clearMessages();
  const email = document.getElementById('email').value.trim();
  const code = document.getElementById('otpCode').value.trim();

  if(!code){
    showError('Please enter the OTP code sent to your email.');
    return;
  }

  const verifyBtn = document.getElementById('verifyOtpBtn');
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verifying...';

  try{
    const res = await fetch(`${OTP_WORKER_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();

    if(data.success){
      emailVerified = true;
      verifiedEmail = email;
      showSuccess('✅ Email verified! You can now complete and submit the form below.');
      document.getElementById('restOfForm').classList.remove('hidden');
      document.getElementById('email').setAttribute('readonly', 'true');
      document.getElementById('sendOtpBtn').disabled = true;
      document.getElementById('otpCode').disabled = true;
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verified ✓';
    } else {
      showError(data.message || 'Incorrect or expired OTP.');
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify Email';
    }
  } catch(err){
    console.error(err);
    showError('Could not verify OTP — please check your internet connection and try again.');
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify Email';
  }
});

/* ---------- Uniqueness checks (via lightweight public lookup docs, no private listing needed) ---------- */
async function isRegdNoTaken(hostelId, regdNo){
  const snap = await getDoc(doc(db, "hostels", hostelId, "directory", regdNo));
  return snap.exists();
}
async function isPhoneTaken(phone){
  const snap = await getDoc(doc(db, "phoneDirectory", phone));
  return snap.exists();
}

/* ---------- Photo upload to Cloudinary ---------- */
async function uploadPhotoToCloudinary(file){
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'hostel-portal');

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
  const data = await res.json();
  if(!data.secure_url) throw new Error('Photo upload failed.');
  return data.secure_url;
}

/* ---------- Final form submission ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();

  if(!emailVerified){
    showError('Please verify your email with the OTP before submitting.');
    return;
  }

  const hostelId = document.getElementById('hostel').value;
  const roomNo = document.getElementById('roomNo').value.trim();
  const regdNo = document.getElementById('regdNo').value.trim();
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const course = document.getElementById('course').value.trim();
  const session = document.getElementById('session').value.trim();
  const branch = document.getElementById('branch').value.trim();
  const dob = document.getElementById('dob').value;
  const category = document.getElementById('category').value;
  const bloodGroup = document.getElementById('bloodGroup').value.trim();
  const fatherName = document.getElementById('fatherName').value.trim();
  const fatherPhone = document.getElementById('fatherPhone').value.trim();
  const motherName = document.getElementById('motherName').value.trim();
  const motherPhone = document.getElementById('motherPhone').value.trim();
  const admissionDate = document.getElementById('admissionDate').value;

  const address = {
    at: document.getElementById('addrAt').value.trim(),
    po: document.getElementById('addrPo').value.trim(),
    policeStation: document.getElementById('addrPs').value.trim(),
    block: document.getElementById('addrBlock').value.trim(),
    district: document.getElementById('addrDist').value.trim(),
    state: document.getElementById('addrState').value.trim(),
    pin: document.getElementById('addrPin').value.trim(),
  };

  const photoFile = document.getElementById('photo').files[0];

  // ---- Basic validation ----
  if(!hostelId || !roomNo || !regdNo || !name || !phone || !password || !confirmPassword ||
     !course || !session || !dob || !category || !fatherName || !fatherPhone ||
     !motherName || !motherPhone || !admissionDate ||
     !address.at || !address.po || !address.policeStation || !address.block ||
     !address.district || !address.state || !address.pin){
    showError('Please fill in all required fields (marked with *).');
    return;
  }
  if(password !== confirmPassword){
    showError('Password and Confirm Password do not match.');
    return;
  }
  if(password.length < 6){
    showError('Password must be at least 6 characters.');
    return;
  }
  if(!photoFile){
    showError('Please upload your photo.');
    return;
  }
  if(!['image/jpeg', 'image/png'].includes(photoFile.type)){
    showError('Photo must be a JPG or PNG file.');
    return;
  }
  if(photoFile.size < 10 * 1024 || photoFile.size > 1024 * 1024){
    showError('Photo size must be between 10 KB and 1 MB.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try{
    // ---- Uniqueness checks ----
    if(await isRegdNoTaken(hostelId, regdNo)){
      showError('This Registration No is already in use.');
      return;
    }
    if(await isPhoneTaken(phone)){
      showError('This Phone Number is already in use.');
      return;
    }
    // Email uniqueness is enforced by Firebase Authentication itself (auth/email-already-in-use below)

    // ---- Upload photo ----
    const photoURL = await uploadPhotoToCloudinary(photoFile);

    // ---- Create Firebase Auth account ----
    const cred = await createUserWithEmailAndPassword(auth, verifiedEmail, password);
    const uid = cred.user.uid;

    // ---- Write student record to Firestore (status: pending) ----
    await setDoc(doc(db, "hostels", hostelId, "students", uid), {
      hostelId, roomNo, regdNo, name, phone,
      email: verifiedEmail,
      course, session, branch, dob, category, bloodGroup,
      photoURL,
      fatherName, fatherPhone, motherName, motherPhone,
      address, admissionDate,
      status: "pending",
      createdAt: Date.now()
    });

    // ---- Lean "directory" doc (public, used only for login lookup by Regd No) ----
    await setDoc(doc(db, "hostels", hostelId, "directory", regdNo), {
      uid, email: verifiedEmail, status: "pending"
    });

    // ---- Lean "idcards" doc (public, used only for the QR verification page) ----
    await setDoc(doc(db, "hostels", hostelId, "idcards", uid), {
      name, regdNo, roomNo, course, branch, bloodGroup, phone, email: verifiedEmail, photoURL
    });

    // ---- Phone number marker (used only to detect duplicates in future registrations) ----
    await setDoc(doc(db, "phoneDirectory", phone), { regdNo, hostelId });

    showSuccess('🎉 Registration submitted successfully! Your account is now awaiting Admin approval. You will be able to log in once approved.');
    form.reset();
    submitBtn.textContent = 'Submitted ✓';

  } catch(err){
    console.error(err);
    if(err.code === 'auth/email-already-in-use'){
      showError('This Email ID is already registered.');
    } else {
      showError('Registration failed: ' + err.message);
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Registration';
  }
});