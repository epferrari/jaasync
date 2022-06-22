import {CancelablePromise} from "./cancelablePromise";

export class TimeoutExpiredError extends Error {
  public constructor(ms: number) {
    super(`Timeout expired after ${ms} milliseconds`);
  }

  public appendMessage(m: string) {
    const {message} = this;
    this.message = `${message} ${m}`;
  }
}

export function timeout<T>(
  promise: Promise<T>,
  options: (number)|{ms: number, cancelUnderlyingPromiseOnTimeout?: boolean}
): Promise<T> {
  const {ms, cancelUnderlyingPromiseOnTimeout = false} = (typeof options == 'number')
    ? {ms: options, cancelUnderlyingPromiseOnTimeout: false}
    : options;
  let pending = true;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise<T>(async (resolve, reject) => {
    // eslint-disable-next-line prefer-const
    let cleanup: () => void;
    let t: NodeJS.Timeout = setTimeout(() => {
      cleanup();
      if(pending) {
        const err = new TimeoutExpiredError(ms);
        if(cancelUnderlyingPromiseOnTimeout && (promise as CancelablePromise<T>).cancel?.(err)) {
          return;
        } else {
          pending = false;
          reject(err);
        }
      }
    }, ms);

    cleanup = () => {
      if(t) {
        clearTimeout(t);
        t = null;
      }
    };

    try {
      const val: T = await promise;
      if(pending) {
        pending = false;
        cleanup();
        resolve(val);
      }
    } catch(e) {
      if(pending) {
        pending = false;
        cleanup();
        reject(e);
      }
    }
  });
}