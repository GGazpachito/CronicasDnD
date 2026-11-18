import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,wizardMemorizePreparedSpell} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks,resetWizardSlots} from '../src/wizard-slot-marks';
import {wizardProgression,evokerOverchannel} from '../src/wizard';
import {wizardSpellRule,WIZARD_SPELL_RULES} from '../src/wizard-spell-details';
import {wizardSpellSelection} from '../src/wizard-spell-library';
import {WIZARD_LEVEL_EIGHT_SPELLS} from '../src/wizard-eighth-level';

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

function to14(){
 const thirteen=to13();
 return prepareWizardLevelUp(thirteen.input,thirteen.state,{
  newSpellIds:['forcecage','simulacrum'],
  preparedIds:[...thirteen.input.preparedIds,'forcecage']
 });
}

function to15(){
 const fourteen=to14();
 return prepareWizardLevelUp(fourteen.input,fourteen.state,{
  newSpellIds:['antimagic_field','befuddlement'],
  preparedIds:[...fourteen.input.preparedIds,'befuddlement'],
  evokerLevelEightSpellId:'sunburst'
 });
}
function to16(){
 const fifteen=to15();
 return prepareWizardLevelUp(fifteen.input,fifteen.state,{
  newSpellIds:['incendiary_cloud','maze'],
  preparedIds:[...fifteen.input.preparedIds,'incendiary_cloud','maze'],
  level16Improvement:{mode:'plus_two',first:'constitution'}
 });
}

describe('Actualización 59: Mago Evocación niveles 15 y 16',()=>{
 it('integra 13 conjuros de nivel 8, sin duplicados, con datos para consultar y tirar',()=>{
  expect(WIZARD_LEVEL_EIGHT_SPELLS).toHaveLength(13);
  expect(WIZARD_SPELL_CATALOG.filter(spell=>spell.level===8)).toHaveLength(13);
  expect(WIZARD_SPELL_RULES.length).toBeGreaterThanOrEqual(230);
  expect(new Set(WIZARD_SPELL_RULES.map(rule=>rule.id)).size).toBe(WIZARD_SPELL_RULES.length);
  for(const spell of WIZARD_LEVEL_EIGHT_SPELLS){
   const details=wizardSpellRule(spell.id);
   expect(details?.level).toBe(8);
   expect(details?.school).toBe(spell.school);
   expect(details?.description.length).toBeGreaterThan(90);
   expect(details?.castingTime&&details.range&&details.components&&details.duration).toBeTruthy();
  }
  expect(wizardSpellRule('befuddlement')?.rolls[0].formula).toBe('10d12');
  expect(wizardSpellRule('incendiary_cloud')?.rolls[0].formula).toBe('10d8');
  expect(wizardSpellRule('sunburst')?.rolls[0].formula).toBe('12d6');
  expect(wizardSpellRule('sunburst')?.school).toBe('evocation');
  expect(wizardSpellRule('telepathy')?.school).toBe('divination');
 });
 it('14→15 gana ranura de nivel 8, +2 al libro, +1 preparado y regalo Evocación',()=>{
  const fourteen=to14(),advanced=to15();
  const sheet=calculateGuidedWizard(advanced.input);
  expect(advanced.input.level).toBe(15);
  expect(advanced.input.spellbookIds).toHaveLength(34);
  expect(advanced.input.preparedIds).toHaveLength(19);
  expect(advanced.input.evokerLevelEightSpellId).toBe('sunburst');
  expect(advanced.input.cantripIds).toHaveLength(5);
  expect(advanced.state.magic.slots.maximum).toEqual([4,3,3,3,2,1,1,1,0]);
  expect(wizardSlotMarks(advanced.state,8)).toEqual([false]);
  expect(sheet.spells.spellbook.some(spell=>spell.id==='sunburst')).toBe(true);
  expect(wizardProgression(15,'evoker').proficiencyBonus).toBe(5);
  expect(advanced.hitPointsIncrease).toBe(sheet.maximumHitPoints-calculateGuidedWizard(fourteen.input).maximumHitPoints);
  expect(wizardLevelUpChoicesPreview(advanced.input)?.nextLevel).toBe(16);
 });
 it('mantiene ranuras gastadas y contador de Sobrecarga al pasar de 14 a 15',()=>{
  const fourteen=to14();
  const spent=toggleWizardSlotMark(fourteen.state,0,7);
  const activation=evokerOverchannel(spent.magic,14,3);
  const fifteen=prepareWizardLevelUp(fourteen.input,{...spent,magic:activation.state},{
   newSpellIds:['antimagic_field','befuddlement'],preparedIds:[...fourteen.input.preparedIds,'befuddlement'],evokerLevelEightSpellId:'sunburst'
  });
  expect(wizardSlotMarks(fifteen.state,7)).toEqual([true]);
  expect(wizardSlotMarks(fifteen.state,8)).toEqual([false]);
  expect(fifteen.state.magic.overchannelUses).toBe(1);
 });
 it('15→16 concede +2 preparados, +2 conjuros nuevos y mejora de característica',()=>{
  const fifteen=to15(),sixteen=to16();
  const old=calculateGuidedWizard(fifteen.input),next=calculateGuidedWizard(sixteen.input);
  expect(sixteen.input.level).toBe(16);
  expect(sixteen.input.spellbookIds).toHaveLength(36);
  expect(sixteen.input.preparedIds).toHaveLength(21);
  expect(sixteen.input.level16Improvement).toEqual({mode:'plus_two',first:'constitution'});
  expect(next.abilityScores.constitution).toBe(old.abilityScores.constitution+2);
  expect(next.abilityModifiers.constitution).toBe(old.abilityModifiers.constitution+1);
  expect(sixteen.hitPointsIncrease).toBe(next.maximumHitPoints-old.maximumHitPoints);
  expect(sixteen.hitPointsIncrease).toBeGreaterThan(10);
  expect(sixteen.state.magic.slots.maximum).toEqual(fifteen.state.magic.slots.maximum);
  expect(wizardLevelUpChoicesPreview(sixteen.input)?.nextLevel).toBe(17);
 });
 it('rechaza regalo ausente, duplicado, nivel 9 prematuro y mejora del 16 antes de tiempo',()=>{
  const fourteen=to14(),fifteen=to15();
  const for15={newSpellIds:['antimagic_field','befuddlement'] as [string,string],preparedIds:[...fourteen.input.preparedIds,'befuddlement']};
  expect(()=>prepareWizardLevelUp(fourteen.input,fourteen.state,for15)).toThrow();
  expect(()=>prepareWizardLevelUp(fourteen.input,fourteen.state,{...for15,evokerLevelEightSpellId:'antimagic_field'})).toThrow();
  expect(()=>prepareWizardLevelUp(fourteen.input,fourteen.state,{...for15,newSpellIds:['sunburst','befuddlement'],evokerLevelEightSpellId:'sunburst'})).toThrow();
  expect(()=>prepareWizardLevelUp(fourteen.input,fourteen.state,{...for15,newSpellIds:['meteor_swarm','befuddlement'],evokerLevelEightSpellId:'sunburst'})).toThrow();
  expect(()=>calculateGuidedWizard({...fourteen.input,evokerLevelEightSpellId:'sunburst'})).toThrow();
  expect(()=>prepareWizardLevelUp(fifteen.input,fifteen.state,{newSpellIds:['incendiary_cloud','maze'],preparedIds:[...fifteen.input.preparedIds,'incendiary_cloud','maze']})).toThrow();
  expect(()=>calculateGuidedWizard({...fifteen.input,level16Improvement:{mode:'plus_two',first:'wisdom'}})).toThrow();
  expect(()=>prepareWizardLevelUp(fifteen.input,fifteen.state,{newSpellIds:['incendiary_cloud','maze'],preparedIds:[...fifteen.input.preparedIds,'incendiary_cloud','maze'],level16Improvement:{mode:'plus_two',first:'intelligence'}})).toThrow();
 });
 it('mantiene el regalo de nivel 8 en biblioteca y permite memorizarlo en descanso corto',()=>{
  const fifteen=to15();
  const library=wizardSpellSelection(fifteen.input);
  expect(library.learnedIds).toContain('sunburst');
  const next=wizardMemorizePreparedSpell(fifteen.input,fifteen.input.preparedIds[0],'sunburst');
  expect(next.preparedIds).toContain('sunburst');
  expect(next.preparedIds).toHaveLength(19);
 });
 it('guardar y cargar nivel 16 mantiene la mejora, la ranura 8 gastada y Sobrecarga',()=>{
  const sixteen=to16();
  const spent=toggleWizardSlotMark(sixteen.state,0,8);
  const once=evokerOverchannel(spent.magic,16,2);
  const twice=evokerOverchannel(once.state,16,2);
  const stored={...spent,hitPointsCurrent:spent.hitPointsCurrent-9,magic:twice.state};
  const saved=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(sixteen.input,stored));
  expect(saved.input.level16Improvement).toEqual(sixteen.input.level16Improvement);
  expect(saved.input.evokerLevelEightSpellId).toBe('sunburst');
  expect(saved.wizardState.magic.overchannelUses).toBe(2);
  expect(wizardSlotMarks(saved.wizardState,8)).toEqual([true]);
  expect(saved.wizardState.hitPointsCurrent).toBe(stored.hitPointsCurrent);
  expect(resetWizardSlots(saved.wizardState,16).magic.overchannelUses).toBe(0);
 });
 it('16→15 revierte la mejora y dos conjuros, pero conserva la ranura 8 y Sobrecarga',()=>{
  const fifteen=to15(),sixteen=to16();
  const spent=toggleWizardSlotMark(sixteen.state,0,8);
  const used=evokerOverchannel(spent.magic,16,3);
  const damaged={...spent,magic:used.state,hitPointsCurrent:spent.hitPointsCurrent-8,temporaryHitPoints:5,heroicInspiration:true};
  const down=previewWizardLevelDown(sixteen.input,damaged);
  expect(down.snapshot.input.level).toBe(15);
  expect(down.snapshot.input.spellbookIds).toEqual(fifteen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(fifteen.input.preparedIds);
  expect(down.snapshot.input.level16Improvement).toBeUndefined();
  expect(down.snapshot.input.evokerLevelEightSpellId).toBe('sunburst');
  expect(down.snapshot.wizardState.magic.overchannelUses).toBe(1);
  expect(wizardSlotMarks(down.snapshot.wizardState,8)).toEqual([true]);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(fifteen.state.hitPointsCurrent-8);
  expect(down.snapshot.wizardState.temporaryHitPoints).toBe(5);
  expect(down.snapshot.wizardState.heroicInspiration).toBe(true);
  expect(down.changes.some(item=>item.title==='Mejora de característica')).toBe(true);
 });
 it('15→14 retira ranura 8 y regalo gratuito, sin borrar Sobrecarga ni niveles anteriores',()=>{
  const fourteen=to14(),fifteen=to15();
  const spent=toggleWizardSlotMark(fifteen.state,0,8);
  const used=evokerOverchannel(spent.magic,15,3);
  const damaged={...spent,magic:used.state,hitPointsCurrent:spent.hitPointsCurrent-6};
  const down=previewWizardLevelDown(fifteen.input,damaged);
  expect(down.snapshot.input.level).toBe(14);
  expect(down.snapshot.input.spellbookIds).toEqual(fourteen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(fourteen.input.preparedIds);
  expect(down.snapshot.input.evokerLevelEightSpellId).toBeUndefined();
  expect(down.snapshot.input.evokerLevelSevenSpellId).toBe('delayed_blast_fireball');
  expect(down.snapshot.wizardState.magic.slots.maximum[7]).toBe(0);
  expect(down.snapshot.wizardState.magic.overchannelUses).toBe(1);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(fourteen.state.hitPointsCurrent-6);
  expect(down.lost.some(item=>item.title.includes('Estallido solar'))).toBe(true);
 });
});
