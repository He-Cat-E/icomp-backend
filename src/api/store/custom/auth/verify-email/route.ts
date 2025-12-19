import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { token } = req.query

    if (!token || typeof token !== "string") {
      res.status(400).json({
        message: "Verification token is required",
      })
      return
    }

    // Get customer module service
    const customerModuleService = req.scope.resolve("customer")

    // Find customer by verification token in metadata
    const allCustomers = await customerModuleService.listCustomers()
    const customer = allCustomers.find(
      (c) => c.metadata?.verification_token === token
    )

    if (!customer) {
      res.status(404).json({
        message: "Invalid or expired verification token",
      })
      return
    }

    // Update customer to mark email as verified
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...customer.metadata,
        email_verified: true,
        verification_token: undefined,
      },
    })

    res.json({
      customer_id: customer.id,
      message: "Email verified successfully",
    })
  } catch (error) {
    console.error("Email verification error:", error)
    res.status(500).json({
      message: error instanceof Error ? error.message : "Verification failed",
    })
  }
}

