/** Catálogo REALMENTE común: unión deduplicada de todos los conjuros implementados.
 * Compartir el catálogo no concede a ninguna clase la facultad de aprender
 * conjuros ajenos a su lista; esa restricción pertenece al adaptador.
 */
import {WIZARD_SPELL_RULES} from './wizard-spell-details';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS,WARLOCK_LEVEL_TWO_SPELLS,WARLOCK_LEVEL_THREE_SPELLS,WARLOCK_LEVEL_FOUR_SPELLS,WARLOCK_LEVEL_FIVE_SPELLS,WARLOCK_LEVEL_SIX_SPELLS,WARLOCK_FIEND_LEVEL_THREE_SPELLS,WARLOCK_FIEND_LEVEL_FIVE_SPELLS,WARLOCK_FIEND_LEVEL_SEVEN_SPELLS} from './warlock-spells';

const warlockSpells=[...WARLOCK_LEVEL_ONE_CANTRIPS,...WARLOCK_LEVEL_ONE_SPELLS,...WARLOCK_LEVEL_TWO_SPELLS,...WARLOCK_LEVEL_THREE_SPELLS,...WARLOCK_LEVEL_FOUR_SPELLS,...WARLOCK_LEVEL_FIVE_SPELLS,...WARLOCK_LEVEL_SIX_SPELLS];
const combined=new Map([...WIZARD_SPELL_RULES,...warlockSpells,...WARLOCK_FIEND_LEVEL_THREE_SPELLS,...WARLOCK_FIEND_LEVEL_FIVE_SPELLS,...WARLOCK_FIEND_LEVEL_SEVEN_SPELLS].map(rule=>[rule.id,rule]));
export const SHARED_SPELL_RULES=Object.freeze([...combined.values()].sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name,'es')));
export const SHARED_CLASS_SPELL_LISTS=Object.freeze([
 {id:'wizard',label:'Mago',spellIds:WIZARD_SPELL_RULES.map(rule=>rule.id)},
 {id:'warlock',label:'Brujo',spellIds:[...new Set(warlockSpells.map(rule=>rule.id))]},
 {id:'fiend',label:'Patrón Infernal',spellIds:[...WARLOCK_FIEND_LEVEL_THREE_SPELLS,...WARLOCK_FIEND_LEVEL_FIVE_SPELLS,...WARLOCK_FIEND_LEVEL_SEVEN_SPELLS].map(rule=>rule.id)},
]);
export const WIZARD_SPELL_IDS=new Set(WIZARD_SPELL_RULES.map(rule=>rule.id));
export const WARLOCK_SPELL_IDS=new Set(warlockSpells.map(rule=>rule.id));
