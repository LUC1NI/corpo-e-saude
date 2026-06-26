"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  async function lancar() {
    setSalvando(true);
    const res = await criarDespesa({
      descricao,
      categoria_id: categoriaId === SEM_CATEGORIA ? undefined : categoriaId,
      valor: Number(valor),
      data,
    });
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
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <CampoForm label="Descrição" htmlFor="desc">
        <Input
          id="desc"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Aluguel de junho"
        />
      </CampoForm>
      <CampoForm label="Categoria">
        <Select
          value={categoriaId}
          onValueChange={(v) => setCategoriaId(v ?? SEM_CATEGORIA)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_CATEGORIA}>Sem categoria</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CampoForm>
      <CampoForm label="Valor (R$)" htmlFor="val">
        <Input
          id="val"
          type="number"
          step="0.01"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          className="w-28"
        />
      </CampoForm>
      <CampoForm label="Data" htmlFor="dt">
        <Input
          id="dt"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-40"
        />
      </CampoForm>
      <Button type="button" onClick={lancar} disabled={salvando}>
        <Plus className="size-4" />
        {salvando ? "…" : "Lançar"}
      </Button>
    </div>
  );
}
