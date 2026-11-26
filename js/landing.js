/* ═══════════════════════════════════════════
   landing.js — Interacciones de la Landing
   ═══════════════════════════════════════════ */

'use strict';

/* ── Navbar scroll effect ─────────────────── */
const navbar = document.getElementById('navbar');

function handleScroll() {
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });

/* ── Mobile menu toggle ───────────────────── */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
  navToggle.classList.toggle('active');
});

// Cerrar menú al hacer clic en un enlace
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    navToggle.classList.remove('active');
  });
});

/* ── Scroll animations (IntersectionObserver) ── */
const animatedElements = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger delay for grouped elements
        const delay = entry.target.closest('.services-grid, .steps-grid, .testimonials-grid')
          ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 100
          : 0;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px',
  }
);

animatedElements.forEach(el => observer.observe(el));

/* ── Smooth scroll for anchor links ───────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
