import { Label } from "@/components/ui/label";

/** Wrapper de campo: rótulo, conteúdo, dica e mensagem de erro. */
export function CampoForm({
  label,
  htmlFor,
  erro,
  dica,
  children,
  obrigatorio,
}: {
  label: string;
  htmlFor?: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
  obrigatorio?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {obrigatorio ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {erro ? (
        <p className="text-xs text-destructive">{erro}</p>
      ) : dica ? (
        <p className="text-xs text-muted-foreground">{dica}</p>
      ) : null}
    </div>
  );
}
