import { redirect } from "next/navigation";

// "Inadimplentes" virou a seção "Atrasadas" de Em aberto (mesma lista, um lugar só).
export default function InadimplentesPage() {
  redirect("/admin/financeiro/em-aberto");
}
