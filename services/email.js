const nodemailer = require('nodemailer');

// Build transport with Gmail OAuth2, SMTP, or Mailtrap fallback
function getTransportConfig() {
  const hasGmailOAuth = (
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_EMAIL
  );
  const hasMailtrap = process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS;
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

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
const transporter = nodemailer.createTransport(options);

// Send confirmation email
async function sendConfirmationEmail(email, token) {
  const confirmUrl = `${process.env.APP_URL || 'http://localhost:3000'}/confirm-email/${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.GMAIL_EMAIL || 'noreply@basement.local',
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to: email,
    subject: 'Confirm Your Email - Basement',
    html: `
      <h2>Confirm Your Email</h2>
      <p>Thank you for signing up! Please confirm your email address by clicking the link below.</p>
      <p>
        <a href="${confirmUrl}" style="background-color: #88FE00; color: #0a0812; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Confirm Email
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p><code>${confirmUrl}</code></p>
      <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
      <p style="color: #666; font-size: 12px;">If you didn't sign up for this account, you can ignore this email.</p>
    `,
    text: `Confirm your email by visiting: ${confirmUrl}\n\nThis link expires in 24 hours.`
  };

  try {
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
    from: process.env.SMTP_FROM || process.env.GMAIL_EMAIL || 'noreply@basement.local',
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    to,
    subject,
    html,
    text
  };

  try {
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
