'use client';

import {useMemo,useRef,useState} from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import type {FighterAbilityImprovement} from '../../../../packages/rules-engine/src/progression';
import type {D20Mode} from '../../../../packages/rules-engine/src/d20';
import {BACKGROUNDS} from '../../../../packages/rules-engine/src/guided';
import {
 WARLOCK_INVOCATIONS,WARLOCK_LEVEL_TWO_INVOCATIONS,WARLOCK_LEVEL_FIVE_INVOCATIONS,WARLOCK_LEVEL_SEVEN_INVOCATIONS,WARLOCK_LEVEL_NINE_INVOCATIONS,WARLOCK_LEVEL_TWELVE_INVOCATIONS,WARLOCK_INVOCATION_PREREQUISITES,calculateWarlockOne,
 type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId,
} from '../../../../packages/rules-engine/src/warlock';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_SPELLS_THROUGH_LEVEL_TWO,WARLOCK_SPELLS_THROUGH_LEVEL_THREE,WARLOCK_SPELLS_THROUGH_LEVEL_FOUR,WARLOCK_SPELLS_THROUGH_LEVEL_FIVE,WARLOCK_LEVEL_SIX_SPELLS,WARLOCK_SIXTH_LEVEL_IDS,WARLOCK_LEVEL_SEVEN_SPELLS,WARLOCK_SEVENTH_LEVEL_IDS,WARLOCK_FIEND_LEVEL_THREE_SPELLS,WARLOCK_FIEND_LEVEL_FIVE_SPELLS,WARLOCK_FIEND_LEVEL_SEVEN_SPELLS,WARLOCK_FIEND_ALWAYS_PREPARED_IDS} from '../../../../packages/rules-engine/src/warlock-spells';
import {advanceWarlockToLevelTwo,advanceWarlockToLevelThree,advanceWarlockToLevelFour,advanceWarlockToLevelFive,advanceWarlockToLevelSix,advanceWarlockToLevelSeven,advanceWarlockToLevelEight,advanceWarlockToLevelNine,advanceWarlockToLevelTen,advanceWarlockToLevelEleven,advanceWarlockToLevelTwelve,advanceWarlockToLevelThirteen,advanceWarlockToLevelFourteen} from '../../../../packages/rules-engine/src/warlock-level-up';
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
 const fifth=input.level===4;
 const sixth=input.level===5;
 const seventh=input.level===6;
 const eighth=input.level===7;
 const ninth=input.level===8;
 const tenth=input.level===9;
 const eleventh=input.level===10;
 const twelfth=input.level===11;
 const thirteenth=input.level===12;
 const fourteenth=input.level===13;
 const nextLevel=fourteenth?14:thirteenth?13:twelfth?12:eleventh?11:tenth?10:ninth?9:eighth?8:seventh?7:sixth?6:fifth?5:fourth?4:third?3:2;
 const spellOptions=fourteenth||thirteenth||twelfth||eleventh||tenth||ninth?WARLOCK_SPELLS_THROUGH_LEVEL_FIVE:eighth||seventh?WARLOCK_SPELLS_THROUGH_LEVEL_FOUR:sixth||fifth?WARLOCK_SPELLS_THROUGH_LEVEL_THREE:third||fourth?WARLOCK_SPELLS_THROUGH_LEVEL_TWO:WARLOCK_LEVEL_ONE_SPELLS;
 const preparedCount=fourteenth||thirteenth?12:twelfth||eleventh?11:tenth||ninth?10:eighth?9:seventh?8:sixth?7:fifth?6:fourth?5:third?4:3;
 const cantripCount=fourteenth||thirteenth||twelfth||eleventh||tenth?4:ninth||eighth||seventh||sixth||fifth||fourth?3:2;
 const invocationCount=fourteenth||thirteenth||twelfth?8:eleventh||tenth||ninth?7:eighth||seventh?6:sixth||fifth?5:3;
 const [stage,setStage]=useState<0|1|2>(0);
 const [invocations,setInvocations]=useState<WarlockInvocationId[]>(()=>fourteenth||thirteenth?[...input.invocations]:twelfth?[...input.invocations,...WARLOCK_LEVEL_TWELVE_INVOCATIONS.filter(id=>!input.invocations.includes(id)&&(!WARLOCK_INVOCATION_PREREQUISITES[id]||input.invocations.includes(WARLOCK_INVOCATION_PREREQUISITES[id]!))).slice(-1)]:eleventh||tenth?[...input.invocations]:ninth?[...input.invocations,...WARLOCK_LEVEL_NINE_INVOCATIONS.filter(id=>!input.invocations.includes(id)&&(!WARLOCK_INVOCATION_PREREQUISITES[id]||input.invocations.includes(WARLOCK_INVOCATION_PREREQUISITES[id]!))).slice(-1)]:eighth?[...input.invocations]:seventh?[...input.invocations,'whispers_of_the_grave']:sixth?[...input.invocations]:fifth?[...input.invocations,'ascendant_step','gaze_of_two_minds']:third||fourth?[...input.invocations]:[
  input.invocations[0],...WARLOCK_LEVEL_TWO_INVOCATIONS.filter(id=>id!==input.invocations[0]).slice(0,2),]);
 const [cantrips,setCantrips]=useState<string[]>(()=>fourth||tenth?[...input.cantripIds,WARLOCK_LEVEL_ONE_CANTRIPS.find(spell=>!input.cantripIds.includes(spell.id)&&!(input.tomeCantripIds??[]).includes(spell.id))!.id]:[...input.cantripIds]);
 const [prepared,setPrepared]=useState<string[]>(()=>fourteenth||twelfth||tenth?[...input.preparedIds]:[
  ...input.preparedIds,spellOptions.find(spell=>!input.preparedIds.includes(spell.id)&&(!third||spell.level===2)&&(!(fifth||sixth)||spell.level===3)&&(!seventh||spell.level===4)&&(!ninth||spell.level===5)&&spell.id!=='contact_other_plane'&&(!(third||fourth||fifth||sixth||seventh||eighth||ninth||tenth||eleventh||twelfth||thirteenth||fourteenth)||!(WARLOCK_FIEND_ALWAYS_PREPARED_IDS as readonly string[]).includes(spell.id)))!.id,
 ]);
 const [arcanum,setArcanum]=useState<typeof WARLOCK_SIXTH_LEVEL_IDS[number]>(input.mysticArcanum6Id??WARLOCK_SIXTH_LEVEL_IDS[0]);
 const [arcanum7,setArcanum7]=useState<typeof WARLOCK_SEVENTH_LEVEL_IDS[number]>(input.mysticArcanum7Id??WARLOCK_SEVENTH_LEVEL_IDS[0]);
 const [hitDieRoll,setHitDieRoll]=useState(5);
 const availableFeats=(['alert','tough'] as const).filter(id=>id!==BACKGROUNDS[input.background].feat&&id!==input.humanFeat);
 const [feat,setFeat]=useState<'alert'|'tough'>(input.lessonsFeat??availableFeats[0]??'alert');
 const current=useMemo(()=>calculateWarlockOne(input,state),[input,state]);
 const [improvement,setImprovement]=useState<FighterAbilityImprovement>({mode:'plus_two',first:current.abilityScores.charisma<=18?'charisma':'constitution'});
 const [spellFilter,setSpellFilter]=useState('');
 const [commitError,setCommitError]=useState('');
 const submitting=useRef(false);
 const choice=useMemo(()=>{
  try{return {result:fourteenth?advanceWarlockToLevelFourteen(input,state,{invocations,cantripIds:cantrips,preparedIds:prepared,mysticArcanum6Id:arcanum,mysticArcanum7Id:arcanum7,level14HitDieRoll:hitDieRoll,...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{})}):thirteenth?advanceWarlockToLevelThirteen(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,mysticArcanum6Id:arcanum,mysticArcanum7Id:arcanum7,level13HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):twelfth?advanceWarlockToLevelTwelve(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,mysticArcanum6Id:arcanum,level12HitDieRoll:hitDieRoll,level12Improvement:improvement,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):eleventh?advanceWarlockToLevelEleven(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,mysticArcanum6Id:arcanum,level11HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):tenth?advanceWarlockToLevelTen(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level10HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):ninth?advanceWarlockToLevelNine(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level9HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):eighth?advanceWarlockToLevelEight(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level8HitDieRoll:hitDieRoll,level8Improvement:improvement,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):seventh?advanceWarlockToLevelSeven(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level7HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):sixth?advanceWarlockToLevelSix(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level6HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):fifth?advanceWarlockToLevelFive(input,state,{
   invocations,cantripIds:cantrips,preparedIds:prepared,level5HitDieRoll:hitDieRoll,
   ...(invocations.includes('lessons_of_the_first_ones')?{lessonsFeat:feat}:{}),
  }):fourth?advanceWarlockToLevelFour(input,state,{
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
 },[input,state,invocations,cantrips,prepared,arcanum,arcanum7,hitDieRoll,feat,improvement,third,fourth,fifth,sixth,seventh,eighth,ninth,tenth,eleventh,twelfth,thirteenth,fourteenth]);
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
   <label><input type="checkbox" disabled={((third||fourth||fifth||sixth||seventh||eighth||ninth||tenth||eleventh||twelfth||thirteenth||fourteenth)&&(WARLOCK_FIEND_ALWAYS_PREPARED_IDS as readonly string[]).includes(spell.id))||((ninth||tenth||eleventh||twelfth||thirteenth||fourteenth)&&spell.id==='contact_other_plane')} checked={selected.includes(spell.id)} onChange={()=>onToggle(spell.id)}/><span>{spell.name}</span><small>{spell.level===0?'Truco':`Nivel ${spell.level}`}{(third||fourth||fifth||sixth||seventh||eighth||ninth||tenth||eleventh||twelfth||thirteenth||fourteenth)&&(WARLOCK_FIEND_ALWAYS_PREPARED_IDS as readonly string[]).includes(spell.id)?' · Gratuito del patrón':(ninth||tenth||eleventh||twelfth||thirteenth||fourteenth)&&spell.id==='contact_other_plane'?' · Gratuito de Contactar con el patrón':''}</small></label>
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
    {fourteenth&&<li><strong>Arrojar al infierno · Patrón Infernal</strong><p className="level-wizard-explanation">Al impactar con un ataque puedes obligar al objetivo a superar una salvación de Carisma contra tu CD de conjuros. Si falla, desaparece hasta el final de tu próximo turno, queda incapacitado y recibe 8d10 de daño psíquico salvo que sea un infernal. Un uso por descanso largo; gastar una ranura de Pacto recupera el uso.</p></li>}
    {thirteenth&&<li><strong>Arcanum místico de nivel 7 y competencia +5</strong><p className="level-wizard-explanation">Elige uno de cuatro conjuros de nivel 7 para lanzar una vez por descanso largo sin ranura. Su uso es independiente del Arcanum de nivel 6. Tu competencia aumenta a +5.</p></li>}
    {twelfth&&<li><strong>Mejora de característica y octava invocación</strong><p className="level-wizard-explanation">Subes una o dos características (máximo 20), aprendes tu octava invocación y puedes sustituir como máximo una anterior. Se desbloquea Hoja devoradora, que requiere Hoja sedienta y permite tres ataques con el arma del pacto equipada.</p></li>}
    {eleventh&&<li><strong>Arcanum místico de nivel 6</strong><p className="level-wizard-explanation">Elige un conjuro de nivel 6 de la lista de Brujo: podrás lanzarlo una vez por descanso largo sin gastar ranuras de Pacto. No forma parte de los once conjuros preparados ordinarios.</p></li>}
    {eleventh&&<li><strong>Tercera ranura de Magia de Pacto y Descarga sobrenatural</strong><p className="level-wizard-explanation">Obtienes tres ranuras de nivel 5, recuperables con descanso corto. Astucia mágica puede restaurar hasta dos gastadas. Descarga sobrenatural lanza tres rayos independientes.</p></li>}
    {eleventh||twelfth||thirteenth||fourteenth?null:tenth?<li><strong>Resistencia infernal · Patrón Infernal nivel 10</strong><p className="level-wizard-explanation">Al finalizar cada descanso corto o largo podrás escoger un tipo de daño (salvo Fuerza) y ganar resistencia a él hasta que lo sustituyas en otro descanso. La elección se hará desde la hoja, después de descansar, sin modificar automáticamente el daño.</p></li>:ninth?<li><strong>Contactar con el patrón · nivel 9</strong><p className="level-wizard-explanation">Tu bonificación por competencia sube a +4. Obtienes Contactar con otro plano siempre preparado, sin ocupar una de tus diez elecciones; puedes lanzarlo gratis una vez por descanso largo y superar automáticamente su salvación de Inteligencia. Se añade la séptima invocación.</p></li>:eighth?<li><strong>Mejora de característica · nivel 8</strong><p className="level-wizard-explanation">Elige +2 en una característica o +1 en dos distintas, sin superar 20. Se acumula a la mejora de nivel 4 y se recalculan bonificadores, salvaciones, CD y puntos de golpe.</p></li>:seventh?<li><strong>Sexta invocación sobrenatural</strong><p className="level-wizard-explanation">Añades una sexta invocación y puedes sustituir como máximo otra. Se desbloquea Susurros de la tumba: Hablar con los muertos sin consumir ranura.</p></li>:sixth?<li><strong>Suerte del Oscuro · Patrón Infernal</strong><p className="level-wizard-explanation">Tras ver una tirada de d20 de prueba o salvación puedes sumar 1d10 antes de resolverla. Dispondrás de tantos usos por descanso largo como tu modificador de Carisma (mínimo uno), solo una vez por tirada.</p></li>:fifth?<li><strong>Invocaciones sobrenaturales y competencia</strong><p className="level-wizard-explanation">De tres a cinco invocaciones; puedes sustituir una anterior. Tu competencia sube a +3 y se recalculan ataques, salvaciones, habilidades y CD.</p></li>:fourth?<li><strong>Dote Mejora de característica</strong><p className="level-wizard-explanation">Elige +2 en una característica o +1 en dos distintas, sin superar 20. Esta fase del proyecto contempla la dote Mejora de característica; otras dotes podrán añadirse después.</p></li>:third?<li><strong>Patrón Infernal</strong><p className="level-wizard-explanation">Eliges la subclase Infernal, obtienes Bendición del Oscuro y cuatro conjuros del patrón siempre preparados sin ocupar tus cuatro elecciones normales.</p></li>:<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Pasas de una a tres invocaciones. Puedes sustituir la del nivel 1, aprender dos nuevas y consultar sus efectos antes de confirmar.</p></li>}
    <li><strong>Magia de Pacto</strong><p className="level-wizard-explanation">{fourteenth?'Mantienes tres ranuras de nivel 5, doce preparados ordinarios y dos Arcanum (niveles 6 y 7) independientes. Puedes sustituir un preparado.':thirteenth?'Tres ranuras de nivel 5, doce preparados ordinarios de niveles 1–5 y un nuevo Arcanum de nivel 7 independiente del de nivel 6. Puedes sustituir un preparado anterior.':twelfth?'Tres ranuras de Pacto de nivel 5, once conjuros ordinarios y Arcanum de nivel 6 sin ranura adicional. Solo puedes sustituir una preparación.':eleventh?'Tres ranuras de Pacto de nivel 5 y once conjuros ordinarios de niveles 1–5; puedes sustituir uno anterior. El Arcanum de nivel 6 es independiente y no consume ranura.':tenth?'Mantienes dos ranuras de nivel 5, diez conjuros ordinarios y todos los gratuitos del patrón. Puedes reemplazar un conjuro ordinario; no ganas ranuras nuevas.':ninth?'Ambas ranuras suben a nivel 5; eliges diez conjuros ordinarios de niveles 1–5, mantienes ocho gratuitos del patrón y Contactar con otro plano gratis por el rasgo de clase.':eighth?'Se mantienen dos ranuras de nivel 4 y ocho conjuros gratuitos del Patrón Infernal. Pasas a nueve conjuros ordinarios preparados de nivel 1–4 y puedes sustituir otro anterior.':seventh?'Dos ranuras, ambas ahora de nivel 4 y recuperables con descanso corto. Preparas ocho conjuros ordinarios de nivel 1–4; el patrón añade Escudo de fuego y Muro de fuego siempre preparados (ocho gratuitos en total).':sixth?'Mantienes dos ranuras de nivel 3 y los seis conjuros gratuitos del Patrón Infernal. Preparas un séptimo conjuro ordinario y puedes sustituir otro.':fifth?'Conservas dos ranuras, pero las dos pasan a nivel de conjuro 3; preparas seis conjuros ordinarios y recibes Bola de fuego y Nube apestosa adicionales del patrón.':fourth?'Sigues teniendo dos ranuras de nivel 2 y aumentas a cinco conjuros ordinarios preparados, más los cuatro gratuitos del Patrón Infernal. Puedes sustituir un preparado anterior.':third?'Conservas dos ranuras, ahora ambas de nivel 2, recuperables con descanso corto, y pasas de tres a cuatro conjuros preparados ordinarios.':'Dispondrás de dos ranuras de nivel 1 recuperables con descanso corto y de tres conjuros preparados. Puedes sustituir un conjuro anterior.'}</p></li>
    <li><strong>Trucos</strong><p className="level-wizard-explanation">{fourteenth?'Conservas cuatro trucos y tres rayos independientes de Descarga sobrenatural; puedes sustituir un truco.':thirteenth?'Conservas cuatro trucos y tres rayos independientes de Descarga sobrenatural. Puedes sustituir como máximo uno.':twelfth?'Conservas los cuatro trucos y los tres rayos independientes de Descarga sobrenatural; puedes sustituir uno.':eleventh?'Mantienes cuatro trucos, puedes sustituir uno, y Descarga sobrenatural ahora tiene tres rayos independientes.':tenth?'Aprendes un cuarto truco de Brujo. Puedes sustituir como máximo uno de los tres anteriores; Descarga sobrenatural mantiene dos rayos.':ninth||eighth?'Mantienes tres trucos; Descarga sobrenatural sigue lanzando dos rayos independientes. Puedes sustituir uno.':seventh?'Conservas tres trucos y dos rayos de Descarga sobrenatural. Se permite sustituir uno.':sixth?'Mantienes tres trucos y dos rayos de Descarga sobrenatural; puedes sustituir un truco anterior.':fifth?'Conservas tres trucos; puedes sustituir como máximo uno. Descarga sobrenatural pasa a dos rayos independientes por nivel de personaje 5.':fourth?'Aprendes un tercer truco y puedes sustituir como máximo uno de los dos anteriores.':'Conservas dos trucos; puedes sustituir como máximo uno.'}</p></li>
    {fourteenth||thirteenth?<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Conservas ocho invocaciones; puedes reemplazar una respetando sus prerrequisitos.</p></li>:twelfth?<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Ocho invocaciones en total; puedes sustituir como máximo una anterior. Hoja devoradora requiere Hoja sedienta y no funciona sin el arma del pacto equipada.</p></li>:eleventh||tenth?<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">Conservas siete invocaciones; puedes sustituir una anterior respetando sus prerrequisitos.</p></li>:third||fourth||sixth||eighth||ninth?<li><strong>Invocaciones sobrenaturales</strong><p className="level-wizard-explanation">{ninth?'Aprendes la séptima invocación y puedes sustituir una anterior; se desbloquean Bebedor de vida, Don de los protectores y Visiones de reinos distantes.':`Mantienes ${eighth?'seis':sixth?'cinco':'tres'} invocaciones, pero puedes sustituir una por otra disponible.`}</p></li>:!fifth&&!seventh&&<li><strong>Astucia mágica</strong><p className="level-wizard-explanation">Recuperas una ranura de Pacto gastada mediante la acción prevista en su módulo. No se resuelven los efectos de los conjuros automáticamente.</p></li>}
    <li><strong>Puntos de golpe</strong><p className="level-wizard-explanation">Un dado de golpe d8: podrás elegir entre el promedio 5 y tirar 1d8 en el siguiente paso.</p></li>
   </ul>
   <div className="level-wizard-stats">
    {[{label:'Nivel',old:input.level,value:nextLevel},{label:'Competencia',old:current.proficiencyBonus,value:nextLevel>=13?5:nextLevel>=9?4:nextLevel>=5?3:2},{label:'Nivel de ranura',old:input.level>=9?5:input.level>=7?4:input.level>=5?3:input.level>=3?2:1,value:nextLevel>=9?5:nextLevel>=7?4:nextLevel>=5?3:nextLevel>=3?2:1},{label:'Invocaciones',old:input.invocations.length,value:invocationCount},{label:'Trucos',old:input.cantripIds.length,value:cantripCount},{label:'Conjuros preparados',old:input.preparedIds.length,value:preparedCount}].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} → {item.value}</strong></div>)}
   </div>
  </div>}
  {stage===1&&<div className="level-wizard-section">
   <h3>Decisiones de este nivel</h3>
   <LevelUpHitPointsPicker characterClass="warlock" value={hitDieRoll} onChange={setHitDieRoll}/>
   {fourteenth&&<fieldset className="level-wizard-fieldset"><legend>Arrojar al infierno · nivel 14</legend><p className="level-wizard-explanation">El rasgo se obtiene automáticamente. Su módulo aparece en la hoja del personaje: tú confirmas el impacto, la salvación y si el objetivo es infernal; la web solo ayuda con la tirada de 8d10 y el seguimiento de usos y ranuras.</p><p className="muted-note">No recibes ranuras nuevas, trucos, conjuros preparados ni invocaciones. En este nivel puedes sustituir como máximo un Arcanum entre los de nivel 6 y 7, pero no ambos.</p></fieldset>}
   {(eleventh||twelfth||thirteenth||fourteenth)&&<fieldset className="level-wizard-fieldset"><legend>Arcanum místico · conjuro de nivel 6 (elige uno)</legend>
    <p className="level-wizard-explanation">La elección es independiente de tus {preparedCount} conjuros ordinarios (niveles 1–5). El Arcanum se lanza una vez sin ranura y vuelve a estar disponible tras un descanso largo. Consulta cada ficha antes de escoger.</p>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_LEVEL_SIX_SPELLS.filter(matches).map(spell=><div className="wizard-spell-option" key={spell.id}>
     <label><input type="radio" name="warlock-mystic-arcanum-six" checked={arcanum===spell.id} onChange={()=>setArcanum(spell.id as typeof WARLOCK_SIXTH_LEVEL_IDS[number])}/><span>{spell.name}</span><small> · Nivel 6 · Arcanum</small></label>
     <WizardSpellDetails spell={spell} characterLevel={nextLevel} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>
    </div>)}</div>
    <p className="muted-note">Puedes mantener el Arcanum o sustituirlo por otro de nivel 6. El uso gastado no se recupera al subir de nivel. El buscador común filtra estas fichas sin borrar la selección.</p>
   </fieldset>}
   {(thirteenth||fourteenth)&&<fieldset className="level-wizard-fieldset"><legend>{fourteenth?'Arcanum místico · nivel 7 (mantener o sustituir)':'Nuevo Arcanum místico · conjuro de nivel 7 (elige uno)'}</legend>
    <p className="level-wizard-explanation">Elige un conjuro de nivel 7 de la lista de Brujo. No ocupa las doce preparaciones ordinarias ni gasta ranura. Tiene un uso propio que se recupera con descanso largo, independiente del Arcanum de nivel 6.</p>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_LEVEL_SEVEN_SPELLS.filter(matches).map(spell=><div className="wizard-spell-option" key={spell.id}>
     <label><input type="radio" name="warlock-mystic-arcanum-seven" checked={arcanum7===spell.id} onChange={()=>setArcanum7(spell.id as typeof WARLOCK_SEVENTH_LEVEL_IDS[number])}/><span>{spell.name}</span><small> · Nivel 7 · Arcanum</small></label>
     <WizardSpellDetails spell={spell} characterLevel={nextLevel} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/>
    </div>)}</div>
    <p className="muted-note">La búsqueda común filtra las fichas; conserva la selección aunque esté oculta por el filtro.</p>
   </fieldset>}
   {(fourth||eighth||twelfth)&&<fieldset className="level-wizard-fieldset"><legend>Dote Mejora de característica · nivel {nextLevel}</legend>
    <label className="field"><span>Distribución</span><select value={improvement.mode} onChange={event=>selectImprovementMode(event.target.value as FighterAbilityImprovement['mode'])}><option value="plus_two">+2 en una característica</option><option value="two_ones">+1 en dos características</option></select></label>
    <label className="field"><span>Primera característica</span><select value={improvement.first} onChange={event=>selectImprovementFirst(event.target.value as Ability)}>{ABILITIES.map(id=><option key={id} value={id}>{ABILITY_NAMES[id]} ({current.abilityScores[id]})</option>)}</select></label>
    {improvement.mode==='two_ones'&&<label className="field"><span>Segunda característica</span><select value={improvement.second??''} onChange={event=>setImprovement(prev=>({...prev,second:event.target.value as Ability}))}>{ABILITIES.filter(id=>id!==improvement.first).map(id=><option key={id} value={id}>{ABILITY_NAMES[id]} ({current.abilityScores[id]})</option>)}</select></label>}
    <p className="level-wizard-explanation">Máximo 20. Si aumentas Constitución también se recalculan los PG máximos de los {nextLevel} niveles. Esta implementación se centra en la dote Mejora de característica, como en Mago y Guerrero.</p>
   </fieldset>}
   {third&&<fieldset className="level-wizard-fieldset"><legend>Patrón sobrenatural · nivel 3</legend>
    <label className="field"><span>Subclase</span><select value="fiend" disabled><option value="fiend">Patrón Infernal</option></select></label>
    <p className="level-wizard-explanation"><strong>Bendición del Oscuro:</strong> cuando se cumpla el desencadenante del rasgo, podrás aplicarte manualmente {Math.max(1,current.abilityModifiers.charisma+3)} PG temporales desde la hoja. La web no decide cuándo derrotas a un enemigo.</p>
    <h4>Conjuros del Patrón Infernal · siempre preparados (4)</h4>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_FIEND_LEVEL_THREE_SPELLS.map(spell=><div className="wizard-spell-option" key={spell.id}><strong>{spell.name}</strong><small> · Nivel {spell.level}</small><WizardSpellDetails spell={spell} characterLevel={3} spellAttackBonus={current.spellAttackBonus} mode={mode}/></div>)}</div>
   </fieldset>}
   {fifth&&<fieldset className="level-wizard-fieldset"><legend>Nuevos conjuros del Patrón Infernal · nivel 5</legend>
    <p className="level-wizard-explanation">Estos dos se suman a los cuatro que ya tienes; no ocupan ninguna de tus seis preparaciones ordinarias.</p>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_FIEND_LEVEL_FIVE_SPELLS.map(spell=><div className="wizard-spell-option" key={spell.id}><strong>{spell.name}</strong><WizardSpellDetails spell={spell} characterLevel={5} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/></div>)}</div>
   </fieldset>}
   {seventh&&<fieldset className="level-wizard-fieldset"><legend>Nuevos conjuros del Patrón Infernal · nivel 7</legend>
    <p className="level-wizard-explanation">Escudo de fuego y Muro de fuego se añaden automáticamente a los seis anteriores. No ocupan ninguna de tus ocho preparaciones ordinarias.</p>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_FIEND_LEVEL_SEVEN_SPELLS.map(spell=><div className="wizard-spell-option" key={spell.id}><strong>{spell.name}</strong><WizardSpellDetails spell={spell} characterLevel={7} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/></div>)}</div>
   </fieldset>}
   {ninth&&<fieldset className="level-wizard-fieldset"><legend>Contactar con el patrón · nivel 9</legend>
    <p className="level-wizard-explanation">Contactar con otro plano se prepara automáticamente; una vez por descanso largo puedes lanzarlo sin gastar ranura para hablar con tu patrón y superas automáticamente su salvación de Inteligencia. Los diálogos son manuales.</p>
    <div className="wizard-spell-picker wizard-spell-choice-list">{WARLOCK_SPELLS_THROUGH_LEVEL_FIVE.filter(spell=>spell.id==='contact_other_plane').map(spell=><div className="wizard-spell-option" key={spell.id}><strong>{spell.name} · siempre preparado</strong><WizardSpellDetails spell={spell} characterLevel={9} spellAttackBonus={projected?.spellAttackBonus??current.spellAttackBonus} mode={mode}/></div>)}</div>
   </fieldset>}
   {tenth&&<fieldset className="level-wizard-fieldset"><legend>Resistencia infernal · nivel 10</legend>
    <p className="level-wizard-explanation">Tras confirmar la subida de nivel, termina un descanso corto o largo para poder elegir el tipo de daño al que resistir. No puedes elegir daño de fuerza. La resistencia elegida permanece hasta que la cambies en otro descanso.</p>
   </fieldset>}
   <fieldset className="level-wizard-fieldset"><legend>Invocaciones sobrenaturales ({invocations.length}/{invocationCount})</legend>
    <p className="level-wizard-explanation">{fourteenth||thirteenth?'Conservas ocho invocaciones; puedes sustituir como máximo una y deben mantener sus prerrequisitos.':twelfth?'Aprendes una octava invocación y puedes sustituir como máximo una de las siete anteriores. Hoja devoradora requiere Hoja sedienta.':eleventh||tenth?'Mantienes siete invocaciones y puedes sustituir como máximo una de las anteriores.':ninth?'Elige siete invocaciones en total; conserva al menos cinco anteriores y añade una nueva. Nuevas opciones: Bebedor de vida (Hoja), Don de los protectores (Tomo) y Visiones de reinos distantes.':eighth?'Mantienes seis invocaciones y puedes sustituir como máximo una, siempre respetando los requisitos de Pacto.':seventh?'Elige seis invocaciones y conserva al menos cuatro anteriores. Puedes sustituir una de las cinco anteriores y añadir una nueva; Susurros de la tumba se desbloquea en este nivel.':sixth?'Mantienes cinco invocaciones y puedes sustituir como máximo una; ninguna puede perder su pacto requerido.':fifth?'Elige cinco en total y conserva al menos dos de las tres anteriores. Las nuevas del nivel 5 incluyen ataques adicionales con Hoja y mejoras para familiares de Cadena.':third||fourth?'Puedes sustituir como máximo una invocación conocida.':'La primera puede conservarse o sustituirse.'} Todas deben ser distintas y cumplir los requisitos de nivel y pacto.</p>
    {invocations.map((id,index)=><label key={index} className="field"><span>{fourteenth||thirteenth?`Invocación ${index+1} (sustituible)`:twelfth?index<7?`Invocación anterior ${index+1} (sustituible)`:'Octava invocación (nueva)':eleventh||tenth?`Invocación ${index+1} (sustituible)`:ninth?index<6?`Invocación anterior ${index+1} (sustituible)`:'Séptima invocación (nueva)':eighth?`Invocación ${index+1} (sustituible)`:seventh?index<5?`Invocación anterior ${index+1} (sustituible)`:'Sexta invocación (nueva)':sixth?`Invocación ${index+1} (sustituible)`:fifth?index<3?`Invocación anterior ${index+1} (sustituible)`:`Nueva invocación ${index-2}`:third||fourth?`Invocación ${index+1} (sustituible)`:index===0?'Invocación inicial (sustituible)':`Invocación adicional ${index}`}</span>
     <select value={id} onChange={event=>selectInvocation(index,event.target.value as WarlockInvocationId)}>{(fourteenth||thirteenth||twelfth?WARLOCK_LEVEL_TWELVE_INVOCATIONS:eleventh||tenth||ninth?WARLOCK_LEVEL_NINE_INVOCATIONS:eighth||seventh?WARLOCK_LEVEL_SEVEN_INVOCATIONS:fifth||sixth?WARLOCK_LEVEL_FIVE_INVOCATIONS:WARLOCK_LEVEL_TWO_INVOCATIONS).map(option=><option key={option} value={option} disabled={invocations.some((selected,i)=>i!==index&&selected===option)}>{WARLOCK_INVOCATIONS[option].name}{WARLOCK_INVOCATION_PREREQUISITES[option]?' · requiere '+(WARLOCK_INVOCATION_PREREQUISITES[option]==='pact_of_blade'?'Hoja':WARLOCK_INVOCATION_PREREQUISITES[option]==='pact_of_tome'?'Tomo':WARLOCK_INVOCATION_PREREQUISITES[option]==='thirsting_blade'?'Hoja sedienta':'Cadena'):''}</option>)}</select>
     <small className="level-wizard-explanation">{WARLOCK_INVOCATIONS[id].summary}</small>
    </label>)}
    {invocations.includes('lessons_of_the_first_ones')&&<label className="field"><span>Dote de origen · Lecciones de los Primeros</span><select value={feat} disabled={availableFeats.length===0} onChange={event=>setFeat(event.target.value as 'alert'|'tough')}>{availableFeats.map(id=><option key={id} value={id}>{id==='alert'?'Alerta':'Duro'}</option>)}</select><small>{availableFeats.length===0?'No quedan dotes válidas; selecciona otra invocación.':'No se permite repetir dotes ya concedidas por el origen.'}</small></label>}
    {invocations.includes('pact_of_tome')&&<p className="muted-note">Si eliges Pacto del Tomo, se asignarán tres trucos y dos rituales válidos; podrás revisarlos en el editor del personaje.</p>}
   </fieldset>
   <label className="field"><span>Buscar conjuros por nombre o escuela</span><input value={spellFilter} onChange={event=>setSpellFilter(event.target.value)} placeholder="Ej.: descarga, evocación, maleficio..."/></label>
   <fieldset className="level-wizard-fieldset"><legend>Trucos de Brujo ({cantrips.length}/{cantripCount})</legend>
    <p className="muted-note">{fourteenth?'Mantienes cuatro trucos, con la posibilidad de sustituir como máximo uno.':thirteenth?'Conservas cuatro trucos; puedes sustituir uno y Descarga sobrenatural conserva tres rayos.':twelfth?'Mantienes cuatro trucos y puedes sustituir uno. Descarga sobrenatural sigue lanzando tres rayos.':eleventh?'Conservas los cuatro trucos; puedes sustituir uno. Los tres rayos de Descarga sobrenatural se lanzan por separado.':tenth?'Aprende un cuarto truco; puedes sustituir como máximo uno de los tres anteriores.':ninth||eighth||seventh||sixth||fifth?'Mantienes tres trucos y puedes sustituir uno anterior.':fourth?'Elige tres trucos; puedes sustituir como máximo uno anterior.':'Puedes cambiar uno de tus dos trucos existentes.'} Abre «Ver reglas y tiradas» antes de elegir.</p>
    {spellChoices(WARLOCK_LEVEL_ONE_CANTRIPS,cantrips,cantripCount,id=>setCantrips(previous=>toggleLimited(previous,id,cantripCount)))}
   </fieldset>
   <fieldset className="level-wizard-fieldset"><legend>Conjuros preparados ({prepared.length}/{preparedCount})</legend>
    <p className="muted-note">{fourteenth?'Mantienes doce preparados ordinarios y puedes sustituir uno. Los dos Arcanum no consumen elecciones de preparados.':thirteenth?'Elige doce conjuros ordinarios de niveles 1–5; conserva al menos diez de los once anteriores. Ambos Arcanum se eligen aparte y no ocupan preparaciones.':twelfth?'Conserva once conjuros ordinarios de niveles 1–5; puedes sustituir uno. El Arcanum de nivel 6 sigue fuera de esta lista.':eleventh?'Elige once conjuros ordinarios de niveles 1–5, conserva al menos nueve de los diez anteriores. El Arcanum de nivel 6 se escoge arriba y no ocupa esta lista.':tenth?'Mantén diez conjuros ordinarios de niveles 1–5: puedes sustituir como máximo uno, sin volver a elegir los gratuitos del patrón o Contactar con otro plano.':ninth?'Elige diez conjuros ordinarios de niveles 1 a 5, conserva al menos ocho de los nueve anteriores. Contactar con otro plano y los ocho del patrón están siempre preparados y no consumen elecciones.':eighth?'Elige nueve conjuros ordinarios de niveles 1 a 4: conserva al menos siete de los ocho anteriores y añade uno nuevo. Los ocho conjuros del patrón siempre preparados no cuentan contra este límite.':seventh?'Elige ocho conjuros ordinarios de niveles 1 a 4; conserva al menos seis de los siete anteriores. Los ocho conjuros del patrón siempre preparados no cuentan contra este límite.':sixth?'Elige siete conjuros ordinarios de niveles 1 a 3; conserva al menos cinco de los seis anteriores. El patrón mantiene seis conjuros siempre preparados sin contar contra este límite.':fifth?'Elige seis conjuros ordinarios de niveles 1 a 3. Puedes sustituir uno anterior y debes conservar al menos cuatro de los cinco. El patrón añade Bola de fuego y Nube apestosa automáticamente.':fourth?'Elige cinco conjuros normales de niveles 1 o 2, conservando al menos tres de los cuatro anteriores. El Patrón Infernal mantiene sus cuatro conjuros adicionales gratuitos.':third?'Elige cuatro conjuros normales de niveles 1 o 2. Puedes reemplazar uno anterior; los cuatro gratuitos del Patrón Infernal se añaden automáticamente.':'Elige tres conjuros en total. Puedes reemplazar como máximo uno de los dos ya preparados.'}</p>
    {spellChoices(spellOptions,prepared,preparedCount,id=>setPrepared(previous=>toggleLimited(previous,id,preparedCount)))}
   </fieldset>
   {choice.result?<p className="level-wizard-ok">Elecciones válidas. Puedes revisar las estadísticas antes de confirmar.</p>:<p className="level-wizard-error" role="status">Pendiente: {choice.error}</p>}
  </div>}
  {stage===2&&<div className="level-wizard-section">
   <h3>Revisión final del personaje</h3>
   {choice.result&&projected?<>
    <div className="level-wizard-stats">
     {[{label:'Nivel',old:input.level,value:nextLevel},{label:'PG máximos',old:current.maximumHitPoints,value:projected.maximumHitPoints},{label:'Competencia',old:current.proficiencyBonus,value:projected.proficiencyBonus},{label:'Trucos',old:input.cantripIds.length,value:cantrips.length},{label:'Invocaciones',old:input.invocations.length,value:invocations.length},{label:'Preparados ordinarios',old:input.preparedIds.length,value:prepared.length},{label:'Nivel de ranuras',old:input.level>=9?5:input.level>=7?4:input.level>=5?3:input.level>=3?2:1,value:nextLevel>=9?5:nextLevel>=7?4:nextLevel>=5?3:nextLevel>=3?2:1},{label:'Ataque mágico',old:current.spellAttackBonus,value:projected.spellAttackBonus}].map(item=><div className="level-wizard-stat" key={item.label}><span>{item.label}</span><strong>{item.old} → {item.value}</strong></div>)}
    </div>
    <div><h4>Invocaciones que tendrá tu Brujo</h4><ul className="level-wizard-small-list">{invocations.map(id=><li key={id}><strong>{WARLOCK_INVOCATIONS[id].name}</strong><p className="level-wizard-explanation">{WARLOCK_INVOCATIONS[id].summary}</p></li>)}</ul></div>
    <div><h4>Trucos y conjuros que conservarás</h4><ul className="level-wizard-small-list">{[...WARLOCK_LEVEL_ONE_CANTRIPS,...spellOptions].filter(spell=>cantrips.includes(spell.id)||prepared.includes(spell.id)).map(spell=><li key={spell.id}><strong>{spell.name}</strong><p className="level-wizard-explanation">{spell.description}</p></li>)}</ul></div>
    {eleventh&&<p className="level-wizard-choice-info"><strong>Arcanum místico:</strong> {WARLOCK_LEVEL_SIX_SPELLS.find(spell=>spell.id===arcanum)?.name} (nivel 6), disponible una vez por descanso largo sin usar ranuras. <strong>Magia de Pacto:</strong> tres ranuras de nivel 5; Astucia mágica recupera hasta dos gastadas. Once conjuros ordinarios, siete invocaciones, cuatro trucos y tres rayos de Descarga sobrenatural.</p>}
    {twelfth&&<p className="level-wizard-choice-info"><strong>Brujo Infernal de nivel 12:</strong> ocho invocaciones, once conjuros ordinarios, cuatro trucos y tres ranuras de nivel 5. <strong>Arcanum:</strong> {WARLOCK_LEVEL_SIX_SPELLS.find(spell=>spell.id===arcanum)?.name}; conserva su estado gastado. {invocations.includes('devouring_blade')?'Hoja devoradora permite tres ataques con el arma del pacto equipada si conservas Hoja sedienta.':'El ataque adicional de Hoja devoradora no se aplica porque no has elegido la invocación.'}</p>}
    {thirteenth&&<p className="level-wizard-choice-info"><strong>Brujo Infernal nivel 13:</strong> competencia +5, doce preparados ordinarios, ocho invocaciones y cuatro trucos. Tres ranuras de Pacto de nivel 5, más dos Arcanum independientes: {WARLOCK_LEVEL_SIX_SPELLS.find(spell=>spell.id===arcanum)?.name} (nivel 6; conserva su uso) y {WARLOCK_LEVEL_SEVEN_SPELLS.find(spell=>spell.id===arcanum7)?.name} (nivel 7, nuevo uso por descanso largo).</p>}
    {fourteenth&&<p className="level-wizard-choice-info"><strong>Brujo Infernal nivel 14:</strong> obtienes Arrojar al infierno, 1 uso por descanso largo recuperable al gastar una ranura de Pacto. Mantienes competencia +5, cuatro trucos, doce preparados ordinarios, ocho invocaciones, tres ranuras de nivel 5 y Arcanum de nivel 6 ({WARLOCK_LEVEL_SIX_SPELLS.find(spell=>spell.id===arcanum)?.name}) y nivel 7 ({WARLOCK_LEVEL_SEVEN_SPELLS.find(spell=>spell.id===arcanum7)?.name}), conservando sus gastos.</p>}
    {third&&<p className="level-wizard-choice-info"><strong>Patrón Infernal:</strong> Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión siempre preparados. Bendición del Oscuro: {Math.max(1,projected.abilityModifiers.charisma+3)} PG temporales cuando el jugador active su desencadenante.</p>}
    {(fourth||eighth||twelfth)&&<p className="level-wizard-choice-info"><strong>Mejora de característica de nivel {nextLevel}:</strong> {improvement.mode==='plus_two'?`+2 a ${ABILITY_NAMES[improvement.first]}`:`+1 a ${ABILITY_NAMES[improvement.first]} y +1 a ${ABILITY_NAMES[improvement.second??improvement.first]}`}. Se actualizan automáticamente ataque mágico, CD, PG y todas las tiradas relacionadas.</p>}
    {fifth&&<p className="level-wizard-choice-info"><strong>Patrón Infernal:</strong> mantienes los cuatro conjuros anteriores y añades Bola de fuego y Nube apestosa. Los dos huecos de Pacto son de nivel 3. Descarga sobrenatural lanza dos rayos. Las invocaciones de Hoja o Cadena se reflejan en sus módulos correspondientes.</p>}
    {sixth&&<p className="level-wizard-choice-info"><strong>Suerte del Oscuro:</strong> {Math.max(1,projected.abilityModifiers.charisma)} usos por descanso largo para sumar 1d10 a una prueba o salvación después de ver el d20. La tirada del rasgo se activa manualmente desde la hoja; mantienes dos ranuras de nivel 3, tres trucos y cinco invocaciones.</p>}
    {seventh&&<p className="level-wizard-choice-info"><strong>Patrón Infernal nivel 7:</strong> dos ranuras de nivel 4, ocho preparados ordinarios, seis invocaciones y ocho conjuros gratuitos del patrón. Castigo sobrenatural escala a 5d8 con las ranuras de este nivel. Conservas Suerte del Oscuro.</p>}
    {eighth&&<p className="level-wizard-choice-info"><strong>Brujo Infernal nivel 8:</strong> nueve preparados ordinarios, seis invocaciones y tres trucos. Mantienes dos ranuras de Pacto de nivel 4, ocho conjuros gratuitos del patrón y el uso de Suerte del Oscuro.</p>}
    {ninth&&<p className="level-wizard-choice-info"><strong>Brujo Infernal nivel 9:</strong> siete invocaciones, diez conjuros ordinarios, dos ranuras de nivel 5 y competencia +4. Contactar con otro plano está siempre preparado y puede lanzarse gratuitamente una vez por descanso largo para hablar con tu patrón.</p>}
    {tenth&&<p className="level-wizard-choice-info"><strong>Brujo Infernal nivel 10:</strong> cuatro trucos, diez conjuros ordinarios, siete invocaciones y dos ranuras de nivel 5. Resistencia infernal se elige tras descansar corto o largo desde la hoja. Esta elección no se realiza durante la subida y no afecta la vida automáticamente.</p>}
    <p className="level-wizard-choice-info"><strong>Dado de golpe elegido: {hitDieRoll}</strong> El motor calcula Constitución y beneficios pasivos; los PG actuales conservan el daño acumulado.</p>
    <p className="muted-note">Se mantienen inventario, retrato, compañeros e inspiración. Tras confirmar, pulsa Guardar cambios para persistir el resultado.</p>
   </>:<p className="level-wizard-error" role="alert">{choice.error}</p>}
   {commitError&&<p className="level-wizard-error" role="alert">{commitError}</p>}
  </div>}
 </LevelUpDialogFrame>;
}
