/* cancelable */
export type Canceller = (reason?: string) => boolean;
export interface CancelablePromise<T> extends Promise<T> {
  cancel: Canceller;
}

export class CancelablePromise<T> {
  constructor(task: (params: retry.TaskParams) => Promise<T>) {
    return cancelable<T>(task);
  }
}

export namespace CancelablePromise {
  export const DEFAULT_REJECTION_MESSAGE = 'Canceled';
}

// legacy factory
export function cancelable<T>(task: (params: retry.TaskParams) => Promise<T>): CancelablePromise<T> {
  return retry(task, {maxRetryAttempts: 0});
}


/* retry */
export namespace retry {
  export interface Options {
    retryInterval: number;
    maxInterval: number;
    decay: number;
    maxRetryAttempts: number;
  }
  export interface TaskParams {
    state: () => retry.State;
    attemptsRemaining: number;
    msUntilNextAttempt: number;
    cancel: Canceller;
    next: () => void;
  }
}

const retryDefaults: retry.Options = {
  retryInterval: 1000,
  maxInterval: 60000,
  decay: 1.5,
  maxRetryAttempts: Infinity
};

export function retry<T>(
  task: (params: retry.TaskParams) => Promise<T>,
  options: Partial<retry.Options> = {}
): CancelablePromise<T> {
  const {retryInterval, maxInterval, decay, maxRetryAttempts} = {
    ...retryDefaults,
    ...options
  };

  let cancel!: Canceller;
  let done = false;

  const p = new Promise<T>(async (resolve, reject) => {
    let attempts = 0;
    let awaiter: CancelablePromise<T>;

    cancel = (reason: string = CancelablePromise.DEFAULT_REJECTION_MESSAGE) => {
      if (done) {
        return false;
      }
      done = true;
      if (awaiter && awaiter.cancel) {
        awaiter.cancel(reason);
      }
      reject(reason);
      return true;
    };

    while (!done) {
      const msUntilNextAttempt = Math.min(
        retryInterval * Math.pow(decay, attempts++),
        maxInterval
      );

      const attemptsRemaining = Number.isFinite(maxRetryAttempts) ? maxRetryAttempts + 1 - attempts : Infinity;
      const params: retry.TaskParams = {
        state: () => {
          if(done) {
            return retry.State.Canceled;
          } else if(attemptsRemaining === 0) {
            return retry.State.Exhausted;
          } else {
            return retry.State.Pending;
          }
        },
        attemptsRemaining,
        msUntilNextAttempt,
        cancel,
        next: (message?: string) => {
          throw new Error(message || 'Retry skipped to next attempt');
        }
      };
      try {
        const result = await task(params);
        // success, resolve and break retry loop
        done = true;
        resolve(result);
        break;
      } catch (err) {
        if(done) {
          break;
        }
        if(attemptsRemaining === 0) {
          // no more attempts
          done = true;
          reject(err);
          break;
        }
      }
      if(done) {
        break;
      }
      // wait n ms and loop again to retry the task
      try {
        await (awaiter = sleep(msUntilNextAttempt));
        if(done) {
          break;
        }
      } catch (ignore) {
        // retry was cancelled
        break;
      }
    }
  }) as CancelablePromise<T>;

  p.cancel = cancel;
  return p;
}

export namespace retry {
  export enum State {
    Canceled,
    Pending,
    Exhausted
  }
}

/* sleep */

export function sleep<T>(ms: number): CancelablePromise<T> {
  let cancel!: Canceller;

  const p = new Promise<T>((resolve, reject) => {
    let t: any = setTimeout(() => {
      t = undefined;
      resolve();
    }, ms);

    cancel = (reason: string = CancelablePromise.DEFAULT_REJECTION_MESSAGE) => {
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