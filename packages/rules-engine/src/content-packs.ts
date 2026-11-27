/**
 * Identidad y procedencia de los paquetes de reglas.
 *
 * Paso 84: solo hay un paquete ACTIVO, el programa base SRD 5.2.1.
 * El contrato define la procedencia que deberán declarar futuras extensiones,
 * pero NO instala, importa ni autoriza por sí mismo contenido de terceros.
 */
export const BASE_CONTENT_PACK_ID='srd-5.2.1' as const;

export type ContentCategory=
  | 'class' | 'subclass' | 'species' | 'background' | 'feat'
  | 'fighting_style' | 'spell' | 'invocation' | 'creature' | 'equipment';

export type ContentPackManifest=Readonly<{
  id:string;
  version:string;
  title:string;
  /** Identificador de licencia respaldado por la fuente y los permisos correspondientes. */
  licenseId:string;
  sourceUrl:string;
  /** Toda extensión debe identificar los derechos que permiten su distribución. */
  rightsNotice:string;
  categories:readonly ContentCategory[];
  dependencies:readonly string[];
}>;

export const BASE_CONTENT_PACK:ContentPackManifest={
  id:BASE_CONTENT_PACK_ID,
  version:'5.2.1',
  title:'Documento de Referencia del Sistema 5.2.1 · contenido base',
  licenseId:'CC-BY-4.0',
  sourceUrl:'https://www.dndbeyond.com/srd',
  rightsNotice:'SRD 5.2.1, Wizards of the Coast LLC. Licencia Creative Commons Atribución 4.0 Internacional; se indicarán las modificaciones del proyecto.',
  categories:['class','subclass','species','background','feat','fighting_style','spell','invocation','creature','equipment'],
  dependencies:[],
};

/**
 * La fase base ofrece solo este identificador. No existe todavía carga de módulos
 * subidos por usuarios ni activación persistente por cuenta.
 */
export const ACTIVE_BASE_CONTENT_PACK_IDS:readonly string[]=[BASE_CONTENT_PACK_ID];

/** Verificaciones estructurales que usarán futuras migraciones y gestores de paquetes. */
export function validateContentPackManifest(manifest:unknown):ContentPackManifest {
  const fail=():never=>{throw new RangeError('Manifiesto de contenido incompleto o inválido');};
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))return fail();
  const value=manifest as Partial<ContentPackManifest>;
  const validString=(s:unknown)=>typeof s==='string'&&s.trim().length>0;
  if(!validString(value.id)||!validString(value.version)||!validString(value.title)||
    !validString(value.licenseId)||!validString(value.rightsNotice)||!validString(value.sourceUrl)||
    !Array.isArray(value.categories)||!Array.isArray(value.dependencies))return fail();
  const allowed:readonly string[]=['class','subclass','species','background','feat','fighting_style','spell','invocation','creature','equipment'];
  if(new Set(value.categories).size!==value.categories.length||
    value.categories.some(category=>!allowed.includes(category))||
    new Set(value.dependencies).size!==value.dependencies.length||
    value.dependencies.some(id=>!validString(id)||id===value.id))return fail();
  return {...value,categories:[...value.categories],dependencies:[...value.dependencies]} as ContentPackManifest;
}
