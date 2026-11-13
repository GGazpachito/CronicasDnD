/** Actualización 43: proyección SOLO DE LECTURA de magia de origen D&D 2024.
 * Referencia normativa: PHB 2024, pp. 190 (linajes élficos), 201 (Iniciado en la Magia),
 * 235 (trucos, ranuras y uso sin ranura), 238 (CD y bono de ataque mágico).
 * No añade ranuras, ejecuta hechizos ni consume usos.
 */
import type { GuidedFighterResult } from './guided';
import { BACKGROUNDS } from './guided';
import type { SpellAbility, SpellGrant } from './origin-magic';

export const SPELLCASTING_ABILITY_NAMES: Readonly<Record<SpellAbility,string>> = {
  intelligence:'Inteligencia',wisdom:'Sabiduría',charisma:'Carisma',
};

export type SpellbookEntry = Readonly<{
  key: string;
  id: string;
  name: string;
  level: 0 | 1 | 2;
  source: SpellGrant['source'];
  sourceLabel: string;
  spellcastingAbility: SpellAbility;
  abilityLabel: string;
  attackBonus: number;
  saveDC: number;
  freeCastPerLongRest: boolean;
  allowsSpellSlot: boolean;
}>;

export type SpellbookAbility = Readonly<{
  ability: SpellAbility;
  label: string;
  modifier: number;
  proficiencyBonus: number;
  attackBonus: number;
  saveDC: number;
}>;

export type CharacterSpellbook = Readonly<{
  entries: readonly SpellbookEntry[];
  abilities: readonly SpellbookAbility[];
  totalGrants: number;
  uniqueSpells: number;
  cantrips: number;
  leveledSpells: number;
  /** Solo se admite actualmente Guerrero, que no obtiene ranuras de su clase. */
  classSpellSlotsAvailable: false;
}>;

const ABILITY_ORDER: readonly SpellAbility[]=['intelligence','wisdom','charisma'];
const SOURCE_LABELS: Readonly<Record<SpellGrant['source'],string>>={
  background:'Trasfondo',human_feat:'Dote adicional humana',elf_lineage:'Linaje élfico',
};

/** Los conjuros duplicados por fuentes DISTINTAS se conservan: cada fuente puede
 * conceder una aptitud independiente de lanzamiento gratuito. Solo se eliminan
 * duplicados idénticos dentro de la misma fuente, evitando keys React repetidas.
 */
export function collectCharacterSpellbook(result:GuidedFighterResult): CharacterSpellbook {
  const modifiers=result.sheet.abilityModifiers;
  const proficiency=result.sheet.proficiencyBonus;
  const seen=new Set<string>();
  const entries:SpellbookEntry[]=[];
  for(const grant of result.spells){
    const key=`${grant.source}:${grant.level}:${grant.id}:${grant.spellcastingAbility}`;
    if(seen.has(key)) continue;
    seen.add(key);
    const modifier=modifiers[grant.spellcastingAbility];
    const label=grant.source==='background'
      ? `${SOURCE_LABELS.background}: ${BACKGROUNDS[result.origin.background].name}`
      : SOURCE_LABELS[grant.source];
    entries.push({key,id:grant.id,name:grant.name,level:grant.level,
      source:grant.source,sourceLabel:label,spellcastingAbility:grant.spellcastingAbility,
      abilityLabel:SPELLCASTING_ABILITY_NAMES[grant.spellcastingAbility],
      attackBonus:modifier+proficiency,saveDC:8+modifier+proficiency,
      freeCastPerLongRest:grant.freeCastPerLongRest,
      allowsSpellSlot:grant.allowsSpellSlot});
  }
  const abilities=ABILITY_ORDER.filter(ability=>entries.some(entry=>entry.spellcastingAbility===ability))
    .map(ability=>({ability,label:SPELLCASTING_ABILITY_NAMES[ability],
      modifier:modifiers[ability],proficiencyBonus:proficiency,
      attackBonus:modifiers[ability]+proficiency,saveDC:8+modifiers[ability]+proficiency}));
  return {entries,abilities,totalGrants:entries.length,
    uniqueSpells:new Set(entries.map(entry=>entry.id)).size,
    cantrips:entries.filter(entry=>entry.level===0).length,
    leveledSpells:entries.filter(entry=>entry.level!==0).length,
    classSpellSlotsAvailable:false};
}
