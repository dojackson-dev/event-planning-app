/** Invoices are billed by email, so a promoter is the client only when the invoice's client email is one of theirs. */
export function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isBilledTo(
  clientEmail: string | null | undefined,
  recipientEmails: Array<string | null | undefined>,
): boolean {
  const target = normalizeEmail(clientEmail);
  if (!target) return false;
  return recipientEmails.some((email) => normalizeEmail(email) === target);
}
