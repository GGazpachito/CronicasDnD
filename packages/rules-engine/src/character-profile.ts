/** Actualización 42. Información narrativa editable, independiente de las reglas mecánicas.
 * Se guarda dentro de input.profile en la instantánea v2 existente.
 */
export const PROFILE_TEXT_LIMITS = {
  age: 40,
  height: 40,
  weight: 40,
  eyes: 70,
  hair: 70,
  skin: 70,
  appearance: 1800,
  personality: 1800,
  ideals: 1200,
  bonds: 1200,
  flaws: 1200,
  backstory: 6500,
  notes: 4500,
} as const;

export type CharacterProfileTextKey = keyof typeof PROFILE_TEXT_LIMITS;
export type CharacterProfile = Readonly<Record<CharacterProfileTextKey, string> & {
  /** Retrato JPEG optimizado en el navegador para guardado JSON local. */
  portraitDataUrl?: string;
}>;

export const MAX_PORTRAIT_DATA_URL_LENGTH = 60_000;

export const EMPTY_CHARACTER_PROFILE: CharacterProfile = {
  age: '', height: '', weight: '', eyes: '', hair: '', skin: '',
  appearance: '', personality: '', ideals: '', bonds: '', flaws: '',
  backstory: '', notes: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Se utiliza también en el servidor. Nunca aceptar HTML, URLs remotas ni SVG como retrato. */
export function validateCharacterProfile(value: unknown): CharacterProfile {
  if (!isRecord(value)) throw new RangeError('Los datos narrativos del personaje no son válidos');
  const allowed = [...Object.keys(PROFILE_TEXT_LIMITS), 'portraitDataUrl'];
  if (Object.keys(value).some(key => !allowed.includes(key))) {
    throw new RangeError('El perfil contiene campos desconocidos');
  }
  const result: Record<string, string> = {};
  for (const [key, maxLength] of Object.entries(PROFILE_TEXT_LIMITS)) {
    const text = value[key] ?? '';
    if (typeof text !== 'string' || text.length > maxLength) {
      throw new RangeError(`El campo narrativo «${key}» supera el límite de ${maxLength} caracteres o no es texto`);
    }
    result[key] = text;
  }
  const portrait = value.portraitDataUrl;
  if (portrait !== undefined && portrait !== '') {
    if (typeof portrait !== 'string' || portrait.length > MAX_PORTRAIT_DATA_URL_LENGTH ||
        !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(portrait)) {
      throw new RangeError('El retrato debe ser una imagen JPEG optimizada de tamaño reducido');
    }
    result.portraitDataUrl = portrait;
  }
  return result as CharacterProfile;
}
