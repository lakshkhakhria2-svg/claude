// Shared behaviour for every page: mobile menu + scroll reveal.
document.documentElement.classList.add('js');

document.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
  const menu = document.getElementById(btn.getAttribute('aria-controls'));
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('hidden', open);
  });
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.add('hidden');
    })
  );
});

const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('is-visible'));
}
