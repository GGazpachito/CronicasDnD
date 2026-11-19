'use client';
import {useId,useState,type KeyboardEvent} from 'react';

type FieldProps=Readonly<{title:string;current:number;maximum?:number;onAdjust:(delta:number)=>void;onError?:(message:string)=>void}>;
function HealthField({title,current,maximum,onAdjust,onError}:FieldProps){
 const id=useId();const [draft,setDraft]=useState('');
 function adjust(delta:number){onAdjust(delta);setDraft('');}
 function commit(){
  if(!draft.trim())return;
  if(!/^[+-]?\d+$/.test(draft.trim())){onError?.('Introduce un número entero, por ejemplo +5 o -3.');return;}
  const value=Number(draft);
  if(!Number.isSafeInteger(value)||Math.abs(value)>100000){onError?.('El ajuste debe estar entre -100000 y +100000 PG.');return;}
  adjust(value);
 }
 function keydown(event:KeyboardEvent<HTMLInputElement>){
  if(event.key==='Enter'){event.preventDefault();commit();}
  else if(event.key==='Escape'){event.preventDefault();setDraft('');}
  else if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();adjust(event.key==='ArrowUp'?1:-1);}
 }
 return <div className="overview-hp-stat"><label htmlFor={id} className="overview-hp-label">{title}</label>
  <div className="overview-hp-reading" aria-live="polite" aria-atomic="true"><strong>{current}</strong>{maximum!==undefined&&<small> / {maximum}</small>}</div>
  <div className="overview-hp-input-group"><input id={id} type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={draft} placeholder="+5 / -5" aria-label={`Variación de ${title.toLowerCase()}: positivo suma, negativo resta`} onChange={event=>setDraft(event.target.value)} onKeyDown={keydown} onBlur={commit}/>
   <div className="overview-hp-stepper"><button type="button" disabled={maximum!==undefined&&current>=maximum} aria-label={`Aumentar ${title.toLowerCase()} en 1`} onPointerDown={event=>event.preventDefault()} onClick={()=>adjust(1)}>▲</button><button type="button" disabled={current===0&&maximum===undefined} aria-label={`Reducir ${title.toLowerCase()} en 1`} onPointerDown={event=>event.preventDefault()} onClick={()=>adjust(-1)}>▼</button></div>
  </div>
 </div>;
}

/** Misma estructura visual y gestos que los controles de PG de Guerrero. */
export default function SharedHealthControls({current,temporary,maximum,onAdjust,onError}:{current:number;temporary:number;maximum:number;onAdjust:(delta:number,temporary:boolean)=>void;onError?:(message:string)=>void}){
 return <div className="overview-health-inline" aria-label="Ajustar puntos de golpe">
  <div className="overview-health-pair">
   <HealthField title="PG actuales" current={current} maximum={maximum} onAdjust={delta=>onAdjust(delta,false)} onError={onError}/>
   <HealthField title="PG temporales" current={temporary} onAdjust={delta=>onAdjust(delta,true)} onError={onError}/>
  </div>
  <p className="overview-health-hint">Escribe <b>+5</b> o <b>-5</b> y pulsa Intro, o usa las flechas para cambiar 1 PG al instante. El daño consume primero los temporales.</p>
 </div>;
}
