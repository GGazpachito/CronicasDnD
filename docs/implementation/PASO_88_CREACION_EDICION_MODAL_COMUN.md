# Actualización 88 · Ventana compartida de creación y edición

**Proyecto:** CrónicasDnD · núcleo SRD 5.2.1. **Alcance:** solo interfaz y organización; no incorpora contenido nuevo fuera del SRD ni altera fórmulas del motor de reglas.

## Problema anterior

- Guerrero mantenía un `<details>` con la antigua hoja técnica duplicada, un selector de nivel en el formulario y siete módulos de partida/combatientes heredados bajo «Herramientas existentes».
- Mago y Brujo tenían formularios iniciales incrustados encima de las pestañas de la ficha. La edición modificaba las elecciones mientras se tocaban los controles, sin una cancelación reversible clara.
- La cabecera común utilizaba la etiqueta «Gestionar nivel».

## Decisión y desarrollo

1. Nuevo `CharacterCreationDialog.tsx` como **marco común** para cualquier clase: `<dialog>` modal nativo, cabecera, contenido desplazable, salida por Escape/Cancelar y pie con «Guardar elecciones» solo cuando el resultado es válido. El diálogo mantiene accesibilidad mediante las referencias de título y descripción.
2. Cada clase reutiliza sus **elecciones existentes**, sin duplicar validaciones del SRD. El formulario está separado de la hoja y al confirmar se habilita Principal.
3. La edición de un personaje cargado captura una copia de las elecciones y del estado de sesión; Cancelar restaura esa copia, Guardar las confirma. La selección de progreso de niveles superiores no forma parte del formulario inicial.
4. `SaveLoadPanel` permanece montado mientras la ficha todavía no se muestra para permitir cargas asíncronas con `?character=...`; una carga válida abre directamente la hoja y no el editor inicial.
   Si el enlace a un personaje falla, el panel de guardado permanece visible y expone el error de carga; no se deja al jugador ante una pantalla completamente vacía.
   Hasta la primera confirmación recibe una instantánea nula: no intenta persistir elecciones incompletas ni bloquea la navegación con un aviso de cambios sin guardar.
   En Mago y Brujo se concilian automáticamente los PG actuales cuando una elección inicial cambia los PG máximos, respetando el daño sufrido si el personaje estaba herido.
   En Guerrero, si los cambios iniciales alteran el máximo de PG de una sesión activa, se prepara una conciliación sin mutar la partida y se informa en el diálogo; solo se aplica al confirmar «Guardar elecciones». Si la sesión no puede reconciliarse, Guardar se deshabilita.
5. Guerrero: se retiran de su página el panel de siete módulos antiguos, la vista técnica duplicada y la botonera de subir/bajar nivel incrustada. Las tiradas y recursos básicos permanecen en la hoja compartida; los paneles avanzados de combate quedan fuera de la interfaz hasta la futura fase de combate. No se borran datos de juego ni reglas históricas.
6. `CharacterHeader` expone **«Subir de nivel»** para Guerrero, Mago y Brujo. Cada uno sigue usando su propio adaptador del mismo `LevelUpDialogFrame` de progresión (incluyendo vista previa y confirmación).

## Semántica de guardado

La acción «Guardar elecciones» aplica las opciones dentro de la página para mostrar la ficha calculada; **no guarda todavía en PostgreSQL**. El usuario debe pulsar después «Guardar personaje» o «Guardar cambios» en el panel común de persistencia. Esta separación evita escrituras remotas parciales mientras se seleccionan campos interdependientes.

## Contrato para nuevas clases

- Añadir un formulario de datos iniciales como contenido de `CharacterCreationDialog`, reutilizando el selector común de características y los catálogos SRD habilitados.
- Mostrar `CharacterTabs` y `SharedPrincipalSheet` tras la confirmación del formulario; no incrustar editores dentro de Principal.
- Ofrecer cancelación que restaure entrada y estado previos cuando se está editando, y retorno a la elección de clase durante una creación nueva.
- Registrar la progresión exclusivamente con el asistente de subida y el `LevelUpDialogFrame` común.
- Mantener `SaveLoadPanel` montado antes de la confirmación para permitir cargar personajes ya guardados.

## Verificación manual recomendada

1. Desde «Crear personaje», abrir cada una de las tres clases: solo se puede confirmar cuando las elecciones son válidas.
2. Completar las elecciones, pulsar «Guardar elecciones» y comprobar que se muestra Principal con valores coherentes.
3. Editar el personaje, variar especie, características o conjuros, cancelar y confirmar que se recupera la ficha anterior.
4. Repetir la edición y guardar: deben aplicarse las elecciones y permitir guardar permanentemente en PostgreSQL.
5. Cargar por URL `?character=ID`: debe aparecer directamente la ficha guardada; comprobar las tres clases.
6. Subir un nivel con el botón «Subir de nivel» y confirmar que cada asistente mantiene sus elecciones y validaciones.
7. En Guerrero, comprobar que ya no se ofrecen los siete módulos heredados, la ficha técnica vieja ni los controles de mejora de niveles anteriores dentro del editor.

## Limitaciones

La subida de nivel sigue limitada a lo implementado por cada clase (Brujo 1–15). Los diálogos de creación reutilizan los catálogos SRD actuales; no crean un sistema de módulos de contenido instalables ni añaden funciones de combate. La persistencia en PostgreSQL continúa bajo confirmación explícita.
