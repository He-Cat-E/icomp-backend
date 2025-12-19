import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type CompleteRegistrationBody = {
  customer_id: string
  billing: {
    company?: string
    country: string
    street: string
    houseNumber: string
    flatNumber?: string
    postalCode: string
    city: string
    state: string
  }
  shipping: {
    company?: string
    country: string
    street: string
    houseNumber: string
    flatNumber?: string
    postalCode: string
    city: string
    state: string
  }
  shippingSameAsBilling: boolean
  mobilePhone: string
  landline?: string
}

export async function POST(
  req: MedusaRequest<CompleteRegistrationBody>,
  res: MedusaResponse
): Promise<void> {
  try {
    const {
      customer_id,
      billing,
      shipping,
      shippingSameAsBilling,
      mobilePhone,
      landline,
    } = req.body

    if (!customer_id) {
      res.status(400).json({
        message: "Customer ID is required",
      })
      return
    }

    // Get customer module service
    const customerModuleService = req.scope.resolve("customer")

    // Retrieve customer
    const customer = await customerModuleService.retrieveCustomer(customer_id)

    if (!customer) {
      res.status(404).json({
        message: "Customer not found",
      })
      return
    }

    // Convert addresses to Medusa format
    const billingAddress = {
      first_name: billing.street.split(" ")[0] || customer.first_name || "",
      last_name: customer.last_name || "",
      address_1: shippingSameAsBilling ? shipping.street : billing.street,
      address_2: billing.flatNumber || undefined,
      city: billing.city,
      country_code: billing.country,
      postal_code: billing.postalCode,
      province: billing.state,
      phone: mobilePhone || landline || undefined,
      company: billing.company || undefined,
    }

    const shippingAddress = shippingSameAsBilling
      ? billingAddress
      : {
          first_name: shipping.street.split(" ")[0] || customer.first_name || "",
          last_name: customer.last_name || "",
          address_1: shipping.street,
          address_2: shipping.flatNumber || undefined,
          city: shipping.city,
          country_code: shipping.country,
          postal_code: shipping.postalCode,
          province: shipping.state,
          phone: mobilePhone || landline || undefined,
          company: shipping.company || undefined,
        }

    // Update customer with addresses
    await customerModuleService.updateCustomers(customer_id, {
      phone: mobilePhone || undefined,
      metadata: {
        ...customer.metadata,
        landline: landline || undefined,
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        registration_complete: true,
      },
    })

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
      },
      message: "Registration completed successfully",
    })
  } catch (error) {
    console.error("Complete registration error:", error)
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Registration completion failed",
    })
  }
}

