import { Codec } from '.'

const from = '01'
const to = '02'
const value = '01'
const nonce = 2
const input = '00'
const signature = '01'

test('encode and decode test', () => {
  const encoded = Codec.encode([from, to, value, nonce, input, signature])
  expect(encoded.toString('hex')).toBe('020100010201000202010001010100020201000002010001')
  const decoded = Codec.decode(encoded)
  expect(decoded[0]).toBe(from)
  expect(decoded[1]).toBe(to)
  expect(decoded[2]).toBe(value)
  expect(decoded[3]).toBe(nonce)
  expect(decoded[4]).toBe(input)
  expect(decoded[5]).toBe(signature)
})

test('encode string test', () => {
  const str = '7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc'
  const encoded = Codec.encode([str])
  const decoded = Codec.decode(encoded)
  expect(decoded[0]).toBe('7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc')
})

test('encode number test', () => {
  const num1 = 1000000000
  const encoded1 = Codec.encode([num1])
  expect(encoded1.toString('hex')).toBe('0104003b9aca00')
  const decoded1 = Codec.decode(encoded1)
  expect(decoded1[0]).toBe(1000000000)

  const num2 = 1
  const encoded2 = Codec.encode([num2])
  expect(encoded2.toString('hex')).toBe('01010001')
  const decoded2 = Codec.decode(encoded2)
  expect(decoded2[0]).toBe(1)
})

test('encode bigint test', () => {
  const bigint = BigInt('0x7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2d')
  const encoded = Codec.encode([bigint])
  expect(encoded.toString('hex')).toBe('01200007e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2d')
  const decoded = Codec.decode(encoded)
  expect(decoded[0]!.toString(16)).toBe('7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2d')
})

test('array encode test', () => {
  const array = ['7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc', 'ff', 'ffff', 100]
  const encoded = Codec.encode([array])
  expect(encoded.toString('hex')).toBe('03300000000220007e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc020100ff020200ffff01010064')
})

test('map encode test', () => {
  const map = new Map<string, string>()
  map.set('00', '01')
  map.set('01', '7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc')
  map.set('02', 'ffff')
  const encoded = Codec.encode([map])
  expect(encoded.toString('hex')).toBe('04380000000201000002010001020100010220007e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc02010002020200ffff')
})

test('array decode test', () => {
  const array = ['7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc', 'ff', 'ffff', 100]
  const encoded = Codec.encode([array])
  const decoded = Codec.decode(encoded)
  for (let i = 0; i < array.length; i++) {
    expect(decoded[0]![i]).toBe(array[i])
  }
})

test('map decode test', () => {
  const map = new Map<string, string>()
  map.set('00', '01')
  map.set('01', '7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc')
  map.set('02', 'ffff')
  const encoded = Codec.encode([map])
  const decoded = Codec.decode(encoded)
  for (const key in encoded) {
    expect((decoded[0] as any).get(key)).toBe(map.get(key))
  }
})

test('full encode and decode test', () => {
  const str = '7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc'
  const num = 1000000000
  const array = ['7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc', 'ff', 'ffff', 100]
  const map = new Map<string, string>()
  map.set('00', '01')
  map.set('01', '7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc')
  map.set('02', 'ffff')
  const encoded = Codec.encode([str, num, array, map])
  const decoded = Codec.decode(encoded)
  expect(decoded[0]).toBe(str)
  expect(decoded[1]).toBe(num)
  for (let i = 0; i < array.length; i++) {
    expect(decoded[2]![i]).toBe(array[i])
  }
  for (const key in encoded) {
    expect((decoded[3] as any).get(key)).toBe(map.get(key))
  }
})
