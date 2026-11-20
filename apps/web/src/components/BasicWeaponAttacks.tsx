"use client";
import {useState} from 'react';
import {rollD20,type D20Mode} from '../../../../packages/rules-engine/src/d20';
import {rollDie} from '../../../../packages/rules-engine/src/dice';
import {WEAPON_STATS} from '../../../../packages/rules-engine/src/attacks';
import {WEAPONS,type WeaponId} from '../../../../packages/rules-engine/src/martial';
import type {InventoryState} from '../../../../packages/rules-engine/src/inventory';
import type {AbilityScores} from '../../../../packages/rules-engine/src/abilities';
import {abilityModifiers} from '../../../../packages/rules-engine/src/abilities';
import {WeaponRollCards,weaponAttackCard,type WeaponRollCard} from './WeaponRollCards';
const sign=(n:number)=>n>=0?`+${n}`:String(n);
const SIMPLE_WEAPONS=new Set<WeaponId>(['club','dagger','greatclub','handaxe','javelin','light_hammer','mace','quarterstaff','sickle','spear','dart','light_crossbow','shortbow','sling']);
/** Tiradas manuales con armas equipadas, sin aplicar maestrías ni estilos exclusivos de Guerrero. */
export default function BasicWeaponAttacks({inventory,scores,proficiency,mode}:{inventory:InventoryState;scores:AbilityScores;proficiency:number;mode:D20Mode}){
 const [results,setResults]=useState<WeaponRollCard[]>([]);
 const [error,setError]=useState('');
 const [critical,setCritical]=useState(false);
 const mods=abilityModifiers(scores);
 return <section className="overview-panel panel" aria-label="Ataques con armas equipadas">
  <div className="overview-panel-heading"><h3>Ataques y armas</h3><span>Equipo marcado</span></div><label className="overview-panel-note"><input type="checkbox" checked={critical} onChange={e=>setCritical(e.target.checked)}/> Daño crítico (duplicar dados)</label>
  {inventory.equipped.weapons.length===0&&<p className="overview-panel-note">Marca un arma en Equipo para realizar aquí sus tiradas.</p>}
  {inventory.equipped.weapons.map(id=>{
   const stats=WEAPON_STATS[id];const stat=stats.kind==='ranged'||(stats.finesse&&mods.dexterity>mods.strength)?mods.dexterity:mods.strength;
   const bonus=stat+(SIMPLE_WEAPONS.has(id)?proficiency:0);const name=WEAPONS[id].name;
   const damage=stats.dice?`${stats.dice.count}d${stats.dice.sides}`:`${stats.fixedDamage??0}`;
   return <div className="overview-record" key={id}><span><strong>{name}</strong><small> Ataque {sign(bonus)} · daño {damage} {sign(stat)}</small></span>
    <span className="overview-roll-actions"><button type="button" className="overview-roll-button" onClick={()=>{try{setResults([weaponAttackCard(`${name} · Ataque`,rollD20(bonus,'normal',mode))]);setError('');}catch(e){setResults([]);setError(e instanceof Error?e.message:'Error de tirada');}}}>Atacar</button>
     <button type="button" className="overview-roll-button" onClick={()=>{try{const dice=stats.dice?Array.from({length:stats.dice.count*(critical?2:1)},()=>rollDie(stats.dice!.sides)):[];const fixed=stats.fixedDamage??0;setResults([{label:`${name} · Daño`,kind:'damage',dice,bonus:stat,fixedDamage:fixed,total:Math.max(0,dice.reduce((a,b)=>a+b,fixed)+stat),formula:`${dice.length?`${dice.length}d${stats.dice!.sides}`:'Fijo'}${critical?' · crítico':''}`,critical}]);setError('');}catch(e){setResults([]);setError(e instanceof Error?e.message:'Error de daño');}}}>Daño</button></span></div>;
  })}
  <WeaponRollCards rolls={results}/>{error&&<p className="overview-dice-error" role="alert">{error}</p>}
  <p className="overview-panel-note">El Mago añade competencia solo con armas simples. El crítico duplica los dados, nunca el modificador. Otras circunstancias y efectos se resuelven con el DM.</p>
 </section>;
}
