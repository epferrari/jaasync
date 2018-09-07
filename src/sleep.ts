import {CancelablePromise, Canceller, DefaultCanceledRejectMsg} from './cancellablePromise';

export function sleep<T>(ms: number): CancelablePromise <T> {
  let cancel: Canceller;

  const p = new Promise<T>((resolve, reject) => {
    let t = setTimeout(() => {
      t = undefined;
      resolve();
    }, ms);

    cancel = (reason: string = DefaultCanceledRejectMsg) => {
      if (t) {
        clearTimeout(t);
        t = undefined;
        reject(reason);
        return true;
      }
      return false;
    };
  }) as CancelablePromise<T>;
  p.cancel = cancel;
  return p;
}
