import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,wizardReplaceMasteryAfterLongRest,type WizardLevelUpChoices} from '../src/wizard-level-up';
import {wizardProgression,wizardUseSignatureSpell,wizardShortRest,wizardLongRest,evokerOverchannel} from '../src/wizard';
import {wizardSpellSelection} from '../src/wizard-spell-library';
import {collectWizardTraits} from '../src/wizard-traits';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks} from '../src/wizard-slot-marks';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const steps:readonly {spells:readonly [string,string];prep:readonly string[];extra:Partial<WizardLevelUpChoices>}[]=[
 {spells:['alarm','shield'],prep:['shield'],extra:{scholarSkill:'arcana'}},
 {spells:['misty_step','web'],prep:['web'],extra:{evokerBonusSpellIds:['darkness','scorching_ray']}},
 {spells:['mirror_image','shatter'],prep:['shatter'],extra:{newCantripId:'fire_bolt',level4Improvement:{mode:'plus_two',first:'intelligence'}}},
 {spells:['fireball','fly'],prep:['fireball','fly'],extra:{evokerLevelThreeSpellId:'lightning_bolt'}},
 {spells:['haste','dispel_magic'],prep:['haste'],extra:{}},
 {spells:['dimension_door','polymorph'],prep:['dimension_door'],extra:{evokerLevelFourSpellId:'ice_storm'}},
 {spells:['arcane_eye','wall_of_fire'],prep:['arcane_eye'],extra:{level8Improvement:{mode:'two_ones',first:'intelligence',second:'constitution'}}},
 {spells:['cone_of_cold','telekinesis'],prep:['cone_of_cold','telekinesis'],extra:{evokerLevelFiveSpellId:'wall_of_force'}},
 {spells:['hold_monster','geas'],prep:['hold_monster'],extra:{newCantripId:'poison_spray'}},
 {spells:['chain_lightning','disintegrate'],prep:['chain_lightning'],extra:{evokerLevelSixSpellId:'sunbeam'}},
 {spells:['globe_of_invulnerability','circle_of_death'],prep:[],extra:{level12Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'}}},
 {spells:['teleport','finger_of_death'],prep:['teleport'],extra:{evokerLevelSevenSpellId:'delayed_blast_fireball'}},
 {spells:['forcecage','simulacrum'],prep:['forcecage'],extra:{}},
 {spells:['antimagic_field','befuddlement'],prep:['befuddlement'],extra:{evokerLevelEightSpellId:'sunburst'}},
 {spells:['incendiary_cloud','maze'],prep:['incendiary_cloud','maze'],extra:{level16Improvement:{mode:'plus_two',first:'constitution'}}},
 {spells:['wish','time_stop'],prep:['wish'],extra:{evokerLevelNineSpellId:'meteor_swarm'}},
];
function to19(){
 let input=base,state=initialWizardOneState(base);
 for(const step of steps){const advanced=prepareWizardLevelUp(input,state,{newSpellIds:[...step.spells],preparedIds:[...input.preparedIds,...step.prep],...step.extra});input=advanced.input;state=advanced.state;}
 const eighteen=prepareWizardLevelUp(input,state,{newSpellIds:['foresight','gate'],preparedIds:[...input.preparedIds,'foresight'],spellMasteryIds:['detect_magic','mirror_image']});
 return prepareWizardLevelUp(eighteen.input,eighteen.state,{newSpellIds:['true_polymorph','shapechange'],preparedIds:[...eighteen.input.preparedIds,'true_polymorph'],epicBoon:{id:'spell_recall',ability:'intelligence'}});
}
const signatureChoices={newSpellIds:['power_word_kill','prismatic_wall'] as [string,string],signatureSpellIds:['fireball','fly'] as [string,string]};
function to20(){const nineteen=to19();return prepareWizardLevelUp(nineteen.input,nineteen.state,{...signatureChoices,preparedIds:[...nineteen.input.preparedIds,'prismatic_wall']});}

describe('Actualización 63: Mago Evocador nivel 20 y Conjuros de firma',()=>{
 it('19→20: libro 44, 25 preparados, 4 siempre preparados y segunda ranura de nivel 7',()=>{
  const nineteen=to19(),twenty=to20(),sheet=calculateGuidedWizard(twenty.input);
  expect(wizardLevelUpChoicesPreview(nineteen.input)?.nextLevel).toBe(20);
  expect(wizardLevelUpChoicesPreview(twenty.input)).toBe(null);
  expect(twenty.input.level).toBe(20);
  expect(twenty.input.spellbookIds).toHaveLength(44);
  expect(twenty.input.preparedIds).toHaveLength(25);
  expect(twenty.input.cantripIds).toHaveLength(5);
  expect(sheet.spells.preparedIds).toHaveLength(25);
  expect(sheet.spells.alwaysPreparedIds).toEqual(['detect_magic','mirror_image','fireball','fly']);
  expect(twenty.input.signatureSpellIds).toEqual(['fireball','fly']);
  expect(twenty.input.spellMasteryIds).toEqual(nineteen.input.spellMasteryIds);
  expect(twenty.input.epicBoon).toEqual(nineteen.input.epicBoon);
  expect(twenty.state.magic.slots.maximum).toEqual([4,3,3,3,3,2,2,1,1]);
  expect(wizardSlotMarks(twenty.state,7)).toEqual([false,false]);
  expect(wizardProgression(20,'evoker').proficiencyBonus).toBe(6);
  expect(twenty.hitPointsIncrease).toBe(sheet.maximumHitPoints-calculateGuidedWizard(nineteen.input).maximumHitPoints);
 });

 it('exige dos conjuros distintos de nivel 3 de su libro, no cualquiera del catálogo',()=>{
  const nineteen=to19();const required={newSpellIds:signatureChoices.newSpellIds,preparedIds:[...nineteen.input.preparedIds,'prismatic_wall']};
  expect(()=>prepareWizardLevelUp(nineteen.input,nineteen.state,required)).toThrow(/firma/i);
  expect(()=>prepareWizardLevelUp(nineteen.input,nineteen.state,{...required,signatureSpellIds:['fireball','fireball']})).toThrow();
  expect(()=>prepareWizardLevelUp(nineteen.input,nineteen.state,{...required,signatureSpellIds:['fireball','wish']})).toThrow();
  expect(()=>prepareWizardLevelUp(nineteen.input,nineteen.state,{...required,signatureSpellIds:['fireball','counterspell']})).toThrow();
  expect(()=>calculateGuidedWizard({...nineteen.input,signatureSpellIds:['fireball','fly']})).toThrow();
  expect(()=>prepareWizardLevelUp(to20().input,to20().state,{...required,signatureSpellIds:['fireball','fly']})).toThrow();
 });

 it('admite elegir conjuros de nivel 3 aprendidos en la misma subida',()=>{
  const nineteen=to19();
  const twenty=prepareWizardLevelUp(nineteen.input,nineteen.state,{newSpellIds:['hypnotic_pattern','slow'],preparedIds:[...nineteen.input.preparedIds,'slow'],signatureSpellIds:['hypnotic_pattern','slow']});
  expect(twenty.input.signatureSpellIds).toEqual(['hypnotic_pattern','slow']);
  expect(calculateGuidedWizard(twenty.input).spells.alwaysPreparedIds).toEqual(['detect_magic','mirror_image','hypnotic_pattern','slow']);
 });

 it('registra cada lanzamiento gratuito por separado sin consumir ranura; descanso corto restablece los dos',()=>{
  const twenty=to20();const before=twenty.state.magic;
  const first=wizardUseSignatureSpell(before,20,'fireball',twenty.input.signatureSpellIds!);
  expect(first.signatureUsed).toEqual(['fireball']);
  expect(first.slots).toEqual(before.slots);
  expect(()=>wizardUseSignatureSpell(first,20,'fireball',twenty.input.signatureSpellIds!)).toThrow();
  expect(()=>wizardUseSignatureSpell(first,20,'shield',twenty.input.signatureSpellIds!)).toThrow();
  expect(()=>wizardUseSignatureSpell(before,19,'fireball',twenty.input.signatureSpellIds!)).toThrow();
  const second=wizardUseSignatureSpell(first,20,'fly',twenty.input.signatureSpellIds!);
  expect(second.signatureUsed).toEqual(['fireball','fly']);
  expect(second.slots).toEqual(before.slots);
  const rested=wizardShortRest(second);
  expect(rested.signatureUsed).toEqual([]);
  expect(rested.slots).toEqual(before.slots);
  expect(rested.arcaneRecoveryUsed).toBe(second.arcaneRecoveryUsed);
  expect(rested.overchannelUses).toBe(second.overchannelUses);
  expect(wizardUseSignatureSpell(rested,20,'fireball',twenty.input.signatureSpellIds!).signatureUsed).toEqual(['fireball']);
 });

 it('descanso largo recupera las dos firmas, ranuras y Sobrecarga',()=>{
  const twenty=to20();
  const spent=toggleWizardSlotMark(twenty.state,0,7);
  const used=wizardUseSignatureSpell(spent.magic,20,'fireball',twenty.input.signatureSpellIds!);
  const overchannel=evokerOverchannel(used,20,3).state;
  const rested=wizardLongRest(overchannel,20,'evoker');
  expect(rested.signatureUsed).toEqual([]);
  expect(rested.slots.remaining).toEqual(rested.slots.maximum);
  expect(rested.overchannelUses).toBe(0);
  expect(rested.arcaneRecoveryUsed).toBe(false);
 });

 it('el guardado conserva usos de firma y no admite referencias arbitrarias o duplicadas',()=>{
  const twenty=to20();
  const signed=wizardUseSignatureSpell(twenty.state.magic,20,'fly',twenty.input.signatureSpellIds!);
  const saved=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(twenty.input,{...twenty.state,magic:signed}));
  expect(saved.schemaVersion).toBe(3);
  expect(saved.input.signatureSpellIds).toEqual(['fireball','fly']);
  expect(saved.wizardState.magic.signatureUsed).toEqual(['fly']);
  expect(saved.input.epicBoon).toEqual({id:'spell_recall',ability:'intelligence'});
  expect(()=>makeWizardCharacterSnapshot(twenty.input,{...twenty.state,magic:{...signed,signatureUsed:['fly','fly']}})).toThrow();
  expect(()=>makeWizardCharacterSnapshot(twenty.input,{...twenty.state,magic:{...signed,signatureUsed:['shield']}})).toThrow();
  expect(()=>makeWizardCharacterSnapshot(to19().input,{...to19().state,magic:{...to19().state.magic,signatureUsed:['fireball']}})).toThrow();
 });

 it('biblioteca manual y Rasgos mantienen los Conjuros de firma siempre preparados',()=>{
  const twenty=to20();
  const manual={...twenty.input,spellSelection:{learnedIds:[...twenty.input.cantripIds],preparedIds:[...twenty.input.cantripIds]}};
  const selection=wizardSpellSelection(manual);
  for(const id of ['fireball','fly','detect_magic','mirror_image']){
   expect(selection.learnedIds).toContain(id);
   expect(selection.preparedIds).toContain(id);
  }
  const traits=collectWizardTraits(twenty.input,calculateGuidedWizard(twenty.input)).traits;
  expect(traits.some(t=>t.id==='wizard:signature_spells'&&t.details.some(d=>d.includes('Bola de fuego')))).toBe(true);
  const swapped=wizardReplaceMasteryAfterLongRest(twenty.input,1,'magic_missile');
  expect(swapped.signatureSpellIds).toEqual(twenty.input.signatureSpellIds);
 });

 it('20→19 retira firmas y ranura extra del 7 conservando la dote del 19 y Maestría del 18',()=>{
  const nineteen=to19(),twenty=to20();
  let spent=toggleWizardSlotMark(toggleWizardSlotMark(twenty.state,0,7),1,7);
  spent={...spent,magic:wizardUseSignatureSpell(spent.magic,20,'fireball',twenty.input.signatureSpellIds!),hitPointsCurrent:spent.hitPointsCurrent-4};
  const down=previewWizardLevelDown(twenty.input,spent);
  expect(down.snapshot.input.level).toBe(19);
  expect(down.snapshot.input.signatureSpellIds).toBeUndefined();
  expect(down.snapshot.input.epicBoon).toEqual(nineteen.input.epicBoon);
  expect(down.snapshot.input.spellMasteryIds).toEqual(nineteen.input.spellMasteryIds);
  expect(down.snapshot.input.spellbookIds).toEqual(nineteen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(nineteen.input.preparedIds);
  expect(down.snapshot.wizardState.magic.signatureUsed).toEqual([]);
  expect(down.snapshot.wizardState.magic.slots.maximum).toEqual(nineteen.state.magic.slots.maximum);
  expect(wizardSlotMarks(down.snapshot.wizardState,7)).toEqual([true]);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(nineteen.state.hitPointsCurrent-4);
  expect(down.lost.some(x=>x.title==='Conjuros distintivos')).toBe(true);
  expect(down.changes.some(x=>x.title==='Conjuros de firma')).toBe(true);
 });
});
