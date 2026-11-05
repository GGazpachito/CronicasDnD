'use client';

import {useState} from 'react';
import {applyAdventureAction,type AdventureState,type AdventureAction} from '../../../../packages/rules-engine/src/adventure';
import type {CalculatedFighterSheet} from '../../../../packages/rules-engine/src/sheet';

/** El resultado de una tirada se introduce manualmente; no se tiran dados ocultos. */
type Props={sheet:CalculatedFighterSheet|null;state:AdventureState|null;outOfSync:boolean;onChange:(next:AdventureState)=>void};
export default function SurvivalPanel({sheet,state,outOfSync,onChange}:Props){
  const [d20,setD20]=useState(12);
  const [medicine,setMedicine]=useState(10);
  const [recoveryDie,setRecoveryDie]=useState(2);
  const [elapsed,setElapsed]=useState(2);
  const [spell,setSpell]=useState('Efecto que requiere concentración');
  const [rounds,setRounds]=useState(10);
  const [indefinite,setIndefinite]=useState(false);
  const [extra,setExtra]=useState(0);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const ready=Boolean(sheet&&state&&!outOfSync);
  const hp=state?.fighter.hitPoints.current??0;
  const death=state?.survival?.death??{successes:0,failures:0,stable:false,dead:false};
  const focus=state?.survival?.concentration??null;
  const exhaustion=state?.combat.conditions?.exhaustion??0;
  const savingBonus=(sheet?.savingThrowBonuses.constitution??0)-2*exhaustion;
  function act(action:AdventureAction){
    if(!sheet||!state||outOfSync)return;
    try{
      const result=applyAdventureAction(state,action,sheet);
      onChange(result.state);setError('');setMessage(result.description);
    }catch(e){setMessage('');setError(e instanceof Error?e.message:'Operación inválida');}
  }
  const atZero=ready&&hp===0;
  return <section className="play-panel panel" aria-label="Muerte y concentración">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.6 · ESTADO DE PARTIDA</span><h2>Muerte y concentración</h2></div><span className="save-label">Guardado manual</span></div>
    <p className="muted-note">Las salvaciones se introducen después de tirar los dados. Los cambios se guardan pulsando <strong>Actualizar guardado</strong> en «Mis personajes». El director de juego decide cuándo corresponde realizar cada tirada.</p>
    {!ready?<p className="play-warning" role="alert">Primero valida y sincroniza la hoja de personaje.</p>:<>
      <div className="play-stats">
        <div><span>Situación vital</span><strong>{death.dead?'Muerto':hp>0?'Consciente por PG':death.stable?'Estable a 0 PG':'Agonizando a 0 PG'}</strong></div>
        <div><span>Salvaciones de muerte</span><strong>{death.successes} éxitos · {death.failures} fallos</strong></div>
        <div><span>Concentración</span><strong>{focus?focus.name:'Ninguna'}</strong></div>
        <div><span>Salvaciones pendientes</span><strong>{focus?.pendingDCs.length??0}</strong></div>
      </div>
      {atZero&&<p className="play-warning" role="status">A 0 PG tienes la condición Inconsciente por la regla de puntos de golpe, aunque no figure como condición añadida manualmente. La concentración termina y no puedes iniciar descansos.</p>}
      <div className="play-actions-grid">
        <div className="play-action-group"><h3>Salvaciones contra muerte</h3>
          <p className="muted-note">Cada turno a 0 PG, si no estás estable ni muerto: 10 o más tras penalizaciones es éxito. Un 1 natural son dos fallos; un 20 natural recupera 1 PG. El agotamiento penaliza esta tirada d20.</p>
          <label className="field"><span>Resultado natural del d20</span><input type="number" min="1" max="20" step="1" value={d20} onChange={e=>setD20(Number(e.target.value))}/></label>
          <button type="button" disabled={!atZero||death.stable||death.dead} onClick={()=>act({type:'death_save',d20})}>Registrar salvación de muerte</button>
          <p className="muted-note">Tres éxitos estabilizan; tres fallos provocan la muerte. Si recibes daño a 0 PG, usa el apartado «PG y daño» e indica si fue crítico.</p>
        </div>
        <div className="play-action-group"><h3>Estabilización y recuperación</h3>
          <label className="field"><span>Total de la prueba de Medicina (CD 10)</span><input type="number" step="1" value={medicine} onChange={e=>setMedicine(Number(e.target.value))}/></label>
          <button type="button" disabled={!atZero||death.stable||death.dead} onClick={()=>act({type:'stabilize',medicineTotal:medicine})}>Intentar estabilizar</button>
          <p className="muted-note">Si ya está estable, recupera 1 PG tras 1d4 horas sin recibir daño. Anota aquí la tirada y el tiempo transcurrido.</p>
          <label className="field"><span>1d4 horas (resultado)</span><input type="number" min="1" max="4" value={recoveryDie} onChange={e=>setRecoveryDie(Number(e.target.value))}/></label>
          <label className="field"><span>Horas transcurridas</span><input type="number" min="0" max="10000" value={elapsed} onChange={e=>setElapsed(Number(e.target.value))}/></label>
          <button type="button" disabled={!atZero||!death.stable||death.dead} onClick={()=>act({type:'recover_stable',d4:recoveryDie,hoursElapsed:elapsed})}>Resolver recuperación del estable</button>
        </div>
        <div className="play-action-group"><h3>Concentración</h3>
          <label className="field"><span>Nombre del conjuro o efecto</span><input type="text" maxLength={100} value={spell} onChange={e=>setSpell(e.target.value)}/></label>
          <label className="switch-field"><span>Sin duración en rondas (retirada manual)</span><input type="checkbox" checked={indefinite} onChange={e=>setIndefinite(e.target.checked)}/></label>
          {!indefinite&&<label className="field"><span>Duración restante (rondas)</span><input type="number" min="1" max="10000" step="1" value={rounds} onChange={e=>setRounds(Number(e.target.value))}/></label>}
          <div className="play-buttons"><button type="button" disabled={!ready||hp===0||death.dead||!spell.trim()||(focus?.pendingDCs.length??0)>0} onClick={()=>act({type:'start_concentration',name:spell,rounds:indefinite?null:rounds})}>Iniciar / sustituir</button>
            <button type="button" disabled={!focus} onClick={()=>act({type:'end_concentration'})}>Terminar concentración</button></div>
          <p className="muted-note">Solo puede mantenerse una concentración. Una condición que te incapacite o caer a 0 PG la rompe. El contador se reduce al avanzar ronda en «Registro y efectos temporales».</p>
          {focus&&<p className="muted-note"><strong>Activa:</strong> {focus.name} · {focus.remainingRounds===null?'Hasta terminarla':`${focus.remainingRounds} ronda(s)`}</p>}
        </div>
        <div className="play-action-group"><h3>Mantener concentración por daño</h3>
          <p className="muted-note">Tras recibir daño durante la concentración, el motor añade una salvación de Constitución independiente por cada fuente de daño. CD 10 o mitad del daño (redondeada hacia abajo), máximo 30.</p>
          {focus?.pendingDCs.length?<>
            <p className="muted-note"><strong>Siguiente CD pendiente: {focus.pendingDCs[0]}</strong> · En cola: {focus.pendingDCs.join(', ')}</p>
            <label className="field"><span>d20 seleccionado (tras ventaja/desventaja, si procede)</span><input type="number" min="1" max="20" step="1" value={d20} onChange={e=>setD20(Number(e.target.value))}/></label>
            <label className="field"><span>Modificador situacional adicional</span><input type="number" step="1" min="-100" max="100" value={extra} onChange={e=>setExtra(Number(e.target.value))}/></label>
            <p className="muted-note">Total estimado: {d20} + ({savingBonus}) de salvación CON y agotamiento + ({extra}) situacional = <strong>{d20+savingBonus+extra}</strong>. Elige el d20 válido según el modo de tirada y añade aquí otros efectos.</p>
            <button type="button" onClick={()=>act({type:'concentration_save',d20,extraBonus:extra})}>Resolver salvación de concentración</button>
          </>:<p className="muted-note">No hay tiradas de concentración por daño pendientes.</p>}
        </div>
      </div>
    </>}
    {message&&<p className="save-success" role="status">{message}</p>}
    {error&&<p className="save-error" role="alert">{error}</p>}
    <p className="muted-note">No implementa resurrección, lanzamiento de conjuros, efectos completos de concentración ni salvaciones automáticas de un enemigo.</p>
  </section>;
}
