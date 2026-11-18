import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,wizardMemorizePreparedSpell,type WizardLevelUpChoices} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks,resetWizardSlots} from '../src/wizard-slot-marks';
import {wizardProgression,evokerOverchannel} from '../src/wizard';
import {wizardSpellRule,WIZARD_SPELL_RULES} from '../src/wizard-spell-details';
import {wizardSpellSelection} from '../src/wizard-spell-library';
import {WIZARD_LEVEL_NINE_SPELLS} from '../src/wizard-ninth-level';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};

// Avance reproducible sin introducir fixtures de personaje artificiales.
const steps:readonly {spells:readonly [string,string];prep:readonly string[];extra:Partial<WizardLevelUpChoices>}[]=[
 {spells:['alarm','shield'],prep:['shield'],extra:{scholarSkill:'arcana'}},
 {spells:['misty_step','web'],prep:['web'],extra:{evokerBonusSpellIds:['darkness','scorching_ray']}},
 {spells:['mirror_image','shatter'],prep:['shatter'],extra:{newCantripId:'fire_bolt',level4Improvement:{mode:'plus_two',first:'intelligence'}}},
 {spells:['fireball','fly'],prep:['fireball','fly'],extra:{evokerLevelThreeSpellId:'lightning_bolt'}},
 {spells:['haste','dispel_magic'],prep:['haste'],extra:{}},
 {spells:['dimension_door','polymorph'],prep:['dimension_door'],extra:{evokerLevelFourSpellId:'ice_storm'}},
 {spells:['arcane_eye','wall_of_fire'],prep:['arcane_eye'],extra:{level8Improvement:{mode:'two_ones',first:'intelligence',second:'constitution'}}},
 {spells:['cone_of_cold','telekinesis'],prep:['cone_of_cold','telekinesis'],extra:{evokerLevelFiveSpellId:'wall_of_force'}},
 {spells:['hold_monster','geas'],prep:['hold_monster'],extra:{newCantripId:'mind_sliver'}},
 {spells:['chain_lightning','disintegrate'],prep:['chain_lightning'],extra:{evokerLevelSixSpellId:'sunbeam'}},
 {spells:['arcane_gate','circle_of_death'],prep:[],extra:{level12Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'}}},
 {spells:['teleport','finger_of_death'],prep:['teleport'],extra:{evokerLevelSevenSpellId:'delayed_blast_fireball'}},
 {spells:['forcecage','simulacrum'],prep:['forcecage'],extra:{}},
 {spells:['antimagic_field','befuddlement'],prep:['befuddlement'],extra:{evokerLevelEightSpellId:'sunburst'}},
 {spells:['incendiary_cloud','maze'],prep:['incendiary_cloud','maze'],extra:{level16Improvement:{mode:'plus_two',first:'constitution'}}},
];
function to16(){
 let input=base,state=initialWizardOneState(base);
 for(const step of steps){
  const up=prepareWizardLevelUp(input,state,{newSpellIds:[...step.spells],preparedIds:[...input.preparedIds,...step.prep],...step.extra});
  input=up.input;state=up.state;
 }
 return {input,state};
}
function to17(){
 const sixteen=to16();
 return prepareWizardLevelUp(sixteen.input,sixteen.state,{
  newSpellIds:['wish','time_stop'],preparedIds:[...sixteen.input.preparedIds,'wish'],evokerLevelNineSpellId:'meteor_swarm'
 });
}

describe('Actualización 60: Mago Evocación nivel 17',()=>{
 it('incluye exactamente 12 conjuros de nivel 9 con fichas y fórmulas consultables',()=>{
  expect(WIZARD_LEVEL_NINE_SPELLS).toHaveLength(12);
  expect(WIZARD_SPELL_CATALOG.filter(spell=>spell.level===9)).toHaveLength(12);
  expect(WIZARD_SPELL_RULES).toHaveLength(242);
  expect(new Set(WIZARD_SPELL_RULES.map(rule=>rule.id)).size).toBe(242);
  for(const spell of WIZARD_LEVEL_NINE_SPELLS){
   const details=wizardSpellRule(spell.id);
   expect(details?.school).toBe(spell.school);
   expect(details?.level).toBe(9);
   expect(details?.description.length).toBeGreaterThan(90);
   expect(details?.castingTime&&details.range&&details.components&&details.duration).toBeTruthy();
  }
  expect(wizardSpellRule('meteor_swarm')?.rolls.map(r=>r.formula)).toEqual(['20d6','20d6']);
  expect(wizardSpellRule('power_word_kill')?.rolls[0].formula).toBe('12d12');
  expect(wizardSpellRule('weird')?.rolls.map(r=>r.formula)).toEqual(['10d10','5d10']);
  expect(wizardSpellRule('time_stop')?.rolls[0].formula).toBe('1d4+1');
 });
 it('16→17 concede una ranura de nivel 9, +2 libro, +1 preparado y una Evocación adicional',()=>{
  const sixteen=to16(),seventeen=to17();
  const sheet=calculateGuidedWizard(seventeen.input);
  expect(seventeen.input.level).toBe(17);
  expect(seventeen.input.spellbookIds).toHaveLength(38);
  expect(seventeen.input.preparedIds).toHaveLength(22);
  expect(seventeen.input.cantripIds).toHaveLength(5);
  expect(seventeen.input.evokerLevelNineSpellId).toBe('meteor_swarm');
  expect(sheet.spells.spellbook.map(s=>s.id)).toContain('meteor_swarm');
  expect(seventeen.state.magic.slots.maximum).toEqual([4,3,3,3,2,1,1,1,1]);
  expect(wizardSlotMarks(seventeen.state,9)).toEqual([false]);
  expect(wizardProgression(17,'evoker').proficiencyBonus).toBe(6);
  expect(seventeen.input.level16Improvement).toEqual(sixteen.input.level16Improvement);
  expect(seventeen.hitPointsIncrease).toBe(sheet.maximumHitPoints-calculateGuidedWizard(sixteen.input).maximumHitPoints);
  expect(wizardLevelUpChoicesPreview(seventeen.input)?.nextLevel).toBe(18);
 });
 it('rechaza regalo de Evocación ausente, duplicado, de otra escuela o prematuro',()=>{
  const sixteen=to16();
  const baseChoices={newSpellIds:['wish','time_stop'] as [string,string],preparedIds:[...sixteen.input.preparedIds,'wish']};
  expect(()=>prepareWizardLevelUp(sixteen.input,sixteen.state,baseChoices)).toThrow();
  expect(()=>prepareWizardLevelUp(sixteen.input,sixteen.state,{...baseChoices,evokerLevelNineSpellId:'wish'})).toThrow();
  expect(()=>prepareWizardLevelUp(sixteen.input,sixteen.state,{...baseChoices,newSpellIds:['meteor_swarm','wish'],evokerLevelNineSpellId:'meteor_swarm'})).toThrow();
  expect(()=>prepareWizardLevelUp(sixteen.input,sixteen.state,{...baseChoices,evokerLevelNineSpellId:'sunburst'})).toThrow();
  expect(()=>calculateGuidedWizard({...sixteen.input,evokerLevelNineSpellId:'meteor_swarm'})).toThrow();
  expect(()=>prepareWizardLevelUp(sixteen.input,sixteen.state,{...baseChoices,evokerLevelNineSpellId:'meteor_swarm',level16Improvement:{mode:'plus_two',first:'wisdom'}})).toThrow();
 });
 it('guarda el nivel 17 con las ranuras 8 y 9 gastadas, Sobrecarga y el conjuro gratuito',()=>{
  const seventeen=to17();
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(seventeen.state,0,8),0,9);
  const used=evokerOverchannel(spent.magic,17,3);
  const saved=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(seventeen.input,{...spent,magic:used.state}));
  expect(saved.input.level).toBe(17);
  expect(saved.input.evokerLevelNineSpellId).toBe('meteor_swarm');
  expect(saved.wizardState.magic.overchannelUses).toBe(1);
  expect(wizardSlotMarks(saved.wizardState,8)).toEqual([true]);
  expect(wizardSlotMarks(saved.wizardState,9)).toEqual([true]);
  expect(resetWizardSlots(saved.wizardState,17).magic.overchannelUses).toBe(0);
 });
 it('permite memorizar la Evocación gratuita y conservarla en biblioteca manual',()=>{
  const seventeen=to17();
  expect(wizardSpellSelection(seventeen.input).learnedIds).toContain('meteor_swarm');
  const next=wizardMemorizePreparedSpell(seventeen.input,seventeen.input.preparedIds[0],'meteor_swarm');
  expect(next.preparedIds).toContain('meteor_swarm');
  expect(next.preparedIds).toHaveLength(22);
 });
 it('sincroniza una biblioteca manual existente y retira el regalo al retroceder',()=>{
  const sixteen=to16();
  const manual:GuidedWizardInput={...sixteen.input,spellSelection:wizardSpellSelection(sixteen.input)};
  const advanced=prepareWizardLevelUp(manual,sixteen.state,{
   newSpellIds:['wish','time_stop'],preparedIds:[...manual.preparedIds,'wish'],evokerLevelNineSpellId:'meteor_swarm'
  });
  expect(advanced.input.spellSelection?.learnedIds).toContain('meteor_swarm');
  expect(advanced.input.spellSelection?.learnedIds).toContain('wish');
  const down=previewWizardLevelDown(advanced.input,advanced.state);
  expect(down.snapshot.input.spellSelection?.learnedIds).not.toContain('meteor_swarm');
  expect(down.snapshot.input.spellSelection?.learnedIds).not.toContain('wish');
  expect(down.snapshot.input.spellSelection?.learnedIds).toContain('sunburst');
 });
 it('17→16 elimina exactamente el regalo, los dos conjuros nuevos y la ranura 9; conserva la mejora del 16',()=>{
  const sixteen=to16(),seventeen=to17();
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(seventeen.state,0,8),0,9);
  const used=evokerOverchannel(spent.magic,17,4);
  const down=previewWizardLevelDown(seventeen.input,{...spent,magic:used.state,hitPointsCurrent:spent.hitPointsCurrent-7});
  expect(down.snapshot.input.level).toBe(16);
  expect(down.snapshot.input.spellbookIds).toEqual(sixteen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(sixteen.input.preparedIds);
  expect(down.snapshot.input.evokerLevelNineSpellId).toBeUndefined();
  expect(down.snapshot.input.evokerLevelEightSpellId).toBe('sunburst');
  expect(down.snapshot.input.level16Improvement).toEqual(sixteen.input.level16Improvement);
  expect(down.snapshot.wizardState.magic.slots.maximum[8]).toBe(0);
  expect(wizardSlotMarks(down.snapshot.wizardState,8)).toEqual([true]);
  expect(down.snapshot.wizardState.magic.overchannelUses).toBe(1);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(sixteen.state.hitPointsCurrent-7);
  expect(down.lost.some(item=>item.title.includes('Lluvia de meteoritos'))).toBe(true);
 });
});
