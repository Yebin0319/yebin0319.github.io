// 구예빈의 포트폴리오 — shared behavior

document.addEventListener('DOMContentLoaded', () => {
  // ---- Mobile menu toggle ----
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // ---- Dropdown: click-to-toggle for touch devices (hover still works via CSS) ----
  document.querySelectorAll('.nav-item.has-dropdown > .nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (window.matchMedia('(hover: none)').matches) {
        e.preventDefault();
        link.parentElement.classList.toggle('is-open');
      }
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-item.has-dropdown.is-open').forEach((item) => {
      if (!item.contains(e.target)) item.classList.remove('is-open');
    });
  });

  // ---- Scroll reveal ----
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ---- Active nav link highlight ----
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
    if (link.dataset.page === path) link.classList.add('active');
  });
});
