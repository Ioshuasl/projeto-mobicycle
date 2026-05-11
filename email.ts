import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendNotificationEmail(to: string, subject: string, message: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP configuration missing. Skipping email notification.');
    return;
  }

  // Sanitize message for HTML context to prevent XSS
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');

  try {
    await transporter.sendMail({
      from: `"MOBICYCLE Notificações" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
          <h2 style="color: #2563eb; margin-bottom: 16px;">Nova Notificação MOBICYCLE</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">${safeMessage}</p>
          <hr style="margin: 24px 0; border: 0; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">
            Este é um e-mail automático, por favor não responda.
            <br />
            © 2026 MOBICYCLE. Todos os direitos reservados.
          </p>
        </div>
      `,
    });
    console.log(`Email notification sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email notification to ${to}:`, error);
  }
}
