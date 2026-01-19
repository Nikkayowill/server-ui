// HTML Head with CSS links
function getHTMLHead(title) {
  return `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="/logo.svg">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/dashboard.css">
    <link rel="stylesheet" href="/css/tailwind.css">
    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
</head>
<body>
    <div class="matrix-bg"></div>
`;
}

// Dashboard specific head
function getDashboardHead(title) {
  return `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="/logo.svg">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/tailwind.css">
    <script src="https://cdn.jsdelivr.net/npm/flowbite@2.5.2/dist/flowbite.min.js"></script>
</head>
<body>
    <div class="matrix-bg"></div>
`;
}

// Scripts footer
function getScripts(...scripts) {
  const scriptTags = scripts.map(script => `<script src="/js/${script}"></script>`).join('\n    ');
  return `
    ${scriptTags}
</body>
</html>
`;
}

// Footer
function getFooter() {
  return `
    <footer style="background: rgba(2, 8, 20, 0.8); border-top: 1px solid rgba(136, 254, 0, 0.1); padding: 40px 5vw; margin-top: 80px;">
        <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px;">
            <div>
                <h3 style="color: var(--glow); font-size: 16px; margin-bottom: 16px;">Basement</h3>
                <p style="color: var(--text-secondary); font-size: 12px; line-height: 1.8;">Cloud hosting without the headache. Fast, simple, powerful.</p>
            </div>
            <div>
                <h4 style="color: var(--glow); font-size: 14px; margin-bottom: 12px;">Quick Links</h4>
                <ul style="list-style: none;">
                    <li style="margin-bottom: 8px;"><a href="/about" style="color: var(--text-secondary); font-size: 12px;">About</a></li>
                    <li style="margin-bottom: 8px;"><a href="/pricing" style="color: var(--text-secondary); font-size: 12px;">Pricing</a></li>
                    <li style="margin-bottom: 8px;"><a href="/docs" style="color: var(--text-secondary); font-size: 12px;">Documentation</a></li>
                    <li style="margin-bottom: 8px;"><a href="/contact" style="color: var(--text-secondary); font-size: 12px;">Contact</a></li>
                    <li style="margin-bottom: 8px;"><a href="/faq" style="color: var(--text-secondary); font-size: 12px;">FAQ</a></li>
                </ul>
            </div>
            <div>
                <h4 style="color: var(--glow); font-size: 14px; margin-bottom: 12px;">Legal</h4>
                <ul style="list-style: none;">
                    <li style="margin-bottom: 8px;"><a href="/terms" style="color: var(--text-secondary); font-size: 12px;">Terms of Service</a></li>
                    <li style="margin-bottom: 8px;"><a href="/privacy" style="color: var(--text-secondary); font-size: 12px;">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(136, 254, 0, 0.1);">
            <p style="color: #666; font-size: 11px;">&copy; ${new Date().getFullYear()} Basement. All rights reserved.</p>
        </div>
    </footer>
`;
}

// Auth Links
function getAuthLinks(req) {
  const linkClass = 'uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]';
  
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
  if (isAdmin) {
    navLinks = `
      <li><a href="/admin" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Admin</a></li>
      <li><a href="/docs" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Docs</a></li>
      <li><a href="/logout" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Logout</a></li>
    `;
  } else {
    navLinks = `
      <li><a href="/" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Home</a></li>
      <li><a href="/about" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">About</a></li>
      <li><a href="/docs" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Docs</a></li>
      <li><a href="/pricing" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Pricing</a></li>
      <li><a href="/contact" class="uppercase tracking-wider text-gray-400 text-xs transition-all duration-300 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(45,167,223,0.8)]">Contact</a></li>
      ${getAuthLinks(req)}
    `;
  }

  return `
    <nav class="fixed top-5 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-[1000] bg-gray-900/85 backdrop-blur-xl px-8 py-3 rounded-lg shadow-[0_0_30px_rgba(45,167,223,0.12)] border border-cyan-500/10">
        <div class="flex justify-between items-center w-full">
            <a href="/" class="text-xl font-bold text-cyan-400 flex-shrink-0">
                <img src="/logo.svg" alt="Clouded Basement" class="h-10 w-auto block">
            </a>
            <button class="hamburger hidden flex-col gap-1.5 bg-transparent border-0 cursor-pointer p-2 flex-shrink-0 z-[1001] ml-auto w-10 h-10 justify-center items-center" aria-label="Toggle menu">
                <span class="w-6 h-0.5 bg-cyan-400 transition-all duration-300 block"></span>
                <span class="w-6 h-0.5 bg-cyan-400 transition-all duration-300 block"></span>
                <span class="w-6 h-0.5 bg-cyan-400 transition-all duration-300 block"></span>
            </button>
            <ul class="nav-links flex gap-10 list-none m-0 p-0">
                ${navLinks}
            </ul>
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
