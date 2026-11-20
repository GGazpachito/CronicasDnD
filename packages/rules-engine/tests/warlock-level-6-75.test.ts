import {describe,expect,it} from 'vitest';
import {
 calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,
 warlockDarkOnesOwnLuckMaximum,spendWarlockDarkOnesOwnLuck,warlockShortRest,warlockLongRest,
} from '../src/warlock';
import {
 advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,
 advanceWarlockToLevelSix,previewWarlockLevelDown,
} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';

const one={
 classId:'warlock' as const,level:1 as const,name:'Infernal de control',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one' as const,plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,
 warlockSkills:['arcana','deception'] as const,equipmentChoice:'equipment' as const,
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],
 invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const,
};
const two=advanceWarlockToLevelTwo(one,initialWarlockOneState(one),{
 invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:one.cantripIds,
 preparedIds:['hex','charm_person','armor_of_agathys'],level2HitDieRoll:5,
});
const three=advanceWarlockToLevelThree(two.input,two.state,{
 subclassId:'fiend',invocations:two.input.invocations,cantripIds:two.input.cantripIds,
 preparedIds:['hex','charm_person','armor_of_agathys','misty_step'],level3HitDieRoll:5,
});
const four=advanceWarlockToLevelFour(three.input,three.state,{
 invocations:three.input.invocations,cantripIds:[...three.input.cantripIds,'friends'],
 preparedIds:[...three.input.preparedIds,'hold_person'],level4HitDieRoll:5,
 level4Improvement:{mode:'plus_two',first:'charisma'},
});
const five=advanceWarlockToLevelFive(four.input,four.state,{
 invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],
 cantripIds:four.input.cantripIds,preparedIds:[...four.input.preparedIds,'counterspell'],level5HitDieRoll:5,
});
const choices={
 invocations:five.input.invocations,cantripIds:five.input.cantripIds,
 preparedIds:[...five.input.preparedIds,'fly'],level6HitDieRoll:5,
};

describe('Actualización 75: Brujo nivel 6 · Suerte del Oscuro',()=>{
 it('añade séptimo preparado, un d8 y mantiene cinco invocaciones, ranuras y competencia',()=>{
  const six=advanceWarlockToLevelSix(five.input,five.state,choices);
  const sheet=calculateWarlockOne(six.input,six.state);
  expect(sheet.level).toBe(6);
  expect(sheet.maximumHitPoints).toBe(45);
  expect(sheet.proficiencyBonus).toBe(3);
  expect(six.input.preparedIds).toHaveLength(7);
  expect(six.input.invocations).toHaveLength(5);
  expect(six.input.cantripIds).toHaveLength(3);
  expect(six.state.darkOnesOwnLuckUsed).toBe(0);
  expect(warlockDarkOnesOwnLuckMaximum(six.input)).toBe(4);
  expect(warlockDarkOnesOwnLuckMaximum(five.input)).toBe(0);
  expect(collectWarlockTraits(six.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:dark_ones_own_luck',level:6}));
  expect(collectWarlockTraits(five.input,calculateWarlockOne(five.input)).traits.some(t=>t.id==='warlock:dark_ones_own_luck')).toBe(false);
 });
 it('registra usos, no recarga en descanso corto, sí en largo, y valida guardados',()=>{
  const six=advanceWarlockToLevelSix(five.input,five.state,choices);
  let state=six.state;
  for(let index=0;index<4;index++)state=spendWarlockDarkOnesOwnLuck(six.input,state);
  expect(state.darkOnesOwnLuckUsed).toBe(4);
  expect(()=>spendWarlockDarkOnesOwnLuck(six.input,state)).toThrow(/agotada/);
  expect(warlockShortRest(state).darkOnesOwnLuckUsed).toBe(4);
  expect(warlockLongRest(state,calculateWarlockOne(six.input).maximumHitPoints,false).darkOnesOwnLuckUsed).toBe(0);
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(six.input,state)))).warlockState.darkOnesOwnLuckUsed).toBe(4);
  expect(()=>makeWarlockCharacterSnapshot(six.input,{...state,darkOnesOwnLuckUsed:5})).toThrow(/Suerte del Oscuro/);
  expect(()=>makeWarlockCharacterSnapshot(five.input,{...five.state,darkOnesOwnLuckUsed:1})).toThrow(/Suerte del Oscuro/);
  expect(()=>spendWarlockDarkOnesOwnLuck(five.input,five.state)).toThrow(/antes de nivel 6/);
 });
 it('valida las elecciones, incluyendo requisitos de pactos y sustituciones',()=>{
  expect(()=>advanceWarlockToLevelSix(five.input,five.state,{...choices,level6HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelSix(five.input,five.state,{...choices,preparedIds:five.input.preparedIds})).toThrow(/siete/);
  expect(()=>advanceWarlockToLevelSix(five.input,five.state,{...choices,
   invocations:['agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite','ascendant_step']})).toThrow(/Pacto/);
  expect(()=>advanceWarlockToLevelSix(five.input,five.state,{...choices,
   invocations:['pact_of_blade','ascendant_step','gaze_of_two_minds','master_of_myriad_forms','one_with_shadows']})).toThrow(/cuatro/);
  expect(()=>advanceWarlockToLevelSix(five.input,five.state,{...choices,
   preparedIds:['hex','charm_person','counterspell','fly','fear','gaseous_form','hunger_of_hadar']})).toThrow(/cinco/);
 });
 it('retrocede 6→5 restaurando elecciones y PG, y sigue 5→4 sin borrar compañeros ni recursos',()=>{
  const companions=[] as const;
  const six=advanceWarlockToLevelSix({...five.input,companions},{...five.state,hitPointsCurrent:five.state.hitPointsCurrent-3,pactSlotSpent:true},choices);
  expect(six.state.hitPointsCurrent).toBe(calculateWarlockOne(six.input).maximumHitPoints-3);
  const consumed=spendWarlockDarkOnesOwnLuck(six.input,six.state);
  const down=previewWarlockLevelDown(six.input,consumed);
  expect(down.snapshot.input.level).toBe(5);
  expect(down.snapshot.input.preparedIds).toEqual(five.input.preparedIds);
  expect(down.snapshot.input.invocations).toEqual(five.input.invocations);
  expect(down.snapshot.warlockState.darkOnesOwnLuckUsed).toBeUndefined();
  expect(down.snapshot.warlockState.pactSlotSpent).toBe(true);
  expect(down.snapshot.input.companions).toEqual(companions);
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(calculateWarlockOne(down.snapshot.input).maximumHitPoints-3);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(4);
 });
});
