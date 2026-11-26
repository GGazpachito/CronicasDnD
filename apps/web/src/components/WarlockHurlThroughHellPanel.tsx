'use client';

import {WeaponRollCards,type WeaponRollCard} from './WeaponRollCards';

type Props=Readonly<{
 used:boolean;spellSaveDC:number;spentPactSlots:readonly boolean[];
 lastDamageDice:readonly number[]|null;
 onUse:()=>void;onRestore:(slotIndex:number)=>void;onRollDamage:()=>void;
}>;

/** Rasgo activo de subclase; no decide impactos, salvaciones ni condiciones del enemigo. */
export default function WarlockHurlThroughHellPanel({used,spellSaveDC,spentPactSlots,lastDamageDice,onUse,onRestore,onRollDamage}:Props){
 const rolls:readonly WeaponRollCard[]=lastDamageDice?[{
  kind:'damage',label:'Arrojar al infierno · Daño psíquico',dice:lastDamageDice,
  bonus:0,total:lastDamageDice.reduce((sum,die)=>sum+die,0),
  formula:'8d10 · daño psíquico',
  note:'Solo con salvación de Carisma fallida y si el objetivo no es infernal.',
 }]:[];
 return <div className="overview-record" aria-label="Arrojar al infierno">
  <div><strong>Arrojar al infierno · nivel 14</strong>
   <p className="muted-note">Después de impactar con una tirada de ataque, el objetivo realiza una salvación de <strong>Carisma CD {spellSaveDC}</strong>. Si falla, desaparece, queda incapacitado hasta el final de tu siguiente turno y reaparece en su espacio o el libre más cercano. Recibe 8d10 de daño psíquico, salvo que sea infernal.</p>
   <p className="muted-note">{used?'Uso agotado. Puedes restaurarlo gastando una ranura de Magia de Pacto.':'Disponible: 1 uso por descanso largo.'} El director de juego decide si se cumplen las condiciones; la web no aplica estados ni daños a enemigos.</p>
   <div className="overview-quick-actions">
    <button type="button" disabled={used} onClick={onUse}>{used?'Arrojar al infierno utilizado':'Marcar uso tras impactar'}</button>
    <button type="button" onClick={onRollDamage}>Tirar 8d10 de daño</button>
   </div>
   {used&&<div className="overview-quick-actions"><span>Restaurar uso (gasta una ranura):</span>{spentPactSlots.map((spent,index)=><button key={index} type="button" disabled={spent} onClick={()=>onRestore(index)}>Ranura {index+1}{spent?' · gastada':''}</button>)}</div>}
   <WeaponRollCards rolls={rolls}/>
  </div>
 </div>;
}
