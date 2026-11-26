import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,spendWarlockMysticArcanum6,spendWarlockMysticArcanum7,warlockShortRest,warlockLongRest,warlockPactSlots} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,advanceWarlockToLevelTwelve,advanceWarlockToLevelThirteen,previewWarlockLevelDown} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';
import {WARLOCK_LEVEL_SEVEN_SPELLS,WARLOCK_SEVENTH_LEVEL_IDS,warlockSpellRule} from '../src/warlock-spells';
import {wizardSpellRule} from '../src/wizard-spell-details';

const first={classId:'warlock' as const,level:1 as const,name:'Auditoría nivel doce',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},increaseMode:'two_plus_one' as const,
 plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,warlockSkills:['arcana','deception'] as const,equipmentChoice:'equipment' as const,
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const};
const l2=advanceWarlockToLevelTwo(first,initialWarlockOneState(first),{invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:first.cantripIds,preparedIds:['hex','charm_person','armor_of_agathys'],level2HitDieRoll:5});
const l3=advanceWarlockToLevelThree(l2.input,l2.state,{subclassId:'fiend',invocations:l2.input.invocations,cantripIds:l2.input.cantripIds,preparedIds:[...l2.input.preparedIds,'misty_step'],level3HitDieRoll:5});
const l4=advanceWarlockToLevelFour(l3.input,l3.state,{invocations:l3.input.invocations,cantripIds:[...l3.input.cantripIds,'friends'],preparedIds:[...l3.input.preparedIds,'hold_person'],level4HitDieRoll:5,level4Improvement:{mode:'plus_two',first:'charisma'}});
const l5=advanceWarlockToLevelFive(l4.input,l4.state,{invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],cantripIds:l4.input.cantripIds,preparedIds:[...l4.input.preparedIds,'counterspell'],level5HitDieRoll:5});
const l6=advanceWarlockToLevelSix(l5.input,l5.state,{invocations:l5.input.invocations,cantripIds:l5.input.cantripIds,preparedIds:[...l5.input.preparedIds,'fly'],level6HitDieRoll:5});
const l7=advanceWarlockToLevelSeven(l6.input,l6.state,{invocations:[...l6.input.invocations,'whispers_of_the_grave'],cantripIds:l6.input.cantripIds,preparedIds:[...l6.input.preparedIds,'blight'],level7HitDieRoll:5});
const l8=advanceWarlockToLevelEight(l7.input,l7.state,{invocations:l7.input.invocations,cantripIds:l7.input.cantripIds,preparedIds:[...l7.input.preparedIds,'banishment'],level8HitDieRoll:5,level8Improvement:{mode:'two_ones',first:'charisma',second:'constitution'}});
const l9=advanceWarlockToLevelNine(l8.input,{...l8.state,pactSlotSpent:true,darkOnesOwnLuckUsed:1,hitPointsCurrent:l8.state.hitPointsCurrent-3},{invocations:[...l8.input.invocations,'lifedrinker'],cantripIds:l8.input.cantripIds,preparedIds:[...l8.input.preparedIds,'hold_monster'],level9HitDieRoll:5});
const l10=advanceWarlockToLevelTen(l9.input,l9.state,{invocations:l9.input.invocations,cantripIds:[...l9.input.cantripIds,'mage_hand'],preparedIds:l9.input.preparedIds,level10HitDieRoll:5});
const l11=advanceWarlockToLevelEleven(l10.input,l10.state,{invocations:l10.input.invocations,cantripIds:l10.input.cantripIds,preparedIds:[...l10.input.preparedIds,'witch_bolt'],mysticArcanum6Id:'arcane_gate',level11HitDieRoll:5});
const choices={invocations:[...l11.input.invocations,'devouring_blade' as const],cantripIds:l11.input.cantripIds,preparedIds:l11.input.preparedIds,
 mysticArcanum6Id:'true_seeing' as const,level12HitDieRoll:5,level12Improvement:{mode:'plus_two' as const,first:'constitution' as const}};
const twelve=advanceWarlockToLevelTwelve(l11.input,spendWarlockMysticArcanum6(l11.input,l11.state),choices);
const thirteenChoices={invocations:twelve.input.invocations,cantripIds:twelve.input.cantripIds,preparedIds:[...twelve.input.preparedIds,'dimension_door'],mysticArcanum6Id:'true_seeing' as const,mysticArcanum7Id:'forcecage' as const,level13HitDieRoll:7};

describe('Actualización 82: Brujo Infernal nivel 13',()=>{
 it('concede competencia +5, doce preparados y un Arcanum de nivel 7 sin alterar Pacto',()=>{
  const next=advanceWarlockToLevelThirteen(twelve.input,twelve.state,thirteenChoices);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(sheet.proficiencyBonus).toBe(5);
  expect(next.input.preparedIds).toHaveLength(12);
  expect(next.input.invocations).toHaveLength(8);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(sheet.maximumHitPoints-calculateWarlockOne(twelve.input).maximumHitPoints).toBe(11);
  expect(warlockPactSlots(next.state,13)).toEqual(warlockPactSlots(twelve.state,12));
  expect(next.state.mysticArcanum6Used).toBe(true);
  expect(next.state.mysticArcanum7Used).toBe(false);
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:mystic_arcanum_7'}));
 });
 it('reutiliza las cuatro fichas originales de Mago en el catálogo de Brujo',()=>{
  expect(WARLOCK_LEVEL_SEVEN_SPELLS).toHaveLength(4);
  for(const id of WARLOCK_SEVENTH_LEVEL_IDS)expect(warlockSpellRule(id)).toBe(wizardSpellRule(id));
 });
 it('separa ambos Arcanum, recupera el nuevo con descanso largo y rechaza usos dobles',()=>{
  const next=advanceWarlockToLevelThirteen(twelve.input,twelve.state,thirteenChoices);
  const spent=spendWarlockMysticArcanum7(next.input,next.state);
  expect(spent.mysticArcanum6Used).toBe(true);
  expect(spent.mysticArcanum7Used).toBe(true);
  expect(()=>spendWarlockMysticArcanum7(next.input,spent)).toThrow(/agotado/);
  expect(warlockShortRest(spent).mysticArcanum7Used).toBe(true);
  const reset=warlockLongRest(spent,calculateWarlockOne(next.input).maximumHitPoints,false);
  expect(reset.mysticArcanum6Used).toBe(false);
  expect(reset.mysticArcanum7Used).toBe(false);
  expect(()=>spendWarlockMysticArcanum7(twelve.input,twelve.state)).toThrow(/no disponible/);
 });
 it('guarda y desciende 13→12 restaurando exactamente las elecciones y el estado previo',()=>{
  const next=advanceWarlockToLevelThirteen(twelve.input,twelve.state,thirteenChoices);
  const spent=spendWarlockMysticArcanum7(next.input,next.state);
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,spent))));
  const preview=previewWarlockLevelDown(saved.input,saved.warlockState);
  expect(preview.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(twelve.input,twelve.state).input)));
  expect(preview.snapshot.warlockState.mysticArcanum6Used).toBe(true);
  expect(preview.snapshot.warlockState.mysticArcanum7Used).toBeUndefined();
  expect(preview.snapshot.warlockState.hitPointsCurrent).toBe(twelve.state.hitPointsCurrent);
  expect(preview.snapshot.warlockState.pactSlotSpent).toBe(twelve.state.pactSlotSpent);
  expect(previewWarlockLevelDown(preview.snapshot.input,preview.snapshot.warlockState).snapshot.input.level).toBe(11);
 });
 it('rechaza selecciones inválidas, dados fuera de d8 y preparación incompleta',()=>{
  expect(()=>advanceWarlockToLevelThirteen(twelve.input,twelve.state,{...thirteenChoices,mysticArcanum7Id:'fireball' as never})).toThrow(/Arcanum/);
  expect(()=>advanceWarlockToLevelThirteen(twelve.input,twelve.state,{...thirteenChoices,level13HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelThirteen(twelve.input,twelve.state,{...thirteenChoices,preparedIds:twelve.input.preparedIds})).toThrow(/doce/);
  expect(()=>advanceWarlockToLevelThirteen(twelve.input,twelve.state,{...thirteenChoices,invocations:thirteenChoices.invocations.slice(1)})).toThrow(/ocho/);
 });
});
