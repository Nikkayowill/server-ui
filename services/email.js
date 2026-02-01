const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Build transport with Gmail OAuth2, SMTP, or Mailtrap fallback
function getTransportConfig() {
  const hasSendgrid = process.env.SENDGRID_API_KEY;
  const hasGmailOAuth = (
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_EMAIL
  );
  const hasMailtrap = process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS;
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSendgrid) {
    return { provider: 'sendgrid', options: {} };
  }

  // Prefer Gmail OAuth2 when configured
  if (hasGmailOAuth) {
    const port = Number(process.env.GMAIL_SMTP_PORT || 465);
    return {
      provider: 'gmail-oauth2',
      options: {
        host: 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_EMAIL,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN
        }
      }
    };
  }

  if (hasMailtrap) {
    const host = process.env.MAILTRAP_HOST || 'smtp.mailtrap.io';
    const port = Number(process.env.MAILTRAP_PORT || 2525);
    return {
      provider: 'mailtrap',
      options: {
        host,
        port,
        secure: false,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        }
      }
    };
  }

  if (hasSmtp) {
    const port = Number(process.env.SMTP_PORT);
    return {
      provider: 'smtp',
      options: {
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    };
  }

  // No provider configured
  return {
    provider: 'none',
    options: {}
  };
}

const { provider, options } = getTransportConfig();
const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_FROM || process.env.GMAIL_EMAIL || 'noreply@basement.local';

// CAN-SPAM compliant footer (physical address required)
const emailFooterHtml = `
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #333; font-size: 12px; color: #666;">
    <p style="margin: 0;">Clouded Basement</p>
    <p style="margin: 4px 0;">Toronto, Ontario, Canada</p>
    <p style="margin: 4px 0;"><a href="https://cloudedbasement.ca" style="color: #2DA7DF;">cloudedbasement.ca</a></p>
  </div>
`;
const emailFooterText = `\n\n---\nClouded Basement\nToronto, Ontario, Canada\nhttps://cloudedbasement.ca`;

if (provider === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[EMAIL] Using SendGrid as email provider');
} else if (provider !== 'none') {
  console.log(`[EMAIL] Using ${provider} as email provider`);
} else {
  console.warn('[EMAIL] No email provider configured! Emails will fail.');
}

const transporter = provider === 'sendgrid' ? null : nodemailer.createTransport(options);

// Send confirmation email with code
async function sendConfirmationEmail(email, code) {
  const mailOptions = {
    from: fromAddress,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to: email,
    subject: 'Your Confirmation Code - Basement',
    html: `
      <h2>Confirm Your Email</h2>
      <p>Thank you for signing up! Your confirmation code is:</p>
      <div style="background: rgba(136, 254, 0, 0.15); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="color: #88FE00; letter-spacing: 5px; margin: 0; font-family: monospace;">${code}</h1>
      </div>
      <p>Enter this code on the confirmation page to activate your account.</p>
      <p style="color: #666; font-size: 12px;">This code expires in 15 minutes.</p>
      <p style="color: #666; font-size: 12px;">If you didn't sign up for this account, you can ignore this email.</p>
      ${emailFooterHtml}
    `,
    text: `Your confirmation code is: ${code}\n\nEnter this code to confirm your email. This code expires in 15 minutes.${emailFooterText}`
  };

  try {
    if (provider === 'sendgrid') {
      const [resp] = await sgMail.send(mailOptions);
      console.log(`[EMAIL] (${provider}) Confirmation email sent:`, resp.headers['x-message-id'] || resp.statusCode);
      return { success: true, messageId: resp.headers['x-message-id'] || resp.statusCode };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] (${provider}) Confirmation email sent:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] (${provider}) Error sending confirmation email:`, error.message);
    return { success: false, error: error.message };
  }
}

// Send generic email
async function sendEmail(to, subject, html, text, disableTracking = false) {
  const mailOptions = {
    from: fromAddress,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to,
    subject,
    html,
    text
  };

  // Disable click/open tracking for sensitive emails (password resets)
  if (disableTracking && provider === 'sendgrid') {
    mailOptions.trackingSettings = {
      clickTracking: { enable: false },
      openTracking: { enable: false }
    };
  }

  try {
    if (provider === 'sendgrid') {
      const [resp] = await sgMail.send(mailOptions);
      console.log(`[EMAIL] (${provider}) Email sent:`, resp.headers['x-message-id'] || resp.statusCode);
      return { success: true, messageId: resp.headers['x-message-id'] || resp.statusCode };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] (${provider}) Email sent:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] (${provider}) Error sending email:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test connection
async function verifyConnection() {
  try {
    if (provider === 'sendgrid') {
      console.log('[EMAIL] (sendgrid) using API transport');
      return true;
    }

    await transporter.verify();
    console.log(`[EMAIL] (${provider}) SMTP connection verified`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] (${provider}) SMTP connection failed:`, error.message);
    return false;
  }
}

// Send server request confirmation email
async function sendServerRequestEmail(userEmail, region, serverName) {
  const subject = 'Server Request Received - Clouded Basement';
  const text = `Your server request has been received!\n\nRegion: ${region}\nServer Name: ${serverName || 'Default'}\n\nWe'll set up your server within 1-2 hours and send you the login credentials.\n\n- Clouded Basement Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #020814; color: #e0e6f0; padding: 40px 20px;">
      <h1 style="color: #2DA7DF; margin-bottom: 24px;">Server Request Received</h1>
      <p style="color: #a0a8b8; line-height: 1.6; margin-bottom: 16px;">Great news! We've received your server request and are getting everything set up for you.</p>
      
      <div style="background: rgba(45, 167, 223, 0.1); border-left: 3px solid #2DA7DF; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; color: #e0e6f0;"><strong>Region:</strong> ${region}</p>
        <p style="margin: 0; color: #e0e6f0;"><strong>Server Name:</strong> ${serverName || 'Default'}</p>
      </div>
      
      <p style="color: #a0a8b8; line-height: 1.6; margin-bottom: 16px;"><strong>What happens next:</strong></p>
      <ul style="color: #a0a8b8; line-height: 1.8;">
        <li>We'll provision your server in the selected region</li>
        <li>Install Node.js, Python, Git, Nginx, and security tools</li>
        <li>Generate secure SSH credentials</li>
        <li>Send you another email with login details (within 1-2 hours)</li>
      </ul>
      
      <p style="color: #a0a8b8; line-height: 1.6; margin-top: 24px;">You can check your status anytime at <a href="https://cloudedbasement.ca/dashboard" style="color: #2DA7DF;">your dashboard</a></p>
      
      <p style="color: #8892a0; font-size: 14px; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(45, 167, 223, 0.2);">- Clouded Basement Team</p>
      ${emailFooterHtml}
    </div>
  `;
  const textWithFooter = text + emailFooterText;
  
  return sendEmail(userEmail, subject, html, textWithFooter);
}

// Send server ready email with credentials
async function sendServerReadyEmail(userEmail, serverIp, serverIpv6, serverName) {
  const subject = 'Your Server is Ready! - Clouded Basement';
  const text = `Your server is ready!

Server IPv4: ${serverIp}${serverIpv6 ? `
Server IPv6: ${serverIpv6}` : ''}
Username: root
Password: (Login to dashboard to view)

For security, your SSH password is only shown in your secure dashboard.
Login at: https://cloudedbasement.ca/dashboard

Connect via SSH:
ssh root@${serverIp}${serverIpv6 ? `
(IPv6): ssh root@[${serverIpv6}]` : ''}

What's Next? (3 Easy Steps)

1. Deploy Your Code
   Go to your dashboard, find "Deploy from GitHub" section, paste your Git repository URL, and click "Deploy Now". Automatic setup for React, Node.js, Python, and static sites.

2. Add Your Domain (Optional)
   Dashboard → "Custom Domains" section → enter your domain → follow DNS instructions → click "Enable SSL" for free HTTPS certificate.

3. Install Database (Optional)
   Dashboard → "Add Database" section → choose PostgreSQL or MongoDB → one-click install (takes 2-3 minutes).

Pre-installed software:
- Node.js & npm (latest LTS)
- Python 3 & pip
- Git
- Nginx web server
- Firewall configured (ports 22, 80, 443)
- Automatic security updates

View your dashboard: https://cloudedbasement.ca/dashboard

Need help? Check our docs at https://cloudedbasement.ca/docs or reply to this email.

- Clouded Basement Team`;
  const html = `
    <h1>Your Server is Ready!</h1>
    <p>Thank you for choosing Clouded Basement! Your payment has been processed and your server <strong>${serverName || 'cloudedbasement-server'}</strong> is now live.</p>
    <p style="color: #28a745;"><strong>Your dedicated server is ready to deploy on!</strong></p>
    
    <br>
    <h2>Access Your Server</h2>
    <p><strong>IPv4 Address:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${serverIp}</code></p>
    ${serverIpv6 ? `<p><strong>IPv6 Address:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #7c3aed;">${serverIpv6}</code></p>` : ''}
    <p><strong>Username:</strong> root</p>
    <p><strong>Password:</strong> <a href="https://cloudedbasement.ca/dashboard" style="color: #2DA7DF; font-weight: 600; text-decoration: none;">🔒 Click to view in secure dashboard →</a></p>
    <p style="font-size: 12px; color: #666; margin-top: 8px;">For your security, SSH passwords are never sent via email. Login to your dashboard to reveal your credentials with one click.</p>
    
    ${serverIpv6 ? `
    <br>
    <div style="background: #f0f4ff; border-left: 4px solid #7c3aed; padding: 12px; margin: 16px 0;">
      <p style="margin: 0; font-size: 13px; color: #444;">
        <strong>🌐 IPv6 Enabled:</strong> Your server supports both IPv4 and IPv6. When adding DNS records for your domain, you can add AAAA records alongside A records for full dual-stack support.
      </p>
    </div>
    ` : ''}
    
    <br>
    <h2>What's Next? (3 Easy Steps)</h2>
    
    <br>
    <p><strong>1. Deploy Your Code</strong></p>
    <p>Go to your dashboard → "Deploy from GitHub" section → paste your Git repository URL → click "Deploy Now". Automatic setup for React, Node.js, Python, and static sites.</p>
    
    <br>
    <p><strong>2. Add Your Domain (Optional)</strong></p>
    <p>Dashboard → "Custom Domains" section → enter your domain → follow DNS instructions → click "Enable SSL" for free HTTPS certificate.</p>
    
    <br>
    <p><strong>3. Install Database (Optional)</strong></p>
    <p>Dashboard → "Add Database" section → choose PostgreSQL or MongoDB → one-click install (takes 2-3 minutes).</p>
    
    <br>
    <h3>Pre-installed software:</h3>
    <ul>
      <li>Node.js & npm (latest LTS)</li>
      <li>Python 3 & pip</li>
      <li>Git</li>
      <li>Nginx web server</li>
      <li>Firewall configured (ports 22, 80, 443)</li>
      <li>Automatic security updates</li>
    </ul>
    
    <br>
    <p><a href="https://cloudedbasement.ca/dashboard" style="background-color: #2DA7DF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Open Dashboard →</a></p>
    
    <br>
    <p>Need help? Check our <a href="https://cloudedbasement.ca/docs">documentation</a> or reply to this email.</p>
    
    <p>- Clouded Basement Team</p>
    ${emailFooterHtml}
  `;
  const textWithFooter = text + emailFooterText;
  
  return sendEmail(userEmail, subject, html, textWithFooter);
}

// Send contact form submission to business email
async function sendContactEmail(name, email, message) {
  const subject = `[Contact Form] New message from ${name}`;
  
  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>From:</strong> ${name}</p>
    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
    <hr style="border: 1px solid #ddd; margin: 20px 0;">
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
    <hr style="border: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">Reply directly to this email to respond to ${name}.</p>
  `;
  
  const text = `New Contact Form Submission\n\nFrom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  
  const mailOptions = {
    from: fromAddress,
    replyTo: email, // Reply goes to the person who submitted the form
    to: 'support@cloudedbasement.ca',
    subject,
    text,
    html
  };
  
  try {
    if (provider === 'sendgrid') {
      const [resp] = await sgMail.send(mailOptions);
      console.log(`[EMAIL] (sendgrid) Contact form sent to support@cloudedbasement.ca from ${email}`);
      return { success: true, messageId: resp.headers['x-message-id'] || resp.statusCode };
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] (${provider}) Contact form sent to support@cloudedbasement.ca from ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send contact form:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendConfirmationEmail,
  sendEmail,
  sendContactEmail,
  verifyConnection,
  sendServerRequestEmail,
  sendServerReadyEmail
};
