import {autobind} from 'core-decorators';

import {Awaitable} from './awaitable';

@autobind
export class Deferred<T> extends Awaitable<T> {
  public resolve(value?: T): void {
    super.resolve(value);
  }

  public reject(error?: any): void {
    super.reject(error);
  }
}

export function deferred<T>(): Deferred<T> {
  return new Deferred<T>();
}