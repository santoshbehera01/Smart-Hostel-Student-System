import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const HOSTEL_IDS = ["main-boys-hostel", "e-block-hostel"];

async function load(){
  const box = document.getElementById('galleryGrid');
  box.innerHTML = '<p class="muted-note">Loading…</p>';

  let all = [];
  for(const hostelId of HOSTEL_IDS){
    const snap = await getDocs(collection(db, "hostels", hostelId, "gallery"));
    snap.forEach(d => all.push(d.data()));
  }

  if(all.length === 0){ box.innerHTML = '<p class="muted-note">No photos uploaded yet.</p>'; return; }
  all.sort((a,b) => b.createdAt - a.createdAt);

  box.innerHTML = all.map(g => `<div class="gallery-tile"><img src="${g.url}" alt="Hostel gallery photo"></div>`).join('');
}
load();