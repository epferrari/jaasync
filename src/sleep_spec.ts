import {CancelablePromise, DefaultCanceledRejectMsg, sleep} from './cancelable';

describe('sleep', () => {
  let p: CancelablePromise<any>;
  beforeEach(() => {
    p = sleep(25);
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
