'use client';

import {useState} from 'react';
import {addTrackedEffect,advanceCombatRound,removeTrackedEffect,clearMasteryEffect,type CombatState} from '../../../../packages/rules-engine/src/combat';
import {WEAPONS} from '../../../../packages/rules-engine/src/martial';
import {INVENTORY_NAMES} from '../../../../packages/rules-engine/src/inventory';

type Props={combat:CombatState|null;onChange:(value:CombatState)=>void;outOfSync:boolean};
export default function CombatPanel({combat,onChange,outOfSync}:Props){
  const [name,setName]=useState('');
  const [notes,setNotes]=useState('');
  const [rounds,setRounds]=useState(1);
  const [indefinite,setIndefinite]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const ready=Boolean(combat&&!outOfSync);
  function perform(fn:(c:CombatState)=>CombatState):boolean{
    if(!combat||!ready)return false;
    try{onChange(fn(combat));setError('');setMessage('Estado actualizado. Pulsa «Actualizar guardado» para conservarlo en PostgreSQL.');return true;}
    catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el combate');setMessage('');return false;}
  }
  function add(){
    if(perform(c=>addTrackedEffect(c,name,indefinite?null:rounds,notes))){setName('');setNotes('');}
  }
  return <section className="combat-panel panel" aria-label="Historial de combate y efectos temporales">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.13 · REGISTRO DE COMBATE</span><h2>Registro y efectos temporales</h2></div><span className="save-label">Guardado manual</span></div>
    {!combat||outOfSync?<p className="play-warning" role="alert">El estado del personaje no está disponible o está desincronizado. Resuelve ese problema antes de registrar acciones.</p>:<>
      <div className="combat-round-heading"><div><strong>Ronda indicada: {combat.round}</strong><p className="muted-note">El DM decide cuándo termina cada ronda. Finaliza tu turno antes de avanzar.</p></div><button type="button" onClick={()=>perform(advanceCombatRound)}>Avanzar ronda</button></div>
      <div className="combat-column"><h3>Maestrías pendientes ({combat.masteryEffects?.length??0})</h3>
        <p className="muted-note">Hostigar concede ventaja contra el objetivo anotado y se consume al atacarlo. Si activas el gestor de turnos, Hostigar, Debilitar y Ralentizar nuevos caducan automáticamente cuando corresponde. Los anteriores y los efectos sobre enemigos pueden requerir resolución manual.</p>
        <div className="combat-list">{!combat.masteryEffects?.length&&<p className="muted-note">Sin efectos de maestría pendientes.</p>}
          {(combat.masteryEffects??[]).map(effect=><div className="combat-row" key={effect.id}><div><strong>{effect.mastery} · {effect.target} · R{effect.round}</strong><small>{effect.detail}</small></div><button type="button" onClick={()=>perform(c=>clearMasteryEffect(c,effect.id))}>Resuelto / caducado</button></div>)}
        </div>
      </div>
      <div className="combat-columns">
        <div className="combat-column"><h3>Efectos anotados ({combat.effects.length})</h3>
          <p className="muted-note">Se registran nombre y duración. No alteran automáticamente tiradas, CA ni estados de criaturas.</p>
          <label className="field"><span>Nombre del efecto</span><input maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej.: bendición, luz, protección"/></label>
          <label className="field"><span>Notas opcionales</span><input maxLength={200} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Origen o recordatorio del DM"/></label>
          <label className="switch-field"><span>Duración indefinida (hasta retirarlo)</span><input type="checkbox" checked={indefinite} onChange={e=>setIndefinite(e.target.checked)}/></label>
          {!indefinite&&<label className="field"><span>Rondas restantes</span><input type="number" min={1} max={100} step={1} value={rounds} onChange={e=>setRounds(Number(e.target.value))}/></label>}
          <button type="button" className="combat-primary" onClick={add} disabled={!name.trim()||combat.effects.length>=30}>Añadir efecto</button>
          <div className="combat-list">{combat.effects.length===0&&<p className="muted-note">Sin efectos anotados.</p>}{combat.effects.map(effect=><div className="combat-row" key={effect.id}><div><strong>{effect.name}</strong><small>{effect.remainingRounds===null?'Hasta retirarlo':`${effect.remainingRounds} ronda(s) restante(s)`}{effect.notes?` · ${effect.notes}`:''}</small></div><button type="button" onClick={()=>perform(c=>removeTrackedEffect(c,effect.id))}>Quitar</button></div>)}</div>
        </div>
        <div className="combat-column"><h3>Últimos ataques ({combat.attacks.length})</h3>
          <p className="muted-note">Los ataques se añaden con «Confirmar ataque» en el panel anterior. No se aplican PG a enemigos.</p>
          <div className="combat-list">{combat.attacks.length===0&&<p className="muted-note">Todavía no hay ataques confirmados.</p>}{[...combat.attacks].reverse().slice(0,15).map(event=><div className="combat-row" key={event.id}><div><strong>R{event.round} · {WEAPONS[event.weaponId].name}{event.magicEnhancement?` +${event.magicEnhancement}`:''} · {event.attackTotal} {event.critical?'(crítico)':''}</strong><small>{event.hit===null?'Impacto sin determinar':event.hit?'Impactó':'Falló'} · {event.damageTotal===null?'Daño sin resolver':`${event.damageTotal} de daño`}{event.grazeDamage!==null?` · Rozar posible: ${event.grazeDamage}`:''}</small>{event.magicWeaponInstanceId&&<small>Arma mágica utilizada: {event.magicWeaponInstanceId} (bonificación +{event.magicEnhancement})</small>}{event.targetName&&<small>Objetivo: {event.targetName}</small>}{event.masteryNote&&<small>{event.masteryNote}</small>}{event.ammunitionSpent&&<small>Gastada: 1 × {INVENTORY_NAMES[event.ammunitionSpent]}</small>}</div></div>)}</div>
          {combat.attacks.length>15&&<p className="muted-note">Mostrando los 15 más recientes. El estado conserva hasta 100 ataques.</p>}
        </div>
      </div>
    </>}
    {message&&<p role="status" className="save-success">{message}</p>}
    {error&&<p role="alert" className="save-error">{error}</p>}
    <p className="muted-note">El historial y los efectos se guardan al pulsar «Actualizar guardado» en Mis personajes. Avanzar ronda reduce las duraciones generales; el gestor de turnos registra solo los turnos de tu personaje, no iniciativa ni acciones de enemigos.</p>
  </section>;
}
