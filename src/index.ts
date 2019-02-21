import {retry} from './retry';
import {CancelablePromise, cancelable} from './cancelable';
import {sleep} from './sleep';
import {deferred, Deferred} from './deferred';
import {parallel, ParallelResult} from './parallel';
import {safe} from './safe';
import {FungiblePromise, fungible} from './fungible';
import {timeout} from './timeout';

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
  timeout
};
