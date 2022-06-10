import {CancelablePromise, DefaultCanceledRejectMsg} from './cancelablePromise';
import {sleep} from './sleep';

describe('sleep', () => {
  let p: CancelablePromise<any>;
  beforeEach(() => {
    p = sleep(25);
  });

  describe('sleep', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('resolves after time', async () => {
      // setup promises
      let resolved = false;
      const promise: Promise<void> = sleep(25);
      promise.then(() => resolved = true);

      // at first, promise has not run
      expect(resolved).toEqual(false);

      // after sleep has finished, promise runs
      jasmine.clock().tick(50);
      await promise;
      expect(resolved).toEqual(true);
    });
  });

  describe('given the delay period has not elapsed', () => {
    it('the promise can be canceled', done => {
      p.then(done.fail.bind(done)).catch(e => {
        expect(e).toEqual(DefaultCanceledRejectMsg);
        done();
      });

      p.cancel();
    });

    it('the promise can be canceled with a reason other than `Canceled`', done => {
      p.then(done.fail.bind(done)).catch(e => {
        expect(e).toEqual('foo');
        done();
      });

      p.cancel('foo');
    });
  });

  describe('given the delay period has elapsed', () => {
    it('fulfills with an undefined value', async () => {
      try {
        const value = await p;
        expect(value).toBeUndefined();
      } catch (e) {
        fail(e);
      }
    });

    it('cannot be canceled', done => {
      p
        .then(value => {
          expect(value).toBeUndefined();
        })
        .catch(fail);

      setTimeout(() => {
        p.cancel();
        done();
      }, 30);
    });
  });
});
