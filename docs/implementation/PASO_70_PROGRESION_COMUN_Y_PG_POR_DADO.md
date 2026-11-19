# Paso 70 · Asistente de niveles común y dados de PG

Fecha: 19 de noviembre de 2026. Entrega incremental tras el paso 69.1.

## Necesidad detectada

Brujo utilizaba un diálogo de subida diferente al del resto de clases, con dos columnas, controles específicos y listas de hechizos como `<select>`. Esto rompía la arquitectura de hoja común y dificultaba consultar los conjuros antes de elegirlos. Además, el promedio de PG estaba fijo en el motor de Guerrero y Mago, aunque Brujo ya permitía tirar su d8.

## Decisiones e implementación

1. **Un único asistente visual**: Brujo ahora reutiliza `LevelUpDialogFrame` en tres pasos (Novedades / Elecciones / Confirmación), idéntico a Guerrero y Mago. Se elimina el fondo y estructura CSS especiales. `CharacterHeader` expone Gestionar nivel.
2. **Conjuros consultables**: los dos trucos y tres preparados de Brujo usan campo de búsqueda, tarjetas con casillas y el componente `WizardSpellDetails`, el mismo del Mago. La regla de conservar al menos uno anterior sigue validada en `advanceWarlockToLevelTwo`.
3. **PG promedio/tirada compartidos**: `LevelUpHitPointsPicker` aparece en el paso Elecciones de las tres clases; `level-hit-points.ts` centraliza d10/6, d6/4, d8/5 y operaciones de historial.
4. **PG persistidos**: Guerrero y Mago añaden el campo opcional `levelHitPointRolls`, historial de resultado de dado por nivel posterior al primero. El promedio se almacena como 6 o 4. Guardados antiguos sin campo siguen calculando la media. Los descensos eliminan la última tirada de la lista. Brujo conserva `level2HitDieRoll` y la versión de snapshot 4. Se aplica mínimo 1 PG por nivel para resultados bajos.
5. **Bajada de Brujo**: ahora usa `LevelDownDialog` común con comparación, aviso de elecciones conservadas y aceptación explícita. Su primera implementación 2→1 retiene solo selecciones de nivel 1 compatibles, sin inventar historial no guardado. No cambia la arquitectura de las siete pestañas.
6. **Contrato de no regresión**: documento normativo [`../architecture/ARQUITECTURA_PROGRESION_NIVELES.md`](../architecture/ARQUITECTURA_PROGRESION_NIVELES.md), enlazado desde [`ESTRUCTURA_HOJA_COMUN.md`](../architecture/ESTRUCTURA_HOJA_COMUN.md).

## Verificación manual en Windows

Ejecutar por separado en PowerShell/CMD desde la raíz:

```
pnpm --filter @dnd/rules-engine test
pnpm --filter @dnd/web lint
pnpm build
```

1. **Guerrero**, nivel 1: abrir «Gestionar nivel». Comprobar tres pasos idénticos, elección entre d10 promedio 6 o tirada 1d10, volver a tirar y confirmar. Revisar PG máximos, actualizar guardado, recargar y retroceder: deben recuperarse los PG anteriores.
2. **Mago**, nivel 1: «Gestionar nivel», nuevos conjuros con buscador y fichas desplegables, y selector d6 promedio 4 o 1d6. Elegir dos conjuros válidos, Erudito y preparados; guardar, recargar, bajar nivel. Los PG deben reflejar exactamente el resultado elegido.
3. **Brujo**, nivel 1: «Gestionar nivel». Comprobar exactamente las mismas tres etapas, pie, espaciados, cabecera, botones y estilos que en Mago; elegir tres invocaciones distintas. Buscar trucos/conjuros, desplegar reglas y lanzar una tirada consultiva, seleccionar 2 trucos y 3 preparados válidos.
4. Elegir **d8 promedio 5** y, en otro Brujo, **tirada 1d8**. Comprobar que la confirmación no repite el dado y que se conservan el daño acumulado y los rasgos pasivos de PG.
5. En Brujo nivel 2, «Bajar un nivel»: verificar ventana común con listas de pérdidas/cambios, casilla obligatoria y cancelación sin efectos. Confirmar tras leer las reglas de conservación; comprobar una invocación, dos trucos, dos conjuros, una ranura y PG reajustados.
6. **Regresión**: abrir guardados previos de Guerrero y Mago de niveles altos. Deben tener exactamente los mismos PG que antes; tras subir otro nivel, su historial previo se completa con las medias sin alterar valores anteriores. Baja un nivel tras la subida con dado y verifica los cálculos.
7. Comparar las ventanas en móvil y escritorio: todos usan `.level-wizard-*`, no hay panel propio de Brujo, y la pestaña Hechizos sigue mostrando la biblioteca universal con sus filtros.

## Cobertura automatizada y limitaciones

`packages/rules-engine/tests/level-up-shared-70.test.ts` comprueba constantes de dado, promedio, resultado, guardado, cálculo de PG y transición reversible por clase. El entorno aislado de construcción no tiene manifiesto del monorepo, dependencias Next ni Vitest instaladas: no se ha ejecutado la suite `pnpm`, `lint` o `build`. Se ha ejecutado **prueba de humo con Node** sobre cálculos de d10/d6/d8, guardado de Mago y bajada 2→1 de Brujo; pasa. El usuario debe ejecutar las tres verificaciones anteriores en su clon.

## Parche 70.1 · Retorno al nivel 1 sin campos sobrantes

La auditoría de Mago 1–20 (`wizard-audit-64.test.ts`) identificó una diferencia exclusivamente estructural al retroceder 2→1: el personaje restaurado guardaba `levelHitPointRolls: []`, aunque el original de nivel 1 no tenía esa propiedad. La función de bajada ahora extrae el historial antes de copiar el input y lo omite al llegar a nivel 1, tanto para Mago como para Guerrero. Los niveles 2–20 conservan los resultados anteriores y no recalculan PG. Se añade una aserción de regresión con `Object.hasOwn` en la prueba del paso 70.

La corrección afecta al formato del input, no a los valores de vida ni a la interfaz. Reejecutar `pnpm --filter @dnd/rules-engine test`, `pnpm --filter @dnd/web lint` y `pnpm build` tras aplicar el parche.

## Próxima entrega

Continuar con **Brujo nivel 3 / Patrón Infernal**, iniciando por la transición de reglas, progresión de Magia de Pacto y rasgos infernales. Cualquier asistente de subida y bajada deberá reutilizar desde el primer momento los componentes documentados. Para mejorar reversibilidad, estudiar registro explícito de selecciones de nivel 1 del Brujo en futuras subidas (actualmente se conservan mediante la política explicada en la vista previa).
