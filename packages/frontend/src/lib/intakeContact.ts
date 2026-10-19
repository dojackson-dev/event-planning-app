/** Returns an error message when the client's email, phone or address is missing or invalid. */
export function validateClientContact(c: { email: string; phone: string; address: string }): string | null {
  if (!/^\S+@\S+\.\S+$/.test(c.email.trim())) return 'Please enter a valid email address.'
  if (c.phone.replace(/\D/g, '').length < 10) return 'Please enter a valid phone number.'
  if (!c.address.trim()) return 'Please enter the client address.'
  return null
}
