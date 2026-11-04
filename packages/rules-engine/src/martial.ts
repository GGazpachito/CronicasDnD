/** Paso 09: elecciones marciales del Guerrero, PHB 2024 pp. 91, 209-210, 215. */
export const FIGHTING_STYLES = {
  archery: 'Tiro con arco', blind_fighting: 'Combate a ciegas', defense: 'Defensa',
  dueling: 'Duelo', great_weapon_fighting: 'Combate con arma a dos manos',
  interception: 'Intercepción', protection: 'Protección',
  thrown_weapon_fighting: 'Combate con armas arrojadizas',
  two_weapon_fighting: 'Combate con dos armas', unarmed_fighting: 'Combate sin armas',
} as const;
export type FightingStyleId = keyof typeof FIGHTING_STYLES;
export type MasteryId = 'Cleave' | 'Graze' | 'Nick' | 'Push' | 'Sap' | 'Slow' | 'Topple' | 'Vex';
export const WEAPONS = {
  club:{name:'Garrote',mastery:'Slow'}, dagger:{name:'Daga',mastery:'Nick'}, greatclub:{name:'Gran garrote',mastery:'Push'},
  handaxe:{name:'Hacha de mano',mastery:'Vex'}, javelin:{name:'Jabalina',mastery:'Slow'}, light_hammer:{name:'Martillo ligero',mastery:'Nick'},
  mace:{name:'Maza',mastery:'Sap'}, quarterstaff:{name:'Bastón',mastery:'Topple'}, sickle:{name:'Hoz',mastery:'Nick'},
  spear:{name:'Lanza',mastery:'Sap'}, dart:{name:'Dardo',mastery:'Vex'}, light_crossbow:{name:'Ballesta ligera',mastery:'Slow'},
  shortbow:{name:'Arco corto',mastery:'Vex'}, sling:{name:'Honda',mastery:'Slow'},
  battleaxe:{name:'Hacha de batalla',mastery:'Topple'}, flail:{name:'Mayal',mastery:'Sap'},
  glaive:{name:'Guja',mastery:'Graze'}, greataxe:{name:'Gran hacha',mastery:'Cleave'},
  greatsword:{name:'Espadón',mastery:'Graze'}, halberd:{name:'Alabarda',mastery:'Cleave'},
  lance:{name:'Lanza de caballería',mastery:'Topple'}, longsword:{name:'Espada larga',mastery:'Sap'},
  maul:{name:'Gran martillo',mastery:'Topple'}, morningstar:{name:'Lucero del alba',mastery:'Sap'},
  pike:{name:'Pica',mastery:'Push'}, rapier:{name:'Estoque',mastery:'Vex'},
  scimitar:{name:'Cimitarra',mastery:'Nick'}, shortsword:{name:'Espada corta',mastery:'Vex'},
  trident:{name:'Tridente',mastery:'Topple'}, warhammer:{name:'Martillo de guerra',mastery:'Push'},
  war_pick:{name:'Pico de guerra',mastery:'Sap'}, whip:{name:'Látigo',mastery:'Slow'},
  blowgun:{name:'Cerbatana',mastery:'Vex'}, hand_crossbow:{name:'Ballesta de mano',mastery:'Vex'},
  heavy_crossbow:{name:'Ballesta pesada',mastery:'Push'}, longbow:{name:'Arco largo',mastery:'Slow'},
  musket:{name:'Mosquete',mastery:'Slow'}, pistol:{name:'Pistola',mastery:'Vex'},
} as const satisfies Record<string,{name:string;mastery:MasteryId}>;
export type WeaponId = keyof typeof WEAPONS;
export type StartingPackageId = 'a' | 'b' | 'c';
/** Los lotes de clase son elecciones excluyentes; el dinero inicial no es el del trasfondo. */
export const FIGHTER_PACKAGES: Readonly<Record<StartingPackageId,{label:string;gold:number;items:readonly {name:string;quantity:number}[];initialArmor:'chain_mail'|'studded_leather'|null}>> = {
  a: {label:'A · Armadura pesada',gold:4,initialArmor:'chain_mail',items:[
    {name:'Cota de malla',quantity:1},{name:'Espadón',quantity:1},{name:'Mayal',quantity:1},
    {name:'Jabalina',quantity:8},{name:'Equipo de exploración de mazmorras',quantity:1}]},
  b: {label:'B · Armadura ligera y arco',gold:11,initialArmor:'studded_leather',items:[
    {name:'Cuero tachonado',quantity:1},{name:'Cimitarra',quantity:1},{name:'Espada corta',quantity:1},
    {name:'Arco largo',quantity:1},{name:'Flecha',quantity:20},{name:'Carcaj',quantity:1},
    {name:'Equipo de exploración de mazmorras',quantity:1}]},
  c: {label:'C · 155 piezas de oro',gold:155,initialArmor:null,items:[]},
};
export type MartialChoices = Readonly<{
  fightingStyle: FightingStyleId;
  weaponMasteries: readonly WeaponId[];
  startingPackage: StartingPackageId;
}>;
export function validateMartialChoices(value: unknown): MartialChoices {
  if (!value || typeof value!=='object') throw new RangeError('Selecciona las opciones marciales del Guerrero');
  const v=value as Partial<MartialChoices>;
  if (typeof v.fightingStyle!=='string' || !Object.prototype.hasOwnProperty.call(FIGHTING_STYLES,v.fightingStyle)) throw new RangeError('Estilo de combate inválido');
  if (!Array.isArray(v.weaponMasteries) || v.weaponMasteries.length!==3 || new Set(v.weaponMasteries).size!==3 || v.weaponMasteries.some(w=>typeof w!=='string'||!Object.prototype.hasOwnProperty.call(WEAPONS,w))) throw new RangeError('El Guerrero debe elegir exactamente tres armas distintas para Maestría');
  if (typeof v.startingPackage!=='string' || !Object.prototype.hasOwnProperty.call(FIGHTER_PACKAGES,v.startingPackage)) throw new RangeError('Paquete de equipo inicial inválido');
  return v as MartialChoices;
}
