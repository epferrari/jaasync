import {autobind} from 'core-decorators';

import {Deferred, deferred} from './deferred';

type Operation<T> = (childEnqueue: AsyncQueue['enqueue']) => Promise<T>|T;

type AsyncQueueNode<T> = {
  entry: AsyncQueueEntry<T>;
  next: AsyncQueueNode<any>;
};
type AsyncQueueEntry<T> = {
  operation: Operation<T>;
  promise: Deferred<T>;
  childScope: AsyncQueue;
};

@autobind
export class AsyncQueue {
  protected depth: number = 0;
  protected name: string;
  private _size: number = 0;
  private head: AsyncQueueNode<any>;
  private tail: AsyncQueueNode<any>;
  private running: boolean;
  private currentScope: AsyncQueue;

  constructor(name?: string) {
    this.name = name || 'AsyncQueue';
  }

  public async enqueue<T>(operation: Operation<T>): Promise<T> {
    if(this.currentScope) {
      return this.currentScope.enqueue(operation);
    }
    const entry: AsyncQueueEntry<T> = {
      operation,
      promise: deferred<T>(),
      childScope: new ChildAsyncQueue(`${this.name}_${this.depth + 1}_${operation.name}`, this.depth + 1)
    };
    this.add(entry);
    this.processQueue();
    return await entry.promise;
  }

  public get size(): number {
    return this._size;
  }

  private add(entry: AsyncQueueEntry<any>): void {
    const node: AsyncQueueNode<any> = {entry, next: null};
    if(!this.head) {
      this.head = this.tail = node;
    } else {
      const tail = this.tail;
      tail.next = node;
      this.tail = node;
    }
    this._size++;
  }
  private async processQueue(): Promise<void> {
    if(this.running || !this.head) {
      return;
    }
    this.running = true;
    const current = this.head;
    this.head = current.next;
    const {promise} = current.entry;
    try {
      const result = await this.execute(current.entry);
      promise.resolve(result);
    } catch(e) {
      promise.reject(e);
    } finally {
      this.running = false;
      this._size--;
      if(this._size) {
        this.processQueue();
      }
    }
  }

  private async execute<T>(entry: AsyncQueueEntry<T>): Promise<T> {
    const {operation, childScope} = entry;
    this.currentScope = childScope;
    const result = operation(childScope.enqueue);
    this.currentScope = null;
    return await result;
  }
}

class ChildAsyncQueue extends AsyncQueue {
  constructor(name: string, depth: number) {
    super(name);
    this.depth = depth;
  }
}
