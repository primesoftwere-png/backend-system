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
