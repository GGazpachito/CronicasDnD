# Paso 74 · Brujo nivel 5, invocaciones y magia de Pacto

Fecha: 20 de noviembre de 2026. Progresión incremental posterior al paso 73, Brujo nivel 4.

## Alcance razonado para el TFG

Se evaluó de nuevo integrar dos niveles de una vez. El quinto nivel modifica competencia, potencia de ranuras, cantidad y prerrequisitos de invocaciones, cantidad y selección de conjuros, conjuros gratuitos del patrón, ataques de armas y familiares; por ello se decidió cerrar **solo el nivel 5**, con pruebas del motor y revisiones cruzadas. El nivel 6 incorpora además un nuevo rasgo de Patrón Infernal, cuya integración queda para el paso siguiente.

Fuentes normativas: *Player's Handbook D&D 2024*, clase Warlock, tabla de progresión, lista de conjuros, invocaciones sobrenaturales y Patrón Infernal. Consultadas en D&D Beyond (reglas oficiales) el 20 de noviembre de 2026.

## Contrato de progresión

| Dato | Nivel 4 | Nivel 5 |
| --- | ---: | ---: |
| Competencia | +2 | +3 |
| Trucos | 3 | 3 |
| Conjuros ordinarios preparados | 5 | 6 |
| Invocaciones sobrenaturales | 3 | 5 |
| Ranuras de Pacto | 2 de nivel 2 | 2 de nivel 3 |
| Conjuros gratuitos acumulados del Patrón Infernal | 4 | 6 |
| Rayos de Descarga sobrenatural | 1 | 2 |
| Dado de golpe adicional | — | promedio 5 o 1d8 |

El motor mantiene la Constitución, dotes pasivas, características de origen y el historial de mejoras del nivel 4. Una subida conserva el daño acumulado, en lugar de sanar silenciosamente al personaje. El aumento de competencia se proyecta sobre salvaciones, habilidades, ataque de conjuros, CD, ataques con armas entrenadas y la bonificación de Alerta cuando corresponda.

## Datos compartidos de magia

`warlock-spells.ts` añade los **14 conjuros de nivel 3** del Brujo 2024. **13** reutilizan sin copiar las fichas de `wizard-spell-details.ts`. Únicamente se crea la ficha original de *Hambre de Hadar*. `shared-spell-catalog.ts` registra esas fichas en el único catálogo universal, que pasa a **252** fichas, y en el filtro «Brujo» (53 conjuros/trucos).

El Patrón Infernal recibe *Bola de fuego* y *Nube apestosa* siempre preparados, reutilizando las fichas existentes de Mago. No ocupan ninguno de los seis preparados ordinarios. La pestaña «Hechizos» conserva `SharedSpellsLayout` y `SpellLibraryPanel`, todas las fichas y filtros del Mago, y únicamente adapta las ranuras de Pacto a nivel 3 y la lista de preparados disponibles.

## Ocho invocaciones nuevas disponibles en nivel 5

- Paso ascendente: Levitar sobre uno mismo sin ranura.
- Castigo sobrenatural: requiere Pacto de la Hoja, tirada adicional de **4d8 de fuerza** con ranura de Pacto de nivel 3, solo tras impactar y una vez por turno; objetivo enorme o menor puede quedar derribado. El gasto se marca manualmente.
- Mirada de dos mentes: vínculo sensorial y posición alternativa de lanzamiento, de activación manual.
- Don de las profundidades: respirar bajo el agua, velocidad de nado igual a la normal y un lanzamiento gratuito de Respirar bajo el agua por descanso largo (con casilla de uso persistida).
- Investidura del Señor de la Cadena: requiere Pacto de la Cadena; familiar con opción persistida de vuelo o nado de 40 pies, ataques con acción adicional, CD de conjuro del Brujo, daño alternativo y reacción para resistencia. La ficha base continúa proveniente del Bestiario.
- Señor de las múltiples formas: Alterar el propio aspecto sin ranura.
- Uno con las sombras: Invisibilidad sobre sí mismo sin ranura estando en luz tenue u oscuridad.
- Hoja sedienta: requiere Pacto de la Hoja; dos ataques independientes con el arma de pacto equipada al realizar la acción de Atacar.

La elección de invocaciones mantiene las cinco distintas, con un máximo de una sustitución de las tres anteriores. Los prerrequisitos se validan en el motor y no solo por el selector. El mismo asistente (`LevelUpDialogFrame`) con tres etapas, fichas mágicas (`WizardSpellDetails`) y `LevelUpHitPointsPicker` se mantiene sin recrear estilos.

## Persistencia y reversibilidad

`level5History` guarda las tres invocaciones, tres trucos, cinco preparados, elecciones de pacto y efectos relevantes del nivel 4 antes de la subida. En la bajada **5→4** se restauran esas opciones, se elimina el dado de nivel 5 y vuelven las ranuras a nivel 2, retirando las nuevas capacidades sin perder los historiales 4→3→2. Los recursos de ranuras gastados, inspiración, compañeros manuales y daño se conservan cuando siguen siendo válidos.

`schemaVersion: 4` no cambia: todos los campos nuevos son opcionales (`level5HitDieRoll`, `level5History`, `familiarInvestmentMovement`, `giftOfDepthsUsed`). Los guardados de Brujo 1–4 siguen cargando. La velocidad y el uso gratuito del familiar/Don de las profundidades solo se permiten si la invocación correspondiente está activa y el personaje es de nivel 5.

## Verificaciones manuales

Ejecutar en la raíz del repositorio, cada orden por separado:

```powershell
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

1. **Subida común**: crear o cargar Brujo de nivel 4, pulsar «Subir nivel». Debe abrir `LevelUpDialogFrame` con tres pasos y los mismos botones, búsqueda de magia, tarjetas de detalles y elección de promedio o tirada 1d8 que en Mago/Guerrero.
2. **Nuevo reparto de invocaciones**: seleccionar cinco invocaciones, conservando al menos dos de las tres anteriores. Intentar duplicar opciones y activar Hoja sedienta sin Pacto de la Hoja, o Investidura sin Pacto de la Cadena: la confirmación debe bloquearse.
3. **Conjuros ordinarios**: verificar que permite seis, de niveles 1–3, con máximo una sustitución anterior. En la biblioteca universal comprobar los filtros Mago/Brujo/Patrón Infernal y la ficha de Hambre de Hadar. Verificar que Bola de fuego y Nube apestosa están siempre preparados pero no ocupan las seis elecciones ordinarias.
4. **Competencia**: comprobar +3 en Principal; verificar CD, ataque de hechizo, habilidades y salvaciones frente a la hoja de nivel 4.
5. **Pacto**: marcar el gasto de las dos ranuras de nivel 3 y restaurarlas con descanso corto/largo. Astucia mágica conserva su límite de uso y recupera solo una ranura gastada.
6. **Descarga sobrenatural**: lanzar desde Principal; deben aparecer dos rayos con dos tiradas de ataque independientes y una tarjeta de daño por rayo, con modificador de Descarga agonizante cuando esté elegida.
7. **Pacto de la Hoja**: con Hoja sedienta, equipar el arma vinculada y comprobar «Atacar ×2» con dos d20. Con Castigo sobrenatural, el botón de 4d8 funciona solo para el arma de pacto equipada, indica el gasto de ranura manual y duplica dados en crítico. Retirar/equipar el arma debe retirar/restaurar esos botones.
8. **Pacto de la Cadena**: con Investidura activa, seleccionar un familiar en Compañeros; cambiar entre vuelo y nado de 40 pies; comprobar la CD del Brujo y que la ficha básica de la criatura sigue proviniendo del Bestiario.
9. **Don de las profundidades**: ver velocidad de nado igual al movimiento normal y marcar el uso gratuito de Respirar bajo el agua. Descanso corto mantiene la marca; descanso largo la restablece.
10. **Bajada y guardado**: guardar Brujo de nivel 5, recargarlo, bajar a 4 y comprobar recuperación exacta de invocaciones, preparados, pactos y PG; seguir bajando a 3 y 2. Abrir guardados anteriores de niveles 1–4 sin error.

## Pruebas y limitaciones del entorno

`packages/rules-engine/tests/warlock-level-5-74.test.ts` cubre tablas, límites, magia compartida, prerrequisitos, guardados, mejoras del familiar y reversibilidad. Las pruebas de humo del motor (pasos 66, 69, 70, 72, 73 y 74) se ejecutan en Node 24. El entorno de empaquetado contiene solo una copia parcial del monorepo y no dispone de todas las dependencias de Vitest/Next; ejecutar los tres comandos en el repositorio local del desarrollador antes de publicar.

## Próxima actualización

**Brujo nivel 6: Suerte del Oscuro (Patrón Infernal)**. Preparar el módulo de activación manual que añade 1d10 a una prueba de característica o salvación tras ver el d20, con usos iguales al modificador de Carisma (mínimo uno) y recuperación tras descanso largo, manteniendo el contrato común de progresión y hojas.
