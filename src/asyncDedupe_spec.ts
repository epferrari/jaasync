import {asyncDedupe} from './asyncDedupe';
import {sleep} from './sleep';


type TestType = {
  sequenceNumber: number;
  value: object;
};

describe('asyncDedupe', () => {
  describe('given a series of async invocations within a specified interval', () => {
    const fn = async (sequenceNumber: number, value: object, error?: Error): Promise<TestType> => {
      await sleep(Math.floor(Math.random() * 100));
      if(error) {
        throw error;
      }
      return {sequenceNumber, value};
    };

    const collapseStrategy: asyncDedupe.CollapseStrategy<TestType> = (prev: TestType, next: TestType): boolean => {
      return next.sequenceNumber === 0;
    };
    const dedupeStrategy: asyncDedupe.DedupeStrategy<TestType> = (previous: TestType, next: TestType): boolean => {
      return previous.sequenceNumber === next.sequenceNumber;
    };

    let deduped: (sequenceNumber: number, value: object, error?: Error) => Promise<TestType[]>;

    beforeEach(() => {
      deduped = asyncDedupe(fn, {
        interval: 1000,
        strategies: {
          collapse: collapseStrategy,
          dedupe: dedupeStrategy
        }
      });
    });

    it('dedupes their results according to strategies in order of their invocations (not their resolutions)', async () => {
      const results = await Promise.all([
        deduped(5, {foo: 'foo'}),
        deduped(0, {foo: 'bar'}),
        deduped(1, {foo: 'baz'}),
        deduped(1, {foo: 'far'}),
        deduped(3, {foo: 'quo'})
      ]);

      const expected = [{
        sequenceNumber: 0,
        value: {foo: 'bar'}
      }, {
        sequenceNumber: 1,
        value: {foo: 'far'}
      }, {
        sequenceNumber: 3,
        value: {foo: 'quo'}
      }];

      expect(results[0]).toEqual(expected);
      expect(results[1]).toEqual(expected);
      expect(results[2]).toEqual(expected);
      expect(results[3]).toEqual(expected);
      expect(results[4]).toEqual(expected);
    });

    describe('given the "leading" configuration option is true', () => {
      beforeEach(() => {
        deduped = asyncDedupe(fn, {
          interval: 1000,
          strategies: {
            collapse: collapseStrategy,
            dedupe: dedupeStrategy
          },
          leading: true
        });
      });

      it('returns the first invocation immediately', async () => {
        const results = await Promise.all([
          deduped(5, {foo: 'foo'}),
          deduped(0, {foo: 'bar'}),
          deduped(1, {foo: 'baz'}),
          deduped(1, {foo: 'far'}),
          deduped(3, {foo: 'quo'})
        ]);

        const firstExpected = [{
          sequenceNumber: 5,
          value: {foo: 'foo'}
        }];

        const restExpected = [{
          sequenceNumber: 0,
          value: {foo: 'bar'}
        }, {
          sequenceNumber: 1,
          value: {foo: 'far'}
        }, {
          sequenceNumber: 3,
          value: {foo: 'quo'}
        }];

        expect(results[0]).toEqual(firstExpected);
        expect(results[1]).toEqual(restExpected);
        expect(results[2]).toEqual(restExpected);
        expect(results[3]).toEqual(restExpected);
        expect(results[4]).toEqual(restExpected);
      });
    });

    describe('given the invocations are split across intervals', () => {
      beforeEach(() => {
        deduped = asyncDedupe(fn, {
          interval: 1000,
          strategies: {
            collapse: collapseStrategy,
            dedupe: dedupeStrategy
          }
        });
      });

      it('splits the returned values', async () => {
        const results = await Promise.all([
          deduped(5, {foo: 'foo'}),
          deduped(0, {foo: 'bar'}),
          deduped(1, {foo: 'baz'}),
          deduped(1, {foo: 'far'}),
          (async () => {
            await sleep(1500);
            return deduped(3, {foo: 'quo'});
          })()
        ]);

        const expectedFirstInterval = [{
          sequenceNumber: 0,
          value: {foo: 'bar'}
        }, {
          sequenceNumber: 1,
          value: {foo: 'far'}
        }];

        const expectedSecondInterval = [{
          sequenceNumber: 3,
          value: {foo: 'quo'}
        }];

        expect(results[0]).toEqual(expectedFirstInterval);
        expect(results[1]).toEqual(expectedFirstInterval);
        expect(results[2]).toEqual(expectedFirstInterval);
        expect(results[3]).toEqual(expectedFirstInterval);
        expect(results[4]).toEqual(expectedSecondInterval);
      });
    });

    describe('given an error is thrown from one of the invocations', () => {
      describe('given an error handler is declared', () => {
        let errorHandler: jasmine.Spy;

        beforeEach(() => {
          errorHandler = jasmine.createSpy('errorHandler');
          deduped = asyncDedupe(fn, {
            interval: 1000,
            strategies: {
              collapse: collapseStrategy,
              dedupe: dedupeStrategy
            },
            onError: errorHandler
          });
        });

        it('calls the error handler with the error', async () => {
          const results = await Promise.all([
            deduped(5, {foo: 'foo'}),
            deduped(0, {foo: 'bar'}),
            deduped(1, {foo: 'baz'}),
            deduped(1, {foo: 'far'}, new Error('woo')),
            deduped(3, {foo: 'quo'})
          ]);

          const expected = [{
            sequenceNumber: 0,
            value: {foo: 'bar'}
          }, {
            sequenceNumber: 1,
            value: {foo: 'baz'}
          }, {
            sequenceNumber: 3,
            value: {foo: 'quo'}
          }];

          expect(results[0]).toEqual(expected);
          expect(results[1]).toEqual(expected);
          expect(results[2]).toEqual(expected);
          expect(results[3]).toEqual(expected);
          expect(results[4]).toEqual(expected);

          expect(errorHandler).toHaveBeenCalled();
        });
      });

      describe('given no error handler is given', () => {

        beforeEach(() => {
          deduped = asyncDedupe(fn, {
            interval: 1000,
            strategies: {
              collapse: collapseStrategy,
              dedupe: dedupeStrategy
            }
          });
        });

        it('ignores the error', async () => {
          const results = await Promise.all([
            deduped(5, {foo: 'foo'}),
            deduped(0, {foo: 'bar'}),
            deduped(1, {foo: 'baz'}),
            deduped(1, {foo: 'far'}, new Error('woo')),
            deduped(3, {foo: 'quo'})
          ]);

          const expected = [{
            sequenceNumber: 0,
            value: {foo: 'bar'}
          }, {
            sequenceNumber: 1,
            value: {foo: 'baz'}
          }, {
            sequenceNumber: 3,
            value: {foo: 'quo'}
          }];

          expect(results[0]).toEqual(expected);
          expect(results[1]).toEqual(expected);
          expect(results[2]).toEqual(expected);
          expect(results[3]).toEqual(expected);
          expect(results[4]).toEqual(expected);
        });
      });
    });

    describe('given an error is thrown from all invocations', () => {
      beforeEach(() => {
        deduped = asyncDedupe(fn, {
          interval: 1000,
          strategies: {
            collapse: collapseStrategy,
            dedupe: dedupeStrategy
          }
        });
      });

      it('throws the last error', async () => {
        try {
          await Promise.all([
            deduped(5, {foo: 'foo'}, new Error('1')),
            deduped(0, {foo: 'bar'}, new Error('2')),
            deduped(1, {foo: 'baz'}, new Error('3')),
            deduped(1, {foo: 'far'}, new Error('4')),
            deduped(3, {foo: 'quo'}, new Error('5'))
          ]);
        } catch(e) {
          expect(e.message).toEqual('5');
        }
      });
    });
  });
});