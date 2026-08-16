// ============================================================
// admin-login.js — admin-login.html logic
// Admin logs in with a fixed Admin ID. We look up the matching
// email stored in the "admins" Firestore collection, then sign
// in via Firebase Authentication with that email + password.
// ============================================================

import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById('adminLoginForm');
const errorBox = document.getElementById('adminLoginError');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.classList.remove('show');

  const adminId = document.getElementById('adminId').value.trim();
  const password = document.getElementById('adminPassword').value;

  try{
    const adminRef = doc(db, "admins", adminId);
    const snap = await getDoc(adminRef);

    if(!snap.exists()){
      errorBox.textContent = 'Invalid Admin ID.';
      errorBox.classList.add('show');
      return;
    }

    const email = snap.data().email;
    await signInWithEmailAndPassword(auth, email, password);

    sessionStorage.setItem('shp-adminId', adminId);
    window.location.href = 'admin-choose-hostel.html';

  } catch(err){
    console.error(err);
    errorBox.textContent = 'Login failed — please check your Admin ID and Password.';
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