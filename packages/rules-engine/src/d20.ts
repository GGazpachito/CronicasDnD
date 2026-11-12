/** Actualización 38: tiradas explícitas de d20, independientes del estado de partida.
 * El motor recibe números de dado y los resuelve; la interfaz solo solicita la tirada.
 */
export type D20Mode = 'normal' | 'advantage' | 'disadvantage';

export type D20Result = Readonly<{
  /** Modos de la hoja y de la circunstancia (sin modificar ninguno de los dos). */
  sheetMode: D20Mode;
  circumstanceMode: D20Mode;
  /** Ventaja y desventaja opuestas se anulan. */
  mode: D20Mode;
  dice: readonly number[];
  chosen: number;
  modifier: number;
  total: number;
}>;

function validateMode(mode: string): asserts mode is D20Mode {
  if (mode !== 'normal' && mode !== 'advantage' && mode !== 'disadvantage') {
    throw new TypeError('Modo de tirada inválido');
  }
}

/** Una fuente de ventaja y una de desventaja se cancelan, aunque existan más fuentes. */
export function combineD20Modes(sheetMode: D20Mode, circumstanceMode: D20Mode): D20Mode {
  validateMode(sheetMode);
  validateMode(circumstanceMode);
  if (sheetMode === 'normal') return circumstanceMode;
  if (circumstanceMode === 'normal') return sheetMode;
  return sheetMode === circumstanceMode ? sheetMode : 'normal';
}

/** Resuelve exactamente los resultados lanzados. No decide éxitos ni altera recursos. */
export function resolveD20(
  modifier: number,
  sheetMode: D20Mode,
  circumstanceMode: D20Mode,
  dice: readonly number[],
): D20Result {
  if (!Number.isSafeInteger(modifier) || modifier < -10000 || modifier > 10000) {
    throw new RangeError('Modificador inválido');
  }
  const mode = combineD20Modes(sheetMode, circumstanceMode);
  const expected = mode === 'normal' ? 1 : 2;
  if (!Array.isArray(dice) || dice.length !== expected || dice.some(d => !Number.isInteger(d) || d < 1 || d > 20)) {
    throw new RangeError(`Se requieren ${expected} resultado(s) de d20 entre 1 y 20`);
  }
  const chosen = mode === 'advantage' ? Math.max(...dice) : mode === 'disadvantage' ? Math.min(...dice) : dice[0];
  return { sheetMode, circumstanceMode, mode, dice: [...dice], chosen, modifier, total: chosen + modifier };
}

/** Dado uniforme usando Web Crypto con muestreo por rechazo (evita sesgo de módulo). */
export function secureD20(): number {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Este navegador no dispone de un generador de dados seguro');
  }
  const word = new Uint32Array(1);
  const range = 0x100000000;
  const cutoff = range - (range % 20);
  do {
    globalThis.crypto.getRandomValues(word);
  } while (word[0] >= cutoff);
  return (word[0] % 20) + 1;
}

/** Genera dados solo cuando se invoca explícitamente desde un control. */
export function rollD20(
  modifier: number,
  sheetMode: D20Mode,
  circumstanceMode: D20Mode = 'normal',
  draw: () => number = secureD20,
): D20Result {
  const mode = combineD20Modes(sheetMode, circumstanceMode);
  // Validar el bono antes de consumir aleatoriedad.
  if (!Number.isSafeInteger(modifier) || modifier < -10000 || modifier > 10000) {
    throw new RangeError('Modificador inválido');
  }
  const dice = Array.from({ length: mode === 'normal' ? 1 : 2 }, draw);
  return resolveD20(modifier, sheetMode, circumstanceMode, dice);
}
