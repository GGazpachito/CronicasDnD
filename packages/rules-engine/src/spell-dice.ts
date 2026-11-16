/** Dados de conjuros, sin resolver tiradas de salvación ni alterar estados.
 * Muestreo por rechazo mediante WebCrypto como en el d20 del motor.
 */
export type SpellDiceResult=Readonly<{formula:string;dice:readonly number[];modifier:number;total:number}>;
export function parseSpellDice(formula:string):{count:number;sides:number;modifier:number}{
 if(typeof formula!=='string')throw new RangeError('Fórmula inválida');
 const m=/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/.exec(formula.trim());
 if(!m)throw new RangeError('Fórmula de dados no admitida');
 const count=Number(m[1]),sides=Number(m[2]),modifier=Number(m[3]??0);
 if(count<1||count>80||Math.abs(modifier)>500)throw new RangeError('Fórmula demasiado grande');
 return {count,sides,modifier};
}
export function secureSpellDie(sides:number):number{
 if(!Number.isInteger(sides)||sides<2||sides>100)throw new RangeError('Dado inválido');
 if(!globalThis.crypto?.getRandomValues)throw new Error('Este navegador no permite lanzar dados seguros');
 const buffer=new Uint32Array(1),range=0x100000000,cutoff=range-(range%sides);
 do{globalThis.crypto.getRandomValues(buffer);}while(buffer[0]>=cutoff);
 return buffer[0]%sides+1;
}
export function rollSpellDice(formula:string,draw:(sides:number)=>number=secureSpellDie):SpellDiceResult{
 const {count,sides,modifier}=parseSpellDice(formula);
 const dice=Array.from({length:count},()=>draw(sides));
 if(dice.some(value=>!Number.isInteger(value)||value<1||value>sides))throw new RangeError('Resultado de dado inválido');
 return {formula,dice,modifier,total:dice.reduce((sum,value)=>sum+value,modifier)};
}
