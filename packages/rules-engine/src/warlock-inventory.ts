/** Equipo inicial del Brujo, PHB 2024 p. 153 y capítulo de equipo.
 * Comparte registro de inventario y sus acciones con las otras clases.
 */
import {validateBackgroundEquipment,ITEM_NAMES,type StartingInventory,type CatalogItemId,type BackgroundEquipmentChoice,type InitialBackgroundId} from './background-equipment';
import {replayInventory,type InventoryAction,type InventoryState} from './inventory';

export type WarlockEquipmentChoice='equipment'|'gold';
export type WarlockInventoryInput=Readonly<{
 background:InitialBackgroundId;equipmentChoice:WarlockEquipmentChoice;
 backgroundEquipment?:BackgroundEquipmentChoice;inventoryActions?:readonly InventoryAction[];
}>;
export const WARLOCK_EQUIPMENT_OPTIONS={
 equipment:{description:'Armadura de cuero, hoz, 2 dagas, orbe, libro de saber oculto, equipo de erudito y 15 po',gold:15},
 gold:{description:'100 po para adquirir tu equipo',gold:100}
} as const;

export function warlockStartingInventory(input:WarlockInventoryInput):StartingInventory{
 const selection=input.backgroundEquipment??{startingPackage:'a',...(input.background==='soldier'?{gamingSet:'dice_set' as const}:{})};
 const background=validateBackgroundEquipment(input.background,selection);
 if(input.equipmentChoice!=='equipment'&&input.equipmentChoice!=='gold')throw new RangeError('Equipo inicial del Brujo no válido');
 const all=new Map<CatalogItemId,{quantity:number;sources:{from:'class'|'background';quantity:number}[]}>();
 function add(id:CatalogItemId,quantity:number,from:'class'|'background'){
  const prev=all.get(id)??{quantity:0,sources:[]};
  all.set(id,{quantity:prev.quantity+quantity,sources:[...prev.sources,{from,quantity}]});
 }
 if(input.equipmentChoice==='equipment'){
  for(const [id,n] of [['leather',1],['sickle',1],['dagger',2],['arcane_focus_orb',1],['occult_book',1],['scholars_pack',1]] as const)add(id,n,'class');
 }
 for(const item of background.items)add(item.id,item.quantity,'background');
 const classGold=WARLOCK_EQUIPMENT_OPTIONS[input.equipmentChoice].gold;
 return {classGold,backgroundGold:background.gold,totalGold:classGold+background.gold,
  items:[...all].map(([id,entry])=>({id,name:ITEM_NAMES[id],quantity:entry.quantity,sources:entry.sources}))};
}
export function warlockInventory(input:WarlockInventoryInput):InventoryState{
 return replayInventory(warlockStartingInventory(input),input.equipmentChoice==='equipment'?'leather':null,input.inventoryActions??[]);
}
