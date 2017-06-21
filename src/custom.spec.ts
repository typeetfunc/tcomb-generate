import * as t from 'tcomb'
import { generateAndCheck } from './index';
import * as jsc from 'jsverify';
import { range, zip } from 'lodash'
import { makeJsverifyArbitrary, addTypeToRegistry } from './index'

function contains(list, args, eqFn, lessFn, moreFn) {
  const finded = list.filter(i => args.item.is(i))
  const res = {
    needCount: args.count === undefined ? 1 : args.count,
    count: finded.length,
    item: args.item
  }
  if (res.needCount === res.count) {
    return eqFn(list, res)
  } else if (res.needCount > res.count) {
    return lessFn(list, res)
  } else if (res.needCount < res.count) {
    return moreFn(list, res)
  }
}

const ArrayWithContains = (arrRt, item, count) => {
  const args = {
    item,
    count
  };
  const predicate = list => {
    const res = contains(
      list, args,
      () => true,
      (_, res) => `Array contains less than ${res.needCount} items`,
      (_, res) => `Array contains more than ${res.needCount} items`
    );

    return res;
  }
  (predicate as any).args = args;
  return t.refinement(arrRt, predicate, contains.name);
}


function generatorContains(rt) {
  const { meta: { predicate, type } } = rt

  return makeJsverifyArbitrary(type).smap(coll => {
    const res = contains(
      coll, predicate.args,
      list => list,
      (list, res) => {
        const howMuch = res.needCount - res.count
        const idxs = list.length ?
          jsc.sampler(jsc.elements(range(list.length)))(howMuch) as any as number[] :
          range(howMuch)
        const elements = jsc.sampler(makeJsverifyArbitrary(res.item))(howMuch) as any[]
        zip(idxs, elements).forEach(([idx, element]) => {
          list.splice(idx, 0, element)
        });
        return list
      },
      (list, res) => {
        return list.reduce((acc, item) => {
          const isItem = res.item.is(item)
          if (!isItem || acc.count < res.needCount) {
            acc.list.push(item)
          }
          if (isItem) {
            acc.count++
          }
          return acc;
        }, {list: [], count: 0}).list
      }
    )
    return res;
  }, x => x)
}

addTypeToRegistry(contains.name, generatorContains)

describe('FamilyObject', () => {
  const StringOrVoid = t.maybe(t.String)
  const Fio = t.interface({
    firstname: StringOrVoid,
    lastname: StringOrVoid,
    middlename: StringOrVoid
  })
  const MemberWithRole = role => t.interface({
    role,
    fio: Fio,
    dependant: t.maybe(t.Boolean)
  })
  const Spouse = MemberWithRole(t.enums.of('spouse'))
  const NotSpouse = MemberWithRole(t.maybe(
    t.enums.of([
      'sibling',
      'child',
      'parent'
    ])
  ))
  const Member = t.union([Spouse, NotSpouse])
  const FamilyWithTypeAndMember = (type, countSpouse) => t.interface({
    type,
    members: ArrayWithContains(t.list(Member), Spouse, countSpouse)
  })
  const FamilyWithSpouse = FamilyWithTypeAndMember(
    t.enums.of('espoused'),
    1
  )
  const FamilyWithoutSpouse = FamilyWithTypeAndMember(
    t.maybe(
      t.enums.of([
      'single',
      'common_law_marriage'
      ])
    ),
    0
  )
  const membersWithSpouse = ArrayWithContains(t.list(Member), Spouse, 1)
  const FamilyObject = t.union([FamilyWithSpouse, FamilyWithoutSpouse])

  test('Fio', generateAndCheck(Fio))
  test('Member', generateAndCheck(Member))
  test('MemberWithSpouse', generateAndCheck(membersWithSpouse))
  test('FamilyWithSpouse', generateAndCheck(FamilyWithSpouse))
  test('FamilyWithoutSpouse', generateAndCheck(FamilyWithoutSpouse))
  test('FamilyObject', generateAndCheck(FamilyObject))
});

