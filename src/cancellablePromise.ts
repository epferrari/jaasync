export type Canceller = (reason?: string) => boolean;

export const DefaultCanceledRejectMsg = 'Canceled';

export interface CancelablePromise<T> extends Promise<T> {
  cancel: Canceller;
}
