/**
 * Pad an async operation so its total elapsed time meets or exceeds `targetMs`.
 * Used to defend against timing-attack account enumeration on login endpoints.
 *
 * Usage:
 *   const startedAt = Date.now();
 *   // ... do work that may succeed or fail ...
 *   await constantDelay(startedAt, 300);
 *   return result;
 */
export async function constantDelay(startedAt: number, targetMs: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  const remaining = targetMs - elapsed;
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
