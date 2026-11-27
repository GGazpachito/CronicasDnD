import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,warlockPactSlots,warlockDarkOnesOwnLuckMaximum} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,previewWarlockLevelDown} from '../src/warlock-level-up';
import {WARLOCK_FIEND_ALWAYS_PREPARED_IDS,WARLOCK_SPELLS_THROUGH_LEVEL_FOUR} from '../src/warlock-spells';
import {collectWarlockTraits} from '../src/warlock-traits';

const one={classId:'warlock' as const,level:1 as const,name:'Infernal 8',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one' as const,plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,warlockSkills:['arcana','deception'] as const,
 equipmentChoice:'equipment' as const,cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const};
const two=advanceWarlockToLevelTwo(one,initialWarlockOneState(one),{invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:one.cantripIds,preparedIds:['hex','charm_person','unseen_servant'],level2HitDieRoll:5});
const three=advanceWarlockToLevelThree(two.input,two.state,{subclassId:'fiend',invocations:two.input.invocations,cantripIds:two.input.cantripIds,preparedIds:[...two.input.preparedIds,'misty_step'],level3HitDieRoll:5});
const four=advanceWarlockToLevelFour(three.input,three.state,{invocations:three.input.invocations,cantripIds:[...three.input.cantripIds,'chill_touch'],preparedIds:[...three.input.preparedIds,'hold_person'],level4HitDieRoll:5,level4Improvement:{mode:'plus_two',first:'charisma'}});
const five=advanceWarlockToLevelFive(four.input,four.state,{invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],cantripIds:four.input.cantripIds,preparedIds:[...four.input.preparedIds,'counterspell'],level5HitDieRoll:5});
const six=advanceWarlockToLevelSix(five.input,five.state,{invocations:five.input.invocations,cantripIds:five.input.cantripIds,preparedIds:[...five.input.preparedIds,'fly'],level6HitDieRoll:5});
const seven=advanceWarlockToLevelSeven(six.input,six.state,{invocations:[...six.input.invocations,'whispers_of_the_grave'],cantripIds:six.input.cantripIds,preparedIds:[...six.input.preparedIds,'blight'],level7HitDieRoll:5});
const choice={invocations:seven.input.invocations,cantripIds:seven.input.cantripIds,preparedIds:[...seven.input.preparedIds,'banishment'],level8HitDieRoll:5,level8Improvement:{mode:'two_ones' as const,first:'charisma' as const,second:'constitution' as const}};

describe('Actualización 77: Brujo nivel 8 · mejora de característica y noveno preparado',()=>{
 it('calcula modificadores y PG de los ocho niveles; preserva recursos e historial',()=>{
  const next=advanceWarlockToLevelEight(seven.input,{...seven.state,darkOnesOwnLuckUsed:2,pactSlotSpent:true},choice);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(sheet.level).toBe(8);expect(sheet.abilityScores.charisma).toBe(20);expect(sheet.abilityScores.constitution).toBe(14);
  expect(sheet.proficiencyBonus).toBe(3);expect(sheet.maximumHitPoints).toBe(67);
  expect(next.input.invocations).toHaveLength(6);expect(next.input.cantripIds).toHaveLength(3);
  expect(next.input.preparedIds).toHaveLength(9);expect(WARLOCK_FIEND_ALWAYS_PREPARED_IDS).toHaveLength(8);
  expect(warlockPactSlots(next.state,8)).toEqual([true,false]);expect(next.state.darkOnesOwnLuckUsed).toBe(2);
  expect(warlockDarkOnesOwnLuckMaximum(next.input)).toBe(5);
  const traits=collectWarlockTraits(next.input,sheet).traits;
  expect(traits).toContainEqual(expect.objectContaining({id:'warlock:ability_score_improvement_8'}));
  expect(traits.find(t=>t.id==='warlock:pact_magic')?.summary).toContain('nueve');
  expect(traits.find(t=>t.id==='warlock:fiend_patron')?.explanation).toContain('nueve');
 });
 it('no permite superar 20, preparar conjuros gratuitos, perder dos elecciones o tirar 1d8 inválido',()=>{
  expect(()=>advanceWarlockToLevelEight(seven.input,seven.state,{...choice,level8Improvement:{mode:'plus_two',first:'charisma'}})).toThrow();
  expect(()=>advanceWarlockToLevelEight(seven.input,seven.state,{...choice,level8HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelEight(seven.input,seven.state,{...choice,preparedIds:[...seven.input.preparedIds,'fire_shield']})).toThrow(/catálogo/);
  expect(()=>advanceWarlockToLevelEight(seven.input,seven.state,{...choice,preparedIds:seven.input.preparedIds})).toThrow(/nueve/);
  expect(()=>advanceWarlockToLevelEight(seven.input,seven.state,{...choice,invocations:seven.input.invocations.slice(0,5)})).toThrow(/seis/);
  expect(()=>advanceWarlockToLevelEight(seven.input,seven.state,{...choice,invocations:['agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite','gaze_of_two_minds','whispers_of_the_grave']})).toThrow(/Pacto/);
  expect(WARLOCK_SPELLS_THROUGH_LEVEL_FOUR.map(s=>s.id)).toContain('banishment');
 });
 it('persistencia y descenso 8→7→6 reversible conservando elecciones, daño e inventario',()=>{
  const prior={...seven.state,hitPointsCurrent:seven.state.hitPointsCurrent-4,pactSlotSpent:true,darkOnesOwnLuckUsed:1};
  const next=advanceWarlockToLevelEight({...seven.input,companions:[]},prior,choice);
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,next.state))));
  const down=previewWarlockLevelDown(saved.input,saved.warlockState);
  expect(down.snapshot.input.level).toBe(7);expect(down.snapshot.input.preparedIds).toEqual(seven.input.preparedIds);
  expect(down.snapshot.input.invocations).toEqual(seven.input.invocations);
  expect(down.snapshot.input.cantripIds).toEqual(seven.input.cantripIds);
  expect(down.snapshot.input.level8Improvement).toBeUndefined();expect(down.snapshot.input.level8HitDieRoll).toBeUndefined();
  expect(down.snapshot.input.companions).toEqual([]);expect(down.snapshot.warlockState.pactSlotSpent).toBe(true);
  expect(down.snapshot.warlockState.darkOnesOwnLuckUsed).toBe(1);
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(calculateWarlockOne(down.snapshot.input).maximumHitPoints-4);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(6);
 });
});
