/** Dados institucionais da landing (fonte única). */

export const WHATSAPP_PRINCIPAL = "5547991667475";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_PRINCIPAL}?text=${encodeURIComponent(
  "Olá! Vim pelo site do Corpo & Saúde e quero saber mais sobre os treinos.",
)}`;

export const TELEFONES = [
  { rotulo: "(47) 99166-7475", numero: "5547991667475" },
  { rotulo: "(47) 98832-4000", numero: "5547988324000" },
];

export const INSTAGRAM = {
  usuario: "@corpoesaude_personaltrainer",
  url: "https://www.instagram.com/corpoesaude_personaltrainer/",
};

export const ENDERECO = {
  linha1: "Rua Alípio Siqueira, 221",
  linha2: "Bairro do Passo · Mafra-SC",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Rua Alípio Siqueira, 221, Bairro do Passo, Mafra SC"),
};

export const NAV_LINKS = [
  { rotulo: "Sobre", href: "#sobre" },
  { rotulo: "Como funciona", href: "#como-funciona" },
  { rotulo: "Diferenciais", href: "#diferenciais" },
  { rotulo: "Depoimentos", href: "#depoimentos" },
  { rotulo: "Dúvidas", href: "#duvidas" },
  { rotulo: "Contato", href: "#contato" },
];
