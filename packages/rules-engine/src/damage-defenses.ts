/** Paso 20. Defensas frente al daño: fuentes declarativas y sin acumulación.
 * PHB 2024, capítulos 1 y 4. Solo el Enano concede una resistencia
 * automática entre las tres especies del MVP. Ninguna armadura común concede
 * resistencias por sí sola.
 */
import type {SpeciesId} from './guided';
import type {InventoryItemId,InventoryState} from './inventory';
import type {IncomingDamageType,DamageMitigation} from './incoming';
import {collectMagicWardDefenses,type MagicWardEntry} from './magic-wards';

export type DefenseKind='resistance'|'vulnerability'|'immunity';
export type DefenseEquipmentSlot='armor'|'shield';
export type DeclaredDamageDefense=Readonly<{
  id:string;
  source:string;
  damageType:IncomingDamageType;
  kind:DefenseKind;
  /** Si se indica, la propiedad solo funciona con este objeto equipado. */
  requiresEquipped?:Readonly<{slot:DefenseEquipmentSlot;itemId:InventoryItemId}>;
}>;
export type DefenseContext=Readonly<{
  species?:SpeciesId;
  inventory?:InventoryState;
  /** Para contenido futuro: únicamente declaraciones revisadas por la aplicación. */
  grants?:readonly DeclaredDamageDefense[];
  /** Procedencia persistente de objetos mágicos del SRD 5.2.1. */
  magicWards?:readonly MagicWardEntry[];
}>;
export type EffectiveDamageDefense=Readonly<{
  mitigation:DamageMitigation;
  sources:readonly string[];
}>;

const TYPES:ReadonlySet<string>=new Set([
  'acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing',
  'poison','psychic','radiant','slashing','thunder'
]);
const KINDS:ReadonlySet<string>=new Set(['resistance','vulnerability','immunity']);
function fail(message:string):never {throw new RangeError(message);}
function isRecord(value:unknown):value is Record<string,unknown> {
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
const DWARF_POISON:DeclaredDamageDefense={
  id:'phb2024:dwarf:dwarven_resilience',source:'Resistencia enana',
  damageType:'poison',kind:'resistance'
};

/** Recoge rasgos de especie y definiciones del catálogo cuando se cumplen los requisitos.
 * Nunca inventa defensas para armaduras mundanas.
 */
export function collectDamageDefenses(context:DefenseContext={}):readonly DeclaredDamageDefense[]{
  if(!isRecord(context))fail('Contexto defensivo inválido');
  if(Object.keys(context).some(k=>!['species','inventory','grants','magicWards'].includes(k)))fail('Contexto defensivo con campos desconocidos');
  if(context.species!==undefined&&!['human','dwarf','elf'].includes(context.species))fail('Especie desconocida');
  if(context.grants!==undefined&&(!Array.isArray(context.grants)||context.grants.length>40))fail('Demasiadas defensas declaradas');
  const grants:DeclaredDamageDefense[]=[];
  if(context.species==='dwarf')grants.push(DWARF_POISON);
  grants.push(...collectMagicWardDefenses(context.inventory?.magicItems??[]));
  // Entrada anterior a la unificación: continúa admitida para guardados v2 existentes.
  grants.push(...collectMagicWardDefenses(context.magicWards??[]));
  const seen=new Set(grants.map(x=>x.id));
  for(const raw of context.grants??[]){
    if(!isRecord(raw)||Object.keys(raw).some(k=>!['id','source','damageType','kind','requiresEquipped'].includes(k)))fail('Declaración defensiva mal formada');
    if(typeof raw.id!=='string'||!raw.id.trim()||raw.id.length>100||seen.has(raw.id))fail('ID de defensa inválido o duplicado');
    seen.add(raw.id);
    if(typeof raw.source!=='string'||!raw.source.trim()||raw.source.length>100)fail('Fuente defensiva inválida');
    if(typeof raw.damageType!=='string'||!TYPES.has(raw.damageType))fail('Tipo de daño desconocido');
    if(typeof raw.kind!=='string'||!KINDS.has(raw.kind))fail('Defensa desconocida');
    if(raw.requiresEquipped!==undefined){
      if(!isRecord(raw.requiresEquipped)||Object.keys(raw.requiresEquipped).some(k=>!['slot','itemId'].includes(k)))fail('Requisito de equipo inválido');
      const requirement=raw.requiresEquipped;
      if(!['armor','shield'].includes(requirement.slot as string)||typeof requirement.itemId!=='string')fail('Ranura o equipo inválido');
      const inventory=context.inventory;
      if(!inventory)continue;
      const owned=inventory.items.some(x=>x.id===requirement.itemId&&x.quantity>0);
      const equipped=requirement.slot==='shield'?requirement.itemId==='shield'&&inventory.equipped.shield:
        inventory.equipped.armor===requirement.itemId;
      if(!owned||!equipped)continue;
    }
    grants.push(raw as DeclaredDamageDefense);
  }
  return grants;
}

/** Inmunidad prevalece. Resistencia y vulnerabilidad no se acumulan consigo mismas.
 * El modificador manual se añade a lo declarado, nunca sustituye silenciosamente la especie.
 */
export function resolveDamageDefense(type:IncomingDamageType,grants:readonly DeclaredDamageDefense[],manual:DamageMitigation='normal'):EffectiveDamageDefense{
  if(!TYPES.has(type)||!['normal','resistance','vulnerability','both','immunity'].includes(manual))fail('Defensa no reconocida');
  const active=grants.filter(g=>g.damageType===type);
  const immunity=active.some(g=>g.kind==='immunity')||manual==='immunity';
  const resistance=active.some(g=>g.kind==='resistance')||manual==='resistance'||manual==='both';
  const vulnerability=active.some(g=>g.kind==='vulnerability')||manual==='vulnerability'||manual==='both';
  const mitigation:DamageMitigation=immunity?'immunity':resistance&&vulnerability?'both':resistance?'resistance':vulnerability?'vulnerability':'normal';
  const sources=[...new Set(active.map(g=>g.source))];
  if(manual!=='normal')sources.push('Defensa situacional indicada por el jugador');
  return {mitigation,sources};
}

export function mitigateDamage(amount:number,mitigation:DamageMitigation):number{
  if(!Number.isSafeInteger(amount)||amount<0||amount>50_000)fail('Daño a mitigar inválido');
  if(!['normal','resistance','vulnerability','both','immunity'].includes(mitigation))fail('Mitigación inválida');
  if(mitigation==='immunity')return 0;
  const resisted=mitigation==='resistance'||mitigation==='both'?Math.floor(amount/2):amount;
  return mitigation==='vulnerability'||mitigation==='both'?resisted*2:resisted;
}
