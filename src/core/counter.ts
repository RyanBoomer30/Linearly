/**
 * F-M21: the counting scope behind opCount.ts. Core functions call `tick` for
 * every multiplication and division they actually do; multiplying by a known
 * 0 or by L's unit diagonal is free, and so are additions and subtractions.
 * Kept apart from opCount.ts so lu.ts and substitution.ts can count without
 * importing it.
 */
const scopes: number[] = [];

export function tick(count = 1): void {
  if (scopes.length > 0) scopes[scopes.length - 1] += count;
}

/** Run fn and count the operations it does. Scopes nest; the inner count is added to the outer one. */
export function countOperations<T>(fn: () => T): { result: T; count: number } {
  scopes.push(0);
  try {
    const result = fn();
    return { result, count: scopes[scopes.length - 1] };
  } finally {
    const count = scopes.pop()!;
    if (scopes.length > 0) scopes[scopes.length - 1] += count;
  }
}
