document.addEventListener('DOMContentLoaded', () => {
  const isTouchDevice = !window.matchMedia('(hover: hover)').matches;

  /* ---------- Hamburger menu (mobile) ---------- */
  const hamburger = document.getElementById('navHamburger');
  const mainNav = document.querySelector('.main-nav');
  if(hamburger && mainNav){
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      mainNav.classList.toggle('mobile-open');
    });
  }

  /* ---------- Student Life dropdown ---------- */
  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    if(!toggle || !menu) return;

    function isMobileWidth(){
      return window.innerWidth <= 768;
    }

    function positionMenu(){
      if(isMobileWidth()) return; // CSS makes it static/inline on mobile, no positioning needed
      const rect = toggle.getBoundingClientRect();
      menu.style.top = `${rect.bottom}px`;
      menu.style.left = `${rect.left}px`;
    }

    function openMenu(){
      positionMenu();
      document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => { if(m !== menu) m.classList.remove('open'); });
      menu.classList.add('open');
    }
    function closeMenu(){
      menu.classList.remove('open');
    }

    // Click / tap toggle — always works, on both desktop and mobile
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if(menu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    // Hover open/close — only for devices with a real mouse (not touch)
    if(!isTouchDevice){
      dropdown.addEventListener('mouseenter', openMenu);
      dropdown.addEventListener('mouseleave', closeMenu);
    }
  });

  // Close any open dropdown / mobile menu when clicking elsewhere or resizing
  document.addEventListener('click', (e) => {
    if(mainNav && !mainNav.contains(e.target) && e.target !== hamburger){
      document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }
  });
  window.addEventListener('scroll', () => {
    if(!isTouchDevice){
      document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }
  }, { passive: true });
  window.addEventListener('resize', () => {
    document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
  });
});