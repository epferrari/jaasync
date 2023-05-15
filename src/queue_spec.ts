import {testForMemoryLeak} from './testUtils/testMemLeak';

import {deferred, Deferred} from './deferred';
import {AsyncQueue, Enqueue} from './queue';
import {sleep} from './sleep';

fdescribe('AsyncQueue', () => {
  let spy1: jasmine.Spy<any>;
  let spy2: jasmine.Spy<any>;
  let spy3: jasmine.Spy<any>;
  let spy4: jasmine.Spy<any>;

  let deferred1: Deferred<any>;
  let deferred2: Deferred<any>;
  let deferred3: Deferred<any>;

  let operation1: () => Promise<any>;
  let operation2: () => Promise<any>;
  let operation3: () => Promise<any>;
  let operation4: () => Promise<any>;

  let queue: AsyncQueue;

  beforeEach(() => {
    spy1 = jasmine.createSpy('spy1');
    spy2 = jasmine.createSpy('spy2');
    spy3 = jasmine.createSpy('spy3');
    spy4 = jasmine.createSpy('spy4');

    deferred1 = deferred<void>();
    deferred2 = deferred<void>();
    deferred3 = deferred<void>();

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

    queue = new AsyncQueue();
  });

  describe('given operations await values that resolve in the same order the operations were invoked', () => {
    it('executes async operations in serial', async () => {
      const {enqueue} = queue;

      enqueue(operation1);
      enqueue(operation2);
      enqueue(operation3);
      enqueue(operation4);

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

  describe('given operations await values that resolve in an order diffently than the opertions were invoked', () => {
    it('executes async operations in serial', async () => {
      const {enqueue} = queue;

      enqueue(operation1);
      enqueue(operation2);
      enqueue(operation3);
      enqueue(operation4);

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

  describe('given an operation is started from inside another operation', () => {
    describe('and given a single layer of nesting', () => {
      it('passes a child enqueue function to each operation', async () => {

        const {enqueue} = queue;

        enqueue(operation1);
        enqueue(child => child(operation2));
        enqueue(operation3);

        await sleep(0);
        expect(spy1).toHaveBeenCalled();
        expect(spy2).not.toHaveBeenCalled();
        await deferred1.resolve();
        await sleep(0);
        expect(spy2).toHaveBeenCalled();
      });
    });

    describe('given complex nesting', () => {
      it('resolves complex nesting correctly via child scopes', async () => {
        const {enqueue} = queue;

        enqueue(operation1);
        enqueue(async child1 => {
          await child1(async child2 => {
            await operation2();
            await child2(async child3 => {
              await child3(operation3);
            });
          });
        });
        enqueue(operation4);

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

    describe('given the nested enqueue cannot access the child scope', () => {
      it('handles a simple case', async () => {
        const {enqueue} = queue;

        const wrappedEnqueue = async (enqueue: Enqueue<any>) => {
          await enqueue(operation2);
        };

        enqueue(operation1);
        enqueue(wrappedEnqueue);
        enqueue(operation3);

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
        it('does not exceed the intelligence of the AsyncQueue', async () => {
          const {enqueue} = queue;

          const wrappedEnqueue = async (enqueue: Enqueue<any>) => {
            await enqueue(operation2);
          };

          const doubleWrapped = async (enqueue: Enqueue<any>) => {
            await enqueue(wrappedEnqueue);
          };

          enqueue(operation1);
          enqueue(doubleWrapped);
          enqueue(operation3);

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
      });
    });
  });

  fdescribe('does not leak memory', () => {
    it('when a flat queue is run', async () => {
      const queue = new AsyncQueue();
      const memtest = testForMemoryLeak(async () => {
        let promises: Promise<void>[] = [];
        for(let i = 0; i <= 100_000; i++) {
          promises.push(queue.enqueue(async () => {}));
        }
        await Promise.all(promises);
      });
      await expectAsync(memtest).toBeResolved();
    });

    it('when a nested queue is run', async () => {
      const queue = new AsyncQueue();
      const memtest = testForMemoryLeak(async () => {
        let promises: Promise<void>[] = [];
        for(let i = 0; i <= 100_000; i++) {
          promises.push(queue.enqueue(async (enqueue: Enqueue<any>) => (
            enqueue(() => {})
          )));
        }
        await Promise.all(promises);
      });
      await expectAsync(memtest).toBeResolved();
    });
  });
});