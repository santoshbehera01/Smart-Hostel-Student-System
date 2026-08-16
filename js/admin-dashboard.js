// ============================================================
// admin-dashboard.js — admin-dashboard.html logic
// Scoped entirely to the hostel chosen on admin-choose-hostel.html
// (stored in sessionStorage as 'shp-selectedHostel').
// ============================================================

import { db, OTP_WORKER_URL, CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from './firebase-config.js';
import {
  collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, addDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const hostelId = sessionStorage.getItem('shp-selectedHostel');
const adminId = sessionStorage.getItem('shp-adminId');

if(!adminId){
  window.location.href = 'admin-login.html';
}
if(!hostelId){
  window.location.href = 'admin-choose-hostel.html';
}

const HOSTEL_LABELS = {
  "main-boys-hostel": "Main Boys Hostel",
  "e-block-hostel": "E-Block Hostel"
};

document.getElementById('currentHostelLabel').textContent = HOSTEL_LABELS[hostelId] || hostelId;

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = 'index.html';
});
document.getElementById('switchHostelBtn').addEventListener('click', () => {
  window.location.href = 'admin-choose-hostel.html';
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

function studentsRef(){ return collection(db, "hostels", hostelId, "students"); }

async function sendNotification(to, name, subject, message){
  try{
    await fetch(`${OTP_WORKER_URL}/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, name, subject, message })
    });
  } catch(err){
    console.error('Notification email failed:', err);
  }
}

/* ============================================================
   PENDING REGISTRATIONS
   ============================================================ */
async function loadPending(){
  const box = document.getElementById('pendingList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  const q = query(studentsRef(), where("status", "==", "pending"));
  const snap = await getDocs(q);

  if(snap.empty){
    box.innerHTML = '<p class="muted-note">No pending registrations.</p>';
    return;
  }

  box.innerHTML = '';
  snap.forEach(docSnap => {
    const s = docSnap.data();
    const id = docSnap.id;
    const card = document.createElement('div');
    card.className = 'card pending-card';
    card.innerHTML = `
      <div class="pending-info">
        <img src="${s.photoURL}" class="pending-photo" alt="${escapeHtml(s.name)}">
        <div>
          <b>${escapeHtml(s.name)}</b> — ${escapeHtml(s.regdNo)}<br>
          <span class="muted-note">Room ${escapeHtml(s.roomNo)} · ${escapeHtml(s.course)} · ${escapeHtml(s.phone)} · ${escapeHtml(s.email)}</span>
        </div>
      </div>
      <div class="pending-actions">
        <button class="approve-btn" data-id="${id}">✅ Approve</button>
        <button class="reject-btn" data-id="${id}">❌ Reject</button>
      </div>
    `;
    box.appendChild(card);
  });

  box.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await updateDoc(doc(db, "hostels", hostelId, "students", btn.dataset.id), { status: "active" });
      const snap2 = await getDoc(doc(db, "hostels", hostelId, "students", btn.dataset.id));
      const s = snap2.data();
      await updateDoc(doc(db, "hostels", hostelId, "directory", s.regdNo), { status: "active" });
      await sendNotification(s.email, s.name, "Hostel Registration Approved",
        `Your hostel registration (Regd No: ${s.regdNo}) has been approved. You can now log in using your Registration No and password.`);
      loadPending();
      loadStudents();
    });
  });

  box.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reason = prompt('Enter a reason for rejection (this will be emailed to the student):');
      if(!reason) return;
      btn.disabled = true;
      const studentRef = doc(db, "hostels", hostelId, "students", btn.dataset.id);
      const snap2 = await getDoc(studentRef);
      const s = snap2.data();
      await updateDoc(studentRef, { status: "rejected", rejectionReason: reason });
      await updateDoc(doc(db, "hostels", hostelId, "directory", s.regdNo), { status: "rejected" });
      await sendNotification(s.email, s.name, "Hostel Registration Rejected",
        `Your hostel registration (Regd No: ${s.regdNo}) was not approved. Reason: ${reason}`);
      loadPending();
    });
  });
}

/* ============================================================
   ROOM-WISE STUDENT TABLE
   ============================================================ */
async function loadStudents(){
  const box = document.getElementById('studentsTable');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  const q = query(studentsRef(), where("status", "==", "active"));
  const snap = await getDocs(q);

  if(snap.empty){
    box.innerHTML = '<p class="muted-note">No active students yet.</p>';
    return;
  }

  // Group by room number
  const rooms = {};
  snap.forEach(docSnap => {
    const s = docSnap.data();
    if(!rooms[s.roomNo]) rooms[s.roomNo] = [];
    rooms[s.roomNo].push({ id: docSnap.id, ...s });
  });

  const sortedRoomNumbers = Object.keys(rooms).sort((a,b) => {
    const na = parseInt(a, 10), nb = parseInt(b, 10);
    if(!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  box.innerHTML = '';
  sortedRoomNumbers.forEach(roomNo => {
    const roomBlock = document.createElement('div');
    roomBlock.className = 'card room-block';
    let rows = '';
    rooms[roomNo].forEach((s, i) => {
      rows += `
        <tr>
          <td>${i+1}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.regdNo)}</td>
          <td>${escapeHtml(s.phone)}</td>
          <td>${escapeHtml(s.email)}</td>
          <td><button class="view-student-btn" data-id="${s.id}">👁️ View</button></td>
        </tr>`;
    });
    roomBlock.innerHTML = `
      <h4>Room No: ${escapeHtml(roomNo)}</h4>
      <table class="data-table">
        <thead><tr><th>Sl.No</th><th>Name</th><th>Regd No</th><th>Phone</th><th>Email</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    box.appendChild(roomBlock);
  });

  box.querySelectorAll('.view-student-btn').forEach(btn => {
    btn.addEventListener('click', () => openViewModal(btn.dataset.id));
  });
}

/* ============================================================
   VIEW / EDIT STUDENT MODAL (single modal, two modes)
   ============================================================ */
async function openViewModal(studentId){
  const ref = doc(db, "hostels", hostelId, "students", studentId);
  const snap = await getDoc(ref);
  if(!snap.exists()) return;
  const s = snap.data();

  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  renderViewMode(ref, s);
}

function renderViewMode(ref, s){
  const addr = s.address || {};
  document.getElementById('editModalBody').innerHTML = `
    <div style="text-align:center; margin-bottom:14px;">
      <img src="${s.photoURL}" alt="${escapeHtml(s.name)}" style="width:100px;height:100px;border-radius:14px;object-fit:cover;">
    </div>
    <div class="view-grid">
      <div><label>Name</label><div>${escapeHtml(s.name)}</div></div>
      <div><label>Registration No</label><div>${escapeHtml(s.regdNo)}</div></div>
      <div><label>Hostel</label><div>${escapeHtml(s.hostelId)}</div></div>
      <div><label>Room No</label><div>${escapeHtml(s.roomNo)}</div></div>
      <div><label>Phone</label><div>${escapeHtml(s.phone)}</div></div>
      <div><label>Email</label><div>${escapeHtml(s.email)}</div></div>
      <div><label>Course</label><div>${escapeHtml(s.course)}</div></div>
      <div><label>Session</label><div>${escapeHtml(s.session)}</div></div>
      <div><label>Branch</label><div>${escapeHtml(s.branch || '—')}</div></div>
      <div><label>Date of Birth</label><div>${escapeHtml(s.dob)}</div></div>
      <div><label>Category</label><div>${escapeHtml(s.category)}</div></div>
      <div><label>Blood Group</label><div>${escapeHtml(s.bloodGroup || '—')}</div></div>
      <div><label>Father's Name</label><div>${escapeHtml(s.fatherName)}</div></div>
      <div><label>Father's Phone</label><div>${escapeHtml(s.fatherPhone)}</div></div>
      <div><label>Mother's Name</label><div>${escapeHtml(s.motherName)}</div></div>
      <div><label>Mother's Phone</label><div>${escapeHtml(s.motherPhone)}</div></div>
      <div><label>Hostel Admission Date</label><div>${escapeHtml(s.admissionDate)}</div></div>
      <div style="grid-column:1/-1;"><label>Address</label>
        <div>${escapeHtml(addr.at)}, ${escapeHtml(addr.po)}, PS: ${escapeHtml(addr.policeStation)}, ${escapeHtml(addr.block)}, ${escapeHtml(addr.district)}, ${escapeHtml(addr.state)} - ${escapeHtml(addr.pin)}</div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="edit-student-btn">✏️ Edit</button>
      <button class="inactive-student-btn">🎓 Mark Passed Out</button>
      <button class="delete-student-btn">🗑️ Delete</button>
    </div>
  `;

  document.getElementById('editModalBody').querySelector('.edit-student-btn')
    .addEventListener('click', () => renderEditMode(ref, s));
  document.getElementById('editModalBody').querySelector('.inactive-student-btn')
    .addEventListener('click', async () => {
      if(!confirm('Mark this student as Passed Out / Inactive?')) return;
      await updateDoc(ref, { status: "inactive" });
      await updateDoc(doc(db, "hostels", hostelId, "directory", s.regdNo), { status: "inactive" });
      document.getElementById('editModal').classList.add('hidden');
      loadStudents();
    });
  document.getElementById('editModalBody').querySelector('.delete-student-btn')
    .addEventListener('click', async () => {
      if(!confirm('Move this student to Trash?')) return;
      await updateDoc(ref, { status: "trashed" });
      await updateDoc(doc(db, "hostels", hostelId, "directory", s.regdNo), { status: "trashed" });
      document.getElementById('editModal').classList.add('hidden');
      loadStudents(); loadTrash();
    });
}

function renderEditMode(ref, s){
  document.getElementById('editModalBody').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label>Name</label><input id="ed_name" value="${escapeAttr(s.name)}"></div>
      <div class="form-field"><label>Room No</label><input id="ed_roomNo" value="${escapeAttr(s.roomNo)}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Phone</label><input id="ed_phone" value="${escapeAttr(s.phone)}"></div>
      <div class="form-field"><label>Email</label><input id="ed_email" value="${escapeAttr(s.email)}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Course</label><input id="ed_course" value="${escapeAttr(s.course)}"></div>
      <div class="form-field"><label>Branch</label><input id="ed_branch" value="${escapeAttr(s.branch || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Category</label><input id="ed_category" value="${escapeAttr(s.category)}"></div>
      <div class="form-field"><label>Blood Group</label><input id="ed_bloodGroup" value="${escapeAttr(s.bloodGroup || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Father's Name</label><input id="ed_fatherName" value="${escapeAttr(s.fatherName)}"></div>
      <div class="form-field"><label>Father's Phone</label><input id="ed_fatherPhone" value="${escapeAttr(s.fatherPhone)}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Mother's Name</label><input id="ed_motherName" value="${escapeAttr(s.motherName)}"></div>
      <div class="form-field"><label>Mother's Phone</label><input id="ed_motherPhone" value="${escapeAttr(s.motherPhone)}"></div>
    </div>
    <button id="saveEditBtn" class="login-btn" style="margin-top:10px;">Save Changes</button>
  `;

  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const updates = {
      name: document.getElementById('ed_name').value.trim(),
      roomNo: document.getElementById('ed_roomNo').value.trim(),
      phone: document.getElementById('ed_phone').value.trim(),
      email: document.getElementById('ed_email').value.trim(),
      course: document.getElementById('ed_course').value.trim(),
      branch: document.getElementById('ed_branch').value.trim(),
      category: document.getElementById('ed_category').value.trim(),
      bloodGroup: document.getElementById('ed_bloodGroup').value.trim(),
      fatherName: document.getElementById('ed_fatherName').value.trim(),
      fatherPhone: document.getElementById('ed_fatherPhone').value.trim(),
      motherName: document.getElementById('ed_motherName').value.trim(),
      motherPhone: document.getElementById('ed_motherPhone').value.trim(),
    };
    await updateDoc(ref, updates);

    // Keep the public idcards doc in sync with anything admin changed there
    await updateDoc(doc(db, "hostels", hostelId, "idcards", ref.id), {
      name: updates.name, roomNo: updates.roomNo, phone: updates.phone, email: updates.email,
      course: updates.course, branch: updates.branch, bloodGroup: updates.bloodGroup,
    });
    // If email changed, keep the directory doc's email in sync too (login lookup)
    if(updates.email !== s.email){
      await updateDoc(doc(db, "hostels", hostelId, "directory", s.regdNo), { email: updates.email });
    }

    document.getElementById('editModal').classList.add('hidden');
    loadStudents();
  });
}
document.getElementById('closeEditModal').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

/* ============================================================
   TRASH
   ============================================================ */
async function loadTrash(){
  const box = document.getElementById('trashList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  const q = query(studentsRef(), where("status", "in", ["trashed", "rejected"]));
  const snap = await getDocs(q);

  if(snap.empty){
    box.innerHTML = '<p class="muted-note">Trash is empty.</p>';
    return;
  }

  box.innerHTML = '';
  snap.forEach(docSnap => {
    const s = docSnap.data();
    const id = docSnap.id;
    const row = document.createElement('div');
    row.className = 'card pending-card';
    const statusLabel = s.status === 'rejected' ? `Rejected — ${escapeHtml(s.rejectionReason || 'No reason given')}` : 'Deleted';
    row.innerHTML = `
      <div class="pending-info"><b>${escapeHtml(s.name)}</b> — ${escapeHtml(s.regdNo)} (Room ${escapeHtml(s.roomNo)})<br><span class="muted-note">${statusLabel}</span></div>
      <div class="pending-actions">
        <button class="restore-btn" data-id="${id}">♻️ Restore to Active</button>
        <button class="reject-btn" data-id="${id}">🗑️ Delete Permanently</button>
      </div>
    `;
    box.appendChild(row);
  });

  box.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ref = doc(db, "hostels", hostelId, "students", btn.dataset.id);
      const snap2 = await getDoc(ref);
      const s = snap2.data();
      await updateDoc(ref, { status: "active" });
      await updateDoc(doc(db, "hostels", hostelId, "directory", s.regdNo), { status: "active" });
      loadTrash(); loadStudents();
    });
  });
  box.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('Permanently delete this record? This cannot be undone.')) return;
      const ref = doc(db, "hostels", hostelId, "students", btn.dataset.id);
      const snap2 = await getDoc(ref);
      const s = snap2.data();
      await deleteDoc(ref);
      await deleteDoc(doc(db, "hostels", hostelId, "directory", s.regdNo));
      await deleteDoc(doc(db, "hostels", hostelId, "idcards", btn.dataset.id));
      loadTrash();
    });
  });
}

/* ============================================================
   LEAVE REQUESTS (Admin view — all students in this hostel)
   ============================================================ */
async function loadLeaveRequests(){
  const box = document.getElementById('leaveRequestsList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  const snap = await getDocs(collection(db, "hostels", hostelId, "leaveRequests"));
  if(snap.empty){ box.innerHTML = '<p class="muted-note">No leave requests yet.</p>'; return; }

  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  items.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = items.map(lv => `
    <div class="card pending-card">
      <div class="pending-info">
        <div>
          <b>${escapeHtml(lv.name)}</b> — ${escapeHtml(lv.regdNo)} (Room ${escapeHtml(lv.roomNo)})<br>
          <span class="muted-note">${escapeHtml(lv.fromDate)} → ${escapeHtml(lv.toDate)} · ${escapeHtml(lv.reason)}</span>
        </div>
      </div>
      <div class="pending-actions">
        ${lv.status === 'pending' ? `
          <button class="approve-btn" data-id="${lv.id}" data-action="approve">✅ Approve</button>
          <button class="reject-btn" data-id="${lv.id}" data-action="reject">❌ Reject</button>
        ` : `<span class="status-badge status-${lv.status}">${lv.status.charAt(0).toUpperCase() + lv.status.slice(1)}</span>`}
      </div>
    </div>
  `).join('');

  box.querySelectorAll('[data-action="approve"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const item = items.find(i => i.id === btn.dataset.id);
      await updateDoc(doc(db, "hostels", hostelId, "leaveRequests", btn.dataset.id), { status: "approved" });
      await sendNotification(item.email, item.name, "Leave Request Approved",
        `Your leave request from ${item.fromDate} to ${item.toDate} has been approved.`);
      loadLeaveRequests();
    });
  });
  box.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const item = items.find(i => i.id === btn.dataset.id);
      await updateDoc(doc(db, "hostels", hostelId, "leaveRequests", btn.dataset.id), { status: "rejected" });
      await sendNotification(item.email, item.name, "Leave Request Rejected",
        `Your leave request from ${item.fromDate} to ${item.toDate} was not approved.`);
      loadLeaveRequests();
    });
  });
}

/* ============================================================
   COMPLAINTS (Admin view — all students in this hostel)
   ============================================================ */
async function loadComplaintsAdmin(){
  const box = document.getElementById('complaintsList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  const snap = await getDocs(collection(db, "hostels", hostelId, "complaints"));
  if(snap.empty){ box.innerHTML = '<p class="muted-note">No complaints yet.</p>'; return; }

  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  items.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = items.map(c => `
    <div class="card pending-card">
      <div class="pending-info">
        <div><b>${escapeHtml(c.name)}</b> — ${escapeHtml(c.regdNo)} (Room ${escapeHtml(c.roomNo)})<br>
        <span class="muted-note">${escapeHtml(c.text)}</span></div>
      </div>
      <div class="pending-actions">
        ${c.status === 'pending' ? `<button class="approve-btn" data-id="${c.id}">✅ Mark Resolved</button>` : `<span class="status-badge status-approved">Resolved</span>`}
      </div>
    </div>
  `).join('');

  box.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const item = items.find(i => i.id === btn.dataset.id);
      await updateDoc(doc(db, "hostels", hostelId, "complaints", btn.dataset.id), { status: "resolved" });
      await sendNotification(item.email, item.name, "Complaint Resolved",
        `Your complaint "${item.text}" has been marked as resolved.`);
      loadComplaintsAdmin();
    });
  });
}

/* ============================================================
   NOTICE BOARD (Admin)
   ============================================================ */
async function loadNoticesAdmin(){
  const box = document.getElementById('noticesAdminList');
  box.innerHTML = '<p class="muted-note">Loading…</p>';
  const snap = await getDocs(collection(db, "hostels", hostelId, "notices"));
  if(snap.empty){ box.innerHTML = '<p class="muted-note">No notices posted yet.</p>'; return; }

  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  items.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = items.map(n => `
    <div class="notice-card">
      <h4>${escapeHtml(n.title)}</h4>
      <p>${escapeHtml(n.body)}</p>
      <button class="delete-notice-btn" data-id="${n.id}">Delete</button>
    </div>
  `).join('');

  box.querySelectorAll('.delete-notice-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('Delete this notice?')) return;
      await deleteDoc(doc(db, "hostels", hostelId, "notices", btn.dataset.id));
      loadNoticesAdmin();
    });
  });
}

document.getElementById('noticeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('noticeTitle').value.trim();
  const body = document.getElementById('noticeBody').value.trim();
  if(!title || !body) return;
  await addDoc(collection(db, "hostels", hostelId, "notices"), { title, body, createdAt: Date.now() });
  document.getElementById('noticeForm').reset();
  loadNoticesAdmin();
});

/* ============================================================
   GALLERY (Admin)
   ============================================================ */
async function loadGalleryAdmin(){
  const box = document.getElementById('galleryAdminGrid');
  box.innerHTML = '<p class="muted-note">Loading…</p>';
  const snap = await getDocs(collection(db, "hostels", hostelId, "gallery"));
  if(snap.empty){ box.innerHTML = '<p class="muted-note">No photos uploaded yet.</p>'; return; }

  box.innerHTML = '';
  snap.forEach(d => {
    const g = d.data();
    const tile = document.createElement('div');
    tile.className = 'gallery-tile';
    tile.innerHTML = `<img src="${g.url}" alt="Gallery photo"><button class="delete-gallery-btn" data-id="${d.id}">✕</button>`;
    box.appendChild(tile);
  });

  box.querySelectorAll('.delete-gallery-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('Delete this photo?')) return;
      await deleteDoc(doc(db, "hostels", hostelId, "gallery", btn.dataset.id));
      loadGalleryAdmin();
    });
  });
}

document.getElementById('galleryUploadInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'hostel-portal/gallery');
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
  const data = await res.json();
  if(data.secure_url){
    await addDoc(collection(db, "hostels", hostelId, "gallery"), { url: data.secure_url, createdAt: Date.now() });
    loadGalleryAdmin();
  }
  e.target.value = '';
});

/* ============================================================
   HOSTEL CONTACT SETTINGS (Admin)
   ============================================================ */
async function loadSettings(){
  const snap = await getDoc(doc(db, "hostels", hostelId));
  const data = snap.exists() ? snap.data() : {};
  document.getElementById('wardenName').value = data.wardenName || '';
  document.getElementById('wardenPhone').value = data.wardenPhone || '';
  document.getElementById('hostelEmailInfo').value = data.hostelEmail || '';
}
document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  await setDoc(doc(db, "hostels", hostelId), {
    wardenName: document.getElementById('wardenName').value.trim(),
    wardenPhone: document.getElementById('wardenPhone').value.trim(),
    hostelEmail: document.getElementById('hostelEmailInfo').value.trim(),
  }, { merge: true });
  alert('Saved.');
});

/* ---------- Helpers ---------- */
function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
function escapeAttr(str){ return (str || '').replace(/"/g, '&quot;'); }

/* ---------- Initial load ---------- */
loadPending();
loadStudents();
loadTrash();
loadLeaveRequests();
loadComplaintsAdmin();
loadNoticesAdmin();
loadGalleryAdmin();
loadSettings();