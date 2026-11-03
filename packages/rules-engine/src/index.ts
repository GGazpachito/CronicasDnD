/** Motor de reglas: aquí se implementarán funciones puras y deterministas. */
export function abilityModifier(score: number): number {
  if (!Number.isInteger(score) || score < 1 || score > 30) throw new Error("Puntuación no válida");
  return Math.floor((score - 10) / 2);
}
