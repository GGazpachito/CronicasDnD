'use client';

import {useState} from 'react';
import {INVENTORY_NAMES, type InventoryAction,type InventoryState} from '../../../../packages/rules-engine/src/inventory';
import {ARMORS,type ArmorId} from '../../../../packages/rules-engine/src/defense';
import {MAGIC_WARD_CATALOG,RING_RESISTANCE_TYPES,collectMagicWardBonuses,collectMagicWardDefenses,
  type MagicWardItemId,type RingResistanceType,type EnhancementBonus} from '../../../../packages/rules-engine/src/magic-wards';

const DAMAGE_NAMES:Readonly<Record<RingResistanceType,string>>={
  acid:'Ácido',cold:'Frío',fire:'Fuego',force:'Fuerza',lightning:'Relámpago',necrotic:'Necrótico',
  poison:'Veneno',psychic:'Psíquico',radiant:'Radiante',thunder:'Trueno'
};

type Props=Readonly<{
  inventory:InventoryState|null;
  outOfSync:boolean;
  onInventoryAction:(action:InventoryAction)=>string|null;
}>;

/** Editor del mismo diario de inventario que compra, vende y equipa objetos mundanos.
 * Un único historial controla los objetos mágicos, sus estados y sus beneficios.
 */
export default function MagicWardsPanel({inventory,outOfSync,onInventoryAction}:Props){
  const [itemId,setItemId]=useState<MagicWardItemId>('ring_resistance');
  const [damageType,setDamageType]=useState<RingResistanceType>('fire');
  const [armorId,setArmorId]=useState<ArmorId>('chain_mail');
  const [enhancement,setEnhancement]=useState<EnhancementBonus>(1);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const current=inventory?.magicItems??[];
  const enabled=Boolean(inventory&&!outOfSync);
  const defenses=collectMagicWardDefenses(current);
  const bonuses=collectMagicWardBonuses(current);
  function perform(action:InventoryAction){
    if(!enabled)return;
    const problem=onInventoryAction(action);
    setError(problem??'');
    setMessage(problem?'':'Inventario actualizado. Guarda el personaje para conservar los cambios en PostgreSQL.');
  }
  return <section className="play-panel panel" aria-label="Objetos mágicos del inventario">
    <div className="save-panel-head">
      <div><span className="eyebrow">FASE 4.11 · ARMADURAS Y ESCUDOS MÁGICOS</span><h2>Objetos mágicos del inventario</h2></div>
      <span className="save-label">Guardado manual</span>
    </div>
    <p className="muted-note">Los objetos mágicos se gestionan en el mismo inventario y el mismo historial de operaciones que las armas y armaduras. Solo el director de juego puede concederlos: no tienen precio de compra ni venta en el prototipo.</p>
    {!enabled?<p className="play-warning" role="alert">Completa y sincroniza tu hoja antes de editar el inventario mágico.</p>:<>
      <div className="play-actions-grid">
        <div className="play-action-group">
          <h3>Registrar objeto concedido por el DM</h3>
          <label className="field"><span>Objeto del catálogo</span>
            <select value={itemId} onChange={e=>setItemId(e.target.value as MagicWardItemId)}>
              {(Object.keys(MAGIC_WARD_CATALOG) as MagicWardItemId[]).map(id=><option key={id} value={id}>{MAGIC_WARD_CATALOG[id].label}</option>)}
            </select>
          </label>
          {itemId==='ring_resistance'&&<label className="field"><span>Tipo de daño del anillo</span>
            <select value={damageType} onChange={e=>setDamageType(e.target.value as RingResistanceType)}>
              {RING_RESISTANCE_TYPES.map(t=><option key={t} value={t}>{DAMAGE_NAMES[t]}</option>)}
            </select>
          </label>}
          {itemId==='armor_enhancement'&&<label className="field"><span>Tipo de armadura mágica</span>
            <select value={armorId} onChange={e=>setArmorId(e.target.value as ArmorId)}>
              {(Object.keys(ARMORS) as ArmorId[]).map(id=><option key={id} value={id}>{INVENTORY_NAMES[id]}</option>)}
            </select>
          </label>}
          {(itemId==='armor_enhancement'||itemId==='shield_enhancement')&&<label className="field"><span>Bonificador mágico</span>
            <select value={enhancement} onChange={e=>setEnhancement(Number(e.target.value) as EnhancementBonus)}>
              {([1,2,3] as const).map(n=><option key={n} value={n}>+{n}</option>)}
            </select>
          </label>}
          <p className="muted-note">{MAGIC_WARD_CATALOG[itemId].note}</p>
          <button type="button" disabled={current.length>=12} onClick={()=>perform({type:'magic_grant',itemId,
            ...(itemId==='ring_resistance'?{damageType}:{}),
            ...(itemId==='armor_enhancement'?{armorId,enhancement}:{}),
            ...(itemId==='shield_enhancement'?{enhancement}:{})})}>Añadir objeto al inventario</button>
        </div>
        <div className="play-action-group">
          <h3>Bonificaciones activas</h3>
          {defenses.length===0&&bonuses.length===0?<p className="muted-note">Ninguna defensa mágica activa.</p>:<>
            {defenses.map(d=><p key={d.id} className="muted-note"><strong>{d.source}</strong>: {d.kind==='immunity'?'Inmunidad':'Resistencia'} a {d.damageType}</p>)}
            {bonuses.map(b=><p key={b.id} className="muted-note"><strong>{b.source}</strong>: +{b.armorClass} CA{b.savingThrows?` y +${b.savingThrows} a todas las salvaciones`:''}.</p>)}
          </>}
          <p className="muted-note">La CA y las salvaciones aparecen actualizadas en la hoja. Las resistencias se aplican automáticamente a los ataques recibidos.</p>
        </div>
      </div>
      <h3>Equipo mágico propio ({current.length})</h3>
      {current.length===0?<p className="muted-note">Todavía no tienes objetos mágicos.</p>:<div className="combat-list">
        {current.map(item=>{
          const template=MAGIC_WARD_CATALOG[item.itemId];
          const active=item.worn&&(!template.attunement||item.attuned);
          return <div className="combat-row" key={item.instanceId} style={{display:'grid',gap:8}}>
            <div><strong>{template.label}{item.armorId?` (${INVENTORY_NAMES[item.armorId]})`:''}{item.enhancement?` +${item.enhancement}`:''}{item.damageType?` (${DAMAGE_NAMES[item.damageType]})`:''}</strong>
              <small>{active?'Bonificación activa':'Bonificación inactiva'} · {template.attunement?'Vinculación requerida':'Sin vinculación'} · {item.instanceId}</small>
              <small>{template.note}</small>
            </div>
            <label className="switch-field"><span>{item.itemId==='shield_enhancement'?'Escudo empuñado':item.itemId==='armor_enhancement'?'Armadura equipada':'Llevado puesto'}</span>
              <input type="checkbox" checked={item.worn} onChange={e=>perform({type:'magic_wear',instanceId:item.instanceId,worn:e.target.checked})}/>
            </label>
            {template.attunement&&<label className="switch-field"><span>Vinculado (realiza el descanso y la vinculación reglamentarios)</span>
              <input type="checkbox" checked={item.attuned} onChange={e=>perform({type:'magic_attune',instanceId:item.instanceId,attuned:e.target.checked})}/>
            </label>}
            <button type="button" onClick={()=>perform({type:'magic_remove',instanceId:item.instanceId})}>Retirar del inventario</button>
          </div>;
        })}
      </div>}
      {message&&<p role="status" className="muted-note">{message}</p>}
      {error&&<p role="alert" className="save-error">{error}</p>}
      <p className="muted-note">Armaduras y escudos mágicos reemplazan su equivalente normal, sin necesidad de poseer otra pieza mundana. Solo se puede equipar una armadura y un escudo a la vez; no requieren vinculación. Para cambiar entre piezas mágicas, quita primero la anterior.</p>
      <p className="muted-note">Pendiente: inmunidad al conjuro Proyectil mágico del broche e inmunidad a la condición Envenenado del amuleto. La vinculación se marca manualmente y no se concede automáticamente en un descanso corto.</p>
    </>}
  </section>;
}
