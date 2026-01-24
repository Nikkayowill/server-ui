// Cookie Consent Banner
(function() {
  // Check if user already accepted cookies
  if (localStorage.getItem('cookieConsent') === 'accepted') {
    return;
  }

  // Create banner HTML
  const banner = document.createElement('div');
  banner.id = 'cookieConsent';
  banner.className = 'fixed bottom-0 left-0 right-0 bg-gray-800 border-t-2 border-brand shadow-lg z-50 p-4';
  banner.innerHTML = `
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-start gap-3 flex-1">
        <svg class="w-6 h-6 text-brand flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"/>
        </svg>
        <p class="text-sm text-gray-300">
          We use cookies to enhance your experience, analyze site traffic, and improve our services. 
          By continuing to use this site, you consent to our use of cookies. 
          <a href="/privacy" class="text-brand hover:text-cyan-400 underline">Learn more</a>
        </p>
      </div>
      <div class="flex gap-3 flex-shrink-0">
        <button id="acceptCookies" class="px-6 py-2 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">
          Accept
        </button>
        <button id="declineCookies" class="px-6 py-2 border-2 border-gray-600 text-gray-300 font-bold rounded-lg hover:border-brand hover:text-brand transition-colors">
          Decline
        </button>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(banner);

  // Handle accept
  document.getElementById('acceptCookies').addEventListener('click', function() {
    localStorage.setItem('cookieConsent', 'accepted');
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  });

  // Handle decline
  document.getElementById('declineCookies').addEventListener('click', function() {
    localStorage.setItem('cookieConsent', 'declined');
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  });

  // Animate in
  setTimeout(() => {
    banner.style.transition = 'all 0.3s ease';
  }, 100);
})();
