// Cookie Consent Banner
(function() {
  // Helper functions with fallback to cookies if localStorage fails
  function getConsent() {
    try {
      // Try localStorage first
      const local = localStorage.getItem('cookieConsent');
      if (local) return local;
    } catch (e) {
      console.log('[Cookie] localStorage not available');
    }
    // Fallback to cookie
    const match = document.cookie.match(/cookieConsent=([^;]+)/);
    return match ? match[1] : null;
  }
  
  function setConsent(value) {
    try {
      localStorage.setItem('cookieConsent', value);
    } catch (e) {
      console.log('[Cookie] localStorage failed, using cookie');
    }
    // Always set cookie as backup (expires in 1 year)
    document.cookie = 'cookieConsent=' + value + '; path=/; max-age=31536000; SameSite=Lax';
  }
  
  // Check if user already made a choice (accepted or declined)
  const consent = getConsent();
  console.log('[Cookie] Current consent value:', consent);
  if (consent === 'accepted' || consent === 'declined') {
    console.log('[Cookie] User already made choice, not showing banner');
    return;
  }
  console.log('[Cookie] Showing banner');

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
    setConsent('accepted');
    console.log('[Cookie] Set to accepted');
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  });

  // Handle decline
  document.getElementById('declineCookies').addEventListener('click', function() {
    setConsent('declined');
    console.log('[Cookie] Set to declined');
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  });

  // Animate in
  setTimeout(() => {
    banner.style.transition = 'all 0.3s ease';
  }, 100);
})();
