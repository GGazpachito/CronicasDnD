# Paso 52. Progresión del Mago a los niveles 4 y 5 y catálogo de conjuros de nivel 3

**Proyecto:** Crónicas, editor y hoja digital de personajes para D&D 2024  
**Fecha de desarrollo:** 16 de noviembre de 2026  
**Estado:** implementación entregable; comprobar `pnpm lint`, `pnpm test`, `pnpm build` y la navegación real en el equipo del usuario.  
**Punto de partida:** actualización 51.2, con progreso interactivo de Mago 1→3, regreso de nivel, biblioteca manual sin límites y hoja compartida con Guerrero.

## 1. Objetivos funcionales

1. Ampliar la subida guiada y el descenso del Mago sin cambiar el modelo del Guerrero.
2. **Nivel 4:** cuarto truco; dote Mejora de característica (+2 o +1/+1), recalculando todos los derivados; dos conjuros ordinarios; preparación reglamentaria a 7; ranuras de nivel 1/2 iguales a 4/3.
3. **Nivel 5:** Memorizar conjuro; dos conjuros ordinarios; un conjuro adicional gratuito de Evocación debido al desbloqueo de ranuras de nivel 3; preparación a 9; bonificador de competencia +3; 4/3/2 ranuras de niveles 1/2/3.
4. Añadir **los 32 conjuros de nivel 3** de la lista del Mago de 2024 al catálogo compartido, con datos básicos, explicaciones originales en español y botones para dados definidos.
5. Mantener una ventana visual idéntica a la de la subida del Guerrero, con etapas Novedades → Elecciones → Confirmación, sin cambios hasta confirmar.
6. Respetar la persistencia anterior sin migraciones, incluso con ranuras gastadas, biblioteca manual, inventario y rasgos.
7. Conservar el menú de entrada y las seis pestañas compartidas. No copiar una ficha por clase.

## 2. Fuentes y delimitación

- *Player's Handbook (2024)*, p. 165: el Mago obtiene un cuarto truco en nivel 4 y añade dos conjuros al libro **por cada nivel** de Mago después del primero.
- p. 166: progresión oficial de competencia, conjuros preparados y ranuras: nivel 4 = PB +2, cuatro trucos, siete preparados, ranuras 4/3; nivel 5 = PB +3, cuatro trucos, nueve preparados, ranuras 4/3/2.
- p. 167: Mejora de característica del nivel 4 y *Memorize Spell* del nivel 5 (cambio de un preparado al acabar un descanso corto).
- p. 174: *Evocation Savant* concede otro conjuro de Evocación gratuito al alcanzar un nuevo nivel de espacios de conjuro. Por ello, en nivel 5 se incorpora **un conjuro extra además de los dos ordinarios**.
- p. 169: lista de exactamente 32 conjuros de nivel 3 de Mago. Los datos individuales de lanzamiento se han consultado en el capítulo 7, pp. 240–340.

Las fichas del catálogo contienen **redacción original de consulta**; no reproducen el texto íntegro del manual. Para detalles excepcionales, efectos dependientes de estadísticas de criaturas invocadas y escalado no automatizado, se conserva la referencia a la página del libro.

## 3. Arquitectura y datos

### 3.1 Modelo del Mago

Se amplía `GuidedWizardInput.level` de `1|2|3` a `1|2|3|4|5`. Se introducen dos atributos opcionales, validables según el nivel:

- `level4Improvement`: elección de Mejora de característica. Se reutiliza la misma validación matemática empleada por el Guerrero; no se duplican reglas para +2 o +1/+1 ni para el máximo de 20.
- `evokerLevelThreeSpellId`: identificador del conjuro gratuito obtenido con la primera ranura de nivel 3. Solo se admite en nivel 5; debe ser de Evocación, de nivel 1 a 3 y no puede estar repetido.

Se mantiene `evokerBonusSpellIds` (los **dos** conjuros gratuitos de nivel 3 de personaje). Este atributo se debe seguir validando y conservando en niveles 4 y 5. La nueva validación evita perder esas selecciones al dejar de estar en nivel 3.

Los nuevos atributos son opcionales para la compatibilidad con guardados de niveles 1–3. No se cambia `schemaVersion: 3` ni el esquema de PostgreSQL. El validador de snapshots incluye los dos nombres nuevos en su lista blanca. Los guardados inconsistentes son rechazados por el motor.

### 3.2 Transición atómica de subida

`prepareWizardLevelUp()` recibe una ficha, un estado y un borrador de elecciones. Valida el estado previo y las elecciones; calcula la nueva hoja; preserva el estado persistente; actualiza las ranuras sin recuperar las ya gastadas; y devuelve la nueva ficha y estado sin mutar los argumentos originales.

En nivel 4 exige un cuarto truco nuevo y una mejora válida. El aumento de Constitución puede incrementar retroactivamente los PG máximos, porque se recalcula con las puntuaciones finales de todos los niveles. La operación conserva **el daño recibido** como diferencia entre PG máximos y actuales.

En nivel 5 exige el nuevo conjuro gratuito de Evocación, junto a los dos ordinarios. Los conjuros anteriores preparados se conservan hasta las decisiones posteriores de descanso; el asistente incrementa los preparados según los cupos de progreso.

### 3.3 Descanso corto, ranuras y Memorizar conjuro

`wizardArcaneRecoveryOptions()` calcula combinaciones de ranuras realmente gastadas cuya suma de niveles no excede `ceil(nivel/2)` y que no incluyen ranuras de nivel 6+. Esto permite escoger, en nivel 5, entre varias combinaciones de hasta 3 niveles recuperados. El botón se presenta en Hechizos y **no deduce erróneamente el nivel de personaje de la existencia de ranuras de nivel 2**. Los métodos de descanso aceptan el nivel explícito y validan su tabla de ranuras. La API histórica que funciona por inferencia se mantiene para los primeros niveles.

`wizardMemorizePreparedSpell()` permite, desde el nivel 5, seleccionar un preparado reglamentario y reemplazarlo por otro conjuro que esté en el libro, después de que el jugador declare un descanso corto. La operación no gasta ranuras, no resuelve conjuros y mantiene el mismo número de preparados. Cuando hay biblioteca manual, sincroniza la selección allí sin imponer límites al resto.

### 3.4 Retroceso seguro

`previewWizardLevelDown()` funciona ahora con 5→4 y 4→3 además de 3→2 y 2→1. Presenta las diferencias mediante el mismo `LevelDownDialog` utilizado por Guerrero. Elimina solo los dos conjuros ordinarios del último nivel, el cuarto truco/ASI cuando procede y el conjuro gratuito concedido en nivel 5. La tradición Evocación y sus dos conjuros gratuitos de nivel 3 de personaje se conservan hasta bajar de 3→2. Se preservan inventario, datos personales, daño y ranuras que siguen existiendo.

Las elecciones de biblioteca manual no se confunden con las reglamentarias de progresión. Los conjuros concedidos en el nivel retirado dejan de estar concedidos y se retiran de la selección manual por el retroceso, sin borrar otros conjuros agregados manualmente.

### 3.5 Catálogo de hechizos compartido

`wizard-third-level.ts` incorpora un registro tipado de los 32 conjuros de nivel 3, con identificador, nombre, escuela, ritual cuando corresponda, descripción original, acción de lanzamiento, alcance, componentes, duración, página y dados base si procede. Este registro alimenta el catálogo de Mago y `WizardSpellDetails` para evitar discrepancias entre las reglas del asistente y las de Hechizos.

El catálogo pasa de **90 a 122 fichas** (20 trucos, 31 conjuros de nivel 1, 39 de nivel 2, 32 de nivel 3). Continúa siendo posible aprender y preparar manualmente conjuros por encima de los cupos sugeridos. Esta libertad **no concede espacios de conjuro ni modifica las elecciones obligatorias** del asistente.

Tiradas incorporadas: Bola de fuego (8d6), Rayo relampagueante (8d6), Toque vampírico (3d6 y ataque mágico), Glifo de custodia (5d8 si se utiliza su modalidad explosiva), Intermitencia (1d6 para determinar la transición etérea). Para los demás efectos no se inventan tiradas. No se automatizan elecciones de blancos, área, salvaciones del objetivo ni daños aplicados.

## 4. Riesgos identificados y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Subir de nivel restaura ranuras gastadas | Transición por diferencia de máximos y conservación de marcas por nivel |
| Desaparecen los dos conjuros iniciales de Evocación al llegar a 4 | Validación y proyección de `evokerBonusSpellIds` para todos los niveles ≥3 |
| El nuevo cuarto truco no aparece entre los preparados manuales | Sincronización de trucos ganados al fusionar la biblioteca |
| Una mejora de Constitución deja desfasados los PG | Recalcular PG desde la hoja completa y conservar daño recibido |
| Recuperación arcana aplica el límite del nivel 3 a un Mago de nivel 5 | Nivel explícito más comprobación de ranuras por nivel |
| Nuevo conjuro gratuito de Evocación duplicado | Validación de identificador, escuela, nivel y ausencia de duplicados |
| Los tests antiguos fallan porque el catálogo/alcance cambió | Ajuste de expectativas obsoletas sin eliminar las verificaciones previas |
| Los personajes existentes requieren migración | Propiedades nuevas opcionales y mismo `schemaVersion` |

## 5. Verificaciones realizadas y pendientes

**Verificadas en entorno de preparación:**

- TypeScript estricto de los módulos de reglas modificados.
- Chequeo estricto TSX de la página de Mago, el asistente y la biblioteca con declaraciones aisladas para React/Next.
- **105 pruebas de aserciones locales, 0 fallos**, incluidas las nuevas de nivel 4/5, catálogo, subida, retroceso, inventario y persistencia y una selección de suites anteriores.
- Comprobación de que se incluyen los 32 conjuros de nivel 3 y sus referencias, sin IDs duplicados.
- Comprobación de guardado y lectura serializados del Mago de nivel 5, incluyendo una ranura de nivel 3 gastada y las elecciones de nivel 4/5.

**Pendientes de realizar en Windows/entorno real:**

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

No se presenta el análisis con declaraciones aisladas como una compilación completa de Next.js, ni el comprobador local como Vitest oficial.

**Matriz de aceptación manual:**

1. Cargar un Mago antiguo de nivel 3. Subir a 4: elegir +2 INT, un cuarto truco, dos conjuros y el preparado adicional; confirmar; guardar y recuperar.
2. Repetir el salto a 4 eligiendo +2 CON y comprobar el incremento de PG máximos y la conservación del daño.
3. Subir a 5: elegir Bola de fuego, Volar y Rayo relampagueante de regalo; preparar 9 conjuros; comprobar competencia +3 y ranuras [4,3,2].
4. Gastar una ranura de nivel 3, guardar y recuperar. Recuperarla mediante Recuperación arcana tras declarar un descanso corto, sin exceder el límite 3.
5. Usar Memorizar conjuro para sustituir uno preparado del libro por otro, guardar y recargar.
6. En Hechizos, buscar Bola de fuego y abrir su explicación y botón 8d6. Comprobar que las casillas de Aprendidos/Preparados siguen sin límite numérico.
7. Bajar 5→4 y 4→3. Confirmar desaparición de los rasgos, trucos, bonificaciones, conjuros y ranuras correspondientes; conservar los objetos, retrato y resto de la partida.
8. Cargar un Guerrero anterior para comprobar que su progresión, equipo y guardado permanecen intactos.

## 6. Limitaciones y siguientes trabajos

- Las dotes generales alternativas a **Mejora de característica** aún no están implementadas para nivel 4. Se indica en el asistente.
- La progresión guiada del Mago llega al **nivel 5**. El motor general de progresión sigue llegando a 20, pero no se expone todavía como editor completo.
- El sistema de preparación sin límite pertenece a la biblioteca manual. Las elecciones de progresión se validan por las cantidades oficiales para mantener integridad y poder retroceder.
- Algunos efectos excepcionales de conjuros de nivel 3 remiten al manual; especialmente invocaciones con bloques de criaturas, modalidades complejas, estados y escalado. Las tiradas no aplican automáticamente consecuencias.
- El módulo Combate continúa aplazado.

**Próxima actualización sugerida, 53:** Mago niveles **6 y 7**, incorporar *Esculpir conjuros* al nivel 6, desbloquear ranuras y conjuros de **nivel 4** al llegar al 7, mantener el catálogo completo de ese nivel y permitir el retroceso 7→6→5.
