# Actualización 41.3: controles globales de tiradas y rediseño compacto de ataques e inspiración

**Proyecto:** editor y hoja digital de personaje de D&D 2024 (5.5).  
**Fecha de preparación:** 13 de noviembre de 2026.  
**Naturaleza:** mejora de interfaz sobre la actualización 41.2.  
**Estado:** implementación preparada y validaciones parciales realizadas; pendiente de validación integral en la instalación del desarrollador y commit.

## 1. Petición y objetivos

El usuario pidió cuatro mejoras independientes pero relacionadas con la hoja **Principal**:

1. Reducir considerablemente la altura ocupada por cada arma equipada en el módulo *Ataques y armas*, especialmente con varias armas.
2. Eliminar la elección de ventaja/desventaja de cada arma y compartir el selector de la hoja Principal. Convertir el selector existente en **dos botones discretos y mutuamente excluyentes**, que se desactivan al pulsar de nuevo sobre el botón marcado.
3. Sustituir la casilla de crítico de cada arma por **una única casilla de daño crítico común** a todas las armas equipadas, que duplique los dados de daño del arma (no el modificador).
4. Reemplazar los botones de «Anotar inspiración» y «Gastar inspiración» por **una única casilla visualmente cuidada**, cuyo estado marcado represente la posesión de inspiración heroica.

Se mantiene el objetivo general del producto: una hoja de ayuda con tiradas manuales, **no un videojuego ni un simulador automático de combate**.

## 2. Arquitectura y decisiones

### 2.1. Una sola circunstancia de d20 en Principal

El estado de presentación `circumstanceMode` ya existía en `PrincipalOverview.tsx`, limitado anteriormente a iniciativa, habilidades y salvaciones; el módulo `PrincipalEquippedAttacks.tsx` guardaba otra circunstancia independiente dentro de cada tarjeta. Se ha **eliminado ese estado local** y el componente padre pasa el modo compartido a las tarjetas de las armas.

Interacción:

- Pulsar **Ventaja** cuando no está activa activa ventaja.
- Pulsar **Desventaja** estando activa ventaja desmarca ventaja y activa desventaja, y viceversa.
- Pulsar de nuevo el botón activo deja el modo en normal.
- La circunstancia compartida **se mantiene seleccionada entre tiradas hasta que el usuario la desmarque**, a diferencia del anterior restablecimiento automático tras cada d20. Se explica expresamente en la interfaz.
- Cada lanzamiento combina esa circunstancia con las ventajas/desventajas calculadas por las reglas existentes mediante `rollD20`. Si existen circunstancias opuestas, se anulan.
- `aria-pressed` refleja correctamente el modo de cada botón, facilitando su uso con tecnologías de asistencia.

Se ha **descartado** mantener un selector por arma: introduce duplicidad de estado, incrementa la altura y puede producir resultados incoherentes entre las distintas secciones de la hoja.

### 2.2. Crítico global compartido entre armas

El estado efímero `criticalDamage` reside en `PrincipalOverview.tsx` y se transmite a todas las tarjetas de armas equipadas. Solo hay **un checkbox** «Daño crítico» en la cabecera del módulo; no aparece un control independiente por tarjeta.

Reglas:

- Con la casilla activada, la fórmula de daño muestra el doble de **dados** (por ejemplo, espadón `2d6` → `4d6`).
- El modificador del daño **se suma una sola vez** usando `resolveWeaponDamage`, sin reimplementar cálculos en React.
- Sin marcar el crítico global, un ataque crítico natural continúa provocando el doble de dados para **esa arma**, como ya ocurría en la 41.2.
- El checkbox no cambia los d20 de ataque ni automatiza daño a enemigos, consumo de munición o resultados de impacto.
- Si cambia el modo crítico, los resultados anteriores de daño que correspondan al otro modo dejan de mostrarse para evitar interpretaciones erróneas.

Se ha descartado guardar el crítico como regla persistente del personaje. Es una circunstancia de la tirada, no una propiedad de personaje o inventario.

### 2.3. Compactación de cada arma

Se mantiene el filtro de **solo armas equipadas**, implementado en la actualización 41.2. Se reorganiza la presentación:

- Cabecera con nombre, categoría, maestría y mejora mágica (si corresponde).
- Dos campos compactos con bonificador de **Ataque** y fórmula de **Daño**.
- Dos botones pequeños «Tirar ataque» y «Tirar daño».
- Desglose de modificadores y opciones de uso tras controles desplegables.
- Resultados recientes en una línea legible, con dados individuales ampliables bajo «Ver tirada» o «Ver dados».
- Notas extensas de condiciones en un desplegable, para que no multipliquen la altura de la lista.

Esto permite que varias armas convivan en Principal sin convertir el panel en una sucesión de tarjetas voluminosas. Las opciones tácticas completas siguen disponibles en el panel avanzado.

### 2.4. Inspiración heroica como casilla visual

El nuevo control es un **checkbox real** estilizado como tarjeta con estrella, estado visual y marca de confirmación:

- Marcado = `combat.heroicInspiration === true`; sin marcar = `false`.
- Al marcar se envía `gain_heroic_inspiration` al motor existente.
- Al desmarcar se envía `spend_heroic_inspiration` al mismo motor.
- El checkbox queda deshabilitado cuando no hay sesión sincronizada.
- El estado deriva directamente de `AdventureState`, por lo que no existe un segundo contador. La inspiración obtenida por *Guerrero heroico* conserva el comportamiento del panel de turnos.
- El usuario debe **actualizar el guardado** para persistir los cambios de la partida en PostgreSQL, como en las entregas anteriores.

Se evita duplicar la inspiración en un `useState` del componente. No hay cambios de esquema ni migraciones.

## 3. Archivos afectados

| Archivo | Tipo | Descripción |
|---|---|---|
| `apps/web/src/components/PrincipalOverview.tsx` | Modificado | Botones exclusivos de ventaja/desventaja, circunstancia compartida con armas, crítico global. |
| `apps/web/src/components/PrincipalEquippedAttacks.tsx` | Modificado | Tarjetas compactas; eliminación de selectores por arma; crítico compartido; resultados breves desplegables. |
| `apps/web/src/components/PrincipalSessionControls.tsx` | Modificado | Checkbox interactivo para inspiración heroica vinculado al estado existente. |
| `apps/web/src/app/globals.css` | Modificado | Estilos adaptativos, estados activos, accesibilidad visual y compactación. |
| `docs/implementation/PASO_41_3_CONTROLES_ATAQUES_E_INSPIRACION.md` | Nuevo | Registro técnico de la presente entrega. |

**No se modifica:** motor de reglas, rutas API, esquema de base de datos, archivos de dependencias, versión de snapshots ni inventario.

## 4. Verificaciones efectuadas durante la preparación

- **TypeScript estricto y sin emisión** de los tres componentes TSX de la actualización: superado mediante TypeScript 5.8.3 disponible en el entorno de preparación. En el proyecto local se usa TypeScript 5.9.3; debe ejecutarse su comprobación habitual.
- **Transpilación CommonJS aislada** de los componentes y sus importaciones: superada.
- **Siete aserciones sobre renderizado SSR** con React 19, que comprueban: presencia de los controles exclusivos, ausencia del selector de cada arma, fórmula normal `2d6`, fórmula global crítica `4d6`, ausencia de armas no equipadas, e inspiración marcada o desmarcada según el estado real: superadas.
- **No ejecutados aquí:** lint de todo el proyecto, suite completa de Vitest, compilación de Next.js y pruebas interactivas en navegador. No se presentan como aprobados.

## 5. Plan de validación local y criterios de aceptación

Ejecutar en la raíz del proyecto:

```powershell
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Después probar manualmente:

1. Con varias armas equipadas, comprobar que cada una tiene una tarjeta compacta y que únicamente aparecen las marcadas en Equipo.
2. Activar «Ventaja»: queda resaltada y «Desventaja» no; activar «Desventaja» la reemplaza; volver a pulsar «Desventaja» deja ambos desactivados.
3. Con «Ventaja» activada, lanzar una habilidad y luego un ataque. Comprobar que la circunstancia sigue activa y que se reflejan los dados y los modificadores respectivos.
4. Verificar la cancelación cuando el motor concede una circunstancia opuesta.
5. Activar «Daño crítico» con varias armas equipadas y comprobar que todas las fórmulas de daño duplican únicamente los dados. Desactivarlo y comprobar que vuelven a la fórmula normal, salvo críticos naturales vigentes de cada arma.
6. Realizar tiradas de ataque y daño, desplegar los detalles, comprobar que siguen visibles los dados individuales y los modificadores, y que el modificador de daño no se duplica.
7. Marcar «Inspiración heroica» y comprobar que el panel antiguo también la reconoce. Desmarcarla y comprobar que se ha gastado.
8. Probar la navegación con teclado (Tab, Espacio, Intro) y la vista en móvil o ventana estrecha.
9. Guardar y cargar el personaje: armas y estado de inspiración deben conservarse. La selección de ventaja y crítico, al ser temporal y no persistida, **no se incorpora al snapshot**.
10. Verificar que los dos personajes guardados siguen siendo accesibles desde «Mis personajes».

## 6. Riesgos, límites y próximos pasos

- La selección global de crítico es una ayuda a las tiradas, no prueba que un ataque impactase ni que el director de juego concediera daño crítico.
- El resultado automático de crítico natural sigue siendo específico de la última tirada de ataque de su arma. La casilla global tiene prioridad para la duplicación manual.
- Los efectos que requieran nuevas decisiones o automatizaciones (por ejemplo, gasto de munición, impactos a enemigos, posición en combate) quedan fuera de alcance.
- La selección de ventaja/desventaja es **persistente durante la sesión visual**, por decisión de UX. Conviene desmarcarla al concluir una circunstancia.
- Cuando haya resultados de varios ataques, los desgloses se muestran a petición para conservar el espacio.
- La resolución de tiradas y las reglas de inspiración no se reimplementan en componentes visuales.

## 7. Git: un commit exclusivo de esta entrega

Tras superar la verificación local:

```powershell
git add -- "apps/web/src/components/PrincipalOverview.tsx" "apps/web/src/components/PrincipalEquippedAttacks.tsx" "apps/web/src/components/PrincipalSessionControls.tsx" "apps/web/src/app/globals.css" "docs/implementation/PASO_41_3_CONTROLES_ATAQUES_E_INSPIRACION.md"
git diff --cached --name-only
git diff --cached --check
git commit -m "ux: actualizacion 41.3 - armas compactas controles globales e inspiracion"
git push -u origin HEAD
git status
```

Registrar fecha real de commit, identificador y resultados de las pruebas en la memoria final de TFG. Si aparece un fallo, documentarlo y corregirlo antes de confirmar la fase.
