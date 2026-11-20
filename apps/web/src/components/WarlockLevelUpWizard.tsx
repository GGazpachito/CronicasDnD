'use client';

import {useMemo,useRef,useState} from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import type {FighterAbilityImprovement} from '../../../../packages/rules-engine/src/progression';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import {BACKGROUNDS} from '../../../../packages/rules-engine/src/guided';
import {
 WARLOCK_INVOCATIONS,WARLOCK_LEVEL_TWO_INVOCATIONS,calculateWarlockOne,
 type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId,
} from '../../../../packages/rules-engine/src/warlock';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_TWO,WARLOCK_FIEND_LEVEL_THREE_SPELLS,WARLOCK_FIEND_LEVEL_THREE_IDS} from '../../../../packages/rules-engine/src/warlock-spells';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour} from '../../../../packages/rules-engine/src/warlock-level-up';
import LevelUpDialogFrame from './LevelUpDialogFrame';
import LevelUpHitPointsPicker from './LevelUpHitPointsPicker';
import WizardSpellDetails from './WizardSpellDetails';

type Props=Readonly<{
 input:GuidedWarlockInput;state:WarlockOneState;mode:D20Mode;
 onAdvance:(input:GuidedWarlockInput,state:WarlockOneState)=>void;onCancel:()=>void;
}>;

function toggleLimited(values:readonly string[],id:string,max:number):string[]{
 return values.includes(id)?values.filter(value=>value!==id):values.length<max?[...values,id]:[...values];
}
const ABILITY_NAMES:Record<Ability,string>={strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'};

/** Usa el MISMO marco, navegación, fieldsets y fichas mágicas del Mago.
 * Solo las reglas de elecciones y la validación pertenecen a Brujo.
 */
export default function WarlockLevelUpWizard({input,state,mode,onAdvance,onCancel}:Props){
 const third=input.level===2;
 const fourth=input.level===3;
 const nextLevel=fourth?4:third?3:2;
 const spellOptions=third||fourth?WARLOCK_SPELLS_THROUGH_LEVEL_TWO:WARLOCK_LEVEL_ONE_SPELLS;
 const preparedCount=fourth?5:third?4:3;
 const cantripCount=fourth?3:2;
 const [stage,setStage]=useState<0|1|2>(0);
 const [invocations,setInvocations]=useState<WarlockInvocationId[]>(()=>third||fourth?[...input.invocations]:[
  input.invocations[0],...WARLOCK_LEVEL_TWO_INVOCATIONS.filter(id=>id!==input.invocations[0]).slice(0,2),]);
 const [cantrips,setCantrips]=useState<string[]>(()=>fourth?[...input.cantripIds,WARLOCK_LEVEL_ONE_CANTRIPS.find(spell=>!input.cantripIds.includes(spell.id))!.id]:[...input.cantripIds]);
 const [prepared,setPrepared]=useState<string[]>(()=>[
  ...input.preparedIds,spellOptions.find(spell=>!input.preparedIds.includes(spell.id)&&(!third||spell.level===2)&&(!(third||fourth)||!(WARLOCK_FIEND_LEVEL_THREE_IDS as readonly string[]).includes(spell.id)))!.id,
 ]);
 const [hitDieRoll,setHitDieRoll]=useState(5);
 const availableFeats=(['alert','tough'] as const).filter(id=>id!==BACKGROUNDS[input.background].feat&&id!==input.humanFeat);
 const [feat,setFeat]=useState<'alert'|'tough'>(input.lessonsFeat??availableFeats[0]??'alert');
 const current=useMemo(()=>calculateWarlockOne(input,state),[input,state]);
 const [improvement,setImprovement]=useState<FighterAbilityImprovement>({mode:'plus_two',first:current.abilityScores.charisma<=18?'charisma':'constitution'});
 const [spellFilter,setSpellFilter]=useState('');
 const [commitError,setCommitError]=useState('');
 const submitting=useRef(false);
 const choice=useMemo(()=>{
  try{return {result:fourth?advanceWarlockToLevelFour(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level4HitDieRoll:hitDieRoll,level4Improvement:improvement,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):third?advanceWarlockToLevelThree(input,state,{
   subclassId:'fiend',invocations,cantripIds:cantrips,preparedIds:prepared,level3HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):advanceWarlockToLevelTwo(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level2HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }),error:''};}
  catch(error){return {result:null,error:error instanceof Error?error.message:'Elecciones de Brujo incompletas'};}
 },[input,state,invocations,cantrips,prepared,hitDieRoll,feat,improvement,third,fourth]);
 const projected=useMemo(()=>choice.result?calculateWarlockOne(choice.result.input,choice.result.state):null,[choice.result]);
 const search=spellFilter.trim().toLocaleLowerCase('es');
 const matches=(spell:{name:string;school:string})=>!search||`${spell.name} ${spell.school}`.toLocaleLowerCase('es').includes(search);

 function selectInvocation(index:number,id:WarlockInvocationId){setInvocations(previous=>previous.map((value,i)=>i===index?id:value));}
 function selectImprovementMode(mode:FighterAbilityImprovement['mode']){
  setImprovement(prev=>mode==='plus_two'?{mode,first:prev.first}:{mode,first:prev.first,second:ABILITIES.find(a=>a!==prev.first)??'strength'});
 }
 function selectImprovementFirst(first:Ability){
  setImprovement(prev=>prev.mode==='plus_two'?{mode:'plus_two',first}:{mode:'two_ones',first,second:prev.second===first?ABILITIES.find(a=>a!==first):prev.second});
 }
 function spellChoices(spells:typeof WARLOCK_LEVEL_ONE_CANTRIPS,selected:readonly string[],max:number,onToggle:(id:string)=>void){
  const visible=spells.filter(matches);
  return <div className="wizard-spell-picker wizard-spell-choice-list">{visible.map(spell=><div className="wizard-spell-option" key={spell.id}>
   <label><input type="checkbox" disabled={(third||fourth)&&(WARLOCK_FIEND_LEVEL_THREE_IDS as readonly string[]).includes(spell.id)} checked={selected.includes(spell.id)} onChange={()=>onToggle(spell.id)}/><span>{spell.name}</span><small>{spell.level===0?'Truco':`Nivel ${spell.level}`}{(third||fourth)&&(WARLOCK_FIEND_LEVEL_THREE_IDS as readonly string[]).includes(spell.id)?' · Gratuito del patrón':''}</small></label>
   <WizardSpellDetails spell={spell} characterLevel={nextLevel} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>
  </div>)}{visible.length===0&&<p className="muted-note">No hay conjuros con este filtro.</p>}
  <p className="muted-note">Seleccionados: {selected.length}/{max}. Los resultados no seleccionados siguen visibles aunque llegues al límite; desmarca uno para sustituirlo.</p>
  </div>;
 }
 function confirm(){
  if(submitting.current||!choice.result)return;
  submitting.current=true;setCommitError('');
  try{onAdvance(choice.result.input,choice.result.state);}
  catch(error){setCommitError(error instanceof Error?error.message:'No se pudo subir de nivel');submitting.current=false;}
 }
 const footer=<>
  <button type="button" className="level-wizard-cancel" onClick={onCancel}>Cancelar</button>
  <div className="level-wizard-actions-right">
   {stage>0&&<button type="button" className="level-wizard-back" onClick={()=>{setStage(value=>(value-1) as 0|1|2);setCommitError('');}}>Atrás</button>}
   {stage<2?<button type="button" disabled={stage===1&&!choice.result} onClick={()=>setStage(value=>(value+1) as 0|1|2)}>Siguiente</button>
   :<button type="button" disabled={!choice.result} onClick={confirm}>Confirmar subida a nivel {nextLevel}</button>}
  </div>
 </>;
 return <LevelUpDialogFrame eyebrow="PROGRESIÓN · BRUJO" title={`Subir del nivel ${input.level} al ${nextLevel}`} subtitle="Tres pasos compartidos: novedades, elecciones y confirmación. Nada se modifica hasta confirmar." stage={stage} onClose={onCancel} footer={footer}>
  {stage===0&&<div className="level-wizard-section">
   <h3>Qué recibes al alcanzar el nivel {nextLevel}</h3>
   <ul className="level-wizard-milestones">
    {fourth?<li><strong>Dote Mejora de característica</strong><p className="level-wizard-explanation">Elige +2 en una característica o +1 en dos distintas, sin superar 20. Esta fase del proyecto contempla la dote Mejora de característica; otras dotes podrán añadirse después.</p></li>:third?<li><strong>Patrón Infernal</strong><p className="level-wizard-explanation">Eliges la subclase Infernal, obtienes Bendición del Oscuro y cuatro conjuros del patrón siempre preparados sin ocupar tus cuatro elecciones normales.</p></li>:<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Pasas de una a tres invocaciones. Puedes sustituir la del nivel 1, aprender dos nuevas y consultar sus efectos antes de confirmar.</p></li>}
    <li><strong>Magia de Pacto</strong><p className="level-wizard-explanation">{fourth?'Sigues teniendo dos ranuras de nivel 2 y aumentas a cinco conjuros ordinarios preparados, más los cuatro gratuitos del Patrón Infernal. Puedes sustituir un preparado anterior.':third?'Conservas dos ranuras, ahora ambas de nivel 2, recuperables con descanso corto, y pasas de tres a cuatro conjuros preparados ordinarios.':'Dispondrás de dos ranuras de nivel 1 recuperables con descanso corto y de tres conjuros preparados. Puedes sustituir un conjuro anterior.'}</p></li>
    <li><strong>Trucos</strong><p className="level-wizard-explanation">{fourth?'Aprendes un tercer truco y puedes sustituir como máximo uno de los dos anteriores.':'Conservas dos trucos; puedes sustituir como máximo uno.'}</p></li>
    {third||fourth?<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Mantienes tres invocaciones, pero puedes sustituir una por otra disponible.</p></li>:<li><strong>Astucia mágica</strong><p className="level-wizard-explanation">Recuperas una ranura de Pacto gastada mediante la acción prevista en su módulo. No se resuelven los efectos de los conjuros automáticamente.</p></li>}
    <li><strong>Puntos de golpe</strong><p className="level-wizard-explanation">Un dado de golpe d8: podrás elegir entre el promedio 5 y tirar 1d8 en el siguiente paso.</p></li>
   </ul>
   <div className="level-wizard-stats">
    {[{label:'Nivel',old:input.level,value:nextLevel},{label:'Nivel de ranura',old:input.level>=3?2:1,value:nextLevel>=3?2:1},{label:'Invocaciones',old:input.invocations.length,value:3},{label:'Trucos',old:input.cantripIds.length,value:cantripCount},{label:'Conjuros preparados',old:input.preparedIds.length,value:preparedCount}].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} → {item.value}</strong></div>)}
   </div>
  </div>}
  {stage===1&&<div className="level-wizard-section">
   <h3>Decisiones de este nivel</h3>
   <LevelUpHitPointsPicker characterClass="warlock" value={hitDieRoll} onChange={setHitDieRoll}/>
   {fourth&&<fieldset className="level-wizard-fieldset"><legend>Dote Mejora de característica · nivel 4</legend>
    <label className="field"><span>Distribución</span><select value={improvement.mode} onChange={event=>selectImprovementMode(event.target.value as FighterAbilityImprovement['mode'])}><option value="plus_two">+2 en una característica</option><option value="two_ones">+1 en dos características</option></select></label>
    <label className="field"><span>Primera característica</span><select value={improvement.first} onChange={event=>selectImprovementFirst(event.target.value as Ability)}>{ABILITIES.map(id=><option key={id} value={id}>{ABILITY_NAMES[id]} ({current.abilityScores[id]})</option>)}</select></label>
    {improvement.mode==='two_ones'&&<label className="field"><span>Segunda característica</span><select value={improvement.second??''} onChange={event=>setImprovement(prev=>({...prev,second:event.target.value as Ability}))}>{ABILITIES.filter(id=>id!==improvement.first).map(id=><option key={id} value={id}>{ABILITY_NAMES[id]} ({current.abilityScores[id]})</option>)}</select></label>}
    <p className="level-wizard-explanation">Máximo 20. Si aumentas Constitución también se recalculan los PG máximos de los cuatro niveles anteriores. Esta implementación se centra en la dote Mejora de característica, como en Mago y Guerrero.</p>
   </fieldset>}
   {third&&<fieldset className="level-wizard-fieldset"><legend>Patrón sobrenatural · nivel 3</legend>
    <label className="field"><span>Subclase</span><select value="fiend" disabled><option value="fiend">Patrón Infernal</option></select></label>
    <p className="level-wizard-explanation"><strong>Bendición del Oscuro:</strong> cuando se cumpla el desencadenante del rasgo, podrás aplicarte manualmente {Math.max(1,current.abilityModifiers.charisma+3)} PG temporales desde la hoja. La web no decide cuándo derrotas a un enemigo.</p>
    <h4>Conjuros del Patrón Infernal · siempre preparados (4)</h4>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_FIEND_LEVEL_THREE_SPELLS.map(spell=><div className="wizard-spell-option" key={spell.id}><strong>{spell.name}</strong><small> · Nivel {spell.level}</small><WizardSpellDetails spell={spell} characterLevel={3} spellAttackBonus={current.spellAttackBonus} mode={mode}/></div>)}</div>
   </fieldset>}
   <fieldset className="level-wizard-fieldset"><legend>Invocaciones sobrenaturales (3/3)</legend>
    <p className="level-wizard-explanation">{third||fourth?'Puedes sustituir como máximo una invocación conocida.':'La primera puede conservarse o sustituirse.'} Las tres deben ser distintas y cumplir los requisitos de nivel.</p>
    {invocations.map((id,index)=><label key={index} className="field"><span>{third||fourth?`Invocación ${index+1} (sustituible)`:index===0?'Invocación inicial (sustituible)':`Invocación adicional ${index}`}</span>
     <select value={id} onChange={event=>selectInvocation(index,event.target.value as WarlockInvocationId)}>{WARLOCK_LEVEL_TWO_INVOCATIONS.map(option=><option key={option} value={option} disabled={invocations.some((selected,i)=>i!==index&&selected===option)}>{WARLOCK_INVOCATIONS[option].name}</option>)}</select>
     <small className="level-wizard-explanation">{WARLOCK_INVOCATIONS[id].summary}</small>
    </label>)}
    {invocations.includes('lessons_of_the_first_ones')&&<label className="field"><span>Dote de origen · Lecciones de los Primeros</span><select value={feat} disabled={availableFeats.length===0} onChange={event=>setFeat(event.target.value as 'alert'|'tough')}>{availableFeats.map(id=><option key={id} value={id}>{id==='alert'?'Alerta':'Duro'}</option>)}</select><small>{availableFeats.length===0?'No quedan dotes válidas; selecciona otra invocación.':'No se permite repetir dotes ya concedidas por el origen.'}</small></label>}
    {invocations.includes('pact_of_tome')&&<p className="muted-note">Si eliges Pacto del Tomo, se asignarán tres trucos y dos rituales válidos; podrás revisarlos en el editor del personaje.</p>}
   </fieldset>
   <label className="field"><span>Buscar conjuros por nombre o escuela</span><input value={spellFilter} onChange={event=>setSpellFilter(event.target.value)} placeholder="Ej.: descarga, evocación, maleficio..."/></label>
   <fieldset className="level-wizard-fieldset"><legend>Trucos de Brujo ({cantrips.length}/{cantripCount})</legend>
    <p className="muted-note">{fourth?'Elige tres trucos; puedes sustituir como máximo uno anterior.':'Puedes cambiar uno de tus dos trucos existentes.'} Abre «Ver reglas y tiradas» antes de elegir.</p>
    {spellChoices(WARLOCK_LEVEL_ONE_CANTRIPS,cantrips,cantripCount,id=>setCantrips(previous=>toggleLimited(previous,id,cantripCount)))}
   </fieldset>
   <fieldset className="level-wizard-fieldset"><legend>Conjuros preparados ({prepared.length}/{preparedCount})</legend>
    <p className="muted-note">{fourth?'Elige cinco conjuros normales de niveles 1 o 2, conservando al menos tres de los cuatro anteriores. El Patrón Infernal mantiene sus cuatro conjuros adicionales gratuitos.':third?'Elige cuatro conjuros normales de niveles 1 o 2. Puedes reemplazar uno anterior; los cuatro gratuitos del Patrón Infernal se añaden automáticamente.':'Elige tres conjuros en total. Puedes reemplazar como máximo uno de los dos ya preparados.'}</p>
    {spellChoices(spellOptions,prepared,preparedCount,id=>setPrepared(previous=>toggleLimited(previous,id,preparedCount)))}
   </fieldset>
   {choice.result?<p className="level-wizard-ok">Elecciones válidas. Puedes revisar las estadísticas antes de confirmar.</p>:<p className="level-wizard-error" role="status">Pendiente: {choice.error}</p>}
  </div>}
  {stage===2&&<div className="level-wizard-section">
   <h3>Revisión final del personaje</h3>
   {choice.result&&projected?<>
    <div className="level-wizard-stats">
     {[{label:'Nivel',old:input.level,value:nextLevel},{label:'PG máximos',old:current.maximumHitPoints,value:projected.maximumHitPoints},{label:'Trucos',old:input.cantripIds.length,value:cantrips.length},{label:'Invocaciones',old:input.invocations.length,value:invocations.length},{label:'Preparados ordinarios',old:input.preparedIds.length,value:prepared.length},{label:'Nivel de ranuras',old:input.level>=3?2:1,value:nextLevel>=3?2:1},{label:'Ataque mágico',old:current.spellAttackBonus,value:projected.spellAttackBonus}].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} → {item.value}</strong></div>)}
    </div>
    <div><h4>Invocaciones que tendrá tu Brujo</h4><ul className="level-wizard-small-list">{invocations.map(id=><li key={id}><strong>{WARLOCK_INVOCATIONS[id].name}</strong><p className="level-wizard-explanation">{WARLOCK_INVOCATIONS[id].summary}</p></li>)}</ul></div>
    <div><h4>Trucos y conjuros que conservarás</h4><ul className="level-wizard-small-list">{[...WARLOCK_LEVEL_ONE_CANTRIPS,...spellOptions].filter(spell=>cantrips.includes(spell.id)||prepared.includes(spell.id)).map(spell=><li key={spell.id}><strong>{spell.name}</strong><p className="level-wizard-explanation">{spell.description}</p></li>)}</ul></div>
    {third&&<p className="level-wizard-choice-info"><strong>Patrón Infernal:</strong> Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión siempre preparados. Bendición del Oscuro: {Math.max(1,projected.abilityModifiers.charisma+3)} PG temporales cuando el jugador active su desencadenante.</p>}
    {fourth&&<p className="level-wizard-choice-info"><strong>Mejora de característica:</strong> {improvement.mode==='plus_two'?`+2 a ${ABILITY_NAMES[improvement.first]}`:`+1 a ${ABILITY_NAMES[improvement.first]} y +1 a ${ABILITY_NAMES[improvement.second??improvement.first]}`}. Se actualizan automáticamente ataque mágico, CD, PG y todas las tiradas relacionadas.</p>}
    <p className="level-wizard-choice-info"><strong>Dado de golpe elegido: {hitDieRoll}</strong> El motor calcula Constitución y beneficios pasivos; los PG actuales conservan el daño acumulado.</p>
    <p className="muted-note">Se mantienen inventario, retrato, compañeros e inspiración. Tras confirmar, pulsa Guardar cambios para persistir el resultado.</p>
   </>:<p className="level-wizard-error" role="alert">{choice.error}</p>}
   {commitError&&<p className="level-wizard-error" role="alert">{commitError}</p>}
  </div>}
 </LevelUpDialogFrame>;
}
