import { Codec } from '../codec'

test('bigint calculate test', () => {
  const sum = Codec.encodeNumber((BigInt('0x00') + BigInt('0x01'))).toString('hex')
  expect(sum).toBe('01')

  const balance1 = BigInt('0xff')
  const balance2 = BigInt('0x00')

  expect(balance2 - balance1 < 0).toBe(true)
})