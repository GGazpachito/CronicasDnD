# PASO 19 · Ataques recibidos y resolución del daño (D&D 2024)

## Objetivo

Registrar ataques enemigos contra el Guerrero y unir la resolución de impacto y daño con el estado de partida ya implementado: puntos de golpe temporales y actuales, muerte, salvaciones contra muerte y concentración.

**Referencias:** *Player's Handbook 2024*, capítulos 1 (tiradas de ataque, CA, críticos, resistencia, vulnerabilidad, inmunidad y 0 PG) y apéndice C (condiciones). SRD 5.2.1 como complemento. Este documento describe comportamiento de la aplicación, no reproduce el texto de los manuales.

## Contenido del ZIP

| Archivo | Cambio |
| --- | --- |
| `packages/rules-engine/src/incoming.ts` | **Nuevo.** Vista previa y confirmación atómica de ataques recibidos. |
| `packages/rules-engine/src/combat.ts` | Historial opcional `receivedAttacks` validado y compatible con los guardados anteriores. |
| `packages/rules-engine/src/index.ts` | Exportación del módulo nuevo. |
| `packages/rules-engine/tests/incoming.test.ts` | **Nuevo.** 24 pruebas de impacto, defensas, supervivencia y persistencia. |
| `apps/web/src/components/IncomingAttacksPanel.tsx` | **Nuevo.** Panel visual de entrada de ataques y consulta del historial. |
| `apps/web/src/app/page.tsx` | Añade el panel después de «Muerte y concentración». |
| `docs/implementation/PASO_19.md` | Este documento. |

## Instalación

1. Confirma que tienes la actualización 18 instalada y funcionando.
2. Desde la raíz del repositorio ejecuta `git status`. Si tienes cambios propios sin guardar, haz un commit o crea una copia antes de reemplazar archivos.
3. Descomprime `actualizacion-web-13.zip` y copia las carpetas `apps`, `packages` y `docs` a la raíz del proyecto. Combina carpetas y reemplaza solo los archivos incluidos.
4. **No borres el directorio de datos de Docker** ni ejecutes `prisma migrate reset`.
5. Con PostgreSQL en marcha, ejecuta:

```powershell
pnpm test
pnpm build
pnpm dev
```

6. En `http://localhost:3000`, carga un personaje guardado y prueba la nueva sección «Ataques recibidos».

**No hay migraciones de Prisma:** el campo `combat.receivedAttacks` es opcional y está dentro del JSON existente de la versión 2. Un guardado antiguo que no contenga este campo se interpreta como historial vacío.

## Flujo de uso

1. Introduce quién ataca, el bonificador y el resultado natural de su d20. Añade un segundo dado cuando corresponda ventaja/desventaja.
2. Indica la distancia del enemigo (influye en Derribado, Paralizado e Inconsciente) y, si procede, si puede ver al personaje Invisible.
3. El motor evalúa ventaja/desventaja, la CA y el impacto. Un 1 natural falla y un 20 natural impacta y causa crítico; ciertos estados convierten otros impactos cercanos en críticos.
4. Introduce el **daño ya tirado**, incluidos los dados adicionales si hubo crítico. No se duplican automáticamente los dados de daño.
5. Selecciona el tipo de daño y la defensa situacional: normal, resistencia, vulnerabilidad, ambas o inmunidad. No se infiere todavía automáticamente de objetos o rasgos.
6. Comprueba la vista previa: **no modifica el estado**.
7. Pulsa «Confirmar impacto o fallo». Se registra el evento, y el daño efectivo se aplica al estado existente en una única operación.
8. Si la concentración recibe daño, resuelve después la salvación correspondiente en el panel «Muerte y concentración».
9. Pulsa **«Actualizar guardado»** en «Mis personajes» para conservar los cambios en PostgreSQL.

## Reglas y prioridades implementadas

- Un ataque puede fallar incluso con mucho bonificador si el d20 seleccionado es 1. Con 20 natural impacta siempre.
- La CA base viene de la hoja calculada. Puede añadirse un ajuste circunstancial puntual, sin cambiar el equipo ni el estado persistido.
- Las fuentes de ventaja y desventaja se cancelan; no se suman dados adicionales por fuentes múltiples.
- En estado Inconsciente por 0 PG, se aplican los efectos relevantes al ataque recibido aunque no se haya anotado manualmente la condición. Se distingue la distancia del atacante.
- Los modificadores planos al daño se aplican **antes** de resistencia (mitad redondeando hacia abajo) y vulnerabilidad (doble), en ese orden. La inmunidad reduce a 0.
- No se aplica daño si el ataque falla o si la defensa deja el daño efectivo en 0.
- Cuando hay daño positivo, el motor existente consume PG temporales antes que PG normales, controla la muerte, los fallos por daño a 0 PG y la concentración.
- El registro de ataques recibidos tiene un máximo de 100 eventos y comparte el contador de IDs con el historial y las condiciones existentes.

## Limitaciones actuales

- El enemigo no es un personaje con su propia hoja; sus números se introducen manualmente.
- El usuario debe introducir daño de crítico correctamente; no hay lanzador de dados ni descomposición de daños mixtos.
- Un ataque con varios tipos de daño no se desglosa automáticamente. Para esos casos, no confirmes el resultado hasta resolver la mitigación de cada componente con el director de juego.
- No se ejecutan reacciones defensivas, conjuros, tiradas de salvación de enemigos ni turnos completos.
- Los resultados se guardan **manualmente** usando el panel «Mis personajes».
- No modifica la definición de las clases, no requiere credenciales nuevas y no publica la aplicación.

## Casos manuales recomendados

- Ataque que falla: se guarda en el historial, pero no quita PG.
- Impacto normal: se restan los PG esperados.
- Resistencia a 9 de daño: quedan 4 puntos de daño efectivo.
- Vulnerabilidad a 9 de daño: quedan 18.
- Resistencia + vulnerabilidad a 9: quedan 8 por el orden y redondeo.
- Inmunidad: 0 daño y ningún nuevo fallo de muerte.
- Con 5 PG temporales y 8 de daño: pierdes primero 5 temporales y después 3 normales.
- Estando Paralizado, un ataque cercano que impacta se considera crítico.
- A 0 PG, recibir un impacto crítico añade dos fallos de muerte (salvo que se produzca muerte instantánea).
- Durante concentración, el impacto efectivo genera una nueva salvación pendiente.
- Guardar, recargar y comprobar que aparecen en el historial el ataque y los PG correctos.

## Subida al repositorio

```powershell
git status
git add packages/rules-engine/src packages/rules-engine/tests/incoming.test.ts apps/web/src/app/page.tsx apps/web/src/components/IncomingAttacksPanel.tsx docs/implementation/PASO_19.md
git commit -m "feat: integrar ataques recibidos y mitigacion de dano"
git push
```

No se deben subir archivos `.env` ni modificar el histórico de migraciones por esta actualización.

## Comprobaciones realizadas durante la preparación

- TypeScript estricto del núcleo: **correcto**.
- 325 comprobaciones con un adaptador local de aserciones sobre JavaScript compilado: **sin fallos**; incluye las pruebas anteriores y 24 pruebas nuevas.
- Transpilación de comprobación sintáctica de los dos archivos TSX afectados: **sin errores de sintaxis**.
- **Pendiente en tu equipo:** ejecución del Vitest real (`pnpm test`) y de Next.js (`pnpm build`), con las dependencias exactas de tu proyecto.

## Próximo hito

Resolver ataques con varios componentes de daño y capacidades defensivas declarativas (resistencias de objetos y rasgos) antes de ampliar el sistema de criaturas enemigas.
