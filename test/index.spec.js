import assert from 'assert';
import * as lib from '../src';

const assertAsyncMapper = (fn) => {
  assert.strictEqual(typeof fn, 'function');
  assert.strictEqual(fn.length, 2);
};

describe('exactly(...)', () => {
  it('should be an async mapper', () => {
    assertAsyncMapper(lib.exactly(1));
  });

  it('exactly(constnat)(whatever, cb) should return constant', (cb) => {
    const constant = {a:'a'};
    const mapper = lib.exactly(constant);
    mapper(constant, (err, res) => {
      assert(!err);
      assert.strictEqual(res, constant);
      cb();
    });
  });
});

describe('get(...)', () => {
  it('should be an async mapper', () => {
    assertAsyncMapper(lib.get('path'));
  });

  it('should return existing object property value by property name', (cb) => {
    const val = 'val';
    lib.get('a')({a: val}, (err, res) => {
      assert(!err);
      assert.strictEqual(res, val);
      cb();
    });
  });

  it('should return existing array item value by index', (cb) => {
    const val = 'val';
    lib.get('0')([val, '1', '2'], (err, res) => {
      assert(!err);
      assert.strictEqual(res, val);
      cb();
    });
  });

  it('should return existing deep value by path', (cb) => {
    const val = 'val';
    lib.get('a.1.b.2')({a: ['0', {b: ['0', '1', val]}, '2']}, (err, res) => {
      assert(!err);
      assert.strictEqual(res, val);
      cb();
    });
  });

  it('should return undefined by non-existent object property name', (cb) => {
    lib.get('a')({b: 'b'}, (err, res) => {
      assert(!err);
      assert.strictEqual(res, undefined);
      cb();
    });
  });

  it('should return undefined by non-existent array index', (cb) => {
    lib.get('2')(['0', '1'], (err, res) => {
      assert(!err);
      assert.strictEqual(res, undefined);
      cb();
    });
  });

  it('should return undefined by non-existent path', (cb) => {
    lib.get('a.b.x')({}, (err, res) => {
      assert(!err);
      assert.strictEqual(res, undefined);
      cb();
    });
  });

  it('should accept path as an array of strings', (cb) => {
    const val = 'val';
    lib.get(['a.b', 'c.d'])({'a.b': {'c.d': val}}, (err, res) => {
      assert(!err);
      assert.strictEqual(res, val);
      cb();
    });
  });
});

describe('seq(...)', () => {
  it('should be an async mapper', () => {
    assertAsyncMapper(lib.seq([]));
  });

  it('seq(mappers) should run mappers in sequence and pass result from one to another', (cb) => {
    const mapper = lib.seq([
      (input) => input.toLowerCase(),
      (input) => `${input}${input}`,
      (input) => `${input}${input.length}`
    ]);
    mapper('A', (err, res) => {
      assert(!err);
      assert.strictEqual(res, 'aa2');
      cb();
    });
  });

  it('seq(mappers) should stop on first error occurred and return this error', (cb) => {
    let called = 0;
    const error = 'error';
    const mapper = lib.seq([
      (input) => input.toLowerCase(),
      () => { throw error; },
      (input) => {
        called += 1;
        return `${input}${input.length}`;
      }
    ]);
    mapper('A', (err) => {
      assert.strictEqual(err, error);
      assert.strictEqual(called, 0);
      cb();
    });
  });

  it('seq(mappers) should normalize passed mappers', (cb) => {
    const mapper = lib.seq([
      {'prop': 'a.b.c'}, // map
      'prop', // get
      (input) => input.toLowerCase(), // sync
      (input, cb) => cb(null, `${input}${input}`), // async
      [(input) => `${input}${input.length}`] // seq
    ]);
    mapper({a: {b: {c: 'A'}}}, (err, res) => {
      assert(!err);
      assert.strictEqual(res, 'aa2');
      cb();
    });
  });

  it('seq(null) should return passed value as is', (cb) => {
    const obj = {a:'a'};
    lib.seq(null)(obj, (err, res) => {
      assert(!err);
      assert.strictEqual(res, obj);
      cb();
    });
  });

  it('seq([]) should return passed value as is', (cb) => {
    const obj = {a:'a'};
    lib.seq([])(obj, (err, res) => {
      assert(!err);
      assert.strictEqual(res, obj);
      cb();
    });
  });
});

describe('map(...)', () => {
  it('should be an async mapper', () => {
    assertAsyncMapper(lib.map({}));
  });

  it('map(mappers) should run mappers and return keyed object', (cb) => {
    const mapper = lib.map({
      lower: (input) => input.toLowerCase(),
      upper: (input) => input.toUpperCase()
    });
    mapper('a', (err, res) => {
      assert(!err);
      assert.deepStrictEqual(res, {lower: 'a', upper: 'A'});
      cb();
    });
  });

  it('map(mappers) should run mappers in parallel', (cb) => {
    const flags = {
      one: false,
      two: false,
      three: false
    };
    const log = [];
    const mapper = lib.map({
      // Will wait for two
      one: (input, cb) => {
        const interval = setInterval(() => {
          if (flags.two) {
            clearInterval(interval);
            log.push(1);
            flags.one = true;
            cb(null, `${input}1`);
          }
        }, 10);
      },

      // Will run first
      two: (input) => {
        log.push(2);
        flags.two = true;
        return `${input}2`;
      },

      // Will wait for one and two
      three: (input, cb) => {
        const interval = setInterval(() => {
          if (flags.one && flags.two) {
            clearInterval(interval);
            log.push(3);
            flags.three = true;
            cb(null, `${input}3`);
          }
        }, 10);
      }
    });
    mapper('A', (err, res) => {
      assert(!err);
      assert.deepStrictEqual(res, {one: 'A1', two: 'A2', three: 'A3'});
      assert.deepStrictEqual(flags, {one: true, two: true, three: true});
      assert.deepStrictEqual(log, [2, 1, 3]);
      cb();
    });
  });

  it('map(mappers) should stop on first error occurred and return this error', (cb) => {
    let called = 0;
    const error = 'error';
    const mapper = lib.map({
      one: (input, cb) => {
        setTimeout(() => {
          called += 1;
          cb(null, `${input}1`);
        }, 200);
      },
      two: (input, cb) => {
        setTimeout(() => {
          cb(error);
        }, 100);
      }
    });
    mapper('A', (err) => {
      assert.strictEqual(err, error);
      assert.strictEqual(called, 0);
      cb();
    });
  });

  it('map(mappers) should normalize passed mappers', (cb) => {
    const mapper = lib.map({
      one: 'prop', // get
      two: (input) => `${input.prop}2`, // sync
      three: (input, cb) => cb(null, `${input.prop}3`), // async
      four: ['prop', (input) => input.toLowerCase()], // seq
      five: {a: 'prop', b: 'prop'} // map
    });
    mapper({prop: 'A'}, (err, res) => {
      assert(!err);
      assert.deepStrictEqual(res, {
        one: 'A',
        two: 'A2',
        three: 'A3',
        four: 'a',
        five: {a: 'A', b: 'A'}
      });
      cb();
    });
  });

});

describe('normalize(...)', () => {
  describe('normalize(string)', () => {
    it('should be an async mapper', () => {
      assertAsyncMapper(lib.normalize('123'));
    });

    it('should return get(string)', (cb) => {
      lib.normalize('a')({a: 'a'}, (err, res) => {
        assert(!err);
        assert.strictEqual(res, 'a');
        cb();
      })
    });
  });

  describe('normalize(func)', () => {
    it('should be an async mapper', () => {
      assertAsyncMapper(lib.normalize(() => 123));
    });

    it('should asyncify function if it is a sync mapper (arguments.length < 2)', (cb) => {
      lib.normalize((input) => input.toLowerCase())('A', (err, res) => {
        assert(!err);
        assert.strictEqual(res, 'a');
        cb();
      });
    });

    it('should return function as is if it is an async mapper (i.e. arguments.length >= 2)', () => {
      const mapper = (input, cb) => cb(null, input.toLowerCase());
      assert.strictEqual(lib.normalize(mapper), mapper);
    });
  });

  describe('normalize(arr)', () => {
    it('should be an async mapper', () => {
      assertAsyncMapper(lib.normalize(() => 123));
    });

    it('should return seq(arr)', (cb) => {
      lib.normalize(['prop', input => input.toLowerCase()])({prop: 'A'}, (err, res) => {
        assert(!err);
        assert.strictEqual(res, 'a');
        cb();
      });
    });
  });

  describe('normalize(obj)', () => {
    it('should be an async mapper', () => {
      assertAsyncMapper(lib.normalize(() => 123));
    });

    it('should return map(arr)', (cb) => {
      lib.normalize({lower: input => input.toLowerCase(), upper: input => input.toUpperCase()})('a', (err, res) => {
        assert(!err);
        assert.deepStrictEqual(res, {lower: 'a', upper: 'A'});
        cb();
      });
    });
  });

  describe('should throw an error on unsupported types', () => {
    it('number', () => assert.throws(() => lib.normalize(123), Error));
    it('boolean', () => assert.throws(() => lib.normalize(true), Error));
  });
});