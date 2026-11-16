import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks,wizardArcaneRecoveryOptions,recoverWizardArcaneSlots} from '../src/wizard-slot-marks';
import {WIZARD_LEVEL_FIVE_SPELLS} from '../src/wizard-fifth-level';
import {WIZARD_SPELL_RULES,wizardSpellRule} from '../src/wizard-spell-details';
import {wizardProgression} from '../src/wizard';
import {collectWizardTraits} from '../src/wizard-traits';
import {wizardSpellSelection} from '../src/wizard-spell-library';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const to7=()=>{
 const two=prepareWizardLevelUp(base,initialWizardOneState(base),{newSpellIds:['alarm','shield'],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana'});
 const three=prepareWizardLevelUp(two.input,two.state,{newSpellIds:['misty_step','web'],preparedIds:[...two.input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray']});
 const four=prepareWizardLevelUp(three.input,three.state,{newSpellIds:['mirror_image','shatter'],preparedIds:[...three.input.preparedIds,'shatter'],newCantripId:'fire_bolt',level4Improvement:{mode:'plus_two',first:'intelligence'}});
 const five=prepareWizardLevelUp(four.input,four.state,{newSpellIds:['fireball','fly'],preparedIds:[...four.input.preparedIds,'fireball','fly'],evokerLevelThreeSpellId:'lightning_bolt'});
 const six=prepareWizardLevelUp(five.input,five.state,{newSpellIds:['haste','dispel_magic'],preparedIds:[...five.input.preparedIds,'haste']});
 return prepareWizardLevelUp(six.input,six.state,{newSpellIds:['dimension_door','polymorph'],preparedIds:[...six.input.preparedIds,'dimension_door'],evokerLevelFourSpellId:'ice_storm'});
};
const to8=()=>{const seven=to7();return prepareWizardLevelUp(seven.input,seven.state,{newSpellIds:['arcane_eye','wall_of_fire'],preparedIds:[...seven.input.preparedIds,'arcane_eye'],level8Improvement:{mode:'two_ones',first:'intelligence',second:'constitution'}});};
const to9=()=>{const eight=to8();return prepareWizardLevelUp(eight.input,eight.state,{newSpellIds:['cone_of_cold','telekinesis'],preparedIds:[...eight.input.preparedIds,'cone_of_cold','telekinesis'],evokerLevelFiveSpellId:'wall_of_force'});};

describe('Actualización 54: Mago Evocación niveles 8 y 9',()=>{
 it('catálogo oficial de 29 conjuros de nivel 5, con fichas y referencias al manual',()=>{
  expect(WIZARD_LEVEL_FIVE_SPELLS).toHaveLength(29);
  expect(WIZARD_SPELL_CATALOG.filter(spell=>spell.level===5)).toHaveLength(29);
  expect(WIZARD_SPELL_RULES).toHaveLength(180);
  expect(new Set(WIZARD_SPELL_RULES.map(spell=>spell.id)).size).toBe(180);
  for(const spell of WIZARD_LEVEL_FIVE_SPELLS){
   const rule=wizardSpellRule(spell.id)!;
   expect(spell.description.length>90).toBe(true);
   expect(rule.description).toBe(spell.description);
   expect(rule.level).toBe(5);
   expect(rule.sourcePage).toBe(spell.sourcePage);
   expect(Boolean(rule.castingTime&&rule.range&&rule.components&&rule.duration)).toBe(true);
  }
  expect(wizardSpellRule('cone_of_cold')?.rolls[0]?.formula).toBe('8d8');
  expect(wizardSpellRule('steel_wind_strike')?.attack).toBe(true);
  expect(wizardSpellRule('rarys_telepathic_bond')?.ritual).toBe(true);
 });
 it('nivel 8: segunda mejora (+1 INT +1 CON), 12 preparados y dos ranuras de nivel 4',()=>{
  const seven=to7(),eight=to8(),view=calculateGuidedWizard(eight.input);
  expect(eight.input.level).toBe(8);
  expect(view.abilityScores.intelligence).toBe(20);
  expect(view.abilityScores.constitution).toBe(16);
  expect(view.maximumHitPoints>calculateGuidedWizard(seven.input).maximumHitPoints).toBe(true);
  expect(eight.input.preparedIds).toHaveLength(12);
  expect(eight.state.magic.slots.maximum.slice(0,5)).toEqual([4,3,3,2,0]);
  expect(wizardProgression(8,'evoker').proficiencyBonus).toBe(3);
 });
 it('nivel 9: ranura nivel 5, competencia +4, 14 preparados y Evocación gratuita nueva',()=>{
  const nine=to9(),sheet=calculateGuidedWizard(nine.input);
  expect(nine.input.level).toBe(9);
  expect(nine.input.evokerLevelFiveSpellId).toBe('wall_of_force');
  expect(nine.state.magic.slots.maximum.slice(0,5)).toEqual([4,3,3,3,1]);
  expect(nine.input.preparedIds).toHaveLength(14);
  expect(sheet.spells.spellbook).toHaveLength(27);
  expect(wizardProgression(9,'evoker').proficiencyBonus).toBe(4);
  expect(wizardLevelUpChoicesPreview(nine.input)).toBe(null);
 });
 it('nivel 8 rechaza mejora ausente, superior al límite o una Evocación prematura',()=>{
  const seven=to7();const ch={newSpellIds:['arcane_eye','wall_of_fire'] as [string,string],preparedIds:[...seven.input.preparedIds,'arcane_eye']};
  expect(()=>prepareWizardLevelUp(seven.input,seven.state,ch)).toThrow();
  expect(()=>prepareWizardLevelUp(seven.input,seven.state,{...ch,level8Improvement:{mode:'plus_two',first:'intelligence'}})).toThrow();
  expect(()=>prepareWizardLevelUp(seven.input,seven.state,{...ch,level8Improvement:{mode:'two_ones',first:'intelligence',second:'constitution'},evokerLevelFiveSpellId:'wall_of_force'})).toThrow();
 });
 it('nivel 9 rechaza Evocación duplicada, no Evocación o sin elección',()=>{
  const eight=to8(),baseChoices={newSpellIds:['cone_of_cold','telekinesis'] as [string,string],preparedIds:[...eight.input.preparedIds,'cone_of_cold','telekinesis']};
  expect(()=>prepareWizardLevelUp(eight.input,eight.state,baseChoices)).toThrow();
  expect(()=>prepareWizardLevelUp(eight.input,eight.state,{...baseChoices,evokerLevelFiveSpellId:'telekinesis'})).toThrow();
  expect(()=>prepareWizardLevelUp(eight.input,eight.state,{...baseChoices,evokerLevelFiveSpellId:'ice_storm'})).toThrow();
 });
 it('no permite elegir conjuros de nivel 5 en el nivel 8',()=>{
  const seven=to7();expect(()=>prepareWizardLevelUp(seven.input,seven.state,{newSpellIds:['cone_of_cold','arcane_eye'],preparedIds:[...seven.input.preparedIds,'arcane_eye'],level8Improvement:{mode:'two_ones',first:'intelligence',second:'constitution'}})).toThrow();
 });
 it('Recuperación arcana: nivel 9 recupera una ranura de nivel 5 gastada',()=>{
  const nine=to9(),spent=toggleWizardSlotMark(nine.state,0,5);
  expect(wizardSlotMarks(spent,5)).toEqual([true]);
  expect(wizardArcaneRecoveryOptions(spent,9).some(choice=>choice.join(',')==='5')).toBe(true);
  const restored=recoverWizardArcaneSlots(spent,[5],9);
  expect(wizardSlotMarks(restored,5)).toEqual([false]);
 });
 it('descender 9→8 retira ranura 5, bonificación y dos conjuros nuevos',()=>{
  const nine=to9(),down=previewWizardLevelDown(nine.input,nine.state);
  expect(down.toLevel).toBe(8);
  expect(down.snapshot.input.evokerLevelFiveSpellId).toBe(undefined);
  expect(down.snapshot.input.level8Improvement).toEqual(nine.input.level8Improvement);
  expect(down.snapshot.input.spellbookIds).toHaveLength(20);
  expect(down.snapshot.input.preparedIds).toHaveLength(12);
  expect(down.snapshot.wizardState.magic.slots.maximum[4]).toBe(0);
  expect(down.lost.some(item=>item.title.includes('Muro de fuerza'))).toBe(true);
 });
 it('descender 8→7 revierte ASI de 8 sin perder mejoras y Evocación anteriores',()=>{
  const eight=to8(),down=previewWizardLevelDown(eight.input,eight.state);
  expect(down.toLevel).toBe(7);
  expect(down.snapshot.input.level8Improvement).toBe(undefined);
  expect(down.snapshot.input.level4Improvement).toEqual(eight.input.level4Improvement);
  expect(down.snapshot.input.evokerLevelFourSpellId).toBe('ice_storm');
  expect(calculateGuidedWizard(down.snapshot.input).abilityScores.intelligence).toBe(19);
 });
 it('conserva ranuras gastadas, daño y marcadores manuales al subir y bajar',()=>{
  const eight=to8();const spent=toggleWizardSlotMark(eight.state,0,4);
  const nine=prepareWizardLevelUp(eight.input,{...spent,hitPointsCurrent:Math.max(0,spent.hitPointsCurrent-9),manualDeathMarks:{successes:[true,false,false],failures:[false,true,false]}},{newSpellIds:['cone_of_cold','telekinesis'],preparedIds:[...eight.input.preparedIds,'cone_of_cold','telekinesis'],evokerLevelFiveSpellId:'wall_of_force'});
  expect(wizardSlotMarks(nine.state,4)[0]).toBe(true);
  expect(wizardSlotMarks(nine.state,5)).toEqual([false]);
  const down=previewWizardLevelDown(nine.input,nine.state);
  expect(wizardSlotMarks(down.snapshot.wizardState,4)[0]).toBe(true);
  expect(down.snapshot.wizardState.manualDeathMarks?.successes[0]).toBe(true);
  expect(down.snapshot.wizardState.manualDeathMarks?.failures[1]).toBe(true);
 });
 it('persiste un Mago 9 con selección manual, retrato y recursos',()=>{
  const nine=to9(),input={...nine.input,spellSelection:wizardSpellSelection(nine.input)};
  const spent=toggleWizardSlotMark(nine.state,0,5);
  const restored=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(makeWizardCharacterSnapshot(input,spent))));
  expect(restored.input.level).toBe(9);
  expect(restored.input.evokerLevelFiveSpellId).toBe('wall_of_force');
  expect(restored.input.spellSelection?.learnedIds).toContain('wall_of_force');
  expect(wizardSlotMarks(restored.wizardState,5)).toEqual([true]);
 });
 it('subida de nivel no muta el estado original',()=>{
  const eight=to8(),prior=JSON.stringify(eight);
  prepareWizardLevelUp(eight.input,eight.state,{newSpellIds:['cone_of_cold','telekinesis'],preparedIds:[...eight.input.preparedIds,'cone_of_cold','telekinesis'],evokerLevelFiveSpellId:'wall_of_force'});
  expect(JSON.stringify(eight)).toBe(prior);
 });
 it('Rasgos y ventana del nivel 8 ofrecen mejora; nivel 9 solo las elecciones mágicas',()=>{
  const eight=to8(),nine=to9();
  expect(wizardLevelUpChoicesPreview(to7().input)?.features.some(f=>f.id==='ability_score_improvement_8')).toBe(true);
  expect(collectWizardTraits(eight.input,calculateGuidedWizard(eight.input)).traits.some(t=>t.id==='wizard:ability_score_improvement_8')).toBe(true);
  expect(collectWizardTraits(nine.input,calculateGuidedWizard(nine.input)).traits.some(t=>t.id==='evoker:evocation_savant')).toBe(true);
 });
});
