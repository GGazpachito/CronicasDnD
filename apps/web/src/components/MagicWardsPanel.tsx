'use client';

import {useState} from 'react';
import type {AdventureState} from '../../../../packages/rules-engine/src/adventure';
import {MAGIC_WARD_CATALOG,RING_RESISTANCE_TYPES,applyMagicWardAction,
  collectMagicWardDefenses,type MagicWardItemId,type RingResistanceType,type MagicWardAction}
  from '../../../../packages/rules-engine/src/magic-wards';

const DAMAGE_NAMES:Readonly<Record<RingResistanceType,string>>={
  acid:'Ácido',cold:'Frío',fire:'Fuego',force:'Fuerza',lightning:'Relámpago',necrotic:'Necrótico',
  poison:'Veneno',psychic:'Psíquico',radiant:'Radiante',thunder:'Trueno'
};

type Props=Readonly<{
  state:AdventureState|null;
  outOfSync:boolean;
  onChange:(state:AdventureState)=>void;
}>;

export default function MagicWardsPanel({state,outOfSync,onChange}:Props){
  const [itemId,setItemId]=useState<MagicWardItemId>('ring_resistance');
  const [damageType,setDamageType]=useState<RingResistanceType>('fire');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const current=state?.magicWards??[];
  const enabled=Boolean(state&&!outOfSync);
  const active=enabled?collectMagicWardDefenses(current):[];
  function perform(action:MagicWardAction){
    if(!state||outOfSync)return;
    try{
      const magicWards=applyMagicWardAction(current,action);
      onChange({...state,magicWards});
      setError('');
      setMessage('Registro actualizado. Pulsa «Actualizar guardado» para conservarlo en PostgreSQL.');
    }catch(e){
      setMessage('');
      setError(e instanceof Error?e.message:'No se pudo modificar el objeto mágico');
    }
  }
  return <section className="play-panel panel" aria-label="Objetos mágicos defensivos">
    <div className="save-panel-head">
      <div><span className="eyebrow">FASE 4.9 · OBJETOS MÁGICOS</span><h2>Defensas mágicas</h2></div>
      <span className="save-label">Guardado manual</span>
    </div>
    <p className="muted-note">Registra aquí los objetos concedidos por el director de juego. Este registro es independiente del inventario común por ahora: no se pueden comprar con oro. Los objetos deben estar puestos y, cuando corresponda, vinculados para activar sus defensas.</p>
    {!enabled?<p className="play-warning" role="alert">Sincroniza tu hoja antes de modificar los objetos mágicos.</p>:<>
      <div className="play-actions-grid">
        <div className="play-action-group">
          <h3>Añadir objeto concedido por el DM</h3>
          <label className="field"><span>Objeto del SRD 5.2.1</span>
            <select value={itemId} onChange={e=>setItemId(e.target.value as MagicWardItemId)}>
              {(Object.keys(MAGIC_WARD_CATALOG) as MagicWardItemId[]).map(id=><option key={id} value={id}>{MAGIC_WARD_CATALOG[id].label}</option>)}
            </select>
          </label>
          {itemId==='ring_resistance'&&<label className="field"><span>Tipo de daño del anillo</span>
            <select value={damageType} onChange={e=>setDamageType(e.target.value as RingResistanceType)}>
              {RING_RESISTANCE_TYPES.map(t=><option key={t} value={t}>{DAMAGE_NAMES[t]}</option>)}
            </select>
          </label>}
          <p className="muted-note">{MAGIC_WARD_CATALOG[itemId].note}</p>
          <button type="button" disabled={current.length>=12} onClick={()=>perform({type:'grant',itemId,...(itemId==='ring_resistance'?{damageType}:{})})}>Registrar objeto recibido</button>
        </div>
        <div className="play-action-group">
          <h3>Defensas mágicas activas</h3>
          {active.length===0?<p className="muted-note">Sin defensas mágicas activas. Puedes registrar un objeto y marcarlo como puesto.</p>:
            active.map(defense=><p className="muted-note" key={defense.id}><strong>{defense.source}</strong>: {defense.kind==='immunity'?'Inmunidad':'Resistencia'} a {defense.damageType}</p>)}
          <p className="muted-note">La resistencia de la especie (si existe) se suma a estas fuentes sin duplicar su efecto. El panel «Ataques recibidos» calcula el resultado final.</p>
        </div>
      </div>
      <h3>Mis objetos mágicos ({current.length})</h3>
      {current.length===0?<p className="muted-note">Ningún objeto registrado.</p>:
        <div className="combat-list">{current.map(item=>{
          const template=MAGIC_WARD_CATALOG[item.itemId];
          const isActive=item.worn&&(!template.attunement||item.attuned);
          return <div className="combat-row" key={item.instanceId} style={{display:'grid',gap:8}}>
            <div><strong>{template.label}{item.damageType?` (${DAMAGE_NAMES[item.damageType]})`:''}</strong>
              <small>{isActive?'Defensa activa':'Defensa inactiva'} · {template.attunement?'Requiere vinculación':'No requiere vinculación'} · ID {item.instanceId}</small>
              <small>{template.note}</small>
            </div>
            <label className="switch-field"><span>Objeto puesto</span>
              <input type="checkbox" checked={item.worn} onChange={e=>perform({type:'wear',instanceId:item.instanceId,worn:e.target.checked})}/>
            </label>
            {template.attunement&&<label className="switch-field"><span>Vinculado (después de completar el descanso necesario)</span>
              <input type="checkbox" checked={item.attuned} onChange={e=>perform({type:'attune',instanceId:item.instanceId,attuned:e.target.checked})}/>
            </label>}
            <button type="button" onClick={()=>perform({type:'remove',instanceId:item.instanceId})}>Retirar objeto del registro</button>
          </div>;
        })}</div>}
      {message&&<p className="save-success" role="status">{message}</p>}
      {error&&<p className="save-error" role="alert">{error}</p>}
      <p className="muted-note">Pendiente: inmunidad al conjuro Proyectil mágico del broche e inmunidad a la condición Envenenado del amuleto. No se aplican como inmunidades generales a otros daños o conjuros. La vinculación se declara manualmente; el descanso corto no la concede automáticamente.</p>
    </>}
  </section>;
}
