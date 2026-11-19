'use client';
import {useState,type ReactNode} from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import {EMPTY_COMPANION,validateCompanionSheets,type CompanionAttack,type CompanionSheet} from '../../../../packages/rules-engine/src/companions';
import {rollD20} from '../../../../packages/rules-engine/src/d20';

const LABELS:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const id=()=>`manual-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const signed=(n:number)=>`${n>=0?'+':''}${n}`;
type Props={companions:readonly CompanionSheet[];onChange:(next:readonly CompanionSheet[])=>void;children?:ReactNode};

/** Pestaña y editor de compañeros independientes de la clase y de los aliados concedidos por rasgos. */
export default function SharedCompanionsPanel({companions,onChange,children}:Props){
 const [selectedId,setSelectedId]=useState('');
 const [draft,setDraft]=useState<CompanionSheet|null>(null);
 const [creating,setCreating]=useState(false);
 const [error,setError]=useState('');
 const [lastRoll,setLastRoll]=useState('');
 const selected=companions.find(c=>c.id===selectedId)??companions[0];
 const editing=draft!==null;
 function startCreate(){setCreating(true);setDraft({...EMPTY_COMPANION,id:id()});setError('');setLastRoll('');}
 function startEdit(){if(!selected)return;setCreating(false);setDraft({...selected,abilities:{...selected.abilities},attacks:selected.attacks.map(a=>({...a}))});setError('');setLastRoll('');}
 function cancel(){setDraft(null);setCreating(false);setError('');}
 function patch(values:Partial<CompanionSheet>){setDraft(prev=>prev?{...prev,...values}:prev);}
 function patchAttack(attackId:string,values:Partial<CompanionAttack>){if(!draft)return;patch({attacks:draft.attacks.map(attack=>attack.id===attackId?{...attack,...values}:attack)});}
 function save(){
  if(!draft)return;
  const next=creating?[...companions,draft]:companions.map(c=>c.id===draft.id?draft:c);
  try{validateCompanionSheets(next);onChange(next);setSelectedId(draft.id);cancel();}
  catch(reason){setError(reason instanceof Error?reason.message:'Revisa los datos de la ficha');}
 }
 function roll(label:string,modifier:number){
  try{const result=rollD20(modifier,'normal','normal');setLastRoll(`${label}: d20 ${result.chosen} ${signed(modifier)} = ${result.total}`);}
  catch(reason){setLastRoll(reason instanceof Error?reason.message:'No se pudo tirar el d20');}
 }
 const numeric=(title:string,value:number,change:(value:number)=>void,min:number,max:number)=><label className="field" key={title}><span>{title}</span><input type="number" min={min} max={max} step={1} value={value} onChange={e=>change(Number(e.target.value))}/></label>;
 const textField=(title:string,key:keyof CompanionSheet,multiline=false)=>{if(!draft)return null;const value=draft[key];return <label className="field" key={title}><span>{title}</span>{multiline?<textarea maxLength={2000} rows={3} value={String(value)} onChange={e=>patch({[key]:e.target.value} as Partial<CompanionSheet>)}/>:<input maxLength={key==='name'?120:2000} value={String(value)} onChange={e=>patch({[key]:e.target.value} as Partial<CompanionSheet>)}/>}</label>;};
 return <div className="traits-page shared-companions-page">
  <section className="panel wizard-module" aria-label="Compañeros de cualquier clase">
   <span className="eyebrow">COMPAÑEROS · ESTRUCTURA COMÚN</span><h2>Mis compañeros</h2>
   <p className="muted-note">Registra hasta 20 compañeros manuales, con su ficha editable y guardable. Son independientes de familiares, invocaciones u otros aliados concedidos por rasgos; los rasgos especiales se muestran más abajo.</p>
   <div className="shared-companion-toolbar">
    <label className="field"><span>Compañero visible</span><select aria-label="Seleccionar compañero" disabled={editing||companions.length===0} value={selected?.id??''} onChange={event=>{setSelectedId(event.target.value);setLastRoll('');}}>{companions.length===0&&<option value="">Sin compañeros</option>}{companions.map(companion=><option key={companion.id} value={companion.id}>{companion.name}</option>)}</select></label>
    <div className="overview-quick-actions"><button type="button" disabled={editing||companions.length>=20} onClick={startCreate}>+ Crear compañero</button><button type="button" disabled={editing||!selected} onClick={startEdit}>Editar ficha</button></div>
   </div>
   {editing&&draft&&<div className="shared-companion-editor" aria-label={creating?'Crear compañero':'Editar compañero'}>
    <h3>{creating?'Crear nuevo compañero':'Editar ficha de '+draft.name}</h3>
    <div className="shared-companion-fields">{textField('Nombre','name')}{textField('Especie / tipo de criatura','creatureType')}{textField('Tamaño','size')}{textField('Velocidad','speed')}{textField('Valor de desafío','challengeRating')}
     {numeric('Clase de armadura',draft.armorClass,value=>patch({armorClass:value}),0,40)}
     {numeric('PG actuales',draft.hitPoints,value=>patch({hitPoints:value}),0,100000)}
     {numeric('PG máximos',draft.hitPointsMaximum,value=>patch({hitPointsMaximum:value}),1,100000)}
     {numeric('Bonificador de competencia',draft.proficiencyBonus,value=>patch({proficiencyBonus:value}),0,15)}
    </div>
    <h4>Características</h4><div className="shared-companion-abilities">{ABILITIES.map(ability=>numeric(LABELS[ability],draft.abilities[ability],value=>patch({abilities:{...draft.abilities,[ability]:value}}),1,30))}</div>
    <div className="shared-companion-fields">{textField('Salvaciones','savingThrows',true)}{textField('Habilidades','skills',true)}{textField('Sentidos','senses')}{textField('Idiomas','languages')}{textField('Resistencias, inmunidades y vulnerabilidades','defenses',true)}</div>
    <h4>Ataques</h4>{draft.attacks.map((attack,index)=><div className="shared-companion-attack-edit" key={attack.id}><strong>Ataque {index+1}</strong><div className="shared-companion-fields">
     <label className="field"><span>Nombre</span><input value={attack.name} maxLength={120} onChange={e=>patchAttack(attack.id,{name:e.target.value})}/></label>
     {numeric('Bono al ataque',attack.attackBonus,value=>patchAttack(attack.id,{attackBonus:value}),-50,50)}
     <label className="field"><span>Daño (dados y tipo)</span><input value={attack.damage} maxLength={250} onChange={e=>patchAttack(attack.id,{damage:e.target.value})}/></label>
     <label className="field"><span>Detalles</span><input value={attack.notes} maxLength={2000} onChange={e=>patchAttack(attack.id,{notes:e.target.value})}/></label>
    </div><button type="button" className="overview-link" onClick={()=>patch({attacks:draft.attacks.filter(a=>a.id!==attack.id)})}>Quitar ataque</button></div>)}
    <button type="button" disabled={draft.attacks.length>=20} onClick={()=>patch({attacks:[...draft.attacks,{id:id(),name:'Nuevo ataque',attackBonus:0,damage:'1d6',notes:''}]})}>+ Añadir ataque</button>
    <div className="shared-companion-fields">{textField('Rasgos y capacidades','traits',true)}{textField('Acciones / reacciones','actions',true)}{textField('Equipo','equipment',true)}{textField('Notas','notes',true)}</div>
    {error&&<p role="alert" className="error">{error}</p>}
    <div className="overview-quick-actions"><button type="button" onClick={save}>Guardar ficha</button><button type="button" onClick={cancel}>Cancelar</button></div>
   </div>}
   {!editing&&!selected&&<p className="muted-note">Todavía no has creado compañeros. Pulsa «Crear compañero» para introducir su ficha.</p>}
   {!editing&&selected&&<article className="shared-companion-sheet">
    <header><h3>{selected.name}</h3><p>{selected.creatureType||'Criatura'} · {selected.size} · Velocidad {selected.speed}{selected.challengeRating&&` · Desafío ${selected.challengeRating}`}</p></header>
    <div className="shared-companion-vitals"><div><span>CA</span><strong>{selected.armorClass}</strong></div><div><span>PG</span><strong>{selected.hitPoints}/{selected.hitPointsMaximum}</strong></div><div><span>Competencia</span><strong>{signed(selected.proficiencyBonus)}</strong></div></div>
    <h4>Características</h4><div className="shared-companion-ability-cards">{ABILITIES.map(ability=><div key={ability}><span>{LABELS[ability]}</span><strong>{selected.abilities[ability]}</strong><small>{signed(Math.floor((selected.abilities[ability]-10)/2))}</small><button type="button" className="overview-roll-button" onClick={()=>roll(LABELS[ability],Math.floor((selected.abilities[ability]-10)/2))}>Tirar</button></div>)}</div>
    <div className="shared-companion-fields"><p><strong>Iniciativa:</strong> {signed(Math.floor((selected.abilities.dexterity-10)/2))} <button type="button" className="overview-roll-button" onClick={()=>roll('Iniciativa',Math.floor((selected.abilities.dexterity-10)/2))}>Tirar</button></p><p><strong>Salvaciones:</strong> {selected.savingThrows||'—'}</p><p><strong>Habilidades:</strong> {selected.skills||'—'}</p><p><strong>Sentidos:</strong> {selected.senses||'—'}</p><p><strong>Idiomas:</strong> {selected.languages||'—'}</p><p><strong>Defensas:</strong> {selected.defenses||'—'}</p></div>
    <h4>Ataques</h4>{selected.attacks.length===0?<p className="muted-note">Sin ataques registrados.</p>:<div className="overview-records">{selected.attacks.map(attack=><div key={attack.id} className="overview-record"><span><strong>{attack.name}</strong><small>{attack.damage} {attack.notes&&`· ${attack.notes}`}</small></span><strong>{signed(attack.attackBonus)}</strong><button type="button" className="overview-roll-button" onClick={()=>roll(attack.name,attack.attackBonus)}>Tirar ataque</button></div>)}</div>}
    {lastRoll&&<p className="overview-roll-result" role="status" aria-live="polite">{lastRoll}</p>}
    <h4>Rasgos</h4><p className="shared-companion-prose">{selected.traits||'Sin rasgos registrados.'}</p><h4>Acciones / reacciones</h4><p className="shared-companion-prose">{selected.actions||'Sin acciones registradas.'}</p><h4>Equipo</h4><p className="shared-companion-prose">{selected.equipment||'Sin equipo registrado.'}</p><h4>Notas</h4><p className="shared-companion-prose">{selected.notes||'Sin notas.'}</p>
   </article>}
  </section>
  {children}
 </div>;
}
