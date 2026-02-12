/**
 * Scroll Reveal - Lightweight IntersectionObserver-based entrance animations
 * Adds .revealed class when elements enter the viewport.
 * Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  // Skip entirely if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // animate once only
        }
      });
    },
    {
      threshold: 0.15, // trigger when 15% visible
      rootMargin: '0px 0px -40px 0px', // slight offset so it feels natural
    }
  );

  // Observe all reveal targets
  document.querySelectorAll('.reveal, .reveal-scale, .reveal-stagger').forEach((el) => {
    observer.observe(el);
  });
})();
