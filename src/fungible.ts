import {normalizeError} from './utils/normalizeError';
import {generateId} from './utils/generateId';
import {cancelable} from './retry';
import {CancelablePromise} from './cancellablePromise';


type PromiseProxy<T> = {
  pending: boolean;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  cancel: (reason: string) => void;
};

export type FungiblePromise<T> = Promise<T> & {
  swap(promise: Promise<T>): void;
  pending: boolean;
};

const REPLACE = `REPLACE_${generateId()}`;

export function fungible<T>(promise: Promise<T>): FungiblePromise<T> {
  const fungibles = new FungiblePromiseMap<T>();
  const proxy = fungibles.create(promise);
  (proxy as FungiblePromise<T>).swap = (p: Promise<T>) => {
    if(!proxy.pending) {
      throw new Error('Cannot invoke #swap on resolved <FungiblePromise>');
    }
    fungibles.transfer(proxy, p);
  };
  return proxy as FungiblePromise<T>;
}

class FungiblePromiseMap<T> {
  private proxies = new WeakMap<Promise<T>, PromiseProxy<T>>();

  public create(promise: Promise<T>): Promise<T> & {pending: boolean} {
    let resolve: PromiseProxy<T>['resolve'];
    let reject: PromiseProxy<T>['reject'];
    let pending: boolean = true;
    const proxy = new Promise<T>((res, rej) => {
      resolve = (value: T) => {
        pending = false;
        res(value);
      };
      reject = (error: Error) => {
        pending = false;
        rej(error);
      };
    });
    const {cancel}: CancelablePromise<T> = this.bindProxy(promise, resolve, reject);
    this.proxies.set(proxy, {pending, resolve, reject, cancel});
    Object.defineProperty(proxy, 'pending', {
      get() {
        return pending;
      }
    });
    return proxy as Promise<T> & {pending: boolean};
  }

  public transfer(proxy: Promise<T>, promise: Promise<T>): Promise<T> {
    const {pending, resolve, reject, cancel: cancelPrevious} = this.proxies.get(proxy);
    if(pending) {
      cancelPrevious(REPLACE);
      const {cancel}: CancelablePromise<T> = this.bindProxy(promise, resolve, reject);
      this.proxies.set(proxy, {pending, resolve, reject, cancel});
    }
    return proxy;
  }

  private bindProxy(
    promise: Promise<T>,
    resolve: PromiseProxy<T>['resolve'],
    reject: PromiseProxy<T>['reject']
  ): CancelablePromise<T> {
    const c = cancelable<T>(() => promise);
    (async() => {
      try {
        const value = await c;
        resolve(value);
      } catch(e) {
        if(normalizeError(e) !== REPLACE) {
          reject(e);
        }
      }
    })();
    return c;
  }
}