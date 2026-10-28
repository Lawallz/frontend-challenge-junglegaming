import Decimal from 'decimal.js'

/**
 * Valores ETH trafegam como STRINGS decimais e são calculados com decimal.js.
 * Nenhuma função aqui aceita ou devolve `number` para valores monetários
 * (só `quantity`, que é inteira por contrato).
 */

export const ETH_DECIMALS = 18
const MAX_INTEGER_DIGITS = 30

// Cópia isolada do Decimal: não depende de configuração global feita por terceiros.
const D = Decimal.clone({ precision: 80, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -100, toExpPos: 100 })

/** String decimal ETH válida (>= 0, até 18 casas, sem expoente, sem sinal). */
export type EthAmount = string & { readonly __brand: 'EthAmount' }

export type EthErrorCode = 'INVALID_FORMAT' | 'NEGATIVE_RESULT' | 'INVALID_QUANTITY'

export class EthError extends Error {
  readonly code: EthErrorCode

  constructor(code: EthErrorCode, message: string) {
    super(message)
    this.name = 'EthError'
    this.code = code
  }
}

// "0", "1", "1.19", "0.000000000000000001". Sem zeros à esquerda, sem "+", sem "1e3", sem ".5".
const ETH_PATTERN = new RegExp(`^(0|[1-9]\\d{0,${MAX_INTEGER_DIGITS - 1}})(\\.\\d{1,${ETH_DECIMALS}})?$`)

export const ZERO_ETH = '0' as EthAmount

export function isEthString(value: unknown): value is EthAmount {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

export function parseEth(value: string): Decimal {
  if (!isEthString(value)) {
    throw new EthError('INVALID_FORMAT', `Valor ETH inválido: ${String(value)}`)
  }
  return new D(value)
}

function fromDecimal(value: Decimal): EthAmount {
  if (value.isZero()) return ZERO_ETH
  if (value.isNegative()) throw new EthError('NEGATIVE_RESULT', 'O resultado ficaria negativo.')
  if (value.decimalPlaces() > ETH_DECIMALS) {
    throw new EthError('INVALID_FORMAT', `Precisão acima de ${ETH_DECIMALS} casas.`)
  }
  // toFixed() sem argumento: notação normal, sem expoente e sem zeros à direita.
  const out = value.toFixed()
  if (!isEthString(out)) throw new EthError('INVALID_FORMAT', `Resultado fora do formato: ${out}`)
  return out
}

/** Forma canônica: "1.50" → "1.5", "2.0" → "2". */
export function normalizeEth(value: string): EthAmount {
  return fromDecimal(parseEth(value))
}

export function addEth(a: string, b: string): EthAmount {
  return fromDecimal(parseEth(a).plus(parseEth(b)))
}

/** a - b. Lança NEGATIVE_RESULT se b > a (descontos nunca passam do subtotal). */
export function subEth(a: string, b: string): EthAmount {
  return fromDecimal(parseEth(a).minus(parseEth(b)))
}

function assertQuantity(quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new EthError('INVALID_QUANTITY', `Quantidade deve ser um inteiro >= 0: ${quantity}`)
  }
}

/** Preço unitário × quantidade inteira. Exato: nunca gera mais casas que o preço. */
export function mulEthByQuantity(unitPrice: string, quantity: number): EthAmount {
  assertQuantity(quantity)
  return fromDecimal(parseEth(unitPrice).times(quantity))
}

export function sumEth(values: readonly string[]): EthAmount {
  return fromDecimal(values.reduce((acc, v) => acc.plus(parseEth(v)), new D(0)))
}

export function compareEth(a: string, b: string): -1 | 0 | 1 {
  return parseEth(a).comparedTo(parseEth(b)) as -1 | 0 | 1
}

export function eqEth(a: string, b: string): boolean {
  return compareEth(a, b) === 0
}

export function isZeroEth(value: string): boolean {
  return parseEth(value).isZero()
}

export interface FormatEthOptions {
  minFractionDigits?: number
  maxFractionDigits?: number
  withSymbol?: boolean
}

/**
 * Apresentação: remove zeros à direita até `minFractionDigits`; acima de
 * `maxFractionDigits` arredonda meio para cima (só afeta a tela, nunca o contrato).
 * Ex.: "1.19" → "1.19 ETH", "26.846" → "26.846 ETH", "2" → "2.00 ETH".
 */
export function formatEth(value: string, options: FormatEthOptions = {}): string {
  const { minFractionDigits = 2, maxFractionDigits = 6, withSymbol = true } = options
  if (!Number.isInteger(minFractionDigits) || minFractionDigits < 0 || minFractionDigits > ETH_DECIMALS) {
    throw new RangeError(`minFractionDigits deve ser inteiro entre 0 e ${ETH_DECIMALS}.`)
  }
  if (!Number.isInteger(maxFractionDigits) || maxFractionDigits < 0 || maxFractionDigits > ETH_DECIMALS) {
    throw new RangeError(`maxFractionDigits deve ser inteiro entre 0 e ${ETH_DECIMALS}.`)
  }
  const effectiveMin = Math.min(minFractionDigits, maxFractionDigits)
  const fixed = parseEth(value).toFixed(maxFractionDigits)
  const [integer = '0', fraction = ''] = fixed.split('.')
  const trimmed = fraction.replace(/0+$/, '').padEnd(effectiveMin, '0')
  const text = trimmed ? `${integer}.${trimmed}` : integer
  return withSymbol ? `${text} ETH` : text
}
