import {last} from 'lodash';

import {InferParams, Invocable, ReturnType} from './utils/inference';

import {Deferred, deferred} from './deferred';
import {parallel} from './parallel';
import {sleep} from './sleep';

export namespace asyncDedupe {

  export interface CollapseStrategy<T> {
    (prev: T, next: T): boolean;
  }

  export interface DedupeStrategy<T> {
    (prev: T, next: T): boolean;
  }

  export interface SortStrategy<T> {
    (prev: T, next: T): -1|0|1;
  }

  export interface Config<TFn extends Invocable> {
    interval: number;
    strategies: {
      sort?: SortStrategy<ReturnType<TFn>>;
      collapse: CollapseStrategy<ReturnType<TFn>>;
      dedupe: DedupeStrategy<ReturnType<TFn>>;
    };
    leading?: boolean;
    onError?: (error: Error) => void;
  }
}

export function asyncDedupe<TFn extends Invocable>(
  fn: TFn,
  config: asyncDedupe.Config<TFn>
): (...params: InferParams<TFn>) => Promise<ReturnType<TFn>[]> {
  const buckets = new Map<number, Bucket<TFn>>();

  const {interval, leading = false} = config;

  return async (...params: InferParams<TFn>): Promise<ReturnType<TFn>[]> => {
    const invocation = parallel.wrap(() => fn(...params as any[]));
    const invocationTime = Date.now();
    const bucketKey: number = Array.from(buckets.keys()).find(key => {
      return (invocationTime >= key && invocationTime <= (key + interval));
    }) || invocationTime;
    let bucket = buckets.get(bucketKey);
    if(!bucket) {
      bucket = new Bucket<TFn>({...config, onComplete: () => buckets.delete(bucketKey)});
      buckets.set(bucketKey, bucket);
      if(leading) {
        const result = await invocation();
        return [result];
      }
    }

    bucket.addItem(invocation);

    return await bucket.value();
  };
}

class Bucket<TFn extends Invocable> {
  private readonly items: parallel.Parallelizable<ReturnType<TFn>>[] = [];
  private readonly result: Deferred<ReturnType<TFn>[]> = deferred<ReturnType<TFn>[]>();

  constructor(config: asyncDedupe.Config<TFn> & {onComplete: () => void}) {
    this.resolve(config);
  }

  public async value(): Promise<ReturnType<TFn>[]> {
    return await this.result;
  }

  private async resolve(config: asyncDedupe.Config<TFn> & {onComplete: () => void}): Promise<void> {
    const {
      interval,
      strategies,
      onError,
      onComplete
    } = config;
    await sleep(interval);
    const result = await parallel(this.items);
    onComplete();
    if(result.allRejected) {
      const error = last(result.rejected).error;
      this.result.reject(error);
      return;
    } else if(result.anyRejected && onError) {
      result.rejected.map(r => onError(r.error));
    }

    const {sort, collapse, dedupe} = strategies;

    try {
      const deduped = (sort ? result.fulfilled.sort(sort) : result.fulfilled)
        .reduce((acc, {value: curr}) => {
          if(acc.length && collapse(last(acc), curr)) {
            return [curr];
          } else {
            return [
              ...acc.filter(v => !dedupe(v, curr)),
              curr
            ];
          }
        }, []);
      this.result.resolve(sort ? deduped.sort(sort) : deduped);
    } catch(e) {
      this.result.reject(e);
    }
  }

  public addItem(item: parallel.Parallelizable<ReturnType<TFn>>): void {
    this.items.push(item);
  }
}