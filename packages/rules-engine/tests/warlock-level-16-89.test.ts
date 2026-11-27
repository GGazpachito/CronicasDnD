import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,spendWarlockMysticArcanum6,spendWarlockMysticArcanum7,spendWarlockMysticArcanum8,spendWarlockHurlThroughHell,warlockPactSlots} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,advanceWarlockToLevelTwelve,advanceWarlockToLevelThirteen,advanceWarlockToLevelFourteen,advanceWarlockToLevelFifteen,advanceWarlockToLevelSixteen,previewWarlockLevelDown} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';

const initial={classId:'warlock' as const,level:1 as const,name:'Bruja nivel dieciséis',background:'acolyte' as const,species:'dwarf' as const,
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
const l9=advanceWarlockToLevelNine(l8.input,l8.state,{invocations:[...l8.input.invocations,'lifedrinker'],cantripIds:l8.input.cantripIds,preparedIds:[...l8.input.preparedIds,'hold_monster'],level9HitDieRoll:5});
const l10=advanceWarlockToLevelTen(l9.input,l9.state,{invocations:l9.input.invocations,cantripIds:[...l9.input.cantripIds,'mage_hand'],preparedIds:l9.input.preparedIds,level10HitDieRoll:5});
const l11=advanceWarlockToLevelEleven(l10.input,l10.state,{invocations:l10.input.invocations,cantripIds:l10.input.cantripIds,preparedIds:[...l10.input.preparedIds,'ray_of_enfeeblement'],mysticArcanum6Id:'eyebite',level11HitDieRoll:5});
const l12=advanceWarlockToLevelTwelve(l11.input,l11.state,{invocations:[...l11.input.invocations,'devouring_blade'],cantripIds:l11.input.cantripIds,preparedIds:l11.input.preparedIds,mysticArcanum6Id:'eyebite',level12HitDieRoll:5,level12Improvement:{mode:'plus_two',first:'constitution'}});
const l13=advanceWarlockToLevelThirteen(l12.input,l12.state,{invocations:l12.input.invocations,cantripIds:l12.input.cantripIds,preparedIds:[...l12.input.preparedIds,'dimension_door'],mysticArcanum6Id:'eyebite',mysticArcanum7Id:'forcecage',level13HitDieRoll:5});
const l14=advanceWarlockToLevelFourteen(l13.input,l13.state,{invocations:l13.input.invocations,cantripIds:l13.input.cantripIds,preparedIds:l13.input.preparedIds,mysticArcanum6Id:'eyebite',mysticArcanum7Id:'forcecage',level14HitDieRoll:5});
const l15=advanceWarlockToLevelFifteen(l14.input,l14.state,{invocations:[...l14.input.invocations,'witch_sight'],cantripIds:l14.input.cantripIds,preparedIds:[...l14.input.preparedIds,'scrying'],mysticArcanum6Id:'eyebite',mysticArcanum7Id:'forcecage',mysticArcanum8Id:'glibness',level15HitDieRoll:5});
const spent={...spendWarlockMysticArcanum8(l15.input,spendWarlockHurlThroughHell(l15.input,spendWarlockMysticArcanum7(l15.input,spendWarlockMysticArcanum6(l15.input,l15.state)))),hitPointsCurrent:l15.state.hitPointsCurrent-6,pactSlotSpent:true};
const choices={invocations:l15.input.invocations,cantripIds:l15.input.cantripIds,preparedIds:l15.input.preparedIds,mysticArcanum6Id:'eyebite' as const,mysticArcanum7Id:'forcecage' as const,mysticArcanum8Id:'glibness' as const,level16Improvement:{mode:'plus_two' as const,first:'constitution' as const},level16HitDieRoll:5};

describe('Actualización 89: Brujo Infernal nivel 16 · SRD 5.2.1',()=>{
 it('Mejora de característica aumenta Constitución y recalcula todos los PG de la vida, incluidos los de enano',()=>{
  const next=advanceWarlockToLevelSixteen(l15.input,spent,choices);
  const before=calculateWarlockOne(l15.input),after=calculateWarlockOne(next.input);
  expect(after.abilityScores.constitution).toBe(before.abilityScores.constitution+2);
  expect(after.maximumHitPoints-before.maximumHitPoints).toBe(25);
  expect(next.state.hitPointsCurrent).toBe(spent.hitPointsCurrent+25);
  expect(after.proficiencyBonus).toBe(5);
  expect(next.input.invocations).toHaveLength(9);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(next.input.preparedIds).toHaveLength(13);
  expect(warlockPactSlots(next.state,16)).toEqual(warlockPactSlots(spent,15));
  expect(collectWarlockTraits(next.input,after).traits).toContainEqual(expect.objectContaining({id:'warlock:ability_score_improvement_16'}));
 });
 it('conserva Arcanum, rasgos infernales y ranuras gastados al subir y al descansar no automáticamente',()=>{
  const next=advanceWarlockToLevelSixteen(l15.input,spent,choices);
  expect(next.state.mysticArcanum6Used).toBe(true);
  expect(next.state.mysticArcanum7Used).toBe(true);
  expect(next.state.mysticArcanum8Used).toBe(true);
  expect(next.state.hurlThroughHellUsed).toBe(true);
  expect(next.state.pactSlotSpent).toBe(true);
 });
 it('permite un cambio opcional de invocación, truco, preparado y Arcanum de nivel 8',()=>{
  const revised=advanceWarlockToLevelSixteen(l15.input,spent,{...choices,
   invocations:l15.input.invocations.map(id=>id==='eldritch_spear'?'devils_sight':id),
   cantripIds:l15.input.cantripIds.map(id=>id==='prestidigitation'?'minor_illusion':id),
   preparedIds:l15.input.preparedIds.map(id=>id==='charm_person'?'dream':id),mysticArcanum8Id:'demiplane',
   level16Improvement:{mode:'two_ones',first:'strength',second:'intelligence'},
  });
  expect(revised.input.invocations).toContain('devils_sight');
  expect(revised.input.cantripIds).toContain('minor_illusion');
  expect(revised.input.preparedIds).toContain('dream');
  expect(revised.input.mysticArcanum8Id).toBe('demiplane');
  expect(revised.state.mysticArcanum8Used).toBe(true);
 });
 it('persiste y deshace 16→15 preservando elecciones exactas y daño anterior',()=>{
  const next=advanceWarlockToLevelSixteen(l15.input,spent,choices);
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,next.state))));
  const back=previewWarlockLevelDown(saved.input,saved.warlockState);
  expect(back.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(l15.input,spent).input)));
  expect(back.snapshot.warlockState.hitPointsCurrent).toBe(spent.hitPointsCurrent);
  expect(back.snapshot.warlockState.mysticArcanum8Used).toBe(true);
  expect(back.snapshot.warlockState.hurlThroughHellUsed).toBe(true);
  expect(back.snapshot.warlockState.pactSlotSpent).toBe(true);
  expect(back.toLevel).toBe(15);
 });
 it('rechaza dados, mejoras prematuras o inválidas, sustituciones excesivas y doble Arcanum',()=>{
  expect(()=>advanceWarlockToLevelSixteen(l15.input,spent,{...choices,level16HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelSixteen(l15.input,spent,{...choices,level16Improvement:{mode:'plus_two',first:'charisma'}})).toThrow();
  expect(()=>advanceWarlockToLevelSixteen(l15.input,spent,{...choices,preparedIds:l15.input.preparedIds.slice(0,12)})).toThrow(/trece/);
  expect(()=>advanceWarlockToLevelSixteen(l15.input,spent,{...choices,mysticArcanum6Id:'true_seeing',mysticArcanum8Id:'demiplane'})).toThrow(/solo puedes sustituir/);
  expect(()=>makeWarlockCharacterSnapshot({...l15.input,level16Improvement:choices.level16Improvement},spent)).toThrow(/prematuros/);
  expect(()=>makeWarlockCharacterSnapshot({...l15.input,level:16,level16Improvement:choices.level16Improvement},spent)).toThrow(/Historial/);
 });
});
