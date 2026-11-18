/** Selección inicial de beneficios épicos para el Mago de nivel 19 (PHB 2024).
 * Reutiliza las tres opciones ya habilitadas para Guerrero y añade dos
 * especialmente relevantes al lanzador. El catálogo general de dotes sigue
 * siendo parcial, como en Guerrero; los otros beneficios quedan pendientes.
 */
import {ABILITIES,type Ability,type AbilityScores} from './abilities';
import {EPIC_BOONS,applyEpicBoon,type EpicBoonId,type EpicBoonChoice} from './epic-boons';

export const WIZARD_EPIC_BOONS={
 ...EPIC_BOONS,
 spell_recall:'Beneficio épico: Recuperación de conjuros',
 truesight:'Beneficio épico: Visión verdadera',
} as const;
export type WizardEpicBoonId=EpicBoonId|'spell_recall'|'truesight';
export type WizardEpicBoonChoice=Readonly<{id:WizardEpicBoonId;ability:Ability}>;
export const WIZARD_EPIC_BOON_DESCRIPTIONS:Readonly<Record<WizardEpicBoonId,string>>={
 combat_prowess:'+1 a una característica (máximo 30). Cuando fallas una tirada de ataque puedes convertir ese fallo en impacto; vuelve a estar disponible al comenzar tu turno siguiente. La decisión de usarlo es manual.',
 fortitude:'+1 a una característica (máximo 30). Tus PG máximos aumentan en 40; cuando recuperas PG puedes recuperar adicionalmente tu modificador de Constitución. Las curaciones se registran manualmente.',
 speed:'+1 a una característica (máximo 30) y +30 pies a tu velocidad. Puedes Destrabarte mediante acción adicional, terminando también Agarrado; estas acciones se declaran en mesa.',
 spell_recall:'+1 a Inteligencia, Sabiduría o Carisma (máximo 30). Cada vez que lanzas un conjuro usando una ranura de nivel 1–4, tiras 1d4; si coincide con el nivel de ranura, esta no se gasta. La aplicación ofrece esa tirada, pero deja al jugador marcar la ranura.',
 truesight:'+1 a una característica (máximo 30). Obtienes Visión verdadera hasta una distancia de 60 pies; se refleja como sentido pasivo en la hoja.',
};

export function applyWizardEpicBoon(scores:AbilityScores,choice:WizardEpicBoonChoice):AbilityScores{
 if(!choice||typeof choice!=='object'||Array.isArray(choice)||!Object.hasOwn(WIZARD_EPIC_BOONS,choice.id))
  throw new RangeError('Elige un beneficio épico disponible para Mago nivel 19');
 if(!ABILITIES.includes(choice.ability))throw new RangeError('Característica inválida para el beneficio épico');
 if(choice.id==='spell_recall'&&!(['intelligence','wisdom','charisma'] as readonly Ability[]).includes(choice.ability))
  throw new RangeError('Recuperación de conjuros solo aumenta Inteligencia, Sabiduría o Carisma');
 if(Object.hasOwn(EPIC_BOONS,choice.id))return applyEpicBoon(scores,choice as EpicBoonChoice);
 if(scores[choice.ability]>=30)throw new RangeError('El beneficio épico no puede superar 30');
 return {...scores,[choice.ability]:scores[choice.ability]+1};
}

/** Resultado verificable de la tirada opcional de Recuperación de conjuros.
 * No gasta ni recupera ranuras: la elección activa queda en manos del jugador.
 */
export function wizardSpellRecallResult(slotLevel:number,die:number):Readonly<{slotLevel:number;die:number;keepsSlot:boolean}>{
 if(!Number.isInteger(slotLevel)||slotLevel<1||slotLevel>4)throw new RangeError('Recuperación de conjuros solo permite ranuras de nivel 1–4');
 if(!Number.isInteger(die)||die<1||die>4)throw new RangeError('El resultado debe proceder de un d4');
 return {slotLevel,die,keepsSlot:slotLevel===die};
}
