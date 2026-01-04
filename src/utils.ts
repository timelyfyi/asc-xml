export const toArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

export const asString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
};

export const asNumber = (value: unknown): number | undefined => {
  const str = asString(value);
  if (!str) return undefined;
  if (!/^[-+]?\d+(\.\d+)?$/.test(str)) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
};

export const pickString = (node: Record<string, unknown> | undefined, keys: string[]): string | undefined => {
  if (!node) return undefined;
  for (const key of keys) {
    const v = asString((node as Record<string, unknown>)[key]);
    if (v !== undefined) return v;
  }
  return undefined;
};

export const stableSortBy = <T>(items: T[], iteratee: (item: T) => string | number): T[] => {
  return [...items].sort((a, b) => {
    const av = iteratee(a);
    const bv = iteratee(b);
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
};
