'use client';

/** Extensión de Brujo Infernal: nunca altera automáticamente el resultado de un d20. */
export default function WarlockLuckPanel({maximum,used,lastRoll,onUse}:Readonly<{
 maximum:number;used:number;lastRoll:number|null;onUse:()=>void;
}>){
 const remaining=Math.max(0,maximum-used);
 return <div className="wizard-module" aria-label="Suerte del Oscuro">
  <h4>Suerte del Oscuro · 1d10</h4>
  <p className="overview-panel-note">Después de ver el d20 de una prueba de característica o salvación, decide si quieres sumar 1d10, antes de resolver el efecto. Solo una vez por tirada; no sirve para ataques.</p>
  <div className="overview-record"><span>Usos restantes · descanso largo</span><strong>{remaining}/{maximum}</strong></div>
  <button type="button" className="overview-roll-button" disabled={remaining===0} onClick={onUse}>
   {remaining>0?'Tirar 1d10 y consumir un uso':'Usos agotados · descansa'}
  </button>
  {lastRoll!==null&&<output role="status" className="overview-roll-result">
   <div className="overview-roll-result-heading"><strong>Bonificación opcional</strong><span>1d10 · Suerte del Oscuro</span></div>
   <div className="overview-roll-equation"><div className="overview-roll-dice"><span className="overview-die is-chosen">{lastRoll}</span></div>
    <div className="overview-roll-formula">+ <strong>{lastRoll}</strong></div></div>
   <small>Suma +{lastRoll} a la prueba o salvación que hayas elegido; el total del d20 original no cambia automáticamente.</small>
  </output>}
 </div>;
}
