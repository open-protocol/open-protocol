import crypto from 'crypto'
import * as ed from '@noble/ed25519'

interface IKeypair {
  privateKey: string,
  publicKey: string,
}

export class Keypair implements IKeypair {
  constructor(public privateKey: string, public publicKey: string) { }

  public static new = async (): Promise<Keypair> => {
    const privateKey = ed.utils.randomPrivateKey()
    const publicKey = await ed.getPublicKey(privateKey)
    return {
      privateKey: Buffer.from(privateKey).toString('hex'),
      publicKey: Buffer.from(publicKey).toString('hex'),
    }
  }

  public static sign = async (privateKey: Buffer, message: Buffer): Promise<Buffer> => {
    const sha256ed = crypto.createHash('sha256').update(message).digest()
    const signature = await ed.sign(sha256ed, privateKey)
    return Buffer.from(signature)
  }

  public static verify = async (signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> => {
    const sha256ed = crypto.createHash('sha256').update(message).digest()
    return this.verifyUnhashed(signature, sha256ed, publicKey)
  }

  public static verifyUnhashed = async (signature: Buffer, message: Buffer, publicKey: Buffer): Promise<boolean> => {
    return ed.verify(signature, message, publicKey)
  }
}