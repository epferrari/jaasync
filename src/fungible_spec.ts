import {deferred, Deferred} from './deferred';
import {fungible, FungiblePromise, Swappable} from './fungible';
import {sleep} from './sleep';

describe('fungible', () => {
  describe('given the fungible has been neither resolved nor rejected', () => {
    it('exposes its pending state as true', () => {
      const p1: Deferred<string> = deferred<string>();
      const f = fungible(p1);
      expect(f.pending).toBe(true);
    });

    describe('#swap', () => {
      it('resolves when the last swapped promise resolves, not the original', async() => {
        const p1: Deferred<string> = deferred<string>();
        const p2: Deferred<string> = deferred<string>();
        const p3: Deferred<string> = deferred<string>();
        const onResolve: jasmine.Spy = jasmine.createSpy('onResolve');

        const f = fungible<string>(p1);
        // make sure FungiblePromise works with async await, since it implements Promise but does not exetend it
        (async () => {
          onResolve(await f);
        })();

        // Using p2 promise. When p1 resolves, fungible does not
        f.swap(p2);
        p1.resolve('foo');
        await sleep(0);
        expect(onResolve).not.toHaveBeenCalled();

        // Using p3 promise. When p2 resolves, fungible does not
        f.swap(p3);
        p2.resolve('bar');
        await sleep(0);
        expect(onResolve).not.toHaveBeenCalled();

        // When p3 resolves, fungible resolves
        p3.resolve('baz');
        await sleep(0);
        expect(onResolve).toHaveBeenCalledWith('baz');
      });
    });
  });

  describe('given the fungible was already resolved', () => {
    it('exposes its pending state as false', async () => {
      const p1: Deferred<string> = deferred<string>();
      const f = fungible(p1);
      expect(f.pending).toBe(true);

      p1.resolve('foo');
      await sleep(0);
      expect(f.pending).toBe(false);
    });

    describe('#swap', () => {
      it('throws an error', async() => {
        const p1: Deferred<string> = deferred<string>();
        const p2: Deferred<string> = deferred<string>();
        const onResolve: jasmine.Spy = jasmine.createSpy('onResolve');

        const f = fungible(p1);
        f.then(onResolve);
        p1.resolve('foo');
        await sleep(0);
        expect(onResolve).toHaveBeenCalledWith('foo');
        expect(() => f.swap(p2)).toThrow();
      });
    });
  });

  describe('given the fungible was already rejected', () => {
    it('exposes its pending state as false', async () => {
      const p1: Deferred<string> = deferred<string>();
      const f = fungible(p1);
      expect(f.pending).toBe(true);

      p1.resolve('foo');
      await sleep(0);
      expect(f.pending).toBe(false);
    });

    describe('#swap', () => {
      it('throws an error', async() => {
        const p1: Deferred<string> = deferred<string>();
        const p2: Deferred<string> = deferred<string>();
        const onReject: jasmine.Spy = jasmine.createSpy('onReject');

        const f = fungible(p1);
        f.catch(onReject);
        p1.reject('foo');
        await sleep(0);
        expect(onReject).toHaveBeenCalledWith('foo');
        expect(() => f.swap(p2)).toThrow();
      });
    });
  });

  describe('given a swappable was passed into the FungiblePromise', () => {
    let task1: Swappable<string>;
    let task2: Swappable<string>;
    let spy1: jasmine.Spy;
    let spy2: jasmine.Spy;
    let spy3: jasmine.Spy;

    beforeEach(() => {
      spy1 = jasmine.createSpy('task');
      spy2 = jasmine.createSpy('aborted');
      spy3 = jasmine.createSpy('non-aborted');
      task1 = async (wasCanceled: () => boolean) => {
        spy1();
        await sleep(100);
        if(wasCanceled()) {
          return;
        }
        spy2();
        return 'foo';
      };

      task2 = async (wasCanceled: () => boolean) => {
        spy1();
        await sleep(100);
        if(wasCanceled()) {
          return;
        }
        spy3();
        return 'bar';
      };
    });

    it('allows work to be aborted inside swapped-out promises', async () => {
      const f = new FungiblePromise(task1);
      await sleep(25);
      f.swap(task2);
      await sleep(300);
      expect(spy1).toHaveBeenCalledTimes(2);
      expect(spy2).toHaveBeenCalledTimes(0);
      expect(spy3).toHaveBeenCalledTimes(1);
    });
  });
});