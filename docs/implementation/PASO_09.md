# Paso 09: estilos, maestrías y equipo inicial (PHB 2024)

**Alcance:** Guerrero de niveles 1–3; reglas consultadas en el Manual del Jugador 2024, pp. 91 y 209–215. Se añade `martial.ts`, se amplía la entrada opcional `martial` de `GuidedFighterInput` y se actualiza la interfaz.

## Implementado

- Elección de 10 estilos de combate de Guerrero.
- El estilo Defensa suma +1 CA **solo con armadura equipada**. Otros estilos se registran, pendientes del motor de ataques, reacciones y sentidos.
- Tres maestrías de tipos de arma distintos, elegidos entre el catálogo de armas del manual, con la propiedad asociada. La ejecución de las maestrías durante el ataque está pendiente.
- Paquetes A, B y C de equipo inicial de clase; se registran objetos y dinero. El conjunto A incluye cota de malla, espadón, mayal, ocho jabalinas, equipo de exploración de mazmorras y 4 po. El B incluye cuero tachonado, cimitarra, espada corta, arco largo, 20 flechas, carcaj, equipo de exploración de mazmorras y 11 po. C concede 155 po, sin objetos.
- El paquete determina la armadura equipada inicial; esta versión no permite inventario editable ni compra de equipo. El escudo no figura en ninguno de los lotes de clase.
- Se mantienen compatibles las llamadas anteriores a `calculateGuidedFighter` que no incluyen `martial`, pero señalan la elección como pendiente.

## No implementado todavía

- Resolución de ataques y sus bonificadores (incluido Tiro con arco y Duelo), disparo de propiedades de maestría o sus efectos tácticos.
- Elecciones completas de Iniciado en la Magia y conjuros de linaje, registro de recursos mágicos, otras dotes de origen (como una elección humana más amplia).
- Equipos y monedas de trasfondo, herramientas variables y cambios de equipamiento, compras, escudos adquiridos e inventario.
- Persistencia en PostgreSQL.

## Verificación

1. Copiar `apps/`, `packages/` y `docs/` en el proyecto, combinando carpetas y revisando las sustituciones.
2. Ejecutar `pnpm test`, `pnpm build` y `pnpm dev` desde la raíz.
3. Abrir `http://localhost:3000`: comprobar que Defensa y los lotes A/B/C alteran la CA como corresponde, que se impiden maestrías duplicadas y que se muestra el equipo.
4. Confirmar que el resto de pruebas del motor se mantienen verdes.
