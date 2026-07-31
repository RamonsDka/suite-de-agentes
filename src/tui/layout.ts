export function catalogColumns(width: number): 1 | 2 | 3 {
  if (width >= 100) return 3;
  if (width >= 70) return 2;
  return 1;
}

export interface Page<T> {
  slice: T[];
  hasMore: boolean;
}

export function paginate<T>(items: readonly T[], page: number, size: number): Page<T> {
  const pageSize = Math.max(1, Math.floor(size));
  const start = Math.max(0, Math.floor(page)) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return { slice, hasMore: start + slice.length < items.length };
}

export interface BorderTheme {
  borderActive: unknown;
}

export function RING_STYLE<T extends BorderTheme>(theme: T): { focusedBorderColor: T["borderActive"] } {
  return { focusedBorderColor: theme.borderActive };
}
