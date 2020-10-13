import {CancelablePromise, cancelable} from './cancelable';
import {deferred, Deferred} from './deferred';
import {FungiblePromise, fungible} from './fungible';
import {parallel, ParallelResult} from './parallel';
import {retry} from './retry';
import {safe} from './safe';
import {sleep} from './sleep';
import {timeout, TimeoutExpiredError} from './timeout';
import {isPromise} from './utils/isPromise';

export {
  deferred, // factory
  Deferred, // class + interface
  retry,
  sleep,
  cancelable, // factory
  CancelablePromise, // class + interface
  parallel,
  ParallelResult,
  safe,
  fungible, // factory
  FungiblePromise, // class + interface
  timeout,
  TimeoutExpiredError,
  isPromise
};
