import { describe, expect, it } from 'vitest';
import { parseAdvancedModifier, resolveNumericModifiers, resolveRollMode } from '../src/modifiers';

const context = { classLevels: { fighter: 3 } };
const numeric = (id: string, value: number, extras: Record<string, unknown> = {}) => ({
  type: 'numeric_modifier', effectId: id, sourceRevisionId: `source:${id}`, target: 'initiative',
  when: { type: 'always' }, operation: 'add', value, group: `group_${id}`, stacking: 'sum', priority: 0, ...extras,
});
const roll = (id: string, mode: string, extras: Record<string, unknown> = {}) => ({
  type: 'roll_mode', effectId: id, sourceRevisionId: `source:${id}`, target: 'initiative', when: { type: 'always' }, mode, ...extras,
});

describe('modificadores avanzados', () => {
  it('suma bonificadores independientes', () => expect(resolveNumericModifiers(3, 'initiative', [numeric('a',2),numeric('b',3)], context).value).toBe(8));
  it('aplica el mayor valor dentro de un grupo highest', () => {
    const modifiers = [numeric('a',2,{group:'magical',stacking:'highest'}),numeric('b',4,{group:'magical',stacking:'highest'})];
    expect(resolveNumericModifiers(3,'initiative',modifiers,context).value).toBe(7);
    expect(resolveNumericModifiers(3,'initiative',[...modifiers].reverse(),context).value).toBe(7);
  });
  it('aplica el menor valor dentro de un grupo lowest', () => {
    expect(resolveNumericModifiers(4,'initiative',[numeric('a',-1,{group:'penalty',stacking:'lowest'}),numeric('b',-3,{group:'penalty',stacking:'lowest'})],context).value).toBe(1);
  });
  it('sustituye la base antes de sumar y elige mayor prioridad', () => {
    const a=numeric('a',10,{operation:'replace_base',priority:1});
    const b=numeric('b',12,{operation:'replace_base',priority:2});
    const result=resolveNumericModifiers(3,'initiative',[a,b,numeric('c',2)],context);
    expect(result.effectiveBase).toBe(12);
    expect(result.value).toBe(14);
  });
  it('rechaza reemplazos contradictorios con misma prioridad', () => expect(()=>resolveNumericModifiers(3,'initiative',[numeric('a',10,{operation:'replace_base'}),numeric('b',11,{operation:'replace_base'})],context)).toThrow());
  it('rechaza políticas incompatibles dentro de un grupo', () => expect(()=>resolveNumericModifiers(3,'initiative',[numeric('a',2,{group:'x',stacking:'sum'}),numeric('b',4,{group:'x',stacking:'highest'})],context)).toThrow());
  it('valida y aplica condiciones de clase', () => {
    const conditional=numeric('a',2,{when:{type:'class_level_at_least',classId:'fighter',value:3}});
    expect(resolveNumericModifiers(3,'initiative',[conditional],context).value).toBe(5);
    expect(resolveNumericModifiers(3,'initiative',[conditional],{classLevels:{fighter:2}}).value).toBe(3);
  });
  it('no aplica objetivos diferentes', () => expect(resolveNumericModifiers(3,'initiative',[numeric('a',5,{target:'armor_class'})],context).value).toBe(3));
  it('no apila varias ventajas', () => expect(resolveRollMode('initiative',[roll('a','advantage'),roll('b','advantage')],context).mode).toBe('advantage'));
  it('cancela ventaja y desventaja aun siendo dos contra una', () => expect(resolveRollMode('initiative',[roll('a','advantage'),roll('b','advantage'),roll('c','disadvantage')],context).mode).toBe('normal'));
  it('aplica desventaja cuando solo existe esa condición', () => expect(resolveRollMode('initiative',[roll('a','disadvantage')],context).mode).toBe('disadvantage'));
  it('rechaza operaciones, modos y campos desconocidos', () => {
    expect(()=>parseAdvancedModifier(roll('a','banana'))).toThrow();
    expect(()=>parseAdvancedModifier({...numeric('a',2),run:'evil'})).toThrow();
    expect(()=>parseAdvancedModifier(numeric('a',Infinity))).toThrow();
  });
  it('rechaza efectos duplicados', () => expect(()=>resolveRollMode('initiative',[roll('a','advantage'),roll('a','advantage')],context)).toThrow());
  it('no muta los objetos de entrada', () => {
    const effects=[numeric('a',2)];
    const snapshot=JSON.stringify(effects);
    resolveNumericModifiers(3,'initiative',effects,context);
    expect(JSON.stringify(effects)).toBe(snapshot);
  });
});
