export type Coordinates = [number, number];

export type RouteDirection = "ida" | "vuelta";

export type RouteData = {
  id: number;
  nombre: string;
  color: string;
  coordenadas: Coordinates[];
};

export type GroupedRouteData = {
  ruta: string;
  color: string;
  ida?: Coordinates[];
  vuelta?: Coordinates[];
};

export type ResolvedRouteData = RouteData & {
  ruta: string;
  direccion: RouteDirection;
  tieneIda: boolean;
  tieneVuelta: boolean;
};
