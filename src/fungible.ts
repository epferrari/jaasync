import {autobind} from 'core-decorators';

import {isPromise} from './utils/isPromise';

export interface Swappable<T> {
  (wasCanceled: () => boolean): Promise<T>;
}

export function fungible<T>(target: Promise<T>|Swappable<T>): FungiblePromise<T> {
  return new FungiblePromise(target);
}


@autobind
export class FungiblePromise<T> implements Promise<T> {
  public [Symbol.toStringTag]: string = 'Promise';

  private _i: number = 0;
  private _pending: boolean = true;
  private _resolve: (value: T) => void;
  private _reject: (error: any) => void;
  private readonly _promise: Promise<T>;

  constructor(promise: Promise<T>|Swappable<T>) {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this.bind(promise);
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this._promise.then(onfulfilled, onrejected);
  }

  public catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
    return this._promise.catch(onrejected);
  }

  public finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this._promise.finally(onfinally);
  }

  public swap(target: Promise<T>|Swappable<T>): void {
    if(!this._pending) {
      throw new Error('Cannot invoke #swap on resolved <FungiblePromise>');
    }
    this.bind(target);
  }

  private resolve(value: T): void {
    this._pending = false;
    this._resolve(value);
  }

  private reject(error: any): void {
    this._pending = false;
    this._reject(error);
  }

  public get pending(): boolean {
    return this._pending;
  }

  private async bind(target: Promise<T>|Swappable<T>): Promise<void> {
    const i = ++this._i;

    let p: Promise<T>;
    if(isPromise(target)) {
      p = target;
    } else {
      const wasCanceled = (): boolean => {
        return i !== this._i;
      };
      p = target(wasCanceled);
    }
    try {
      const value = await p;
      if(i === this._i) {
        this.resolve(value);
      }
    } catch(e) {
      if(i === this._i) {
        this.reject(e);
      }
    }
  }
}