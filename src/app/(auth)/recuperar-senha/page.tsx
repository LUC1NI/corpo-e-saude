import type { Metadata } from "next";

import { AuthShell } from "../auth-shell";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return (
    <AuthShell>
      <RecuperarForm />
    </AuthShell>
  );
}
