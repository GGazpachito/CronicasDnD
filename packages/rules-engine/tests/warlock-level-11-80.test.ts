import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,warlockLongRest,warlockPactSlots,warlockShortRest,warlockMagicalCunning,spendWarlockMysticArcanum6,toggleWarlockPactSlot} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_LEVEL_SIX_SPELLS,WARLOCK_SIXTH_LEVEL_IDS,warlockSpellIsShared} from '../src/warlock-spells';
import {SHARED_CLASS_SPELL_LISTS,SHARED_SPELL_RULES} from '../src/shared-spell-catalog';
import {collectWarlockTraits} from '../src/warlock-traits';

const one={classId:'warlock' as const,level:1 as const,name:'Auditoría nivel once',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one' as const,plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,warlockSkills:['arcana','deception'] as const,
 equipmentChoice:'equipment' as const,cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const};
const two=advanceWarlockToLevelTwo(one,initialWarlockOneState(one),{invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:one.cantripIds,preparedIds:['hex','charm_person','armor_of_agathys'],level2HitDieRoll:5});
const three=advanceWarlockToLevelThree(two.input,two.state,{subclassId:'fiend',invocations:two.input.invocations,cantripIds:two.input.cantripIds,preparedIds:[...two.input.preparedIds,'misty_step'],level3HitDieRoll:5});
const four=advanceWarlockToLevelFour(three.input,three.state,{invocations:three.input.invocations,cantripIds:[...three.input.cantripIds,'friends'],preparedIds:[...three.input.preparedIds,'hold_person'],level4HitDieRoll:5,level4Improvement:{mode:'plus_two',first:'charisma'}});
const five=advanceWarlockToLevelFive(four.input,four.state,{invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],cantripIds:four.input.cantripIds,preparedIds:[...four.input.preparedIds,'counterspell'],level5HitDieRoll:5});
const six=advanceWarlockToLevelSix(five.input,five.state,{invocations:five.input.invocations,cantripIds:five.input.cantripIds,preparedIds:[...five.input.preparedIds,'fly'],level6HitDieRoll:5});
const seven=advanceWarlockToLevelSeven(six.input,six.state,{invocations:[...six.input.invocations,'whispers_of_the_grave'],cantripIds:six.input.cantripIds,preparedIds:[...six.input.preparedIds,'blight'],level7HitDieRoll:5});
const eight=advanceWarlockToLevelEight(seven.input,seven.state,{invocations:seven.input.invocations,cantripIds:seven.input.cantripIds,preparedIds:[...seven.input.preparedIds,'banishment'],level8HitDieRoll:5,level8Improvement:{mode:'two_ones',first:'charisma',second:'constitution'}});
const nine=advanceWarlockToLevelNine(eight.input,{...eight.state,pactSlotSpent:true,darkOnesOwnLuckUsed:1,hitPointsCurrent:eight.state.hitPointsCurrent-3},{invocations:[...eight.input.invocations,'lifedrinker'],cantripIds:eight.input.cantripIds,preparedIds:[...eight.input.preparedIds,'hold_monster'],level9HitDieRoll:5});
const ten=advanceWarlockToLevelTen(nine.input,nine.state,{invocations:nine.input.invocations,cantripIds:[...nine.input.cantripIds,'mage_hand'],preparedIds:nine.input.preparedIds,level10HitDieRoll:5});
const choices={invocations:ten.input.invocations,cantripIds:ten.input.cantripIds,preparedIds:[...ten.input.preparedIds,'witch_bolt'],mysticArcanum6Id:'arcane_gate' as const,level11HitDieRoll:5};

describe('Actualización 80: Brujo Infernal nivel 11 y Arcanum místico',()=>{
 it('concede tercer hueco, undécimo preparado, Arcanum aparte y tercer rayo por nivel',()=>{
  const next=advanceWarlockToLevelEleven(ten.input,ten.state,choices);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(sheet.level).toBe(11);
  expect(sheet.maximumHitPoints).toBe(calculateWarlockOne(ten.input).maximumHitPoints+8);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(next.input.preparedIds).toHaveLength(11);
  expect(next.input.preparedIds).not.toContain('arcane_gate');
  expect(next.input.invocations).toHaveLength(7);
  expect(warlockPactSlots(next.state,11)).toEqual([true,false,false]);
  expect(next.input.mysticArcanum6Id).toBe('arcane_gate');
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:mystic_arcanum_6'}));
 });
 it('reutiliza exactamente las siete fichas del Mago, dentro de la biblioteca común',()=>{
  expect(WARLOCK_LEVEL_SIX_SPELLS).toHaveLength(7);
  for(const spell of WARLOCK_LEVEL_SIX_SPELLS){
   expect(spell.level).toBe(6);
   expect(warlockSpellIsShared(spell.id)).toBe(true);
   expect(SHARED_SPELL_RULES).toContain(spell);
   expect(SHARED_CLASS_SPELL_LISTS.find(list=>list.id==='warlock')?.spellIds).toContain(spell.id);
  }
 });
 it('gasta Arcanum una sola vez/descanso largo, sin tocar las tres ranuras',()=>{
  const next=advanceWarlockToLevelEleven(ten.input,ten.state,choices);
  const spent=spendWarlockMysticArcanum6(next.input,next.state);
  expect(spent.mysticArcanum6Used).toBe(true);
  expect(warlockPactSlots(spent,11)).toEqual(warlockPactSlots(next.state,11));
  expect(()=>spendWarlockMysticArcanum6(next.input,spent)).toThrow(/agotado/);
  expect(warlockShortRest(spent).mysticArcanum6Used).toBe(true);
  const rested=warlockLongRest(spent,calculateWarlockOne(next.input).maximumHitPoints,false);
  expect(rested.mysticArcanum6Used).toBe(false);
  expect(spendWarlockMysticArcanum6(next.input,rested).mysticArcanum6Used).toBe(true);
 });
 it('Astucia mágica recupera hasta dos de tres ranuras, una vez por descanso largo',()=>{
  const next=advanceWarlockToLevelEleven(ten.input,ten.state,choices);
  const bothSpent=toggleWarlockPactSlot(toggleWarlockPactSlot(next.state,11,1),11,2);
  expect(warlockPactSlots(bothSpent,11)).toEqual([true,true,true]);
  const regained=warlockMagicalCunning(bothSpent,11);
  expect(warlockPactSlots(regained,11)).toEqual([false,false,true]);
  expect(()=>warlockMagicalCunning(regained,11)).toThrow();
  expect(warlockPactSlots(warlockShortRest(regained),11)).toEqual([false,false,false]);
 });
 it('rechaza Arcanum ajeno, dado incorrecto y atajos de preparación',()=>{
  expect(WARLOCK_SIXTH_LEVEL_IDS).toContain('arcane_gate');
  expect(()=>advanceWarlockToLevelEleven(ten.input,ten.state,{...choices,mysticArcanum6Id:'fireball' as 'arcane_gate'})).toThrow(/Arcanum/);
  expect(()=>advanceWarlockToLevelEleven(ten.input,ten.state,{...choices,level11HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelEleven(ten.input,ten.state,{...choices,preparedIds:ten.input.preparedIds})).toThrow(/once/);
  expect(()=>makeWarlockCharacterSnapshot({...ten.input,mysticArcanum6Id:'arcane_gate'},ten.state)).toThrow(/nivel 11/);
 });
 it('valida guardado y deshace 11→10 sin perder vida, resistencia ni selecciones',()=>{
  const next=advanceWarlockToLevelEleven(ten.input,ten.state,choices);
  const changed={...spendWarlockMysticArcanum6(next.input,next.state),thirdPactSlotSpent:true};
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,changed))));
  expect(saved.warlockState.mysticArcanum6Used).toBe(true);
  const down=previewWarlockLevelDown(saved.input,saved.warlockState);
  expect(down.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(ten.input,ten.state).input)));
  expect(down.snapshot.warlockState.thirdPactSlotSpent).toBeUndefined();
  expect(down.snapshot.warlockState.mysticArcanum6Used).toBeUndefined();
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(ten.state.hitPointsCurrent);
  expect(down.snapshot.warlockState.pactSlotSpent).toBe(true);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(9);
 });
});
