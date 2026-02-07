/**
 * Documentation Table of Contents - Active Section Highlighting
 * Extracted from pagesController.js showDocs()
 */

// Smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Intersection Observer for active section highlighting
const sections = document.querySelectorAll('section[id]');
const tocLinks = document.querySelectorAll('.toc-link');

const observerOptions = {
  root: null,
  rootMargin: '-100px 0px -70% 0px',
  threshold: 0
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      
      // Remove active class from all links
      tocLinks.forEach(link => {
        link.classList.remove('text-blue-400', 'border-blue-500', 'bg-gray-800');
        link.classList.add('text-gray-300', 'border-transparent');
      });
      
      // Add active class to current section's links
      document.querySelectorAll(`a[href="#${id}"]`).forEach(link => {
        if (link.classList.contains('toc-link')) {
          link.classList.remove('text-gray-300', 'border-transparent');
          link.classList.add('text-blue-400', 'border-blue-500', 'bg-gray-800');
        }
      });
    }
  });
}, observerOptions);

sections.forEach(section => observer.observe(section));

// Fallback for hash navigation on page load
if (window.location.hash) {
  const hash = window.location.hash.substring(1);
  const targetLink = document.querySelector(`.toc-link[href="#${hash}"]`);
  if (targetLink) {
    tocLinks.forEach(link => {
      link.classList.remove('text-blue-400', 'border-blue-500');
      link.classList.add('text-gray-400', 'border-transparent');
    });
    targetLink.classList.remove('text-gray-400', 'border-transparent');
    targetLink.classList.add('text-blue-400', 'border-blue-500');
  }
}
