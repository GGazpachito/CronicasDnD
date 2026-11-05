'use client';

import {useState} from 'react';
import {
  addCharacterCondition,changeExhaustion,removeCharacterCondition,type CombatState,
} from '../../../../packages/rules-engine/src/combat';
import {
  CONDITION_NAMES,conditionCapabilities,conditionKinds,evaluateConditionRoll,initialConditionLedger,
  type ConditionId,
} from '../../../../packages/rules-engine/src/conditions';
import type {Ability} from '../../../../packages/rules-engine/src/abilities';

type Props={combat:CombatState|null;outOfSync:boolean;onChange:(combat:CombatState)=>void;baseSpeed:number};
const labelMode=(mode:string)=>mode==='advantage'?'Ventaja':mode==='disadvantage'?'Desventaja':'Normal';
export default function ConditionsPanel({combat,outOfSync,onChange,baseSpeed}:Props){
  const [kind,setKind]=useState<ConditionId>('poisoned');
  const [source,setSource]=useState('Efecto de partida');
  const [rounds,setRounds]=useState(2);
  const [indefinite,setIndefinite]=useState(true);
  const [fearVisible,setFearVisible]=useState(true);
  const [attackerDistance,setAttackerDistance]=useState(5);
  const [attackerSeesInvisible,setAttackerSeesInvisible]=useState(true);
  const [saveAbility,setSaveAbility]=useState<Ability>('dexterity');
  const [sense,setSense]=useState<'none'|'sight'|'hearing'>('none');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const ready=Boolean(combat&&!outOfSync);
  const ledger=combat?.conditions??initialConditionLedger();
  const kinds=conditionKinds(ledger);
  const capabilities=conditionCapabilities(ledger);
  const attack=evaluateConditionRoll(ledger,{kind:'attack',fearSourceVisible:fearVisible,targetIsGrappler:false,otherCreatureCanSeeInvisible:attackerSeesInvisible,targetIsCharmer:false});
  const received=evaluateConditionRoll(ledger,{kind:'incoming_attack',attackerDistanceFeet:attackerDistance,otherCreatureCanSeeInvisible:attackerSeesInvisible});
  const check=evaluateConditionRoll(ledger,{kind:'ability_check',fearSourceVisible:fearVisible,sense});
  const save=evaluateConditionRoll(ledger,{kind:'saving_throw',ability:saveAbility});
  const initiative=evaluateConditionRoll(ledger,{kind:'initiative'});
  const speed=capabilities.speedZero?0:Math.max(0,baseSpeed-capabilities.speedPenaltyFeet);
  function perform(fn:(c:CombatState)=>CombatState){
    if(!combat||!ready)return;
    try{onChange(fn(combat));setError('');setMessage('Condiciones actualizadas. Recuerda pulsar «Actualizar guardado».');}
    catch(e){setError(e instanceof Error?e.message:'No se pudo modificar la condición');setMessage('');}
  }
  return <section className="condition-panel panel" aria-label="Condiciones y agotamiento">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.5 · REGLAS 2024</span><h2>Condiciones y agotamiento</h2></div><span className="save-label">Guardado manual</span></div>
    {!ready?<p role="alert" className="play-warning">El personaje no está sincronizado. Soluciona el estado de partida antes de añadir condiciones.</p>:<>
      <p className="muted-note">Puedes registrar varias fuentes de una condición con sus duraciones independientes. Sus efectos no se acumulan. Agotamiento se controla por niveles.</p>
      <div className="condition-grid">
        <div className="condition-block">
          <h3>Añadir una condición</h3>
          <label className="field"><span>Condición</span><select value={kind} onChange={e=>setKind(e.target.value as ConditionId)}>{(Object.keys(CONDITION_NAMES) as ConditionId[]).map(k=><option key={k} value={k}>{CONDITION_NAMES[k]}</option>)}</select></label>
          <label className="field"><span>Fuente (obligatoria)</span><input maxLength={100} value={source} onChange={e=>setSource(e.target.value)} placeholder="Ej.: hechizo o criatura"/></label>
          <label className="switch-field"><span>Hasta retirarla manualmente</span><input type="checkbox" checked={indefinite} onChange={e=>setIndefinite(e.target.checked)}/></label>
          {!indefinite&&<label className="field"><span>Rondas restantes (control manual)</span><input type="number" min={1} max={100} value={rounds} onChange={e=>setRounds(Number(e.target.value))}/></label>}
          <button type="button" className="combat-primary" disabled={ledger.instances.length>=30||!source.trim()} onClick={()=>perform(s=>addCharacterCondition(s,kind,source,indefinite?null:rounds))}>Aplicar condición</button>
          <div className="condition-exhaustion">
            <strong>Agotamiento: nivel {ledger.exhaustion}/6</strong>
            <div className="condition-exhaustion-actions"><button type="button" disabled={ledger.exhaustion===0} onClick={()=>perform(s=>changeExhaustion(s,-1))}>− Un nivel</button><button type="button" disabled={ledger.exhaustion===6} onClick={()=>perform(s=>changeExhaustion(s,1))}>+ Un nivel</button></div>
            <p className="muted-note">Penalización al d20: {-(ledger.exhaustion*2)} · Reducción de velocidad: {ledger.exhaustion*5} pies. Un descanso largo reduce un nivel. Con 6 niveles, el personaje muere según las reglas; la muerte no está automatizada.</p>
          </div>
        </div>
        <div className="condition-block">
          <h3>Condiciones activas ({ledger.instances.length})</h3>
          {ledger.instances.length===0?<p className="muted-note">No hay condiciones binarias activas.</p>:<div className="combat-list">{ledger.instances.map(c=><div className="combat-row" key={c.id}><div><strong>{CONDITION_NAMES[c.kind]}</strong><small>{c.source} · {c.remainingRounds===null?'Hasta retirarla':`${c.remainingRounds} ronda(s)`}</small></div><button type="button" onClick={()=>perform(s=>removeCharacterCondition(s,c.id))}>Quitar</button></div>)}</div>}
          <p className="muted-note">Al avanzar ronda en «Registro y efectos temporales» se descuentan también las duraciones aquí registradas. El efecto no desaparece por terminar un descanso salvo que sus reglas lo indiquen.</p>
          <div className="condition-summary">
            <div><span>Velocidad efectiva</span><strong>{speed} pies</strong></div>
            <div><span>Puede actuar</span><strong>{capabilities.canTakeAction?'Sí':'No'}</strong></div>
            <div><span>Concentración permitida</span><strong>{capabilities.canConcentrate?'Sí':'No'}</strong></div>
          </div>
          {kinds.has('prone')&&<p className="muted-note">Derribado: solo puedes arrastrarte o levantarte gastando la mitad de tu velocidad; no es una reducción permanente de velocidad.</p>}
          {!capabilities.canApproachFearSource&&<p className="muted-note">Asustado: no puedes acercarte voluntariamente a la fuente de miedo.</p>}
          {kinds.has('petrified')&&<p className="muted-note">Petrificado: resistencia a todo el daño e inmunidad a Envenenado. La resistencia aún debe resolverse manualmente al registrar daño.</p>}
        </div>
      </div>
      <div className="condition-block condition-rolls"><h3>Consecuencias al tirar dados</h3>
        <div className="condition-context">
          {kinds.has('frightened')&&<label><input type="checkbox" checked={fearVisible} onChange={e=>setFearVisible(e.target.checked)}/> Fuente del miedo visible</label>}
          {kinds.has('invisible')&&<label><input type="checkbox" checked={attackerSeesInvisible} onChange={e=>setAttackerSeesInvisible(e.target.checked)}/> La otra criatura puede ver a mi personaje invisible</label>}
          <label className="field"><span>Distancia del atacante (pies)</span><input type="number" min={0} max={10000} value={attackerDistance} onChange={e=>setAttackerDistance(Number(e.target.value))}/></label>
          <label className="field"><span>Salvación a consultar</span><select value={saveAbility} onChange={e=>setSaveAbility(e.target.value as Ability)}>{[['strength','Fuerza'],['dexterity','Destreza'],['constitution','Constitución'],['intelligence','Inteligencia'],['wisdom','Sabiduría'],['charisma','Carisma']].map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
          <label className="field"><span>Prueba que depende de…</span><select value={sense} onChange={e=>setSense(e.target.value as 'none'|'sight'|'hearing')}><option value="none">Ningún sentido especial</option><option value="sight">La vista</option><option value="hearing">El oído</option></select></label>
        </div>
        <div className="condition-results">
          <div><span>Atacar</span><strong>{attack.actionForbidden?'Impedido':labelMode(attack.mode)}</strong></div>
          <div><span>Recibir ataque</span><strong>{labelMode(received.mode)}{received.automaticCriticalIfHit?' · Crítico si impacta':''}</strong></div>
          <div><span>Prueba de característica</span><strong>{check.automaticFailure?'Fallo automático':labelMode(check.mode)}</strong></div>
          <div><span>Salvación</span><strong>{save.automaticFailure?'Fallo automático':labelMode(save.mode)}</strong></div>
          <div><span>Iniciativa</span><strong>{labelMode(initiative.mode)}</strong></div>
          <div><span>Penalización general d20</span><strong>{attack.d20Penalty}</strong></div>
        </div>
        <p className="muted-note">Los efectos de situaciones externas deben comprobarse en la mesa: ventajas de aliados, visión especial, cobertura, distancias, resistencia al daño y fuentes de miedo. Las ventajas y desventajas se anulan aunque haya varias fuentes de cada tipo.</p>
      </div>
    </>}
    {message&&<p className="save-success" role="status">{message}</p>}{error&&<p className="save-error" role="alert">{error}</p>}
  </section>;
}
