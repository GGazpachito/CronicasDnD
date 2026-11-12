'use client';

import { useState } from 'react';
import {ABILITIES,type Ability} from '../../../../packages/rules-engine/src/abilities';
import type { CalculatedFighterSheet } from '../../../../packages/rules-engine/src/sheet';
import { applyAdventureAction, initialAdventureState, resourceDisplay,
  type AdventureAction, type AdventureState } from '../../../../packages/rules-engine/src/adventure';

type Props={sheet:CalculatedFighterSheet|null;state:AdventureState|null;outOfSync:boolean;onChange:(state:AdventureState)=>void};

export default function PlayPanel({sheet,state,outOfSync,onChange}:Props){
  const [amount,setAmount]=useState(5);
  const [criticalDamage,setCriticalDamage]=useState(false);
  const [fortitudeBonus,setFortitudeBonus]=useState(false);
  const [d10,setD10]=useState(6);
  const [hitDieRolls,setHitDieRolls]=useState('');
  const [check,setCheck]=useState(11);
  const [dc,setDc]=useState(15);
  const [indomitableAbility,setIndomitableAbility]=useState<Ability>('constitution');
  const [indomitableD20,setIndomitableD20]=useState(11);
  const [indomitableOriginal,setIndomitableOriginal]=useState(10);
  const [indomitableDc,setIndomitableDc]=useState(15);
  const [indomitableExtra,setIndomitableExtra]=useState(0);
  const [note,setNote]=useState('');
  const [error,setError]=useState('');

  function act(action:AdventureAction){
    if(!sheet||!state)return;
    try{
      const result=applyAdventureAction(state,action,sheet);
      onChange(result.state);setError('');setNote(result.description+(action.type==='second_wind'&&sheet.level>=5?' Desplazamiento táctico: puedes moverte hasta la mitad de tu velocidad sin provocar ataques de oportunidad. Registra el movimiento con el DM.':''));
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
  const fortitude=Boolean(sheet?.features.includes('epic_boon_fortitude'));
  const fortitudeReady=fortitude&&!state?.combat.fortitudeHealUsed;
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
        <div><span>Segundo aliento</span><strong>{resources?.second_wind?.current ?? 0} / {resources?.second_wind?.maximum ?? 0}</strong></div>
        {sheet.level>=2&&<div><span>Acción súbita</span><strong>{resources?.action_surge?.current ?? 0} / {resources?.action_surge?.maximum??1}</strong></div>}
        {sheet.level>=9&&<div><span>Indomable</span><strong>{resources?.indomitable?.current??0} / {resources?.indomitable?.maximum??1}</strong></div>}
      </div>
      {state.fighter.hitPoints.current===0&&<p className="play-warning" role="alert">El personaje está a 0 PG. Gestiona sus salvaciones contra muerte y estabilización en el panel siguiente. No puede descansar ni utilizar acciones de clase.</p>}
      <div className="play-actions-grid">
        <div className="play-action-group"><h3>PG y daño</h3>
          <label className="field"><span>Cantidad (entero positivo)</span><input type="number" min="1" max="100000" step="1" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label>
          <label className="switch-field"><span>Daño por impacto crítico (dos fallos si ya está a 0 PG)</span><input type="checkbox" checked={criticalDamage} onChange={e=>setCriticalDamage(e.target.checked)}/></label>
          {fortitude&&<label className="switch-field"><span>Añadir modificador de CON por Fortaleza épica (una vez hasta mi próximo turno)</span><input type="checkbox" checked={fortitudeReady&&fortitudeBonus} disabled={!fortitudeReady} onChange={e=>setFortitudeBonus(e.target.checked)}/></label>}
          <div className="play-buttons"><button type="button" disabled={!ready} onClick={()=>act({type:'damage',amount,critical:criticalDamage})}>Aplicar daño</button><button type="button" disabled={!ready} onClick={()=>act({type:'heal',amount,fortitudeBonus:fortitudeReady&&fortitudeBonus})}>Curar PG</button><button type="button" disabled={!ready} onClick={()=>act({type:'temporary_hp',amount})}>Recibir PG temporales</button></div>
        </div>
        <div className="play-action-group"><h3>Rasgos del Guerrero</h3>
          <label className="field"><span>Resultado del d10</span><input type="number" min="1" max="10" step="1" value={d10} onChange={e=>setD10(Number(e.target.value))}/></label>
          {sheet.level>=5&&<p className="muted-note">Desplazamiento táctico: al usar Segundo aliento como acción adicional, puedes moverte hasta la mitad de tu velocidad sin provocar ataques de oportunidad. El movimiento se resuelve manualmente con el DM.</p>}
          <div className="play-buttons"><button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.second_wind?.current??0)===0} onClick={()=>act({type:'second_wind',d10,fortitudeBonus:fortitudeReady&&fortitudeBonus})}>Segundo aliento</button>
          {sheet.level>=2&&<button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.action_surge?.current??0)===0} onClick={()=>act({type:'action_surge'})}>Gastar Acción súbita</button>}</div>
          {sheet.level>=2&&<div className="play-mind"><p className="muted-note">Mente táctica (solo tras fallar una prueba). Utiliza el d10 anterior.</p>
            <div className="play-check-row"><label className="field"><span>Resultado previo</span><input type="number" value={check} onChange={e=>setCheck(Number(e.target.value))}/></label><label className="field"><span>CD</span><input type="number" value={dc} onChange={e=>setDc(Number(e.target.value))}/></label></div>
            <button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.second_wind?.current??0)===0} onClick={()=>act({type:'tactical_mind',originalTotal:check,difficultyClass:dc,d10})}>Aplicar Mente táctica</button></div>}
        </div>
        {sheet.level>=9&&<div className="play-action-group"><h3>Indomable · nivel 9</h3>
          <p className="muted-note">Tras fallar una salvación ordinaria, repítela y suma tu nivel de Guerrero (+{sheet.level}). Es obligatorio usar el nuevo resultado. Desde nivel 13, dos usos por descanso largo. Para las salvaciones de muerte utiliza su panel específico.</p>
          <label className="field"><span>Característica de la salvación</span><select value={indomitableAbility} onChange={e=>setIndomitableAbility(e.target.value as Ability)}>{ABILITIES.map(a=><option key={a} value={a}>{({strength:'Fuerza',dexterity:'Destreza',constitution:'Constitución',intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma'} as Record<Ability,string>)[a]} (bono {sheet.savingThrowBonuses[a]>=0?'+':''}{sheet.savingThrowBonuses[a]})</option>)}</select></label>
          <div className="play-check-row"><label className="field"><span>Resultado total de la salvación fallida</span><input type="number" value={indomitableOriginal} onChange={e=>setIndomitableOriginal(Number(e.target.value))}/></label><label className="field"><span>CD</span><input type="number" min="1" value={indomitableDc} onChange={e=>setIndomitableDc(Number(e.target.value))}/></label></div>
          <div className="play-check-row"><label className="field"><span>Nuevo d20</span><input type="number" min="1" max="20" value={indomitableD20} onChange={e=>setIndomitableD20(Number(e.target.value))}/></label><label className="field"><span>Modificador situacional adicional (si procede)</span><input type="number" value={indomitableExtra} onChange={e=>setIndomitableExtra(Number(e.target.value))}/></label></div>
          <button type="button" disabled={!ready||state.fighter.hitPoints.current===0||(resources?.indomitable?.current??0)===0} onClick={()=>act({type:'indomitable',originalTotal:indomitableOriginal,difficultyClass:indomitableDc,ability:indomitableAbility,d20:indomitableD20,extraBonus:indomitableExtra})}>Repetir salvación con Indomable</button>
        </div>}
        <div className="play-action-group play-rest-group"><h3>Descansos</h3>
          <label className="field"><span>Resultados de dados de golpe d10 (ej.: 6, 3); vacío = no gastar dados</span><input type="text" value={hitDieRolls} placeholder="6, 3" onChange={e=>setHitDieRolls(e.target.value)}/></label>
          <p className="muted-note">Descanso corto: recupera un uso de Segundo aliento, todos los usos de Acción súbita y PG de los dados gastados. No se pueden gastar más de {available} dados.</p>
          <div className="play-buttons"><button type="button" disabled={!ready||state.fighter.hitPoints.current===0} onClick={()=>act({type:'short_rest',hitDieRolls:dice(),fortitudeBonus:fortitudeReady&&fortitudeBonus&&dice().length>0})}>Terminar descanso corto</button><button type="button" disabled={!ready||state.fighter.hitPoints.current===0} onClick={()=>{if(window.confirm('¿Terminar un descanso largo válido según las reglas?'))act({type:'long_rest'});}}>Terminar descanso largo</button></div>
          <p className="muted-note">Descanso largo: restaura PG, dados de golpe y recursos; los PG temporales desaparecen. Los tiempos e interrupciones los confirma el DM.</p>
        </div>
      </div>
    </>}
    {note&&<p className="save-success" role="status">{note}</p>}
    {error&&<p className="save-error" role="alert">{error}</p>}
    <p className="muted-note">Las salvaciones contra muerte y la concentración se gestionan en el panel siguiente. No se simulan enemigos ni lanzamiento completo de conjuros. Los dados se introducen manualmente.</p>
  </section>;
}
