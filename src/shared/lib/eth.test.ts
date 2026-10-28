import { describe, expect, it } from 'vitest'
import {
  addEth,
  compareEth,
  EthError,
  eqEth,
  formatEth,
  isEthString,
  isZeroEth,
  mulEthByQuantity,
  normalizeEth,
  parseEth,
  subEth,
  sumEth,
  ZERO_ETH,
} from './eth'

describe('isEthString / parseEth', () => {
  it.each(['0', '1', '1.19', '26.846', '0.000000000000000001', '123456789012345678901234567890.5'])(
    'aceita %s',
    (value) => {
      expect(isEthString(value)).toBe(true)
    },
  )

  it.each(['', ' 1', '1 ', '-1', '+1', '.5', '1.', '01', '1e3', '1,19', '0x10', 'NaN', 'Infinity', '1.0000000000000000001', '1234567890123456789012345678901'])(
    'rejeita %j',
    (value) => {
      expect(isEthString(value)).toBe(false)
      expect(() => parseEth(value)).toThrowError(EthError)
    },
  )

  it('rejeita number em runtime, mesmo ignorando o tipo', () => {
    expect(isEthString(1.19)).toBe(false)
    // @ts-expect-error number não é aceito para valores ETH
    expect(() => parseEth(1.19)).toThrowError(EthError)
    // @ts-expect-error number não é aceito para valores ETH
    expect(() => addEth(1, 2)).toThrowError(EthError)
  })
})

describe('normalizeEth', () => {
  it('remove zeros à direita e o ponto vazio', () => {
    expect(normalizeEth('1.50')).toBe('1.5')
    expect(normalizeEth('2.000')).toBe('2')
    expect(normalizeEth('0.0')).toBe('0')
    expect(normalizeEth('0.000')).toBe(ZERO_ETH)
  })
})

describe('aritmética decimal exata (sem erro de ponto flutuante)', () => {
  it('0.1 + 0.2 = 0.3 (em number daria 0.30000000000000004)', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(addEth('0.1', '0.2')).toBe('0.3')
  })

  it('1.1 × 3 = 3.3 (em number daria 3.3000000000000003)', () => {
    expect(1.1 * 3).not.toBe(3.3)
    expect(mulEthByQuantity('1.1', 3)).toBe('3.3')
  })

  it('soma 1 wei + 1 wei sem perder precisão', () => {
    expect(addEth('0.000000000000000001', '0.000000000000000001')).toBe('0.000000000000000002')
  })

  it('mantém precisão acima de 2^53', () => {
    expect(addEth('9007199254740993.000000000000000001', '1')).toBe('9007199254740994.000000000000000001')
  })

  it('subtrai exatamente', () => {
    expect(subEth('1', '0.000000000000000001')).toBe('0.999999999999999999')
    expect(subEth('1.5', '1.5')).toBe('0')
  })

  it('subtração que ficaria negativa lança NEGATIVE_RESULT', () => {
    expect(() => subEth('0.1', '0.2')).toThrowError(expect.objectContaining({ code: 'NEGATIVE_RESULT' }))
  })

  it('sumEth de lista vazia é 0 e de lista longa é exata', () => {
    expect(sumEth([])).toBe('0')
    expect(sumEth(Array.from({ length: 10 }, () => '0.1'))).toBe('1')
  })
})

describe('mulEthByQuantity', () => {
  it('multiplica por quantidade inteira', () => {
    expect(mulEthByQuantity('1.19', 2)).toBe('2.38')
    expect(mulEthByQuantity('1.39', 6)).toBe('8.34')
    expect(mulEthByQuantity('1.79', 9)).toBe('16.11')
    expect(mulEthByQuantity('1.19', 0)).toBe('0')
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])('rejeita quantidade %s', (quantity) => {
    expect(() => mulEthByQuantity('1', quantity)).toThrowError(expect.objectContaining({ code: 'INVALID_QUANTITY' }))
  })
})

describe('carrinho do Figma (desktop): 26.83 + 0.016 = 26.846', () => {
  it('subtotal, desconto zero, taxa de rede e total', () => {
    const subtotal = sumEth([
      mulEthByQuantity('1.19', 2),
      mulEthByQuantity('1.39', 6),
      mulEthByQuantity('1.79', 9),
    ])
    expect(subtotal).toBe('26.83')
    const total = addEth(subEth(subtotal, '0'), '0.016')
    expect(total).toBe('26.846')
  })
})

describe('compareEth / eqEth / isZeroEth', () => {
  it('compara numericamente, não lexicograficamente', () => {
    expect(compareEth('9', '10')).toBe(-1)
    expect(compareEth('10', '9')).toBe(1)
    expect(compareEth('1.50', '1.5')).toBe(0)
    expect(eqEth('2.0', '2')).toBe(true)
    expect(eqEth('0.1', '0.100000000000000000')).toBe(true)
    expect(isZeroEth('0.000')).toBe(true)
    expect(isZeroEth('0.000000000000000001')).toBe(false)
  })
})

describe('formatEth (somente apresentação)', () => {
  it('segue os formatos do layout', () => {
    expect(formatEth('1.19')).toBe('1.19 ETH')
    expect(formatEth('26.83')).toBe('26.83 ETH')
    expect(formatEth('26.846')).toBe('26.846 ETH')
    expect(formatEth('0.016')).toBe('0.016 ETH')
    expect(formatEth('2')).toBe('2.00 ETH')
    expect(formatEth('0')).toBe('0.00 ETH')
  })

  it('respeita opções e arredonda meio para cima só na tela', () => {
    expect(formatEth('1.2345678', { maxFractionDigits: 3 })).toBe('1.235 ETH')
    expect(formatEth('1.5', { withSymbol: false })).toBe('1.50')
    expect(formatEth('3', { minFractionDigits: 0 })).toBe('3 ETH')
  })

  it('não usa notação científica para valores muito pequenos', () => {
    expect(formatEth('0.000000000000000001', { maxFractionDigits: 18 })).toBe('0.000000000000000001 ETH')
  })

  it('limita o mínimo ao máximo de casas solicitado', () => {
    expect(formatEth('1.2345', { minFractionDigits: 4, maxFractionDigits: 2 })).toBe('1.23 ETH')
  })

  it('valida limites fracionários inválidos', () => {
    expect(() => formatEth('1', { maxFractionDigits: -1 })).toThrow(RangeError)
    expect(() => formatEth('1', { minFractionDigits: 1.5 })).toThrow(RangeError)
  })
})
