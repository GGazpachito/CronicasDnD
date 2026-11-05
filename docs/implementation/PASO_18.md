# Paso 18 — Salvaciones contra muerte, estabilización y concentración

## Objetivo

Registrar y conservar, dentro de la hoja de Guerrero de niveles 1–3, las consecuencias de llegar a **0 puntos de golpe**, las salvaciones contra muerte, la estabilización y el seguimiento de **una concentración activa**. Las tiradas siguen realizándose en mesa y se introducen manualmente.

**Referencias:** *Player's Handbook 2024*, capítulo 1, «Dropping to 0 Hit Points», «Death Saving Throws» y «Stabilizing a Character» (páginas impresas 28–29); apéndice C, «Concentration» (página impresa 363). SRD 5.2.1 como complemento de reglas abiertas.

## Instalación

1. Confirma que la actualización 17 funciona y está guardada en Git.
2. Descomprime `actualizacion-web-12.zip` en una carpeta temporal.
3. Copia las carpetas `apps`, `packages` y `docs` dentro de `dnd-character-builder`, **combinándolas sin borrar archivos existentes**.
4. Mantén Docker Desktop y PostgreSQL funcionando.
5. Desde la raíz del proyecto ejecuta:

```powershell
pnpm test
pnpm build
pnpm dev
```

6. Visita `http://localhost:3000` y abre la nueva sección **Muerte y concentración**, inmediatamente debajo de **Jugar con tu personaje**.
7. Para conservar los cambios, pulsa **Actualizar guardado** en **Mis personajes**. El guardado automático sigue pendiente.

**No ejecutes migraciones ni comandos de reseteo de Prisma.** El estado se almacena en el JSON ya existente de PostgreSQL. `schemaVersion` sigue siendo `2`.

## Archivos modificados

| Archivo | Función |
| --- | --- |
| `packages/rules-engine/src/survival.ts` | Nuevos tipos, validación, salvaciones contra muerte, estabilización, CD de concentración y control de duración |
| `packages/rules-engine/src/adventure.ts` | Acciones de supervivencia y concentración; daño a 0 PG, daño masivo, recuperación, sincronización con condiciones y rondas |
| `packages/rules-engine/src/index.ts` | Exporta la nueva API de supervivencia |
| `packages/rules-engine/tests/survival.test.ts` | Casos de muerte, estabilización, concentración, guardado y regresión |
| `packages/rules-engine/tests/adventure.test.ts` | Actualiza la prueba anterior: el daño a 0 PG ahora genera fallos, no un error genérico |
| `apps/web/src/components/SurvivalPanel.tsx` | Panel nuevo para tiradas, estabilización y concentración |
| `apps/web/src/components/PlayPanel.tsx` | Marca opcional de daño crítico y texto de situación a 0 PG |
| `apps/web/src/app/page.tsx` | Conecta el panel nuevo y sincroniza concentración con condiciones y avance de rondas |

## Reglas implementadas

### Salvaciones contra muerte

- Al caer a 0 PG sin morir por daño masivo, comienzan las salvaciones contra muerte. La condición **Inconsciente** se considera implícita; no se añade como una condición independiente al registro manual.
- Se tira **1d20 al inicio del turno**, si el personaje no está estable ni muerto. Resultado **10 o más**, tras penalizaciones aplicables: éxito. Por debajo: fallo.
- Un **1 natural** cuenta como dos fallos. Un **20 natural** devuelve **1 PG**, reiniciando el contador.
- **Tres éxitos** estabilizan, **tres fallos** matan. Los contadores no requieren resultados consecutivos.
- Recibir daño a 0 PG causa **un fallo** o **dos si el impacto es crítico**. Si el daño recibido a 0 PG es igual o mayor que los PG máximos, se produce muerte instantánea.
- Si al caer a 0 PG el daño sobrante es igual o superior a los PG máximos, se produce muerte instantánea por daño masivo.
- Recuperar PG desde 0 reinicia éxitos y fallos. Los PG temporales no devuelven la consciencia.
- El nivel de **agotamiento** aplica su penalización de `−2` por nivel a la salvación d20, respetando los efectos específicos de 1 y 20 naturales.
- No se puede curar con curación normal a un personaje declarado muerto; la resurrección queda fuera de esta fase.

### Estabilización

- Una prueba de Sabiduría (Medicina) con resultado total **10 o más** estabiliza al personaje a 0 PG. Un fallo no modifica los contadores.
- Un personaje estable no realiza salvaciones contra muerte mientras mantenga ese estado.
- Si recibe daño estando estable, pierde la estabilidad y vuelve a acumular fallos.
- Tras **1d4 horas** sin curación, recupera **1 PG**. La interfaz pide la tirada y las horas transcurridas; **no simula el paso del tiempo automáticamente**.

### Concentración

- Solo puede mantenerse un efecto de concentración. Empezar otro sustituye el anterior.
- Cada fuente de daño crea una salvación independiente pendiente. La **CD = mínimo entre 30 y el mayor de 10 y `floor(daño / 2)`**.
- El d20 se introduce manualmente. El motor suma la bonificación de salvación de Constitución, resta la penalización por agotamiento e incorpora el modificador situacional que indique el usuario. Si hay ventaja o desventaja externa, el jugador selecciona el dado correspondiente antes de introducirlo.
- Una salvación fallida rompe concentración y descarta las pendientes; una salvación superada elimina solo la primera de la cola.
- Alcanzar **0 PG**, adquirir una condición que **incapacita** o morir rompe concentración.
- Los efectos con duración en rondas descuentan una ronda al pulsar **Avanzar ronda** en el panel de combate. Los efectos sin contador de rondas se terminan manualmente.
- No se comprueba si un conjuro está preparado o si ha gastado espacios de conjuro, porque el lanzamiento completo todavía no está implementado.

## Compatibilidad con guardados previos

La nueva propiedad `adventure.survival` es **opcional durante la lectura** y se crea por defecto al validar un guardado anterior. No se cambia la tabla de personajes ni el contrato `schemaVersion: 2`.

Los personajes anteriores conservan elecciones, PG, recursos, inventario, condiciones, historia de ataques y efectos temporales. Al guardarlos de nuevo, el nuevo estado de supervivencia se incluye en su JSON.

La combinación con condiciones/tiempo se realiza mediante `updateAdventureCombat(...)`, llamada tanto desde el panel de condiciones como desde el panel de rondas. Así, una nueva condición de Incapacitado interrumpe la concentración y las rondas consumen su duración.

## Pruebas recomendadas

1. Guerrero con PG al máximo: recibe exactamente esos PG de daño. Queda a 0 PG y no muere por daño masivo.
2. A 0 PG: registra `1` natural, obtiene 2 fallos; después un `9`, llega a 3 fallos y muere.
3. En otra partida a 0 PG: un `20` natural devuelve 1 PG.
4. Registra tres éxitos (10 o más): queda estable a 0 PG.
5. Intenta Medicina CD 10; si supera la CD, queda estable. Comprueba recuperación tras `1d4` horas.
6. Estando a 0 PG, recibe un crítico: añade 2 fallos.
7. Inicia concentración, recibe daño moderado y resuelve la CD pendiente con una salvación de Constitución.
8. Añade Aturdido desde el panel de condiciones: se rompe la concentración.
9. Inicia concentración con dos rondas. Avanza dos rondas en Registro y efectos temporales: termina.
10. Guarda el personaje, recarga la página, recupera el personaje y verifica sus contadores y concentración.
11. Abre un personaje creado antes de esta actualización: confirma que conserva sus datos.

## Control de calidad y limitaciones

Esta actualización se ha reconstruido a partir de las actualizaciones previas y se ha validado el motor TypeScript en modo estricto. Las pruebas se han recorrido también con un verificador local de aserciones. Es necesario ejecutar **`pnpm test` (Vitest real)** y **`pnpm build` (Next.js real)** en el proyecto Windows antes de darla por validada.

La condición Inconsciente debida a 0 PG está representada como **estado implícito**, no como una entrada editable de `combat.conditions`; por ello, el panel de consulta de ataques recibidos aún no aplica automáticamente la ventaja o los críticos de ese origen. Esas circunstancias deben seguir resolviéndose con el director. Tampoco se automatizan resurrección, turnos completos, lanzamiento/efectos de conjuros o daño por enemigo.

## GitHub

```powershell
git status
git add apps/web/src/app/page.tsx apps/web/src/components/PlayPanel.tsx apps/web/src/components/SurvivalPanel.tsx packages/rules-engine/src packages/rules-engine/tests docs/implementation/PASO_18.md
git commit -m "feat: implementar muerte estabilizacion y concentracion"
git push
```

Se incluye **la prueba antigua corregida**, para evitar que Actions use la versión anterior de una aserción que ya no corresponde a las nuevas reglas. No incluyas archivos `.env` ni datos de PostgreSQL en los commits.
