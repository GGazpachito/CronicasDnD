/** Catálogo estructurado de trucos y conjuros de nivel 1 del SRD 5.2.1.
 * Solo nombres e identificadores mecánicos; no reproduce las descripciones del libro.
 * Fuente: https://www.dndbeyond.com/srd (CC BY 4.0).
 */
import type { Ability } from './abilities';

export const SPELL_LISTS = {
  cleric: {
    label: 'Clérigo',
    cantrips: ['guidance','light','mending','resistance','sacred_flame','spare_the_dying','thaumaturgy'],
    level1: ['bane','bless','command','create_or_destroy_water','cure_wounds','detect_evil_and_good','detect_magic','detect_poison_and_disease','guiding_bolt','healing_word','inflict_wounds','protection_from_evil_and_good','purify_food_and_drink','sanctuary','shield_of_faith'],
  },
  druid: {
    label: 'Druida',
    cantrips: ['druidcraft','elementalism','guidance','mending','message','poison_spray','produce_flame','resistance','shillelagh','spare_the_dying','starry_wisp'],
    level1: ['animal_friendship','charm_person','create_or_destroy_water','cure_wounds','detect_magic','detect_poison_and_disease','entangle','faerie_fire','fog_cloud','goodberry','healing_word','ice_knife','jump','longstrider','protection_from_evil_and_good','purify_food_and_drink','speak_with_animals','thunderwave'],
  },
  wizard: {
    label: 'Mago',
    cantrips: ['acid_splash','chill_touch','dancing_lights','elementalism','fire_bolt','light','mage_hand','mending','message','minor_illusion','poison_spray','prestidigitation','ray_of_frost','shocking_grasp','true_strike'],
    level1: ['alarm','burning_hands','charm_person','chromatic_orb','color_spray','comprehend_languages','detect_magic','disguise_self','expeditious_retreat','false_life','feather_fall','find_familiar','fog_cloud','grease','ice_knife','identify','illusory_script','jump','longstrider','mage_armor','magic_missile','protection_from_evil_and_good','ray_of_sickness','shield','silent_image','sleep','tashas_hideous_laughter','tensers_floating_disk','thunderwave','unseen_servant'],
  },
} as const;
export type SpellListId = keyof typeof SPELL_LISTS;
export type SpellAbility = Extract<Ability,'intelligence'|'wisdom'|'charisma'>;
export type MagicInitiateSelection = Readonly<{
  list: SpellListId;
  spellcastingAbility: SpellAbility;
  cantrips: readonly string[];
  level1Spell: string;
}>;
export type SpellGrant = Readonly<{
  id: string;
  name: string;
  level: 0 | 1 | 2;
  source: 'background' | 'human_feat' | 'elf_lineage';
  spellcastingAbility: SpellAbility;
  freeCastPerLongRest: boolean;
  /** Puede gastarse ranura adecuada si el personaje dispone de ella. */
  allowsSpellSlot: boolean;
}>;
export const MAGIC_ABILITY_OPTIONS: readonly SpellAbility[] = ['intelligence','wisdom','charisma'];

const SPELL_NAMES: Readonly<Record<string,string>> = {
  druidcraft:'Druidcraft',elementalism:'Elementalism',thaumaturgy:'Thaumaturgy',shillelagh:'Shillelagh',
  prestidigitation:'Prestidigitation',goodberry:'Goodberry',faerie_fire:'Faerie Fire',
  magic_missile:'Magic Missile',mage_hand:'Mage Hand',sacred_flame:'Sacred Flame',
  detect_magic:'Detect Magic',longstrider:'Longstrider',dancing_lights:'Dancing Lights',
  darkness:'Darkness',misty_step:'Misty Step',pass_without_trace:'Pass without Trace',
  guidance:'Guidance',tashas_hideous_laughter:"Tasha's Hideous Laughter",tensers_floating_disk:"Tenser's Floating Disk",
  create_or_destroy_water:'Create or Destroy Water',detect_evil_and_good:'Detect Evil and Good',
  detect_poison_and_disease:'Detect Poison and Disease',protection_from_evil_and_good:'Protection from Evil and Good',
  purify_food_and_drink:'Purify Food and Drink',shield_of_faith:'Shield of Faith',
  spare_the_dying:'Spare the Dying',
  produce_flame:'Produce Flame',starry_wisp:'Starry Wisp',
  animal_friendship:'Animal Friendship',speak_with_animals:'Speak with Animals',
  ray_of_sickness:'Ray of Sickness',find_familiar:'Find Familiar',feather_fall:'Feather Fall',
  illusory_script:'Illusory Script',expeditious_retreat:'Expeditious Retreat',
  chromatic_orb:'Chromatic Orb',acid_splash:'Acid Splash',
  ray_of_frost:'Ray of Frost',chill_touch:'Chill Touch',fire_bolt:'Fire Bolt',
  true_strike:'True Strike',minor_illusion:'Minor Illusion',
  shocking_grasp:'Shocking Grasp',
};
export function spellName(id:string):string {
  return SPELL_NAMES[id] ?? id.split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
}
export function validateMagicInitiate(value: unknown, expectedList?: SpellListId):MagicInitiateSelection {
  if (!value || typeof value!=='object') throw new RangeError('Selecciona los conjuros de Iniciado en la Magia');
  const v=value as Partial<MagicInitiateSelection>;
  if (!v.list || !Object.hasOwn(SPELL_LISTS,v.list)) throw new RangeError('Lista mágica no válida');
  if (expectedList && v.list!==expectedList) throw new RangeError('La lista mágica no coincide con la dote concedida');
  if (!v.spellcastingAbility || !MAGIC_ABILITY_OPTIONS.includes(v.spellcastingAbility)) throw new RangeError('Característica mágica inválida');
  const list=SPELL_LISTS[v.list];
  if (!Array.isArray(v.cantrips) || v.cantrips.length!==2 || new Set(v.cantrips).size!==2 || v.cantrips.some(s=>typeof s!=='string'||!(list.cantrips as readonly string[]).includes(s))) throw new RangeError('Elige exactamente dos trucos distintos de la misma lista');
  if (!v.level1Spell || !(list.level1 as readonly string[]).includes(v.level1Spell)) throw new RangeError('Elige un conjuro de nivel 1 de la misma lista');
  return {list:v.list,spellcastingAbility:v.spellcastingAbility,cantrips:[...v.cantrips],level1Spell:v.level1Spell};
}
export function grantsFromMagicInitiate(value:MagicInitiateSelection,source:'background'|'human_feat'):readonly SpellGrant[] {
  const grant=(id:string, level:0|1):SpellGrant=>({id,name:spellName(id),level,source,spellcastingAbility:value.spellcastingAbility,freeCastPerLongRest:level===1,allowsSpellSlot:level===1});
  return [...value.cantrips.map(id=>grant(id,0)),grant(value.level1Spell,1)];
}
export function elfLineageSpells(lineage:'drow'|'high_elf'|'wood_elf',level:1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20,ability:SpellAbility):readonly SpellGrant[] {
  const cantrip=lineage==='drow'?'dancing_lights':lineage==='high_elf'?'prestidigitation':'druidcraft';
  const higher=lineage==='drow'?'faerie_fire':lineage==='high_elf'?'detect_magic':'longstrider';
  const base:SpellGrant={id:cantrip,name:spellName(cantrip),level:0,source:'elf_lineage',spellcastingAbility:ability,freeCastPerLongRest:false,allowsSpellSlot:false};
  const granted:SpellGrant[]=[base];
  if(level>=3)granted.push({id:higher,name:spellName(higher),level:1,source:'elf_lineage',spellcastingAbility:ability,freeCastPerLongRest:true,allowsSpellSlot:true});
  if(level>=5){const newSpell=lineage==='drow'?'darkness':lineage==='high_elf'?'misty_step':'pass_without_trace';
    granted.push({id:newSpell,name:spellName(newSpell),level:2,source:'elf_lineage',spellcastingAbility:ability,freeCastPerLongRest:true,allowsSpellSlot:true});}
  return granted;
}
