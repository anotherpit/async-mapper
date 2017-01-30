async-mapper
============

Library to asynchronously map one JS value to another JS value.
Typically, to convert some object received from API server to an object that conforms you internal ORM or something.

Why?
----

There are tons of nice libraries on `npm` to map JS values, but all of them consider only synchronous rules (e.g. parse integer from string, rename object property, lowercase the string, sum all float items of the array, etc.). But we often bump into need to do some async check, or to read something from DB or third-party API to properly convert received data. After all, NodeJS is all about being asynchronous, and that's what we love it for, right? So we need async mapping rules.

Why callbacks, not Promises?
----------------------------

Well, Promises would be much nicer and cleaner, sure. But this library was born from the project that heavily uses [famous `async` library](http://caolan.github.io/async/). Hence this old-school callback-based style. Sorry for inconvenience, hipsters.

Ah, yeah, while being partly inspired by `async` library, `async-mapper` doesn't depend on it. It actually doesn't depend on any other library. I believe you can bloat you `node_modules` yourself, without my help.

Usage
-----

```js

import assert from 'assert';
import * as lib from 'async-mapper';

const source = {
    name: 'John Doe',
    pets: [{name: 'Dog'}, {name: 'Cat'}]
};

const rules = {
    // exact value no matter what the source is
    'constant': lib.exactly(123),

    // get object property by name
    'byName': 'name',

    // ...or by path traversing nested objects and/or arrays
    'byPath': 'pets.1.name',

    // arbitrary synchronous rule (1 argument)
    'syncRule': (source) => source.name,

    // or arbitrary asynchronous rule (2 arguments)
    'asyncRule': (source, cb) => cb(null, source.name),

    // combine rules in sequence
    'sequenceOfRules': lib.seq([
        'name',
        (input) => input.toUpperCase(),
        (input, cb) => `${input}${input.lenght}`
    ]),

    // combine rules in parallel map
    'mapOfRules': lib.map({
        'lower': [
            'name',
            (input) => input.toLowerCase()
        ],
        'upper': [
            'name',
            (input) => input.toUpperCase()
        ]
    })
};

const result = lib.map(rules)(source);

assert.deepStrictEqual(result, {
    constant: 123,
    byName: 'John Doe',
    byPath: 'Cat',
    syncRule: 'John Doe',
    asyncRule: 'John Doe',
    sequenceOfRules: 'JOHN DOE8',
    mapOfRules: {
        lower: 'john doe',
        upper: 'JOHN DOE
    }
});

```

More usage examples in [tests](./test).

License
-------
[MIT](./LICENSE)

