'use client';

import { useEffect, useState } from 'react';
import type { GuidedFighterInput } from '../../../../packages/rules-engine/src/guided';
import { makeCharacterSnapshot } from '../../../../packages/rules-engine/src/persistence';

type Summary={id:string;name:string;level:number;revision:number;updatedAt:string};
type Detail=Summary&{snapshot:{schemaVersion:1;ruleset:'dnd-2024';input:GuidedFighterInput}};
type Props={input:GuidedFighterInput;valid:boolean;onLoad:(input:GuidedFighterInput)=>void};

async function jsonOrThrow<T>(response:Response):Promise<T>{
  const value=await response.json().catch(()=>({})) as {error?:string};
  if(!response.ok)throw new Error(value.error||`Error HTTP ${response.status}`);
  return value as T;
}

export default function SaveLoadPanel({input,valid,onLoad}:Props){
  const [entries,setEntries]=useState<Summary[]>([]);
  const [selected,setSelected]=useState<string>('');
  const [active,setActive]=useState<{id:string;revision:number}|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  async function refresh(){
    const response=await fetch('/api/characters',{cache:'no-store'});
    const payload=await jsonOrThrow<{characters:Summary[]}>(response);
    setEntries(payload.characters);
  }
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const r=await fetch('/api/characters',{cache:'no-store'});
        const d=await jsonOrThrow<{characters:Summary[]}>(r);
        if(!cancelled)setEntries(d.characters);
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'No se pudo conectar con PostgreSQL');}
    })();
    return ()=>{cancelled=true;};
  },[]);

  async function act(action:()=>Promise<void>){
    setBusy(true);setError('');setMessage('');
    try{await action();}catch(e){setError(e instanceof Error?e.message:'Ha ocurrido un error');}
    finally{setBusy(false);}
  }
  async function saveNew(){
    await act(async()=>{
      const snapshot=makeCharacterSnapshot(input);
      const response=await fetch('/api/characters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot})});
      const d=await jsonOrThrow<{character:Summary}>(response);
      setActive({id:d.character.id,revision:d.character.revision});setSelected(d.character.id);
      setMessage(`Personaje «${d.character.name}» guardado por primera vez.`);
      await refresh();
    });
  }
  async function update(){
    if(!active)return;
    await act(async()=>{
      const snapshot=makeCharacterSnapshot(input);
      const response=await fetch(`/api/characters/${encodeURIComponent(active.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:active.revision,snapshot})});
      const d=await jsonOrThrow<{character:Summary}>(response);
      setActive({id:d.character.id,revision:d.character.revision});
      setMessage(`Cambios guardados (revisión ${d.character.revision}).`);
      await refresh();
    });
  }
  async function load(){
    if(!selected)return;
    if(!window.confirm('¿Cargar este personaje? Se sustituirán las elecciones que aparecen actualmente en pantalla.'))return;
    await act(async()=>{
      const response=await fetch(`/api/characters/${encodeURIComponent(selected)}`,{cache:'no-store'});
      const d=await jsonOrThrow<{character:Detail}>(response);
      onLoad(d.character.snapshot.input);
      setActive({id:d.character.id,revision:d.character.revision});
      setMessage(`Personaje «${d.character.name}» recuperado.`);
    });
  }
  async function remove(){
    const item=entries.find(e=>e.id===selected);
    if(!item)return;
    if(!window.confirm(`¿Eliminar definitivamente «${item.name}»? No se puede deshacer.`))return;
    await act(async()=>{
      const response=await fetch(`/api/characters/${encodeURIComponent(item.id)}?revision=${item.revision}`,{method:'DELETE'});
      if(!response.ok)await jsonOrThrow(response);
      if(active?.id===item.id)setActive(null);
      setSelected('');setMessage('Personaje eliminado de la base de datos.');await refresh();
    });
  }

  return <section className="save-panel panel" aria-label="Guardar y recuperar personajes">
    <div className="save-panel-head"><div><span className="eyebrow">BASE DE DATOS LOCAL</span><h2>Mis personajes</h2></div><span className="save-label">PostgreSQL</span></div>
    <p className="muted-note">Guarda las elecciones, los conjuros y el historial del inventario. Los valores de la hoja se recalculan al cargar.</p>
    <div className="save-controls">
      <label className="field"><span>Personajes guardados</span><select value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}>
        <option value="">Selecciona un personaje</option>
        {entries.map(entry=><option value={entry.id} key={entry.id}>{entry.name} · Guerrero {entry.level} · {new Date(entry.updatedAt).toLocaleDateString('es-ES')}</option>)}
      </select></label>
      <div className="save-buttons">
        <button type="button" onClick={saveNew} disabled={busy||!valid}>Guardar como nuevo</button>
        <button type="button" onClick={update} disabled={busy||!valid||!active||active.id!==selected}>Actualizar guardado</button>
        <button type="button" onClick={load} disabled={busy||!selected}>Cargar elegido</button>
        <button type="button" onClick={remove} disabled={busy||!selected} className="save-danger">Eliminar</button>
      </div>
    </div>
    {active&&<p className="muted-note">Editando guardado #{active.id.slice(0,8)} · revisión {active.revision}. Los cambios no se guardan automáticamente.</p>}
    {message&&<p role="status" className="save-success">{message}</p>}
    {error&&<p role="alert" className="save-error">{error}</p>}
    {!valid&&<p className="muted-note">Corrige primero los errores de creación para poder guardar.</p>}
  </section>;
}
