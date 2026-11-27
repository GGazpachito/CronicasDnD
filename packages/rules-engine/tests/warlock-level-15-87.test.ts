import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,spendWarlockMysticArcanum6,spendWarlockMysticArcanum7,spendWarlockMysticArcanum8,spendWarlockHurlThroughHell,warlockShortRest,warlockLongRest,warlockPactSlots} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,advanceWarlockToLevelTwelve,advanceWarlockToLevelThirteen,advanceWarlockToLevelFourteen,advanceWarlockToLevelFifteen,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_LEVEL_EIGHT_SPELLS,WARLOCK_EIGHTH_LEVEL_IDS,warlockSpellRule} from '../src/warlock-spells';
import {collectWarlockTraits} from '../src/warlock-traits';

const initial={classId:'warlock' as const,level:1 as const,name:'Bruja nivel quince',background:'acolyte' as const,species:'dwarf' as const,
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
const spent={...spendWarlockHurlThroughHell(l14.input,spendWarlockMysticArcanum7(l14.input,spendWarlockMysticArcanum6(l14.input,l14.state))),hitPointsCurrent:l14.state.hitPointsCurrent-4};
const choices={invocations:[...l14.input.invocations,'witch_sight' as const],cantripIds:l14.input.cantripIds,preparedIds:[...l14.input.preparedIds,'scrying'],mysticArcanum6Id:'eyebite' as const,mysticArcanum7Id:'forcecage' as const,mysticArcanum8Id:'glibness' as const,level15HitDieRoll:6};

describe('Actualización 87: Brujo Infernal nivel 15 · SRD 5.2.1',()=>{
 it('catálogo de cinco Arcanum de nivel 8 e invocación Vista de bruja',()=>{
  expect(WARLOCK_LEVEL_EIGHT_SPELLS.map(spell=>spell.id)).toEqual([...WARLOCK_EIGHTH_LEVEL_IDS]);
  expect(WARLOCK_LEVEL_EIGHT_SPELLS.every(spell=>spell.level===8)).toBe(true);
  expect(warlockSpellRule('glibness')?.name).toBe('Elocuencia');
 });
 it('sube con 9 invocaciones, 13 preparados, tercer Arcanum y daño persistido',()=>{
  const next=advanceWarlockToLevelFifteen(l14.input,spent,choices);
  const before=calculateWarlockOne(l14.input),after=calculateWarlockOne(next.input);
  expect(after.maximumHitPoints-before.maximumHitPoints).toBe(10);
  expect(next.state.hitPointsCurrent).toBe(spent.hitPointsCurrent+10);
  expect(after.proficiencyBonus).toBe(5);
  expect(next.input.invocations).toHaveLength(9);
  expect(next.input.preparedIds).toHaveLength(13);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(warlockPactSlots(next.state,15)).toEqual(warlockPactSlots(spent,14));
  expect(next.state.mysticArcanum6Used).toBe(true);
  expect(next.state.mysticArcanum7Used).toBe(true);
  expect(next.state.hurlThroughHellUsed).toBe(true);
  expect(next.state.mysticArcanum8Used).toBe(false);
  const traits=collectWarlockTraits(next.input,after).traits;
  expect(traits).toContainEqual(expect.objectContaining({id:'warlock:mystic_arcanum_8'}));
  expect(traits).toContainEqual(expect.objectContaining({id:'warlock:invocation:witch_sight'}));
 });
 it('tercer Arcanum solo gasta su uso y recupera con descanso largo, no corto',()=>{
  const next=advanceWarlockToLevelFifteen(l14.input,spent,choices);
  const used=spendWarlockMysticArcanum8(next.input,next.state);
  expect(used.mysticArcanum8Used).toBe(true);
  expect(used.mysticArcanum6Used).toBe(true);
  expect(used.mysticArcanum7Used).toBe(true);
  expect(warlockPactSlots(used,15)).toEqual(warlockPactSlots(next.state,15));
  expect(()=>spendWarlockMysticArcanum8(next.input,used)).toThrow(/agotado/);
  expect(warlockShortRest(used).mysticArcanum8Used).toBe(true);
  expect(warlockLongRest(used,calculateWarlockOne(next.input).maximumHitPoints,false).mysticArcanum8Used).toBe(false);
  expect(()=>spendWarlockMysticArcanum8(l14.input,spent)).toThrow(/no disponible/);
 });
 it('persistencia y descenso 15→14 reversible; restaura las elecciones y recursos anteriores',()=>{
  const next=advanceWarlockToLevelFifteen(l14.input,spent,choices);
  const used=spendWarlockMysticArcanum8(next.input,next.state);
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,used))));
  const back=previewWarlockLevelDown(saved.input,saved.warlockState);
  expect(back.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(l14.input,spent).input)));
  expect(back.snapshot.warlockState.mysticArcanum8Used).toBeUndefined();
  expect(back.snapshot.warlockState.mysticArcanum6Used).toBe(true);
  expect(back.snapshot.warlockState.mysticArcanum7Used).toBe(true);
  expect(back.snapshot.warlockState.hurlThroughHellUsed).toBe(true);
  expect(back.snapshot.warlockState.hitPointsCurrent).toBe(spent.hitPointsCurrent);
 });
 it('rechaza catálogos ajenos, reemplazos dobles y datos prematuros o inválidos',()=>{
  expect(()=>advanceWarlockToLevelFifteen(l14.input,spent,{...choices,level15HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelFifteen(l14.input,spent,{...choices,mysticArcanum8Id:'wish' as never})).toThrow(/catálogo/);
  expect(()=>advanceWarlockToLevelFifteen(l14.input,spent,{...choices,invocations:l14.input.invocations})).toThrow(/nueve/);
  expect(()=>advanceWarlockToLevelFifteen(l14.input,spent,{...choices,preparedIds:l14.input.preparedIds})).toThrow(/trece/);
  expect(()=>advanceWarlockToLevelFifteen(l14.input,spent,{...choices,mysticArcanum6Id:'true_seeing',mysticArcanum7Id:'plane_shift'})).toThrow(/solo puedes sustituir/);
  expect(()=>makeWarlockCharacterSnapshot({...l14.input,mysticArcanum8Id:'glibness'},spent)).toThrow(/prematuros/);
  expect(()=>makeWarlockCharacterSnapshot({...l14.input,invocations:[...l14.input.invocations,'witch_sight']},spent)).toThrow();
 });
});
