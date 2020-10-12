export interface Deferred<T> extends Promise<T> {
  resolve: (r?: T) => void;
  reject: (reason?: any) => void;
  pending: boolean;
  resolved: boolean;
  rejected: boolean;
}

export class Deferred<T> {
  constructor() {
    return deferred<T>();
  }
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: any) => void;
  // tslint:disable-next-line
  let resolved = false, rejected = false, pending = true;
  const p = new Promise((_resolve, _reject) => {
    resolve = (value: T) => {
      if(pending) {
        pending = false;
        resolved = true;
        _resolve(value);
      }
    };
    reject = (reason: any) => {
      if(pending) {
        pending = false;
        rejected = true;
        _reject(reason);
      }
    };
  }) as Deferred<T>;
  p.resolve = resolve;
  p.reject = reject;

  Object.defineProperty(p, 'resolved', {
    get() {
      return resolved;
    },
    configurable: false
  });

  Object.defineProperty(p, 'rejected', {
    get() {
      return rejected;
    },
    configurable: false
  });

  Object.defineProperty(p, 'pending', {
    get() {
      return pending;
    },
    configurable: false
  });

  return p;
}
