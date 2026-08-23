// ============================================================
// carousel.js — Home page hero photo carousel
//
// HOW TO ADD YOUR PHOTOS:
// 1. Put your photos inside: assets/hostel-photos/
// 2. Name them photo1.jpg, photo2.jpg, photo3.jpg ... in order.
// 3. Set PHOTO_COUNT below to how many photos you have.
//    That's it — everything else (arrows, auto-play, etc.)
//    works automatically.
//
// Performance note: with a large number of photos (e.g. 98),
// this carousel does NOT load all of them at once — it only
// loads the photo currently showing plus the next one just
// before it's needed, so the page stays fast.
// ============================================================

const PHOTO_COUNT = 8;               // <-- change this to your total number of photos
const PHOTO_EXTENSION = "jpg";       // <-- change to "png" if your photos are PNG files
const AUTO_PLAY_MS = 5000;

const PHOTOS = Array.from(
  { length: PHOTO_COUNT },
  (_, i) => `assets/hostel-photos/photo${i + 1}.${PHOTO_EXTENSION}`
);

const track = document.getElementById('carouselTrack');
const dotsBox = document.getElementById('carouselDots');
const prevBtn = document.getElementById('carouselPrev');
const nextBtn = document.getElementById('carouselNext');

let current = 0;
let timer = null;

// Two stacked <img> layers, crossfaded between — only 2 photos
// are ever in memory at once, not all of them.
const layerA = document.createElement('img');
const layerB = document.createElement('img');
layerA.className = 'carousel-slide active';
layerB.className = 'carousel-slide';
[layerA, layerB].forEach(img => { img.alt = 'Hostel photo'; img.loading = 'eager'; });
track.appendChild(layerA);
track.appendChild(layerB);

let activeLayer = layerA;
let inactiveLayer = layerB;

// If there are many photos, a row of dots would be unreadable —
// show a simple "3 / 98" counter instead once past ~12 photos.
const useCounter = PHOTOS.length > 12;
if(useCounter){
  dotsBox.classList.add('carousel-counter');
}

function updateIndicator(){
  if(useCounter){
    dotsBox.textContent = `${current + 1} / ${PHOTOS.length}`;
  } else {
    dotsBox.innerHTML = PHOTOS.map((_, i) =>
      `<button class="carousel-dot ${i === current ? 'active' : ''}" data-i="${i}" aria-label="Go to photo ${i + 1}"></button>`
    ).join('');
    dotsBox.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => goTo(parseInt(dot.dataset.i, 10)));
    });
  }
}

function goTo(index){
  current = (index + PHOTOS.length) % PHOTOS.length;

  inactiveLayer.onload = () => {
    inactiveLayer.classList.add('active');
    activeLayer.classList.remove('active');
    const temp = activeLayer;
    activeLayer = inactiveLayer;
    inactiveLayer = temp;
  };
  inactiveLayer.onerror = () => {
    // Missing photo file — just skip to the next one instead of getting stuck
    next();
  };
  inactiveLayer.src = PHOTOS[current];

  updateIndicator();
  resetTimer();
}

function next(){ goTo(current + 1); }
function prev(){ goTo(current - 1); }

function resetTimer(){
  clearInterval(timer);
  timer = setInterval(next, AUTO_PLAY_MS);
}

prevBtn.addEventListener('click', prev);
nextBtn.addEventListener('click', next);

if(PHOTOS.length > 0){
  activeLayer.src = PHOTOS[0];
  updateIndicator();
  resetTimer();
} else {
  document.getElementById('homeCarousel').classList.add('hidden');
}