/** Só os dígitos de um texto ("123.456.789-09" -> "12345678909"). */
export function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

/**
 * Valida um CPF pelos dígitos verificadores. Aceita com ou sem máscara.
 * Pura (sem imports) para rodar no `node --test`.
 */
export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(cpf.slice(0, 9), 10);
  const d2 = dv(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** "12345678909" -> "123.456.789-09". */
export function formatarCpf(cpf: string): string {
  const d = soDigitos(cpf);
  return d.length === 11
    ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    : cpf;
}
