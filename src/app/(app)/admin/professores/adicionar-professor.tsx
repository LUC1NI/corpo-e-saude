"use client";

import { Dumbbell, Mail, Phone, Plus, User, UserPlus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CampoForm } from "@/components/ui-extra/campo-form";

import { criarProfessor } from "./actions";

/** Input com ícone à esquerda — dá contraste e identifica o campo de relance. */
function InputIcone({
  icone,
  ...props
}: ComponentProps<typeof Input> & { icone: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icone}
      </span>
      <Input
        {...props}
        className="h-11 bg-background pl-9 shadow-sm ring-1 ring-border focus-visible:ring-2"
      />
    </div>
  );
}

export function AdicionarProfessor() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [credencial, setCredencial] = useState<{
    email: string;
    senha: string;
  } | null>(null);

  function reset() {
    setNome("");
    setEmail("");
    setTelefone("");
    setEspecialidade("");
    setCredencial(null);
  }

  async function salvar() {
    if (!nome || !email) {
      toast.error("Informe nome e e-mail.");
      return;
    }
    setCarregando(true);
    const res = await criarProfessor({ nome, email, telefone, especialidade });
    setCarregando(false);
    if (res.ok && res.dados) {
      setCredencial({ email: res.dados.email, senha: res.dados.senha });
      toast.success("Professor criado.");
      router.refresh();
    } else if (!res.ok) {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        <Plus className="size-4" />
        Novo professor
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {credencial ? (
          <>
            <DialogHeader>
              <DialogTitle>Professor criado</DialogTitle>
              <DialogDescription>
                Repasse o acesso ao professor: ele define a própria senha no
                primeiro login.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-secondary/60 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">E-mail:</span>{" "}
                <strong>{credencial.email}</strong>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Senha provisória:</span>{" "}
                <strong className="font-mono">{credencial.senha}</strong>
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `E-mail: ${credencial.email}\nSenha provisória: ${credencial.senha}`,
                  );
                  toast.success("Copiado.");
                }}
              >
                Copiar dados
              </Button>
              <DialogClose render={<Button type="button" />}>Concluir</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Novo professor
              </DialogTitle>
              <DialogDescription>
                Cria o acesso do professor com senha provisória.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              {/* Bloco "Acesso": campos obrigatórios do login, destacados. */}
              <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Acesso do professor
                </p>
                <CampoForm label="Nome completo" htmlFor="pnome" obrigatorio>
                  <InputIcone
                    id="pnome"
                    icone={<User className="size-4" />}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do professor"
                  />
                </CampoForm>
                <CampoForm
                  label="E-mail"
                  htmlFor="pemail"
                  obrigatorio
                  dica="Será o login do professor."
                >
                  <InputIcone
                    id="pemail"
                    type="email"
                    icone={<Mail className="size-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="professor@exemplo.com"
                  />
                </CampoForm>
              </div>

              {/* Bloco "Detalhes": campos opcionais, visualmente separados. */}
              <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalhes <span className="font-normal">(opcional)</span>
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoForm label="Telefone" htmlFor="ptel">
                    <InputIcone
                      id="ptel"
                      icone={<Phone className="size-4" />}
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(47) 99999-0000"
                    />
                  </CampoForm>
                  <CampoForm label="Especialidade" htmlFor="pesp">
                    <InputIcone
                      id="pesp"
                      icone={<Dumbbell className="size-4" />}
                      value={especialidade}
                      onChange={(e) => setEspecialidade(e.target.value)}
                      placeholder="ex.: Musculação"
                    />
                  </CampoForm>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline" />}
                disabled={carregando}
              >
                Cancelar
              </DialogClose>
              <Button type="button" onClick={salvar} loading={carregando}>
                {carregando ? "Criando…" : "Criar professor"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
