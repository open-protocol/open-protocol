import { Codec } from '@open-protocol/codec'
import { NetworkTask } from '../network'
import { RpcTask } from '../rpc'
import { ITask, TaskManager } from '../task'
import { SignedTransaction } from '../types'

export class TxPoolTask implements ITask {
  manager: TaskManager
  pending: Map<Buffer, Buffer>

  name = () => 'txpool'

  init = async (manager: TaskManager): Promise<void> => {
    this.pending = new Map<Buffer, Buffer>()
    this.manager = manager
  }

  start = async (): Promise<void> => {
    const rpc = this.manager.get<RpcTask>('rpc')

    rpc.addMethod(`${this.name()}_transact_raw`, async (params: string[]) => {
      const tx = SignedTransaction.fromBuffer(Codec.encodeString(params[0]))
      if (!this.pending.has(tx.toHash()) && await tx.verify()) {
        this.push(tx)
        const network = this.manager.get<NetworkTask>('network')
        if (network.hasConnection()) {
          await network.publish(Buffer.from([0x00]), tx.toBuffer())
        }
      }
    })
  }

  stop = async (): Promise<void> => { }

  push = (tx: SignedTransaction) => {
    this.pending.set(tx.toHash(), tx.toBuffer())
  }

  prune = (hashArray: Array<Buffer>) => {
    for (const hash of hashArray) {
      this.pending.delete(hash)
    }
  }
}