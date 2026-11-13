# Actualización 44.1. Explicaciones de rasgos durante la progresión y en Rasgos

**Fecha:** 13/11/2026  
**Estado:** implementación preparada; pendiente de validación completa en el equipo del usuario y registro del commit.  
**Continuidad:** ampliación de la actualización 44, después de la pestaña Rasgos (40).

## 1. Necesidad detectada

La subida de nivel existente anunciaba nuevas capacidades por nombre, pero no aclaraba **qué permite hacer cada una**. El jugador debía consultar información externa para entender una dote o comparar estilos y maestrías. La pestaña Rasgos ya ofrecía resúmenes y algunos datos dinámicos, pero los textos no siempre explicaban el efecto reglamentario completo de forma breve.

**Requisito funcional:** permitir al jugador leer, sin abandonar la ficha, una explicación resumida de las capacidades que obtiene y de las opciones que debe seleccionar. No producir textos redundantes cuando la mejora solo modifica una puntuación numérica.

## 2. Decisión arquitectónica

Se añadió `packages/rules-engine/src/rules-explanations.ts` como **catálogo compartido y exclusivamente informativo**. Lo reutilizan:

- `LevelUpWizard.tsx`, para mostrar explicaciones al avanzar de nivel y al elegir una maestría, estilo o beneficio épico.
- `traits.ts` y `TraitsPanel.tsx`, para presentar el efecto reglamentario en cada tarjeta desplegable, junto con los datos concretos del personaje.
- `level-up-wizard.ts`, para asociar los hitos de progresión ya existentes a las descripciones del catálogo.

El catálogo **no aplica reglas ni modifica estadísticas**; no introduce una segunda fuente de cálculos. Las reglas efectivas siguen en el motor existente y el estado persistente de PostgreSQL no se ve afectado.

### Nuevas presentaciones

1. **Novedades del nivel:** lista con título del rasgo y párrafo claro cuando el rasgo concede alguna capacidad. Se omite el párrafo para la simple mejora de característica.
2. **Elecciones de nivel:** descripción de la maestría, estilo de combate o beneficio épico que esté seleccionado. Dos secciones desplegables permiten comparar las ocho propiedades de maestría y los estilos o beneficios disponibles antes de escoger.
3. **Confirmación:** debajo de cada rasgo nuevo aparece su explicación y, cuando es útil, el detalle de la elección; se recuerda además la propiedad de la maestría o el estilo nuevo.
4. **Rasgos:** cada tarjeta incorpora la explicación de su efecto, separada de la información sobre su automatización y de los datos derivados específicos del personaje.

El texto de las opciones no implica que sus acciones activas se resuelvan automáticamente en la aplicación. La automatización continúa identificada como calculada, parcial o manual.

## 3. Alcance del catálogo

- Rasgos de **Guerrero**, **Campeón** y sus mejoras por nivel.
- Diez estilos de combate incluidos en el motor.
- Ocho propiedades de maestría de armas y su vinculación a las armas ya catalogadas.
- Tres beneficios épicos elegibles en el proyecto: Pericia en combate, Fortaleza y Velocidad.
- Dotes de origen y rasgos de **humano, enano y elfo** actualmente disponibles.

No se añaden nuevas subclases, dotes generales, hechizos ni automatizaciones. Las opciones que todavía no ofrece el proyecto se mantienen señaladas como pendientes.

## 4. Fuente primaria y criterio de redacción

Fuente aportada por el usuario: **Dungeons & Dragons, Player's Handbook (2024)**. Páginas impresas:

| Tema | Referencias |
|---|---|
| Progresión y rasgos del Guerrero | 91–92 |
| Subclase Campeón | 96 |
| Especies actualmente implementadas | 188–194 |
| Dotes de origen, incluida Iniciado en la Magia | 200–202 |
| Estilos de combate | 209–210 |
| Beneficios épicos | 210–211 |
| Propiedades de maestría | 214–215 |

Las descripciones están redactadas en español como **paráfrasis originales**, no como copias del texto protegido. Se explican condiciones y efectos esenciales, sin sustituir el manual completo. Ante una discrepancia entre una descripción informativa y un cálculo vigente, se debe revisar la regla y registrar una incidencia, no alterar el cálculo únicamente para hacer coincidir el texto.

## 5. Archivos incorporados o modificados

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `packages/rules-engine/src/rules-explanations.ts` | Nuevo | Catálogo de efectos resumidos |
| `packages/rules-engine/src/traits.ts` | Modificado | Añade `explanation` opcional a cada rasgo y descripciones concretas de estilos y maestrías |
| `packages/rules-engine/src/level-up-wizard.ts` | Modificado | Resuelve títulos de hitos en textos explicativos compartidos |
| `apps/web/src/components/LevelUpWizard.tsx` | Modificado | Explicaciones y opciones comparables en las tres fases del asistente |
| `apps/web/src/components/TraitsPanel.tsx` | Modificado | Presenta descripción del rasgo en el desplegable |
| `apps/web/src/app/globals.css` | Modificado | Estilos de bloques y textos con adaptación a pantallas pequeñas |
| `packages/rules-engine/tests/rule-explanations.test.ts` | Nuevo | Ocho pruebas de cobertura y no mutación |
| `docs/implementation/PASO_44_1_DESCRIPCIONES_REGLAS_Y_ELECCIONES.md` | Nuevo | Registro técnico de la actualización |

## 6. Verificaciones realizadas en el entorno de preparación

| Verificación | Resultado |
|---|---|
| Compilación estricta de archivos TS del motor con TypeScript 5.8.3 | Superada |
| Compilación aislada de `LevelUpWizard.tsx` y `TraitsPanel.tsx` | Superada |
| Cobertura de todos los hitos no numéricos de los niveles 2–20 | Superada |
| Cobertura de rasgos nuevos en los 19 saltos consecutivos 1→20 | Superada |
| Ocho pruebas nuevas con ejecutor ligero de aserciones | 8/8 superadas |
| Seis pruebas anteriores de Rasgos con ejecutor ligero | 6/6 superadas |
| Renderizado aislado de wizard y Rasgos | Superado |
| Suite oficial de Vitest con dependencias completas | **Pendiente de ejecutar localmente** |
| ESLint 9, build Next.js, navegador y prueba de guardados | **Pendientes de ejecutar localmente** |

**Importante:** las ejecuciones con aserciones locales no se contabilizan como ejecución oficial de Vitest. El entorno de preparación tampoco equivale al repositorio que el usuario tiene en su PC. Se documentarán las salidas de los comandos finales cuando estén disponibles.

## 7. Pruebas de aceptación recomendadas

1. Desde nivel 1, avanzar a nivel 2: Acción súbita y Mente táctica deben mostrar una explicación funcional.
2. Nivel 3: Crítico mejorado y Atleta extraordinario deben indicar su condición y alcance.
3. Nivel 4: se explicará la maestría; en el campo de características bastará con mostrar +2 o +1/+1.
4. Nivel 7: al cambiar el segundo estilo, deberá cambiar también su descripción.
5. Nivel 10: elegir un arma con una maestría distinta y comprobar que cambia la descripción.
6. Nivel 19: cambiar entre tres beneficios épicos y comprobar las capacidades correspondientes.
7. Abrir **Rasgos** y desplegar capacidades de clase, Campeón, dotes y especie: debe aparecer una descripción del efecto además del estado de automatización.
8. Cancelar una subida de nivel: el personaje y sus recursos deben permanecer intactos; confirmar y usar «Actualizar guardado» para persistir.
9. Cargar personajes existentes: sin migración de base de datos ni cambio del esquema de snapshot.

## 8. Limitaciones y trabajo futuro

- El resumen no representa la redacción legal completa de cada habilidad y puede omitir casos infrecuentes; para decisiones discutidas, prevalece el manual y el DM.
- El sistema no introduce todavía dotes generales alternativas ni otras subclases. El catálogo crecerá cuando las reglas correspondientes se implementen de verdad.
- Los textos se mantienen en el código; en una evolución futura podría separarse un sistema de localización para traducciones o ediciones con distintas erratas oficiales.
- Es recomendable crear pruebas visuales y de interacción en navegador para los desplegables, sobre todo en pantallas pequeñas.

## 9. Control de versiones

La entrega contiene solamente ocho archivos. Tras validar localmente, crear un commit específico para la 44.1. Conservar el identificador, fecha, rama y resultados de `pnpm lint`, `pnpm test`, `pnpm build` como evidencia de integración continua y trazabilidad del TFG. No usar `git add -A`.
