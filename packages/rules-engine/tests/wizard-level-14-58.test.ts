import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,validateWizardOneState,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks,resetWizardSlots} from '../src/wizard-slot-marks';
import {evokerOverchannel,wizardLongRest,wizardProgression,EVOKER_FEATURES} from '../src/wizard';
import {rollSpellDice} from '../src/spell-dice';

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

describe('Actualización 58: Mago Evocación nivel 14 y Sobrecarga',()=>{
 it('13→14 incorpora dos conjuros, 18 preparados y Sobrecarga sin alterar las ranuras',()=>{
  const thirteen=to13();
  const advanced=to14();
  const sheet=calculateGuidedWizard(advanced.input);
  expect(advanced.input.level).toBe(14);
  expect(advanced.input.spellbookIds).toHaveLength(32);
  expect(advanced.input.preparedIds).toHaveLength(18);
  expect(advanced.input.cantripIds).toHaveLength(5);
  expect(advanced.input.spellbookIds.slice(-2)).toEqual(['forcecage','simulacrum']);
  expect(advanced.input.evokerLevelSevenSpellId).toBe('delayed_blast_fireball');
  expect(advanced.state.magic.slots.maximum).toEqual([4,3,3,3,2,1,1,0,0]);
  expect(advanced.state.magic.overchannelUses).toBe(0);
  expect(advanced.hitPointsIncrease).toBe(sheet.maximumHitPoints-calculateGuidedWizard(thirteen.input).maximumHitPoints);
  expect(wizardProgression(14,'evoker').proficiencyBonus).toBe(5);
  expect(EVOKER_FEATURES.filter(feature=>feature.level===14).map(feature=>feature.id)).toEqual(['overchannel']);
  expect(wizardLevelUpChoicesPreview(advanced.input)).toBe(null);
 });
 it('no concede una ranura adicional ni reinicia las gastadas al subir',()=>{
  const thirteen=to13();
  const spent=toggleWizardSlotMark(thirteen.state,0,7);
  const next=prepareWizardLevelUp(thirteen.input,spent,{newSpellIds:['forcecage','simulacrum'],preparedIds:[...thirteen.input.preparedIds,'forcecage']});
  expect(wizardSlotMarks(next.state,7)).toEqual([true]);
  expect(next.state.magic.slots.remaining[6]).toBe(0);
 });
 it('primer uso gratis; segundo 2d12/nivel, tercero 3d12/nivel y cuarto 4d12/nivel',()=>{
  const fourteen=to14();
  const first=evokerOverchannel(fourteen.state.magic,14,3);
  expect(first.state.overchannelUses).toBe(1);
  expect(first.necroticDice).toBe(0);
  const second=evokerOverchannel(first.state,14,5);
  expect(second.state.overchannelUses).toBe(2);
  expect(second.necroticDice).toBe(10);
  expect(rollSpellDice(`${second.necroticDice}d12`,()=>5).total).toBe(50);
  const third=evokerOverchannel(second.state,14,1);
  expect(third.state.overchannelUses).toBe(3);
  expect(third.necroticDice).toBe(3);
  expect(evokerOverchannel(third.state,14,4).necroticDice).toBe(16);
  expect(second.ignoresResistanceAndImmunity).toBe(true);
  expect(second.state.slots).toEqual(fourteen.state.magic.slots);
 });
 it('rechaza Sobrecarga antes del nivel 14, con trucos o ranuras de nivel 6 o superior',()=>{
  const thirteen=to13();
  const fourteen=to14();
  expect(()=>evokerOverchannel(thirteen.state.magic,13,3)).toThrow();
  for(const badSlot of [0,6,7,-1,1.5])expect(()=>evokerOverchannel(fourteen.state.magic,14,badSlot)).toThrow();
  expect(()=>prepareWizardLevelUp(fourteen.input,fourteen.state,{newSpellIds:['forcecage','simulacrum'],preparedIds:fourteen.input.preparedIds})).toThrow();
  const thirteenChoices={newSpellIds:['forcecage','simulacrum'] as [string,string],preparedIds:[...thirteen.input.preparedIds,'forcecage']};
  expect(()=>prepareWizardLevelUp(thirteen.input,thirteen.state,{...thirteenChoices,newSpellIds:['meteor_swarm','simulacrum']})).toThrow();
 });
 it('guardar/cargar mantiene los usos; descanso largo los reinicia sin quitar PG',()=>{
  const fourteen=to14();
  const spent=toggleWizardSlotMark(fourteen.state,0,5);
  const first=evokerOverchannel(spent.magic,14,3);
  const second=evokerOverchannel(first.state,14,3);
  const damaged={...spent,hitPointsCurrent:spent.hitPointsCurrent-6,magic:second.state};
  const loaded=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(fourteen.input,damaged));
  expect(loaded.wizardState.magic.overchannelUses).toBe(2);
  expect(loaded.wizardState.hitPointsCurrent).toBe(damaged.hitPointsCurrent);
  expect(wizardSlotMarks(loaded.wizardState,5)).toEqual([true,false]);
  const rested=resetWizardSlots(loaded.wizardState,14);
  expect(rested.magic.overchannelUses).toBe(0);
  expect(rested.magic.arcaneRecoveryUsed).toBe(false);
  expect(wizardSlotMarks(rested,5)).toEqual([false,false]);
  expect(wizardLongRest(loaded.wizardState.magic,14,'evoker').overchannelUses).toBe(0);
 });
 it('14→13 retira dos conjuros, Sobrecarga y su contador; conserva el regalo de nivel 13',()=>{
  const thirteen=to13();
  const fourteen=to14();
  const first=evokerOverchannel(fourteen.state.magic,14,2);
  const twice=evokerOverchannel(first.state,14,2);
  const state={...fourteen.state,magic:twice.state,hitPointsCurrent:fourteen.state.hitPointsCurrent-7,temporaryHitPoints:3,heroicInspiration:true};
  const down=previewWizardLevelDown(fourteen.input,state);
  expect(down.snapshot.input.level).toBe(13);
  expect(down.snapshot.input.spellbookIds).toEqual(thirteen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(thirteen.input.preparedIds);
  expect(down.snapshot.input.evokerLevelSevenSpellId).toBe('delayed_blast_fireball');
  expect(down.snapshot.wizardState.magic.overchannelUses).toBe(0);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(thirteen.state.hitPointsCurrent-7);
  expect(down.snapshot.wizardState.temporaryHitPoints).toBe(3);
  expect(down.snapshot.wizardState.heroicInspiration).toBe(true);
  expect(down.lost.some(feature=>feature.title==='Sobrecarga')).toBe(true);
  expect(down.changes.some(change=>change.title==='Sobrecarga')).toBe(true);
 });
 it('el validador rechaza contadores adulterados y nunca permite usos antes de nivel 14',()=>{
  const thirteen=to13(),fourteen=to14();
  const s=calculateGuidedWizard(fourteen.input);
  for(const bad of [-1,1.5,Number.NaN,Number.MAX_SAFE_INTEGER+1]){
   expect(()=>validateWizardOneState({...fourteen.state,magic:{...fourteen.state.magic,overchannelUses:bad}},s)).toThrow();
  }
  expect(()=>validateWizardOneState({...thirteen.state,magic:{...thirteen.state.magic,overchannelUses:1}},calculateGuidedWizard(thirteen.input))).toThrow();
 });
});
