/** Vendor-cost ("expense") lines are the owner's internal margin tracking and must never reach the client. */
export function clientVisibleItems<T extends { item_type?: string | null }>(
  items: T[] | null | undefined,
): T[] {
  return (items ?? []).filter((item) => item.item_type !== 'expense');
}
