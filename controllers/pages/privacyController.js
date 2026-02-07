const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../../helpers');

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
