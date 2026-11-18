# Paso 64 — Auditoría transversal de Mago 1–20 y aislamiento de biblioteca manual

Fecha: **18/11/2026**. Repositorio: `GGazpachito/dnd-character-builder`, rama `main`. **Base necesaria para aplicar el parche: actualización 63 (Mago 20, Conjuros de firma).** La auditoría se construye sobre los archivos de la actualización 63 entregada previamente; no sustituye ese ZIP.

## Propósito

Revisar el ciclo completo de creación, progresión, recursos, serialización y retroceso del **Mago Evocador del 1 al 20** antes de añadir otra clase. La estrategia combina una suite de invariantes transversal con una corrección de separación entre la selección editable de la biblioteca y los conjuros que las reglas obligan a tener siempre preparados.

## Hallazgo corregido: preparación automática filtrada a los datos manuales

**Situación anterior:** la función `wizardSpellSelection(input)` devuelve la vista **efectiva** de la biblioteca; por diseño agrega Maestría (niveles 18+) y Conjuros de firma (nivel 20), incluso si el jugador no los había marcado manualmente. Tanto al modificar una casilla del panel como al integrar nuevos conjuros por subida se utilizaba esta misma vista ya aumentada para crear la siguiente `spellSelection` persistida. Como consecuencia, los hechizos automáticos podían terminar guardados como elecciones manuales del usuario, sin que este los hubiera preparado voluntariamente.

**Solución aplicada:**

1. `wizard-spell-library.ts` introduce `wizardEditableSpellSelection(input)`, que devuelve la **selección de usuario sin incorporar preparaciones automáticas**; si no existe un estado manual, obtiene la selección inicial de los conjuros reglamentarios. `wizardSpellSelection(input)` mantiene su contrato anterior para **mostrar** los siempre preparados, pero deriva la vista desde esa selección base.
2. `mergeWizardLevelSpells` utiliza ahora la selección editable para integrar solo los conjuros nuevos y las preparaciones elegidas, sin grabar automáticamente los rasgos de Maestría o Conjuros de firma.
3. `WizardSpellLibrary.tsx` muestra la selección proyectada para que ambos rasgos sigan siempre visibles y bloqueados, pero las acciones del jugador trabajan sobre la selección editable. Al preparar o aprender otro conjuro no se añade por accidente una preparación automática a los datos persistentes.
4. **Se preservan las preparaciones elegidas manualmente de verdad**: si el usuario ya había marcado uno de los conjuros, permanece en su selección base. La corrección no borra intenciones explícitas ni modifica el catálogo.

Este ajuste respeta el principio central de Crónicas: los efectos **pasivos y obligatorios** del motor no deben confundirse con las **decisiones activas** del jugador.

## Nueva batería de pruebas: niveles 1–20

`packages/rules-engine/tests/wizard-audit-64.test.ts` genera un personaje de prueba con las elecciones necesarias para progresar desde nivel 1 hasta nivel 20. Las elecciones se generan a partir de las capacidades disponibles en cada nivel y el catálogo de conjuros; no se reutiliza ningún fixture de otro archivo de test. Al avanzar, se comprueba:

| Invariante | Comprobación |
| --- | --- |
| Nivel y competencia | Cada nivel 1–20 y los tramos oficiales de competencia (+2 a +6) |
| Libro y preparación | Libro `6 + 2 × (nivel − 1)` y preparado reglamentario según `wizardProgression` |
| Trucos | 3 en niveles 1–3, 4 desde nivel 4, 5 desde nivel 10 |
| Ranuras | Los nueve máximos por nivel coinciden con la tabla existente |
| Maestría y firma | 0 siempre preparados hasta 17, 2 en 18–19 y 4 en 20 |
| Persistencia | Snapshot `schemaVersion:3` aceptado en cada nivel |
| Daño y otras marcas | 2 PG de daño, inspiración heroica, salvación de muerte y ranura inicial gastada conservadas |
| Interfaz de progresión | Vista previa disponible hasta 19→20 y deshabilitada después |
| Retroceso | Cadena 20→19→…→1 recuperando las elecciones de cada etapa y el estado válido de sus ranuras |

El test consume deliberadamente la primera ranura de nivel 1, la primera ranura de nivel 7 al alcanzarla, una ranura de nivel 9 y la **segunda** ranura de nivel 7 al llegar al 20. Así verifica que las ranuras adquiridas posteriormente se retiran al retroceder, pero el estado de las ya existentes se conserva. También registra un daño moderado y marcadores manuales, y comprueba su estabilidad.

Se añaden dos regresiones específicas:

- **Descansos del nivel 20:** usar los dos Conjuros de firma, descansar corto (recuperar solo esos usos, conservar las ranuras) y descansar largo (recuperar ranuras y usos).
- **Biblioteca editable frente a vista proyectada:** aunque los rasgos siempre preparados aparezcan en pantalla, ni una subida posterior ni la preparación de otro conjuro los insertan en la lista manual de manera involuntaria.

## Alcance y límites de la auditoría

**Cubierto en este parche:** los invariantes del motor 1–20, los datos guardados y la separación de preparación automática/manual. Se preservan las reglas implementadas en los pasos 47–63 y no se introducen nuevas clases, subclases ni automatismos activos.

**Pendiente de comprobar tras descomprimir en el monorepo completo:** ejecución real de todas las pruebas de Vitest, compilación Next.js, interacción visual a través del navegador, conexión y recarga con PostgreSQL, y revisión de reglas con los manuales de mesa. La copia parcial disponible para producir este ZIP no tiene el proyecto completo ni las dependencias instaladas, por lo que aquí solo se realiza verificación estática y de integridad del archivo.

**Importante:** en la comprobación de `main` durante esta entrega, el documento de la actualización 63 todavía no estaba publicado. Asegurar que la **63 esté aplicada en tu copia local antes de instalar la 64**. El parche 64 reemplaza solamente las rutas enumeradas abajo, pero presupone los modelos y componentes de nivel 20.

## Verificaciones manuales

1. Ejecutar las pruebas del motor y la compilación con todos los archivos hasta la versión 64:

   ```cmd
   pnpm --filter @dnd/rules-engine test
   pnpm build
   ```

2. Crear un Mago de nivel 1; comprobar que crear, guardar y recargar sigue funcionando.
3. Llevarlo a nivel **18**. En la biblioteca, desmarcar manualmente un conjuro no obligatorio. Las dos Maestrías deben seguir visibles y preparadas.
4. Sin haber preparado manualmente **Detectar magia**, subir a **19** y guardar. Verificar que Maestría mantiene ese hechizo preparado, pero que la lista editable no añade una preparación que no se eligió voluntariamente.
5. Continuar a nivel **20**, elegir **Bola de fuego** y **Volar** como firmas. Preparar/despreparar otro conjuro de la biblioteca. Ambos de firma deben mantenerse visibles y preparados; el cambio del otro no debe generar nuevas marcas manuales para ellos.
6. Gastar los dos usos de firma y una ranura de nivel 7; guardar y recargar. Confirmar persistencia del contador y la ranura.
7. Confirmar un descanso corto: debe restaurar los dos usos gratuitos, no la ranura de nivel 7. Tras descanso largo, la ranura sí se restablece.
8. Bajar consecutivamente de nivel 20 a 19 y luego a 18, revisando que se conserven Beneficio épico y Maestrías donde corresponden. Desde 18→17 deben desaparecer los dos conjuros siempre preparados de Maestría, sin borrar conjuros que permanecen legalmente en el libro.

Si falla alguna prueba automatizada, **no realizar el commit todavía**. Conservar la salida completa de CMD y revisarla antes de subir el parche.

## Archivos del ZIP

**Nuevos**:

- `packages/rules-engine/tests/wizard-audit-64.test.ts`
- `docs/implementation/PASO_64_AUDITORIA_MAGO_1_20_BIBLIOTECA.md`

**Actualizados**:

- `packages/rules-engine/src/wizard-spell-library.ts`
- `apps/web/src/components/WizardSpellLibrary.tsx`

## Próxima actualización propuesta: paso 65

Con los resultados locales de Vitest y la compilación confirmados, preparar una **revisión funcional en navegador** y una matriz de aceptación por nivel/clase para cerrar definitivamente el Mago. Después se podrá elegir la siguiente clase del calendario del proyecto, reutilizando el motor, los módulos de hoja y las pruebas ya existentes.

## Trazabilidad para el TFG

Esta fase documenta un método de auditoría por **invariantes y propiedades transversales**, la detección y corrección de una fuga entre modelo derivado y datos mutables, pruebas de progresión y retroceso completo, regresiones de compatibilidad de snapshots y la definición explícita de límites de verificación. Contribuye a describir la arquitectura del motor y a justificar sus pruebas de calidad de software en la memoria del trabajo.
