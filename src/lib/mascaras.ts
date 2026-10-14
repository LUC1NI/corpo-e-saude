/** Formata telefone brasileiro conforme o usuário digita: (47) 99999-0000. */
export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${ddd}`;

  const separador = resto.length > 4 ? resto.length - 4 : resto.length;
  const parte1 = resto.slice(0, separador);
  const parte2 = resto.slice(separador);

  return parte2 ? `(${ddd}) ${parte1}-${parte2}` : `(${ddd}) ${parte1}`;
}

/** Máscara genérica: "#" = dígito. Ex.: mascara("12345678909", "###.###.###-##"). */
function mascara(valor: string, padrao: string): string {
  const d = valor.replace(/\D/g, "");
  let saida = "";
  let i = 0;
  for (const c of padrao) {
    if (i >= d.length) break;
    saida += c === "#" ? d[i++] : c;
  }
  return saida;
}

/** CPF conforme digita: 000.000.000-00. */
export function formatarCpfDigitando(valor: string): string {
  return mascara(valor, "###.###.###-##");
}

/** CEP conforme digita: 00000-000. */
export function formatarCep(valor: string): string {
  return mascara(valor, "#####-###");
}
