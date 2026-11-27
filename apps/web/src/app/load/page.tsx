"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import Image from "next/image";

type Summary={id:string;revision:number;name:string;level:number;characterClass:"fighter"|"wizard"|"warlock";species?:string;subclass?:string|null;portraitDataUrl?:string;updatedAt:string};

// Consulta reutilizable: no modifica el estado de React.
async function fetchCharacters(signal?:AbortSignal):Promise<Summary[]>{
 const response=await fetch('/api/characters',{cache:'no-store',signal});
 const data=await response.json() as {characters?:Summary[];error?:string};
 if(!response.ok)throw new Error(data.error??`HTTP ${response.status}`);
 return data.characters??[];
}

function getLoadError(error:unknown):string{
 return error instanceof Error?error.message:"No se pudieron cargar los personajes";
}

export default function LoadPage(){
 const [items,setItems]=useState<Summary[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [pendingDeleteId,setPendingDeleteId]=useState<string|null>(null);
 const [deletingId,setDeletingId]=useState<string|null>(null);

 // El estado inicial ya indica "cargando": el efecto no tiene que cambiarlo.
 // Los setState se ejecutan al resolverse la consulta, no sincronicamente.
 useEffect(()=>{
  const controller=new AbortController();
  void fetchCharacters(controller.signal)
   .then(characters=>{
    if(controller.signal.aborted)return;
    setItems(characters);
    setError("");
   })
   .catch(e=>{
    if(!controller.signal.aborted)setError(getLoadError(e));
   })
   .finally(()=>{
    if(!controller.signal.aborted)setLoading(false);
   });
  return ()=>controller.abort();
 },[]);

 // Este cambio de estado ocurre dentro del clic, no dentro de un efecto.
 const reload=async()=>{
  setLoading(true);
  setError("");
  try{setItems(await fetchCharacters());}
  catch(e){setError(getLoadError(e));}
  finally{setLoading(false);}
 };
 const deleteCharacter=async(item:Summary)=>{
  setDeletingId(item.id);setError('');
  try{
   const response=await fetch(`/api/characters/${encodeURIComponent(item.id)}?revision=${item.revision}`,{method:'DELETE'});
   if(!response.ok){const data=await response.json().catch(()=>({})) as {error?:string};throw new Error(data.error??`No se pudo eliminar (${response.status})`);}
   setItems(previous=>previous.filter(character=>character.id!==item.id));
   setPendingDeleteId(null);
  }catch(reason){setError(getLoadError(reason));}
  finally{setDeletingId(null);}
 };
 return <main className="app-shell front-page">
  <header className="topbar"><Link className="wizard-class-link" href="/">← Menú principal</Link><div className="brand"><span className="brand-mark">D20</span><div><strong>CrónicasDnD</strong><span>Personajes guardados</span></div></div></header>
  <div className="front-content front-load-content"><span className="eyebrow">TU CAMPAÑA</span><h1>Cargar personaje</h1><p>Selecciona un aventurero para abrir su hoja Principal, con sus estadísticas y su progreso guardado.</p>
   <div className="front-list-actions"><button type="button" onClick={()=>void reload()} disabled={loading}>Actualizar lista</button><Link href="/create">Crear otro personaje</Link></div>
   {loading&&<p role="status">Consultando PostgreSQL…</p>}
   {error&&<div className="front-error" role="alert"><p>{error}</p><p>Si el personaje se ha modificado en otra ventana, actualiza la lista antes de intentar eliminarlo de nuevo. Si no hay conexión, comprueba la web y PostgreSQL.</p></div>}
   {!loading&&!error&&items.length===0&&<div className="panel front-empty"><h2>No hay personajes guardados</h2><p>Crea uno y utiliza el botón «Guardar como nuevo» para que aparezca aquí.</p></div>}
   {!loading&&items.length>0&&<div className="front-character-grid">
    {items.map(item=><article key={item.id} className="front-character-entry"><Link className="front-character-card" href={`${item.characterClass==='wizard'?'/wizard':item.characterClass==='warlock'?'/warlock':'/fighter'}?character=${encodeURIComponent(item.id)}`} aria-label={`Abrir ${item.name}, ${item.characterClass==='wizard'?'Mago':item.characterClass==='warlock'?'Brujo':'Guerrero'} nivel ${item.level}`}>
     <div className="front-character-portrait">{item.portraitDataUrl?<Image src={item.portraitDataUrl} alt={`Retrato de ${item.name}`} fill sizes="(max-width: 700px) 90vw, 250px" unoptimized/>:<span aria-hidden="true">{item.name.trim().slice(0,1).toLocaleUpperCase('es')||'?'}</span>}</div>
     <div className="front-character-details"><h2>{item.name}</h2><p><strong>{item.characterClass==='wizard'?'Mago':item.characterClass==='warlock'?'Brujo':'Guerrero'} · Nivel {item.level}</strong></p><p>{item.species||'Especie no disponible'}</p><p>{item.subclass||'Sin subclase'}</p><small>Actualizado: {new Date(item.updatedAt).toLocaleDateString('es-ES')}</small></div>
    </Link><div className="front-character-delete">
     {pendingDeleteId===item.id?<div className="front-character-delete-confirm" role="group" aria-label={`Confirmar eliminación de ${item.name}`}><p>¿Eliminar definitivamente a <strong>{item.name}</strong>? Esta acción no se puede deshacer.</p><div className="overview-quick-actions"><button type="button" className="danger-action" disabled={Boolean(deletingId)} onClick={()=>void deleteCharacter(item)}>{deletingId===item.id?'Eliminando…':'Sí, eliminar'}</button><button type="button" disabled={Boolean(deletingId)} onClick={()=>setPendingDeleteId(null)}>Cancelar</button></div></div>:<button type="button" disabled={Boolean(deletingId)} className="danger-action" onClick={()=>{setPendingDeleteId(item.id);setError('');}}>Eliminar personaje</button>}
    </div></article>)}
   </div>}
  </div>
 </main>;
}
