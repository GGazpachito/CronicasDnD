import {describe,it,expect} from 'vitest';
import {getCharacterCardDetails} from '../src/character-card';
import {makeCharacterSnapshot} from '../src/persistence';
import {EMPTY_CHARACTER_PROFILE} from '../src/character-profile';
import {
  makeWizardCharacterSnapshot,initialWizardOneState,validateWizardCharacterSnapshot,
  WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput,
} from '../src/wizard-creation';
import type {GuidedFighterInput} from '../src/guided';

const wizard:GuidedWizardInput={classId:'wizard',level:1,name:'Iria',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared],
 profile:{...EMPTY_CHARACTER_PROFILE,backstory:'La torre'},
};
const fighter:GuidedFighterInput={name:'Guerrero 49',level:1,background:'soldier',species:'human',
 assignedAbilities:{strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8},
 increaseMode:'two_plus_one',plusTwoAbility:'strength',plusOneAbility:'constitution',
 fighterSkills:['perception','survival'],humanSkill:'investigation',humanFeat:'tough',humanSize:'medium',armor:'chain_mail',shield:false,
 martial:{fightingStyle:'defense',weaponMasteries:['greatsword','flail','javelin'],startingPackage:'a'},
 backgroundEquipment:{startingPackage:'a',gamingSet:'dice_set'},profile:EMPTY_CHARACTER_PROFILE,
};

describe('49: selección de personajes y hoja multiclase',()=>{
 it('proyecta especie y ausencia de subclase del Mago nivel 1',()=>{
  const snap=makeWizardCharacterSnapshot(wizard);
  expect(getCharacterCardDetails(snap)).toMatchObject({species:'Enano',subclass:null});
 });
 it('usa el origen del Guerrero y no atribuye una subclase a nivel 1',()=>{
  const snap=makeCharacterSnapshot(fighter);
  expect(getCharacterCardDetails(snap)).toMatchObject({species:'Humano',subclass:null});
 });
 it('los marcadores manuales de muerte del Mago se guardan sin gastar ranuras',()=>{
  const start=initialWizardOneState(wizard);
  const state={...start,manualDeathMarks:{successes:[true,false,false] as [boolean,boolean,boolean],failures:[false,true,false] as [boolean,boolean,boolean]}};
  const saved=makeWizardCharacterSnapshot(wizard,state);
  const loaded=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(loaded.wizardState.manualDeathMarks?.successes).toEqual([true,false,false]);
  expect(loaded.wizardState.manualDeathMarks?.failures).toEqual([false,true,false]);
  expect(loaded.wizardState.magic.slots.remaining[0]).toBe(2);
 });
 it('rechaza marcadores alterados y permite guardados antiguos sin ellos',()=>{
  const fresh=makeWizardCharacterSnapshot(wizard);
  expect(()=>validateWizardCharacterSnapshot({...fresh,wizardState:{...fresh.wizardState,manualDeathMarks:{successes:[true,false],failures:[false,false,false]}}})).toThrow();
  const {manualDeathMarks,...olderState}=fresh.wizardState;
  const old=validateWizardCharacterSnapshot({...fresh,wizardState:olderState});
  expect(old.wizardState.manualDeathMarks).toBeUndefined();
 });
});
