'use client';

import {useRef,useState} from 'react';
import type {CalculatedFighterSheet} from '../../../../packages/rules-engine/src/sheet';
import {hasEquippedShield,type InventoryState} from '../../../../packages/rules-engine/src/inventory';
import {hasStudiedAdvantage,type CombatState} from '../../../../packages/rules-engine/src/combat';
import {suggestAttackTurnUsage,type AttackTurnUsage} from '../../../../packages/rules-engine/src/turns';
import {conditionKinds,evaluateConditionRoll,initialConditionLedger} from '../../../../packages/rules-engine/src/conditions';
import {WEAPONS,type MartialChoices} from '../../../../packages/rules-engine/src/martial';
import {calculateOwnedWeaponAttack,ownedWeaponChoices,resolveWeaponAttack,WEAPON_STATS,type AttackResolution,type WeaponAttackProfile} from '../../../../packages/rules-engine/src/attacks';
import {evaluateWeaponMastery,hasVexAdvantage,type CreatureSize,type MasteryContext} from '../../../../packages/rules-engine/src/mastery-effects';

type Props={sheet:CalculatedFighterSheet|null;inventory:InventoryState|null;martial:MartialChoices|null;combat:CombatState|null;onRecord:(profile:WeaponAttackProfile,resolution:AttackResolution,context:MasteryContext,usage:AttackTurnUsage)=>void;canRecord:boolean};
const signed=(n:number)=>n>=0?`+${n}`:`${n}`;
const DAMAGE_LABELS={bludgeoning:'contundente',piercing:'perforante',slashing:'cortante'};
export default function AttacksPanel({sheet,inventory,martial,combat,onRecord,canRecord}:Props){
  const [wanted,setWanted]=useState<string|null>(null);
  const [attackUsage,setAttackUsage]=useState<{stepKey:string;value:AttackTurnUsage}|null>(null);
  const [targetName,setTargetName]=useState('');
  const [targetSize,setTargetSize]=useState<CreatureSize>('unknown');
  const [targetIsCreature,setTargetIsCreature]=useState(true);
  const [damageDealt,setDamageDealt]=useState(true);
  const [tacticalMastery,setTacticalMastery]=useState<''|'Push'|'Sap'|'Slow'>('');
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
  const owned=inventory?ownedWeaponChoices(inventory):[];
  const choice=owned.find(item=>item.selectionId===wanted)??owned[0];
  const id=choice?.weaponId;
  const w=id?WEAPON_STATS[id]:null;
  const masteryAvailable=Boolean(sheet&&sheet.level>=9&&martial&&id&&martial.weaponMasteries.includes(id));
  const turn=combat?.turn;
  const tracked=Boolean(turn?.number);
  // Tras confirmar un ataque cambia nextId; así no queda seleccionado el modo
  // del golpe anterior y se propone el segundo ataque de la misma acción.
  const stepKey=`${turn?.number??0}:${combat?.nextId??0}:${turn?.actionsUsed??0}:${turn?.attackActionAttacksUsed??0}`;
  const suggestedUsage:AttackTurnUsage=turn&&sheet?suggestAttackTurnUsage(turn,sheet.level):'attack_action';
  const effectiveUsage:AttackTurnUsage=tracked
    ?(attackUsage?.stepKey===stepKey?attackUsage.value:suggestedUsage)
    :'untracked';
  const extraAttackReady=tracked&&sheet!==null&&sheet.level>=5&&turn?.active===true&&
    turn.attackActionUsed&&(turn.attackActionAttacksUsed??0)<(sheet.level>=11?3:2);
  const vexActive=hasVexAdvantage(combat?.masteryEffects,targetName);
  const studiedActive=Boolean(sheet&&sheet.level>=13&&hasStudiedAdvantage(combat?.studiedAttacks,targetName));
  let profile:WeaponAttackProfile|null=null;
  let profileError='';
  if(sheet&&martial&&choice&&inventory){
    try{profile=calculateOwnedWeaponAttack(sheet,inventory,choice.selectionId,martial.additionalFightingStyle?[martial.fightingStyle,martial.additionalFightingStyle]:martial.fightingStyle,martial.weaponMasteries,{
      ...(w?.finesse?{ability:useDex?'dexterity':'strength'}:{}),
      thrown:thrown&&Boolean(w?.thrownRange),twoHanded:twoHands&&Boolean(w?.versatileSides),
      lightExtraAttack:lightExtra&&Boolean(w?.light),otherWeaponHeld:otherWeapon,adjacentEnemy:adjacent,advantage,
      conditionAdvantage:conditionRoll.advantages.length>0||((vexActive||studiedActive)&&targetIsCreature),
      conditionDisadvantage:conditionRoll.disadvantages.length>0,
      conditionD20Penalty:conditionRoll.d20Penalty,
      ...(masteryAvailable&&tacticalMastery?{tacticalMastery}:{}),
      ...(distance.trim()?{targetDistanceFeet:Number(distance)}:{}),
    });}catch(e){profileError=e instanceof Error?e.message:'Ataque inválido';}
  }
  const rollKey=JSON.stringify({profile,d20,otherD20,ac,dice,effectiveUsage,stepKey});
  const resolved=computed?.key===rollKey?computed.value:null;
  const previewDamage=resolved?.damageTotal===null||resolved?.damageTotal===undefined?null:
    (effectiveUsage==='cleave_extra'&&profile?.mastery==='Cleave'
      ?Math.max(0,resolved.damageTotal-Math.max(0,profile.abilityModifier)):resolved.damageTotal);
  const activeMasteryContext:MasteryContext={targetName:targetName.trim(),targetSize,targetIsCreature,
    dealtDamage:Boolean(damageDealt&&resolved?.hit===true&&resolved.damageTotal!==null&&resolved.damageTotal>0)};
  const masteryPreview=profile&&resolved?evaluateWeaponMastery(profile,resolved,activeMasteryContext):null;
  const setResolved=(value:AttackResolution|null)=>{setComputed(value?{key:rollKey,value}:null);if(!value){confirmedRef.current=false;setConfirmation('');}};
  const incompatibleShield=Boolean(inventory&&hasEquippedShield(inventory)&&profile?.twoHanded);
  const ammoCount=profile?.ammunition?inventory?.items.find(i=>i.id===profile!.ammunition)?.quantity??0:null;
  function onChangeWeapon(next:string){setTacticalMastery('');setAttackUsage(null);setWanted(next);setUseDex(false);setThrown(false);setTwoHands(false);setOtherWeapon(false);setLightExtra(false);setResolved(null);setError('');setDice('');}
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
    try{onRecord(profile,resolved,activeMasteryContext,effectiveUsage);confirmedRef.current=true;setComputed(null);setError('');setConfirmation('Ataque anotado y munición descontada cuando corresponde. Guarda el personaje para conservarlo.');}
    catch(e){setError(e instanceof Error?e.message:'No se pudo registrar el ataque');}
  }
  return <section className="attack-panel panel" aria-label="Ataques con armas">
    <div className="save-panel-head"><div><span className="eyebrow">FASE 4.14 · DOMINIO TÁCTICO</span><h2>Ataques con armas</h2></div><span className="save-label">Cálculo local</span></div>
    <p className="muted-note">Solo aparecen armas que posees. «Calcular tirada» no altera el personaje; «Confirmar ataque» registra el resultado y consume una unidad de munición si corresponde.</p>
    {!sheet&&<p className="save-error" role="alert">Completa primero la creación del personaje.</p>}
    {sheet&&!martial&&<p className="save-error" role="alert">Selecciona un estilo de combate y las maestrías en Equipo.</p>}
    {sheet&&martial&&owned.length===0&&<p className="muted-note">No tienes armas. Adquiere o añade alguna desde el inventario para mostrar ataques.</p>}
    {sheet&&martial&&choice&&<>
      <div className="attack-form-grid">
        <label className="field"><span>Arma disponible</span><select value={choice.selectionId} onChange={e=>onChangeWeapon(e.target.value)}>{owned.map(k=><option key={k.selectionId} value={k.selectionId}>{k.label}</option>)}</select></label>
        <label className="field"><span>Distancia objetivo (pies, opcional)</span><input type="number" min="0" step="1" value={distance} placeholder="Sin distancia" onChange={e=>{setDistance(e.target.value);setResolved(null);}}/></label>
      </div>
      <div className="attack-form-grid">
        <label className="field"><span>Nombre del objetivo (maestrías y Ataques estudiados)</span><input maxLength={60} value={targetName} placeholder="Ej.: Goblin 1" onChange={e=>{setTargetName(e.target.value);setResolved(null);}}/></label>
        <label className="field"><span>Tamaño del objetivo (para Empujar)</span><select value={targetSize} onChange={e=>{setTargetSize(e.target.value as CreatureSize);setResolved(null);}}>
          <option value="unknown">Desconocido</option><option value="tiny">Diminuto</option><option value="small">Pequeño</option><option value="medium">Mediano</option><option value="large">Grande</option><option value="huge">Enorme</option><option value="gargantuan">Gargantuesco</option>
        </select></label>
      </div>
      {tracked&&sheet.level>=5&&turn?.active&&<p className={extraAttackReady?'info-line':'muted-note'} role="status">
        Acción Atacar: {turn.attackActionAttacksUsed??(turn.attackActionUsed?1:0)} de {sheet.level>=11?3:sheet.level>=5?2:1} ataques registrados en la última acción Atacar.
        {extraAttackReady?' Puedes usar el siguiente ataque de la misma acción sin gastar otra; se seleccionará automáticamente.':' El primer golpe gasta una acción; el segundo no consume otra.'}
      </p>}
      {tracked&&<div className="attack-form-grid">
        <label className="field"><span>Gasto de acción al confirmar este ataque</span><select value={effectiveUsage} onChange={e=>{setAttackUsage({stepKey,value:e.target.value as AttackTurnUsage});setResolved(null);}}>
          <option value="attack_action">Acción Atacar (gasta 1 acción)</option>
          {sheet.level>=5&&<option value="extra_attack">Ataque adicional (sin gastar otra acción)</option>}
          <option value="light_bonus">Ataque extra Ligera (gasta acción adicional)</option>
          <option value="light_nick">Ataque extra Ligera con Mella (sin acción adicional)</option>
          <option value="cleave_extra">Ataque extra Tajo (sin acción)</option>
          <option value="reaction">Ataque de reacción</option>
        </select></label>
        <p className="muted-note">Inicia tu turno en «Tu turno de combate». Desde nivel 5, mientras queden ataques de la acción Atacar, se propondrá automáticamente Ataque adicional. Puedes elegir otra modalidad en el desplegable si necesitas una acción diferente (por ejemplo, Acción súbita). Mella y Ligera requieren una acción Atacar previa; Tajo requiere un impacto previo con esa arma a una criatura diferente. La geometría y el arma de la otra mano se comprueban en mesa. Las acciones ya gastadas no pueden utilizarse otra vez.</p>
      </div>}
      {sheet.level>=9&&<label className="field"><span>Dominio táctico (nivel 9) · solo armas con maestría dominada</span>
        <select value={masteryAvailable?tacticalMastery:''} disabled={!masteryAvailable} onChange={e=>{setTacticalMastery(e.target.value as typeof tacticalMastery);setResolved(null);}}>
          <option value="">Usar maestría original ({id&&martial.weaponMasteries.includes(id)?WEAPONS[id].mastery:'no dominada'})</option>
          <option value="Push">Empujar (Push)</option><option value="Sap">Debilitar (Sap)</option><option value="Slow">Ralentizar (Slow)</option>
        </select>
        <span className="muted-note">Sustituye la propiedad únicamente para este ataque; no cambia tus armas dominadas. Si no dominas esta arma, Dominio táctico no está disponible.</span>
      </label>}
      <div className="attack-options"><label><input type="checkbox" checked={targetIsCreature} onChange={e=>{setTargetIsCreature(e.target.checked);setResolved(null);}}/> El objetivo es una criatura (no un objeto)</label></div>
      {studiedActive&&targetIsCreature&&<p className="info-line">Ataques estudiados (Guerrero 13): el último ataque falló contra «{targetName}». Este ataque obtiene ventaja (puede cancelarse con desventaja). El efecto se consume al atacar de nuevo a ese objetivo; si fallas, vuelve a generarse.</p>}
      {sheet.level>=13&&<p className="muted-note">Ataques estudiados: tras fallar una tirada de ataque contra una criatura identificada, obtienes ventaja en el siguiente ataque contra ella antes del final de tu próximo turno. Es necesario indicar CA para confirmar el fallo.</p>}
      {vexActive&&targetIsCreature&&<p className="info-line">Hostigar vigente contra «{targetName}»: aporta ventaja a este ataque (puede quedar cancelada por desventaja). El gestor lo retira al final de tu siguiente turno, salvo efectos antiguos sin fecha.</p>}
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
          <div><span>Ataque{profile.magicEnhancement?` (+${profile.magicEnhancement} mágico)`:''}</span><strong>{signed(profile.attackBonus)}</strong></div>
          <div><span>Daño{profile.magicEnhancement?` (+${profile.magicEnhancement} mágico)`:''}</span><strong>{profile.damageDice?`${profile.damageDice.count}d${profile.damageDice.sides}`:String(profile.fixedDamage)} {signed(profile.damageModifier)}</strong></div>
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
        {resolved&&<div className="attack-result" role="status"><strong>Resultado: {resolved.attackTotal} {resolved.critical?'· ¡Crítico!':''}</strong><span>{resolved.hit===null?'Impacto no determinado (sin CA)':resolved.hit?'Impacta':'Falla'} · Dados de daño requeridos: {resolved.damageDiceNeeded}</span><span>{resolved.damageTotal!==null?`Daño: ${previewDamage} (${DAMAGE_LABELS[profile.damageType]})`:'Introduce los dados de daño para obtener el total.'}</span>{resolved.grazeDamage!==null&&<span>Rozar: posible daño por fallo {resolved.grazeDamage}.</span>}</div>}
        {resolved&&effectiveUsage==='cleave_extra'&&<p className="info-line">Tajo adicional: la vista previa y el historial omiten el modificador positivo de característica en el daño; los bonificadores mágicos permanecen.</p>}
        {resolved&&profile.mastery&&<div className="condition-attack-summary">
          <strong>Maestría {profile.mastery}</strong>
          <p className="muted-note">{masteryPreview?.message}</p>
          {(profile.mastery==='Vex'||profile.mastery==='Slow')&&resolved.hit===true&&<label><input type="checkbox" checked={damageDealt} onChange={e=>setDamageDealt(e.target.checked)}/> El objetivo ha sufrido daño real (después de aplicar sus defensas)</label>}
          {(profile.mastery==='Vex'||profile.mastery==='Slow')&&resolved.hit===true&&resolved.damageTotal===null&&<p className="muted-note">Introduce los resultados de daño y vuelve a calcular para activar esta maestría; no se presume daño a criaturas sin tirada resuelta.</p>}
          {masteryPreview?.pending&&!targetName.trim()&&<p className="muted-note">Escribe un nombre de objetivo para conservar el efecto pendiente.</p>}
        </div>}
        {resolved&&<button type="button" className="attack-confirm" disabled={!canRecord||incompatibleShield||blockedByConditions||Boolean(profile.ammunition&&ammoCount===0)} onClick={confirm}>Confirmar ataque y registrar</button>}
        {confirmation&&<p role="status" className="save-success">{confirmation}</p>}
        <ul className="attack-notes">{profile.notes.map((n,i)=><li key={`${id}-${i}`}>{n}</li>)}</ul>
      </>}
    </>}
    <p className="muted-note">Una misma arma mágica conserva su identificador en el historial. Si la retiras o deja de estar preparada, no se podrá confirmar un ataque con ella.</p>
    <p className="muted-note">Las maestrías se evalúan al confirmar. Hostigar puede conceder ventaja a tu siguiente ataque contra el mismo objetivo. Mella y Tajo comparten ahora un contador de usos por turno propio, mientras que los efectos sobre enemigos y los requisitos de posición los confirma el DM. Inicia y termina tus turnos desde el gestor para activar sus vencimientos.</p>
  </section>;
}
