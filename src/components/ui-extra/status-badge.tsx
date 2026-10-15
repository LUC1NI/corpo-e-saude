import { cn } from "@/lib/utils";

type Tom = "sucesso" | "alerta" | "perigo" | "neutro" | "info";

const ESTILOS: Record<Tom, string> = {
  sucesso: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  alerta: "bg-amber-50 text-amber-700 ring-amber-600/20",
  perigo: "bg-red-50 text-red-700 ring-red-600/20",
  neutro: "bg-slate-100 text-slate-600 ring-slate-500/20",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

/** Badge de status genérico (pílula com anel sutil). */
export function StatusBadge({
  children,
  tom = "neutro",
  className,
}: {
  children: React.ReactNode;
  tom?: Tom;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        ESTILOS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Mapeia o status de pagamento para um badge com o tom certo. */
export function StatusPagamento({
  status,
}: {
  status: "pago" | "pendente" | "vencido";
}) {
  const mapa = {
    pago: { tom: "sucesso" as const, rotulo: "Pago" },
    pendente: { tom: "info" as const, rotulo: "A vencer" },
    vencido: { tom: "perigo" as const, rotulo: "Atrasado" },
  };
  const { tom, rotulo } = mapa[status];
  return <StatusBadge tom={tom}>{rotulo}</StatusBadge>;
}
