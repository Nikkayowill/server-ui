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
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/css/global.css">
</head>
<body>
    <div class="matrix-bg"></div>
`;
}

// Scripts footer
function getScripts(...scripts) {
  const scriptTags = scripts.map(script => `<script src="/js/${script}"></script>`).join('\n    ');
  return `
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
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
    <nav class="main-nav">
        <div class="nav-container">
            <a href="/" class="nav-logo">
                <img src="/logo.svg" alt="Clouded Basement">
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
