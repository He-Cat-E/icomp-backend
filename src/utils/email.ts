/**
 * Email Service Utilities
 * Handles sending emails for authentication flows using SMTP
 */

import nodemailer from "nodemailer"

type EmailData = {
  to: string
  subject: string
  html: string
  text?: string
}

// SMTP Configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "mailserver.0801.de",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "shop-dev-medusa@icomp.de",
    pass: process.env.SMTP_PASSWORD || "TestPurposeOnly",
  },
  requireTLS: true, // Use STARTTLS
}

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth,
      requireTLS: SMTP_CONFIG.requireTLS,
    })
  }
  return transporter
}

/**
 * Send email using SMTP
 */
export async function sendEmail(data: EmailData): Promise<void> {
  try {
    const mailTransporter = getTransporter()

    const mailOptions = {
      from: `"Individual Computers" <${SMTP_CONFIG.auth.user}>`,
      to: data.to,
      subject: data.subject,
      text: data.text || data.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      html: data.html,
    }

    const info = await mailTransporter.sendMail(mailOptions)
    
    console.log("📧 Email sent successfully:", {
      to: data.to,
      subject: data.subject,
      messageId: info.messageId,
    })
  } catch (error) {
    console.error("❌ Failed to send email:", error)
    
    // In development, also log the email content for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("\n=== EMAIL FAILED - CONTENT ===")
      console.log(`To: ${data.to}`)
      console.log(`Subject: ${data.subject}`)
      console.log(`Text: ${data.text || "HTML content (see below)"}`)
      console.log(`HTML: ${data.html.substring(0, 200)}...`)
      console.log("=== EMAIL END ===\n")
    }
    
    throw error // Re-throw to allow caller to handle
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${process.env.STORE_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`

  await sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header with gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #042330 0%, #0a3a4a 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #b5c5d3; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        Welcome to Individual Computers
                      </h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #042330; font-size: 24px; font-weight: 600;">
                        Email Verification
                      </h2>
                      <p style="margin: 0 0 30px 0; color: #97afbd; font-size: 16px; line-height: 1.6;">
                        Thank you for registering with us! Please verify your email address by clicking the button below:
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                        <tr>
                          <td align="center" style="padding: 15px 0;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; background-color: #042330; color: #b5c5d3; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease; box-shadow: 0 2px 4px rgba(4, 35, 48, 0.2);">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <p style="margin: 30px 0 10px 0; color: #97afbd; font-size: 14px; line-height: 1.5;">
                        Or copy and paste this link into your browser:
                      </p>
                      <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; word-break: break-all; margin: 0 0 30px 0;">
                        <p style="margin: 0; color: #042330; font-size: 12px; font-family: 'Courier New', monospace; line-height: 1.5;">
                          ${verificationUrl}
                        </p>
                      </div>
                      
                      <!-- Footer Note -->
                      <p style="margin: 30px 0 0 0; color: #97afbd; font-size: 13px; line-height: 1.5; border-top: 1px solid #e9ecef; padding-top: 20px;">
                        This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; color: #97afbd; font-size: 12px;">
                        © ${new Date().getFullYear()} Individual Computers. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Welcome to Individual Computers!

Thank you for registering with us! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.

Best regards,
Individual Computers Team`,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.STORE_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`

  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header with gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #042330 0%, #0a3a4a 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #b5c5d3; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        Password Reset Request
                      </h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #042330; font-size: 24px; font-weight: 600;">
                        Reset Your Password
                      </h2>
                      <p style="margin: 0 0 30px 0; color: #97afbd; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                        <tr>
                          <td align="center" style="padding: 15px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; background-color: #042330; color: #b5c5d3; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease; box-shadow: 0 2px 4px rgba(4, 35, 48, 0.2);">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <p style="margin: 30px 0 10px 0; color: #97afbd; font-size: 14px; line-height: 1.5;">
                        Or copy and paste this link into your browser:
                      </p>
                      <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; word-break: break-all; margin: 0 0 30px 0;">
                        <p style="margin: 0; color: #042330; font-size: 12px; font-family: 'Courier New', monospace; line-height: 1.5;">
                          ${resetUrl}
                        </p>
                      </div>
                      
                      <!-- Security Note -->
                      <div style="background-color: #fff8e1; border-left: 4px solid #042330; padding: 15px; border-radius: 4px; margin: 30px 0 0 0;">
                        <p style="margin: 0; color: #042330; font-size: 13px; line-height: 1.5; font-weight: 500;">
                          🔒 Security Notice
                        </p>
                        <p style="margin: 10px 0 0 0; color: #97afbd; font-size: 13px; line-height: 1.5;">
                          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; color: #97afbd; font-size: 12px;">
                        © ${new Date().getFullYear()} Individual Computers. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Password Reset Request

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

Best regards,
Individual Computers Team`,
  })
}

