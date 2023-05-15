import {deferred, Deferred} from './deferred';
import {testForMemoryLeak} from './testUtils/testMemLeak';

describe('deferred', () => {
  let promise: Deferred<void>;

  beforeEach(() => {
    promise = deferred<void>();
  });

  describe('resolve', () => {
    it('invokes then', async () => {
      const callback = jasmine.createSpy('then');
      promise.then(callback);

      // not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // once resolved, then is invoked
      promise.resolve();
      await promise;
      expect(callback).toHaveBeenCalled();
    });

    it('invokes finally', async () => {
      const callback = jasmine.createSpy('finally');
      promise.finally(callback);

      // not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // once resolved, then is invoked
      promise.resolve();
      await promise;
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('invokes catch', async () => {
      const callback = jasmine.createSpy('catch');
      promise.catch(callback);

      // not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // once rejected, then is invoked
      promise.reject();
      try {
        await promise;
      } catch {
        expect(callback).toHaveBeenCalled();
      }
    });

    // skipped because Node.JS inexplicably errors after test has passed
    // this only happens when Promise.finally() is called, even on native Promises
    xit('invokes finally', async () => {
      const callback = jasmine.createSpy('finally');
      promise.finally(callback);

      // not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // once rejected, then is invoked
      promise.reject();
      try {
        await promise;
      } catch {
        expect(callback).toHaveBeenCalled();
      }
    });
  });

  it('does not leak memory', async () => {
    const memtest = testForMemoryLeak(async () => {
      for(let i = 0; i < 100000; i++) {
        let promise = new Deferred<string>();
        promise.then(() => {});
        promise.catch(() => {});
        promise.resolve('test');
        await promise;
        promise = null;
      }
    });
    await expectAsync(memtest).toBeResolved();
  });
});