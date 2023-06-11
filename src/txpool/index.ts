import { Codec } from "@open-protocol/codec";
import { NetworkTask } from "../network/index.js";
import { RpcTask } from "../rpc/index.js";
import { ITask, TaskManager } from "../task/index.js";
import { SignedTransaction } from "../types/index.js";

export class TxPoolTask implements ITask {
  manager: TaskManager;
  pending: Map<string, Buffer>;

  name = () => "txpool";

  init = async (manager: TaskManager): Promise<void> => {
    this.pending = new Map<string, Buffer>();
    this.manager = manager;
  };

  start = async (): Promise<void> => {
    const rpc = this.manager.get<RpcTask>("rpc");

    rpc.addMethod(`${this.name()}_transact_raw`, async (params: string[]) => {
      const tx = SignedTransaction.fromBuffer(Buffer.from(params[0], "hex"));
      if (
        !this.pending.has(tx.toHash().toString("hex")) &&
        (await tx.verify())
      ) {
        this.push(tx);
        const network = this.manager.get<NetworkTask>("network");
        if (network.hasConnection()) {
          await network.publish(Buffer.from([0x00]), tx.toBuffer());
        }
      }
    });
  };

  stop = async (): Promise<void> => {};

  push = (tx: SignedTransaction) => {
    this.pending.set(tx.toHash().toString("hex"), tx.toBuffer());
  };

  prune = (hashArray: Array<string>) => {
    for (const hash of hashArray) {
      this.pending.delete(hash);
    }
  };
}
