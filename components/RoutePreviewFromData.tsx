import rutasProduccion from "@/data/rutas_produccion_final.json";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";
import type { ComponentProps } from "react";

type RawRoute = {
  name: string;
  path: number[][];
};

type Props = Omit<ComponentProps<typeof RoutePreviewSVG>, "paths"> & {
  routeName: string;
};

export default function RoutePreviewFromData({ routeName, ...props }: Props) {
  const paths = (rutasProduccion as RawRoute[])
    .filter((route) => route.name === routeName)
    .map((route) => route.path as [number, number][]);

  return <RoutePreviewSVG paths={paths} {...props} />;
}
