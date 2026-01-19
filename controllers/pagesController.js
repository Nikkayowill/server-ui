const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../helpers');
const pool = require('../db');

exports.showAbout = (req, res) => {
  res.send(`
${getHTMLHead('About - Basement')}
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>ABOUT BASEMENT</h1>
        
        <p>I'm Kayo, an IT Web Programming student at NSCC in Halifax, graduating May 2026. Before switching to tech, I worked as a tradesman—different tools, same problem-solving mindset.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">WHY I BUILT THIS</h2>
        
        <p>I wanted to prove I could build and deploy a real production application from the ground up. Not just for a grade, but something that actually handles payments, provisions servers, and solves a real problem.</p>
        
        <p>Cloud hosting doesn't need to be complicated. You shouldn't need a PhD to deploy a Node app or a static site. Basement gives you a real server you can SSH into, plus a dashboard for the routine stuff. Simple.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">HOW IT WORKS</h2>
        
        <p>I'm running this as a small operation. The infrastructure is enterprise-grade (DigitalOcean droplets), but I'm building features incrementally based on what users actually need. Current setup handles individual developers and small teams deploying web apps, APIs, and services.</p>
        
        <p>As more people use it, I expand capabilities. I prioritize stability over speed—every feature gets tested properly before it ships.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">THE TECH</h2>
        
        <p>Built with <strong style="color: #e0e6f0;">Node.js</strong>, <strong style="color: #e0e6f0;">Express</strong>, <strong style="color: #e0e6f0;">PostgreSQL</strong>, and <strong style="color: #e0e6f0;">Stripe</strong>. Servers run <strong style="color: #e0e6f0;">Ubuntu LTS</strong> on <strong style="color: #e0e6f0;">DigitalOcean</strong>. Security includes automated OS updates, daily backups, and DDoS protection.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">OPEN SOURCE</h2>
        
        <p>The entire dashboard and deployment tooling is open source. You can see how everything works, contribute improvements, or fork it for your own projects. Transparency matters.</p>
        
        <p><a href="#" style="color: var(--glow); text-decoration: underline;" target="_blank" rel="noopener noreferrer">View on GitHub →</a></p>
        
        <p style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(136, 254, 0, 0.1);">This is my capstone project and portfolio piece. If you're evaluating my work or have questions about the technical implementation, <a href="/contact" style="color: var(--glow); text-decoration: underline;">reach out</a>.</p>
        
        <a href="/" class="inline-block mt-8 px-6 py-3 text-cyan-400 border border-cyan-400/30 rounded hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 uppercase tracking-wider text-sm">Back to home</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showTerms = (req, res) => {
  res.send(`
${getHTMLHead('Terms of Service - Basement')}
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Terms of Service</h1>
        <p>Put the real legalese here later.</p>
        <a href="/" class="inline-block mt-8 px-6 py-3 text-cyan-400 border border-cyan-400/30 rounded hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 uppercase tracking-wider text-sm">Back to home</a>
    </div>
    
    ${getFooter()}
</body>
</html>
  `);
};

exports.showPricing = (req, res) => {
  res.send(`
${getHTMLHead('Pricing - Basement')}
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <section class="pt-32 pb-16 px-4 text-center">
        <h1 class="text-5xl font-bold text-white mb-4">Simple Pricing</h1>
        <p class="text-gray-400 text-lg">Real servers. Real specs. No surprises. Your bill will never exceed your plan.</p>
    </section>
    
    <section class="max-w-7xl mx-auto px-4 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gray-800/30 border border-cyan-500/10 rounded-lg p-8 hover:border-cyan-500/30 transition-all">
            <div class="border-b border-gray-700 pb-6 mb-6">
                <div class="text-xl font-bold text-white mb-2">Basic</div>
                <div class="text-4xl font-extrabold text-cyan-400 mb-1">$25<span class="text-base font-normal text-gray-400">/mo</span></div>
                <div class="text-sm text-gray-400">Perfect for side projects</div>
            </div>
            <ul class="space-y-3 mb-8 text-sm">
                <li class="text-gray-300"><strong class="text-white">1 GB RAM</strong></li>
                <li class="text-gray-300"><strong class="text-white">1 CPU core</strong></li>
                <li class="text-gray-300"><strong class="text-white">25 GB SSD storage</strong></li>
                <li class="text-gray-300"><strong class="text-white">1 TB bandwidth</strong></li>
                <li class="text-gray-400">Full SSH/root access</li>
                <li class="text-gray-400">Daily automated backups</li>
                <li class="text-gray-400">Security updates included</li>
                <li class="text-gray-400">Web dashboard</li>
                <li class="text-gray-400">Email support (48hr response)</li>
                <li class="text-gray-400">Open source tools</li>
            </ul>
            <a href="/pay?plan=basic" class="block w-full px-6 py-3 bg-transparent border border-cyan-400/30 text-cyan-400 text-center font-medium rounded hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 uppercase tracking-wider text-sm">Select Basic</a>
        </div>
        
        <div class="bg-gray-800/50 border-2 border-cyan-400/40 rounded-lg p-8 relative transform scale-105">
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-400 text-gray-900 text-xs font-bold rounded-full uppercase">Most Popular</div>
            <div class="border-b border-cyan-400/20 pb-6 mb-6">
                <div class="text-xl font-bold text-cyan-400 mb-2">Priority</div>
                <div class="text-4xl font-extrabold text-cyan-400 mb-1">$60<span class="text-base font-normal text-gray-400">/mo</span></div>
                <div class="text-sm text-gray-400">Most popular • For production apps</div>
            </div>
            <ul class="space-y-3 mb-8 text-sm">
                <li class="text-gray-300"><strong class="text-white">2 GB RAM</strong></li>
                <li class="text-gray-300"><strong class="text-white">2 CPU cores</strong></li>
                <li class="text-gray-300"><strong class="text-white">50 GB SSD storage</strong></li>
                <li class="text-gray-300"><strong class="text-white">2 TB bandwidth</strong></li>
                <li class="text-gray-400">Full SSH/root access</li>
                <li class="text-gray-400">Daily automated backups</li>
                <li class="text-gray-400">Security updates included</li>
                <li class="text-gray-400">Web dashboard</li>
                <li class="text-cyan-300 pt-3 border-t border-gray-700">Plus everything in Basic:</li>
                <li class="text-cyan-300">Priority support (12hr response)</li>
                <li class="text-cyan-300">SSL automation</li>
                <li class="text-cyan-300">One-click staging environments</li>
                <li class="text-cyan-300">Advanced monitoring</li>
                <li class="text-cyan-300">Deploy logs & history</li>
            </ul>
            <a href="/pay?plan=priority" class="block w-full px-6 py-3 bg-cyan-400 text-gray-900 text-center font-bold rounded hover:bg-cyan-500 transition-all duration-300 uppercase tracking-wider text-sm">Select Priority</a>
        </div>
        
        <div class="bg-gray-800/30 border border-cyan-500/10 rounded-lg p-8 hover:border-cyan-500/30 transition-all">
            <div class="border-b border-gray-700 pb-6 mb-6">
                <div class="text-xl font-bold text-white mb-2">Premium</div>
                <div class="text-4xl font-extrabold text-cyan-400 mb-1">$120<span class="text-base font-normal text-gray-400">/mo</span></div>
                <div class="text-sm text-gray-400">For serious projects</div>
            </div>
            <ul class="space-y-3 mb-8 text-sm">
                <li class="text-gray-300"><strong class="text-white">4 GB RAM</strong></li>
                <li class="text-gray-300"><strong class="text-white">2 CPU cores</strong></li>
                <li class="text-gray-300"><strong class="text-white">80 GB SSD storage</strong></li>
                <li class="text-gray-300"><strong class="text-white">4 TB bandwidth</strong></li>
                <li class="text-gray-400">Full SSH/root access</li>
                <li class="text-gray-400">Daily automated backups</li>
                <li class="text-gray-400">Security updates included</li>
                <li class="text-gray-400">Web dashboard</li>
                <li class="text-gray-400">Priority support (12hr response)</li>
                <li class="text-gray-400">SSL automation</li>
                <li class="text-gray-400">Staging environments</li>
                <li class="text-cyan-300 pt-3 border-t border-gray-700">Plus everything in Priority:</li>
                <li class="text-cyan-300">Direct chat support</li>
                <li class="text-cyan-300">Custom deployment assistance</li>
                <li class="text-cyan-300">Database optimization help</li>
                <li class="text-cyan-300">Performance tuning</li>
                <li class="text-cyan-300">Priority feature requests</li>
            </ul>
            <a href="/pay?plan=premium" class="block w-full px-6 py-3 bg-transparent border border-cyan-400/30 text-cyan-400 text-center font-medium rounded hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 uppercase tracking-wider text-sm">Select Premium</a>
        </div>
    </section>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showPrivacy = (req, res) => {
  res.send(`
${getHTMLHead('Privacy Policy - Basement')}
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Privacy Policy</h1>
        <p><strong>Last Updated:</strong> January 16, 2026</p>
        
        <p>LocalBiz ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</p>
        
        <h2>1. Information We Collect</h2>
        
        <p><strong>1.1 Personal Information You Provide</strong></p>
        <p>We collect information that you voluntarily provide to us when you:</p>
        <ul>
            <li><strong>Register for an account:</strong> Email address and encrypted password</li>
            <li><strong>Submit inquiries:</strong> Name, email address, phone number (if provided), and message content through our contact form</li>
            <li><strong>Make purchases:</strong> Billing information including name, address, and payment card details (processed securely by our payment processor, Stripe)</li>
        </ul>
        
        <p><strong>1.2 Automatically Collected Information</strong></p>
        <p>When you access our website, we may automatically collect certain information, including:</p>
        <ul>
            <li><strong>Log data:</strong> IP address, browser type, operating system, referring URLs, pages viewed, and timestamps</li>
            <li><strong>Session data:</strong> Authentication tokens stored in cookies to maintain your logged-in state</li>
            <li><strong>Device information:</strong> Screen resolution, device type, and browser capabilities</li>
        </ul>
        
        <h2>2. How We Use Your Information</h2>
        
        <p>We use the information we collect for legitimate business purposes, including:</p>
        <ul>
            <li><strong>Service Delivery:</strong> To create and manage your account, process transactions, and deliver the services you request</li>
            <li><strong>Communication:</strong> To respond to your inquiries, provide customer support, and send transactional emails regarding your account or purchases</li>
            <li><strong>Security:</strong> To monitor and prevent fraudulent activity, unauthorized access, and other illegal activities</li>
            <li><strong>Improvement:</strong> To analyze usage patterns, diagnose technical problems, and improve our website functionality and user experience</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests</li>
            <li><strong>Business Operations:</strong> To maintain records for accounting, auditing, and business continuity purposes</li>
        </ul>
        
        <h2>3. Information Sharing and Disclosure</h2>
        
        <p>We do not sell, rent, or trade your personal information to third parties. We may share your information only in the following circumstances:</p>
        
        <p><strong>3.1 Service Providers</strong></p>
        <ul>
            <li><strong>Stripe, Inc.:</strong> We use Stripe to process payments. Your payment information is transmitted directly to Stripe and is subject to <a href="https://stripe.com/privacy" target="_blank" style="color: var(--glow);">Stripe's Privacy Policy</a>. We never store complete payment card information on our servers.</li>
        </ul>
        
        <p><strong>3.2 Legal Requirements</strong></p>
        <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court order, subpoena, or government investigation).</p>
        
        <p><strong>3.3 Business Transfers</strong></p>
        <p>In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction. You will be notified via email and/or prominent notice on our website of any such change in ownership or control.</p>
        
        <p><strong>3.4 Protection of Rights</strong></p>
        <p>We may disclose information when we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a legal request.</p>
        
        <h2>4. Data Security</h2>
        
        <p>We implement industry-standard security measures to protect your personal information:</p>
        <ul>
            <li><strong>Encryption:</strong> All passwords are hashed using bcrypt with a salt factor of 10, making them irreversible and secure against brute-force attacks</li>
            <li><strong>Secure Transmission:</strong> We use HTTPS/TLS encryption to protect data transmitted between your browser and our servers (when configured in production)</li>
            <li><strong>Session Security:</strong> Session cookies are marked as HTTP-only to prevent client-side script access and are configured with secure flags in production environments</li>
            <li><strong>Payment Security:</strong> All payment processing is handled by Stripe, a PCI-DSS Level 1 certified service provider. We never store complete payment card information</li>
            <li><strong>Database Security:</strong> User data is stored in a secured PostgreSQL database with restricted access and regular backups</li>
            <li><strong>Access Controls:</strong> Administrative access to user data is restricted to authorized personnel only</li>
        </ul>
        
        <p>However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
        
        <h2>5. Your Rights and Choices</h2>
        
        <p>Depending on your location and applicable law, you may have the following rights:</p>
        
        <p><strong>5.1 Access and Portability</strong></p>
        <p>You have the right to request access to the personal information we hold about you and to receive that information in a portable format.</p>
        
        <p><strong>5.2 Correction</strong></p>
        <p>You have the right to request correction of inaccurate or incomplete personal information.</p>
        
        <p><strong>5.3 Deletion</strong></p>
        <p>You have the right to request deletion of your personal information, subject to certain legal exceptions (e.g., completion of transactions, legal compliance, fraud prevention).</p>
        
        <p><strong>5.4 Objection and Restriction</strong></p>
        <p>You have the right to object to or request restriction of certain processing of your personal information.</p>
        
        <p><strong>5.5 Withdrawal of Consent</strong></p>
        <p>Where processing is based on consent, you have the right to withdraw that consent at any time.</p>
        
        <p><strong>5.6 Marketing Communications</strong></p>
        <p>You may opt out of receiving promotional communications from us by following the unsubscribe instructions in those messages.</p>
        
        <p>To exercise any of these rights, please contact us through our <a href="/contact" style="color: var(--glow);">contact form</a>. We will respond to your request within 30 days.</p>
        
        <h2>6. Data Retention</h2>
        
        <p>We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Account information is retained until you request deletion. Transaction records may be retained for accounting and legal compliance purposes for up to 7 years.</p>
        
        <h2>7. Cookies and Tracking Technologies</h2>
        
        <p>We use cookies and similar tracking technologies to enhance your experience on our website:</p>
        
        <p><strong>7.1 Essential Cookies</strong></p>
        <p>We use session cookies that are essential for the operation of our website. These cookies:</p>
        <ul>
            <li>Maintain your login state across pages</li>
            <li>Provide CSRF protection for form submissions</li>
            <li>Enable secure authentication</li>
        </ul>
        
        <p>These cookies are strictly necessary for the website to function and cannot be disabled without affecting core functionality.</p>
        
        <p><strong>7.2 Cookie Management</strong></p>
        <p>You can configure your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.</p>
        
        <h2>8. Third-Party Links</h2>
        
        <p>Our website may contain links to third-party websites or services that are not owned or controlled by LocalBiz. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of every website you visit.</p>
        
        <h2>9. Children's Privacy</h2>
        
        <p>Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will take steps to delete such information.</p>
        
        <h2>10. International Data Transfers</h2>
        
        <p>Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those of your country. By using our services, you consent to the transfer of your information to these countries.</p>
        
        <h2>11. Changes to This Privacy Policy</h2>
        
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:</p>
        <ul>
            <li>Posting the updated policy on this page with a new "Last Updated" date</li>
            <li>Sending an email notification to the address associated with your account (for material changes)</li>
        </ul>
        
        <p>Your continued use of our services after any changes indicates your acceptance of the updated policy.</p>
        
        <h2>12. California Privacy Rights</h2>
        
        <p>If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):</p>
        <ul>
            <li>Right to know what personal information is collected, used, shared, or sold</li>
            <li>Right to delete personal information held by businesses</li>
            <li>Right to opt-out of sale of personal information (note: we do not sell personal information)</li>
            <li>Right to non-discrimination for exercising your CCPA rights</li>
        </ul>
        
        <h2>13. European Privacy Rights</h2>
        
        <p>If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with a supervisory authority if you believe our processing of your personal information violates applicable law.</p>
        
        <h2>14. Contact Information</h2>
        
        <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
        <ul>
            <li><strong>Email:</strong> Via our <a href="/contact" style="color: var(--glow);">contact form</a></li>
            <li><strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours</li>
        </ul>
        
        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(136, 254, 0, 0.1); font-size: 13px;">By using LocalBiz services, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.</p>
        
        <a href="/" class="inline-block mt-8 px-6 py-3 text-cyan-400 border border-cyan-400/30 rounded hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 uppercase tracking-wider text-sm">Back to home</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showFaq = (req, res) => {
  res.send(`
${getHTMLHead('FAQ - Basement')}
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1 class="text-5xl font-bold text-white text-center mb-4">Frequently Asked Questions</h1>
        <p class="text-gray-400 text-center mb-16">Find answers to common questions about our services</p>
        
        <div class="mb-16">
            <h2 class="text-2xl font-bold text-cyan-400 mb-6">General</h2>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">What services does LocalBiz provide?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">LocalBiz offers comprehensive business solutions tailored to your needs. Our services include web development, digital marketing support, and ongoing technical assistance. Each plan is designed to help local businesses establish and grow their online presence.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">How do I get started?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400 mb-4">Getting started is simple:</p>
                    <ul class="list-disc list-inside space-y-2 text-gray-400">
                        <li>Create a free account on our platform</li>
                        <li>Choose a service plan that fits your needs</li>
                        <li>Complete the secure checkout process</li>
                        <li>Access your dashboard immediately after payment</li>
                    </ul>
                    <p class="text-gray-400 mt-4">Our support team will reach out within 24 hours to guide you through onboarding.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">Is my data secure?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400 mb-4">Absolutely. We take security seriously:</p>
                    <ul class="list-disc list-inside space-y-2 text-gray-400">
                        <li>All passwords are encrypted using industry-standard bcrypt hashing</li>
                        <li>Payment processing is handled by Stripe, a PCI-DSS Level 1 certified provider</li>
                        <li>We never store your credit card information</li>
                        <li>Session data is secured with HTTP-only cookies</li>
                    </ul>
                    <p class="text-gray-400 mt-4">Read our <a href="/privacy" class="text-cyan-400 underline">Privacy Policy</a> for complete details.</p>
                </div>
            </div>
        </div>
        
        <div class="mb-16">
            <h2 class="text-2xl font-bold text-cyan-400 mb-6">Pricing & Billing</h2>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">What payment methods do you accept?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">We accept all major credit and debit cards through our secure payment processor, Stripe. This includes Visa, Mastercard, American Express, and Discover.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">Can I change my plan later?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">Yes! You can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately, and billing is prorated based on your current billing cycle.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">Do you offer refunds?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">We offer a 14-day money-back guarantee for all new subscriptions. If you're not satisfied within the first 14 days, contact our support team for a full refund. After 14 days, refunds are evaluated on a case-by-case basis.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">Is there a free trial?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">While we don't offer a traditional free trial, our Basic plan starts at just $20/month with no long-term commitment. You can cancel anytime, and our 14-day money-back guarantee gives you risk-free opportunity to try our services.</p>
                </div>
            </div>
        </div>
        
        <div class="mb-16">
            <h2 class="text-2xl font-bold text-cyan-400 mb-6">Support</h2>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">How fast is your support response time?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400 mb-4">Response times vary by plan:</p>
                    <ul class="list-disc list-inside space-y-2 text-gray-400">
                        <li><strong class="text-white">Basic:</strong> 24-48 hours via email support</li>
                        <li><strong class="text-white">Priority:</strong> 12 hours with priority queue access</li>
                        <li><strong class="text-white">Premium:</strong> Dedicated support with custom response times</li>
                    </ul>
                    <p class="text-gray-400 mt-4">Critical issues are prioritized across all plans.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">What support channels are available?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400 mb-4">We offer multiple support channels:</p>
                    <ul class="list-disc list-inside space-y-2 text-gray-400">
                        <li>Email support (all plans)</li>
                        <li>Contact form on our website</li>
                        <li>Direct chat access (Priority and Premium plans)</li>
                        <li>Phone support (Premium plan only)</li>
                    </ul>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">Do you provide training or onboarding?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">Yes! All new customers receive an onboarding guide and access to our documentation. Priority and Premium plans include personalized onboarding sessions with our team to ensure you get the most out of our services.</p>
                </div>
            </div>
        </div>
        
        <div class="mb-16">
            <h2 class="text-2xl font-bold text-cyan-400 mb-6">Account Management</h2>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">How do I cancel my subscription?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">You can cancel your subscription anytime from your dashboard. Navigate to Settings > Billing > Cancel Subscription. Your services will remain active until the end of your current billing period.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">Can I change my email address?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">Yes, you can update your email address from your account settings. You'll need to verify your new email address before the change takes effect.</p>
                </div>
            </div>
            
            <div class="mb-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg overflow-hidden">
                <div class="p-6 cursor-pointer hover:bg-gray-800/50 transition-all flex justify-between items-center" onclick="toggleFaq(this)">
                    <h3 class="text-lg font-medium text-white">What happens if I forget my password?</h3>
                    <span class="text-2xl text-cyan-400 transform transition-transform duration-300">+</span>
                </div>
                <div class="hidden px-6 pb-6">
                    <p class="text-gray-400">Click "Forgot Password" on the login page. We'll send a secure reset link to your registered email address. Follow the link to create a new password.</p>
                </div>
            </div>
        </div>
        
        <div class="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-12 text-center">
            <h2 class="text-3xl font-bold text-white mb-4">Still Have Questions?</h2>
            <p class="text-gray-400 mb-8">Can't find the answer you're looking for? Our support team is here to help.</p>
            <a href="/contact" class="inline-block px-8 py-4 bg-cyan-400 text-gray-900 font-bold rounded hover:bg-cyan-500 transition-all duration-300 uppercase tracking-wider text-sm">Contact Support</a>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js', 'faq.js')}
  `);
};

exports.showDocs = (req, res) => {
  res.send(`
${getHTMLHead('Documentation - Basement')}
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Documentation</h1>
        <p class="subtitle">Complete guide to Basement hosting—what you get, how to use it, and technical details.</p>
        
        <h2>What You Get</h2>
        <p>When you sign up, you get a dedicated cloud server (VPS - Virtual Private Server). This is a complete Linux machine that you control.</p>
        
        <p><strong>It's like renting a computer that runs 24/7 in a data center.</strong></p>
        
        <ul>
            <li><strong>Full root/SSH access</strong> - Complete control over your server</li>
            <li><strong>Dedicated IP address</strong> - Point your domain wherever you want</li>
            <li><strong>Install anything</strong> - Node, Python, Docker, databases, whatever you need</li>
            <li><strong>Deploy your way</strong> - Git, FTP, rsync, manual uploads - your choice</li>
        </ul>
        
        <h2>Two Ways to Manage Your Server</h2>
        <p>You decide how much control you want at any given time.</p>
        
        <h3>Dashboard</h3>
        <p>A web interface for common tasks:</p>
        <ul>
            <li>Deploy your code with a few clicks</li>
            <li>Restart your server</li>
            <li>View logs and monitor resources</li>
            <li>Set up SSL certificates automatically</li>
            <li>Manage backups</li>
        </ul>
        <p>Good for routine operations and quick deployments.</p>
        
        <h3>Direct SSH Access</h3>
        <p>Full terminal access to your server:</p>
        <ul>
            <li>Configure web servers (Nginx, Apache)</li>
            <li>Set up custom services</li>
            <li>Install any dependencies</li>
            <li>Run background processes</li>
            <li>Debug directly in production</li>
        </ul>
        <p>Good when you need precise control or custom configurations.</p>
        
        <h3>Use Both</h3>
        <p>Most people use the dashboard for everyday tasks and SSH when they need it. You're not locked into one approach.</p>
        
        <div class="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-6 my-6">
            <h3 class="text-cyan-400 text-xl font-bold mb-3">Managed Infrastructure</h3>
            <p class="mb-3">While you have full control, we handle the foundational maintenance:</p>
            <ul class="list-disc list-inside space-y-2 text-gray-400">
                <li><strong class="text-white">Security updates:</strong> Operating system patches applied automatically</li>
                <li><strong class="text-white">Daily backups:</strong> Server snapshots every 24 hours</li>
                <li><strong class="text-white">Uptime monitoring:</strong> We're alerted if your server goes down</li>
                <li><strong class="text-white">DDoS protection:</strong> Network-level protection included</li>
            </ul>
        </div>
        
        <h2>Getting Started</h2>
        <p>Here's the process from signup to deployment:</p>
        
        <ol>
            <li><strong>Choose a plan</strong> - Basic ($25), Priority ($60), or Premium ($120)</li>
            <li><strong>Complete payment</strong> - Secure checkout via Stripe</li>
            <li><strong>Server provisioning</strong> - Takes about 60 seconds</li>
            <li><strong>Receive credentials</strong> - Dashboard access and SSH details via email</li>
            <li><strong>Deploy</strong> - Use the dashboard or SSH directly</li>
        </ol>
        
        <p>Your server is live immediately. No approval process, no configuration maze.</p>
        
        <h2>Technical Stack</h2>
        <p>Full transparency on our infrastructure:</p>
        
        <ul>
            <li><strong>Cloud Provider:</strong> DigitalOcean data centers</li>
            <li><strong>Operating System:</strong> Ubuntu LTS (long-term support)</li>
            <li><strong>Dashboard:</strong> Custom Node.js application</li>
            <li><strong>Payment Processing:</strong> Stripe</li>
            <li><strong>Monitoring:</strong> Open-source tooling</li>
        </ul>
        
        <div class="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-6 my-6">
            <h3 class="text-cyan-400 text-xl font-bold mb-3">Open Source</h3>
            <p class="mb-3">The dashboard and deployment tools are open source:</p>
            <ul class="list-disc list-inside space-y-2 text-gray-400">
                <li>Review the code and understand how everything works</li>
                <li>Contribute improvements or report issues</li>
                <li>Fork it and modify for your needs</li>
                <li>Verify security practices</li>
            </ul>
        </div>
        
        <h2>Who This Works For</h2>
        <p>Basement is designed for:</p>
        <ul>
            <li>Solo developers deploying projects</li>
            <li>Students learning production deployment</li>
            <li>Indie founders running applications</li>
            <li>Small to medium teams wanting server control without infrastructure management</li>
            <li>Anyone comfortable with basic Linux commands</li>
        </ul>
        
        <p><strong>Note:</strong> We're a small team building and expanding features over time. The infrastructure can support enterprise workloads, but our feature set and support capacity are currently focused on smaller deployments as we grow.</p>
        
        <h2>Pricing Structure</h2>
        <p>Three tiers based on server resources and support level:</p>
        
        <p><strong>Basic ($25/mo):</strong> 1 GB RAM, 1 CPU, 25 GB storage. Email support with 48-hour response. Suitable for static sites, small APIs, personal projects.</p>
        
        <p><strong>Priority ($60/mo):</strong> 2 GB RAM, 2 CPUs, 50 GB storage. Priority support with 12-hour response, SSL automation, staging environments. Suitable for production applications.</p>
        
        <p><strong>Premium ($120/mo):</strong> 4 GB RAM, 2 CPUs, 80 GB storage. Direct chat support, deployment assistance, performance optimization. Suitable for revenue-generating applications.</p>
        
        <p><strong>No usage charges.</strong> Your monthly bill is capped at your plan price. No surprise bandwidth or storage overages.</p>
        
        <h2>Support Approach</h2>
        <p>Documentation-first support model:</p>
        <ul>
            <li>Comprehensive guides (including this page)</li>
            <li>FAQ covering common questions</li>
            <li>GitHub discussions for community help</li>
            <li>Open issues for bug reports</li>
        </ul>
        
        <p>Email support included with all plans. Higher tiers provide faster response times and direct chat access for urgent issues.</p>
        
        <div class="bg-gradient-to-br from-cyan-900/40 to-cyan-950/20 border-2 border-cyan-400/30 rounded-xl p-8 text-center my-12">
            <h2 class="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p class="text-gray-300 mb-6">All plans include a 14-day money-back guarantee.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/pricing" class="inline-block px-8 py-3 bg-cyan-400 text-gray-900 font-bold rounded hover:bg-cyan-500 transition-all duration-300 uppercase tracking-wider text-sm">View Pricing</a>
                <a href="/contact" class="inline-block px-8 py-3 border-2 border-cyan-400/40 text-cyan-400 font-bold rounded hover:border-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 uppercase tracking-wider text-sm">Contact Us</a>
            </div>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showContact = (req, res) => {
  res.send(`
${getHTMLHead('Contact - Basement')}
</head>
<body class="bg-gray-900">
  ${getResponsiveNav(req)}
  
  <div class="max-w-2xl mx-auto px-4 py-32">
    <h1 class="text-4xl font-bold text-cyan-400 text-center mb-4">Contact Us</h1>
    <p class="text-gray-400 text-center mb-12">Get in touch with our team</p>
    
    <form method="POST" action="/contact" class="bg-gray-800/30 border border-cyan-500/10 rounded-lg p-8">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      
      <label class="block mb-6">
        <span class="block text-sm font-medium text-gray-300 mb-2">Name</span>
        <input type="text" name="name" required class="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20">
      </label>
      
      <label class="block mb-6">
        <span class="block text-sm font-medium text-gray-300 mb-2">Email</span>
        <input type="email" name="email" required class="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20">
      </label>
      
      <label class="block mb-6">
        <span class="block text-sm font-medium text-gray-300 mb-2">Message</span>
        <textarea name="message" required rows="6" class="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 resize-vertical"></textarea>
      </label>
      
      <button type="submit" class="w-full px-6 py-3 bg-cyan-400 text-gray-900 font-medium rounded hover:bg-cyan-500 transition-all duration-300 uppercase tracking-wider text-sm">Send Message</button>
    </form>
  </div>
  
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
  
  // Count founder plan customers (plan = 'founder' and status = 'succeeded')
  const founderCountResult = await pool.query(
    "SELECT COUNT(DISTINCT user_id) as count FROM payments WHERE plan = 'founder' AND status = 'succeeded'"
  );
  const foundersTaken = parseInt(founderCountResult.rows[0].count) || 0;
  const foundersRemaining = Math.max(0, 10 - foundersTaken);
  
  res.send(`
${getHTMLHead('Clouded Basement Hosting - Fast, Simple Cloud Hosting')}
    <style>
      /* Flash Message */
      .flash-message {
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(136, 254, 0, 0.15);
        color: var(--glow);
        padding: 12px 36px 12px 16px;
        border-radius: 6px;
        border: 1px solid rgba(136, 254, 0, 0.3);
        box-shadow: 0 2px 10px rgba(136, 254, 0, 0.1);
        font-weight: 400;
        font-size: 14px;
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
        max-width: 400px;
        text-align: center;
      }
      .flash-message.fade-out { animation: fadeOut 0.5s ease-out forwards; }
      .flash-close {
        position: absolute; top: 6px; right: 8px; background: none; border: none;
        color: var(--glow); font-size: 18px; cursor: pointer; padding: 2px 6px;
        line-height: 1; opacity: 0.5; transition: opacity 0.2s;
      }
      .flash-close:hover { opacity: 1; }
      @keyframes slideDown {
        from { transform: translate(-50%, -100px); opacity: 0; }
        to { transform: translateX(-50%); opacity: 1; }
      }
      @keyframes fadeOut { to { opacity: 0; transform: translate(-50%, -50px); } }
      
      /* Founder Card Animation */
      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 60px rgba(45, 167, 223, 0.3);
          border-color: rgba(45, 167, 223, 0.4);
        }
        50% {
          box-shadow: 0 0 80px rgba(45, 167, 223, 0.5);
          border-color: rgba(45, 167, 223, 0.6);
        }
      }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${flashMessage ? `
    <div class="flash-message" id="flashMessage">
      ${flashMessage}
      <button class="flash-close" onclick="dismissFlash()">&times;</button>
    </div>
    <script>
      function dismissFlash() {
        const msg = document.getElementById('flashMessage');
        msg.classList.add('fade-out');
        setTimeout(() => msg.remove(), 500);
      }
      setTimeout(() => {
        const msg = document.getElementById('flashMessage');
        if (msg) dismissFlash();
      }, 7000);
    </script>
    ` : ''}
    
    ${getResponsiveNav(req)}
    
    <!-- Hero Section with Flowbite -->
    <section class="bg-gray-900 pt-24 md:pt-32 lg:pt-36">
      <div class="py-8 px-4 mx-auto max-w-7xl text-center lg:py-16 lg:px-12">
        <a href="/pricing" class="inline-flex justify-between items-center py-1 px-1 pr-4 mb-7 text-sm text-gray-900 bg-cyan-400 rounded-full hover:bg-cyan-500 transition-all">
          <span class="text-xs bg-gray-900 rounded-full text-cyan-400 px-4 py-1.5 mr-3">⚡ Founding Offer</span>
          <span class="text-sm font-medium text-gray-900">$10/month for life — Only ${foundersRemaining} spots left</span>
          <svg class="ml-2 w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
          </svg>
        </a>
        <h1 class="mb-4 text-4xl font-extrabold tracking-tight leading-none text-white md:text-5xl lg:text-6xl">Clouded Basement</h1>
        <p class="mb-8 text-lg font-normal text-gray-400 lg:text-xl sm:px-16 xl:px-48">Fast, simple cloud hosting without the corporate noise. Spin up real servers, deploy your apps, stay in control.</p>
        <div class="flex flex-col mb-8 lg:mb-16 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
          <a href="/pricing" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-gray-900 rounded-lg bg-cyan-400 hover:bg-cyan-500 focus:ring-4 focus:ring-cyan-300 transition-all">
            View Pricing
            <svg class="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </a>
          <a href="/docs" class="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 focus:ring-4 focus:ring-gray-800 transition-all">
            Documentation
          </a>
        </div>
      </div>
    </section>

    <!-- Founder Plan Card (Flowbite Card with custom animation) -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <div class="relative overflow-hidden p-8 md:p-12 bg-gradient-to-br from-cyan-900/40 to-cyan-950/20 border-2 border-cyan-500/40 rounded-xl text-center" style="box-shadow: 0 0 60px rgba(45, 167, 223, 0.3); animation: pulse-glow 3s ease-in-out infinite;">
        <span class="inline-flex items-center justify-center px-3 py-1 mb-4 text-xs font-bold text-gray-900 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full">⚡ LIMITED TIME OFFER ⚡</span>
        <h2 class="mb-2 text-3xl md:text-4xl font-extrabold text-white">Founding Customer Plan</h2>
        <div class="my-6">
          <span class="text-5xl md:text-6xl font-bold text-cyan-400">$10</span>
          <span class="text-xl text-gray-400">/month</span>
        </div>
        <p class="mb-6 text-base md:text-lg text-gray-300">Lock in this price for life. Full access to every feature, forever.</p>
        <div class="inline-flex items-center gap-3 px-6 py-4 mb-6 bg-gray-900/50 border border-cyan-500/30 rounded-lg">
          <span class="text-4xl md:text-5xl font-bold text-cyan-400">${foundersRemaining}</span>
          <span class="text-sm md:text-base text-gray-300">spots remaining out of 10</span>
        </div>
        <div class="mt-8">
          <a href="/pricing" class="w-full sm:w-auto inline-flex justify-center items-center py-3 px-8 text-base font-medium text-gray-900 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-lg hover:from-cyan-500 hover:to-cyan-600 focus:ring-4 focus:ring-cyan-300 transition-all">
            Claim Your Spot
            <svg class="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Why Choose Section with Flowbite Cards -->
    <section class="bg-gray-900 py-12 md:py-20">
      <div class="max-w-7xl px-4 mx-auto sm:px-6 lg:px-8">
        <h2 class="mb-12 text-3xl md:text-4xl font-extrabold text-center text-white">Why Choose Clouded Basement</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Card 1 -->
          <div class="p-6 bg-gray-800/50 border border-cyan-500/10 rounded-lg hover:border-cyan-500/30 hover:-translate-y-1 transition-all">
            <h3 class="mb-2 text-xl font-bold text-cyan-400">Personal Support</h3>
            <p class="text-gray-400">You talk to the person who built the platform.</p>
          </div>
          <!-- Card 2 -->
          <div class="p-6 bg-gray-800/50 border border-cyan-500/10 rounded-lg hover:border-cyan-500/30 hover:-translate-y-1 transition-all">
            <h3 class="mb-2 text-xl font-bold text-cyan-400">Fast, Clean Infrastructure</h3>
            <p class="text-gray-400">No noisy neighbors. No overselling.</p>
          </div>
          <!-- Card 3 -->
          <div class="p-6 bg-gray-800/50 border border-cyan-500/10 rounded-lg hover:border-cyan-500/30 hover:-translate-y-1 transition-all">
            <h3 class="mb-2 text-xl font-bold text-cyan-400">Transparent Pricing</h3>
            <p class="text-gray-400">No hidden fees. No surprise renewals.</p>
          </div>
          <!-- Card 4 -->
          <div class="p-6 bg-gray-800/50 border border-cyan-500/10 rounded-lg hover:border-cyan-500/30 hover:-translate-y-1 transition-all">
            <h3 class="mb-2 text-xl font-bold text-cyan-400">Indie-Built, Indie-Powered</h3>
            <p class="text-gray-400">Hosting with personality, not corporate scripts.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features List -->
    <section class="bg-gray-900 py-12 md:py-20">
      <div class="max-w-3xl px-4 mx-auto sm:px-6 lg:px-8">
        <h2 class="mb-12 text-3xl md:text-4xl font-extrabold text-center text-white">What You Get</h2>
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <li class="flex items-center gap-3 p-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg">
            <span class="text-cyan-400 text-xl font-bold">✓</span>
            <span class="text-gray-300">Full hosting environment</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg">
            <span class="text-cyan-400 text-xl font-bold">✓</span>
            <span class="text-gray-300">SSD storage</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg">
            <span class="text-cyan-400 text-xl font-bold">✓</span>
            <span class="text-gray-300">Secure isolation</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg">
            <span class="text-cyan-400 text-xl font-bold">✓</span>
            <span class="text-gray-300">Free setup</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg">
            <span class="text-cyan-400 text-xl font-bold">✓</span>
            <span class="text-gray-300">Modern dashboard</span>
          </li>
          <li class="flex items-center gap-3 p-4 bg-gray-800/30 border border-cyan-500/10 rounded-lg">
            <span class="text-cyan-400 text-xl font-bold">✓</span>
            <span class="text-gray-300">All future features included</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- How It Works with Timeline -->
    <section class="bg-gray-900 py-12 md:py-20">
      <div class="max-w-7xl px-4 mx-auto sm:px-6 lg:px-8">
        <h2 class="mb-16 text-3xl md:text-4xl font-extrabold text-center text-white">How It Works</h2>
        <ol class="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <!-- Step 1 -->
          <li class="relative text-center">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-cyan-400 rounded-full text-gray-900 text-2xl font-bold">1</div>
            <h3 class="mb-2 text-xl font-bold text-white">Choose your plan</h3>
            <p class="text-gray-400">Pick the hosting tier that fits your needs.</p>
          </li>
          <!-- Step 2 -->
          <li class="relative text-center">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-cyan-400 rounded-full text-gray-900 text-2xl font-bold">2</div>
            <h3 class="mb-2 text-xl font-bold text-white">Get instant access</h3>
            <p class="text-gray-400">Your server is provisioned and ready in minutes.</p>
          </li>
          <!-- Step 3 -->
          <li class="relative text-center">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-cyan-400 rounded-full text-gray-900 text-2xl font-bold">3</div>
            <h3 class="mb-2 text-xl font-bold text-white">Deploy your site</h3>
            <p class="text-gray-400">DIY or let us handle the setup — your choice.</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section class="bg-cyan-900/10 border-t border-cyan-500/10 py-16">
      <div class="max-w-screen-sm px-4 mx-auto text-center sm:px-6 lg:px-8">
        <h2 class="mb-4 text-3xl md:text-4xl font-extrabold text-white">Ready to get started?</h2>
        <p class="mb-8 text-lg text-gray-400">Join the founding customers and lock in lifetime pricing.</p>
        <a href="/pricing" class="inline-flex justify-center items-center py-3 px-8 text-base font-medium text-gray-900 bg-cyan-400 rounded-lg hover:bg-cyan-500 focus:ring-4 focus:ring-cyan-300 transition-all">
          View Pricing
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
