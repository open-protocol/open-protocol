import { Trie } from '@ethereumjs/trie'
import { logger } from '../logger'
import { StateTask } from '../state'
import { ITask, TaskManager } from '../task'
import { TxPoolTask } from '../txpool'
import { Account, Block, BlockHeader, SignedTransaction, WasmCall } from '../types'
import { WasmTask } from '../wasm'
import crypto from 'crypto'
import { Codec } from '@open-protocol/codec'

export class BlockTask implements ITask {
  manager: TaskManager
  previous: Block
  current: Block

  name = () => 'block'

  init = async (manager: TaskManager): Promise<void> => {
    this.manager = manager
  }

  start = async (): Promise<void> => { }

  stop = async (): Promise<void> => { }

  propose = async (): Promise<Block> => {
    this.previous = this.current.clone()
    const txpool = this.manager.get<TxPoolTask>('txpool')
    const state = this.manager.get<StateTask>('state')
    const wasm = this.manager.get<WasmTask>('wasm')

    const db = new Map<Buffer, Buffer>()
    const txs = new Array<string>()
    const success = new Array<Buffer>()
    const failed = new Array<Buffer>()
    const invalid = new Array<Buffer>()
    const txtrie = await Trie.create({
      useRootPersistence: true,
      useKeyHashing: true,
      useKeyHashingFunction: (key: Uint8Array) => {
        return crypto.createHash('sha256').update(key).digest()
      }
    })

    let txCount = 0
    for (const [hash, tx] of txpool.pending) {
      if (txCount > 100) {
        break
      }
      try {
        const decodedTx = SignedTransaction.fromBuffer(tx)
        if (!await decodedTx.verify()) {
          throw new Error('Invalid transaction.')
        }
        const fromBuffer = Codec.encodeString(decodedTx.from)
        const fromValue = db.get(fromBuffer) ?? await state.get(fromBuffer)
        if (!fromValue) {
          continue
        }
        const fromAccount = Account.fromBuffer(fromValue)
        if (fromAccount.nonce !== decodedTx.nonce) {
          continue
        }
        if (BigInt(`0x${fromAccount.balance}`) - BigInt(`0x${decodedTx.value}`) < 0) {
          throw new Error('From does not have enough value.')
        }
        const toBuffer = Codec.encodeString(decodedTx.to)
        const toValue = db.get(toBuffer) ?? await state.get(toBuffer)
        const toAccount = toValue ? Account.fromBuffer(toValue) : Account.new(decodedTx.to)
        if (toAccount.code !== '00' && decodedTx.input !== '00') {
          WasmCall.fromBuffer(decodedTx.to, Codec.encodeString(decodedTx.input))
        }

        const tempdb = new Map<Buffer, Buffer>()
        fromAccount.balance = Codec.encodeNumber((BigInt(`0x${fromAccount.balance}`) - BigInt(`0x${decodedTx.value}`))).toString('hex')
        toAccount.balance = Codec.encodeNumber(BigInt(`0x${toAccount.balance}`) + BigInt(`0x${decodedTx.value}`)).toString('hex')
        fromAccount.nonce++
        tempdb.set(fromBuffer, fromAccount.toBuffer())
        tempdb.set(toBuffer, toAccount.toBuffer())
        try {
          if (toAccount.code !== '00' && decodedTx.input !== '00') {
            const call = WasmCall.fromBuffer(decodedTx.to, Codec.encodeString(decodedTx.input))
            await wasm.call(tempdb, fromAccount.publicKey, call)
          }
          db.set(fromBuffer, fromAccount.toBuffer())
          db.set(toBuffer, toAccount.toBuffer())
          success.push(hash)
        } catch (e: any) {
          failed.push(hash)
        }
        txs.push(hash.toString('hex'))
        await txtrie.put(hash, tx)
        txCount++
      } catch (e: any) {
        logger.debug(`${e.toString()} hash=${hash.toString('hex')}`)
        invalid.push(hash)
      }
    }

    txpool.prune(success)
    txpool.prune(failed)
    txpool.prune(invalid)

    await state.apply(db)
    const stateroot = state.root().toString('hex')
    const txroot = txtrie.root().toString('hex')

    const number = this.previous.header.number + 1
    const header = BlockHeader.new(number, this.previous.header.hash, txroot, stateroot)
    const block = Block.new(header, txs)

    this.current = block
    return block
  }
}