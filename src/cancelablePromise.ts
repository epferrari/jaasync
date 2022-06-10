export type Canceller = (reason?: string|Error) => boolean;

export const DefaultCanceledRejectMsg = 'Canceled';

export interface CancelablePromise<T> extends Promise<T> {
  cancel: Canceller;
}
