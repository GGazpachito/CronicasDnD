/** Auditoría transversal: invariantes de progresión, persistencia y retroceso 1–20. */
import {describe,it,expect} from 'vitest';
import {EMPTY_CHARACTER_PROFILE,validateCharacterProfile} from '../src/character-profile';
import {calculateGuidedWizard,initialWizardOneState,makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,WIZARD_LEVEL_ONE_DEFAULTS,WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_SPELL_CATALOG,type GuidedWizardInput,type WizardLevelOneState} from '../src/wizard-creation';
import {prepareWizardLevelUp,wizardLevelUpChoicesPreview,type WizardLevelUpChoices} from '../src/wizard-level-up';
import {previewWizardLevelDown} from '../src/level-down';
import {wizardAllSlotMarks,toggleWizardSlotMark} from '../src/wizard-slot-marks';
import {wizardProgression,wizardUseSignatureSpell,wizardShortRest,wizardLongRest} from '../src/wizard';
import {wizardEditableSpellSelection,wizardSpellSelection,setWizardSpellPrepared} from '../src/wizard-spell-library';

const base:GuidedWizardInput={classId:'wizard',level:1,name:'Auditoría',species:'dwarf',background:'sage',profile:EMPTY_CHARACTER_PROFILE,
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],
 spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared]};
const giftKeys:Readonly<Record<number,keyof WizardLevelUpChoices>>={
 5:'evokerLevelThreeSpellId',7:'evokerLevelFourSpellId',9:'evokerLevelFiveSpellId',11:'evokerLevelSixSpellId',
 13:'evokerLevelSevenSpellId',15:'evokerLevelEightSpellId',17:'evokerLevelNineSpellId',
};
function knownSpells(input:GuidedWizardInput):Set<string>{
 return new Set([...input.spellbookIds,...(input.evokerBonusSpellIds??[]),input.evokerLevelThreeSpellId,input.evokerLevelFourSpellId,
  input.evokerLevelFiveSpellId,input.evokerLevelSixSpellId,input.evokerLevelSevenSpellId,input.evokerLevelEightSpellId,input.evokerLevelNineSpellId].filter((id):id is string=>typeof id==='string'));
}
/** Elige secuencialmente opciones legales de cada nivel sin depender de fixtures de otro test. */
function choicesFor(input:GuidedWizardInput):WizardLevelUpChoices{
 const next=input.level+1;
 const progression=wizardProgression(next,next>=3?'evoker':undefined);
 const known=knownSpells(input);
 const available=WIZARD_SPELL_CATALOG.filter(spell=>spell.level<=progression.highestSlotLevel&&!known.has(spell.id));
 // A partir del 3 se da prioridad al nuevo nivel de ranura para cubrir todos los rangos.
 const high=available.filter(s=>s.level===progression.highestSlotLevel);
 let newIds=[...high,...available.filter(s=>s.level!==progression.highestSlotLevel)].slice(0,2).map(s=>s.id);
 if(next===3){newIds=['mirror_image',...newIds.filter(id=>id!=='mirror_image')].slice(0,2);}
 if(newIds.length!==2||new Set(newIds).size!==2)throw new Error(`No hay dos conjuros nuevos en nivel ${next}`);
 const chosen=new Set([...known,...newIds]);
 const pickEvocations=(count:number,highestLevel:number):string[]=>{
  const pool=WIZARD_SPELL_CATALOG.filter(s=>s.school==='evocation'&&s.level<=highestLevel&&!chosen.has(s.id));
  if(pool.length<count)throw new Error(`No hay evocaciones disponibles en nivel ${next}`);
  const picked=pool.slice(0,count).map(s=>s.id);picked.forEach(id=>chosen.add(id));return picked;
 };
 const special:Record<string,unknown>={};
 if(next===2)special.scholarSkill='investigation';
 if(next===3)special.evokerBonusSpellIds=pickEvocations(2,2) as [string,string];
 if(giftKeys[next])special[giftKeys[next]]=pickEvocations(1,progression.highestSlotLevel)[0];
 if(next===4||next===10)special.newCantripId=WIZARD_LEVEL_ONE_CANTRIPS.find(s=>!input.cantripIds.includes(s.id))!.id;
 if(next===4)special.level4Improvement={mode:'plus_two',first:'intelligence'};
 if(next===8)special.level8Improvement={mode:'plus_two',first:'constitution'};
 if(next===12)special.level12Improvement={mode:'plus_two',first:'wisdom'};
 if(next===16)special.level16Improvement={mode:'plus_two',first:'dexterity'};
 if(next===18)special.spellMasteryIds=['detect_magic','mirror_image'];
 if(next===19)special.epicBoon={id:'spell_recall',ability:'intelligence'};
 if(next===20){
  const signatures=WIZARD_SPELL_CATALOG.filter(s=>s.level===3&&chosen.has(s.id)).slice(0,2).map(s=>s.id);
  special.signatureSpellIds=signatures as [string,string];
 }
 const count=progression.preparedSpellCount-input.preparedIds.length;
 const bonusIds=Array.isArray(special.evokerBonusSpellIds)?special.evokerBonusSpellIds as string[]:[];
 const additions=[...newIds,...bonusIds,...(giftKeys[next]?[special[giftKeys[next]] as string]:[])].filter(id=>!input.preparedIds.includes(id)).slice(0,count);
 if(additions.length!==count)throw new Error(`No hay conjuros que preparar en nivel ${next}`);
 return {newSpellIds:newIds as [string,string],preparedIds:[...input.preparedIds,...additions],...special} as WizardLevelUpChoices;
}
type Stage=Readonly<{input:GuidedWizardInput;state:WizardLevelOneState}>;
function twentyStages():Stage[]{
 const initialState=initialWizardOneState(base);
 const start:Stage={input:base,state:{...toggleWizardSlotMark(initialState,0,1),hitPointsCurrent:initialState.hitPointsCurrent-2,
  heroicInspiration:true,manualDeathMarks:{successes:[true,false,false],failures:[false,false,false]}}};
 const stages=[start];
 for(let level=2;level<=20;level++){
  const previous=stages[stages.length-1];
  const advanced=prepareWizardLevelUp(previous.input,previous.state,choicesFor(previous.input));
  let state=advanced.state;
  if(level===13)state=toggleWizardSlotMark(state,0,7);
  if(level===17)state=toggleWizardSlotMark(state,0,9);
  if(level===20)state=toggleWizardSlotMark(state,1,7);
  stages.push({input:advanced.input,state});
 }
 return stages;
}

describe('Actualización 64: auditoría de invariantes de Mago 1–20',()=>{
 it('cada nivel conserva tabla oficial, libro, preparados, competencia, recursos y snapshots v3',()=>{
  const stages=twentyStages();expect(stages).toHaveLength(20);
  for(const {input,state} of stages){
   const {level}=input;
   const progression=wizardProgression(level,level>=3?'evoker':undefined);
   const sheet=calculateGuidedWizard(input);
   const snapshot=validateWizardCharacterSnapshot(makeWizardCharacterSnapshot(input,state));
   expect(snapshot.schemaVersion).toBe(3);
   expect(sheet.level).toBe(level);
   expect(input.spellbookIds).toHaveLength(6+2*(level-1));
   expect(input.preparedIds).toHaveLength(progression.preparedSpellCount);
   expect(input.cantripIds).toHaveLength(progression.cantripsKnown);
   expect(state.magic.slots.maximum).toEqual(progression.spellSlots);
   expect(sheet.spells.alwaysPreparedIds).toHaveLength(level>=20?4:level>=18?2:0);
   expect(progression.proficiencyBonus).toBe(level>=17?6:level>=13?5:level>=9?4:level>=5?3:2);
   expect(wizardAllSlotMarks(state)[0]).toBe(true); // Primera ranura gastada en nivel 1.
   expect(snapshot.wizardState.hitPointsCurrent).toBe(sheet.maximumHitPoints-2);
   expect(snapshot.wizardState.heroicInspiration).toBe(true);
   expect(snapshot.wizardState.manualDeathMarks?.successes).toEqual([true,false,false]);
   expect(wizardLevelUpChoicesPreview(input)?.nextLevel??null).toBe(level===20?null:level+1);
  }
 });

 it('retrocede consecutivamente 20→1 recuperando cada entrada anterior sin borrar elecciones adquiridas antes',()=>{
  const stages=twentyStages();
  let current=stages[19];
  for(let level=20;level>1;level--){
   const preview=previewWizardLevelDown(current.input,current.state);
   const expected=stages[level-2];
   expect(preview.fromLevel).toBe(level);
   expect(preview.toLevel).toBe(level-1);
   const {profile:actualProfile,...actualInput}=preview.snapshot.input;
   const {profile:expectedProfile,...expectedInput}=expected.input;
   expect(actualInput).toEqual(expectedInput);
   expect(actualProfile).toEqual(validateCharacterProfile(expectedProfile??EMPTY_CHARACTER_PROFILE));
   expect(preview.snapshot.wizardState.magic.slots.maximum).toEqual(expected.state.magic.slots.maximum);
   expect(wizardAllSlotMarks(preview.snapshot.wizardState)).toEqual(wizardAllSlotMarks(expected.state));
   expect(preview.snapshot.wizardState.magic.signatureUsed).toEqual([]);
   expect(preview.snapshot.wizardState.hitPointsCurrent).toBe(expected.state.hitPointsCurrent);
   expect(preview.snapshot.wizardState.heroicInspiration).toBe(expected.state.heroicInspiration);
   current={input:preview.snapshot.input,state:preview.snapshot.wizardState};
  }
  const {profile:finalProfile,...finalInput}=current.input;
  const {profile:baseProfile,...baseInput}=base;
  expect(finalInput).toEqual(baseInput);
  expect(finalProfile).toEqual(validateCharacterProfile(baseProfile??EMPTY_CHARACTER_PROFILE));
  expect(()=>previewWizardLevelDown(current.input,current.state)).toThrow();
 });

 it('un descanso corto solo recarga firmas; uno largo recarga ranuras y reinicia Sobrecarga',()=>{
  const twenty=twentyStages()[19];
  const signature=twenty.input.signatureSpellIds!;
  const first=wizardUseSignatureSpell(twenty.state.magic,20,signature[0],signature);
  const second=wizardUseSignatureSpell(first,20,signature[1],signature);
  const short=wizardShortRest(second);
  expect(short.signatureUsed).toEqual([]);
  expect(short.slots).toEqual(second.slots);
  expect(short.arcaneRecoveryUsed).toBe(second.arcaneRecoveryUsed);
  expect(short.overchannelUses).toBe(second.overchannelUses);
  const long=wizardLongRest(second,20,'evoker');
  expect(long.signatureUsed).toEqual([]);
  expect(long.slots.remaining).toEqual(long.slots.maximum);
  expect(long.overchannelUses).toBe(0);
 });

 it('biblioteca flexible no puede ocultar Maestría ni firmas en 18, 19 y 20',()=>{
  for(const stage of twentyStages().filter(s=>s.input.level>=18)){
   const input={...stage.input,spellSelection:{learnedIds:[...stage.input.cantripIds],preparedIds:[...stage.input.cantripIds]}};
   const selection=wizardSpellSelection(input);
   const always=calculateGuidedWizard(stage.input).spells.alwaysPreparedIds;
   expect(always).toHaveLength(stage.input.level>=20?4:2);
   for(const id of always){expect(selection.learnedIds).toContain(id);expect(selection.preparedIds).toContain(id);}
  }
 });

 it('no guarda las preparaciones automáticas como elecciones manuales al editar o subir de nivel',()=>{
  const stages=twentyStages(),eighteen=stages[17],twenty=stages[19];
  const original={learnedIds:[...eighteen.input.cantripIds,...eighteen.input.spellbookIds],preparedIds:[...eighteen.input.cantripIds,...eighteen.input.preparedIds]};
  const manual18={...eighteen.input,spellSelection:original};
  expect(wizardEditableSpellSelection(manual18)).toEqual(original);
  expect(wizardSpellSelection(manual18).preparedIds).toContain('detect_magic');
  expect(original.preparedIds).not.toContain('detect_magic');
  const up=prepareWizardLevelUp(manual18,eighteen.state,choicesFor(manual18));
  expect(up.input.level).toBe(19);
  expect(up.input.spellSelection?.preparedIds).not.toContain('detect_magic');
  expect(wizardSpellSelection(up.input).preparedIds).toContain('detect_magic');

  const raw20={learnedIds:[...twenty.input.cantripIds,...twenty.input.spellbookIds],preparedIds:[...twenty.input.cantripIds,...twenty.input.preparedIds]};
  const manual20={...twenty.input,spellSelection:raw20};
  const projected=wizardSpellSelection(manual20);
  const automatic=calculateGuidedWizard(manual20).spells.alwaysPreparedIds.filter(id=>!raw20.preparedIds.includes(id));
  expect(automatic.length).toBeGreaterThan(0);
  for(const id of automatic)expect(projected.preparedIds).toContain(id);
  const other=raw20.learnedIds.find(id=>!raw20.preparedIds.includes(id)&&!automatic.includes(id))!;
  const edited=setWizardSpellPrepared(wizardEditableSpellSelection(manual20),other,true);
  expect(edited.preparedIds).toContain(other);
  for(const id of automatic)expect(edited.preparedIds).not.toContain(id);
  expect(wizardSpellSelection({...manual20,spellSelection:edited}).preparedIds).toEqual(expect.arrayContaining(automatic));
 });
});
