export function isPromise<T>(data: any): data is Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return Boolean(data && typeof data.then === 'function');
}