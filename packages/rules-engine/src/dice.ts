/** Actualización 39. Tiradas de dados genéricas, uniformes y solicitadas por el jugador.
 * Se usa Web Crypto con rechazo para no introducir sesgo de módulo.
 */
export function rollDie(sides: number, draw?: () => number): number {
  if (!Number.isSafeInteger(sides) || sides < 2 || sides > 1000) {
    throw new RangeError('El dado debe tener entre 2 y 1000 caras');
  }
  if (draw !== undefined) {
    const result = draw();
    if (!Number.isSafeInteger(result) || result < 1 || result > sides) {
      throw new RangeError(`La tirada del d${sides} debe estar entre 1 y ${sides}`);
    }
    return result;
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Este navegador no dispone de un generador de dados seguro');
  }
  const word = new Uint32Array(1);
  const range = 0x100000000;
  const cutoff = range - (range % sides);
  do {
    globalThis.crypto.getRandomValues(word);
  } while (word[0] >= cutoff);
  return (word[0] % sides) + 1;
}
