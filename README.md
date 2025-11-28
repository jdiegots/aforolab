# AforoLab

Aplicación Next.js para visualizar aforos, ocupación y asistencia en estadios de LaLiga. La interfaz muestra comparativas por estadio y permite explorar datos agregados por equipo y territorio.

## Características
- Landing con gráfico beeswarm que resume asistencia y ocupación promedio por estadio.
- Buscador de estadios y equipos con tarjetas de detalle rápidas.
- Vistas temáticas con gráficos y mapas interactivos basados en datos CSV procesados a JSON.
- Modo oscuro integrado y animaciones con framer-motion.

## Datos
Los datos de entrada residen en `data/` (CSV de estadios, población y partidos). Los scripts generan ficheros JSON en `public/data/` que consume la app.

## Requisitos
- Node.js 18+
- npm

## Puesta en marcha
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Generar datos derivados y lanzar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   El comando ejecuta `watch:populations` para reconstruir `public/data/stadium_populations.json` al cambiar los CSV, y arranca Next.js en `http://localhost:3000`.

## Scripts principales
- `npm run gen:populations`: procesa `data/stadium.csv` y ficheros de población para crear `public/data/stadium_populations.json`.
- `npm run build:home`: compila métricas de asistencia y ocupación a `public/data/home_metrics.json` a partir de los CSV de estadios y partidos.
- `npm run build`: construye la aplicación para producción.
- `npm start`: inicia la versión de producción tras `npm run build`.

## Estructura del proyecto
- `src/app`: rutas y páginas de Next.js.
- `src/components`: componentes reutilizables (gráficos, tarjetas, controles).
- `src/lib`, `src/utils`, `src/store`: lógica de negocio, utilidades y estado global.
- `data/`: fuentes CSV de estadios, población y partidos.
- `public/data/`: salidas JSON que consume la interfaz.

## Linter
Ejecutar ESLint sobre el proyecto:
```bash
npm run lint
```
