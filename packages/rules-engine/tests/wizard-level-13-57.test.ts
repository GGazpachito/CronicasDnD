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

import {WIZARD_LEVEL_SEVEN_SPELLS} from '../src/wizard-seventh-level';
import {wizardMemorizePreparedSpell as memorize} from '../src/wizard-level-up';

function to12(){
 const eleven=to11();
 return prepareWizardLevelUp(eleven.input,eleven.state,{
  newSpellIds:['arcane_gate','circle_of_death'],preparedIds:[...eleven.input.preparedIds],
  level12Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'}
 });
}
function to13(){
 const twelve=to12();
 return prepareWizardLevelUp(twelve.input,twelve.state,{
  newSpellIds:['teleport','finger_of_death'],
  preparedIds:[...twelve.input.preparedIds,'teleport'],
  evokerLevelSevenSpellId:'delayed_blast_fireball'
 });
}

describe('Actualización 57: Mago Evocación nivel 13',()=>{
 it('añade 15 conjuros de nivel 7 con ficha completa y mantiene el catálogo ampliable',()=>{
  expect(WIZARD_LEVEL_SEVEN_SPELLS).toHaveLength(15);
  expect(WIZARD_SPELL_CATALOG.filter(s=>s.level===7)).toHaveLength(15);
  expect(WIZARD_SPELL_RULES.length).toBeGreaterThanOrEqual(217);
  expect(new Set(WIZARD_SPELL_RULES.map(s=>s.id)).size).toBe(WIZARD_SPELL_RULES.length);
  for(const entry of WIZARD_LEVEL_SEVEN_SPELLS){
   const detail=wizardSpellRule(entry.id)!;
   expect(detail.level).toBe(7);
   expect(detail.description.length).toBeGreaterThan(90);
   expect(detail.castingTime&&detail.range&&detail.components&&detail.duration).toBeTruthy();
  }
  expect(wizardSpellRule('finger_of_death')?.rolls[0].formula).toBe('7d8+30');
  expect(wizardSpellRule('mordenkainens_sword')?.rolls[0].formula).toBe('4d12');
  expect(wizardSpellRule('mordenkainens_sword')?.attack).toBe(true);
  expect(wizardSpellRule('prismatic_spray')?.rolls.map(r=>r.formula)).toEqual(['1d8','12d6']);
  expect(wizardSpellRule('delayed_blast_fireball')?.rolls[0].formula).toBe('12d6');
 });
 it('12→13 desbloquea nivel 7, +5 de competencia, 17 preparados y nueva Evocación gratuita',()=>{
  const twelve=to12();
  const result=to13();
  const sheet=calculateGuidedWizard(result.input);
  expect(result.input.level).toBe(13);
  expect(result.input.spellbookIds).toHaveLength(30);
  expect(result.input.preparedIds).toHaveLength(17);
  expect(result.input.cantripIds).toHaveLength(5);
  expect(result.input.evokerLevelSevenSpellId).toBe('delayed_blast_fireball');
  expect(result.state.magic.slots.maximum.slice(0,7)).toEqual([4,3,3,3,2,1,1]);
  expect(wizardSlotMarks(result.state,7)).toEqual([false]);
  expect(sheet.spells.spellbook.some(s=>s.id==='delayed_blast_fireball')).toBe(true);
  expect(wizardProgression(13,'evoker').proficiencyBonus).toBe(5);
  expect(result.hitPointsIncrease).toBe(sheet.maximumHitPoints-calculateGuidedWizard(twelve.input).maximumHitPoints);
  expect(wizardLevelUpChoicesPreview(result.input)?.nextLevel).toBe(14);
 });
 it('rechaza regalos anticipados, duplicados, escuelas incorrectas y falta de regalo',()=>{
  const twelve=to12();
  const normal={newSpellIds:['teleport','finger_of_death'] as [string,string],preparedIds:[...twelve.input.preparedIds,'teleport']};
  expect(()=>prepareWizardLevelUp(twelve.input,twelve.state,normal)).toThrow();
  expect(()=>prepareWizardLevelUp(twelve.input,twelve.state,{...normal,evokerLevelSevenSpellId:'finger_of_death'})).toThrow();
  expect(()=>prepareWizardLevelUp(twelve.input,twelve.state,{...normal,evokerLevelSevenSpellId:'teleport'})).toThrow();
  expect(()=>prepareWizardLevelUp(twelve.input,twelve.state,{...normal,newSpellIds:['forcecage','teleport'],evokerLevelSevenSpellId:'forcecage'})).toThrow();
  expect(()=>calculateGuidedWizard({...twelve.input,evokerLevelSevenSpellId:'forcecage'})).toThrow();
  expect(()=>prepareWizardLevelUp(twelve.input,twelve.state,{...normal,newSpellIds:['meteor_swarm','teleport'],evokerLevelSevenSpellId:'delayed_blast_fireball'})).toThrow();
 });
 it('guarda y reabre un personaje de nivel 13 y conserva las marcas previas',()=>{
  const twelve=to12();
  const spent=toggleWizardSlotMark(twelve.state,0,6);
  const advanced=prepareWizardLevelUp(twelve.input,spent,{newSpellIds:['teleport','finger_of_death'],preparedIds:[...twelve.input.preparedIds,'teleport'],evokerLevelSevenSpellId:'delayed_blast_fireball'});
  expect(wizardSlotMarks(advanced.state,6)).toEqual([true]);
  expect(wizardSlotMarks(advanced.state,7)).toEqual([false]);
  const saved=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(advanced.input,advanced.state));
  expect(saved.input.level).toBe(13);
  expect(saved.input.evokerLevelSevenSpellId).toBe('delayed_blast_fireball');
  expect(wizardSlotMarks(saved.wizardState,6)).toEqual([true]);
 });
 it('13→12 retira conjuros del nivel perdido, regalo y ranura 7, manteniendo vida y elecciones anteriores',()=>{
  const thirteen=to13();
  const damaged={...thirteen.state,hitPointsCurrent:thirteen.state.hitPointsCurrent-6,temporaryHitPoints:4,heroicInspiration:true};
  const down=previewWizardLevelDown(thirteen.input,damaged);
  expect(down.snapshot.input.level).toBe(12);
  expect(down.snapshot.input.evokerLevelSevenSpellId).toBeUndefined();
  expect(down.snapshot.input.level12Improvement).toEqual(to12().input.level12Improvement);
  expect(down.snapshot.input.spellbookIds).toEqual(to12().input.spellbookIds);
  expect(down.snapshot.input.evokerLevelSixSpellId).toBe('sunbeam');
  expect(down.snapshot.wizardState.magic.slots.maximum[6]).toBe(0);
  expect(down.snapshot.wizardState.temporaryHitPoints).toBe(4);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(to12().state.hitPointsCurrent-6);
  expect(down.lost.some(e=>e.title.includes('Bola de fuego retardada'))).toBe(true);
 });
 it('mantiene disponible la selección manual y la recuperación arcana bajo límites previos',()=>{
  const thirteen=to13();
  const found=memorize(thirteen.input,thirteen.input.preparedIds[0],'finger_of_death');
  expect(found.preparedIds).toContain('finger_of_death');
  const seventhSpent=toggleWizardSlotMark(thirteen.state,0,7);
  expect(wizardArcaneRecoveryOptions(seventhSpent,thirteen.input.level)).toEqual([]);
  const alsoFirstSpent=toggleWizardSlotMark(seventhSpent,0,1);
  expect(wizardArcaneRecoveryOptions(alsoFirstSpent,thirteen.input.level)).toEqual([[1]]);
  expect(wizardSpellSelection(thirteen.input).learnedIds).toContain('delayed_blast_fireball');
 });
});
