import { randomBytes } from "node:crypto";

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar a digitação.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Gera uma senha provisória forte e aleatória (uso no servidor).
 * Ex.: "CS-Kp9mQ2xt#7". O aluno troca no primeiro acesso.
 */
export function gerarSenhaProvisoria(): string {
  const bytes = randomBytes(8);
  let nucleo = "";
  for (const b of bytes) nucleo += ALFABETO[b % ALFABETO.length];
  const digito = randomBytes(1)[0]! % 10;
  return `CS-${nucleo}#${digito}`;
}
