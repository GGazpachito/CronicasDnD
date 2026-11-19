/** Paso 11. Equipo inicial de 4 trasfondos del PHB 2024, pp. 178, 179, 183 y 185.
 * Solo datos mecánicos; sin reproducir descripciones editoriales del manual.
 */
import { FIGHTER_PACKAGES, type StartingPackageId } from './martial';
import { TOOL_NAMES, type ToolId } from './origin-feats';

export type InitialBackgroundId = 'acolyte' | 'criminal' | 'sage' | 'soldier';
export type BackgroundPackageId = 'a' | 'b';
export const GAMING_SETS = {
  dice_set: TOOL_NAMES.dice_set,
  dragonchess_set: TOOL_NAMES.dragonchess_set,
  playing_card_set: TOOL_NAMES.playing_card_set,
  three_dragon_ante_set: TOOL_NAMES.three_dragon_ante_set,
} as const;
export type GamingSetId = keyof typeof GAMING_SETS;

export type BackgroundEquipmentChoice = Readonly<{
  startingPackage: BackgroundPackageId;
  /** La competencia se obtiene incluso cuando se elige dinero (paquete B). */
  gamingSet?: GamingSetId;
}>;
export type CatalogItemId =
  'chain_mail'|'greatsword'|'flail'|'javelin'|'dungeoneers_pack'|'studded_leather'|
  'scimitar'|'shortsword'|'longbow'|'arrow'|'quiver'|'calligraphers_supplies'|
  'book_prayers'|'holy_symbol'|'parchment'|'robe'|'dagger'|'thieves_tools'|
  'crowbar'|'pouch'|'travelers_clothes'|'quarterstaff'|'book_history'|
  'spear'|'shortbow'|'healers_kit'|'spellbook'|'scholars_pack'|'arcane_focus_orb'|'occult_book'|'leather'|'sickle'|GamingSetId;
export const ITEM_NAMES: Readonly<Record<CatalogItemId, string>> = {
  chain_mail:'Cota de malla',greatsword:'Espadón',flail:'Mayal',javelin:'Jabalina',
  dungeoneers_pack:'Equipo de exploración de mazmorras',studded_leather:'Cuero tachonado',
  scimitar:'Cimitarra',shortsword:'Espada corta',longbow:'Arco largo',arrow:'Flecha',quiver:'Carcaj',
  calligraphers_supplies:'Útiles de caligrafía',book_prayers:'Libro de oraciones',
  holy_symbol:'Símbolo sagrado',parchment:'Hoja de pergamino',robe:'Túnica',
  dagger:'Daga',thieves_tools:'Herramientas de ladrón',crowbar:'Palanca',
  pouch:'Bolsa',travelers_clothes:'Ropa de viaje',quarterstaff:'Bastón',
  book_history:'Libro de historia',spear:'Lanza',shortbow:'Arco corto',
  healers_kit:'Botiquín de sanador',spellbook:'Libro de conjuros',scholars_pack:'Equipo de erudito',
  arcane_focus_orb:'Foco arcano (orbe)',occult_book:'Libro de saber oculto',
  leather:'Armadura de cuero',sickle:'Hoz',
  ...GAMING_SETS,
};
type ItemSpec = Readonly<{id:CatalogItemId; quantity:number}>;
type PackageDefinition = Readonly<{gold:number;items:readonly ItemSpec[]}>;
const item = (id:CatalogItemId,quantity=1):ItemSpec => ({id,quantity});

/** A: equipo descrito en el manual. B: 50 po sin equipo de trasfondo. */
export const BACKGROUND_PACKAGES: Readonly<Record<InitialBackgroundId,Readonly<Record<BackgroundPackageId,PackageDefinition>>>> = {
  acolyte: {
    a:{gold:8,items:[item('calligraphers_supplies'),item('book_prayers'),item('holy_symbol'),item('parchment',10),item('robe')]},
    b:{gold:50,items:[]},
  },
  criminal: {
    a:{gold:16,items:[item('dagger',2),item('thieves_tools'),item('crowbar'),item('pouch',2),item('travelers_clothes')]},
    b:{gold:50,items:[]},
  },
  sage: {
    a:{gold:8,items:[item('quarterstaff'),item('calligraphers_supplies'),item('book_history'),item('parchment',8),item('robe')]},
    b:{gold:50,items:[]},
  },
  soldier: {
    a:{gold:14,items:[item('spear'),item('shortbow'),item('arrow',20),item('healers_kit'),item('quiver'),item('travelers_clothes')]},
    b:{gold:50,items:[]},
  },
};

export type ValidatedBackgroundEquipment = Readonly<{
  choice: BackgroundEquipmentChoice;
  gold: number;
  items: readonly ItemSpec[];
  gamingSet?: GamingSetId;
}>;
export function validateBackgroundEquipment(background: InitialBackgroundId, choice: unknown): ValidatedBackgroundEquipment {
  if (!Object.hasOwn(BACKGROUND_PACKAGES, background)) throw new RangeError('Trasfondo inicial desconocido');
  if (!choice || typeof choice!=='object' || Array.isArray(choice)) throw new RangeError('Selecciona el equipo del trasfondo');
  const c = choice as Partial<BackgroundEquipmentChoice>;
  if (Object.keys(choice).some(k=>!['startingPackage','gamingSet'].includes(k))) throw new RangeError('Propiedad desconocida en el equipo del trasfondo');
  if (c.startingPackage!=='a' && c.startingPackage!=='b') throw new RangeError('Paquete de trasfondo inválido: A o B');
  if (background==='soldier') {
    if (typeof c.gamingSet!=='string' || !Object.hasOwn(GAMING_SETS,c.gamingSet)) throw new RangeError('Soldado: elige un juego de azar válido');
  } else if (c.gamingSet!==undefined) throw new RangeError('Este trasfondo no permite elegir un juego de azar');
  const def=BACKGROUND_PACKAGES[background][c.startingPackage];
  const items=def.items.map(it=>({...it}));
  if (background==='soldier' && c.startingPackage==='a') items.splice(3,0,item(c.gamingSet as GamingSetId));
  return {choice:{startingPackage:c.startingPackage,...(background==='soldier'?{gamingSet:c.gamingSet as GamingSetId}:{})},gold:def.gold,items,
    ...(background==='soldier'?{gamingSet:c.gamingSet as GamingSetId}:{})};
}

export type StartingInventoryLine = Readonly<{
  id:CatalogItemId;
  name:string;
  quantity:number;
  /** Preservamos la procedencia incluso si se agregan objetos iguales. */
  sources: readonly Readonly<{from:'class'|'background'; quantity:number}>[];
}>;
export type StartingInventory = Readonly<{
  classGold:number;
  backgroundGold:number;
  totalGold:number;
  items: readonly StartingInventoryLine[];
}>;

/** Normaliza nombres del catálogo de clase, que todavía usa etiquetas legibles. */
const FIGHTER_ITEM_IDS:Readonly<Record<string,CatalogItemId>> = {
  'Cota de malla':'chain_mail','Espadón':'greatsword','Mayal':'flail','Jabalina':'javelin',
  'Equipo de exploración de mazmorras':'dungeoneers_pack','Cuero tachonado':'studded_leather',
  'Cimitarra':'scimitar','Espada corta':'shortsword','Arco largo':'longbow',
  'Flecha':'arrow','Carcaj':'quiver',
};
export function combineStartingInventory(classPackage: StartingPackageId|undefined, background: ValidatedBackgroundEquipment):StartingInventory {
  if (classPackage!==undefined && !Object.hasOwn(FIGHTER_PACKAGES,classPackage)) throw new RangeError('Paquete de Guerrero desconocido');
  const lines=new Map<CatalogItemId,{quantity:number;sources:{from:'class'|'background';quantity:number}[]}>();
  function add(id:CatalogItemId,quantity:number,from:'class'|'background'){
    if (!Number.isInteger(quantity) || quantity<=0 || !Object.hasOwn(ITEM_NAMES,id)) throw new RangeError('Objeto inicial inválido');
    const prev=lines.get(id)??{quantity:0,sources:[]};
    prev.quantity+=quantity;
    prev.sources.push({from,quantity});
    lines.set(id,prev);
  }
  if (classPackage!==undefined) for(const i of FIGHTER_PACKAGES[classPackage].items){
    const id=FIGHTER_ITEM_IDS[i.name];
    if(!id) throw new RangeError(`Objeto de clase sin identificador: ${i.name}`);
    add(id,i.quantity,'class');
  }
  for (const i of background.items) add(i.id,i.quantity,'background');
  const classGold=classPackage!==undefined?FIGHTER_PACKAGES[classPackage].gold:0;
  const backgroundGold=background.gold;
  return {classGold,backgroundGold,totalGold:classGold+backgroundGold,
    items:[...lines].map(([id,v])=>({id,name:ITEM_NAMES[id],quantity:v.quantity,sources:v.sources.map(x=>({...x}))}))};
}
