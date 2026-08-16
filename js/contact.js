import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTELS = [
  { id: "main-boys-hostel", label: "Main Boys Hostel" },
  { id: "e-block-hostel", label: "E-Block Hostel" }
];

async function load(){
  const box = document.getElementById('contactGrid');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  let cards = '';
  for(const h of HOSTELS){
    const snap = await getDoc(doc(db, "hostels", h.id));
    const data = snap.exists() ? snap.data() : {};
    cards += `
      <div class="card contact-card">
        <h3>${h.label}</h3>
        <div class="contact-pill"><label>Warden Name</label><div class="value">${escapeHtml(data.wardenName || 'Not set yet')}</div></div>
        <div class="contact-pill"><label>Warden Phone</label><div class="value">${escapeHtml(data.wardenPhone || 'Not set yet')}</div></div>
        <div class="contact-pill"><label>Hostel Email</label><div class="value">${escapeHtml(data.hostelEmail || 'Not set yet')}</div></div>
      </div>
    `;
  }
  box.innerHTML = cards;
}
function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
load();