'use client';

export type ManualDeathMarks=Readonly<{successes:readonly [boolean,boolean,boolean];failures:readonly [boolean,boolean,boolean]}>;
export default function SharedDeathSavePanel({marks,onToggle,disabled=false}:{marks?:ManualDeathMarks;onToggle:(kind:'successes'|'failures',index:number)=>void;disabled?:boolean}){
 return <section className="overview-panel panel overview-death-panel" aria-label="Salvaciones de muerte">
  <h3>Salvaciones de muerte</h3>
  <div className="overview-death-markers">{(['successes','failures'] as const).map(kind=><div key={kind} className={`overview-death-track ${kind==='successes'?'is-success':'is-failure'}`}>
   <div className="overview-death-track-heading"><span>{kind==='successes'?'Éxitos':'Fallos'}</span><small>{marks?.[kind].filter(Boolean).length??0}/3</small></div>
   <div className="overview-death-marks" role="group" aria-label={kind==='successes'?'Éxitos':'Fallos'}>{([0,1,2] as const).map(index=>{const checked=marks?.[kind][index]??false;return <button type="button" key={index} className={`overview-death-mark${checked?' is-marked':''}`} aria-pressed={checked} disabled={disabled} aria-label={`${kind==='successes'?'Éxito':'Fallo'} ${index+1}`} onClick={()=>onToggle(kind,index)}><span aria-hidden="true">{checked?(kind==='successes'?'✓':'×'):''}</span></button>;})}</div>
  </div>)}</div><p className="overview-panel-note">Marcadores manuales. No desencadenan reglas automáticas.</p>
 </section>;
}
