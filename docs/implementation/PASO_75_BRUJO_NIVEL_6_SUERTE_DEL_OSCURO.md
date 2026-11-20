# Paso 75 — Brujo nivel 6: Suerte del Oscuro

**Fecha:** 20 de noviembre de 2026. **Reglas:** D&D 2024, Patrón Infernal (Fiend). **Dependencia:** actualización 74 y parche 74.1.

## Objetivo y alcance

Extender la progresión del Brujo de nivel 5 a nivel 6, respetando rigurosamente las ventanas y pestañas comunes. No se crean módulos generales alternativos ni se duplican fichas de conjuros del Mago.

## Verificación reglamentaria

Referencia primaria: https://www.dndbeyond.com/sources/dnd/br-2024/character-classes — tabla «Warlock Features» y apartado «Level 6: Dark One’s Own Luck», Patrón Infernal.

| Recurso | Nivel 5 | Nivel 6 |
| --- | --- | --- |
| Competencia | +3 | +3 |
| Trucos | 3 | 3 |
| Invocaciones sobrenaturales | 5 | 5 |
| Preparados ordinarios de Brujo | 6 | 7 |
| Preparados gratuitos del Patrón Infernal | 6 | 6 |
| Ranuras de Magia de Pacto | 2 de nivel 3 | 2 de nivel 3 |
| Dado de golpe | 5d8 acumulados | +1d8 (promedio 5 o tirada) |
| Rasgo especial | Bendición del Oscuro | + Suerte del Oscuro |

**Suerte del Oscuro:** tras ver un d20 de **prueba de característica o tirada de salvación**, el jugador puede decidir sumar 1d10 *antes de resolver sus efectos*. Uso máximo **una vez por tirada**. Usos totales = modificador de Carisma, mínimo 1. Se recuperan en **descanso largo**, nunca en corto. No altera tiradas de ataque o daño.

## Diseño

### Motor

- `warlock.ts` acepta nivel 6 en su contrato `GuidedWarlockInput` y calcula PG, inventario, características, guardado y modificadores.
- Se registra `level6HitDieRoll` y `level6History` opcional en el contrato del snapshot (esquema 4 inalterado).
- Se validan exactamente siete preparados ordinarios, cinco invocaciones con requisitos de pacto, y tres trucos. Las seis preparaciones adicionales del patrón NO ocupan plazas ordinarias.
- `warlockDarkOnesOwnLuckMaximum` calcula usos disponibles y `spendWarlockDarkOnesOwnLuck` realiza una transición pura que consume un uso. `darkOnesOwnLuckUsed` no existe en niveles inferiores; se valida entre 0 y el máximo vigente para nivel 6.
- `warlockShortRest` conserva el gasto de Suerte del Oscuro; `warlockLongRest` lo reinicia, sin cambiar órdenes de familiar ni decisiones narrativas.
- `warlock-level-up.ts` valida la transición 5→6: séptimo conjuro preparado, a lo sumo una sustitución de preparado antiguo, de truco y de invocación, dado de golpe y preservación del daño.
- `previewWarlockLevelDown` valida 6→5, retira Suerte del Oscuro, recompone las elecciones guardadas sin volver a tirar, y conserva equipo, compañeros y recursos anteriores.
- `warlock-traits.ts` registra el rasgo de nivel 6 dentro de `TraitsPanel` compartido.

### Interfaz

- `WarlockLevelUpWizard` reutiliza `LevelUpDialogFrame` (Novedades / Elecciones / Confirmación), `LevelUpHitPointsPicker` y tarjetas de conjuros con buscador y `WizardSpellDetails`.
- `WarlockLuckPanel` es una **extensión específica** que aparece en Recursos (Principal) y en Rasgos. Muestra usos actuales, un botón voluntario para tirar 1d10 y el resultado con la presentación de dados ya utilizada por otras tiradas.
- El jugador decide dónde aplicar el bono: **no se modifica automáticamente ninguna salvación ni prueba previamente lanzada**.
- La pestaña Hechizos sigue usando `SharedSpellsLayout`, `SpellLibraryPanel` y la totalidad del catálogo compartido; no hay conjuros nuevos a nivel 6.
- El selector de subida se desbloquea en nivel 5 y se desactiva al alcanzar 6, hasta el siguiente paso de implementación.

## Compatibilidad y pruebas

- Los guardados antiguos de Brujo (niveles 1–5, versión 4) siguen admitidos, sin campos nuevos obligatorios.
- La salida 6→5 elimina el recurso exclusivo y restaura exactamente preparaciones e invocaciones previas; el historial 5→4 permanece.
- Nueva suite `tests/warlock-level-6-75.test.ts`: elecciones, límites, PG, rasgo, usos, descanso corto/largo, serialización, requisitos de pacto y descenso.
- Se ejecuta una comprobación independiente de reglas mediante Node en el entorno de trabajo; para verificación integral ejecutar en el monorrepositorio del usuario las pruebas, `lint` y `build` completos.

## Verificaciones manuales recomendadas

1. Cargar un Brujo Infernal de nivel 5; abrir subida a 6 y comprobar las tres etapas con exactamente el mismo formato que Mago/Guerrero.
2. Elegir promedio 5 o lanzar 1d8; añadir el séptimo conjuro de la lista de Brujo, sin perder los seis del patrón.
3. Comprobar que los trucos siguen siendo 3, las invocaciones 5 y el máximo de dos ranuras de nivel 3.
4. En Principal y Rasgos, usar «Suerte del Oscuro» tras un d20, ver la tarjeta de 1d10 y la disminución del contador.
5. Verificar que un descanso corto no devuelve usos, pero un descanso largo sí.
6. Usar todos los usos y confirmar que el botón queda deshabilitado.
7. Guardar, recargar y comprobar que el contador persiste.
8. Bajar de nivel 6 a 5: previsualización, confirmación, retorno de seis preparados y retirada del rasgo, sin borrar compañeros, inventario ni gasto de ranuras.
9. Volver a bajar a nivel 4 para verificar que el historial de niveles anteriores sigue disponible.
10. Ejecutar las verificaciones de desarrollo en la instalación completa del repositorio.

## Próxima fase

**Paso 76, Brujo nivel 7:** nuevo nivel de ranuras (4), nuevos hechizos de nivel 4 (reutilizando los del Mago), octavo preparado, sexta invocación y dos conjuros adicionales del Patrón Infernal. La complejidad justifica una actualización propia.
