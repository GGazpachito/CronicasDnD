/** Paso 14. Estado de partida del Guerrero 1-3 (PHB 2024).
 * Operaciones puras: la hoja calculada es la fuente de los maximos.
 * No resuelve muerte, salvaciones de muerte, turnos ni lanzamientos de conjuros.
 */
import type { CalculatedFighterSheet } from './sheet';
import { initialCombatState,validateCombatState,type CombatState } from './combat';
import { finishFighterRest, initialFighterState, spendFighterResource, useSecondWind, useTacticalMind,
  validateFighterState, type FighterState, type FighterResourceId } from './resources';

export type AdventureState = Readonly<{
  fighter: FighterState;
  temporaryHitPoints: number;
  spentHitDice: number;
  combat: CombatState;
}>;

export type AdventureAction =
  | Readonly<{type:'damage'; amount:number}>
  | Readonly<{type:'heal'; amount:number}>
  | Readonly<{type:'temporary_hp'; amount:number}>
  | Readonly<{type:'second_wind'; d10:number}>
  | Readonly<{type:'action_surge'}>
  | Readonly<{type:'tactical_mind'; originalTotal:number; difficultyClass:number; d10:number}>
  | Readonly<{type:'short_rest'; hitDieRolls:readonly number[]}>
  | Readonly<{type:'long_rest'}>;

export type AdventureResult = Readonly<{
  state: AdventureState;
  description: string;
}>;

function requireInteger(value:unknown,label:string,min:number,max:number):number{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)
    throw new RangeError(`${label} debe ser entero entre ${min} y ${max}`);
  return value;
}
function isRecord(value:unknown):value is Record<string,unknown>{
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function onlyKeys(value:Record<string,unknown>,keys:readonly string[],label:string):void{
  if(Object.keys(value).some(k=>!keys.includes(k)))throw new RangeError(`${label} contiene campos desconocidos`);
}

export function initialAdventureState(sheet:CalculatedFighterSheet):AdventureState{
  return {fighter:initialFighterState(sheet.level,sheet.maximumHitPoints),temporaryHitPoints:0,spentHitDice:0,combat:initialCombatState()};
}

/** Comprueba que el estado pertenece a esta hoja; no se remapea silenciosamente. */
export function validateAdventureState(value:unknown,sheet:CalculatedFighterSheet):AdventureState{
  if(!isRecord(value))throw new RangeError('Estado de partida inválido');
  onlyKeys(value,['fighter','temporaryHitPoints','spentHitDice','combat'],'Estado de partida');
  if(!isRecord(value.fighter))throw new RangeError('Estado del Guerrero inválido');
  onlyKeys(value.fighter,['fighterLevel','hitPoints','resources'],'Estado del Guerrero');
  if(!isRecord(value.fighter.hitPoints))throw new RangeError('PG inválidos');
  onlyKeys(value.fighter.hitPoints,['current','maximum'],'PG');
  if(!isRecord(value.fighter.resources))throw new RangeError('Recursos inválidos');
  onlyKeys(value.fighter.resources,['second_wind','action_surge'],'Recursos');
  for(const [id,entry] of Object.entries(value.fighter.resources)){
    if(!isRecord(entry))throw new RangeError(`Recurso ${id} inválido`);
    onlyKeys(entry,['current'],`Recurso ${id}`);
  }
  const fighter=value.fighter as FighterState;
  validateFighterState(fighter);
  if(fighter.fighterLevel!==sheet.level||fighter.hitPoints.maximum!==sheet.maximumHitPoints)
    throw new RangeError('La hoja ha cambiado: reinicia explícitamente el estado de partida antes de continuar o guardar');
  const temporaryHitPoints=requireInteger(value.temporaryHitPoints,'PG temporales',0,100_000);
  const spentHitDice=requireInteger(value.spentHitDice,'Dados de golpe gastados',0,sheet.hitDice.total);
  return {fighter:{fighterLevel:fighter.fighterLevel,hitPoints:{...fighter.hitPoints},resources:{
    second_wind:{current:fighter.resources.second_wind!.current},
    ...(fighter.fighterLevel>=2?{action_surge:{current:fighter.resources.action_surge!.current}}:{})
  }},temporaryHitPoints,spentHitDice,combat:value.combat===undefined?initialCombatState():validateCombatState(value.combat)};
}

function withHp(state:AdventureState,current:number):AdventureState{
  return {...state,fighter:{...state.fighter,hitPoints:{...state.fighter.hitPoints,current}}};
}
function withFighter(state:AdventureState,fighter:FighterState):AdventureState{
  return {...state,fighter};
}
function requireConscious(state:AdventureState,activity:string):void{
  if(state.fighter.hitPoints.current===0)throw new RangeError(`${activity}: el personaje está a 0 PG; las reglas de muerte aún se gestionan manualmente`);
}

/** Ejecuta una acción de partida. Jamás modifica ni el estado ni la hoja recibidos. */
export function applyAdventureAction(source:AdventureState,action:AdventureAction,sheet:CalculatedFighterSheet):AdventureResult{
  const state=validateAdventureState(source,sheet);
  if(!isRecord(action))throw new RangeError('Acción inválida');
  switch(action.type){
    case 'damage':{
      onlyKeys(action,['type','amount'],'Daño');
      const amount=requireInteger(action.amount,'Daño',1,100_000);
      if(state.fighter.hitPoints.current===0)
        throw new RangeError('A 0 PG el daño puede causar fallos de salvación de muerte o muerte instantánea; gestión manual pendiente');
      const absorbed=Math.min(amount,state.temporaryHitPoints);
      const hpLoss=Math.min(state.fighter.hitPoints.current,amount-absorbed);
      const next=withHp({...state,temporaryHitPoints:state.temporaryHitPoints-absorbed},state.fighter.hitPoints.current-hpLoss);
      return {state:next,description:`Daño ${amount}: ${absorbed} absorbido por PG temporales, ${hpLoss} PG perdidos${next.fighter.hitPoints.current===0?' · A 0 PG: comprueba las reglas de muerte manualmente':''}.`};
    }
    case 'heal':{
      onlyKeys(action,['type','amount'],'Curación');
      const amount=requireInteger(action.amount,'Curación',1,100_000);
      const current=Math.min(state.fighter.hitPoints.maximum,state.fighter.hitPoints.current+amount);
      return {state:withHp(state,current),description:`Curación efectiva: ${current-state.fighter.hitPoints.current} PG.`};
    }
    case 'temporary_hp':{
      onlyKeys(action,['type','amount'],'PG temporales');
      const amount=requireInteger(action.amount,'PG temporales',1,100_000);
      // El receptor puede mantener los anteriores; aquí conservamos el mayor, nunca se suman.
      return {state:{...state,temporaryHitPoints:Math.max(state.temporaryHitPoints,amount)},description:'PG temporales actualizados (no se acumulan).'};
    }
    case 'second_wind':{
      onlyKeys(action,['type','d10'],'Segundo aliento');
      requireConscious(state,'Segundo aliento');
      const applied=useSecondWind(state.fighter,requireInteger(action.d10,'d10',1,10));
      return {state:withFighter(state,applied.state),description:`Segundo aliento: +${applied.healed} PG efectivos y un uso gastado.`};
    }
    case 'action_surge':{
      onlyKeys(action,['type'],'Acción súbita');
      requireConscious(state,'Acción súbita');
      const fighter=spendFighterResource(state.fighter,'action_surge');
      return {state:withFighter(state,fighter),description:'Acción súbita consumida. La acción adicional no puede ser Magia.'};
    }
    case 'tactical_mind':{
      onlyKeys(action,['type','originalTotal','difficultyClass','d10'],'Mente táctica');
      requireConscious(state,'Mente táctica');
      const applied=useTacticalMind(state.fighter,{
        originalTotal:requireInteger(action.originalTotal,'Resultado original',-1000,1000),
        difficultyClass:requireInteger(action.difficultyClass,'CD',0,1000),
        d10:requireInteger(action.d10,'d10',1,10),
      });
      return {state:withFighter(state,applied.state),description:`Mente táctica: total ${applied.finalTotal}; ${applied.success?'éxito, se gasta Segundo aliento':'fallo, no se gasta Segundo aliento'}.`};
    }
    case 'short_rest':{
      onlyKeys(action,['type','hitDieRolls'],'Descanso corto');
      requireConscious(state,'Descanso corto');
      if(!Array.isArray(action.hitDieRolls)||action.hitDieRolls.length>sheet.hitDice.total-state.spentHitDice)
        throw new RangeError('No hay suficientes dados de golpe disponibles');
      let current=state.fighter.hitPoints.current;
      for(const raw of action.hitDieRolls){
        const die=requireInteger(raw,'Tirada de dado de golpe d10',1,10);
        current=Math.min(state.fighter.hitPoints.maximum,current+Math.max(1,die+sheet.abilityModifiers.constitution));
      }
      const fighter=finishFighterRest(withHp(state,current).fighter,'short_rest');
      return {state:{...state,fighter,spentHitDice:state.spentHitDice+action.hitDieRolls.length},description:`Descanso corto: ${action.hitDieRolls.length} dados gastados; recuperas ${current-state.fighter.hitPoints.current} PG y los recursos del Guerrero correspondientes.`};
    }
    case 'long_rest':{
      onlyKeys(action,['type'],'Descanso largo');
      requireConscious(state,'Descanso largo');
      const restored=finishFighterRest(withHp(state,state.fighter.hitPoints.maximum).fighter,'long_rest');
      return {state:{fighter:restored,temporaryHitPoints:0,spentHitDice:0,combat:{...state.combat,effects:state.combat.effects.filter(e=>e.remainingRounds===null)}},description:'Descanso largo: PG y dados de golpe restaurados; recursos recuperados y PG temporales eliminados.'};
    }
    default:throw new RangeError('Acción de partida no admitida');
  }
}

/** Devuelve los máximos sin guardar nuevos valores. */
export function resourceDisplay(state:AdventureState,sheet:CalculatedFighterSheet):Readonly<Partial<Record<FighterResourceId,{current:number;maximum:number}>>>{
  validateAdventureState(state,sheet);
  return sheet.level>=2?{
    second_wind:{current:state.fighter.resources.second_wind!.current,maximum:2},
    action_surge:{current:state.fighter.resources.action_surge!.current,maximum:1}
  }:{second_wind:{current:state.fighter.resources.second_wind!.current,maximum:2}};
}
