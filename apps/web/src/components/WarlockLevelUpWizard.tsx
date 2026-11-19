'use client';
import {useState} from 'react';
import {rollDie} from '../../../../packages/rules-engine/src/dice';
import {WARLOCK_INVOCATIONS,WARLOCK_LEVEL_TWO_INVOCATIONS,type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId} from '../../../../packages/rules-engine/src/warlock';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS} from '../../../../packages/rules-engine/src/warlock-spells';
import {advanceWarlockToLevelTwo} from '../../../../packages/rules-engine/src/warlock-level-up';
import {BACKGROUNDS} from '../../../../packages/rules-engine/src/guided';

type Props={input:GuidedWarlockInput;state:WarlockOneState;onAdvance:(input:GuidedWarlockInput,state:WarlockOneState)=>void;onCancel:()=>void};
const spellPicker=(spells:readonly {id:string;name:string}[])=>spells.map(spell=><option key={spell.id} value={spell.id}>{spell.name}</option>);
export default function WarlockLevelUpWizard({input,state,onAdvance,onCancel}:Props){
 const available=WARLOCK_LEVEL_TWO_INVOCATIONS;
 const [invocations,setInvocations]=useState<WarlockInvocationId[]>(()=>[
  input.invocations[0],...available.filter(id=>id!==input.invocations[0]).slice(0,2)
 ]);
 const [cantrips,setCantrips]=useState<string[]>([...input.cantripIds]);
 const [prepared,setPrepared]=useState<string[]>(()=>[...input.preparedIds,WARLOCK_LEVEL_ONE_SPELLS.find(s=>!input.preparedIds.includes(s.id))!.id]);
 const [hitDie,setHitDie]=useState(5);
 const [hitDieMode,setHitDieMode]=useState<'average'|'rolled'>('average');
 const availableFeats=(['alert','tough'] as const).filter(id=>id!==BACKGROUNDS[input.background].feat&&id!==input.humanFeat);
 const [feat,setFeat]=useState<'alert'|'tough'>(availableFeats[0]??'alert');
 const [error,setError]=useState('');
 const replace=<T extends string>(values:T[],index:number,id:T,change:(values:T[])=>void)=>change(values.map((previous,i)=>i===index?id:previous));
 const next=()=>{
  try{
   const result=advanceWarlockToLevelTwo(input,state,{invocations,cantripIds:cantrips,preparedIds:prepared,level2HitDieRoll:hitDie,
    ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{})});
   onAdvance(result.input,result.state);
  }catch(reason){setError(reason instanceof Error?reason.message:'No se pudo completar la subida de nivel');}
 };
 return <section className="panel warlock-level-up" role="dialog" aria-modal="true" aria-labelledby="warlock-levelup-title">
  <div className="panel-heading"><div><span className="eyebrow">PROGRESIÓN · BRUJO</span><h2 id="warlock-levelup-title">Subir al nivel 2</h2><p>Astucia mágica, tres invocaciones, tres conjuros preparados y dos ranuras de Pacto de nivel 1.</p></div></div>
  <div className="wizard-level-up-grid">
   <div>
    <h3>Invocaciones sobrenaturales · 3</h3><p className="muted-note">Puedes conservar o sustituir la invocación original y elegir dos invocaciones adicionales. No se permiten repeticiones.</p>
    {invocations.map((current,index)=><label key={index} className="field"><span>{index===0?'Invocación inicial (sustituible)':`Invocación adicional ${index+1}`}</span><select value={current} onChange={event=>replace(invocations,index,event.target.value as WarlockInvocationId,setInvocations)}>{available.map(id=><option key={id} value={id}>{WARLOCK_INVOCATIONS[id].name}</option>)}</select><small>{WARLOCK_INVOCATIONS[current].summary}</small></label>)}
    {invocations.includes('lessons_of_the_first_ones')&&<label className="field"><span>Dote de origen de Lecciones de los Primeros</span><select value={feat} disabled={availableFeats.length===0} onChange={event=>setFeat(event.target.value as 'alert'|'tough')}>{availableFeats.map(id=><option key={id} value={id}>{id==='alert'?'Alerta':'Duro'}</option>)}</select><small>{availableFeats.length===0?'Este personaje ya posee las dos dotes incluidas en el catálogo inicial; elige otra invocación.':'No puede repetirse una dote del trasfondo o humana. Catálogo inicial: Alerta y Duro.'}</small></label>}
    {invocations.includes('pact_of_tome')&&<p className="muted-note">Si eliges el Tomo por primera vez, se asignan temporalmente tres trucos y dos rituales válidos. Podrás revisarlos desde el editor del personaje.</p>}
   </div>
   <div>
    <h3>Conjuros y trucos</h3><p className="muted-note">Añade un tercer conjuro preparado. Puedes sustituir como máximo uno de los dos anteriores y uno de tus dos trucos.</p>
    {cantrips.map((id,index)=><label className="field" key={`cantrip-${index}`}><span>Truco {index+1}</span><select value={id} onChange={event=>replace(cantrips,index,event.target.value,setCantrips)}>{spellPicker(WARLOCK_LEVEL_ONE_CANTRIPS)}</select></label>)}
    {prepared.map((id,index)=><label className="field" key={`prepared-${index}`}><span>{index===2?'Nuevo conjuro preparado':`Conjuro preparado ${index+1}`}</span><select value={id} onChange={event=>replace(prepared,index,event.target.value,setPrepared)}>{spellPicker(WARLOCK_LEVEL_ONE_SPELLS)}</select></label>)}
    <h3>Puntos de golpe adicionales</h3><div className="overview-quick-actions"><label className="field"><span>Método de d8</span><select value={hitDieMode} onChange={event=>{const method=event.target.value as 'average'|'rolled';setHitDieMode(method);if(method==='average')setHitDie(5);}}><option value="average">Promedio: 5</option><option value="rolled">Tirar 1d8</option></select></label>{hitDieMode==='rolled'&&<button type="button" onClick={()=>setHitDie(rollDie(8))}>Tirar 1d8</button>}</div>
    <p className="warlock-hit-die-value">Resultado del dado: <strong>{hitDie}</strong> · se suma el modificador de Constitución y los rasgos pasivos.</p>
   </div>
  </div>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="overview-quick-actions"><button type="button" onClick={next}>Confirmar subida al nivel 2</button><button type="button" onClick={onCancel}>Cancelar</button></div>
 </section>;
}
