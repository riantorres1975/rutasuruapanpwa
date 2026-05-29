import rutasProduccion from "@/data/rutas_produccion_final.json";

type RawRoute = {
  name: string;
  original_name: string;
  color: string;
  path: number[][];
};

function getRoutePaths(routeName: string): [number, number][][] {
  const routes = (rutasProduccion as unknown as RawRoute[]).filter((r) => r.name === routeName);
  return routes.map((r) => r.path as [number, number][]);
}

function normalizePaths(
  paths: [number, number][][],
  w: number,
  h: number,
  padding = 8
): [number, number][][] {
  const allPoints = paths.flat();
  if (allPoints.length === 0) return [];

  const lngs = allPoints.map(([lng]) => lng);
  const lats = allPoints.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const rangeX = maxLng - minLng || 0.001;
  const rangeY = maxLat - minLat || 0.001;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;
  const scale = Math.min(innerW / rangeX, innerH / rangeY);
  const offsetX = padding + (innerW - rangeX * scale) / 2;
  const offsetY = padding + (innerH - rangeY * scale) / 2;

  return paths.map((path) =>
    path.map(([lng, lat]) => [
      offsetX + (lng - minLng) * scale,
      offsetY + (maxLat - lat) * scale,
    ])
  );
}

type Props = {
  routeName: string;
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
};

export default function RoutePreviewSVG({
  routeName,
  color,
  width = 120,
  height = 72,
  strokeWidth = 2.5,
  className,
}: Props) {
  const paths = getRoutePaths(routeName);
  if (paths.length === 0) return null;

  const normalized = normalizePaths(paths, width, height);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "block" }}
    >
      {normalized.map((pts, i) => (
        <polyline
          key={i}
          points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={i === 0 ? 1 : 0.45}
        />
      ))}
    </svg>
  );
}
