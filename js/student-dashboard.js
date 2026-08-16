// ============================================================
// student-dashboard.js — student-dashboard.html logic
// Session guard: requires both a signed-in Firebase Auth user
// AND the sessionStorage values set by student-login.js.
// ============================================================

import { auth, db, CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from './firebase-config.js';
import {
  onAuthStateChanged, signOut, updateEmail, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const hostelId = sessionStorage.getItem('shp-hostelId');
const studentId = sessionStorage.getItem('shp-studentId');
const HOSTEL_LABELS = { "main-boys-hostel": "Main Boys Hostel", "e-block-hostel": "E-Block Hostel" };

let studentData = null;
let studentRef = null;

if(!hostelId || !studentId){
  window.location.href = 'student-login.html';
}

onAuthStateChanged(auth, async (user) => {
  if(!user){
    window.location.href = 'student-login.html';
    return;
  }
  studentRef = doc(db, "hostels", hostelId, "students", studentId);
  const snap = await getDoc(studentRef);
  if(!snap.exists()){
    window.location.href = 'student-login.html';
    return;
  }
  studentData = snap.data();

  document.getElementById('userChipName').textContent = studentData.name;
  renderProfile();
  renderIdCard();
  loadLeaves();
  loadComplaints();
});

/* ---------- Sidebar navigation ---------- */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(item.dataset.section).classList.add('active');
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  sessionStorage.clear();
  window.location.href = 'index.html';
});

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  const s = studentData;
  const addr = s.address || {};
  document.getElementById('profilePhoto').src = s.photoURL;
  document.getElementById('profileName').textContent = s.name;
  document.getElementById('profileMeta').textContent = `${s.regdNo} · Room ${s.roomNo} · ${HOSTEL_LABELS[hostelId] || hostelId}`;

  const lockedFields = [
    ['Hostel', HOSTEL_LABELS[hostelId] || hostelId],
    ['Room No', s.roomNo],
    ['Registration No', s.regdNo],
    ['Name', s.name],
    ['Date of Birth', s.dob],
    ['Category', s.category],
    ["Father's Name", s.fatherName],
    ["Mother's Name", s.motherName],
    ['Hostel Admission Date', s.admissionDate],
  ];
  document.getElementById('lockedGrid').innerHTML = lockedFields.map(([label, val]) => `
    <div class="info-item"><label>${label}</label><div class="value">${escapeHtml(val)}</div></div>
  `).join('');

  document.getElementById('editableGrid').innerHTML = `
    <div class="info-item"><label>Phone Number</label><div class="value editable-field" data-field="phone" contenteditable="false">${escapeHtml(s.phone)}</div></div>
    <div class="info-item"><label>Email ID</label><div class="value editable-field" data-field="email" contenteditable="false">${escapeHtml(s.email)}</div></div>
    <div class="info-item"><label>Course</label><div class="value editable-field" data-field="course" contenteditable="false">${escapeHtml(s.course)}</div></div>
    <div class="info-item"><label>Session</label><div class="value editable-field" data-field="session" contenteditable="false">${escapeHtml(s.session)}</div></div>
    <div class="info-item"><label>Branch</label><div class="value editable-field" data-field="branch" contenteditable="false">${escapeHtml(s.branch || '')}</div></div>
    <div class="info-item"><label>Blood Group</label><div class="value editable-field" data-field="bloodGroup" contenteditable="false">${escapeHtml(s.bloodGroup || '')}</div></div>
    <div class="info-item"><label>Father's Phone</label><div class="value editable-field" data-field="fatherPhone" contenteditable="false">${escapeHtml(s.fatherPhone)}</div></div>
    <div class="info-item"><label>Mother's Phone</label><div class="value editable-field" data-field="motherPhone" contenteditable="false">${escapeHtml(s.motherPhone)}</div></div>
    <div class="info-item" style="grid-column:1/-1;"><label>Address (At, Po, PS, Block, Dist, State, Pin)</label>
      <div class="value editable-field" data-field="address" contenteditable="false">${escapeHtml(addr.at)}, ${escapeHtml(addr.po)}, ${escapeHtml(addr.policeStation)}, ${escapeHtml(addr.block)}, ${escapeHtml(addr.district)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pin)}</div>
    </div>
  `;
}

document.getElementById('editProfileBtn').addEventListener('click', async () => {
  const btn = document.getElementById('editProfileBtn');
  const editing = btn.dataset.editing === 'true';
  const fields = document.querySelectorAll('.editable-field');

  if(!editing){
    fields.forEach(f => { if(f.dataset.field !== 'address') f.setAttribute('contenteditable', 'true'); });
    btn.textContent = '💾 Save Changes';
    btn.dataset.editing = 'true';
    document.getElementById('photoUploadRow').classList.remove('hidden');
    return;
  }

  // Save mode
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const updates = {};
  fields.forEach(f => {
    if(f.dataset.field !== 'address') updates[f.dataset.field] = f.textContent.trim();
  });

  try{
    // Handle photo change if a new file was chosen
    const photoInput = document.getElementById('newPhotoInput');
    if(photoInput.files[0]){
      const url = await uploadPhotoToCloudinary(photoInput.files[0]);
      updates.photoURL = url;
    }

    // Handle email change carefully — Firebase Auth login email must match
    if(updates.email && updates.email !== studentData.email){
      try{
        await updateEmail(auth.currentUser, updates.email);
      } catch(err){
        if(err.code === 'auth/requires-recent-login'){
          showToast('Email change needs a fresh login. Please log out, log back in, then change your email.');
          delete updates.email;
        } else {
          throw err;
        }
      }
    }

    await updateDoc(studentRef, updates);
    Object.assign(studentData, updates);

    // Keep the public idcards + directory docs in sync with anything that changed there
    const idcardUpdates = {};
    ['course','branch','bloodGroup','phone','email'].forEach(f => { if(f in updates) idcardUpdates[f] = updates[f]; });
    if(updates.photoURL) idcardUpdates.photoURL = updates.photoURL;
    if(Object.keys(idcardUpdates).length > 0){
      await updateDoc(doc(db, "hostels", hostelId, "idcards", studentId), idcardUpdates);
    }
    if(updates.email){
      await updateDoc(doc(db, "hostels", hostelId, "directory", studentData.regdNo), { email: updates.email });
    }

    btn.textContent = '✏️ Edit Contact Details';
    btn.dataset.editing = 'false';
    document.getElementById('photoUploadRow').classList.add('hidden');
    fields.forEach(f => f.setAttribute('contenteditable', 'false'));
    renderProfile();
    renderIdCard();
    showToast('Profile updated.');
  } catch(err){
    console.error(err);
    showToast('Could not save changes: ' + err.message);
  } finally {
    btn.disabled = false;
  }
});

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

/* ============================================================
   DIGITAL ID CARD
   ============================================================ */
function renderIdCard(){
  const s = studentData;
  document.getElementById('idCardBox').innerHTML = `
    <div class="id-card">
      <div class="id-card-head"><div class="logo-badge">🎓</div><span>${HOSTEL_LABELS[hostelId] || hostelId}</span></div>
      <div class="id-card-body">
        <img src="${s.photoURL}" class="id-photo-img" alt="${escapeHtml(s.name)}">
        <div class="id-details">
          <h4>${escapeHtml(s.name)}</h4>
          <p>Regd No: <b>${escapeHtml(s.regdNo)}</b><br>Room No: <b>${escapeHtml(s.roomNo)}</b><br>${escapeHtml(s.course)} ${s.branch ? '· ' + escapeHtml(s.branch) : ''}<br>Blood Group: ${escapeHtml(s.bloodGroup || '—')}</p>
        </div>
        <div id="qrBox"></div>
      </div>
      <div class="id-card-foot">Valid for current academic session · Einstein Academy of Technology and Management</div>
    </div>
  `;

  const verifyUrl = `${window.location.origin}${window.location.pathname.replace('student-dashboard.html','')}view-id.html?hostel=${hostelId}&id=${studentId}`;
  // eslint-disable-next-line no-undef
  new QRCode(document.getElementById('qrBox'), { text: verifyUrl, width: 90, height: 90 });

  document.getElementById('printIdBtn').addEventListener('click', () => window.print());
}

/* ============================================================
   LEAVE APPLICATION
   ============================================================ */
async function loadLeaves(){
  const box = document.getElementById('leaveList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';
  const q = query(collection(db, "hostels", hostelId, "leaveRequests"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  if(snap.empty){ box.innerHTML = '<p class="muted-note">No leave applications yet.</p>'; return; }

  const items = [];
  snap.forEach(d => items.push(d.data()));
  items.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = items.map(lv => `
    <div class="leave-item">
      <div><div class="leave-reason">${escapeHtml(lv.reason)}</div><div class="leave-dates">${escapeHtml(lv.fromDate)} → ${escapeHtml(lv.toDate)}</div></div>
      <span class="status-badge status-${lv.status}">${lv.status.charAt(0).toUpperCase() + lv.status.slice(1)}</span>
    </div>
  `).join('');
}

document.getElementById('leaveForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fromDate = document.getElementById('leaveFrom').value;
  const toDate = document.getElementById('leaveTo').value;
  const reason = document.getElementById('leaveReason').value.trim();
  if(!fromDate || !toDate || !reason) return;

  await addDoc(collection(db, "hostels", hostelId, "leaveRequests"), {
    studentId, regdNo: studentData.regdNo, name: studentData.name, roomNo: studentData.roomNo,
    email: studentData.email, fromDate, toDate, reason, status: "pending", createdAt: Date.now()
  });
  document.getElementById('leaveForm').reset();
  loadLeaves();
  showToast('Leave application submitted.');
});

/* ============================================================
   COMPLAIN BOX
   ============================================================ */
async function loadComplaints(){
  const box = document.getElementById('complaintList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';
  const q = query(collection(db, "hostels", hostelId, "complaints"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  if(snap.empty){ box.innerHTML = '<p class="muted-note">No complaints submitted yet.</p>'; return; }

  const items = [];
  snap.forEach(d => items.push(d.data()));
  items.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = items.map(c => `
    <div class="complaint-item">
      <div class="c-text">${escapeHtml(c.text)}</div>
      <span class="status-badge status-${c.status === 'resolved' ? 'approved' : 'pending'}">${c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span>
    </div>
  `).join('');
}

document.getElementById('complaintForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('complaintInput').value.trim();
  if(!text) return;

  await addDoc(collection(db, "hostels", hostelId, "complaints"), {
    studentId, regdNo: studentData.regdNo, name: studentData.name, roomNo: studentData.roomNo,
    email: studentData.email, text, status: "pending", createdAt: Date.now()
  });
  document.getElementById('complaintInput').value = '';
  loadComplaints();
  showToast('Complaint submitted.');
});

/* ============================================================
   CHANGE PASSWORD
   ============================================================ */
document.getElementById('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgBox = document.getElementById('pwMessage');
  const current = document.getElementById('currentPw').value;
  const next = document.getElementById('newPw').value;
  const confirmPw = document.getElementById('confirmPw').value;

  if(next.length < 6){
    msgBox.textContent = 'New password must be at least 6 characters.'; msgBox.className = 'error-msg show'; return;
  }
  if(next !== confirmPw){
    msgBox.textContent = 'New password and confirmation do not match.'; msgBox.className = 'error-msg show'; return;
  }

  try{
    const cred = EmailAuthProvider.credential(studentData.email, current);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, next);
    msgBox.textContent = 'Password updated successfully.';
    msgBox.className = 'success-msg show';
    document.getElementById('pwForm').reset();
  } catch(err){
    console.error(err);
    msgBox.textContent = 'Current password is incorrect, or the change failed.';
    msgBox.className = 'error-msg show';
  }
});

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(message){
  let toast = document.getElementById('toast');
  if(!toast){ toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }