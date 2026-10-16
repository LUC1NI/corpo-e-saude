"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { comRede } from "@/lib/acoes";
import { criarDespesa } from "@/lib/acoes-financeiro";
import { hojeISO } from "@/lib/financeiro";

const SEM_CATEGORIA = "__none__";

export function DespesaForm({
  categorias,
}: {
  categorias: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState(SEM_CATEGORIA);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  // Celular: formulário recolhido até tocar em "Lançar despesa" (ou vir do "+ Despesa" do painel).
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    // O hash só existe no navegador: ler depois de hidratar evita diferença com o HTML do servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.location.hash === "#despesa") setAberto(true);
  }, []);

  async function lancar() {
    // Sem categoria a despesa some dos relatórios por tipo: obrigamos escolher.
    if (categoriaId === SEM_CATEGORIA) {
      toast.error("Escolha a categoria da despesa.");
      return;
    }
    setSalvando(true);
    const res = await comRede(criarDespesa({
      descricao,
      categoria_id: categoriaId === SEM_CATEGORIA ? undefined : categoriaId,
      valor,
      data,
    }));
    setSalvando(false);
    if (res.ok) {
      toast.success("Despesa lançada.");
      setDescricao("");
      setValor("");
      setCategoriaId(SEM_CATEGORIA);
      setData(hojeISO());
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <>
    {!aberto ? (
      <Button type="button" variant="outline" className="w-full sm:hidden" onClick={() => setAberto(true)}>
        <Plus className="size-4" />
        Lançar despesa
      </Button>
    ) : null}
    <div className={`${aberto ? "grid" : "hidden"} grid-cols-2 items-end gap-3 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto]`}>
      <div className="col-span-2 sm:col-span-1">
      <CampoForm label="Descrição" htmlFor="desc">
        <Input
          id="desc"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Aluguel de junho"
        />
      </CampoForm>
      </div>
      <div className="col-span-2 sm:col-span-1">
      <CampoForm label="Categoria" htmlFor="cat" obrigatorio>
        <Select
          value={categoriaId}
          onValueChange={(v) => setCategoriaId(v ?? SEM_CATEGORIA)}
          items={{
            [SEM_CATEGORIA]: "Escolha…",
            ...Object.fromEntries(categorias.map((c) => [c.id, c.nome])),
          }}
        >
          <SelectTrigger id="cat" className="w-full sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CampoForm>
      </div>
      <CampoForm label="Valor (R$)" htmlFor="val">
        <Input
          id="val"
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="w-full sm:w-28"
        />
      </CampoForm>
      <CampoForm label="Data" htmlFor="dt">
        <Input
          id="dt"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full sm:w-40"
        />
      </CampoForm>
      <Button type="button" onClick={lancar} loading={salvando} className="col-span-2 sm:col-span-1">
        <Plus className="size-4" />
        {salvando ? "Lançando…" : "Lançar"}
      </Button>
    </div>
    </>
  );
}
