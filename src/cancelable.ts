import { CancelablePromise } from './cancelablePromise';
import {retry} from './retry';

export function cancelable<T>(task: (canceled: () => boolean) => Promise<T>): CancelablePromise<T> {
  const wrappedTask = (params: retry.TaskParams) => {
    const canceled = () => params.state() === retry.State.Canceled;
    return task(canceled);
  };
  return retry(wrappedTask, {maxRetryAttempts: 0});
}