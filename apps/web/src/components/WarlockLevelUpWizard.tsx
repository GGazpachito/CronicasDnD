'use client';

import {useMemo,useRef,useState} from 'react';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import {BACKGROUNDS} from '../../../../packages/rules-engine/src/guided';
import {
 WARLOCK_INVOCATIONS,WARLOCK_LEVEL_TWO_INVOCATIONS,calculateWarlockOne,
 type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId,
} from '../../../../packages/rules-engine/src/warlock';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_TWO,WARLOCK_FIEND_LEVEL_THREE_SPELLS,WARLOCK_FIEND_LEVEL_THREE_IDS} from '../../../../packages/rules-engine/src/warlock-spells';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree} from '../../../../packages/rules-engine/src/warlock-level-up';
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

/** Usa el MISMO marco, navegación, fieldsets y fichas mágicas del Mago.
 * Solo las reglas de elecciones y la validación pertenecen a Brujo.
 */
export default function WarlockLevelUpWizard({input,state,mode,onAdvance,onCancel}:Props){
 const third=input.level===2;
 const nextLevel=third?3:2;
 const spellOptions=third?WARLOCK_SPELLS_THROUGH_LEVEL_TWO:WARLOCK_LEVEL_ONE_SPELLS;
 const preparedCount=third?4:3;
 const [stage,setStage]=useState<0|1|2>(0);
 const [invocations,setInvocations]=useState<WarlockInvocationId[]>(()=>third?[...input.invocations]:[
  input.invocations[0],...WARLOCK_LEVEL_TWO_INVOCATIONS.filter(id=>id!==input.invocations[0]).slice(0,2),]);
 const [cantrips,setCantrips]=useState<string[]>([...input.cantripIds]);
 const [prepared,setPrepared]=useState<string[]>(()=>[
  ...input.preparedIds,spellOptions.find(spell=>!input.preparedIds.includes(spell.id)&&(!third||spell.level===2))!.id,
 ]);
 const [hitDieRoll,setHitDieRoll]=useState(5);
 const availableFeats=(['alert','tough'] as const).filter(id=>id!==BACKGROUNDS[input.background].feat&&id!==input.humanFeat);
 const [feat,setFeat]=useState<'alert'|'tough'>(input.lessonsFeat??availableFeats[0]??'alert');
 const [spellFilter,setSpellFilter]=useState('');
 const [commitError,setCommitError]=useState('');
 const submitting=useRef(false);
 const current=useMemo(()=>calculateWarlockOne(input,state),[input,state]);
 const choice=useMemo(()=>{
  try{return {result:third?advanceWarlockToLevelThree(input,state,{
   subclassId:'fiend',invocations,cantripIds:cantrips,preparedIds:prepared,level3HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):advanceWarlockToLevelTwo(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level2HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }),error:''};}
  catch(error){return {result:null,error:error instanceof Error?error.message:'Elecciones de Brujo incompletas'};}
 },[input,state,invocations,cantrips,prepared,hitDieRoll,feat,third]);
 const projected=useMemo(()=>choice.result?calculateWarlockOne(choice.result.input,choice.result.state):null,[choice.result]);
 const search=spellFilter.trim().toLocaleLowerCase('es');
 const matches=(spell:{name:string;school:string})=>!search||`${spell.name} ${spell.school}`.toLocaleLowerCase('es').includes(search);

 function selectInvocation(index:number,id:WarlockInvocationId){setInvocations(previous=>previous.map((value,i)=>i===index?id:value));}
 function spellChoices(spells:typeof WARLOCK_LEVEL_ONE_CANTRIPS,selected:readonly string[],max:number,onToggle:(id:string)=>void){
  const visible=spells.filter(matches);
  return <div className="wizard-spell-picker wizard-spell-choice-list">{visible.map(spell=><div className="wizard-spell-option" key={spell.id}>
   <label><input type="checkbox" disabled={third&&(WARLOCK_FIEND_LEVEL_THREE_IDS as readonly string[]).includes(spell.id)} checked={selected.includes(spell.id)} onChange={()=>onToggle(spell.id)}/><span>{spell.name}</span><small>{spell.level===0?'Truco':`Nivel ${spell.level}`}{third&&(WARLOCK_FIEND_LEVEL_THREE_IDS as readonly string[]).includes(spell.id)?' · Gratuito del patrón':''}</small></label>
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
    {third?<li><strong>Patrón Infernal</strong><p className="level-wizard-explanation">Eliges la subclase Infernal, obtienes Bendición del Oscuro y cuatro conjuros del patrón siempre preparados sin ocupar tus cuatro elecciones normales.</p></li>:<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Pasas de una a tres invocaciones. Puedes sustituir la del nivel 1, aprender dos nuevas y consultar sus efectos antes de confirmar.</p></li>}
    <li><strong>Magia de Pacto</strong><p className="level-wizard-explanation">{third?'Conservas dos ranuras, ahora ambas de nivel 2, recuperables con descanso corto, y pasas de tres a cuatro conjuros preparados ordinarios.':'Dispondrás de dos ranuras de nivel 1 recuperables con descanso corto y de tres conjuros preparados. Puedes sustituir un conjuro anterior.'}</p></li>
    <li><strong>Trucos</strong><p className="level-wizard-explanation">Conservas dos trucos; puedes sustituir como máximo uno.</p></li>
    {third?<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Mantienes tres invocaciones, pero puedes sustituir una por otra disponible.</p></li>:<li><strong>Astucia mágica</strong><p className="level-wizard-explanation">Recuperas una ranura de Pacto gastada mediante la acción prevista en su módulo. No se resuelven los efectos de los conjuros automáticamente.</p></li>}
    <li><strong>Puntos de golpe</strong><p className="level-wizard-explanation">Un dado de golpe d8: podrás elegir entre el promedio 5 y tirar 1d8 en el siguiente paso.</p></li>
   </ul>
   <div className="level-wizard-stats">
    {[{label:'Nivel',old:input.level,value:nextLevel},{label:'Nivel de ranura',old:1,value:third?2:1},{label:'Invocaciones',old:input.invocations.length,value:3},{label:'Conjuros preparados',old:input.preparedIds.length,value:preparedCount}].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} → {item.value}</strong></div>)}
   </div>
  </div>}
  {stage===1&&<div className="level-wizard-section">
   <h3>Decisiones de este nivel</h3>
   <LevelUpHitPointsPicker characterClass="warlock" value={hitDieRoll} onChange={setHitDieRoll}/>
   {third&&<fieldset className="level-wizard-fieldset"><legend>Patrón sobrenatural · nivel 3</legend>
    <label className="field"><span>Subclase</span><select value="fiend" disabled><option value="fiend">Patrón Infernal</option></select></label>
    <p className="level-wizard-explanation"><strong>Bendición del Oscuro:</strong> cuando se cumpla el desencadenante del rasgo, podrás aplicarte manualmente {Math.max(1,current.abilityModifiers.charisma+3)} PG temporales desde la hoja. La web no decide cuándo derrotas a un enemigo.</p>
    <h4>Conjuros del Patrón Infernal · siempre preparados (4)</h4>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_FIEND_LEVEL_THREE_SPELLS.map(spell=><div className="wizard-spell-option" key={spell.id}><strong>{spell.name}</strong><small> · Nivel {spell.level}</small><WizardSpellDetails spell={spell} characterLevel={3} spellAttackBonus={current.spellAttackBonus} mode={mode}/></div>)}</div>
   </fieldset>}
   <fieldset className="level-wizard-fieldset"><legend>Invocaciones sobrenaturales (3/3)</legend>
    <p className="level-wizard-explanation">{third?'Puedes sustituir como máximo una invocación conocida.':'La primera puede conservarse o sustituirse.'} Las tres deben ser distintas y cumplir los requisitos de nivel.</p>
    {invocations.map((id,index)=><label key={index} className="field"><span>{third?`Invocación ${index+1} (sustituible)`:index===0?'Invocación inicial (sustituible)':`Invocación adicional ${index}`}</span>
     <select value={id} onChange={event=>selectInvocation(index,event.target.value as WarlockInvocationId)}>{WARLOCK_LEVEL_TWO_INVOCATIONS.map(option=><option key={option} value={option} disabled={invocations.some((selected,i)=>i!==index&&selected===option)}>{WARLOCK_INVOCATIONS[option].name}</option>)}</select>
     <small className="level-wizard-explanation">{WARLOCK_INVOCATIONS[id].summary}</small>
    </label>)}
    {invocations.includes('lessons_of_the_first_ones')&&<label className="field"><span>Dote de origen · Lecciones de los Primeros</span><select value={feat} disabled={availableFeats.length===0} onChange={event=>setFeat(event.target.value as 'alert'|'tough')}>{availableFeats.map(id=><option key={id} value={id}>{id==='alert'?'Alerta':'Duro'}</option>)}</select><small>{availableFeats.length===0?'No quedan dotes válidas; selecciona otra invocación.':'No se permite repetir dotes ya concedidas por el origen.'}</small></label>}
    {invocations.includes('pact_of_tome')&&<p className="muted-note">Si eliges Pacto del Tomo, se asignarán tres trucos y dos rituales válidos; podrás revisarlos en el editor del personaje.</p>}
   </fieldset>
   <label className="field"><span>Buscar conjuros por nombre o escuela</span><input value={spellFilter} onChange={event=>setSpellFilter(event.target.value)} placeholder="Ej.: descarga, evocación, maleficio..."/></label>
   <fieldset className="level-wizard-fieldset"><legend>Trucos de Brujo ({cantrips.length}/2)</legend>
    <p className="muted-note">Puedes cambiar uno de tus dos trucos existentes. Abre «Ver reglas y tiradas» antes de elegir.</p>
    {spellChoices(WARLOCK_LEVEL_ONE_CANTRIPS,cantrips,2,id=>setCantrips(previous=>toggleLimited(previous,id,2)))}
   </fieldset>
   <fieldset className="level-wizard-fieldset"><legend>Conjuros preparados ({prepared.length}/{preparedCount})</legend>
    <p className="muted-note">{third?'Elige cuatro conjuros normales de niveles 1 o 2. Puedes reemplazar uno anterior; los cuatro gratuitos del Patrón Infernal se añaden automáticamente.':'Elige tres conjuros en total. Puedes reemplazar como máximo uno de los dos ya preparados.'}</p>
    {spellChoices(spellOptions,prepared,preparedCount,id=>setPrepared(previous=>toggleLimited(previous,id,preparedCount)))}
   </fieldset>
   {choice.result?<p className="level-wizard-ok">Elecciones válidas. Puedes revisar las estadísticas antes de confirmar.</p>:<p className="level-wizard-error" role="status">Pendiente: {choice.error}</p>}
  </div>}
  {stage===2&&<div className="level-wizard-section">
   <h3>Revisión final del personaje</h3>
   {choice.result&&projected?<>
    <div className="level-wizard-stats">
     {[{label:'Nivel',old:input.level,value:nextLevel},{label:'PG máximos',old:current.maximumHitPoints,value:projected.maximumHitPoints},{label:'Invocaciones',old:input.invocations.length,value:invocations.length},{label:'Preparados ordinarios',old:input.preparedIds.length,value:prepared.length},{label:'Nivel de ranuras',old:1,value:third?2:1},{label:'Ataque mágico',old:current.spellAttackBonus,value:projected.spellAttackBonus}].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} → {item.value}</strong></div>)}
    </div>
    <div><h4>Invocaciones que tendrá tu Brujo</h4><ul className="level-wizard-small-list">{invocations.map(id=><li key={id}><strong>{WARLOCK_INVOCATIONS[id].name}</strong><p className="level-wizard-explanation">{WARLOCK_INVOCATIONS[id].summary}</p></li>)}</ul></div>
    <div><h4>Trucos y conjuros que conservarás</h4><ul className="level-wizard-small-list">{[...WARLOCK_LEVEL_ONE_CANTRIPS,...spellOptions].filter(spell=>cantrips.includes(spell.id)||prepared.includes(spell.id)).map(spell=><li key={spell.id}><strong>{spell.name}</strong><p className="level-wizard-explanation">{spell.description}</p></li>)}</ul></div>
    {third&&<p className="level-wizard-choice-info"><strong>Patrón Infernal:</strong> Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión siempre preparados. Bendición del Oscuro: {Math.max(1,projected.abilityModifiers.charisma+3)} PG temporales cuando el jugador active su desencadenante.</p>}
    <p className="level-wizard-choice-info"><strong>Dado de golpe elegido: {hitDieRoll}</strong> El motor calcula Constitución y beneficios pasivos; los PG actuales conservan el daño acumulado.</p>
    <p className="muted-note">Se mantienen inventario, retrato, compañeros e inspiración. Tras confirmar, pulsa Guardar cambios para persistir el resultado.</p>
   </>:<p className="level-wizard-error" role="alert">{choice.error}</p>}
   {commitError&&<p className="level-wizard-error" role="alert">{commitError}</p>}
  </div>}
 </LevelUpDialogFrame>;
}
