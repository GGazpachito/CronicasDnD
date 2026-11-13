"use client";

import {useState, type ChangeEvent} from "react";
import {rollD20, type D20Mode, type D20Result} from "../../../../packages/rules-engine/src/d20";
import {rollDie} from "../../../../packages/rules-engine/src/dice";
import {
  equippedWeaponChoices, calculateOwnedWeaponAttack, resolveWeaponAttack, resolveWeaponDamage,
  WEAPON_STATS, type OwnedWeaponChoice, type WeaponAttackProfile,
} from "../../../../packages/rules-engine/src/attacks";
import type {CalculatedFighterSheet} from "../../../../packages/rules-engine/src/sheet";
import type {InventoryState} from "../../../../packages/rules-engine/src/inventory";
import type {MartialChoices} from "../../../../packages/rules-engine/src/martial";
import type {CombatState} from "../../../../packages/rules-engine/src/combat";
import {evaluateConditionRoll, initialConditionLedger} from "../../../../packages/rules-engine/src/conditions";

const signed=(value:number)=>value>=0?`+${value}`:String(value);
const damageLabels={bludgeoning:"contundente",piercing:"perforante",slashing:"cortante"} as const;
const modeLabel:Record<D20Mode,string>={normal:"Normal",advantage:"Ventaja",disadvantage:"Desventaja"};

type AttackRecord={profileKey:string;roll:D20Result;critical:boolean;grazeDamage:number|null;hit:boolean|null};
type DamageRecord={profileKey:string;dice:readonly number[];effectiveDice:readonly number[];critical:boolean;total:number};

type WeaponCardProps=Readonly<{
  choice:OwnedWeaponChoice; sheet:CalculatedFighterSheet; inventory:InventoryState;
  martial:MartialChoices; combat:CombatState|null; circumstanceMode:D20Mode; criticalDamage:boolean;
}>;

/** Solo lanzamientos; no registra ataques, no gasta munición ni altera el turno. */
function EquippedWeaponCard({choice,sheet,inventory,martial,combat,circumstanceMode,criticalDamage}:WeaponCardProps){
  const stats=WEAPON_STATS[choice.weaponId];
  const [ability,setAbility]=useState<"strength"|"dexterity">(
    stats.finesse&&sheet.abilityModifiers.dexterity>sheet.abilityModifiers.strength?"dexterity":
    stats.kind==="ranged"?"dexterity":"strength",
  );
  const [twoHands,setTwoHands]=useState(false);
  const [thrown,setThrown]=useState(false);
  const [otherWeapon,setOtherWeapon]=useState(false);
  const [lastAttack,setLastAttack]=useState<AttackRecord|null>(null);
  const [lastDamage,setLastDamage]=useState<DamageRecord|null>(null);
  const [error,setError]=useState<string|null>(null);
  const conditions=evaluateConditionRoll(combat?.conditions??initialConditionLedger(),{kind:"attack"});
  let profile:WeaponAttackProfile|null=null;
  let profileError:string|null=null;
  try{
    profile=calculateOwnedWeaponAttack(sheet,inventory,choice.selectionId,
      martial.additionalFightingStyle?[martial.fightingStyle,martial.additionalFightingStyle]:martial.fightingStyle,
      martial.weaponMasteries,{
        ...(stats.finesse?{ability}:{}),
        ...(stats.versatileSides?{twoHanded:twoHands}:{}),
        ...(stats.thrownRange&&stats.kind==="melee"?{thrown}:{}),
        otherWeaponHeld:otherWeapon,
        conditionAdvantage:conditions.advantages.length>0,
        conditionDisadvantage:conditions.disadvantages.length>0,
        conditionD20Penalty:conditions.d20Penalty,
      });
  }catch(reason){profileError=reason instanceof Error?reason.message:"No se ha podido calcular el arma";}
  // Los resultados antiguos no se muestran si cambia la ficha, el equipamiento o el modo de uso.
  const profileKey=JSON.stringify(profile);
  const attack=lastAttack?.profileKey===profileKey?lastAttack:null;
  const critical=criticalDamage||attack?.critical===true;
  // No mostrar un daño anterior que use un modo crítico distinto del activo.
  const damage=lastDamage?.profileKey===profileKey&&lastDamage.critical===critical?lastDamage:null;
  const damageCount=(profile?.damageDice?.count??0)*(critical?2:1);
  const damageSides=profile?.damageDice?.sides??null;
  const attackDisabled=!profile||conditions.actionForbidden;

  function rollAttack(){
    if(!profile||conditions.actionForbidden)return;
    try{
      const rolled=rollD20(profile.attackBonus,profile.mode,circumstanceMode);
      const resolution=resolveWeaponAttack({...profile,mode:rolled.mode},{
        firstD20:rolled.dice[0],...(rolled.dice.length===2?{secondD20:rolled.dice[1]}:{}),
      });
      setLastAttack({profileKey,roll:rolled,critical:resolution.critical,grazeDamage:resolution.grazeDamage,hit:resolution.hit});
      setLastDamage(null);
      setError(null);
    }catch(reason){setError(reason instanceof Error?reason.message:"Error al lanzar ataque");}
  }
  function rollDamage(){
    if(!profile)return;
    try{
      const dice=Array.from({length:damageCount},()=>rollDie(damageSides!));
      const resolved=resolveWeaponDamage(profile,dice,critical);
      setLastDamage({profileKey,dice:resolved.dice,effectiveDice:resolved.effectiveDice,critical,total:resolved.total});
      setError(null);
    }catch(reason){setError(reason instanceof Error?reason.message:"Error al lanzar daño");}
  }

  return <article className="overview-equipped-weapon" aria-label={`Ataque con ${choice.label}`}>
    <div className="overview-equipped-weapon-head">
      <div><strong>{choice.label}</strong><small>{stats.kind==="ranged"?"A distancia":"Cuerpo a cuerpo"} · {profile?.mastery?`Maestría: ${profile.mastery}`:"Sin maestría seleccionada"}</small></div>
      {choice.enhancement&&<span className="overview-weapon-magic">Mágica +{choice.enhancement}</span>}
    </div>
    {profile?<>
      <div className="overview-weapon-stats" aria-label={`Modificadores para ${choice.label}`}>
        <div><span>Ataque</span><strong>{signed(profile.attackBonus)}</strong></div>
        <div><span>Daño</span><strong>{profile.damageDice?`${profile.damageDice.count*(critical?2:1)}d${profile.damageDice.sides}`:`${profile.fixedDamage} fijo`} {signed(profile.damageModifier)}</strong></div>
        <small className="overview-weapon-damage-type">{damageLabels[profile.damageType]}{critical?" · Dados críticos": ""}</small>
      </div>
      <details className="overview-weapon-breakdown">
        <summary>Desglose de bonificadores</summary>
        <p>Ataque: {signed(profile.abilityModifier)} característica · {signed(sheet.proficiencyBonus)} competencia{profile.magicEnhancement?` · +${profile.magicEnhancement} mágica`:""}{profile.attackBonus-profile.abilityModifier-sheet.proficiencyBonus-(profile.magicEnhancement??0)!==0?` · ${signed(profile.attackBonus-profile.abilityModifier-sheet.proficiencyBonus-(profile.magicEnhancement??0))} otros efectos`:""}</p>
        <p>Daño: {signed(profile.abilityModifier)} característica{profile.magicEnhancement?` · +${profile.magicEnhancement} mágica`:""}{profile.damageModifier-profile.abilityModifier-(profile.magicEnhancement??0)!==0?` · ${signed(profile.damageModifier-profile.abilityModifier-(profile.magicEnhancement??0))} estilo/efectos`:""}{profile.greatWeaponFighting?" · 1 y 2 cuentan como 3":""}. El modificador solo se suma una vez en un crítico.</p>
      </details>
      {(stats.finesse||stats.versatileSides||stats.thrownRange&&stats.kind==="melee"||martial.fightingStyle==="dueling"||martial.additionalFightingStyle==="dueling")&&
        <details className="overview-weapon-options"><summary>Opciones de uso del arma</summary><div>
          {stats.finesse&&<label>Característica<select value={ability} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setAbility(e.target.value as "strength"|"dexterity")}><option value="strength">Fuerza</option><option value="dexterity">Destreza</option></select></label>}
          {stats.versatileSides&&<label className="overview-weapon-check"><input type="checkbox" checked={twoHands} disabled={thrown} onChange={e=>{setTwoHands(e.target.checked);if(e.target.checked)setOtherWeapon(false);}}/> A dos manos (versátil)</label>}
          {stats.thrownRange&&stats.kind==="melee"&&<label className="overview-weapon-check"><input type="checkbox" checked={thrown} disabled={twoHands} onChange={e=>setThrown(e.target.checked)}/> Ataque arrojadizo</label>}
          {(martial.fightingStyle==="dueling"||martial.additionalFightingStyle==="dueling")&&<label className="overview-weapon-check"><input type="checkbox" checked={otherWeapon} disabled={twoHands} onChange={e=>setOtherWeapon(e.target.checked)}/> Sostengo otra arma en la otra mano (afecta a Duelo)</label>}
        </div></details>}
      <div className="overview-weapon-actions">
        <button className="overview-roll-button" type="button" disabled={attackDisabled} onClick={rollAttack}>Tirar ataque</button>
        <button className="overview-roll-button" type="button" onClick={rollDamage}>Tirar daño</button>
      </div>
      {attack&&<div className="overview-weapon-result" role="status" aria-live="polite">
        <div className="overview-weapon-result-line"><strong>Ataque: {attack.roll.total}</strong><span>{modeLabel[attack.roll.mode]}{attack.critical?" · CRÍTICO":""} · d20: {attack.roll.chosen} {signed(attack.roll.modifier)}</span></div>
        <details><summary>Ver tirada</summary>
          <span>Dados: {attack.roll.dice.join(" / ")} · Elegido: {attack.roll.chosen} {signed(attack.roll.modifier)} = {attack.roll.total}</span>
          {attack.hit===false?<small>1 natural: fallo automático.{attack.grazeDamage!==null?` Rozar: posible daño ${attack.grazeDamage}.`:""}</small>:<small>El DM determina si impacta; no se aplica daño a ninguna criatura.</small>}
        </details>
      </div>}
      {damage&&<div className="overview-weapon-result" role="status" aria-live="polite">
        <div className="overview-weapon-result-line"><strong>Daño: {damage.total}</strong><span>{damageLabels[profile.damageType]}{damage.critical?" · Crítico":""}</span></div>
        <details><summary>Ver dados</summary>
          <span>{damage.dice.length?`Dados: ${damage.dice.join(" + ")}`:`Daño fijo: ${profile.fixedDamage}`} {profile.greatWeaponFighting&&damage.dice.length?`(efectivos: ${damage.effectiveDice.join(" + ")})`:""}</span>
          <span>Modificador: {signed(profile.damageModifier)} · Total: {damage.total}</span>
          {attack?.hit===false&&<small>El ataque anterior falló: esta tirada es solo una referencia.</small>}
        </details>
      </div>}
      {conditions.actionForbidden&&<p className="overview-weapon-alert" role="alert">Las condiciones actuales impiden realizar ataques.</p>}
      {conditions.notes.length>0&&<details className="overview-weapon-breakdown"><summary>Notas de condiciones</summary><p>{conditions.notes.join(" ")}</p></details>}
      {error&&<p className="overview-weapon-alert" role="alert">{error}</p>}
    </>:<p className="overview-weapon-alert" role="alert">{profileError}</p>}
  </article>;
}

export default function PrincipalEquippedAttacks({sheet,inventory,martial,combat,circumstanceMode,criticalDamage,onCriticalDamageChange,onOpenAdvanced}:Readonly<{
  sheet:CalculatedFighterSheet;inventory:InventoryState|null;martial:MartialChoices|undefined;
  combat:CombatState|null;circumstanceMode:D20Mode;criticalDamage:boolean;
  onCriticalDamageChange:(checked:boolean)=>void;onOpenAdvanced:()=>void;
}>){
  const choices=inventory?equippedWeaponChoices(inventory):[];
  return <section className="overview-panel panel overview-equipped-attacks" aria-label="Armas equipadas y tiradas">
    <div className="overview-panel-heading"><h3>Ataques y armas</h3><span>{choices.length} equipadas</span></div>
    <label className={`overview-weapon-global-crit${criticalDamage?" is-active":""}`}>
      <input type="checkbox" checked={criticalDamage} onChange={event=>onCriticalDamageChange(event.target.checked)}/>
      <span className="overview-weapon-global-crit-mark" aria-hidden="true">✦</span>
      <span>Daño crítico <small>Duplicar dados en todas las armas</small></span>
    </label>
    {!martial||!inventory?<p className="overview-panel-note">Completa la creación del personaje y su equipo para calcular los ataques.</p>:
      choices.length===0?<p className="overview-panel-note">No hay armas equipadas. Ve a Equipo y marca sus casillas. Solo esas armas aparecerán aquí.</p>:
      <div className="overview-weapon-list">{choices.map(choice=><EquippedWeaponCard key={choice.selectionId}
        choice={choice} sheet={sheet} inventory={inventory} martial={martial} combat={combat}
        circumstanceMode={circumstanceMode} criticalDamage={criticalDamage}/>)}</div>}
    <p className="overview-panel-note">Ventaja/desventaja: usa los botones generales de «Tiradas de d20». El crítico global duplica solo los dados de daño; los críticos naturales se reconocen por arma. Estas tiradas son independientes del combate: no gastan munición, acciones ni recursos y no registran impactos. La CA del objetivo, posiciones y otros efectos tácticos se resuelven con el DM.</p>
    <button className="overview-link" type="button" onClick={onOpenAdvanced}>Abrir panel de ataques avanzado</button>
  </section>;
}
