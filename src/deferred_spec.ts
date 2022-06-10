import {deferred, Deferred} from './deferred';

describe('deferred', () => {
  let promise: Deferred<void>;

  beforeEach(() => {
    promise = deferred<void>();
  });

  describe('resolve', () => {
    it('invokes then', async () => {
      const callback = jasmine.createSpy('then');
      promise.then(callback);

      // Not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // Once resolved, then is invoked
      promise.resolve();
      await promise;
      expect(callback).toHaveBeenCalled();
    });

    it('invokes finally', async () => {
      const callback = jasmine.createSpy('finally');
      promise.finally(callback);

      // Not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // Once resolved, then is invoked
      promise.resolve();
      await promise;
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('invokes catch', async () => {
      const callback = jasmine.createSpy('catch');
      promise.catch(callback);

      // Not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // Once rejected, then is invoked
      promise.reject();
      try {
        await promise;
      } catch {
        expect(callback).toHaveBeenCalled();
      }
    });

    // Skipped because Node.JS inexplicably errors after test has passed
    // This only happens when Promise.finally() is called, even on native Promises
    xit('invokes finally', async () => {
      const callback = jasmine.createSpy('finally');
      promise.finally(callback);

      // Not invoked till resolved
      expect(callback).not.toHaveBeenCalled();

      // Once rejected, then is invoked
      promise.reject();
      try {
        await promise;
      } catch {
        expect(callback).toHaveBeenCalled();
      }
    });
  });
});