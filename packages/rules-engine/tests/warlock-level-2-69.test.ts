import {describe,expect,it} from 'vitest';
import {
 calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,
 warlockPactSlots,toggleWarlockPactSlot,warlockMagicalCunning,warlockShortRest,warlockLongRest,
 type GuidedWarlockInput
} from '../src/warlock';
import {advanceWarlockToLevelTwo} from '../src/warlock-level-up';

const starter:GuidedWarlockInput={
 classId:'warlock',level:1,name:'Nox',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',
 warlockSkills:['arcana','deception'],equipmentChoice:'equipment',
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],
 invocations:['pact_of_blade'],pactWeaponId:'sickle'
};
const levelTwo={
 invocations:['pact_of_blade','agonizing_blast','eldritch_spear'] as const,
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person','unseen_servant'],level2HitDieRoll:5
};

describe('Brujo nivel 2 y gestiones comunes (paso 69)',()=>{
 it('aplica progresión, conserva rasgos, PG y guardado versión 4',()=>{
  const old=initialWarlockOneState(starter);
  const advanced=advanceWarlockToLevelTwo(starter,{...old,hitPointsCurrent:6},levelTwo);
  expect(advanced.input.level).toBe(2);
  expect(advanced.input.invocations).toHaveLength(3);
  expect(advanced.input.preparedIds).toHaveLength(3);
  expect(advanced.input.pactWeaponId).toBe('sickle');
  expect(calculateWarlockOne(advanced.input).maximumHitPoints).toBe(17);
  expect(advanced.state.hitPointsCurrent).toBe(13);
  expect(warlockPactSlots(advanced.state,2)).toEqual([false,false]);
  const snap=makeWarlockCharacterSnapshot(advanced.input,advanced.state);
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(snap)))).toEqual(snap);
 });
 it('la invocación del nivel 2 no es elegible al crear un Brujo de nivel 1',()=>{
  expect(()=>calculateWarlockOne({...starter,invocations:['agonizing_blast']})).toThrow();
  expect(()=>calculateWarlockOne({...starter,level:2,preparedIds:levelTwo.preparedIds,invocations:['pact_of_blade','agonizing_blast','agonizing_blast']})).toThrow();
  expect(()=>calculateWarlockOne({...starter,level:2,preparedIds:levelTwo.preparedIds,invocations:levelTwo.invocations,level2HitDieRoll:9})).toThrow();
 });
 it('permite sustituir una invocación y limpia los vínculos que dejan de existir',()=>{
  const upgraded=advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),{
   ...levelTwo,invocations:['pact_of_chain','eldritch_mind','agonizing_blast']
  });
  expect(upgraded.input.pactWeaponId).toBeUndefined();
  expect(upgraded.state.familiarForm).toBeNull();
  expect(()=>advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),{
   ...levelTwo,cantripIds:['chill_touch','mage_hand']
  })).toThrow(/solo puedes sustituir un truco/);
  expect(()=>advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),{
   ...levelTwo,preparedIds:['bane','hex','unseen_servant']
  })).not.toThrow();
  expect(()=>advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),{
   ...levelTwo,preparedIds:['bane','ray_of_enfeeblement','unseen_servant']
  })).toThrow(/sustituir un conjuro/);
 });
 it('Astucia mágica restaura una sola ranura y su uso no se restablece con descanso corto',()=>{
  const {state}=advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),levelTwo);
  const spent=toggleWarlockPactSlot(toggleWarlockPactSlot(state,2,0),2,1);
  expect(warlockPactSlots(spent,2)).toEqual([true,true]);
  const recovered=warlockMagicalCunning(spent,2);
  expect(warlockPactSlots(recovered,2)).toEqual([false,true]);
  expect(()=>warlockMagicalCunning(recovered,2)).toThrow();
  const short=warlockShortRest(recovered);
  expect(warlockPactSlots(short,2)).toEqual([false,false]);
  expect(short.magicalCunningUsed).toBe(true);
  const long=warlockLongRest(short,17,false);
  expect(long.magicalCunningUsed).toBe(false);
  expect(()=>warlockMagicalCunning(initialWarlockOneState(starter),1)).toThrow();
  expect(()=>toggleWarlockPactSlot(state,2,2)).toThrow();
 });
 it('Lecciones de los Primeros admite Ataque salvaje del SRD y rechaza dotes repetidas',()=>{
  const next=advanceWarlockToLevelTwo(starter,initialWarlockOneState(starter),{
   ...levelTwo,invocations:['pact_of_blade','lessons_of_the_first_ones','agonizing_blast'],lessonsFeat:'savage_attacker'
  });
  expect(calculateWarlockOne(next.input).maximumHitPoints).toBe(17);
  const human:GuidedWarlockInput={...starter,species:'human',humanSkill:'perception',humanFeat:'alert',humanSize:'medium'};
  expect(()=>advanceWarlockToLevelTwo(human,initialWarlockOneState(human),{
   ...levelTwo,invocations:['pact_of_blade','lessons_of_the_first_ones','agonizing_blast'],lessonsFeat:'alert'
  })).toThrow();
 });
});
