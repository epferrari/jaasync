export interface InspectablePromise<T> {
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly pending: boolean;
  readonly value: T;
  readonly error: any;
}