import { Codec, CodecSupported, MapKey } from "@open-protocol/codec";
import { RpcTask } from "../rpc/index.js";
import { StateTask } from "../state/index.js";
import { ITask, TaskManager } from "../task/index.js";
import { Account, WasmCall } from "../types/index.js";

export class WasmTask implements ITask {
  manager: TaskManager;

  name = () => "wasm";

  init = async (manager: TaskManager): Promise<void> => {
    this.manager = manager;
  };

  start = async (): Promise<void> => {
    const rpc = this.manager.get<RpcTask>("rpc");

    rpc.addMethod(`${this.name()}_create`, async (params: any[]) => {
      await this.create(params[0], params[1]);
    });
  };

  stop = async (): Promise<void> => {};

  create = async (address: string, code: string) => {
    const db = this.manager.get<StateTask>("state");
    await db.put(Buffer.from(address, "base64url"), Buffer.from(code, "hex"));
  };

  call = async (db: Map<string, Buffer>, from: string, call: WasmCall) => {
    const rawAccount = db.get(call.address);
    const account = Account.fromBuffer(rawAccount);
    const code = Buffer.from(account.code, "hex");
    // TODO: Apply @open-protocol/wasm
  };
}
