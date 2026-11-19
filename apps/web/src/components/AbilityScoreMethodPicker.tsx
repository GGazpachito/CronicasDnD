'use client';

import {useState} from 'react';
import {ABILITIES,type Ability,type AbilityScores} from '../../../../packages/rules-engine/src/abilities';
import {DEFAULT_POINT_BUY,POINT_BUY_BUDGET,POINT_BUY_COSTS,pointBuySpent,rollAbilityScore4d6,type AbilityGenerationMethod} from '../../../../packages/rules-engine/src/ability-generation';

const NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};
const STANDARD_VALUES=[15,14,13,12,10,8] as const;
const STANDARD_DEFAULT:AbilityScores={strength:15,dexterity:14,constitution:13,intelligence:10,wisdom:12,charisma:8};
type RollInfo=ReturnType<typeof rollAbilityScore4d6>;
type Props=Readonly<{method:AbilityGenerationMethod;scores:AbilityScores;onChange:(method:AbilityGenerationMethod,scores:AbilityScores)=>void;className?:string}>;

/** Selector único de las tres clases: no persiste el historial de dados, solo las puntuaciones. */
export default function AbilityScoreMethodPicker({method,scores,onChange,className}:Props){
 const [lastRolls,setLastRolls]=useState<Partial<Record<Ability,RollInfo>>>({});
 const remaining=POINT_BUY_BUDGET-(method==='point_buy'?pointBuySpent(scores):0);
 function rollAll(){
  const rolls={} as Record<Ability,RollInfo>;
  const next={} as Record<Ability,number>;
  for(const ability of ABILITIES){const result=rollAbilityScore4d6();rolls[ability]=result;next[ability]=result.total;}
  setLastRolls(rolls);onChange('roll_4d6',next);
 }
 function rollOne(ability:Ability){
  const result=rollAbilityScore4d6();setLastRolls(previous=>({...previous,[ability]:result}));
  onChange('roll_4d6',{...scores,[ability]:result.total});
 }
 function changeMethod(next:AbilityGenerationMethod){
  if(next==='roll_4d6'){rollAll();return;}
  setLastRolls({});
  onChange(next,next==='point_buy'?DEFAULT_POINT_BUY:STANDARD_DEFAULT);
 }
 function setScore(ability:Ability,value:number){onChange(method,{...scores,[ability]:value});}
 function canIncrease(ability:Ability){
  const value=scores[ability];
  return value<15&&remaining>=POINT_BUY_COSTS[value+1]-POINT_BUY_COSTS[value];
 }
 return <div className={`ability-method-picker ${className??''}`}>
  <label className="field"><span>Método de características iniciales</span>
   <select aria-label="Método de características" value={method} onChange={event=>changeMethod(event.target.value as AbilityGenerationMethod)}>
    <option value="standard_array">Matriz estándar (15, 14, 13, 12, 10, 8)</option>
    <option value="point_buy">Compra de puntos · 27 puntos</option>
    <option value="roll_4d6">Tirar 4d6 y descartar el dado menor · D&D 2024</option>
    {method==='d20'&&<option value="d20">Tirada d20 de un guardado anterior (legado)</option>}
   </select>
  </label>
  {method==='point_buy'&&<p className="ability-method-budget" role="status">Puntos disponibles: <strong>{remaining} / {POINT_BUY_BUDGET}</strong><small> · Gastados: {POINT_BUY_BUDGET-remaining}</small></p>}
  {method==='roll_4d6'&&<><p className="muted-note">Cada puntuación es la suma de los tres dados más altos de cuatro d6. Los dados se muestran tras cada tirada; las puntuaciones quedan guardadas con el personaje.</p>
   <button className="ability-method-roll" type="button" onClick={rollAll}>Tirar de nuevo los seis grupos de 4d6</button></>}
  {method==='d20'&&<p className="muted-note" role="status">Este personaje conserva tiradas de d20 de la versión anterior. Para generar puntuaciones nuevas, selecciona el método oficial de 4d6.</p>}
  <div className="wizard-score-grid" aria-label="Puntuaciones de características">
   {ABILITIES.map(ability=>{
    const value=scores[ability];const roll=lastRolls[ability];
    return <div key={ability} className="field"><span>{NAMES[ability]}</span>
     {method==='point_buy'?<div className="ability-method-stepper">
      <button type="button" aria-label={`Reducir ${NAMES[ability]}`} disabled={value<=8} onClick={()=>setScore(ability,value-1)}>▼</button>
      <output aria-label={`Puntuación de ${NAMES[ability]}`}>{value}</output>
      <button type="button" aria-label={`Aumentar ${NAMES[ability]}`} disabled={!canIncrease(ability)} onClick={()=>setScore(ability,value+1)}>▲</button>
     </div>:method==='roll_4d6'?<>
      <div className="ability-method-die"><output aria-label={`Resultado de ${NAMES[ability]}`}>{value}</output><button type="button" onClick={()=>rollOne(ability)} aria-label={`Volver a tirar 4d6 para ${NAMES[ability]}`}>Tirar 4d6</button></div>
      {roll&&<small className="ability-method-roll-detail">Dados: {roll.dice.join(' · ')} · descartado {roll.discarded}</small>}
     </>:method==='d20'?<output className="ability-method-legacy-score">{value}</output>:<select aria-label={NAMES[ability]} value={value} onChange={event=>setScore(ability,Number(event.target.value))}>{STANDARD_VALUES.map(score=><option key={score} value={score}>{score}</option>)}</select>}
    </div>;
   })}
  </div>
  {method==='standard_array'&&<p className="muted-note">Distribuye cada valor una sola vez. La hoja valida la matriz al guardar.</p>}
  {method==='point_buy'&&<p className="muted-note">Todas comienzan en 8. Las flechas respetan el máximo de 15 y descuentan automáticamente los costes crecientes del presupuesto de 27 puntos.</p>}
 </div>;
}
