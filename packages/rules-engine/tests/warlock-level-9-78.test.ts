import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,warlockPactSlots,spendWarlockContactPatron,warlockLongRest} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_LEVEL_FIVE_SPELLS,warlockSpellIsShared} from '../src/warlock-spells';
import {SHARED_SPELL_RULES,SHARED_CLASS_SPELL_LISTS} from '../src/shared-spell-catalog';
import {collectWarlockTraits} from '../src/warlock-traits';

const one={classId:'warlock' as const,level:1 as const,name:'Brujo auditoría 9',background:'acolyte' as const,species:'dwarf' as const,
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
const nineChoices={invocations:[...eight.input.invocations,'lifedrinker'] as const,cantripIds:eight.input.cantripIds,preparedIds:[...eight.input.preparedIds,'hold_monster'],level9HitDieRoll:5};

describe('Actualización 78: Brujo nivel 9',()=>{
 it('aumenta competencia, ranuras, PG, invocaciones y preparados sin duplicar hechizos',()=>{
  const next=advanceWarlockToLevelNine(eight.input,eight.state,nineChoices);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(sheet.proficiencyBonus).toBe(4);
  expect(sheet.maximumHitPoints).toBe(75);
  expect(next.input.invocations).toHaveLength(7);
  expect(next.input.preparedIds).toHaveLength(10);
  expect(warlockPactSlots(next.state,9)).toEqual([false,false]);
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:contact_patron'}));
  expect(WARLOCK_LEVEL_FIVE_SPELLS).toHaveLength(9);
  expect(WARLOCK_LEVEL_FIVE_SPELLS.every(s=>warlockSpellIsShared(s.id))).toBe(true);
  expect(SHARED_SPELL_RULES.filter(s=>s.id==='contact_other_plane')).toHaveLength(1);
  expect(SHARED_CLASS_SPELL_LISTS.find(x=>x.id==='warlock')?.spellIds).toContain('hold_monster');
 });
 it('contacta una vez sin ranura y se recupera solamente en descanso largo',()=>{
  const next=advanceWarlockToLevelNine(eight.input,eight.state,nineChoices);
  const used=spendWarlockContactPatron(next.input,next.state);
  expect(used.contactPatronUsed).toBe(true);
  expect(warlockPactSlots(used,9)).toEqual([false,false]);
  expect(()=>spendWarlockContactPatron(next.input,used)).toThrow(/descansa largo/);
  expect(warlockLongRest(used,calculateWarlockOne(next.input).maximumHitPoints,false).contactPatronUsed).toBe(false);
 });
 it('valida selección, prerequisitos y lanzamiento ya preparado por el rasgo',()=>{
  expect(()=>advanceWarlockToLevelNine(eight.input,eight.state,{...nineChoices,preparedIds:[...eight.input.preparedIds,'contact_other_plane']})).toThrow(/gratis/);
  expect(()=>advanceWarlockToLevelNine(eight.input,eight.state,{...nineChoices,level9HitDieRoll:0})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelNine(eight.input,eight.state,{...nineChoices,invocations:[...eight.input.invocations,'gift_of_the_protectors']})).toThrow(/Pacto/);
 });
 it('persiste y desciende 9→8→7, conservando elecciones, daño y recursos',()=>{
  const original={...eight.state,hitPointsCurrent:eight.state.hitPointsCurrent-3,pactSlotSpent:true,darkOnesOwnLuckUsed:1};
  const next=advanceWarlockToLevelNine(eight.input,original,nineChoices);
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,next.state))));
  const used=spendWarlockContactPatron(saved.input,saved.warlockState);
  const down=previewWarlockLevelDown(saved.input,used);
  expect(down.snapshot.input.level).toBe(8);
  expect(down.snapshot.input.invocations).toEqual(eight.input.invocations);
  expect(down.snapshot.input.preparedIds).toEqual(eight.input.preparedIds);
  expect(down.snapshot.input.level9History).toBeUndefined();
  expect(down.snapshot.warlockState.contactPatronUsed).toBeUndefined();
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(calculateWarlockOne(down.snapshot.input).maximumHitPoints-3);
  expect(down.snapshot.warlockState.pactSlotSpent).toBe(true);
  expect(down.snapshot.warlockState.darkOnesOwnLuckUsed).toBe(1);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(7);
 });
});
