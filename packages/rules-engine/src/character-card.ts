import { SPECIES_NAMES } from './guided';
import type { CharacterSnapshot } from './persistence';
import type { WizardCharacterSnapshot } from './wizard-creation';

/** Metadatos de la galería derivados de la misma fuente que se guarda en PostgreSQL. */
export function getCharacterCardDetails(snapshot:CharacterSnapshot|WizardCharacterSnapshot){
 const {input}=snapshot;
 const species=SPECIES_NAMES[input.species]??String(input.species);
 const isWizard=snapshot.schemaVersion===3;
 return {
  species,
  subclass:isWizard?(input.level>=3?'Evocación':null):(input.level>=3?'Campeón':null),
  portraitDataUrl:input.profile?.portraitDataUrl||undefined,
 };
}
