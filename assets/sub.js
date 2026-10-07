(() => {
  const nav = document.getElementById('nav'), b = document.getElementById('burger'), m = document.getElementById('menu');
  const on = () => nav && nav.classList.toggle('scrolled', scrollY > 40); addEventListener('scroll', on, { passive: true }); on();
  if (b) b.addEventListener('click', () => { const o = m.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
})();
