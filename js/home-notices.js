import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTEL_LABELS = { "main-boys-hostel": "Main Boys Hostel", "e-block-hostel": "E-Block Hostel" };
const HOSTEL_IDS = Object.keys(HOSTEL_LABELS);

async function loadPreview(){
  const box = document.getElementById('homeNoticesPreview');
  if(!box) return;

  let all = [];
  for(const hostelId of HOSTEL_IDS){
    const snap = await getDocs(collection(db, "hostels", hostelId, "notices"));
    snap.forEach(d => all.push({ ...d.data(), hostelId }));
  }

  if(all.length === 0){
    box.innerHTML = '<p class="muted-note" style="text-align:center; width:100%;">No notices right now.</p>';
    return;
  }

  all.sort((a,b) => b.createdAt - a.createdAt);
  const top3 = all.slice(0, 3);

  box.innerHTML = top3.map(n => `
    <div class="notice-preview-card">
      <h4>${escapeHtml(n.title)}</h4>
      <p>${escapeHtml(n.body)}</p>
      <small>For: ${HOSTEL_LABELS[n.hostelId]}</small>
    </div>
  `).join('');
}

function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

loadPreview();