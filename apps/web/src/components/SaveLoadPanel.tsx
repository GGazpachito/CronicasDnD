"use client";

import {useEffect,useRef,useState} from "react";

/** Único módulo de guardado para cualquier clase. Las cargas se hacen desde /load.
 * Cada hoja recibe su validador de guardado y su adaptador de estado: nunca se
 * interpreta la sesión de un Mago como la de un Guerrero.
 */
type CharacterClass="fighter"|"wizard";
type SnapshotLike={readonly input:{readonly level:number;readonly name:string}};
type SaveProps<T extends SnapshotLike>={
  snapshot:T|null;
  characterClass:CharacterClass;
  validate:(raw:unknown)=>T;
  onLoad:(snapshot:T)=>void;
  normalize?:(snapshot:T)=>T;
  onPendingChange?:(pending:boolean)=>void;
};
type RecordSummary={id:string;revision:number;level:number;name:string;characterClass:CharacterClass};
async function decode<T>(response:Response):Promise<T>{
  const value=await response.json().catch(()=>({})) as {error?:string};
  if(!response.ok)throw new Error(value.error??`Error HTTP ${response.status}`);
  return value as T;
}
export default function SaveLoadPanel<T extends SnapshotLike>({snapshot,characterClass,validate,onLoad,normalize,onPendingChange}:SaveProps<T>){
  const [active,setActive]=useState<{id:string;revision:number}|null>(null);
  const [savedFingerprint,setSavedFingerprint]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const fingerprint=snapshot?JSON.stringify(snapshot):null;
  const pending=active!==null?(fingerprint===null||fingerprint!==savedFingerprint):snapshot!==null;
  const loaders=useRef({validate,onLoad,normalize});
  const pendingListener=useRef(onPendingChange);
  useEffect(()=>{loaders.current={validate,onLoad,normalize};},[validate,onLoad,normalize]);
  useEffect(()=>{pendingListener.current=onPendingChange;},[onPendingChange]);
  useEffect(()=>{pendingListener.current?.(pending);},[pending]);
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get("character");
    if(!id){void Promise.resolve().then(()=>setLoading(false));return;}
    const controller=new AbortController();
    (async()=>{
      try{
        const data=await decode<{character:RecordSummary&{snapshot:unknown}}>(await fetch(`/api/characters/${encodeURIComponent(id)}`,{cache:"no-store",signal:controller.signal}));
        if(controller.signal.aborted)return;
        const entity=data.character;
        if(entity.characterClass!==characterClass)throw new Error("La clase del guardado no corresponde a esta hoja.");
        const restored=loaders.current.validate(entity.snapshot);
        if(restored.input.level!==entity.level)throw new Error("El nivel guardado no coincide con los datos del personaje.");
        loaders.current.onLoad(restored);
        setActive({id:entity.id,revision:entity.revision});
        setSavedFingerprint(JSON.stringify(loaders.current.normalize?loaders.current.normalize(restored):restored));
        setMessage(`Personaje «${entity.name}» cargado.`);
      }catch(reason){if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"No se pudo cargar el personaje");}
      finally{if(!controller.signal.aborted)setLoading(false);}
    })();
    return ()=>controller.abort();
  },[characterClass]);
  useEffect(()=>{
    if(!pending)return;
    const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",guard);
    return ()=>window.removeEventListener("beforeunload",guard);
  },[pending]);
  async function save(){
    if(!snapshot||busy||loading)return;
    setBusy(true);setError("");setMessage("");
    try{
      const target=active?`/api/characters/${encodeURIComponent(active.id)}`:"/api/characters";
      const response=await fetch(target,{method:active?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(active?{revision:active.revision,snapshot}:{snapshot})});
      const data=await decode<{character:RecordSummary}>(response);
      if(data.character.characterClass!==characterClass||data.character.level!==snapshot.input.level)throw new Error("La respuesta del guardado no coincide con esta clase y nivel.");
      setActive({id:data.character.id,revision:data.character.revision});
      setSavedFingerprint(JSON.stringify(snapshot));
      setMessage(active?"Cambios guardados correctamente.":"Personaje creado y guardado correctamente.");
      // El menú /load consultará de nuevo la base de datos; no dependemos de una recarga posterior.
    }catch(reason){setError(reason instanceof Error?reason.message:"No se pudo guardar el personaje");}
    finally{setBusy(false);}
  }
  return <section className="save-panel panel character-save-only" aria-label="Guardar personaje">
    <div className="save-panel-head"><div><span className="eyebrow">CAMBIOS DEL PERSONAJE</span><h2>Guardado</h2></div><span className="save-label">PostgreSQL</span></div>
    <div className="save-only-controls">
      <p role="status" className={pending?"play-warning":"muted-note"}>{loading?"Recuperando personaje…":active?(pending?"Cambios sin guardar.":"Guardado al día."):"Personaje nuevo: todavía no está guardado."}</p>
      <button type="button" onClick={()=>void save()} disabled={busy||loading||!snapshot||Boolean(active&&!pending)}>{busy?"Guardando…":active?"Guardar cambios":"Guardar personaje"}</button>
    </div>
    {message&&<p className="save-success" role="status">{message}</p>}
    {error&&<p className="save-error" role="alert">{error}</p>}
    {!snapshot&&<p className="muted-note">Revisa las elecciones o sincroniza la partida para habilitar el guardado.</p>}
  </section>;
}
