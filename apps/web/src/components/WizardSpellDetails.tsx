'use client';
import {useState} from 'react';
import {rollD20,type D20Mode} from '../../../../packages/rules-engine/src/d20';
import {rollSpellDice} from '../../../../packages/rules-engine/src/spell-dice';
import {spellDiceForCharacter,type WizardSpellRule} from '../../../../packages/rules-engine/src/wizard-spell-details';

const SCHOOL_NAMES:Record<string,string>={abjuration:'Abjuración',conjuration:'Conjuración',divination:'Adivinación',enchantment:'Encantamiento',evocation:'Evocación',illusion:'Ilusión',necromancy:'Nigromancia',transmutation:'Transmutación'};
function presentCast(value:string){return value.replace(/Bonus Action/gi,'Acción adicional').replace(/Reaction/gi,'Reacción').replace(/Action/gi,'Acción').replace(/Ritual/gi,'Ritual').replace(/l minute|1 minute/gi,'1 minuto').replace(/l hour|1 hour/gi,'1 hora');}
function presentRange(value:string){return value.replace(/Self/gi,'Personal').replace(/Touch/gi,'Toque').replace(/(\d+) feet/gi,'$1 pies');}
function presentDuration(value:string){return value.replace(/Concentration/gi,'Concentración').replace(/Instantaneous/gi,'Instantánea').replace(/up to/gi,'hasta').replace(/minute/gi,'minuto').replace(/hour/gi,'hora').replace(/round/gi,'asalto').replace(/Until dispelled/gi,'Hasta disipación');}
export type WizardSpellDetailsProps=Readonly<{spell:WizardSpellRule;characterLevel:number;spellAttackBonus:number;mode:D20Mode;showTitle?:boolean}>;
/** Un mismo desplegable con reglas y tiradas para el asistente y la pestaña Hechizos. */
export default function WizardSpellDetails({spell,characterLevel,spellAttackBonus,mode,showTitle=false}:WizardSpellDetailsProps){
 const [result,setResult]=useState('');
 function rollAttack(){try{const r=rollD20(spellAttackBonus,mode);setResult(`Ataque mágico: ${r.dice.join(' / ')} ${spellAttackBonus>=0?'+':'−'} ${Math.abs(spellAttackBonus)} = ${r.total}`);}catch(e){setResult(e instanceof Error?e.message:'Error de tirada');}}
 function rollDice(formula:string,label:string){try{const r=rollSpellDice(formula);setResult(`${label}: [${r.dice.join(', ')}] ${r.modifier===0?'':r.modifier>0?`+ ${r.modifier}`:`− ${-r.modifier}`} = ${r.total}`);}catch(e){setResult(e instanceof Error?e.message:'Error de tirada');}}
 return <details className="wizard-spell-details">
  <summary>{showTitle?`${spell.name} · `:''}Ver reglas y tiradas</summary>
  <div className="wizard-spell-details-body">
   <p className="wizard-spell-full-text">{spell.description}</p>
   <div className="wizard-spell-facts">
    <span><strong>Escuela</strong>{SCHOOL_NAMES[spell.school]??spell.school}</span>
    {spell.castingTime&&<span><strong>Lanzamiento</strong>{presentCast(spell.castingTime)}</span>}
    {spell.range&&<span><strong>Alcance</strong>{presentRange(spell.range)}</span>}
    {spell.components&&<span><strong>Componentes</strong>{spell.components}</span>}
    {spell.duration&&<span><strong>Duración</strong>{presentDuration(spell.duration)}</span>}
    {spell.ritual&&<span><strong>Ritual</strong>Sí</span>}
   </div>
   {(spell.attack||spell.rolls.length>0)&&<div className="wizard-spell-rolls" aria-label={`Tiradas de ${spell.name}`}>
    {spell.attack&&<button type="button" onClick={rollAttack}>Tirar ataque mágico · d20</button>}
    {spell.rolls.map((roll,index)=>{
      const formula=spellDiceForCharacter(roll.formula,spell.cantripScales&&roll.scales!==false,characterLevel);
      return <button type="button" key={`${spell.id}-${index}`} onClick={()=>rollDice(formula,roll.label)}>{roll.label} · {formula}</button>;
    })}
   </div>}
   {result&&<output className="wizard-spell-result" aria-live="polite">{result}</output>}
   <p className="muted-note">Resumen de consulta basado en el Manual del Jugador 2024{spell.sourcePage?` (p. ${spell.sourcePage})`:''}. Para condiciones, escalados y excepciones no resumidos, consulta la regla completa del manual. Las tiradas no gastan ranuras ni aplican efectos automáticamente.</p>
  </div>
 </details>;
}
