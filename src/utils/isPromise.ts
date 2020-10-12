export function isPromise<T>(data: any): data is Promise<T> {
  return Boolean(data && typeof data.then === 'function');
}