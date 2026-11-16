'use client';
/** Presentación de ranuras de todas las clases lanzadoras.
 * Las `spent` del estado NO se invierten. El rombo RELLENO significa disponible.
 */
type Props=Readonly<{level:number;spent:readonly boolean[];disabled?:boolean;onToggle:(index:number)=>void}>;
export default function SpellSlotDiamonds({level,spent,disabled=false,onToggle}:Props){
 const remaining=spent.filter(value=>!value).length;
 return <div className="spell-diamond-line" aria-label={`Espacios de conjuro de nivel ${level}`}>
  <div className="spell-diamond-label"><strong>Nivel {level}</strong><span>{remaining}/{spent.length} disponibles</span></div>
  <div className="spell-diamonds" role="group" aria-label={`Marcar espacios disponibles de nivel ${level}`}>
   {spent.map((used,index)=><button type="button" key={index} className={`spell-diamond${!used?' is-available':''}`}
     disabled={disabled} aria-pressed={!used} aria-label={`Espacio ${index+1} de nivel ${level}: ${used?'gastado, pulsar para recuperarlo':'disponible, pulsar para gastarlo'}`}
     title={used?'Recuperar este espacio':'Gastar este espacio'} onClick={()=>onToggle(index)}><span aria-hidden="true" /></button>)}
  </div>
 </div>;
}
