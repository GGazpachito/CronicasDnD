'use client';

import {ABILITIES,type Ability,type AbilityScores} from '../../../../packages/rules-engine/src/abilities';
import {DEFAULT_POINT_BUY,POINT_BUY_BUDGET,pointBuySpent,rollD20AbilityScores,type AbilityGenerationMethod} from '../../../../packages/rules-engine/src/ability-generation';
import {rollDie} from '../../../../packages/rules-engine/src/dice';

const NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const STANDARD_VALUES=[15,14,13,12,10,8] as const;
const STANDARD_DEFAULT:AbilityScores={strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8};
type Props=Readonly<{
 method:AbilityGenerationMethod;
 scores:AbilityScores;
 onChange:(method:AbilityGenerationMethod,scores:AbilityScores)=>void;
 /** Opcional: información adicional sobre el aumento por trasfondo en la pantalla anfitriona. */
 className?:string;
}>;

export default function AbilityScoreMethodPicker({method,scores,onChange,className}:Props){
 const spent=method==='point_buy'?pointBuySpent(scores):0;
 const remaining=POINT_BUY_BUDGET-spent;
 function changeMethod(next:AbilityGenerationMethod){
  onChange(next,next==='standard_array'?STANDARD_DEFAULT:next==='point_buy'?DEFAULT_POINT_BUY:rollD20AbilityScores());
 }
 function setScore(ability:Ability,value:number){onChange(method,{...scores,[ability]:value});}
 return <div className={`ability-method-picker ${className??''}`}>
  <label className="field"><span>Método de características iniciales</span>
   <select aria-label="Método de características" value={method} onChange={event=>changeMethod(event.target.value as AbilityGenerationMethod)}>
    <option value="standard_array">Matriz estándar (15, 14, 13, 12, 10, 8)</option>
    <option value="point_buy">Compra de puntos · 27 puntos</option>
    <option value="d20">Tirar 1d20 por característica · regla personalizada</option>
   </select>
  </label>
  {method==='point_buy'&&<p className="ability-method-budget" role="status">Puntos gastados: <strong>{spent} / {POINT_BUY_BUDGET}</strong> · Restantes: <strong>{remaining}</strong>{remaining<0?' · Excedes el límite':''}</p>}
  {method==='d20'&&<><p className="muted-note">Método personalizado: se tira un d20 independiente por característica (no es el método oficial 4d6). Los valores quedan guardados. Si una mejora de trasfondo supera 20, vuelve a tirar esa característica.</p>
   <button className="ability-method-roll" type="button" onClick={()=>onChange(method,rollD20AbilityScores())}>Tirar los seis d20 de nuevo</button></>}
  <div className="wizard-score-grid" aria-label="Puntuaciones de características">
   {ABILITIES.map(ability=><label key={ability} className="field"><span>{NAMES[ability]}</span>
    {method==='d20'?<span className="ability-method-die"><output aria-label={`Resultado de ${NAMES[ability]}`}>{scores[ability]}</output><button type="button" aria-label={`Volver a tirar ${NAMES[ability]}`} onClick={()=>setScore(ability,rollDie(20))}>Tirar d20</button></span>
    :<select aria-label={NAMES[ability]} value={scores[ability]} onChange={event=>setScore(ability,Number(event.target.value))}>
     {(method==='standard_array'?STANDARD_VALUES:[8,9,10,11,12,13,14,15]).map(value=><option value={value} key={value}>{value}</option>)}
    </select>}
   </label>)}
  </div>
  {method==='standard_array'&&<p className="muted-note">Reparte cada valor una sola vez. Las repeticiones se señalan al validar la ficha.</p>}
  {method==='point_buy'&&<p className="muted-note">Cada característica comienza en 8. Puedes subirla hasta 15 antes del trasfondo; los valores 14 y 15 cuestan 7 y 9 puntos. Se permiten puntos sin gastar.</p>}
 </div>;
}
