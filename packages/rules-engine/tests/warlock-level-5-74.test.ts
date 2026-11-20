import {describe,it,expect} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,warlockPactSlots,warlockLongRest,warlockShortRest,WARLOCK_INVOCATIONS,type GuidedWarlockInput} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_LEVEL_THREE_SPELLS,WARLOCK_FIEND_LEVEL_FIVE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_THREE,warlockSpellRule} from '../src/warlock-spells';
import {wizardSpellRule} from '../src/wizard-spell-details';
import {SHARED_SPELL_RULES,SHARED_CLASS_SPELL_LISTS} from '../src/shared-spell-catalog';
import {collectWarlockTraits} from '../src/warlock-traits';

const one:GuidedWarlockInput={classId:'warlock',level:1,name:'Auditora',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',warlockSkills:['arcana','deception'],
 equipmentChoice:'equipment',cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],
 invocations:['pact_of_blade'],pactWeaponId:'sickle'};
const two=advanceWarlockToLevelTwo(one,initialWarlockOneState(one),{
 invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:one.cantripIds,
 preparedIds:['hex','charm_person','armor_of_agathys'],level2HitDieRoll:5});
const three=advanceWarlockToLevelThree(two.input,two.state,{subclassId:'fiend',
 invocations:two.input.invocations,cantripIds:two.input.cantripIds,
 preparedIds:['hex','charm_person','armor_of_agathys','misty_step'],level3HitDieRoll:5});
const four=advanceWarlockToLevelFour(three.input,three.state,{
 invocations:three.input.invocations,cantripIds:[...three.input.cantripIds,'friends'],
 preparedIds:[...three.input.preparedIds,'hold_person'],level4HitDieRoll:5,
 level4Improvement:{mode:'plus_two',first:'charisma'}});
const choose={invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'] as const,
 cantripIds:four.input.cantripIds,preparedIds:[...four.input.preparedIds,'counterspell'],level5HitDieRoll:5};

describe('Actualización 74: Brujo nivel 5 · conjuros y nuevas invocaciones',()=>{
 it('incrementa competencia, ranuras a nivel 3, invocaciones, preparados y PG',()=>{
  const next=advanceWarlockToLevelFive(four.input,four.state,choose);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(next.input.level).toBe(5);
  expect(sheet.proficiencyBonus).toBe(3);
  expect(sheet.spellAttackBonus).toBe(7);
  expect(sheet.spellSaveDC).toBe(15);
  expect(sheet.maximumHitPoints).toBe(38);
  expect(next.input.cantripIds).toHaveLength(3);
  expect(next.input.preparedIds).toHaveLength(6);
  expect(next.input.invocations).toHaveLength(5);
  expect(warlockPactSlots(next.state,5)).toEqual([false,false]);
 });
 it('usa el catálogo único: 14 conjuros de nivel 3, 13 compartidos y Hambre de Hadar exclusivo',()=>{
  expect(WARLOCK_LEVEL_THREE_SPELLS).toHaveLength(14);
  const shared=WARLOCK_LEVEL_THREE_SPELLS.filter(spell=>wizardSpellRule(spell.id));
  expect(shared).toHaveLength(13);
  for(const spell of shared)expect(warlockSpellRule(spell.id)).toBe(wizardSpellRule(spell.id));
  expect(warlockSpellRule('hunger_of_hadar')?.level).toBe(3);
  expect(WARLOCK_SPELLS_THROUGH_LEVEL_THREE).toHaveLength(41);
  expect(SHARED_SPELL_RULES.some(spell=>spell.id==='hunger_of_hadar')).toBe(true);
  expect(SHARED_CLASS_SPELL_LISTS.find(list=>list.id==='warlock')?.spellIds).toContain('hunger_of_hadar');
 });
 it('añade Bola de fuego y Nube apestosa como conjuros gratuitos sin consumir preparados',()=>{
  const next=advanceWarlockToLevelFive(four.input,four.state,choose);
  expect(WARLOCK_FIEND_LEVEL_FIVE_SPELLS.map(spell=>spell.id)).toEqual(['fireball','stinking_cloud']);
  expect(next.input.preparedIds).toHaveLength(6);
  expect(next.input.preparedIds).not.toContain('fireball');
  expect(next.input.preparedIds).not.toContain('stinking_cloud');
  const trait=collectWarlockTraits(next.input,calculateWarlockOne(next.input)).traits.find(t=>t.id==='warlock:fiend_patron');
  expect(trait?.details).toContain('Bola de fuego (nivel 3)');
 });
 it('valida límites de selección, niveles y prerrequisitos de pacto',()=>{
  expect(()=>advanceWarlockToLevelFive(four.input,four.state,{...choose,level5HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelFive(four.input,four.state,{...choose,
   invocations:['agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite','ascendant_step']})).toThrow(/Pacto de la Hoja/);
  expect(()=>advanceWarlockToLevelFive(four.input,four.state,{...choose,
   invocations:['agonizing_blast','ascendant_step','gaze_of_two_minds','master_of_myriad_forms','one_with_shadows']})).toThrow(/conservar/);
  expect(()=>advanceWarlockToLevelFive(four.input,four.state,{...choose,
   cantripIds:['friends','chill_touch','mage_hand']})).toThrow(/trucos/);
  expect(()=>advanceWarlockToLevelFive(four.input,four.state,{...choose,
   preparedIds:['hex','charm_person','counterspell','fear','fly','gaseous_form']})).toThrow(/cuatro/);
  expect(()=>advanceWarlockToLevelFive(four.input,four.state,{...choose,
   preparedIds:[...four.input.preparedIds,'fireball']})).toThrow();
  expect(WARLOCK_INVOCATIONS.thirsting_blade.minLevel).toBe(5);
 });
 it('habilita Investidura con Pacto de la Cadena y guarda la velocidad extraordinaria',()=>{
  const next=advanceWarlockToLevelFive(four.input,four.state,{...choose,
   invocations:['pact_of_chain','agonizing_blast','eldritch_spear','investment_of_the_chain_master','ascendant_step']});
  const saved=makeWarlockCharacterSnapshot(next.input,{...next.state,familiarForm:'imp',familiarName:'Diablin',familiarInvestmentMovement:'swim'});
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(saved))).warlockState.familiarInvestmentMovement).toBe('swim');
  expect(()=>makeWarlockCharacterSnapshot({...four.input}, {...four.state,familiarInvestmentMovement:'fly'})).toThrow(/Movimiento de familiar/);
 });
 it('Don de las profundidades conserva el uso en descanso corto y lo recupera en descanso largo',()=>{
  const next=advanceWarlockToLevelFive(four.input,four.state,{...choose,
   invocations:['pact_of_blade','agonizing_blast','eldritch_spear','gift_of_the_depths','ascendant_step']});
  const used=makeWarlockCharacterSnapshot(next.input,{...next.state,giftOfDepthsUsed:true}).warlockState;
  expect(warlockShortRest(used).giftOfDepthsUsed).toBe(true);
  expect(warlockLongRest(used,calculateWarlockOne(next.input).maximumHitPoints,false).giftOfDepthsUsed).toBe(false);
  expect(()=>makeWarlockCharacterSnapshot({...four.input},{...four.state,giftOfDepthsUsed:true})).toThrow(/Don de las profundidades/);
 });
 it('desciende 5→4→3 restaurando exactamente las elecciones de niveles anteriores',()=>{
  const upgraded=advanceWarlockToLevelFive(four.input,{...four.state,hitPointsCurrent:15},choose);
  const down=previewWarlockLevelDown(upgraded.input,upgraded.state);
  expect(down.snapshot.input.level).toBe(4);
  expect(down.snapshot.input.invocations).toEqual(four.input.invocations);
  expect(down.snapshot.input.cantripIds).toEqual(four.input.cantripIds);
  expect(down.snapshot.input.preparedIds).toEqual(four.input.preparedIds);
  expect(down.snapshot.input.level4Improvement).toEqual(four.input.level4Improvement);
  expect(down.snapshot.input.level4History).toEqual(four.input.level4History);
  expect(down.snapshot.input.level5History).toBeUndefined();
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(15);
  const next=previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState);
  expect(next.snapshot.input.level).toBe(3);
  expect(next.snapshot.input.preparedIds).toEqual(three.input.preparedIds);
 });
 it('mantiene compatibilidad de guardados v4 del nivel 1 al 5',()=>{
  const five=advanceWarlockToLevelFive(four.input,four.state,choose);
  for(const [input,state] of [[one,initialWarlockOneState(one)],[two.input,two.state],[three.input,three.state],[four.input,four.state],[five.input,five.state]] as const){
   const serialized=JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(input,state)));
   expect(serialized.schemaVersion).toBe(4);
   expect(validateWarlockCharacterSnapshot(serialized).input.level).toBe(input.level);
  }
  expect(()=>makeWarlockCharacterSnapshot({...five.input,level5History:undefined},five.state)).toThrow(/Historial de nivel 4/);
 });
});
