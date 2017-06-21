import * as t from 'tcomb';
import { generateAndCheck } from './index';

describe('SpaceObject', () => {
    const Vector = t.tuple([t.Number, t.Number, t.Number])

    const Asteroid = t.interface({
        type: t.enums.of('asteroid'),
        location: Vector,
        mass: t.Number,
    })

    const Planet = t.interface({
        type: t.enums.of('planet'),
        location: Vector,
        mass: t.Number,
        population: t.Number,
        habitable: t.Boolean,
    })

    const Rank = t.enums.of([
      'captain',
      'first mate',
      'officer',
      'ensign'
    ])

    const CrewMember = t.interface({
        name: t.String,
        age: t.Number,
        rank: Rank,
        home: Planet,
    })

    const Ship = t.interface({
        type: t.enums.of('ship'),
        location: Vector,
        mass: t.Number,
        name: t.String,
        crew: t.list(CrewMember),
    })

    const SpaceObject = t.union([Asteroid, Planet, Ship])

    test('Vector', generateAndCheck(Vector));
    test('Asteroid', generateAndCheck(Asteroid));
    test('Rank', generateAndCheck(Rank));
    test('Ship', generateAndCheck(Ship));
    test('SpaceObject', generateAndCheck(SpaceObject));
});

