export interface StripeRequired {
  message: string
  connectPath: string
  connectStatus: 'not_connected' | 'pending'
}

/** Reads the backend's "register with Stripe first" error from a failed request, or null for any other error. */
export function stripeRequiredFrom(error: unknown): StripeRequired | null {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!data || data.code !== 'STRIPE_REGISTRATION_REQUIRED') return null
  return {
    message: String(data.message ?? 'Register with Stripe before sending invoices.'),
    connectPath: String(data.connectPath ?? '/'),
    connectStatus: data.connectStatus === 'pending' ? 'pending' : 'not_connected',
  }
}
