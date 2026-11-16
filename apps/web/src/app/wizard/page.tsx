'use client';

import {useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import CharacterTabs,{type SheetTab} from '../../components/CharacterTabs';
import SaveLoadPanel from '../../components/SaveLoadPanel';
import TraitsPanel from '../../components/TraitsPanel';
import EquipmentPanel from '../../components/EquipmentPanel';
import SpellSlotDiamonds from '../../components/SpellSlotDiamonds';
import BasicWeaponAttacks from '../../components/BasicWeaponAttacks';
import SheetPlaceholder from '../../components/SheetPlaceholder';
import {collectWizardTraits} from '../../../../../packages/rules-engine/src/wizard-traits';
import {toggleWizardSlotMark,wizardSlotMarks,recoverWizardArcaneSlot,resetWizardSlots} from '../../../../../packages/rules-engine/src/wizard-slot-marks';
import {nextMagicInstanceId,type InventoryAction,equippedArmor,INVENTORY_NAMES} from '../../../../../packages/rules-engine/src/inventory';
import CharacterHeader from '../../components/CharacterHeader';
import CharacterProfilePanel from '../../components/CharacterProfilePanel';
import SharedPrincipalSheet from '../../components/SharedPrincipalSheet';
import {ABILITIES,type Ability} from '../../../../../packages/rules-engine/src/abilities';
import {SKILLS,type Skill} from '../../../../../packages/rules-engine/src/proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,STANDARD_ARRAY,type BackgroundId,type SpeciesId} from '../../../../../packages/rules-engine/src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../../../../../packages/rules-engine/src/character-profile';
import {type D20Mode} from '../../../../../packages/rules-engine/src/d20';
import {
  WIZARD_SKILL_OPTIONS,WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_LEVEL_ONE_SPELLS,WIZARD_LEVEL_ONE_DEFAULTS,
  WIZARD_LEVEL_ONE_EQUIPMENT,calculateGuidedWizardOne,initialWizardOneState,
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
 const [mode,setMode]=useState<D20Mode>('normal');
 const [hpDraft,setHpDraft]=useState('');
 const [tempDraft,setTempDraft]=useState('');
 const [profileRevision,setProfileRevision]=useState(0);
 const [error,setError]=useState('');
 const computed=useMemo(()=>{
  try{return {sheet:calculateGuidedWizardOne(wizardInputForPreview(input)),error:''};}
  catch(e){return {sheet:null,error:e instanceof Error?e.message:'Elecciones inválidas'};}
 },[input]);
 const actualSnapshot=useMemo(()=>{
  if(!computed.sheet)return null;
  try{return makeWizardCharacterSnapshot(input,state);}catch{return null;}
 },[input,state,computed.sheet]);
 const sheet=computed.sheet;
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
 function recoverArcane(){try{setState(previous=>recoverWizardArcaneSlot(previous));setError('');}catch(e){setError(e instanceof Error?e.message:'Recuperación no disponible');}}
 function rest(){setState(previous=>({...resetWizardSlots(previous),hitPointsCurrent:sheet?.maximumHitPoints??previous.hitPointsCurrent,temporaryHitPoints:0,heroicInspiration:input.species==='human'?true:previous.heroicInspiration}));setError('');}
 function toggleSlot(index:number){try{setState(previous=>toggleWizardSlotMark(previous,index));setError('');}catch(e){setError(e instanceof Error?e.message:'Ranura no válida');}}
 function transact(action:InventoryAction):string|null{
  try{
   const current=input.inventoryActions??[];
   const registered=action.type==='magic_grant'?{...action,instanceId:nextMagicInstanceId(current)} as InventoryAction:action;
   const next={...input,inventoryActions:[...current,registered]};
   calculateGuidedWizardOne(wizardInputForPreview(next));
   setInput(next);setError('');return null;
  }catch(e){const message=e instanceof Error?e.message:'No se pudo modificar el equipo';setError(message);return message;}
 }
 function undoInventory(){patch({inventoryActions:(input.inventoryActions??[]).slice(0,-1)});setError('');}
 function resetInventory(){patch({inventoryActions:[]});setError('');}
 function restore(snapshot:ReturnType<typeof validateWizardCharacterSnapshot>){
  setInput(snapshot.input);setState(snapshot.wizardState);setProfileRevision(n=>n+1);setEditing(false);setTab('principal');setError('');
 }
 return <main className="app-shell wizard-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Mago · D&D 2024</span></div></div><Link href="/" className="wizard-class-link" onNavigate={event=>{if(pendingSaveNavigation.current&&!window.confirm("Tienes cambios sin guardar. ¿Descartarlos y volver al menú?"))event.preventDefault();}}>Menú de personajes</Link></header>
  <div className="content">
   <p className="sheet-release-note">CLASE · MAGO NIVEL 1 · PHB 2024</p>
   <CharacterHeader name={input.name} portraitDataUrl={input.profile?.portraitDataUrl} level={1}
     background={background.name} species={SPECIES_NAMES[input.species]} className="Mago" valid={Boolean(actualSnapshot)}
     onEdit={()=>setEditing(true)}/>
   <SaveLoadPanel characterClass="wizard" snapshot={actualSnapshot} validate={validateWizardCharacterSnapshot} onLoad={restore}
     normalize={saved=>makeWizardCharacterSnapshot(saved.input,saved.wizardState)}
     onPendingChange={pending=>{pendingSaveNavigation.current=pending;}}/>
   {editing&&<section className="wizard-editor panel" aria-label="Creación de Mago">
    <div className="panel-heading"><div><span className="eyebrow">CREACIÓN · NIVEL 1</span><h2>Opciones de Mago</h2><p>Elige origen, características, competencias, trucos y libro de conjuros.</p></div></div>
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
    <div className="divider"/>
    <div className="wizard-editor-grid"><div><h3>Trucos de Mago ({input.cantripIds.length}/3)</h3><div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_CANTRIPS.map(s=><label key={s.id} className="wizard-spell-option"><input type="checkbox" checked={input.cantripIds.includes(s.id)} onChange={()=>toggleSpell('cantripIds',s.id,3)}/>{s.name}</label>)}</div></div><div><h3>Libro de conjuros ({input.spellbookIds.length}/6)</h3><div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_SPELLS.map(s=><label key={s.id} className="wizard-spell-option"><input type="checkbox" checked={input.spellbookIds.includes(s.id)} onChange={()=>toggleSpell('spellbookIds',s.id,6)}/>{s.name}{s.ritual&&<small>Ritual</small>}</label>)}</div></div></div>
    <div className="divider"/>
    <h3>Conjuros preparados ({input.preparedIds.length}/4)</h3>
    <div className="wizard-spell-picker">{WIZARD_LEVEL_ONE_SPELLS.filter(s=>input.spellbookIds.includes(s.id)).map(s=><label key={s.id} className="wizard-spell-option"><input type="checkbox" checked={input.preparedIds.includes(s.id)} onChange={()=>toggleSpell('preparedIds',s.id,4)}/>{s.name}</label>)}</div>
    {computed.error&&<p className="error" role="alert">{computed.error}</p>}
    {sheet&&!actualSnapshot&&<p className="warning">{!input.name.trim()?'Introduce el nombre del personaje para habilitar el guardado.':'Revisa el estado de partida antes de guardar. Si has reducido los PG máximos, utiliza «Ajustar PG» en Principal.'}</p>}
   </section>}
   <CharacterTabs activeTab={tab} onChange={setTab}/>
   <section id="sheet-panel-principal" role="tabpanel" aria-labelledby="sheet-tab-principal" hidden={tab!=='principal'} className="sheet-tab-panel">
    <div className="sheet-section-heading"><div><span className="eyebrow">PÁGINA PRINCIPAL</span><h2>Tu hoja de personaje</h2><p>Valores calculados, tiradas manuales y estado de partida. La misma estructura para todas las clases.</p></div></div>
    {!sheet?<section className="overview-unavailable panel" role="alert"><h3>Revisa las elecciones de creación</h3><p>{computed.error}</p><button type="button" onClick={()=>setEditing(true)}>Editar personaje</button></section>:<SharedPrincipalSheet
      abilityScores={sheet.abilityScores} abilityModifiers={sheet.abilityModifiers} proficiencyBonus={2}
      skillBonuses={sheet.skillBonuses} savingThrowBonuses={sheet.savingThrowBonuses}
      trainedSkills={new Set<Skill>(sheet.skillProficiencies)} trainedSaves={new Set<Ability>(['intelligence','wisdom'])}
      armorClass={sheet.armorClass} armorDescription={equippedArmor(sheet.inventory)?`Armadura equipada: ${INVENTORY_NAMES[equippedArmor(sheet.inventory)!]} · Sin entrenamiento en armaduras`:'10 + modificador de Destreza · sin armadura'}
      initiative={sheet.initiative} mode={mode} onModeChange={setMode}
      hitDiceDescription="Dados de golpe: 1d6 · Mago nivel 1"
      hpContent={<div className="overview-health-inline" aria-label="Modificar PG del Mago"><div className="overview-health-pair">
        {([{title:'PG actuales',current:state.hitPointsCurrent,max:sheet.maximumHitPoints,draft:hpDraft,setDraft:setHpDraft,temporary:false},{title:'PG temporales',current:state.temporaryHitPoints,max:10000,draft:tempDraft,setDraft:setTempDraft,temporary:true}] as const).map(item=><div className="overview-hp-stat" key={item.title}>
         <label className="overview-hp-label" htmlFor={item.temporary?'wizard-temp-hp':'wizard-current-hp'}>{item.title}</label>
         <div className="overview-hp-reading"><strong>{item.current}</strong>{!item.temporary&&<small> / {sheet.maximumHitPoints}</small>}</div>
         <div className="overview-hp-input-group"><input id={item.temporary?'wizard-temp-hp':'wizard-current-hp'} value={item.draft} placeholder="+5 / -5" inputMode="numeric" aria-label={`Ajuste de ${item.title}`} onChange={e=>item.setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commitDelta(item.draft,item.temporary);}if(e.key==='Escape')item.setDraft('');if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();adjustHp(e.key==='ArrowUp'?1:-1,item.temporary);}}}/>
          <div className="overview-hp-stepper"><button type="button" onClick={()=>adjustHp(1,item.temporary)} aria-label={`Aumentar ${item.title}`}>▲</button><button type="button" onClick={()=>adjustHp(-1,item.temporary)} aria-label={`Reducir ${item.title}`}>▼</button></div>
         </div>
        </div>)}
       </div><p className="overview-health-hint">Escribe +5 o -5 y pulsa Intro. El daño consume primero PG temporales.</p></div>}
      attacksContent={<BasicWeaponAttacks inventory={sheet.inventory} scores={sheet.abilityScores} proficiency={2} mode={mode}/>}
      resourcesContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Recursos</h3><span>Clase</span></div><div className="overview-record"><span>Recuperación arcana</span><strong>{state.magic.arcaneRecoveryUsed?'Gastada':'Disponible'}</strong></div><button className="overview-link" type="button" disabled={state.magic.arcaneRecoveryUsed||state.magic.slots.remaining[0]>=2} onClick={recoverArcane}>Usar Recuperación arcana</button><p className="overview-panel-note">Después de un descanso corto, recupera una ranura de nivel 1 gastada.</p></section>}
      spellSlotsContent={<section className="overview-panel panel" aria-label="Espacios de conjuro"><div className="overview-panel-heading"><h3>Espacios de conjuro</h3><span>Rasgo de lanzador</span></div><SpellSlotDiamonds level={1} spent={wizardSlotMarks(state)} onToggle={toggleSlot}/><div className="overview-quick-actions"><button type="button" onClick={rest}>Descanso largo</button></div><p className="overview-panel-note">Gastar una ranura no lanza el conjuro automáticamente.</p></section>}
      warningContent={error&&<div className="overview-action-message is-error" role="alert">{error}</div>}
      footerContent={<>
       <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{10+sheet.skillBonuses.perception}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section>
       <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{sheet.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {sheet.size==='medium'?'mediano':'pequeño'} · Mago nivel 1</p></section>
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
   <section id="sheet-panel-hechizos" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={tab!=='hechizos'} className="sheet-tab-panel"><div className="wizard-module panel"><h2>Hechizos del Mago</h2><div className="stat-cards"><div className="stat-card"><span>CD DE SALVACIÓN</span><strong>{sheet?.spellSaveDC??'—'}</strong><small>8 + competencia + Inteligencia</small></div><div className="stat-card"><span>ATAQUE MÁGICO</span><strong>{sheet?signed(sheet.spellAttackBonus):'—'}</strong><small>Competencia + Inteligencia</small></div><div className="stat-card"><span>RANURAS DE NIVEL 1</span><strong>{state.magic.slots.remaining[0]}/2</strong><small>Recuperadas al descansar</small></div></div><SpellSlotDiamonds level={1} spent={wizardSlotMarks(state)} onToggle={toggleSlot}/><div className="wizard-delta"><button type="button" disabled={state.magic.arcaneRecoveryUsed||state.magic.slots.remaining[0]===2} onClick={recoverArcane}>Recuperación arcana</button><button type="button" onClick={rest}>Descanso largo</button></div><div className="wizard-pair"><div><h3>Trucos ({input.cantripIds.length})</h3>{input.cantripIds.map(id=><div className="data-row" key={id}>{WIZARD_LEVEL_ONE_CANTRIPS.find(s=>s.id===id)?.name??id}</div>)}</div><div><h3>Libro de conjuros ({input.spellbookIds.length})</h3>{input.spellbookIds.map(id=><div className="data-row" key={id}><span>{WIZARD_LEVEL_ONE_SPELLS.find(s=>s.id===id)?.name??id}</span><small>{input.preparedIds.includes(id)?'Preparado':'En el libro'}</small></div>)}</div></div><p className="muted-note">Lanzar un conjuro y gastar su ranura son acciones manuales separadas. La verificación de componentes, concentración y efectos se incorporará en próximas actualizaciones.</p></div></section>
   <section id="sheet-panel-personaje" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={tab!=='personaje'} className="sheet-tab-panel"><CharacterProfilePanel key={profileRevision} profile={input.profile??EMPTY_CHARACTER_PROFILE} name={input.name} species={SPECIES_NAMES[input.species]} background={background.name} level={1} onChange={profile=>patch({profile})} onEditIdentity={()=>setEditing(true)}/></section>
   <section id="sheet-panel-combate" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={tab!=='combate'} className="sheet-tab-panel"><SheetPlaceholder eyebrow="COMBATE · DESARROLLO FUTURO" title="Coming Soon" description="La interfaz de combate llegará más adelante. Mientras tanto, realiza tiradas desde Principal y gestiona las ranuras desde Hechizos; los turnos y objetivos siguen en manos de los jugadores." actionLabel="Volver a Principal" onAction={()=>setTab('principal')}/></section>
   <footer className="footer">Hoja compartida · Mago nivel 1 · Guardado manual en PostgreSQL.</footer>
  </div>
 </main>;
}
