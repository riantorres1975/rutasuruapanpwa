import { Activity, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ buscar?: string; reporte?: string }> };

type RouteRow = {
  id: number;
  name: string;
  original_name: string;
  color: string;
  verified: boolean;
  operational_status: "active" | "under_review" | "inactive" | "historical";
  data_version: number;
  last_verified_at: string | null;
};

type ConfirmationRow = {
  route_name: string;
  confirmation_type: "seen_today" | "not_running" | "changed";
  status: "pending" | "accepted" | "dismissed";
};

const statusLabels = {
  active: "Activa",
  under_review: "En revisión",
  inactive: "Inactiva",
  historical: "Histórica",
};

export default async function AdminRoutesPage({ searchParams }: Props) {
  const [access, params] = await Promise.all([getAdminAccess(), searchParams]);
  if (access.status !== "admin") redirect("/admin");

  const supabase = createSupabaseAdminClient();
  if (!supabase) redirect("/admin/login");

  const [routeResult, confirmationResult] = await Promise.all([
    supabase.from("routes").select("id,name,original_name,color,verified,operational_status,data_version,last_verified_at").order("name").order("id"),
    supabase.from("route_confirmations").select("route_name,confirmation_type,status").order("observed_at", { ascending: false }).limit(5000),
  ]);

  const routes = (routeResult.data ?? []) as RouteRow[];
  const confirmations = (confirmationResult.data ?? []) as ConfirmationRow[];
  const query = params.buscar?.trim().toLocaleLowerCase("es-MX") ?? "";
  const visibleRoutes = query
    ? routes.filter((route) => `${route.name} ${route.original_name} ${route.id}`.toLocaleLowerCase("es-MX").includes(query))
    : routes;

  const signals = new Map<string, { acceptedSeen: number; pending: number }>();
  for (const confirmation of confirmations) {
    const current = signals.get(confirmation.route_name) ?? { acceptedSeen: 0, pending: 0 };
    if (confirmation.status === "pending") current.pending += 1;
    if (confirmation.status === "accepted" && confirmation.confirmation_type === "seen_today") current.acceptedSeen += 1;
    signals.set(confirmation.route_name, current);
  }

  return (
    <main className="min-h-dvh bg-[#0c110a] text-[#e8f2d8]">
      <AdminHeader email={access.email} active="routes" />
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:py-10">
        <div className="grid gap-6 border-b border-white/[0.08] pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-[#b8e840]">Inventario publicado</p>
            <h1 className="mt-2 font-serif text-4xl font-black sm:text-5xl">Rutas con memoria.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#89a873]">Cada publicación crea una versión restaurable. Las señales comunitarias ayudan a priorizar qué recorrido revisar.</p>
          </div>
          <form className="relative">
            {params.reporte && <input type="hidden" name="reporte" value={params.reporte} />}
            <label htmlFor="route-search" className="sr-only">Buscar ruta</label>
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[#60784f]" />
            <input id="route-search" name="buscar" defaultValue={params.buscar ?? ""} placeholder="Nombre, dirección o número..." className="h-11 w-full border border-white/10 bg-[#090d08] pl-11 pr-4 text-sm text-[#dceaca] outline-none placeholder:text-white/25 focus:border-[#6aab48]/70" />
          </form>
        </div>

        {routeResult.error ? (
          <p className="mt-8 border-l-2 border-[#f4c84a] px-4 py-3 text-sm text-[#f4df98]">No se pudo cargar el inventario: {routeResult.error.message}</p>
        ) : (
          <section className="mt-6" aria-label="Rutas administrables">
            <div className="mb-4 flex items-center justify-between text-xs text-[#60784f]"><span>{visibleRoutes.length} recorridos</span><span>Señales comunitarias recientes</span></div>
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {visibleRoutes.map((route) => {
                const routeSignals = signals.get(route.name) ?? { acceptedSeen: 0, pending: 0 };
                const href = `/admin/routes/${route.id}${params.reporte ? `?reporte=${encodeURIComponent(params.reporte)}` : ""}`;
                return (
                  <Link key={route.id} href={href} className="grid gap-4 px-2 py-5 transition hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_130px_180px_36px] sm:items-center sm:px-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="h-9 w-2 shrink-0" style={{ backgroundColor: route.color }} aria-hidden="true" />
                      <div className="min-w-0"><strong className="block truncate text-sm text-[#e8f2d8]">{route.name}</strong><span className="mt-1 block truncate text-xs text-[#78965f]">#{route.id} · {route.original_name}</span></div>
                    </div>
                    <div className="text-xs"><span className="text-[#78965f]">Versión </span><strong className="text-[#c9dbb9]">{route.data_version}</strong></div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className={`px-2 py-1 ${route.operational_status === "active" ? "bg-[#6aab48]/10 text-[#a8c888]" : "bg-[#f4c84a]/10 text-[#f4df98]"}`}>{statusLabels[route.operational_status]}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[#78965f]"><Activity className="h-3 w-3" /> {routeSignals.acceptedSeen} vistas aceptadas · {routeSignals.pending} por revisar</span>
                    </div>
                    <ArrowRight className="hidden h-4 w-4 text-[#60784f] sm:block" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            {visibleRoutes.length === 0 && <p className="py-16 text-center text-sm text-[#78965f]">No encontramos una ruta con ese nombre.</p>}
          </section>
        )}
      </div>
    </main>
  );
}
