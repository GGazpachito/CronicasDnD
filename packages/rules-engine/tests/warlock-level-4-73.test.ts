import {describe,it,expect} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,
 warlockPactSlots,warlockDarkOnesBlessing,type GuidedWarlockInput} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,previewWarlockLevelDown} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';

const starter:GuidedWarlockInput={classId:'warlock',level:1,name:'Auditora',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',warlockSkills:['arcana','deception'],
 equipmentChoice:'equipment',cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],
 invocations:['pact_of_blade'],pactWeaponId:'sickle'};
const second=advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),{
 invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:starter.cantripIds,
 preparedIds:['hex','charm_person','unseen_servant'],level2HitDieRoll:5});
const third=advanceWarlockToLevelThree(second.input,second.state,{subclassId:'fiend',
 invocations:second.input.invocations,cantripIds:second.input.cantripIds,
 preparedIds:['hex','charm_person','unseen_servant','misty_step'],level3HitDieRoll:5});
const fourthChoices={invocations:third.input.invocations,cantripIds:[...third.input.cantripIds,'chill_touch'],
 preparedIds:[...third.input.preparedIds,'hold_person'],level4HitDieRoll:5,
 level4Improvement:{mode:'plus_two' as const,first:'charisma' as const}};

describe('Actualización 73: nivel 4 de Brujo y ventana común',()=>{
 it('aplica Mejora de característica +2, tercer truco y quinto preparado; no cambia las ranuras',()=>{
  const next=advanceWarlockToLevelFour(third.input,third.state,fourthChoices);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(next.input.level).toBe(4);
  expect(sheet.abilityScores.charisma).toBe(19);
  expect(sheet.spellSaveDC).toBe(14);
  expect(sheet.spellAttackBonus).toBe(6);
  expect(sheet.maximumHitPoints).toBe(31);
  expect(next.input.cantripIds).toHaveLength(3);
  expect(next.input.preparedIds).toHaveLength(5);
  expect(warlockPactSlots(next.state,4)).toEqual([false,false]);
  expect(next.input.invocations).toEqual(third.input.invocations);
  expect(collectWarlockTraits(next.input,sheet).traits.some(t=>t.id==='warlock:ability_score_improvement_4')).toBe(true);
 });
 it('acepta +1/+1 en dos características distintas y recalcula todos los dados de golpe si aumenta Constitución',()=>{
  const split=advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   level4Improvement:{mode:'two_ones',first:'charisma',second:'constitution'}});
  expect(calculateWarlockOne(split.input).abilityScores.charisma).toBe(18);
  expect(calculateWarlockOne(split.input).abilityScores.constitution).toBe(14);
  expect(calculateWarlockOne(split.input).maximumHitPoints).toBe(35);
  const con=advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   level4Improvement:{mode:'plus_two',first:'constitution'}});
  expect(calculateWarlockOne(con.input).maximumHitPoints).toBe(35);
 });
 it('valida rangos de mejora, tirada, listas y límite de sustitución de conjuros y trucos',()=>{
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,level4HitDieRoll:9})).toThrow(/dado/i);
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   level4Improvement:{mode:'two_ones',first:'charisma',second:'charisma'}})).toThrow();
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   level4Improvement:{mode:'plus_two',first:'charisma',second:'constitution'}})).toThrow();
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   cantripIds:['poison_spray','mage_hand','chill_touch']})).toThrow(/trucos/i);
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   preparedIds:['darkness','hold_person','mirror_image','invisibility','crown_of_madness']})).toThrow(/tres conjuros/);
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   invocations:['pact_of_chain','eldritch_mind','devils_sight']})).toThrow(/invocaciones/);
  expect(()=>advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,
   preparedIds:['hex','charm_person','misty_step','suggestion','hold_person']})).toThrow(/gratuitos/);
 });
 it('valida límite 20 de características incluso cuando se obtiene bonificación por trasfondo',()=>{
  const high=advanceWarlockToLevelFour(third.input,third.state,{...fourthChoices,level4Improvement:{mode:'plus_two',first:'charisma'}});
  expect(()=>calculateWarlockOne({...high.input,abilityGenerationMethod:'roll_4d6',
   level4Improvement:{mode:'plus_two',first:'charisma'},assignedAbilities:{...high.input.assignedAbilities,charisma:18}})).toThrow(/superar 20/i);
 });
 it('Bendición del Oscuro usa la nueva Carisma y no acumula PG temporales',()=>{
  const result=advanceWarlockToLevelFour(third.input,third.state,fourthChoices);
  expect(warlockDarkOnesBlessing(result.input,{...result.state,temporaryHitPoints:2}).temporaryHitPoints).toBe(8);
  expect(warlockDarkOnesBlessing(result.input,{...result.state,temporaryHitPoints:15}).temporaryHitPoints).toBe(15);
 });
 it('al descender 4→3 restaura elecciones, PG y conserva íntegramente el historial 3→2',()=>{
  const upgraded=advanceWarlockToLevelFour(third.input,{...third.state,hitPointsCurrent:13},{...fourthChoices,
   invocations:['pact_of_chain','agonizing_blast','eldritch_spear'],
   preparedIds:['hex','charm_person','misty_step','hold_person','darkness']});
  const preview=previewWarlockLevelDown(upgraded.input,upgraded.state);
  expect(preview.fromLevel).toBe(4);
  expect(preview.snapshot.input.level).toBe(3);
  expect(preview.snapshot.input.invocations).toEqual(third.input.invocations);
  expect(preview.snapshot.input.cantripIds).toEqual(third.input.cantripIds);
  expect(preview.snapshot.input.preparedIds).toEqual(third.input.preparedIds);
  expect(preview.snapshot.input.pactWeaponId).toBe('sickle');
  expect(preview.snapshot.input.level4Improvement).toBeUndefined();
  expect(preview.snapshot.input.level4History).toBeUndefined();
  expect(preview.snapshot.input.level3History).toEqual(third.input.level3History);
  expect(preview.snapshot.warlockState.hitPointsCurrent).toBe(13);
  expect(previewWarlockLevelDown(preview.snapshot.input,preview.snapshot.warlockState).snapshot.input.level).toBe(2);
 });
 it('guardados v4: las instantáneas 1–3 siguen siendo válidas y nivel 4 se puede restaurar',()=>{
  const upgraded=advanceWarlockToLevelFour(third.input,third.state,fourthChoices);
  const saved=makeWarlockCharacterSnapshot(upgraded.input,upgraded.state);
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(saved))).input.level).toBe(4);
  expect(()=>makeWarlockCharacterSnapshot({...upgraded.input,level4History:undefined},upgraded.state)).toThrow(/historial/i);
  for(const [input,state] of [[starter,initialWarlockOneState(starter)],[second.input,second.state],[third.input,third.state]] as const){
   expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(input,state)))).input.level).toBe(input.level);
  }
 });
});
