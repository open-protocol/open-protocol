import { Codec } from "@open-protocol/codec";
import { RpcTask } from "../rpc/index.js";
import { StateTask } from "../state/index.js";
import { ITask, TaskManager } from "../task/index.js";
import { MemoryKey, MemoryValue } from "../types/index.js";
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
    await db.put(Codec.encodeString(address), Codec.encodeString(code));
  };

  call = async (db: Map<Buffer, Buffer>, from: string, call: WasmCall) => {
    const contractAddress = Buffer.from(call.address, "hex");
    const contractRaw = db.get(contractAddress);
    const contract = Account.fromBuffer(contractRaw!);
    const contractCode = Buffer.from(contract.code, "hex");
    const contractMemory = contract.memory;
    const module = await WebAssembly.instantiate(contractCode, {
      env: {
        console_log_str: (offset: number, len: number) => {
          const { buffer } = module.instance.exports
            .memory as WebAssembly.Memory;
          const text = new TextDecoder("utf8").decode(
            Buffer.from(buffer, offset, len)
          );
          console.log(text);
        },
        console_log_i32: (i: number) => {
          console.log(i);
        },
        get: (offset: number, len: number): number => {
          const buffer = (module.instance.exports.memory as WebAssembly.Memory)
            .buffer;
          const key = Codec.decode(
            Buffer.from(buffer, offset, len)
          )[0] as MemoryKey;
          const value = contractMemory.get(key);
          const valueBuffer = Codec.encode([value]);
          new Uint8Array(buffer)
            .subarray(len + valueBuffer.length)
            .set(valueBuffer);
          return valueBuffer.length;
        },
        put: (
          keyOffset: number,
          keyLen: number,
          valOffset: number,
          valLen: number
        ) => {
          const buffer = (module.instance.exports.memory as WebAssembly.Memory)
            .buffer;
          const key = Codec.decode(
            Buffer.from(buffer, keyOffset, keyLen)
          )[0] as MemoryKey;
          const value = Codec.decode(
            Buffer.from(buffer, valOffset, valLen)
          )[0] as MemoryValue;
          contractMemory.set(key, value);
        },
      },
    });
    const bytes = Codec.encodeString(call.params);
    const buffer = (module.instance.exports.memory as WebAssembly.Memory)
      .buffer;
    new Uint8Array(buffer).subarray().set(bytes);
    (module.instance.exports[call.method] as any)(buffer, bytes.length);
  };
}
