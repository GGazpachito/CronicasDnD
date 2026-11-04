/** Elecciones de dotes de origen del PHB 2024, pp. 200-202. */
import { SKILLS, type Skill } from './proficiencies';
import { type MagicInitiateSelection, validateMagicInitiate } from './origin-magic';

export const ORIGIN_FEATS = {
  alert:'Alerta',crafter:'Artesano',healer:'Sanador',lucky:'Afortunado',
  magic_initiate:'Iniciado en la Magia',musician:'Músico',savage_attacker:'Ataque salvaje',
  skilled:'Competente',tavern_brawler:'Peleador de taberna',tough:'Duro',
} as const;
export type OriginFeatId = keyof typeof ORIGIN_FEATS;
export const CRAFTER_TOOLS = ['carpenters_tools','leatherworkers_tools','masons_tools','potters_tools','smiths_tools','tinkers_tools','weavers_tools','woodcarvers_tools'] as const;
export const MUSICAL_INSTRUMENTS = ['bagpipes','drum','dulcimer','flute','horn','lute','lyre','pan_flute','shawm','viol'] as const;
export const TOOL_NAMES = {
  alchemists_supplies:'Útiles de alquimista',brewers_supplies:'Útiles de cervecero',calligraphers_supplies:'Útiles de calígrafo',
  carpenters_tools:'Herramientas de carpintero',cartographers_tools:'Herramientas de cartógrafo',cobblers_tools:'Herramientas de zapatero',
  cooks_utensils:'Utensilios de cocinero',glassblowers_tools:'Herramientas de soplador de vidrio',jewelers_tools:'Herramientas de joyero',
  leatherworkers_tools:'Herramientas de peletero',masons_tools:'Herramientas de albañil',painters_supplies:'Útiles de pintor',
  potters_tools:'Herramientas de alfarero',smiths_tools:'Herramientas de herrero',tinkers_tools:'Herramientas de hojalatero',
  weavers_tools:'Herramientas de tejedor',woodcarvers_tools:'Herramientas de tallador',
  disguise_kit:'Kit de disfraz',forgery_kit:'Kit de falsificación',herbalism_kit:'Kit de herboristería',navigators_tools:'Herramientas de navegante',
  poisoners_kit:'Kit de envenenador',thieves_tools:'Herramientas de ladrón',
  dice_set:'Dados',dragonchess_set:'Dragonchess',playing_card_set:'Naipes',three_dragon_ante_set:'Tres dragones',
  bagpipes:'Gaita',drum:'Tambor',dulcimer:'Dulcémele',flute:'Flauta',horn:'Cuerno',
  lute:'Laúd',lyre:'Lira',pan_flute:'Flauta de Pan',shawm:'Chirimía',viol:'Viola',
} as const;
export type ToolId = keyof typeof TOOL_NAMES;
export type SkilledProficiency = `skill:${Skill}` | `tool:${ToolId}`;
export type HumanFeatDetails = Readonly<{
  magicInitiate?: MagicInitiateSelection;
  crafterTools?: readonly string[];
  musicianInstruments?: readonly string[];
  skilledProficiencies?: readonly string[];
}>;
export type ValidatedHumanFeat = Readonly<{
  feat: OriginFeatId;
  skillProficiencies: readonly Skill[];
  toolProficiencies: readonly ToolId[];
  magicInitiate?: MagicInitiateSelection;
  luckPointsMaximum?: number;
}>;
function distinctChoices(values:readonly string[]|undefined,n:number,allowed:readonly string[],label:string):readonly string[] {
  if (!Array.isArray(values) || values.length!==n || new Set(values).size!==n || values.some(s=>typeof s!=='string'||!allowed.includes(s))) {
    throw new RangeError(`Elige ${n} opciones válidas y distintas para ${label}`);
  }
  return [...values];
}
export const SKILLED_OPTIONS:readonly SkilledProficiency[] = [
  ...SKILLS.map(s=>`skill:${s}` as const),
  ...(Object.keys(TOOL_NAMES) as ToolId[]).map(t=>`tool:${t}` as const),
];
export function validateHumanOriginFeat(feat:unknown,details:HumanFeatDetails|undefined,level:number):ValidatedHumanFeat {
  if (typeof feat!=='string' || !Object.hasOwn(ORIGIN_FEATS,feat)) throw new RangeError('Dote de origen humana desconocida');
  if (!Number.isInteger(level) || level<1 || level>20) throw new RangeError('Nivel no válido');
  const id=feat as OriginFeatId;
  switch(id){
    case 'magic_initiate': return {feat:id,skillProficiencies:[],toolProficiencies:[],magicInitiate:validateMagicInitiate(details?.magicInitiate)};
    case 'crafter': return {feat:id,skillProficiencies:[],toolProficiencies:distinctChoices(details?.crafterTools,3,CRAFTER_TOOLS,'Artesano') as ToolId[]};
    case 'musician': return {feat:id,skillProficiencies:[],toolProficiencies:distinctChoices(details?.musicianInstruments,3,MUSICAL_INSTRUMENTS,'Músico') as ToolId[]};
    case 'skilled': {
      const entries=distinctChoices(details?.skilledProficiencies,3,SKILLED_OPTIONS,'Competente');
      return {feat:id,skillProficiencies:entries.filter(s=>s.startsWith('skill:')).map(s=>s.substring(6) as Skill),
        toolProficiencies:entries.filter(s=>s.startsWith('tool:')).map(s=>s.substring(5) as ToolId)};
    }
    case 'lucky': return {feat:id,skillProficiencies:[],toolProficiencies:[],luckPointsMaximum:Math.floor((level-1)/4)+2};
    default: return {feat:id,skillProficiencies:[],toolProficiencies:[]};
  }
}
