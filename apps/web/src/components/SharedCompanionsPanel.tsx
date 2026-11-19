'use client';
import {useState,type ReactNode} from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import {EMPTY_COMPANION,validateCompanionSheets,type CompanionAttack,type CompanionSheet} from '../../../../packages/rules-engine/src/companions';
import CreatureStatBlock from './CreatureStatBlock';

const LABELS:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const id=()=>`manual-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
type Props={companions:readonly CompanionSheet[];onChange:(next:readonly CompanionSheet[])=>void;children?:ReactNode};

/** Pestaña y editor de compañeros independientes de la clase y de los aliados concedidos por rasgos. */
export default function SharedCompanionsPanel({companions,onChange,children}:Props){
 const [selectedId,setSelectedId]=useState('');
 const [draft,setDraft]=useState<CompanionSheet|null>(null);
 const [creating,setCreating]=useState(false);
 const [error,setError]=useState('');
 const [pendingDeleteId,setPendingDeleteId]=useState<string|null>(null);
 const selected=companions.find(c=>c.id===selectedId)??companions[0];
 const editing=draft!==null;
 function startCreate(){setPendingDeleteId(null);setCreating(true);setDraft({...EMPTY_COMPANION,id:id()});setError('');}
 function startEdit(){if(!selected)return;setPendingDeleteId(null);setCreating(false);setDraft({...selected,abilities:{...selected.abilities},attacks:selected.attacks.map(a=>({...a}))});setError('');}
 function cancel(){setDraft(null);setCreating(false);setError('');}
 function patch(values:Partial<CompanionSheet>){setDraft(prev=>prev?{...prev,...values}:prev);}
 function patchAttack(attackId:string,values:Partial<CompanionAttack>){if(!draft)return;patch({attacks:draft.attacks.map(attack=>attack.id===attackId?{...attack,...values}:attack)});}
 function save(){
  if(!draft)return;
  const next=creating?[...companions,draft]:companions.map(c=>c.id===draft.id?draft:c);
  try{validateCompanionSheets(next);onChange(next);setSelectedId(draft.id);cancel();}
  catch(reason){setError(reason instanceof Error?reason.message:'Revisa los datos de la ficha');}
 }
 function removeSelected(){
  if(!selected||pendingDeleteId!==selected.id)return;
  const next=companions.filter(companion=>companion.id!==selected.id);
  try{
   validateCompanionSheets(next);onChange(next);setSelectedId(next[0]?.id??'');setPendingDeleteId(null);setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'No se pudo eliminar el compañero');}
 }
 const numeric=(title:string,value:number,change:(value:number)=>void,min:number,max:number)=><label className="field" key={title}><span>{title}</span><input type="number" min={min} max={max} step={1} value={value} onChange={e=>change(Number(e.target.value))}/></label>;
 const textField=(title:string,key:keyof CompanionSheet,multiline=false)=>{if(!draft)return null;const value=draft[key];return <label className="field" key={title}><span>{title}</span>{multiline?<textarea maxLength={2000} rows={3} value={String(value)} onChange={e=>patch({[key]:e.target.value} as Partial<CompanionSheet>)}/>:<input maxLength={key==='name'?120:2000} value={String(value)} onChange={e=>patch({[key]:e.target.value} as Partial<CompanionSheet>)}/>}</label>;};
 return <div className="traits-page shared-companions-page">
  <section className="panel wizard-module" aria-label="Compañeros de cualquier clase">
   <span className="eyebrow">COMPAÑEROS · ESTRUCTURA COMÚN</span><h2>Mis compañeros</h2>
   <p className="muted-note">Registra hasta 20 compañeros manuales, con su ficha editable y guardable. Son independientes de familiares, invocaciones u otros aliados concedidos por rasgos; los rasgos especiales se muestran más abajo.</p>
   <div className="shared-companion-toolbar">
    <label className="field"><span>Compañero visible</span><select aria-label="Seleccionar compañero" disabled={editing||companions.length===0} value={selected?.id??''} onChange={event=>{setSelectedId(event.target.value);setPendingDeleteId(null);}}>{companions.length===0&&<option value="">Sin compañeros</option>}{companions.map(companion=><option key={companion.id} value={companion.id}>{companion.name}</option>)}</select></label>
    <div className="overview-quick-actions"><button type="button" disabled={editing||companions.length>=20} onClick={startCreate}>+ Crear compañero</button><button type="button" disabled={editing||!selected} onClick={startEdit}>Editar ficha</button><button type="button" className="danger-action" disabled={editing||!selected} onClick={()=>setPendingDeleteId(selected?.id??null)}>Eliminar compañero</button></div>
   </div>
   {!editing&&selected&&pendingDeleteId===selected.id&&<div className="shared-companion-delete-confirm" role="group" aria-label="Confirmar eliminación del compañero"><p>¿Eliminar a <strong>{selected.name}</strong> de este personaje?</p><div className="overview-quick-actions"><button type="button" className="danger-action" onClick={removeSelected}>Sí, eliminar</button><button type="button" onClick={()=>setPendingDeleteId(null)}>Cancelar</button></div><small>Después, pulsa «Guardar cambios» en la hoja del personaje para conservar esta eliminación.</small></div>}
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
   {!editing&&selected&&<CreatureStatBlock key={selected.id} sheet={selected}/>}
  </section>
  {children}
 </div>;
}
