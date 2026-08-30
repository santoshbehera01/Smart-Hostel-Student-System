document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    if(!toggle || !menu) return;

    function positionMenu(){
      const rect = toggle.getBoundingClientRect();
      menu.style.top = `${rect.bottom}px`;
      menu.style.left = `${rect.left}px`;
    }

    function openMenu(){
      positionMenu();
      document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
      menu.classList.add('open');
    }
    function closeMenu(){
      menu.classList.remove('open');
    }

    // Click / tap toggle (works on both desktop and mobile)
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if(menu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    // Hover open/close (desktop mouse users)
    dropdown.addEventListener('mouseenter', openMenu);
    dropdown.addEventListener('mouseleave', closeMenu);
  });

  // Close any open dropdown when clicking elsewhere, scrolling, or resizing
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
  });
  window.addEventListener('scroll', () => {
    document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }, { passive: true });
  window.addEventListener('resize', () => {
    document.querySelectorAll('.nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
  });
});