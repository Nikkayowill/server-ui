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
