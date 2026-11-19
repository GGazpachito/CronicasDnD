import {describe,expect,it} from 'vitest';
import {CLASS_HIT_DICE,appendLevelHitPointRoll,validateLevelHitPointRolls} from '../src/level-hit-points';
import {calculateGuidedFighter,type GuidedFighterInput} from '../src/guided';
import {previewFighterLevelUp} from '../src/level-up-wizard';
import {fighterInputAtPreviousLevel,previewWizardLevelDown} from '../src/level-down';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp} from '../src/wizard-level-up';
import {calculateWarlockOne,initialWarlockOneState,type GuidedWarlockInput} from '../src/warlock';
import {advanceWarlockToLevelTwo,previewWarlockLevelDown} from '../src/warlock-level-up';

const fighter:GuidedFighterInput={
 name:'Defensor',level:1,background:'soldier',species:'dwarf',
 assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:8,wisdom:10,charisma:12},
 increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
 fighterSkills:['acrobatics','perception'],armor:'chain_mail',shield:false,
 martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
};
const wizard:GuidedWizardInput={
 classId:'wizard',level:1,name:'Erudita',background:'sage',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared],
};
const warlock:GuidedWarlockInput={
 classId:'warlock',level:1,name:'Aquelarre',background:'acolyte',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:15},
 increaseMode:'two_plus_one',plusTwoAbility:'charisma',plusOneAbility:'wisdom',
 warlockSkills:['arcana','deception'],equipmentChoice:'equipment',
 cantripIds:['eldritch_blast','prestidigitation'],preparedIds:['hex','charm_person'],invocations:['pact_of_blade'],
};

describe('Paso 70: estructura de progresión compartida y dado de PG por nivel',()=>{
 it('d10/d6/d8 y promedios oficiales se configuran en un solo catálogo',()=>{
  expect(CLASS_HIT_DICE).toEqual({fighter:{sides:10,average:6},wizard:{sides:6,average:4},warlock:{sides:8,average:5}});
  expect(appendLevelHitPointRoll(3,undefined,10,6,2)).toEqual([6,6,2]);
  expect(()=>validateLevelHitPointRolls(3,[6,11],10)).toThrow();
  expect(()=>validateLevelHitPointRolls(3,[6],10)).toThrow();
 });
 it('Guerrero: promedio histórico y d10, valores guardados por nivel, bajada sin tirar de nuevo',()=>{
  const current=calculateGuidedFighter(fighter).sheet.maximumHitPoints;
  const upgrade=previewFighterLevelUp(fighter,{hitDieRoll:1});
  expect(upgrade.input.levelHitPointRolls).toEqual([1]);
  expect(upgrade.after.sheet.maximumHitPoints-current).toBe(4); // +2 CON, +1 Enano, mínimo del dado
  const down=fighterInputAtPreviousLevel(upgrade.input);
  expect(down.level).toBe(1);
  expect(down.levelHitPointRolls).toBeUndefined();
  expect(calculateGuidedFighter(down).sheet.maximumHitPoints).toBe(current);
  const avg=previewFighterLevelUp(fighter,{});
  expect(avg.input.levelHitPointRolls).toEqual([6]);
 });
 it('Mago: d6 afecta a PG reales y al estado; mantiene compatibilidad con promedio y permite bajar',()=>{
  const before=calculateGuidedWizard(wizard);
  const state=initialWizardOneState(wizard);
  const choice={newSpellIds:['alarm','shield'] as [string,string],preparedIds:[...wizard.preparedIds,'shield'],scholarSkill:'arcana' as const};
  const rolled=prepareWizardLevelUp(wizard,state,{...choice,hitDieRoll:1});
  const fixed=prepareWizardLevelUp(wizard,state,choice);
  expect(rolled.input.levelHitPointRolls).toEqual([1]);
  expect(fixed.input.levelHitPointRolls).toEqual([4]);
  expect(calculateGuidedWizard(fixed.input).maximumHitPoints-calculateGuidedWizard(rolled.input).maximumHitPoints).toBe(3);
  expect(rolled.state.hitPointsCurrent).toBe(calculateGuidedWizard(rolled.input).maximumHitPoints);
  expect(makeWizardCharacterSnapshot(rolled.input,rolled.state).input.levelHitPointRolls).toEqual([1]);
  const down=previewWizardLevelDown(rolled.input,rolled.state);
  expect(down.snapshot.input.levelHitPointRolls).toBeUndefined();
  expect(Object.hasOwn(down.snapshot.input,'levelHitPointRolls')).toBe(false);
  expect(down.snapshot.input.level).toBe(1);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(before.maximumHitPoints);
 });
 it('Brujo: d8 existente y bajada usan los mismos datos y diálogo común',()=>{
  const first=initialWarlockOneState(warlock);
  const second=advanceWarlockToLevelTwo(warlock,first,{
   invocations:['pact_of_blade','agonizing_blast','eldritch_spear'],
   cantripIds:warlock.cantripIds,preparedIds:[...warlock.preparedIds,'armor_of_agathys'],level2HitDieRoll:8,
  });
  expect(second.input.level2HitDieRoll).toBe(8);
  expect(calculateWarlockOne(second.input).maximumHitPoints).toBeGreaterThan(calculateWarlockOne(warlock).maximumHitPoints);
  const down=previewWarlockLevelDown(second.input,second.state);
  expect(down.className).toBe('Brujo');
  expect(down.snapshot.input.level).toBe(1);
  expect(down.snapshot.warlockState.secondPactSlotSpent).toBeUndefined();
  expect(down.snapshot.warlockState.hitPointsCurrent).toBe(first.hitPointsCurrent);
 });
});
