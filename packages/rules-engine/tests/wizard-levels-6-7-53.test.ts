import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,
 WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_SPELL_CATALOG,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {wizardSlotMarks,toggleWizardSlotMark,wizardArcaneRecoveryOptions,recoverWizardArcaneSlots,resetWizardSlots} from '../src/wizard-slot-marks';
import {WIZARD_LEVEL_FOUR_SPELLS} from '../src/wizard-fourth-level';
import {WIZARD_SPELL_RULES,wizardSpellRule} from '../src/wizard-spell-details';
import {wizardSpellSelection} from '../src/wizard-spell-library';
import {collectWizardTraits} from '../src/wizard-traits';
import {evokerSculptMaximum,wizardProgression} from '../src/wizard';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const to5=()=>{
 const two=prepareWizardLevelUp(base,initialWizardOneState(base),{newSpellIds:['alarm','shield'],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana'});
 const three=prepareWizardLevelUp(two.input,two.state,{newSpellIds:['misty_step','web'],preparedIds:[...two.input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray']});
 const four=prepareWizardLevelUp(three.input,three.state,{newSpellIds:['mirror_image','shatter'],preparedIds:[...three.input.preparedIds,'shatter'],newCantripId:'fire_bolt',level4Improvement:{mode:'plus_two',first:'intelligence'}});
 return prepareWizardLevelUp(four.input,four.state,{newSpellIds:['fireball','fly'],preparedIds:[...four.input.preparedIds,'fireball','fly'],evokerLevelThreeSpellId:'lightning_bolt'});
};
const to6=()=>{const five=to5();return prepareWizardLevelUp(five.input,five.state,{newSpellIds:['haste','dispel_magic'],preparedIds:[...five.input.preparedIds,'haste']});};
const to7=()=>{const six=to6();return prepareWizardLevelUp(six.input,six.state,{newSpellIds:['dimension_door','polymorph'],preparedIds:[...six.input.preparedIds,'dimension_door'],evokerLevelFourSpellId:'ice_storm'});};

describe('Actualización 53: Mago Evocación de niveles 6 y 7',()=>{
 it('lista las 29 opciones de nivel 4 del Manual 2024, todas con ficha, dados cuando proceda y página',()=>{
  expect(WIZARD_LEVEL_FOUR_SPELLS).toHaveLength(29);
  expect(WIZARD_SPELL_CATALOG.filter(s=>s.level===4)).toHaveLength(29);
  expect(WIZARD_SPELL_RULES).toHaveLength(180);
  expect(new Set(WIZARD_SPELL_RULES.map(s=>s.id)).size).toBe(180);
  for(const spell of WIZARD_LEVEL_FOUR_SPELLS){
   const rule=wizardSpellRule(spell.id)!;
   expect(spell.description.length>70).toBe(true);
   expect(rule.sourcePage).toBe(spell.sourcePage);
   expect(Boolean(rule.castingTime&&rule.castingTime.length>0)).toBe(true);
   expect(Boolean(rule.components&&rule.components.length>0)).toBe(true);
   expect(Boolean(rule.duration&&rule.duration.length>0)).toBe(true);
   expect(rule.description).toBe(spell.description);
  }
  expect(wizardSpellRule('ice_storm')?.rolls.map(r=>r.formula)).toEqual(['2d8','4d6']);
  expect(wizardSpellRule('vitriolic_sphere')?.rolls.map(r=>r.formula)).toEqual(['10d4','5d4']);
  expect(wizardSpellRule('conjure_minor_elementals')?.rolls[0]?.formula).toBe('2d8');
 });
 it('nivel 6: concede Esculpir conjuros, dos conjuros, 10 preparados, tres ranuras de nivel 3',()=>{
  const six=to6();const view=calculateGuidedWizard(six.input);
  expect(six.input.level).toBe(6);
  expect(six.gainedFeatures.map(f=>f.title)).toContain('Esculpir conjuros');
  expect(view.spells.spellbook).toHaveLength(19);
  expect(six.input.preparedIds).toHaveLength(10);
  expect(six.state.magic.slots.maximum.slice(0,4)).toEqual([4,3,3,0]);
  expect(evokerSculptMaximum(6,3)).toBe(4);
  expect(collectWizardTraits(six.input,view).traits.some(t=>t.title==='Esculpir conjuros')).toBe(true);
 });
 it('nivel 7: abre ranura nivel 4, 11 preparados y añade una Evocación gratuita',()=>{
  const seven=to7();const view=calculateGuidedWizard(seven.input);
  expect(seven.input.level).toBe(7);expect(seven.input.evokerLevelFourSpellId).toBe('ice_storm');
  expect(seven.state.magic.slots.maximum.slice(0,4)).toEqual([4,3,3,1]);
  expect(seven.input.preparedIds).toHaveLength(11);
  expect(wizardProgression(7,'evoker').preparedSpellCount).toBe(11);
  expect(view.spells.spellbook).toHaveLength(22);
  expect(wizardLevelUpChoicesPreview(seven.input)?.nextLevel).toBe(8);
 });
 it('rechaza conjuro gratuito de Evocación duplicado, de otra escuela o de nivel incorrecto',()=>{
  const six=to6();const choices={newSpellIds:['dimension_door','polymorph'] as [string,string],preparedIds:[...six.input.preparedIds,'dimension_door'],evokerLevelFourSpellId:'ice_storm'};
  expect(()=>prepareWizardLevelUp(six.input,six.state,{...choices,evokerLevelFourSpellId:'dimension_door'})).toThrow();
  expect(()=>prepareWizardLevelUp(six.input,six.state,{...choices,evokerLevelFourSpellId:'fireball'})).toThrow();
  expect(()=>prepareWizardLevelUp(six.input,six.state,{...choices,evokerLevelFourSpellId:undefined})).toThrow();
  expect(()=>prepareWizardLevelUp(six.input,six.state,{...choices,newSpellIds:['fireball','polymorph']})).toThrow();
 });
 it('nivel 6 rechaza conjuros de nivel 4 y una Evocación gratuita prematura',()=>{
  const five=to5();const choices={newSpellIds:['haste','dispel_magic'] as [string,string],preparedIds:[...five.input.preparedIds,'haste']};
  expect(()=>prepareWizardLevelUp(five.input,five.state,{...choices,newSpellIds:['ice_storm','haste']})).toThrow();
  expect(()=>prepareWizardLevelUp(five.input,five.state,{...choices,evokerLevelFourSpellId:'ice_storm'})).toThrow();
 });
 it('Recuperación arcana de nivel 7 permite recuperar nivel 4 una vez por descanso largo',()=>{
  const seven=to7();const spent=toggleWizardSlotMark(seven.state,0,4);
  expect(wizardSlotMarks(spent,4)).toEqual([true]);
  expect(wizardArcaneRecoveryOptions(spent,7).some(choice=>choice.join(',')==='4')).toBe(true);
  const recovered=recoverWizardArcaneSlots(spent,[4],7);
  expect(wizardSlotMarks(recovered,4)).toEqual([false]);
  expect(wizardArcaneRecoveryOptions(recovered,7)).toEqual([]);
 });
 it('bajada 7→6 retira solo lo adquirido en 7, incluido el conjuro gratuito',()=>{
  const seven=to7(),down=previewWizardLevelDown(seven.input,seven.state);
  expect(down.toLevel).toBe(6);
  expect(down.snapshot.input.evokerLevelFourSpellId).toBe(undefined);
  expect(down.snapshot.input.evokerLevelThreeSpellId).toBe('lightning_bolt');
  expect(down.snapshot.input.preparedIds).toHaveLength(10);
  expect(down.snapshot.wizardState.magic.slots.maximum.slice(0,4)).toEqual([4,3,3,0]);
  expect(down.lost.some(x=>x.title.includes('Tormenta de hielo'))).toBe(true);
 });
 it('bajada 6→5 retira Esculpir conjuros y conserva la Evocación obtenida en nivel 5',()=>{
  const six=to6(),down=previewWizardLevelDown(six.input,six.state);
  expect(down.toLevel).toBe(5);
  expect(down.lost.some(x=>x.title==='Esculpir conjuros')).toBe(true);
  expect(down.snapshot.input.evokerLevelThreeSpellId).toBe('lightning_bolt');
  expect(down.snapshot.input.spellbookIds).toHaveLength(14);
  expect(down.snapshot.wizardState.magic.slots.maximum.slice(0,4)).toEqual([4,3,2,0]);
 });
 it('los rombos gastados, inventario y marcadores de muerte sobreviven a subida y bajada',()=>{
  const five=to5();const lost=toggleWizardSlotMark(five.state,0,3);
  const six=prepareWizardLevelUp(five.input,{...lost,manualDeathMarks:{successes:[true,false,false],failures:[false,true,false]}},
   {newSpellIds:['haste','dispel_magic'],preparedIds:[...five.input.preparedIds,'haste']});
  const seven=prepareWizardLevelUp(six.input,six.state,{newSpellIds:['dimension_door','polymorph'],preparedIds:[...six.input.preparedIds,'dimension_door'],evokerLevelFourSpellId:'ice_storm'});
  expect(wizardSlotMarks(seven.state,3)).toEqual([true,false,false]);
  expect(wizardSlotMarks(seven.state,4)).toEqual([false]);
  const down=previewWizardLevelDown(seven.input,seven.state);
  expect(wizardSlotMarks(down.snapshot.wizardState,3)).toEqual([true,false,false]);
  expect(down.snapshot.wizardState.manualDeathMarks?.successes[0]).toBe(true);
  expect(down.snapshot.wizardState.manualDeathMarks?.failures[1]).toBe(true);
 });
 it('un Mago de nivel 7 se guarda y recupera con un único registro compatible',()=>{
  const seven=to7();const spent=toggleWizardSlotMark(seven.state,0,4);
  const snap=makeWizardCharacterSnapshot(seven.input,spent);
  const restored=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(snap)));
  expect(restored.schemaVersion).toBe(3);
  expect(restored.input.level).toBe(7);
  expect(restored.input.evokerLevelFourSpellId).toBe('ice_storm');
  expect(wizardSlotMarks(restored.wizardState,4)).toEqual([true]);
 });
 it('biblioteca manual no pierde selecciones al subir ni al bajar y no impone límites',()=>{
  const five=to5();const manual={...five.input,spellSelection:wizardSpellSelection(five.input)};
  const six=prepareWizardLevelUp(manual,five.state,{newSpellIds:['haste','dispel_magic'],preparedIds:[...five.input.preparedIds,'haste']});
  const seven=prepareWizardLevelUp(six.input,six.state,{newSpellIds:['dimension_door','polymorph'],preparedIds:[...six.input.preparedIds,'dimension_door'],evokerLevelFourSpellId:'ice_storm'});
  expect(seven.input.spellSelection?.learnedIds).toContain('ice_storm');
  const down=previewWizardLevelDown(seven.input,seven.state);
  expect(down.snapshot.input.spellSelection?.learnedIds).not.toContain('ice_storm');
  expect(down.snapshot.input.spellSelection?.learnedIds).toContain('fireball');
 });
 it('la subida es atómica: entrada y estado original no cambian al preparar el borrador',()=>{
  const five=to5();const before=JSON.stringify(five);
  prepareWizardLevelUp(five.input,five.state,{newSpellIds:['haste','dispel_magic'],preparedIds:[...five.input.preparedIds,'haste']});
  expect(JSON.stringify(five)).toBe(before);
 });
});
