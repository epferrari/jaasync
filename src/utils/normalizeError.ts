export function normalizeError(e: Error|string): string {
  if(e instanceof Error) {
    return e.message || e.toString();
  } else {
    return e;
  }
}