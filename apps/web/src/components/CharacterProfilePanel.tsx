"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  MAX_PORTRAIT_DATA_URL_LENGTH, PROFILE_TEXT_LIMITS,
  validateCharacterProfile, type CharacterProfile, type CharacterProfileTextKey,
} from "../../../../packages/rules-engine/src/character-profile";

type Props = {
  profile: CharacterProfile;
  name: string;
  species: string;
  background: string;
  level: number;
  onChange: (profile: CharacterProfile) => void;
  onEditIdentity: () => void;
};

/** La imagen se convierte a JPEG pequeño ANTES de entrar en el estado y la API.
 * No se guarda una ruta file:// ni se sube una imagen original de varios megabytes.
 */
async function optimizePortrait(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new RangeError('Selecciona una imagen JPG, PNG o WebP. No se admiten SVG ni GIF.');
  }
  if (file.size === 0 || file.size > 5_000_000) {
    throw new RangeError('La imagen original debe ocupar menos de 5 MB.');
  }
  const objectUrl = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new RangeError('No se ha podido leer la imagen seleccionada.'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  if (image.naturalWidth < 1 || image.naturalHeight < 1 ||
      image.naturalWidth > 8_000 || image.naturalHeight > 8_000 ||
      image.naturalWidth * image.naturalHeight > 25_000_000) {
    throw new RangeError('La imagen tiene unas dimensiones no admitidas.');
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no admite el procesamiento de retratos.');
  // Recorte cuadrado centrado: se conserva la proporción y se limita la resolución.
  const sourceSide = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSide) / 2;
  const sourceY = (image.naturalHeight - sourceSide) / 2;
  for (const size of [360, 300, 240, 180, 140]) {
    canvas.width = size;
    canvas.height = size;
    for (const quality of [0.78, 0.65, 0.5]) {
      context.fillStyle = '#17202c';
      context.fillRect(0, 0, size, size);
      context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_PORTRAIT_DATA_URL_LENGTH) {
        validateCharacterProfile({portraitDataUrl:dataUrl});
        return dataUrl;
      }
    }
  }
  throw new RangeError('No ha sido posible reducir el retrato al tamaño permitido. Prueba con otra imagen.');
}

const DESCRIPTION_FIELDS = [
  {key:'appearance',label:'Apariencia',hint:'Vestimenta, complexión, marcas distintivas…',rows:4},
  {key:'personality',label:'Personalidad',hint:'Cómo actúa, habla y reacciona tu personaje…',rows:4},
  {key:'ideals',label:'Ideales',hint:'Qué cree y cuáles son sus principios…',rows:3},
  {key:'bonds',label:'Vínculos',hint:'Personas, lugares y compromisos importantes…',rows:3},
  {key:'flaws',label:'Defectos',hint:'Miedos, debilidades y contradicciones…',rows:3},
] as const;

const PHYSICAL_FIELDS = [
  {key:'age',label:'Edad',placeholder:'Ej. 34 años'},
  {key:'height',label:'Altura',placeholder:'Ej. 1,82 m'},
  {key:'weight',label:'Peso',placeholder:'Ej. 78 kg'},
  {key:'eyes',label:'Ojos',placeholder:'Ej. Verdes'},
  {key:'hair',label:'Cabello',placeholder:'Ej. Castaño'},
  {key:'skin',label:'Piel',placeholder:'Ej. Bronceada'},
] as const;

export default function CharacterProfilePanel({profile,name,species,background,level,onChange,onEditIdentity}:Props) {
  const inputId = useId();
  const uploadSequence = useRef(0);
  const [uploading,setUploading] = useState(false);
  const [uploadError,setUploadError] = useState<string | null>(null);
  // Al cargar otro personaje se desmonta este panel; invalida imágenes pendientes.
  useEffect(() => {
    const sequenceRef = uploadSequence;
    return () => { sequenceRef.current++; };
  }, []);

  function edit(key: CharacterProfileTextKey, value: string) {
    onChange({...profile,[key]:value});
  }
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const sequence = ++uploadSequence.current;
    setUploading(true);
    setUploadError(null);
    try {
      const portraitDataUrl = await optimizePortrait(file);
      if (sequence === uploadSequence.current) onChange({...profile,portraitDataUrl});
    } catch (error) {
      if (sequence === uploadSequence.current) setUploadError(error instanceof Error ? error.message : 'No se pudo procesar la imagen.');
    } finally {
      if (sequence === uploadSequence.current) setUploading(false);
    }
  }
  function removePortrait() {
    uploadSequence.current++;
    setUploading(false);
    setUploadError(null);
    // Elimina la imagen sin tocar los campos narrativos.
    onChange({...profile,portraitDataUrl:undefined});
  }

  return <div className="character-profile-page">
    <div className="sheet-section-heading"><div>
      <span className="eyebrow">PERSONAJE · ACTUALIZACIÓN 42</span>
      <h2>Identidad e historia</h2>
      <p>Completa la interpretación de tu personaje. Estos textos no alteran los cálculos de D&D.</p>
    </div></div>

    <div className="character-profile-layout">
      <div className="character-profile-main">
        <section className="panel character-profile-card" aria-labelledby="profile-backstory-title">
          <div className="character-profile-card-heading"><div><span className="eyebrow">BIOGRAFÍA</span><h3 id="profile-backstory-title">Historia del personaje</h3></div><span className="character-profile-count">{profile.backstory.length}/{PROFILE_TEXT_LIMITS.backstory}</span></div>
          <textarea className="character-profile-textarea is-large" value={profile.backstory} maxLength={PROFILE_TEXT_LIMITS.backstory} rows={9}
            placeholder="¿De dónde viene? ¿Qué le llevó a convertirse en aventurero? ¿Qué persigue ahora?"
            aria-label="Historia del personaje" onChange={event=>edit('backstory',event.target.value)}/>
        </section>
        <section className="panel character-profile-card" aria-labelledby="profile-personality-title">
          <div className="character-profile-card-heading"><div><span className="eyebrow">INTERPRETACIÓN</span><h3 id="profile-personality-title">Personalidad y motivaciones</h3></div></div>
          <div className="character-profile-fields">
            {DESCRIPTION_FIELDS.map(field=><label className="character-profile-field" key={field.key}>
              <span>{field.label} <small>{profile[field.key].length}/{PROFILE_TEXT_LIMITS[field.key]}</small></span>
              <textarea rows={field.rows} maxLength={PROFILE_TEXT_LIMITS[field.key]} placeholder={field.hint}
                value={profile[field.key]} onChange={event=>edit(field.key,event.target.value)}/>
            </label>)}
          </div>
        </section>
        <section className="panel character-profile-card" aria-labelledby="profile-notes-title">
          <div className="character-profile-card-heading"><div><span className="eyebrow">CUADERNO</span><h3 id="profile-notes-title">Notas de aventura</h3></div><span className="character-profile-count">{profile.notes.length}/{PROFILE_TEXT_LIMITS.notes}</span></div>
          <textarea className="character-profile-textarea" value={profile.notes} maxLength={PROFILE_TEXT_LIMITS.notes} rows={7}
            placeholder="Personajes conocidos, pistas, objetivos, lugares, recuerdos de sesión…"
            aria-label="Notas de aventura" onChange={event=>edit('notes',event.target.value)}/>
        </section>
      </div>

      <aside className="character-profile-side">
        <section className="panel character-profile-card" aria-labelledby="profile-portrait-title">
          <div className="character-profile-card-heading"><div><span className="eyebrow">RETRATO</span><h3 id="profile-portrait-title">Imagen del personaje</h3></div></div>
          <div className="character-profile-portrait">
            {profile.portraitDataUrl
              // Se admite exclusivamente una imagen JPEG generada localmente y validada.
              ? <Image src={profile.portraitDataUrl} width={360} height={360} unoptimized alt={`Retrato de ${name.trim() || 'tu personaje'}`}/>
              : <span aria-hidden="true">{name.trim()[0]?.toLocaleUpperCase('es') ?? '?'}</span>}
          </div>
          <div className="character-profile-portrait-actions">
            <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} className="character-profile-file-input"/>
            <label className="character-profile-upload" htmlFor={inputId}>{uploading?'Procesando retrato…':'Elegir imagen'}</label>
            {profile.portraitDataUrl&&<button type="button" className="character-profile-remove" onClick={removePortrait}>Quitar retrato</button>}
          </div>
          {uploadError&&<p className="character-profile-error" role="alert">{uploadError}</p>}
          <p className="character-profile-hint">JPG, PNG o WebP de hasta 5 MB. La imagen se recorta y reduce antes de guardarla; también se mostrará en la cabecera.</p>
        </section>
        <section className="panel character-profile-card" aria-labelledby="profile-identity-title">
          <div className="character-profile-card-heading"><div><span className="eyebrow">HOJA</span><h3 id="profile-identity-title">Identidad</h3></div></div>
          <dl className="character-profile-identity">
            <div><dt>Nombre</dt><dd>{name.trim()||'Sin nombre'}</dd></div>
            <div><dt>Clase y nivel</dt><dd>Guerrero {level}</dd></div>
            <div><dt>Especie</dt><dd>{species}</dd></div>
            <div><dt>Trasfondo</dt><dd>{background}</dd></div>
          </dl>
          <button className="character-profile-edit-link" type="button" onClick={onEditIdentity}>Editar identidad y origen</button>
          <p className="character-profile-hint">Estos valores vienen del creador de personaje. No se duplican aquí.</p>
        </section>
        <section className="panel character-profile-card" aria-labelledby="profile-physical-title">
          <div className="character-profile-card-heading"><div><span className="eyebrow">DESCRIPCIÓN</span><h3 id="profile-physical-title">Detalles físicos</h3></div></div>
          <div className="character-profile-physical">
            {PHYSICAL_FIELDS.map(field=><label key={field.key}>
              <span>{field.label}</span><input type="text" value={profile[field.key]} maxLength={PROFILE_TEXT_LIMITS[field.key]}
                placeholder={field.placeholder} onChange={event=>edit(field.key,event.target.value)}/>
            </label>)}
          </div>
        </section>
      </aside>
    </div>
    <div className="character-profile-save-note" role="note">Los cambios se mantienen en pantalla. Para conservarlos en PostgreSQL, pulsa <strong>«Actualizar guardado»</strong> en «Mis personajes», o «Guardar como nuevo» si todavía no has guardado este personaje.</div>
  </div>;
}
