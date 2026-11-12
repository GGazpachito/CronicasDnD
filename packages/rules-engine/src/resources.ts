/** Paso 05. Recursos persistentes del Guerrero (niveles 1-17), D&D 2024.
 * Funciones puras. Ninguna operación restaura recursos salvo descansos explícitos.
 */
export type FighterResourceId = 'second_wind' | 'action_surge' | 'indomitable';
export type ResourceState = Readonly<{ current: number }>;
export type FighterResources = Readonly<Partial<Record<FighterResourceId, ResourceState>>>;
export type FighterState = Readonly<{
  fighterLevel: number;
  hitPoints: Readonly<{ current: number; maximum: number }>;
  resources: FighterResources;
}>;
export type RecoveryReason = 'short_rest' | 'long_rest';

function integer(value: unknown, name: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name}: entero requerido entre ${minimum} y ${maximum}`);
  }
  return value;
}
function fighterLevel(value: number): number { return integer(value, 'fighterLevel', 1, 17); }

/** Los máximos se derivan del nivel, jamás del estado persistido. */
export function fighterResourceMaximum(level: number, id: FighterResourceId): number {
  const n = fighterLevel(level);
  switch (id) {
    case 'second_wind': return n >= 10 ? 4 : n >= 4 ? 3 : 2;
    case 'action_surge': return n >= 17 ? 2 : n >= 2 ? 1 : 0;
    case 'indomitable': return n >= 17 ? 3 : n >= 13 ? 2 : n >= 9 ? 1 : 0;
    default: throw new TypeError('Recurso no reconocido');
  }
}

/** Al crear personaje, todos los recursos desbloqueados empiezan completos. */
export function initialFighterState(level: number, maximumHitPoints: number): FighterState {
  const n = fighterLevel(level);
  const hp = integer(maximumHitPoints, 'maximumHitPoints', 1, 100000);
  return {
    fighterLevel: n,
    hitPoints: { current: hp, maximum: hp },
    resources: {
      second_wind: { current: fighterResourceMaximum(n,'second_wind') },
      ...(n >= 2 ? { action_surge: { current: fighterResourceMaximum(n,'action_surge') } } : {}),
      ...(n >= 9 ? { indomitable: { current: fighterResourceMaximum(n,'indomitable') } } : {}),
    },
  };
}

/** Verifica datos guardados; no corrige silenciosamente estados ilegales. */
export function validateFighterState(value: FighterState): FighterState {
  if (!value || typeof value !== 'object' || !value.hitPoints || !value.resources) {
    throw new TypeError('Estado del Guerrero incompleto');
  }
  const level = fighterLevel(value.fighterLevel);
  const maxHp = integer(value.hitPoints.maximum, 'PG máximos', 1, 100000);
  integer(value.hitPoints.current, 'PG actuales', 0, maxHp);
  if (!value.resources.second_wind) throw new TypeError('Falta Segundo aliento');
  const allowed: FighterResourceId[] = ['second_wind',...(level>=2?['action_surge' as const]:[]),...(level>=9?['indomitable' as const]:[])];
  if (Object.keys(value.resources).some(k => !allowed.includes(k as FighterResourceId))) {
    throw new TypeError('El personaje contiene recursos no desbloqueados o desconocidos');
  }
  for (const id of allowed) {
    const state = value.resources[id];
    if (!state) throw new TypeError(`Falta recurso ${id}`);
    integer(state.current, `Usos ${id}`, 0, fighterResourceMaximum(level, id));
  }
  return value;
}

function changeResource(state: FighterState, id: FighterResourceId, newCount: number): FighterState {
  return {
    ...state,
    resources: { ...state.resources, [id]: { current: newCount } },
  };
}

export function spendFighterResource(state: FighterState, id: FighterResourceId): FighterState {
  validateFighterState(state);
  const maximum = fighterResourceMaximum(state.fighterLevel, id);
  if (!maximum) throw new RangeError(`${id} no disponible en este nivel`);
  const count = state.resources[id]!.current;
  if (count === 0) throw new RangeError(`No quedan usos de ${id}`);
  return changeResource(state, id, count - 1);
}

/** No consume dado de golpe ni cura PG. Esas reglas se implementarán por separado. */
export function finishFighterRest(state: FighterState, rest: RecoveryReason): FighterState {
  validateFighterState(state);
  if (rest !== 'short_rest' && rest !== 'long_rest') throw new TypeError('Descanso no reconocido');
  const currentSecondWind = state.resources.second_wind!.current;
  const maxWind=fighterResourceMaximum(state.fighterLevel,'second_wind');
  const secondWind = rest === 'long_rest' ? maxWind : Math.min(maxWind, currentSecondWind + 1);
  const next = changeResource(state, 'second_wind', secondWind);
  if (state.fighterLevel === 1) return next;
  const surged=changeResource(next, 'action_surge', fighterResourceMaximum(state.fighterLevel,'action_surge'));
  return rest==='long_rest'&&state.fighterLevel>=9?changeResource(surged,'indomitable',fighterResourceMaximum(state.fighterLevel,'indomitable')):surged;
}

/** Segundo aliento: bonificación + nivel de Guerrero, siempre como acción adicional.
 * El d10 llega ya resuelto desde la interfaz o un servicio de dados.
 */
export function useSecondWind(state: FighterState, d10: number): Readonly<{ state: FighterState; healed: number }> {
  validateFighterState(state);
  integer(d10, 'Tirada d10', 1, 10);
  const afterCost = spendFighterResource(state, 'second_wind');
  const before = state.hitPoints.current;
  const current = Math.min(state.hitPoints.maximum, before + d10 + state.fighterLevel);
  return {
    state: { ...afterCost, hitPoints: { ...state.hitPoints, current } },
    healed: current - before,
  };
}

/** Acción súbita no permite tomar la acción Magia como acción adicional. */
export function useActionSurge(state: FighterState, extraAction: string): FighterState {
  validateFighterState(state);
  if (typeof extraAction !== 'string' || !extraAction.trim()) throw new TypeError('Acción requerida');
  if (extraAction.trim().toLowerCase() === 'magic') throw new RangeError('Acción súbita no permite la acción Magia');
  return spendFighterResource(state, 'action_surge');
}

/** Mente táctica solo se activa tras fallar una prueba de característica.
 * Si la mejora no alcanza la CD, conserva Segundo aliento.
 */
export function useTacticalMind(
  state: FighterState,
  check: Readonly<{ originalTotal: number; difficultyClass: number; d10: number }>,
): Readonly<{ state: FighterState; finalTotal: number; success: boolean; spent: boolean }> {
  validateFighterState(state);
  if (state.fighterLevel < 2) throw new RangeError('Mente táctica requiere Guerrero nivel 2');
  const original = integer(check.originalTotal, 'Resultado de prueba', -1000, 1000);
  const dc = integer(check.difficultyClass, 'CD', 0, 1000);
  const die = integer(check.d10, 'Tirada d10', 1, 10);
  if (original >= dc) throw new RangeError('Mente táctica requiere una prueba fallida');
  if (state.resources.second_wind!.current === 0) throw new RangeError('No quedan usos de Segundo aliento');
  const finalTotal = original + die;
  const success = finalTotal >= dc;
  return { state: success ? spendFighterResource(state, 'second_wind') : state, finalTotal, success, spent: success };
}

/** Al subir de nivel, conserva usos gastados; habilita recursos recién adquiridos.
 * Los PG máximos los proporciona defense.ts tras recalcularlos. */
export function advanceFighterLevel(state: FighterState, nextLevel: number, newMaximumHp: number): FighterState {
  validateFighterState(state);
  const level = fighterLevel(nextLevel);
  if (level !== state.fighterLevel + 1) throw new RangeError('Solo se permite subir exactamente un nivel');
  const maximum = integer(newMaximumHp, 'PG máximos', 1, 100000);
  if (maximum < state.hitPoints.maximum) throw new RangeError('Los PG máximos no pueden disminuir al subir de nivel en este caso');
  return {
    fighterLevel: level,
    hitPoints: { current: Math.min(maximum, state.hitPoints.current + (maximum - state.hitPoints.maximum)), maximum },
    resources: {
      ...state.resources,
      second_wind:{current:Math.min(fighterResourceMaximum(level,'second_wind'),
        state.resources.second_wind!.current+fighterResourceMaximum(level,'second_wind')-fighterResourceMaximum(state.fighterLevel,'second_wind'))},
      ...(level === 2 ? { action_surge: { current: 1 } } : {}),
      ...(level === 9 ? { indomitable: { current: 1 } } : {}),
      ...(level === 13 ? { indomitable: { current: Math.min(2,(state.resources.indomitable?.current??0)+1) } } : {}),
      ...(level === 17 ? {
        action_surge:{current:Math.min(2,(state.resources.action_surge?.current??0)+1)},
        indomitable:{current:Math.min(3,(state.resources.indomitable?.current??0)+1)},
      } : {}),
    },
  };
}
