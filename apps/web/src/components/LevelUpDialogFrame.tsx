'use client';
import {useEffect,useRef,type ReactNode} from 'react';
type Step=0|1|2;
type Props=Readonly<{
 eyebrow:string;title:string;subtitle:string;stage:Step;onClose:()=>void;
 children:ReactNode;footer:ReactNode;
}>;
/** Contenedor accesible compartido por todos los asistentes de nivel. */
export default function LevelUpDialogFrame({eyebrow,title,subtitle,stage,onClose,children,footer}:Props){
 const dialogRef=useRef<HTMLElement>(null);
 const onCloseRef=useRef(onClose);
 useEffect(()=>{onCloseRef.current=onClose;},[onClose]);
 useEffect(()=>{
  dialogRef.current?.focus();
  function onKey(event:KeyboardEvent){if(event.key==='Escape')onCloseRef.current();}
  document.addEventListener('keydown',onKey);
  return ()=>document.removeEventListener('keydown',onKey);
 },[]);
 return <div className="level-wizard-backdrop">
  <section className="level-wizard" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="shared-level-wizard-title">
   <header className="level-wizard-top"><div><span className="eyebrow">{eyebrow}</span><h2 id="shared-level-wizard-title">{title}</h2><p>{subtitle}</p></div><button type="button" className="level-wizard-close" onClick={onClose} aria-label="Cerrar asistente">×</button></header>
   <nav className="level-wizard-steps" aria-label="Pasos de subida de nivel">{(['Novedades','Elecciones','Confirmación'] as const).map((label,index)=><span key={label} className={stage===index?'is-current':stage>index?'is-done':''} aria-current={stage===index?'step':undefined}><b>{index+1}</b>{label}</span>)}</nav>
   <div className="level-wizard-body">{children}</div>
   <footer className="level-wizard-actions">{footer}</footer>
  </section>
 </div>;
}
