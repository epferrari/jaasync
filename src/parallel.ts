import {isFunction} from './utils/isFunction';

/* eslint-disable @typescript-eslint/no-invalid-this */


export interface ParallelResult<T> {
  items: (parallel.Fulfillment<T>|parallel.Rejection)[];
  fulfilled: parallel.Fulfillment<T>[];
  rejected: parallel.Rejection[];
  allFulfilled: boolean;
  allRejected: boolean;
  anyFulfilled: boolean;
  anyRejected: boolean;
  someFulfilled: boolean;
}


export async function parallel<T>(promises: (T | parallel.Parallelizable<T> | Promise<T>)[]): Promise<ParallelResult<T>> {
  const wrapper = promises.map(async (p, index) => {
    try {
      const value: T = isFunction(p)
        ? await p()
        : await p;
      return {fulfilled: true, value, index};
    } catch (e) {
      let error: Error;
      if(e instanceof Error) {
        error = e;
      } else {
        try {
          error = new Error(e.toString());
        } catch(e) {
          error = new Error(`parallel execution error at index ${index}.`);
        }
      }
      return {fulfilled: false, error, index};
    }
  });

  const result = await Promise.all(wrapper);

  return {
    get items(): (parallel.Fulfillment<T>|parallel.Rejection)[] {
      return result
        .slice(0)
        .sort((a, b) => a.index - b.index) as (parallel.Fulfillment<T>|parallel.Rejection)[];
    },

    get fulfilled(): parallel.Fulfillment<T>[] {
      return result
        .filter(p => p.fulfilled)
        .sort((a, b) => a.index - b.index) as parallel.Fulfillment<T>[];
    },

    get rejected(): parallel.Rejection[] {
      return result
        .filter(p => !p.fulfilled)
        .sort((a, b) => a.index - b.index) as parallel.Rejection[];
    },

    get allFulfilled(): boolean {
      return result.every(p => p.fulfilled);
    },

    get allRejected(): boolean {
      return result.every(p => !p.fulfilled);
    },

    get anyFulfilled(): boolean {
      return !this.allRejected;
    },

    get anyRejected(): boolean {
      return !this.allFulfilled;
    },

    get someFulfilled(): boolean {
      return !(this.allFulfilled || this.allRejected);
    }
  };
}

export namespace parallel {
  export type Parallelizable<T> = () => Promise<T> | T;
  export type ResolutionStatus = {fulfilled: boolean};
  export type Fulfillment<T> = ResolutionStatus & {value: T, error: null, index: number};
  export type Rejection = ResolutionStatus & {error: Error, value: null, index: number};
  // this oddity is because in node, an immediately invoked async function
  // that results in rejected promise, even though caught in parallel, is still being
  // treated as an unhandled rejection
  export function wrap<T>(fn: Parallelizable<T>): Parallelizable<T> {
    let invocation: Parallelizable<T>;
    (async () => {
      try {
        const result = fn();
        invocation = async () => await result;
        await result;
      } catch (e) {
        invocation = () => {
          throw e;
        };
      }
    })();
    return invocation;
  }
}
