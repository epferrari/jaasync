import {autobind} from 'core-decorators';
import {Deferred, deferred} from './deferred';

type TransactionId = string;
type Operation<T> = (childTransaction: TransactionQueue['transaction']) => Promise<T>|T;
type QueuedOperation<T> = {
  operation: Operation<T>;
  resolver: Deferred<void>;
  childScope: TransactionQueue;
};

@autobind
export class TransactionQueue {
  private queue: Map<string, QueuedOperation<any>> = new Map<string, QueuedOperation<any>>();
  private position: number = 0;
  private currentScope: TransactionId|null = null;
  protected depth: number = 0;

  public async transaction<T>(operation: Operation<T>): Promise<T> {
    if(this.currentScope) {
      const item = this.queue.get(this.currentScope) as QueuedOperation<T>;
      return item.childScope.transaction(operation);
    }
    const transactionId: TransactionId = this.createTransactionId();
    const ready = this.awaitQueuePosition();
    this.queueOperation(transactionId, operation);
    await ready;

    try {
      const result: T = await this.executeOperation<T>(transactionId);
      this.closeTransaction(transactionId);
      return result;
    } catch(e) {
      this.closeTransaction(transactionId);
      throw e;
    }
  }

  private createTransactionId(): TransactionId {
    const transactionId: TransactionId = this.position.toString();
    this.position++;
    return transactionId;
  }

  private async awaitQueuePosition(): Promise<void> {
    if(this.queue.size === 0) {
      return;
    } else {
      await Promise.all(Array.from(this.queue.values()).map(q => q.resolver));
    }
  }

  private queueOperation<T>(transactionId: TransactionId, operation: Operation<T>): void {
    const queuedOperation: QueuedOperation<T> = {
      operation,
      resolver: deferred(),
      childScope: new ChildTransactionQueue(this.depth + 1)
    };
    this.queue.set(transactionId, queuedOperation);
  }

  private async executeOperation<T>(transactionId: TransactionId): Promise<T> {
    const item = this.queue.get(transactionId) as QueuedOperation<T>;
    const {operation, childScope} = item;
    this.currentScope = transactionId;
    const executedOperation = operation(childScope.transaction);
    this.currentScope = null;
    return await executedOperation;
  }

  private closeTransaction(transactionId: TransactionId) {
    const item = this.queue.get(transactionId) as QueuedOperation<any>;
    const {resolver} = item;
    resolver.resolve();
    this.queue.delete(transactionId);
  }
}

class ChildTransactionQueue extends TransactionQueue {
  constructor(depth: number) {
    super();
    this.depth = depth;
  }
}