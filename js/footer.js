import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTELS = [
  { id: "main-boys-hostel", label: "Main Boys Hostel" },
  { id: "e-block-hostel", label: "E-Block Hostel" }
];

async function loadFooterHostelInfo(){
  const box = document.getElementById('footerHostelInfo');
  if(!box) return;

  let html = '';
  for(const h of HOSTELS){
    const snap = await getDoc(doc(db, "hostels", h.id));
    const data = snap.exists() ? snap.data() : {};
    html += `
      <div class="footer-hostel-block">
        <strong>${h.label}</strong>
        <span>${escapeHtml(data.wardenName || 'Warden info coming soon')}</span>
        <span>${escapeHtml(data.wardenPhone || '')}</span>
      </div>
    `;
  }
  box.innerHTML = html;
}

function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

loadFooterHostelInfo();

// Auto-fill the current year in the bottom bar
const yearEl = document.getElementById('footerYear');
if(yearEl) yearEl.textContent = new Date().getFullYear();