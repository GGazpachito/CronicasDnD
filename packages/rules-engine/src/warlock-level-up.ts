/** Paso 69: transición explícita de Brujo nivel 1 a nivel 2 (D&D 2024).
 * Las elecciones se validan aquí, no únicamente en los controles React.
 */
import {calculateWarlockOne,makeWarlockCharacterSnapshot,WARLOCK_INVOCATIONS,WARLOCK_LEVEL_ONE_INVOCATIONS,type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId} from './warlock';
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

/** El descenso comparte el mismo LevelDownDialog de Guerrero/Mago.
 * Como la lista histórica del nivel 1 no se guardaba en los snapshots previos,
 * retiene la primera invocación legal y los dos primeros conjuros/trucos.
 * La vista previa lo explica ANTES de confirmar; nunca muta el origen.
 */
export function previewWarlockLevelDown(input:GuidedWarlockInput,state:WarlockOneState){
 if(input.level!==2)throw new RangeError('Brujo: solo se admite retroceso de nivel 2 a 1');
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
