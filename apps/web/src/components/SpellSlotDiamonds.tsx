"use client";
/** Control compartido para ranuras de todas las clases lanzadoras.
 * Un rombo marcado indica ranura GASTADA, uno vacío indica DISPONIBLE.
 * Los índices se guardan en el estado de la clase, no en estado visual local.
 */
type Props=Readonly<{level:number;spent:readonly boolean[];disabled?:boolean;onToggle:(index:number)=>void}>;
export default function SpellSlotDiamonds({level,spent,disabled=false,onToggle}:Props){
 const remaining=spent.filter(value=>!value).length;
 return <div className="spell-diamond-line" aria-label={`Espacios de conjuro de nivel ${level}`}>
  <div className="spell-diamond-label"><strong>Nivel {level}</strong><span>{remaining}/{spent.length} disponibles</span></div>
  <div className="spell-diamonds" role="group" aria-label={`Marcar espacios gastados de nivel ${level}`}>
   {spent.map((used,index)=><button type="button" key={index} className={`spell-diamond${used?' is-spent':''}`}
     disabled={disabled} aria-pressed={used} aria-label={`Espacio ${index+1} de nivel ${level}: ${used?'gastado, pulsar para recuperar':'disponible, pulsar para gastar'}`}
     title={used?'Recuperar este espacio':'Gastar este espacio'} onClick={()=>onToggle(index)}><span aria-hidden="true" /></button>)}
  </div>
 </div>;
}
