/** Paso 03: modificadores declarativos con semánticas explícitas. No utiliza eval. */
export type ModifierCondition =
  | Readonly<{ type: 'always' }>
  | Readonly<{ type: 'class_level_at_least'; classId: string; value: number }>;

export type ModifierContext = Readonly<{ classLevels: Readonly<Record<string, number>> }>;
export type NumericModifier = Readonly<{
  type: 'numeric_modifier'; effectId: string; sourceRevisionId: string;
  target: string; when: ModifierCondition;
  operation: 'add' | 'replace_base'; value: number;
  group: string; stacking: 'sum' | 'highest' | 'lowest'; priority: number;
}>;
export type RollModeModifier = Readonly<{
  type: 'roll_mode'; effectId: string; sourceRevisionId: string;
  target: string; when: ModifierCondition; mode: 'advantage' | 'disadvantage';
}>;
export type AdvancedModifier = NumericModifier | RollModeModifier;
export type NumericResult = Readonly<{
  value: number; base: number; effectiveBase: number; additive: number;
  appliedEffectIds: readonly string[];
}>;
export type RollModeResult = Readonly<{
  mode: 'normal' | 'advantage' | 'disadvantage';
  advantageSources: readonly string[]; disadvantageSources: readonly string[];
}>;

const targetPattern = /^(?:initiative|armor_class|attack_roll|ability_check|saving_throw|skills\.[a-z_]+|saving_throws\.(?:strength|dexterity|constitution|intelligence|wisdom|charisma))$/;
const identifierPattern = /^[A-Za-z0-9:_@./-]{1,160}$/;
function obj(v: unknown, label: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new TypeError(`${label}: objeto requerido`);
  return v as Record<string, unknown>;
}
function only(v: Record<string, unknown>, keys: readonly string[], label: string): void {
  if (Object.keys(v).length !== keys.length || keys.some(k => !Object.prototype.hasOwnProperty.call(v, k)) || Object.keys(v).some(k => !keys.includes(k))) {
    throw new TypeError(`${label}: campos inesperados o ausentes`);
  }
}
function id(v: unknown, name: string): string {
  if (typeof v !== 'string' || !identifierPattern.test(v)) throw new TypeError(`${name}: identificador inválido`);
  return v;
}
function finite(v: unknown, name: string, min = -10000, max = 10000): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < min || v > max) throw new RangeError(`${name}: entero inválido`);
  return v;
}
function parseCondition(v: unknown): ModifierCondition {
  const c = obj(v, 'when');
  if (c.type === 'always') { only(c, ['type'], 'when'); return { type: 'always' }; }
  if (c.type === 'class_level_at_least') {
    only(c, ['type', 'classId', 'value'], 'when');
    return { type: 'class_level_at_least', classId: id(c.classId, 'classId'), value: finite(c.value, 'level', 1, 20) };
  }
  throw new TypeError('Condición no admitida');
}
export function parseAdvancedModifier(v: unknown): AdvancedModifier {
  const e = obj(v, 'modifier');
  if (e.type === 'roll_mode') {
    only(e, ['type', 'effectId', 'sourceRevisionId', 'target', 'when', 'mode'], 'roll_mode');
    const target = id(e.target, 'target');
    if (!targetPattern.test(target) || target === 'armor_class') throw new TypeError('Destino de tirada inválido');
    if (e.mode !== 'advantage' && e.mode !== 'disadvantage') throw new TypeError('Modo inválido');
    return { type: 'roll_mode', effectId: id(e.effectId, 'effectId'), sourceRevisionId: id(e.sourceRevisionId, 'sourceRevisionId'), target, when: parseCondition(e.when), mode: e.mode };
  }
  if (e.type === 'numeric_modifier') {
    only(e, ['type', 'effectId', 'sourceRevisionId', 'target', 'when', 'operation', 'value', 'group', 'stacking', 'priority'], 'numeric_modifier');
    const target = id(e.target, 'target');
    if (!targetPattern.test(target)) throw new TypeError('Destino numérico inválido');
    if (e.operation !== 'add' && e.operation !== 'replace_base') throw new TypeError('Operación inválida');
    if (e.stacking !== 'sum' && e.stacking !== 'highest' && e.stacking !== 'lowest') throw new TypeError('Política de acumulación inválida');
    const stacking = e.stacking;
    if (e.operation === 'replace_base' && stacking !== 'sum') throw new TypeError('replace_base requiere stacking sum (no se usa para acumular)');
    return { type: 'numeric_modifier', effectId: id(e.effectId, 'effectId'), sourceRevisionId: id(e.sourceRevisionId, 'sourceRevisionId'), target, when: parseCondition(e.when), operation: e.operation, value: finite(e.value, 'value'), group: id(e.group, 'group'), stacking, priority: finite(e.priority, 'priority', -100, 100) };
  }
  throw new TypeError('Tipo de modificador no admitido');
}
function parseAll(effects: readonly unknown[], context: ModifierContext): readonly AdvancedModifier[] {
  if (!Array.isArray(effects) || effects.length > 500) throw new RangeError('Demasiados efectos');
  const levels = obj(context.classLevels, 'classLevels');
  for (const [name, value] of Object.entries(levels)) { id(name, 'classId'); finite(value, 'nivel de clase', 0, 20); }
  const parsed = effects.map(parseAdvancedModifier);
  const seen = new Set<string>();
  for (const e of parsed) {
    const key = JSON.stringify([e.sourceRevisionId, e.effectId]);
    if (seen.has(key)) throw new TypeError(`Efecto duplicado: ${e.effectId}`);
    seen.add(key);
  }
  return parsed;
}
function active(e: AdvancedModifier, context: ModifierContext): boolean {
  return e.when.type === 'always' || (context.classLevels[e.when.classId] ?? 0) >= e.when.value;
}
/** Resuelve la estadística indicada. La política de cada grupo debe concordar. */
export function resolveNumericModifiers(base: number, target: string, effects: readonly unknown[], context: ModifierContext): NumericResult {
  finite(base, 'base');
  if (!targetPattern.test(target)) throw new TypeError('Destino inválido');
  const applicable = parseAll(effects, context).filter((e): e is NumericModifier => e.type === 'numeric_modifier' && e.target === target && active(e, context));
  const replaces = applicable.filter(e => e.operation === 'replace_base').sort((a,b) => b.priority - a.priority || a.sourceRevisionId.localeCompare(b.sourceRevisionId) || a.effectId.localeCompare(b.effectId));
  const top = replaces[0];
  if (top && replaces.some(e => e.priority === top.priority && e.value !== top.value)) throw new Error('Reemplazos de base contradictorios con igual prioridad');
  const effectiveBase = top ? top.value : base;
  const groups = new Map<string, NumericModifier[]>();
  for (const effect of applicable.filter(e => e.operation === 'add')) groups.set(effect.group, [...(groups.get(effect.group) ?? []), effect]);
  let additive = 0;
  const applied: string[] = top ? [`${top.sourceRevisionId}::${top.effectId}`] : [];
  for (const [group, entries] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))) {
    if (entries.some(e => e.stacking !== entries[0].stacking)) throw new Error(`Políticas incompatibles en grupo ${group}`);
    const stacking = entries[0].stacking;
    if (stacking === 'sum') { additive += entries.reduce((sum,e)=>sum+e.value,0); applied.push(...entries.map(e=>`${e.sourceRevisionId}::${e.effectId}`)); }
    else {
      const sorted = [...entries].sort((a,b)=>stacking === 'highest' ? b.value-a.value : a.value-b.value);
      const selected = sorted[0];
      additive += selected.value;
      applied.push(`${selected.sourceRevisionId}::${selected.effectId}`);
    }
  }
  return { base, effectiveBase, additive, value: effectiveBase + additive, appliedEffectIds: applied };
}
/** Ventaja y desventaja no se apilan: si ambas existen se cancelan, con independencia de cuántas fuentes haya. */
export function resolveRollMode(target: string, effects: readonly unknown[], context: ModifierContext): RollModeResult {
  if (!targetPattern.test(target) || target === 'armor_class') throw new TypeError('Destino de tirada inválido');
  const applicable = parseAll(effects, context).filter((e): e is RollModeModifier => e.type === 'roll_mode' && e.target === target && active(e, context));
  const adv = applicable.filter(e=>e.mode === 'advantage').map(e=>`${e.sourceRevisionId}::${e.effectId}`).sort();
  const dis = applicable.filter(e=>e.mode === 'disadvantage').map(e=>`${e.sourceRevisionId}::${e.effectId}`).sort();
  return { mode: adv.length && dis.length ? 'normal' : adv.length ? 'advantage' : dis.length ? 'disadvantage' : 'normal', advantageSources: adv, disadvantageSources: dis };
}
