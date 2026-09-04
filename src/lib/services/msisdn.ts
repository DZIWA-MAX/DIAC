/**
 * Numeros de telemovel de Mocambique.
 *
 * O prefixo diz a operadora, e a operadora diz qual carteira pode
 * receber: M-Pesa e da Vodacom, e-Mola e da Movitel. Enviar um pedido de
 * M-Pesa para um numero Movitel falha do lado do operador, com um erro
 * generico e depois de uma ida a rede — barrar aqui da ao cliente uma
 * mensagem util em vez de "pagamento falhou".
 *
 * Este modulo NAO e server-only de proposito: o formulario de checkout
 * usa a mesma validacao para avisar antes de enviar. A validacao do
 * servidor continua sendo a que vale.
 */

export type MobileOperator = "vodacom" | "movitel" | "tmcel";

/** Prefixos por operadora, apos o indicativo 258. */
const PREFIXOS: Record<MobileOperator, string[]> = {
  vodacom: ["84", "85"],
  movitel: ["86", "87"],
  tmcel: ["82", "83"],
};

/**
 * Normaliza para o formato 258XXXXXXXXX.
 *
 * Aceita o que as pessoas realmente digitam: com +, com espacos, com
 * o indicativo ou sem ele. Devolve null quando nao da para chegar a um
 * numero mocambicano valido.
 */
export function normalizeMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  // 9 digitos: numero local, falta o indicativo.
  if (digits.length === 9 && digits.startsWith("8")) {
    return `258${digits}`;
  }
  // 12 digitos comecando em 258: ja completo.
  if (digits.length === 12 && digits.startsWith("258") && digits[3] === "8") {
    return digits;
  }
  // 00258... — formato de discagem internacional antigo.
  if (digits.length === 14 && digits.startsWith("00258") && digits[5] === "8") {
    return digits.slice(2);
  }
  return null;
}

export function operatorOf(msisdn: string): MobileOperator | null {
  const normalized = normalizeMsisdn(msisdn);
  if (!normalized) return null;
  const prefix = normalized.slice(3, 5);
  for (const [operator, prefixes] of Object.entries(PREFIXOS)) {
    if (prefixes.includes(prefix)) return operator as MobileOperator;
  }
  return null;
}

/** Qual carteira atende este numero. */
export function walletFor(msisdn: string): "mpesa" | "emola" | null {
  switch (operatorOf(msisdn)) {
    case "vodacom":
      return "mpesa";
    case "movitel":
      return "emola";
    default:
      // Tmcel nao tem carteira propria integrada aqui; numero invalido
      // tambem cai aqui.
      return null;
  }
}

export class MsisdnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MsisdnError";
  }
}

/**
 * Valida o numero para o metodo escolhido e devolve-o normalizado.
 * Lanca com uma mensagem que o utilizador consegue agir.
 */
export function requireMsisdnFor(method: "mpesa" | "emola", input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new MsisdnError("Informe o numero de telemovel.");
  }

  const normalized = normalizeMsisdn(input);
  if (!normalized) {
    throw new MsisdnError(
      "Numero invalido. Use um numero mocambicano, por exemplo 84 123 4567."
    );
  }

  const wallet = walletFor(normalized);
  if (wallet === null) {
    throw new MsisdnError(
      "Este numero nao pertence a Vodacom nem a Movitel, e nao tem carteira movel suportada."
    );
  }
  if (wallet !== method) {
    const esperado = method === "mpesa" ? "Vodacom (84 ou 85)" : "Movitel (86 ou 87)";
    const real = wallet === "mpesa" ? "Vodacom" : "Movitel";
    throw new MsisdnError(
      `M-Pesa e da Vodacom e e-Mola da Movitel. Este numero e ${real}; para ${
        method === "mpesa" ? "M-Pesa" : "e-Mola"
      } use um numero ${esperado}.`
    );
  }

  return normalized;
}
