"use client";

import {useState} from "react";
import {ARMORS, type ArmorId} from "../../../../packages/rules-engine/src/defense";
import {
  formatCopper, INVENTORY_NAMES, INVENTORY_PRICES_CP,
  type InventoryAction, type InventoryItemId, type InventoryState,
} from "../../../../packages/rules-engine/src/inventory";
import {
  INVENTORY_CATEGORY_LABELS, equippedInventory, inventoryOverview, type InventoryCategory,
} from "../../../../packages/rules-engine/src/inventory-view";
import {WEAPONS, type WeaponId} from "../../../../packages/rules-engine/src/martial";
import MagicWardsPanel from "./MagicWardsPanel";

type CategoryFilter = "all" | InventoryCategory;
type EquipmentPanelProps = Readonly<{
  inventory: InventoryState | null;
  error: string | null;
  outOfSync: boolean;
  actionCount: number;
  onInventoryAction: (action: InventoryAction) => string | null;
  onUndo: () => void;
  onReset: () => void;
  onEdit: () => void;
  onOpenAttacks: () => void;
}>;

const CATEGORY_FILTERS: readonly {id:CategoryFilter;label:string}[] = [
  {id:"all",label:"Todos"},
  {id:"weapons",label:"Armas"},
  {id:"armor",label:"Armaduras"},
  {id:"ammunition",label:"Munición"},
  {id:"gear",label:"Equipo"},
];
const CATALOG=(Object.keys(INVENTORY_NAMES) as InventoryItemId[])
  .sort((a,b)=>INVENTORY_NAMES[a].localeCompare(INVENTORY_NAMES[b],"es"));

/** Panel de Equipo. Los filtros y formularios son efímeros; todas las operaciones
 * se envían al mismo diario de inventario que usa el editor anterior.
 */
export default function EquipmentPanel({
  inventory,error,outOfSync,actionCount,onInventoryAction,onUndo,onReset,onEdit,onOpenAttacks,
}:EquipmentPanelProps){
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState<CategoryFilter>("all");
  const [tradeItem,setTradeItem]=useState<InventoryItemId>("shield");
  const [quantity,setQuantity]=useState(1);
  const [feedback,setFeedback]=useState<{message:string;error:boolean}|null>(null);

  if(!inventory)return <section className="panel equipment-unavailable" role="alert">
    <h2>El inventario no está disponible</h2>
    <p>{error??"Revisa las elecciones del personaje para recuperar el inventario."}</p>
    <button type="button" onClick={onEdit}>Revisar equipo</button>
  </section>;

  const overview=inventoryOverview(inventory);
  const enabled=!outOfSync;
  const qtyValid=Number.isInteger(quantity)&&quantity>=1&&quantity<=1000;
  const price=INVENTORY_PRICES_CP[tradeItem];
  const countOwned=inventory.items.find(item=>item.id===tradeItem)?.quantity??0;
  const cost=qtyValid&&price!==undefined?price*quantity:null;
  const sale=cost===null?null:Math.floor(cost/2);
  const term=query.trim().toLocaleLowerCase("es");
  const shown=overview.entries.filter(item=>(category==="all"||item.category===category)&&
    (!term||`${item.name} ${item.sourceText}`.toLocaleLowerCase("es").includes(term)));
  const equipped=equippedInventory(inventory);
  const gold=Math.floor(inventory.coinsCopper/100);
  const silver=Math.floor(inventory.coinsCopper%100/10);
  const copper=inventory.coinsCopper%10;

  function perform(action:InventoryAction){
    if(!enabled)return;
    const problem=onInventoryAction(action);
    setFeedback(problem?{message:problem,error:true}:{message:"Inventario actualizado. Pulsa «Actualizar guardado» en Mis personajes para conservar los cambios.",error:false});
  }
  function confirmReset(){
    if(!enabled||actionCount===0)return;
    if(!window.confirm("¿Reiniciar TODO el inventario hasta su equipo inicial? Se perderán compras, botín, objetos mágicos, equipamiento y vinculaciones no guardados. Podrás deshacer el cambio solo recuperando un guardado anterior."))return;
    onReset();
    setFeedback({message:"Inventario reiniciado al equipo inicial. Guarda solo si quieres conservar este cambio.",error:false});
  }

  return <div className="equipment-page" aria-label="Inventario y equipamiento del personaje">
    <header className="equipment-page-title">
      <div><span className="eyebrow">HOJA DE PERSONAJE · EQUIPO</span><h2>Equipo</h2>
        <p>Marca las casillas del inventario para equipar armas, armaduras y escudos. Los cambios se reflejan en la hoja.</p></div>
      <button type="button" className="equipment-secondary-button" onClick={onEdit}>Editar equipo inicial</button>
    </header>
    {outOfSync&&<p className="play-warning" role="alert">La sesión no coincide con los datos del personaje. Sincronízala antes de modificar el equipo.</p>}
    <div className="equipment-layout">
      <div className="equipment-inventory-column">
    <section className="panel equipment-section" aria-labelledby="equipment-list-title">
      <div className="equipment-section-header"><div><span className="eyebrow">OBJETOS EN TU MOCHILA</span><h3 id="equipment-list-title">Inventario</h3></div>
        <button type="button" className="equipment-secondary-button" onClick={onOpenAttacks}>Abrir ataques</button></div>
      <div className="equipment-toolbar">
        <label><span>Buscar objetos</span><input type="search" placeholder="Nombre o procedencia" value={query} onChange={event=>setQuery(event.target.value)}/></label>
        <div className="equipment-filters" role="group" aria-label="Filtrar inventario por categoría">
          {CATEGORY_FILTERS.map(item=><button key={item.id} type="button" aria-pressed={category===item.id} className={category===item.id?"is-active":""} onClick={()=>setCategory(item.id)}>{item.label}</button>)}
        </div>
      </div>
      <p className="equipment-results" role="status">{shown.length} tipos visibles de {overview.entries.length}. Las cantidades reflejan las unidades, no el número de tipos.</p>
      {shown.length===0?<p className="equipment-empty">No hay objetos que coincidan con la búsqueda o el filtro.</p>:
        <div className="equipment-items">
          {shown.map(item=>{
            const canEquipArmor=Object.hasOwn(ARMORS,item.id);
            const canEquipShield=item.id==="shield";
            const canEquipWeapon=Object.hasOwn(WEAPONS,item.id);
            return <article className="equipment-item" key={item.id}>
              <div className="equipment-item-main">
                <span className="equipment-item-category">{INVENTORY_CATEGORY_LABELS[item.category]} {item.equipped?"· EQUIPADO":""}</span>
                <strong>{item.name}</strong>
                <small>{item.sourceText}</small>
                <small>{item.unitPriceCopper===null?"Precio no normalizado":`Precio de catálogo: ${formatCopper(item.unitPriceCopper)} / unidad`}</small>
              </div>
              <div className="equipment-item-side"><span className="equipment-quantity" aria-label={`${item.quantity} unidades`}>×{item.quantity}</span>
                {(canEquipArmor||canEquipShield||canEquipWeapon)&&<label className="equipment-equip-check">
                  <input type="checkbox" aria-label={`Equipar ${item.name}`} checked={item.equipped} disabled={!enabled}
                    onChange={event=>{
                      const checked=event.target.checked;
                      if(canEquipWeapon)perform({type:"equip_weapon",weaponId:item.id as WeaponId,equipped:checked});
                      else if(canEquipShield)perform({type:"equip_shield",equipped:checked});
                      else perform({type:"equip_armor",armor:checked?item.id as ArmorId:null});
                    }}/>
                  <span>{item.equipped?"Equipado":"Equipar"}</span>
                </label>}
              </div>
            </article>;
          })}
        </div>}
      <p className="equipment-context-note">Puedes marcar varias armas como preparadas. Esa selección se guarda, pero no impone restricciones de manos ni limita las tiradas de ataque. Al vender o descartar la última unidad de un arma equipada, se desmarca automáticamente.</p>
      {feedback&&<p className={feedback.error?"equipment-feedback is-error":"equipment-feedback"} role={feedback.error?"alert":"status"}>{feedback.message}</p>}
      <details className="equipment-trade-fold"><summary>Comprar, vender y gestionar botín</summary>
    <div className="equipment-trade-content" aria-labelledby="equipment-trade-title">
      <div className="equipment-section-header"><div><span className="eyebrow">MOVIMIENTOS</span><h3 id="equipment-trade-title">Comprar, vender y registrar botín</h3></div>
        <span className="equipment-history-count">{actionCount} operaciones</span></div>
      <div className="equipment-trade-fields">
        <label><span>Objeto del catálogo</span><select value={tradeItem} disabled={!enabled} onChange={event=>setTradeItem(event.target.value as InventoryItemId)}>{CATALOG.map(id=><option key={id} value={id}>{INVENTORY_NAMES[id]}</option>)}</select></label>
        <label><span>Cantidad</span><input type="number" min={1} max={1000} step={1} value={quantity} disabled={!enabled} onChange={event=>setQuantity(Number(event.target.value))}/></label>
      </div>
      <div className="equipment-quote" aria-live="polite">
        <div><span>Disponibles</span><strong>{countOwned}</strong></div>
        <div><span>Compra</span><strong>{cost===null?"Sin precio":formatCopper(cost)}</strong></div>
        <div><span>Venta (mitad)</span><strong>{sale===null?"Sin precio":formatCopper(sale)}</strong></div>
      </div>
      <div className="equipment-trade-buttons">
        <button type="button" disabled={!enabled||!qtyValid||cost===null||inventory.coinsCopper<cost} onClick={()=>perform({type:"buy",itemId:tradeItem,quantity})}>Comprar</button>
        <button type="button" disabled={!enabled||!qtyValid||cost===null||countOwned<quantity} onClick={()=>perform({type:"sell",itemId:tradeItem,quantity})}>Vender</button>
        <button type="button" disabled={!enabled||!qtyValid} onClick={()=>perform({type:"add",itemId:tradeItem,quantity})}>Añadir botín</button>
        <button type="button" disabled={!enabled||!qtyValid||countOwned<quantity} onClick={()=>perform({type:"remove",itemId:tradeItem,quantity})}>Descartar</button>
      </div>
      <p className="equipment-context-note">Compra y venta descuentan o añaden monedas automáticamente. Los objetos sin precio validado solo se incorporan como botín. Confirma los movimientos con el DM.</p>
      <div className="equipment-history-actions">
        <button type="button" disabled={!enabled||actionCount===0} onClick={()=>{onUndo();setFeedback({message:"Se ha deshecho la última operación del inventario.",error:false});}}>Deshacer última operación</button>
        <button type="button" disabled={!enabled||actionCount===0} onClick={confirmReset}>Reiniciar inventario</button>
      </div>
    </div></details>
    </section>
      </div>
      <div className="equipment-side-column">
        <section className="panel equipment-section equipment-equipped-card" aria-labelledby="equipment-equipped-title">
          <div className="equipment-section-header"><div><span className="eyebrow">LISTO PARA USAR</span><h3 id="equipment-equipped-title">Objetos equipados</h3></div>
            <span className="equipment-history-count">{equipped.length}</span></div>
          {equipped.length===0?<p className="equipment-empty">No hay objetos equipados. Marca las casillas del inventario.</p>:<div className="equipment-equipped-list">
            {equipped.map(item=><div className="equipment-equipped-item" key={item.key}>
              <span className="equipment-equipped-symbol" aria-hidden="true">{item.category==="weapon"?"⚔":item.category==="armor"?"◈":"⬡"}</span>
              <div><strong>{item.name}</strong><small>{item.category==="weapon"?"Arma":item.category==="armor"?"Armadura":"Escudo"}{item.magical?" · Mágico":""}</small></div>
            </div>)}
          </div>}
          <p className="equipment-context-note">La lista se obtiene directamente de las casillas y de los objetos mágicos que lleves equipados. Para retirar un objeto, desmarca su casilla en Inventario u Objetos mágicos.</p>
        </section>
        <div className="equipment-magic"><MagicWardsPanel inventory={inventory} outOfSync={outOfSync} onInventoryAction={onInventoryAction}/></div>
      </div>
    </div>
    <section className="panel equipment-wallet" aria-label="Contador de monedas">
      <div className="equipment-wallet-heading"><span className="eyebrow">MONEDERO</span><h3>Oro / Plata / Cobre</h3></div>
      <div className="equipment-coin-values">
        <div><strong>{gold}</strong><span>Oro (po)</span></div>
        <div><strong>{silver}</strong><span>Plata (pp)</span></div>
        <div><strong>{copper}</strong><span>Cobre (pc)</span></div>
      </div>
      <p>Saldo: {formatCopper(inventory.coinsCopper)}. Las compras y ventas actualizan las monedas automáticamente.</p>
    </section>
    <p className="equipment-save-hint">Pulsa «Actualizar guardado» en Mis personajes para conservar estos cambios en PostgreSQL.</p>
  </div>;
}
