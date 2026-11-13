"use client";

import {useState} from "react";
import {ARMORS, type ArmorId} from "../../../../packages/rules-engine/src/defense";
import {
  equippedArmor, formatCopper, hasEquippedShield, INVENTORY_NAMES, INVENTORY_PRICES_CP,
  type InventoryAction, type InventoryItemId, type InventoryState,
} from "../../../../packages/rules-engine/src/inventory";
import {
  INVENTORY_CATEGORY_LABELS, inventoryOverview, type InventoryCategory,
} from "../../../../packages/rules-engine/src/inventory-view";
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
  const actualArmor=equippedArmor(inventory);
  const actualShield=hasEquippedShield(inventory);
  const magicArmor=inventory.magicItems.some(item=>item.itemId==="armor_enhancement"&&item.worn);
  const magicShield=inventory.magicItems.some(item=>item.itemId==="shield_enhancement"&&item.worn);

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
    <header className="panel equipment-hero">
      <div className="equipment-hero-title">
        <div><span className="eyebrow">EQUIPO · ACTUALIZACIÓN 41</span><h2>Tu equipo de aventura</h2>
          <p>Objetos, monedas y equipamiento. Los efectos de armaduras, escudos y objetos mágicos se calculan desde el inventario real.</p></div>
        <button type="button" className="equipment-secondary-button" onClick={onEdit}>Editar equipo inicial</button>
      </div>
      <div className="equipment-overview" aria-label="Resumen del inventario">
        <div><span>Saldo disponible</span><strong>{formatCopper(inventory.coinsCopper)}</strong></div>
        <div><span>Objetos comunes</span><strong>{overview.totalUnits}</strong></div>
        <div><span>Objetos mágicos</span><strong>{overview.magicOwned}</strong><small>{overview.magicActive} activos</small></div>
        <div><span>Vinculaciones</span><strong>{overview.magicAttuned}/{overview.attunementCapacity}</strong></div>
      </div>
      <div className="equipment-equipped-line"><span>Armadura: <strong>{actualArmor?INVENTORY_NAMES[actualArmor]:"Ninguna"}</strong></span>
        <span>Escudo: <strong>{actualShield?"Equipado":"No equipado"}</strong></span></div>
      <p className="equipment-save-hint">Los cambios afectan a la hoja inmediatamente, pero se guardan en PostgreSQL únicamente cuando pulsas «Actualizar guardado».</p>
      {outOfSync&&<p className="play-warning" role="alert">La sesión de partida no coincide con los datos actuales del personaje. Revisa la sincronización antes de modificar el inventario.</p>}
    </header>

    <section className="panel equipment-section" aria-labelledby="equipment-list-title">
      <div className="equipment-section-header"><div><span className="eyebrow">CONTENIDO</span><h3 id="equipment-list-title">Inventario actual</h3></div>
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
            return <article className="equipment-item" key={item.id}>
              <div className="equipment-item-main">
                <span className="equipment-item-category">{INVENTORY_CATEGORY_LABELS[item.category]} {item.equipped?"· EQUIPADO":""}</span>
                <strong>{item.name}</strong>
                <small>{item.sourceText}</small>
                <small>{item.unitPriceCopper===null?"Precio no normalizado":`Precio de catálogo: ${formatCopper(item.unitPriceCopper)} / unidad`}</small>
              </div>
              <div className="equipment-item-side"><span className="equipment-quantity" aria-label={`${item.quantity} unidades`}>×{item.quantity}</span>
                {canEquipArmor&&<button type="button" disabled={!enabled} onClick={()=>perform({type:"equip_armor",armor:item.equipped?null:item.id as ArmorId})}>{item.equipped?"Quitar":"Equipar"}</button>}
                {canEquipShield&&<button type="button" disabled={!enabled} onClick={()=>perform({type:"equip_shield",equipped:!item.equipped})}>{item.equipped?"Quitar":"Equipar"}</button>}
              </div>
            </article>;
          })}
        </div>}
      {(magicArmor||magicShield)&&<p className="equipment-context-note">Las piezas mágicas equipadas sustituyen a las normales. Para cambiarlas, usa los controles de objetos mágicos que aparecen más abajo.</p>}
      <p className="equipment-context-note">Las armas comunes se seleccionan al realizar ataques; no existe una casilla de «arma equipada» en el motor actual. Los paquetes de aventurero se mantienen como un objeto único.</p>
    </section>

    <section className="panel equipment-section" aria-labelledby="equipment-trade-title">
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
      {feedback&&<p className={feedback.error?"equipment-feedback is-error":"equipment-feedback"} role={feedback.error?"alert":"status"}>{feedback.message}</p>}
    </section>

    <div className="equipment-magic">
      <MagicWardsPanel inventory={inventory} outOfSync={outOfSync} onInventoryAction={onInventoryAction}/>
    </div>
  </div>;
}
