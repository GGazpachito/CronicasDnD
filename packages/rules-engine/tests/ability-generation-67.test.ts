import {describe,expect,it} from 'vitest';
import {DEFAULT_POINT_BUY,pointBuySpent,rollD20AbilityScores,validateGeneratedAbilities} from '../src/ability-generation';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,type GuidedWarlockInput} from '../src/warlock';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {collectWarlockTraits} from '../src/warlock-traits';

const scores={strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15} as const;
const warlock:GuidedWarlockInput={classId:'warlock',level:1,name:'Nox',background:'acolyte',species:'dwarf',assignedAbilities:scores,
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',warlockSkills:['arcana','deception'],
 equipmentChoice:'equipment',cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade']};
const wizard:GuidedWizardInput={classId:'wizard',level:1,name:'Ada',background:'sage',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};

describe('Paso 67: métodos comunes de características y hojas',()=>{
 it('mantiene por defecto la matriz estándar para personajes anteriores',()=>{
  expect(validateGeneratedAbilities(scores)).toEqual(scores);
  expect(()=>validateGeneratedAbilities({...scores,strength:15})).toThrow(/matriz estándar/i);
  expect(calculateWarlockOne(warlock).abilityScores.charisma).toBe(17);
  expect(calculateGuidedWizard(wizard).abilityScores.intelligence).toBe(17);
 });
 it('compra de puntos: coste exacto 27, límites por característica y exceso',()=>{
  expect(pointBuySpent(DEFAULT_POINT_BUY)).toBe(27);
  expect(pointBuySpent({strength:15,dexterity:15,constitution:15,intelligence:8,wisdom:8,charisma:8})).toBe(27);
  expect(validateGeneratedAbilities(DEFAULT_POINT_BUY,'point_buy')).toEqual(DEFAULT_POINT_BUY);
  expect(validateGeneratedAbilities({strength:8,dexterity:8,constitution:8,intelligence:8,wisdom:8,charisma:8},'point_buy')).toBeTruthy();
  expect(()=>validateGeneratedAbilities({strength:15,dexterity:15,constitution:15,intelligence:9,wisdom:8,charisma:8},'point_buy')).toThrow(/27/);
  expect(()=>validateGeneratedAbilities({...DEFAULT_POINT_BUY,strength:16},'point_buy')).toThrow(/8 a 15/);
 });
 it('los d20 usan dados válidos y las tiradas son reproducibles con generador de prueba',()=>{
  const rolls=[1,5,20,7,14,9];let index=0;
  expect(rollD20AbilityScores(()=>rolls[index++])).toEqual({strength:1,dexterity:5,constitution:20,intelligence:7,wisdom:14,charisma:9});
  expect(()=>validateGeneratedAbilities({...scores,charisma:21},'d20')).toThrow(/1 a 20/);
  expect(()=>rollD20AbilityScores(()=>0)).toThrow(/d20/);
  expect(()=>validateGeneratedAbilities(scores,'unknown' as never)).toThrow(/desconocido/);
 });
 it('Brujo: guarda y restaura método de compra, mantiene la subclase bloqueada y muestra rasgos comunes',()=>{
  const chosen={...warlock,abilityGenerationMethod:'point_buy' as const,assignedAbilities:DEFAULT_POINT_BUY};
  const view=calculateWarlockOne(chosen);
  const saved=makeWarlockCharacterSnapshot(chosen,initialWarlockOneState(chosen));
  const loaded=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(loaded.input.abilityGenerationMethod).toBe('point_buy');
  expect(view.abilityScores.strength).toBe(15);
  const traits=collectWarlockTraits(chosen,view).traits;
  expect(traits.some(trait=>trait.id==='warlock:invocation:pact_of_blade')).toBe(true);
  expect(traits.some(trait=>trait.group==='species')).toBe(true);
  expect(traits.some(trait=>trait.group==='feats')).toBe(true);
  expect(traits.some(trait=>trait.group==='subclass')).toBe(false);
 });
 it('Mago: persistencia estricta acepta compra y d20 y evita alteraciones posteriores',()=>{
  const chosen={...wizard,abilityGenerationMethod:'point_buy' as const,assignedAbilities:{...DEFAULT_POINT_BUY,intelligence:15}};
  // El cambio manual anterior excede presupuesto; no se puede guardar.
  expect(()=>calculateGuidedWizard(chosen)).toThrow(/27/);
  const valid={...wizard,abilityGenerationMethod:'point_buy' as const,assignedAbilities:DEFAULT_POINT_BUY};
  const snapshot=makeWizardCharacterSnapshot(valid,initialWizardOneState(valid));
  expect(validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(snapshot))).input.abilityGenerationMethod).toBe('point_buy');
  const rolled={...wizard,abilityGenerationMethod:'d20' as const,assignedAbilities:{strength:3,dexterity:12,constitution:13,intelligence:17,wisdom:10,charisma:5}};
  expect(calculateGuidedWizard(rolled).abilityScores.intelligence).toBe(19);
  expect(()=>calculateGuidedWizard({...rolled,assignedAbilities:{...rolled.assignedAbilities,intelligence:20}})).toThrow(/20/);
 });
});
