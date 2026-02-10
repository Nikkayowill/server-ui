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

// Mobile sidebar toggle
const tocToggle = document.getElementById('docsTocToggle');
const sidebar = document.getElementById('docsSidebar');
const backdrop = document.getElementById('docsSidebarBackdrop');

function openSidebar() {
  sidebar.classList.add('open');
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

if (tocToggle) {
  tocToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
}

if (backdrop) {
  backdrop.addEventListener('click', closeSidebar);
}

// Close sidebar when a TOC link is clicked on mobile
tocLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  });
});

// Scroll to top button
const scrollToTopBtn = document.getElementById('scrollToTop');
if (scrollToTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible');
    }
  });
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
