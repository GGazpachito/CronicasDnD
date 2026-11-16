/** Adaptador de inventario común para el Mago. PHB 2024 p. 165.
 * A diferencia del Guerrero, el Mago comienza sin formación en armaduras.
 * Las compras, monedas y equipamiento usan el motor común de inventory.ts.
 */
import {validateBackgroundEquipment,type BackgroundEquipmentChoice,type InitialBackgroundId,type StartingInventory,type CatalogItemId,ITEM_NAMES} from './background-equipment';
import {replayInventory,type InventoryAction,type InventoryState} from './inventory';
export type WizardGearChoice='equipment'|'gold';
export type WizardInventoryInput=Readonly<{background:InitialBackgroundId;equipmentChoice:WizardGearChoice; backgroundEquipment?:BackgroundEquipmentChoice; inventoryActions?:readonly InventoryAction[]}>;
export function wizardStartingInventory(input:WizardInventoryInput):StartingInventory{
  const choice=input.backgroundEquipment??{startingPackage:'a',...(input.background==='soldier'?{gamingSet:'dice_set' as const}:{})};
  const background=validateBackgroundEquipment(input.background,choice);
  const byId=new Map<CatalogItemId,{quantity:number;sources:{from:'class'|'background';quantity:number}[]}>();
  const add=(id:CatalogItemId,quantity:number,from:'class'|'background')=>{
    const old=byId.get(id)??{quantity:0,sources:[]};
    byId.set(id,{quantity:old.quantity+quantity,sources:[...old.sources,{from,quantity}]});
  };
  // El foco arcano en forma de bastón también es un bastón utilizable como arma simple.
  // Se registra como un único objeto; no se concede un segundo bastón invisible.
  if(input.equipmentChoice==='equipment'){
    for(const [id,count] of [['dagger',2],['quarterstaff',1],['robe',1],['spellbook',1],['scholars_pack',1]] as const)add(id,count,'class');
  }else if(input.equipmentChoice==='gold')add('spellbook',1,'class');
  else throw new RangeError('Equipo inicial del Mago no válido');
  for(const line of background.items)add(line.id,line.quantity,'background');
  const classGold=input.equipmentChoice==='equipment'?5:55;
  return {classGold,backgroundGold:background.gold,totalGold:classGold+background.gold,
    items:[...byId].map(([id,line])=>({id,name:ITEM_NAMES[id],quantity:line.quantity,sources:line.sources}))};
}
export function wizardInventory(input:WizardInventoryInput):InventoryState{
  return replayInventory(wizardStartingInventory(input),null,input.inventoryActions??[]);
}
