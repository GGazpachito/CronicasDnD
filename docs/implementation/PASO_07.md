# Paso 07: primera interfaz Next.js conectada al motor

## Alcance

Página de laboratorio para **Guerrero 1–3** con subclase **Campeón** en nivel 3. Usa la función `calculateFighterSheet` de `packages/rules-engine/src/sheet.ts` directamente (sin duplicar cálculos en la interfaz).

Permite cambiar nombre, nivel, características numéricas, armadura y escudo. Muestra PG máximos, CA, iniciativa, modificadores, habilidades de ejemplo, recursos y rasgos. Los cambios se recalculan en memoria. Si se introducen puntuaciones inválidas, presenta el error sin romper la página.

## Instalación

Copiar el directorio `apps/web/src/app/` del ZIP sobre el mismo directorio del repositorio, combinando carpetas y reemplazando **solo** `page.tsx` y `globals.css`. Copiar este documento en `docs/implementation/`.

No se añaden dependencias ni se modifican archivos del motor.

Desde la raíz del proyecto ejecutar:

```powershell
pnpm test
pnpm build
pnpm dev
```

Abrir `http://localhost:3000`.

## Pruebas manuales

1. Por defecto nivel 1, Fuerza 16, Destreza 14, Constitución 14, cota de malla y escudo: PG máximos 12, CA 18, iniciativa +2, Atletismo +5.
2. Nivel 2: PG máximos 20; aparecen Acción súbita y Mente táctica.
3. Nivel 3: PG máximos 28; se muestran Campeón, ventaja en iniciativa y en Atletismo.
4. Retirar el escudo: CA 16.
5. Equipar cuero tachonado con Destreza 14 y sin escudo: CA 14.
6. Constitución 16 a nivel 3 con progresión fija: PG máximos 31.
7. Constitución 0: se muestra aviso de validación, no un cálculo falso.
8. Cota de malla y Fuerza inferior a 13: se muestra advertencia por requisito de Fuerza.

## Limitaciones explícitas

- No hay creación guiada de personaje ni validación de compra por puntos, trasfondos o selección de competencias. Las competencias de demostración son Atletismo, Percepción, salvaciones de Fuerza y Constitución.
- No hay cuentas, almacenamiento ni edición de PG actuales y usos gastados. Se trata de una hoja **nueva**, por eso el cálculo muestra los recursos inicialmente completos.
- Al cambiar el nivel se recalcula un personaje de ejemplo desde cero: no representa una subida de nivel persistida.
- No se han elegido estilo de combate ni maestrías de armas. Sus rasgos figuran como elecciones pendientes.
- Esta pantalla no está adaptada todavía a otras clases ni a multiclase.

## Arquitectura

El import relativo apunta al código fuente del motor dentro del monorepositorio. Next.js moderno compila TypeScript local usado por la página. Si el entorno rechaza imports fuera de `apps/web`, registrar la exportación del paquete `@dnd/rules-engine` y usar `transpilePackages` con dependencia `workspace:*` como paso posterior de empaquetado.
