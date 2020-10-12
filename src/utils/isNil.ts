export function isNil(value: any): boolean {
  return value === null || value === undefined || typeof value === 'undefined';
}