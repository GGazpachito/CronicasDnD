import { describe, expect, it } from 'vitest';
import { ARMORS, calculateArmorClass, calculateFighterHitPoints } from '../src/defense';

describe('PG máximos Guerrero 2024', () => {
  it('nivel 1, CON 14 -> 12', () => expect(calculateFighterHitPoints({fighterLevel:1,constitutionScore:14,method:'fixed'}).maximum).toBe(12));
  it('nivel 3 fijo, CON 14 -> 28', () => expect(calculateFighterHitPoints({fighterLevel:3,constitutionScore:14,method:'fixed'}).maximum).toBe(28));
  it('niveles posteriores tirados', () => expect(calculateFighterHitPoints({fighterLevel:3,constitutionScore:14,method:'rolled',rolls:[8,5]}).maximum).toBe(29));
  it('mínimo uno por cada nuevo nivel', () => expect(calculateFighterHitPoints({fighterLevel:3,constitutionScore:1,method:'fixed'}).gainsByLevel).toEqual([5,1,1]));
  it('CON actual afecta a todos los niveles', () => expect(calculateFighterHitPoints({fighterLevel:3,constitutionScore:16,method:'fixed'}).maximum).toBe(31));
  it('no permite nivel cero', () => expect(()=>calculateFighterHitPoints({fighterLevel:0,constitutionScore:14,method:'fixed'})).toThrow());
  it('rechaza dados fuera de d10', () => expect(()=>calculateFighterHitPoints({fighterLevel:2,constitutionScore:14,method:'rolled',rolls:[11]})).toThrow());
  it('exige una tirada por nivel', () => expect(()=>calculateFighterHitPoints({fighterLevel:3,constitutionScore:14,method:'rolled',rolls:[6]})).toThrow());
  it('no admite tiradas en método fijo', () => expect(()=>calculateFighterHitPoints({fighterLevel:2,constitutionScore:14,method:'fixed',rolls:[3]})).toThrow());
});

describe('CA 2024', () => {
  const base = {dexterityScore:16,strengthScore:16};
  it('sin armadura: 10 + DEX', () => expect(calculateArmorClass(base).value).toBe(13));
  it('cuero tachonado: 12 + DEX', () => expect(calculateArmorClass({...base,armor:'studded_leather'}).value).toBe(15));
  it('armadura media limita DEX a +2', () => expect(calculateArmorClass({...base,armor:'half_plate'}).value).toBe(17));
  it('armadura pesada ignora DEX', () => expect(calculateArmorClass({...base,armor:'chain_mail'}).value).toBe(16));
  it('escudo entrenado añade +2', () => expect(calculateArmorClass({...base,armor:'chain_mail',shieldEquipped:true,shieldTrained:true}).value).toBe(18));
  it('escudo sin entrenamiento no concede su bonificación', () => expect(calculateArmorClass({...base,shieldEquipped:true,shieldTrained:false}).value).toBe(13));
  it('bonificadores explícitos adicionales', () => expect(calculateArmorClass({...base,armor:'chain_mail',additionalBonus:1}).value).toBe(17));
  it('fórmula alternativa sin armadura', () => expect(calculateArmorClass({...base,alternateFormula:{id:'unarmored_defense',base:10,addDexterity:true,dexterityCap:null},additionalBonus:2}).value).toBe(15));
  it('no permite armadura y fórmula alternativa simultánea', () => expect(()=>calculateArmorClass({...base,armor:'leather',alternateFormula:{id:'x',base:10,addDexterity:true,dexterityCap:null}})).toThrow());
  it('advierte fuerza insuficiente en armadura pesada sin alterar CA', () => {
    const result=calculateArmorClass({...base,strengthScore:10,armor:'plate'});
    expect(result.value).toBe(18); expect(result.heavyArmorStrengthRequirementUnmet).toBe(true);
  });
  it('registra desventaja de Sigilo de armadura', () => expect(calculateArmorClass({...base,armor:'padded'}).stealthDisadvantageFromArmor).toBe(true));
  it('rechaza armadura inexistente', () => expect(()=>calculateArmorClass({...base,armor:'enchanted_tshirt' as any})).toThrow());
  it('contiene las 12 armaduras convencionales', () => expect(Object.keys(ARMORS)).toHaveLength(12));
});
