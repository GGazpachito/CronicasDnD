/** Pasos 69, 72–77: transiciones explícitas de Brujo 1→2→3→4→5→6→7→8 (D&D 2024).
 * Las elecciones se validan aquí, no únicamente en los controles React.
 */
import {calculateWarlockOne,makeWarlockCharacterSnapshot,WARLOCK_INVOCATIONS,WARLOCK_INVOCATION_PREREQUISITES,WARLOCK_LEVEL_ONE_INVOCATIONS,type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId,type WarlockLevelTwoHistory,type WarlockLevelThreeHistory,type WarlockLevelFourHistory,type WarlockLevelFiveHistory,type WarlockLevelSixHistory,type WarlockLevelSevenHistory} from './warlock';
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

export type WarlockLevelSixChoices=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 level6HitDieRoll:number;lessonsFeat?:'alert'|'tough';tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
}>;

/** Nivel 6: Suerte del Oscuro, séptimo preparado, mismas invocaciones y ranuras de nivel 3. */
export function advanceWarlockToLevelSix(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelSixChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==5||input.subclassId!=='fiend')throw new RangeError('Solo se puede subir de Brujo Infernal nivel 5 a nivel 6');
 const previous=makeWarlockCharacterSnapshot(input,state);
 const selectedInvocations:readonly WarlockInvocationId[]=choices.invocations;
 if(!Array.isArray(choices.invocations)||selectedInvocations.length!==5||new Set(selectedInvocations).size!==5||selectedInvocations.filter(id=>input.invocations.includes(id)).length<4)
  throw new RangeError('Conserva al menos cuatro de las cinco invocaciones; solo puedes sustituir una');
 if(selectedInvocations.some(id=>{const prerequisite=WARLOCK_INVOCATION_PREREQUISITES[id];return prerequisite!==undefined&&!selectedInvocations.includes(prerequisite);}))
  throw new RangeError('Las invocaciones dependientes requieren mantener el Pacto de la Hoja o de la Cadena');
 if(!Array.isArray(choices.cantripIds)||choices.cantripIds.length!==3||new Set(choices.cantripIds).size!==3||choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<2)
  throw new RangeError('Conserva al menos dos de tus tres trucos');
 if(!Array.isArray(choices.preparedIds)||choices.preparedIds.length!==7||new Set(choices.preparedIds).size!==7||choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<5)
  throw new RangeError('Elige siete preparados ordinarios y conserva al menos cinco de los seis anteriores');
 const history:WarlockLevelFiveHistory={
  invocations:[...input.invocations],cantripIds:[...input.cantripIds],preparedIds:[...input.preparedIds],
  lessonsFeat:input.lessonsFeat,pactWeaponId:input.pactWeaponId,tomeCantripIds:input.tomeCantripIds,tomeRitualIds:input.tomeRitualIds,
  mageArmorActive:previous.warlockState.mageArmorActive,tomePresent:previous.warlockState.tomePresent,
  familiarForm:previous.warlockState.familiarForm,familiarName:previous.warlockState.familiarName,
  familiarInvestmentMovement:previous.warlockState.familiarInvestmentMovement,giftOfDepthsUsed:previous.warlockState.giftOfDepthsUsed,
 };
 const blade=selectedInvocations.includes('pact_of_blade'),tome=selectedInvocations.includes('pact_of_tome');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={...input,level:6,level6HitDieRoll:choices.level6HitDieRoll,level6History:history,
  invocations:selectedInvocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  lessonsFeat:selectedInvocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined,
 };
 const nextSheet=calculateWarlockOne(nextInput,state),before=calculateWarlockOne(input,state);
 const damage=before.maximumHitPoints-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  mageArmorActive:selectedInvocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:selectedInvocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:selectedInvocations.includes('pact_of_chain')?state.familiarName:'',
  familiarInvestmentMovement:selectedInvocations.includes('investment_of_the_chain_master')?state.familiarInvestmentMovement??'fly':undefined,
  giftOfDepthsUsed:selectedInvocations.includes('gift_of_the_depths')?state.giftOfDepthsUsed??false:undefined,
  darkOnesOwnLuckUsed:0,
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

export type WarlockLevelSevenChoices=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 level7HitDieRoll:number;lessonsFeat?:'alert'|'tough';tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
}>;

/** Nivel 7: sexta invocación, ocho preparados, ranuras de nivel 4 y dos conjuros extra del patrón. */
export function advanceWarlockToLevelSeven(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelSevenChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==6||input.subclassId!=='fiend')throw new RangeError('Solo se puede subir de Brujo Infernal nivel 6 a nivel 7');
 const previous=makeWarlockCharacterSnapshot(input,state);
 const selectedInvocations:readonly WarlockInvocationId[]=choices.invocations;
 if(!Array.isArray(choices.invocations)||selectedInvocations.length!==6||new Set(selectedInvocations).size!==6||selectedInvocations.filter(id=>input.invocations.includes(id)).length<4)
  throw new RangeError('Elige seis invocaciones diferentes: conserva al menos cuatro anteriores y añade la sexta');
 if(selectedInvocations.some(id=>{const prerequisite=WARLOCK_INVOCATION_PREREQUISITES[id];return prerequisite!==undefined&&!selectedInvocations.includes(prerequisite);}))
  throw new RangeError('Mantén el Pacto de la Hoja o Cadena que requieran tus invocaciones');
 if(!Array.isArray(choices.cantripIds)||choices.cantripIds.length!==3||new Set(choices.cantripIds).size!==3||choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<2)
  throw new RangeError('Conserva al menos dos de tus tres trucos anteriores');
 if(!Array.isArray(choices.preparedIds)||choices.preparedIds.length!==8||new Set(choices.preparedIds).size!==8||choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<6)
  throw new RangeError('Elige ocho conjuros ordinarios y conserva al menos seis de los siete anteriores');
 const history:WarlockLevelSixHistory={
  invocations:[...input.invocations],cantripIds:[...input.cantripIds],preparedIds:[...input.preparedIds],
  lessonsFeat:input.lessonsFeat,pactWeaponId:input.pactWeaponId,tomeCantripIds:input.tomeCantripIds,tomeRitualIds:input.tomeRitualIds,
  mageArmorActive:previous.warlockState.mageArmorActive,tomePresent:previous.warlockState.tomePresent,
  familiarForm:previous.warlockState.familiarForm,familiarName:previous.warlockState.familiarName,
  familiarInvestmentMovement:previous.warlockState.familiarInvestmentMovement,giftOfDepthsUsed:previous.warlockState.giftOfDepthsUsed,
  darkOnesOwnLuckUsed:previous.warlockState.darkOnesOwnLuckUsed,
 };
 const blade=selectedInvocations.includes('pact_of_blade'),tome=selectedInvocations.includes('pact_of_tome');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={...input,level:7,level7HitDieRoll:choices.level7HitDieRoll,level7History:history,
  invocations:selectedInvocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  lessonsFeat:selectedInvocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined,
 };
 const nextSheet=calculateWarlockOne(nextInput,state),before=calculateWarlockOne(input,state);
 const damage=before.maximumHitPoints-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  mageArmorActive:selectedInvocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:selectedInvocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:selectedInvocations.includes('pact_of_chain')?state.familiarName:'',
  familiarInvestmentMovement:selectedInvocations.includes('investment_of_the_chain_master')?state.familiarInvestmentMovement??'fly':undefined,
  giftOfDepthsUsed:selectedInvocations.includes('gift_of_the_depths')?state.giftOfDepthsUsed??false:undefined,
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

export type WarlockLevelEightChoices=Readonly<{
 invocations:readonly WarlockInvocationId[];cantripIds:readonly string[];preparedIds:readonly string[];
 level8HitDieRoll:number;level8Improvement:FighterAbilityImprovement;
 lessonsFeat?:'alert'|'tough';tomeCantripIds?:readonly string[];tomeRitualIds?:readonly string[];
}>;

/** 7→8: +1 preparación ordinaria, Mejora de característica, 1d8 PG y mismos recursos de Pacto. */
export function advanceWarlockToLevelEight(input:GuidedWarlockInput,state:WarlockOneState,choices:WarlockLevelEightChoices):{
 input:GuidedWarlockInput;state:WarlockOneState;
}{
 if(input.level!==7||input.subclassId!=='fiend')throw new RangeError('Solo se puede subir de Brujo Infernal nivel 7 a nivel 8');
 const previous=makeWarlockCharacterSnapshot(input,state);
 if(!Array.isArray(choices.invocations)||choices.invocations.length!==6||new Set(choices.invocations).size!==6||choices.invocations.filter(id=>input.invocations.includes(id)).length<5)
  throw new RangeError('Conserva al menos cinco de las seis invocaciones; solo puedes sustituir una');
 const selectedInvocations:readonly WarlockInvocationId[]=choices.invocations;
 if(selectedInvocations.some((id:WarlockInvocationId)=>{const prerequisite=WARLOCK_INVOCATION_PREREQUISITES[id];return prerequisite!==undefined&&!selectedInvocations.includes(prerequisite);}))
  throw new RangeError('Las invocaciones requieren mantener su Pacto de la Hoja o Cadena');
 if(!Array.isArray(choices.cantripIds)||choices.cantripIds.length!==3||new Set(choices.cantripIds).size!==3||choices.cantripIds.filter(id=>input.cantripIds.includes(id)).length<2)
  throw new RangeError('Conserva al menos dos de tus tres trucos; solo puedes sustituir uno');
 if(!Array.isArray(choices.preparedIds)||choices.preparedIds.length!==9||new Set(choices.preparedIds).size!==9||choices.preparedIds.filter(id=>input.preparedIds.includes(id)).length<7)
  throw new RangeError('Prepara nueve conjuros ordinarios y conserva al menos siete de los ocho anteriores');
 const history:WarlockLevelSevenHistory={
  invocations:[...input.invocations],cantripIds:[...input.cantripIds],preparedIds:[...input.preparedIds],
  lessonsFeat:input.lessonsFeat,pactWeaponId:input.pactWeaponId,tomeCantripIds:input.tomeCantripIds,tomeRitualIds:input.tomeRitualIds,
  mageArmorActive:previous.warlockState.mageArmorActive,tomePresent:previous.warlockState.tomePresent,
  familiarForm:previous.warlockState.familiarForm,familiarName:previous.warlockState.familiarName,
  familiarInvestmentMovement:previous.warlockState.familiarInvestmentMovement,giftOfDepthsUsed:previous.warlockState.giftOfDepthsUsed,
  darkOnesOwnLuckUsed:previous.warlockState.darkOnesOwnLuckUsed,
 };
 const blade=selectedInvocations.includes('pact_of_blade'),tome=selectedInvocations.includes('pact_of_tome');
 const chooseTome=(options:readonly {id:string}[],selected:readonly string[]|undefined,existing:readonly string[]|undefined,count:number,forbidden:readonly string[])=>
  selected??existing??options.filter(option=>!forbidden.includes(option.id)).slice(0,count).map(option=>option.id);
 const nextInput:GuidedWarlockInput={...input,level:8,level8HitDieRoll:choices.level8HitDieRoll,level8Improvement:choices.level8Improvement,level8History:history,
  invocations:selectedInvocations,cantripIds:choices.cantripIds,preparedIds:choices.preparedIds,
  lessonsFeat:selectedInvocations.includes('lessons_of_the_first_ones')?choices.lessonsFeat:undefined,
  pactWeaponId:blade?input.pactWeaponId:undefined,
  tomeCantripIds:tome?chooseTome(TOME_CANTRIP_OPTIONS,choices.tomeCantripIds,input.tomeCantripIds,3,choices.cantripIds):undefined,
  tomeRitualIds:tome?chooseTome(TOME_RITUAL_OPTIONS,choices.tomeRitualIds,input.tomeRitualIds,2,choices.preparedIds):undefined,
 };
 const nextSheet=calculateWarlockOne(nextInput,state),before=calculateWarlockOne(input,state);
 const damage=before.maximumHitPoints-previous.warlockState.hitPointsCurrent;
 const nextState:WarlockOneState={...previous.warlockState,
  hitPointsCurrent:Math.max(0,Math.min(nextSheet.maximumHitPoints,nextSheet.maximumHitPoints-damage)),
  mageArmorActive:selectedInvocations.includes('armor_of_shadows')?state.mageArmorActive:false,
  tomePresent:tome&&input.invocations.includes('pact_of_tome')?state.tomePresent:false,
  familiarForm:selectedInvocations.includes('pact_of_chain')?state.familiarForm:null,
  familiarName:selectedInvocations.includes('pact_of_chain')?state.familiarName:'',
  familiarInvestmentMovement:selectedInvocations.includes('investment_of_the_chain_master')?state.familiarInvestmentMovement??'fly':undefined,
  giftOfDepthsUsed:selectedInvocations.includes('gift_of_the_depths')?state.giftOfDepthsUsed??false:undefined,
 };
 return {input:nextInput,state:makeWarlockCharacterSnapshot(nextInput,nextState).warlockState};
}

/** El descenso comparte el mismo LevelDownDialog de Guerrero/Mago.
 * Como la lista histórica del nivel 1 no se guardaba en los snapshots previos,
 * retiene la primera invocación legal y los dos primeros conjuros/trucos.
 * La vista previa lo explica ANTES de confirmar; nunca muta el origen.
 */
export function previewWarlockLevelDown(input:GuidedWarlockInput,state:WarlockOneState){
 if(input.level===8){
  const previous=makeWarlockCharacterSnapshot(input,state);
  const history=input.level8History;
  if(!history)throw new RangeError('No existe historial para regresar al nivel 7');
  const {level8HitDieRoll,level8Improvement,level8History,invocations,cantripIds,preparedIds,lessonsFeat,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
  void level8HitDieRoll;void level8Improvement;void level8History;void invocations;void cantripIds;void preparedIds;void lessonsFeat;void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
  const nextInput:GuidedWarlockInput={...rest,level:7,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   ...(history.lessonsFeat?{lessonsFeat:history.lessonsFeat}:{}),
   ...(history.pactWeaponId?{pactWeaponId:history.pactWeaponId}:{}),
   ...(history.tomeCantripIds?{tomeCantripIds:history.tomeCantripIds}:{}),
   ...(history.tomeRitualIds?{tomeRitualIds:history.tomeRitualIds}:{}),
  };
  const before=calculateWarlockOne(input,state),after=calculateWarlockOne(nextInput,state),oldState=previous.warlockState;
  const nextState:WarlockOneState={...oldState,
   hitPointsCurrent:Math.max(0,Math.min(after.maximumHitPoints,oldState.hitPointsCurrent-(before.maximumHitPoints-after.maximumHitPoints))),
   mageArmorActive:history.mageArmorActive,tomePresent:history.tomePresent,
   familiarForm:history.familiarForm,familiarName:history.familiarName,
   familiarInvestmentMovement:history.familiarInvestmentMovement,giftOfDepthsUsed:history.giftOfDepthsUsed,
   darkOnesOwnLuckUsed:history.darkOnesOwnLuckUsed??0,
  };
  const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
  const summary:LevelDownSummary={className:'Brujo',fromLevel:8,toLevel:7,
   lost:[
    {title:'Mejora de característica',description:'Se retira la dote de nivel 8; vuelven a calcularse modificadores, pruebas, salvaciones, ataques, CD y PG.'},
    {title:'Noveno conjuro preparado',description:'Vuelves a tener ocho conjuros ordinarios y se restauran las elecciones anteriores, junto a los trucos e invocaciones sustituidos.'},
   ],changes:[
    {title:'Puntos de golpe',description:`PG máximos: ${before.maximumHitPoints} → ${after.maximumHitPoints}. PG actuales: ${oldState.hitPointsCurrent} → ${snapshot.warlockState.hitPointsCurrent}.`},
    {title:'Magia de Pacto',description:'Conservas dos ranuras de nivel 4 y los ocho conjuros del Patrón Infernal siempre preparados.'},
   ],preserved:['Identidad, equipo, retrato, compañeros e inspiración','Ranuras gastadas, Astucia mágica, marcas de muerte y Suerte del Oscuro','Vínculos de Hoja, Cadena y Tomo e historial de nivel 7→6'],
  };
  return {...summary,snapshot};
 }
 if(input.level===7){
  const previous=makeWarlockCharacterSnapshot(input,state);
  const history=input.level7History;
  if(!history)throw new RangeError('No existe historial para regresar al nivel 6');
  const {level7HitDieRoll,level7History,invocations,cantripIds,preparedIds,lessonsFeat,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
  void level7HitDieRoll;void level7History;void invocations;void cantripIds;void preparedIds;void lessonsFeat;void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
  const nextInput:GuidedWarlockInput={...rest,level:6,
   invocations:history.invocations,cantripIds:history.cantripIds,preparedIds:history.preparedIds,
   ...(history.lessonsFeat?{lessonsFeat:history.lessonsFeat}:{}),
   ...(history.pactWeaponId?{pactWeaponId:history.pactWeaponId}:{}),
   ...(history.tomeCantripIds?{tomeCantripIds:history.tomeCantripIds}:{}),
   ...(history.tomeRitualIds?{tomeRitualIds:history.tomeRitualIds}:{}),
  };
  const before=calculateWarlockOne(input,state),after=calculateWarlockOne(nextInput,state),oldState=previous.warlockState;
  const nextState:WarlockOneState={...oldState,
   hitPointsCurrent:Math.max(0,Math.min(after.maximumHitPoints,oldState.hitPointsCurrent-(before.maximumHitPoints-after.maximumHitPoints))),
   mageArmorActive:history.mageArmorActive,tomePresent:history.tomePresent,
   familiarForm:history.familiarForm,familiarName:history.familiarName,
   familiarInvestmentMovement:history.familiarInvestmentMovement,giftOfDepthsUsed:history.giftOfDepthsUsed,
   darkOnesOwnLuckUsed:history.darkOnesOwnLuckUsed??0,
  };
  const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
  const summary:LevelDownSummary={className:'Brujo',fromLevel:7,toLevel:6,
   lost:[
    {title:'Sexta invocación',description:'Se restauran las cinco invocaciones y elecciones de nivel 6; se pierde Susurros de la tumba si se había elegido.'},
    {title:'Conjuros de nivel 4',description:'Ya no puedes preparar los seis conjuros ordinarios de nivel 4. Pierdes Escudo de fuego y Muro de fuego como conjuros gratuitos del patrón.'},
    {title:'Octava preparación',description:'Se recupera exactamente la lista de siete conjuros ordinarios anterior a la subida.'},
   ],changes:[
    {title:'Puntos de golpe',description:`PG máximos: ${before.maximumHitPoints} → ${after.maximumHitPoints}. PG actuales: ${oldState.hitPointsCurrent} → ${snapshot.warlockState.hitPointsCurrent}.`},
    {title:'Magia de Pacto',description:'Sigues teniendo dos ranuras recuperables con descansos, ahora ambas de nivel 3.'},
   ],preserved:['Identidad, equipo, compañeros y selección de Pacto','Gasto de ranuras, inspiración, Astucia mágica y marcas de muerte','Suerte del Oscuro y su uso restaurado según el historial de nivel 6','Historial previo para continuar de 6→5'],
  };
  return {...summary,snapshot};
 }
 if(input.level===6){
  const previous=makeWarlockCharacterSnapshot(input,state);
  const history=input.level6History;
  if(!history)throw new RangeError('No existe historial para regresar al nivel 5');
  const {level6HitDieRoll,level6History,invocations,cantripIds,preparedIds,lessonsFeat,pactWeaponId,tomeCantripIds,tomeRitualIds,...rest}=input;
  void level6HitDieRoll;void level6History;void invocations;void cantripIds;void preparedIds;void lessonsFeat;void pactWeaponId;void tomeCantripIds;void tomeRitualIds;
  const nextInput:GuidedWarlockInput={...rest,level:5,
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
   familiarInvestmentMovement:history.familiarInvestmentMovement,giftOfDepthsUsed:history.giftOfDepthsUsed,
   darkOnesOwnLuckUsed:undefined,
  };
  const snapshot=makeWarlockCharacterSnapshot(nextInput,nextState);
  const summary:LevelDownSummary={className:'Brujo',fromLevel:6,toLevel:5,
   lost:[
    {title:'Suerte del Oscuro',description:'Se retira la bonificación manual 1d10 a pruebas y salvaciones; sus usos pendientes y consumidos dejan de existir.'},
    {title:'Séptimo conjuro preparado',description:'Se recuperan exactamente los seis preparados de nivel 5 y la selección anterior de trucos e invocaciones.'},
   ],changes:[
    {title:'Puntos de golpe',description:'PG máximos: '+before.maximumHitPoints+' → '+after.maximumHitPoints+'. PG actuales: '+oldState.hitPointsCurrent+' → '+snapshot.warlockState.hitPointsCurrent+'.'},
    {title:'Magia de Pacto',description:'Conservas dos ranuras de nivel 3 y seis conjuros gratuitos del Patrón Infernal, con su gasto actual.'},
   ],preserved:['Identidad, equipo, retrato y compañeros','Ranuras gastadas, inspiración, Astucia mágica y marcas de muerte','Invocaciones y vínculos restaurados; historial completo para seguir descendiendo 5→4'],
  };
  return {...summary,snapshot};
 }
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
