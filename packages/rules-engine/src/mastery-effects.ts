/** Paso 25 · Maestrías de armas del PHB 2024, pág. 214 (página impresa 213).
 * Este módulo interpreta el resultado de UN ataque. No inventa atributos,
 * salvaciones, tamaños o acciones de criaturas que no están modeladas.
 */
import type {MasteryId} from './martial';
import type {WeaponAttackProfile,AttackResolution} from './attacks';

export type CreatureSize='tiny'|'small'|'medium'|'large'|'huge'|'gargantuan'|'unknown';
export type MasteryContext=Readonly<{
  /** Nombre de referencia elegido por el jugador. Necesario para rastrear efectos. */
  targetName:string;
  /** True solo cuando el objetivo ha sufrido daño, tras sus defensas. */
  dealtDamage:boolean;
  targetSize:CreatureSize;
  /** Las maestrías sobre objetivos se aplican a criaturas, no a objetos. */
  targetIsCreature:boolean;
}>;
export type MasteryTrackingKind='Vex'|'Sap'|'Slow'|'Topple'|'Push';
export type MasteryPendingEffect=Readonly<{
  id:number; sourceAttackId:number; round:number; mastery:MasteryTrackingKind;
  target:string; detail:string;
  /** Turno propio en que nació; ausente en guardados anteriores a la fase 26. */
  sourceTurn?:number;
}>;
export type MasteryEvaluation=Readonly<{
  mastery:MasteryId|null;
  /** Una instrucción precisa, también si aún faltan datos del enemigo. */
  message:string;
  /** No se crean estados ficticios de enemigos. Es un recordatorio de mesa. */
  pending:Readonly<{mastery:MasteryTrackingKind;target:string;detail:string}>|null;
}>;
const SIZES:readonly CreatureSize[]=['tiny','small','medium','large','huge','gargantuan','unknown'];
const MAX_TARGET=60;
const PENDING:readonly MasteryTrackingKind[]=['Vex','Sap','Slow','Topple','Push'];
export function validateMasteryContext(input:unknown):MasteryContext{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new RangeError('Contexto de maestría inválido');
  const c=input as Record<string,unknown>;
  if(Object.keys(c).some(k=>!['targetName','dealtDamage','targetSize','targetIsCreature'].includes(k)) ||
    typeof c.targetName!=='string'||c.targetName.length>MAX_TARGET||/[^\S\r\n]*[\r\n\x00-\x1f]/.test(c.targetName)||
    typeof c.dealtDamage!=='boolean'||typeof c.targetIsCreature!=='boolean'||!SIZES.includes(c.targetSize as CreatureSize))throw new RangeError('Datos de objetivo inválidos');
  return {targetName:c.targetName.trim(),dealtDamage:c.dealtDamage,targetSize:c.targetSize as CreatureSize,targetIsCreature:c.targetIsCreature};
}
export function validateMasteryPendingEffect(value:unknown):MasteryPendingEffect{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new RangeError('Efecto de maestría inválido');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).length!==(v.sourceTurn===undefined?6:7)||Object.keys(v).some(k=>!['id','sourceAttackId','round','mastery','target','detail','sourceTurn'].includes(k)) ||
    (v.sourceTurn!==undefined&&(typeof v.sourceTurn!=='number'||!Number.isSafeInteger(v.sourceTurn)||v.sourceTurn<1||v.sourceTurn>100_000)) ||
    !PENDING.includes(v.mastery as MasteryTrackingKind) ||
    typeof v.id!=='number'||!Number.isSafeInteger(v.id)||v.id<1||v.id>=1_000_000 ||
    typeof v.sourceAttackId!=='number'||!Number.isSafeInteger(v.sourceAttackId)||v.sourceAttackId<1||v.sourceAttackId>=v.id ||
    typeof v.round!=='number'||!Number.isSafeInteger(v.round)||v.round<1||v.round>100_000 ||
    typeof v.target!=='string'||!v.target.trim()||v.target!==v.target.trim()||v.target.length>MAX_TARGET||/[\x00-\x1f]/.test(v.target) ||
    typeof v.detail!=='string'||!v.detail.trim()||v.detail.length>200||/[\x00-\x1f]/.test(v.detail))throw new RangeError('Efecto de maestría inválido');
  return {id:v.id,sourceAttackId:v.sourceAttackId,round:v.round,mastery:v.mastery as MasteryTrackingKind,target:v.target,detail:v.detail,
    ...(v.sourceTurn===undefined?{}:{sourceTurn:v.sourceTurn as number})};
}
const effect=(mastery:MasteryTrackingKind,target:string,detail:string):MasteryEvaluation['pending'] =>
  target?{mastery,target,detail}:null;
/** La resolución requiere resultado de impacto conocido; un objetivo sin CA no se presume impactado. */
export function evaluateWeaponMastery(profile:WeaponAttackProfile,resolution:AttackResolution,raw:MasteryContext):MasteryEvaluation{
  const context=validateMasteryContext(raw);
  const mastery=profile.mastery;
  const target=context.targetName;
  const make=(message:string,pending:MasteryEvaluation['pending']=null):MasteryEvaluation=>({mastery,message,pending});
  if(!mastery)return make('Este arma no tiene una maestría elegida.');
  if(resolution.hit===null)return make('Impacto sin determinar: indica la CA antes de resolver la maestría.');
  if(mastery!=='Nick'&&!context.targetIsCreature)return make('Esta maestría solo tiene efecto contra criaturas, no contra objetos.');
  if(mastery==='Graze')return resolution.hit===false
    ?make(`Rozar: puedes infligir ${Math.max(0,profile.abilityModifier)} de daño ${profile.damageType} a una criatura, incluso al fallar. No se añade la mejora mágica.`)
    :make('Rozar solo se activa cuando el ataque falla contra una criatura.');
  if(mastery==='Nick')return profile.lightExtraAttack
    ?make('Mella: este ataque extra de Ligera puede hacerse como parte de la acción Atacar en lugar de gastar acción adicional. Solo una vez por turno; compruébalo con el DM.')
    :make('Mella: al realizar el ataque adicional de Ligera con esta arma, puede formar parte de la acción Atacar (una vez por turno).');
  if(!resolution.hit)return make('Esta maestría requiere impactar; no se ha activado.');
  if(mastery==='Cleave')return make('Tajo: puedes atacar a una SEGUNDA criatura a 5 pies de la primera, también a tu alcance, solo una vez por turno. No sumes el modificador positivo de característica al daño adicional. La geometría y el segundo ataque se resuelven en mesa.');
  if(mastery==='Push'){
    if(context.targetSize==='huge'||context.targetSize==='gargantuan')return make('Empujar no afecta a criaturas Enormes o Gargantuescas.');
    if(context.targetSize==='unknown')return make('Empujar: comprueba que el objetivo sea Grande o menor; entonces puedes moverlo hasta 10 pies en línea recta alejándolo de ti.');
    const msg='Empujar: puedes desplazar al objetivo hasta 10 pies en línea recta alejándolo de ti. Confirma su posición con el DM.';
    return make(msg,effect('Push',target,msg));
  }
  if(mastery==='Sap'){
    const msg='Debilitar: el objetivo tiene desventaja en su siguiente tirada de ataque antes del comienzo de tu próximo turno.';
    return make(msg,effect('Sap',target,msg));
  }
  if(mastery==='Topple'){
    const msg=`Derribar: el objetivo realiza una salvación de Constitución CD ${profile.masterySaveDC}. Si falla, queda Derribado.`;
    return make(msg,effect('Topple',target,msg));
  }
  if(mastery==='Slow'){
    if(!context.dealtDamage)return make('Ralentizar requiere impactar Y causar daño real; verifica resistencias e inmunidades del objetivo.');
    const msg='Ralentizar: reduce 10 pies la velocidad del objetivo hasta el comienzo de tu próximo turno. Varios impactos con Ralentizar no acumulan la reducción.';
    return make(msg,effect('Slow',target,msg));
  }
  if(mastery==='Vex'){
    if(!context.dealtDamage)return make('Hostigar requiere impactar Y causar daño real; confirma el daño tras las defensas del objetivo.');
    const msg='Hostigar: obtienes ventaja en tu próximo ataque contra este mismo objetivo antes del final de tu siguiente turno. Retira el efecto cuando expire.';
    return make(msg,effect('Vex',target,msg));
  }
  return make('Maestría no reconocida.');
}
/** Solo para el mismo objetivo; NO decide cuándo termina el siguiente turno. */
export function hasVexAdvantage(effects:readonly MasteryPendingEffect[]|undefined,targetName:string):boolean{
  const normalized=targetName.trim().toLocaleLowerCase('es');
  return Boolean(normalized&&effects?.some(e=>e.mastery==='Vex'&&e.target.toLocaleLowerCase('es')===normalized));
}
