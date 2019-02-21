export class TimeoutExpiredError extends Error {
  constructor(ms: number) {
    super(`Timeout expired after ${ms} milliseconds`);
  }
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let pending: boolean = true;
  return new Promise<T>(async (resolve, reject) => {
    let cleanup: () => void;
    let t = setTimeout(() => {
      if(pending) {
        pending = false;
        reject(new TimeoutExpiredError(ms));
      }
      cleanup();
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