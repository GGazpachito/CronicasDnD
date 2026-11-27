'use client';

import {useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import CharacterTabs,{type SheetTab} from '../../components/CharacterTabs';
import SaveLoadPanel from '../../components/SaveLoadPanel';
import TraitsPanel from '../../components/TraitsPanel';
import EquipmentPanel from '../../components/EquipmentPanel';
import SpellSlotDiamonds from '../../components/SpellSlotDiamonds';
import WizardLevelUpWizard from '../../components/WizardLevelUpWizard';
import WizardMasteryRestDialog from '../../components/WizardMasteryRestDialog';
import WizardSpellDetails from '../../components/WizardSpellDetails';
import LevelDownDialog from '../../components/LevelDownDialog';
import {previewWizardLevelDown} from '../../../../../packages/rules-engine/src/level-down';
import WizardSpellLibrary from '../../components/WizardSpellLibrary';
import AbilityScoreMethodPicker from '../../components/AbilityScoreMethodPicker';
import SharedHealthControls from '../../components/SharedHealthControls';
import SharedInspirationPanel from '../../components/SharedInspirationPanel';
import SharedDeathSavePanel from '../../components/SharedDeathSavePanel';
import SharedCompanionsPanel from '../../components/SharedCompanionsPanel';
import type {AbilityGenerationMethod} from '../../../../../packages/rules-engine/src/ability-generation';
import type {AbilityScores} from '../../../../../packages/rules-engine/src/abilities';
import SharedSpellsLayout from '../../components/SharedSpellsLayout';
import BasicWeaponAttacks from '../../components/BasicWeaponAttacks';
import SheetPlaceholder from '../../components/SheetPlaceholder';
import {collectWizardTraits} from '../../../../../packages/rules-engine/src/wizard-traits';
import {toggleWizardSlotMark,wizardSlotMarks,recoverWizardArcaneSlots,resetWizardSlots,wizardArcaneRecoveryOptions} from '../../../../../packages/rules-engine/src/wizard-slot-marks';
import {wizardMemorizePreparedSpell} from '../../../../../packages/rules-engine/src/wizard-level-up';
import {WIZARD_SPELL_CATALOG} from '../../../../../packages/rules-engine/src/wizard-creation';
import {wizardSpellRule} from '../../../../../packages/rules-engine/src/wizard-spell-details';
import {nextMagicInstanceId,type InventoryAction,equippedArmor,INVENTORY_NAMES} from '../../../../../packages/rules-engine/src/inventory';
import CharacterHeader from '../../components/CharacterHeader';
import CharacterProfilePanel from '../../components/CharacterProfilePanel';
import SharedPrincipalSheet from '../../components/SharedPrincipalSheet';
import {type Ability} from '../../../../../packages/rules-engine/src/abilities';
import {SKILLS,type Skill} from '../../../../../packages/rules-engine/src/proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,type BackgroundId,type SpeciesId} from '../../../../../packages/rules-engine/src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../../../../../packages/rules-engine/src/character-profile';
import {evokerOverchannel,wizardProgression,wizardShortRest,wizardUseSignatureSpell} from '../../../../../packages/rules-engine/src/wizard';
import {rollSpellDice} from '../../../../../packages/rules-engine/src/spell-dice';
import {wizardSpellRecallResult,WIZARD_EPIC_BOONS} from '../../../../../packages/rules-engine/src/wizard-epic-boons';
import {rollD20,type D20Mode} from '../../../../../packages/rules-engine/src/d20';
import {type WizardSpellSelection} from '../../../../../packages/rules-engine/src/wizard-spell-library';
import {
  WIZARD_SKILL_OPTIONS,WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_LEVEL_ONE_SPELLS,WIZARD_LEVEL_ONE_DEFAULTS,
  WIZARD_LEVEL_ONE_EQUIPMENT,calculateGuidedWizard,initialWizardOneState,
  makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,wizardInputForPreview,
  type GuidedWizardInput,type WizardLevelOneState,
} from '../../../../../packages/rules-engine/src/wizard-creation';

const ABILITY_NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_NAMES:Record<Skill,string>={acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'};
const defaultInput:GuidedWizardInput={classId:'wizard',level:1,name:'',background:'sage',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],
 preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared],profile:EMPTY_CHARACTER_PROFILE};
const options=<T extends string>(choices:readonly T[],label:(v:T)=>string)=>choices.map(x=><option key={x} value={x}>{label(x)}</option>);
const signed=(n:number)=>n>=0?`+${n}`:String(n);
export default function WizardPage(){
 const pendingSaveNavigation=useRef(false);
 const [input,setInput]=useState<GuidedWizardInput>(defaultInput);
 const [state,setState]=useState<WizardLevelOneState>(()=>initialWizardOneState(wizardInputForPreview(defaultInput)));
 const [tab,setTab]=useState<SheetTab>('principal');
 const [editing,setEditing]=useState(true);
 const [levelUpOpen,setLevelUpOpen]=useState(false);
 const [levelDownOpen,setLevelDownOpen]=useState(false);
 const [masteryRestOpen,setMasteryRestOpen]=useState(false);
 const [mode,setMode]=useState<D20Mode>('normal');
 const [profileRevision,setProfileRevision]=useState(0);
 const [error,setError]=useState('');
 const [magicAttackResult,setMagicAttackResult]=useState('');
 const [memorizeOld,setMemorizeOld]=useState('');
 const [memorizeNew,setMemorizeNew]=useState('');
 const [overchannelSlot,setOverchannelSlot]=useState(3);
 const [overchannelConfirmed,setOverchannelConfirmed]=useState(false);
 const [overchannelResult,setOverchannelResult]=useState('');
 const [recallSlotLevel,setRecallSlotLevel]=useState(1);
 const [spellRecallResult,setSpellRecallResult]=useState('');
 const [shortRestNotice,setShortRestNotice]=useState('');
 const computed=useMemo(()=>{
  try{return {sheet:calculateGuidedWizard(wizardInputForPreview(input)),error:''};}
  catch(e){return {sheet:null,error:e instanceof Error?e.message:'Elecciones inválidas'};}
 },[input]);
 const actualSnapshot=useMemo(()=>{
  if(!computed.sheet)return null;
  try{return makeWizardCharacterSnapshot(input,state);}catch{return null;}
 },[input,state,computed.sheet]);
 const levelDownAssessment=useMemo(()=>{
  if(!levelDownOpen)return {preview:null,error:''};
  try{return {preview:previewWizardLevelDown(input,state),error:''};}
  catch(e){return {preview:null,error:e instanceof Error?e.message:'No se pudo calcular el nivel inferior'};}
 },[levelDownOpen,input,state]);
 const sheet=computed.sheet;
 const recoveryOptions=wizardArcaneRecoveryOptions(state,input.level);
 const memorizedKnown=new Set([...input.spellbookIds,...(input.evokerBonusSpellIds??[]),...(input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[]),...(input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[]),...(input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[]),...(input.evokerLevelSixSpellId?[input.evokerLevelSixSpellId]:[]),...(input.evokerLevelSevenSpellId?[input.evokerLevelSevenSpellId]:[]),...(input.evokerLevelEightSpellId?[input.evokerLevelEightSpellId]:[]),...(input.evokerLevelNineSpellId?[input.evokerLevelNineSpellId]:[])]);
 const spellLabel=(id:string)=>WIZARD_SPELL_CATALOG.find(spell=>spell.id===id)?.name??id;
 function recoveryLabel(slots:readonly number[]):string{const counts=new Map<number,number>();for(const n of slots)counts.set(n,(counts.get(n)??0)+1);return [...counts].map(([level,n])=>`${n} ${n===1?'ranura':'ranuras'} de nivel ${level}`).join(' + ');}
 const background=BACKGROUNDS[input.background];
 function patch(values:Partial<GuidedWizardInput>){setInput(previous=>({...previous,...values}));}
 function updateAbilityScores(abilityGenerationMethod:AbilityGenerationMethod,assignedAbilities:AbilityScores){
  const next={...input,abilityGenerationMethod,assignedAbilities};
  patch({abilityGenerationMethod,assignedAbilities});
  try{
   const newMaximum=calculateGuidedWizard(wizardInputForPreview(next)).maximumHitPoints;
   setState(previous=>({...previous,hitPointsCurrent:previous.hitPointsCurrent===sheet?.maximumHitPoints?newMaximum:Math.min(previous.hitPointsCurrent,newMaximum)}));
  }catch{/* Una elección intermedia puede ser inválida; el editor muestra el error para corregirla. */}
 }
 function changeBackground(next:BackgroundId){
  const b=BACKGROUNDS[next];const allowed=WIZARD_SKILL_OPTIONS.filter(k=>!(b.skills as readonly string[]).includes(k));
  patch({background:next,backgroundEquipment:{startingPackage:'a',...(next==='soldier'?{gamingSet:'dice_set' as const}:{})},inventoryActions:[],plusTwoAbility:b.abilities[0],plusOneAbility:b.abilities[1],wizardSkills:allowed.slice(0,2),
   ...(input.species==='human'&&input.humanFeat===b.feat?{humanFeat:b.feat==='alert'?'savage_attacker':'alert'}:{})});
 }
 function changeSpecies(species:SpeciesId){
  if(species==='human'&&input.species!=='human')setState(previous=>({...previous,heroicInspiration:true}));
  const {humanSkill:oldSkill,humanFeat:oldFeat,humanSize:oldSize,elfLineage:oldLineage,...rest}=input;
  void oldSkill;void oldFeat;void oldSize;void oldLineage;
  setInput({...rest,species,...(species==='human'?{humanSkill:'perception' as Skill,humanFeat:background.feat==='alert'?'savage_attacker' as const:'alert' as const,humanSize:'medium' as const}:{}),
   ...(species==='elf'?{elfLineage:'high_elf' as const}:{})});
 }
 function toggleSpell(kind:'cantripIds'|'spellbookIds'|'preparedIds',id:string,max:number){
  setInput(previous=>{
   const list=previous[kind];
   if(kind==='preparedIds'&&!previous.spellbookIds.includes(id))return previous;
   if(list.includes(id)){
    if(kind==='spellbookIds')return {...previous,spellbookIds:list.filter(v=>v!==id),preparedIds:previous.preparedIds.filter(v=>v!==id)};
    return {...previous,[kind]:list.filter(v=>v!==id)};
   }
   return list.length>=max?previous:{...previous,[kind]:[...list,id]};
  });
 }
 function adjustHp(delta:number,temporary=false){
  if(!sheet)return;
  setState(previous=>{
   if(temporary)return {...previous,temporaryHitPoints:Math.max(0,Math.min(10000,previous.temporaryHitPoints+delta))};
   if(delta>=0)return {...previous,hitPointsCurrent:Math.min(sheet.maximumHitPoints,previous.hitPointsCurrent+delta)};
   const absorbed=Math.min(previous.temporaryHitPoints,-delta);
   return {...previous,temporaryHitPoints:previous.temporaryHitPoints-absorbed,hitPointsCurrent:Math.max(0,previous.hitPointsCurrent+delta+absorbed)};
  });
 }
 function toggleDeathMark(kind:'successes'|'failures',index:number){
  setState(previous=>{
   const current=previous.manualDeathMarks??{successes:[false,false,false],failures:[false,false,false]};
   const next=[...current[kind]] as [boolean,boolean,boolean];next[index]=!next[index];
   return {...previous,manualDeathMarks:{...current,[kind]:next}};
  });
 }
 function recoverArcane(slotLevels:readonly number[]=[1]){try{setState(previous=>recoverWizardArcaneSlots(previous,slotLevels,input.level));setError('');}catch(e){setError(e instanceof Error?e.message:'Recuperación no disponible');}}
 function finishLongRest(nextInput:GuidedWizardInput){
  setInput(nextInput);
  setState(previous=>({...resetWizardSlots(previous,input.level),hitPointsCurrent:sheet?.maximumHitPoints??previous.hitPointsCurrent,temporaryHitPoints:0,heroicInspiration:input.species==='human'?true:previous.heroicInspiration}));
  setMasteryRestOpen(false);setOverchannelResult('');setOverchannelConfirmed(false);setShortRestNotice('');setSpellRecallResult('');setError('');
 }
 function rest(){if(input.level>=18){setMasteryRestOpen(true);return;}finishLongRest(input);}
 function shortRest(){
  setState(previous=>({...previous,magic:wizardShortRest(previous.magic)}));
  setShortRestNotice(input.level>=20?'Descanso corto registrado. Se han recuperado los dos usos gratuitos de Conjuros de firma.':'Descanso corto registrado. Puedes gestionar Recuperación arcana y, desde nivel 5, Memorizar conjuro.');
  setSpellRecallResult('');setError('');
 }
 function castSignature(spellId:string){
  try{
   const magic=wizardUseSignatureSpell(state.magic,input.level,spellId,input.signatureSpellIds??[]);
   setState(previous=>({...previous,magic:{...previous.magic,signatureUsed:[...new Set([...previous.magic.signatureUsed,...magic.signatureUsed])]}}));
   setError('');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo registrar el conjuro de firma');}
 }
 function activateOverchannel(){
  if(!overchannelConfirmed){setError('Confirma que vas a activar Sobrecarga sobre un conjuro de Mago válido.');return;}
  try{
   const activation=evokerOverchannel(state.magic,input.level,overchannelSlot);
   const dice:number[]=[];
   for(let remaining=activation.necroticDice;remaining>0;remaining-=80){dice.push(...rollSpellDice(`${Math.min(remaining,80)}d12`).dice);}
   const total=dice.reduce((sum,die)=>sum+die,0);
   setState(previous=>({...previous,magic:{...previous.magic,overchannelUses:activation.state.overchannelUses}}));
   setOverchannelResult(dice.length?`Uso ${activation.state.overchannelUses}: ${dice.length}d12 necróticos [${dice.join(', ')}] = ${total}. Este daño ignora resistencia e inmunidad; descuéntalo de tus PG manualmente.`:'Primer uso: puedes maximizar el daño del conjuro este turno sin recibir daño necrótico.');
   setOverchannelConfirmed(false);setError('');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo activar Sobrecarga');}
 }
 function memorize(){try{const next=wizardMemorizePreparedSpell(input,memorizeOld,memorizeNew);setInput(next);setMemorizeOld('');setMemorizeNew('');setError('');}catch(e){setError(e instanceof Error?e.message:'No se ha podido memorizar el conjuro');}}
 function toggleSlot(index:number,slotLevel=1){try{setState(previous=>toggleWizardSlotMark(previous,index,slotLevel));setError('');}catch(e){setError(e instanceof Error?e.message:'Ranura no válida');}}
 function rollRecall(){try{const die=rollSpellDice('1d4').dice[0];const result=wizardSpellRecallResult(recallSlotLevel,die);setSpellRecallResult(`1d4 = ${result.die}. ${result.keepsSlot?`Éxito: conserva la ranura de nivel ${recallSlotLevel}; no la marques como gastada.`:`La ranura de nivel ${recallSlotLevel} se gasta; márcala manualmente.`}`);setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo tirar el d4');}}
 function transact(action:InventoryAction):string|null{
  try{
   const current=input.inventoryActions??[];
   const registered=action.type==='magic_grant'?{...action,instanceId:nextMagicInstanceId(current)} as InventoryAction:action;
   const next={...input,inventoryActions:[...current,registered]};
   calculateGuidedWizard(wizardInputForPreview(next));
   setInput(next);setError('');return null;
  }catch(e){const message=e instanceof Error?e.message:'No se pudo modificar el equipo';setError(message);return message;}
 }
 function undoInventory(){patch({inventoryActions:(input.inventoryActions??[]).slice(0,-1)});setError('');}
 function resetInventory(){patch({inventoryActions:[]});setError('');}
 function restore(snapshot:ReturnType<typeof validateWizardCharacterSnapshot>){
  setInput(snapshot.input);setState(snapshot.wizardState);setProfileRevision(n=>n+1);setEditing(false);setLevelUpOpen(false);setLevelDownOpen(false);setMasteryRestOpen(false);setOverchannelResult('');setOverchannelConfirmed(false);setSpellRecallResult('');setShortRestNotice('');setTab('principal');setError('');
 }
 return <main className="app-shell wizard-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Mago · D&D 2024</span></div></div><Link href="/" className="wizard-class-link" onNavigate={(event:{preventDefault:()=>void})=>{if(pendingSaveNavigation.current&&!window.confirm("Tienes cambios sin guardar. ¿Descartarlos y volver al menú?"))event.preventDefault();}}>Menú de personajes</Link></header>
  <div className="content">
   <p className="sheet-release-note">CLASE · MAGO NIVEL {input.level} · SRD 5.2.1</p>
   <CharacterHeader name={input.name} portraitDataUrl={input.profile?.portraitDataUrl} level={input.level}
     background={background.name} species={SPECIES_NAMES[input.species]} className="Mago" subclass={input.level>=3?'Evocación':undefined} valid={Boolean(actualSnapshot)}
     onEdit={()=>setEditing(true)}
      onLevelUp={input.level<20&&actualSnapshot?()=>{setLevelUpOpen(true);setEditing(false);}:undefined}
     onLevelDown={input.level>1&&actualSnapshot?()=>setLevelDownOpen(true):undefined}/>
   <p className="wizard-progression-hint">{input.level>=20?'Progresión del Mago completada: nivel 20. Conjuros de firma disponibles.':input.level>=19?'Beneficio épico obtenido. Próxima etapa: nivel 20.':input.level>=18?'Maestría de conjuros disponible. Próxima etapa: nivel 19.':`Próxima subida disponible: Mago de nivel ${input.level+1}.`}</p>
  {levelDownOpen&&<LevelDownDialog preview={levelDownAssessment.preview} error={levelDownAssessment.error}
     onClose={()=>setLevelDownOpen(false)} onConfirm={()=>{
      const next=levelDownAssessment.preview;
      if(!next)throw new RangeError('La bajada de nivel no es válida');
      setInput(next.snapshot.input);setState(next.snapshot.wizardState);setLevelDownOpen(false);setMasteryRestOpen(false);setOverchannelResult('');setOverchannelConfirmed(false);setSpellRecallResult('');setShortRestNotice('');
      setEditing(false);setTab('principal');setError('');
     }}/>} 
  {levelUpOpen&&<WizardLevelUpWizard input={input} state={state} mode={mode} onCancel={()=>setLevelUpOpen(false)} onConfirm={next=>{setInput(next.input);setState(next.state);setLevelUpOpen(false);setOverchannelResult('');setOverchannelConfirmed(false);setSpellRecallResult('');setShortRestNotice('');setEditing(false);setTab('principal');setError('');}}/>}
  {masteryRestOpen&&sheet&&<WizardMasteryRestDialog input={input} spellAttackBonus={sheet.spellAttackBonus} mode={mode} onCancel={()=>setMasteryRestOpen(false)} onConfirm={finishLongRest}/>}
  <SaveLoadPanel characterClass="wizard" snapshot={actualSnapshot} validate={validateWizardCharacterSnapshot} onLoad={restore}
     normalize={saved=>makeWizardCharacterSnapshot(saved.input,saved.wizardState)}
     onPendingChange={pending=>{pendingSaveNavigation.current=pending;}}/>
   {editing&&<section className="wizard-editor panel" aria-label="Creación de Mago">
    <div className="panel-heading"><div><span className="eyebrow">DATOS DEL PERSONAJE · NIVEL {input.level}</span><h2>Opciones de Mago</h2><p>Elige origen, características, competencias, trucos y libro de conjuros.</p></div></div>
    <div className="wizard-editor-grid">
     <div>
      <label className="field"><span>Nombre</span><input maxLength={120} value={input.name} onChange={(e:{target:{value:string}})=>patch({name:e.target.value})}/></label>
      <label className="field"><span>Trasfondo</span><select value={input.background} onChange={(e:{target:{value:string}})=>changeBackground(e.target.value as BackgroundId)}>{options(Object.keys(BACKGROUNDS) as BackgroundId[],b=>BACKGROUNDS[b].name)}</select></label>
      <label className="field"><span>Especie</span><select value={input.species} onChange={(e:{target:{value:string}})=>changeSpecies(e.target.value as SpeciesId)}>{options(Object.keys(SPECIES_NAMES) as SpeciesId[],s=>SPECIES_NAMES[s])}</select></label>
      {input.species==='elf'&&<label className="field"><span>Linaje élfico</span><select value={input.elfLineage} onChange={(e:{target:{value:string}})=>patch({elfLineage:e.target.value as NonNullable<GuidedWizardInput['elfLineage']>})}><option value="high_elf">Alto elfo</option><option value="wood_elf">Elfo silvano</option><option value="drow">Drow</option></select></label>}
      {input.species==='human'&&<><label className="field"><span>Competencia humana adicional</span><select value={input.humanSkill} onChange={(e:{target:{value:string}})=>patch({humanSkill:e.target.value as Skill})}>{options(SKILLS,s=>SKILL_NAMES[s])}</select></label><label className="field"><span>Dote humana (opciones SRD implementadas)</span><select value={input.humanFeat} onChange={(e:{target:{value:string}})=>patch({humanFeat:e.target.value as 'alert'|'savage_attacker'})}>{(background.feat!=='alert')&&<option value="alert">Alerta</option>}{(background.feat!=='savage_attacker')&&<option value="savage_attacker">Ataque salvaje</option>}</select></label><label className="field"><span>Tamaño humano</span><select value={input.humanSize??'medium'} onChange={(e:{target:{value:string}})=>patch({humanSize:e.target.value as 'small'|'medium'})}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label></>}
      <label className="field"><span>Paquete inicial de Mago</span><select value={input.equipmentChoice} onChange={(e:{target:{value:string}})=>patch({equipmentChoice:e.target.value as GuidedWizardInput['equipmentChoice'],inventoryActions:[]})}><option value="equipment">Equipo y 5 po</option><option value="gold">55 po</option></select></label>
      <p className="muted-note">{WIZARD_LEVEL_ONE_EQUIPMENT[input.equipmentChoice].description}</p>
      <label className="field"><span>Equipo del trasfondo</span><select value={input.backgroundEquipment?.startingPackage??'a'} onChange={e=>patch({backgroundEquipment:{startingPackage:e.target.value as 'a'|'b',...(input.background==='soldier'?{gamingSet:input.backgroundEquipment?.gamingSet??'dice_set'}:{})},inventoryActions:[]})}><option value="a">A · Objetos y monedas</option><option value="b">B · 50 po</option></select></label>
      {input.background==='soldier'&&<label className="field"><span>Juego de soldado</span><select value={input.backgroundEquipment?.gamingSet??'dice_set'} onChange={e=>patch({backgroundEquipment:{startingPackage:input.backgroundEquipment?.startingPackage??'a',gamingSet:e.target.value as 'dice_set'|'dragonchess_set'|'playing_card_set'|'three_dragon_ante_set'},inventoryActions:[]})}><option value="dice_set">Dados</option><option value="dragonchess_set">Dragonchess</option><option value="playing_card_set">Naipes</option><option value="three_dragon_ante_set">Tres dragones</option></select></label>}
      {(input.inventoryActions?.length??0)>0&&<p className="muted-note">Cambiar el equipo inicial reinicia los movimientos de inventario de esta creación.</p>}
     </div>
     <div>
      <div className="section-label"><h3>Distribución de características</h3><span>Tres métodos</span></div>
      <AbilityScoreMethodPicker method={input.abilityGenerationMethod??'standard_array'} scores={input.assignedAbilities} onChange={updateAbilityScores}/>
      <label className="field"><span>Mejoras por trasfondo</span><select value={input.increaseMode} onChange={(e:{target:{value:string}})=>patch({increaseMode:e.target.value as GuidedWizardInput['increaseMode']})}><option value="two_plus_one">+2 y +1</option><option value="three_ones">+1 a las tres</option></select></label>
      {input.increaseMode==='two_plus_one'&&<div className="wizard-score-grid"><label className="field"><span>+2 a</span><select value={input.plusTwoAbility} onChange={(e:{target:{value:string}})=>patch({plusTwoAbility:e.target.value as Ability})}>{options(background.abilities as readonly Ability[],a=>ABILITY_NAMES[a])}</select></label><label className="field"><span>+1 a</span><select value={input.plusOneAbility} onChange={(e:{target:{value:string}})=>patch({plusOneAbility:e.target.value as Ability})}>{options(background.abilities as readonly Ability[],a=>ABILITY_NAMES[a])}</select></label></div>}
      <div className="section-label"><h3>Habilidades de Mago</h3><span>Elige dos distintas</span></div>
      {[0,1].map(slot=><label className="field" key={slot}><span>Habilidad {slot+1}</span><select value={input.wizardSkills[slot]} onChange={(e:{target:{value:string}})=>patch({wizardSkills:input.wizardSkills.map((v,i)=>i===slot?e.target.value as typeof v:v)})}>{options(WIZARD_SKILL_OPTIONS.filter(s=>!(background.skills as readonly string[]).includes(s)),s=>SKILL_NAMES[s])}</select></label>)}
     </div>
    </div>
    {input.level===1&&<><div className="divider"/>
    <div className="wizard-editor-grid"><div><h3>Trucos de Mago ({input.cantripIds.length}/3)</h3><div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_CANTRIPS.map(s=><label key={s.id} className="wizard-spell-option"><input type="checkbox" checked={input.cantripIds.includes(s.id)} onChange={()=>toggleSpell('cantripIds',s.id,3)}/>{s.name}</label>)}</div></div><div><h3>Libro de conjuros ({input.spellbookIds.length}/6)</h3><div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_SPELLS.map(s=><label key={s.id} className="wizard-spell-option"><input type="checkbox" checked={input.spellbookIds.includes(s.id)} onChange={()=>toggleSpell('spellbookIds',s.id,6)}/>{s.name}{s.ritual&&<small>Ritual</small>}</label>)}</div></div></div>
    <div className="divider"/>
    <h3>Conjuros preparados ({input.preparedIds.length}/4)</h3>
    <div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_SPELLS.filter(s=>input.spellbookIds.includes(s.id)).map(s=><label key={s.id} className="wizard-spell-option"><input type="checkbox" checked={input.preparedIds.includes(s.id)} onChange={()=>toggleSpell('preparedIds',s.id,4)}/>{s.name}</label>)}</div>
    </>}
    {input.level>1&&<p className="muted-note">Los conjuros obtenidos al subir de nivel se muestran en Hechizos; esta sección inicial no los modifica.</p>}
    {computed.error&&<p className="error" role="alert">{computed.error}</p>}
    {sheet&&!actualSnapshot&&<p className="warning">{!input.name.trim()?'Introduce el nombre del personaje para habilitar el guardado.':'Revisa el estado de partida antes de guardar. Si has reducido los PG máximos, utiliza «Ajustar PG» en Principal.'}</p>}
   </section>}
   <CharacterTabs activeTab={tab} onChange={setTab}/>
   <section id="sheet-panel-principal" role="tabpanel" aria-labelledby="sheet-tab-principal" hidden={tab!=='principal'} className="sheet-tab-panel">
    <div className="sheet-section-heading"><div><span className="eyebrow">PÁGINA PRINCIPAL</span><h2>Tu hoja de personaje</h2><p>Valores calculados, tiradas manuales y estado de partida. La misma estructura para todas las clases.</p></div></div>
    {!sheet?<section className="overview-unavailable panel" role="alert"><h3>Revisa las elecciones de creación</h3><p>{computed.error}</p><button type="button" onClick={()=>setEditing(true)}>Editar personaje</button></section>:<SharedPrincipalSheet
      abilityScores={sheet.abilityScores} abilityModifiers={sheet.abilityModifiers} proficiencyBonus={wizardProgression(input.level,input.level>=3?'evoker':undefined).proficiencyBonus}
      skillBonuses={sheet.skillBonuses} savingThrowBonuses={sheet.savingThrowBonuses}
      trainedSkills={new Set<Skill>(sheet.skillProficiencies)} trainedSaves={new Set<Ability>(['intelligence','wisdom'])}
      armorClass={sheet.armorClass} armorDescription={equippedArmor(sheet.inventory)?`Armadura equipada: ${INVENTORY_NAMES[equippedArmor(sheet.inventory)!]} · Sin entrenamiento en armaduras`:'10 + modificador de Destreza · sin armadura'}
      initiative={sheet.initiative} mode={mode} onModeChange={setMode}
      hitDiceDescription={`Dados de golpe: ${input.level}d6 · Mago nivel ${input.level}`}
      hpContent={<SharedHealthControls current={state.hitPointsCurrent} temporary={state.temporaryHitPoints} maximum={sheet.maximumHitPoints} onAdjust={adjustHp} onError={setError}/>}
      attacksContent={<BasicWeaponAttacks inventory={sheet.inventory} scores={sheet.abilityScores} proficiency={wizardProgression(input.level,input.level>=3?'evoker':undefined).proficiencyBonus} mode={mode}/>}
      resourcesContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Recursos</h3><span>Clase</span></div><div className="overview-record"><span>Recuperación arcana</span><strong>{state.magic.arcaneRecoveryUsed?'Gastada':'Disponible'}</strong></div><button className="overview-link" type="button" disabled={state.magic.arcaneRecoveryUsed||state.magic.slots.remaining.every((n,i)=>n===state.magic.slots.maximum[i])} onClick={()=>setTab('hechizos')}>Ver opciones de Recuperación arcana</button><p className="overview-panel-note">Después de un descanso corto, recupera ranuras gastadas hasta el límite de Recuperación arcana. Elige cuántas ranuras recuperar desde Hechizos.</p>{input.level>=14&&<><div className="overview-record"><span>Sobrecarga</span><strong>{state.magic.overchannelUses} usos</strong></div><button type="button" className="overview-link" onClick={()=>setTab('hechizos')}>Gestionar Sobrecarga en Hechizos</button></>}{input.level>=18&&<><div className="overview-record"><span>Maestría</span><strong>2 conjuros siempre preparados</strong></div><button type="button" className="overview-link" onClick={()=>setTab('hechizos')}>Consultar Maestría de conjuros</button></>}{input.level>=19&&input.epicBoon&&<><div className="overview-record"><span>Beneficio épico</span><strong>{WIZARD_EPIC_BOONS[input.epicBoon.id]}</strong></div>{input.epicBoon.id==='spell_recall'&&<button type="button" className="overview-link" onClick={()=>setTab('hechizos')}>Tirar Recuperación de conjuros</button>}{sheet.truesightFeet>0&&<div className="overview-record"><span>Visión verdadera</span><strong>{sheet.truesightFeet} pies</strong></div>}</>}</section>}
      spellSlotsContent={<section className="overview-panel panel" aria-label="Espacios de conjuro"><div className="overview-panel-heading"><h3>Espacios de conjuro</h3><span>Rasgo de lanzador</span></div>{[1,2,3,4,5,6,7,8,9].filter(l=>state.magic.slots.maximum[l-1]>0).map(l=><SpellSlotDiamonds key={l} level={l} spent={wizardSlotMarks(state,l)} onToggle={index=>toggleSlot(index,l)}/>)}<div className="overview-quick-actions"><button type="button" onClick={rest}>Descanso largo</button></div><p className="overview-panel-note">Gastar una ranura no lanza el conjuro automáticamente.</p></section>}
      warningContent={error&&<div className="overview-action-message is-error" role="alert">{error}</div>}
      footerContent={<>
       {input.level>=20&&input.signatureSpellIds&&<section className="overview-panel panel"><h3>Conjuros de firma</h3><strong className="overview-spotlight">{2-state.magic.signatureUsed.length}/2</strong><p className="overview-panel-note">Lanzamientos gratuitos de nivel 3 disponibles hasta el próximo descanso corto o largo.</p><button type="button" className="overview-link" onClick={()=>setTab('hechizos')}>Gestionar Conjuros de firma</button></section>}
       <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{10+sheet.skillBonuses.perception}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section>
       <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{sheet.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {sheet.size==='medium'?'mediano':'pequeño'} · Mago nivel {input.level}</p></section>
       <SharedDeathSavePanel marks={state.manualDeathMarks} onToggle={toggleDeathMark}/>
       <SharedInspirationPanel checked={state.heroicInspiration} onChange={checked=>setState(prev=>({...prev,heroicInspiration:checked}))}/>
      </>}
    />}
   </section>
   <section id="sheet-panel-rasgos" role="tabpanel" aria-labelledby="sheet-tab-rasgos" hidden={tab!=='rasgos'} className="sheet-tab-panel">
    <TraitsPanel collection={sheet?collectWizardTraits(input,sheet):undefined} error={computed.error} onEdit={()=>setEditing(true)}/>
   </section>
   <section id="sheet-panel-equipo" role="tabpanel" aria-labelledby="sheet-tab-equipo" hidden={tab!=='equipo'} className="sheet-tab-panel">
    <EquipmentPanel inventory={sheet?.inventory??null} error={computed.error} outOfSync={false} actionCount={input.inventoryActions?.length??0}
      onInventoryAction={transact} onUndo={undoInventory} onReset={resetInventory} onEdit={()=>{setEditing(true);setTab('principal');}}
      onOpenAttacks={()=>setTab('principal')}/>
    <p className="overview-panel-note">El Mago no tiene competencia con armaduras ni escudos. Equiparlos puede impedir lanzar conjuros hasta obtener la formación adecuada.</p>
   </section>
   <section id="sheet-panel-hechizos" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={tab!=='hechizos'} className="sheet-tab-panel"><SharedSpellsLayout spellClass="Mago" description="La magia y las ranuras específicas de clase se gestionan debajo de la biblioteca.">
    {sheet&&<WizardSpellLibrary input={input} spellAttackBonus={sheet.spellAttackBonus} spellSaveDC={sheet.spellSaveDC} mode={mode} onChange={(selection:WizardSpellSelection)=>patch({spellSelection:selection})}/>}
    <div className="divider"/><h3>Opciones específicas de Mago</h3>
    <div className="wizard-attack-actions"><span>Bonificador de ataque mágico: <strong>{sheet?signed(sheet.spellAttackBonus):'—'}</strong></span><button type="button" disabled={!sheet} onClick={()=>{if(!sheet)return;try{const result=rollD20(sheet.spellAttackBonus,mode);setMagicAttackResult(`${result.dice.join(' / ')} ${signed(sheet.spellAttackBonus)} = ${result.total}`);}catch(e){setMagicAttackResult(e instanceof Error?e.message:'No se pudo tirar el dado');}}}>Tirar ataque mágico · d20</button>{magicAttackResult&&<output aria-live="polite">{magicAttackResult}</output>}</div>
    {input.level>=10&&sheet&&<p className="muted-note"><strong>Evocación Potenciada:</strong> puedes sumar {signed(sheet.abilityModifiers.intelligence)} a una tirada de daño de cada conjuro de Mago de la escuela de Evocación. La elección de qué tirada potenciar es tuya; no se suma a cada dado.</p>}
    {input.level>=14&&sheet&&<fieldset className="level-wizard-fieldset wizard-overchannel-panel"><legend>Sobrecarga · Evocación nivel 14</legend>
     <p className="muted-note">Al lanzar un conjuro de Mago que haga daño usando una ranura de nivel 1 a 5, puedes causar el daño máximo de ese conjuro en el turno del lanzamiento. No afecta a trucos ni a ranuras de nivel 6 o superior. La primera activación por descanso largo no te hiere; después recibes daño necrótico igual a 2d12, 3d12, 4d12… por cada nivel de la ranura utilizada. Este daño ignora resistencias e inmunidades.</p>
     <p><strong>Usos desde el último descanso largo:</strong> {state.magic.overchannelUses}. <strong>Próxima consecuencia:</strong> {state.magic.overchannelUses===0?'Sin daño necrótico':`${state.magic.overchannelUses+1}d12 por nivel de ranura`}.</p>
     <label className="field"><span>Nivel de la ranura del conjuro que vas a potenciar</span><select value={overchannelSlot} onChange={event=>{setOverchannelSlot(Number(event.target.value));setOverchannelConfirmed(false);}}>{[1,2,3,4,5].map(level=><option key={level} value={level}>Nivel {level}</option>)}</select></label>
     <p className="muted-note">Esta activación no lanza el conjuro, no gasta la ranura y no modifica tus PG. Gestiona el lanzamiento y el daño recibido manualmente.</p>
     <label><input type="checkbox" checked={overchannelConfirmed} onChange={event=>setOverchannelConfirmed(event.target.checked)}/> Confirmo que he lanzado un conjuro válido y quiero registrar esta Sobrecarga.</label>
     <button type="button" disabled={!overchannelConfirmed} onClick={activateOverchannel}>Registrar Sobrecarga y tirar daño propio si procede</button>
     {overchannelResult&&<output aria-live="polite">{overchannelResult}</output>}
    </fieldset>}
    {input.level>=18&&sheet&&input.spellMasteryIds&&<fieldset className="level-wizard-fieldset wizard-mastery-panel"><legend>Maestría de conjuros · Nivel 18</legend>
     <p className="muted-note">Ambos conjuros están siempre preparados, además de los {wizardProgression(input.level,'evoker').preparedSpellCount} preparados normales. Puedes lanzarlos a su nivel mínimo sin gastar ranuras. Para un lanzamiento de nivel superior, debes gastar la ranura correspondiente. Los efectos y las tiradas siguen bajo tu control.</p>
     {input.spellMasteryIds.map((id,index)=>{const detail=wizardSpellRule(id);return <div key={`${index}-${id}`} className="level-wizard-choice-info"><strong>Nivel {index+1}: {detail?.name??id} · lanzamiento básico gratuito</strong>{detail&&<WizardSpellDetails spell={detail} characterLevel={input.level} spellAttackBonus={sheet.spellAttackBonus} mode={mode}/>}</div>;})}
     <button type="button" onClick={rest}>Descanso largo · mantener o sustituir un conjuro de Maestría</button>
     <p className="muted-note">El cambio de una Maestría solo se ofrece al confirmar un descanso largo; puedes mantener las dos sin sustituir ninguna.</p>
    </fieldset>}
    {input.level>=20&&sheet&&input.signatureSpellIds&&<fieldset className="level-wizard-fieldset wizard-signature-panel"><legend>Conjuros de firma · Nivel 20</legend>
     <p className="muted-note">Estos dos conjuros de nivel 3 están siempre preparados, además de los 25 preparados normales y de las dos Maestrías. Cada uno puede lanzarse gratuitamente a nivel 3 una vez por descanso corto o largo. Lanzarlos a nivel superior exige gastar una ranura manualmente.</p>
     {input.signatureSpellIds.map(id=>{const detail=wizardSpellRule(id);const used=state.magic.signatureUsed.includes(id);return <div key={id} className="level-wizard-choice-info"><strong>{detail?.name??id} · {used?'Lanzamiento gratuito gastado':'Lanzamiento gratuito disponible'}</strong>
      {detail&&<WizardSpellDetails spell={detail} characterLevel={input.level} spellAttackBonus={sheet.spellAttackBonus} mode={mode}/>}
      <button type="button" disabled={used} onClick={()=>castSignature(id)}>{used?'Uso gratuito gastado':'Registrar lanzamiento gratuito · nivel 3'}</button>
     </div>;})}
     <p className="muted-note">El descanso corto restablece ambos usos mediante el botón general de descansos, pero no recupera PG ni ranuras por sí solo. Recuperación arcana se gestiona más abajo. El descanso largo también los restaura y ofrece mantener o cambiar una Maestría de nivel 18. Registrar un conjuro de firma no consume ranuras, no calcula sus efectos y no efectúa ningún lanzamiento real.</p>
    </fieldset>}
    {input.level>=19&&input.epicBoon?.id==='spell_recall'&&<fieldset className="level-wizard-fieldset wizard-recall-panel"><legend>Beneficio épico · Recuperación de conjuros</legend>
     <p className="muted-note">Al lanzar un conjuro gastando una ranura de nivel 1, 2, 3 o 4, tira 1d4. Si el resultado coincide con el nivel de la ranura, conservas esa ranura. No se aplica a conjuros gratuitos de Maestría ni a ranuras de nivel 5–9.</p>
     <label className="field"><span>Nivel de la ranura utilizada</span><select value={recallSlotLevel} onChange={event=>{setRecallSlotLevel(Number(event.target.value));setSpellRecallResult('');}}>{[1,2,3,4].map(level=><option key={level} value={level}>Nivel {level}</option>)}</select></label>
     <button type="button" onClick={rollRecall}>Tirar 1d4 · comprobar conservación</button>
     {spellRecallResult&&<output aria-live="polite">{spellRecallResult}</output>}
     <p className="muted-note">La tirada no lanza el conjuro ni marca o recupera ranuras. Comprueba el resultado y actualiza los rombos manualmente.</p>
    </fieldset>}
    {[1,2,3,4,5,6,7,8,9].filter(l=>state.magic.slots.maximum[l-1]>0).map(l=><SpellSlotDiamonds key={l} level={l} spent={wizardSlotMarks(state,l)} onToggle={index=>toggleSlot(index,l)}/>)}
    <div className="wizard-rest-panel" aria-label="Descansos del Mago">
     <h3>Descansos</h3>
     <div className="wizard-delta">
      <button type="button" onClick={shortRest}>Confirmar descanso corto</button>
      <button type="button" onClick={rest}>Confirmar descanso largo</button>
     </div>
     {shortRestNotice&&<p role="status" aria-live="polite">{shortRestNotice}</p>}
     <p className="muted-note">El descanso corto no restaura automáticamente PG ni ranuras. Desde nivel 20 recupera los usos gratuitos de los Conjuros de firma. La recuperación de ranuras y la memorización se gestionan a continuación, cuando correspondan.</p>
    </div>
    <div className="wizard-delta" aria-label="Recuperación arcana">
     <p className="muted-note">Recuperación arcana: una vez por descanso largo, tras un descanso corto. Puedes recuperar ranuras cuyo total de niveles no supere {Math.ceil(input.level/2)}, siempre que sean de nivel 5 o inferior.</p>
     {recoveryOptions.map(slots=><button type="button" key={slots.join('-')} onClick={()=>recoverArcane(slots)}>Recuperar {recoveryLabel(slots)}</button>)}
     {recoveryOptions.length===0&&<p className="muted-note">Sin opciones de recuperación (todas las ranuras disponibles o recuperación ya utilizada).</p>}
    </div>
    {input.level>=5&&<fieldset className="level-wizard-fieldset wizard-memorize-panel"><legend>Memorizar conjuro · Nivel 5</legend>
     <p className="muted-note">Al terminar un descanso corto puedes sustituir un conjuro preparado de nivel 1 o superior por otro de tu libro. No se gastan ranuras ni se eligen objetivos.</p>
     <label className="field"><span>Conjuro preparado que retiras</span><select value={memorizeOld} onChange={e=>setMemorizeOld(e.target.value)}><option value="">Selecciona el preparado</option>{input.preparedIds.map(id=><option key={id} value={id}>{spellLabel(id)}</option>)}</select></label>
     <label className="field"><span>Conjuro del libro que preparas</span><select value={memorizeNew} onChange={e=>setMemorizeNew(e.target.value)}><option value="">Selecciona el nuevo conjuro</option>{[...memorizedKnown].filter(id=>!input.preparedIds.includes(id)).map(id=><option key={id} value={id}>{spellLabel(id)}</option>)}</select></label>
     <button type="button" disabled={!memorizeOld||!memorizeNew} onClick={memorize}>Confirmar cambio tras descanso corto</button>
    </fieldset>}
    <p className="muted-note">Rombo marcado = disponible; vacío = gastado. Preparar, aprender o tirar dados no lanza conjuros ni consume ranuras.</p></SharedSpellsLayout></section>
   <section id="sheet-panel-personaje" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={tab!=='personaje'} className="sheet-tab-panel"><CharacterProfilePanel key={profileRevision} profile={input.profile??EMPTY_CHARACTER_PROFILE} name={input.name} species={SPECIES_NAMES[input.species]} background={background.name} characterClass="Mago" level={input.level} onChange={profile=>patch({profile})} onEditIdentity={()=>setEditing(true)}/></section>
   <section id="sheet-panel-companions" role="tabpanel" aria-labelledby="sheet-tab-companions" hidden={tab!=='companions'} className="sheet-tab-panel"><SharedCompanionsPanel companions={input.companions??[]} onChange={companions=>patch({companions})}/></section>
   <section id="sheet-panel-combate" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={tab!=='combate'} className="sheet-tab-panel"><SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon" description="La interfaz de combate llegará más adelante. Mientras tanto, realiza tiradas desde Principal y gestiona las ranuras desde Hechizos; los turnos y objetivos siguen en manos de los jugadores." actionLabel="Volver a Principal" onAction={()=>setTab('principal')}/></section>
   <footer className="footer">Hoja compartida · Mago nivel {input.level} · Guardado manual en PostgreSQL.</footer>
  </div>
 </main>;
}
