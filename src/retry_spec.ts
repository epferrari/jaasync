import {DefaultCanceledRejectMsg} from './cancelablePromise';
import {retry} from './retry';
import {sleep} from './sleep';

describe('retry', () => {
  let createTask: (failuresBeforeSuccess: number, taskTime?: number) => () => Promise<any>;
  let task: jasmine.Spy<any>;
  const decay = 1,
    retryInterval = 100; // consistent 1/10 second between task invocations;

  beforeEach(() => {
    task = jasmine.createSpy('task');
    createTask = (failuresBeforeSuccess: number, taskTime?: number) => {
      let count = 0;
      return (async() => {
        task();
        if(taskTime) {
          await sleep(taskTime);
        }
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

      it('immediately rejects with `Canceled` error', async () => {
        // task will take 100 ms
        // we will cancel it while it is running
        // and expect to get a rejection
        const r = retry<string>(createTask(1, 100));
        const spy = jasmine.createSpy('catcher');
        r.catch(e => {
          spy();
          expect(e).toEqual(DefaultCanceledRejectMsg);
        });

        setTimeout(() => {
          r.cancel();
        }, 5);

        await sleep(10);

        expect(spy).toHaveBeenCalled();
      });
    });

    describe('and given it was already fulfilled', () => {
      it('the cancellation has no effect', done => {
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
      it('the cancellation has no effect', done => {
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

  it('it handles synchronously thrown errors', (done) => {
    const promise = retry(() => {
      throw new Error('test');
    }, {
      maxRetryAttempts: 2
    });

    const resolve = jasmine.createSpy('resolve');
    const reject = jasmine.createSpy('reject');

    promise.then(resolve).catch(reject).finally(() => {
      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalled();
      done();
    });
  });

  it('passes retry info to the task', async () => {
    const fn = jasmine.createSpy('test');
    fn.and.throwError('Test');
    try {
      await retry(fn, {
        retryInterval: 1,
        maxRetryAttempts: 10,
        decay: 2
      });
    } catch {}

    for(let i = 0; i <= 10; i++) {
      expect(fn).toHaveBeenCalledWith({
        state: jasmine.any(Function),
        attemptNumber: i + 1,
        attemptsRemaining: 10 - i,
        msUntilNextAttempt: Math.pow(2, i),
        cancel: jasmine.any(Function),
        next: jasmine.any(Function)
      });
    }
  });

  describe('onError', () => {
    it('invokes onError on failure', async () => {
      const error = new Error('Error');
      const fn = async () => {
        throw error;
      };
      const logError = jasmine.createSpy('log');

      try {
        await retry(fn, {
          retryInterval: 1,
          decay: 2,
          maxRetryAttempts: 2,
          onError: logError
        });
      } catch(final) {}

      // Verify parameters
      expect(logError).toHaveBeenCalledWith(error, {
        state: jasmine.any(Function),
        attemptNumber: 1,
        attemptsRemaining: 2,
        msUntilNextAttempt: 1,
        cancel: jasmine.any(Function),
        next: jasmine.any(Function)
      });

      // Verify that onError is called on each failure
      expect(logError).toHaveBeenCalledTimes(3);
    });
  });
});
