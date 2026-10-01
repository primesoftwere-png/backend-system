import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true for port 465, false for other ports (like 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Connection pool for efficient sending
  pool: true,
  maxConnections: 3,       // Limit concurrent connections to avoid being flagged
  maxMessages: 10,         // Max messages per connection before reconnecting
  rateDelta: 2000,         // Min time between messages (2 seconds)
  rateLimit: 5,            // Max messages per rateDelta window
});

export const sendCampaignEmail = async ({ to, subject, htmlContent, textContent }) => {
  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Our Business'}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text: textContent, // Important to provide plain text version to avoid spam filters
      html: htmlContent, // Rich HTML version
      headers: {
        // Essential headers to improve deliverability and prevent landing in spam
        'List-Unsubscribe': `<mailto:${process.env.FROM_EMAIL}?subject=unsubscribe>`,
        'Precedence': 'bulk'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Campaign email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending campaign email: ${error.message}`);
    throw error;
  }
};

/**
 * Send a campaign email with [business name] placeholder replacement.
 * Includes all anti-spam best practices for inbox delivery.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject (may contain [business name])
 * @param {string} params.emailBody - Email body text (may contain [business name])
 * @param {string} params.businessName - The business name to replace placeholder with
 */
export const sendThrottledCampaignEmail = async ({ to, subject, emailBody, businessName }) => {
  // Replace [business name] placeholder (case-insensitive) with the actual business name
  const personalizedSubject = subject.replace(/\[business name\]/gi, businessName);
  const personalizedBody = emailBody.replace(/\[business name\]/gi, businessName);

  // Build a clean HTML email that avoids spam triggers
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${personalizedSubject}</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#333333; background-color:#f9f9f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9f9f9;">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="padding:30px 40px;">
              ${personalizedBody}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px; font-size:12px; color:#999999; border-top:1px solid #eeeeee;">
              <p style="margin:0;">This email was sent to ${to}.</p>
              <p style="margin:5px 0 0 0;">If you no longer wish to receive these emails, please reply with "unsubscribe".</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain-text version (strip any HTML tags from the body for the text version)
  const textContent = personalizedBody.replace(/<[^>]*>/g, '').trim()
    + `\n\n---\nThis email was sent to ${to}. Reply with "unsubscribe" to stop receiving these emails.`;

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'Our Business'}" <${process.env.FROM_EMAIL}>`,
    replyTo: process.env.FROM_EMAIL,
    to,
    subject: personalizedSubject,
    text: textContent,
    html: htmlContent,
    headers: {
      'List-Unsubscribe': `<mailto:${process.env.FROM_EMAIL}?subject=unsubscribe>`,
      'X-Mailer': 'CampaignMailer/1.0',
    },
    // Avoid 'Precedence: bulk' which some providers use to route to promotions/spam
    // Instead rely on proper content and authentication (SPF/DKIM/DMARC on your domain)
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[EmailQueue] Sent to ${to} | MessageId: ${info.messageId}`);
  return info;
};
