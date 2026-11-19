/** Paso 69: transición explícita de Brujo nivel 1 a nivel 2 (D&D 2024).
 * Las elecciones se validan aquí, no únicamente en los controles React.
 */
import {calculateWarlockOne,makeWarlockCharacterSnapshot,type GuidedWarlockInput,type WarlockOneState,type WarlockInvocationId} from './warlock';
import {TOME_CANTRIP_OPTIONS,TOME_RITUAL_OPTIONS} from './warlock-spells';

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
