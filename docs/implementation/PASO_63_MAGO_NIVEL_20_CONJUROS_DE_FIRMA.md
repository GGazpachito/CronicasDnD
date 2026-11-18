# Paso 63 — Mago nivel 20: Conjuros de firma y progresión completa

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`. Base comprobada: la actualización **62** ya está en la rama principal.

## Objetivo y alcance

Completar el recorrido de **Mago Evocador del nivel 1 al 20** y conectar el rasgo **Conjuros de firma** (*Signature Spells*) con la creación guiada, la hoja de personaje, los recursos por descanso, el guardado y el retroceso seguro al nivel 19.

Como en el resto de Crónicas, el usuario decide las acciones y el director de juego resuelve sus consecuencias. La web presenta el catálogo y las fichas, calcula las estadísticas pasivas y administra **marcadores declarativos**: un clic registra un uso gratuito porque el jugador afirma haber lanzado ese conjuro. No lanza conjuros, elige objetivos ni aplica efectos automáticamente.

## Reglas oficiales de D&D 2024

| Dato | Nivel 19 | Nivel 20 |
| --- | ---: | ---: |
| Bonificador de competencia | +6 | +6 |
| Trucos | 5 | 5 |
| Conjuros ordinarios aprendidos por progresión | 42 | **44** |
| Conjuros preparados normales | 24 | **25** |
| Maestría de conjuros (nivel 18) siempre preparada | 2 adicionales | **2 conservados** |
| Conjuros de firma siempre preparados | 0 | **2 adicionales** |
| Ranuras nivel 7 | 1 | **2** |
| Ranuras niveles 1–9 | 4/3/3/3/3/2/1/1/1 | **4/3/3/3/3/2/2/1/1** |

En nivel 20 se eligen **dos conjuros de nivel 3 diferentes** que estén en el libro, incluidos los adquiridos en esta misma subida. No se exige tiempo de lanzamiento específico. Están siempre preparados además de los **25 normales** y de los **2 dominados por Maestría**, con un total de cuatro conjuros siempre preparados. **Cada uno** puede lanzarse **una vez gratuitamente, solo a nivel 3**, hasta que termine un descanso corto o largo. Los lanzamientos con ranura superior consumen esa ranura según las reglas normales; los efectos, los objetivos y las tiradas siguen gestionándose en mesa. Una vez agotado el lanzamiento gratuito, el conjuro sigue preparado y puede lanzarse gastando ranura.

**Fuentes primarias:**

- [D&D Beyond, Mago 2024 — *Level 20: Signature Spells*](https://www.dndbeyond.com/classes/2190886-wizard).
- [D&D Beyond, Basic Rules 2024 — tabla de Mago](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes).

## Diseño y decisiones técnicas

### Motor y persistencia

- El archivo `wizard.ts` ya incorporaba la tabla oficial completa, el rasgo de nivel 20, la validación genérica `signatureSpellIds`, los marcadores `signatureUsed` y las funciones puras `wizardUseSignatureSpell`, `wizardShortRest` y `wizardLongRest`. **Se reutilizan sin modificar ese archivo**.
- `wizard-creation.ts` amplía el tipo de entrada y la validación guiada al **nivel 20**, agrega `signatureSpellIds: [id1,id2]` (obligatoria en 20, prohibida antes), calcula la preparación automática y permite conservar únicamente los **dos IDs seleccionados de nivel 3** como usos gratuitos ya gastados. Rechaza usos duplicados, IDs falsos y consumos antes de nivel 20.
- `wizard-level-up.ts` habilita **19→20**, exige las elecciones válidas y añade dos conjuros ordinarios al libro. Conserva `epicBoon`, `spellMasteryIds`, Evocación, perfil, inventario, recursos y daño. Agrega el segundo espacio de nivel 7 como disponible.
- El estado persiste en `wizardState.magic.signatureUsed` con el mismo **`schemaVersion: 3`**. `wizardShortRest` vacía solo los usos gratuitos: **no** modifica ranuras, curación, contador de Sobrecarga o uso de Recuperación arcana. `wizardLongRest` los vacía junto con la recuperación habitual de los demás recursos.
- `wizard-spell-library.ts` fuerza a aparecer como aprendidos y preparados tanto los dos conjuros de Maestría como los dos de firma, aunque el selector manual flexible los hubiera desmarcado. `WizardSpellLibrary.tsx` no deja desmarcar ninguno de los cuatro rasgos de preparación obligatoria.
- `wizard-traits.ts` conserva el rasgo de nivel 20 y muestra los nombres de los dos conjuros elegidos en Rasgos.

### Interfaz

- `WizardLevelUpWizard.tsx`: dialogo de tres pasos con nuevo nivel, selección separada de dos conjuros de firma (candidatos del libro y de la subida actual), acceso a las fichas de reglas y revisión. Impide continuar con elecciones inválidas y refleja los 25 preparados y la segunda ranura de nivel 7.
- `wizard/page.tsx`: el botón Subir de nivel llega hasta 20, pero desaparece después. **Principal** expone los usos gratuitos restantes como recurso. En **Hechizos** hay un panel que muestra ambos conjuros, su ficha y un botón por conjuro para registrar el lanzamiento gratuito; quedan bloqueados tras usarlos y el estado se guarda.
- El panel incluye **Confirmar descanso corto**, que recupera los dos usos gratuitos. El descanso largo existente también los recupera y permite mantener o sustituir **una Maestría** del nivel 18. Recuperación arcana y Memorizar conjuro siguen siendo operaciones separadas; no se recuperan PG automáticamente mediante el botón de descanso corto.
- No se registra la acción de lanzar un conjuro con ranura ni se gastan espacios al consultar su ficha o pulsar una tirada. Si un conjuro de firma se lanza pagando una ranura, la marca el jugador, sin tocar el registro de usos gratuitos.

### Retroceso 20→19

La previsualización `previewWizardLevelDown`:

1. Elimina `signatureSpellIds`, el rasgo de nivel 20 y los dos lanzamientos gratuitos acumulados, y reduce la preparación reglamentaria de 25 a 24.
2. Retira los **dos conjuros de progresión del nivel 20** del libro (44→42), sin borrar los conjuros de firma que ya se conocían en niveles anteriores.
3. Retira la segunda ranura de nivel 7, conserva el estado gastado de la primera y todas las demás ranuras válidas.
4. **Conserva `epicBoon` y su aumento de característica del nivel 19**, las dos Maestrías del nivel 18, Evocación y el resto de elecciones anteriores, el daño compatible, el perfil y los objetos.

## Regresiones automatizadas

Nuevo archivo: `packages/rules-engine/tests/wizard-level-20-63.test.ts`:

1. Construcción completa 1→20, con libro 44, preparados 25 + 4 siempre preparados, competencia +6 y ranuras exactas.
2. Rechazo de elecciones omitidas, duplicadas, de nivel diferente a 3, inexistentes o antes del nivel 20.
3. Posibilidad de convertir en firma un conjuro de nivel 3 aprendido **en la subida 19→20**.
4. Marcadores de uso independientes y validación de una sola activación gratuita por conjuro, sin consumir ranuras.
5. Reinicio tras descanso corto y largo y preservación de recursos que el corto no debe alterar.
6. Guardado/carga del esquema v3 con usos gastados, prueba de rechazo de IDs ajenos o repetidos.
7. Biblioteca manual y Rasgos: los cuatro conjuros permanentemente preparados se ven sin depender de marcas manuales.
8. Retroceso 20→19 preservando la dote épica, Maestrías, heridas y ranura de nivel 7 anterior gastada.

Además, en `wizard-level-19-62.test.ts` se adapta una aserción de progresión: desde 19 ahora se puede subir a 20; desde 20 termina la progresión.

## Pruebas y verificaciones manuales

1. Partir de un Mago Evocador **19**. Abrir la subida y confirmar **24→25 preparados**, **42→44 conjuros**, competencia +6 y ranuras de nivel 7 **1→2**.
2. Aprender dos conjuros nuevos (por ejemplo, **Palabra de poder: matar** y **Muro prismático**); preparar uno. Escoger como firma **Bola de fuego** y **Volar**. Verificar que solo pueden escogerse conjuros de nivel 3 del libro y que las dos opciones no pueden coincidir.
3. Confirmar nivel 20: en **Hechizos** aparecen los dos conjuros de firma, junto a sus fichas. Deben figurar **siempre preparados**, sin aumentar la cantidad de 25 preparados normales y sin borrar las dos Maestrías.
4. Pulsar **Registrar lanzamiento gratuito** en Bola de fuego: su uso pasa a gastado, pero Volar sigue disponible y no se toca ninguna ranura. Pulsar en Volar: quedan ambos gastados. Un segundo clic en el primero debe estar deshabilitado.
5. **Guardar y volver a cargar**: deben mantenerse ambos usos gastados, las firmas elegidas, la dote épica y las Maestrías.
6. Pulsar **Confirmar descanso corto**: ambos usos vuelven a disponibles, pero las ranuras gastadas y el contador de Sobrecarga permanecen sin cambios.
7. Volver a gastar un lanzamiento gratuito y hacer **Descanso largo** con el diálogo de Maestría: deben restablecerse ambas firmas y todas las ranuras, y reiniciarse Sobrecarga.
8. Probar la biblioteca manual y **Rasgos**: no deben poder desmarcarse las dos Maestrías ni las dos firmas. Probar un lanzamiento con ranura de nivel superior y verificar que el contador gratuito no se modifica automáticamente.
9. Gastar la primera y la segunda ranura de nivel 7, y un uso gratuito de firma; bajar **20→19**. Deben desaparecer el registro de firmas y la segunda ranura de nivel 7, pero **la primera continúa gastada**, las Maestrías y el Beneficio épico persisten y el daño compatible permanece.
10. En nivel 20, el botón **Subir de nivel** ya no debe estar disponible. Desde nivel 19 debe volver a ofrecerse.

Ejecutar desde la raíz del repositorio:

```cmd
pnpm --filter @dnd/rules-engine test
pnpm build
```

Esta entrega se prepara como ZIP con cambios acotados y rutas originales. La copia de trabajo de este chat no contiene el monorepo completo con todas las dependencias; por ello Vitest y el build de Next.js deben ejecutarse tras descomprimir el parche en el proyecto local.

## Archivos del ZIP

**Nuevo**:

- `packages/rules-engine/tests/wizard-level-20-63.test.ts`
- `docs/implementation/PASO_63_MAGO_NIVEL_20_CONJUROS_DE_FIRMA.md`

**Actualizados**:

- `packages/rules-engine/src/wizard-creation.ts`
- `packages/rules-engine/src/wizard-level-up.ts`
- `packages/rules-engine/src/level-down.ts`
- `packages/rules-engine/src/wizard-traits.ts`
- `packages/rules-engine/src/wizard-spell-library.ts`
- `packages/rules-engine/tests/wizard-level-19-62.test.ts`
- `apps/web/src/components/WizardLevelUpWizard.tsx`
- `apps/web/src/components/WizardSpellLibrary.tsx`
- `apps/web/src/app/wizard/page.tsx`

## Próxima etapa: actualización 64 — Auditoría de Mago 1–20

Una vez completados los niveles, toca la **revisión integral de Mago Evocador 1–20**: validación transversal de clases y niveles, coherencia de descansos, libro y biblioteca manual, pruebas de creación y retroceso, validación de la interfaz, persistencia y preparación de una sección de la memoria del TFG que documente arquitectura, decisiones, cobertura y limitaciones antes de ampliar más clases.

## Trazabilidad para el TFG

La actualización aporta un caso completo de evolución de estados y recursos dependientes de nivel, reglas condicionales por descanso, invariantes entre elecciones reglamentarias y biblioteca flexible, normalización de snapshots con compatibilidad hacia atrás, pruebas de regresión y separación deliberada de lógica pasiva y acciones declaradas por los jugadores. La clase Mago queda completa de nivel 1 a 20 en esta primera implementación de Evocación.
