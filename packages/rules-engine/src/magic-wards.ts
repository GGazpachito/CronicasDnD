/** Fase 4.9. Registro de objetos defensivos mágicos del SRD 5.2.1 (D&D 2024).
 * Datos y operaciones propios; jamás se ejecutan scripts procedentes de homebrew.
 * Este registro se guarda con la partida. Todavía no está unido al inventario común.
 */
import type {DeclaredDamageDefense} from './damage-defenses';
import type {IncomingDamageType} from './incoming';

export const RING_RESISTANCE_TYPES = [
  'acid','cold','fire','force','lightning','necrotic','poison','psychic','radiant','thunder'
] as const satisfies readonly IncomingDamageType[];
export type RingResistanceType = typeof RING_RESISTANCE_TYPES[number];
export const MAGIC_WARD_CATALOG = {
  ring_resistance: {
    label:'Anillo de resistencia', attunement:false,
    note:'Ofrece resistencia a un tipo elegido de daño mientras se lleva puesto.'
  },
  brooch_shielding: {
    label:'Broche de protección', attunement:true,
    note:'Resistencia al daño de fuerza. Su inmunidad específica al conjuro Proyectil mágico todavía no se resuelve aquí.'
  },
  periapt_proof_poison: {
    label:'Amuleto antivenenos', attunement:true,
    note:'Inmunidad al daño de veneno. La inmunidad a la condición Envenenado se muestra como recordatorio, pendiente de integrarla con el panel de condiciones.'
  }
} as const;
export type MagicWardItemId=keyof typeof MAGIC_WARD_CATALOG;
export type MagicWardEntry=Readonly<{
  instanceId:string;
  itemId:MagicWardItemId;
  /** Solo para el Anillo de resistencia. Elige el tipo al recibirlo. */
  damageType?:RingResistanceType;
  worn:boolean;
  attuned:boolean;
}>;
export type MagicWardAction =
  | Readonly<{type:'grant';itemId:MagicWardItemId;damageType?:RingResistanceType}>
  | Readonly<{type:'wear';instanceId:string;worn:boolean}>
  | Readonly<{type:'attune';instanceId:string;attuned:boolean}>
  | Readonly<{type:'remove';instanceId:string}>;

const MAX_ITEMS=12;
const MAX_ATTUNED=3;
function fail(message:string):never{throw new RangeError(message);}
function record(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function only(value:Record<string,unknown>,names:readonly string[],label:string):void{
  if(Object.keys(value).some(k=>!names.includes(k)))fail(`${label}: campos no reconocidos`);
}
function validTemplate(value:unknown):value is MagicWardItemId{
  return typeof value==='string'&&Object.hasOwn(MAGIC_WARD_CATALOG,value);
}
function validRingType(value:unknown):value is RingResistanceType{
  return typeof value==='string'&&RING_RESISTANCE_TYPES.includes(value as RingResistanceType);
}

/** Lee y normaliza un registro sin mutarlo, rechazando contenidos inventados o ambiguos. */
export function validateMagicWards(value:unknown):readonly MagicWardEntry[]{
  if(!Array.isArray(value)||value.length>MAX_ITEMS)fail('Registro de objetos mágicos inválido o demasiado largo');
  const seen=new Set<string>();
  const attunedKinds=new Set<MagicWardItemId>();
  let attunedCount=0;
  return value.map(raw=>{
    if(!record(raw))fail('Objeto mágico inválido');
    only(raw,['instanceId','itemId','damageType','worn','attuned'],'Objeto mágico');
    const {instanceId,itemId,damageType,worn,attuned}=raw;
    if(typeof instanceId!=='string'||!/^ward-[1-9]\d{0,4}$/.test(instanceId)||seen.has(instanceId))fail('Identificador de objeto mágico inválido o duplicado');
    seen.add(instanceId);
    if(!validTemplate(itemId))fail('Objeto mágico desconocido');
    if(typeof worn!=='boolean'||typeof attuned!=='boolean')fail('Estado de equipo o vinculación inválido');
    const template=MAGIC_WARD_CATALOG[itemId];
    if(itemId==='ring_resistance'){
      if(!validRingType(damageType))fail('El anillo necesita un tipo de daño permitido');
    }else if(damageType!==undefined)fail('El objeto no admite elegir tipo de daño');
    if(!template.attunement&&attuned)fail('Este objeto no requiere vinculación');
    if(attuned){
      attunedCount++;
      if(attunedCount>MAX_ATTUNED)fail('No se pueden vincular más de tres objetos mágicos');
      if(attunedKinds.has(itemId))fail('No puedes vincularte a dos copias del mismo objeto mágico');
      attunedKinds.add(itemId);
    }
    return {instanceId,itemId,...(itemId==='ring_resistance'?{damageType:damageType as RingResistanceType}:{}),worn,attuned};
  });
}

/** El director de juego concede los objetos; la aplicación nunca los compra ni los inventa. */
export function applyMagicWardAction(source:readonly MagicWardEntry[],action:MagicWardAction):readonly MagicWardEntry[]{
  const current=validateMagicWards(source);
  if(!record(action))fail('Acción mágica inválida');
  let result:readonly MagicWardEntry[];
  switch(action.type){
    case 'grant':{
      only(action,['type','itemId','damageType'],'Concesión de objeto mágico');
      if(!validTemplate(action.itemId))fail('Objeto mágico desconocido');
      if(current.length>=MAX_ITEMS)fail('Límite de doce objetos mágicos alcanzado');
      if(action.itemId==='ring_resistance'){
        if(!validRingType(action.damageType))fail('Selecciona un tipo permitido para el anillo');
      }else if(action.damageType!==undefined)fail('Tipo de daño no admitido por este objeto');
      const used=new Set(current.map(x=>x.instanceId));
      let nextNumber=1;
      while(used.has(`ward-${nextNumber}`))nextNumber++;
      result=[...current,{instanceId:`ward-${nextNumber}`,itemId:action.itemId,
        ...(action.itemId==='ring_resistance'?{damageType:action.damageType}:{}),worn:false,attuned:false}];
      break;
    }
    case 'wear':{
      only(action,['type','instanceId','worn'],'Equipar objeto mágico');
      if(typeof action.worn!=='boolean')fail('Equipamiento inválido');
      if(!current.some(x=>x.instanceId===action.instanceId))fail('No posees este objeto mágico');
      result=current.map(x=>x.instanceId===action.instanceId?{...x,worn:action.worn}:x);
      break;
    }
    case 'attune':{
      only(action,['type','instanceId','attuned'],'Vinculación mágica');
      if(typeof action.attuned!=='boolean')fail('Vinculación inválida');
      const item=current.find(x=>x.instanceId===action.instanceId);
      if(!item)fail('No posees este objeto mágico');
      if(!MAGIC_WARD_CATALOG[item.itemId].attunement)fail('Este objeto no requiere vinculación');
      result=current.map(x=>x.instanceId===action.instanceId?{...x,attuned:action.attuned}:x);
      break;
    }
    case 'remove':{
      only(action,['type','instanceId'],'Retirar objeto mágico');
      if(!current.some(x=>x.instanceId===action.instanceId))fail('No posees este objeto mágico');
      result=current.filter(x=>x.instanceId!==action.instanceId);
      break;
    }
    default:fail('Acción mágica desconocida');
  }
  return validateMagicWards(result);
}

/** Solo produce defensas mecánicas que pueden evaluarse contra un tipo de daño.
 * La inmunidad del Broche al conjuro Proyectil mágico, y la inmunidad a Envenenado
 * del Amuleto, necesitan otro tipo de contexto y NO se convierten en inmunidades generales.
 */
export function collectMagicWardDefenses(entries:readonly MagicWardEntry[]):readonly DeclaredDamageDefense[]{
  return validateMagicWards(entries).flatMap(item=>{
    if(!item.worn || (MAGIC_WARD_CATALOG[item.itemId].attunement&&!item.attuned))return [];
    const kind=item.itemId==='periapt_proof_poison'?'immunity':'resistance';
    const damageType:IncomingDamageType=item.itemId==='ring_resistance'?item.damageType!:item.itemId==='brooch_shielding'?'force':'poison';
    return [{id:`srd521:magic:${item.instanceId}`,source:`${MAGIC_WARD_CATALOG[item.itemId].label} (${item.instanceId})`,damageType,kind}];
  });
}
