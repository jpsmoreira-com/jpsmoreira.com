const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('nav-links');

navToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});
