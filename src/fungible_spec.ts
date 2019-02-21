import {Deferred} from './Deferred';
import {FungiblePromise} from './fungible';
import {sleep} from './sleep';

describe('fungible', () => {
  describe('given the fungible has been neither resolved nor rejected', () => {
    it('exposes its pending state as false', () => {
      const p1: Deferred<string> = new Deferred<string>();
      const f = new FungiblePromise(p1);
      expect(f.pending).toBe(true);
    });

    describe('#swap', () => {
      it('resolves when the last swapped promise resolves, not the original', async () => {
        const p1: Deferred<string> = new Deferred<string>();
        const p2: Deferred<string> = new Deferred<string>();
        const p3: Deferred<string> = new Deferred<string>();
        const onResolve: jasmine.Spy = jasmine.createSpy('onResolve');

        const f = new FungiblePromise<string>(p1);
        f.then(onResolve);
        f.swap(p2);
        p1.resolve('foo');
        await sleep(0);
        expect(onResolve).not.toHaveBeenCalled();
        f.swap(p3);
        p2.resolve('bar');
        await sleep(0);
        expect(onResolve).not.toHaveBeenCalled();
        p3.resolve('baz');
        await sleep(0);
        expect(onResolve).toHaveBeenCalledWith('baz');
      });
    });
  });

  describe('given the fungible was already resolved', () => {
    it('exposes its pending state as false', async () => {
      const p1: Deferred<string> = new Deferred<string>();
      const f = new FungiblePromise(p1);
      expect(f.pending).toBe(true);

      p1.resolve('foo');
      await sleep(0);
      expect(f.pending).toBe(false);
    });

    describe('#swap', () => {
      it('throws an error', async () => {
        const p1: Deferred<string> = new Deferred<string>();
        const p2: Deferred<string> = new Deferred<string>();
        const onResolve: jasmine.Spy = jasmine.createSpy('onResolve');

        const f = new FungiblePromise(p1);
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
      const p1: Deferred<string> = new Deferred<string>();
      const f = new FungiblePromise(p1);
      expect(f.pending).toBe(true);

      p1.resolve('foo');
      await sleep(0);
      expect(f.pending).toBe(false);
    });

    describe('#swap', () => {
      it('throws an error', async () => {
        const p1: Deferred<string> = new Deferred<string>();
        const p2: Deferred<string> = new Deferred<string>();
        const onReject: jasmine.Spy = jasmine.createSpy('onReject');

        const f = new FungiblePromise(p1);
        f.catch(onReject);
        p1.reject('foo');
        await sleep(0);
        expect(onReject).toHaveBeenCalledWith('foo');
        expect(() => f.swap(p2)).toThrow();
      });
    });
  });
});