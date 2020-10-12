// catches errors thrown by an async function
export async function safe<T>(fn: () => Promise<T>): Promise<T|undefined> {
  try {
    return await fn();
  } catch(e) {
    return undefined;
  }
}
