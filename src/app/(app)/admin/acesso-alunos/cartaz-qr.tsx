"use client";

import { Download, FileImage, Printer } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const LOGO = "/icons/icon-192.png";
type Tamanho = "A4" | "A5";

function baixar(href: string, nome: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = nome;
  a.click();
}

async function logoDataUrl(): Promise<string> {
  const blob = await (await fetch(LOGO)).blob();
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = erro;
    r.readAsDataURL(blob);
  });
}

/** SVG do QR com o logo embutido no centro (arquivo autossuficiente). */
async function svgComLogo(svg: string): Promise<string> {
  const lado = Number(/viewBox="0 0 (\d+)/.exec(svg)?.[1] ?? 0);
  if (!lado) return svg;
  const t = lado * 0.22;
  const x = (lado - t) / 2;
  const logo = await logoDataUrl();
  const centro =
    `<rect x="${x - lado * 0.015}" y="${x - lado * 0.015}" width="${t + lado * 0.03}" height="${t + lado * 0.03}" rx="${lado * 0.03}" fill="white"/>` +
    `<image href="${logo}" x="${x}" y="${x}" width="${t}" height="${t}"/>`;
  return svg.replace("</svg>", `${centro}</svg>`);
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new window.Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = src;
  });
}

export function CartazQr({ svg, url }: { svg: string; url: string }) {
  const [tamanho, setTamanho] = useState<Tamanho>("A4");
  const qrSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  function imprimir(t: Tamanho) {
    flushSync(() => setTamanho(t)); // aplica o @page antes de abrir a impressão
    window.print();
  }

  async function baixarSvg() {
    try {
      const final = await svgComLogo(svg);
      const blob = new Blob([final], { type: "image/svg+xml" });
      const href = URL.createObjectURL(blob);
      baixar(href, "qrcode-area-do-aluno.svg");
      URL.revokeObjectURL(href);
    } catch {
      toast.error("Não foi possível gerar o SVG.");
    }
  }

  async function baixarPng() {
    try {
      const final = await svgComLogo(svg);
      const img = await carregarImagem(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(final)}`,
      );
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 1200, 1200);
      baixar(canvas.toDataURL("image/png"), "qrcode-area-do-aluno.png");
    } catch {
      toast.error("Não foi possível gerar o PNG.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Tamanho da folha e "só o cartaz" na impressão. */}
      <style>{`
        @page { size: ${tamanho} portrait; margin: 12mm; }
        @media print {
          body * { visibility: hidden !important; }
          #cartaz-qr, #cartaz-qr * { visibility: visible !important; }
          #cartaz-qr {
            position: absolute; inset: 0; margin: 0 !important;
            border: 0 !important; box-shadow: none !important;
          }
          #cartaz-qr .qr { width: ${tamanho === "A4" ? "125mm" : "88mm"} !important; }
        }
      `}</style>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => imprimir("A4")}>
          <Printer className="size-4" />
          Imprimir A4
        </Button>
        <Button variant="outline" onClick={() => imprimir("A5")}>
          <Printer className="size-4" />
          Imprimir A5
        </Button>
        <Button variant="outline" onClick={baixarPng}>
          <FileImage className="size-4" />
          Baixar PNG
        </Button>
        <Button variant="outline" onClick={baixarSvg}>
          <Download className="size-4" />
          Baixar SVG
        </Button>
      </div>

      <Card
        id="cartaz-qr"
        className="mx-auto flex max-w-md flex-col items-center gap-5 p-8 text-center"
      >
        <div className="flex items-center gap-2.5">
          <Image src={LOGO} alt="" width={44} height={44} className="rounded-xl" />
          <div className="text-left leading-tight">
            <p className="font-bold text-[#033373]">Corpo &amp; Saúde</p>
            <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Personal Trainer Studio
            </p>
          </div>
        </div>

        <h2 className="font-heading text-2xl font-extrabold text-[#033373]">
          Acesse sua área do aluno
        </h2>

        <div className="qr relative w-64 sm:w-72">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG gerado no servidor (data URL) */}
          <img src={qrSrc} alt={`QR code para ${url}`} className="w-full" />
          <span className="absolute inset-0 m-auto flex size-[24%] items-center justify-center rounded-lg bg-white p-1">
            <Image src={LOGO} alt="" width={64} height={64} className="size-full" />
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Aponte a câmera do celular para o código ou acesse
          <br />
          <strong className="break-all text-foreground">{url}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Horários, treinos, evolução e mensalidade na palma da mão.
        </p>
      </Card>
    </div>
  );
}
