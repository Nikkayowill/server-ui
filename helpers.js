// HTML escaping to prevent XSS attacks
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// HTML Head with CSS links
function getHTMLHead(title) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="icon" type="image/svg+xml" href="/Favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/tailwind.css">
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="/css/global.css">
</head>
<body>
<div class="spotlight"></div>
`;
}

// Dashboard specific head
function getDashboardHead(title) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="icon" type="image/svg+xml" href="/Favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/tailwind.css">
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="/css/global.css">
</head>
<body>
<div class="spotlight"></div>
`;
}

// Scripts footer
function getScripts(...scripts) {
  const scriptTags = scripts.map(script => `<script src="/js/${script}"></script>`).join('\n    ');
  const cacheBuster = Date.now(); // Force browser to reload JS files
  return `
    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="/js/cookie-consent.js?v=${cacheBuster}"></script>
    <script src="/js/spotlight.js"></script>
    ${scriptTags}
</body>
</html>
`;
}

// Footer
function getFooter() {
  return `
    <footer class="mt-12 md:mt-20 relative overflow-hidden">
        <!-- Gradient reflection -->
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute inset-0" style="background-image: radial-gradient(circle 600px at 50% 0%, rgba(96, 165, 250, 0.12) 0%, rgba(232, 121, 249, 0.07) 35%, rgba(94, 234, 212, 0.05) 65%, transparent 100%);"></div>
        </div>

        <!-- Top border -->
        <div class="max-w-2xl mx-auto px-5 sm:px-8">
          <div class="border-t border-gray-800"></div>
        </div>

        <!-- Main footer columns — center-aligned -->
        <div class="max-w-2xl mx-auto px-5 sm:px-8 pt-10 pb-6 relative z-10">
            <div class="flex flex-wrap justify-center gap-12 sm:gap-16 text-center">

                <!-- Product -->
                <div>
                    <h4 class="text-white text-xs font-bold tracking-wide uppercase mb-3">Product</h4>
                    <ul class="space-y-2">
                        <li><a href="/pricing" class="text-gray-400 text-sm hover:text-white transition-colors">Pricing</a></li>
                        <li><a href="/compare" class="text-gray-400 text-sm hover:text-white transition-colors">Compare</a></li>
                        <li><a href="/docs" class="text-gray-400 text-sm hover:text-white transition-colors">Docs</a></li>
                        <li><a href="/faq" class="text-gray-400 text-sm hover:text-white transition-colors">FAQ</a></li>
                    </ul>
                </div>

                <!-- Company -->
                <div>
                    <h4 class="text-white text-xs font-bold tracking-wide uppercase mb-3">Company</h4>
                    <ul class="space-y-2">
                        <li><a href="/about" class="text-gray-400 text-sm hover:text-white transition-colors">About</a></li>
                        <li><a href="/contact" class="text-gray-400 text-sm hover:text-white transition-colors">Contact</a></li>
                        <li><a href="/is-this-safe" class="text-gray-400 text-sm hover:text-white transition-colors">Security</a></li>
                    </ul>
                </div>

                <!-- Legal -->
                <div>
                    <h4 class="text-white text-xs font-bold tracking-wide uppercase mb-3">Legal</h4>
                    <ul class="space-y-2">
                        <li><a href="/terms" class="text-gray-400 text-sm hover:text-white transition-colors">Terms</a></li>
                        <li><a href="/privacy" class="text-gray-400 text-sm hover:text-white transition-colors">Privacy</a></li>
                    </ul>
                </div>

            </div>
        </div>

        <!-- Bottom bar -->
        <div class="max-w-2xl mx-auto px-5 sm:px-8 pb-8 relative z-10">
            <div class="border-t border-gray-800/60 pt-6 flex flex-col items-center gap-3 text-center">
                <p class="text-gray-600 text-xs">&copy; ${new Date().getFullYear()} Clouded Basement. All rights reserved.</p>
                <a href="/is-this-safe" class="text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors">Is Clouded Basement safe? &rarr;</a>
            </div>
        </div>
    </footer>
`;
}

// Auth Links
function getAuthLinks(req) {
  const linkClass = 'uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]';
  
  if (req.session.userId) {
    const isAdmin = req.session.userRole === 'admin';
    
    if (isAdmin) {
      return `<li><a href="/admin" class="${linkClass}">Admin</a></li><li><a href="/logout" class="${linkClass}">Logout</a></li>`;
    } else {
      return `<li><a href="/dashboard" class="${linkClass}">Dashboard</a></li><li><a href="/logout" class="${linkClass}">Logout</a></li>`;
    }
  } else {
    return `<li><a href="/login" class="${linkClass}">Login</a></li>`;
  }
}

// Responsive Nav
function getResponsiveNav(req) {
  const isAdmin = req.session?.userRole === 'admin';
  
  let navLinks = '';
  const userInitial = req.session.userEmail ? req.session.userEmail.charAt(0).toUpperCase() : '';
  
  if (isAdmin) {
    navLinks = `
      <li><a href="/admin" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Admin</a></li>
      <li><a href="/docs" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Docs</a></li>
      <li><a href="/logout" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Logout</a></li>
      ${userInitial ? `<li class="ml-4"><div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/30 border border-blue-400/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(0,102,255,0.6)] transition-all duration-300 cursor-pointer" title="${req.session.userEmail}">${userInitial}</div></li>` : ''}
    `;
  } else {
    navLinks = `
      <li><a href="/" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Home</a></li>
      <li><a href="/about" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">About</a></li>
      <li><a href="/docs" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Docs</a></li>
      <li><a href="/pricing" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Pricing</a></li>
      <li><a href="/contact" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-blue-400 hover:scale-110 hover:drop-shadow-[0_0_12px_rgba(0,102,255,0.8)]">Contact</a></li>
      ${getAuthLinks(req)}
      ${userInitial ? `<li class="ml-4"><div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/30 border border-blue-400/20 hover:scale-110 hover:shadow-[0_0_20px_rgba(0,102,255,0.6)] transition-all duration-300 cursor-pointer" title="${req.session.userEmail}">${userInitial}</div></li>` : ''}
    `;
  }

  return `
    <nav class="main-nav">
        <div class="nav-container">
            <a href="/" class="nav-logo">
                <img src="/Minimalist%20Logo%20Suite%20for%20Clouded%20Basement.png" alt="Clouded Basement">
            </a>
            <ul class="nav-links">
                ${navLinks}
            </ul>
            <button class="hamburger" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>
  `;
}

/**
 * Dashboard Sidebar Component
 * @param {Object} options - Sidebar configuration
 * @param {string} options.userEmail - User's email for avatar
 * @param {string} options.plan - User's plan (basic, pro, premium)
 * @param {Array} options.navItems - Array of {id, label, icon, href}
 * @param {string} options.activeSection - Currently active section ID
 */
function getDashboardSidebar(options = {}) {
  const { userEmail = 'User', plan = 'basic', navItems = [], activeSection = 'overview' } = options;
  const userInitial = userEmail.charAt(0).toUpperCase();
  const planDisplay = plan.toUpperCase();
  
  const navItemsHtml = navItems.map(item => `
    <li>
      <a href="${item.href || '#' + item.id}" class="sidebar-nav-link${item.id === activeSection ? ' active' : ''}" data-section="${item.id}">
        ${item.icon}
        ${escapeHtml(item.label)}
      </a>
    </li>
  `).join('');
  
  return `
    <aside id="dashboard-sidebar" class="dashboard-sidebar">
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${userInitial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${escapeHtml(userEmail)}</div>
          <div class="sidebar-user-plan">${planDisplay} Plan</div>
        </div>
      </div>
      <nav class="sidebar-section">
        <ul class="sidebar-nav-list">
          ${navItemsHtml}
        </ul>
      </nav>
    </aside>
  `;
}

/**
 * Dashboard Layout Start - Opens the dashboard grid with sidebar and overlay
 * @param {Object} options - Layout configuration
 * @param {string} options.userEmail - User's email
 * @param {string} options.plan - User's plan
 * @param {Array} options.navItems - Navigation items
 * @param {string} options.pageTitle - Title shown in mobile header
 */
function getDashboardLayoutStart(options = {}) {
  const { pageTitle = 'Overview' } = options;
  
  return `
    <div class="dashboard-grid">
      ${getDashboardSidebar(options)}
      
      <!-- Mobile Sidebar Overlay -->
      <div id="sidebar-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden"></div>
      
      <!-- Main Content Area -->
      <main class="dashboard-content">
        <!-- Mobile Header with Toggle -->
        <header class="dashboard-mobile-header">
          <button id="sidebar-toggle" type="button" class="sidebar-toggle-btn" aria-label="Toggle sidebar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <h1 id="section-title" class="text-lg font-medium text-[var(--dash-text-primary)]">${escapeHtml(pageTitle)}</h1>
        </header>
  `;
}

/**
 * Dashboard Layout End - Closes the dashboard grid
 */
function getDashboardLayoutEnd() {
  return `
      </main>
    </div>
    
    <script>
    // Sidebar toggle - inline for reliability
    (function() {
      const toggle = document.getElementById('sidebar-toggle');
      const sidebar = document.getElementById('dashboard-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      
      if (toggle && sidebar) {
        toggle.addEventListener('click', function(e) {
          e.preventDefault();
          sidebar.classList.toggle('open');
          if (overlay) overlay.classList.toggle('hidden');
          document.body.classList.toggle('sidebar-open');
        });
      }
      
      if (overlay) {
        overlay.addEventListener('click', function() {
          sidebar.classList.remove('open');
          overlay.classList.add('hidden');
          document.body.classList.remove('sidebar-open');
        });
      }
      
      // Close sidebar when nav link clicked (mobile)
      document.querySelectorAll('.sidebar-nav-link').forEach(function(link) {
        link.addEventListener('click', function() {
          if (window.innerWidth < 1024) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.add('hidden');
            document.body.classList.remove('sidebar-open');
          }
        });
      });
    })();
    </script>
  `;
}

module.exports = {
  escapeHtml,
  getHTMLHead,
  getDashboardHead,
  getScripts,
  getFooter,
  getAuthLinks,
  getResponsiveNav,
  getDashboardSidebar,
  getDashboardLayoutStart,
  getDashboardLayoutEnd
};



