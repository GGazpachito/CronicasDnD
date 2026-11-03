# Inventario técnico de contenidos y reglas — D&D 2024

**Proyecto:** D&D Character Builder  
**Estado:** v0.1, inventario de arquitectura; no es una importación de datos  
**Fecha:** 2026-11-03  
**Fuentes:** *Player's Handbook* 2024 (PDF del proyecto, 387 páginas) y SRD 5.2.1 (Wizards of the Coast, CC BY 4.0).  
**Alcance inicial:** M1 Guerrero nivel 1; M2 Guerrero niveles 2–3/Campeón.

> **Uso de las fuentes:** el PHB es material de consulta para estudiar mecánicas. No se deben subir el PDF ni transcripciones completas de contenido propietario al repositorio ni distribuirlos con la aplicación sin derechos suficientes. El SRD conserva su atribución y metadatos de licencia. Los identificadores internos no dependen del nombre en inglés o español.

## 1. Inventario por familias

| Familia | PHB 2024 (ubicación impresa) | Cobertura comparativa | Campos mínimos a modelar | M1/M2 |
|---|---|---|---|---|
| Reglas fundamentales | Cap. 1, pp. 6–31; glosario pp. 360–377 | Comunes en gran medida con SRD | `ruleId`, `rulesetId`, operación, parámetros, excepciones | **Esencial** |
| Creación y progreso | Cap. 2, pp. 32–47 | Ambas fuentes | método de puntuaciones, nivel, pasos, condiciones | **Esencial** |
| Clases | Cap. 3, pp. 48–175 | 12 en PHB y SRD | dado de golpe, competencias, listas de elecciones, progresión | Guerrero |
| Subclases | Cap. 3, pp. 48–175 | **48 PHB / 12 SRD** | clase padre, nivel de entrada, rasgos por nivel | Campeón en M2 |
| Trasfondos | Cap. 4, pp. 176–185 | **16 PHB / 4 SRD** | 3 características elegibles, competencia en 2 habilidades y 1 herramienta, dote, equipo | 4 del SRD |
| Especies | Cap. 4, pp. 186–197 | **10 PHB / 9 SRD** | tamaño, velocidad, rasgos y elecciones internas | Humano, Enano, Elfo |
| Dotes | Cap. 5, pp. 198–211 | PHB amplía catálogo SRD | categoría, requisitos, efectos, opciones | Dotes otorgadas por trasfondo |
| Armas | Cap. 6, pp. 213–218 | Amplio solapamiento | coste, dados, tipo, propiedades, maestría, alcance | Equipo inicial Guerrero |
| Armaduras | Cap. 6, p. 219 | Amplio solapamiento | fórmula CA, restricciones, fuerza, sigilo | **Esencial** |
| Herramientas y equipo | Cap. 6, pp. 220–233 | Amplio solapamiento | peso, precio, tipo, cantidad, acciones | Equipo inicial pertinente |
| Objetos mágicos | Cap. 6, pp. 232–233 | **SRD tiene catálogo más amplio** | sintonización, efectos, cargas, equipamiento | Posterior |
| Conjuros | Cap. 7, pp. 234–343 | PHB incluye más opciones | nivel, escuela, componentes, tiempo, alcance, duración, escalado | Posterior |
| Perfiles de criaturas | Apéndice B, pp. 346–359 | **SRD tiene catálogo mucho mayor** | tamaño, CR, atributos, acciones y formas | Posterior |
| Cosmología | Apéndice A, pp. 344–345 | No prioritaria para hojas | etiquetas y referencias | Excluido MVP |

**Pendiente de cotejo exacto:** número y lista de todas las dotes, conjuros, objetos y criaturas entre el PHB y SRD. No dar por completado el catálogo sin comparar entradas individualmente (incluyendo posibles nombres alternativos).

## 2. Clases y subclases del PHB (48)

La primera subclase listada por cada clase se encuentra también en el SRD 5.2.1. Las otras tres son opciones adicionales del PHB. Los nombres en español son **etiquetas de trabajo**, no necesariamente traducciones editoriales oficiales.

| Clase | Subclase del SRD | Otras tres opciones del PHB |
|---|---|---|
| Bárbaro | Berserker | Wild Heart; World Tree; Zealot |
| Bardo | Lore | Dance; Glamour; Valor |
| Clérigo | Life | Light; Trickery; War |
| Druida | Land | Moon; Sea; Stars |
| Guerrero | Champion | Battle Master; Eldritch Knight; Psi Warrior |
| Monje | Open Hand | Mercy; Shadow; Elements |
| Paladín | Devotion | Glory; Ancients; Vengeance |
| Explorador | Hunter | Beast Master; Fey Wanderer; Gloom Stalker |
| Pícaro | Thief | Arcane Trickster; Assassin; Soulknife |
| Hechicero | Draconic | Aberrant; Clockwork; Wild Magic |
| Brujo | Fiend | Archfey; Celestial; Great Old One |
| Mago | Evoker | Abjurer; Diviner; Illusionist |

## 3. Orígenes del personaje

**Trasfondos del PHB (16):** Acolyte, Artisan, Charlatan, Criminal, Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble, Sage, Sailor, Scribe, Soldier, Wayfarer.

**Trasfondos del SRD (4):** Acolyte, Criminal, Sage, Soldier.  
**M1:** Acolyte, Criminal, Sage, Soldier. Cada uno debe validarse contra su fuente antes de publicar datos estructurados.

**Especies del PHB (10):** Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling.  
**Especies del SRD (9):** todas las anteriores excepto Aasimar.  
**M1:** Human, Dwarf, Elf. Incluir elecciones internas cuando corresponda.

## 4. Contrato preliminar de datos (sin esquema SQL todavía)

| Tipo | Campos transversales | Campos específicos fundamentales |
|---|---|---|
| Fuente | `sourceId`, `title`, `edition`, `license`, `distributionPolicy` | referencia bibliográfica y URL oficial cuando exista |
| Revisión de contenido | `contentId`, `revisionId`, `type`, `rulesetId`, `sourceId` | `mechanics`, `prerequisites`, `choices`, texto autorizado opcional |
| Clase | comunes | `hitDie`, `savingThrowProficiencies`, `skillChoices`, `startingEquipmentChoices`, `progression` |
| Subclase | comunes | `parentClassId`, `levelFeatures`, `choiceDefinitions` |
| Especie | comunes | `sizeChoices`, `speed`, `traits`, `lineageChoices` |
| Trasfondo | comunes | `abilityChoices`, `skillProficiencies`, `toolProficiency`, `originFeatId`, `equipmentChoices` |
| Dote | comunes | `category`, `prerequisites`, `effects`, `repeatable`, `choices` |
| Conjuro | comunes | `level`, `school`, `classes`, `castingTime`, `range`, `components`, `duration`, `concentration`, `mechanics` |
| Objeto | comunes | `itemType`, `weight`, `cost`, `equipmentProperties`, `attunement`, `effects` |
| Personaje | `characterId`, `ownerId`, `rulesetId` | `baseAbilities`, `classLevels`, `choiceRecords`, `inventory`, `resources`, `selectedRevisions` |

**Principio:** distinguir *definiciones* del contenido, *elecciones* del personaje y *estado mutable* (PG actuales, recursos gastados). No guardar un bonificador derivado como fuente de verdad.

## 5. Tipos iniciales de efectos del motor

| Operación propuesta | Ejemplo de uso | Fase |
|---|---|---|
| `ability_score_increase` | mejoras de característica del trasfondo | M1 |
| `grant_proficiency` | habilidades y salvaciones | M1 |
| `grant_armor_training` | entrenamiento con armadura de Guerrero | M1 |
| `grant_weapon_proficiency` | competencia con armas | M1 |
| `grant_language` | idiomas de origen | M1 |
| `add_numeric_bonus` | modificadores numéricos permitidos | M1 |
| `armor_class_formula` | fórmula base según armadura | M1 |
| `grant_feature` | rasgos de clase o especie | M1–M2 |
| `grant_choice` | selección de competencia, idioma o equipo | M1 |
| `resource_maximum` / `resource_recovery` | usos y descansos de rasgos | M2 |
| `conditional_effect` | bonus dependiente de equipar un objeto | M2+ |
| `grant_spell`, `spell_slots` | conjuros y progresión mágica | Posterior |
| `replace_formula`, `set_minimum` | excepciones de cálculo | Posterior |

**Nota:** los nombres de operación son propuestas de arquitectura, no propiedades oficiales de D&D. No se aceptará ejecución de código arbitrario en efectos importados ni homebrew.

## 6. Dependencias imprescindibles para el prototipo

```text
Clase Guerrero ──> competencias / dado de golpe / rasgos por nivel
Trasfondo ──> aumentos de características / habilidades / herramienta / dote / equipo
Especie ──> tamaño / velocidad / rasgos / elecciones
Puntuaciones base + ajustes ──> características finales ──> modificadores
Nivel total ──> competencia
Modificadores + competencias ──> habilidades / salvaciones / iniciativa / ataques
Armadura + escudo + Destreza ──> CA (una fórmula base compatible)
Constitución + progresión de clase ──> PG máximos
Equipo seleccionado ──> inventario y ataques disponibles
```

## 7. Casos de prueba que hay que redactar antes de implementar

- [ ] Matriz estándar y compra por puntos: solo se admiten combinaciones válidas.
- [ ] Trasfondo: solo permite aplicar los aumentos a sus tres características elegibles.
- [ ] Competencia duplicada: no se suma dos veces.
- [ ] Guerrero de nivel 1: competencia, PG y salvaciones se calculan con las reglas del PHB.
- [ ] Cambiar de armadura/escudo actualiza CA sin acumular fórmulas alternativas.
- [ ] Humano, Enano y Elfo: se aplican tamaño, velocidad y elecciones de rasgos pertinentes.
- [ ] Equipo inicial: ninguna elección queda sin resolver y el inventario coincide con la elección.
- [ ] El guardado conserva el origen y revisión de cada elección.
- [ ] M2: subir de nivel no consume ni restaura recursos por error; Campeón se elige en nivel 3.
- [ ] En la salida de cada estadística se muestra el origen de los modificadores.

## 8. Tareas siguientes (orden recomendado)

1. Verificar el detalle del Guerrero en PHB, pp. 90–99, y registrar sus elecciones por nivel 1–3.
2. Verificar las cuatro fichas de trasfondo, pp. 177–185, y crear su matriz de atributos/competencias/dote/equipo.
3. Verificar las tres especies M1, pp. 188–194, incluidas elecciones internas.
4. Identificar exactamente las armas, armaduras y equipamiento iniciales del Guerrero, pp. 213–233.
5. Redactar **casos de prueba numéricos** con entradas y resultados esperados.
6. Aprobar contratos de datos y después preparar PostgreSQL/Prisma y migraciones.
7. Ampliar inventario PHB/SRD por lotes (otras clases, conjuros, dotes, objetos, criaturas) sin bloquear M1.

## 9. Estado y criterios de finalización

- [x] Índice y familias de contenido documentados.
- [x] 12 clases y 48 subclases identificadas desde el índice del PHB.
- [x] 16 trasfondos y 10 especies identificados desde el índice del PHB.
- [x] Diferencias cuantitativas básicas con SRD documentadas.
- [x] Campos iniciales y dependencias del motor propuestos.
- [ ] Fichas mecánicas detalladas de Guerrero, 4 trasfondos, 3 especies y equipo M1 verificadas una a una.
- [ ] Casos de prueba M1 con resultados exactos validados contra el libro.
- [ ] Catálogo completo de dotes/conjuros/objetos cotejado entre fuentes (fase posterior).

## 10. Fuentes y trazabilidad

- **Manual del Jugador (2024)**, PDF aportado en la conversación: índice en pp. 2–3 del archivo; creación pp. 32–47; clases pp. 48–175; orígenes pp. 176–197; dotes pp. 198–211; equipo pp. 212–233; conjuros pp. 234–343; apéndices pp. 344–377 (numeración del libro).
- **SRD 5.2.1, oficial:** https://www.dndbeyond.com/srd . Publicado bajo **CC BY 4.0**. Conservar atribuciones al reutilizar material del SRD.

Este inventario evita reproducir descripciones completas del libro: resume contenido, arquitectura y referencias para uso en desarrollo.
