import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,spendWarlockMysticArcanum6,warlockPactSlots,warlockWeaponProfile,warlockPactWeaponAttackCount,WARLOCK_INVOCATION_PREREQUISITES} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,advanceWarlockToLevelTwelve,previewWarlockLevelDown} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';

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

describe('Actualización 81: Brujo Infernal nivel 12',()=>{
 it('obtiene octava invocación y tercera Mejora de característica, con vida recalculada',()=>{
  const next=advanceWarlockToLevelTwelve(l11.input,l11.state,choices),sheet=calculateWarlockOne(next.input,next.state);
  expect(next.input.level).toBe(12);
  expect(sheet.abilityScores.constitution).toBe(16);
  expect(sheet.maximumHitPoints-calculateWarlockOne(l11.input).maximumHitPoints).toBe(20);
  expect(next.input.invocations).toHaveLength(8);
  expect(next.input.preparedIds).toHaveLength(11);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(warlockPactSlots(next.state,12)).toEqual(warlockPactSlots(l11.state,11));
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:ability_score_improvement_12'}));
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:invocation:devouring_blade'}));
 });
 it('exige Hoja sedienta, pacto y nivel 12 para Hoja devoradora',()=>{
  expect(WARLOCK_INVOCATION_PREREQUISITES.devouring_blade).toBe('thirsting_blade');
  expect(()=>advanceWarlockToLevelTwelve(l11.input,l11.state,{...choices,invocations:choices.invocations.filter(id=>id!=='thirsting_blade').concat('visions_of_distant_realms')})).toThrow(/requisit/);
  expect(()=>makeWarlockCharacterSnapshot({...l11.input,invocations:choices.invocations})).toThrow();
  const next=advanceWarlockToLevelTwelve(l11.input,l11.state,choices),sheet=calculateWarlockOne(next.input);
  const equipment={...sheet.inventory,equipped:{...sheet.inventory.equipped,weapons:['sickle' as const]}};
  const weapon=warlockWeaponProfile('sickle',equipment,sheet.abilityScores,sheet.proficiencyBonus,next.input.invocations,'sickle');
  expect(weapon.pactActive).toBe(true);
  expect(warlockPactWeaponAttackCount(weapon.pactActive,next.input.invocations)).toBe(3);
  expect(warlockPactWeaponAttackCount(false,next.input.invocations)).toBe(1);
  expect(warlockPactWeaponAttackCount(true,l11.input.invocations)).toBe(2);
  expect(()=>warlockWeaponProfile('sickle',sheet.inventory,sheet.abilityScores,sheet.proficiencyBonus,next.input.invocations,'sickle')).toThrow(/no está equipada/);
 });
 it('rechaza mejoras por encima de 20, dados fuera de d8 y selecciones incompletas',()=>{
  expect(()=>advanceWarlockToLevelTwelve(l11.input,l11.state,{...choices,level12Improvement:{mode:'plus_two',first:'charisma'}})).toThrow(/20/);
  expect(()=>advanceWarlockToLevelTwelve(l11.input,l11.state,{...choices,level12HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelTwelve(l11.input,l11.state,{...choices,preparedIds:l11.input.preparedIds.slice(1)})).toThrow(/once/);
 });
 it('conserva Arcanum agotado al sustituirlo, y recupera elecciones exactas en 12→11',()=>{
  const spent=spendWarlockMysticArcanum6(l11.input,l11.state);
  const next=advanceWarlockToLevelTwelve(l11.input,spent,choices);
  expect(next.input.mysticArcanum6Id).toBe('true_seeing');
  expect(next.state.mysticArcanum6Used).toBe(true);
  const stored=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,next.state))));
  const down=previewWarlockLevelDown(stored.input,stored.warlockState);
  expect(down.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(l11.input,l11.state).input)));
  expect(down.snapshot.warlockState.mysticArcanum6Used).toBe(true);
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(l11.state.hitPointsCurrent);
  expect(down.snapshot.warlockState.pactSlotSpent).toBe(l11.state.pactSlotSpent);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(10);
 });
});
