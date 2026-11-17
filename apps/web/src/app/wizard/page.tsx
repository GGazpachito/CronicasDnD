'use client';

import {useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import CharacterTabs,{type SheetTab} from '../../components/CharacterTabs';
import SaveLoadPanel from '../../components/SaveLoadPanel';
import TraitsPanel from '../../components/TraitsPanel';
import EquipmentPanel from '../../components/EquipmentPanel';
import SpellSlotDiamonds from '../../components/SpellSlotDiamonds';
import WizardLevelUpWizard from '../../components/WizardLevelUpWizard';
import LevelDownDialog from '../../components/LevelDownDialog';
import {previewWizardLevelDown} from '../../../../../packages/rules-engine/src/level-down';
import WizardSpellLibrary from '../../components/WizardSpellLibrary';
import BasicWeaponAttacks from '../../components/BasicWeaponAttacks';
import SheetPlaceholder from '../../components/SheetPlaceholder';
import {collectWizardTraits} from '../../../../../packages/rules-engine/src/wizard-traits';
import {toggleWizardSlotMark,wizardSlotMarks,recoverWizardArcaneSlots,resetWizardSlots,wizardArcaneRecoveryOptions} from '../../../../../packages/rules-engine/src/wizard-slot-marks';
import {wizardMemorizePreparedSpell} from '../../../../../packages/rules-engine/src/wizard-level-up';
import {WIZARD_SPELL_CATALOG} from '../../../../../packages/rules-engine/src/wizard-creation';
import {nextMagicInstanceId,type InventoryAction,equippedArmor,INVENTORY_NAMES} from '../../../../../packages/rules-engine/src/inventory';
import CharacterHeader from '../../components/CharacterHeader';
import CharacterProfilePanel from '../../components/CharacterProfilePanel';
import SharedPrincipalSheet from '../../components/SharedPrincipalSheet';
import {ABILITIES,type Ability} from '../../../../../packages/rules-engine/src/abilities';
import {SKILLS,type Skill} from '../../../../../packages/rules-engine/src/proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,STANDARD_ARRAY,type BackgroundId,type SpeciesId} from '../../../../../packages/rules-engine/src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../../../../../packages/rules-engine/src/character-profile';
import {wizardProgression} from '../../../../../packages/rules-engine/src/wizard';
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
 const [mode,setMode]=useState<D20Mode>('normal');
 const [hpDraft,setHpDraft]=useState('');
 const [tempDraft,setTempDraft]=useState('');
 const [profileRevision,setProfileRevision]=useState(0);
 const [error,setError]=useState('');
 const [magicAttackResult,setMagicAttackResult]=useState('');
 const [memorizeOld,setMemorizeOld]=useState('');
 const [memorizeNew,setMemorizeNew]=useState('');
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
 const memorizedKnown=new Set([...input.spellbookIds,...(input.evokerBonusSpellIds??[]),...(input.evokerLevelThreeSpellId?[input.evokerLevelThreeSpellId]:[]),...(input.evokerLevelFourSpellId?[input.evokerLevelFourSpellId]:[]),...(input.evokerLevelFiveSpellId?[input.evokerLevelFiveSpellId]:[]),...(input.evokerLevelSixSpellId?[input.evokerLevelSixSpellId]:[])]);
 const spellLabel=(id:string)=>WIZARD_SPELL_CATALOG.find(spell=>spell.id===id)?.name??id;
 function recoveryLabel(slots:readonly number[]):string{const counts=new Map<number,number>();for(const n of slots)counts.set(n,(counts.get(n)??0)+1);return [...counts].map(([level,n])=>`${n} ${n===1?'ranura':'ranuras'} de nivel ${level}`).join(' + ');}
 const background=BACKGROUNDS[input.background];
 function patch(values:Partial<GuidedWizardInput>){setInput(previous=>({...previous,...values}));}
 function changeBackground(next:BackgroundId){
  const b=BACKGROUNDS[next];const allowed=WIZARD_SKILL_OPTIONS.filter(k=>!(b.skills as readonly string[]).includes(k));
  patch({background:next,backgroundEquipment:{startingPackage:'a',...(next==='soldier'?{gamingSet:'dice_set' as const}:{})},inventoryActions:[],plusTwoAbility:b.abilities[0],plusOneAbility:b.abilities[1],wizardSkills:allowed.slice(0,2),
   ...(input.species==='human'&&input.humanFeat===b.feat?{humanFeat:b.feat==='alert'?'tough':'alert'}:{})});
 }
 function changeSpecies(species:SpeciesId){
  if(species==='human'&&input.species!=='human')setState(previous=>({...previous,heroicInspiration:true}));
  const {humanSkill:oldSkill,humanFeat:oldFeat,humanSize:oldSize,elfLineage:oldLineage,...rest}=input;
  void oldSkill;void oldFeat;void oldSize;void oldLineage;
  setInput({...rest,species,...(species==='human'?{humanSkill:'perception' as Skill,humanFeat:background.feat==='alert'?'tough' as const:'alert' as const,humanSize:'medium' as const}:{}),
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
 function commitDelta(value:string,temporary:boolean){
  if(!value.trim())return;
  if(!/^[+-]?\d+$/.test(value.trim())){setError('Introduce un número positivo o negativo, por ejemplo +5 o -7.');return;}
  const delta=Number(value.trim());
  if(!Number.isSafeInteger(delta)||Math.abs(delta)>100000){setError('El ajuste de PG es demasiado grande.');return;}
  adjustHp(delta,temporary);setError('');
  if(temporary)setTempDraft('');else setHpDraft('');
 }
 function toggleDeathMark(kind:'successes'|'failures',index:number){
  setState(previous=>{
   const current=previous.manualDeathMarks??{successes:[false,false,false],failures:[false,false,false]};
   const next=[...current[kind]] as [boolean,boolean,boolean];next[index]=!next[index];
   return {...previous,manualDeathMarks:{...current,[kind]:next}};
  });
 }
 function recoverArcane(slotLevels:readonly number[]=[1]){try{setState(previous=>recoverWizardArcaneSlots(previous,slotLevels,input.level));setError('');}catch(e){setError(e instanceof Error?e.message:'Recuperación no disponible');}}
 function rest(){setState(previous=>({...resetWizardSlots(previous,input.level),hitPointsCurrent:sheet?.maximumHitPoints??previous.hitPointsCurrent,temporaryHitPoints:0,heroicInspiration:input.species==='human'?true:previous.heroicInspiration}));setError('');}
 function memorize(){try{const next=wizardMemorizePreparedSpell(input,memorizeOld,memorizeNew);setInput(next);setMemorizeOld('');setMemorizeNew('');setError('');}catch(e){setError(e instanceof Error?e.message:'No se ha podido memorizar el conjuro');}}
 function toggleSlot(index:number,slotLevel=1){try{setState(previous=>toggleWizardSlotMark(previous,index,slotLevel));setError('');}catch(e){setError(e instanceof Error?e.message:'Ranura no válida');}}
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
  setInput(snapshot.input);setState(snapshot.wizardState);setProfileRevision(n=>n+1);setEditing(false);setLevelUpOpen(false);setLevelDownOpen(false);setTab('principal');setError('');
 }
 return <main className="app-shell wizard-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Mago · D&D 2024</span></div></div><Link href="/" className="wizard-class-link" onNavigate={(event:{preventDefault:()=>void})=>{if(pendingSaveNavigation.current&&!window.confirm("Tienes cambios sin guardar. ¿Descartarlos y volver al menú?"))event.preventDefault();}}>Menú de personajes</Link></header>
  <div className="content">
   <p className="sheet-release-note">CLASE · MAGO NIVEL {input.level} · PHB 2024</p>
   <CharacterHeader name={input.name} portraitDataUrl={input.profile?.portraitDataUrl} level={input.level}
     background={background.name} species={SPECIES_NAMES[input.species]} className="Mago" subclass={input.level>=3?'Evocación':undefined} valid={Boolean(actualSnapshot)}
     onEdit={()=>setEditing(true)}
     onLevelUp={input.level<11&&actualSnapshot?()=>{setLevelUpOpen(true);setEditing(false);}:undefined}
     onLevelDown={input.level>1&&actualSnapshot?()=>setLevelDownOpen(true):undefined}/>
   <p className="wizard-progression-hint">{input.level>=11?'Próxima etapa: progresión al nivel 12.':`Próxima subida disponible: Mago de nivel ${input.level+1}.`}</p>
  {levelDownOpen&&<LevelDownDialog preview={levelDownAssessment.preview} error={levelDownAssessment.error}
     onClose={()=>setLevelDownOpen(false)} onConfirm={()=>{
      const next=levelDownAssessment.preview;
      if(!next)throw new RangeError('La bajada de nivel no es válida');
      setInput(next.snapshot.input);setState(next.snapshot.wizardState);setLevelDownOpen(false);
      setEditing(false);setTab('principal');setError('');
     }}/>} 
  {levelUpOpen&&<WizardLevelUpWizard input={input} state={state} mode={mode} onCancel={()=>setLevelUpOpen(false)} onConfirm={next=>{setInput(next.input);setState(next.state);setLevelUpOpen(false);setEditing(false);setTab('principal');setError('');}}/>}
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
      {input.species==='human'&&<><label className="field"><span>Competencia humana adicional</span><select value={input.humanSkill} onChange={(e:{target:{value:string}})=>patch({humanSkill:e.target.value as Skill})}>{options(SKILLS,s=>SKILL_NAMES[s])}</select></label><label className="field"><span>Dote humana (opciones provisionales)</span><select value={input.humanFeat} onChange={(e:{target:{value:string}})=>patch({humanFeat:e.target.value as 'alert'|'tough'})}>{(background.feat!=='alert')&&<option value="alert">Alerta</option>}{(true)&&<option value="tough">Duro</option>}</select></label><label className="field"><span>Tamaño humano</span><select value={input.humanSize??'medium'} onChange={(e:{target:{value:string}})=>patch({humanSize:e.target.value as 'small'|'medium'})}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label></>}
      <label className="field"><span>Paquete inicial de Mago</span><select value={input.equipmentChoice} onChange={(e:{target:{value:string}})=>patch({equipmentChoice:e.target.value as GuidedWizardInput['equipmentChoice'],inventoryActions:[]})}><option value="equipment">Equipo y 5 po</option><option value="gold">55 po</option></select></label>
      <p className="muted-note">{WIZARD_LEVEL_ONE_EQUIPMENT[input.equipmentChoice].description}</p>
      <label className="field"><span>Equipo del trasfondo</span><select value={input.backgroundEquipment?.startingPackage??'a'} onChange={e=>patch({backgroundEquipment:{startingPackage:e.target.value as 'a'|'b',...(input.background==='soldier'?{gamingSet:input.backgroundEquipment?.gamingSet??'dice_set'}:{})},inventoryActions:[]})}><option value="a">A · Objetos y monedas</option><option value="b">B · 50 po</option></select></label>
      {input.background==='soldier'&&<label className="field"><span>Juego de soldado</span><select value={input.backgroundEquipment?.gamingSet??'dice_set'} onChange={e=>patch({backgroundEquipment:{startingPackage:input.backgroundEquipment?.startingPackage??'a',gamingSet:e.target.value as 'dice_set'|'dragonchess_set'|'playing_card_set'|'three_dragon_ante_set'},inventoryActions:[]})}><option value="dice_set">Dados</option><option value="dragonchess_set">Dragonchess</option><option value="playing_card_set">Naipes</option><option value="three_dragon_ante_set">Tres dragones</option></select></label>}
      {(input.inventoryActions?.length??0)>0&&<p className="muted-note">Cambiar el equipo inicial reinicia los movimientos de inventario de esta creación.</p>}
     </div>
     <div>
      <div className="section-label"><h3>Distribución de características</h3><span>15, 14, 13, 12, 10, 8</span></div>
      <div className="wizard-score-grid">{ABILITIES.map(ability=><label key={ability} className="field"><span>{ABILITY_NAMES[ability]}</span><select value={input.assignedAbilities[ability]} onChange={(e:{target:{value:string}})=>patch({assignedAbilities:{...input.assignedAbilities,[ability]:Number(e.target.value)}})}>{options(STANDARD_ARRAY.map(String),s=>s)}</select></label>)}</div>
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
      hpContent={<div className="overview-health-inline" aria-label="Modificar PG del Mago"><div className="overview-health-pair">
        {([{title:'PG actuales',current:state.hitPointsCurrent,max:sheet.maximumHitPoints,draft:hpDraft,setDraft:setHpDraft,temporary:false},{title:'PG temporales',current:state.temporaryHitPoints,max:10000,draft:tempDraft,setDraft:setTempDraft,temporary:true}] as const).map(item=><div className="overview-hp-stat" key={item.title}>
         <label className="overview-hp-label" htmlFor={item.temporary?'wizard-temp-hp':'wizard-current-hp'}>{item.title}</label>
         <div className="overview-hp-reading"><strong>{item.current}</strong>{!item.temporary&&<small> / {sheet.maximumHitPoints}</small>}</div>
         <div className="overview-hp-input-group"><input id={item.temporary?'wizard-temp-hp':'wizard-current-hp'} value={item.draft} placeholder="+5 / -5" inputMode="numeric" aria-label={`Ajuste de ${item.title}`} onChange={e=>item.setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitDelta(item.draft,item.temporary);}if(e.key==='Escape')item.setDraft('');if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();adjustHp(e.key==='ArrowUp'?1:-1,item.temporary);}}}/>
          <div className="overview-hp-stepper"><button type="button" onClick={()=>adjustHp(1,item.temporary)} aria-label={`Aumentar ${item.title}`}>▲</button><button type="button" onClick={()=>adjustHp(-1,item.temporary)} aria-label={`Reducir ${item.title}`}>▼</button></div>
         </div>
        </div>)}
       </div><p className="overview-health-hint">Escribe +5 o -5 y pulsa Intro. El daño consume primero PG temporales.</p></div>}
      attacksContent={<BasicWeaponAttacks inventory={sheet.inventory} scores={sheet.abilityScores} proficiency={wizardProgression(input.level,input.level>=3?'evoker':undefined).proficiencyBonus} mode={mode}/>}
      resourcesContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Recursos</h3><span>Clase</span></div><div className="overview-record"><span>Recuperación arcana</span><strong>{state.magic.arcaneRecoveryUsed?'Gastada':'Disponible'}</strong></div><button className="overview-link" type="button" disabled={state.magic.arcaneRecoveryUsed||state.magic.slots.remaining.every((n,i)=>n===state.magic.slots.maximum[i])} onClick={()=>setTab('hechizos')}>Ver opciones de Recuperación arcana</button><p className="overview-panel-note">Después de un descanso corto, recupera ranuras gastadas hasta el límite de Recuperación arcana. Elige cuántas ranuras recuperar desde Hechizos.</p></section>}
      spellSlotsContent={<section className="overview-panel panel" aria-label="Espacios de conjuro"><div className="overview-panel-heading"><h3>Espacios de conjuro</h3><span>Rasgo de lanzador</span></div>{[1,2,3,4,5,6].filter(l=>state.magic.slots.maximum[l-1]>0).map(l=><SpellSlotDiamonds key={l} level={l} spent={wizardSlotMarks(state,l)} onToggle={index=>toggleSlot(index,l)}/>)}<div className="overview-quick-actions"><button type="button" onClick={rest}>Descanso largo</button></div><p className="overview-panel-note">Gastar una ranura no lanza el conjuro automáticamente.</p></section>}
      warningContent={error&&<div className="overview-action-message is-error" role="alert">{error}</div>}
      footerContent={<>
       <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{10+sheet.skillBonuses.perception}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section>
       <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{sheet.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {sheet.size==='medium'?'mediano':'pequeño'} · Mago nivel {input.level}</p></section>
       <section className="overview-panel panel overview-death-panel" aria-label="Salvaciones de muerte"><h3>Salvaciones de muerte</h3><div className="overview-death-markers">{(['successes','failures'] as const).map(kind=><div key={kind} className={`overview-death-track ${kind==='successes'?'is-success':'is-failure'}`}><div className="overview-death-track-heading"><span>{kind==='successes'?'Éxitos':'Fallos'}</span><small>{state.manualDeathMarks?.[kind].filter(Boolean).length??0}/3</small></div><div className="overview-death-marks" role="group" aria-label={kind==='successes'?'Éxitos':'Fallos'}>{([0,1,2] as const).map(index=>{const checked=state.manualDeathMarks?.[kind][index]??false;return <button type="button" key={index} className={`overview-death-mark${checked?' is-marked':''}`} aria-pressed={checked} aria-label={`${kind==='successes'?'Éxito':'Fallo'} ${index+1}`} onClick={()=>toggleDeathMark(kind,index)}><span aria-hidden="true">{checked?(kind==='successes'?'✓':'×'):''}</span></button>;})}</div></div>)}</div><p className="overview-panel-note">Marcadores manuales. No desencadenan reglas automáticas.</p></section>
       <section className="overview-panel panel"><h3>Inspiración heroica</h3><label className={`wizard-inspiration unified-inspiration${state.heroicInspiration?' is-active':''}`}><input type="checkbox" checked={state.heroicInspiration} onChange={e=>setState(prev=>({...prev,heroicInspiration:e.target.checked}))}/><span className="wizard-star">★</span><span>{state.heroicInspiration?'Disponible':'Sin inspiración'}</span></label><p className="overview-panel-note">Marca para tener inspiración; desmarca al gastarla.</p></section>
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
   <section id="sheet-panel-hechizos" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={tab!=='hechizos'} className="sheet-tab-panel"><div className="wizard-module panel"><h2>Hechizos del Mago</h2>
    <div className="wizard-attack-actions"><span>Bonificador de ataque mágico: <strong>{sheet?signed(sheet.spellAttackBonus):'—'}</strong></span><button type="button" disabled={!sheet} onClick={()=>{if(!sheet)return;try{const result=rollD20(sheet.spellAttackBonus,mode);setMagicAttackResult(`${result.dice.join(' / ')} ${signed(sheet.spellAttackBonus)} = ${result.total}`);}catch(e){setMagicAttackResult(e instanceof Error?e.message:'No se pudo tirar el dado');}}}>Tirar ataque mágico · d20</button>{magicAttackResult&&<output aria-live="polite">{magicAttackResult}</output>}</div>
    {input.level>=10&&sheet&&<p className="muted-note"><strong>Evocación Potenciada:</strong> puedes sumar {signed(sheet.abilityModifiers.intelligence)} a una tirada de daño de cada conjuro de Mago de la escuela de Evocación. La elección de qué tirada potenciar es tuya; no se suma a cada dado.</p>}
    {[1,2,3,4,5,6].filter(l=>state.magic.slots.maximum[l-1]>0).map(l=><SpellSlotDiamonds key={l} level={l} spent={wizardSlotMarks(state,l)} onToggle={index=>toggleSlot(index,l)}/>)}
    <div className="wizard-delta" aria-label="Recuperación arcana">
     <p className="muted-note">Recuperación arcana: una vez por descanso largo, tras un descanso corto. Puedes recuperar ranuras cuyo total de niveles no supere {Math.ceil(input.level/2)}, siempre que sean de nivel 5 o inferior.</p>
     {recoveryOptions.map(slots=><button type="button" key={slots.join('-')} onClick={()=>recoverArcane(slots)}>Recuperar {recoveryLabel(slots)}</button>)}
     {recoveryOptions.length===0&&<p className="muted-note">Sin opciones de recuperación (todas las ranuras disponibles o recuperación ya utilizada).</p>}
     <button type="button" onClick={rest}>Descanso largo</button>
    </div>
    {input.level>=5&&<fieldset className="level-wizard-fieldset wizard-memorize-panel"><legend>Memorizar conjuro · Nivel 5</legend>
     <p className="muted-note">Al terminar un descanso corto puedes sustituir un conjuro preparado de nivel 1 o superior por otro de tu libro. No se gastan ranuras ni se eligen objetivos.</p>
     <label className="field"><span>Conjuro preparado que retiras</span><select value={memorizeOld} onChange={e=>setMemorizeOld(e.target.value)}><option value="">Selecciona el preparado</option>{input.preparedIds.map(id=><option key={id} value={id}>{spellLabel(id)}</option>)}</select></label>
     <label className="field"><span>Conjuro del libro que preparas</span><select value={memorizeNew} onChange={e=>setMemorizeNew(e.target.value)}><option value="">Selecciona el nuevo conjuro</option>{[...memorizedKnown].filter(id=>!input.preparedIds.includes(id)).map(id=><option key={id} value={id}>{spellLabel(id)}</option>)}</select></label>
     <button type="button" disabled={!memorizeOld||!memorizeNew} onClick={memorize}>Confirmar cambio tras descanso corto</button>
    </fieldset>}
    {sheet&&<WizardSpellLibrary input={input} spellAttackBonus={sheet.spellAttackBonus} spellSaveDC={sheet.spellSaveDC} mode={mode} onChange={(selection:WizardSpellSelection)=>patch({spellSelection:selection})}/>}
    <p className="muted-note">Rombo marcado = disponible; vacío = gastado. Preparar, aprender o tirar dados no lanza conjuros ni consume ranuras.</p></div></section>
   <section id="sheet-panel-personaje" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={tab!=='personaje'} className="sheet-tab-panel"><CharacterProfilePanel key={profileRevision} profile={input.profile??EMPTY_CHARACTER_PROFILE} name={input.name} species={SPECIES_NAMES[input.species]} background={background.name} level={input.level} onChange={profile=>patch({profile})} onEditIdentity={()=>setEditing(true)}/></section>
   <section id="sheet-panel-combate" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={tab!=='combate'} className="sheet-tab-panel"><SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon" description="La interfaz de combate llegará más adelante. Mientras tanto, realiza tiradas desde Principal y gestiona las ranuras desde Hechizos; los turnos y objetivos siguen en manos de los jugadores." actionLabel="Volver a Principal" onAction={()=>setTab('principal')}/></section>
   <footer className="footer">Hoja compartida · Mago nivel {input.level} · Guardado manual en PostgreSQL.</footer>
  </div>
 </main>;
}
