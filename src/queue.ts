import {LinkedList} from './utils/linkedList';

export type Enqueue<T> = (operation: Operation<T>) => Promise<T>|T;
type Operation<T> = (childEnqueue: Enqueue<T>) => Promise<T>|T;

type AsyncQueueEntry<T> = {
  operation: Operation<T>;
  resolve: (value?: T) => void;
  reject: (err: Error) => void;
};

export namespace AsyncQueue {
  export type QueueImpl<T> = Pick<Array<T>, 'push'|'shift'|'length'>;
}


export class AsyncQueue {
  private static queueFactory: () => AsyncQueue.QueueImpl<any> = () => new LinkedList<any>();
  public static setQueueImpl(queueFactory: () => AsyncQueue.QueueImpl<any>): void {
    AsyncQueue.queueFactory = queueFactory;
  }

  protected name: string;
  private readonly queue: AsyncQueue.QueueImpl<any>;
  private running: Promise<void>;

  constructor(name?: string) {
    this.name = name || 'AsyncQueue';
    this.queue = AsyncQueue.queueFactory();
    this.enqueue = this.enqueue.bind(this);
  }

  public async enqueue<T>(operation: Operation<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const entry: AsyncQueueEntry<T> = {
        operation,
        resolve,
        reject
      };
      this.queue.push(entry);
      this.runQueue();
    });
  }

  public get size(): number {
    return this.queue.length;
  }

  private runQueue() {
    if(!this.running) {
      const queue = this.runQueueInternal();
      this.running = queue;
      this.running
        .then(() => this.running = null)
        .catch(() => this.running = null);
      return queue;
    } else {
      return this.running;
    }
  }

  // Only one should be going at a time
  private async runQueueInternal() {
    while(this.queue.length) {
      const current = this.queue.shift();
      const {operation, resolve, reject} = current;
      try {
        const subtasks = new AsyncQueue();
        const result = await operation(subtasks.enqueue);
        // ensure any subtasks that weren't awaited in the operation invocation are flushed
        await subtasks.runQueue();
        resolve(result);
      } catch(e) {
        reject(e);
      }
    }
  }
}
