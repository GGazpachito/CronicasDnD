# Paso 17 — Condiciones y agotamiento (PHB 2024)

## Objetivo

Añadir un registro de condiciones y su repercusión en tiradas de ataque, salvaciones, pruebas de característica, iniciativa y velocidad del personaje. La aplicación no pretende simular enemigos, posicionamiento o el combate completo.

**Fuentes:** *Player's Handbook 2024*, capítulo 1 (Condiciones) y apéndice C (Rules Glossary), con el SRD 5.2.1 como referencia complementaria.

## Instalación de la actualización

1. Conserva un commit con la versión 16 funcional.
2. Descomprime `actualizacion-web-11.zip`.
3. Copia las carpetas `packages`, `apps` y `docs` a la raíz del repositorio y combina las carpetas. No borres el código existente.
4. Mantén Docker Desktop/PostgreSQL funcionando.
5. Desde la raíz del proyecto ejecuta:

```powershell
pnpm test
pnpm build
pnpm dev
```

6. Abre `http://localhost:3000` y prueba la sección **Condiciones y agotamiento**.

No se necesitan migraciones Prisma ni cambios de tablas. El guardado sigue siendo **manual**: pulsa **Actualizar guardado** en **Mis personajes** después de cualquier modificación.

## Archivos

| Archivo | Cambio |
| --- | --- |
| `packages/rules-engine/src/conditions.ts` | Nuevo motor declarativo de condiciones, agotamiento y cálculo de consecuencias |
| `packages/rules-engine/src/combat.ts` | Estado de condiciones opcional, cambios de estado y duración por rondas |
| `packages/rules-engine/src/adventure.ts` | Descanso largo elimina un nivel de agotamiento; protección para agotamiento 6 |
| `packages/rules-engine/src/attacks.ts` | Ventajas y desventajas por condición y penalización por agotamiento en los ataques |
| `packages/rules-engine/src/index.ts` | Exporta el motor de condiciones |
| `packages/rules-engine/tests/conditions.test.ts` | Pruebas de regresión de efectos, validaciones y compatibilidad de guardados |
| `apps/web/src/components/ConditionsPanel.tsx` | Nuevo panel de edición de condiciones y consulta de consecuencias |
| `apps/web/src/components/AttacksPanel.tsx` | Aplica automáticamente condiciones al ataque y bloquea acciones prohibidas |
| `apps/web/src/components/CombatPanel.tsx` | Etiquetas y ayuda para la cuenta de rondas |
| `apps/web/src/app/page.tsx` | Integra el panel y bloquea confirmaciones cuando no se puede actuar |
| `apps/web/src/app/globals.css` | Estilos responsivos del panel |

## Datos y compatibilidad

La versión del formato de guardado **sigue siendo 2**. El registro de condiciones se guarda dentro de `adventure.combat.conditions`, un campo opcional. Por ello:

- Las partidas de la actualización 16 sin ese campo siguen abriéndose sin cambios.
- `validateCombatState` valida exhaustivamente tanto los datos antiguos como los nuevos.
- No se sobrescriben PG, recursos, inventario ni el historial de ataques cuando se añaden condiciones.
- Cada fuente de una misma condición tiene su propia duración, aunque la condición solo se aplica una vez.
- Las condiciones de rondas se reducen al pulsar **Avanzar ronda** en el registro de combate.
- Cuando termina **Inconsciente**, el personaje permanece **Derribado**; el motor crea esa condición.
- El **Agotamiento** se almacena como entero 0–6 y se reduce 1 al completar un descanso largo; con nivel 6 el manual establece muerte, pero su resolución sigue fuera de alcance.

Los estados de guardado no contienen código ejecutable. No se evalúan expresiones o scripts de usuarios.

## Interpretación de condiciones

Se incluyen Cegado, Hechizado, Ensordecido, Asustado, Agarrado, Incapacitado, Invisible, Paralizado, Petrificado, Envenenado, Derribado, Apresado, Aturdido e Inconsciente, además del Agotamiento.

El motor puede resolver directamente, según proceda:

- Ventaja o desventaja en ataques y algunas tiradas; ambas se cancelan aun con múltiples fuentes.
- Fallos automáticos de pruebas que requieren vista u oído y de ciertas salvaciones de Fuerza/Destreza.
- Impedimento de acciones, acciones adicionales, reacciones o concentración por Incapacitado y condiciones derivadas.
- Velocidad 0 o reducción de 5 pies por nivel de Agotamiento.
- Penalización de `−2 × nivel de Agotamiento` a las pruebas d20, incluidos ataques.
- Críticos automáticos de ataques que impactan a Paralizado/Inconsciente a 5 pies o menos.

Para **Asustado**, **Agarrado**, **Hechizado**, **Invisible** y **Derribado**, el resultado requiere información situacional. Se han añadido casillas de contexto y entradas para la distancia o la visibilidad, en vez de aplicar bonificadores a ciegas.

**Importante:** las cifras base de las habilidades y salvaciones en la hoja se siguen mostrando sin sus penalizaciones situacionales. El panel de condiciones indica el modo de tirada y el modificador de Agotamiento para aplicarlos durante la partida. El panel de ataques sí integra el modo y el agotamiento en el cálculo de ataques con armas.

## Limitaciones deliberadas

Todavía se resuelven manualmente: la resistencia al daño de Petrificado, efectos de movimiento y posición, el ataque de la criatura que hechizó al personaje, los efectos mágicos específicos, las tiradas de salvación contra muerte, concentración con sus CD, la caída de objetos al quedar inconsciente y el control de turnos. El campo de contexto del panel de ataques se ajusta para cada ataque.

**No se modifica automáticamente el daño recibido ni se simulan criaturas enemigas.** Las condiciones sólo se aplican al personaje de la hoja.

## Pruebas manuales sugeridas

1. Abrir un Guerrero previamente guardado: debe tener cero condiciones nuevas y conservar su inventario.
2. Añadir Envenenado: ataques y pruebas de característica pasan a desventaja; salvaciones normales.
3. Añadir Invisible y marcar que el objetivo no puede verlo: ventaja + desventaja por Envenenado = tirada normal.
4. Añadir Agarrado: velocidad 0; al atacar al que agarra no se aplica su desventaja.
5. Añadir Asustado: la desventaja depende de que la fuente del miedo sea visible.
6. Añadir Paralizado: no permite atacar, falla automáticamente salvaciones de Fuerza y Destreza, y los ataques recibidos a 5 pies serían críticos si impactan.
7. Añadir Inconsciente durante 1 ronda y avanzar ronda: debe permanecer Derribado.
8. Subir Agotamiento a nivel 2: velocidad se reduce 10 pies y ataques tienen −4 a la prueba d20.
9. Descanso largo: Agotamiento 2 pasa a 1; las otras condiciones no desaparecen por defecto.
10. Guardar, recargar y comprobar que se conserva cada condición, su fuente, duración y los niveles de Agotamiento.
11. Comprobar que los controles de inventario, ataques, recursos y PostgreSQL siguen funcionando.

## Subida a GitHub

Tras superar las pruebas:

```powershell
git status
git add apps/web/src/app/page.tsx apps/web/src/app/globals.css apps/web/src/components/ConditionsPanel.tsx apps/web/src/components/AttacksPanel.tsx apps/web/src/components/CombatPanel.tsx packages/rules-engine/src packages/rules-engine/tests/conditions.test.ts docs/implementation/PASO_17.md
git commit -m "feat: implementar condiciones DnD 2024 y agotamiento"
git push
```

Revisa el resultado de **GitHub Actions**, además de las pruebas locales. No subas los archivos `.env`.

## Estado de comprobación antes de entrega

- Verificación estricta de tipos del núcleo TypeScript: superada.
- Revisión sintáctica de componentes React/TSX: superada.
- 275 pruebas ejecutadas con un adaptador local de aserciones equivalente para estas comprobaciones: **275 correctas, 0 fallidas**.
- **Vitest real y compilación Next.js**: pendientes de ejecución en el equipo del proyecto mediante `pnpm test` y `pnpm build`.
