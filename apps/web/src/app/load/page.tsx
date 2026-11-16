"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import Image from "next/image";

type Summary={id:string;name:string;level:number;characterClass:"fighter"|"wizard";species?:string;subclass?:string|null;portraitDataUrl?:string;updatedAt:string};

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
 return <main className="app-shell front-page">
  <header className="topbar"><Link className="wizard-class-link" href="/">← Menú principal</Link><div className="brand"><span className="brand-mark">D20</span><div><strong>CRÓNICAS</strong><span>Personajes guardados</span></div></div></header>
  <div className="front-content front-load-content"><span className="eyebrow">TU CAMPAÑA</span><h1>Cargar personaje</h1><p>Selecciona un aventurero para abrir su hoja Principal, con sus estadísticas y su progreso guardado.</p>
   <div className="front-list-actions"><button type="button" onClick={()=>void reload()} disabled={loading}>Actualizar lista</button><Link href="/create">Crear otro personaje</Link></div>
   {loading&&<p role="status">Consultando PostgreSQL…</p>}
   {error&&<div className="front-error" role="alert"><p>{error}</p><p>Comprueba que PostgreSQL y la web estén iniciados.</p></div>}
   {!loading&&!error&&items.length===0&&<div className="panel front-empty"><h2>No hay personajes guardados</h2><p>Crea uno y utiliza el botón «Guardar como nuevo» para que aparezca aquí.</p></div>}
   {!loading&&!error&&items.length>0&&<div className="front-character-grid">
    {items.map(item=><Link key={item.id} className="front-character-card" href={`${item.characterClass==='wizard'?'/wizard':'/fighter'}?character=${encodeURIComponent(item.id)}`} aria-label={`Abrir ${item.name}, ${item.characterClass==='wizard'?'Mago':'Guerrero'} nivel ${item.level}`}>
     <div className="front-character-portrait">{item.portraitDataUrl?<Image src={item.portraitDataUrl} alt={`Retrato de ${item.name}`} fill sizes="(max-width: 700px) 90vw, 250px" unoptimized/>:<span aria-hidden="true">{item.name.trim().slice(0,1).toLocaleUpperCase('es')||'?'}</span>}</div>
     <div className="front-character-details"><h2>{item.name}</h2><p><strong>{item.characterClass==='wizard'?'Mago':'Guerrero'} · Nivel {item.level}</strong></p><p>{item.species||'Especie no disponible'}</p><p>{item.subclass||'Sin subclase'}</p><small>Actualizado: {new Date(item.updatedAt).toLocaleDateString('es-ES')}</small></div>
    </Link>)}
   </div>}
  </div>
 </main>;
}
