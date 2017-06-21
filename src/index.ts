import * as jsc from 'jsverify';
import * as t from 'tcomb';
import { flatten, every, some, find, mapValues, has, keys } from 'lodash';

function identity(x: any) {
    return x;
}

function guardEvery(rts, x) {
  return every(rts, rt => (rt as any).is(x))
}

function findIntersectInRegistry(intersectees, registry, getTag) {
  return registry.reduce(
    (acc, [setTags, func]) => {
      if (every(intersectees, intersect => setTags.has(getTag(intersect)))){
        return func;
      }
      return acc;
    },
    null
  );
}

function defaultIntersectHandle({ meta }) {
  const allIntersectees = jsc.tuple(
    meta.types.map(makeJsverifyArbitrary)
  );

  return jsc.suchthat(
    allIntersectees,
    tuple => some(tuple, x => guardEvery(meta.types, x))
  )
  .smap(
    tuple => find(tuple, x => guardEvery(meta.types, x)),
    identity
  );
}

const CUSTOM_REGISTRY = {
  Any: () => jsc.json,
  Array: () => jsc.array(jsc.json),
  Boolean: () => jsc.bool,
  Date: () => jsc.datetime,
  Error: () => jsc.string.smap(str => new Error(str), err => err.message),
  Function: () => jsc.fn(jsc.json),
  Integer: () => jsc.integer,
  Nil: () => jsc.elements([null, undefined]),
  Number: () => jsc.number,
  Object: () => jsc.dict(jsc.json),
  String: () => jsc.string
};
const CUSTOM_INTERSECT_REGISTRY: any[] = [];
const INTERSECT_REGISTRY = [
  [new Set(['interface']), ({ meta }) => jsc.tuple(meta.types.map(intersect => makeJsverifyArbitrary(intersect)))
    .smap(tupleOfTypes => tupleOfTypes.reduce(
      (acc, item) => Object.assign(acc, item)
    ), identity)
  ],
  [new Set(['union']),  ({ meta }) => {
    const alternatives = flatten(
      meta.types.map(intersect => intersect.alternatives)
    )
    const allAltArb = jsc.tuple(alternatives.map(makeJsverifyArbitrary))

    return jsc.bless({
      ...allAltArb,
      generator: allAltArb.generator.flatmap(tuple => {
        const onlyIntersectees = tuple.filter(
          x => guardEvery(meta.types, x)
        )

        return jsc.elements(onlyIntersectees).generator;
      })
    })
  }]
];


const REGISTRY = {
  interface: ({ meta }) => jsc.record(
    mapValues(meta.props, makeJsverifyArbitrary)
  ),
  maybe: ({ meta }) => makeJsverifyArbitrary(t.union([t.Nil, meta.type])),
  struct: Spec => makeJsverifyArbitrary(
    t.interface(
      mapValues(
        Spec.meta.props,
        (val, key) => has(Spec.meta.defaultProps, key) ? t.maybe(val) : val
      ), {
        name: Spec.meta.name,
        strict: Spec.meta.strict
      }
    )
  )
    .smap(
      pojo => Spec(Object.assign(pojo, Spec.meta.defaultProps)),
      identity
    ),
  enums: ({ meta }) => jsc.elements(keys(meta.map)),
  list: ({ meta }) => jsc.array(makeJsverifyArbitrary(meta.type)),
  tuple: ({ meta }) => jsc.tuple(meta.types.map(component => makeJsverifyArbitrary(component))),
  union: ({ meta }) => jsc.oneof(meta.types.map(alternative => makeJsverifyArbitrary(alternative))),
  dictionary: ({ meta }) => jsc.dict(makeJsverifyArbitrary(meta.codomain)),
  func: ({ meta }) => jsc.fn(makeJsverifyArbitrary(meta.codomain)),
  irreducible: ({ meta }) => jsc.suchthat(
    jsc.json,
    meta.predicate
  ),
  subtype: ({ meta }) => jsc.suchthat(
    makeJsverifyArbitrary(meta.type),
    meta.predicate
  ),
  intersection: ({ meta }) => {
    const handler = findIntersectInRegistry(
      meta.types,
      CUSTOM_INTERSECT_REGISTRY,
      x => x.meta.name
    ) ||
    findIntersectInRegistry(
      meta.types,
      INTERSECT_REGISTRY,
      x => x.meta.kind
    ) || defaultIntersectHandle;

    return handler({ meta });
  }
};

export function makeJsverifyArbitrary<T extends t.Type<any>>(type: T): jsc.Arbitrary<any> {
  if (type.meta.name && CUSTOM_REGISTRY.hasOwnProperty(type.meta.name)) {
    return CUSTOM_REGISTRY[type.meta.name](type);
  }
  if (REGISTRY.hasOwnProperty(type.meta.kind)) {
      return REGISTRY[type.meta.kind](type);
  }
  throw new Error('Can not generate this type');
}

export function addTypeToRegistry<T extends t.Type<any>>(name: string, generator: (x: T) => jsc.Arbitrary<any>): void {
  CUSTOM_REGISTRY[name] = generator;
}

export function addTypeToIntersectRegistry<T extends t.Type<any>>(tags: string[], generator: (x: T) => jsc.Arbitrary<any>): void {
  CUSTOM_INTERSECT_REGISTRY.push([
    new Set(tags), generator
  ]);
}

export function generateAndCheck<T extends t.Type<any>>(rt: T, opts?: jsc.Options) {
  return () => {
    const arbitrary = makeJsverifyArbitrary(rt)
    jsc.assert(jsc.forall(arbitrary, function arbitraryIsChecked(anything) {
      rt(anything)
      return true;
    }), opts)
  };
}
