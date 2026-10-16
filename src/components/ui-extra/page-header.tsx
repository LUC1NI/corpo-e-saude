/**
 * Cabeçalho de conteúdo de uma página: título em bold + subtítulo opcional
 * e uma área de ações à direita (botões, filtros).
 */
export function PageHeader({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string;
  subtitulo?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground lg:text-[1.75rem]">
          {titulo}
        </h1>
        {subtitulo ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        ) : null}
      </div>
      {acoes ? (
        <div className="flex items-center gap-2 max-sm:w-full">{acoes}</div>
      ) : null}
    </div>
  );
}
