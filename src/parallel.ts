import {isPromise} from './utils/isPromise';

type ResolutionStatus = {fulfilled: boolean};
type Fulfillment<T> = ResolutionStatus & {value: T, error: undefined, index: number};
type Rejection = ResolutionStatus & {error: Error, value: undefined, index: number};

export async function parallel<T>(promises: (parallel.Parallelizable<T>|Promise<T>)[]): Promise<parallel.Result<T>> {
  const wrapper = promises.map(async (p, index) => {
    try {
      const value: T = isPromise<T>(p)
        ? await p
        : await p();
      return {fulfilled: true, value, error: undefined, index};
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
      return {fulfilled: false, value: undefined, error, index};
    }
  });

  const result: (Fulfillment<T>|Rejection)[] = await Promise.all(wrapper);

  return new ParallelResult<T>(result);
}

type _Rejection = Rejection;
type _Fulfillment<T> = Fulfillment<T>;
export namespace parallel {
  export type Parallelizable<T> = () => Promise<T>|T;
  export type Result<T> = ParallelResult<T>;
  // tslint:disable-next-line:no-shadowed-variable
  export type Fulfillment<T> = _Fulfillment<T>;
  // tslint:disable-next-line:no-shadowed-variable
  export type Rejection = _Rejection;
  // this oddity is because in node, an immediately invoked async function
  // that results in rejected promise, even though caught in parallel, is still being
  // treated as an unhandled rejection
  export function wrap<T>(fn: Parallelizable<T>): Parallelizable<T> {
    let invocation!: Parallelizable<T>;
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

export class ParallelResult<T> {
  private readonly result!: (Fulfillment<T>|Rejection)[];
  constructor(result: (Fulfillment<T>|Rejection)[]) {
    this.result = result;
  }

  public get items() {
    return this.result.slice(0) as (Fulfillment<T>|Rejection)[];
  }

  public get fulfilled(): Fulfillment<T>[] {
    return this.result.filter(p => p.fulfilled) as Fulfillment<T>[];
  }

  public get rejected(): Rejection[] {
    return this.result.filter(p => !p.fulfilled) as Rejection[];
  }

  public get allFulfilled(): boolean {
    return this.result.every(p => p.fulfilled);
  }

  public get allRejected(): boolean {
    return this.result.every(p => !p.fulfilled);
  }

  public get anyFulfilled(): boolean {
    return !this.allRejected;
  }

  public get anyRejected(): boolean {
    return !this.allFulfilled;
  }

  public get someFulfilled(): boolean {
    return !(this.allFulfilled || this.allRejected);
  }
}
