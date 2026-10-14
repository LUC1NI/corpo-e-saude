/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injetado em build time pelo Serwist com os assets a serem pré-cacheados.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Notificações push (payload enviado por src/lib/push.ts)
// ---------------------------------------------------------------------------
interface PayloadPush {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

/** Só caminhos internos (nunca abre site de fora a partir de um push). */
function destinoSeguro(url: unknown): string {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//")
    ? url
    : "/aluno";
}

self.addEventListener("push", (event) => {
  let dados: PayloadPush = {};
  try {
    dados = event.data?.json() ?? {};
  } catch {
    dados = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(dados.title ?? "Corpo & Saúde", {
      body: dados.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: dados.tag,
      data: { url: destinoSeguro(dados.url) },
    }),
  );
});

// Toque na notificação: foca uma janela do app já aberta (e navega até a
// tela do aviso) ou abre uma nova.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = new URL(
    destinoSeguro(event.notification.data?.url),
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const janela = janelas.find((c) => c.url.startsWith(self.location.origin));
      if (janela) {
        await janela.focus();
        await janela.navigate(alvo);
        return;
      }
      await self.clients.openWindow(alvo);
    })(),
  );
});
