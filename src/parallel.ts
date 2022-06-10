import {isPromise} from './utils/isPromise';

/* eslint-disable @typescript-eslint/no-invalid-this */
type ResolutionStatus = {fulfilled: boolean};
type Fulfillment<T> = ResolutionStatus & {value: T, error: null, index: number};
type Rejection = ResolutionStatus & {error: Error, value: null, index: number};

export interface ParallelResult<T> {
  items: (Fulfillment<T>|Rejection)[];
  fulfilled: Fulfillment<T>[];
  rejected: Rejection[];
  allFulfilled: boolean;
  allRejected: boolean;
  anyFulfilled: boolean;
  anyRejected: boolean;
  someFulfilled: boolean;
}


export async function parallel<T>(promises: (parallel.Parallelizable<T>|Promise<T>)[]): Promise<ParallelResult<T>> {
  const wrapper = promises.map(async (p, index) => {
    try {
      const value: T = isPromise<T>(p)
        ? await p
        : await p();
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
    get items(): (Fulfillment<T>|Rejection)[] {
      return result
        .slice(0)
        .sort((a, b) => a.index - b.index) as (Fulfillment<T>|Rejection)[];
    },

    get fulfilled(): Fulfillment<T>[] {
      return result
        .filter(p => p.fulfilled)
        .sort((a, b) => a.index - b.index) as Fulfillment<T>[];
    },

    get rejected(): Rejection[] {
      return result
        .filter(p => !p.fulfilled)
        .sort((a, b) => a.index - b.index) as Rejection[];
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

type _Rejection = Rejection;
type _Fulfillment<T> = Fulfillment<T>;
export namespace parallel {
  export type Parallelizable<T> = () => Promise<T>|T;
  export type Fulfillment<T> = _Fulfillment<T>;
  export type Rejection = _Rejection;
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
