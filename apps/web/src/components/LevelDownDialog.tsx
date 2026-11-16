'use client';

import {useEffect,useRef,useState} from 'react';
import type {LevelDownSummary} from '../../../../packages/rules-engine/src/level-down';

type Props=Readonly<{
 preview:LevelDownSummary|null;
 error?:string;
 onClose:()=>void;
 onConfirm:()=>void;
}>;

/** Una sola ventana para todas las clases. Las reglas concretas se preparan
 * fuera de la interfaz y se confirman con una transacción validada.
 */
export default function LevelDownDialog({preview,error,onClose,onConfirm}:Props){
 const dialogRef=useRef<HTMLElement>(null);
 const closeRef=useRef(onClose);
 const [accepted,setAccepted]=useState(false);
 const [failure,setFailure]=useState('');
 useEffect(()=>{closeRef.current=onClose;},[onClose]);
 useEffect(()=>{
  dialogRef.current?.focus();
  function key(event:KeyboardEvent){if(event.key==='Escape')closeRef.current();}
  document.addEventListener('keydown',key);
  return ()=>document.removeEventListener('keydown',key);
 },[]);
 function confirm(){
  if(!preview||!accepted)return;
  try{onConfirm();}catch(e){setFailure(e instanceof Error?e.message:'No se ha podido bajar el nivel');}
 }
 return <div className="level-wizard-backdrop">
  <section className="level-wizard" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="level-down-title" aria-describedby="level-down-description">
   <header className="level-wizard-top"><div>
    <span className="eyebrow">PROGRESIÓN · RETROCESO DE NIVEL</span>
    <h2 id="level-down-title">Bajar {preview?.className??'personaje'} del nivel {preview?.fromLevel??'?'} al {preview?.toLevel??'?'}</h2>
    <p id="level-down-description">Revisa lo que perderás y cómo cambiará la ficha. No se aplica nada hasta pulsar Confirmar.</p>
   </div><button type="button" className="level-wizard-close" aria-label="Cerrar ventana sin cambios" onClick={onClose}>×</button></header>
   <div className="level-wizard-body level-down-content">
    {preview?<>
     <section className="level-wizard-section" aria-label="Rasgos y elecciones que se pierden">
      <h3>Rasgos y elecciones que se pierden</h3>
      {preview.lost.length?<ul className="level-wizard-milestones">{preview.lost.map((item,index)=><li key={`${item.title}-${index}`}><strong>{item.title}</strong><p className="level-wizard-explanation">{item.description}</p></li>)}</ul>
       :<p className="level-wizard-note">Este nivel no concede rasgos nuevos que retirar.</p>}
     </section>
     <section className="level-wizard-section" aria-label="Cambios en estadísticas y recursos">
      <h3>Estadísticas y recursos que cambiarán</h3>
      <ul className="level-wizard-milestones">{preview.changes.map((item,index)=><li key={`${item.title}-${index}`}><strong>{item.title}</strong><p className="level-wizard-explanation">{item.description}</p></li>)}</ul>
     </section>
     <section className="level-wizard-section"><h3>Información que se conserva</h3>
      <ul className="level-down-preserved">{preview.preserved.map(item=><li key={item}>{item}</li>)}</ul>
      <p className="muted-note">El cambio se realiza en la ficha local. Para actualizar PostgreSQL, pulsa «Guardar cambios». Si quieres conservar ambos niveles, guarda antes una copia independiente.</p>
     </section>
     <label className="level-down-acknowledge"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/><span>He revisado los cambios y quiero volver al nivel {preview.toLevel}.</span></label>
    </>:<p className="level-wizard-error" role="alert">{error??'La hoja o la sesión no permiten calcular un retroceso seguro. Revisa los datos antes de continuar.'}</p>}
    {failure&&<p className="level-wizard-error" role="alert">{failure}</p>}
   </div>
   <footer className="level-wizard-actions"><button type="button" className="level-wizard-cancel" onClick={onClose}>Cancelar, no cambiar nada</button>
    <div className="level-wizard-actions-right"><button type="button" disabled={!preview||!accepted} onClick={confirm}>Confirmar bajada al nivel {preview?.toLevel??'anterior'}</button></div>
   </footer>
  </section>
 </div>;
}
