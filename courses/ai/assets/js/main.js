// Mobile nav toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.navbar-nav');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// Active nav link based on current page
(function markActive() {
  const path = window.location.pathname;
  document.querySelectorAll('.navbar-nav a').forEach(a => {
    if (a.getAttribute('href') && path.endsWith(a.getAttribute('href').replace('../', '').replace('./', ''))) {
      a.classList.add('active');
    }
  });
})();

// Smooth reveal on scroll
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
