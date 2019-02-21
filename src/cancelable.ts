export {
  CancelablePromise,
  DefaultCanceledRejectMsg,
  Canceller
} from './retry';
import {CancelablePromise} from './retry';

// backwards compatible alias
export function cancelable<T>(task: () => Promise<T>): CancelablePromise<T> {
  return new CancelablePromise<T>(task);
}