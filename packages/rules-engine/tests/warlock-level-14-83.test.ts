import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,spendWarlockMysticArcanum6,spendWarlockMysticArcanum7,spendWarlockHurlThroughHell,restoreWarlockHurlThroughHellWithPactSlot,warlockShortRest,warlockLongRest,warlockPactSlots} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,advanceWarlockToLevelTwelve,advanceWarlockToLevelThirteen,advanceWarlockToLevelFourteen,previewWarlockLevelDown} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';

const initial={classId:'warlock' as const,level:1 as const,name:'Auditoría nivel catorce',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},increaseMode:'two_plus_one' as const,
 plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,warlockSkills:['arcana','deception'] as const,equipmentChoice:'equipment' as const,
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const};
const l2=advanceWarlockToLevelTwo(initial,initialWarlockOneState(initial),{invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:initial.cantripIds,preparedIds:['hex','charm_person','unseen_servant'],level2HitDieRoll:5});
const l3=advanceWarlockToLevelThree(l2.input,l2.state,{subclassId:'fiend',invocations:l2.input.invocations,cantripIds:l2.input.cantripIds,preparedIds:[...l2.input.preparedIds,'misty_step'],level3HitDieRoll:5});
const l4=advanceWarlockToLevelFour(l3.input,l3.state,{invocations:l3.input.invocations,cantripIds:[...l3.input.cantripIds,'chill_touch'],preparedIds:[...l3.input.preparedIds,'hold_person'],level4HitDieRoll:5,level4Improvement:{mode:'plus_two',first:'charisma'}});
const l5=advanceWarlockToLevelFive(l4.input,l4.state,{invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],cantripIds:l4.input.cantripIds,preparedIds:[...l4.input.preparedIds,'counterspell'],level5HitDieRoll:5});
const l6=advanceWarlockToLevelSix(l5.input,l5.state,{invocations:l5.input.invocations,cantripIds:l5.input.cantripIds,preparedIds:[...l5.input.preparedIds,'fly'],level6HitDieRoll:5});
const l7=advanceWarlockToLevelSeven(l6.input,l6.state,{invocations:[...l6.input.invocations,'whispers_of_the_grave'],cantripIds:l6.input.cantripIds,preparedIds:[...l6.input.preparedIds,'blight'],level7HitDieRoll:5});
const l8=advanceWarlockToLevelEight(l7.input,l7.state,{invocations:l7.input.invocations,cantripIds:l7.input.cantripIds,preparedIds:[...l7.input.preparedIds,'banishment'],level8HitDieRoll:5,level8Improvement:{mode:'two_ones',first:'charisma',second:'constitution'}});
const l9=advanceWarlockToLevelNine(l8.input,{...l8.state,pactSlotSpent:true,darkOnesOwnLuckUsed:1,hitPointsCurrent:l8.state.hitPointsCurrent-3},{invocations:[...l8.input.invocations,'lifedrinker'],cantripIds:l8.input.cantripIds,preparedIds:[...l8.input.preparedIds,'hold_monster'],level9HitDieRoll:5});
const l10=advanceWarlockToLevelTen(l9.input,l9.state,{invocations:l9.input.invocations,cantripIds:[...l9.input.cantripIds,'mage_hand'],preparedIds:l9.input.preparedIds,level10HitDieRoll:5});
const l11=advanceWarlockToLevelEleven(l10.input,l10.state,{invocations:l10.input.invocations,cantripIds:l10.input.cantripIds,preparedIds:[...l10.input.preparedIds,'ray_of_enfeeblement'],mysticArcanum6Id:'eyebite',level11HitDieRoll:5});
const l12=advanceWarlockToLevelTwelve(l11.input,spendWarlockMysticArcanum6(l11.input,l11.state),{invocations:[...l11.input.invocations,'devouring_blade'],cantripIds:l11.input.cantripIds,preparedIds:l11.input.preparedIds,mysticArcanum6Id:'true_seeing',level12HitDieRoll:5,level12Improvement:{mode:'plus_two',first:'constitution'}});
const l13=advanceWarlockToLevelThirteen(l12.input,l12.state,{invocations:l12.input.invocations,cantripIds:l12.input.cantripIds,preparedIds:[...l12.input.preparedIds,'dimension_door'],mysticArcanum6Id:'true_seeing',mysticArcanum7Id:'forcecage',level13HitDieRoll:7});
const choices={invocations:l13.input.invocations,cantripIds:l13.input.cantripIds,preparedIds:l13.input.preparedIds,mysticArcanum6Id:'true_seeing' as const,mysticArcanum7Id:'forcecage' as const,level14HitDieRoll:8};

describe('Actualización 83: Brujo Infernal nivel 14',()=>{
 it('obtiene Arrojar al infierno sin alterar invocaciones, magia ni competencia, y conserva daño',()=>{
  const next=advanceWarlockToLevelFourteen(l13.input,l13.state,choices);
  const sheet=calculateWarlockOne(next.input,next.state),previous=calculateWarlockOne(l13.input,l13.state);
  expect(sheet.maximumHitPoints-previous.maximumHitPoints).toBe(12);
  expect(sheet.proficiencyBonus).toBe(5);
  expect(next.input.preparedIds).toHaveLength(12);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(next.input.invocations).toHaveLength(8);
  expect(warlockPactSlots(next.state,14)).toEqual(warlockPactSlots(l13.state,13));
  expect(next.state.mysticArcanum6Used).toBe(true);
  expect(next.state.mysticArcanum7Used).toBe(false);
  expect(next.state.hurlThroughHellUsed).toBe(false);
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:fiend:hurl_through_hell'}));
 });
 it('solo admite un uso, conserva el gasto en descanso corto y restaura en largo',()=>{
  const next=advanceWarlockToLevelFourteen(l13.input,l13.state,choices);
  const used=spendWarlockHurlThroughHell(next.input,next.state);
  expect(used.hurlThroughHellUsed).toBe(true);
  expect(()=>spendWarlockHurlThroughHell(next.input,used)).toThrow(/utilizado/);
  expect(warlockShortRest(used).hurlThroughHellUsed).toBe(true);
  expect(warlockLongRest(used,calculateWarlockOne(next.input).maximumHitPoints,false).hurlThroughHellUsed).toBe(false);
  expect(()=>spendWarlockHurlThroughHell(l13.input,l13.state)).toThrow(/nivel 14/);
 });
 it('recupera el uso gastando solo una ranura elegida, sin tocar el estado de los Arcanum',()=>{
  const next=advanceWarlockToLevelFourteen(l13.input,l13.state,choices);
  const used=spendWarlockHurlThroughHell(next.input,spendWarlockMysticArcanum7(next.input,next.state));
  const restored=restoreWarlockHurlThroughHellWithPactSlot(next.input,used,1);
  expect(restored.hurlThroughHellUsed).toBe(false);
  expect(warlockPactSlots(restored,14)).toEqual([true,true,false]);
  expect(restored.mysticArcanum6Used).toBe(true);
  expect(restored.mysticArcanum7Used).toBe(true);
  expect(()=>restoreWarlockHurlThroughHellWithPactSlot(next.input,restored,1)).toThrow(/disponible/);
  expect(()=>restoreWarlockHurlThroughHellWithPactSlot(next.input,used,0)).toThrow(/gastada/);
  expect(()=>restoreWarlockHurlThroughHellWithPactSlot(next.input,used,5)).toThrow(/ranura/);
 });
 it('guarda y desciende 14→13, restaurando exactamente las elecciones anteriores',()=>{
  const next=advanceWarlockToLevelFourteen(l13.input,l13.state,choices);
  const used=spendWarlockHurlThroughHell(next.input,next.state);
  const stored=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,used))));
  const back=previewWarlockLevelDown(stored.input,stored.warlockState);
  expect(back.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(l13.input,l13.state).input)));
  expect(back.snapshot.warlockState.hurlThroughHellUsed).toBeUndefined();
  expect(back.snapshot.warlockState.mysticArcanum6Used).toBe(true);
  expect(back.snapshot.warlockState.mysticArcanum7Used).toBe(false);
  expect(back.snapshot.warlockState.hitPointsCurrent).toBe(l13.state.hitPointsCurrent);
  expect(previewWarlockLevelDown(back.snapshot.input,back.snapshot.warlockState).snapshot.input.level).toBe(12);
 });
 it('rechaza elecciones que no corresponden al nivel 14',()=>{
  expect(()=>advanceWarlockToLevelFourteen(l13.input,l13.state,{...choices,level14HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelFourteen(l13.input,l13.state,{...choices,preparedIds:l13.input.preparedIds.slice(1)})).toThrow(/doce/);
  expect(()=>advanceWarlockToLevelFourteen(l13.input,l13.state,{...choices,invocations:l13.input.invocations.slice(1)})).toThrow(/ocho/);
  expect(()=>advanceWarlockToLevelFourteen(l13.input,l13.state,{...choices,mysticArcanum6Id:'eyebite',mysticArcanum7Id:'plane_shift' as never})).toThrow(/solo puedes sustituir un/);
  expect(()=>advanceWarlockToLevelFourteen(l13.input,l13.state,{...choices,mysticArcanum6Id:'eyebite'})).not.toThrow();
 });
});
