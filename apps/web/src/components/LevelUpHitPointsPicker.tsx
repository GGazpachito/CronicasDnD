'use client';

import {useState} from 'react';
import {rollDie} from '../../../../packages/rules-engine/src/dice';
import {CLASS_HIT_DICE,type HitDieClass} from '../../../../packages/rules-engine/src/level-hit-points';

type Props=Readonly<{characterClass:HitDieClass;value:number;onChange:(value:number)=>void}>;

/** Único control de PG, colocado en la fase Elecciones del asistente común. */
export default function LevelUpHitPointsPicker({characterClass,value,onChange}:Props){
 const {sides,average}=CLASS_HIT_DICE[characterClass];
 const [method,setMethod]=useState<'average'|'rolled'>('average');
 const roll=()=>onChange(rollDie(sides));
 return <fieldset className="level-wizard-fieldset level-wizard-hit-points">
  <legend>Puntos de golpe adicionales</legend>
  <p className="level-wizard-explanation">Elige el promedio de tu dado de golpe o tira 1d{sides}. Se añadirá Constitución (mínimo 1 PG por nivel) y las bonificaciones de rasgos que correspondan.</p>
  <label className="field"><span>Método de obtención</span><select value={method} onChange={event=>{
   const next=event.target.value as 'average'|'rolled';setMethod(next);onChange(next==='average'?average:rollDie(sides));
  }}><option value="average">Promedio · {average} PG</option><option value="rolled">Tirada · 1d{sides}</option></select></label>
  {method==='rolled'&&<div className="overview-quick-actions"><button type="button" onClick={roll}>Volver a tirar 1d{sides}</button><span className="muted-note">El resultado solo se guarda al confirmar la subida.</span></div>}
  <p className="level-wizard-choice-info"><strong>Resultado elegido: {value}</strong> {method==='average'?`Valor fijo del d${sides}`:`Tirada de 1d${sides}`}</p>
 </fieldset>;
}
