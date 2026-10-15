import { randomBytes } from "node:crypto";

// Só minúsculas e números, sem ambíguos (0/o, 1/l/i): fácil de digitar no
// celular (sem Shift nem símbolos). 9 caracteres de 31 ≈ 44 bits — suficiente
// para uma senha que expira no primeiro login e tem rate limit.
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Gera uma senha provisória aleatória (uso no servidor), em 3 grupos.
 * Ex.: "kp9-mq2-xt7". Sempre tem letra e número. O aluno troca no 1º acesso.
 */
export function gerarSenhaProvisoria(): string {
  for (;;) {
    let s = "";
    // Descarta bytes >= 248 (31×8) para não enviesar o sorteio.
    while (s.length < 9) {
      for (const b of randomBytes(16)) {
        if (b < 248 && s.length < 9) s += ALFABETO[b % ALFABETO.length];
      }
    }
    if (/[a-z]/.test(s) && /[0-9]/.test(s)) {
      return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
    }
  }
}
