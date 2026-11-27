# Actualización 88.2 · Alinear la creación del Guerrero con Mago y Brujo

**Proyecto:** CrónicasDnD. **Catálogo:** programa base SRD 5.2.1, sin contenido nuevo.

## Necesidad

El paso 88 había unificado el marco modal y el guardado, pero el formulario de Guerrero todavía conservaba la navegación histórica de cinco pasos. Mago y Brujo mostraban un formulario desplazable, con dos columnas que se adaptan a pantallas pequeñas. Por tanto, el flujo visual seguía siendo distinto entre clases.

## Decisiones e implementación

1. Guerrero adopta exactamente los contenedores `wizard-editor panel`, `panel-heading` y `wizard-editor-grid` ya usados por Mago y Brujo dentro de `CharacterCreationDialog`.
2. La primera rejilla presenta identidad y origen junto a generación de características y competencias. Las siguientes rejillas muestran las particularidades del Guerrero: estilo de combate, maestrías y paquetes de equipo de clase y trasfondo.
3. Todas las elecciones están visibles en un formulario desplazable; no hay navegación interna por pasos, ni botones «Anterior»/«Siguiente». El único botón de confirmación está en el pie compartido del modal.
4. Los accesos «Editar» de Principal, Rasgos, Equipo, Hechizos y Personaje abren el mismo formulario completo. No se mantienen varias versiones del editor según el lugar de entrada.
5. Subidas y bajadas de nivel continúan fuera de este formulario, en los asistentes de progresión; las decisiones de niveles avanzados no se editan desde la creación.
6. Se conserva la lógica de validación, la instantánea de cancelación, la reconciliación explícita del máximo de PG cuando es necesaria y el guardado posterior en PostgreSQL.

## Contrato para clases futuras

Mantener los apartados comunes y la estructura de rejillas de dos columnas; incorporar apartados específicos únicamente cuando cambie el contenido jugable (por ejemplo, conjuros, estilos o invocaciones). No crear otro paso a paso exclusivo de una clase ni otra vista duplicada de edición.

## Verificación

- Pruebas del motor de reglas: sin cambios funcionales esperados.
- Pruebas manuales: abrir Guerrero, Mago y Brujo, comparar posición de cabecera, rejilla y botón de guardado; crear un Guerrero, editarlo desde varias pestañas, cancelar y guardar; revisar diseño en móvil; comprobar que «Subir de nivel» mantiene el asistente anterior.
- `pnpm lint`, `pnpm test` y `pnpm build` deben ejecutarse en el repositorio completo antes de publicar el commit.
