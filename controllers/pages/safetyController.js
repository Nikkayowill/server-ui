const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

exports.showSafety = (req, res) => {
  res.send(`
${getHTMLHead('Security & Trust - Clouded Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-3xl mx-auto px-8 md:px-12 lg:px-16">
        <!-- Page Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">Security & Trust</h1>
        <p class="text-gray-400 text-lg mb-12">How we protect your data, payments, and infrastructure.</p>
        
        <!-- Section 1: Payment Security -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-brand">🔒</span> Payment Security
          </h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">All payment processing is handled by <a href="https://stripe.com" target="_blank" rel="noopener" class="text-brand hover:text-cyan-400 underline">Stripe</a>, a PCI DSS Level 1 certified payment processor trusted by millions of businesses worldwide.</p>
          
          <ul class="list-none space-y-3 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Card data never touches our servers</strong> — payment information is transmitted directly to Stripe via their secure Elements SDK</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">3D Secure authentication</strong> — supported automatically for cards that require additional verification</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Full refund capability</strong> — cancel anytime, no hidden fees or long-term contracts</li>
          </ul>
        </section>
        
        <!-- Section 2: Platform Security -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-brand">🛡️</span> Platform Security
          </h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Clouded Basement is built with industry-standard security practices:</p>
          
          <ul class="list-none space-y-3 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Password hashing</strong> — all passwords are hashed using bcrypt with per-user salts, making them unreadable even in the event of a data breach</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">SQL injection protection</strong> — all database queries use parameterized statements, preventing malicious input from accessing or modifying data</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">CSRF protection</strong> — all forms include cross-site request forgery tokens, preventing unauthorized actions on your behalf</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Rate limiting</strong> — authentication and sensitive endpoints are rate-limited to prevent brute-force attacks</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">HTTPS everywhere</strong> — all traffic is encrypted using TLS 1.2+ with valid SSL certificates</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">HTTP security headers</strong> — we use Helmet.js to set secure headers including Content Security Policy, X-Frame-Options, and more</li>
          </ul>
          
          <p class="text-gray-400 text-base">For a complete overview, see our <a href="/docs" class="text-brand hover:text-cyan-400 underline">documentation</a> and <a href="/privacy" class="text-brand hover:text-cyan-400 underline">privacy policy</a>.</p>
        </section>
        
        <!-- Section 3: Infrastructure -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-brand">☁️</span> Infrastructure
          </h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Your server runs on <a href="https://www.digitalocean.com" target="_blank" rel="noopener" class="text-brand hover:text-cyan-400 underline">DigitalOcean</a> infrastructure — the same cloud platform trusted by companies like GitLab, Slack, and Docker.</p>
          
          <ul class="list-none space-y-3 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Dedicated VPS</strong> — each customer gets their own isolated virtual private server, not shared hosting</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Ubuntu 22.04 LTS</strong> — long-term support releases with security updates until 2027</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Automatic SSL</strong> — Let's Encrypt certificates provisioned and renewed automatically</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Full root access</strong> — complete control over your server via SSH</li>
          </ul>
        </section>
        
        <!-- Section 4: Data Ownership -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-brand">📁</span> Data Ownership & Portability
          </h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Your code and data remain entirely yours. Clouded Basement has no vendor lock-in by design:</p>
          
          <ul class="list-none space-y-3 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Full SSH access</strong> — export, backup, or migrate your data at any time</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Standard deployment</strong> — your server uses standard tools (Node.js, systemd, Nginx) with no proprietary configurations</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400"><strong class="text-white">Business continuity</strong> — even if Clouded Basement ceased operations, your server would continue running on DigitalOcean with your existing credentials</li>
          </ul>
          
          <p class="text-gray-400 text-base">See our <a href="/terms" class="text-brand hover:text-cyan-400 underline">terms of service</a> for complete details on data ownership and usage rights.</p>
        </section>
        
        <!-- Section 5: Limitations -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-brand">⚠️</span> Transparency
          </h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Clouded Basement is designed for developers and small teams shipping side projects, MVPs, and production applications. We are not positioned as an enterprise compliance platform:</p>
          
          <ul class="list-none space-y-3 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-yellow-400">Not suitable for HIPAA, SOC 2, or regulated data that requires specialized compliance certifications</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-yellow-400">Operated by a solo founder — support is direct and personal, but not 24/7 SLA-backed</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-yellow-400">New platform — launched in 2026, with an active development roadmap</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">We believe in being upfront about what we are and aren't. If you have specific compliance requirements, please <a href="/contact" class="text-brand hover:text-cyan-400 underline">contact us</a> to discuss whether Clouded Basement is the right fit.</p>
        </section>
        
        <!-- Section 6: Support -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-brand">💬</span> Support
          </h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">When you contact support, you're communicating directly with the founder who built the platform. Response time is typically within 24 hours for all inquiries.</p>
          
          <ul class="list-none space-y-3">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400">Email support for provisioning, deployment, and configuration issues</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400">Free migration assistance for early adopters moving from other hosts</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['✓'] before:absolute before:left-0 before:text-green-400">Dashboard ticket system for tracking ongoing issues</li>
          </ul>
        </section>
        
        <!-- CTA -->
        <div class="mt-16 pt-8 border-t border-blue-500/30 text-center">
          <a href="/pricing" class="inline-block px-8 py-4 text-white bg-brand rounded-lg hover:bg-cyan-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(45,167,223,0.6)] transition-all font-bold uppercase tracking-wider text-sm">View Plans</a>
          <p class="text-gray-500 text-sm mt-4">Questions? <a href="/contact" class="text-brand hover:text-cyan-400 underline">Contact us</a> or review our <a href="/faq" class="text-brand hover:text-cyan-400 underline">FAQ</a>.</p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
