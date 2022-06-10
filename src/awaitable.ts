import {autobind} from 'core-decorators';

enum AwaitableState {
  Pending,
  Resolved,
  Rejected
}

@autobind
export class Awaitable<T> implements Promise<T> {
  public [Symbol.toStringTag]: string = 'Promise';

  private _state: AwaitableState = AwaitableState.Pending;
  private _value: T;
  private _error: any;
  private _resolve: (value: T) => void;
  private _reject: (error: any) => void;
  private readonly _promise: Promise<T>;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
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

  protected resolve(value: T): void {
    if(this._state === AwaitableState.Pending) {
      this._state = AwaitableState.Resolved;
      this._value = value;
      this._resolve(value);
    }
  }

  protected reject(error: any): void {
    if(this._state === AwaitableState.Pending) {
      this._state = AwaitableState.Rejected;
      this._error = error;
      this._reject(error);
    }
  }

  public get pending(): boolean {
    return this._state === AwaitableState.Pending;
  }

  public get resolved(): boolean {
    return this._state === AwaitableState.Resolved;
  }

  public get rejected(): boolean {
    return this._state === AwaitableState.Rejected;
  }

  public get value(): T {
    return this._value;
  }

  public get error(): any {
    return this._error;
  }
}