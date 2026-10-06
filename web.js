'use strict';

/* ==========================================================
   Rincón de Nina · Tanti, Córdoba
   Todo vanilla JS. Los links de WhatsApp y Booking también están
   escritos en el HTML para que funcionen aunque el JS no cargue.
   ========================================================== */

const WHATSAPP = '5493516595497'; // +54 9 351 659-5497 (Kary)
const MAX_GUESTS = 10;

/* ---------- Navegación ---------- */
(function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!nav || !toggle || !menu) return;

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // El menú es un panel a pantalla completa (desktop y móvil): se bloquea el scroll mientras está abierto
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (open) menu.querySelector('a').focus({ preventScroll: true });
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();

/* ---------- Aparición al hacer scroll ---------- */
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
})();

/* ---------- Lightbox de la galería ---------- */
(function initLightbox() {
  const items = Array.from(document.querySelectorAll('.gallery__item'));
  const box = document.getElementById('lightbox');
  if (!items.length || !box) return;

  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const closeBtn = box.querySelector('.lightbox__close');
  const prevBtn = box.querySelector('.lightbox__nav--prev');
  const nextBtn = box.querySelector('.lightbox__nav--next');
  let current = 0;
  let lastFocus = null;

  const show = (i) => {
    current = (i + items.length) % items.length;
    const link = items[current];
    const alt = link.querySelector('img').alt;
    img.src = link.getAttribute('href');
    img.alt = alt;
    caption.textContent = `${alt} (${current + 1}/${items.length})`;
  };

  const open = (i) => {
    lastFocus = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.classList.add('lb-open');
    closeBtn.focus();
  };

  const close = () => {
    box.hidden = true;
    document.body.classList.remove('lb-open');
    img.removeAttribute('src');
    if (lastFocus) lastFocus.focus();
  };

  items.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      open(i);
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') {
      // Mantiene el foco dentro del lightbox
      const focusables = [closeBtn, prevBtn, nextBtn];
      const idx = focusables.indexOf(document.activeElement);
      const next = e.shiftKey ? idx - 1 : idx + 1;
      e.preventDefault();
      focusables[(next + focusables.length) % focusables.length].focus();
    }
  });

  // Deslizar en pantallas táctiles
  let startX = null;
  box.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();

/* ---------- Formulario → WhatsApp ---------- */
(function initBookingForm() {
  const form = document.getElementById('reserva-form');
  const errorBox = document.getElementById('form-error');
  if (!form || !errorBox) return;

  const { llegada, salida, huespedes, nombre, mensaje } = form.elements;

  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const formatDate = (s) => {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  };
  const nightsBetween = (a, b) => {
    const utc = (s) => { const d = parseISO(s); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };
    return Math.round((utc(b) - utc(a)) / 86400000);
  };

  const today = toISO(new Date());
  llegada.min = today;
  salida.min = today;

  llegada.addEventListener('change', () => {
    if (!llegada.value) return;
    const nextDay = parseISO(llegada.value);
    nextDay.setDate(nextDay.getDate() + 1);
    salida.min = toISO(nextDay);
    if (salida.value && salida.value <= llegada.value) salida.value = '';
  });

  const fail = (field, text) => {
    errorBox.textContent = text;
    field.focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorBox.textContent = '';

    const guests = Number(huespedes.value);
    if (!llegada.value) return fail(llegada, 'Elegí la fecha de llegada.');
    if (llegada.value < today) return fail(llegada, 'La fecha de llegada no puede ser anterior a hoy.');
    if (!salida.value) return fail(salida, 'Elegí la fecha de salida.');
    if (salida.value <= llegada.value) return fail(salida, 'La salida tiene que ser posterior a la llegada.');
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
      return fail(huespedes, `Indicá entre 1 y ${MAX_GUESTS} huéspedes.`);
    }

    const noches = nightsBetween(llegada.value, salida.value);
    const lines = [
      'Hola Kary, quiero consultar disponibilidad en Rincón de Nina (Tanti).',
      `Llegada: ${formatDate(llegada.value)}`,
      `Salida: ${formatDate(salida.value)} (${noches} ${noches === 1 ? 'noche' : 'noches'})`,
      `Huéspedes: ${guests}`,
    ];
    if (nombre.value.trim()) lines.push(`Nombre: ${nombre.value.trim()}`);
    if (mensaje.value.trim()) lines.push(`Mensaje: ${mensaje.value.trim()}`);

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;

    // Un <a> con click() mantiene el gesto del usuario y evita el bloqueo de ventanas emergentes
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
})();

/* ---------- Año del footer ---------- */
(function setYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
