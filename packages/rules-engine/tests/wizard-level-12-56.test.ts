import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,wizardMemorizePreparedSpell} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks,wizardArcaneRecoveryOptions} from '../src/wizard-slot-marks';
import {WIZARD_LEVEL_SIX_SPELLS} from '../src/wizard-sixth-level';
import {WIZARD_SPELL_RULES,wizardSpellRule} from '../src/wizard-spell-details';
import {wizardProgression} from '../src/wizard';
import {collectWizardTraits} from '../src/wizard-traits';
import {wizardSpellSelection} from '../src/wizard-spell-library';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
function to9(){
 const two=prepareWizardLevelUp(base,initialWizardOneState(base),{newSpellIds:['alarm','shield'],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana'});
 const three=prepareWizardLevelUp(two.input,two.state,{newSpellIds:['misty_step','web'],preparedIds:[...two.input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray']});
 const four=prepareWizardLevelUp(three.input,three.state,{newSpellIds:['mirror_image','shatter'],preparedIds:[...three.input.preparedIds,'shatter'],newCantripId:'fire_bolt',level4Improvement:{mode:'plus_two',first:'intelligence'}});
 const five=prepareWizardLevelUp(four.input,four.state,{newSpellIds:['fireball','fly'],preparedIds:[...four.input.preparedIds,'fireball','fly'],evokerLevelThreeSpellId:'lightning_bolt'});
 const six=prepareWizardLevelUp(five.input,five.state,{newSpellIds:['haste','dispel_magic'],preparedIds:[...five.input.preparedIds,'haste']});
 const seven=prepareWizardLevelUp(six.input,six.state,{newSpellIds:['dimension_door','polymorph'],preparedIds:[...six.input.preparedIds,'dimension_door'],evokerLevelFourSpellId:'ice_storm'});
 const eight=prepareWizardLevelUp(seven.input,seven.state,{newSpellIds:['arcane_eye','wall_of_fire'],preparedIds:[...seven.input.preparedIds,'arcane_eye'],level8Improvement:{mode:'two_ones',first:'intelligence',second:'constitution'}});
 return prepareWizardLevelUp(eight.input,eight.state,{newSpellIds:['cone_of_cold','telekinesis'],preparedIds:[...eight.input.preparedIds,'cone_of_cold','telekinesis'],evokerLevelFiveSpellId:'wall_of_force'});
}
function to10(){const nine=to9();return prepareWizardLevelUp(nine.input,nine.state,{newSpellIds:['hold_monster','geas'],preparedIds:[...nine.input.preparedIds,'hold_monster'],newCantripId:'mind_sliver'});}
function to11(){const ten=to10();return prepareWizardLevelUp(ten.input,ten.state,{newSpellIds:['chain_lightning','disintegrate'],preparedIds:[...ten.input.preparedIds,'chain_lightning'],evokerLevelSixSpellId:'sunbeam'});}

describe('Actualización 56: Mago nivel 12',()=>{
 it('11→12 aplica la mejora de característica y conserva las ranuras gastadas',()=>{
  const eleven=to11();
  const marked=toggleWizardSlotMark(eleven.state,0,6);
  const result=prepareWizardLevelUp(eleven.input,marked,{newSpellIds:['arcane_gate','circle_of_death'],preparedIds:[...eleven.input.preparedIds],level12Improvement:{mode:'plus_two',first:'wisdom'}});
  expect(result.input.level).toBe(12);
  expect(result.input.level12Improvement).toEqual({mode:'plus_two',first:'wisdom'});
  expect(result.input.spellbookIds).toHaveLength(28);
  expect(result.input.preparedIds).toHaveLength(16);
  expect(result.state.magic.slots.maximum.slice(0,6)).toEqual([4,3,3,3,2,1]);
  expect(wizardSlotMarks(result.state,6)[0]).toBe(true);
  expect(calculateGuidedWizard(result.input).abilityScores.wisdom).toBe(calculateGuidedWizard(eleven.input).abilityScores.wisdom+2);
  expect(wizardLevelUpChoicesPreview(result.input)).toBe(null);
  expect(validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(result.input,result.state)).input.level).toBe(12);
 });
 it('rechaza mejoras ausentes, anticipadas y superiores a 20',()=>{
  const eleven=to11();
  const options={newSpellIds:['arcane_gate','circle_of_death'] as [string,string],preparedIds:[...eleven.input.preparedIds]};
  expect(()=>prepareWizardLevelUp(eleven.input,eleven.state,options)).toThrow();
  expect(()=>prepareWizardLevelUp(eleven.input,eleven.state,{...options,level12Improvement:{mode:'plus_two',first:'intelligence'}})).toThrow();
  expect(()=>calculateGuidedWizard({...eleven.input,level12Improvement:{mode:'plus_two',first:'wisdom'}})).toThrow();
 });
 it('12→11 retira solo las dos elecciones recientes y la mejora, conserva el daño y los recursos',()=>{
  const eleven=to11();
  const twelve=prepareWizardLevelUp(eleven.input,eleven.state,{newSpellIds:['arcane_gate','circle_of_death'],preparedIds:[...eleven.input.preparedIds],level12Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'}});
  const old={...twelve.state,hitPointsCurrent:twelve.state.hitPointsCurrent-5};
  const down=previewWizardLevelDown(twelve.input,old);
  expect(down.snapshot.input.level).toBe(11);
  expect(down.snapshot.input.level12Improvement).toBeUndefined();
  expect(down.snapshot.input.spellbookIds).toEqual(eleven.input.spellbookIds);
  expect(down.snapshot.input.evokerLevelSixSpellId).toBe('sunbeam');
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(eleven.state.hitPointsCurrent-5);
  expect(down.snapshot.wizardState.magic.slots.maximum.slice(0,6)).toEqual([4,3,3,3,2,1]);
 });
});
