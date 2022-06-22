import {CancelablePromise} from './cancelablePromise';
import {Deferred, deferred} from './deferred';
import {cancelable} from './retry';
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

  describe('given a cancelable promise', () => {
    let d: Deferred<any>;
    let c: CancelablePromise<any>;
    let cancelSpy: jasmine.Spy;

    beforeEach(() => {
      d = new Deferred<any>();
      c = cancelable(async () => await d);
      cancelSpy = spyOn(c, 'cancel');
    });

    describe('and options.cancelUnderlyingPromiseOnTimeout=true', () => {
      describe('given timeout ms expires before the promise is settled', () => {
        it('cancels the underlying promise', (done) => {
          const t = timeout(c, {ms: 50, cancelUnderlyingPromiseOnTimeout: true});

          t
            .then(done.fail)
            .catch((e) => {
              expect(e).toBeInstanceOf(TimeoutExpiredError);
            })
            .finally(() => {
              expect(cancelSpy).toHaveBeenCalled();
              done();
            });
        });
      });

      describe('given timeout ms does not expire before the promise is settled', () => {
        describe('with a resolution', () => {
          it('does not cancel the promise', (done) => {
            const t = timeout(c, {ms: 50, cancelUnderlyingPromiseOnTimeout: true});

            sleep(25)
              .then(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                d.resolve();
                return t;
              })
              .catch(done.fail)
              .finally(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                done();
              });
          });
        });

        describe('with a rejection', () => {
          it('does not cancel the promise', (done) => {
            const t = timeout(c, {ms: 50, cancelUnderlyingPromiseOnTimeout: true});

            sleep(25)
              .then(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                d.reject('error');
                return t;
              })
              .then(done.fail)
              .catch(e => {
                expect(e).not.toBeInstanceOf(TimeoutExpiredError);
                expect(e).toEqual('error');
              })
              .finally(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                done();
              });
          });
        });
      });
    });

    describe('and options.cancelUnderlyingPromiseOnTimeout=false', () => {
      describe('given timeout ms expires before the promise is settled', () => {
        it('does not cancel the underlying promise', (done) => {
          const t = timeout(c, {ms: 50, cancelUnderlyingPromiseOnTimeout: false});

          t
            .then(done.fail)
            .catch((e) => {
              expect(e).toBeInstanceOf(TimeoutExpiredError);
            })
            .finally(() => {
              expect(cancelSpy).not.toHaveBeenCalled();
              done();
            });
        });
      });

      describe('given timeout ms does not expire before the promise is settled', () => {
        describe('with a resolution', () => {
          it('does not cancel the promise', (done) => {
            const t = timeout(c, {ms: 50, cancelUnderlyingPromiseOnTimeout: false});

            sleep(25)
              .then(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                d.resolve();
                return t;
              })
              .catch(done.fail)
              .finally(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                done();
              });
          });
        });

        describe('with a rejection', () => {
          it('does not cancel the promise', (done) => {
            const t = timeout(c, {ms: 50, cancelUnderlyingPromiseOnTimeout: false});

            sleep(25)
              .then(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                d.reject('error');
                return t;
              })
              .then(done.fail)
              .catch(e => {
                expect(e).not.toBeInstanceOf(TimeoutExpiredError);
                expect(e).toEqual('error');
              })
              .finally(() => {
                expect(cancelSpy).not.toHaveBeenCalled();
                done();
              });
          });
        });
      });
    });
  });
});