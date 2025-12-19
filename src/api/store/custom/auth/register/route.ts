import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import { sendVerificationEmail } from "../../../../../utils/email"
import { generateCustomerNumber, generateWatermarkId } from "../../../../../utils/auth"

type RegisterBody = {
  email: string
  password: string
  firstName: string
  lastName: string
  username?: string
}

function generateEmailVerificationToken(email: string): string {
  const token = crypto.randomBytes(32).toString("hex")
  const timestamp = Date.now()
  const data = `${email}:${timestamp}:${token}`
  return Buffer.from(data).toString("base64url")
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
  req: MedusaRequest<RegisterBody>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { email, password, firstName, lastName, username } = req.body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        message: "Email, password, first name, and last name are required",
      })
      return
    }

    // Get customer module service
    const customerModuleService = req.scope.resolve("customer")

    // Check if customer already exists
    const existingCustomers = await customerModuleService.listCustomers({
      email,
    })

    if (existingCustomers.length > 0) {
      res.status(400).json({
        message: "A customer with this email already exists",
      })
      return
    }

    // Generate verification token
    const verificationToken = generateEmailVerificationToken(email)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate customer number and watermark ID
    const customerNumber = generateCustomerNumber()
    const watermarkId = generateWatermarkId()

    // Create customer (not yet verified)
    const customer = await customerModuleService.createCustomers({
      email,
      first_name: firstName,
      last_name: lastName,
      metadata: {
        username: username || undefined,
        email_verified: false,
        verification_token: verificationToken,
        password_hash: hashedPassword, // Store password hash in metadata
        customer_number: customerNumber,
        watermark_id: watermarkId,
        last_p96_purchase: null, // Will be set when customer makes a P96 purchase
      },
    })

    // Note: Password is stored in customer metadata for authentication
    // In the future, we can migrate to Medusa's auth module when the API structure is confirmed
    // The password hash is securely stored and verified during login

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken)
    } catch (emailError) {
      // Log error but don't fail registration
      console.error("Failed to send verification email:", emailError)
      // In production, you might want to queue this for retry
    }

    res.status(201).json({
      message: "Registration successful. Please check your email for verification.",
      customer_id: customer.id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Registration failed",
    })
  }
}

