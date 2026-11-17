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

describe('Actualización 55: Mago Evocación niveles 10 y 11',()=>{
 it('incorpora las 22 opciones de conjuros de nivel 6 y fichas legibles con dados cuando corresponden',()=>{
  expect(WIZARD_LEVEL_SIX_SPELLS).toHaveLength(22);
  expect(WIZARD_SPELL_CATALOG.filter(s=>s.level===6)).toHaveLength(22);
  expect(WIZARD_SPELL_RULES).toHaveLength(202);
  expect(new Set(WIZARD_SPELL_RULES.map(s=>s.id)).size).toBe(202);
  for(const s of WIZARD_LEVEL_SIX_SPELLS){
   const detail=wizardSpellRule(s.id)!;
   expect(detail.level).toBe(6);
   expect(detail.description.length>90).toBe(true);
   expect(Boolean(detail.castingTime&&detail.range&&detail.duration&&detail.components)).toBe(true);
  }
  expect(wizardSpellRule('chain_lightning')?.rolls[0]?.formula).toBe('10d8');
  expect(wizardSpellRule('disintegrate')?.rolls[0]?.formula).toBe('10d6+40');
  expect(wizardSpellRule('drawmijs_instant_summons')?.ritual).toBe(true);
  expect(wizardSpellRule('summon_fiend')?.rolls).toHaveLength(0);
 });
 it('9→10 concede quinto truco, 15 preparados, una segunda ranura de nivel 5 y Evocación Potenciada',()=>{
  const nine=to9(),ten=to10(),view=calculateGuidedWizard(ten.input);
  expect(ten.input.level).toBe(10);
  expect(ten.input.cantripIds).toHaveLength(5);
  expect(ten.input.cantripIds.includes('mind_sliver')).toBe(true);
  expect(ten.input.preparedIds).toHaveLength(15);
  expect(ten.state.magic.slots.maximum.slice(0,6)).toEqual([4,3,3,3,2,0]);
  expect(view.abilityModifiers.intelligence).toBe(5);
  expect(wizardProgression(10,'evoker').proficiencyBonus).toBe(4);
  expect(ten.gainedFeatures.some(f=>f.title.toLocaleLowerCase('es').includes('evocación'))).toBe(true);
  expect(collectWizardTraits(ten.input,view).traits.some(f=>f.details.some(d=>d.includes('Bonificador de daño opcional')))).toBe(true);
  expect(ten.hitPointsIncrease).toBe(view.maximumHitPoints-calculateGuidedWizard(nine.input).maximumHitPoints);
 });
 it('9→10 impide truco ausente, repetido o regalo de nivel 11 anticipado',()=>{
  const nine=to9();const choices={newSpellIds:['hold_monster','geas'] as [string,string],preparedIds:[...nine.input.preparedIds,'hold_monster']};
  expect(()=>prepareWizardLevelUp(nine.input,nine.state,choices)).toThrow();
  expect(()=>prepareWizardLevelUp(nine.input,nine.state,{...choices,newCantripId:'fire_bolt'})).toThrow();
  expect(()=>prepareWizardLevelUp(nine.input,nine.state,{...choices,newCantripId:'mind_sliver',evokerLevelSixSpellId:'sunbeam'})).toThrow();
  expect(()=>prepareWizardLevelUp(nine.input,nine.state,{...choices,newCantripId:'mind_sliver',level4Improvement:{mode:'plus_two',first:'wisdom'}})).toThrow();
 });
 it('10→11 concede 16 preparados, ranura de nivel 6 y regalo de Evocación independiente',()=>{
  const eleven=to11();
  expect(eleven.input.level).toBe(11);
  expect(eleven.input.evokerLevelSixSpellId).toBe('sunbeam');
  expect(eleven.input.preparedIds).toHaveLength(16);
  expect(eleven.input.spellbookIds).toHaveLength(26);
  expect(eleven.state.magic.slots.maximum.slice(0,6)).toEqual([4,3,3,3,2,1]);
  expect(eleven.input.cantripIds).toHaveLength(5);
  expect(wizardLevelUpChoicesPreview(eleven.input)).toBe(null);
  expect(calculateGuidedWizard(eleven.input).spells.spellbook.some(s=>s.id==='sunbeam')).toBe(true);
 });
 it('10→11 rechaza regalo omitido, repetido, de otra escuela o conjuros prematuros',()=>{
  const ten=to10();const choice={newSpellIds:['chain_lightning','disintegrate'] as [string,string],preparedIds:[...ten.input.preparedIds,'chain_lightning']};
  expect(()=>prepareWizardLevelUp(ten.input,ten.state,choice)).toThrow();
  expect(()=>prepareWizardLevelUp(ten.input,ten.state,{...choice,evokerLevelSixSpellId:'chain_lightning'})).toThrow();
  expect(()=>prepareWizardLevelUp(ten.input,ten.state,{...choice,evokerLevelSixSpellId:'disintegrate'})).toThrow();
  expect(()=>prepareWizardLevelUp(ten.input,ten.state,{...choice,evokerLevelSixSpellId:'fireball'})).toThrow();
  expect(()=>prepareWizardLevelUp(ten.input,ten.state,{...choice,evokerLevelSixSpellId:'sunbeam',newCantripId:'light'})).toThrow();
  const nine=to9();expect(()=>prepareWizardLevelUp(nine.input,nine.state,{newSpellIds:['chain_lightning','geas'],preparedIds:[...nine.input.preparedIds,'geas'],newCantripId:'mind_sliver'})).toThrow();
 });
 it('retroceso 11→10 conserva quinto truco y elimina solo lo ganado en 11',()=>{
  const eleven=to11();const down=previewWizardLevelDown(eleven.input,eleven.state);
  expect(down.toLevel).toBe(10);
  expect(down.snapshot.input.evokerLevelSixSpellId).toBe(undefined);
  expect(down.snapshot.input.evokerLevelFiveSpellId).toBe('wall_of_force');
  expect(down.snapshot.input.cantripIds).toHaveLength(5);
  expect(down.snapshot.input.preparedIds).toHaveLength(15);
  expect(down.snapshot.wizardState.magic.slots.maximum[5]).toBe(0);
  expect(down.lost.some(f=>f.title.includes('Rayo solar'))).toBe(true);
 });
 it('retroceso 10→9 conserva regalos previos, retira quinto truco y Evocación Potenciada',()=>{
  const ten=to10();const down=previewWizardLevelDown(ten.input,ten.state);
  expect(down.toLevel).toBe(9);
  expect(down.snapshot.input.cantripIds).toHaveLength(4);
  expect(down.snapshot.input.evokerLevelFiveSpellId).toBe('wall_of_force');
  expect(down.snapshot.input.spellbookIds).toHaveLength(22);
  expect(down.snapshot.wizardState.magic.slots.maximum[4]).toBe(1);
  expect(down.changes.some(f=>f.title.includes('Evocación Potenciada'))).toBe(true);
 });
 it('guarda y recupera el nivel 11 y conserva recursos manuales y ranuras gastadas',()=>{
  const ten=to10();const spent=toggleWizardSlotMark(ten.state,0,5);
  const eleven=prepareWizardLevelUp(ten.input,{...spent,hitPointsCurrent:spent.hitPointsCurrent-8,heroicInspiration:true},{newSpellIds:['chain_lightning','disintegrate'],preparedIds:[...ten.input.preparedIds,'chain_lightning'],evokerLevelSixSpellId:'sunbeam'});
  expect(wizardSlotMarks(eleven.state,5)[0]).toBe(true);
  expect(wizardSlotMarks(eleven.state,6)).toEqual([false]);
  expect(wizardArcaneRecoveryOptions(eleven.state,11).every(option=>option.every(lvl=>lvl<=5))).toBe(true);
  const saved=makeWizardCharacterSnapshot(eleven.input,eleven.state);
  expect(validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  const down=previewWizardLevelDown(eleven.input,eleven.state);
  expect(wizardSlotMarks(down.snapshot.wizardState,5)[0]).toBe(true);
  expect(down.snapshot.wizardState.heroicInspiration).toBe(true);
 });
 it('lista de preparados manual sin cupo: incluye los regalos y mantiene los hechizos previos',()=>{
  const eleven=to11(),selection=wizardSpellSelection(eleven.input);
  expect(selection.learnedIds.includes('sunbeam')).toBe(true);
  expect(selection.learnedIds.includes('chain_lightning')).toBe(true);
  const exchanged=wizardMemorizePreparedSpell(eleven.input,'chain_lightning','sunbeam');
  expect(exchanged.preparedIds.includes('sunbeam')).toBe(true);
  expect(exchanged.preparedIds.includes('chain_lightning')).toBe(false);
 });
});
