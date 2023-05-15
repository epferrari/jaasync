import * as bytes from 'bytes';
const gc = require('expose-gc/function');

// If more than 1024kb of heap are created during the function execution, error
const defaultCutoffBytes: number = Math.pow(2, 20);

export async function testForMemoryLeak(fn: () => (void | Promise<void>), cutoffBytes: number = defaultCutoffBytes) {
  if(!gc) {
    throw new Error('Memory leak tests require access to gc');
  }

  // Take baseline memory snapshot
  gc();
  const memStart = getHeapSize();

  await fn();

  // Take final memory snapshot
  gc();
  const memEnd = getHeapSize();
  const heapChange = memEnd - memStart;

  if(heapChange > cutoffBytes) {
    throw new Error(`Memory leak detected: heap grew by ${bytes(heapChange)}`);
  } else if(heapChange > cutoffBytes / 3) {
    console.warn(`Memory grew by ${bytes(heapChange)}. Try changing iteration count to verify no leak.`);
  }
}

function getHeapSize(): number {
  return process.memoryUsage().heapUsed;
}
