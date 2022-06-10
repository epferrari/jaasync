import {CancelablePromise, Canceller, DefaultCanceledRejectMsg} from './cancelablePromise';

export function sleep(ms: number): CancelablePromise <void> {
  let cancel: Canceller;

  const p = new Promise<void>((resolve, reject) => {
    let t = setTimeout(() => {
      t = undefined;
      resolve();
    }, ms);

    cancel = (reason: string|Error = DefaultCanceledRejectMsg) => {
      if (t) {
        clearTimeout(t);
        t = undefined;
        reject(reason);
        return true;
      }
      return false;
    };
  }) as CancelablePromise<void>;
  p.cancel = cancel;
  return p;
}