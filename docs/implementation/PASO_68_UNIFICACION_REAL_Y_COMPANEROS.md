# Paso 68: unificación real de fichas, biblioteca común y compañeros manuales

Fecha: 19 de noviembre de 2026. Base: actualización 67 y parche 67.1 aplicados sobre el desarrollo anterior. Entrega en ZIP incremental, sin modificaciones directas en `main`.

## Problema detectado por el usuario

1. La cabecera de PG de Brujo no coincidía con la del Mago/Guerrero; la inspiración no aparecía en el mismo lugar.
2. La biblioteca común existía como componente, pero Brujo solo recibía 27 reglas y ocultaba 242 fichas existentes del Mago; los filtros también variaban por clase.
3. El método de d20 inicial no correspondía a la generación oficial 4d6 descartando el dado menor; compra de puntos debía partir de 8 en todas las puntuaciones y ofrecer flechas.
4. Compañeros carecía de editor universal, selector y persistencia independiente de invocaciones concedidas por clase.
5. Faltaba una referencia normativa que evitase nuevas diferencias de arquitectura.

## Soluciones técnicas

- `SharedHealthControls`, `SharedDeathSavePanel`, `SharedInspirationPanel`: componentes con misma disposición y clases CSS. Brujo obtiene contador temporal/principal con ajustes firmados, percepción pasiva, salvaciones de muerte e inspiración en el pie. Guerrero mantiene mecánicas únicas, pero comparte `SharedInspirationPanel`.
- `shared-spell-catalog.ts`: unión por identificador, 249 fichas únicas. `SpellLibraryPanel` acepta `editableForSpell` para mostrar reglas de todas las listas sin conceder hechizos indebidamente. Mago, Brujo y Guerrero usan la unión y los mismos filtros de clases/niveles.
- `ability-generation.ts` + `AbilityScoreMethodPicker`: matriz estándar; compra 27 puntos desde seis 8 mediante flechas; 4d6 dejando fuera el menor, repetición de dados y visualización; d20 solo para compatibilidad con guardados antiguos.
- `companions.ts` + `SharedCompanionsPanel`: tipos y validación; lista de hasta 20 compañeros; ficha con defensa, combate, características, iniciativa, ataques, tiradas d20 e información narrativa; selector, crear, editar, guardar/cancelar. `companions` opcional en las entradas y snapshots de Guerrero, Mago, Brujo. Los pactos y familiares otorgados por rasgos siguen separados.
- `docs/architecture/ESTRUCTURA_HOJA_COMUN.md`: contrato de las siete pestañas y lista de comprobación obligatoria antes de añadir clases.

## Compatibilidad y límites declarados

- Los guardados previos sin compañeros siguen siendo válidos; la ficha manual se almacena en `input.companions`. Las modificaciones no alcanzan la base de datos hasta pulsar guardar el personaje.
- Brujo sigue implementado solo a nivel 1; el catálogo transversal muestra conjuros superiores **para consulta**, no concede ranuras ni acceso reglamentario.
- No se han duplicado registros de conjuros ni se han automatizado elecciones del jugador.
- Se entregan las pruebas de motor para ejecutar en el repositorio completo. En el entorno de construcción del ZIP no se dispone de `package.json` ni dependencias del monorepo, por lo que `pnpm test/lint/build` se deben ejecutar tras instalar el parche en el repositorio local.

## Verificación manual requerida

1. Crear Mago y Brujo y comparar Principal: misma fila de PG/CA/iniciativa, contador PG con flechas y misma estrella de inspiración en la última tarjeta.
2. Aplicar daño `-7` con 4 PG temporales y comprobar que quedan 0 temporales y que los PG ordinarios bajan 3.
3. Comprobar salvaciones de muerte manuales, percepción pasiva e inspiración en Brujo.
4. Visitar Hechizos en Guerrero, Mago y Brujo → Todos los conjuros: 249 fichas, filtros Mago (242) y Brujo (27), niveles y búsqueda; seleccionar solo «Mago» no reduce el catálogo disponible para **consulta** en Brujo fuera del filtro elegido.
5. Verificar que Brujo no gana permiso para aprender hechizos de Mago y que Mago no incorpora las 7 fichas exclusivas de Brujo como conjuros aprendibles.
6. En creación, elegir Compra de puntos: seis 8 y saldo 27; subir puntuaciones con flechas, intentar gastar más de 27, bajar una puntuación para recuperar coste; elegir 4d6 y comprobar cuatro resultados con uno descartado.
7. En Compañeros de cada clase, crear dos fichas, seleccionar una, editar y guardar; comprobar que cancelar no altera datos guardados y que la ficha se conserva tras «Guardar cambios» y recargar.
8. En Brujo con Pacto de la Cadena, verificar que el familiar de clase aparece **además** de las fichas manuales, sin ocultarlas.
9. Abrir personajes guardados antes del paso 68 y comprobar compatibilidad y navegación.

## Siguiente paso propuesto

Revisión visual completa con pruebas de navegador en las tres clases y, una vez superada, retomar la progresión reglamentaria de Brujo nivel 2: nuevas invocaciones y sustituciones guiadas, Astucia mágica y Magia de Pacto, siempre utilizando los componentes y contrato del paso 68.
