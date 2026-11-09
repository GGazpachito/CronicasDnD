/** Paso 12: inventario editable y transacciones deterministas para el Guerrero 2024.
 * Valores monetarios enteros en piezas de cobre (100 pc = 1 po).
 * Precios seleccionados del PHB 2024, cap. 6, pp. 213, 215, 219 y 223.
 * Los objetos mágicos se incorporan como instancias únicas sin precio normalizado.
 */
import { ARMORS, type ArmorId } from './defense';
import { ITEM_NAMES, type CatalogItemId, type StartingInventory } from './background-equipment';
import { WEAPONS, type WeaponId } from './martial';
import {applyMagicWardAction,validateMagicWards,type MagicWardEntry,type MagicWardItemId,type RingResistanceType,type EnhancementBonus} from './magic-wards';

export type InventoryItemId = CatalogItemId | ArmorId | WeaponId | 'shield' | 'bolt' | 'bullet' | 'needle' | 'sling_bullet';
export type InventorySource = 'class' | 'background' | 'purchase' | 'loot';
export type InventoryLine = Readonly<{
  id: InventoryItemId;
  name: string;
  quantity: number;
  sources: readonly Readonly<{from:InventorySource; quantity:number}>[];
}>;
export type InventoryState = Readonly<{
  coinsCopper: number;
  items: readonly InventoryLine[];
  equipped: Readonly<{armor: ArmorId | null; shield: boolean}>;
  /** Objetos mágicos y su vinculación, dentro del mismo inventario persistente. */
  magicItems: readonly MagicWardEntry[];
}>;

const ARMOR_NAMES:Readonly<Record<ArmorId,string>> = {
  padded:'Armadura acolchada',leather:'Armadura de cuero',studded_leather:'Cuero tachonado',
  hide:'Armadura de pieles',chain_shirt:'Camisa de malla',scale_mail:'Cota de escamas',
  breastplate:'Coraza',half_plate:'Media armadura',ring_mail:'Cota de anillas',
  chain_mail:'Cota de malla',splint:'Armadura de bandas',plate:'Armadura de placas',
};
/** Catálogo local. Los IDs anteriores siguen siendo válidos. */
export const INVENTORY_NAMES: Readonly<Record<InventoryItemId,string>> = {
  ...Object.fromEntries(Object.entries(WEAPONS).map(([id,w])=>[id,w.name])) as Record<WeaponId,string>,
  ...ITEM_NAMES,...ARMOR_NAMES,shield:'Escudo',
  bolt:'Virote de ballesta',bullet:'Bala de arma de fuego',needle:'Aguja de cerbatana',sling_bullet:'Bala de honda',
};

/** Precios exactos en piezas de cobre. Ausente = precio no normalizado en este MVP.
 * La munición flecha: 20 unidades por 1 po -> 5 pc cada flecha.
 */
export const INVENTORY_PRICES_CP:Readonly<Partial<Record<InventoryItemId,number>>> = {
  padded:500,leather:1000,studded_leather:4500,hide:1000,chain_shirt:5000,
  scale_mail:5000,breastplate:40000,half_plate:75000,ring_mail:3000,
  chain_mail:7500,splint:20000,plate:150000,shield:1000,
  greatsword:5000,flail:1000,javelin:50,scimitar:2500,shortsword:1000,
  longbow:5000,shortbow:2500,quarterstaff:20,spear:100,dagger:200,
  arrow:5,bolt:5,bullet:30,needle:2,quiver:100,dungeoneers_pack:1200,parchment:10,robe:100,
  crowbar:200,pouch:50,travelers_clothes:200,healers_kit:500,
};

export type InventoryAction =
  | Readonly<{type:'buy';itemId:InventoryItemId;quantity:number}>
  | Readonly<{type:'sell';itemId:InventoryItemId;quantity:number}>
  | Readonly<{type:'add';itemId:InventoryItemId;quantity:number}>
  | Readonly<{type:'remove';itemId:InventoryItemId;quantity:number}>
  | Readonly<{type:'equip_armor';armor:ArmorId|null}>
  | Readonly<{type:'equip_shield';equipped:boolean}>
  | Readonly<{type:'magic_grant';itemId:MagicWardItemId;damageType?:RingResistanceType;armorId?:ArmorId;weaponId?:WeaponId;enhancement?:EnhancementBonus;instanceId?:string}>
  | Readonly<{type:'magic_wear';instanceId:string;worn:boolean}>
  | Readonly<{type:'magic_attune';instanceId:string;attuned:boolean}>
  | Readonly<{type:'magic_remove';instanceId:string}>;

const MAX_ACTIONS=200;
const MAX_COINS=1_000_000_000_000;
const MAX_UNITS=100_000;
function error(message:string):never {throw new RangeError(message);}
function idValid(id:unknown): id is InventoryItemId {return typeof id==='string' && Object.hasOwn(INVENTORY_NAMES,id);}
function armorValid(id:unknown):id is ArmorId {return typeof id==='string'&&Object.hasOwn(ARMORS,id);}
function units(value:unknown): number {
  if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>1000) error('La cantidad debe ser un entero entre 1 y 1000');
  return value;
}
function price(id:InventoryItemId):number {
  const p=INVENTORY_PRICES_CP[id];
  if(typeof p!=='number'||!Number.isInteger(p)||p<0) error(`Precio no disponible para ${INVENTORY_NAMES[id]}; utiliza Añadir botín`);
  return p;
}
function itemCount(state:InventoryState,id:InventoryItemId):number {return state.items.find(x=>x.id===id)?.quantity??0;}
function clone(state:InventoryState): {coinsCopper:number;items:{id:InventoryItemId;name:string;quantity:number;sources:{from:InventorySource;quantity:number}[]}[];equipped:{armor:ArmorId|null;shield:boolean};magicItems:MagicWardEntry[]} {
  return {coinsCopper:state.coinsCopper,items:state.items.map(x=>({id:x.id,name:x.name,quantity:x.quantity,sources:x.sources.map(s=>({...s}))})),equipped:{...state.equipped},magicItems:validateMagicWards(state.magicItems??[]).map(x=>({...x}))};
}
function addLine(state:ReturnType<typeof clone>,id:InventoryItemId,quantity:number,from:InventorySource):void{
  const existing=state.items.find(x=>x.id===id);
  if(existing){if(existing.quantity+quantity>MAX_UNITS) error('Cantidad total demasiado alta');existing.quantity+=quantity;
    const source=existing.sources.find(s=>s.from===from);if(source)source.quantity+=quantity;else existing.sources.push({from,quantity});
  } else state.items.push({id,name:INVENTORY_NAMES[id],quantity,sources:[{from,quantity}]});
}
function removeLine(state:ReturnType<typeof clone>,id:InventoryItemId,quantity:number):void {
  const line=state.items.find(x=>x.id===id);
  if(!line||line.quantity<quantity)error(`No hay suficientes unidades de ${INVENTORY_NAMES[id]}`);
  line.quantity-=quantity;
  let left=quantity;
  // Se consumen primero las adquisiciones posteriores, preservando la procedencia de lo que resta.
  for(const from of ['loot','purchase','background','class'] as InventorySource[]){
    const s=line.sources.find(x=>x.from===from);
    if(!s||left===0)continue;
    const consumed=Math.min(left,s.quantity);s.quantity-=consumed;left-=consumed;
  }
  line.sources=line.sources.filter(s=>s.quantity>0);
  if(line.quantity===0) state.items=state.items.filter(x=>x.id!==id);
  if(state.equipped.armor===id && itemCount(state,id)===0) state.equipped.armor=null;
  if(id==='shield' && itemCount(state,id)===0) state.equipped.shield=false;
}
function money(value:number):number {
  if(!Number.isSafeInteger(value)||value<0||value>MAX_COINS)error('Saldo de monedas fuera de rango');
  return value;
}

export function initialInventoryState(starting:StartingInventory, initialArmor:ArmorId|null):InventoryState {
  if(!starting||!Array.isArray(starting.items))error('Inventario inicial inválido');
  if(initialArmor!==null&&!armorValid(initialArmor))error('Armadura inicial inválida');
  const state:ReturnType<typeof clone>={coinsCopper:money(starting.totalGold*100),items:[],equipped:{armor:initialArmor,shield:false},magicItems:[]};
  for(const line of starting.items){
    if(!idValid(line.id)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>MAX_UNITS)error('Objeto inicial inválido');
    if(!Array.isArray(line.sources)||line.sources.reduce((n:number,s:{quantity:number})=>n+s.quantity,0)!==line.quantity)error('Procedencia del objeto inicial inválida');
    for(const s of line.sources){if(s.from!=='class'&&s.from!=='background')error('Procedencia inicial desconocida');units(s.quantity);addLine(state,line.id,s.quantity,s.from);}
  }
  if(initialArmor!==null&&itemCount(state,initialArmor)===0)error('La armadura inicial no está en el inventario');
  return state;
}

/** Una operación es atómica y no modifica el estado de entrada. */
export function applyInventoryAction(state:InventoryState, action:InventoryAction):InventoryState {
  if(!action||typeof action!=='object'||Array.isArray(action))error('Acción de inventario inválida');
  const next=clone(state);
  switch(action.type){
    case 'buy':case 'sell':case 'add':case 'remove':{
      if(!idValid(action.itemId))error('Objeto no reconocido');
      const qty=units(action.quantity);
      if(action.type==='buy'){
        const cost=money(price(action.itemId)*qty);
        if(next.coinsCopper<cost)error('No hay monedas suficientes para la compra');
        next.coinsCopper=money(next.coinsCopper-cost);
        addLine(next,action.itemId,qty,'purchase');
      } else if(action.type==='sell'){
        const amount=Math.floor(price(action.itemId)*qty/2);
        removeLine(next,action.itemId,qty);
        next.coinsCopper=money(next.coinsCopper+amount);
      } else if(action.type==='add')addLine(next,action.itemId,qty,'loot');
      else removeLine(next,action.itemId,qty);
      break;
    }
    case 'equip_armor':{
      if(action.armor!==null&&!armorValid(action.armor))error('Armadura no reconocida');
      if(action.armor!==null&&itemCount(state,action.armor)<1)error('Necesitas poseer la armadura para equiparla');
      next.equipped.armor=action.armor;
      if(action.armor!==null) next.magicItems=next.magicItems.map(m=>m.itemId==='armor_enhancement'?{...m,worn:false}:m);
      break;
    }
    case 'equip_shield':{
      if(typeof action.equipped!=='boolean')error('Estado del escudo inválido');
      if(action.equipped&&itemCount(state,'shield')<1)error('Necesitas poseer un escudo en el inventario');
      next.equipped.shield=action.equipped;
      if(action.equipped)next.magicItems=next.magicItems.map(m=>m.itemId==='shield_enhancement'?{...m,worn:false}:m);
      break;
    }
    case 'magic_grant':{
      if(Object.keys(action).some(k=>!['type','itemId','damageType','armorId','weaponId','enhancement','instanceId'].includes(k)))error('Campos inesperados en concesión mágica');
      const created=applyMagicWardAction(next.magicItems,{type:'grant',itemId:action.itemId,
        ...(action.damageType===undefined?{}:{damageType:action.damageType}),
        ...(action.armorId===undefined?{}:{armorId:action.armorId}),
        ...(action.weaponId===undefined?{}:{weaponId:action.weaponId}),
        ...(action.enhancement===undefined?{}:{enhancement:action.enhancement})});
      // Las concesiones anteriores no guardaban ID explícito: siguen usando su regla original.
      // Las nuevas conservan un ID único incluso si los objetos anteriores se descartaron.
      next.magicItems=action.instanceId===undefined?[...created]:[...validateMagicWards(created.map((item,index)=>
        index===created.length-1?{...item,instanceId:action.instanceId!}:item))];
      break;
    }
    case 'magic_wear':{
      if(Object.keys(action).some(k=>!['type','instanceId','worn'].includes(k)))error('Campos inesperados en acción mágica');
      next.magicItems=[...applyMagicWardAction(next.magicItems,{type:'wear',instanceId:action.instanceId,worn:action.worn})];
      if(action.worn){
        const equipped=next.magicItems.find(x=>x.instanceId===action.instanceId)!;
        if(equipped.itemId==='armor_enhancement')next.equipped.armor=null;
        if(equipped.itemId==='shield_enhancement')next.equipped.shield=false;
      }
      break;
    }
    case 'magic_attune':{
      if(Object.keys(action).some(k=>!['type','instanceId','attuned'].includes(k)))error('Campos inesperados en acción mágica');
      next.magicItems=[...applyMagicWardAction(next.magicItems,{type:'attune',instanceId:action.instanceId,attuned:action.attuned})];break;
    }
    case 'magic_remove':{
      if(Object.keys(action).some(k=>!['type','instanceId'].includes(k)))error('Campos inesperados en acción mágica');
      next.magicItems=[...applyMagicWardAction(next.magicItems,{type:'remove',instanceId:action.instanceId})];break;
    }
    default:error('Acción de inventario no admitida');
  }
  return next;
}

/** Equipo real de combate: la pieza mágica sustituye a la mundana, no se suma como una segunda armadura. */
export function equippedArmor(state:InventoryState):ArmorId|null{
  const magic=validateMagicWards(state.magicItems??[]).find(m=>m.itemId==='armor_enhancement'&&m.worn);
  return magic?.armorId??state.equipped.armor;
}
export function hasEquippedShield(state:InventoryState):boolean{
  return state.equipped.shield||validateMagicWards(state.magicItems??[]).some(m=>m.itemId==='shield_enhancement'&&m.worn);
}

/** Reserva un identificador que no reutiliza otro concedido antes, incluso si fue retirado.
 * Los diarios antiguos sin ID explícito conservan su semántica al reproducirse.
 */
export function nextMagicInstanceId(actions:readonly InventoryAction[]):string{
  if(!Array.isArray(actions))error('Historial de inventario inválido');
  let grants=0,highest=0;
  for(const action of actions){
    if(action.type==='magic_grant')grants++;
    if('instanceId' in action && typeof action.instanceId==='string'){
      const match=/^ward-([1-9]\d{0,4})$/.exec(action.instanceId);
      if(match)highest=Math.max(highest,Number(match[1]));
    }
  }
  const next=Math.max(grants,highest)+1;
  if(next>99_999)error('Se ha alcanzado el límite de identificadores mágicos');
  return `ward-${next}`;
}

/** El diario de acciones permite reconstruir el estado sin modificar el equipo de origen. */
export function replayInventory(starting:StartingInventory,initialArmor:ArmorId|null,actions:readonly InventoryAction[]=[]):InventoryState {
  if(!Array.isArray(actions)||actions.length>MAX_ACTIONS)error('Historial de inventario inválido o demasiado largo');
  return actions.reduce<InventoryState>((s,a)=>applyInventoryAction(s,a),initialInventoryState(starting,initialArmor));
}
export function formatCopper(value:number):string {
  money(value);
  if(value===0)return '0 po';
  const po=Math.floor(value/100), plata=Math.floor(value%100/10), cobre=value%10;
  return [po?`${po} po`:'',plata?`${plata} plata`:'',cobre?`${cobre} cobre`:''].filter(Boolean).join(' · ');
}

/** Conversión explícita de los registros de la fase 4.9 al diario unificado.
 * No modifica ni la partida ni el historial original. Las identidades se reasignan
 * a partir de las instancias existentes, sin perder las propiedades del objeto.
 */
export function importLegacyMagicWards(actions:readonly InventoryAction[],legacy:readonly MagicWardEntry[]):InventoryAction[]{
  const old=validateMagicWards(legacy);
  const result:InventoryAction[]=[...actions];
  let existing:readonly MagicWardEntry[]=[];
  for(const action of actions){
    switch(action.type){
      case 'magic_grant':{
        const generated=applyMagicWardAction(existing,{type:'grant',itemId:action.itemId,...(action.damageType===undefined?{}:{damageType:action.damageType}),
          ...(action.armorId===undefined?{}:{armorId:action.armorId}),...(action.weaponId===undefined?{}:{weaponId:action.weaponId}),...(action.enhancement===undefined?{}:{enhancement:action.enhancement})});
        existing=action.instanceId===undefined?generated:validateMagicWards(generated.map((item,index)=>
          index===generated.length-1?{...item,instanceId:action.instanceId!}:item));
        break;
      }
      case 'magic_wear':existing=applyMagicWardAction(existing,{type:'wear',instanceId:action.instanceId,worn:action.worn});break;
      case 'magic_attune':existing=applyMagicWardAction(existing,{type:'attune',instanceId:action.instanceId,attuned:action.attuned});break;
      case 'magic_remove':existing=applyMagicWardAction(existing,{type:'remove',instanceId:action.instanceId});break;
    }
  }
  for(const item of old){
    const variant={...(item.damageType?{damageType:item.damageType}:{}),...(item.armorId?{armorId:item.armorId}:{}),...(item.weaponId?{weaponId:item.weaponId}:{}),
      ...(item.enhancement?{enhancement:item.enhancement}:{})};
    const grant:InventoryAction={type:'magic_grant',itemId:item.itemId,...variant};
    existing=applyMagicWardAction(existing,{type:'grant',itemId:item.itemId,...variant});
    result.push(grant);
    const id=existing[existing.length-1].instanceId;
    if(item.worn){result.push({type:'magic_wear',instanceId:id,worn:true});existing=applyMagicWardAction(existing,{type:'wear',instanceId:id,worn:true});}
    if(item.attuned){result.push({type:'magic_attune',instanceId:id,attuned:true});existing=applyMagicWardAction(existing,{type:'attune',instanceId:id,attuned:true});}
  }
  if(result.length>MAX_ACTIONS)error('Demasiadas operaciones al importar los objetos mágicos');
  return result;
}
