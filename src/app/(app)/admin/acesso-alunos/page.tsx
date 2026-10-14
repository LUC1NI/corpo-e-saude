import type { Metadata } from "next";
import { renderSVG } from "uqr";

import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { urlAbsoluta } from "@/lib/site";

import { CartazQr } from "./cartaz-qr";

export const metadata: Metadata = { title: "Acesso dos alunos" };

/**
 * QR code da recepção: aponta para /entrar (que leva ao login). Gerado no
 * servidor em SVG (lib `uqr`, JS puro, roda no Workers). Correção de erro
 * alta ("H") para o logo no centro não atrapalhar a leitura.
 */
export default async function AcessoAlunosPage() {
  await requireUsuario(["admin"]);
  const url = urlAbsoluta("/entrar");
  const svg = renderSVG(url, { ecc: "H", border: 2 });

  return (
    <>
      <PageHeader
        titulo="Acesso dos alunos"
        subtitulo="Imprima e deixe na recepção: o aluno aponta a câmera e cai direto no login."
      />
      <CartazQr svg={svg} url={url} />
    </>
  );
}
