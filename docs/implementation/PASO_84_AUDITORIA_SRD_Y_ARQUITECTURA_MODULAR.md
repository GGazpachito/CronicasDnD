# Paso 84 · Auditoría SRD 5.2.1 y arquitectura modular de CRÓNICAS

**Fecha:** 27-11-2026. **Objetivo:** depurar el contenido del programa base antes de continuar la progresión del Brujo, separando reglas del SRD y material comercial para módulos futuros autorizados.

## Referencia y método

- Fuente principal: [SRD 5.2.1 de Wizards of the Coast](https://www.dndbeyond.com/srd), PDF inglés y traducción española.
- Se contrastan **categorías y entradas concretas**, no la mera presencia de mecánicas en *Basic Rules 2024* ni en el *Player's Handbook 2024*: las listas públicas y comerciales no son equivalentes.
- La auditoría de la lista de Mago se automatiza extrayendo el PDF inglés con `pdftotext -raw` y ejecutando `scripts/audit-srd-spells.mjs`. Resultado: **217 entradas oficiales; 217 entradas actuales; 0 ajenas**. Se registran equivalencias de los conjuros cuyo nombre propio fue sustituido por un título genérico en el SRD.
- Las demás listas, dotes, estilos, beneficios, familiares y conjuros de Iniciado en la Magia se comparan con las tablas oficiales. Se añade una prueba de regresión.

## Exclusiones concretas

### Dotes de origen

Se retiran `crafter`, `healer`, `lucky`, `musician`, `tavern_brawler` y `tough`.

Quedan `alert`, `magic_initiate`, `savage_attacker`, `skilled`. Los dos asistentes especializados (Mago, Brujo) que antes ofrecían Alerta/Duro ofrecen Alerta/Ataque salvaje, sin sumar los PG de Duro.

### Estilos de combate

Se retiran `blind_fighting`, `dueling`, `interception`, `protection`, `thrown_weapon_fighting` y `unarmed_fighting`.

Quedan `archery`, `defense`, `great_weapon_fighting`, `two_weapon_fighting`. Se retiran las bonificaciones específicas de los estilos eliminados en el cálculo de ataques.

### Beneficios épicos

Se retiran `fortitude` y `speed` del selector y cálculo. Quedan `combat_prowess`, `spell_recall` y `truesight` según la clase. Los campos antiguos relacionados con Fortaleza que persisten en estructuras de combate son de compatibilidad histórica y ya no dan acceso a una nueva elección válida.

### Mago: 25 conjuros retirados

```text
blade_ward, friends, mind_sliver, thunderclap, toll_the_dead,
witch_bolt, arcane_vigor, cloud_of_daggers, crown_of_madness,
phantasmal_force, telepathy, circle_of_power,
jallarzis_storm_of_radiance, steel_wind_strike, synaptic_static,
yolandes_regal_presence, summon_aberration, summon_construct,
summon_elemental, arcane_gate, summon_fiend,
tashas_bubbling_cauldron, feign_death, summon_fey, summon_undead
```

También se limpian los metadatos de hechizos retirados y el conjunto de elegibilidad para Maestría de conjuros. Los títulos originalmente epónimos conservan sus **IDs persistentes** pero se muestran con su **nombre genérico en español** cuando así figura en el SRD, para mantener compatibilidad con referencias internas.

### Brujo: opciones adicionales retiradas

- Trucos: `blade_ward`, `friends`, `mind_sliver`, `thunderclap`, `toll_the_dead`.
- Nivel 1: `armor_of_agathys`, `arms_of_hadar`, `witch_bolt`.
- Nivel 2: `cloud_of_daggers`, `crown_of_madness`.
- Nivel 3: `hunger_of_hadar`, `summon_fey`, `summon_undead`.
- Nivel 4: `summon_aberration`.
- Nivel 5: `jallarzis_storm_of_radiance`, `synaptic_static`.
- Nivel 6: `arcane_gate`, `summon_fiend`, `tashas_bubbling_cauldron`.

Se retiran las fichas independientes de los tres conjuros exclusivos. La lista SRD restante contiene respectivamente **7 trucos, 12 conjuros de nivel 1, 10 de nivel 2, 11 de nivel 3, 5 de nivel 4, 7 de nivel 5, 4 de nivel 6 y 4 de nivel 7**.

### Familiares, bestiario y magia de origen

- Se excluye `slaad_tadpole` de las formas de Pacto de la Cadena y del Bestiario. Quedan siete especiales, además de quince comunes/compatibles.
- El origen del Bestiario se redefine a la URL del SRD 5.2.1. Se conserva la ordenación por VD ascendente y por nombre alfabético.
- Las listas de Iniciado en la Magia se ajustan a **7 trucos de Clérigo, 11 de Druida, 15 de Mago**; se retiran los trucos ajenos al SRD y `witch_bolt` de Mago nivel 1.
- La progresión de Brujo se **detiene en nivel 14**; esta auditoría no introduce niveles adicionales.

## Compatibilidad y limitaciones constatadas

La actualización **no realiza migraciones destructivas**: no se eliminan usuarios, personajes ni registros de base de datos. Los guardados que todavía hagan referencia a elecciones retiradas pueden necesitar migración explícita antes de superar los validadores del núcleo actualizado. La futura aplicación deberá avisar y permitir exportar el personaje, conservar datos anteriores y elegir una sustitución válida. **No sustituir elecciones silenciosamente en los personajes reales.**

Algunos esquemas de serialización mantienen propiedades opcionales históricas para poder identificar guardados existentes. No equivalen a contenido seleccionable en el catálogo activo.

Esta fase **no implementa** todavía la instalación ni activación de módulos por cuenta; el contrato preliminar de manifiesto y procedencia está en `content-packs.ts` y el diseño completo en `docs/architecture/ARQUITECTURA_MODULAR_SRD.md`. Cualquier paquete futuro, incluidos complementos equivalentes a libros comerciales, requiere una autorización de distribución independiente. La arquitectura modular no elimina las obligaciones de copyright.

## Verificación y aceptación

- Auditoría automática de nombres y niveles de Mago contrastada con PDF oficial: **217/217**.
- Prueba de límites de catálogo: `packages/rules-engine/tests/srd-base-84.test.ts` (listas de conjuros, dotes, estilos, familiares, manifiesto base y rechazo de contenido retirado).
- Adaptación de los tests de progresión que utilizaban hechizos del PHB no existentes en SRD, manteniendo la intención de probar subida, bajada y guardado.
- Antes de dar el paso por cerrado en el repositorio completo, ejecutar `pnpm test` y `pnpm build`, además de una revisión manual de las pantallas Guerrero, Mago, Brujo y Bestiario.

**Nota sobre el entorno de elaboración:** el material local disponible en esta revisión es un conjunto parcial de archivos fuente, sin `package.json`, `pnpm-lock.yaml` ni dependencias. La auditoría comparativa y la importación aislada de los módulos del motor sí se pueden ejecutar, pero no resulta posible certificar aquí una ejecución completa de `pnpm test` ni `pnpm build`. Esta comprobación queda pendiente en la copia completa del usuario.

## Valor para el TFG

Esta actualización introduce una decisión medible de **separación entre plataforma de reglas, datos licenciados y extensiones**. Permite justificar el alcance de un MVP reproducible y redistribuible, la trazabilidad de licencias, las pruebas contractuales, la mantenibilidad del catálogo de hechizos, el diseño de futuras activaciones por usuario y la necesidad de migraciones sin pérdida de datos ante versiones de contenido.
