import {sleep} from './cancelable';
import {Deferred} from './deferred';
import {TransactionQueue} from './queue';

describe('TransactionQueue', () => {
  let spy1: jasmine.Spy;
  let spy2: jasmine.Spy;
  let spy3: jasmine.Spy;
  let spy4: jasmine.Spy;

  let deferred1: Deferred<any>;
  let deferred2: Deferred<any>;
  let deferred3: Deferred<any>;

  let operation1: () => Promise<void>;
  let operation2: () => Promise<void>;
  let operation3: () => Promise<void>;
  let operation4: () => Promise<void>;

  let queue: TransactionQueue;

  beforeEach(() => {
    spy1 = jasmine.createSpy('spy1');
    spy2 = jasmine.createSpy('spy2');
    spy3 = jasmine.createSpy('spy3');
    spy4 = jasmine.createSpy('spy4');

    deferred1 = new Deferred<void>();
    deferred2 = new Deferred<void>();
    deferred3 = new Deferred<void>();

    operation1 = async (): Promise<void> => {
      spy1();
      return await deferred1;
    };

    operation2 = async (): Promise<void> => {
      spy2();
      return await deferred2;
    };

    operation3 = async (): Promise<void> => {
      spy3();
      return await deferred3;
    };

    operation4 = async(): Promise<void> => {
      spy4();
      return;
    };

    queue = new TransactionQueue();
  });

  describe('given operations await values that resolve in the same order the operations were transacted', () => {
    it('executes async operations in serial', async () => {
      const {transaction} = queue;

      transaction(operation1);
      transaction(operation2);
      transaction(operation3);
      transaction(operation4);

      await sleep(0);
      expect(spy1).toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
      expect(spy3).not.toHaveBeenCalled();
      expect(spy4).not.toHaveBeenCalled();
      deferred1.resolve();
      await deferred1;
      await sleep(0);
      expect(spy2).toHaveBeenCalled();
      expect(spy3).not.toHaveBeenCalled();
      expect(spy4).not.toHaveBeenCalled();
      deferred2.resolve();
      await deferred2;
      await sleep(0);
      expect(spy3).toHaveBeenCalled();
      expect(spy4).not.toHaveBeenCalled();
      deferred3.resolve();
      await deferred3;
      await sleep(0);
      expect(spy4).toHaveBeenCalled();
    });
  });

  describe('given operations await values that resolve in an order diffently than the opertions were transacted', () => {
    it('executes async operations in serial', async () => {
      const {transaction} = queue;

      transaction(operation1);
      transaction(operation2);
      transaction(operation3);
      transaction(operation4);

      await sleep(0);
      expect(spy1).toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
      expect(spy3).not.toHaveBeenCalled();
      expect(spy4).not.toHaveBeenCalled();
      deferred2.resolve();
      await deferred2;
      await sleep(0);
      expect(spy2).not.toHaveBeenCalled();
      expect(spy3).not.toHaveBeenCalled();
      expect(spy4).not.toHaveBeenCalled();
      deferred3.resolve();
      await deferred3;
      await sleep(0);
      expect(spy2).not.toHaveBeenCalled();
      expect(spy3).not.toHaveBeenCalled();
      expect(spy4).not.toHaveBeenCalled();
      deferred1.resolve();
      await deferred1;
      await sleep(0);
      expect(spy2).toHaveBeenCalled();
      expect(spy3).toHaveBeenCalled();
      expect(spy4).toHaveBeenCalled();
    });
  });

  describe('given a transaction is started from inside another transaction', () => {
    describe('and given a single layer of nesting', () => {
      it('passes a child trasaction scope to each operation', async () => {

        const {transaction} = queue;

        transaction(operation1);
        transaction(childTransaction => childTransaction(operation2));
        transaction(operation3);

        await sleep(0);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        await deferred1.resolve();
        await sleep(0);
        expect(spy2).toHaveBeenCalled();
      });
    });

    describe('given complex nesting', () => {
      it('resolves complex nesting correctly via child transaction scopes', async () => {
        const {transaction} = queue;

        transaction(operation1);
        transaction(async childTransaction => {
          await childTransaction(async childTransaction2 => {
            await operation2();
            await childTransaction2(async childTransaction3 => {
              await childTransaction3(operation3);
            });
          });
        });
        transaction(operation4);

        await sleep(0);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        expect(spy4).not.toHaveBeenCalled();
        await deferred1.resolve();
        await sleep(0);
        expect(spy2).toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        expect(spy4).not.toHaveBeenCalled();
        await deferred2.resolve();
        await sleep(0);
        expect(spy3).toHaveBeenCalled();
        expect(spy4).not.toHaveBeenCalled();
        await deferred3.resolve();
        await sleep(0);
        expect(spy4).toHaveBeenCalled();
      });
    });

    describe('given the nested transaction cannot access the child transaction scope', () => {
      it('handles a simple case', async () => {
        const {transaction} = queue;

        const wrappedTransaction = async() => {
          await transaction(operation2);
        };

        transaction(operation1);
        transaction(wrappedTransaction);
        transaction(operation3);

        await sleep(0);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        await deferred1.resolve();
        await sleep(0);
        expect(spy2).toHaveBeenCalled();
        expect(spy3).not.toHaveBeenCalled();
        await deferred2.resolve();
        await sleep(0);
        expect(spy3).toHaveBeenCalled();
      });

      describe('given a complex case', () => {
        it('exceeds the intelligence of the TransactionQueue', async () => {
          const {transaction} = queue;

          const wrappedTransaction = async() => {
            await transaction(operation2);
          };

          const doubleWrappedTransaction = async() => {
            await transaction(wrappedTransaction);
          };

          transaction(operation1);
          transaction(doubleWrappedTransaction);
          transaction(operation3);

          await sleep(0);
          expect(spy1).toHaveBeenCalled();
          expect(spy2).not.toHaveBeenCalled();
          expect(spy3).not.toHaveBeenCalled();
          await deferred1.resolve();
          await sleep(0);
          expect(spy2).not.toHaveBeenCalled(); // !!
          expect(spy3).not.toHaveBeenCalled();
          await deferred2.resolve();
          await sleep(0);
          expect(spy3).not.toHaveBeenCalled(); // !!
        });
      });
    });
  });
});