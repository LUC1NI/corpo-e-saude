import { Input } from "@/components/ui/input";

/**
 * Input com sugestões (datalist): o usuário escolhe uma opção comum ou
 * digita a própria. Bom para campos semi-livres (equipamento, repetições,
 * descanso, foco da divisão…). `listId` deve ser único na página.
 */
export function InputSugestoes({
  opcoes,
  listId,
  ...props
}: {
  opcoes: readonly string[];
  listId: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <>
      <Input list={listId} {...props} />
      <datalist id={listId}>
        {opcoes.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
