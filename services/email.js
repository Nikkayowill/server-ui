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

if (provider === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
    `,
    text: `Your confirmation code is: ${code}\n\nEnter this code to confirm your email. This code expires in 15 minutes.`
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
async function sendEmail(to, subject, html, text) {
  const mailOptions = {
    from: fromAddress,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to,
    subject,
    html,
    text
  };

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

module.exports = {
  sendConfirmationEmail,
  sendEmail,
  verifyConnection
};

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
    </div>
  `;
  
  return sendEmail(userEmail, subject, text, html);
}

// Send server ready email with credentials
async function sendServerReadyEmail(userEmail, serverIp, serverPassword, serverName) {
  const subject = '🎉 Your Server is Ready! - Clouded Basement';
  const text = `Your server is ready!\n\nServer IP: ${serverIp}\nUsername: root\nPassword: ${serverPassword}\n\nConnect via SSH:\nssh root@${serverIp}\n\nNext Steps:\n1. Visit your dashboard: https://cloudedbasement.ca/dashboard\n2. Deploy your code using the Git deployment form\n3. Add a custom domain and enable free SSL\n4. Optional: Install PostgreSQL or MongoDB database\n\nView your dashboard: https://cloudedbasement.ca/dashboard\n\n- Clouded Basement Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #020814; color: #e0e6f0; padding: 40px 20px;">
      <h1 style="color: #2DA7DF; margin-bottom: 24px;">🎉 Your Server is Ready!</h1>
      <p style="color: #a0a8b8; line-height: 1.6; margin-bottom: 24px;">Welcome to Clouded Basement! Your server <strong>${serverName || 'cloudedbasement-server'}</strong> has been provisioned and is ready to use.</p>
      
      <div style="background: rgba(45, 167, 223, 0.1); border: 2px solid #2DA7DF; padding: 20px; margin: 24px 0; border-radius: 8px;">
        <h2 style="color: #2DA7DF; margin-top: 0; font-size: 18px;">SSH Credentials</h2>
        <p style="margin: 8px 0; color: #e0e6f0; font-family: monospace;"><strong>IP Address:</strong> ${serverIp}</p>
        <p style="margin: 8px 0; color: #e0e6f0; font-family: monospace;"><strong>Username:</strong> root</p>
        <p style="margin: 8px 0; color: #e0e6f0; font-family: monospace;"><strong>Password:</strong> ${serverPassword}</p>
      </div>
      
      <div style="background: rgba(0, 0, 0, 0.3); padding: 16px; margin: 24px 0; border-radius: 4px; border-left: 3px solid #2DA7DF;">
        <p style="margin: 0 0 8px 0; color: #e0e6f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Connect via SSH:</p>
        <code style="color: #2DA7DF; font-size: 14px;">ssh root@${serverIp}</code>
      </div>

      <h2 style="color: #2DA7DF; font-size: 20px; margin: 32px 0 16px 0;">What's Next? (3 Easy Steps)</h2>
      
      <div style="background: rgba(45, 167, 223, 0.05); border-left: 4px solid #2DA7DF; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; color: #2DA7DF; font-weight: 600;">1️⃣ Deploy Your Code</p>
        <p style="margin: 0; color: #a0a8b8; font-size: 14px;">Go to your dashboard → "Deploy from GitHub" section → paste your Git repository URL → click "Deploy Now". Automatic setup for React, Node.js, Python, and static sites.</p>
      </div>

      <div style="background: rgba(45, 167, 223, 0.05); border-left: 4px solid #2DA7DF; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; color: #2DA7DF; font-weight: 600;">2️⃣ Add Your Domain (Optional)</p>
        <p style="margin: 0; color: #a0a8b8; font-size: 14px;">Dashboard → "Custom Domains" section → enter your domain → follow DNS instructions → click "Enable SSL" for free HTTPS certificate.</p>
      </div>

      <div style="background: rgba(45, 167, 223, 0.05); border-left: 4px solid #2DA7DF; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; color: #2DA7DF; font-weight: 600;">3️⃣ Install Database (Optional)</p>
        <p style="margin: 0; color: #a0a8b8; font-size: 14px;">Dashboard → "Add Database" section → choose PostgreSQL or MongoDB → one-click install (takes 2-3 minutes).</p>
      </div>
      
      <p style="color: #a0a8b8; line-height: 1.6; margin: 24px 0 16px 0;"><strong>Pre-installed software:</strong></p>
      <ul style="color: #a0a8b8; line-height: 1.8; margin: 0 0 24px 20px;">
        <li>Node.js & npm (latest LTS)</li>
        <li>Python 3 & pip</li>
        <li>Git</li>
        <li>Nginx web server</li>
        <li>Firewall configured (ports 22, 80, 443)</li>
        <li>Automatic security updates</li>
      </ul>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://cloudedbasement.ca/dashboard" style="display: inline-block; background: #2DA7DF; color: #000; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">Open Dashboard →</a>
      </div>
      
      <p style="color: #a0a8b8; line-height: 1.6; margin-top: 32px; font-size: 14px;">Need help? Check our <a href="https://cloudedbasement.ca/docs" style="color: #2DA7DF; text-decoration: none;">documentation</a> or reply to this email.</p>
      
      <p style="color: #8892a0; font-size: 14px; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(45, 167, 223, 0.2);">- Clouded Basement Team</p>
    </div>
  `;
  
  return sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendConfirmationEmail,
  sendEmail,
  verifyConnection,
  sendServerRequestEmail,
  sendServerReadyEmail
};
