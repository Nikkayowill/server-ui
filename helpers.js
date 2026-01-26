// HTML Head with CSS links
function getHTMLHead(title) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="/css/global.css">
</head>
<body>
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
    <title>${title}</title>
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="/css/global.css">
</head>
<body>
`;
}

// Scripts footer
function getScripts(...scripts) {
  const scriptTags = scripts.map(script => `<script src="/js/${script}"></script>`).join('\n    ');
  return `
    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
    <script src="/js/cookie-consent.js"></script>
    ${scriptTags}
</body>
</html>
`;
}

// Footer
function getFooter() {
  return `
    <footer class="bg-black border-t border-blue-500/30 py-12 mt-20">
        <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
                <h3 class="text-blue-400 text-base font-bold mb-4">Basement</h3>
                <p class="text-gray-400 text-sm leading-relaxed">Cloud hosting without the headache. Fast, simple, powerful.</p>
            </div>
            <div>
                <h4 class="text-blue-400 text-sm font-bold mb-3">Quick Links</h4>
                <ul class="space-y-2">
                    <li><a href="/about" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">About</a></li>
                    <li><a href="/pricing" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Pricing</a></li>
                    <li><a href="/docs" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Documentation</a></li>
                    <li><a href="/contact" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Contact</a></li>
                    <li><a href="/faq" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">FAQ</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-blue-400 text-sm font-bold mb-3">Legal</h4>
                <ul class="space-y-2">
                    <li><a href="/terms" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Terms of Service</a></li>
                    <li><a href="/privacy" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div class="text-center mt-10 pt-6 border-t border-blue-500/30 max-w-6xl mx-auto px-8">
            <p class="text-gray-500 text-xs">&copy; ${new Date().getFullYear()} Basement. All rights reserved.</p>
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
                <img src="/TransparentLogo.svg" alt="Clouded Basement">
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

module.exports = {
  getHTMLHead,
  getDashboardHead,
  getScripts,
  getFooter,
  getAuthLinks,
  getResponsiveNav
};
