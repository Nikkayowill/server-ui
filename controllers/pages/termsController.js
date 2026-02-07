const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

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

        <h3 class="text-xl font-bold text-white mt-8 mb-3">4.2 Free Trial</h3>
        <p class="text-gray-400 mb-4">New users may be eligible for a <strong>3-day free trial</strong> of our Basic plan:</p>
        <ul class="list-disc list-inside text-gray-400 mb-6 space-y-2">
          <li>Trial includes a fully functional server with all Basic plan features</li>
          <li>No credit card required to start the trial</li>
          <li>One free trial per user (determined by email address)</li>
          <li>At the end of 3 days, your server will be suspended unless you subscribe</li>
          <li>You can upgrade to a paid plan at any time during the trial</li>
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
