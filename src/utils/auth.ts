/**
 * Authentication utility functions
 */

import crypto from "crypto"

/**
 * Generate email verification token
 */
export async function generateEmailVerificationToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const timestamp = Date.now()
  const data = `${email}:${timestamp}:${token}`
  return Buffer.from(data).toString("base64url")
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(
  customerId: string,
  email: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const timestamp = Date.now()
  const data = `${customerId}:${email}:${timestamp}:${token}`
  return Buffer.from(data).toString("base64url")
}

/**
 * Generate JWT token for authenticated customer
 */
export async function generateJwtToken(
  customerId: string,
  scope: any
): Promise<string> {
  // Get JWT secret from config
  const configModule = scope.resolve("configModule")
  const jwtSecret = configModule.projectConfig.jwtSecret || "supersecret"

  // Simple JWT-like token (for production, use proper JWT library)
  const payload = {
    entity_id: customerId,
    entity_type: "customer",
    aud: "customer",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    iat: Math.floor(Date.now() / 1000),
  }

  // In production, use a proper JWT library like 'jsonwebtoken'
  // For now, return a simple token
  const token = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return token
}

/**
 * Verify JWT token
 */
export async function verifyJwtToken(
  token: string,
  scope: any
): Promise<{ entity_id: string; entity_type: string } | null> {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString())
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return {
      entity_id: payload.entity_id,
      entity_type: payload.entity_type,
    }
  } catch (error) {
    return null
  }
}

/**
 * Generate customer number (format: CUST-YYYYMMDD-XXXXX)
 */
export function generateCustomerNumber(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `CUST-${dateStr}-${randomNum}`
}

/**
 * Generate watermark ID (format: WM-XXXXXXXX where X is hex)
 */
export function generateWatermarkId(): string {
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `WM-${randomBytes}`
}

