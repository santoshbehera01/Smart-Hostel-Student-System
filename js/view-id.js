// ============================================================
// view-id.js — view-id.html logic
// Public, read-only page. Shows ONLY: photo, name, regdNo,
// roomNo, hostel name, course/branch, blood group, phone, email.
// No address or parents' details are ever shown here.
// ============================================================

import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTEL_LABELS = { "main-boys-hostel": "Main Boys Hostel", "e-block-hostel": "E-Block Hostel" };

const params = new URLSearchParams(window.location.search);
const hostelId = params.get('hostel');
const studentId = params.get('id');

const box = document.getElementById('verifyBox');

async function load(){
  if(!hostelId || !studentId){
    box.innerHTML = '<p class="muted-note">Invalid or missing ID card link.</p>';
    return;
  }
  try{
    const snap = await getDoc(doc(db, "hostels", hostelId, "idcards", studentId));
    if(!snap.exists()){
      box.innerHTML = '<p class="muted-note">No matching student record found.</p>';
      return;
    }
    const s = snap.data();
    box.innerHTML = `
      <img src="${s.photoURL}" class="verify-photo" alt="${escapeHtml(s.name)}">
      <h3>${escapeHtml(s.name)}</h3>
      <div class="verify-grid">
        <div><label>Registration No</label><div>${escapeHtml(s.regdNo)}</div></div>
        <div><label>Room No</label><div>${escapeHtml(s.roomNo)}</div></div>
        <div><label>Hostel</label><div>${HOSTEL_LABELS[hostelId] || escapeHtml(hostelId)}</div></div>
        <div><label>Course/Branch</label><div>${escapeHtml(s.course)} ${s.branch ? '· ' + escapeHtml(s.branch) : ''}</div></div>
        <div><label>Blood Group</label><div>${escapeHtml(s.bloodGroup || '—')}</div></div>
        <div><label>Phone</label><div>${escapeHtml(s.phone)}</div></div>
        <div style="grid-column:1/-1;"><label>Email</label><div>${escapeHtml(s.email)}</div></div>
      </div>
      <p class="muted-note" style="margin-top:14px;">This is a verified hostel resident of Einstein Academy of Technology and Management.</p>
    `;
  } catch(err){
    console.error(err);
    box.innerHTML = '<p class="muted-note">Could not load ID card details.</p>';
  }
}

function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

load();