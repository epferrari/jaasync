import {deferred, Deferred} from './deferred';
import {parallel, ParallelResult} from './parallel';
import {sleep} from './sleep';

describe('parallel', () => {
  let p;
  let t1: Deferred<string>;
  let t2: Deferred<string>;
  let t3: Deferred<string>;
  let spy: jasmine.Spy<any>;
  let result: ParallelResult<any>;

  describe('given an array of promises', () => {
    beforeEach(() => {
      spy = jasmine.createSpy('spy');
      p = parallel([
        t1 = deferred<string>(),
        t2 = deferred<string>(),
        t3 = deferred<string>()
      ]);
      p.then(r => {
        result = r;
        spy();
      });
    });

    describe('given all the promises are fulfilled', () => {
      it('waits until all the promises have resolved to resolve itself', async() => {
        t1.resolve('foo');
        t2.resolve();
        await sleep(0);
        expect(spy).not.toHaveBeenCalled();
        t3.resolve();
        await sleep(0);
        expect(spy).toHaveBeenCalled();
      });

      it('resolves with a result object reflecting the state of all the promises', async() => {
        t1.resolve('foo');
        t2.resolve('bar');
        t3.resolve('baz');
        await sleep(0);
        expect(result.allFulfilled).toBe(true);
        expect(result.allRejected).toBe(false);
        expect(result.anyFulfilled).toBe(true);
        expect(result.anyRejected).toBe(false);
        expect(result.someFulfilled).toBe(false);

        expect(result.items.length).toBe(3);
        expect(result.fulfilled.length).toBe(3);
        expect(result.rejected.length).toBe(0);
        expect(result.fulfilled[0].value).toEqual('foo');
        expect(result.fulfilled[0].error).toEqual(undefined);
        expect(result.fulfilled[1].value).toEqual('bar');
        expect(result.fulfilled[1].error).toEqual(undefined);
        expect(result.fulfilled[2].value).toEqual('baz');
        expect(result.fulfilled[2].error).toEqual(undefined);
      });
    });

    describe('given all of the promises are rejected', () => {
      it('waits until all the promises have resolved to resolve itself', async() => {
        t1.reject();
        t3.reject();
        await sleep(0);
        expect(spy).not.toHaveBeenCalled();

        t2.reject();
        await sleep(0);
        expect(spy).toHaveBeenCalled();
      });

      it('resolves with a result object reflecting the state of all the promises', async() => {
        t1.reject('foo');
        t2.reject('bar');
        t3.reject('baz');
        await sleep(0);

        expect(result.allFulfilled).toBe(false);
        expect(result.allRejected).toBe(true);
        expect(result.anyFulfilled).toBe(false);
        expect(result.anyRejected).toBe(true);
        expect(result.someFulfilled).toBe(false);

        expect(result.items.length).toBe(3);
        expect(result.fulfilled.length).toBe(0);
        expect(result.rejected.length).toBe(3);
        expect(result.rejected[0].error.message).toEqual('foo');
        expect(result.rejected[0].value).toEqual(undefined);
        expect(result.rejected[1].error.message).toEqual('bar');
        expect(result.rejected[1].value).toEqual(undefined);
        expect(result.rejected[2].error.message).toEqual('baz');
        expect(result.rejected[2].value).toEqual(undefined);
      });
    });

    describe('given some of the promises are fulfilled and some are rejected', () => {
      it('waits until all the promises have resolved to resolve itself', async() => {
        t2.reject();
        await sleep(0);

        expect(spy).not.toHaveBeenCalled();

        t1.resolve();
        t3.resolve();

        await sleep(0);
        expect(spy).toHaveBeenCalled();
      });

      it('resolves with a result object reflecting the state of all the promises', async() => {
        t1.reject('foo');
        t2.resolve('bar');
        t3.reject('baz');
        await sleep(0);

        expect(result.allFulfilled).toBe(false);
        expect(result.allRejected).toBe(false);
        expect(result.anyFulfilled).toBe(true);
        expect(result.anyRejected).toBe(true);
        expect(result.someFulfilled).toBe(true);

        expect(result.items.length).toBe(3);
        expect(result.fulfilled.length).toBe(1);
        expect(result.rejected.length).toBe(2);

        expect(result.rejected[0].error.message).toEqual('foo');
        expect(result.rejected[0].value).toEqual(undefined);
        expect(result.rejected[1].error.message).toEqual('baz');
        expect(result.rejected[1].value).toEqual(undefined);
        expect(result.fulfilled[0].error).toEqual(undefined);
        expect(result.fulfilled[0].value).toEqual('bar');
      });
    });
  });

  describe('given non-promise values', () => {
    const smorgasborg = [
      'foo',
      42,
      false,
      null,
      {},
      []
    ];

    it('returns standard objects and scalars', async () => {
      const results = await parallel<any>(smorgasborg);
      expect(results.items.map((item) => item.value)).toEqual(smorgasborg);
    });

    it('will handle functions that return non-promise values', async () => {
      const smorgasborgFns: parallel.Parallelizable<any>[] = smorgasborg.map((value) => () => value);
      const results = await parallel<any>(smorgasborgFns);
      expect(results.items.map((item) => item.value)).toEqual(smorgasborg);
    });

    it('will handle functions that return promises', async () => {
      const smorgasborgAsyncFns: parallel.Parallelizable<any>[] = smorgasborg.map((value) => async () => value);
      const results = await parallel<any>(smorgasborgAsyncFns);
      expect(results.items.map((item) => item.value)).toEqual(smorgasborg);
    });
  });
});
