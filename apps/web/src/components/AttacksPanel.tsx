'use client';

import {useRef,useState} from 'react';
import type {CalculatedFighterSheet} from '../../../../packages/rules-engine/src/sheet';
import type {InventoryState} from '../../../../packages/rules-engine/src/inventory';
import type {CombatState} from '../../../../packages/rules-engine/src/combat';
import {conditionKinds,evaluateConditionRoll,initialConditionLedger} from '../../../../packages/rules-engine/src/conditions';
import type {MartialChoices,WeaponId} from '../../../../packages/rules-engine/src/martial';
import {WEAPONS} from '../../../../packages/rules-engine/src/martial';
import {calculateWeaponAttack,ownedWeapons,resolveWeaponAttack,WEAPON_STATS,type AttackResolution,type WeaponAttackProfile} from '../../../../packages/rules-engine/src/attacks';

type Props={sheet:CalculatedFighterSheet|null;inventory:InventoryState|null;martial:MartialChoices|null;combat:CombatState|null;onRecord:(profile:WeaponAttackProfile,resolution:AttackResolution)=>void;canRecord:boolean};
const signed=(n:number)=>n>=0?`+${n}`:`${n}`;
const DAMAGE_LABELS={bludgeoning:'contundente',piercing:'perforante',slashing:'cortante'};
export default function AttacksPanel({sheet,inventory,martial,combat,onRecord,canRecord}:Props){
  const [wanted,setWanted]=useState<WeaponId|null>(null);
  const [useDex,setUseDex]=useState(false);
  const [thrown,setThrown]=useState(false);
  const [twoHands,setTwoHands]=useState(false);
  const [otherWeapon,setOtherWeapon]=useState(false);
  const [lightExtra,setLightExtra]=useState(false);
  const [adjacent,setAdjacent]=useState(false);
  const [advantage,setAdvantage]=useState(false);
  const [fearVisible,setFearVisible]=useState(true);
  const [targetGrappler,setTargetGrappler]=useState(false);
  const [targetCharmer,setTargetCharmer]=useState(false);
  const [otherCanSeeInvisible,setOtherCanSeeInvisible]=useState(true);
  const [distance,setDistance]=useState('');
  const [ac,setAc]=useState('');
  const [d20,setD20]=useState(12);
  const [otherD20,setOtherD20]=useState(14);
  const [dice,setDice]=useState('');
  const [computed,setComputed]=useState<{key:string;value:AttackResolution}|null>(null);
  const confirmedRef=useRef(false);
  const [confirmation,setConfirmation]=useState('');
  const [error,setError]=useState('');
  const ledger=combat?.conditions??initialConditionLedger();
  const kinds=conditionKinds(ledger);
  const conditionRoll=evaluateConditionRoll(ledger,{kind:'attack',fearSourceVisible:fearVisible,
    targetIsGrappler:targetGrappler,targetIsCharmer:targetCharmer,
    otherCreatureCanSeeInvisible:otherCanSeeInvisible});
  const blockedByConditions=conditionRoll.actionForbidden;
  const owned=inventory?ownedWeapons(inventory):[];
  const id=wanted&&owned.includes(wanted)?wanted:owned[0];
  const w=id?WEAPON_STATS[id]:null;
  let profile:ReturnType<typeof calculateWeaponAttack>|null=null;
  let profileError='';
  if(sheet&&martial&&id){
    try{profile=calculateWeaponAttack(sheet,id,martial.fightingStyle,martial.weaponMasteries,{
      ...(w?.finesse?{ability:useDex?'dexterity':'strength'}:{}),
      thrown:thrown&&Boolean(w?.thrownRange),twoHanded:twoHands&&Boolean(w?.versatileSides),
      lightExtraAttack:lightExtra&&Boolean(w?.light),otherWeaponHeld:otherWeapon,adjacentEnemy:adjacent,advantage,
      conditionAdvantage:conditionRoll.advantages.length>0,
      conditionDisadvantage:conditionRoll.disadvantages.length>0,
      conditionD20Penalty:conditionRoll.d20Penalty,
      ...(distance.trim()?{targetDistanceFeet:Number(distance)}:{}),
    });}catch(e){profileError=e instanceof Error?e.message:'Ataque inválido';}
  }
  const rollKey=JSON.stringify({profile,d20,otherD20,ac,dice});
  const resolved=computed?.key===rollKey?computed.value:null;
  const setResolved=(value:AttackResolution|null)=>{setComputed(value?{key:rollKey,value}:null);if(!value){confirmedRef.current=false;setConfirmation('');}};
  const incompatibleShield=Boolean(inventory?.equipped.shield&&profile?.twoHanded);
  const ammoCount=profile?.ammunition?inventory?.items.find(i=>i.id===profile!.ammunition)?.quantity??0:null;
  function onChangeWeapon(next:WeaponId){setWanted(next);setUseDex(false);setThrown(false);setTwoHands(false);setOtherWeapon(false);setLightExtra(false);setResolved(null);setError('');setDice('');}
  function calculate(){
    if(!profile||incompatibleShield||blockedByConditions)return;
    try{
      const raw=dice.trim()?dice.split(/[\s,;]+/).map(x=>Number(x)):undefined;
      const result=resolveWeaponAttack(profile,{
        firstD20:d20,
        ...(profile.mode!=='normal'?{secondD20:otherD20}:{}),
        ...(ac.trim()?{targetAC:Number(ac)}:{}),
        ...(raw?{damageRolls:raw}:{}),
      });
      confirmedRef.current=false;setResolved(result);setError('');setConfirmation('');
    }catch(e){setResolved(null);setError(e instanceof Error?e.message:'Error en la tirada');}
  }
  function confirm(){
    if(!profile||!resolved||!canRecord||blockedByConditions||confirmedRef.current)return;
    try{onRecord(profile,resolved);confirmedRef.current=true;setComputed(null);setError('');setConfirmation('Ataque anotado y munición descontada cuando corresponde. Guarda el personaje para conservarlo.');}
    catch(e){setError(e instanceof Error?e.message:'No se pudo registrar el ataque');}
  }
  return <section className="attack-panel panel" aria-label="Ataques con armas">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.4 · COMBATE</span><h2>Ataques con armas</h2></div><span className="save-label">Cálculo local</span></div>
    <p className="muted-note">Solo aparecen armas que posees. «Calcular tirada» no altera el personaje; «Confirmar ataque» registra el resultado y consume una unidad de munición si corresponde.</p>
    {!sheet&&<p className="save-error" role="alert">Completa primero la creación del personaje.</p>}
    {sheet&&!martial&&<p className="save-error" role="alert">Selecciona un estilo de combate y tres maestrías en el apartado Equipo.</p>}
    {sheet&&martial&&owned.length===0&&<p className="muted-note">No tienes armas. Adquiere o añade alguna desde el inventario para mostrar ataques.</p>}
    {sheet&&martial&&id&&<>
      <div className="attack-form-grid">
        <label className="field"><span>Arma disponible</span><select value={id} onChange={e=>onChangeWeapon(e.target.value as WeaponId)}>{owned.map(k=><option key={k} value={k}>{WEAPONS[k].name}</option>)}</select></label>
        <label className="field"><span>Distancia objetivo (pies, opcional)</span><input type="number" min="0" step="1" value={distance} placeholder="Sin distancia" onChange={e=>{setDistance(e.target.value);setResolved(null);}}/></label>
      </div>
      <div className="attack-options">
        {w?.finesse&&<label><input type="checkbox" checked={useDex} onChange={e=>{setUseDex(e.target.checked);setResolved(null)}}/> Usar Destreza (Sutileza)</label>}
        {Boolean(w?.thrownRange&&(w.kind==='melee'||w.rangedRange))&&<label><input type="checkbox" checked={thrown} onChange={e=>{setThrown(e.target.checked);setResolved(null);}}/> Arrojar el arma</label>}
        {Boolean(w?.versatileSides)&&<label><input type="checkbox" checked={twoHands} disabled={thrown} onChange={e=>{setTwoHands(e.target.checked);setResolved(null);}}/> Usar con dos manos (Versátil)</label>}
        <label><input type="checkbox" checked={otherWeapon} onChange={e=>{setOtherWeapon(e.target.checked);setResolved(null);}}/> Otra arma en la otra mano</label>
        {w?.light&&<label><input type="checkbox" checked={lightExtra} onChange={e=>{setLightExtra(e.target.checked);setResolved(null);}}/> Es el ataque extra de Ligera</label>}
        <label><input type="checkbox" checked={advantage} onChange={e=>{setAdvantage(e.target.checked);setResolved(null);}}/> Ventaja situacional</label>
        <label><input type="checkbox" checked={adjacent} onChange={e=>{setAdjacent(e.target.checked);setResolved(null);}}/> Enemigo activo a 5 pies al atacar a distancia</label>
      </div>
      {kinds.size>0||ledger.exhaustion>0?<div className="condition-attack-summary">
        <strong>Condiciones aplicadas al ataque</strong>
        <p className="muted-note">{[...kinds].map(k=>k).join(', ')||'Sin condiciones binarias'}{ledger.exhaustion>0?` · Agotamiento ${ledger.exhaustion} (${conditionRoll.d20Penalty} al d20)`:''}</p>
        {kinds.has('frightened')&&<label><input type="checkbox" checked={fearVisible} onChange={e=>setFearVisible(e.target.checked)}/> La fuente del miedo está a la vista</label>}
        {kinds.has('grappled')&&<label><input type="checkbox" checked={targetGrappler} onChange={e=>setTargetGrappler(e.target.checked)}/> Ataco a la criatura que me agarra</label>}
        {kinds.has('charmed')&&<label><input type="checkbox" checked={targetCharmer} onChange={e=>setTargetCharmer(e.target.checked)}/> Mi objetivo es quien me hechizó</label>}
        {kinds.has('invisible')&&<label><input type="checkbox" checked={otherCanSeeInvisible} onChange={e=>setOtherCanSeeInvisible(e.target.checked)}/> El objetivo puede ver a mi personaje invisible</label>}
        {conditionRoll.notes.map((n,i)=><p key={i} className="muted-note">{n}</p>)}
        {blockedByConditions&&<p className="play-warning" role="alert">No puedes realizar este ataque bajo las condiciones actuales.</p>}
      </div>:null}
      {profileError&&<p className="save-error" role="alert">{profileError}</p>}
      {incompatibleShield&&<p className="play-warning" role="alert">No puedes utilizar dos manos con un escudo equipado. Desequipa el escudo en el inventario.</p>}
      {profile&&<>
        <div className="attack-summary">
          <div><span>Ataque</span><strong>{signed(profile.attackBonus)}</strong></div>
          <div><span>Daño</span><strong>{profile.damageDice?`${profile.damageDice.count}d${profile.damageDice.sides}`:String(profile.fixedDamage)} {signed(profile.damageModifier)}</strong></div>
          <div><span>Tipo</span><strong>{DAMAGE_LABELS[profile.damageType]}</strong></div>
          <div><span>Tirada</span><strong>{profile.mode==='normal'?'Normal':profile.mode==='advantage'?'Ventaja':'Desventaja'}</strong></div>
          <div><span>Crítico natural</span><strong>{profile.criticalMinimum}–20</strong></div>
          <div><span>Maestría</span><strong>{profile.mastery??'No elegida'}</strong></div>
        </div>
        {profile.masterySaveDC!==null&&<p className="info-line">Derribar (Topple): CD {profile.masterySaveDC} de salvación de Constitución del objetivo.</p>}
        {profile.ammunition&&<p className={ammoCount===0?'save-error':'muted-note'}>{`Munición de tipo «${profile.ammunition}» en inventario: ${ammoCount??0}. Se gastará una unidad al confirmar.`}{ammoCount===0?' No puedes disparar sin la munición correspondiente.':''}</p>}
        <div className="divider"/>
        <h3>Resolver tirada manual</h3>
        <div className="attack-form-grid">
          <label className="field"><span>Primer d20</span><input type="number" min="1" max="20" step="1" value={d20} onChange={e=>{setD20(Number(e.target.value));setResolved(null);}}/></label>
          {profile.mode!=='normal'&&<label className="field"><span>Segundo d20</span><input type="number" min="1" max="20" step="1" value={otherD20} onChange={e=>{setOtherD20(Number(e.target.value));setResolved(null);}}/></label>}
          <label className="field"><span>CA del objetivo (opcional)</span><input type="number" min="0" max="100" step="1" value={ac} placeholder="Sin CA" onChange={e=>{setAc(e.target.value);setResolved(null);}}/></label>
          <label className="field"><span>Dados de daño (ejemplo: 4, 5)</span><input type="text" value={dice} placeholder={profile.damageDice?`${profile.damageDice.count} dados; el crítico duplica la cantidad`:'Arma con daño fijo'} onChange={e=>{setDice(e.target.value);setResolved(null);}}/></label>
        </div>
        <button type="button" className="attack-resolve" disabled={incompatibleShield||blockedByConditions||Boolean(profile.ammunition&&ammoCount===0)} onClick={calculate}>Calcular tirada</button>
        {error&&<p className="save-error" role="alert">{error}</p>}
        {resolved&&<div className="attack-result" role="status"><strong>Resultado: {resolved.attackTotal} {resolved.critical?'· ¡Crítico!':''}</strong><span>{resolved.hit===null?'Impacto no determinado (sin CA)':resolved.hit?'Impacta':'Falla'} · Dados de daño requeridos: {resolved.damageDiceNeeded}</span><span>{resolved.damageTotal!==null?`Daño: ${resolved.damageTotal} (${DAMAGE_LABELS[profile.damageType]})`:'Introduce los dados de daño para obtener el total.'}</span>{resolved.grazeDamage!==null&&<span>Rozar: posible daño por fallo {resolved.grazeDamage}.</span>}</div>}
        {resolved&&<button type="button" className="attack-confirm" disabled={!canRecord||incompatibleShield||blockedByConditions||Boolean(profile.ammunition&&ammoCount===0)} onClick={confirm}>Confirmar ataque y registrar</button>}
        {confirmation&&<p role="status" className="save-success">{confirmation}</p>}
        <ul className="attack-notes">{profile.notes.map((n,i)=><li key={`${id}-${i}`}>{n}</li>)}</ul>
      </>}
    </>}
    <p className="muted-note">La confirmación registra el ataque y descuenta proyectiles disponibles; no aplica daño a enemigos ni simula turnos. Armas arrojadizas, efectos de maestría, salvaciones y munición recuperada se resuelven manualmente con el director.</p>
  </section>;
}
