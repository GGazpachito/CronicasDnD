/** Pasos 69, 72, 73 y 74: transiciones explícitas de Brujo 1→2→3→4→5 (D&D 2024).
 * Las elecciones se validan aquí, no únicamente en los controles React.
 */
import {calculateWarlockOne,makeWarlockCharacterSnapshot,WARLOCK_INVOCATIONS,WARLOCK_INVOCATION_PREREQUISITES,WARLOCK_LEVEL_ONE_INVOCATIONS,type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId,type WarlockLevelTwoHistory,type WarlockLevelThreeHistory,type WarlockLevelFourHistory} from './warlock';
import type {FighterAbilityImprovement} from './progression';
import {TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS} from './warlock-spells';
import type {LevelDownSummary} from './level-down';

export type WarlockLevelTwoChoices=Readonly<{
 invocations:readonly WarlockInvocationId[];
 cantripIds:readonly string[];
 preparedIds:readonly string[];
 level2HitDieRoll:number;
 lessonsFeat?:'alert'|'tough';
 tomeCantripIds?:readonly string[];
 tomeRitualIds?:readonly string[];
}>;

export function advanceWarlockToLevelTwo(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelTwoChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==1)throw new RangeError('Solo se puede subir de nivel 1 a nivel 2');
 const previous=makeWarlockCharacterSnapshot(input,state);
 if(!choices.invocations.includes(input.invocations[0])&&choices.invocations.length!==3)throw new RangeError('Elige tres invocaciones');
 if(choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<1)
  throw new RangeError('Al subir nivel solo puedes sustituir un truco');
 if(choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<1)
  throw new RangeError('Al subir nivel solo puedes sustituir un conjuro preparado y añadir uno nuevo');
 const blade=choices.invocations.includes('pact_of_blade');
 const tome=choices.invocations.includes('pact_of_tome');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={
  ...input,level:2,invocations:choices.invocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  level2HitDieRoll:choices.level2HitDieRoll,
  lessonsFeat:choices.invocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined
 };
 const nextSheet=calculateWarlockOne(nextInput,state);
 const oldMaximum=calculateWarlockOne(input,state).maximumHitPoints;
 // Mantener el daño acumulado. La subida de nivel aumenta PG actuales si el personaje estaba sano.
 const damage=oldMaximum-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={
  ...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  secondPactSlotSpent:false,magicalCunningUsed:false,
  mageArmorActive:choices.invocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:choices.invocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:choices.invocations.includes('pact_of_chain')?state.familiarName:''
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

export type WarlockLevelThreeChoices=Readonly<{
 subclassId:'fiend';invocations:readonly WarlockInvocationId[];
 cantripIds:readonly string[];preparedIds:readonly string[];
 level3HitDieRoll:number;lessonsFeat?:'alert'|'tough';
 tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
}>;

/** Al nivel 3: Patrón Infernal y sus 4 conjuros gratuitos, sin consumir las 4 elecciones ordinarias. */
export function advanceWarlockToLevelThree(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelThreeChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==2)throw new RangeError('Solo se puede subir de nivel 2 a nivel 3');
 const previous=makeWarlockCharacterSnapshot(input,state);
 if(!Array.isArray(choices.invocations)||choices.invocations.length!==3||choices.invocations.filter(id=>input.invocations.includes(id)).length<2)
  throw new RangeError('Se mantienen tres invocaciones; solo puedes sustituir una');
 if(!Array.isArray(choices.cantripIds)||choices.cantripIds.length!==2||choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<1)
  throw new RangeError('Conserva al menos uno de los dos trucos originales');
 if(!Array.isArray(choices.preparedIds)||choices.preparedIds.length!==4||choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<2)
  throw new RangeError('Conserva al menos dos de los tres conjuros preparados y añade uno');
 if(choices.subclassId!=='fiend')throw new RangeError('Patrón Infernal no seleccionado');
 const history:WarlockLevelTwoHistory={
  invocations:[...input.invocations],cantripIds:[...input.cantripIds],preparedIds:[...input.preparedIds],
  lessonsFeat:input.lessonsFeat,pactWeaponId:input.pactWeaponId,
  tomeCantripIds:input.tomeCantripIds,tomeRitualIds:input.tomeRitualIds,
  mageArmorActive:previous.warlockState.mageArmorActive,tomePresent:previous.warlockState.tomePresent,
  familiarForm:previous.warlockState.familiarForm,familiarName:previous.warlockState.familiarName,
 };
 const tome=choices.invocations.includes('pact_of_tome');
 const blade=choices.invocations.includes('pact_of_blade');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={
  ...input,level:3,subclassId:choices.subclassId,level3HitDieRoll:choices.level3HitDieRoll,level3History:history,
  invocations:choices.invocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  lessonsFeat:choices.invocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined,
 };
 const nextSheet=calculateWarlockOne(nextInput,state);
 const before=calculateWarlockOne(input,state);
 const damage=before.maximumHitPoints-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  mageArmorActive:choices.invocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:choices.invocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:choices.invocations.includes('pact_of_chain')?state.familiarName:'',
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

export type WarlockLevelFourChoices=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 level4HitDieRoll:number;level4Improvement:FighterAbilityImprovement;
 lessonsFeat?:'alert'|'tough';tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
}>;

/** Nivel 4: dote Mejora de característica, 3 trucos, 5 preparados y ranuras intactas de nivel 2. */
export function advanceWarlockToLevelFour(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelFourChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==3)throw new RangeError('Solo se puede subir de nivel 3 a nivel 4');
 const previous=makeWarlockCharacterSnapshot(input,state);
 if(!Array.isArray(choices.invocations)||choices.invocations.length!==3||choices.invocations.filter(id=>input.invocations.includes(id)).length<2)
  throw new RangeError('Conserva al menos dos invocaciones; solo puedes sustituir una');
 if(!Array.isArray(choices.cantripIds)||choices.cantripIds.length!==3||choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<1)
  throw new RangeError('Conserva al menos uno de los dos trucos y añade el tercero');
 if(!Array.isArray(choices.preparedIds)||choices.preparedIds.length!==5||choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<3)
  throw new RangeError('Conserva al menos tres conjuros preparados y añade el quinto');
 const history:WarlockLevelThreeHistory={
  invocations:[...input.invocations],cantripIds:[...input.cantripIds],preparedIds:[...input.preparedIds],
  lessonsFeat:input.lessonsFeat,pactWeaponId:input.pactWeaponId,
  tomeCantripIds:input.tomeCantripIds,tomeRitualIds:input.tomeRitualIds,
  mageArmorActive:previous.warlockState.mageArmorActive,tomePresent:previous.warlockState.tomePresent,
  familiarForm:previous.warlockState.familiarForm,familiarName:previous.warlockState.familiarName,
 };
 const tome=choices.invocations.includes('pact_of_tome'),blade=choices.invocations.includes('pact_of_blade');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={...input,level:4,level4HitDieRoll:choices.level4HitDieRoll,
  level4Improvement:choices.level4Improvement,level4History:history,
  invocations:choices.invocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  lessonsFeat:choices.invocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined,
 };
 const nextSheet=calculateWarlockOne(nextInput,state),before=calculateWarlockOne(input,state);
 const damage=before.maximumHitPoints-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  mageArmorActive:choices.invocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:choices.invocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:choices.invocations.includes('pact_of_chain')?state.familiarName:'',
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

export type WarlockLevelFiveChoices=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 level5HitDieRoll:number;lessonsFeat?:'alert'|'tough';tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
}>;

/** Nivel 5: +3 competencia, dos invocaciones nuevas, 6 preparados y dos ranuras de nivel 3. */
export function advanceWarlockToLevelFive(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelFiveChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==4)throw new RangeError('Solo se puede subir de nivel 4 a nivel 5');
 const previous=makeWarlockCharacterSnapshot(input,state);
 if(!Array.isArray(choices.invocations)||choices.invocations.length!==5||new Set(choices.invocations).size!==5||choices.invocations.filter(id=>input.invocations.includes(id)).length<2)
  throw new RangeError('Debes elegir cinco invocaciones diferentes y conservar al menos dos de las tres anteriores');
 const selectedInvocations:readonly WarlockInvocationId[]=choices.invocations;
 if(selectedInvocations.some(id=>{
  const requiredPact=WARLOCK_INVOCATION_PREREQUISITES[id];
  return requiredPact!==undefined&&!selectedInvocations.includes(requiredPact);
 }))
  throw new RangeError('Hoja sedienta y Castigo sobrenatural requieren Pacto de la Hoja; Investidura requiere Pacto de la Cadena');
 if(!Array.isArray(choices.cantripIds)||choices.cantripIds.length!==3||choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<2)
  throw new RangeError('Mantén tres trucos, pudiendo sustituir solamente uno');
 if(!Array.isArray(choices.preparedIds)||choices.preparedIds.length!==6||choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<4)
  throw new RangeError('Elige seis preparados ordinarios y conserva al menos cuatro de los cinco anteriores');
 const history:WarlockLevelFourHistory={
  invocations:[...input.invocations],cantripIds:[...input.cantripIds],preparedIds:[...input.preparedIds],
  lessonsFeat:input.lessonsFeat,pactWeaponId:input.pactWeaponId,tomeCantripIds:input.tomeCantripIds,tomeRitualIds:input.tomeRitualIds,
  mageArmorActive:previous.warlockState.mageArmorActive,tomePresent:previous.warlockState.tomePresent,
  familiarForm:previous.warlockState.familiarForm,familiarName:previous.warlockState.familiarName,
 };
 const blade=choices.invocations.includes('pact_of_blade'),tome=choices.invocations.includes('pact_of_tome');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={...input,level:5,level5HitDieRoll:choices.level5HitDieRoll,level5History:history,
  invocations:choices.invocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  lessonsFeat:choices.invocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined,
 };
 const nextSheet=calculateWarlockOne(nextInput,state),before=calculateWarlockOne(input,state);
 const damage=before.maximumHitPoints-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  mageArmorActive:choices.invocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:choices.invocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:choices.invocations.includes('pact_of_chain')?state.familiarName:'',
  familiarInvestmentMovement:choices.invocations.includes('investment_of_the_chain_master')?'fly':undefined,
  giftOfDepthsUsed:choices.invocations.includes('gift_of_the_depths')?false:undefined,
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

/** El descenso comparte el mismo LevelDownDialog de Guerrero/Mago.
 * Como la lista histórica del nivel 1 no se guardaba en los snapshots previos,
 * retiene la primera invocación legal y los dos primeros conjuros/trucos.
 * La vista previa lo explica ANTES de confirmar; nunca muta el origen.
 */
export function previewWarlockLevelDown(input:GuidedWarlockInput,state:WarlockOneState){
 if(input.level===5){
  const previous=makeWarlockCharacterSnapshot(input,state);
  const history=input.level5History;
  if(!history)throw new RangeError('No existe historial para regresar al nivel 4');
  const {level5HitDieRoll,level5History,invocations,cantripIds,preparedIds,lessonsFeat,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
  void level5HitDieRoll;void level5History;void invocations;void cantripIds;void preparedIds;void lessonsFeat;void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
  const nextInput:GuidedWarlockInput={...rest,level:4,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   ...(history.lessonsFeat?{lessonsFeat:history.lessonsFeat}:{}),
   ...(history.pactWeaponId?{pactWeaponId:history.pactWeaponId}:{}),
   ...(history.tomeCantripIds?{tomeCantripIds:history.tomeCantripIds}:{}),
   ...(history.tomeRitualIds?{tomeRitualIds:history.tomeRitualIds}:{}),
  };
  const before=calculateWarlockOne(input,state),after=calculateWarlockOne(nextInput,state);
  const oldState=previous.warlockState;
  const nextState:WarlockOneState={...oldState,
   hitPointsCurrent:Math.max(0,Math.min(after.maximumHitPoints,oldState.hitPointsCurrent-(before.maximumHitPoints-after.maximumHitPoints))),
   mageArmorActive:history.mageArmorActive,tomePresent:history.tomePresent,
   familiarForm:history.familiarForm,familiarName:history.familiarName,familiarInvestmentMovement:undefined,giftOfDepthsUsed:undefined,
  };
  const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
  const summary:LevelDownSummary={className:'Brujo',fromLevel:5,toLevel:4,
   lost:[
    {title:'Dos invocaciones sobrenaturales',description:'Se recuperan exactamente las tres invocaciones de nivel 4 y desaparecen las dos adicionales, así como los beneficios que dependan de ellas.'},
    {title:'Conjuros de nivel 3 y patrón',description:'Las ranuras regresan a nivel 2; se retira el sexto preparado y los conjuros gratuitos Bola de fuego y Nube apestosa.'},
    {title:'Competencia y trucos',description:'La competencia vuelve de +3 a +2. Se restauran los tres trucos conocidos antes de la subida.'},
   ],changes:[
    {title:'Puntos de golpe',description:`PG máximos: ${before.maximumHitPoints} → ${after.maximumHitPoints}. PG actuales: ${oldState.hitPointsCurrent} → ${snapshot.warlockState.hitPointsCurrent}.`},
    {title:'Magia de Pacto',description:'Mantienes dos ranuras, ahora de nivel 2, y vuelves a cinco preparados ordinarios y cuatro conjuros gratuitos del patrón.'},
   ],preserved:['Identidad, retrato, equipo y compañeros manuales','Recursos de Pacto gastados, Astucia mágica, inspiración y marcas de muerte','Historial de elecciones de nivel 3 para poder continuar de 4→3'],
  };
  return {...summary,snapshot};
 }
 if(input.level===4){
  const previous=makeWarlockCharacterSnapshot(input,state);
  const history=input.level4History;
  if(!history)throw new RangeError('No existe historial para regresar al nivel 3');
  const {level4HitDieRoll,level4Improvement,level4History,invocations,cantripIds,preparedIds,lessonsFeat,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
  void level4HitDieRoll;void level4Improvement;void level4History;void invocations;void cantripIds;void preparedIds;void lessonsFeat;void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
  const nextInput:GuidedWarlockInput={...rest,level:3,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   ...(history.lessonsFeat?{lessonsFeat:history.lessonsFeat}:{}),
   ...(history.pactWeaponId?{pactWeaponId:history.pactWeaponId}:{}),
   ...(history.tomeCantripIds?{tomeCantripIds:history.tomeCantripIds}:{}),
   ...(history.tomeRitualIds?{tomeRitualIds:history.tomeRitualIds}:{}),
  };
  const before=calculateWarlockOne(input,state),after=calculateWarlockOne(nextInput,state);
  const oldState=previous.warlockState;
  const nextState:WarlockOneState={...oldState,
   hitPointsCurrent:Math.max(0,Math.min(after.maximumHitPoints,oldState.hitPointsCurrent-(before.maximumHitPoints-after.maximumHitPoints))),
   mageArmorActive:history.mageArmorActive,tomePresent:history.tomePresent,
   familiarForm:history.familiarForm,familiarName:history.familiarName,
  };
  const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
  const summary:LevelDownSummary={className:'Brujo',fromLevel:4,toLevel:3,
   lost:[
    {title:'Mejora de característica',description:'Se elimina la mejora +2 o +1/+1 del nivel 4 y se recalculan todas las estadísticas dependientes.'},
    {title:'Tercer truco y quinto conjuro',description:'Se restauran exactamente los dos trucos y cuatro conjuros ordinarios preparados del nivel 3.'},
    {title:'Sustituciones de invocaciones',description:'Se recuperan las tres invocaciones y los vínculos elegidos antes de subir al nivel 4.'},
   ],changes:[
    {title:'Puntos de golpe',description:`PG máximos: ${before.maximumHitPoints} → ${after.maximumHitPoints}. PG actuales: ${oldState.hitPointsCurrent} → ${snapshot.warlockState.hitPointsCurrent}.`},
    {title:'Magia de Pacto',description:'Mantienes dos ranuras de nivel 2, cuatro conjuros ordinarios y cuatro conjuros del Patrón Infernal.'},
   ],preserved:['Identidad, equipo, retrato, notas y compañeros manuales','Marcas de muerte, inspiración, magia de pacto y Astucia mágica','Patrón Infernal y su historial de nivel 2; las elecciones originales de nivel 3'],
  };
  return {...summary,snapshot};
 }
 if(input.level===3){
  const previous=makeWarlockCharacterSnapshot(input,state);
  const history=input.level3History;
  if(!history)throw new RangeError('No existe un historial para retroceder al nivel 2');
  const {level3HitDieRoll,subclassId,level3History,invocations,cantripIds,preparedIds,lessonsFeat,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
  void level3HitDieRoll;void subclassId;void level3History;void invocations;void cantripIds;void preparedIds;void lessonsFeat;void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
  const nextInput:GuidedWarlockInput={...rest,level:2,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   ...(history.lessonsFeat?{lessonsFeat:history.lessonsFeat}:{}),
   ...(history.pactWeaponId?{pactWeaponId:history.pactWeaponId}:{}),
   ...(history.tomeCantripIds?{tomeCantripIds:history.tomeCantripIds}:{}),
   ...(history.tomeRitualIds?{tomeRitualIds:history.tomeRitualIds}:{}),
  };
  const before=calculateWarlockOne(input,state),after=calculateWarlockOne(nextInput,state);
  const oldState=previous.warlockState;
  const nextState:WarlockOneState={...oldState,
   hitPointsCurrent:Math.max(0,Math.min(after.maximumHitPoints,oldState.hitPointsCurrent-(before.maximumHitPoints-after.maximumHitPoints))),
   mageArmorActive:history.mageArmorActive,tomePresent:history.tomePresent,
   familiarForm:history.familiarForm,familiarName:history.familiarName,
  };
  const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
  const summary:LevelDownSummary={className:'Brujo',fromLevel:3,toLevel:2,
   lost:[
    {title:'Patrón Infernal',description:'Pierdes Bendición del Oscuro y sus cuatro conjuros siempre preparados (Manos ardientes, Orden imperiosa, Rayo abrasador y Sugestión).'},
    {title:'Magia de Pacto',description:'Las dos ranuras pasan de nivel 2 a nivel 1. Los conjuros ordinarios preparados regresan de cuatro a tres.'},
    {title:'Elecciones del nivel 3',description:'Se restauran las invocaciones, trucos, preparados y los vínculos del Tomo/Hoja guardados en el nivel 2.'},
   ],changes:[
    {title:'Puntos de golpe',description:`PG máximos: ${before.maximumHitPoints} → ${after.maximumHitPoints}. PG actuales: ${oldState.hitPointsCurrent} → ${snapshot.warlockState.hitPointsCurrent}.`},
    {title:'Conjuros preparados',description:'Se restauran los tres preparados ordinarios previos y se retiran los cuatro gratuitos del Patrón Infernal.'},
   ],preserved:['Identidad, retrato, equipo y monedas','Compañeros manuales, inspiración y marcas de muerte','Gasto de las dos ranuras y Astucia mágica','Elecciones de nivel 2 anteriores a la subida'],
  };
  return {...summary,snapshot};
 }
 if(input.level!==2)throw new RangeError('Brujo: solo se admite retroceso consecutivo de nivel 4 a 1');
 const previous=makeWarlockCharacterSnapshot(input,state);
 const initialInvocation=input.invocations.find(id=>WARLOCK_LEVEL_ONE_INVOCATIONS.includes(id))??'pact_of_blade';
 const {level2HitDieRoll,lessonsFeat,invocations,cantripIds,preparedIds,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
 void level2HitDieRoll;void lessonsFeat;void invocations;
 const nextInput:GuidedWarlockInput={
  ...rest,level:1,invocations:[initialInvocation],
  cantripIds:cantripIds.slice(0,2),preparedIds:preparedIds.slice(0,2),
  ...(initialInvocation==='pact_of_blade'&&pactWeaponId?{pactWeaponId}:{}),
  ...(initialInvocation==='pact_of_tome'?{tomeCantripIds,tomeRitualIds}:{}),
 };
 const before=calculateWarlockOne(input,state),after=calculateWarlockOne(nextInput,state);
 const oldState=previous.warlockState;
 const nextState:WarlockOneState={...oldState,
  hitPointsCurrent:Math.max(0,Math.min(after.maximumHitPoints,oldState.hitPointsCurrent-(before.maximumHitPoints-after.maximumHitPoints))),
  pactSlotSpent:oldState.pactSlotSpent,
  secondPactSlotSpent:undefined,magicalCunningUsed:undefined,
  mageArmorActive:initialInvocation==='armor_of_shadows'?oldState.mageArmorActive:false,
  tomePresent:initialInvocation==='pact_of_tome'?oldState.tomePresent:false,
  familiarForm:initialInvocation==='pact_of_chain'?oldState.familiarForm:null,
  familiarName:initialInvocation==='pact_of_chain'?oldState.familiarName:'',
 };
 const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
 const summary:LevelDownSummary={
  className:'Brujo',fromLevel:2,toLevel:1,
  lost:[
   {title:'Invocaciones sobrenaturales',description:`Se conserva «${WARLOCK_INVOCATIONS[initialInvocation].name}»; se retiran las otras dos invocaciones del nivel 2.`},
   {title:'Conjuros y trucos',description:`Se retienen los dos primeros trucos y los dos primeros conjuros preparados de la lista actual. Se pierde el tercer conjuro preparado. No hay historial del orden original del nivel 1.`},
   {title:'Astucia mágica',description:'Se pierde el uso de Astucia mágica, disponible solo desde nivel 2.'},
   {title:'Segunda ranura de Pacto',description:'Solo quedará una ranura de nivel 1; se conservará la marca de gasto de la primera.'},
  ],
  changes:[
   {title:'Puntos de golpe',description:`PG máximos: ${before.maximumHitPoints} → ${after.maximumHitPoints}. PG actuales: ${oldState.hitPointsCurrent} → ${snapshot.warlockState.hitPointsCurrent}, conservando el daño cuando es posible.`},
   {title:'Hechicería de Pacto',description:'Ranuras de nivel 1: 2 → 1; conjuros preparados: 3 → 2; invocaciones: 3 → 1.'},
  ],
  preserved:['Identidad, origen, equipo, monedas y retrato','Compañeros manuales, inspiración y marcas de muerte','Daño acumulado y gasto de la primera ranura, cuando sea compatible'],
 };
 return {...summary,snapshot};
}
