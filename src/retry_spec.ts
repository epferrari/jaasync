import {retry} from './retry';
import {DefaultCanceledRejectMsg} from './cancellablePromise';

describe('retry', () => {
  let createTask,
    task;
  const decay = 1,
    retryInterval = 100; // consistent 1/10 second between task invocations;

  beforeEach(() => {
    task = jasmine.createSpy('task');
    createTask = failuresBeforeSuccess => {
      let count = 0;
      return (() => {
        task();
        if (count++ >= failuresBeforeSuccess) {
          return Promise.resolve('success');
        } else {
          return Promise.reject('error');
        }
      }) as () => Promise<string>;
    };
  });

  afterEach(() => task.calls.reset());

  describe('given options.maxRetryAttempts is not specified', () => {
    describe('and given its task succeeds on the first try', () => {
      it('resolves with the fulfillment value of the task', done => {
        retry<string>(createTask(0))
          .then(result => {
            expect(result).toEqual('success');
            expect(task).toHaveBeenCalledTimes(1);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('and given its task does not succeed on the first try', () => {
      it('will continue to try until the task successfully resolves', done => {
        retry<string>(createTask(2), {decay, retryInterval})
          .then(result => {
            expect(result).toEqual('success');
            expect(task).toHaveBeenCalledTimes(3);
            done();
          })
          .catch(done.fail);
      });
    });
  });

  describe('given options.maxRetryAttempts is specified', () => {
    describe('and given its task fails beyond the number of attempts specified', () => {
      it('stops invoking the task', done => {
        retry<string>(createTask(2), {
          maxRetryAttempts: 1,
          decay,
          retryInterval
        })
          .then(done.fail)
          .catch(e => {
            expect(task).toHaveBeenCalledTimes(2);
            done();
          });
      });

      it('rejects and bubbles up the error', done => {
        retry<string>(createTask(2), {
          maxRetryAttempts: 0,
          decay,
          retryInterval
        })
          .then(done.fail)
          .catch(e => {
            expect(e).toEqual('error');
            done();
          });
      });
    });
  });

  describe('given the retry is canceled', () => {
    describe('and given its resolution is pending', () => {
      it('aborts subsequent calls to its task', done => {
        const r = retry<string>(createTask(10), {decay, retryInterval});
        const onError = jasmine.createSpy('onError');

        r.then(done.fail).catch(onError);

        setTimeout(() => {
          expect(task).toHaveBeenCalledTimes(1);
        }, 90);

        setTimeout(() => {
          expect(task).toHaveBeenCalledTimes(2);
          r.cancel();
        }, 190);

        setTimeout(() => {
          expect(task).toHaveBeenCalledTimes(2);
        }, 390);

        setTimeout(() => {
          expect(task).toHaveBeenCalledTimes(2);
          done();
        }, 490);
      });

      it('immediately rejects with `Canceled` error', done => {
        const r = retry<string>(createTask(10));

        r.then(done.fail).catch(e => {
          expect(e).toEqual(DefaultCanceledRejectMsg);
          done();
        });

        setTimeout(() => {
          r.cancel();
        }, 10);
      });
    });

    describe('and given it was already fulfilled', () => {
      it('the cancelation has no effect', done => {
        const r = retry<string>(createTask(0));

        r.catch(e => {
          done.fail(e);
        });

        setTimeout(() => {
          expect(r.cancel()).toEqual(false);
          done();
        }, 50);
      });
    });

    describe('and given it was already rejected', () => {
      it('the cancelation has no effect', done => {
        const r = retry<string>(createTask(2), {
          maxRetryAttempts: 0,
          decay,
          retryInterval
        });

        r.then(done.fail).catch(e => {
          expect(e).toEqual('error');
        });

        setTimeout(() => {
          expect(r.cancel()).toEqual(false);
          done();
        }, 100);
      });
    });
  });
});
