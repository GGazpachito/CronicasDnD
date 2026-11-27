import {describe,expect,it} from 'vitest';
import {calculateWarlockOne,chooseWarlockFiendishResilience,initialWarlockOneState,makeWarlockCharacterSnapshot,validateWarlockCharacterSnapshot,warlockLongRest,warlockPactSlots,warlockShortRest,WARLOCK_FIEND_DAMAGE_TYPES} from '../src/warlock';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,previewWarlockLevelDown} from '../src/warlock-level-up';
import {collectWarlockTraits} from '../src/warlock-traits';

const one={classId:'warlock' as const,level:1 as const,name:'Auditoría nivel diez',background:'acolyte' as const,species:'dwarf' as const,
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one' as const,plusTwoAbility:'charisma' as const,plusOneAbility:'wisdom' as const,warlockSkills:['arcana','deception'] as const,
 equipmentChoice:'equipment' as const,cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'] as const,pactWeaponId:'sickle' as const};
const two=advanceWarlockToLevelTwo(one,initialWarlockOneState(one),{invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],cantripIds:one.cantripIds,preparedIds:['hex','charm_person','unseen_servant'],level2HitDieRoll:5});
const three=advanceWarlockToLevelThree(two.input,two.state,{subclassId:'fiend',invocations:two.input.invocations,cantripIds:two.input.cantripIds,preparedIds:[...two.input.preparedIds,'misty_step'],level3HitDieRoll:5});
const four=advanceWarlockToLevelFour(three.input,three.state,{invocations:three.input.invocations,cantripIds:[...three.input.cantripIds,'chill_touch'],preparedIds:[...three.input.preparedIds,'hold_person'],level4HitDieRoll:5,level4Improvement:{mode:'plus_two',first:'charisma'}});
const five=advanceWarlockToLevelFive(four.input,four.state,{invocations:['pact_of_blade','agonizing_blast','eldritch_spear','thirsting_blade','eldritch_smite'],cantripIds:four.input.cantripIds,preparedIds:[...four.input.preparedIds,'counterspell'],level5HitDieRoll:5});
const six=advanceWarlockToLevelSix(five.input,five.state,{invocations:five.input.invocations,cantripIds:five.input.cantripIds,preparedIds:[...five.input.preparedIds,'fly'],level6HitDieRoll:5});
const seven=advanceWarlockToLevelSeven(six.input,six.state,{invocations:[...six.input.invocations,'whispers_of_the_grave'],cantripIds:six.input.cantripIds,preparedIds:[...six.input.preparedIds,'blight'],level7HitDieRoll:5});
const eight=advanceWarlockToLevelEight(seven.input,seven.state,{invocations:seven.input.invocations,cantripIds:seven.input.cantripIds,preparedIds:[...seven.input.preparedIds,'banishment'],level8HitDieRoll:5,level8Improvement:{mode:'two_ones',first:'charisma',second:'constitution'}});
const nine=advanceWarlockToLevelNine(eight.input,{...eight.state,pactSlotSpent:true,darkOnesOwnLuckUsed:1,hitPointsCurrent:eight.state.hitPointsCurrent-3},{invocations:[...eight.input.invocations,'lifedrinker'],cantripIds:eight.input.cantripIds,preparedIds:[...eight.input.preparedIds,'hold_monster'],level9HitDieRoll:5});
const choices={invocations:nine.input.invocations,cantripIds:[...nine.input.cantripIds,'mage_hand'],preparedIds:nine.input.preparedIds,level10HitDieRoll:5};

describe('Actualización 79: Brujo Infernal nivel 10',()=>{
 it('concede cuarto truco, resistencia e incremento de PG, pero mantiene ranuras/preparados/invocaciones',()=>{
  const next=advanceWarlockToLevelTen(nine.input,nine.state,choices);
  const sheet=calculateWarlockOne(next.input,next.state);
  expect(sheet.level).toBe(10);
  expect(sheet.maximumHitPoints).toBe(calculateWarlockOne(nine.input).maximumHitPoints+8);
  expect(sheet.proficiencyBonus).toBe(4);
  expect(next.input.cantripIds).toHaveLength(4);
  expect(next.input.preparedIds).toHaveLength(10);
  expect(next.input.invocations).toHaveLength(7);
  expect(warlockPactSlots(next.state,10)).toEqual([true,false]);
  expect(next.state.fiendishResilienceType).toBeNull();
  expect(next.state.fiendishResiliencePending).toBe(false);
  expect(collectWarlockTraits(next.input,sheet).traits).toContainEqual(expect.objectContaining({id:'warlock:fiendish_resilience'}));
 });
 it('ofrece elegir y reemplazar resistencia solo después de descansar; no permite fuerza',()=>{
  const next=advanceWarlockToLevelTen(nine.input,nine.state,choices);
  expect(Object.keys(WARLOCK_FIEND_DAMAGE_TYPES)).toHaveLength(12);
  expect(()=>chooseWarlockFiendishResilience(next.input,next.state,'fire')).toThrow(/descanso/);
  const rested=warlockShortRest(next.state);
  expect(rested.fiendishResiliencePending).toBe(true);
  expect(()=>chooseWarlockFiendishResilience(next.input,rested,'force' as 'fire')).toThrow(/Fuerza/);
  const fire=chooseWarlockFiendishResilience(next.input,rested,'fire');
  expect(fire.fiendishResilienceType).toBe('fire');
  expect(fire.fiendishResiliencePending).toBe(false);
  expect(()=>chooseWarlockFiendishResilience(next.input,fire,'cold')).toThrow(/descanso/);
  const cold=chooseWarlockFiendishResilience(next.input,warlockLongRest(fire,calculateWarlockOne(next.input).maximumHitPoints,false),'cold');
  expect(cold.fiendishResilienceType).toBe('cold');
 });
 it('valida elecciones, estados alterados y el resultado del dado',()=>{
  expect(()=>advanceWarlockToLevelTen(nine.input,nine.state,{...choices,level10HitDieRoll:9})).toThrow(/dado/);
  expect(()=>advanceWarlockToLevelTen(nine.input,nine.state,{...choices,cantripIds:nine.input.cantripIds})).toThrow(/cuatro trucos/);
  expect(()=>advanceWarlockToLevelTen(nine.input,nine.state,{...choices,preparedIds:[...nine.input.preparedIds.slice(2),'ray_of_enfeeblement','hold_person']})).toThrow(/nueve/);
  const next=advanceWarlockToLevelTen(nine.input,nine.state,choices);
  expect(()=>makeWarlockCharacterSnapshot(next.input,{...next.state,fiendishResilienceType:'force' as 'fire'})).toThrow(/Resistencia infernal/);
 });
 it('recupera exactamente elecciones e historial de nivel 9, conservando daño y recursos al descender',()=>{
  const next=advanceWarlockToLevelTen(nine.input,nine.state,choices);
  const rested=warlockShortRest(next.state);
  const chosen=chooseWarlockFiendishResilience(next.input,rested,'radiant');
  const saved=validateWarlockCharacterSnapshot(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(next.input,chosen))));
  const down=previewWarlockLevelDown(saved.input,saved.warlockState);
  expect(down.snapshot.input).toEqual(JSON.parse(JSON.stringify(makeWarlockCharacterSnapshot(nine.input,nine.state).input)));
  expect(down.snapshot.warlockState.fiendishResilienceType).toBeUndefined();
  expect(down.snapshot.warlockState.fiendishResiliencePending).toBeUndefined();
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(nine.state.hitPointsCurrent);
  expect(down.snapshot.warlockState.contactPatronUsed).toBe(false);
  expect(down.snapshot.warlockState.darkOnesOwnLuckUsed).toBe(1);
  expect(previewWarlockLevelDown(down.snapshot.input,down.snapshot.warlockState).snapshot.input.level).toBe(8);
 });
});
