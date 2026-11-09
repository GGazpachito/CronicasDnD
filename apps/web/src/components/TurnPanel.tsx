'use client';

import {useState} from 'react';
import {startCharacterTurn,endCharacterTurn,spendCombatSlot,moveCombatCharacter,type CombatState} from '../../../../packages/rules-engine/src/combat';
import {conditionCapabilities,initialConditionLedger} from '../../../../packages/rules-engine/src/conditions';
import {initialTurnTracker} from '../../../../packages/rules-engine/src/turns';

type Props={combat:CombatState|null;outOfSync:boolean;onChange:(combat:CombatState)=>void;baseSpeedFeet:number;hitPoints:number};
export default function TurnPanel({combat,outOfSync,onChange,baseSpeedFeet,hitPoints}:Props){
  const [feet,setFeet]=useState(5);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const ready=Boolean(combat&&!outOfSync);
  const turn=combat?.turn??initialTurnTracker();
  const cap=conditionCapabilities(combat?.conditions??initialConditionLedger());
  const speed=cap.speedZero||hitPoints===0?0:Math.max(0,baseSpeedFeet-cap.speedPenaltyFeet);
  const maxMovement=speed*(1+turn.dashes);
  const movementRemaining=Math.max(0,maxMovement-turn.movementUsedFeet);
  const canAct=ready&&turn.active&&hitPoints>0;
  function change(fn:(value:CombatState)=>CombatState,feedback:string){
    if(!combat||!ready)return;
    try{onChange(fn(combat));setError('');setMessage(`${feedback} Actualiza el guardado del personaje para conservarlo.`);}
    catch(e){setError(e instanceof Error?e.message:'Operación de turno inválida');setMessage('');}
  }
  return <section className="combat-panel panel" aria-label="Gestor de turnos y acciones">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.14 · ECONOMÍA DE ACCIONES</span><h2>Tu turno de combate</h2></div><span className="save-label">Guardado manual</span></div>
    {!ready?<p className="play-warning" role="alert">Completa y sincroniza primero el estado del personaje.</p>:<>
      <p className="muted-note">Ronda global {combat!.round} · Turno propio {turn.number||'sin iniciar'} · {turn.active?'Turno en curso':'Fuera de tu turno'}. Los enemigos y la iniciativa siguen bajo control del DM.</p>
      <div className="play-buttons">
        <button type="button" disabled={turn.active||hitPoints===0||cap.deadByExhaustion} onClick={()=>change(startCharacterTurn,'Turno iniciado.')}>Iniciar mi turno</button>
        <button type="button" disabled={!turn.active} onClick={()=>change(endCharacterTurn,'Turno terminado.')}>Terminar mi turno</button>
      </div>
      {turn.number>0&&<>
        <div className="turn-stats" aria-label="Recursos de turno">
          <div><span>Acciones</span><strong>{turn.actionLimit-turn.actionsUsed} / {turn.actionLimit}</strong></div>
          <div><span>Acción adicional</span><strong>{turn.bonusUsed?'Gastada':'Disponible'}</strong></div>
          <div><span>Reacción</span><strong>{turn.reactionUsed?'Gastada':'Disponible'}</strong></div>
          <div><span>Movimiento restante</span><strong>{movementRemaining} pies</strong></div>
        </div>
        <p className="muted-note">La reacción vuelve al comenzar tu siguiente turno, no al terminar el actual. Acción súbita se activa desde «Jugar con tu personaje» y concede una segunda acción en el turno.</p>
        <div className="play-buttons">
          <button type="button" disabled={!canAct||!cap.canTakeAction||turn.actionsUsed>=turn.actionLimit} onClick={()=>change(c=>spendCombatSlot(c,'action'),'Acción genérica gastada.')}>Gastar acción (otra)</button>
          <button type="button" disabled={!canAct||!cap.canTakeAction||turn.actionsUsed>=turn.actionLimit} onClick={()=>change(c=>spendCombatSlot(c,'dash'),'Correr registrado.')}>Correr (acción)</button>
          <button type="button" disabled={!canAct||!cap.canTakeBonusAction||turn.bonusUsed} onClick={()=>change(c=>spendCombatSlot(c,'bonus'),'Acción adicional gastada.')}>Gastar acción adicional</button>
          <button type="button" disabled={!ready||turn.number===0||hitPoints===0||!cap.canReact||turn.reactionUsed} onClick={()=>change(c=>spendCombatSlot(c,'reaction'),'Reacción gastada.')}>Gastar reacción</button>
        </div>
        <div className="turn-movement">
          <label className="field"><span>Movimiento en pies</span><input type="number" min={1} max={1000} step={1} value={feet} onChange={e=>setFeet(Number(e.target.value))}/></label>
          <button type="button" disabled={!canAct||speed===0||!Number.isInteger(feet)||feet<1||feet>movementRemaining} onClick={()=>change(c=>moveCombatCharacter(c,feet,speed),`${feet} pies recorridos.`)}>Registrar movimiento</button>
          <p className="muted-note">Velocidad actual: {speed} pies · Correr: {turn.dashes} vez/veces · Movimiento usado: {turn.movementUsedFeet}. Introduce el coste real en pies, incluido terreno difícil. No se calculan posiciones sobre un mapa.</p>
        </div>
        <p className="muted-note">Ataques: {turn.attackActionUsed?'acción Atacar realizada':'acción Atacar pendiente'} · Ataque extra Ligera: {turn.lightExtraUsed?'usado':'no usado'} · Ataque extra Tajo: {turn.cleaveExtraUsed?'usado':'no usado'}. Elige el gasto correspondiente en «Ataques con armas» antes de confirmar.</p>
        {turn.cleaveReadyWeapon&&!turn.cleaveExtraUsed&&<p className="info-line">Tajo disponible tras impactar a «{turn.cleaveFirstTarget}»: comprueba que la segunda criatura esté a 5 pies de la primera y a tu alcance.</p>}
      </>}
    </>}
    {message&&<p role="status" className="save-success">{message}</p>}
    {error&&<p role="alert" className="save-error">{error}</p>}
    <p className="muted-note">Seguimiento del personaje, no un simulador de encuentros: el DM confirma movimientos, alcance, objetivos y acciones especiales. Los turnos y gastos se guardan junto con el estado de combate.</p>
  </section>;
}
