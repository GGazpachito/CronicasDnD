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

type EditableSection = 'backstory' | 'personality' | 'notes' | 'portrait' | 'physical';

const SECTION_KEYS: Record<EditableSection, readonly (keyof CharacterProfile)[]> = {
  backstory: ['backstory'],
  personality: ['appearance', 'personality', 'ideals', 'bonds', 'flaws'],
  notes: ['notes'],
  portrait: ['portraitDataUrl'],
  physical: ['age', 'height', 'weight', 'eyes', 'hair', 'skin'],
};

function SectionActions({title,editing,onEdit,onSave,onCancel,savingDisabled=false}: {
  title:string;
  editing:boolean;
  onEdit:()=>void;
  onSave:()=>void;
  onCancel:()=>void;
  savingDisabled?:boolean;
}) {
  return <div className="character-profile-actions">
    {editing ? <>
      <button type="button" className="character-profile-action is-save" onClick={onSave} disabled={savingDisabled} aria-label={`Guardar ${title}`}>Guardar</button>
      <button type="button" className="character-profile-action is-cancel" onClick={onCancel} aria-label={`Cancelar edición de ${title}`}>Cancelar</button>
    </> : <button type="button" className="character-profile-action is-edit" onClick={onEdit} aria-label={`Editar ${title}`}>
      <span aria-hidden="true">✎</span> Editar
    </button>}
  </div>;
}

function DisplayText({value,empty='Sin completar todavía.'}: {value:string;empty?:string}) {
  return <p className={`character-profile-readonly${value.trim()?'':' is-empty'}`}>{value.trim()||empty}</p>;
}

export default function CharacterProfilePanel({profile,name,species,background,level,onChange,onEditIdentity}:Props) {
  const inputId = useId();
  const uploadSequence = useRef(0);
  const [uploading,setUploading] = useState(false);
  const [uploadError,setUploadError] = useState<string | null>(null);
  // Los borradores existen solo mientras se edita cada tarjeta. El perfil real es la fuente única.
  const [drafts,setDrafts] = useState<Partial<Record<EditableSection,CharacterProfile>>>({});

  // Si la pestaña se desmonta (por ejemplo, al cargar otro personaje), invalida cargas pendientes.
  useEffect(() => {
    const sequenceRef = uploadSequence;
    return () => { sequenceRef.current++; };
  }, []);

  function startEditing(section:EditableSection) {
    setDrafts(current => ({...current,[section]:{...profile}}));
    if (section === 'portrait') setUploadError(null);
  }
  function cancelEditing(section:EditableSection) {
    if (section === 'portrait') {
      uploadSequence.current++;
      setUploading(false);
      setUploadError(null);
    }
    setDrafts(current => {
      const next = {...current};
      delete next[section];
      return next;
    });
  }
  function updateDraft(section:EditableSection,key:CharacterProfileTextKey,value:string) {
    setDrafts(current => {
      const draft = current[section];
      return draft ? {...current,[section]:{...draft,[key]:value}} : current;
    });
  }
  function saveEditing(section:EditableSection) {
    if (section === 'portrait' && uploading) return;
    const draft = drafts[section];
    if (!draft) return;
    // Fusionar SOLO los campos de esta tarjeta. Guardar otra tarjeta no revierte cambios previos.
    const updatedFields = Object.fromEntries(SECTION_KEYS[section].map(key => [key,draft[key]])) as Partial<CharacterProfile>;
    onChange({...profile,...updatedFields});
    setDrafts(current => {
      const next = {...current};
      delete next[section];
      return next;
    });
    if (section === 'portrait') setUploadError(null);
  }
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !drafts.portrait) return;
    const sequence = ++uploadSequence.current;
    setUploading(true);
    setUploadError(null);
    try {
      const portraitDataUrl = await optimizePortrait(file);
      if (sequence === uploadSequence.current) {
        setDrafts(current => current.portrait
          ? {...current,portrait:{...current.portrait,portraitDataUrl}}
          : current);
      }
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
    setDrafts(current => current.portrait
      ? {...current,portrait:{...current.portrait,portraitDataUrl:undefined}}
      : current);
  }

  const backstoryDraft = drafts.backstory;
  const personalityDraft = drafts.personality;
  const notesDraft = drafts.notes;
  const physicalDraft = drafts.physical;
  const portraitDraft = drafts.portrait;
  const visiblePortrait = portraitDraft ? portraitDraft.portraitDataUrl : profile.portraitDataUrl;

  return <div className="character-profile-page">
    <div className="sheet-section-heading"><div>
      <span className="eyebrow">PERSONAJE · ACTUALIZACIÓN 42.1</span>
      <h2>Identidad e historia</h2>
      <p>Consulta los textos como parte de tu ficha. Pulsa «Editar» en cualquier apartado para modificarlos.</p>
    </div></div>

    <div className="character-profile-layout">
      <div className="character-profile-main">
        <section className="panel character-profile-card" aria-labelledby="profile-backstory-title">
          <div className="character-profile-card-heading">
            <div><span className="eyebrow">BIOGRAFÍA</span><h3 id="profile-backstory-title">Historia del personaje</h3></div>
            <div className="character-profile-heading-actions">
              {backstoryDraft && <span className="character-profile-count">{backstoryDraft.backstory.length}/{PROFILE_TEXT_LIMITS.backstory}</span>}
              <SectionActions title="Historia del personaje" editing={!!backstoryDraft}
                onEdit={()=>startEditing('backstory')} onSave={()=>saveEditing('backstory')} onCancel={()=>cancelEditing('backstory')}/>
            </div>
          </div>
          {backstoryDraft
            ? <textarea className="character-profile-textarea is-large" value={backstoryDraft.backstory} maxLength={PROFILE_TEXT_LIMITS.backstory} rows={9}
                placeholder="¿De dónde viene? ¿Qué le llevó a convertirse en aventurero? ¿Qué persigue ahora?"
                aria-label="Historia del personaje" onChange={event=>updateDraft('backstory','backstory',event.target.value)}/>
            : <DisplayText value={profile.backstory} empty="Aquí aparecerá la historia de tu personaje."/>}
        </section>

        <section className="panel character-profile-card" aria-labelledby="profile-personality-title">
          <div className="character-profile-card-heading">
            <div><span className="eyebrow">INTERPRETACIÓN</span><h3 id="profile-personality-title">Personalidad y motivaciones</h3></div>
            <SectionActions title="Personalidad y motivaciones" editing={!!personalityDraft}
              onEdit={()=>startEditing('personality')} onSave={()=>saveEditing('personality')} onCancel={()=>cancelEditing('personality')}/>
          </div>
          <div className="character-profile-fields">
            {DESCRIPTION_FIELDS.map(field => personalityDraft
              ? <label className="character-profile-field" key={field.key}>
                  <span>{field.label} <small>{personalityDraft[field.key].length}/{PROFILE_TEXT_LIMITS[field.key]}</small></span>
                  <textarea rows={field.rows} maxLength={PROFILE_TEXT_LIMITS[field.key]} placeholder={field.hint}
                    value={personalityDraft[field.key]} onChange={event=>updateDraft('personality',field.key,event.target.value)}/>
                </label>
              : <div className="character-profile-field character-profile-field-display" key={field.key}>
                  <span>{field.label}</span><DisplayText value={profile[field.key]}/>
                </div>)}
          </div>
        </section>

        <section className="panel character-profile-card" aria-labelledby="profile-notes-title">
          <div className="character-profile-card-heading">
            <div><span className="eyebrow">CUADERNO</span><h3 id="profile-notes-title">Notas de aventura</h3></div>
            <div className="character-profile-heading-actions">
              {notesDraft && <span className="character-profile-count">{notesDraft.notes.length}/{PROFILE_TEXT_LIMITS.notes}</span>}
              <SectionActions title="Notas de aventura" editing={!!notesDraft}
                onEdit={()=>startEditing('notes')} onSave={()=>saveEditing('notes')} onCancel={()=>cancelEditing('notes')}/>
            </div>
          </div>
          {notesDraft
            ? <textarea className="character-profile-textarea" value={notesDraft.notes} maxLength={PROFILE_TEXT_LIMITS.notes} rows={7}
                placeholder="Personajes conocidos, pistas, objetivos, lugares, recuerdos de sesión…"
                aria-label="Notas de aventura" onChange={event=>updateDraft('notes','notes',event.target.value)}/>
            : <DisplayText value={profile.notes} empty="Todavía no hay notas de aventura."/>}
        </section>
      </div>

      <aside className="character-profile-side">
        <section className="panel character-profile-card" aria-labelledby="profile-portrait-title">
          <div className="character-profile-card-heading">
            <div><span className="eyebrow">RETRATO</span><h3 id="profile-portrait-title">Imagen del personaje</h3></div>
            <SectionActions title="Imagen del personaje" editing={!!portraitDraft}
              onEdit={()=>startEditing('portrait')} onSave={()=>saveEditing('portrait')} onCancel={()=>cancelEditing('portrait')}
              savingDisabled={uploading}/>
          </div>
          <div className="character-profile-portrait">
            {visiblePortrait
              ? <Image src={visiblePortrait} width={360} height={360} unoptimized alt={`Retrato de ${name.trim() || 'tu personaje'}`}/>
              : <span aria-hidden="true">{name.trim()[0]?.toLocaleUpperCase('es') ?? '?'}</span>}
          </div>
          {portraitDraft && <>
            <div className="character-profile-portrait-actions">
              <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} className="character-profile-file-input"/>
              <label className="character-profile-upload" htmlFor={inputId}>{uploading?'Procesando retrato…':'Elegir imagen'}</label>
              {visiblePortrait && <button type="button" className="character-profile-remove" onClick={removePortrait}>Quitar retrato</button>}
            </div>
            {uploadError && <p className="character-profile-error" role="alert">{uploadError}</p>}
            <p className="character-profile-hint">JPG, PNG o WebP de hasta 5 MB. La imagen se reduce antes de guardarla. Pulsa «Guardar» para confirmar el nuevo retrato.</p>
          </>}
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
          <p className="character-profile-hint">Los datos de identidad se modifican desde el creador original para mantener las reglas sincronizadas.</p>
        </section>

        <section className="panel character-profile-card" aria-labelledby="profile-physical-title">
          <div className="character-profile-card-heading">
            <div><span className="eyebrow">DESCRIPCIÓN</span><h3 id="profile-physical-title">Detalles físicos</h3></div>
            <SectionActions title="Detalles físicos" editing={!!physicalDraft}
              onEdit={()=>startEditing('physical')} onSave={()=>saveEditing('physical')} onCancel={()=>cancelEditing('physical')}/>
          </div>
          {physicalDraft
            ? <div className="character-profile-physical">
                {PHYSICAL_FIELDS.map(field=><label key={field.key}>
                  <span>{field.label}</span><input type="text" value={physicalDraft[field.key]} maxLength={PROFILE_TEXT_LIMITS[field.key]}
                    placeholder={field.placeholder} onChange={event=>updateDraft('physical',field.key,event.target.value)}/>
                </label>)}
              </div>
            : <dl className="character-profile-physical-readonly">
                {PHYSICAL_FIELDS.map(field=><div key={field.key}>
                  <dt>{field.label}</dt><dd className={profile[field.key].trim()?'':'is-empty'}>{profile[field.key].trim()||'Sin completar'}</dd>
                </div>)}
              </dl>}
        </section>
      </aside>
    </div>
    <div className="character-profile-save-note" role="note">
      <strong>«Guardar» en una tarjeta</strong> confirma su contenido en la ficha y la deja en modo lectura.
      Para conservar esos cambios en PostgreSQL al cerrar o recargar la página, utiliza <strong>«Actualizar guardado»</strong> en «Mis personajes», o «Guardar como nuevo» para personajes nuevos.
      <strong> «Cancelar»</strong> descarta los cambios no confirmados de esa tarjeta.
    </div>
  </div>;
}
