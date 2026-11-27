import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {wizardSpellSelection,validateWizardSpellSelection,setWizardSpellLearned,setWizardSpellPrepared} from '../src/wizard-spell-library';
import {WIZARD_SPELL_RULES,wizardSpellRule,spellDiceForCharacter} from '../src/wizard-spell-details';
import {parseSpellDice,rollSpellDice} from '../src/spell-dice';
import {prepareWizardLevelUp} from '../src/wizard-level-up';
const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const choices={newSpellIds:['alarm','shield'] as [string,string],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana' as const};
describe('Actualización 51.1: catálogo, reglas y selección manual de Mago',()=>{
 it('conserva la vista de conjuros de los Magos anteriores',()=>{
  const saved=makeWizardCharacterSnapshot(base,initialWizardOneState(base));
  const loaded=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  const selected=wizardSpellSelection(loaded.input);
  expect(selected.learnedIds).toHaveLength(9);expect(selected.preparedIds).toHaveLength(7);
  expect(loaded.input.spellSelection).toBe(undefined);
 });
 it('catalogo contiene todos los trucos y conjuros implementados de nivel 1 y 2',()=>{
  const counts=[0,1,2].map(level=>WIZARD_SPELL_RULES.filter(spell=>spell.level===level).length);
  expect(counts).toEqual([15,30,35]);
  expect(WIZARD_SPELL_RULES.filter(spell=>spell.level<=2)).toHaveLength(80);
  expect(WIZARD_SPELL_RULES.length).toBeGreaterThanOrEqual(217);
  expect(WIZARD_SPELL_RULES.every(spell=>spell.description.length>70)).toBe(true);
  expect(new Set(WIZARD_SPELL_RULES.map(spell=>spell.id)).size).toBe(WIZARD_SPELL_RULES.length);
 });
 it('marcar como aprendido desde Catálogo no altera la progresión reglamentaria',()=>{
  const selection=setWizardSpellLearned(wizardSpellSelection(base),'burning_hands',true);
  expect(selection.learnedIds).toContain('burning_hands');
  const snapshot=makeWizardCharacterSnapshot({...base,spellSelection:selection});
  expect(calculateGuidedWizard(snapshot.input).spells.spellbook).toHaveLength(6);
  expect(wizardSpellSelection(validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(snapshot))).input).learnedIds).toContain('burning_hands');
 });
 it('se pueden aprender conjuros sin limitarse al cupo del libro',()=>{
  const extra=WIZARD_SPELL_RULES.filter(spell=>spell.level>0).slice(0,25).map(spell=>spell.id);
  const selection=validateWizardSpellSelection({learnedIds:extra,preparedIds:extra});
  expect(selection.learnedIds).toHaveLength(25);expect(selection.preparedIds).toHaveLength(25);
  const saved=makeWizardCharacterSnapshot({...base,spellSelection:selection});
  expect(saved.input.spellSelection?.preparedIds).toHaveLength(25);
 });
 it('no preparar sin aprender, pero se permite exceder el número recomendado',()=>{
  let selection=setWizardSpellLearned(wizardSpellSelection(base),'burning_hands',true);
  selection=setWizardSpellPrepared(selection,'burning_hands',true);
  expect(selection.preparedIds).toHaveLength(8);
  expect(()=>setWizardSpellPrepared(selection,'color_spray',true)).toThrow();
 });
 it('desaprender elimina la preparación manual pero no modifica las elecciones históricas',()=>{
  const a=setWizardSpellLearned(wizardSpellSelection(base),'magic_missile',false);
  expect(a.learnedIds.includes('magic_missile')).toBe(false);
  expect(a.preparedIds.includes('magic_missile')).toBe(false);
  const saved=makeWizardCharacterSnapshot({...base,spellSelection:a});
  expect(saved.input.spellbookIds).toContain('magic_missile'); // progresión reglamentaria
  expect(wizardSpellSelection(saved.input).learnedIds.includes('magic_missile')).toBe(false); // biblioteca manual
 });
 it('rechaza conjuros inyectados, duplicados y preparados ausentes',()=>{
  const known=wizardSpellSelection(base);
  expect(()=>validateWizardSpellSelection({learnedIds:['unknown_fake_spell'],preparedIds:[]})).toThrow();
  expect(()=>validateWizardSpellSelection({learnedIds:['shield','shield'],preparedIds:[]})).toThrow();
  expect(()=>validateWizardSpellSelection({learnedIds:['shield'],preparedIds:['web']})).toThrow();
  expect(()=>makeWizardCharacterSnapshot({...base,spellSelection:{learnedIds:['unknown_fake_spell'],preparedIds:[]}})).toThrow();
  expect(()=>validateWizardSpellSelection({...known,evil:'x'})).toThrow();
 });
 it('subir a nivel 2 incorpora nuevas elecciones sin borrar la biblioteca manual',()=>{
  const selection=validateWizardSpellSelection({learnedIds:['light','mage_hand','shield'],preparedIds:['light','shield']});
  const input={...base,spellSelection:selection};
  const progressed=prepareWizardLevelUp(input,initialWizardOneState(input),choices);
  const managed=wizardSpellSelection(progressed.input);
  expect(managed.learnedIds).toContain('alarm');expect(managed.learnedIds).toContain('shield');
  expect(managed.preparedIds).toContain('shield');
  expect(managed.learnedIds).not.toContain('magic_missile');
  expect(makeWizardCharacterSnapshot(progressed.input,progressed.state).schemaVersion).toBe(3);
 });
 it('subir a nivel 3 incorpora las dos evocaciones sin borrar la selección manual',()=>{
  const input={...base,spellSelection:validateWizardSpellSelection({learnedIds:['light'],preparedIds:['light']})};
  const two=prepareWizardLevelUp(input,initialWizardOneState(input),choices);
  const three=prepareWizardLevelUp(two.input,two.state,{newSpellIds:['misty_step','web'],preparedIds:[...two.input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray']});
  expect(wizardSpellSelection(three.input).learnedIds).toContain('darkness');
  expect(wizardSpellSelection(three.input).learnedIds).toContain('scorching_ray');
  expect(wizardSpellSelection(three.input).learnedIds).not.toContain('magic_missile');
 });
 it('dados usan el número real indicado y no aplican efectos',()=>{
  expect(parseSpellDice('3d8+2')).toEqual({count:3,sides:8,modifier:2});
  const result=rollSpellDice('3d8+2',()=>4);
  expect(result.dice).toEqual([4,4,4]);expect(result.total).toBe(14);
  expect(()=>parseSpellDice('1d0')).toThrow();expect(()=>parseSpellDice('200d6')).toThrow();
  expect(()=>rollSpellDice('1d4',()=>5)).toThrow();
 });
 it('trucos escalan con el nivel del personaje y otros conjuros no',()=>{
  expect(spellDiceForCharacter('1d10',true,1)).toBe('1d10');
  expect(spellDiceForCharacter('1d10',true,5)).toBe('2d10');
  expect(spellDiceForCharacter('1d10',true,11)).toBe('3d10');
  expect(spellDiceForCharacter('1d10',true,17)).toBe('4d10');
  expect(spellDiceForCharacter('3d6',false,20)).toBe('3d6');
 });
 it('los metadatos de lanzamiento identifican los 80 conjuros SRD de niveles 0–2',()=>{
  expect(WIZARD_SPELL_RULES.filter(spell=>spell.level<=6).every(spell=>typeof spell.sourcePage==='number'&&spell.sourcePage>=239&&spell.sourcePage<=343)).toBe(true);
  // Las fichas nuevas de nivel 7 remiten a la referencia oficial; la paginación PHB se cotejará por separado.
  expect(WIZARD_SPELL_RULES.filter(spell=>spell.level===7).every(spell=>spell.description.length>70&&spell.castingTime&&spell.range&&spell.components&&spell.duration)).toBe(true);
  expect(wizardSpellRule('ray_of_enfeeblement')?.attack).toBe(false);
  expect(wizardSpellRule('ray_of_enfeeblement')?.rolls[0].formula).toBe('1d8');
 });
 it('las tiradas marcadas como no escalables se mantienen a nivel 17',()=>{
  const damage=wizardSpellRule('magic_missile')?.rolls.find(roll=>roll.formula==='1d4+1');
  expect(damage).toBeDefined();
  expect(spellDiceForCharacter(damage!.formula,false,17)).toBe('1d4+1');
 });
 it('conjuros con ataque o dados exponen los controles necesarios',()=>{
  expect(wizardSpellRule('fire_bolt')?.attack).toBe(true);
  expect(wizardSpellRule('fire_bolt')?.rolls[0].formula).toBe('1d10');
  expect(wizardSpellRule('magic_missile')?.attack).toBe(false);
  expect(wizardSpellRule('magic_missile')?.rolls[0].formula).toBe('1d4+1');
  expect(wizardSpellRule('shield')?.rolls).toHaveLength(0);
 });
});
