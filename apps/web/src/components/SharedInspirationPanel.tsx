'use client';
import type {ReactNode} from 'react';

/** El bloque visible es idéntico para todas las clases. Solo difiere la persistencia de su estado. */
export default function SharedInspirationPanel({checked,onChange,disabled=false,children}:{checked:boolean;onChange:(checked:boolean)=>void;disabled?:boolean;children?:ReactNode}){
 return <section className="overview-panel panel overview-inspiration-panel" aria-label="Inspiración heroica">
  <h3>Inspiración heroica</h3>
  <label className={`overview-inspiration-toggle${checked?' is-active':''}${disabled?' is-disabled':''}`}>
   <input type="checkbox" checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked)}/>
   <span className="overview-inspiration-symbol" aria-hidden="true">✦</span>
   <span className="overview-inspiration-label"><strong>{disabled?'Partida no disponible':checked?'Inspiración disponible':'Sin inspiración'}</strong><small>{checked?'Marcada · pulsa para gastar':'Márcala cuando la consigas'}</small></span>
   <span className="overview-inspiration-check" aria-hidden="true">{checked?'✓':''}</span>
  </label>
  <p className="overview-panel-note">El jugador o DM decide cuándo se recibe. Al gastarla, repite el dado y usa el nuevo resultado. No se lanza automáticamente.</p>
  {children}
 </section>;
}
