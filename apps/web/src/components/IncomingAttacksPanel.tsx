'use client';

import {useState} from 'react';
import type {CalculatedFighterSheet} from '../../../../packages/rules-engine/src/sheet';
import type {AdventureState} from '../../../../packages/rules-engine/src/adventure';
import {INCOMING_DAMAGE_TYPES,previewIncomingAttack,receiveIncomingAttack,
  type IncomingAttackInput,type IncomingDamageType,type DamageMitigation} from '../../../../packages/rules-engine/src/incoming';

const DAMAGE_NAMES:Record<IncomingDamageType,string>={
  acid:'Ácido',bludgeoning:'Contundente',cold:'Frío',fire:'Fuego',force:'Fuerza',lightning:'Relámpago',
  necrotic:'Necrótico',piercing:'Perforante',poison:'Veneno',psychic:'Psíquico',radiant:'Radiante',
  slashing:'Cortante',thunder:'Trueno'
};
const MITIGATION:Readonly<{id:DamageMitigation;label:string}[]>=[
  {id:'normal',label:'Sin mitigación'},
  {id:'resistance',label:'Resistencia'},
  {id:'vulnerability',label:'Vulnerabilidad'},
  {id:'both',label:'Resistencia y vulnerabilidad'},
  {id:'immunity',label:'Inmunidad'}
];

type Props={sheet:CalculatedFighterSheet|null;state:AdventureState|null;outOfSync:boolean;onChange:(s:AdventureState)=>void};
export default function IncomingAttacksPanel({sheet,state,outOfSync,onChange}:Props){
  const [attacker,setAttacker]=useState('Goblin');
  const [bonus,setBonus]=useState(4);
  const [first,setFirst]=useState(12);
  const [second,setSecond]=useState(15);
  const [distance,setDistance]=useState(5);
  const [seesInvisible,setSeesInvisible]=useState(false);
  const [advantage,setAdvantage]=useState(false);
  const [disadvantage,setDisadvantage]=useState(false);
  const [acBonus,setAcBonus]=useState(0);
  const [damage,setDamage]=useState(6);
  const [damageAdjustment,setDamageAdjustment]=useState(0);
  const [type,setType]=useState<IncomingDamageType>('slashing');
  const [mitigation,setMitigation]=useState<DamageMitigation>('normal');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const ready=Boolean(sheet&&state&&!outOfSync);
  const args:IncomingAttackInput={attacker,attackBonus:bonus,firstD20:first,secondD20:second,
    attackerDistanceFeet:distance,attackerCanSeeInvisible:seesInvisible,situationalAdvantage:advantage,
    situationalDisadvantage:disadvantage,armorClassAdjustment:acBonus,damageType:type,rolledDamage:damage,
    damageAdjustment,mitigation};
  // El segundo d20 solo se envía si la primera evaluación indica ventaja o desventaja.
  // La llamada de vista previa no modifica el personaje.
  let preview:ReturnType<typeof previewIncomingAttack>|null=null;
  let previewError='';
  if(sheet&&state&&!outOfSync){
    try{
      const probe=previewIncomingAttack(state,sheet,{...args,secondD20:undefined});
      preview=probe;
    }catch(e){
      // Una segunda tirada es obligatoria con ventaja/desventaja.
      if(e instanceof Error&&e.message.includes('dos d20')){
        try{preview=previewIncomingAttack(state,sheet,args);}catch(next){previewError=next instanceof Error?next.message:'Ataque inválido';}
      }else previewError=e instanceof Error?e.message:'Ataque inválido';
    }
  }
  function confirm(){
    if(!sheet||!state||outOfSync||!preview)return;
    const input={...args,...(preview.mode==='normal'?{secondD20:undefined}:{secondD20:second})};
    try{
      const result=receiveIncomingAttack(state,sheet,input);
      onChange(result.state);setMessage(result.description);setError('');
    }catch(e){setMessage('');setError(e instanceof Error?e.message:'Ataque recibido inválido');}
  }
  const entries=state?.combat.receivedAttacks??[];
  return <section className="play-panel panel" aria-label="Ataques recibidos">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.7 · COMBATE</span><h2>Ataques recibidos</h2></div><span className="save-label">Guardado manual</span></div>
    <p className="muted-note">Introduce las tiradas reales del enemigo. La vista previa no cambia nada. <strong>Confirmar impacto o fallo</strong> registra el ataque y aplica el daño efectivo a PG, concentración y salvaciones de muerte.</p>
    {!ready?<p className="play-warning" role="alert">Sincroniza la hoja antes de registrar ataques recibidos.</p>:<>
      <div className="play-actions-grid">
        <div className="play-action-group"><h3>Resultado del ataque</h3>
          <label className="field"><span>Atacante</span><input maxLength={80} value={attacker} onChange={e=>setAttacker(e.target.value)}/></label>
          <label className="field"><span>Bonificador de ataque del enemigo</span><input type="number" min={-100} max={100} value={bonus} onChange={e=>setBonus(Number(e.target.value))}/></label>
          <label className="field"><span>Primer d20 natural</span><input type="number" min={1} max={20} value={first} onChange={e=>setFirst(Number(e.target.value))}/></label>
          <label className="field"><span>Segundo d20 (si hay ventaja/desventaja)</span><input type="number" min={1} max={20} value={second} onChange={e=>setSecond(Number(e.target.value))}/></label>
          <label className="field"><span>Distancia del atacante (pies)</span><input type="number" min={0} max={10000} value={distance} onChange={e=>setDistance(Number(e.target.value))}/></label>
          <label className="switch-field"><span>El enemigo puede ver a mi personaje Invisible</span><input type="checkbox" checked={seesInvisible} onChange={e=>setSeesInvisible(e.target.checked)}/></label>
          <label className="switch-field"><span>Ventaja situacional del atacante</span><input type="checkbox" checked={advantage} onChange={e=>setAdvantage(e.target.checked)}/></label>
          <label className="switch-field"><span>Desventaja situacional del atacante</span><input type="checkbox" checked={disadvantage} onChange={e=>setDisadvantage(e.target.checked)}/></label>
          <label className="field"><span>Ajuste circunstancial a mi CA (solo este ataque)</span><input type="number" min={-20} max={20} value={acBonus} onChange={e=>setAcBonus(Number(e.target.value))}/></label>
        </div>
        <div className="play-action-group"><h3>Daño y defensas</h3>
          <label className="field"><span>Tipo de daño</span><select value={type} onChange={e=>setType(e.target.value as IncomingDamageType)}>{INCOMING_DAMAGE_TYPES.map(t=><option value={t} key={t}>{DAMAGE_NAMES[t]}</option>)}</select></label>
          <label className="field"><span>Daño obtenido en los dados (incluye los dados de crítico)</span><input type="number" min={0} max={50000} value={damage} onChange={e=>setDamage(Number(e.target.value))}/></label>
          <label className="field"><span>Otros ajustes planos al daño, antes de mitigación</span><input type="number" min={-1000} max={1000} value={damageAdjustment} onChange={e=>setDamageAdjustment(Number(e.target.value))}/></label>
          <label className="field"><span>Defensa frente a este tipo de daño</span><select value={mitigation} onChange={e=>setMitigation(e.target.value as DamageMitigation)}>{MITIGATION.map(m=><option value={m.id} key={m.id}>{m.label}</option>)}</select></label>
          <p className="muted-note">La resistencia, vulnerabilidad e inmunidad se seleccionan manualmente. Se aplican a un tipo de daño por operación. La aplicación no deduce aún todas las defensas de dotes u objetos.</p>
          {preview&&<div className="play-stats" aria-live="polite">
            <div><span>Modo de d20</span><strong>{preview.mode==='advantage'?'Ventaja':preview.mode==='disadvantage'?'Desventaja':'Normal'}</strong></div>
            <div><span>Tirada frente a CA</span><strong>{preview.attackTotal} / {preview.targetArmorClass}</strong></div>
            <div><span>Resultado</span><strong>{preview.hit?'Impacta':'Falla'}{preview.critical?' · Crítico':''}</strong></div>
            <div><span>Daño tras defensas</span><strong>{preview.finalDamage}</strong></div>
          </div>}
          {preview?.notes.map((note,i)=><p key={i} className="muted-note">{note}</p>)}
          {previewError&&<p className="save-error" role="alert">{previewError}</p>}
          <button type="button" disabled={!preview} onClick={confirm}>Confirmar impacto o fallo</button>
        </div>
      </div>
      <h3>Historial de ataques recibidos ({entries.length})</h3>
      <div className="combat-list">{entries.length===0&&<p className="muted-note">Todavía no hay ataques recibidos registrados.</p>}
        {[...entries].reverse().slice(0,12).map(event=><div className="combat-row" key={event.id}><div>
          <strong>R{event.round} · {event.attacker} · {event.attackTotal} contra CA {event.armorClass}</strong>
          <small>{event.hit?(event.critical?'Crítico':'Impacto'):'Fallo'} · {event.effectiveDamage} de daño {DAMAGE_NAMES[event.damageType]} efectivo</small>
          <small>{event.mitigation==='normal'?'Sin mitigación':`Defensa: ${event.mitigation}`}</small>
        </div></div>)}
      </div>
    </>}
    {message&&<p role="status" className="save-success">{message} Pulsa «Actualizar guardado» en Mis personajes.</p>}
    {error&&<p role="alert" className="save-error">{error}</p>}
    <p className="muted-note">Al recibir daño, comprueba las salvaciones de concentración pendientes en «Muerte y concentración». El historial se conserva al actualizar el guardado de PostgreSQL.</p>
  </section>;
}
