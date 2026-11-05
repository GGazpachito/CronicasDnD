'use client';

import { useState } from 'react';
import type { CalculatedFighterSheet } from '../../../../packages/rules-engine/src/sheet';
import { applyAdventureAction, initialAdventureState, resourceDisplay,
  type AdventureAction, type AdventureState } from '../../../../packages/rules-engine/src/adventure';

type Props={sheet:CalculatedFighterSheet|null;state:AdventureState|null;outOfSync:boolean;onChange:(state:AdventureState)=>void};

export default function PlayPanel({sheet,state,outOfSync,onChange}:Props){
  const [amount,setAmount]=useState(5);
  const [d10,setD10]=useState(6);
  const [hitDieRolls,setHitDieRolls]=useState('');
  const [check,setCheck]=useState(11);
  const [dc,setDc]=useState(15);
  const [note,setNote]=useState('');
  const [error,setError]=useState('');

  function act(action:AdventureAction){
    if(!sheet||!state)return;
    try{
      const result=applyAdventureAction(state,action,sheet);
      onChange(result.state);setError('');setNote(result.description);
      if(action.type==='short_rest')setHitDieRolls('');
    }catch(e){setError(e instanceof Error?e.message:'Operación no válida');}
  }
  function dice():number[]{
    if(!hitDieRolls.trim())return [];
    return hitDieRolls.split(/[\s,;]+/).map(Number);
  }
  function reset(){
    if(!sheet)return;
    if(!window.confirm('¿Reiniciar la partida? Se perderán los PG actuales, dados y usos gastados que no hayas guardado.'))return;
    onChange(initialAdventureState(sheet));setError('');setNote('Se ha iniciado un estado de partida nuevo con PG y recursos completos.');
  }
  const ready=Boolean(sheet&&state&&!outOfSync);
  const resources=sheet&&state&&!outOfSync?resourceDisplay(state,sheet):null;
  const available=sheet&&state?sheet.level-state.spentHitDice:0;
  return <section className="play-panel panel" aria-label="Hoja de juego durante una partida">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.2 · ESTADO DE PARTIDA</span><h2>Jugar con tu personaje</h2></div><span className="save-label">Guardado manual</span></div>
    <p className="muted-note">Daño, curación, PG temporales, dados de golpe y recursos se registran aquí. Después pulsa <strong>Actualizar guardado</strong> en «Mis personajes» para conservarlos en PostgreSQL.</p>
    {!sheet&&<p className="save-error" role="alert">Corrige primero los errores del creador.</p>}
    {sheet&&outOfSync&&<div className="play-warning" role="alert"><strong>El estado de partida no coincide con la nueva hoja.</strong><p>Has cambiado el nivel o los PG máximos. No se modificarán tus PG gastados automáticamente. Puedes deshacer la edición o iniciar un nuevo estado de partida.</p><button type="button" onClick={reset}>Reiniciar estado para esta hoja</button></div>}
    {sheet&&state&&ready&&<>
      <div className="play-stats">
        <div><span>PG actuales / máximos</span><strong>{state.fighter.hitPoints.current} / {sheet.maximumHitPoints}</strong></div>
        <div><span>PG temporales</span><strong>{state.temporaryHitPoints}</strong></div>
        <div><span>Dados de golpe disponibles</span><strong>{available} / {sheet.hitDice.total} d10</strong></div>
        <div><span>Segundo aliento</span><strong>{resources?.second_wind?.current ?? 0} / 2</strong></div>
        {sheet.level>=2&&<div><span>Acción súbita</span><strong>{resources?.action_surge?.current ?? 0} / 1</strong></div>}
      </div>
      {state.fighter.hitPoints.current===0&&<p className="play-warning" role="alert">El personaje está a 0 PG. Las salvaciones de muerte, la muerte instantánea y la estabilización aún no están automatizadas. Regístralas con el director de juego. No se puede descansar ni usar rasgos de acción a 0 PG.</p>}
      <div className="play-actions-grid">
        <div className="play-action-group"><h3>PG y daño</h3>
          <label className="field"><span>Cantidad (entero positivo)</span><input type="number" min="1" max="100000" step="1" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label>
          <div className="play-buttons"><button type="button" disabled={!ready} onClick={()=>act({type:'damage',amount})}>Aplicar daño</button><button type="button" disabled={!ready} onClick={()=>act({type:'heal',amount})}>Curar PG</button><button type="button" disabled={!ready} onClick={()=>act({type:'temporary_hp',amount})}>Recibir PG temporales</button></div>
        </div>
        <div className="play-action-group"><h3>Rasgos del Guerrero</h3>
          <label className="field"><span>Resultado del d10</span><input type="number" min="1" max="10" step="1" value={d10} onChange={e=>setD10(Number(e.target.value))}/></label>
          <div className="play-buttons"><button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.second_wind?.current??0)===0} onClick={()=>act({type:'second_wind',d10})}>Segundo aliento</button>
          {sheet.level>=2&&<button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.action_surge?.current??0)===0} onClick={()=>act({type:'action_surge'})}>Gastar Acción súbita</button>}</div>
          {sheet.level>=2&&<div className="play-mind"><p className="muted-note">Mente táctica (solo tras fallar una prueba). Utiliza el d10 anterior.</p>
            <div className="play-check-row"><label className="field"><span>Resultado previo</span><input type="number" value={check} onChange={e=>setCheck(Number(e.target.value))}/></label><label className="field"><span>CD</span><input type="number" value={dc} onChange={e=>setDc(Number(e.target.value))}/></label></div>
            <button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.second_wind?.current??0)===0} onClick={()=>act({type:'tactical_mind',originalTotal:check,difficultyClass:dc,d10})}>Aplicar Mente táctica</button></div>}
        </div>
        <div className="play-action-group play-rest-group"><h3>Descansos</h3>
          <label className="field"><span>Resultados de dados de golpe d10 (ej.: 6, 3); vacío = no gastar dados</span><input type="text" value={hitDieRolls} placeholder="6, 3" onChange={e=>setHitDieRolls(e.target.value)}/></label>
          <p className="muted-note">Descanso corto: recupera un uso de Segundo aliento, Acción súbita y PG de los dados gastados. No se pueden gastar más de {available} dados.</p>
          <div className="play-buttons"><button type="button" disabled={!ready||state.fighter.hitPoints.current===0} onClick={()=>act({type:'short_rest',hitDieRolls:dice()})}>Terminar descanso corto</button><button type="button" disabled={!ready||state.fighter.hitPoints.current===0} onClick={()=>{if(window.confirm('¿Terminar un descanso largo válido según las reglas?'))act({type:'long_rest'});}}>Terminar descanso largo</button></div>
          <p className="muted-note">Descanso largo: restaura PG, dados de golpe y recursos; los PG temporales desaparecen. Los tiempos e interrupciones los confirma el DM.</p>
        </div>
      </div>
    </>}
    {note&&<p className="save-success" role="status">{note}</p>}
    {error&&<p className="save-error" role="alert">{error}</p>}
    <p className="muted-note">Esta fase no gestiona las salvaciones de muerte, reglas de turnos, efectos de conjuros, concentración ni condiciones prolongadas. Los dados se introducen manualmente.</p>
  </section>;
}
