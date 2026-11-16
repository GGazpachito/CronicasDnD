'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { GuidedFighterInput } from '../../../../packages/rules-engine/src/guided';
import type { AdventureState } from '../../../../packages/rules-engine/src/adventure';
import type { CharacterSnapshot } from '../../../../packages/rules-engine/src/persistence';
import { makeCharacterSnapshot } from '../../../../packages/rules-engine/src/persistence';

type Summary={id:string;name:string;level:number;characterClass?:'wizard'|'fighter';revision:number;updatedAt:string};
type Detail=Summary&{snapshot:CharacterSnapshot};
type Props={input:GuidedFighterInput;adventure:AdventureState|null;valid:boolean;onLoad:(snapshot:CharacterSnapshot)=>void};

async function jsonOrThrow<T>(response:Response):Promise<T>{
  const value=await response.json().catch(()=>({})) as {error?:string};
  if(!response.ok)throw new Error(value.error||`Error HTTP ${response.status}`);
  return value as T;
}

/** Solo compara el documento validado que iría a PostgreSQL. No guarda datos adicionales. */
function snapshotFingerprint(snapshot:CharacterSnapshot):string{
  return JSON.stringify(snapshot);
}

export default function SaveLoadPanel({input,adventure,valid,onLoad}:Props){
  const router=useRouter();
  const onLoadRef=useRef(onLoad);
  useEffect(()=>{onLoadRef.current=onLoad;},[onLoad]);
  const [entries,setEntries]=useState<Summary[]>([]);
  const [selected,setSelected]=useState<string>('');
  const [active,setActive]=useState<{id:string;revision:number;savedLevel:number}|null>(null);
  const [savedFingerprint,setSavedFingerprint]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [listLoading,setListLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  const currentFingerprint=useMemo(()=>{
    if(!valid)return null;
    try{return snapshotFingerprint(makeCharacterSnapshot(input,adventure??undefined));}
    catch{return null;}
  },[input,adventure,valid]);
  const hasUnsavedChanges=active!==null&&savedFingerprint!==null&&currentFingerprint!==savedFingerprint;

  // La advertencia es nativa del navegador. No intercepta cambios entre pestañas.
  useEffect(()=>{
    if(!hasUnsavedChanges)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[hasUnsavedChanges]);

  async function refresh(){
    const response=await fetch('/api/characters',{cache:'no-store'});
    const payload=await jsonOrThrow<{characters:Summary[]}>(response);
    setEntries(payload.characters);
    const ids=new Set(payload.characters.map(item=>item.id));
    setSelected(previous=>previous&&!ids.has(previous)?'':previous);
  }
  async function refreshAfterMutation(){
    try{await refresh();}
    catch{setMessage(previous=>`${previous} No se pudo actualizar el listado; el servidor sí confirmó el cambio. Pulsa «Actualizar lista» para reintentarlo.`);}
  }
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const r=await fetch('/api/characters',{cache:'no-store'});
        const d=await jsonOrThrow<{characters:Summary[]}>(r);
        if(!cancelled)setEntries(d.characters);
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'No se pudo conectar con PostgreSQL');}
      finally{if(!cancelled)setListLoading(false);}
    })();
    return ()=>{cancelled=true;};
  },[]);

  // Carga directa desde la galería. Reutiliza el mismo guardado y control de revisión.
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('character');
    if(!id)return;
    let cancelled=false;
    (async()=>{
      try{
        const response=await fetch(`/api/characters/${encodeURIComponent(id)}`,{cache:'no-store'});
        const data=await jsonOrThrow<{character:Detail}>(response);
        if(data.character.characterClass==='wizard')throw new Error('El enlace apunta a un Mago. Ábrelo desde la galería.');
        const snapshot=data.character.snapshot;
        if(data.character.level!==snapshot.input.level||data.character.level!==snapshot.adventure.fighter.fighterLevel)
          throw new Error('Los niveles de este personaje guardado no coinciden.');
        if(cancelled)return;
        onLoadRef.current(snapshot);
        setActive({id:data.character.id,revision:data.character.revision,savedLevel:data.character.level});
        setSelected(data.character.id);
        setSavedFingerprint(snapshotFingerprint(snapshot));
        setMessage(`Personaje «${data.character.name}» cargado desde la galería.`);
      }catch(reason){if(!cancelled)setError(reason instanceof Error?reason.message:'No se pudo abrir el personaje');}
    })();
    return ()=>{cancelled=true;};
  },[]);

  async function act(action:()=>Promise<void>){
    setBusy(true);setError('');setMessage('');
    try{await action();}catch(e){setError(e instanceof Error?e.message:'Ha ocurrido un error');}
    finally{setBusy(false);}
  }
  async function reloadList(){
    await act(async()=>{
      await refresh();
      setMessage('Listado actualizado desde PostgreSQL.');
    });
  }
  async function saveNew(){
    await act(async()=>{
      const snapshot=makeCharacterSnapshot(input,adventure??undefined);
      const response=await fetch('/api/characters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot})});
      const d=await jsonOrThrow<{character:Summary}>(response);
      if(d.character.level!==snapshot.input.level)throw new Error('El servidor no confirmó el nivel esperado. No se ha validado este guardado.');
      setActive({id:d.character.id,revision:d.character.revision,savedLevel:d.character.level});setSelected(d.character.id);
      setSavedFingerprint(snapshotFingerprint(snapshot));
      setMessage(`Personaje «${d.character.name}» guardado por primera vez en NIVEL ${d.character.level}.`);
      await refreshAfterMutation();
    });
  }
  async function update(){
    if(!active)return;
    await act(async()=>{
      const snapshot=makeCharacterSnapshot(input,adventure??undefined);
      const response=await fetch(`/api/characters/${encodeURIComponent(active.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:active.revision,snapshot})});
      const d=await jsonOrThrow<{character:Summary}>(response);
      if(d.character.level!==snapshot.input.level)throw new Error('El servidor devolvió otro nivel. Comprueba el personaje guardado antes de continuar.');
      setActive({id:d.character.id,revision:d.character.revision,savedLevel:d.character.level});
      setSavedFingerprint(snapshotFingerprint(snapshot));
      setMessage(`Cambios guardados: NIVEL ${d.character.level} (revisión ${d.character.revision}).`);
      await refreshAfterMutation();
    });
  }
  async function load(){
    if(!selected)return;
    const notice=hasUnsavedChanges
      ? 'Tienes cambios sin guardar. ¿Cargar otro personaje y descartar esos cambios?'
      : '¿Cargar este personaje? Se sustituirán las elecciones que aparecen actualmente en pantalla.';
    if(!window.confirm(notice))return;
    await act(async()=>{
      const response=await fetch(`/api/characters/${encodeURIComponent(selected)}`,{cache:'no-store'});
      const d=await jsonOrThrow<{character:Detail}>(response);
      if(d.character.characterClass==='wizard'){
        router.push(`/wizard?character=${encodeURIComponent(d.character.id)}`);
        return;
      }
      if(d.character.level!==d.character.snapshot.input.level||d.character.level!==d.character.snapshot.adventure.fighter.fighterLevel)
        throw new Error('El nivel del registro no coincide con la hoja y la partida guardadas. No se ha cargado un personaje inconsistente.');
      onLoad(d.character.snapshot);
      setActive({id:d.character.id,revision:d.character.revision,savedLevel:d.character.level});
      setSavedFingerprint(snapshotFingerprint(d.character.snapshot));
      setMessage(`Personaje «${d.character.name}» recuperado en NIVEL ${d.character.level}.`);
    });
  }
  async function remove(){
    const item=entries.find(e=>e.id===selected);
    if(!item)return;
    if(!window.confirm(`¿Eliminar definitivamente «${item.name}»? No se puede deshacer.`))return;
    await act(async()=>{
      const response=await fetch(`/api/characters/${encodeURIComponent(item.id)}?revision=${item.revision}`,{method:'DELETE'});
      if(!response.ok)await jsonOrThrow(response);
      if(active?.id===item.id){setActive(null);setSavedFingerprint(null);}
      setSelected('');setMessage('Personaje eliminado de la base de datos.');await refreshAfterMutation();
    });
  }

  return <section className="save-panel panel" aria-label="Guardar y recuperar personajes">
    <div className="save-panel-head"><div><span className="eyebrow">BASE DE DATOS LOCAL</span><h2>Mis personajes</h2></div><span className="save-label">PostgreSQL</span></div>
    <p className="muted-note">Guarda las elecciones, inventario y estado de partida (PG, recursos y dados). Las estadísticas máximas se recalculan al cargar.</p>
    <div className="save-controls">
      <div className="save-character-picker">
        <label className="field"><span>Personajes guardados</span><select value={selected} onChange={(e:{target:{value:string}})=>setSelected(e.target.value)} disabled={busy||listLoading}>
          <option value="">{listLoading?'Consultando PostgreSQL…':'Selecciona un personaje'}</option>
          {entries.map(entry=><option value={entry.id} key={entry.id}>{entry.name} · {entry.characterClass==='wizard'?'Mago':'Guerrero'} {entry.level} · {new Date(entry.updatedAt).toLocaleDateString('es-ES')}</option>)}
        </select></label>
        <button type="button" className="save-refresh" onClick={reloadList} disabled={busy||listLoading} aria-label="Volver a consultar personajes guardados">Actualizar lista</button>
      </div>
      <div className="save-buttons">
        <button type="button" onClick={saveNew} disabled={busy||!valid}>Guardar como nuevo</button>
        <button type="button" onClick={update} disabled={busy||!valid||!active||active.id!==selected}>Actualizar guardado</button>
        <button type="button" onClick={load} disabled={busy||!selected}>Cargar elegido</button>
        <button type="button" onClick={remove} disabled={busy||!selected} className="save-danger">Eliminar</button>
      </div>
    </div>
    {!listLoading&&!error&&entries.length===0&&<p className="muted-note save-empty-list">No hay personajes en la base de datos consultada. Si esperabas ver alguno, comprueba el servidor y vuelve a actualizar la lista.</p>}
    {active&&<div className="save-active-state" role="status">
      <div className={hasUnsavedChanges?'save-pending':'save-synced'}>
        <span className="save-status-indicator" aria-hidden="true"/>
        <strong>{hasUnsavedChanges?'Cambios sin guardar':'Guardado al día'}</strong>
        <span>{hasUnsavedChanges?'Actualiza el personaje en PostgreSQL antes de cerrar la página.':'No se han detectado cambios respecto al último guardado confirmado.'}</span>
      </div>
      <p className={active.savedLevel!==input.level?'play-warning':'muted-note'}>
        Editando guardado #{active.id.slice(0,8)} · revisión {active.revision} · <strong>Nivel en PostgreSQL: {active.savedLevel}</strong> · <strong>Nivel en la hoja: {input.level}</strong>.
        {active.savedLevel!==input.level?' Hay cambios de nivel sin guardar. Pulsa «Actualizar guardado» cuando la hoja sea válida.':' Los cambios no se guardan automáticamente.'}
      </p>
    </div>}
    {message&&<p role="status" className="save-success">{message}</p>}
    {error&&<p role="alert" className="save-error">{error} Puedes volver a intentarlo con «Actualizar lista».</p>}
    {!valid&&<p className="muted-note">Corrige primero los errores de creación para poder guardar.</p>}
  </section>;
}
