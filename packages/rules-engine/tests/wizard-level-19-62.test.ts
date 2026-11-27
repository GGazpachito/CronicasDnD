import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,type WizardLevelUpChoices} from '../src/wizard-level-up';
import {WIZARD_EPIC_BOONS,applyWizardEpicBoon,wizardSpellRecallResult,type WizardEpicBoonChoice} from '../src/wizard-epic-boons';
import {collectWizardTraits} from '../src/wizard-traits';
import {previewWizardLevelDown} from '../src/level-down';
import {toggleWizardSlotMark,wizardSlotMarks} from '../src/wizard-slot-marks';
import {wizardProgression} from '../src/wizard';

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
function to18(){
 let input=base,state=initialWizardOneState(base);
 for(const step of steps){const advanced=prepareWizardLevelUp(input,state,{newSpellIds:[...step.spells],preparedIds:[...input.preparedIds,...step.prep],...step.extra});input=advanced.input;state=advanced.state;}
 return prepareWizardLevelUp(input,state,{newSpellIds:['foresight','gate'],preparedIds:[...input.preparedIds,'foresight'],spellMasteryIds:['detect_magic','mirror_image']});
}
function to19(boon:WizardEpicBoonChoice={id:'spell_recall',ability:'intelligence'}){
 const eighteen=to18();
 return prepareWizardLevelUp(eighteen.input,eighteen.state,{newSpellIds:['true_polymorph','shapechange'],preparedIds:[...eighteen.input.preparedIds,'true_polymorph'],epicBoon:boon});
}

describe('Actualización 62: Mago Evocador nivel 19 y Beneficio épico',()=>{
 it('18→19: 42 conjuros, 24 preparados, 2 Maestrías y segunda ranura de nivel 6 disponible',()=>{
  const eighteen=to18(),nineteen=to19(),sheet=calculateGuidedWizard(nineteen.input);
  expect(wizardLevelUpChoicesPreview(eighteen.input)?.nextLevel).toBe(19);
  expect(wizardLevelUpChoicesPreview(nineteen.input)?.nextLevel).toBe(20);
  expect(nineteen.input.level).toBe(19);
  expect(nineteen.input.spellbookIds).toHaveLength(42);
  expect(nineteen.input.preparedIds).toHaveLength(24);
  expect(nineteen.input.cantripIds).toHaveLength(5);
  expect(sheet.spells.alwaysPreparedIds).toEqual(['detect_magic','mirror_image']);
  expect(wizardProgression(19,'evoker').proficiencyBonus).toBe(6);
  expect(nineteen.state.magic.slots.maximum).toEqual([4,3,3,3,3,2,1,1,1]);
  expect(wizardSlotMarks(nineteen.state,6)).toEqual([false,false]);
  expect(sheet.abilityScores.intelligence).toBe(calculateGuidedWizard(eighteen.input).abilityScores.intelligence+1);
  expect(nineteen.input.evokerLevelNineSpellId).toBe('meteor_swarm');
  expect(nineteen.input.spellMasteryIds).toEqual(eighteen.input.spellMasteryIds);
 });

 it('exige el beneficio épico y aplica las restricciones de dote, atributo y nivel',()=>{
  const eighteen=to18(),normal={newSpellIds:['true_polymorph','shapechange'] as [string,string],preparedIds:[...eighteen.input.preparedIds,'true_polymorph']};
  expect(()=>prepareWizardLevelUp(eighteen.input,eighteen.state,normal)).toThrow(/beneficio épico/i);
  expect(()=>prepareWizardLevelUp(eighteen.input,eighteen.state,{...normal,epicBoon:{id:'spell_recall',ability:'constitution'}})).toThrow(/Inteligencia/i);
  expect(()=>prepareWizardLevelUp(eighteen.input,eighteen.state,{...normal,epicBoon:{id:'desconocido' as WizardEpicBoonChoice['id'],ability:'wisdom'}})).toThrow();
  expect(()=>calculateGuidedWizard({...eighteen.input,epicBoon:{id:'speed' as WizardEpicBoonChoice['id'],ability:'strength'}})).toThrow();
  expect(()=>prepareWizardLevelUp(to19().input,to19().state,normal)).toThrow();
  const scores={strength:30,dexterity:10,constitution:12,intelligence:20,wisdom:14,charisma:8};
  expect(()=>applyWizardEpicBoon(scores,{id:'combat_prowess',ability:'strength'})).toThrow(/30/);
  expect(()=>applyWizardEpicBoon(scores,{id:'truesight',ability:'strength'})).toThrow(/30/);
  expect(Object.keys(WIZARD_EPIC_BOONS)).toHaveLength(3);
 });

 it('Visión verdadera y Pericia en combate aportan solo sus efectos SRD',()=>{
  const eighteenSheet=calculateGuidedWizard(to18().input);
  const truesight=calculateGuidedWizard(to19({id:'truesight',ability:'wisdom'}).input);
  const prowess=calculateGuidedWizard(to19({id:'combat_prowess',ability:'strength'}).input);
  expect(truesight.truesightFeet).toBe(60);
  expect(truesight.speedFeet).toBe(eighteenSheet.speedFeet);
  expect(truesight.maximumHitPoints).toBeGreaterThan(eighteenSheet.maximumHitPoints);
  expect(prowess.abilityScores.strength).toBe(eighteenSheet.abilityScores.strength+1);
  const featTraits=collectWizardTraits(to19({id:'truesight',ability:'wisdom'}).input,truesight).traits;
  expect(featTraits.some(trait=>trait.id==='wizard:epic_boon:truesight'&&trait.details.some(detail=>detail.includes('60 pies')))).toBe(true);
 });

 it('Recuperación de conjuros resuelve 1d4 sin alterar estado ni admitir niveles superiores a 4',()=>{
  expect(wizardSpellRecallResult(1,1)).toEqual({slotLevel:1,die:1,keepsSlot:true});
  expect(wizardSpellRecallResult(4,3)).toEqual({slotLevel:4,die:3,keepsSlot:false});
  expect(()=>wizardSpellRecallResult(5,1)).toThrow();
  expect(()=>wizardSpellRecallResult(0,1)).toThrow();
  expect(()=>wizardSpellRecallResult(2,0)).toThrow();
  expect(()=>wizardSpellRecallResult(2,5)).toThrow();
  const nineteen=to19();
  expect(wizardSlotMarks(nineteen.state,4)).toEqual([false,false,false]);
 });

 it('guarda y recarga la dote épica, las Maestrías y las ranuras gastadas del nivel 19',()=>{
  const nineteen=to19({id:'truesight',ability:'wisdom'});
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(nineteen.state,1,6),0,9);
  const saved=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(nineteen.input,spent));
  expect(saved.input.epicBoon).toEqual({id:'truesight',ability:'wisdom'});
  expect(saved.input.spellMasteryIds).toEqual(['detect_magic','mirror_image']);
  expect(wizardSlotMarks(saved.wizardState,6)).toEqual([false,true]);
  expect(wizardSlotMarks(saved.wizardState,9)).toEqual([true]);
  expect(calculateGuidedWizard(saved.input).truesightFeet).toBe(60);
 });

 it('19→18 retira solo la dote y el excedente de ranura 6, conserva ambas Maestrías y las heridas',()=>{
  const eighteen=to18(),nineteen=to19({id:'combat_prowess',ability:'constitution'});
  const spent=toggleWizardSlotMark(toggleWizardSlotMark(nineteen.state,0,6),1,6);
  const down=previewWizardLevelDown(nineteen.input,{...spent,hitPointsCurrent:spent.hitPointsCurrent-6});
  const after=calculateGuidedWizard(down.snapshot.input);
  expect(down.snapshot.input.level).toBe(18);
  expect(down.snapshot.input.epicBoon).toBeUndefined();
  expect(down.snapshot.input.spellMasteryIds).toEqual(['detect_magic','mirror_image']);
  expect(after.spells.alwaysPreparedIds).toEqual(['detect_magic','mirror_image']);
  expect(down.snapshot.input.spellbookIds).toEqual(eighteen.input.spellbookIds);
  expect(down.snapshot.input.preparedIds).toEqual(eighteen.input.preparedIds);
  expect(down.snapshot.input.evokerLevelNineSpellId).toBe('meteor_swarm');
  expect(down.snapshot.wizardState.magic.slots.maximum).toEqual([4,3,3,3,3,1,1,1,1]);
  expect(wizardSlotMarks(down.snapshot.wizardState,6)).toEqual([true]);
  expect(down.snapshot.wizardState.hitPointsCurrent).toBe(eighteen.state.hitPointsCurrent-6);
  expect(down.lost.some(item=>item.title==='Beneficio épico')).toBe(true);
 });
});
