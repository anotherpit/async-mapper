import assert from 'assert';
import * as lib from '../src';

describe('lib', () => {
  describe('name', () => {
    it('should be async-mapper', () => {
      assert.strictEqual(lib.name, 'async-mapper');
    });
  });
});