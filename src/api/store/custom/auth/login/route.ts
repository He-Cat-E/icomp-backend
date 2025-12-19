import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

type LoginBody = {
  identifier: string
  password: string
}

function generateJwtToken(customerId: string): string {
  const payload = {
    entity_id: customerId,
    entity_type: "customer",
    aud: "customer",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    iat: Math.floor(Date.now() / 1000),
  }
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

export async function POST(
  req: MedusaRequest<LoginBody>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { identifier, password } = req.body

    if (!identifier || !password) {
      res.status(400).json({
        message: "Email/username and password are required",
      })
      return
    }

    // Get customer module service
    const customerModuleService = req.scope.resolve("customer")

    // Find customer by email or username (in metadata)
    let customer
    const customersByEmail = await customerModuleService.listCustomers({
      email: identifier,
    })

    if (customersByEmail.length > 0) {
      customer = customersByEmail[0]
    } else {
      // Try to find by username in metadata
      const allCustomers = await customerModuleService.listCustomers()
      customer = allCustomers.find(
        (c) => c.metadata?.username === identifier
      )
    }

    if (!customer) {
      res.status(401).json({
        message: "Invalid email/username or password",
      })
      return
    }

    // Check if email is verified
    if (!customer.metadata?.email_verified) {
      res.status(403).json({
        message: "Please verify your email before logging in",
      })
      return
    }

    // Verify password (from metadata for now)
    const storedPasswordHash = customer.metadata?.password_hash as string
    if (!storedPasswordHash) {
      res.status(401).json({
        message: "Invalid email/username or password",
      })
      return
    }

    // Verify password
    const passwordMatches = await verifyPassword(password, storedPasswordHash)
    if (!passwordMatches) {
      res.status(401).json({
        message: "Invalid email/username or password",
      })
      return
    }

    // Generate JWT token
    const token = generateJwtToken(customer.id)

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Login failed",
    })
  }
}

