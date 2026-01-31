const { getHTMLHead, getScripts, getFooter, getResponsiveNav, escapeHtml } = require('../helpers');
const pool = require('../db');

exports.showAbout = (req, res) => {
  res.send(`
${getHTMLHead('About - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen pt-24 pb-16">
      <div class="max-w-4xl mx-auto px-8 md:px-12 lg:px-16">
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-8">ABOUT BASEMENT</h1>
        
        <p class="text-gray-300 text-lg mb-8">I'm Kayo, an IT Web Programming student at NSCC in Halifax, graduating May 2026. Before switching to tech, I worked as a tradesman — different tools, same problem-solving mindset.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">WHY I BUILT THIS</h2>
        
        <p class="text-gray-300 mb-4">I wanted to prove I could build and deploy a real production application from the ground up. Not just for a grade, but something that actually handles payments, provisions servers, and solves a real problem.</p>
        
        <p class="text-gray-300 mb-8">Cloud hosting doesn't need to be complicated. You shouldn't need a PhD to deploy a Node app or a static site. Basement gives you a real server you can SSH into, plus a dashboard for the routine stuff. Simple.</p>
        
        <h2 class="text-2xl font-bold text-white mt-12 mb-4">HOW IT WORKS</h2>
        
        <p class="text-gray-300 mb-4">I'm running this as a small operation. The infrastructure is enterprise-grade (DigitalOcean droplets), but I'm building features incrementally based on what users actually need. Current setup handles individual developers and small teams deploying web apps, APIs, and services.</p>
        
        <p class="text-gray-300 mb-8">As more people use it, I expand capabilities. I prioritize stability over speed — every feature gets tested properly before it ships.</p>
        
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
          <li>Standard pricing: Basic ($15/mo), Pro ($35/mo), Premium ($75/mo)</li>
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
          <li>We do not guarantee backup or recovery of your data — regular backups are your responsibility</li>
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
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">Simple, Transparent Pricing</h1>
        <p class="text-gray-300 text-lg mb-8">Full-stack hosting in 5 minutes: Git deploy, one-click databases, SSL, and SSH.</p>
        
        <!-- Billing Toggle -->
        <div class="flex items-center justify-center gap-4 mb-12">
          <span class="text-gray-300 text-sm font-medium billing-label" data-type="monthly">Monthly</span>
          <button id="billingToggle" class="relative w-16 h-8 bg-gray-700 rounded-full transition-all hover:bg-gray-600" onclick="toggleBilling()">
            <div id="billingSlider" class="absolute top-1 left-1 w-6 h-6 bg-blue-400 rounded-full transition-transform duration-300 shadow-[0_0_20px_rgba(96,165,250,0.6)]"></div>
          </button>
          <span class="text-gray-400 text-sm billing-label" data-type="yearly">Yearly <span class="text-blue-400 font-bold">(Save 17%)</span></span>
        </div>
      </section>
      
      <section class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-black/90 backdrop-blur-xl border border-blue-400/40 rounded p-8 hover:border-blue-300 hover:scale-[1.02] transition-all shadow-[0_0_60px_rgba(135,206,250,0.2),0_0_90px_rgba(135,206,250,0.1),inset_0_0_40px_rgba(135,206,250,0.03),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div class="border-b border-blue-400/20 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Basic</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="pricing-amount" data-monthly="15" data-yearly="150">
                <span class="text-4xl font-extrabold text-blue-300 price-value">$15</span>
                <span class="text-base font-normal text-gray-300 price-interval">/mo</span>
              </div>
            </div>
            <div class="text-sm text-gray-300">Perfect for side projects</div>
          </div>
          <ul class="space-y-3 mb-8 text-sm">
            <li class="text-gray-300"><strong class="text-white">1 GB RAM</strong></li>
            <li class="text-gray-300"><strong class="text-white">1 CPU core</strong></li>
            <li class="text-gray-300"><strong class="text-white">25 GB SSD storage</strong></li>
            <li class="text-gray-300"><strong class="text-white">1 TB bandwidth</strong></li>
            <li class="text-blue-300 pt-3 border-t border-blue-400/30"><strong class="text-white">2 sites included</strong></li>
            <li class="text-blue-300">Unlimited updates per site</li>
            <li class="text-gray-400">Full SSH/root access</li>
            <li class="text-gray-400">One-click Git deployment</li>
            <li class="text-gray-400">One-click database setup (MongoDB, PostgreSQL)</li>
            <li class="text-gray-400">Custom domains</li>
            <li class="text-gray-400">One-click SSL</li>
            <li class="text-gray-400">Deployment logs</li>
            <li class="text-gray-400">Email support (24-48hr)</li>
          </ul>
          <a href="/pay?plan=basic&interval=monthly" class="plan-cta block w-full px-6 py-3 bg-transparent border border-blue-500 text-blue-400 text-center font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm" data-plan="basic">Select Basic</a>
        </div>
        
        <div class="bg-gradient-to-br from-gray-900/95 via-blue-950/30 to-black/95 backdrop-blur-xl border-2 border-blue-300 rounded p-8 relative transform md:scale-105 shadow-[0_0_80px_rgba(135,206,250,0.35),0_0_120px_rgba(135,206,250,0.2),inset_0_0_60px_rgba(135,206,250,0.06),inset_0_2px_2px_rgba(255,255,255,0.15)] hover:scale-[1.08] transition-all duration-300">
          <div class="popular-badge">Most Popular</div>
          <div class="border-b border-blue-300 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Pro</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="pricing-amount" data-monthly="35" data-yearly="350">
                <span class="text-4xl font-extrabold text-blue-300 price-value">$35</span>
                <span class="text-base font-normal text-gray-300 price-interval">/mo</span>
              </div>
            </div>
            <div class="text-sm text-gray-300">Most popular • For production apps</div>
          </div>
          <ul class="space-y-3 mb-8 text-sm">
            <li class="text-gray-300"><strong class="text-white">2 GB RAM</strong></li>
            <li class="text-gray-300"><strong class="text-white">2 CPU cores</strong></li>
            <li class="text-gray-300"><strong class="text-white">50 GB SSD storage</strong></li>
            <li class="text-gray-300"><strong class="text-white">2 TB bandwidth</strong></li>
            <li class="text-blue-300 pt-3 border-t border-blue-400/30"><strong class="text-white">5 sites included</strong></li>
            <li class="text-blue-300">Unlimited updates per site</li>
            <li class="text-gray-400">Full SSH/root access</li>
            <li class="text-gray-400">One-click Git deployment</li>
            <li class="text-gray-400">One-click database setup (MongoDB, PostgreSQL)</li>
            <li class="text-gray-400">Custom domains</li>
            <li class="text-gray-400">One-click SSL</li>
            <li class="text-gray-400">Deployment logs</li>
            <li class="text-blue-300 pt-3 border-t border-blue-400/30">Plus Pro perks:</li>
            <li class="text-blue-300">Priority support (12hr response)</li>
            <li class="text-blue-300">Server controls (start/stop/restart)</li>
          </ul>
          <a href="/pay?plan=pro&interval=monthly" class="plan-cta block w-full px-6 py-3 bg-blue-600 text-white text-center font-bold rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm" data-plan="pro">Select Pro</a>
        </div>
        
        <div class="bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-black/90 backdrop-blur-xl border border-blue-400/40 rounded p-8 hover:border-blue-300 hover:scale-[1.02] transition-all shadow-[0_0_60px_rgba(135,206,250,0.2),0_0_90px_rgba(135,206,250,0.1),inset_0_0_40px_rgba(135,206,250,0.03),inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div class="border-b border-blue-400/20 pb-6 mb-6">
            <div class="text-xl font-bold text-white mb-2">Premium</div>
            <div class="flex items-baseline gap-2 mb-2">
              <div class="pricing-amount" data-monthly="75" data-yearly="750">
                <span class="text-4xl font-extrabold text-blue-300 price-value">$75</span>
                <span class="text-base font-normal text-gray-300 price-interval">/mo</span>
              </div>
            </div>
            <div class="text-sm text-gray-300">For serious projects</div>
          </div>
          <ul class="space-y-3 mb-8 text-sm">
            <li class="text-gray-300"><strong class="text-white">4 GB RAM</strong></li>
            <li class="text-gray-300"><strong class="text-white">2 CPU cores</strong></li>
            <li class="text-gray-300"><strong class="text-white">80 GB SSD storage</strong></li>
            <li class="text-gray-300"><strong class="text-white">4 TB bandwidth</strong></li>
            <li class="text-blue-300 pt-3 border-t border-blue-400/30"><strong class="text-white">10 sites included</strong></li>
            <li class="text-blue-300">Unlimited updates per site</li>
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
          <a href="/pay?plan=premium&interval=monthly" class="plan-cta block w-full px-6 py-3 bg-transparent border border-blue-500 text-blue-400 text-center font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all uppercase tracking-wider text-sm" data-plan="premium">Select Premium</a>
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
    ${getScripts('nav.js', 'pricing.js')}
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
            <li><strong class="text-white">DigitalOcean, LLC:</strong> Your servers are hosted on DigitalOcean infrastructure. Server IP addresses and usage data may be processed by DigitalOcean in accordance with <a href="https://www.digitalocean.com/legal/privacy-policy" target="_blank" class="text-blue-400 hover:text-blue-500 underline">DigitalOcean's Privacy Policy</a>.</li>
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
              <h3 class="text-lg font-medium text-white">Why wouldn't I just use DigitalOcean directly?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">DigitalOcean gives you raw infrastructure (Droplets) or a managed app platform. Droplets require you to install and maintain everything yourself  —  Ubuntu, Nginx, SSL, runtimes, and deployments. The App Platform automates deployments but does not give full server control. Clouded Basement automates provisioning and deployment while giving you full root access to your own server, saving you setup time without losing control.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">Do I actually own my server?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Yes. Every VPS is fully yours, with root access and a dedicated IP. You can install anything, modify the configuration, or migrate it elsewhere at any time. Clouded Basement just handles the initial setup and deployment automation.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">What happens if I cancel?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">You can cancel anytime. Your server stays active until the end of your billing period so you can back up your data or migrate. After that, the server is shut down. No contracts, no cancellation fees.</p>
              </div>
            </div>
          </div>
          
          <div class="faq-item mb-4 bg-gray-800/30 border border-blue-500/10 rounded-lg overflow-hidden">
            <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
              <h3 class="text-lg font-medium text-white">How is Clouded Basement different from Heroku or Vercel?</h3>
              <span class="text-2xl text-blue-400 transform transition-transform duration-300">+</span>
            </div>
            <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0">
              <div class="px-6 pb-6">
                <p class="text-gray-400">Unlike PaaS platforms, Clouded Basement gives you full server control with automated setup and deployment. You avoid vendor lock-in while still enjoying one-click provisioning, SSL, and GitHub deployments.</p>
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
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">Technical Documentation</h1>
        <p class="text-xl text-gray-400 mb-16">Complete technical reference for Clouded Basement — infrastructure details, deployment methods, and system architecture.</p>
        
        <!-- ============================================ -->
        <!-- SECTION 1: OVERVIEW -->
        <!-- ============================================ -->
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-gray-800">Overview</h2>
          
          <div class="space-y-4 text-gray-300 leading-relaxed">
            <p>
              Clouded Basement provides automated VPS provisioning on DigitalOcean infrastructure. When you complete payment, the platform creates an Ubuntu 22.04 server with a complete development environment pre-installed, including Node.js, Python, Rust, Go, Nginx, and SSL tooling.
            </p>
            
            <p>
              Each server is fully isolated with dedicated resources and a unique IP address. You receive root SSH access immediately upon provisioning. The platform handles initial setup automation but does not restrict server access or sandbox applications.
            </p>
            
            <p>
              This is not a Platform-as-a-Service (PaaS). You have complete control over the server, can install any software, modify configurations, and migrate elsewhere at any time. Clouded Basement automates provisioning and provides deployment tools, but the server itself operates as a standard VPS with no vendor lock-in.
            </p>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 2: ARCHITECTURE OVERVIEW -->
        <!-- ============================================ -->
        <section class="mb-20 bg-blue-950/30 border border-blue-900/30 rounded-lg p-8">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-blue-800/50">Architecture Overview</h2>
          
          <div class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Control Plane vs Customer Server</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                Clouded Basement operates as a control plane that provisions and manages infrastructure. When you trigger a payment, the control plane communicates with the DigitalOcean API to create a droplet, then monitors the provisioning process until an IP address is assigned. Once provisioning completes, your server operates independently.
              </p>
              <p class="text-gray-300 leading-relaxed">
                The platform stores SSH credentials to enable automated deployments and SSL certificate installation. When you use one-click deployment features, the control plane connects to your server, executes the necessary commands, and returns logs. You retain full root access and can change passwords or configurations at any time.
              </p>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">What Clouded Basement Touches</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                Platform access to customer servers is limited to automation features:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Git deployments:</strong> Connects via SSH when you trigger a deployment, clones repository, installs dependencies, and configures web server</li>
                <li><strong class="text-white">SSL certificates:</strong> Executes certbot commands to install Let's Encrypt certificates when you enable SSL for a domain</li>
                <li><strong class="text-white">Server controls:</strong> Sends power on/off/restart commands to DigitalOcean API when you use dashboard controls</li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">What Clouded Basement Never Touches</h3>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Application data or user files (no scanning, no monitoring)</li>
                <li>Database contents or credentials beyond what you configure</li>
                <li>Application logs (stored locally on your server only)</li>
                <li>Network traffic or API requests your application makes</li>
                <li>Custom configurations you manually set via SSH</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-4">
                Once provisioned, your server is yours. The platform does not have background processes monitoring activity, reading files, or analyzing usage patterns.
              </p>
            </div>
            
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-6">
              <h3 class="text-white text-lg font-semibold mb-3">Security Model</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                SSH credentials are stored in the platform database to enable automation features. This is standard for managed hosting platforms and allows one-click deployments without requiring manual intervention.
              </p>
              <p class="text-gray-300 leading-relaxed">
                <strong class="text-white">You can change your SSH password at any time</strong> via direct server access. Future deployments will prompt for new credentials if the stored password no longer works. This gives you full control over access while maintaining convenience when you need it.
              </p>
            </div>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 3: PROVISIONING PIPELINE -->
        <!-- ============================================ -->
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-gray-800">Provisioning Pipeline</h2>
          
          <p class="text-gray-300 leading-relaxed mb-8">
            When you complete payment, the following automated sequence executes. Typical provisioning time is 90-120 seconds from payment to server availability.
          </p>
          
          <div class="space-y-6">
            <div class="bg-gray-900/50 border-l-4 border-blue-500 p-6">
              <h3 class="text-lg font-semibold text-white mb-2">Step 1: Payment Validation</h3>
              <p class="text-gray-300 leading-relaxed">
                Stripe webhook confirms payment success and extracts plan details. The system verifies you don't already have an active server (one server per customer enforced at database level). If validation passes, provisioning begins immediately.
              </p>
            </div>
            
            <div class="bg-blue-950/40 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-2">Step 2: Droplet Creation</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                DigitalOcean API call creates a new droplet with these specifications:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Image:</strong> Ubuntu 22.04 x64 LTS</li>
                <li><strong class="text-white">Region:</strong> NYC3 (New York City)</li>
                <li><strong class="text-white">Size:</strong> Varies by plan (s-1vcpu-1gb, s-2vcpu-2gb, s-2vcpu-4gb)</li>
                <li><strong class="text-white">Features:</strong> Monitoring enabled, backups disabled</li>
                <li><strong class="text-white">Tags:</strong> clouded-basement (for inventory tracking)</li>
              </ul>
            </div>
            
            <div class="bg-gray-900/50 border-l-4 border-blue-500 p-6">
              <h3 class="text-lg font-semibold text-white mb-2">Step 3: Cloud-Init Execution</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                The droplet boots and runs a cloud-init script that installs the complete development environment. This process takes 60-90 seconds.
              </p>
              
              <h4 class="text-md font-semibold text-white mb-2 mt-4">Packages Installed:</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <p class="text-gray-300"><strong class="text-white">Node.js:</strong> 20.x (via NodeSource)</p>
                  <p class="text-gray-300"><strong class="text-white">nvm:</strong> Latest (Node Version Manager)</p>
                  <p class="text-gray-300"><strong class="text-white">Python:</strong> 3.x + pip3</p>
                  <p class="text-gray-300"><strong class="text-white">Go:</strong> 1.21.6</p>
                </div>
                <div>
                  <p class="text-gray-300"><strong class="text-white">Rust:</strong> Latest stable (via rustup)</p>
                  <p class="text-gray-300"><strong class="text-white">Nginx:</strong> Latest from Ubuntu repos</p>
                  <p class="text-gray-300"><strong class="text-white">Certbot:</strong> Latest (Let's Encrypt)</p>
                  <p class="text-gray-300"><strong class="text-white">Git:</strong> Latest + wget, curl</p>
                </div>
              </div>
              
              <h4 class="text-md font-semibold text-white mb-2 mt-4">Security Configuration:</h4>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">SSH:</strong> Root password authentication enabled (generated with 256-bit entropy)</li>
                <li><strong class="text-white">Firewall:</strong> UFW configured with ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open</li>
                <li><strong class="text-white">Nginx:</strong> Default welcome page deployed to /var/www/html</li>
              </ul>
            </div>
            
            <div class="bg-blue-950/40 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-2">Step 4: IP Address Polling</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                The control plane polls the DigitalOcean API every 10 seconds to check droplet status and IP assignment. Maximum timeout is 5 minutes.
              </p>
              <p class="text-gray-300 leading-relaxed">
                When the droplet reaches "active" status and has an assigned IP address, the system updates the database and sends a welcome email with your dashboard link. SSH credentials are displayed in the dashboard (never sent via email for security).
              </p>
            </div>
            
            <div class="bg-gray-900/50 border-l-4 border-blue-500 p-6">
              <h3 class="text-lg font-semibold text-white mb-2">Step 5: Server Ready</h3>
              <p class="text-gray-300 leading-relaxed">
                Your server is now fully operational. You can SSH in immediately using the credentials displayed in your dashboard. Nginx is serving a default welcome page, and all development tools are ready to use.
              </p>
            </div>
          </div>
          
          <div class="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-6 mt-8">
            <h3 class="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span>⚠️</span> Failure Handling
            </h3>
            <p class="text-gray-300 leading-relaxed mb-3">
              If provisioning fails (e.g., DigitalOcean API error, network timeout), the system automatically issues a Stripe refund and marks the server as "failed" in the database for audit purposes.
            </p>
            <p class="text-gray-300 leading-relaxed">
              Provisioning timeouts after 5 minutes are rare but can occur during DigitalOcean capacity issues. These require manual intervention—contact support if your server remains in "provisioning" status beyond 5 minutes.
            </p>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 4: DEPLOYMENT METHODS -->
        <!-- ============================================ -->
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-gray-800">Deployment Methods</h2>
          
          <p class="text-gray-300 leading-relaxed mb-8">
            Clouded Basement provides automated Git deployment for public repositories. When you paste a repository URL and trigger deployment, the platform connects to your server via SSH, clones the repository, detects the project type, installs dependencies, builds production assets, and configures the web server.
          </p>
          
          <div class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Supported Git Platforms</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                The platform supports public repositories from the following providers:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">GitHub:</strong> Uses tarball API endpoint for faster cloning without Git history</li>
                <li><strong class="text-white">GitLab:</strong> Direct git clone over HTTPS</li>
                <li><strong class="text-white">Bitbucket:</strong> Direct git clone over HTTPS</li>
                <li><strong class="text-white">Codeberg:</strong> Direct git clone over HTTPS</li>
                <li><strong class="text-white">SourceHut:</strong> Direct git clone over HTTPS</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-4">
                <strong class="text-white">Private repositories are not currently supported.</strong> The platform does not implement GitHub Personal Access Token authentication or SSH key deployment. You must make your repository public or use manual deployment via SSH.
              </p>
            </div>
            
            <div class="bg-blue-950/30 border border-blue-900/30 rounded-lg p-8">
              <h3 class="text-xl font-semibold text-white mb-3">Project Type Detection</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                After cloning, the platform inspects the repository root to determine project type. Detection happens in this priority order:
              </p>
              
              <div class="space-y-4">
                <div class="bg-gray-900/50 border-l-4 border-blue-400 p-4">
                  <h4 class="text-white font-semibold mb-2">1. React/Vue Frontend (package.json detected)</h4>
                  <p class="text-gray-300 text-sm leading-relaxed mb-2">
                    Installs dependencies with npm install (--legacy-peer-deps fallback if conflicts occur). Attempts build script detection in this order: npm run build → npm run prod → npm run production.
                  </p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Looks for built assets in: dist/ → build/ → out/. Copies entire directory to /var/www/html and configures Nginx for single-page application routing (all requests serve index.html for client-side routing).
                  </p>
                </div>
                
                <div class="bg-gray-900/50 border-l-4 border-blue-400 p-4">
                  <h4 class="text-white font-semibold mb-2">2. Node.js Backend (package.json + server detection)</h4>
                  <p class="text-gray-300 text-sm leading-relaxed mb-2">
                    If package.json exists but no build output directory found, and files like server.js, app.js, index.js exist, treats as backend application.
                  </p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Installs production dependencies (npm ci --production), creates systemd service, starts application, configures Nginx reverse proxy on port 3000. Application must listen on PORT environment variable (defaults to 3000 if not set).
                  </p>
                </div>
                
                <div class="bg-gray-900/50 border-l-4 border-blue-400 p-4">
                  <h4 class="text-white font-semibold mb-2">3. Python (requirements.txt or setup.py)</h4>
                  <p class="text-gray-300 text-sm leading-relaxed mb-2">
                    Creates Python virtual environment, installs dependencies via pip3. Looks for WSGI application file (wsgi.py, app.py, main.py).
                  </p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Configures Gunicorn as WSGI server with 4 workers, creates systemd service, starts application, configures Nginx reverse proxy on port 8000.
                  </p>
                </div>
                
                <div class="bg-gray-900/50 border-l-4 border-blue-400 p-4">
                  <h4 class="text-white font-semibold mb-2">4. Rust (Cargo.toml)</h4>
                  <p class="text-gray-300 text-sm leading-relaxed mb-2">
                    Builds release binary with cargo build --release. Locates compiled binary in target/release/.
                  </p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Creates systemd service, starts application, configures Nginx reverse proxy on port 8080. Application must bind to 0.0.0.0 (not 127.0.0.1) to accept external connections.
                  </p>
                </div>
                
                <div class="bg-gray-900/50 border-l-4 border-blue-400 p-4">
                  <h4 class="text-white font-semibold mb-2">5. Go (go.mod)</h4>
                  <p class="text-gray-300 text-sm leading-relaxed mb-2">
                    Builds binary with go build. Locates main package and compiles.
                  </p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Creates systemd service, starts application, configures Nginx reverse proxy on port 8080. Application must bind to 0.0.0.0 and read PORT environment variable.
                  </p>
                </div>
                
                <div class="bg-gray-900/50 border-l-4 border-blue-400 p-4">
                  <h4 class="text-white font-semibold mb-2">6. Static HTML (index.html)</h4>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Copies all files directly to /var/www/html. No build step. Configures Nginx to serve files with proper MIME types.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Environment Variables</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                You can configure environment variables through the dashboard. The platform creates a .env file in your project directory before starting the application. Variables are injected at deployment time, not stored in the repository.
              </p>
              <p class="text-gray-300 leading-relaxed">
                Values are shell-escaped to prevent injection attacks. Secrets like API keys are sanitized from deployment logs (pattern matching removes Stripe keys, AWS credentials, database URLs, GitHub tokens, and other common secret formats).
              </p>
            </div>
            
            <div class="bg-blue-950/40 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-3">Health Checks</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                After deployment completes, the platform verifies the application is running:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Static sites:</strong> HTTP request to http://your-server-ip/ expects 200 OK response</li>
                <li><strong class="text-white">Backend applications:</strong> Systemd service status check expects "active (running)" state</li>
                <li><strong class="text-white">Retry logic:</strong> 3 attempts with 2-second intervals before marking deployment as failed</li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Deployment Logs</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                All deployment steps are logged and displayed in your dashboard in real-time. Logs include:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Repository clone progress and detected branch (main → master fallback)</li>
                <li>Project type detection results</li>
                <li>Dependency installation output (npm, pip, cargo, go)</li>
                <li>Build script execution output</li>
                <li>Web server configuration changes</li>
                <li>Health check results</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-3">
                Sensitive data like API keys and passwords are automatically redacted from logs using regex pattern matching.
              </p>
            </div>
            
            <div class="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-6">
              <h3 class="text-white text-lg font-semibold mb-3 flex items-center gap-2">
                <span>⚠️</span> Limitations
              </h3>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Repository size:</strong> 100MB maximum (enforced during clone/download)</li>
                <li><strong class="text-white">Private repositories:</strong> Currently only public repos supported. Private repo authentication is planned but requires secure token storage and testing. Solo dev, so no timeline yet.</li>
                <li><strong class="text-white">Build timeouts:</strong> 10-minute maximum for dependency installation and builds</li>
                <li><strong class="text-white">Database setup:</strong> Must be configured manually via SSH—no automated database provisioning</li>
              </ul>
            </div>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 5: SECURITY & TRUST MODEL -->
        <!-- ============================================ -->
        <section class="mb-20 bg-blue-950/30 border border-blue-900/30 rounded-lg p-8">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-blue-800/50">Security & Trust Model</h2>
          
          <div class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Stored Credentials</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                SSH credentials (IP address, username, password) are stored in the platform database in plaintext. This is required for automated deployment and SSL certificate installation features to function. Without stored credentials, the platform cannot connect to your server to execute deployment commands.
              </p>
              <p class="text-gray-300 leading-relaxed mb-4">
                This is standard practice for managed hosting platforms—services like Heroku, Render, and Vercel all store deployment credentials to enable automation. The trade-off is convenience (one-click deployments) versus manual SSH key management.
              </p>
              <p class="text-gray-300 leading-relaxed">
                <strong class="text-white">You can change your SSH password at any time.</strong> Log into your server via SSH and run <code class="bg-gray-900 px-2 py-1 rounded text-sm text-blue-400">passwd</code> to set a new password. Future deployments will fail until you provide the new credentials in your dashboard, giving you full control over access.
              </p>
            </div>
            
            <div class="bg-gray-900/50 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-3">Database Security</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                Platform database credentials are protected with:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Password hashing:</strong> User passwords hashed with bcrypt (10 rounds) before storage</li>
                <li><strong class="text-white">Parameterized queries:</strong> All database operations use parameterized queries to prevent SQL injection</li>
                <li><strong class="text-white">Session security:</strong> HTTP-only cookies prevent JavaScript access to session tokens</li>
                <li><strong class="text-white">CSRF protection:</strong> All form submissions require valid CSRF tokens</li>
                <li><strong class="text-white">Rate limiting:</strong> Brute-force protection on authentication endpoints</li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Platform Access Transparency</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                The platform connects to your server only when you explicitly trigger an action:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Git deployment:</strong> When you click "Deploy from Git" button in dashboard</li>
                <li><strong class="text-white">SSL installation:</strong> When you click "Enable SSL" for a domain</li>
                <li><strong class="text-white">Database setup:</strong> When you click "Setup Database" (if applicable)</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-4">
                There are no background processes monitoring your server, reading files, or analyzing traffic. The control plane only acts when you initiate an operation through the dashboard.
              </p>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Audit Trail Limitations</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                Deployment logs are stored in the platform database and displayed in your dashboard. These logs include command outputs but with secrets automatically redacted (API keys, tokens, passwords matched via regex patterns).
              </p>
              <p class="text-gray-300 leading-relaxed">
                <strong class="text-white">What is NOT logged:</strong> Server access outside of platform-triggered deployments is not tracked. If you SSH directly into your server and make changes manually, those actions are not visible to the platform. Only operations initiated through the dashboard appear in deployment history.
              </p>
            </div>
            
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-6">
              <h3 class="text-white text-lg font-semibold mb-3">Trust Model Summary</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                Clouded Basement operates on a <strong class="text-white">"convenience with transparency"</strong> security model:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Credentials stored for automation features (industry standard practice)</li>
                <li>You can revoke platform access anytime by changing SSH password</li>
                <li>Platform only connects when you trigger an action explicitly</li>
                <li>No background monitoring or file scanning</li>
                <li>Open about what is stored and why</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-4">
                This is a solo-founder operation. I'm not harvesting data, training AI models on your code, or selling information. The business model is simple: you pay for server hosting, I provision and maintain infrastructure. Stored credentials exist solely to enable the features you're paying for.
              </p>
            </div>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 6: OWNERSHIP & CONTROL -->
        <!-- ============================================ -->
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-gray-800">Ownership & Control</h2>
          
          <div class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Full Root Access</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                You receive root SSH access immediately upon provisioning. There are no restrictions, sandboxing, or custom kernels. This is a standard Ubuntu 22.04 VPS with full privileges—you can install any software, modify system configurations, change firewall rules, add users, or wipe the server entirely.
              </p>
              <p class="text-gray-300 leading-relaxed">
                Clouded Basement automation scripts do not lock files, prevent package installation, or restrict system access in any way. If you want to uninstall Nginx and use Apache instead, install Docker manually, or run your own deployment tools—you can.
              </p>
            </div>
            
            <div class="bg-blue-950/40 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-3">No Vendor Lock-In</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                Your server is a DigitalOcean droplet provisioned under your indirect control. The droplet belongs to Clouded Basement's DigitalOcean account for billing simplicity, but the infrastructure is standard and portable.
              </p>
              <p class="text-gray-300 leading-relaxed mb-3">
                <strong class="text-white">Migration path:</strong> If you decide to leave Clouded Basement, you can:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Create a snapshot of your server via DigitalOcean support (contact support@cloudedbasement.ca for coordination)</li>
                <li>Recreate the environment on your own VPS by documenting installed packages (use <code class="bg-gray-900 px-2 py-1 rounded text-sm text-blue-400">dpkg -l</code> to list)</li>
                <li>Use standard backup tools (rsync, tar) to copy files to another server</li>
                <li>Export databases with mysqldump or pg_dump and restore elsewhere</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-3">
                There is no proprietary runtime, custom deployment format, or platform-specific database structure. Your application code and data are completely portable.
              </p>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Password Control</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                You can change your SSH password at any time via direct server access. Run <code class="bg-gray-900 px-2 py-1 rounded text-sm text-blue-400">passwd</code> as root to set a new password. The platform will continue to attempt connections with the old stored credentials until you update them in the dashboard.
              </p>
              <p class="text-gray-300 leading-relaxed">
                <strong class="text-white">Disabling platform access:</strong> Changing your password without updating the dashboard effectively locks out the control plane. Automated deployments and SSL installation will fail until you provide new credentials. This gives you a manual killswitch for platform automation if needed.
              </p>
            </div>
            
            <div class="bg-blue-950/30 border border-blue-900/30 rounded-lg p-8">
              <h3 class="text-xl font-semibold text-white mb-3">Server Management Controls</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                The dashboard provides power controls that interact with the DigitalOcean API:
              </p>
              
              <div class="space-y-3">
                <div>
                  <p class="text-white font-semibold mb-1">Power Off</p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Sends graceful shutdown signal to droplet. Server stops but disk persists. You are not billed for compute hours while powered off (only storage costs apply). Data remains intact.
                  </p>
                </div>
                
                <div>
                  <p class="text-white font-semibold mb-1">Power On</p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Boots the droplet. Server resumes from powered-off state with all data and configurations intact. IP address remains the same (static assignment).
                  </p>
                </div>
                
                <div>
                  <p class="text-white font-semibold mb-1">Restart</p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Reboots the server. Equivalent to running <code class="bg-gray-900 px-1 rounded text-xs text-blue-400">reboot</code> via SSH. Useful for applying kernel updates or resetting stuck processes.
                  </p>
                </div>
                
                <div>
                  <p class="text-white font-semibold mb-1">Delete Server</p>
                  <p class="text-gray-300 text-sm leading-relaxed">
                    Permanently destroys the droplet via DigitalOcean API. All data is lost immediately and cannot be recovered. Your subscription ends and no further charges occur.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">What "Ownership" Means</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                The DigitalOcean droplet is created under Clouded Basement's account for billing aggregation. You do not have direct DigitalOcean dashboard access to the droplet.
              </p>
              <p class="text-gray-300 leading-relaxed mb-3">
                <strong class="text-white">In practical terms:</strong>
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>You have root SSH access with full system control</li>
                <li>Your data and applications are completely portable (standard Linux environment)</li>
                <li>You can change SSH password anytime to disable platform automation</li>
                <li>You control when the server is powered on/off or deleted via dashboard</li>
                <li>No vendor-specific dependencies in your application stack</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-4">
                This is a managed provisioning layer over standard VPS infrastructure. The platform handles initial setup, deployment automation, and SSL configuration, but does not restrict or modify the underlying Linux system beyond initial configuration.
              </p>
            </div>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 7: CURRENT LIMITATIONS -->
        <!-- ============================================ -->
        <section class="mb-20 bg-blue-950/30 border border-blue-900/30 rounded-lg p-8">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-blue-800/50">Current Limitations</h2>
          
          <p class="text-gray-300 leading-relaxed mb-6">
            Clouded Basement is a solo-founder operation. The platform prioritizes working features over comprehensive coverage. These limitations are intentional trade-offs for simplicity and maintainability.
          </p>
          
          <div class="space-y-6">
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Infrastructure</h3>
              <ul class="list-disc list-inside space-y-3 text-gray-300 ml-4">
                <li>
                  <strong class="text-white">Single region:</strong> All servers provision in NYC3 (New York). The dashboard shows region selection UI, but the backend ignores it and hardcodes NYC3. Multi-region support requires additional testing and geographic load balancing complexity.
                </li>
                <li>
                  <strong class="text-white">One server per customer:</strong> Database constraint enforces single server limit. No support for multiple servers, staging environments, or load-balanced clusters. This is a deliberate scope limitation for early-stage customers.
                </li>
                <li>
                  <strong class="text-white">Automated backups enabled:</strong> DigitalOcean weekly backups are active on all droplets. Backups rotate automatically (4 most recent kept). Restore requires manual coordination with support—contact support@cloudedbasement.ca if you need a server restored from backup.
                </li>
              </ul>
            </div>
            
            <div class="bg-gray-900/50 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-3">Deployment & Development</h3>
              <ul class="list-disc list-inside space-y-3 text-gray-300 ml-4">
                <li>
                  <strong class="text-white">Public repositories only:</strong> Private repo support requires GitHub Personal Access Token storage and OAuth flow. Planned feature, no timeline. Use manual deployment via SSH for private code.
                </li>
                <li>
                  <strong class="text-white">No Docker support:</strong> Containers add orchestration complexity, security isolation concerns, and resource overhead. Not currently planned. Install Docker manually via SSH if needed, but platform deployments won't use it.
                </li>
                <li>
                  <strong class="text-white">100MB repository limit:</strong> Prevents long clone times and disk space abuse. Large monorepos or projects with heavy assets won't deploy. Use .gitignore for node_modules, build artifacts, and media files.
                </li>
                <li>
                  <strong class="text-white">No CI/CD pipelines:</strong> Deployment is triggered manually through dashboard. No GitHub Actions integration, webhooks, or automatic deploys on git push. You must click "Deploy from Git" each time.
                </li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Account & Billing</h3>
              <ul class="list-disc list-inside space-y-3 text-gray-300 ml-4">
                <li>
                  <strong class="text-white">No plan changes:</strong> Cannot upgrade/downgrade plans after provisioning. Must delete existing server and create new one with different plan. Refunds handled manually via Stripe dashboard—contact support.
                </li>
                <li>
                  <strong class="text-white">Single payment method:</strong> Stripe only. No cryptocurrency, PayPal, or wire transfers. Credit/debit card required.
                </li>
                <li>
                  <strong class="text-white">3-day trial enforcement:</strong> Servers power off automatically 3 days after provisioning if no payment received. Destroyed permanently after 7 more days. Trial system runs every 6 hours—not real-time.
                </li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-xl font-semibold text-white mb-3">Support & Reliability</h3>
              <ul class="list-disc list-inside space-y-3 text-gray-300 ml-4">
                <li>
                  <strong class="text-white">Solo founder support:</strong> No 24/7 support team. Response time typically same-day during Atlantic Time business hours. Urgent issues may take several hours if I'm asleep or unavailable.
                </li>
                <li>
                  <strong class="text-white">No SLA guarantee:</strong> Platform uptime is best-effort. DigitalOcean infrastructure is reliable, but control plane issues (database downtime, deployment system failures) may prevent dashboard access or new deployments temporarily.
                </li>
                <li>
                  <strong class="text-white">Manual intervention required:</strong> Some failure modes (provisioning timeout, corrupted deployment, API rate limits) require manual investigation. Automatic retry logic exists but not comprehensive.
                </li>
              </ul>
            </div>
            
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-6">
              <h3 class="text-white text-lg font-semibold mb-3">Not Suitable For</h3>
              <p class="text-gray-300 leading-relaxed mb-3">
                Be honest with yourself about whether this platform fits your needs. Clouded Basement is <strong class="text-white">not appropriate for</strong>:
              </p>
              <ul class="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Production applications with strict uptime requirements (use AWS, GCP, Azure)</li>
                <li>Enterprise customers requiring compliance certifications (SOC 2, HIPAA, PCI-DSS)</li>
                <li>High-traffic applications needing auto-scaling or load balancing</li>
                <li>Teams requiring multi-server environments, staging/production separation</li>
                <li>Projects with complex CI/CD pipelines and automated testing workflows</li>
                <li>Applications requiring geographic distribution or edge caching (Cloudflare, Vercel better fit)</li>
              </ul>
              <p class="text-gray-300 leading-relaxed mt-4">
                This platform is designed for <strong class="text-white">indie developers, side projects, prototypes, and small applications</strong> where simplicity and cost matter more than enterprise features.
              </p>
            </div>
          </div>
        </section>
        
        <!-- ============================================ -->
        <!-- SECTION 8: ROADMAP -->
        <!-- ============================================ -->
        <section class="mb-20">
          <h2 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-gray-800">Development Roadmap</h2>
          
          <p class="text-gray-300 leading-relaxed mb-8">
            Solo founder. No bullshit timelines. This platform is feature-complete for launch. New features get built when real customers ask for them, not before.
          </p>

          <div class="space-y-6">
            <!-- What's Working Now -->
            <div class="bg-blue-950/30 border border-blue-900/30 rounded-lg p-8">
              <h3 class="text-xl font-semibold text-white mb-4">✅ What's Working Now</h3>
              <ul class="space-y-3 text-gray-300">
                <li><strong class="text-white">Automated VPS provisioning:</strong> Ubuntu 22.04 droplet ready in 90-120 seconds with Node 20.x, Python 3, Rust, Go 1.21.6, Nginx, Certbot pre-installed</li>
                <li><strong class="text-white">Git deployment:</strong> 6 project types supported (React/Vue frontend, Node.js backend, Python, Rust, Go, Static HTML). GitHub via tarball download, other hosts via git clone. 100MB repository limit enforced.</li>
                <li><strong class="text-white">One-click SSL:</strong> Certbot automation via SSH, Let's Encrypt certificates installed in 60 seconds, auto-renewal configured</li>
                <li><strong class="text-white">Server controls:</strong> Power on/off/restart/delete via DigitalOcean API. No SSH required for power management.</li>
                <li><strong class="text-white">Trial enforcement:</strong> 3-day trial from provisioning. Automatic power-off at day 3, permanent destruction at day 10. Monitored every 6 hours.</li>
                <li><strong class="text-white">Weekly backups:</strong> DigitalOcean automated snapshots enabled. 4 most recent backups retained. Restore requires manual coordination with support.</li>
                <li><strong class="text-white">Environment variables:</strong> Secure injection during deployment. Shell-escaped, stored in .env file. Secrets sanitized from deployment logs via regex pattern matching.</li>
                <li><strong class="text-white">Health checks:</strong> 3 retries at 2-second intervals. Static sites check HTTP 200. Backend services check systemd status.</li>
                <li><strong class="text-white">Deployment history:</strong> All deployment logs stored in database with timestamps. Real-time log streaming during active deployments.</li>
                <li><strong class="text-white">Domain management:</strong> Add unlimited custom domains via dashboard. DNS configuration instructions displayed. Domain-server linkage tracked in database. Admin panel with full CRUD operations.</li>
                <li><strong class="text-white">One-click database provisioning:</strong> PostgreSQL and MongoDB installation via SSH automation. Takes 2-3 minutes. Generates credentials, creates users, configures authentication. Connection strings displayed in dashboard.</li>
              </ul>
            </div>

            <!-- Actively Being Built -->
            <div class="bg-gray-900/50 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-4">🔧 Actively Being Built</h3>
              <p class="text-gray-300 mb-4">
                Platform is stable. Current focus: <strong class="text-white">final testing before first paying customers</strong>.
              </p>
              <ul class="space-y-2 text-gray-300 ml-4">
                <li>Monitoring trial system behavior in production environment</li>
                <li>Stress-testing concurrent deployments (10+ simultaneous users)</li>
                <li>Verifying backup restoration procedures with real droplet recovery</li>
                <li>Edge case handling (DigitalOcean API timeouts, corrupted deployments, SSH failures)</li>
                <li>Email delivery testing across multiple providers (SendGrid, Gmail OAuth2, SMTP)</li>
              </ul>
            </div>

            <!-- Planned Features -->
            <div class="bg-blue-950/40 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-4">📋 Planned Features</h3>
              <p class="text-gray-300 mb-4 italic">
                These get built when customers need them. No fixed timeline (solo dev).
              </p>
              <ul class="space-y-3 text-gray-300 ml-4">
                <li>
                  <strong class="text-white">Private repository support:</strong> GitHub Personal Access Token authentication. Requires secure token storage, OAuth flow implementation, and testing with private repos. Currently only public repos supported via tarball download.
                </li>
                <li>
                  <strong class="text-white">Multi-region expansion:</strong> Currently hardcoded to NYC3 (New York). Adding SFO3 (San Francisco), LON1 (London), SGP1 (Singapore) requires geographic testing, latency verification, and UI updates. Dashboard already has region selector—backend ignores it.
                </li>
                <li>
                  <strong class="text-white">Plan upgrades/downgrades:</strong> Change server size without destroying droplet. Requires DigitalOcean resize API integration, downtime coordination, and database migration logic. Currently must delete server and create new one.
                </li>
                <li>
                  <strong class="text-white">Deployment size increase:</strong> Raise 100MB tarball limit to 250MB or 500MB. Requires storage impact analysis and clone timeout adjustments (currently 15-minute SSH timeout).
                </li>
              </ul>
            </div>

            <!-- Under Consideration -->
            <div class="bg-gray-900/50 border-l-4 border-blue-400 p-6">
              <h3 class="text-lg font-semibold text-white mb-4">💭 Under Consideration</h3>
              <p class="text-gray-300 mb-4">
                Might build based on customer demand. Not committed.
              </p>
              <ul class="space-y-2 text-gray-300 ml-4">
                <li><strong class="text-white">Multiple servers per customer:</strong> Lift one-server database constraint. Staging/production environments. Requires billing changes (per-server pricing vs per-account).</li>
                <li><strong class="text-white">CI/CD webhooks:</strong> Auto-deploy on git push. Requires webhook secret validation, GitHub/GitLab integration, and event processing.</li>
                <li><strong class="text-white">Team collaboration:</strong> Shared server access for dev teams. Multiple user accounts per server. Role-based permissions.</li>
                <li><strong class="text-white">Redis caching layer:</strong> One-click Redis installation for session storage and caching. Similar to current PostgreSQL/MongoDB provisioning.</li>
                <li><strong class="text-white">Firewall management UI:</strong> Open/close ports beyond default 22/80/443. Currently requires manual SSH and ufw commands.</li>
              </ul>
            </div>

            <!-- Not Planned -->
            <div class="bg-gray-900/50 border border-red-500/30 rounded-lg p-6">
              <h3 class="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                <span>❌</span> Not Planned
              </h3>
              <p class="text-gray-300 mb-4">
                Wrong scope for this platform. Use specialized providers if you need these features.
              </p>
              <ul class="space-y-3 text-gray-300 ml-4">
                <li>
                  <strong class="text-white">Docker/containerization:</strong> Adds orchestration complexity, security isolation concerns, and resource overhead. Out of scope. Use Railway, Render, or Fly.io if you need containers.
                </li>
                <li>
                  <strong class="text-white">Kubernetes orchestration:</strong> Enterprise feature for wrong market. If you need K8s, use GKE (Google), EKS (AWS), or AKS (Azure).
                </li>
                <li>
                  <strong class="text-white">Load balancing / auto-scaling:</strong> Infrastructure complexity beyond solo founder capacity. Use AWS Elastic Load Balancer, GCP Load Balancing, or Cloudflare Load Balancing.
                </li>
                <li>
                  <strong class="text-white">Edge caching / CDN:</strong> Not rebuilding Cloudflare. Use Cloudflare (free tier works great), Fastly, or Vercel Edge Network.
                </li>
                <li>
                  <strong class="text-white">Compliance certifications:</strong> No SOC 2, HIPAA, PCI-DSS audits planned. Solo founder, no legal team. If you need compliance, use AWS, GCP, or Azure with certified services.
                </li>
                <li>
                  <strong class="text-white">24/7 enterprise support:</strong> Best-effort email support only. Response time typically same-day during Atlantic Time business hours. No on-call support staff.
                </li>
              </ul>
            </div>

            <!-- Philosophy Callout -->
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-6">
              <h3 class="text-white text-lg font-semibold mb-3">Development Philosophy</h3>
              <p class="text-gray-300 leading-relaxed mb-4">
                This platform solves one problem well: <strong class="text-white">simple VPS hosting with automated Git deployment</strong>. It won't do everything. If you need enterprise features, compliance certifications, or complex orchestration, use AWS/GCP/Azure. This is for developers who want a server running their code, not a platform engineering team.
              </p>
              <p class="text-gray-300 leading-relaxed">
                Features get prioritized based on <strong class="text-white">real customer needs, not theoretical roadmaps</strong>. If 10 customers ask for private repo support, it gets built. If nobody asks for Kubernetes, it doesn't get built. This keeps the platform focused, maintainable, and actually useful instead of feature-bloated.
              </p>
            </div>
          </div>
        </section>
        
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
    
    <!-- Hero Section with Animated Rainbow Stripes -->
    <section class="hero-wrapper relative min-h-screen flex items-center justify-center pt-32 pb-16">
      <!-- Animated rainbow stripe background -->
      <div class="hero-stripes"></div>
      
      <div class="max-w-screen-xl px-8 md:px-12 lg:px-16 mx-auto text-center relative z-20 hero-content">
        <!-- Hero Heading with Frosted Glass Effect -->
        <div class="relative inline-block mb-6 z-30">
          <!-- Dark backdrop for text visibility (desktop only) -->
          <div class="hidden md:block absolute -inset-8 bg-black/60 backdrop-blur-xl rounded-2xl" style="z-index: -1;"></div>
          
          <h1 class="hero-title text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight px-6 py-4" data-text="Your own VPS. Deployed in minutes. No DevOps headaches.">
            Your own VPS.<br class="sm:hidden"> Deployed in minutes.<br class="sm:hidden"> <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">No DevOps headaches.</span>
          </h1>
        </div>
        
        <p class="mb-8 text-lg font-normal text-gray-400 lg:text-xl sm:px-16 xl:px-48 relative z-30">Clouded Basement provisions a production-ready Linux server with SSL, Git deployments, and full root access  —  so you can ship without babysitting infrastructure.</p>
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
          Production-ready in 2 minutes · Full root SSH · No lock-in
          <a href="/is-this-safe" class="text-brand hover:text-cyan-400 underline ml-2">Is this safe? →</a>
        </p>
      </div>
    </section>

    <!-- Micro-Trust Block -->
    <section class="py-6 px-8 md:px-12 lg:px-16 mb-12">
      <div class="max-w-3xl mx-auto mt-4">
        <ul class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
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
            <span class="text-sm text-gray-300">Cancel anytime  —  no contracts</span>
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
    <section class="py-20 md:py-28 gradient-basement-glimpse relative overflow-hidden">
      <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 relative z-10">
        <h2 class="mb-6 text-3xl md:text-4xl font-extrabold text-center text-white">Why Choose Clouded Basement?</h2>
        <p class="text-center text-gray-400 text-base max-w-2xl mx-auto mb-16">Because you want control and convenience  —  not one or the other.</p>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-16">
          <div class="cloud-glow-card" style="--cloud-clr: rgba(135, 206, 250, 0.6);">
            <div class="p-6">
              <h3 class="mb-3 text-xl font-bold text-white">Your server, not a black box</h3>
              <p class="text-gray-300 text-sm leading-relaxed">Every project runs on its own VPS with full root access. No abstractions, no vendor lock-in, no hidden limits.</p>
            </div>
          </div>
          <div class="cloud-glow-card" style="--cloud-clr: rgba(173, 216, 230, 0.6);">
            <div class="p-6">
              <h3 class="mb-3 text-xl font-bold text-white">Zero-setup infrastructure</h3>
              <p class="text-gray-300 text-sm leading-relaxed">Servers are provisioned with SSL, Nginx, Node.js, Python, and Git deployments automatically  —  ready in minutes.</p>
            </div>
          </div>
          <div class="cloud-glow-card" style="--cloud-clr: rgba(176, 224, 230, 0.6);">
            <div class="p-6">
              <h3 class="mb-3 text-xl font-bold text-white">Talk to the builder</h3>
              <p class="text-gray-300 text-sm leading-relaxed">When something breaks or you have a question, you're talking directly to the person who built the system  —  not a ticket queue.</p>
            </div>
          </div>
          <div class="cloud-glow-card" style="--cloud-clr: rgba(100, 181, 246, 0.6);">
            <div class="p-6">
              <h3 class="mb-3 text-xl font-bold text-white">Simple, predictable pricing</h3>
              <p class="text-gray-300 text-sm leading-relaxed">Flat monthly pricing. Cancel anytime. No usage surprises or complicated tiers.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Unified Gradient Section: How It Works → What You Get → Pricing -->
    <section class="py-0 relative overflow-hidden" style="background: linear-gradient(to bottom, #0a0812 0%, #1a1535 10%, #2a2555 20%, #3a3570 30%, #4a4585 40%, #5a5595 50%, #4a4585 60%, #3a3570 70%, #2a2555 80%, #1a1535 90%, #0a0812 100%);">
      <!-- Rainbow ray colors as subtle overlay -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute inset-0" style="background-image: 
          radial-gradient(ellipse 1400px 500px at 30% 20%, rgba(96, 165, 250, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse 1400px 500px at 70% 50%, rgba(232, 121, 249, 0.05) 0%, transparent 50%),
          radial-gradient(ellipse 1400px 500px at 40% 80%, rgba(94, 234, 212, 0.04) 0%, transparent 50%);"></div>
      </div>

      <!-- How It Works -->
      <div class="py-20 md:py-28 relative z-10">
        <div class="max-w-3xl mx-auto px-8 md:px-12 lg:px-16">
          <h2 class="mb-4 text-3xl md:text-4xl font-extrabold text-center text-white">How It Works</h2>
          <p class="text-center text-gray-400 text-lg" style="margin-bottom: 5rem;">From idea to a live server — without the setup stress</p>
          
          <div class="space-y-8 text-left">
            <p class="text-gray-300 text-lg leading-relaxed">
              <strong class="text-white">You don't need to think about infrastructure.</strong><br>
              We handle the boring parts so you can ship.
            </p>
            
            <div>
              <h3 class="text-xl font-bold text-white mb-2">You choose a plan</h3>
              <p class="text-gray-300 leading-relaxed">Pick the resources you need. No hidden configs, no surprise limits.</p>
            </div>
            
            <div>
              <h3 class="text-xl font-bold text-white mb-2">We prepare everything</h3>
              <p class="text-gray-300 leading-relaxed">We provision a secure Ubuntu server with Nginx, Node, Python, and SSL — ready to go when you are.</p>
            </div>
            
            <div>
              <h3 class="text-xl font-bold text-white mb-2">You deploy your way</h3>
              <p class="text-gray-300 leading-relaxed">SSH in like a normal VPS, or deploy directly from GitHub with one click.</p>
            </div>
            
            <div class="pt-6">
              <p class="text-white text-lg font-semibold mb-2">That's it.</p>
              <p class="text-gray-300 leading-relaxed">No dashboards to fight. No DevOps rabbit holes.<br>Just a server you control.</p>
            </div>
            
            <p class="text-gray-400 text-sm leading-relaxed pt-4">
              Every server is isolated, yours alone, and can be accessed or moved at any time.
            </p>
          </div>
        </div>
      </div>

      <!-- What You Get -->
      <div class="py-20 md:py-28 relative z-10">
        <div class="max-w-4xl px-8 md:px-12 lg:px-16 mx-auto">
          <h2 class="mb-6 text-3xl md:text-4xl font-extrabold text-center text-white">What you get</h2>
          <p class="text-center text-white text-base" style="margin-bottom: 5rem;">Everything you need to run a production app  —  without managing infrastructure from scratch.</p>
        
        <ul class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Dedicated VPS (not shared hosting)</h3>
              <p class="text-white text-sm">Your own isolated server environment</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Ubuntu 22.04 LTS</h3>
              <p class="text-white text-sm">Latest stable long-term support release</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Full root SSH access</h3>
              <p class="text-white text-sm">Complete control over your server</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Nginx preconfigured</h3>
              <p class="text-white text-sm">Web server ready to serve your apps</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Node.js & Python environments</h3>
              <p class="text-white text-sm">Modern runtime environments pre-installed</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">One-click GitHub deployments</h3>
              <p class="text-white text-sm">Deploy directly from your repository</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Custom domains supported</h3>
              <p class="text-white text-sm">Point any domain to your server</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Free SSL certificates (Let's Encrypt)</h3>
              <p class="text-white text-sm">HTTPS encryption included</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Secure-by-default configuration</h3>
              <p class="text-white text-sm">Hardened security settings out of the box</p>
            </div>
          </li>
          <li class="flex items-start gap-3 p-6 bg-gray-900/50">
            <span class="text-brand text-xl flex-shrink-0 mt-1">✓</span>
            <div>
              <h3 class="text-white font-semibold mb-1">Cancel anytime</h3>
              <p class="text-white text-sm">No long-term contracts or commitments</p>
            </div>
          </li>
        </ul>
        
        <p class="text-center text-white text-sm" style="margin-top: 5rem; margin-bottom: 8rem;">You can install anything else you need  —  it's your server.</p>
      </div>

      <!-- Pricing Dose -->
      <div class="py-20 md:py-28 relative z-10">
        <div class="max-w-4xl px-8 md:px-12 lg:px-16 mx-auto">
          <h2 class="mb-6 text-3xl md:text-4xl font-extrabold text-center text-white">Pricing</h2>
          <p class="text-center text-gray-400 text-base mb-16">Simple monthly pricing · No usage surprises · Cancel anytime</p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 mt-12">
            <!-- Basic -->
            <div class="bg-gray-900 border border-blue-500/20 rounded-lg p-6 relative overflow-visible">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 text-white text-[8px] font-semibold px-2 py-0.5 rounded" style="background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%); box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3); letter-spacing: 0.02em; white-space: nowrap;">3-DAY FREE TRIAL</div>
              <h3 class="text-lg font-bold text-white mb-1 mt-1">Basic</h3>
              <p class="text-2xl font-extrabold text-white mb-3">$15<span class="text-sm font-normal text-gray-400">/mo</span></p>
              <p class="text-gray-400 text-sm mb-4">1 GB RAM · 1 vCPU · 25 GB SSD · 2 sites</p>
              <a href="/pay?plan=basic&interval=monthly" class="block w-full px-4 py-2 bg-transparent border border-blue-500 text-blue-400 text-center text-sm font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">Deploy Basic</a>
            </div>
            
            <!-- Pro -->
            <div class="bg-gray-900 border border-blue-500/20 rounded-lg p-6 relative overflow-visible">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 text-white text-[8px] font-semibold px-2 py-0.5 rounded" style="background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%); box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3); letter-spacing: 0.02em; white-space: nowrap;">3-DAY FREE TRIAL</div>
              <h3 class="text-lg font-bold text-white mb-1 mt-1">Pro</h3>
              <p class="text-2xl font-extrabold text-white mb-3">$35<span class="text-sm font-normal text-gray-400">/mo</span></p>
              <p class="text-gray-400 text-sm mb-4">2 GB RAM · 2 vCPUs · 50 GB SSD · 5 sites</p>
              <a href="/pay?plan=pro&interval=monthly" class="block w-full px-4 py-2 bg-blue-600 text-white text-center text-sm font-medium rounded hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">Deploy Pro</a>
            </div>
            
            <!-- Premium -->
            <div class="bg-gray-900 border border-blue-500/20 rounded-lg p-6 relative overflow-visible">
              <div class="absolute -top-2 left-1/2 -translate-x-1/2 text-white text-[8px] font-semibold px-2 py-0.5 rounded" style="background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%); box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3); letter-spacing: 0.02em; white-space: nowrap;">3-DAY FREE TRIAL</div>
              <h3 class="text-lg font-bold text-white mb-1 mt-1">Premium</h3>
              <p class="text-2xl font-extrabold text-white mb-3">$75<span class="text-sm font-normal text-gray-400">/mo</span></p>
              <p class="text-gray-400 text-sm mb-4">4 GB RAM · 2 vCPUs · 80 GB SSD · 10 sites</p>
              <a href="/pay?plan=premium&interval=monthly" class="block w-full px-4 py-2 bg-transparent border border-blue-500 text-blue-400 text-center text-sm font-medium rounded hover:bg-blue-600 hover:text-white hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">Deploy Premium</a>
            </div>
          </div>
          
          <p class="text-center text-gray-500 text-sm mt-8">
            No contracts. Cancel anytime. 
            <a href="/pricing" class="text-brand hover:text-cyan-400 underline">Full pricing details →</a>
          </p>
        </div>
      </div>
    </section>

    <!-- Final CTA Section with Footer -->
    <section class="py-12 md:py-16 relative overflow-hidden">
      <!-- Radial gradient reflection matching hero colors (intensified) -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle 600px at 50% 100%, rgba(96, 165, 250, 0.25) 0%, rgba(232, 121, 249, 0.18) 35%, rgba(94, 234, 212, 0.14) 65%, transparent 100%);"></div>
      </div>
      
      <!-- CTA Content -->
      <div class="max-w-screen-sm px-8 md:px-12 lg:px-16 mx-auto text-center relative z-10 mb-20">
        <h2 class="mb-4 text-3xl md:text-4xl font-extrabold text-white">Ready to get started?</h2>
        <p class="mb-8 text-lg text-gray-300">Deploy your server in minutes. No credit card required to explore.</p>
        <p class="mb-8 text-gray-400 text-sm">
          <span class="text-gray-500">Got questions about server ownership or setup?</span>
          Every VPS is yours with full root access, automated provisioning, and one-click deployments.
          <a href="/faq" class="text-brand hover:text-cyan-400 underline ml-1">See the full FAQ →</a>
        </p>
        <a href="/register" class="inline-flex justify-center items-center py-3 px-8 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all duration-300">
          Sign up
          <svg class="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </a>
      </div>
      
      <!-- Footer Content -->
      <footer class="relative z-10 py-12">
        <div class="max-w-6xl mx-auto px-8 md:px-12 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="text-center md:text-left">
                <h3 class="text-blue-400 text-base font-bold mb-4">Basement</h3>
                <p class="text-gray-400 text-sm leading-relaxed">Cloud hosting without the headache. Fast, simple, powerful.</p>
            </div>
            <div class="text-center md:text-left">
                <h4 class="text-blue-400 text-sm font-bold mb-3">Quick Links</h4>
                <ul class="space-y-2">
                    <li><a href="/about" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">About</a></li>
                    <li><a href="/pricing" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Pricing</a></li>
                    <li><a href="/docs" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Documentation</a></li>
                    <li><a href="/contact" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Contact</a></li>
                    <li><a href="/faq" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">FAQ</a></li>
                </ul>
            </div>
            <div class="text-center md:text-left">
                <h4 class="text-blue-400 text-sm font-bold mb-3">Legal</h4>
                <ul class="space-y-2">
                    <li><a href="/terms" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Terms of Service</a></li>
                    <li><a href="/privacy" class="text-gray-400 text-sm hover:text-blue-400 transition-colors duration-300">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div class="text-center mt-10 pt-6 max-w-6xl mx-auto px-8">
            <p class="mb-3">
                <a href="/is-this-safe" class="text-brand text-base font-medium hover:text-cyan-400 transition-colors duration-300 underline">Is Clouded Basement safe?</a>
            </p>
            <p class="text-gray-500 text-xs">&copy; ${new Date().getFullYear()} Basement. All rights reserved.</p>
        </div>
      </footer>
    </section>
    
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
          <p class="text-gray-300 text-lg leading-relaxed">If you're deciding whether to trust it with your code or data, that's a fair question  —  and this page exists to answer it honestly.</p>
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
          
          <p class="text-gray-300 text-lg leading-relaxed">Clouded Basement automates setup and deployment  —  but the server itself is yours.</p>
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
          <p class="text-gray-300 text-lg leading-relaxed">If you require HIPAA, SOC 2, or regulated data hosting, this service is not a fit  —  and that's intentional.</p>
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
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Cancel anytime  —  no contracts</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Full root access  —  it's your server</li>
            <li class="text-gray-300 text-lg leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-brand">Direct support from the founder</li>
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
