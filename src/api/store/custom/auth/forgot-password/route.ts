import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import { sendPasswordResetEmail } from "../../../../../utils/email"

type ForgotPasswordBody = {
  email: string
}

function generatePasswordResetToken(customerId: string, email: string): string {
  const token = crypto.randomBytes(32).toString("hex")
  const timestamp = Date.now()
  const data = `${customerId}:${email}:${timestamp}:${token}`
  return Buffer.from(data).toString("base64url")
}

export async function POST(
  req: MedusaRequest<ForgotPasswordBody>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { email } = req.body

    if (!email) {
      res.status(400).json({
        message: "Email is required",
      })
      return
    }

    // Get customer module service
    const customerModuleService = req.scope.resolve("customer")

    // Find customer by email
    const customers = await customerModuleService.listCustomers({ email })

    if (customers.length === 0) {
      // Don't reveal if email exists for security
      res.json({
        message: "If an account exists with this email, a password reset link has been sent",
      })
      return
    }

    const customer = customers[0]

    // Generate password reset token
    const resetToken = generatePasswordResetToken(customer.id, email)

    // Store reset token in customer metadata
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...customer.metadata,
        password_reset_token: resetToken,
        password_reset_expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      },
    })

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken)
    } catch (emailError) {
      // Log error but don't fail the request (security: don't reveal if email exists)
      console.error("Failed to send password reset email:", emailError)
      // In production, you might want to queue this for retry
    }

    res.json({
      message: "If an account exists with this email, a password reset link has been sent",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Request failed",
    })
  }
}

