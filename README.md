# tcomb-generate

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![npm version](https://badge.fury.io/js/tcomb-generate.svg)](https://badge.fury.io/js/tcomb-generate)

`tcomb-generate` convert [`tcomb` type](https://github.com/gcanti/tcomb) to [jsverify arbitrary](https://github.com/jsverify/jsverify).

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Background

Property-based testing is very awesome approach for analyze and verification program. But this approach requires the writing of generators for all datatypes in our program. This process is very time-consuming, error-prone and not DRY.

Example:

```js
import * as t from 'tcomb'

const AsteroidType = t.interface({
    type: t.enums.of('asteroid'),
    location: t.tuple([t.Number, t.Number, t.Number]),
    mass: t.Number,
})

const AsteroidArbitrary = jsc.record({
    type: jsc.constant('asteroid'),
    location: jsc.tuple(jsc.number, jsc.number, jsc.number),
    mass: jsc.number
})
```

But with `tcomb-generate` we can get `AsteroidArbitrary` from `AsteroidType`:

```js
import { makeJsverifyArbitrary } from 'tcomb-generate'
const AsteroidType = t.interface({
    type: t.enums.of('asteroid'),
    location: t.tuple([t.Number, t.Number, t.Number]),
    mass: t.Number,
})
const AsteroidArbitrary = makeJsverifyArbitrary(AsteroidType)
```

## Install

```
npm install --save tcomb-generate
```

## Usage

- [Base tcomb type and combinator](https://github.com/typeetfunc/tcomb-generate/blob/master/src/index.spec.ts)
- [Refinement tcomb type](https://github.com/typeetfunc/tcomb-generate/blob/master/src/custom.spec.ts)

## API

- `makeJsverifyArbitrary(type: Type<any>): jsc.Arbitrary<any>` - convert `tcomb` type to `jsverify` arbitrary
- `addTypeToRegistry(name: string, (x: Type<any>) => jsc.Arbitrary<any>): void` - add new generator for type with [name](https://github.com/gcanti/tcomb/blob/master/docs/API.md#the-meta-object)
- `addTypeToIntersectRegistry(names: string[], generator: (x: Type<any>) => jsc.Arbitrary<any>): void)`  - add new generator for custom `t.intersection` types. TODO example
- `generateAndCheck(rt: Type<any>, opts?: jsc.Options): () => void` - run `jsc.assert` for property `type.is(generatedData)` for all `generatedData` obtained from `makeJsverifyArbitrary(type)`. Uses for verification custom generators for custom named type. See [example](https://github.com/typeetfunc/tcomb-generate/blob/master/src/custom.spec.ts#L112-L118) in tests. 

## Contribute

PRs accepted.

If you had questions just make issue or ask them in [my telegram](https://telegram.me/bracketsarrows)

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.


## License

MIT © typeetfunc