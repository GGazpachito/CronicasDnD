# D&D Character Builder — Alcance del MVP

**Estado:** Propuesta de trabajo v0.1  
**Fecha:** 2026-11-03  
**Edición principal:** D&D 5e (reglas 2024)  
**Referencias:** Player's Handbook (2024), aportado para consulta; SRD 5.2.1, sujeto a su licencia aplicable.  
**Objetivo:** Crear, calcular, guardar y volver a abrir un personaje de prueba válido sin intervención manual en los cálculos básicos.

## 1. Reglas del proyecto

1. El motor de reglas no depende de la interfaz ni de la base de datos.
2. Cada definición de contenido indica `id`, edición, fuente, revisión y política de disponibilidad.
3. Los datos de decisiones del jugador son persistentes; los valores derivados se recalculan.
4. Los contenidos de distintas fuentes no se copian automáticamente de una a otra; el programa conserva su procedencia.
5. Las mecánicas pueden estar **automatizadas**, **asistidas** o **manuales**.
6. El contenido del manual aportado sirve como fuente de consulta; su presencia no concede por sí sola permiso de redistribución.

## 2. Primer recorrido completo (hito M1)

1. Crear un personaje con nombre y nivel 1.
2. Elegir la clase **Guerrero**.
3. Elegir entre **Humano, Enano o Elfo** (especies iniciales del prototipo).
4. Elegir entre **Acólito, Criminal, Erudito o Soldado** (trasfondos iniciales del prototipo).
5. Elegir método de puntuaciones: **matriz estándar** o **compra por puntos**; asignar puntuaciones.
6. Aplicar aumentos de características y elecciones del trasfondo.
7. Elegir las competencias y otras opciones disponibles sin superar límites de elección.
8. Seleccionar equipo inicial de las opciones admitidas.
9. Ver hoja calculada: modificadores, competencia, salvaciones, habilidades, iniciativa, velocidad, PG máximos, CA y ataques básicos.
10. Guardar el personaje y recuperarlo sin pérdida de datos.

**Extensión del mismo prototipo (hito M2):** progresar a niveles 2 y 3, aplicar rasgos correspondientes y escoger **Campeón** en nivel 3. Implementar recursos y decisiones de los rasgos que se incluyan en este recorrido.

## 3. Incluido inicialmente

| Área | Incluido en M1 | M2 |
| --- | --- | --- |
| Edición | Reglas 2024 | Igual |
| Clase | Guerrero | Guerrero |
| Subclase | No se necesita en nivel 1 | Campeón |
| Especies | Humano, Enano, Elfo | Igual |
| Trasfondos | Acólito, Criminal, Erudito, Soldado | Igual |
| Nivel | 1 | 1–3 |
| Características | Matriz estándar y compra por puntos; ajustes de trasfondo | Igual |
| Competencias | Salvaciones, habilidades, equipo relevante | Igual |
| Equipo | Opciones iniciales necesarias para el recorrido | Ajustes por progreso |
| Estadísticas | Modificadores, bonificador de competencia, PG máximos, CA, iniciativa, velocidad, tiradas de salvación, habilidades, ataques básicos | Rasgos y recursos adquiridos |
| Guardado | Crear, editar, recuperar | Guardar progreso |
| Fuente | Referencias separadas del SRD y del manual | Igual |

## 4. Fuera del primer prototipo

- Las otras once clases, otras subclases y especies adicionales.
- Niveles 4–20, multiclase, progresión completa y todas las dotes.
- Catálogo completo de conjuros y lanzamiento de conjuros automatizado.
- Todas las condiciones de combate y los modificadores situacionales.
- Editor homebrew, compartición pública, importación masiva y PDF definitivo.
- Migración o mezcla automática de reglas de 2014 con 2024.

**Nota:** «Fuera» significa que no se implementará en M1/M2, no que la arquitectura pueda ignorarlo. Los esquemas deben ser extensibles.

## 5. Contratos de información a diseñar antes de programar

- `Ruleset`: edición y versión de reglas.
- `Source`: nombre del documento, origen, licencia y restricciones.
- `ContentDefinition` + `ContentRevision`: identificador estable y revisión inmutable.
- `Character`: identidad, propietario y edición.
- `CharacterChoice`: decisión con referencia a contenido y momento/nivel.
- `CharacterState`: PG actuales, usos restantes y otros estados mutables.
- `Effect`: operación tipada y datos validados, sin código proporcionado por usuarios.
- `CalculationTrace`: explicación de cada valor derivado.

## 6. Pruebas mínimas de aceptación

- [ ] Un personaje de nivel 1 puede crearse con todos los campos exigidos.
- [ ] Los métodos de generación de características validan sus restricciones.
- [ ] Cambiar de trasfondo recalcula ajustes y decisiones dependientes.
- [ ] Una competencia concedida por dos fuentes no duplica el bonificador.
- [ ] Al cambiar de armadura se recalcula la CA con la fórmula correcta.
- [ ] Guardar y reabrir mantiene elecciones, revisiones y estado mutable.
- [ ] Una elección inválida se señala con una razón entendible.
- [ ] Las pruebas de cálculo funcionan sin arrancar Next.js.
- [ ] En nivel 3 se registra la elección Campeón sin perder decisiones anteriores.

## 7. Inventario documental pendiente (siguiente paso)

Crear `docs/requisitos/INVENTARIO_CONTENIDOS.md` con una fila por **tipo y fuente**: clases, subclases, especies, trasfondos, dotes, conjuros, armas, armaduras, herramientas, equipo, objetos mágicos y reglas transversales. Para cada tipo registrar:

- Ubicación en Player's Handbook 2024 y en SRD 5.2.1.
- Conteo de entradas verificado; dejar «pendiente» cuando falte contrastar.
- Campos necesarios para el esquema de datos.
- Mecánicas y tipos de efecto implicados.
- Nivel de automatización: automático, asistido o manual.
- Licencia / uso permitido y procedencia.

No importar texto protegido de forma indiscriminada. Las entradas de reglas deben revisarse contra la fuente y probarse antes de marcarse como completas.

## 8. Decisiones abiertas

- Autenticación en el primer prototipo: cuenta individual o persistencia local primero.
- Política de idioma: interfaz española con identificadores internos independientes del idioma.
- Alcance de la vista de impresión de M1.
- Conjunto exacto de equipamiento y efectos para los personajes de prueba.

**Criterio para cerrar la fase de requisitos:** aprobar M1/M2, completar inventario mínimo de los tipos implicados y convertir las reglas básicas en casos de prueba verificables.
