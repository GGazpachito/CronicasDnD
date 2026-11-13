/** Actualización 41: proyección de SOLO LECTURA del inventario para la hoja Equipo.
 * La fuente de verdad continúa siendo InventoryState, obtenido al reproducir
 * inventoryActions. No se almacenan totales ni equipamiento derivados.
 */
import { ARMORS } from './defense';
import { WEAPONS } from './martial';
import { INVENTORY_PRICES_CP, type InventoryItemId, type InventoryState, type InventorySource } from './inventory';
import { MAGIC_WARD_CATALOG } from './magic-wards';

export type InventoryCategory = 'weapons' | 'armor' | 'ammunition' | 'gear';
export const INVENTORY_CATEGORY_LABELS: Readonly<Record<InventoryCategory,string>> = {
  weapons: 'Armas', armor: 'Armaduras y escudos', ammunition: 'Munición', gear: 'Equipo de aventura',
};
const AMMUNITION = new Set<InventoryItemId>(['arrow','bolt','bullet','needle','sling_bullet']);

export function inventoryCategory(id: InventoryItemId): InventoryCategory {
  if (Object.hasOwn(WEAPONS,id)) return 'weapons';
  if (id==='shield' || Object.hasOwn(ARMORS,id)) return 'armor';
  if (AMMUNITION.has(id)) return 'ammunition';
  return 'gear';
}

export const INVENTORY_SOURCE_LABELS: Readonly<Record<InventorySource,string>> = {
  class:'Clase', background:'Trasfondo', purchase:'Compra', loot:'Botín',
};

export type InventoryOverview = Readonly<{
  entries: readonly Readonly<{
    id: InventoryItemId;
    name:string;
    quantity:number;
    category:InventoryCategory;
    equipped:boolean;
    sourceText:string;
    unitPriceCopper:number|null;
  }>[];
  categories:Readonly<Record<InventoryCategory,number>>;
  totalUnits:number;
  magicOwned:number;
  magicActive:number;
  magicAttuned:number;
  attunementCapacity:number;
}>;

export function inventoryOverview(state:InventoryState):InventoryOverview {
  const categories:Record<InventoryCategory,number>={weapons:0,armor:0,ammunition:0,gear:0};
  const entries=state.items.map(item=>{
    const category=inventoryCategory(item.id);
    categories[category]+=item.quantity;
    return {
      id:item.id,name:item.name,quantity:item.quantity,category,
      equipped: category==='armor' && (state.equipped.armor===item.id || (item.id==='shield'&&state.equipped.shield)),
      sourceText:item.sources.map(src=>`${INVENTORY_SOURCE_LABELS[src.from]} ×${src.quantity}`).join(' · '),
      unitPriceCopper:INVENTORY_PRICES_CP[item.id]??null,
    };
  });
  const magicActive=state.magicItems.filter(item=>item.worn && (!MAGIC_WARD_CATALOG[item.itemId].attunement || item.attuned)).length;
  const magicAttuned=state.magicItems.filter(item=>item.attuned).length;
  return {
    entries,categories,totalUnits:entries.reduce((total,item)=>total+item.quantity,0),
    magicOwned:state.magicItems.length,magicActive,magicAttuned,attunementCapacity:3,
  };
}
