const { getHTMLHead, getScripts, getFooter, getResponsiveNav } = require('../helpers');
const pool = require('../db');

exports.showAbout = (req, res) => {
  res.send(`
${getHTMLHead('About - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
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
        
        <a href="/" class="link-back">Back to home</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showTerms = (req, res) => {
  res.send(`
${getHTMLHead('Terms of Service - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Terms of Service</h1>
        <p>Put the real legalese here later.</p>
        <a href="/" class="link-back">Back to home</a>
    </div>
    
    ${getFooter()}
</body>
</html>
  `);
};

exports.showPricing = (req, res) => {
  res.send(`
${getHTMLHead('Pricing - Basement')}
    <link rel="stylesheet" href="/css/pricing.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <section class="page-header">
        <h1>Simple Pricing</h1>
        <p>Real servers. Real specs. No surprises. Your bill will never exceed your plan.</p>
    </section>
    
    <section class="pricing-grid">
        <div class="plan">
            <div class="plan-header">
                <div class="plan-name">Basic</div>
                <div class="plan-price">$25<span style="font-size: 16px;">/mo</span></div>
                <div class="plan-cycle">Perfect for side projects</div>
            </div>
            <ul class="plan-features">
                <li><strong>1 GB RAM</strong></li>
                <li><strong>1 CPU core</strong></li>
                <li><strong>25 GB SSD storage</strong></li>
                <li><strong>1 TB bandwidth</strong></li>
                <li>Full SSH/root access</li>
                <li>Daily automated backups</li>
                <li>Security updates included</li>
                <li>Web dashboard</li>
                <li>Email support (48hr response)</li>
                <li>Open source tools</li>
            </ul>
            <a href="/pay?plan=basic"><button class="btn">Select Basic</button></a>
        </div>
        
        <div class="plan featured">
            <div class="plan-header">
                <div class="plan-name" style="color: var(--glow);">Priority</div>
                <div class="plan-price">$60<span style="font-size: 16px;">/mo</span></div>
                <div class="plan-cycle">Most popular • For production apps</div>
            </div>
            <ul class="plan-features">
                <li><strong>2 GB RAM</strong></li>
                <li><strong>2 CPU cores</strong></li>
                <li><strong>50 GB SSD storage</strong></li>
                <li><strong>2 TB bandwidth</strong></li>
                <li>Full SSH/root access</li>
                <li>Daily automated backups</li>
                <li>Security updates included</li>
                <li>Web dashboard</li>
                <li class="divider">Plus everything in Basic:</li>
                <li class="highlight">Priority support (12hr response)</li>
                <li class="highlight">SSL automation</li>
                <li class="highlight">One-click staging environments</li>
                <li class="highlight">Advanced monitoring</li>
                <li class="highlight">Deploy logs & history</li>
            </ul>
            <a href="/pay?plan=priority"><button class="btn primary">Select Priority</button></a>
        </div>
        
        <div class="plan">
            <div class="plan-header">
                <div class="plan-name">Premium</div>
                <div class="plan-price">$120<span style="font-size: 16px;">/mo</span></div>
                <div class="plan-cycle">For serious projects</div>
            </div>
            <ul class="plan-features">
                <li><strong>4 GB RAM</strong></li>
                <li><strong>2 CPU cores</strong></li>
                <li><strong>80 GB SSD storage</strong></li>
                <li><strong>4 TB bandwidth</strong></li>
                <li>Full SSH/root access</li>
                <li>Daily automated backups</li>
                <li>Security updates included</li>
                <li>Web dashboard</li>
                <li>Priority support (12hr response)</li>
                <li>SSL automation</li>
                <li>Staging environments</li>
                <li class="divider">Plus everything in Priority:</li>
                <li class="highlight">Direct chat support</li>
                <li class="highlight">Custom deployment assistance</li>
                <li class="highlight">Database optimization help</li>
                <li class="highlight">Performance tuning</li>
                <li class="highlight">Priority feature requests</li>
            </ul>
            <a href="/pay?plan=premium"><button class="btn">Select Premium</button></a>
        </div>
    </section>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showPrivacy = (req, res) => {
  res.send(`
${getHTMLHead('Privacy Policy - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
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
        
        <a href="/" class="link-back">Back to home</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showFaq = (req, res) => {
  res.send(`
${getHTMLHead('FAQ - Basement')}
    <link rel="stylesheet" href="/css/faq.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Frequently Asked Questions</h1>
        <p class="subtitle">Find answers to common questions about our services</p>
        
        <div class="faq-section">
            <h2 class="section-title">General</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What services does LocalBiz provide?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>LocalBiz offers comprehensive business solutions tailored to your needs. Our services include web development, digital marketing support, and ongoing technical assistance. Each plan is designed to help local businesses establish and grow their online presence.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>How do I get started?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Getting started is simple:</p>
                        <ul>
                            <li>Create a free account on our platform</li>
                            <li>Choose a service plan that fits your needs</li>
                            <li>Complete the secure checkout process</li>
                            <li>Access your dashboard immediately after payment</li>
                        </ul>
                        <p>Our support team will reach out within 24 hours to guide you through onboarding.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Is my data secure?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Absolutely. We take security seriously:</p>
                        <ul>
                            <li>All passwords are encrypted using industry-standard bcrypt hashing</li>
                            <li>Payment processing is handled by Stripe, a PCI-DSS Level 1 certified provider</li>
                            <li>We never store your credit card information</li>
                            <li>Session data is secured with HTTP-only cookies</li>
                        </ul>
                        <p>Read our <a href="/privacy">Privacy Policy</a> for complete details.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="faq-section">
            <h2 class="section-title">Pricing & Billing</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What payment methods do you accept?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>We accept all major credit and debit cards through our secure payment processor, Stripe. This includes Visa, Mastercard, American Express, and Discover.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Can I change my plan later?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Yes! You can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately, and billing is prorated based on your current billing cycle.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Do you offer refunds?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>We offer a 14-day money-back guarantee for all new subscriptions. If you're not satisfied within the first 14 days, contact our support team for a full refund. After 14 days, refunds are evaluated on a case-by-case basis.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Is there a free trial?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>While we don't offer a traditional free trial, our Basic plan starts at just $20/month with no long-term commitment. You can cancel anytime, and our 14-day money-back guarantee gives you risk-free opportunity to try our services.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="faq-section">
            <h2 class="section-title">Support</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>How fast is your support response time?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Response times vary by plan:</p>
                        <ul>
                            <li><strong>Basic:</strong> 24-48 hours via email support</li>
                            <li><strong>Priority:</strong> 12 hours with priority queue access</li>
                            <li><strong>Premium:</strong> Dedicated support with custom response times</li>
                        </ul>
                        <p>Critical issues are prioritized across all plans.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What support channels are available?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>We offer multiple support channels:</p>
                        <ul>
                            <li>Email support (all plans)</li>
                            <li>Contact form on our website</li>
                            <li>Direct chat access (Priority and Premium plans)</li>
                            <li>Phone support (Premium plan only)</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Do you provide training or onboarding?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Yes! All new customers receive an onboarding guide and access to our documentation. Priority and Premium plans include personalized onboarding sessions with our team to ensure you get the most out of our services.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="faq-section">
            <h2 class="section-title">Account Management</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>How do I cancel my subscription?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>You can cancel your subscription anytime from your dashboard. Navigate to Settings > Billing > Cancel Subscription. Your services will remain active until the end of your current billing period.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Can I change my email address?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Yes, you can update your email address from your account settings. You'll need to verify your new email address before the change takes effect.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What happens if I forget my password?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Click "Forgot Password" on the login page. We'll send a secure reset link to your registered email address. Follow the link to create a new password.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="cta-box">
            <h2>Still Have Questions?</h2>
            <p>Can't find the answer you're looking for? Our support team is here to help.</p>
            <a href="/contact" class="btn">Contact Support</a>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js', 'faq.js')}
  `);
};

exports.showDocs = (req, res) => {
  res.send(`
${getHTMLHead('Documentation - Basement')}
    <link rel="stylesheet" href="/css/docs.css">
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
        
        <div class="info-box">
            <h3>Managed Infrastructure</h3>
            <p>While you have full control, we handle the foundational maintenance:</p>
            <ul style="margin-bottom: 0;">
                <li><strong>Security updates:</strong> Operating system patches applied automatically</li>
                <li><strong>Daily backups:</strong> Server snapshots every 24 hours</li>
                <li><strong>Uptime monitoring:</strong> We're alerted if your server goes down</li>
                <li><strong>DDoS protection:</strong> Network-level protection included</li>
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
        
        <div class="info-box">
            <h3>Open Source</h3>
            <p>The dashboard and deployment tools are open source:</p>
            <ul style="margin-bottom: 0;">
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
        
        <div class="cta-box">
            <h2>Ready to Get Started?</h2>
            <p>All plans include a 14-day money-back guarantee.</p>
            <a href="/pricing" class="btn primary">View Pricing</a>
            <a href="/contact" class="btn">Contact Us</a>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

exports.showContact = (req, res) => {
  res.send(`
${getHTMLHead('Contact - Basement')}
    <link rel="stylesheet" href="/css/contact.css">
</head>
<body>
  <div class="matrix-bg"></div>
  
  ${getResponsiveNav(req)}
  
  <div class="contact-container">
    <h1>Contact Us</h1>
    <p class="subtitle">Get in touch with our team</p>
    
    <form method="POST" action="/contact">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      
      <label>
        <span>Name</span>
        <input type="text" name="name" required>
      </label>
      
      <label>
        <span>Email</span>
        <input type="email" name="email" required>
      </label>
      
      <label>
        <span>Message</span>
        <textarea name="message" required></textarea>
      </label>
      
      <button type="submit">Send Message</button>
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
    <link rel="stylesheet" href="/css/home.css">
    <style>
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
      .flash-message.fade-out {
        animation: fadeOut 0.5s ease-out forwards;
      }
      .flash-close {
        position: absolute;
        top: 6px;
        right: 8px;
        background: none;
        border: none;
        color: var(--glow);
        font-size: 18px;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      .flash-close:hover {
        opacity: 1;
      }
      @keyframes slideDown {
        from {
          transform: translate(-50%, -100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translate(-50%, -50px);
        }
      }
      
      .founder-section {
        max-width: 700px;
        margin: 0 auto 100px;
        padding: 48px 40px;
        background: linear-gradient(135deg, rgba(45, 167, 223, 0.15) 0%, rgba(32, 177, 220, 0.08) 100%);
        border: 2px solid rgba(45, 167, 223, 0.4);
        border-radius: 12px;
        text-align: center;
        position: relative;
        overflow: hidden;
        box-shadow: 0 0 60px rgba(45, 167, 223, 0.3), inset 0 0 60px rgba(45, 167, 223, 0.05);
        animation: pulse-glow 3s ease-in-out infinite;
      }
      
      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 60px rgba(45, 167, 223, 0.3), inset 0 0 60px rgba(45, 167, 223, 0.05);
          border-color: rgba(45, 167, 223, 0.4);
        }
        50% {
          box-shadow: 0 0 80px rgba(45, 167, 223, 0.5), inset 0 0 80px rgba(45, 167, 223, 0.1);
          border-color: rgba(45, 167, 223, 0.6);
        }
      }
      
      .founder-section::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent 30%, rgba(45, 167, 223, 0.1) 50%, transparent 70%);
        animation: shimmer 3s linear infinite;
        pointer-events: none;
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
      }
      
      .founder-section .badge {
        display: inline-block;
        padding: 10px 20px;
        background: linear-gradient(135deg, #2DA7DF 0%, #20B1DC 100%);
        color: #000;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        border-radius: 6px;
        margin-bottom: 20px;
        box-shadow: 0 4px 15px rgba(45, 167, 223, 0.4);
        animation: badge-pulse 2s ease-in-out infinite;
        position: relative;
        z-index: 1;
      }
      
      @keyframes badge-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .founder-section h2 {
        font-size: 32px;
        margin-bottom: 16px;
        color: #fff;
        position: relative;
        z-index: 1;
      }
      
      .founder-section .price {
        font-size: 48px;
        font-weight: 700;
        color: #2DA7DF;
        margin: 16px 0;
        text-shadow: 0 0 20px rgba(45, 167, 223, 0.6);
        position: relative;
        z-index: 1;
      }
      
      .founder-section .price small {
        font-size: 20px;
        color: #8892a0;
      }
      
      .founder-section p {
        color: #a0a8b8;
        font-size: 15px;
        margin-bottom: 24px;
        position: relative;
        z-index: 1;
      }
      
      .spots-counter {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 16px 28px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(45, 167, 223, 0.3);
        border-radius: 8px;
        margin: 20px 0;
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        position: relative;
        z-index: 1;
      }
      
      .spots-counter .number {
        font-size: 32px;
        font-weight: 700;
        color: #2DA7DF;
        text-shadow: 0 0 10px rgba(45, 167, 223, 0.8);
        animation: number-pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes number-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.9; }
      }
      
      .founder-section .btn {
        margin-top: 24px;
        padding: 16px 48px;
        font-size: 16px;
        font-weight: 600;
        background: linear-gradient(135deg, #2DA7DF 0%, #20B1DC 100%);
        border: none;
        box-shadow: 0 6px 25px rgba(45, 167, 223, 0.4);
        position: relative;
        z-index: 1;
        animation: cta-pulse 2.5s ease-in-out infinite;
      }
      
      .founder-section .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(45, 167, 223, 0.6);
      }
      
      @keyframes cta-pulse {
        0%, 100% { box-shadow: 0 6px 25px rgba(45, 167, 223, 0.4); }
        50% { box-shadow: 0 8px 35px rgba(45, 167, 223, 0.6); }
      }
      
      /* Responsive: Tablet */
      @media (max-width: 768px) {
        .founder-section {
          max-width: 90%;
          padding: 36px 28px;
          margin: 0 auto 80px;
        }
        
        .founder-section h2 {
          font-size: 26px;
        }
        
        .founder-section .price {
          font-size: 40px;
        }
        
        .spots-counter {
          font-size: 16px;
          padding: 14px 24px;
        }
        
        .spots-counter .number {
          font-size: 28px;
        }
        
        .founder-section .btn {
          padding: 14px 36px;
          font-size: 15px;
        }
      }
      
      /* Responsive: Mobile */
      @media (max-width: 480px) {
        .founder-section {
          padding: 28px 20px;
          margin: 0 auto 60px;
        }
        
        .founder-section .badge {
          font-size: 10px;
          padding: 8px 16px;
          letter-spacing: 1px;
        }
        
        .founder-section h2 {
          font-size: 22px;
          margin-bottom: 12px;
        }
        
        .founder-section .price {
          font-size: 36px;
          margin: 12px 0;
        }
        
        .founder-section .price small {
          font-size: 16px;
        }
        
        .founder-section p {
          font-size: 14px;
          margin-bottom: 20px;
        }
        
        .spots-counter {
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
          padding: 16px 20px;
        }
        
        .spots-counter .number {
          font-size: 42px;
        }
        
        .founder-section .btn {
          width: 100%;
          padding: 16px 24px;
          font-size: 15px;
        }
      }
      
      .section { max-width: 1100px; margin: 0 auto; padding: 80px 5vw; }
      .section-title { text-align: center; font-size: 36px; margin-bottom: 48px; color: #fff; }
      
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 60px; }
      .card { padding: 32px 24px; background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.1);
          border-radius: 8px; transition: .3s; }
      .card:hover { border-color: rgba(136, 254, 0, 0.3); transform: translateY(-4px); }
      .card h3 { font-size: 18px; margin-bottom: 12px; color: var(--glow); }
      .card p { color: #8892a0; font-size: 14px; line-height: 1.6; }
      
      .features { max-width: 600px; margin: 0 auto; }
      .features ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; list-style: none; }
      .features li { padding: 16px; background: rgba(2, 8, 20, 0.4); border: 1px solid rgba(136, 254, 0, 0.08);
          border-radius: 6px; color: #a0a8b8; font-size: 14px; display: flex; align-items: center; gap: 12px; }
      .features li::before { content: "✓"; color: var(--glow); font-weight: 700; font-size: 16px; }
      
      .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 32px; text-align: center; }
      .step { padding: 24px; }
      .step-number { width: 48px; height: 48px; margin: 0 auto 16px; background: var(--glow); color: #000;
          border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
      .step h3 { font-size: 18px; margin-bottom: 8px; color: #fff; }
      .step p { color: #8892a0; font-size: 14px; }
      
      .cta-final { text-align: center; padding: 60px 5vw; background: rgba(136, 254, 0, 0.03); border-top: 1px solid rgba(136, 254, 0, 0.1); }
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
    
    <section class="hero">
        <h1>Clouded Basement Hosting</h1>
        <p class="sub">Fast, simple cloud hosting without the corporate noise.<br>
        Spin up real servers, deploy your apps, and stay in control — or let us manage everything for you.</p>
        <p style="font-size: 14px; color: var(--glow); margin-bottom: 36px; font-weight: 500;">Founding Customer Offer — $10/month for life</p>
        <div class="cta-group">
            <a href="/pricing" class="btn primary">View Pricing</a>
            <a href="/docs" class="btn">Documentation</a>
        </div>
    </section>
    
    <div class="founder-section">
        <div class="badge">⚡ LIMITED TIME OFFER ⚡</div>
        <h2>Founding Customer Plan</h2>
        <div class="price">$10<small>/month</small></div>
        <p style="font-size: 17px; font-weight: 500; color: #fff;">Lock in this price for life. Full access to every feature, forever.</p>
        <div class="spots-counter">
            <span class="number">${foundersRemaining}</span>
            <span>spots remaining out of 10</span>
        </div>
        <a href="/pricing" class="btn primary">Claim Your Spot →</a>
    </div>
    
    <section class="section">
        <h2 class="section-title">Why Choose Clouded Basement</h2>
        <div class="cards">
            <div class="card">
                <h3>Personal Support</h3>
                <p>You talk to the person who built the platform.</p>
            </div>
            <div class="card">
                <h3>Fast, Clean Infrastructure</h3>
                <p>No noisy neighbors. No overselling.</p>
            </div>
            <div class="card">
                <h3>Transparent Pricing</h3>
                <p>No hidden fees. No surprise renewals.</p>
            </div>
            <div class="card">
                <h3>Indie-Built, Indie-Powered</h3>
                <p>Hosting with personality, not corporate scripts.</p>
            </div>
        </div>
    </section>
    
    <section class="section">
        <h2 class="section-title">What You Get</h2>
        <div class="features">
            <ul>
                <li>Full hosting environment</li>
                <li>SSD storage</li>
                <li>Secure isolation</li>
                <li>Free setup</li>
                <li>Modern dashboard</li>
                <li>All future features included</li>
            </ul>
        </div>
    </section>
    
    <section class="section">
        <h2 class="section-title">How It Works</h2>
        <div class="steps">
            <div class="step">
                <div class="step-number">1</div>
                <h3>Choose your plan</h3>
                <p>Pick the hosting tier that fits your needs.</p>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <h3>Get instant access</h3>
                <p>Your server is provisioned and ready in minutes.</p>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <h3>Deploy your site</h3>
                <p>DIY or let us handle the setup — your choice.</p>
            </div>
        </div>
    </section>
    
    <section class="cta-final">
        <h2 style="font-size: 32px; margin-bottom: 16px; color: #fff;">Ready to get started?</h2>
        <p style="color: #8892a0; margin-bottom: 32px;">Join the founding customers and lock in lifetime pricing.</p>
        <a href="/pricing" class="btn primary">View Pricing</a>
    </section>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};
