import {describe,it,expect} from 'vitest';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,type GuidedWizardInput} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview} from '../src/wizard-level-up';
import {wizardSlotMarks,toggleWizardSlotMark,recoverWizardArcaneSlot,recoverWizardArcaneSlots,resetWizardSlots} from '../src/wizard-slot-marks';
import {collectWizardTraits} from '../src/wizard-traits';
import {getCharacterCardDetails} from '../src/character-card';
const base:GuidedWizardInput={classId:'wizard',level:1,name:'Neris',species:'dwarf',background:'sage',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const lev2={newSpellIds:['alarm','shield'] as [string,string],preparedIds:[...base.preparedIds,'shield'],scholarSkill:'arcana' as const};
const lev3=(input:GuidedWizardInput)=>({newSpellIds:['misty_step','web'] as [string,string],preparedIds:[...input.preparedIds,'web'],evokerBonusSpellIds:['darkness','scorching_ray'] as [string,string]});
const to2=()=>prepareWizardLevelUp(base,initialWizardOneState(base),lev2);
const to3=()=>{const two=to2();return prepareWizardLevelUp(two.input,two.state,lev3(two.input));};
describe('Actualización 51: progresión atómica de Mago y rombos invertidos en interfaz',()=>{
 it('desbloquea Erudito y nuevas ranuras en nivel 2',()=>{
  const result=to2(),sheet=calculateGuidedWizard(result.input);
  expect(result.input.level).toBe(2);expect(sheet.spells.spellbook).toHaveLength(8);
  expect(sheet.spells.preparedIds).toHaveLength(5);expect(result.state.magic.slots.maximum[0]).toBe(3);
  expect(result.gainedFeatures.map(f=>f.title)).toContain('Erudito');
 });
 it('Erudito dobla la competencia y necesita una competencia previa',()=>{
  const result=to2();const sheet=calculateGuidedWizard(result.input);
  expect(sheet.skillBonuses.arcana).toBe(sheet.abilityModifiers.intelligence+4);
  expect(()=>prepareWizardLevelUp(base,initialWizardOneState(base),{...lev2,scholarSkill:'medicine'})).toThrow();
 });
 it('rechaza conjuros repetidos, de nivel no disponible y con preparación insuficiente',()=>{
  const state=initialWizardOneState(base);
  expect(()=>prepareWizardLevelUp(base,state,{...lev2,newSpellIds:['shield','shield']})).toThrow();
  expect(()=>prepareWizardLevelUp(base,state,{...lev2,newSpellIds:['web','shield']})).toThrow();
  expect(()=>prepareWizardLevelUp(base,state,{...lev2,preparedIds:base.preparedIds})).toThrow();
 });
 it('conserva los conjuros ya preparados hasta que se realice un descanso largo',()=>{
  const state=initialWizardOneState(base);
  expect(()=>prepareWizardLevelUp(base,state,{...lev2,preparedIds:['shield','alarm','mage_armor','magic_missile','thunderwave']})).toThrow();
 });
 it('obtiene Evocación y conjuros de nivel 2 al subir a nivel 3',()=>{
  const result=to3(),sheet=calculateGuidedWizard(result.input);
  expect(result.input.level).toBe(3);expect(result.input.subclass).toBe('evoker');
  expect(sheet.spells.spellbook).toHaveLength(12);expect(sheet.spells.preparedIds).toHaveLength(6);
  expect(result.state.magic.slots.maximum.slice(0,2)).toEqual([4,2]);
  expect(result.gainedFeatures.map(f=>f.title)).toContain('Truco potente');
 });
 it('Evocación solo concede nuevos conjuros de la escuela apropiada',()=>{
  const two=to2(),choices=lev3(two.input);
  expect(()=>prepareWizardLevelUp(two.input,two.state,{...choices,evokerBonusSpellIds:['invisibility','darkness']})).toThrow();
  expect(()=>prepareWizardLevelUp(two.input,two.state,{...choices,evokerBonusSpellIds:['darkness','darkness']})).toThrow();
 });
 it('conserva PG gastados, temporales, inventario, perfil e inspiración',()=>{
  const start=initialWizardOneState(base),damaged={...start,hitPointsCurrent:5,temporaryHitPoints:3,heroicInspiration:true,
   manualDeathMarks:{successes:[true,false,false] as [boolean,boolean,boolean],failures:[false,true,false] as [boolean,boolean,boolean]}};
  const result=prepareWizardLevelUp({...base,profile:{age:'',height:'',weight:'',eyes:'',hair:'',skin:'',appearance:'',personality:'',ideals:'',bonds:'',flaws:'',backstory:'Biblioteca',notes:'Nota'}},damaged,lev2);
  expect(result.hitPointsIncrease).toBe(7);expect(result.state.hitPointsCurrent).toBe(12);
  expect(result.state.temporaryHitPoints).toBe(3);expect(result.state.heroicInspiration).toBe(true);
  expect(result.state.manualDeathMarks?.successes[0]).toBe(true);expect(result.input.profile?.notes).toBe('Nota');
 });
 it('no restaura por accidente las ranuras gastadas al subir',()=>{
  const spent=toggleWizardSlotMark(initialWizardOneState(base),0);
  const two=prepareWizardLevelUp(base,spent,lev2);
  expect(wizardSlotMarks(two.state)).toEqual([true,false,false]);
  const three=prepareWizardLevelUp(two.input,two.state,lev3(two.input));
  expect(wizardSlotMarks(three.state,1)).toEqual([true,false,false,false]);
  expect(wizardSlotMarks(three.state,2)).toEqual([false,false]);
 });
 it('cada ranura de nivel 2 se puede gastar y recuperar individualmente',()=>{
  const three=to3();const spent=toggleWizardSlotMark(three.state,0,2);
  expect(wizardSlotMarks(spent,2)).toEqual([true,false]);
  expect(spent.magic.slots.remaining.slice(0,2)).toEqual([4,1]);
  expect(wizardSlotMarks(recoverWizardArcaneSlot(spent,2),2)).toEqual([false,false]);
 });
 it('en nivel 3 Recuperación arcana admite dos ranuras de nivel 1 en una única decisión',()=>{
  const three=to3(),s1=toggleWizardSlotMark(three.state,0,1),s2=toggleWizardSlotMark(s1,1,1);
  const recovered=recoverWizardArcaneSlots(s2,[1,1]);
  expect(wizardSlotMarks(recovered,1)).toEqual([false,false,false,false]);
  expect(recovered.magic.arcaneRecoveryUsed).toBe(true);
  expect(()=>recoverWizardArcaneSlots(recovered,[1])).toThrow();
 });
 it('un descanso largo restaura ambas categorías de ranuras',()=>{
  const three=to3();const s1=toggleWizardSlotMark(three.state,0,1);const s2=toggleWizardSlotMark(s1,1,2);
  const recovered=resetWizardSlots(s2);
  expect(wizardSlotMarks(recovered,1)).toEqual([false,false,false,false]);
  expect(wizardSlotMarks(recovered,2)).toEqual([false,false]);
 });
 it('guarda y recupera un Mago Evocador sin cambiar versión de esquema',()=>{
  const three=to3(),spent=toggleWizardSlotMark(three.state,1,2);
  const saved=makeWizardCharacterSnapshot(three.input,spent);
  const restored=validateWizardCharacterSnapshot(JSON.parse(JSON.stringify(saved)));
  expect(restored.schemaVersion).toBe(3);expect(restored.input.level).toBe(3);
  expect(restored.wizardState.magic.slots.remaining[1]).toBe(1);
  expect(restored.wizardState.slotMarks?.length).toBe(6);
 });
 it('la pestaña Rasgos muestra la subclase y Erudito',()=>{
  const three=to3(),traits=collectWizardTraits(three.input,calculateGuidedWizard(three.input));
  expect(traits.traits.some(t=>t.group==='subclass'&&t.title==='Truco potente')).toBe(true);
  expect(traits.traits.some(t=>t.title.includes('Pericia:'))).toBe(true);
 });
 it('la galería muestra Evocación al cargar un Mago de nivel 3',()=>{
  expect(getCharacterCardDetails(makeWizardCharacterSnapshot(to3().input,to3().state)).subclass).toBe('Evocación');
 });
 it('solo permite un paso y la nueva actualización amplía la progresión hasta nivel 5',()=>{
  const three=to3();expect(()=>prepareWizardLevelUp(three.input,three.state,lev3(three.input))).toThrow();
  expect(wizardLevelUpChoicesPreview(three.input)?.nextLevel).toBe(4);
 });
 it('el borrador no modifica las elecciones ni el estado originales',()=>{
  const state=initialWizardOneState(base),before=JSON.stringify({base,state});
  prepareWizardLevelUp(base,state,lev2);
  expect(JSON.stringify({base,state})).toBe(before);
 });
});
