enum AwaitableState {
  Pending = 0,
  Resolved,
  Rejected
}

export class Awaitable<T> implements Promise<T> {
  public [Symbol.toStringTag]: string = 'Promise';

  private _state: AwaitableState = AwaitableState.Pending;
  private _value: T;
  private _error: any;
  private _resolve: (value: T) => void;
  private _reject: (error: any) => void;
  private _hasHandlers: boolean = false;
  private readonly _promise: Promise<T>;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
    this.then = this.then.bind(this);
    this.catch = this.catch.bind(this);
    this.finally = this.finally.bind(this);
    this.resolve = this.resolve.bind(this);
    this.reject = this.reject.bind(this);
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    const p = this._promise.then(onfulfilled, onrejected);
    this.releaseUnhandledRejectionMitigation();
    return p;
  }

  public catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
    const p = this._promise.catch(onrejected);
    this.releaseUnhandledRejectionMitigation();
    return p;
  }

  public finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    const p = this._promise.finally(onfinally);
    this.releaseUnhandledRejectionMitigation();
    return p;
  }

  private releaseUnhandledRejectionMitigation() {
    const hadHandlers = this._hasHandlers;
    this._hasHandlers = true;
    if(this._state === AwaitableState.Rejected && !hadHandlers) {
      this._reject(this._error);
    }
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
      // mitigate unhandled rejections
      if(this._hasHandlers) {
        this._reject(error);
      }
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