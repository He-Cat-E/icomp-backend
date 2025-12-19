import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

type ResetPasswordBody = {
  token: string
  password: string
}

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex")
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(salt + ":" + derivedKey.toString("hex"))
    })
  })
}

export async function POST(
  req: MedusaRequest<ResetPasswordBody>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      res.status(400).json({
        message: "Token and password are required",
      })
      return
    }

    // Get customer module service
    const customerModuleService = req.scope.resolve("customer")

    // Find customer by reset token
    const allCustomers = await customerModuleService.listCustomers()
    const customer = allCustomers.find(
      (c) => c.metadata?.password_reset_token === token
    )

    if (!customer) {
      res.status(404).json({
        message: "Invalid or expired reset token",
      })
      return
    }

    // Check if token is expired
    const expiresAt = customer.metadata?.password_reset_expires as string
    if (expiresAt && new Date(expiresAt) < new Date()) {
      res.status(400).json({
        message: "Reset token has expired",
      })
      return
    }

    // Hash new password
    const hashedPassword = await hashPassword(password)

    // Update password in customer metadata
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...customer.metadata,
        password_hash: hashedPassword,
        password_reset_token: undefined,
        password_reset_expires: undefined,
      },
    })

    // Clear reset token from metadata
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...customer.metadata,
        password_reset_token: undefined,
        password_reset_expires: undefined,
      },
    })

    res.json({
      message: "Password reset successfully",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Password reset failed",
    })
  }
}

