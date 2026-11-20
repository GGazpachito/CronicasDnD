import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,WARLOCK_LEVEL_SEVEN_INVOCATIONS,warlockPactSlots,warlockDarkOnesOwnLuckMaximum} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_LEVEL_FOUR_SPELLS,WARLOCK_FIEND_LEVEL_SEVEN_SPELLS,warlockSpellRule,warlockSpellIsShared} from '../src/warlock-spells';
import {wizardSpellRule} from '../src/wizard-spell-details';
import {SHARED_CLASS_SPELL_LISTS} from '../src/shared-spell-catalog';
import {collectWarlockTraits} from '../src/warlock-traits';

const one={classId:'warlock' as const,level:1 as const,name:'Infernal 7',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one' as const,plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,warlockSkills:['arcana','deception'] as const,
 equipmentChoice:'equipment' as const,cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const};
const two=advanceWarlockToLevelTwo(one,initialWarlockOneState(one),{invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:one.cantripIds,preparedIds:['hex','charm_person','armor_of_agathys'],level2HitDieRoll:5});
const three=advanceWarlockToLevelThree(two.input,two.state,{subclassId:'fiend',invocations:two.input.invocations,cantripIds:two.input.cantripIds,preparedIds:[...two.input.preparedIds,'misty_step'],level3HitDieRoll:5});
const four=advanceWarlockToLevelFour(three.input,three.state,{invocations:three.input.invocations,cantripIds:[...three.input.cantripIds,'friends'],preparedIds:[...three.input.preparedIds,'hold_person'],level4HitDieRoll:5,level4Improvement:{mode:'plus_two',first:'charisma'}});
const five=advanceWarlockToLevelFive(four.input,four.state,{invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],cantripIds:four.input.cantripIds,preparedIds:[...four.input.preparedIds,'counterspell'],level5HitDieRoll:5});
const six=advanceWarlockToLevelSix(five.input,five.state,{invocations:five.input.invocations,cantripIds:five.input.cantripIds,preparedIds:[...five.input.preparedIds,'fly'],level6HitDieRoll:5});
const choices={invocations:[...six.input.invocations,'whispers_of_the_grave'] as const,cantripIds:six.input.cantripIds,preparedIds:[...six.input.preparedIds,'blight'],level7HitDieRoll:5};

describe('Actualización 76: Brujo nivel 7 · magia de nivel 4 y sexto don',()=>{
 it('calcula PG, competencia y recursos sin modificar los usos existentes',()=>{
  const seven=advanceWarlockToLevelSeven(six.input,{...six.state,darkOnesOwnLuckUsed:2,pactSlotSpent:true},choices);
  const sheet=calculateWarlockOne(seven.input,seven.state);
  expect(sheet.level).toBe(7);expect(sheet.maximumHitPoints).toBe(52);expect(sheet.proficiencyBonus).toBe(3);
  expect(seven.input.preparedIds).toHaveLength(8);expect(seven.input.invocations).toHaveLength(6);
  expect(seven.input.cantripIds).toHaveLength(3);expect(warlockPactSlots(seven.state,7)).toEqual([true,false]);
  expect(seven.state.darkOnesOwnLuckUsed).toBe(2);expect(warlockDarkOnesOwnLuckMaximum(seven.input)).toBe(4);
  expect(collectWarlockTraits(seven.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:invocation:whispers_of_the_grave'}));
  expect(collectWarlockTraits(seven.input,sheet).traits.find(t=>t.id==='warlock:fiend_patron')?.details).toContain('Escudo de fuego (nivel 4)');
 });
 it('reutiliza exactamente las fichas originales del Mago y listas por clase',()=>{
  expect(WARLOCK_LEVEL_FOUR_SPELLS).toHaveLength(6);expect(WARLOCK_FIEND_LEVEL_SEVEN_SPELLS).toHaveLength(2);
  for(const spell of [...WARLOCK_LEVEL_FOUR_SPELLS,...WARLOCK_FIEND_LEVEL_SEVEN_SPELLS]){
   expect(spell).toBe(wizardSpellRule(spell.id));expect(warlockSpellIsShared(spell.id)).toBe(true);
  }
  const fiend=SHARED_CLASS_SPELL_LISTS.find(list=>list.id==='fiend')!;
  expect(fiend.spellIds).toContain('fire_shield');expect(fiend.spellIds).toContain('wall_of_fire');
  expect(SHARED_CLASS_SPELL_LISTS.find(list=>list.id==='warlock')?.spellIds).toContain('blight');
  expect(WARLOCK_LEVEL_SEVEN_INVOCATIONS).toContain('whispers_of_the_grave');
  expect(warlockSpellRule('speak_with_dead')).toBe(wizardSpellRule('speak_with_dead'));
 });
 it('rechaza preparaciones del patrón y reglas incorrectas de nueva invocación',()=>{
  expect(()=>advanceWarlockToLevelSeven(six.input,six.state,{...choices,preparedIds:[...six.input.preparedIds,'fire_shield']})).toThrow(/catálogo/);
  expect(()=>advanceWarlockToLevelSeven(six.input,six.state,{...choices,level7HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelSeven(six.input,six.state,{...choices,invocations:six.input.invocations})).toThrow(/seis/);
  expect(()=>advanceWarlockToLevelSeven(six.input,six.state,{...choices,invocations:['agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite','gaze_of_two_minds','whispers_of_the_grave']})).toThrow(/Pacto/);
  expect(()=>advanceWarlockToLevelSeven(six.input,six.state,{...choices,preparedIds:[...six.input.preparedIds.slice(0,5),'blight','banishment','charm_monster']})).toThrow(/seis/);
 });
 it('guarda/recarga y retrocede 7→6→5 sin perder elecciones ni vínculos de nivel 6',()=>{
  const seven=advanceWarlockToLevelSeven({...six.input,companions:[]},{...six.state,darkOnesOwnLuckUsed:1,hitPointsCurrent:six.state.hitPointsCurrent-4,pactSlotSpent:true},choices);
  const snapshot=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(seven.input,seven.state))));
  const down=previewWarlockLevelDown(snapshot.input,snapshot.warlockState);
  expect(down.snapshot.input.level).toBe(6);expect(down.snapshot.input.preparedIds).toEqual(six.input.preparedIds);
  expect(down.snapshot.input.invocations).toEqual(six.input.invocations);
  expect(down.snapshot.input.companions).toEqual([]);expect(down.snapshot.warlockState.pactSlotSpent).toBe(true);
  expect(down.snapshot.warlockState.darkOnesOwnLuckUsed).toBe(1);
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(calculateWarlockOne(down.snapshot.input).maximumHitPoints-4);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(5);
 });
});
