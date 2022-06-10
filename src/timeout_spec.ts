import {deferred} from './deferred';
import {sleep} from './sleep';
import {timeout, TimeoutExpiredError} from './timeout';

describe('timeout', () => {
  describe('given the timeout ms expires before the promise is resolved', () => {
    it('the timeout is rejected with TIMEOUT_EXPIRATION', async () => {
      const promise = sleep(100);
      const t = timeout(promise, 50);
      try {
        await t;
        throw new Error('should not reach here');
      } catch(e) {
        expect(e instanceof TimeoutExpiredError).toBe(true);
      }
    });
  });

  describe('given the promise resolves before the timeout ms expires', () => {
    it('the timeout is resolved with value', done => {
      const promise = deferred<string>();
      const t = timeout(promise, 50);

      t.then(result => {
        expect(result).toEqual('success');
        done();
      })
        .catch(done.fail);

      promise.resolve('success');
    });
  });

  describe('given the promise rejects before the timeout ms expires', () => {
    it('the timeout is rejected with promise rejection error', done => {
      const promise = deferred<string>();
      const t = timeout(promise, 50);

      t.then(done.fail)
        .catch(e => {
          expect(e).toEqual('error');
          done();
        });

      promise.reject('error');
    });
  });
});