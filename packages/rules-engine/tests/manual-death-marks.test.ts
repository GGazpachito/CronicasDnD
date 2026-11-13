import { describe, expect, it } from 'vitest';
import { calculateGuidedFighter, type GuidedFighterInput } from '../src/guided';
import { applyAdventureAction, initialAdventureState, setManualDeathSaveMark, validateAdventureState } from '../src/adventure';
import { makeCharacterSnapshot, validateCharacterSnapshot } from '../src/persistence';

const input: GuidedFighterInput = {
  name: 'Prueba de marcas', level: 1, background: 'soldier', species: 'human',
  assignedAbilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
  increaseMode: 'two_plus_one', plusTwoAbility: 'strength', plusOneAbility: 'constitution',
  fighterSkills: ['perception', 'survival'], humanSkill: 'investigation', humanFeat: 'tough', humanSize: 'medium',
  armor: null, shield: false,
};
const sheet = calculateGuidedFighter(input).sheet;
const initial = () => initialAdventureState(sheet);

describe('Actualización 41.4: marcas manuales de salvaciones de muerte', () => {
  it('puede marcar y desmarcar cada posición individualmente', () => {
    const one = setManualDeathSaveMark(initial(), sheet, 'successes', 1, true);
    expect(one.manualDeathMarks?.successes).toEqual([false, true, false]);
    const two = setManualDeathSaveMark(one, sheet, 'failures', 2, true);
    expect(two.manualDeathMarks?.failures).toEqual([false, false, true]);
    const reset = setManualDeathSaveMark(two, sheet, 'successes', 1, false);
    expect(reset.manualDeathMarks?.successes).toEqual([false, false, false]);
    expect(reset.manualDeathMarks?.failures).toEqual([false, false, true]);
  });

  it('permite marcar los tres éxitos y tres fallos sin activar consecuencias automáticas', () => {
    let state = initial();
    for (let index = 0; index < 3; index++) {
      state = setManualDeathSaveMark(state, sheet, 'successes', index, true);
      state = setManualDeathSaveMark(state, sheet, 'failures', index, true);
    }
    expect(state.manualDeathMarks?.successes).toEqual([true, true, true]);
    expect(state.manualDeathMarks?.failures).toEqual([true, true, true]);
    expect(state.survival?.death).toEqual(initial().survival?.death);
    expect(state.fighter.hitPoints).toEqual(initial().fighter.hitPoints);
    expect(validateAdventureState(state, sheet).manualDeathMarks).toEqual(state.manualDeathMarks);
  });

  it('no modifica el estado recibido ni altera otros datos de la partida', () => {
    const before = initial();
    const serialized = JSON.stringify(before);
    const after = setManualDeathSaveMark(before, sheet, 'failures', 0, true);
    expect(JSON.stringify(before)).toBe(serialized);
    expect(after.fighter).toEqual(before.fighter);
    expect(after.combat).toEqual(before.combat);
    expect(after.survival).toEqual(before.survival);
  });

  it('las marcas se conservan tras acciones de aventura', () => {
    const marked = setManualDeathSaveMark(initial(), sheet, 'successes', 0, true);
    const damaged = applyAdventureAction(marked, { type: 'damage', amount: 3 }, sheet).state;
    expect(damaged.manualDeathMarks).toEqual(marked.manualDeathMarks);
    expect(damaged.survival?.death).toEqual(marked.survival?.death);
  });

  it('las marcas se guardan y se recuperan en personajes con formato v2', () => {
    const marked = setManualDeathSaveMark(initial(), sheet, 'failures', 1, true);
    const snapshot = makeCharacterSnapshot(input, marked);
    const recovered = validateCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(recovered.adventure.manualDeathMarks?.failures).toEqual([false, true, false]);
  });

  it('los personajes antiguos sin marcas siguen cargando sin migraciones', () => {
    const recovered = validateCharacterSnapshot(JSON.parse(JSON.stringify(makeCharacterSnapshot(input))));
    expect(recovered.adventure.manualDeathMarks).toBeUndefined();
  });

  it('rechaza índices, tipos y formatos de marcadores inválidos', () => {
    expect(() => setManualDeathSaveMark(initial(), sheet, 'successes', 3, true)).toThrow();
    expect(() => setManualDeathSaveMark(initial(), sheet, 'failures', -1, true)).toThrow();
    expect(() => setManualDeathSaveMark(initial(), sheet, 'successes', 0, 1 as never)).toThrow();
    expect(() => setManualDeathSaveMark(initial(), sheet, 'unknown' as never, 0, true)).toThrow();
    expect(() => validateAdventureState({ ...initial(), manualDeathMarks: { successes: [true, false], failures: [false, false, false] } }, sheet)).toThrow();
    expect(() => validateAdventureState({ ...initial(), manualDeathMarks: { successes: [true, false, false], failures: [false, 1, false] } }, sheet)).toThrow();
  });
});
