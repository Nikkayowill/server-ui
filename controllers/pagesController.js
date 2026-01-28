const { getHTMLHead, getScripts, getFooter, getResponsiveNav, escapeHtml } = require('../helpers');
const pool = require('../db');

exports.showAbout = (req, res) => {
  res.send(`
${getHTMLHead('About - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-8">ABOUT BASEMENT</h1>
        
        <p class="text-gray-300 text-lg mb-8">I'm Kayo, an IT Web Programming student at NSCC in Halifax, graduating May 2026. Before switching to tech, I worked as a tradesman—different tools, same problem-solving mindset.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">WHY I BUILT THIS</h2>
        
        <p class="text-gray-300 mb-4">I wanted to prove I could build and deploy a real production application from the ground up. Not just for a grade, but something that actually handles payments, provisions servers, and solves a real problem.</p>
        
        <p class="text-gray-300 mb-8">Cloud hosting doesn't need to be complicated. You shouldn't need a PhD to deploy a Node app or a static site. Basement gives you a real server you can SSH into, plus a dashboard for the routine stuff. Simple.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">HOW IT WORKS</h2>
        
        <p class="text-gray-300 mb-4">I'm running this as a small operation. The infrastructure is enterprise-grade (DigitalOcean droplets), but I'm building features incrementally based on what users actually need. Current setup handles individual developers and small teams deploying web apps, APIs, and services.</p>
        
        <p class="text-gray-300 mb-8">As more people use it, I expand capabilities. I prioritize stability over speed—every feature gets tested properly before it ships.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">THE TECH</h2>
        
        <p class="text-gray-300 mb-8">Built with <strong class="text-white">Node.js</strong>, <strong class="text-white">Express</strong>, <strong class="text-white">PostgreSQL</strong>, and <strong class="text-white">Stripe</strong>. Servers run <strong class="text-white">Ubuntu LTS</strong> on <strong class="text-white">DigitalOcean</strong>. Security includes automated OS updates and DDoS protection.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">OPEN SOURCE</h2>
        
        <p class="text-gray-300 mb-4">The entire dashboard and deployment tooling is open source. You can see how everything works, contribute improvements, or fork it for your own projects. Transparency matters.</p>
        
        <p class="mb-8"><a href="#" class="text-blue-300 underline hover:text-blue-200 transition-colors" target="_blank" rel="noopener noreferrer">View on GitHub →</a></p>
        
        <p class="mt-12 pt-8 border-t border-blue-500/30 text-gray-300">This is my capstone project and portfolio piece. If you're evaluating my work or have questions about the technical implementation, <a href="/contact" class="text-blue-300 underline hover:text-blue-200 transition-colors">reach out</a>.</p>
        
        <a href="/" class="inline-block mt-8 px-6 py-3 text-white border border-blue-400 rounded-lg bg-blue-600 hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(135,206,250,0.6)] transition-all font-medium uppercase tracking-wider text-sm">Back to home</a>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showTerms = (req, res) => {
  res.send(`
${getHTMLHead('Terms of Service - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-2">Terms of Service</h1>
        <p class="text-gray-500 text-sm mb-8">Last Updated: January 26, 2026</p>

        <p class="text-gray-400 mb-8">Welcome to <strong class="text-white">Clouded Basement Hosting</strong> ("we," "us," "our," or "the Company"). These Terms of Service ("Terms") govern your access to and use of our cloud hosting services, including virtual private servers (VPS), domain management, and related services (collectively, the "Services"). By creating an account or using our Services, you agree to be bound by these Terms.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">1. Acceptance of Terms</h2>
        <p class="text-gray-400 mb-4">By accessing or using our Services, you represent that you:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Are at least 18 years of age or the age of majority in your jurisdiction</li>
          <li>Have the legal capacity to enter into a binding contract</li>
          <li>Agree to comply with all applicable laws and regulations</li>
          <li>Have read, understood, and accepted these Terms in their entirety</li>
        </ul>
        <p class="text-gray-400 mb-6">If you do not agree to these Terms, you must not use our Services.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">2. Service Description</h2>
        <p class="text-gray-400 mb-4">Clouded Basement Hosting provides cloud infrastructure services including:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li><strong class="text-white">Virtual Private Servers (VPS):</strong> Ubuntu 22.04 server instances with full SSH root access</li>
          <li><strong class="text-white">Custom Domain Support:</strong> Point your domains to your server IP with DNS configuration guidance</li>
          <li><strong class="text-white">SSL Certificates:</strong> One-click Let's Encrypt SSL installation for HTTPS</li>
          <li><strong class="text-white">Git Deployment:</strong> Automated code deployment from GitHub, GitLab, or Bitbucket repositories</li>
          <li><strong class="text-white">Support Services:</strong> Technical assistance via ticketing system</li>
        </ul>
        <p class="text-gray-400 mb-6">Services are provided on a subscription basis with monthly billing cycles. We reserve the right to modify, suspend, or discontinue any aspect of the Services at any time with reasonable notice.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">3. Account Registration and Security</h2>
        <h3 class="text-xl font-bold text-white mt-8 mb-3">3.1 Account Creation</h3>
        <p class="text-gray-400 mb-4">To use our Services, you must create an account by providing accurate, current, and complete information. You agree to:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Provide a valid email address for account verification</li>
          <li>Create a secure password (minimum 8 characters)</li>
          <li>Keep your account information up to date</li>
          <li>Accept these Terms of Service during registration</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">3.2 Account Security</h3>
        <p class="text-gray-400 mb-4">You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Immediately notify us of any unauthorized use of your account</li>
          <li>Not share your account credentials with any third party</li>
          <li>Use strong, unique passwords and enable two-factor authentication when available</li>
          <li>Log out of your account at the end of each session when using shared devices</li>
        </ul>
        <p class="text-gray-400 mb-6">We are not liable for any loss or damage arising from your failure to protect your account credentials.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">4. Payment Terms</h2>
        <h3 class="text-xl font-bold text-white mt-8 mb-3">4.1 Pricing and Billing</h3>
        <p class="text-gray-400 mb-4">Our Services are offered on a subscription basis with the following terms:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li><strong>Billing Cycle:</strong> Monthly recurring charges</li>
          <li><strong>Payment Methods:</strong> Credit card, debit card, and other methods accepted through Stripe</li>
          <li><strong>Currency:</strong> All prices are in Canadian Dollars (CAD) unless otherwise stated</li>
          <li><strong>Automatic Renewal:</strong> Subscriptions automatically renew at the end of each billing period</li>
          <li><strong>Price Changes:</strong> We reserve the right to modify pricing with 30 days' advance notice</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">4.2 Early Adopter Pricing</h3>
        <p class="text-gray-400 mb-4">Limited-time <strong>early adopter pricing</strong> is available for the first customers:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Discounted rates locked in for 6 months from signup date</li>
          <li>After 6 months, pricing automatically transitions to standard rates</li>
          <li>You will be notified 30 days before rate change takes effect</li>
          <li>Standard pricing: Basic ($25/mo), Priority ($60/mo), Premium ($120/mo)</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">4.3 Payment Processing</h3>
        <p class="text-gray-400 mb-4">All payments are processed securely through Stripe, Inc. By providing payment information, you:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Authorize us to charge your payment method for all fees incurred</li>
          <li>Agree to Stripe's terms of service and privacy policy</li>
          <li>Represent that you have the legal right to use the payment method provided</li>
          <li>Understand that we do not store your complete payment card information</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">4.4 Taxes</h3>
        <p class="text-gray-400 mb-4">Prices do not include applicable taxes, duties, or fees. You are responsible for paying all taxes associated with your use of the Services, including but not limited to sales tax, GST/HST, and VAT as required by your jurisdiction.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">5. Refund Policy</h2>
        <p class="text-gray-400 mb-4">All sales are final. Subscriptions are <strong>non-refundable</strong> except in the following circumstances:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li><strong>Service Failure:</strong> If we are unable to provision your server within 24 hours of payment, you will receive a full automatic refund</li>
          <li><strong>Billing Errors:</strong> Duplicate charges or billing mistakes will be refunded promptly</li>
          <li><strong>Extraordinary Circumstances:</strong> Refunds may be issued at our sole discretion for exceptional situations</li>
        </ul>
        <p class="text-gray-400 mb-4">You may cancel your subscription at any time via support ticket. Your service will remain active until the end of your current billing period, but no refund will be issued for unused time.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">6. Acceptable Use Policy</h2>
        <p class="text-gray-400 mb-4">You agree to use our Services only for lawful purposes and in compliance with these Terms. Prohibited activities include but are not limited to:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li><strong>Illegal Activities:</strong> Hosting, distributing, or linking to illegal content or engaging in criminal activity</li>
          <li><strong>Malicious Software:</strong> Distributing viruses, malware, ransomware, or other harmful code</li>
          <li><strong>Spam and Abuse:</strong> Sending unsolicited bulk email, phishing attempts, or fraudulent communications</li>
          <li><strong>Network Attacks:</strong> Port scanning, DDoS attacks, or attempts to compromise other systems</li>
          <li><strong>Resource Abuse:</strong> Excessive CPU usage (including cryptocurrency mining), bandwidth abuse, or activities that degrade service performance for other users</li>
          <li><strong>Intellectual Property Infringement:</strong> Hosting pirated software, copyrighted content without authorization, or counterfeit materials</li>
          <li><strong>Illegal Adult Content:</strong> Child sexual abuse material (CSAM), revenge porn, or other illegal pornographic content</li>
          <li><strong>Harassment:</strong> Using Services to harass, threaten, stalk, or defame individuals or organizations</li>
        </ul>
        <p class="text-gray-400 mb-4">Violation of this policy may result in immediate suspension or termination of your account without refund.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">7. Intellectual Property</h2>
        <h3 class="text-xl font-bold text-white mt-8 mb-3">7.1 Our Intellectual Property</h3>
        <p class="text-gray-400 mb-4">The Clouded Basement Hosting brand, including our name, logo, website design, and trademarks, are owned by the Company and protected by copyright and trademark laws. You may not use our branding without written permission.</p>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">7.2 Source Code Availability</h3>
        <p class="text-gray-400 mb-4">The source code for this platform is publicly viewable for educational and transparency purposes. However:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Viewing and studying the code for learning purposes is permitted</li>
          <li>The "Clouded Basement Hosting" brand name, logo, and associated trademarks remain proprietary</li>
          <li>Deploying a competing commercial service using this codebase requires explicit written permission</li>
          <li>Contributions to the project may be accepted via GitHub pull requests</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">7.3 User Content</h3>
        <p class="text-gray-400 mb-4">You retain full ownership of all content, data, and applications you deploy on our Services. By using our Services, you grant us a limited license to host, store, and transmit your content solely for the purpose of providing the Services to you.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">8. Data Privacy and Security</h2>
        <h3 class="text-xl font-bold text-white mt-8 mb-3">8.1 Data Collection</h3>
        <p class="text-gray-400 mb-4">We collect and process personal information as described in our Privacy Policy, including:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Account information (email address, password hash)</li>
          <li>Payment information (processed securely through Stripe)</li>
          <li>Server deployment details and usage logs</li>
          <li>Support ticket communications</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">8.2 Data Security</h3>
        <p class="text-gray-400 mb-4">We implement industry-standard security measures to protect your data, including:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>HTTPS encryption for all web traffic</li>
          <li>Secure session management with CSRF protection</li>
          <li>Encrypted password storage using bcrypt</li>
          <li>Regular security audits and updates</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">8.3 Data Retention</h3>
        <p class="text-gray-400 mb-4">We retain your account data for the duration of your active subscription and for a reasonable period thereafter as required by law or for legitimate business purposes. You may request data deletion by contacting support.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">9. Service Level and Uptime</h2>
        <p class="text-gray-400 mb-4">While we strive to provide reliable service, we do not guarantee uninterrupted availability. Our Services are provided on an "as-is" and "as-available" basis. We do not warrant that:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Services will be available 100% of the time without interruption</li>
          <li>Services will be error-free or meet your specific requirements</li>
          <li>Data transmission will be secure or free from interception</li>
          <li>Servers will be immune from attacks, hardware failures, or network issues</li>
        </ul>
        <p class="text-gray-400 mb-4">Scheduled maintenance will be announced in advance when possible. We are not liable for downtime, data loss, or service interruptions.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">10. Limitation of Liability</h2>
        <p class="text-gray-400 mb-4">To the maximum extent permitted by law:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages</li>
          <li>Our total liability to you shall not exceed the amount you paid us in the 12 months preceding the claim</li>
          <li>We are not responsible for losses resulting from unauthorized access to your account</li>
          <li>We are not liable for third-party services, content, or links provided through our platform</li>
          <li>We do not guarantee backup or recovery of your data—regular backups are your responsibility</li>
        </ul>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">11. Indemnification</h2>
        <p class="text-gray-400 mb-4">You agree to indemnify, defend, and hold harmless the Company, its officers, directors, employees, and agents from any claims, losses, damages, liabilities, and expenses (including legal fees) arising from:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Your use of the Services</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights, including intellectual property rights</li>
          <li>Content or applications you deploy on our infrastructure</li>
        </ul>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">12. Termination</h2>
        <h3 class="text-xl font-bold text-white mt-8 mb-3">12.1 Termination by You</h3>
        <p class="text-gray-400 mb-4">You may cancel your subscription at any time through your account dashboard. Upon cancellation:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>You will continue to have access until the end of your current billing period</li>
          <li>No further charges will be made after the current period ends</li>
          <li>Your servers and data may be deleted after 30 days</li>
        </ul>

        <h3 class="text-xl font-bold text-white mt-8 mb-3">12.2 Termination by Us</h3>
        <p class="text-gray-400 mb-4">We reserve the right to suspend or terminate your account immediately without notice if:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>You violate these Terms or our Acceptable Use Policy</li>
          <li>Your account is used for fraudulent or illegal activities</li>
          <li>Payment fails and remains outstanding after 7 days</li>
          <li>You engage in abusive behavior toward our staff or other users</li>
        </ul>
        <p class="text-gray-400 mb-4">Termination for cause does not entitle you to a refund. We may delete your data immediately upon termination for violations.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">13. Modifications to Terms</h2>
        <p class="text-gray-400 mb-4">We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to our website. Continued use of the Services after changes constitutes acceptance of the modified Terms. Material changes will be communicated via email when possible.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">14. Governing Law and Jurisdiction</h2>
        <p class="text-gray-400 mb-4">These Terms are governed by the laws of the Province of Nova Scotia and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Services shall be subject to the exclusive jurisdiction of the courts located in <strong>Halifax, Nova Scotia, Canada</strong>.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">15. Dispute Resolution</h2>
        <p class="text-gray-400 mb-4">In the event of a dispute, you agree to first attempt to resolve the matter informally by contacting our support team. If the dispute cannot be resolved within 30 days, either party may pursue legal remedies in accordance with Section 14.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">16. Severability</h2>
        <p class="text-gray-400 mb-4">If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">17. Entire Agreement</h2>
        <p class="text-gray-400 mb-4">These Terms, together with our Privacy Policy and any supplemental terms for specific Services, constitute the entire agreement between you and Clouded Basement Hosting regarding your use of the Services.</p>

        <h2 class="text-2xl font-bold text-white mt-12 mb-4">18. Contact Information</h2>
        <p class="text-gray-400 mb-4">If you have questions about these Terms or need to contact us regarding your account, please reach out:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li><strong class="text-white">Email:</strong> <a href="mailto:support@cloudedbasement.ca" class="text-blue-400 hover:text-blue-500 underline">support@cloudedbasement.ca</a></li>
          <li><strong class="text-white">Support Tickets:</strong> Available through your account dashboard</li>
          <li><strong class="text-white">Company Name:</strong> Clouded Basement Hosting</li>
          <li><strong class="text-white">Location:</strong> Halifax, Nova Scotia, Canada</li>
        </ul>

        <p class="mt-12 pt-8 border-t border-gray-700 text-gray-500 text-sm">
          By creating an account or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </p>

        <a href="/" class="inline-block mt-8 px-6 py-3 text-brand border border-brand rounded-lg hover:bg-brand hover:text-gray-900 transition-all font-medium uppercase tracking-wider text-sm">Back to home</a>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showPricing = (req, res) => {
  res.send(`
${getHTMLHead('Pricing - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <section class="py-12 px-4 text-center">
        <div class="inline-block px-6 py-2 bg-gradient-to-r from-blue-300/20 to-blue-400/20 border border-blue-300 rounded-full text-white font-bold text-sm mb-6 uppercase tracking-wider shadow-[0_0_20px_rgba(135,206,250,0.3)]">
            🚀 Early Adopter Pricing - Only 15 Spots
        </div>
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">6 Months Early Adopter Pricing</h1>
        <p class="text-gray-300 text-lg mb-2">Full-stack hosting in 5 minutes: Git deploy, one-click databases, SSL, and SSH.</p>
        <p class="text-gray-400 text-sm italic">*Early adopter rate guaranteed for first 6 months. Then regular pricing applies.</p>
      </section>
      
      <section class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-black/90 backdrop-blur-xl border border-blue-400/40 rounded p-8 hover:border-blue-300 hover:scale-[1.02] transition-all shadow-[0_0_60px_rgba(135,206,250,0.2),0_0_90px_rgba(135,206,250,0.1),inset_0_0_40px_rgba(135,206,250,0.03),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div class="border-b border-blue-400/20 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Basic</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="text-4xl font-extrabold text-blue-300">$10<span class="text-base font-normal text-gray-300">/mo</span></div>
              <div class="text-xl text-gray-500 line-through">$25</div>
            </div>
            <div class="text-sm text-gray-300">Perfect for side projects</div>
            <div class="mt-2 px-3 py-1 bg-gradient-to-r from-blue-300/20 to-blue-400/20 border border-blue-300 rounded text-white text-xs font-bold inline-block">60% OFF - 6 MONTHS</div>
          </div>
          <ul class="space-y-3 mb-8 text-sm">
            <li class="text-gray-300"><strong class="text-white">1 GB RAM</strong></li>
            <li class="text-gray-300"><strong class="text-white">1 CPU core</strong></li>
            <li class="text-gray-300"><strong class="text-white">25 GB SSD storage</strong></li>
            <li class="text-gray-300"><strong class="text-white">1 TB bandwidth</strong></li>
            <li class="text-gray-400">Full SSH/root access</li>
            <li class="text-gray-400">One-click Git deployment</li>
            <li class="text-gray-400">One-click database setup (MongoDB, PostgreSQL)</li>
            <li class="text-gray-400">Custom domains</li>
            <li class="text-gray-400">One-click SSL</li>
            <li class="text-gray-400">Deployment logs</li>
            <li class="text-gray-400">Email support (24-48hr)</li>
          </ul>
          <a href="/pay?plan=basic" class="block w-full px-6 py-3 bg-transparent border border-blue-500 text-blue-400 text-center font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm">Select Basic</a>
        </div>
        
        <div class="bg-gradient-to-br from-gray-900/95 via-blue-950/30 to-black/95 backdrop-blur-xl border-2 border-blue-300 rounded p-8 relative transform md:scale-105 shadow-[0_0_80px_rgba(135,206,250,0.35),0_0_120px_rgba(135,206,250,0.2),inset_0_0_60px_rgba(135,206,250,0.06),inset_0_2px_2px_rgba(255,255,255,0.15)] hover:scale-[1.08] transition-all duration-300">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-300 to-blue-400 text-black text-xs font-bold rounded uppercase shadow-[0_0_25px_rgba(135,206,250,0.5)]">Most Popular</div>
          <div class="border-b border-blue-300 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Priority</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="text-4xl font-extrabold text-blue-300">$30<span class="text-base font-normal text-gray-300">/mo</span></div>
              <div class="text-xl text-gray-500 line-through">$60</div>
            </div>
            <div class="text-sm text-gray-300">Most popular • For production apps</div>
            <div class="mt-2 px-3 py-1 bg-gradient-to-r from-blue-300 to-blue-400 text-black rounded text-xs font-bold inline-block shadow-[0_0_20px_rgba(135,206,250,0.4)]">50% OFF - 6 MONTHS</div>
          </div>
          <ul class="space-y-3 mb-8 text-sm">
            <li class="text-gray-300"><strong class="text-white">2 GB RAM</strong></li>
            <li class="text-gray-300"><strong class="text-white">2 CPU cores</strong></li>
            <li class="text-gray-300"><strong class="text-white">50 GB SSD storage</strong></li>
            <li class="text-gray-300"><strong class="text-white">2 TB bandwidth</strong></li>
            <li class="text-gray-400">Full SSH/root access</li>
            <li class="text-gray-400">One-click Git deployment</li>
            <li class="text-gray-400">One-click database setup (MongoDB, PostgreSQL)</li>
            <li class="text-gray-400">Custom domains</li>
            <li class="text-gray-400">One-click SSL</li>
            <li class="text-gray-400">Deployment logs</li>
            <li class="text-blue-300 pt-3 border-t border-blue-400/30">Plus Priority perks:</li>
            <li class="text-blue-300">Priority support (12hr response)</li>
            <li class="text-blue-300">Server controls (start/stop/restart)</li>
          </ul>
          <a href="/pay?plan=priority" class="block w-full px-6 py-3 bg-blue-600 text-white text-center font-bold rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm">Select Priority</a>
        </div>
        
        <div class="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-black/90 backdrop-blur-xl border border-blue-400/40 rounded p-8 hover:border-blue-300 hover:scale-[1.02] transition-all shadow-[0_0_60px_rgba(135,206,250,0.2),0_0_90px_rgba(135,206,250,0.1),inset_0_0_40px_rgba(135,206,250,0.03),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div class="border-b border-blue-400/20 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Premium</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="text-4xl font-extrabold text-blue-300">$60<span class="text-base font-normal text-gray-300">/mo</span></div>
              <div class="text-xl text-gray-500 line-through">$120</div>
            </div>
            <div class="text-sm text-gray-300">For serious projects</div>
            <div class="mt-2 px-3 py-1 bg-gradient-to-r from-blue-300/20 to-blue-400/20 border border-blue-300 rounded text-white text-xs font-bold inline-block">50% OFF - 6 MONTHS</div>
          </div>
          <ul class="space-y-3 mb-8 text-sm">
            <li class="text-gray-300"><strong class="text-white">4 GB RAM</strong></li>
            <li class="text-gray-300"><strong class="text-white">2 CPU cores</strong></li>
            <li class="text-gray-300"><strong class="text-white">80 GB SSD storage</strong></li>
            <li class="text-gray-300"><strong class="text-white">4 TB bandwidth</strong></li>
            <li class="text-gray-400">Full SSH/root access</li>
            <li class="text-gray-400">One-click Git deployment</li>
            <li class="text-gray-400">One-click database setup (MongoDB, PostgreSQL)</li>
            <li class="text-gray-400">Custom domains</li>
            <li class="text-gray-400">One-click SSL</li>
            <li class="text-gray-400">Deployment logs</li>
            <li class="text-gray-400">Server controls (start/stop/restart)</li>
            <li class="text-blue-300 pt-3 border-t border-blue-400/30">Plus Premium perks:</li>
            <li class="text-blue-300">Priority support (4-8hr response)</li>
            <li class="text-blue-300">Email/ticket support priority</li>
          </ul>
          <a href="/pay?plan=premium" class="block w-full px-6 py-3 bg-transparent border border-blue-500 text-blue-400 text-center font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm">Select Premium</a>
        </div>
      </section>
      
      <!-- Trust Link -->
      <section class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 pb-12 text-center">
        <p class="text-sm text-gray-400">
          Questions about security or how this works? 
          <a href="/is-this-safe" class="text-brand hover:text-cyan-400 underline font-medium ml-1">Is Clouded Basement safe?</a>
        </p>
      </section>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showPrivacy = (req, res) => {
  res.send(`
${getHTMLHead('Privacy Policy - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-2">Privacy Policy</h1>
        <p class="text-gray-500 text-sm mb-8"><strong>Last Updated:</strong> January 26, 2026</p>
        
        <p class="text-gray-400 mb-8">Clouded Basement Hosting ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">1. Information We Collect</h2>
        
        <p class="text-gray-400 mb-4"><strong class="text-white">1.1 Personal Information You Provide</strong></p>
        <p class="text-gray-400 mb-4">We collect information that you voluntarily provide to us when you:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li><strong class="text-white">Register for an account:</strong> Email address and encrypted password</li>
            <li><strong class="text-white">Submit inquiries:</strong> Name, email address, phone number (if provided), and message content through our contact form</li>
            <li><strong class="text-white">Make purchases:</strong> Billing information including name, address, and payment card details (processed securely by our payment processor, Stripe)</li>
        </ul>
        
        <p class="text-gray-400 mb-4"><strong class="text-white">1.2 Automatically Collected Information</strong></p>
        <p class="text-gray-400 mb-4">When you access our website, we may automatically collect certain information, including:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li><strong class="text-white">Log data:</strong> IP address, browser type, operating system, referring URLs, pages viewed, and timestamps</li>
            <li><strong class="text-white">Session data:</strong> Authentication tokens stored in cookies to maintain your logged-in state</li>
            <li><strong class="text-white">Device information:</strong> Screen resolution, device type, and browser capabilities</li>
        </ul>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">2. How We Use Your Information</h2>
        
        <p class="text-gray-400 mb-4">We use the information we collect for legitimate business purposes, including:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li><strong class="text-white">Service Delivery:</strong> To create and manage your account, process transactions, and deliver the services you request</li>
            <li><strong class="text-white">Communication:</strong> To respond to your inquiries, provide customer support, and send transactional emails regarding your account or purchases</li>
            <li><strong class="text-white">Security:</strong> To monitor and prevent fraudulent activity, unauthorized access, and other illegal activities</li>
            <li><strong class="text-white">Improvement:</strong> To analyze usage patterns, diagnose technical problems, and improve our website functionality and user experience</li>
            <li><strong class="text-white">Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests</li>
            <li><strong class="text-white">Business Operations:</strong> To maintain records for accounting, auditing, and business continuity purposes</li>
        </ul>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">3. Information Sharing and Disclosure</h2>
        
        <p class="text-gray-400 mb-4">We do not sell, rent, or trade your personal information to third parties. We may share your information only in the following circumstances:</p>
        
        <p class="text-gray-400 mb-4"><strong class="text-white">3.1 Service Providers</strong></p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li><strong class="text-white">Stripe, Inc.:</strong> We use Stripe to process payments. Your payment information is transmitted directly to Stripe and is subject to <a href="https://stripe.com/privacy" target="_blank" class="text-blue-400 hover:text-blue-500 underline">Stripe's Privacy Policy</a>. We never store complete payment card information on our servers.</li>
        </ul>
        
        <p class="text-gray-400 mb-4"><strong class="text-white">3.2 Legal Requirements</strong></p>
        <p class="text-gray-400 mb-6">We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court order, subpoena, or government investigation).</p>
        
        <p class="text-gray-400 mb-4"><strong class="text-white">3.3 Business Transfers</strong></p>
        <p class="text-gray-400 mb-6">In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction. You will be notified via email and/or prominent notice on our website of any such change in ownership or control.</p>
        
        <p class="text-gray-400 mb-4"><strong class="text-white">3.4 Protection of Rights</strong></p>
        <p class="text-gray-400 mb-6">We may disclose information when we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a legal request.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">4. Data Security</h2>
        
        <p class="text-gray-400 mb-4">We implement industry-standard security measures to protect your personal information:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li><strong>Encryption:</strong> All passwords are hashed using bcrypt with a salt factor of 10, making them irreversible and secure against brute-force attacks</li>
            <li><strong>Secure Transmission:</strong> We use HTTPS/TLS encryption to protect all data transmitted between your browser and our servers</li>
            <li><strong>Session Security:</strong> Session cookies are HTTP-only to prevent client-side script access and are configured with secure flags in production</li>
            <li><strong>Payment Security:</strong> All payment processing is handled by Stripe, a PCI-DSS Level 1 certified service provider. We never store complete payment card information</li>
            <li><strong>Database Security:</strong> User data is stored in a secured PostgreSQL database with restricted access and regular backups</li>
            <li><strong>Access Controls:</strong> Administrative access to user data is restricted to authorized personnel only</li>
        </ul>
        
        <p class="text-gray-400 mb-4">However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">5. Your Rights and Choices</h2>
        
        <p class="text-gray-400 mb-4">Depending on your location and applicable law, you may have the following rights:</p>
        
        <p><strong>5.1 Access and Portability</strong></p>
        <p class="text-gray-400 mb-4">You have the right to request access to the personal information we hold about you and to receive that information in a portable format.</p>
        
        <p><strong>5.2 Correction</strong></p>
        <p class="text-gray-400 mb-4">You have the right to request correction of inaccurate or incomplete personal information.</p>
        
        <p><strong>5.3 Deletion</strong></p>
        <p class="text-gray-400 mb-4">You have the right to request deletion of your personal information, subject to certain legal exceptions (e.g., completion of transactions, legal compliance, fraud prevention).</p>
        
        <p><strong>5.4 Objection and Restriction</strong></p>
        <p class="text-gray-400 mb-4">You have the right to object to or request restriction of certain processing of your personal information.</p>
        
        <p><strong>5.5 Withdrawal of Consent</strong></p>
        <p class="text-gray-400 mb-4">Where processing is based on consent, you have the right to withdraw that consent at any time.</p>
        
        <p class="text-gray-400 mb-4">To exercise any of these rights, please contact us through our <a href="/contact" class="text-blue-400 hover:text-blue-500 underline">contact form</a>. We will respond to your request within 30 days.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">6. Data Retention</h2>
        
        <p class="text-gray-400 mb-4">We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Account information is retained until you request deletion. Transaction records may be retained for accounting and legal compliance purposes for up to 7 years.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">7. Cookies and Tracking Technologies</h2>
        
        <p class="text-gray-400 mb-4">We use cookies and similar tracking technologies to enhance your experience on our website:</p>
        
        <p><strong>7.1 Essential Cookies</strong></p>
        <p class="text-gray-400 mb-4">We use session cookies that are essential for the operation of our website. These cookies:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li>Maintain your login state across pages</li>
            <li>Provide CSRF protection for form submissions</li>
            <li>Enable secure authentication</li>
        </ul>
        
        <p class="text-gray-400 mb-4">These cookies are strictly necessary for the website to function and cannot be disabled without affecting core functionality.</p>
        
        <p><strong>7.2 Cookie Management</strong></p>
        <p class="text-gray-400 mb-4">You can configure your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">8. Third-Party Links</h2>
        
        <p class="text-gray-400 mb-4">Our website may contain links to third-party websites or services that are not owned or controlled by Clouded Basement Hosting. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of every website you visit.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">9. Children's Privacy</h2>
        
        <p class="text-gray-400 mb-4">Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will take steps to delete such information.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">10. International Data Transfers</h2>
        
        <p class="text-gray-400 mb-4">Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those of your country. By using our services, you consent to the transfer of your information to these countries.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">11. Changes to This Privacy Policy</h2>
        
        <p class="text-gray-400 mb-4">We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li>Posting the updated policy on this page with a new "Last Updated" date</li>
            <li>Sending an email notification to the address associated with your account (for material changes)</li>
        </ul>
        
        <p class="text-gray-400 mb-4">Your continued use of our services after any changes indicates your acceptance of the updated policy.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">12. California Privacy Rights</h2>
        
        <p class="text-gray-400 mb-4">If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li>Right to know what personal information is collected, used, shared, or sold</li>
            <li>Right to delete personal information held by businesses</li>
            <li>Right to opt-out of sale of personal information (note: we do not sell personal information)</li>
            <li>Right to non-discrimination for exercising your CCPA rights</li>
        </ul>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">13. European Privacy Rights</h2>
        
        <p class="text-gray-400 mb-4">If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with a supervisory authority if you believe our processing of your personal information violates applicable law.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">14. Contact Information</h2>
        
        <p class="text-gray-400 mb-4">If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
            <li><strong class="text-white">Email:</strong> Via our <a href="/contact" class="text-blue-400 hover:text-blue-500 underline">contact form</a></li>
            <li><strong class="text-white">Response Time:</strong> We aim to respond to all inquiries within 48 hours</li>
        </ul>
        
        <p class="mt-12 pt-8 border-t border-gray-700 text-gray-500 text-sm">By using Clouded Basement Hosting services, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.</p>
        
        <a href="/" class="inline-block mt-8 px-6 py-3 text-brand border border-brand rounded-lg hover:bg-brand hover:text-gray-900 transition-all font-medium uppercase tracking-wider text-sm">Back to home</a>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showFaq = (req, res) => {
  res.send(`
${getHTMLHead('FAQ - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white text-center mb-4">Frequently Asked Questions</h1>
        <p class="text-gray-400 text-center mb-16">Quick answers to common questions</p>
        
        <div class="space-y-4">
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">How does it work?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Sign up, choose a plan, complete payment. Your VPS server is automatically provisioned in 2-5 minutes with Ubuntu 22.04, Nginx, and SSL tools pre-installed. You get full SSH root access and can deploy immediately.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">What are the plans?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400 mb-3"><strong class="text-white">Basic ($25/mo):</strong> 1 GB RAM, 1 CPU, 25 GB storage. Perfect for static sites and small apps.</p>
                <p class="text-gray-400 mb-3"><strong class="text-white">Priority ($60/mo):</strong> 2 GB RAM, 2 CPUs, 50 GB storage. Priority support, ideal for production apps.</p>
                <p class="text-gray-400"><strong class="text-white">Premium ($120/mo):</strong> 4 GB RAM, 2 CPUs, 80 GB storage. Fastest support, best for high-traffic sites.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">How do I deploy my code?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Yes! Paste your Git URL in the dashboard and we'll automatically detect if it's React, Vue, Node.js, Python, or static HTML, then build and deploy it to Nginx. Track deployment history and logs in real-time.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">Can I use my own domain?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Absolutely. Add unlimited custom domains in your dashboard. Point your DNS to your server IP, then click "Enable SSL" for free automatic Let's Encrypt certificates. HTTPS configured in seconds.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">What if I need help?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Submit support tickets from your dashboard. Basic: 24-48hr response. Priority: 12hr response. Premium: Priority queue with fastest turnaround. All plans get help with server issues, deployments, and configuration.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white mb-2">Can I cancel anytime?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Yes. Contact support to cancel. Your server stays active until the end of your billing period. No long-term contracts or cancellation fees.</p>
              </div>
            </div>
          </div>
          
        </div>
        
        <div class="bg-gray-800/30 border border-blue-500/20 rounded-lg p-12 text-center">
            <h2 class="text-3xl font-bold text-white mb-4">Still Have Questions?</h2>
            <p class="text-gray-400 mb-8">Can't find the answer you're looking for? Our support team is here to help.</p>
            <a href="/contact" class="inline-block px-8 py-4 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300 uppercase tracking-wider text-sm">Contact Support</a>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js', 'faq.js')}
  `);
};

exports.showDocs = (req, res) => {
  res.send(`
${getHTMLHead('Documentation - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">Documentation</h1>
        <p class="text-xl text-gray-300 mb-12">Complete guide to Basement hosting—what you get, how to use it, and technical details.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">What You Get</h2>
        <p class="text-gray-300 mb-4">When you sign up, you get a dedicated cloud server (VPS - Virtual Private Server). This is a complete Linux machine that you control.</p>
        
        <p class="text-gray-300 mb-6"><strong class="text-white">It's like renting a computer that runs 24/7 in a data center.</strong></p>
        
        <ul class="list-disc list-inside space-y-2 text-gray-300 mb-8">
            <li><strong class="text-white">Full root/SSH access</strong> - Complete control over your server</li>
            <li><strong class="text-white">Dedicated IP address</strong> - Point your domain wherever you want</li>
            <li><strong class="text-white">Install anything</strong> - Node, Python, Docker, databases, whatever you need</li>
            <li><strong class="text-white">Deploy your way</strong> - Git, FTP, rsync, manual uploads - your choice</li>
        </ul>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">Two Ways to Manage Your Server</h2>
        <p class="text-gray-300 mb-8">You decide how much control you want at any given time.</p>
        
        <h3 class="text-xl font-bold text-white mt-8 mb-3">Dashboard</h3>
        <p class="text-gray-300 mb-3">A web interface for common tasks:</p>
        <ul class="list-disc list-inside space-y-2 text-gray-300 mb-4">
            <li>Deploy your code with a few clicks</li>
            <li>Restart your server</li>
            <li>View logs and monitor resources</li>
            <li>Set up SSL certificates automatically</li>
            <li>Manage backups</li>
        </ul>
        <p class="text-gray-300 mb-8">Good for routine operations and quick deployments.</p>
        
        <h3 class="text-xl font-bold text-white mt-8 mb-3">Direct SSH Access</h3>
        <p class="text-gray-300 mb-3">Full terminal access to your server:</p>
        <ul class="list-disc list-inside space-y-2 text-gray-300 mb-4">
            <li>Configure web servers (Nginx, Apache)</li>
            <li>Set up custom services</li>
            <li>Install any dependencies</li>
            <li>Run background processes</li>
            <li>Debug directly in production</li>
        </ul>
        <p class="text-gray-300 mb-8">Good when you need precise control or custom configurations.</p>
        
        <h3 class="text-xl font-bold text-white mt-8 mb-3">Use Both</h3>
        <p class="text-gray-300 mb-8">Most people use the dashboard for everyday tasks and SSH when they need it. You're not locked into one approach.</p>
        
        <div class="bg-gray-900 border border-blue-500/30 rounded-lg p-6 my-8">
            <h3 class="text-white text-xl font-bold mb-3">Managed Infrastructure</h3>
            <p class="text-gray-300 mb-3">While you have full control, we handle the foundational maintenance:</p>
            <ul class="list-disc list-inside space-y-2 text-gray-300">
                <li><strong class="text-white">Security updates:</strong> Operating system patches applied automatically</li>
                <li><strong class="text-white">Uptime monitoring:</strong> We're alerted if your server goes down</li>
                <li><strong class="text-white">DDoS protection:</strong> Network-level protection included</li>
            </ul>
        </div>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">Getting Started</h2>
        <p class="text-gray-300 mb-4">Here's the process from signup to deployment:</p>
        
        <ol class="list-decimal list-inside space-y-2 text-gray-300 mb-6">
            <li><strong class="text-white">Choose a plan</strong> - Basic ($25), Priority ($60), or Premium ($120)</li>
            <li><strong class="text-white">Complete payment</strong> - Secure checkout via Stripe</li>
            <li><strong class="text-white">Server provisioning</strong> - Takes about 60 seconds</li>
            <li><strong class="text-white">Receive credentials</strong> - Dashboard access and SSH details via email</li>
            <li><strong class="text-white">Deploy</strong> - Use the dashboard or SSH directly</li>
        </ol>
        
        <p class="text-gray-300 mb-8">Your server is live immediately. No approval process, no configuration maze.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">Technical Stack</h2>
        <p class="text-gray-300 mb-4">Full transparency on our infrastructure:</p>
        
        <ul class="list-disc list-inside space-y-2 text-gray-300 mb-8">
            <li><strong class="text-white">Cloud Provider:</strong> DigitalOcean data centers</li>
            <li><strong class="text-white">Operating System:</strong> Ubuntu LTS (long-term support)</li>
            <li><strong class="text-white">Dashboard:</strong> Custom Node.js application</li>
            <li><strong class="text-white">Payment Processing:</strong> Stripe</li>
            <li><strong class="text-white">Monitoring:</strong> Open-source tooling</li>
        </ul>
        
        <div class="bg-gray-900 border border-blue-500/30 rounded-lg p-6 my-8">
            <h3 class="text-white text-xl font-bold mb-3">Open Source</h3>
            <p class="text-gray-300 mb-3">The dashboard and deployment tools are open source:</p>
            <ul class="list-disc list-inside space-y-2 text-gray-300">
                <li>Review the code and understand how everything works</li>
                <li>Contribute improvements or report issues</li>
                <li>Fork it and modify for your needs</li>
                <li>Verify security practices</li>
            </ul>
        </div>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">Who This Works For</h2>
        <p class="text-gray-300 mb-4">Basement is designed for:</p>
        <ul class="list-disc list-inside space-y-2 text-gray-300 mb-6">
            <li>Solo developers deploying projects</li>
            <li>Students learning production deployment</li>
            <li>Indie founders running applications</li>
            <li>Small to medium teams wanting server control without infrastructure management</li>
            <li>Anyone comfortable with basic Linux commands</li>
        </ul>
        
        <p class="text-gray-300 mb-8"><strong class="text-white">Note:</strong> We're a small team building and expanding features over time. The infrastructure can support enterprise workloads, but our feature set and support capacity are currently focused on smaller deployments as we grow.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">Pricing Structure</h2>
        <p class="text-gray-300 mb-4">Three tiers based on server resources and support level:</p>
        
        <p class="text-gray-300 mb-4"><strong class="text-white">Basic ($25/mo):</strong> 1 GB RAM, 1 CPU, 25 GB storage. Email support with 48-hour response. Suitable for static sites, small APIs, personal projects.</p>
        
        <p class="text-gray-300 mb-4"><strong class="text-white">Priority ($60/mo):</strong> 2 GB RAM, 2 CPUs, 50 GB storage. Priority support with 12-hour response, SSL automation, staging environments. Suitable for production applications.</p>
        
        <p class="text-gray-300 mb-4"><strong class="text-white">Premium ($120/mo):</strong> 4 GB RAM, 2 CPUs, 80 GB storage. Direct chat support, deployment assistance, performance optimization. Suitable for revenue-generating applications.</p>
        
        <p class="text-gray-300 mb-8"><strong class="text-white">No usage charges.</strong> Your monthly bill is capped at your plan price. No surprise bandwidth or storage overages.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">Support Approach</h2>
        <p class="text-gray-300 mb-4">Documentation-first support model:</p>
        <ul class="list-disc list-inside space-y-2 text-gray-300 mb-4">
            <li>Comprehensive guides (including this page)</li>
            <li>FAQ covering common questions</li>
            <li>GitHub discussions for community help</li>
            <li>Open issues for bug reports</li>
        </ul>
        
        <p class="text-gray-300 mb-12">Email support included with all plans. Higher tiers provide faster response times and direct chat access for urgent issues.</p>
        
        <div class="bg-gray-900 border-2 border-blue-400/40 rounded-xl p-8 text-center my-12">
            <h2 class="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p class="text-gray-300 mb-6">All plans include a 14-day money-back guarantee.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/register" class="inline-block px-8 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(135,206,250,0.6)] transition-all duration-300 uppercase tracking-wider text-sm">Sign up</a>
                <a href="/contact" class="inline-block px-8 py-3 border-2 border-blue-400 text-white bg-gray-800 font-bold rounded hover:bg-gray-700 transition-all duration-300 uppercase tracking-wider text-sm">Contact Us</a>
            </div>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showContact = (req, res) => {
  res.send(`
${getHTMLHead('Contact - Basement')}
  ${getResponsiveNav(req)}
  
  <main class="bg-black min-h-screen pt-24 pb-16">
    <div class="max-w-2xl mx-auto px-8 md:px-12 lg:px-16">
      <h1 class="text-4xl md:text-5xl font-extrabold text-white text-center mb-4">Contact Us</h1>
      <p class="text-gray-400 text-center mb-12">Get in touch with our team</p>
      
      <form method="POST" action="/contact" class="bg-gray-900/80 backdrop-blur-xl border border-blue-500/30 rounded p-8 shadow-[0_0_70px_rgba(0,102,255,0.25),0_0_110px_rgba(0,102,255,0.12),inset_0_0_35px_rgba(0,102,255,0.03)]">
        <input type="hidden" name="_csrf" value="${req.csrfToken()}">
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Name</label>
          <input type="text" name="name" required class="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input type="email" name="email" required class="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Message</label>
          <textarea name="message" required rows="6" class="w-full px-4 py-3 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-y"></textarea>
        </div>
        
        <button type="submit" class="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm">Send Message</button>
      </form>
    </div>
  </main>
  
  ${getFooter()}
  ${getScripts('nav.js')}
  `);
};

exports.submitContact = (req, res) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send(`
      <h1>Validation Error</h1>
      <ul>${errors.array().map(err => `<li>${err.msg}</li>`).join('')}</ul>
      <a href="/contact">Go back</a>
    `);
  }
  console.log('Form received:', req.body);
  req.session.flashMessage = 'Your message was successfully sent! We\'ll get back to you soon.';
  res.redirect('/');
};

exports.showHome = async (req, res) => {
  const flashMessage = req.session.flashMessage;
  delete req.session.flashMessage;
  
  res.send(`
${getHTMLHead('Clouded Basement Hosting - Fast, Simple Cloud Hosting')}
    ${getResponsiveNav(req)}
    
    ${flashMessage ? `
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 p-4 mb-4 text-sm text-cyan-400 bg-gray-800 border border-cyan-500/30 rounded-lg shadow-lg" role="alert">
      ${flashMessage}
    </div>
    ` : ''}
    
    <!-- Hero Section -->
    <section class="bg-black pt-32 pb-16">
      <div class="max-w-screen-xl px-8 md:px-12 lg:px-16 mx-auto text-center lg:px-12">
        <img src="/Architype Van Der Leck.svg" alt="Clouded Basement Logo" class="mx-auto mb-6 h-32 md:h-40 lg:h-48 w-auto">
        <h1 class="mb-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">Your own VPS. Deployed in minutes. No DevOps headaches.</h1>
        <p class="mb-8 text-lg font-normal text-gray-400 lg:text-xl sm:px-16 xl:px-48">Clouded Basement provisions a production-ready Linux server with SSL, Git deployments, and full root access — so you can ship without babysitting infrastructure.</p>
        <div class="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
          <a href="/pricing" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">
            Deploy your server
            <svg class="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </a>
          <a href="/docs" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-gray-300 border border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 hover:text-white transition-all duration-300">
            See how it works
          </a>
        </div>
        <p class="text-sm text-gray-500 mt-6">
          Runs on DigitalOcean infrastructure · Full root access · Cancel anytime
          <a href="/is-this-safe" class="text-brand hover:text-cyan-400 underline ml-2">Is this safe? →</a>
        </p>
      </div>
    </section>

    <!-- Micro-Trust Block -->
    <section class="py-8 px-8 md:px-12 lg:px-16 bg-black border-t border-blue-500/20">
      <div class="max-w-3xl mx-auto">
        <ul class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
          <li class="flex flex-col md:flex-row items-center md:items-start gap-2">
            <svg class="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm text-gray-300">Your own VPS (not a shared platform)</span>
          </li>
          <li class="flex flex-col md:flex-row items-center md:items-start gap-2">
            <svg class="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm text-gray-300">Cancel anytime + 30-day money-back guarantee</span>
          </li>
          <li class="flex flex-col md:flex-row items-center md:items-start gap-2">
            <svg class="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm text-gray-300">Direct support from the founder</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Why Choose Section -->
    <section class="py-12 md:py-20 bg-black">
      <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16">
        <h2 class="mb-12 text-3xl md:text-4xl font-extrabold text-center text-white">Why Choose Clouded Basement</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div class="p-6 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(135,206,250,0.3)] transition-all duration-300">
            <h3 class="mb-2 text-xl font-bold text-white">Personal Support</h3>
            <p class="text-gray-300">You talk to the person who built the platform.</p>
          </div>
          <div class="p-6 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(135,206,250,0.3)] transition-all duration-300">
            <h3 class="mb-2 text-xl font-bold text-white">Fast, Clean Infrastructure</h3>
            <p class="text-gray-300">No noisy neighbors. No overselling.</p>
          </div>
          <div class="p-6 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(135,206,250,0.3)] transition-all duration-300">
            <h3 class="mb-2 text-xl font-bold text-white">Transparent Pricing</h3>
            <p class="text-gray-300">No hidden fees. No surprise renewals.</p>
          </div>
          <div class="p-6 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(135,206,250,0.3)] transition-all duration-300">
            <h3 class="mb-2 text-xl font-bold text-white">Indie-Built, Indie-Powered</h3>
            <p class="text-gray-300">Hosting with personality, not corporate scripts.</p>
          </div>
        </div>
      </div>
    </section>
      </section>
          </div>
        </div>
      </div>
    </section>

    <!-- Features List -->
    <section class="bg-black py-12 md:py-20">
      <div class="max-w-3xl px-8 md:px-12 lg:px-16 mx-auto sm:px-6 lg:px-8">
        <h2 class="mb-12 text-3xl md:text-4xl font-extrabold text-center text-white">What You Get</h2>
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <li class="flex items-center gap-3 p-4 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(135,206,250,0.25)] transition-all duration-300">
            <span class="text-blue-300 text-xl font-bold">✓</span>
            <span class="text-gray-200">Full hosting environment</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(135,206,250,0.25)] transition-all duration-300">
            <span class="text-blue-300 text-xl font-bold">✓</span>
            <span class="text-gray-200">SSD storage</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(135,206,250,0.25)] transition-all duration-300">
            <span class="text-blue-300 text-xl font-bold">✓</span>
            <span class="text-gray-200">Secure isolation</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(135,206,250,0.25)] transition-all duration-300">
            <span class="text-blue-300 text-xl font-bold">✓</span>
            <span class="text-gray-200">Free setup</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(135,206,250,0.25)] transition-all duration-300">
            <span class="text-blue-300 text-xl font-bold">✓</span>
            <span class="text-gray-200">Modern dashboard</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-900 border border-blue-500/20 rounded-lg hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(135,206,250,0.25)] transition-all duration-300">
            <span class="text-blue-300 text-xl font-bold">✓</span>
            <span class="text-gray-200">All future features included</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- How It Works with Timeline -->
    <section class="bg-black py-12 md:py-20">
      <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16">
        <h2 class="mb-16 text-3xl md:text-4xl font-extrabold text-center text-white">How It Works</h2>
        <ol class="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <!-- Step 1 -->
          <li class="relative text-center">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full text-black text-2xl font-bold shadow-[0_0_20px_rgba(135,206,250,0.5)]">1</div>
            <h3 class="mb-2 text-xl font-bold text-white">Choose your plan</h3>
            <p class="text-gray-300">Pick the hosting tier that fits your needs.</p>
          </li>
          <!-- Step 2 -->
          <li class="relative text-center">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full text-black text-2xl font-bold shadow-[0_0_20px_rgba(135,206,250,0.5)]">2</div>
            <h3 class="mb-2 text-xl font-bold text-white">Get instant access</h3>
            <p class="text-gray-300">Your server is provisioned and ready in minutes.</p>
          </li>
          <!-- Step 3 -->
          <li class="relative text-center">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full text-black text-2xl font-bold shadow-[0_0_20px_rgba(135,206,250,0.5)]">3</div>
            <h3 class="mb-2 text-xl font-bold text-white">Deploy your site</h3>
            <p class="text-gray-300">DIY or let us handle the setup — your choice.</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="bg-black border-t border-blue-500/30 py-16">
      <div class="max-w-screen-sm px-8 md:px-12 lg:px-16 mx-auto text-center sm:px-6 lg:px-8">
        <h2 class="mb-4 text-3xl md:text-4xl font-extrabold text-white">Ready to get started?</h2>
        <p class="mb-8 text-lg text-gray-300">Join the founding customers and lock in lifetime pricing.</p>
        <a href="/register" class="inline-flex justify-center items-center py-3 px-8 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">
          Sign up
          <svg class="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </a>
      </div>
    </section>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showSafety = (req, res) => {
  res.send(`
${getHTMLHead('Is Clouded Basement safe to use? - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-3xl mx-auto px-8 md:px-12 lg:px-16">
        <!-- Page Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-12 leading-tight">Is Clouded Basement safe to use?</h1>
        
        <!-- Section 1: Honest opener -->
        <section class="mb-12">
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Clouded Basement is a new product, built and operated by a solo developer.</p>
          <p class="text-gray-300 text-lg leading-relaxed">If you're deciding whether to trust it with your code or data, that's a fair question — and this page exists to answer it honestly.</p>
        </section>
        
        <!-- Section 2: What you actually get -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">What you actually get</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">You are not renting a black-box platform.</p>
          <p class="text-gray-300 text-lg leading-relaxed mb-6">Every Clouded Basement project runs on its own VPS hosted on DigitalOcean infrastructure.</p>
          
          <p class="text-gray-300 text-lg leading-relaxed mb-3">You receive:</p>
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Full root SSH access</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your own server IP</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Direct control over your files, processes, and data</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">Clouded Basement automates setup and deployment — but the server itself is yours.</p>
        </section>
        
        <!-- Section 3: What happens if something goes wrong -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">What if I stop running this?</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Let's say I get hit by a bus or decide to become a monk (hopefully neither):</p>
          
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your server keeps running on DigitalOcean</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your SSH credentials still work</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Your code and data are yours to keep</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">No vendor lock-in means you're not trapped. Take your server, move it, modify it, do whatever you want with it.</p>
        </section>
        
        <!-- Section 4: Security & responsibility -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">Security & responsibility</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">Servers are provisioned with:</p>
          
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Ubuntu 22.04 LTS</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Automatic HTTPS via Let's Encrypt</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Rate limiting and basic hardening</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed mb-4">That said, Clouded Basement is not an enterprise compliance platform.</p>
          <p class="text-gray-300 text-lg leading-relaxed">If you require HIPAA, SOC 2, or regulated data hosting, this service is not a fit — and that's intentional.</p>
        </section>
        
        <!-- Section 5: Support & accountability -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">Support & accountability</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">When you contact support, you're talking directly to the person who built the system.</p>
          <p class="text-gray-300 text-lg leading-relaxed">I respond within 24 hours and personally handle issues related to provisioning, deployment, and configuration.</p>
        </section>
        
        <!-- Section 6: Risk reversal -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold text-white mb-6">Risk reversal</h2>
          <p class="text-gray-300 text-lg leading-relaxed mb-4">If Clouded Basement doesn't work for you:</p>
          
          <ul class="list-none space-y-2 mb-6">
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Cancel anytime</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">30-day money-back guarantee</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">No questions asked</li>
          </ul>
          
          <p class="text-gray-300 text-lg leading-relaxed">Early users are also eligible for free migration help from their existing host.</p>
        </section>
        
        <!-- CTA -->
        <div class="mt-16 pt-8 border-t border-blue-500/30 text-center">
          <a href="/pricing" class="inline-block px-8 py-4 text-white bg-brand rounded-lg hover:bg-cyan-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(45,167,223,0.6)] transition-all font-bold uppercase tracking-wider text-sm">View Plans</a>
          <p class="text-gray-500 text-sm mt-4">Or <a href="/contact" class="text-brand hover:text-cyan-400 underline">contact me</a> if you have more questions.</p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
