import { describe, expect, it } from 'vitest';
import { combineD20Modes, resolveD20, rollD20, secureD20 } from '../src/d20';
import { calculateFighterSheet, type FighterCharacterInput } from '../src/sheet';

const base = (): FighterCharacterInput => ({
  id: 'fighter-test', name: 'Prueba', ruleset: 'dnd-2024', fighterLevel: 1,
  baseAbilities: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
  baseProficiencies: { skills: ['athletics'], savingThrows: ['strength', 'constitution'] },
  hpMethod: 'fixed', equipment: { armor: null, shieldEquipped: false, shieldTrained: true },
});

const rollModeModifier = (mode: 'advantage' | 'disadvantage') => ({
  type: 'roll_mode', effectId: `save-${mode}`, sourceRevisionId: 'test:1', target: 'saving_throws.wisdom',
  when: { type: 'always' }, mode,
});

describe('Paso 38: tiradas manuales de d20', () => {
  it('tira un dado normal y suma el modificador, incluso si es negativo', () => {
    expect(resolveD20(-2, 'normal', 'normal', [13])).toMatchObject({ dice: [13], chosen: 13, modifier: -2, total: 11 });
  });
  it('ventaja conserva ambos dados y utiliza el mayor', () => {
    expect(resolveD20(5, 'advantage', 'normal', [7, 19])).toMatchObject({ dice: [7, 19], chosen: 19, total: 24, mode: 'advantage' });
  });
  it('desventaja conserva ambos dados y utiliza el menor', () => {
    expect(resolveD20(5, 'normal', 'disadvantage', [18, 4])).toMatchObject({ dice: [18, 4], chosen: 4, total: 9, mode: 'disadvantage' });
  });
  it('fuentes opuestas se anulan, y un modo no se apila con otro idéntico', () => {
    expect(combineD20Modes('advantage', 'disadvantage')).toBe('normal');
    expect(combineD20Modes('disadvantage', 'advantage')).toBe('normal');
    expect(combineD20Modes('advantage', 'advantage')).toBe('advantage');
    expect(combineD20Modes('disadvantage', 'disadvantage')).toBe('disadvantage');
    expect(resolveD20(4, 'advantage', 'disadvantage', [12]).total).toBe(16);
  });
  it('la solicitud genera un dado en modo normal o dos en modo ventaja', () => {
    let calls = 0;
    const draw = () => (++calls === 1 ? 5 : 18);
    expect(rollD20(3, 'normal', 'normal', draw)).toMatchObject({ dice: [5], total: 8 });
    expect(calls).toBe(1);
    calls = 0;
    expect(rollD20(3, 'advantage', 'normal', draw)).toMatchObject({ dice: [5, 18], total: 21 });
    expect(calls).toBe(2);
  });
  it('rechaza resultados imposibles, modos inválidos y bonos no enteros', () => {
    expect(() => resolveD20(1, 'normal', 'normal', [0])).toThrow();
    expect(() => resolveD20(1, 'normal', 'normal', [21])).toThrow();
    expect(() => resolveD20(1, 'advantage', 'normal', [12])).toThrow();
    expect(() => resolveD20(1, 'normal', 'normal', [12, 15])).toThrow();
    expect(() => resolveD20(Number.NaN, 'normal', 'normal', [12])).toThrow();
    expect(() => combineD20Modes('invalid' as 'normal', 'normal')).toThrow();
    let called = false;
    expect(() => rollD20(1.5, 'normal', 'normal', () => { called = true; return 10; })).toThrow();
    expect(called).toBe(false);
  });
  it('el generador seguro siempre devuelve 1 a 20', () => {
    for (let i = 0; i < 100; i++) expect(secureD20()).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < 100; i++) expect(secureD20()).toBeLessThanOrEqual(20);
  });
  it('20 natural no decide automáticamente éxito en una prueba', () => {
    const r = resolveD20(0, 'normal', 'normal', [20]);
    expect(r.total).toBe(20);
    expect('automaticSuccess' in r).toBe(false);
  });
  it('la hoja expone modos de salvación calculados por efectos', () => {
    const plain = calculateFighterSheet(base());
    expect(plain.savingThrowRollModes.wisdom).toBe('normal');
    const extra = calculateFighterSheet({ ...base(), modifiers: [rollModeModifier('advantage')] });
    expect(extra.savingThrowRollModes.wisdom).toBe('advantage');
    expect(extra.savingThrowBonuses.wisdom).toBe(1);
    const cancel = calculateFighterSheet({ ...base(), modifiers: [rollModeModifier('advantage'), { ...rollModeModifier('disadvantage'), effectId: 'cancel' }] });
    expect(cancel.savingThrowRollModes.wisdom).toBe('normal');
  });
});
