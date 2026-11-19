/** Catálogo REALMENTE común: unión deduplicada de todos los conjuros implementados.
 * Compartir el catálogo no concede a ninguna clase la facultad de aprender
 * conjuros ajenos a su lista; esa restricción pertenece al adaptador.
 */
import {WIZARD_SPELL_RULES} from './wizard-spell-details';
import {WARLOCK_LEVEL_ONE_CANTRIPS,WARLOCK_LEVEL_ONE_SPELLS} from './warlock-spells';

const combined=new Map([...WIZARD_SPELL_RULES,...WARLOCK_LEVEL_ONE_CANTRIPS,...WARLOCK_LEVEL_ONE_SPELLS].map(rule=>[rule.id,rule]));
export const SHARED_SPELL_RULES=Object.freeze([...combined.values()].sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name,'es')));
export const SHARED_CLASS_SPELL_LISTS=Object.freeze([
 {id:'wizard',label:'Mago',spellIds:WIZARD_SPELL_RULES.map(rule=>rule.id)},
 {id:'warlock',label:'Brujo',spellIds:[...new Set([...WARLOCK_LEVEL_ONE_CANTRIPS,...WARLOCK_LEVEL_ONE_SPELLS].map(rule=>rule.id))]},
]);
export const WIZARD_SPELL_IDS=new Set(WIZARD_SPELL_RULES.map(rule=>rule.id));
export const WARLOCK_SPELL_IDS=new Set([...WARLOCK_LEVEL_ONE_CANTRIPS,...WARLOCK_LEVEL_ONE_SPELLS].map(rule=>rule.id));
