import { describe, expect, it } from 'vitest';
import { calculateGuidedFighter, type GuidedFighterInput } from '../src/guided';
import { applyAdventureAction, initialAdventureState, validateAdventureState } from '../src/adventure';
import { makeCharacterSnapshot, validateCharacterSnapshot } from '../src/persistence';
import { startCharacterTurn } from '../src/combat';

const input: GuidedFighterInput = {
  name: 'Aldric', level: 10, background: 'soldier', species: 'human',
  assignedAbilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
  increaseMode: 'two_plus_one', plusTwoAbility: 'strength', plusOneAbility: 'constitution',
  fighterSkills: ['perception', 'survival'], humanSkill: 'investigation', humanFeat: 'tough', humanSize: 'medium',
  armor: 'chain_mail', shield: false,
  level4Improvement: { mode: 'plus_two', first: 'strength' },
  level6Improvement: { mode: 'plus_two', first: 'constitution' },
  level8Improvement: { mode: 'plus_two', first: 'wisdom' },
  martial: { fightingStyle: 'defense', additionalFightingStyle: 'dueling', weaponMasteries: ['greatsword', 'flail', 'javelin', 'shortsword', 'longsword'], startingPackage: 'a' },
  backgroundEquipment: { startingPackage: 'a', gamingSet: 'dice_set' },
};
const sheet = () => calculateGuidedFighter(input).sheet;
const start = () => initialAdventureState(sheet());
const apply = (state: ReturnType<typeof start>, action: Parameters<typeof applyAdventureAction>[1]) =>
  applyAdventureAction(state, action, sheet()).state;

describe('Actualización 39: una única sesión de partida', () => {
  it('el estado inicial no tiene inspiración heroica', () => {
    expect(start().combat.heroicInspiration).toBeUndefined();
  });
  it('anotar y gastar inspiración utiliza combat.heroicInspiration y conserva PG y recursos', () => {
    const before = start();
    const gained = apply(before, { type: 'gain_heroic_inspiration' });
    expect(gained.combat.heroicInspiration).toBe(true);
    expect(gained.fighter).toEqual(before.fighter);
    const spent = apply(gained, { type: 'spend_heroic_inspiration' });
    expect(spent.combat.heroicInspiration).toBe(false);
    expect(() => apply(spent, { type: 'spend_heroic_inspiration' })).toThrow();
    expect(() => apply(gained, { type: 'gain_heroic_inspiration' })).toThrow();
  });
  it('no se aceptan propiedades ajenas en acciones de inspiración', () => {
    expect(() => apply(start(), { type: 'gain_heroic_inspiration', cheat: 1 } as never)).toThrow();
  });
  it('puede retirar PG temporales sin alterar la vida ni los recursos', () => {
    const before = apply(start(), { type: 'temporary_hp', amount: 12 });
    const after = apply(before, { type: 'clear_temporary_hp' });
    expect(after.temporaryHitPoints).toBe(0);
    expect(after.fighter).toEqual(before.fighter);
  });
  it('daño, curación y Segundo aliento mantienen la regla de PG máximos', () => {
    const damaged = apply(start(), { type: 'damage', amount: 20 });
    const healed = apply(damaged, { type: 'heal', amount: 4 });
    const wind = apply(healed, { type: 'second_wind', d10: 10 });
    expect(wind.fighter.hitPoints.current).toBeLessThanOrEqual(sheet().maximumHitPoints);
    expect(wind.fighter.resources.second_wind!.current).toBe(start().fighter.resources.second_wind!.current! - 1);
    expect(() => apply(wind, { type: 'second_wind', d10: 11 })).toThrow();
  });
  it('Acción súbita gastada se refleja en el mismo estado persistente', () => {
    const after = apply(start(), { type: 'action_surge' });
    expect(after.fighter.resources.action_surge!.current).toBe(0);
    expect(() => apply(after, { type: 'action_surge' })).toThrow();
  });
  it('Guerrero heroico y los controles de inspiración comparten exactamente el mismo campo', () => {
    const advanced = { ...start(), combat: startCharacterTurn(start().combat, true) };
    expect(advanced.combat.heroicInspiration).toBe(true);
    const spent = apply(advanced, { type: 'spend_heroic_inspiration' });
    expect(spent.combat.heroicInspiration).toBe(false);
  });
  it('la inspiración sobrevive al guardado v2 y no exige migración de BD', () => {
    const state = apply(start(), { type: 'gain_heroic_inspiration' });
    const saved = makeCharacterSnapshot(input, state);
    const loaded = validateCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
    expect(loaded.adventure.combat.heroicInspiration).toBe(true);
    expect(validateAdventureState(loaded.adventure, sheet()).combat.heroicInspiration).toBe(true);
  });
  it('los guardados anteriores sin el campo de inspiración siguen siendo válidos', () => {
    const previous = makeCharacterSnapshot(input, start());
    const loaded = validateCharacterSnapshot(JSON.parse(JSON.stringify(previous)));
    expect(loaded.adventure.combat.heroicInspiration).toBeUndefined();
  });
  it('el estado recibido por el motor no se modifica en el lugar', () => {
    const before = start(), serialized = JSON.stringify(before);
    apply(before, { type: 'gain_heroic_inspiration' });
    expect(JSON.stringify(before)).toBe(serialized);
  });
});
