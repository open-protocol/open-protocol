import { Keypair } from '.'
import { Codec } from '@open-protocol/codec'
import { UnsignedTransaction } from '../types'

test('keypair sign and verify test', async () => {
	const txJson = "{\"from\": \"75867f7c47fccf0b1efb6e17a954fd9198c41b0b5354cb59e2035a1d2d1a38a3\",\"to\": \"48cddaa3e83ba437487defec48e92f5023cffd67f2c7e506dace3977c662cc56\",\"value\": \"ff\",\"nonce\": 1,\"input\": \"00\"}"
	const tx = UnsignedTransaction.fromJson(txJson)
	const txBuffer = tx.toBuffer()
	const privateKey = Codec.encodeString('6534378d2ec57534efd03b9c32c25579b68a08915a4c9d2a6b240adaa7a1f6ce')
	const signature = await Keypair.sign(privateKey, txBuffer)
	expect(signature.toString('hex')).toBe('46596a4234f507eea805e87cb10b1f26ecfb1f561547e0deb866c6cb1dc907c18f64121c2ef36807cdfecca6c20951f8d4c3f4c421b0afae58d05afc5ba7ad09')

	const publicKey = Codec.encodeString('75867f7c47fccf0b1efb6e17a954fd9198c41b0b5354cb59e2035a1d2d1a38a3')
	const result = await Keypair.verify(signature, txBuffer, publicKey)
	expect(result).toBe(true)
})
