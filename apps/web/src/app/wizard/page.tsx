'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import CharacterTabs,{type SheetTab} from '../../components/CharacterTabs';
import CharacterHeader from '../../components/CharacterHeader';
import CharacterProfilePanel from '../../components/CharacterProfilePanel';
import SharedPrincipalSheet from '../../components/SharedPrincipalSheet';
import {ABILITIES,type Ability} from '../../../../../packages/rules-engine/src/abilities';
import {SKILLS,type Skill} from '../../../../../packages/rules-engine/src/proficiencies';
import {BACKGROUNDS,SPECIES_NAMES,STANDARD_ARRAY,type BackgroundId,type SpeciesId} from '../../../../../packages/rules-engine/src/guided';
import {EMPTY_CHARACTER_PROFILE} from '../../../../../packages/rules-engine/src/character-profile';
import {type D20Mode} from '../../../../../packages/rules-engine/src/d20';
import {wizardUseSlot,wizardArcaneRecovery,wizardLongRest} from '../../../../../packages/rules-engine/src/wizard';
import {
  WIZARD_SKILL_OPTIONS,WIZARD_LEVEL_ONE_CANTRIPS,WIZARD_LEVEL_ONE_SPELLS,WIZARD_LEVEL_ONE_DEFAULTS,
  WIZARD_LEVEL_ONE_EQUIPMENT,calculateGuidedWizardOne,initialWizardOneState,
  makeWizardCharacterSnapshot,validateWizardCharacterSnapshot,
  type GuidedWizardInput,type WizardLevelOneState,
} from '../../../../../packages/rules-engine/src/wizard-creation';

const ABILITY_NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const SKILL_NAMES:Record<Skill,string>={acrobatics:'Acrobacias',animal_handling:'Trato con animales',arcana:'Arcanos',athletics:'Atletismo',deception:'Engaño',history:'Historia',insight:'Perspicacia',intimidation:'Intimidación',investigation:'Investigación',medicine:'Medicina',nature:'Naturaleza',perception:'Percepción',performance:'Interpretación',persuasion:'Persuasión',religion:'Religión',sleight_of_hand:'Juego de manos',stealth:'Sigilo',survival:'Supervivencia'};
const defaultInput:GuidedWizardInput={classId:'wizard',level:1,name:'Elira',background:'sage',species:'dwarf',
 assignedAbilities:{strength:8,dexterity:13,constitution:14,intelligence:15,wisdom:12,charisma:10},
 increaseMode:'two_plus_one',plusTwoAbility:'intelligence',plusOneAbility:'constitution',
 wizardSkills:['insight','investigation'],equipmentChoice:'equipment',
 cantripIds:[...WIZARD_LEVEL_ONE_DEFAULTS.cantrips],spellbookIds:[...WIZARD_LEVEL_ONE_DEFAULTS.spellbook],
 preparedIds:[...WIZARD_LEVEL_ONE_DEFAULTS.prepared],profile:EMPTY_CHARACTER_PROFILE};
const options=<T extends string>(choices:readonly T[],label:(v:T)=>string)=>choices.map(x=><option key={x} value={x}>{label(x)}</option>);
const signed=(n:number)=>n>=0?`+${n}`:String(n);
type SavedEntry={id:string;name:string;level:number;characterClass?:string;revision:number;updatedAt:string};
async function responseData<T>(response:Response):Promise<T>{
 const data=await response.json().catch(()=>({})) as {error?:string};
 if(!response.ok)throw new Error(data.error??`HTTP ${response.status}`);
 return data as T;
}
export default function WizardPage(){
 const router=useRouter();
 const [input,setInput]=useState<GuidedWizardInput>(defaultInput);
 const [state,setState]=useState<WizardLevelOneState>(()=>initialWizardOneState(defaultInput));
 const [tab,setTab]=useState<SheetTab>('principal');
 const [editing,setEditing]=useState(true);
 const [mode,setMode]=useState<D20Mode>('normal');
 const [hpDraft,setHpDraft]=useState('');
 const [tempDraft,setTempDraft]=useState('');
 const [profileRevision,setProfileRevision]=useState(0);
 const [characters,setCharacters]=useState<SavedEntry[]>([]);
 const [selected,setSelected]=useState('');
 const [active,setActive]=useState<{id:string;revision:number}|null>(null);
 const [savedFingerprint,setSavedFingerprint]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const computed=useMemo(()=>{
  try{return {sheet:calculateGuidedWizardOne(input),error:''};}
  catch(e){return {sheet:null,error:e instanceof Error?e.message:'Elecciones inválidas'};}
 },[input]);
 const actualSnapshot=useMemo(()=>{
  if(!computed.sheet)return null;
  try{return makeWizardCharacterSnapshot(input,state);}catch{return null;}
 },[input,state,computed.sheet]);
 const fingerprint=actualSnapshot?JSON.stringify(actualSnapshot):null;
 const pending=active!==null&&(fingerprint===null||fingerprint!==savedFingerprint);
 const sheet=computed.sheet;
 const background=BACKGROUNDS[input.background];
 function patch(values:Partial<GuidedWizardInput>){setInput(previous=>({...previous,...values}));}
 function changeBackground(next:BackgroundId){
  const b=BACKGROUNDS[next];const allowed=WIZARD_SKILL_OPTIONS.filter(k=>!(b.skills as readonly string[]).includes(k));
  patch({background:next,plusTwoAbility:b.abilities[0],plusOneAbility:b.abilities[1],wizardSkills:allowed.slice(0,2),
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
 function spellSlot(){try{setState({...state,magic:wizardUseSlot(state.magic,1)});setError('');}catch(e){setError(e instanceof Error?e.message:'No quedan ranuras');}}
 function recoverArcane(){try{setState({...state,magic:wizardArcaneRecovery(state.magic,1,[1])});setError('');}catch(e){setError(e instanceof Error?e.message:'Recuperación no disponible');}}
 function rest(){setState(s=>({...s,magic:wizardLongRest(s.magic,1),hitPointsCurrent:sheet?.maximumHitPoints??s.hitPointsCurrent,temporaryHitPoints:0,heroicInspiration:input.species==='human'?true:s.heroicInspiration}));setError('');}
 async function reload(){
  const payload=await responseData<{characters:SavedEntry[]}>(await fetch('/api/characters',{cache:'no-store'}));
  setCharacters(payload.characters.filter(c=>c.characterClass==='wizard'));
 }
 async function loadCharacter(id:string){
  const value=await responseData<{character:SavedEntry&{snapshot:unknown}}>(await fetch(`/api/characters/${encodeURIComponent(id)}`,{cache:'no-store'}));
  const clean=validateWizardCharacterSnapshot(value.character.snapshot);
  if(clean.input.level!==value.character.level||value.character.characterClass!=='wizard')throw new RangeError('El registro no es un Mago válido de nivel 1');
  setInput(clean.input);setProfileRevision(n=>n+1);setState(clean.wizardState);setActive({id:value.character.id,revision:value.character.revision});
  setSavedFingerprint(JSON.stringify(clean));setSelected(id);setMessage(`Mago «${clean.input.name}» recuperado.`);setEditing(false);
 }
 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   try{
    const r=await responseData<{characters:SavedEntry[]}>(await fetch('/api/characters',{cache:'no-store'}));
    if(cancelled)return;
    setCharacters(r.characters.filter(c=>c.characterClass==='wizard'));
    const params=new URLSearchParams(window.location.search);
    const id=params.get('character');
    if(!id&&params.get('new')==='1'&&!cancelled){setInput(previous=>({...previous,name:''}));setEditing(true);}
    if(id){
     const d=await responseData<{character:SavedEntry&{snapshot:unknown}}>(await fetch(`/api/characters/${encodeURIComponent(id)}`,{cache:'no-store'}));
     const snap=validateWizardCharacterSnapshot(d.character.snapshot);
     if(d.character.characterClass!=='wizard'||d.character.level!==1)throw new RangeError('El personaje solicitado no es un Mago de nivel 1');
     if(!cancelled){setInput(snap.input);setProfileRevision(n=>n+1);setState(snap.wizardState);setSelected(id);setActive({id,revision:d.character.revision});setSavedFingerprint(JSON.stringify(snap));setEditing(false);setMessage(`Mago «${snap.input.name}» cargado.`);}
    }
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'No se pudieron recuperar los Magos');}
   finally{if(!cancelled)setLoading(false);}
  })();return ()=>{cancelled=true;};
 },[]);
 useEffect(()=>{
  if(!pending)return;
  const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
  window.addEventListener('beforeunload',guard);return ()=>window.removeEventListener('beforeunload',guard);
 },[pending]);
 async function action(op:()=>Promise<void>){
  setBusy(true);setError('');setMessage('');
  try{await op();}catch(e){setError(e instanceof Error?e.message:'Error de operación');}finally{setBusy(false);}
 }
 async function save(asNew:boolean){
  if(!actualSnapshot)return;
  await action(async()=>{
   const target=asNew?'/api/characters':`/api/characters/${encodeURIComponent(active!.id)}`;
   const response=await fetch(target,{method:asNew?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(asNew?{snapshot:actualSnapshot}:{revision:active!.revision,snapshot:actualSnapshot})});
   const result=await responseData<{character:SavedEntry}>(response);
   setActive({id:result.character.id,revision:result.character.revision});setSelected(result.character.id);
   setSavedFingerprint(JSON.stringify(actualSnapshot));setMessage('Personaje guardado correctamente en PostgreSQL.');
   try{await reload();}catch{setMessage('Guardado confirmado; no se pudo actualizar la lista.');}
  });
 }
 function openFighterCreator(){
  if(pending&&!window.confirm('Tienes cambios de este Mago sin guardar. ¿Volver al creador de Guerrero y descartarlos?'))return;
  router.push('/fighter?new=1');
 }
 return <main className="app-shell wizard-page">
  <header className="topbar"><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Mago · D&D 2024</span></div></div><Link href="/" className="wizard-class-link" onNavigate={event=>{if(pending&&!window.confirm("Tienes cambios de este Mago sin guardar. ¿Volver al menú y descartarlos?"))event.preventDefault();}}>Menú de personajes</Link></header>
  <div className="content">
   <div className="class-switcher"><label htmlFor="wizard-class-choice">Clase</label><select id="wizard-class-choice" value="wizard" onChange={(e:{target:{value:string}})=>{if(e.target.value==='fighter')openFighterCreator();}}><option value="fighter">Guerrero</option><option value="wizard">Mago (nivel 1)</option></select><span>Evocación estará disponible desde el nivel 3.</span></div>
   <p className="sheet-release-note">CLASE · MAGO NIVEL 1 · PHB 2024</p>
   <CharacterHeader name={input.name} portraitDataUrl={input.profile?.portraitDataUrl} level={1}
     background={background.name} species={SPECIES_NAMES[input.species]} className="Mago" valid={Boolean(sheet)}
     onEdit={()=>setEditing(true)}/>
   <section className="save-panel panel" aria-label="Guardado de Magos">
    <div className="save-panel-head"><div><span className="eyebrow">BASE DE DATOS LOCAL</span><h2>Mis Magos</h2></div><span className="save-label">PostgreSQL</span></div>
    <p className="muted-note">El Mago se guarda por separado del Guerrero, con un estado propio de PG, ranuras e inspiración. Los cambios no se guardan automáticamente.</p>
    <div className="save-controls"><div className="save-character-picker"><label className="field"><span>Magos guardados</span><select value={selected} onChange={(e:{target:{value:string}})=>setSelected(e.target.value)} disabled={busy||loading}><option value="">{loading?'Consultando…':'Selecciona un Mago'}</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name} · Nivel {c.level}</option>)}</select></label><button type="button" className="save-refresh" onClick={()=>action(reload)} disabled={busy}>Actualizar lista</button></div>
     <div className="save-buttons"><button type="button" disabled={busy||!actualSnapshot} onClick={()=>save(true)}>Guardar como nuevo</button><button type="button" disabled={busy||!active||!actualSnapshot||selected!==active.id} onClick={()=>save(false)}>Actualizar guardado</button><button type="button" disabled={busy||!selected} onClick={()=>{if(pending&&!window.confirm('Descartar cambios sin guardar y cargar otro Mago?'))return;void action(()=>loadCharacter(selected));}}>Cargar elegido</button></div></div>
    {active&&<p className={pending?'play-warning':'save-success'}>{pending?'Hay cambios sin guardar. Pulsa «Actualizar guardado».':'Guardado al día.'}</p>}
    {message&&<p className="save-success" role="status">{message}</p>}
    {error&&<p className="save-error" role="alert">{error}</p>}
   </section>
   {editing&&<section className="wizard-editor panel" aria-label="Creación de Mago">
    <div className="panel-heading"><div><span className="eyebrow">CREACIÓN · NIVEL 1</span><h2>Opciones de Mago</h2><p>Elige origen, características, competencias, trucos y libro de conjuros.</p></div></div>
    <div className="wizard-editor-grid">
     <div>
      <label className="field"><span>Nombre</span><input maxLength={120} value={input.name} onChange={(e:{target:{value:string}})=>patch({name:e.target.value})}/></label>
      <label className="field"><span>Clase</span><select aria-label="Clase del personaje" value="wizard" onChange={(e:{target:{value:string}})=>{if(e.target.value==='fighter')openFighterCreator();}}><option value="fighter">Guerrero</option><option value="wizard">Mago (nivel 1)</option></select></label>
      <p className="muted-note">El Guerrero utiliza su hoja de creación propia. Al cambiar de clase no se convierten los atributos ni conjuros de este Mago.</p>
      <label className="field"><span>Trasfondo</span><select value={input.background} onChange={(e:{target:{value:string}})=>changeBackground(e.target.value as BackgroundId)}>{options(Object.keys(BACKGROUNDS) as BackgroundId[],b=>BACKGROUNDS[b].name)}</select></label>
      <label className="field"><span>Especie</span><select value={input.species} onChange={(e:{target:{value:string}})=>changeSpecies(e.target.value as SpeciesId)}>{options(Object.keys(SPECIES_NAMES) as SpeciesId[],s=>SPECIES_NAMES[s])}</select></label>
      {input.species==='elf'&&<label className="field"><span>Linaje élfico</span><select value={input.elfLineage} onChange={(e:{target:{value:string}})=>patch({elfLineage:e.target.value as NonNullable<GuidedWizardInput['elfLineage']>})}><option value="high_elf">Alto elfo</option><option value="wood_elf">Elfo silvano</option><option value="drow">Drow</option></select></label>}
      {input.species==='human'&&<><label className="field"><span>Competencia humana adicional</span><select value={input.humanSkill} onChange={(e:{target:{value:string}})=>patch({humanSkill:e.target.value as Skill})}>{options(SKILLS,s=>SKILL_NAMES[s])}</select></label><label className="field"><span>Dote humana (opciones provisionales)</span><select value={input.humanFeat} onChange={(e:{target:{value:string}})=>patch({humanFeat:e.target.value as 'alert'|'tough'})}>{(background.feat!=='alert')&&<option value="alert">Alerta</option>}{(true)&&<option value="tough">Duro</option>}</select></label><label className="field"><span>Tamaño humano</span><select value={input.humanSize??'medium'} onChange={(e:{target:{value:string}})=>patch({humanSize:e.target.value as 'small'|'medium'})}><option value="medium">Mediano</option><option value="small">Pequeño</option></select></label></>}
      <label className="field"><span>Paquete inicial de Mago</span><select value={input.equipmentChoice} onChange={(e:{target:{value:string}})=>patch({equipmentChoice:e.target.value as GuidedWizardInput['equipmentChoice']})}><option value="equipment">Equipo y 5 po</option><option value="gold">55 po</option></select></label>
      <p className="muted-note">{WIZARD_LEVEL_ONE_EQUIPMENT[input.equipmentChoice].description}</p>
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
    {sheet&&!actualSnapshot&&<p className="warning">Revisa el estado de partida antes de guardar. Si has reducido los PG máximos, utiliza «Ajustar PG» en Principal.</p>}
   </section>}
   <CharacterTabs activeTab={tab} onChange={setTab}/>
   <section id="sheet-panel-principal" role="tabpanel" aria-labelledby="sheet-tab-principal" hidden={tab!=='principal'} className="sheet-tab-panel">
    <div className="sheet-section-heading"><div><span className="eyebrow">PÁGINA PRINCIPAL</span><h2>Tu hoja de personaje</h2><p>Valores calculados, tiradas manuales y estado de partida. La misma estructura para todas las clases.</p></div></div>
    {!sheet?<section className="overview-unavailable panel" role="alert"><h3>Revisa las elecciones de creación</h3><p>{computed.error}</p><button type="button" onClick={()=>setEditing(true)}>Editar personaje</button></section>:<SharedPrincipalSheet
      abilityScores={sheet.abilityScores} abilityModifiers={sheet.abilityModifiers} proficiencyBonus={2}
      skillBonuses={sheet.skillBonuses} savingThrowBonuses={sheet.savingThrowBonuses}
      trainedSkills={new Set<Skill>(sheet.skillProficiencies)} trainedSaves={new Set<Ability>(['intelligence','wisdom'])}
      armorClass={sheet.armorClass} armorDescription="10 + modificador de Destreza · sin armadura"
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
      attacksContent={<section className="overview-panel panel" aria-label="Ataques y armas"><div className="overview-panel-heading"><h3>Ataques y armas</h3><span>Equipo actual</span></div><p className="overview-panel-note">El Mago aún no tiene inventario equipable integrado. No se muestran armas inexistentes ni bonificadores inventados.</p></section>}
      resourcesContent={<section className="overview-panel panel"><div className="overview-panel-heading"><h3>Recursos</h3><span>Clase</span></div><div className="overview-record"><span>Recuperación arcana</span><strong>{state.magic.arcaneRecoveryUsed?'Gastada':'Disponible'}</strong></div><button className="overview-link" type="button" disabled={state.magic.arcaneRecoveryUsed||state.magic.slots.remaining[0]>=2} onClick={recoverArcane}>Usar Recuperación arcana</button><p className="overview-panel-note">Después de un descanso corto, recupera una ranura de nivel 1 gastada.</p></section>}
      spellSlotsContent={<section className="overview-panel panel" aria-label="Espacios de conjuro"><div className="overview-panel-heading"><h3>Espacios de conjuro</h3><span>Rasgo de lanzador</span></div><div className="overview-record"><span>Ranuras de nivel 1</span><strong>{state.magic.slots.remaining[0]}/2</strong></div><div className="overview-quick-actions"><button type="button" disabled={state.magic.slots.remaining[0]===0} onClick={spellSlot}>Gastar ranura</button><button type="button" onClick={rest}>Descanso largo</button></div><p className="overview-panel-note">Gastar una ranura no lanza el conjuro automáticamente.</p></section>}
      warningContent={error&&<div className="overview-action-message is-error" role="alert">{error}</div>}
      footerContent={<>
       <section className="overview-panel panel"><h3>Percepción pasiva</h3><strong className="overview-spotlight">{10+sheet.skillBonuses.perception}</strong><p className="overview-panel-note">10 + Percepción {signed(sheet.skillBonuses.perception)}</p></section>
       <section className="overview-panel panel"><h3>Movimiento y origen</h3><strong className="overview-spotlight">{sheet.speedFeet} <small>pies</small></strong><p className="overview-panel-note">Tamaño {sheet.size==='medium'?'mediano':'pequeño'} · Mago nivel 1</p></section>
       <section className="overview-panel panel overview-death-panel" aria-label="Salvaciones de muerte"><h3>Salvaciones de muerte</h3><div className="overview-death-markers">{(['successes','failures'] as const).map(kind=><div key={kind} className={`overview-death-track ${kind==='successes'?'is-success':'is-failure'}`}><div className="overview-death-track-heading"><span>{kind==='successes'?'Éxitos':'Fallos'}</span><small>{state.manualDeathMarks?.[kind].filter(Boolean).length??0}/3</small></div><div className="overview-death-marks" role="group" aria-label={kind==='successes'?'Éxitos':'Fallos'}>{([0,1,2] as const).map(index=>{const checked=state.manualDeathMarks?.[kind][index]??false;return <button type="button" key={index} className={`overview-death-mark${checked?' is-marked':''}`} aria-pressed={checked} aria-label={`${kind==='successes'?'Éxito':'Fallo'} ${index+1}`} onClick={()=>toggleDeathMark(kind,index)}><span aria-hidden="true">{checked?(kind==='successes'?'✓':'×'):''}</span></button>;})}</div></div>)}</div><p className="overview-panel-note">Marcadores manuales. No desencadenan reglas automáticas.</p></section>
       <section className="overview-panel panel"><h3>Inspiración heroica</h3><label className={`wizard-inspiration unified-inspiration${state.heroicInspiration?' is-active':''}`}><input type="checkbox" checked={state.heroicInspiration} onChange={e=>setState(prev=>({...prev,heroicInspiration:e.target.checked}))}/><span className="wizard-star">★</span><span>{state.heroicInspiration?'Disponible':'Sin inspiración'}</span></label><p className="overview-panel-note">Marca para tener inspiración; desmarca al gastarla.</p></section>
      </>}
    />}
   </section>
   <section id="sheet-panel-rasgos" role="tabpanel" aria-labelledby="sheet-tab-rasgos" hidden={tab!=='rasgos'} className="sheet-tab-panel"><div className="wizard-module panel"><h2>Rasgos de Mago</h2><div className="wizard-pair"><div><h3>Lanzamiento de conjuros</h3><p>Conoces tres trucos y tienes seis conjuros de nivel 1 escritos en el libro. Puedes preparar cuatro. Usas Inteligencia y tu libro o un foco arcano para lanzar conjuros.</p></div><div><h3>Adepto ritual</h3><p>Puedes lanzar como ritual cualquier conjuro de tu libro con la etiqueta Ritual, aunque no lo hayas preparado. No gasta ranura.</p></div><div><h3>Recuperación arcana</h3><p>Tras un descanso corto puedes recuperar una ranura de nivel 1 gastada, una vez por descanso largo.</p></div><div><h3>Origen</h3><p>Dote de trasfondo: {sheet?.backgroundFeat??background.feat}. Los efectos complejos de especie y dotes adicionales se ampliarán en la siguiente etapa.</p></div></div></div></section>
   <section id="sheet-panel-equipo" role="tabpanel" aria-labelledby="sheet-tab-equipo" hidden={tab!=='equipo'} className="sheet-tab-panel"><div className="wizard-module panel"><h2>Equipo inicial del Mago</h2><p>{sheet?.equipment.description??WIZARD_LEVEL_ONE_EQUIPMENT[input.equipmentChoice].description}</p><p className="muted-note">La gestión dinámica de inventario y monedas de Mago se integrará después; no se comparte el inventario del Guerrero.</p></div></section>
   <section id="sheet-panel-hechizos" role="tabpanel" aria-labelledby="sheet-tab-hechizos" hidden={tab!=='hechizos'} className="sheet-tab-panel"><div className="wizard-module panel"><h2>Hechizos del Mago</h2><div className="stat-cards"><div className="stat-card"><span>CD DE SALVACIÓN</span><strong>{sheet?.spellSaveDC??'—'}</strong><small>8 + competencia + Inteligencia</small></div><div className="stat-card"><span>ATAQUE MÁGICO</span><strong>{sheet?signed(sheet.spellAttackBonus):'—'}</strong><small>Competencia + Inteligencia</small></div><div className="stat-card"><span>RANURAS DE NIVEL 1</span><strong>{state.magic.slots.remaining[0]}/2</strong><small>Recuperadas al descansar</small></div></div><div className="wizard-delta"><button type="button" disabled={state.magic.slots.remaining[0]===0} onClick={spellSlot}>Gastar ranura de nivel 1</button><button type="button" disabled={state.magic.arcaneRecoveryUsed||state.magic.slots.remaining[0]===2} onClick={recoverArcane}>Recuperación arcana</button><button type="button" onClick={rest}>Descanso largo</button></div><div className="wizard-pair"><div><h3>Trucos ({input.cantripIds.length})</h3>{input.cantripIds.map(id=><div className="data-row" key={id}>{WIZARD_LEVEL_ONE_CANTRIPS.find(s=>s.id===id)?.name??id}</div>)}</div><div><h3>Libro de conjuros ({input.spellbookIds.length})</h3>{input.spellbookIds.map(id=><div className="data-row" key={id}><span>{WIZARD_LEVEL_ONE_SPELLS.find(s=>s.id===id)?.name??id}</span><small>{input.preparedIds.includes(id)?'Preparado':'En el libro'}</small></div>)}</div></div><p className="muted-note">Lanzar un conjuro y gastar su ranura son acciones manuales separadas. La verificación de componentes, concentración y efectos llegará en la actualización 49.</p></div></section>
   <section id="sheet-panel-personaje" role="tabpanel" aria-labelledby="sheet-tab-personaje" hidden={tab!=='personaje'} className="sheet-tab-panel"><CharacterProfilePanel key={profileRevision} profile={input.profile??EMPTY_CHARACTER_PROFILE} name={input.name} species={SPECIES_NAMES[input.species]} background={background.name} level={1} onChange={profile=>patch({profile})} onEditIdentity={()=>setEditing(true)}/></section>
   <section id="sheet-panel-combate" role="tabpanel" aria-labelledby="sheet-tab-combate" hidden={tab!=='combate'} className="sheet-tab-panel"><div className="wizard-module panel"><h2>Combate: próximamente</h2><p>El Mago puede realizar tiradas d20 desde Principal y gestionar ranuras desde Hechizos. No se automatizan enemigos ni turnos.</p></div></section>
   <footer className="footer">Mago nivel 1 · Implementación inicial. Guardado en desarrollo local, sin migraciones PostgreSQL.</footer>
  </div>
 </main>;
}
