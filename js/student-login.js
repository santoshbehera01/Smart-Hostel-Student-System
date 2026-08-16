// ============================================================
// student-login.js — student-login.html logic
// Student logs in with Registration No (not email). We first
// look up the matching email stored in Firestore, then sign in
// with Firebase Authentication using that email + password.
// ============================================================

import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTEL_IDS = ["main-boys-hostel", "e-block-hostel"];

async function findStudentByRegdNo(regdNo){
  for(const hostelId of HOSTEL_IDS){
    const snap = await getDoc(doc(db, "hostels", hostelId, "directory", regdNo));
    if(snap.exists()){
      const data = snap.data();
      return { email: data.email, hostelId, studentId: data.uid, status: data.status };
    }
  }
  return null;
}

const form = document.getElementById('studentLoginForm');
const errorBox = document.getElementById('studentLoginError');
const successBox = document.getElementById('studentLoginSuccess');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');
  successBox.classList.remove('show');

  const regdNo = document.getElementById('studentRegdNo').value.trim();
  const password = document.getElementById('studentPassword').value;

  try{
    const result = await findStudentByRegdNo(regdNo);
    if(!result){
      errorBox.textContent = 'No student found with this Registration No.';
      errorBox.classList.add('show');
      return;
    }
    if(result.status === 'pending'){
      errorBox.textContent = 'Your registration is still pending Admin approval.';
      errorBox.classList.add('show');
      return;
    }
    if(result.status === 'inactive'){
      errorBox.textContent = 'This account is inactive. Please contact the hostel admin.';
      errorBox.classList.add('show');
      return;
    }
    if(result.status === 'rejected' || result.status === 'trashed'){
      errorBox.textContent = 'This account is not active. Please contact the hostel admin.';
      errorBox.classList.add('show');
      return;
    }

    await signInWithEmailAndPassword(auth, result.email, password);

    sessionStorage.setItem('shp-regdNo', regdNo);
    sessionStorage.setItem('shp-hostelId', result.hostelId);
    sessionStorage.setItem('shp-studentId', result.studentId);
    window.location.href = 'student-dashboard.html';

  } catch(err){
    console.error(err);
    errorBox.textContent = 'Login failed — please check your Registration No and Password.';
    errorBox.classList.add('show');
  }
});

document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');
  successBox.classList.remove('show');

  const regdNo = document.getElementById('studentRegdNo').value.trim();
  if(!regdNo){
    errorBox.textContent = 'Please enter your Registration No above first, then click Forgot Password.';
    errorBox.classList.add('show');
    return;
  }

  try{
    const result = await findStudentByRegdNo(regdNo);
    if(!result){
      errorBox.textContent = 'No student found with this Registration No.';
      errorBox.classList.add('show');
      return;
    }
    await sendPasswordResetEmail(auth, result.email);
    successBox.textContent = 'A password reset link has been sent to your registered email address.';
    successBox.classList.add('show');
  } catch(err){
    console.error(err);
    errorBox.textContent = 'Could not send reset email. Please try again later.';
    errorBox.classList.add('show');
  }
});

document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁️';
  });
});