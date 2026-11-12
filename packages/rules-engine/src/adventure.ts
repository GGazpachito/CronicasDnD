/** Paso 18. Estado de partida del Guerrero 1-3 (PHB 2024).
 * Operaciones puras con seguimiento de PG, muerte y concentración.
 * Los dados los proporciona el jugador; no se simula combate contra enemigos.
 */
import type { CalculatedFighterSheet } from './sheet';
import {ABILITIES,type Ability} from './abilities';
import {validateMagicWards,type MagicWardEntry} from './magic-wards';
import { initialCombatState,validateCombatState,spendCombatSlot,grantCombatActionSurge,type CombatState } from './combat';
import {longRestConditionUpdate,initialConditionLedger,conditionCapabilities} from './conditions';
import {advanceSurvivalRound,concentrationDC,damageAtZero,deathSavingThrow,initialSurvivalState,
  recordConcentrationDamage,recoverFromStable,resetDeathTrack,resolveConcentration,startConcentration,
  stabilize,validateSurvivalState,type SurvivalState} from './survival';
import { advanceFighterLevel, finishFighterRest, initialFighterState, spendFighterResource, useSecondWind, useTacticalMind,
  validateFighterState, type FighterState, type FighterResourceId } from './resources';

export type AdventureState = Readonly<{
  fighter: FighterState;
  temporaryHitPoints: number;
  spentHitDice: number;
  combat: CombatState;
  /** Ausente en guardados v2 anteriores a esta actualización. */
  survival?: SurvivalState;
  /** Registro opcional: ausente en personajes anteriores a la fase 4.9. */
  magicWards?: readonly MagicWardEntry[];
}>;

export type AdventureAction =
  | Readonly<{type:'damage'; amount:number; critical?:boolean}>
  | Readonly<{type:'heal'; amount:number;fortitudeBonus?:boolean}>
  | Readonly<{type:'temporary_hp'; amount:number}>
  | Readonly<{type:'second_wind'; d10:number;fortitudeBonus?:boolean}>
  | Readonly<{type:'action_surge'}>
  | Readonly<{type:'tactical_mind'; originalTotal:number; difficultyClass:number; d10:number}>
  | Readonly<{type:'indomitable'; originalTotal:number; difficultyClass:number; ability:Ability; d20:number; extraBonus?:number}>
  | Readonly<{type:'short_rest'; hitDieRolls:readonly number[];fortitudeBonus?:boolean}>
  | Readonly<{type:'long_rest'}>
  | Readonly<{type:'death_save';d20:number;secondD20?:number}>
  | Readonly<{type:'stabilize';medicineTotal:number}>
  | Readonly<{type:'recover_stable';d4:number;hoursElapsed:number}>
  | Readonly<{type:'start_concentration';name:string;rounds:number|null}>
  | Readonly<{type:'end_concentration'}>
  | Readonly<{type:'concentration_save';d20:number;extraBonus?:number}>;

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
  return {fighter:initialFighterState(sheet.level,sheet.maximumHitPoints),temporaryHitPoints:0,spentHitDice:0,combat:initialCombatState(),survival:initialSurvivalState(),magicWards:[]};
}

/** Comprueba que el estado pertenece a esta hoja; no se remapea silenciosamente. */
export function validateAdventureState(value:unknown,sheet:CalculatedFighterSheet):AdventureState{
  if(!isRecord(value))throw new RangeError('Estado de partida inválido');
  onlyKeys(value,['fighter','temporaryHitPoints','spentHitDice','combat','survival','magicWards'],'Estado de partida');
  if(!isRecord(value.fighter))throw new RangeError('Estado del Guerrero inválido');
  onlyKeys(value.fighter,['fighterLevel','hitPoints','resources'],'Estado del Guerrero');
  if(!isRecord(value.fighter.hitPoints))throw new RangeError('PG inválidos');
  onlyKeys(value.fighter.hitPoints,['current','maximum'],'PG');
  if(!isRecord(value.fighter.resources))throw new RangeError('Recursos inválidos');
  onlyKeys(value.fighter.resources,['second_wind','action_surge','indomitable'],'Recursos');
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
  const combat=value.combat===undefined?initialCombatState():validateCombatState(value.combat);
  const magicWards=value.magicWards===undefined?[]:validateMagicWards(value.magicWards);
  const survival=value.survival===undefined?initialSurvivalState():validateSurvivalState(value.survival,fighter.hitPoints.current);
  if(survival.concentration&&!conditionCapabilities(combat.conditions??initialConditionLedger()).canConcentrate)
    throw new RangeError('No puedes mantener concentración mientras estás incapacitado');
  return {fighter:{fighterLevel:fighter.fighterLevel,hitPoints:{...fighter.hitPoints},resources:{
    second_wind:{current:fighter.resources.second_wind!.current},
    ...(fighter.fighterLevel>=2?{action_surge:{current:fighter.resources.action_surge!.current}}:{}),
    ...(fighter.fighterLevel>=9?{indomitable:{current:fighter.resources.indomitable!.current}}:{})
  }},temporaryHitPoints,spentHitDice,combat,survival,magicWards};
}

function withHp(state:AdventureState,current:number):AdventureState{
  return {...state,fighter:{...state.fighter,hitPoints:{...state.fighter.hitPoints,current}}};
}
function withFighter(state:AdventureState,fighter:FighterState):AdventureState{
  return {...state,fighter};
}
/** Beneficio de Fortaleza voluntario: solo una curación adicional hasta el inicio del turno siguiente. */
function fortitudeHealing(state:AdventureState,sheet:CalculatedFighterSheet,useBonus:boolean):Readonly<{bonus:number;combat:CombatState}>{
  if(!useBonus)return {bonus:0,combat:state.combat};
  if(sheet.level<19||!sheet.features.includes('epic_boon_fortitude'))throw new RangeError('El personaje no tiene Fortaleza épica');
  if(state.combat.fortitudeHealUsed)throw new RangeError('Fortaleza épica ya usada antes del siguiente turno');
  return {bonus:Math.max(0,sheet.abilityModifiers.constitution),combat:{...state.combat,fortitudeHealUsed:true}};
}
function requireConscious(state:AdventureState,activity:string):void{
  if(state.survival?.death.dead)throw new RangeError(`${activity}: el personaje está muerto`);
  if(state.fighter.hitPoints.current===0)throw new RangeError(`${activity}: el personaje está a 0 PG`);
  const caps=conditionCapabilities(state.combat.conditions??initialConditionLedger());
  if(caps.deadByExhaustion)throw new RangeError(`${activity}: agotamiento 6 equivale a muerte`);
}
/** Fusiona cambios de ronda y condición sin borrar la concentración silenciosamente. */
export function updateAdventureCombat(source:AdventureState,updated:CombatState,sheet:CalculatedFighterSheet):AdventureState{
  const state=validateAdventureState(source,sheet);
  const combat=validateCombatState(updated);
  if(combat.round!==state.combat.round&&combat.round!==state.combat.round+1)
    throw new RangeError('Solo se puede avanzar una ronda a la vez');
  let survival=state.survival!;
  if(combat.round>state.combat.round)survival=advanceSurvivalRound(survival);
  if(!conditionCapabilities(combat.conditions??initialConditionLedger()).canConcentrate)
    survival={...survival,concentration:null};
  const turnBefore=state.combat.turn?.number??0;
  const newTurn=combat.turn?.number??0;
  const startsOwnTurn=newTurn>turnBefore&&combat.turn?.active===true;
  const hp=state.fighter.hitPoints;
  const survivor=sheet.features.includes('champion_survivor');
  const rally=startsOwnTurn&&survivor&&hp.current>0&&hp.current*2<=hp.maximum
    ?Math.max(0,5+sheet.abilityModifiers.constitution):0;
  const fighter=rally?{...state.fighter,hitPoints:{...hp,current:Math.min(hp.maximum,hp.current+rally)}}:state.fighter;
  return {...state,fighter,combat,survival};
}

/** Ejecuta una acción de partida. Jamás modifica ni el estado ni la hoja recibidos. */
export function applyAdventureAction(source:AdventureState,action:AdventureAction,sheet:CalculatedFighterSheet):AdventureResult{
  const state=validateAdventureState(source,sheet);
  if(!isRecord(action))throw new RangeError('Acción inválida');
  switch(action.type){
    case 'damage':{
      onlyKeys(action,['type','amount','critical'],'Daño');
      const amount=requireInteger(action.amount,'Daño',1,100_000);
      if(action.critical!==undefined&&typeof action.critical!=='boolean')throw new RangeError('Crítico debe ser booleano');
      if(state.survival!.death.dead)throw new RangeError('El personaje ya está muerto');
      const absorbed=Math.min(amount,state.temporaryHitPoints);
      const damageTaken=amount-absorbed;
      const currentHP=state.fighter.hitPoints.current;
      const hpLoss=Math.min(currentHP,damageTaken);
      const nextHP=currentHP-hpLoss;
      let survival=state.survival!;
      let detail='';
      if(currentHP===0){
        // A 0 PG, cualquier daño recibido añade fallos, incluso si hay PG temporales.
        const outcome=damageAtZero(survival.death,amount,sheet.maximumHitPoints,action.critical===true);
        survival={...survival,death:outcome.death,concentration:null};
        detail=outcome.message;
      } else if(nextHP===0){
        // Solo el daño que sobrepasa los PG actuales puede causar muerte masiva.
        const overkill=damageTaken-currentHP;
        const dead=overkill>=sheet.maximumHitPoints;
        survival={...survival,death:{...resetDeathTrack(),dead},concentration:null};
        detail=dead?'Muerte instantánea por daño masivo.':'Queda inconsciente a 0 PG; comienza a realizar salvaciones de muerte.';
      }else if(survival.concentration){
        // La salvación se resuelve después. Cada fuente de daño se anota por separado.
        survival=recordConcentrationDamage(survival,amount);
        detail=`Concentración: salvación de Constitución pendiente (CD ${concentrationDC(amount)}).`;
      }
      return {state:{...withHp({...state,temporaryHitPoints:state.temporaryHitPoints-absorbed},nextHP),survival},
        description:`Daño ${amount}: ${absorbed} PG temporales absorbidos, ${hpLoss} PG perdidos. ${detail}`};
    }
    case 'heal':{
      onlyKeys(action,['type','amount','fortitudeBonus'],'Curación');
      if(action.fortitudeBonus!==undefined&&typeof action.fortitudeBonus!=='boolean')throw new RangeError('Fortaleza épica requiere verdadero/falso');
      const amount=requireInteger(action.amount,'Curación',1,100_000);
      if(state.survival!.death.dead)throw new RangeError('Un personaje muerto requiere un efecto de resurrección, no curación normal');
      if(action.fortitudeBonus===true&&state.fighter.hitPoints.current===state.fighter.hitPoints.maximum)throw new RangeError('No se puede activar Fortaleza sin recuperar PG');
      const boost=fortitudeHealing(state,sheet,action.fortitudeBonus===true);
      const current=Math.min(state.fighter.hitPoints.maximum,state.fighter.hitPoints.current+amount+boost.bonus);
      const survival=state.fighter.hitPoints.current===0&&current>0?{...state.survival!,death:resetDeathTrack()}:state.survival!;
      return {state:{...withHp(state,current),survival,combat:boost.combat},description:`Curación efectiva: ${current-state.fighter.hitPoints.current} PG${action.fortitudeBonus?' (incluye Fortaleza épica)':''}.`};
    }
    case 'temporary_hp':{
      onlyKeys(action,['type','amount'],'PG temporales');
      const amount=requireInteger(action.amount,'PG temporales',1,100_000);
      if(state.survival!.death.dead)throw new RangeError('El personaje está muerto');
      // El receptor puede mantener los anteriores; aquí conservamos el mayor, nunca se suman.
      return {state:{...state,temporaryHitPoints:Math.max(state.temporaryHitPoints,amount)},description:'PG temporales actualizados (no se acumulan).'};
    }
    case 'second_wind':{
      onlyKeys(action,['type','d10','fortitudeBonus'],'Segundo aliento');
      if(action.fortitudeBonus!==undefined&&typeof action.fortitudeBonus!=='boolean')throw new RangeError('Fortaleza épica requiere verdadero/falso');
      requireConscious(state,'Segundo aliento');
      if(!conditionCapabilities(state.combat.conditions??initialConditionLedger()).canTakeBonusAction)throw new RangeError('Una condición impide usar Segundo aliento');
      if(action.fortitudeBonus===true&&state.fighter.hitPoints.current===state.fighter.hitPoints.maximum)throw new RangeError('Fortaleza requiere recuperar PG');
      const boost=fortitudeHealing(state,sheet,action.fortitudeBonus===true);
      const applied=useSecondWind(state.fighter,requireInteger(action.d10,'d10',1,10));
      const healedState=boost.bonus?{...applied.state,hitPoints:{...applied.state.hitPoints,current:Math.min(sheet.maximumHitPoints,applied.state.hitPoints.current+boost.bonus)}}:applied.state;
      const combat=state.combat.turn?.active?spendCombatSlot(boost.combat,'bonus'):boost.combat;
      return {state:{...withFighter(state,healedState),combat},description:`Segundo aliento: +${healedState.hitPoints.current-state.fighter.hitPoints.current} PG efectivos y un uso gastado${action.fortitudeBonus?' (incluye Fortaleza épica)':''}.`};
    }
    case 'action_surge':{
      onlyKeys(action,['type'],'Acción súbita');
      requireConscious(state,'Acción súbita');
      if(!conditionCapabilities(state.combat.conditions??initialConditionLedger()).canTakeAction)throw new RangeError('Una condición impide usar Acción súbita');
      const fighter=spendFighterResource(state.fighter,'action_surge');
      const combat=state.combat.turn?.active?grantCombatActionSurge(state.combat):state.combat;
      return {state:{...withFighter(state,fighter),combat},description:'Acción súbita consumida. La acción extra no puede utilizarse para la acción Magia.'};
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
    case 'indomitable':{
      onlyKeys(action,['type','originalTotal','difficultyClass','ability','d20','extraBonus'],'Indomable');
      if(sheet.level<9)throw new RangeError('Indomable requiere Guerrero nivel 9');
      // Salvaciones de muerte: reglas específicas; deben resolverse desde su panel.
      requireConscious(state,'Indomable (salvación ordinaria)');
      if(!ABILITIES.includes(action.ability))throw new RangeError('Característica de salvación inválida');
      const original=requireInteger(action.originalTotal,'Resultado fallido',-1000,1000);
      const dc=requireInteger(action.difficultyClass,'CD de salvación',1,1000);
      const d20=requireInteger(action.d20,'Nuevo d20',1,20);
      const extra=action.extraBonus===undefined?0:requireInteger(action.extraBonus,'Modificador situacional',-100,100);
      if(original>=dc)throw new RangeError('Indomable requiere una salvación fallida');
      const exhaustion=state.combat.conditions?.exhaustion??0;
      const total=d20+sheet.savingThrowBonuses[action.ability]-2*exhaustion+extra+sheet.level;
      const fighter=spendFighterResource(state.fighter,'indomitable');
      return {state:withFighter(state,fighter),description:`Indomable: nueva tirada ${d20} + salvación ${sheet.savingThrowBonuses[action.ability]} + nivel ${sheet.level}${exhaustion?` − agotamiento ${exhaustion*2}`:''}${extra?` ${extra>=0?'+':''}${extra} situacional`:''} = ${total} contra CD ${dc}. ${total>=dc?'Éxito.':'Fallo.'} Debes usar la nueva tirada; Indomable gastado.`};
    }
    case 'short_rest':{
      onlyKeys(action,['type','hitDieRolls','fortitudeBonus'],'Descanso corto');
      if(action.fortitudeBonus!==undefined&&typeof action.fortitudeBonus!=='boolean')throw new RangeError('Fortaleza épica requiere verdadero/falso');
      requireConscious(state,'Descanso corto');
      if(!Array.isArray(action.hitDieRolls)||action.hitDieRolls.length>sheet.hitDice.total-state.spentHitDice)
        throw new RangeError('No hay suficientes dados de golpe disponibles');
      if(action.fortitudeBonus===true&&action.hitDieRolls.length===0)throw new RangeError('Fortaleza requiere curación con dados de golpe');
      let current=state.fighter.hitPoints.current;
      for(const raw of action.hitDieRolls){
        const die=requireInteger(raw,'Tirada de dado de golpe d10',1,10);
        current=Math.min(state.fighter.hitPoints.maximum,current+Math.max(1,die+sheet.abilityModifiers.constitution));
      }
      if(action.fortitudeBonus===true&&current===state.fighter.hitPoints.current)throw new RangeError('Fortaleza requiere recuperar PG');
      const boost=fortitudeHealing(state,sheet,action.fortitudeBonus===true&&action.hitDieRolls.length>0);
      current=Math.min(sheet.maximumHitPoints,current+boost.bonus);
      const fighter=finishFighterRest(withHp(state,current).fighter,'short_rest');
      return {state:{...state,fighter,combat:boost.combat,spentHitDice:state.spentHitDice+action.hitDieRolls.length},description:`Descanso corto: ${action.hitDieRolls.length} dados gastados; recuperas ${current-state.fighter.hitPoints.current} PG y los recursos del Guerrero correspondientes.`};
    }
    case 'long_rest':{
      onlyKeys(action,['type'],'Descanso largo');
      requireConscious(state,'Descanso largo');
      const restored=finishFighterRest(withHp(state,state.fighter.hitPoints.maximum).fighter,'long_rest');
      return {state:{fighter:restored,temporaryHitPoints:0,spentHitDice:0,
        survival:{...state.survival!,concentration:null},
        combat:{...state.combat,effects:state.combat.effects.filter(e=>e.remainingRounds===null),...(state.combat.conditions?{conditions:longRestConditionUpdate(state.combat.conditions)}:{})}},
        description:'Descanso largo: PG y dados de golpe restaurados; recursos recuperados, concentración finalizada y PG temporales eliminados.'};
    }
    case 'death_save':{
      onlyKeys(action,['type','d20','secondD20'],'Salvación de muerte');
      if(state.fighter.hitPoints.current!==0)throw new RangeError('Las salvaciones de muerte solo se realizan a 0 PG');
      const survivor=sheet.features.includes('champion_survivor');
      const first=requireInteger(action.d20,'Primer d20',1,20);
      if(survivor&&action.secondD20===undefined)throw new RangeError('Superviviente concede ventaja: introduce ambos d20');
      if(!survivor&&action.secondD20!==undefined)throw new RangeError('El segundo d20 requiere Superviviente');
      const natural=survivor?Math.max(first,requireInteger(action.secondD20,'Segundo d20',1,20)):first;
      const result=deathSavingThrow(state.survival!.death,natural,-2*(state.combat.conditions?.exhaustion??0),survivor);
      const next=result.regainHP?withHp(state,1):state;
      return {state:{...next,survival:{...state.survival!,death:result.death}},description:result.message};
    }
    case 'stabilize':{
      onlyKeys(action,['type','medicineTotal'],'Estabilización');
      if(state.fighter.hitPoints.current!==0)throw new RangeError('Solo se estabiliza a 0 PG');
      const r=stabilize(state.survival!.death,action.medicineTotal);
      return {state:{...state,survival:{...state.survival!,death:r.death}},description:r.message};
    }
    case 'recover_stable':{
      onlyKeys(action,['type','d4','hoursElapsed'],'Recuperación estable');
      if(state.fighter.hitPoints.current!==0)throw new RangeError('El personaje ya tiene PG');
      recoverFromStable(state.survival!.death,action.d4,action.hoursElapsed);
      return {state:{...withHp(state,1),survival:{...state.survival!,death:resetDeathTrack()}},description:'Tras el tiempo indicado por 1d4 horas, recupera 1 PG.'};
    }
    case 'start_concentration':{
      onlyKeys(action,['type','name','rounds'],'Iniciar concentración');
      requireConscious(state,'Concentración');
      if(!conditionCapabilities(state.combat.conditions??initialConditionLedger()).canConcentrate)throw new RangeError('No puedes concentrarte estando incapacitado');
      const survival=startConcentration(state.survival!,action.name,action.rounds);
      return {state:{...state,survival},description:`Concentración iniciada: ${survival.concentration!.name}. Sustituye la concentración previa.`};
    }
    case 'end_concentration':{
      onlyKeys(action,['type'],'Terminar concentración');
      return {state:{...state,survival:{...state.survival!,concentration:null}},description:'Concentración finalizada voluntariamente.'};
    }
    case 'concentration_save':{
      onlyKeys(action,['type','d20','extraBonus'],'Salvación de concentración');
      const d20=requireInteger(action.d20,'d20 seleccionado',1,20);
      const extra=action.extraBonus===undefined?0:requireInteger(action.extraBonus,'Modificador adicional',-100,100);
      const exhaustion=state.combat.conditions?.exhaustion??0;
      const total=d20+sheet.savingThrowBonuses.constitution-2*exhaustion+extra;
      const r=resolveConcentration(state.survival!,total);
      return {state:{...state,survival:r.state},description:`Concentración CD ${r.dc}: ${d20} + ${sheet.savingThrowBonuses.constitution} por salvación de Constitución ${exhaustion?`− ${2*exhaustion} por agotamiento`:''} ${extra?`${extra>=0?'+':''}${extra} situacional`:''} = ${total}. ${r.passed?'Se mantiene.':'Se pierde.'}`};
    }
    default:throw new RangeError('Acción de partida no admitida');
  }
}

/** Devuelve los máximos sin guardar nuevos valores. */
export function resourceDisplay(state:AdventureState,sheet:CalculatedFighterSheet):Readonly<Partial<Record<FighterResourceId,{current:number;maximum:number}>>>{
  validateAdventureState(state,sheet);
  return sheet.level>=2?{
    second_wind:{current:state.fighter.resources.second_wind!.current,maximum:sheet.resources.second_wind!.maximum},
    action_surge:{current:state.fighter.resources.action_surge!.current,maximum:sheet.resources.action_surge!.maximum},
    ...(sheet.level>=9?{indomitable:{current:state.fighter.resources.indomitable!.current,maximum:sheet.resources.indomitable!.maximum}}:{})
  }:{second_wind:{current:state.fighter.resources.second_wind!.current,maximum:sheet.resources.second_wind!.maximum}};
}

/** Transición explícita entre niveles consecutivos: preserva la sesión sin reiniciar el combate.
 * Los PG ganados usan el nuevo máximo de la hoja, incluyendo cambios retroactivos de CON.
 */
export function advanceAdventureLevel(source:AdventureState,oldSheet:CalculatedFighterSheet,newSheet:CalculatedFighterSheet):AdventureState{
  const before=validateAdventureState(source,oldSheet);
  if(oldSheet.classId!=='fighter'||newSheet.classId!=='fighter'||newSheet.level!==oldSheet.level+1||newSheet.level>19)
    throw new RangeError('Solo se permite subir un nivel del Guerrero hasta 19');
  if(oldSheet.id!==newSheet.id||oldSheet.name!==newSheet.name)throw new RangeError('La progresión debe mantener la identidad del personaje');
  const fighter=advanceFighterLevel(before.fighter,newSheet.level,newSheet.maximumHitPoints);
  return validateAdventureState({...before,fighter},newSheet);
}


/** Sincronización explícita para cambios de PG máximos en el MISMO nivel.
 * Conserva el daño sufrido, recursos gastados, combate, condiciones y registros.
 * No sirve para cambiar de nivel: para ello se utiliza advanceAdventureLevel.
 * Debe ser confirmada por el jugador desde la interfaz cuando resulte necesaria.
 */
export function synchronizeAdventureSheet(source:AdventureState,sheet:CalculatedFighterSheet):AdventureState{
  validateFighterState(source.fighter);
  if(source.fighter.fighterLevel!==sheet.level)
    throw new RangeError('No se puede sincronizar un estado de otro nivel: carga el personaje correcto');
  const previous=source.fighter.hitPoints;
  const delta=sheet.maximumHitPoints-previous.maximum;
  const current=Math.max(0,Math.min(sheet.maximumHitPoints,previous.current+delta));
  const synced:AdventureState={...source,fighter:{...source.fighter,
    hitPoints:{current,maximum:sheet.maximumHitPoints}}};
  return validateAdventureState(synced,sheet);
}
