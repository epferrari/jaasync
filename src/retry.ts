import {isNil} from 'lodash';
import {CancelablePromise, DefaultCanceledRejectMsg, Canceller} from './cancellablePromise';
import {sleep} from './sleep';

type RetryOptions = {
  retryInterval: number;
  maxInterval: number;
  decay: number;
  maxRetryAttempts: number;
};

const retryDefaults: RetryOptions = {
  retryInterval: 1000,
  maxInterval: 60000,
  decay: 1.5,
  maxRetryAttempts: null
};

export function retry<T>(
  task: () => Promise<T>,
  options: Partial<RetryOptions> = null
): CancelablePromise<T> {
  const {retryInterval, maxInterval, decay, maxRetryAttempts} = Object.assign(
    {},
    retryDefaults,
    options
  );

  let cancel: Canceller;
  let done = false;

  const p = new Promise<T>(async (resolve, reject) => {
    let retryCount = 0;
    let awaiter: CancelablePromise<T>;

    cancel = (reason: string = DefaultCanceledRejectMsg) => {
      if (done) {
        return false;
      }
      done = true;
      if (awaiter && awaiter.cancel) {
        awaiter.cancel(reason);
      } else {
        reject(reason);
      }
      return true;
    };

    while (!done) {
      try {
        const result = await task();
        // success, resolve and break retry loop
        done = true;
        resolve(result);
        return;
      } catch (err) {
        if (!isNil(maxRetryAttempts) && retryCount >= maxRetryAttempts) {
          // no more attempts, reject and break retry loop
          done = true;
          reject(err);
          return;
        }
      }
      // wait n ms and loop again to retry the task
      try {
        const interval = Math.min(
          retryInterval * Math.pow(decay, retryCount++),
          maxInterval
        );
        await (awaiter = sleep(interval));
      } catch (e) {
        // retry was cancelled, reject and break retry loop
        done = true;
        reject(e);
        return;
      }
    }
  }) as CancelablePromise<T>;

  p.cancel = cancel;
  return p;
}

export function cancelable<T>(task: () => Promise<T>): CancelablePromise<T> {
  return retry(task, {maxRetryAttempts: 0});
}
