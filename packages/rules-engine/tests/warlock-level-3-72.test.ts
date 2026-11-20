import {describe,it,expect} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,
 warlockPactSlots,toggleWarlockPactSlot,warlockMagicalCunning,warlockDarkOnesBlessing,warlockShortRest,warlockLongRest,type GuidedWarlockInput} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_LEVEL_TWO_SPELLS,WARLOCK_FIEND_LEVEL_THREE_IDS,warlockSpellRule,warlockSpellIsShared} from '../src/warlock-spells';
import {SHARED_SPELL_RULES,SHARED_CLASS_SPELL_LISTS,WARLOCK_SPELL_IDS} from '../src/shared-spell-catalog';
import {collectWarlockTraits} from '../src/warlock-traits';

const start:GuidedWarlockInput={classId:'warlock',level:1,name:'Patrono',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',warlockSkills:['arcana','deception'],
 equipmentChoice:'equipment',cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],
 invocations:['pact_of_blade'],pactWeaponId:'sickle'};
const second=advanceWarlockToLevelTwo(start,initialWarlockOneState(start),{
 invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:start.cantripIds,
 preparedIds:['hex','charm_person','armor_of_agathys'],level2HitDieRoll:5,
});
const thirdChoices={subclassId:'fiend' as const,invocations:second.input.invocations,
 cantripIds:second.input.cantripIds,preparedIds:[...second.input.preparedIds,'misty_step'],level3HitDieRoll:5};

describe('Paso 72: Brujo nivel 3 y Patrón Infernal',()=>{
 it('conserva las tres invocaciones y eleva las dos ranuras a nivel 2',()=>{
  const result=advanceWarlockToLevelThree(second.input,second.state,thirdChoices);
  const sheet=calculateWarlockOne(result.input,result.state);
  expect(result.input.level).toBe(3);
  expect(result.input.subclassId).toBe('fiend');
  expect(result.input.invocations).toEqual(second.input.invocations);
  expect(result.input.preparedIds).toHaveLength(4);
  expect(sheet.maximumHitPoints).toBe(24); // 8+CON, dos d8 de media+CON, tenacidad enana x3
  expect(warlockPactSlots(result.state,3)).toEqual([false,false]);
  expect(()=>toggleWarlockPactSlot(result.state,3,2)).toThrow(/inexistente/);
  const spent=toggleWarlockPactSlot(toggleWarlockPactSlot(result.state,3,0),3,1);
  expect(warlockPactSlots(warlockMagicalCunning(spent,3),3)).toEqual([false,true]);
  expect(warlockPactSlots(warlockShortRest(spent),3)).toEqual([false,false]);
  expect(warlockLongRest(spent,sheet.maximumHitPoints,false).hitPointsCurrent).toBe(sheet.maximumHitPoints);
 });
 it('incorpora conjuros gratuitos de patrón y comparte las fichas ya existentes de Mago',()=>{
  const result=advanceWarlockToLevelThree(second.input,second.state,thirdChoices);
  expect(result.input.preparedIds).not.toContain('command');
  expect(WARLOCK_FIEND_LEVEL_THREE_IDS).toEqual(['burning_hands','command','scorching_ray','suggestion']);
  expect(WARLOCK_LEVEL_TWO_SPELLS).toHaveLength(12);
  // La biblioteca es extensible: al añadir nivel 5 se mantienen todos los hechizos previos.
  expect(WARLOCK_SPELL_IDS.size).toBeGreaterThanOrEqual(39);
  expect(SHARED_CLASS_SPELL_LISTS.some(list=>list.id==='fiend'&&WARLOCK_FIEND_LEVEL_THREE_IDS.every(id=>list.spellIds.includes(id)))).toBe(true);
  expect(SHARED_SPELL_RULES.some(spell=>spell.id==='command')).toBe(true);
  expect(warlockSpellRule('enthrall')?.level).toBe(2);
  expect(warlockSpellIsShared('misty_step')).toBe(true);
  const traits=collectWarlockTraits(result.input,calculateWarlockOne(result.input));
  expect(traits.traits.some(trait=>trait.id==='warlock:dark_ones_blessing'&&trait.summary.includes('6 PG'))).toBe(true);
  expect(traits.traits.some(trait=>trait.id==='warlock:fiend_patron')).toBe(true);
  expect(warlockDarkOnesBlessing(result.input,{...result.state,temporaryHitPoints:2}).temporaryHitPoints).toBe(6);
  expect(warlockDarkOnesBlessing(result.input,{...result.state,temporaryHitPoints:12}).temporaryHitPoints).toBe(12);
  expect(()=>warlockDarkOnesBlessing(second.input,second.state)).toThrow();
 });
 it('el dado del tercer nivel calcula PG y nunca altera el del segundo',()=>{
  const roll=advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,level3HitDieRoll:8});
  expect(calculateWarlockOne(roll.input).maximumHitPoints).toBe(27);
  expect(roll.input.level2HitDieRoll).toBe(5);
  expect(()=>advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,level3HitDieRoll:9})).toThrow();
 });
 it('impide sustituir más de una invocación, truco o conjuro ya preparado',()=>{
  expect(()=>advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,
   invocations:['pact_of_chain','eldritch_mind','mask_of_many_faces']})).toThrow(/una/);
  expect(()=>advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,
   cantripIds:['friends','mage_hand']})).toThrow(/trucos/);
  expect(()=>advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,
   preparedIds:['misty_step','invisibility','darkness','mirror_image']})).toThrow(/dos/);
  expect(()=>advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,subclassId:'unknown' as 'fiend'})).toThrow();
  expect(()=>advanceWarlockToLevelThree(second.input,second.state,{...thirdChoices,
   preparedIds:['hex','charm_person','misty_step','suggestion']})).toThrow(/gratuitos/i);
 });
 it('restaura exactamente las elecciones del nivel 2 al bajar 3→2 y mantiene las del resto del personaje',()=>{
  const modified=advanceWarlockToLevelThree(second.input,{...second.state,hitPointsCurrent:13},{
   ...thirdChoices,invocations:['pact_of_chain','agonizing_blast','eldritch_spear'],
   preparedIds:['hex','charm_person','misty_step','darkness'],
  });
  const preview=previewWarlockLevelDown(modified.input,modified.state);
  expect(preview.fromLevel).toBe(3);
  expect(preview.snapshot.input.level).toBe(2);
  expect(preview.snapshot.input.invocations).toEqual(second.input.invocations);
  expect(preview.snapshot.input.preparedIds).toEqual(second.input.preparedIds);
  expect(preview.snapshot.input.pactWeaponId).toBe(second.input.pactWeaponId);
  expect(preview.snapshot.warlockState.hitPointsCurrent).toBe(13);
  expect(preview.snapshot.warlockState.familiarForm).toBe(null);
  expect(preview.snapshot.input.level3History).toBeUndefined();
 });
 it('admite snapshots nuevos y viejos sin cambiar el esquema 4',()=>{
  const result=advanceWarlockToLevelThree(second.input,second.state,thirdChoices);
  const snapshot=makeWarlockCharacterSnapshot(result.input,result.state);
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  expect(validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(second.input,second.state)))).input.level).toBe(2);
  expect(()=>makeWarlockCharacterSnapshot({...result.input,level3History:undefined},result.state)).toThrow(/historial/i);
 });
});
