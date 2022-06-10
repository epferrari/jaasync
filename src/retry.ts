import {isNil} from './utils/isNil';
import {CancelablePromise, Canceller, DefaultCanceledRejectMsg} from './cancelablePromise';
import {sleep} from './sleep';


export namespace retry {
  export interface Options {
    retryInterval: number;
    maxInterval: number;
    decay: number;
    maxRetryAttempts: number;
    onError: (err: Error, params: TaskParams) => void;
  }
  export interface TaskParams {
    state: () => retry.State;
    attemptNumber: number;
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
  maxRetryAttempts: null,
  onError: null
};

export function retry<T>(
  task: (params: retry.TaskParams) => T | Promise<T>,
  options: Partial<retry.Options> = null
): CancelablePromise<T> {
  const {retryInterval, maxInterval, decay, maxRetryAttempts, onError} = {
    ...retryDefaults,
    ...options
  };

  let cancel: Canceller;
  let done = false;

  const p = new Promise<T>(async (resolve, reject) => {
    let attempts = 0;
    let awaiter: CancelablePromise<void>;

    cancel = (reason: string | Error = DefaultCanceledRejectMsg) => {
      if (done) {
        return false;
      }
      done = true;
      if (awaiter?.cancel) {
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

      const attemptsRemaining = isNil(maxRetryAttempts) ? Infinity : maxRetryAttempts + 1 - attempts;
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
        attemptNumber: attempts,
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
        onError?.(err, params);
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

export function cancelable<T>(task: () => Promise<T>): CancelablePromise<T> {
  return retry(task, {maxRetryAttempts: 0});
}
