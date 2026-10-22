import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { renderNoticeCard } from './notice-render.js';

const HOSTEL_LABELS = { "main-boys-hostel": "Main Boys Hostel", "e-block-hostel": "E-Block Hostel" };
const HOSTEL_IDS = Object.keys(HOSTEL_LABELS);

async function load(){
  const box = document.getElementById('noticeBoard');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  let all = [];
  for(const hostelId of HOSTEL_IDS){
    const snap = await getDocs(collection(db, "hostels", hostelId, "notices"));
    snap.forEach(d => all.push({ ...d.data(), hostelId }));
  }

  if(all.length === 0){ box.innerHTML = '<p class="muted-note">No notices right now.</p>'; return; }
  all.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = `<div class="notice-list-v2">` +
    all.map(n => renderNoticeCard(n, { hostelLabel: HOSTEL_LABELS[n.hostelId] })).join('') +
    `</div>`;
}
load();