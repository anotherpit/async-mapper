export function exactly(val) {
  return _asyncify(() => val);
}

export function get(path) {
  return _asyncify(input => _get(input, path));
}

export function normalize(spec) {
  const type = typeof spec;
  switch (type) {
    case 'string':
      return get(spec);
    case 'function':
      return (spec.length > 1) ? spec : _asyncify(spec);
    case 'object':
      return (Array.isArray(spec)) ? seq(spec) : map(spec);
    default:
      throw new Error(`Invalid mapper spec: string, function, array or object expected, but ${type} given`);
  }
}

export function seq(specs) {
  const mappers = (specs || []).map(normalize);
  return (input, cb) => {
    let res = input;
    _seq(mappers, (mapper, cb) => {
      mapper(res, (err, mapped) => {
        if (err) { return cb(err); }
        res = mapped;
        cb();
      });
    }, (err) => cb(err, res));
  };
}

export function map(specs) {
  const mappers =
    Object.keys(specs).reduce((res, key) => {
      res[key] = normalize(specs[key]);
      return res;
    }, {});

  const makeTasks = _asyncify((input) => (
    Object.keys(mappers).reduce((tasks, key) => {
      tasks[key] = _apply(mappers[key], input);
      return tasks;
    }, {})
  ));

  return (input, cb) => {
    makeTasks(input, (err, tasks) => {
      if (err) { return cb(err); }
      return _map(tasks, cb);
    });
  };
}

export function _asyncify(fn) {
  return (input, cb) => {
    let res;
    try {
      res = fn(input);
    } catch (e) {
      return cb(e);
    }
    cb(null, res);
  }
}

function _apply(fn, input) {
  return (cb) => fn(input, cb);
}

function _seq(items, iterator, cb) {
  if (!items || !items.length) { return cb(null); }
  iterator(items[0], (headErr, head) => {
    if (headErr) { return cb(headErr); }
    _seq(items.splice(1), iterator, (tailErr, tail) => {
      if (tailErr) { return cb(tailErr); }
      cb(null, [head].concat(tail));
    });
  });
}

function _map(tasks, cb) {
  const len = Object.keys(tasks).length;
  const res = {};
  let err;
  Object.keys(tasks).forEach((key) => {
    if (err) { return; }
    tasks[key]((itemErr, item) => {
      if (err) { return; }
      if (itemErr) {
        err = itemErr;
        return cb(err);
      }
      res[key] = item;
      if (!err && Object.keys(res).length === len) {
        cb(null, res);
      }
    });
  });
}

function _get(input, path) {
  const parts = (typeof path === 'string') ? path.split('.') : path;
  let res = input;
  while (typeof res === 'object' && res && parts.length) {
    res = res[parts.shift()];
  }
  return res;
}