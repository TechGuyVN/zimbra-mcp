export function formatAddress(
  list: { name?: string; address?: string }[] | false | undefined,
): string | null {
  if (!list || list.length === 0) return null;
  return list
    .map((a) => (a.name ? `${a.name} <${a.address ?? ""}>` : (a.address ?? "")))
    .filter(Boolean)
    .join(", ");
}

export function formatAddressList(
  list: { name?: string; address?: string }[] | false | undefined,
): string[] | null {
  if (!list || list.length === 0) return null;
  const out = list.map((a) => a.address).filter((x): x is string => Boolean(x));
  return out.length ? out : null;
}
