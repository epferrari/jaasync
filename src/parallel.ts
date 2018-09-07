type ResolutionStatus = {fulfilled: boolean};
type Fulfillment<T> = ResolutionStatus & {value: T, error: null};
type Rejection = ResolutionStatus & {error: any, value: null};

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

function isPromise<T>(p: any): p is Promise<T> {
  return typeof p.then === 'function';
}

export async function parallel<T>(promises: (Promise<T>|(() => Promise<T>))[]): Promise<ParallelResult<T>> {
  const wrapper = promises.map(async (p) => {
    try {
      let value: T;
      if(isPromise<T>(p)) {
        value = await p;
      } else {
        value = await p();
      }
      return {fulfilled: true, value};
    } catch (error) {
      return {fulfilled: false, error};
    }
  });

  const result = await Promise.all(wrapper);

  return {
    get items() {
      return result.slice(0) as (Fulfillment<T>|Rejection)[];
    },

    get fulfilled(): Fulfillment<T>[] {
      return result.filter(p => p.fulfilled) as Fulfillment<T>[];
    },

    get rejected(): Rejection[] {
      return result.filter(p => !p.fulfilled) as Rejection[];
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
