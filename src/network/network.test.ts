test('network type test', () => {
  const data = Buffer.from([255, 255])
  const type = Buffer.from([0])

  const buffer = Buffer.concat([type, data]).toString('hex')
  expect(buffer).toBe('00ffff')
})
