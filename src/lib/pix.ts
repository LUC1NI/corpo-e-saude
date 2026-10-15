/**
 * Pix "copia e cola" estático (BR Code, padrão EMV do Banco Central) com
 * valor. Puro e sem dependências — roda no navegador.
 */

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF), exigido no campo 63. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const ch of new TextEncoder().encode(texto)) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acento e limita (nome/cidade do recebedor no padrão aceitam ASCII). */
function ascii(t: string, max: number): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

export function pixCopiaECola({
  chave,
  nome,
  cidade,
  valor,
  txid = "***",
}: {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid?: string;
}): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", ascii(nome, 25)) +
    campo("60", ascii(cidade, 15)) +
    campo("62", campo("05", txid.replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***")) +
    "6304";
  return semCrc + crc16(semCrc);
}
