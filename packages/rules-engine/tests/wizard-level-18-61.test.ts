import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,wizardMasteryAlternatives,wizardReplaceMasteryAfterLongRest,type WizardLevelUpChoices} from '../src/wizard-level-up';
import {wizardMasteryCastingTime} from '../src/wizard-mastery';
import {wizardSpellRule} from '../src/wizard-spell-details';
import {previewWizardLevelDown} from '../src/level-down';
import {wizardSlotMarks,toggleWizardSlotMark,resetWizardSlots} from '../src/wizard-slot-marks';
import {wizardProgression,evokerOverchannel} from '../src/wizard';
import {wizardSpellSelection} from '../src/wizard-spell-library';

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
 {spells:['hold_monster','geas'],prep:['hold_monster'],extra:{newCantripId:'mind_sliver'}},
 {spells:['chain_lightning','disintegrate'],prep:['chain_lightning'],extra:{evokerLevelSixSpellId:'sunbeam'}},
 {spells:['arcane_gate','circle_of_death'],prep:[],extra:{level12Improvement:{mode:'two_ones',first:'wisdom',second:'dexterity'}}},
 {spells:['teleport','finger_of_death'],prep:['teleport'],extra:{evokerLevelSevenSpellId:'delayed_blast_fireball'}},
 {spells:['forcecage','simulacrum'],prep:['forcecage'],extra:{}},
 {spells:['antimagic_field','befuddlement'],prep:['befuddlement'],extra:{evokerLevelEightSpellId:'sunburst'}},
 {spells:['incendiary_cloud','maze'],prep:['incendiary_cloud','maze'],extra:{level16Improvement:{mode:'plus_two',first:'constitution'}}},
 {spells:['wish','time_stop'],prep:['wish'],extra:{evokerLevelNineSpellId:'meteor_swarm'}},
];
function to17(){let input=base,state=initialWizardOneState(base);for(const step of steps){const up=prepareWizardLevelUp(input,state,{newSpellIds:[...step.spells],preparedIds:[...input.preparedIds,...step.prep],...step.extra});input=up.input;state=up.state;}return {input,state};}
function to18(){const seventeen=to17();return prepareWizardLevelUp(seventeen.input,seventeen.state,{
 newSpellIds:['foresight','gate'],preparedIds:[...seventeen.input.preparedIds,'foresight'],spellMasteryIds:['detect_magic','mirror_image']
});}

describe('Actualización 61: Mago Evocación nivel 18 y Maestría de conjuros',()=>{
 it('clasifica los 70 conjuros de nivel 1 y 2 por su tiempo real de lanzamiento',()=>{
  const spells=WIZARD_SPELL_CATALOG.filter(s=>s.level===1||s.level===2);
  expect(spells).toHaveLength(70);
  for(const spell of spells){
   const time=wizardSpellRule(spell.id)?.castingTime??'';
   expect(wizardMasteryCastingTime(spell.id,spell.level)).toBe(/^Action(?:\s|$)/i.test(time)?'action':'other');
  }
  expect(wizardMasteryCastingTime('detect_magic',1)).toBe('action'); // Acción o Ritual.
  expect(wizardMasteryCastingTime('gentle_repose',2)).toBe('action');
  expect(wizardMasteryCastingTime('shield',1)).toBe('other'); // Reacción.
  expect(wizardMasteryCastingTime('misty_step',2)).toBe('other'); // Acción adicional.
 });
 it('17→18: Maestría, 23 preparados regulares, 40 conjuros y la tercera ranura de nivel 5',()=>{
  const seventeen=to17(),eighteen=to18(),sheet=calculateGuidedWizard(eighteen.input);
  expect(eighteen.input.level).toBe(18);
  expect(eighteen.input.spellbookIds).toHaveLength(40);
  expect(eighteen.input.preparedIds).toHaveLength(23);
  expect(eighteen.input.spellMasteryIds).toEqual(['detect_magic','mirror_image']);
  expect(sheet.spells.alwaysPreparedIds).toEqual(['detect_magic','mirror_image']);
  expect(sheet.spells.preparedIds).toHaveLength(23);
  expect(eighteen.state.magic.slots.maximum).toEqual([4,3,3,3,3,1,1,1,1]);
  expect(wizardSlotMarks(eighteen.state,5)).toEqual([false,false,false]);
  expect(wizardProgression(18,'evoker').proficiencyBonus).toBe(6);
  expect(eighteen.input.evokerLevelNineSpellId).toBe('meteor_swarm');
  expect(eighteen.hitPointsIncrease).toBe(sheet.maximumHitPoints-calculateGuidedWizard(seventeen.input).maximumHitPoints);
  expect(wizardLevelUpChoicesPreview(eighteen.input)).toBe(null);
 });
 it('rechaza Maestría omitida, niveles intercambiados o hechizos que no son de una acción',()=>{
  const seventeen=to17();
  const choices={newSpellIds:['foresight','gate'] as [string,string],preparedIds:[...seventeen.input.preparedIds,'foresight']};
  expect(()=>prepareWizardLevelUp(seventeen.input,seventeen.state,choices)).toThrow();
  expect(()=>prepareWizardLevelUp(seventeen.input,seventeen.state,{...choices,spellMasteryIds:['mirror_image','detect_magic']})).toThrow();
  expect(()=>prepareWizardLevelUp(seventeen.input,seventeen.state,{...choices,spellMasteryIds:['shield','mirror_image']})).toThrow();
  expect(()=>prepareWizardLevelUp(seventeen.input,seventeen.state,{...choices,spellMasteryIds:['detect_magic','misty_step']})).toThrow();
  expect(()=>prepareWizardLevelUp(seventeen.input,seventeen.state,{...choices,spellMasteryIds:['detect_magic','gate']})).toThrow();
  expect(()=>calculateGuidedWizard({...seventeen.input,spellMasteryIds:['detect_magic','mirror_image']})).toThrow();
  expect(wizardMasteryAlternatives(seventeen.input,1).map(s=>s.id)).toContain('detect_magic');
  expect(wizardMasteryAlternatives(seventeen.input,1).map(s=>s.id)).not.toContain('shield');
 });
 it('permite sustituir exactamente una Maestría por otra del mismo nivel tras un descanso largo',()=>{
  const eighteen=to18();
  const changed=wizardReplaceMasteryAfterLongRest(eighteen.input,1,'magic_missile');
  expect(changed.spellMasteryIds).toEqual(['magic_missile','mirror_image']);
  expect(changed.preparedIds).toEqual(eighteen.input.preparedIds);
  expect(changed.spellbookIds).toEqual(eighteen.input.spellbookIds);
  expect(calculateGuidedWizard(changed).spells.alwaysPreparedIds).toEqual(['magic_missile','mirror_image']);
  expect(()=>wizardReplaceMasteryAfterLongRest(eighteen.input,1,'shield')).toThrow();
  expect(()=>wizardReplaceMasteryAfterLongRest(eighteen.input,1,'mirror_image')).toThrow();
  expect(()=>wizardReplaceMasteryAfterLongRest(eighteen.input,2,'misty_step')).toThrow();
  expect(()=>wizardReplaceMasteryAfterLongRest(eighteen.input,2,'mirror_image')).toThrow();
  expect(()=>wizardReplaceMasteryAfterLongRest(to17().input,1,'magic_missile')).toThrow();
 });
 it('marca ambos conjuros como siempre preparados aun si la biblioteca manual los desmarca',()=>{
  const eighteen=to18();
  const manual:GuidedWizardInput={...eighteen.input,spellSelection:{learnedIds:[...eighteen.input.spellbookIds,...eighteen.input.cantripIds,...(eighteen.input.evokerBonusSpellIds??[])],preparedIds:[...eighteen.input.cantripIds,...eighteen.input.preparedIds]}};
  const selection=wizardSpellSelection(manual);
  expect(selection.preparedIds).toContain('detect_magic');
  expect(selection.preparedIds).toContain('mirror_image');
  expect(selection.learnedIds).toContain('mirror_image');
  expect(calculateGuidedWizard(manual).spells.alwaysPreparedIds).toHaveLength(2);
 });
 it('guarda/carga Maestría y recursos gastados; el descanso restaura las ranuras',()=>{
  const eighteen=to18();
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(eighteen.state,2,5),0,9);
  const used=evokerOverchannel(spent.magic,18,3);
  const saved=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(eighteen.input,{...spent,magic:used.state}));
  expect(saved.input.spellMasteryIds).toEqual(['detect_magic','mirror_image']);
  expect(wizardSlotMarks(saved.wizardState,5)).toEqual([false,false,true]);
  expect(wizardSlotMarks(saved.wizardState,9)).toEqual([true]);
  expect(saved.wizardState.magic.overchannelUses).toBe(1);
  const rested=resetWizardSlots(saved.wizardState,18);
  expect(wizardSlotMarks(rested,5)).toEqual([false,false,false]);
  expect(rested.magic.overchannelUses).toBe(0);
 });
 it('18→17 quita Maestría y la ranura sobrante de nivel 5, pero conserva el regalo del 17 y el daño previo',()=>{
  const seventeen=to17(),eighteen=to18();
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(eighteen.state,2,5),0,9);
  const used=evokerOverchannel(spent.magic,18,2);
  const down=previewWizardLevelDown(eighteen.input,{...spent,magic:used.state,hitPointsCurrent:spent.hitPointsCurrent-6});
  expect(down.snapshot.input.level).toBe(17);
  expect(down.snapshot.input.spellMasteryIds).toBeUndefined();
  expect(down.snapshot.input.spellbookIds).toEqual(seventeen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(seventeen.input.preparedIds);
  expect(down.snapshot.input.evokerLevelNineSpellId).toBe('meteor_swarm');
  expect(down.snapshot.input.level16Improvement).toEqual(seventeen.input.level16Improvement);
  expect(down.snapshot.wizardState.magic.slots.maximum).toEqual(seventeen.state.magic.slots.maximum);
  expect(wizardSlotMarks(down.snapshot.wizardState,9)).toEqual([true]);
  expect(down.snapshot.wizardState.magic.overchannelUses).toBe(1);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(seventeen.state.hitPointsCurrent-6);
  expect(down.lost.some(item=>item.title==='Maestría de conjuros')).toBe(true);
 });
});
