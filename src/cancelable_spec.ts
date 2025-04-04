import {cancelable} from './cancelable';
import { sleep } from './sleep';

describe('cancelable', () => {
  describe('given the promise is canceled', () => {
    it('the task can be aborted', async () => {
      let flag = false;
      let complete = false;
      const task = async (canceled: () => boolean) => {
        await sleep(50);
        if(!canceled()) {
          flag = true;
        }
        complete = true;
      };

      const c = cancelable(task);

      c.catch(() => {});

      expect(flag).toBeFalse();
      expect(complete).toBeFalse();

      await sleep(25);

      expect(flag).toBeFalse();
      expect(complete).toBeFalse();

      c.cancel('No reason');

      expect(flag).toBeFalse();
      expect(complete).toBeFalse();

      await sleep(25);

      expect(flag).toBeFalse();
      expect(complete).toBeTrue();

      await expectAsync(c).toBeRejected();
    });
  });
});