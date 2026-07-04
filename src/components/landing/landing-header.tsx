"use client";

import { LogIn } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import Link from "@/components/ui-extra/link";

import { NAV_LINKS } from "@/components/landing/dados";
import { cn } from "@/lib/utils";

/**
 * Header fixo da landing: transparente sobre o hero navy e com fundo
 * sólido + blur assim que a página rola.
 */
export function LandingHeader() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        rolou
          ? "border-b border-white/10 bg-[#022a5e]/90 shadow-lg shadow-black/10 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 lg:h-[72px] lg:px-8">
        <a href="#inicio" className="flex items-center gap-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <Image
              src="/icons/icon-192.png"
              alt="Logo Corpo & Saúde"
              width={32}
              height={32}
            />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-white">
              Corpo &amp; Saúde
            </span>
            <span className="block text-[10px] font-medium tracking-wider text-white/60 uppercase">
              Personal Trainer Studio
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {l.rotulo}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/20 px-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          <LogIn className="size-3.5" />
          Entrar
        </Link>
      </div>
    </header>
  );
}
