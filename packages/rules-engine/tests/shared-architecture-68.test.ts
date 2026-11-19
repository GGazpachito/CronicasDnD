import {describe,it,expect} from 'vitest';
import {WIZARD_SPELL_RULES} from '../src/wizard-spell-details';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS} from '../src/warlock-spells';
import {SHARED_SPELL_RULES,SHARED_CLASS_SPELL_LISTS,WIZARD_SPELL_IDS,WARLOCK_SPELL_IDS} from '../src/shared-spell-catalog';
import {EMPTY_COMPANION,validateCompanionSheets} from '../src/companions';
import {rollAbilityScore4d6,DEFAULT_POINT_BUY,POINT_BUY_EXAMPLE,pointBuySpent} from '../src/ability-generation';
import {makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,initialWarlockOneState,type GuidedWarlockInput} from '../src/warlock';

const warlock:GuidedWarlockInput={classId:'warlock',level:1,name:'Brujo de prueba',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',warlockSkills:['arcana','deception'],
 equipmentChoice:'equipment',cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade']};

describe('Paso 68: hoja común, biblioteca y compañeros',()=>{
 it('la biblioteca integra todas las fichas de Mago y Brujo sin duplicados',()=>{
  const ids=SHARED_SPELL_RULES.map(spell=>spell.id);
  expect(ids.length).toBe(new Set(ids).size);
  for(const spell of WIZARD_SPELL_RULES)expect(ids).toContain(spell.id);
  for(const spell of [...WARLOCK_LEVEL_ONE_CANTRIPS,...WARLOCK_LEVEL_ONE_SPELLS])expect(ids).toContain(spell.id);
  expect(SHARED_CLASS_SPELL_LISTS.map(list=>list.id)).toEqual(['wizard','warlock']);
  expect(WIZARD_SPELL_IDS.size).toBe(WIZARD_SPELL_RULES.length);
  expect(WARLOCK_SPELL_IDS.size).toBe(27);
 });
 it('compra de puntos comienza en 8, respeta presupuesto y 4d6 descarta el menor',()=>{
  expect(Object.values(DEFAULT_POINT_BUY)).toEqual([8,8,8,8,8,8]);
  expect(pointBuySpent(DEFAULT_POINT_BUY)).toBe(0);
  expect(pointBuySpent(POINT_BUY_EXAMPLE)).toBe(27);
  let index=0;const dice=[1,6,4,5];
  expect(rollAbilityScore4d6(()=>dice[index++])).toEqual({dice,discarded:1,total:15});
 });
 it('valida fichas manuales y rechaza datos dañados o repetidos',()=>{
  const companion={...EMPTY_COMPANION,id:'manual-1',name:'Búho vigía',attacks:[{id:'picotazo',name:'Picotazo',attackBonus:3,damage:'1d4 perforante',notes:''}]};
  expect(validateCompanionSheets([companion])).toHaveLength(1);
  expect(()=>validateCompanionSheets([companion,companion])).toThrow(/repetido/i);
  expect(()=>validateCompanionSheets([{...companion,hitPoints:4,hitPointsMaximum:3}])).toThrow(/puntos de golpe/i);
  expect(()=>validateCompanionSheets([{...companion,name:''}])).toThrow(/nombre/i);
 });
 it('el guardado de Brujo conserva compañeros y marcadores de muerte; el anterior sigue cargando',()=>{
  const companion={...EMPTY_COMPANION,id:'manual-2',name:'Montura'};
  const input={...warlock,companions:[companion]};
  const old=initialWarlockOneState(input);
  const withMarks={...old,manualDeathMarks:{successes:[true,false,false] as const,failures:[false,true,false] as const}};
  const saved=makeWarlockCharacterSnapshot(input,withMarks);
  const loaded=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(loaded.input.companions?.[0].name).toBe('Montura');
  expect(loaded.warlockState.manualDeathMarks?.successes[0]).toBe(true);
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(warlock,old)))).input.companions).toBeUndefined();
 });
});
