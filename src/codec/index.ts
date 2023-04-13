type CodecSupported = string | number | bigint | object | null | undefined

export class Codec {
  static encodeString = (str: string): Buffer => {
    const isHex = /^[0-9a-fA-F]+$/
    if (!isHex.test(str)) {
      throw new Error('String must be hex.')
    }
    const fullHex = str.length & 1 ? `0${str}` : str
    return Buffer.from(fullHex, 'hex')
  }

  static encodeNumber = (num: number | bigint): Buffer => {
    if (num < 0) {
      throw new Error('Number must be greater than or equal to zero.')
    }
    const hex = num.toString(16)
    const fullHex = hex.length & 1 ? `0${hex}` : hex
    return Buffer.from(fullHex, 'hex')
  }

  static bufferLength = (buffer: Buffer): Uint8Array => {
    const u16a = new Uint16Array(1)
    u16a[0] = buffer.length
    return new Uint8Array(u16a.buffer)
  }

  static encode = (values: Array<CodecSupported>): Buffer => {
    const buffers = new Array<Buffer>()
    for (const value of values) {
      if (value === null || typeof value === 'undefined') {
        buffers.push(Buffer.from([0x00]))
      } else if (typeof value === 'number' || typeof value === 'bigint') {
        const buffer = this.encodeNumber(value)
        buffers.push(Buffer.concat([Buffer.from([0x01]), this.bufferLength(buffer), buffer]))
      } else if (typeof value === 'string') {
        const buffer = this.encodeString(value)
        buffers.push(Buffer.concat([Buffer.from([0x02]), this.bufferLength(buffer), buffer]))
      } else if (Array.isArray(value)) {
        const array = value
        const arrayBuffers = new Array<Buffer>()
        let arrayLength = 0
        for (const element of array) {
          const buffer = this.encode([element])
          arrayBuffers.push(buffer)
          arrayLength += buffer.length
        }
        const u32a = new Uint32Array(1)
        u32a[0] = arrayLength
        const lengthBuffer = new Uint8Array(u32a.buffer)
        buffers.push(Buffer.concat([Buffer.from([0x03]), lengthBuffer, Buffer.concat(arrayBuffers)]))
      } else if (value instanceof Map) {
        const map = value
        const mapBuffers = new Array<Buffer>()
        let arrayLength = 0
        for (const [key, value] of map) {
          const keyBuffer = this.encode([key])
          const valueBuffer = this.encode([value])
          mapBuffers.push(Buffer.concat([keyBuffer, valueBuffer]))
          arrayLength += keyBuffer.length
          arrayLength += valueBuffer.length
        }
        const u32a = new Uint32Array(1)
        u32a[0] = arrayLength
        const lengthBuffer = new Uint8Array(u32a.buffer)
        buffers.push(Buffer.concat([Buffer.from([0x04]), lengthBuffer, Buffer.concat(mapBuffers)]))
      } else {
        throw new Error('Not supported type.')
      }
    }
    return Buffer.concat(buffers)
  }

  static decode = (buffer: Buffer): Array<CodecSupported> => {
    let index = 0
    const values = new Array<CodecSupported>()
    while (index < buffer.length) {
      const type = buffer.subarray(index, index + 1).readUint8()
      if (type === 0) {
        values.push(null)
        index += 1
      } else if (type === 1) {
        const length = buffer.subarray(index + 1, index + 3).readUint16LE()
        const valueBuffer = buffer.subarray(index + 3, index + 3 + length)
        if (length <= 6) {
          values.push(parseInt(valueBuffer.toString('hex'), 16))
        } else {
          values.push(BigInt(`0x${valueBuffer.toString('hex')}`))
        }
        index += (3 + length)
      } else if (type === 2) {
        const length = buffer.subarray(index + 1, index + 3).readUint16LE()
        const valueBuffer = buffer.subarray(index + 3, index + 3 + length)
        values.push(valueBuffer.toString('hex'))
        index += (3 + length)
      } else if (type === 3) {
        const length = buffer.subarray(index + 1, index + 5).readUint32LE()
        const valueBuffer = buffer.subarray(index + 5, index + 5 + length)
        const arrayValues = this.decode(valueBuffer)
        values.push(arrayValues)
        index += (5 + length)
      } else if (type === 4) {
        const length = buffer.subarray(index + 1, index + 5).readUint32LE()
        const valueBuffer = buffer.subarray(index + 5, index + 5 + length)
        const arrayValues = this.decode(valueBuffer)
        const map = new Map<any, any>()
        for (let i = 0; i < arrayValues.length; i += 2) {
          map.set(arrayValues[i], arrayValues[i + 1])
        }
        values.push(map)
        index += (5 + length)
      } else {
        throw new Error('Unsupported type.')
      }
    }
    return values
  }
}
