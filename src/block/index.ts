import { Trie } from "@ethereumjs/trie";
import { logger } from "../logger/index.js";
import { StateTask } from "../state/index.js";
import { ITask, TaskManager } from "../task/index.js";
import { TxPoolTask } from "../txpool/index.js";
import {
  Account,
  Block,
  BlockHeader,
  SignedTransaction,
  WasmCall,
} from "../types/index.js";
import { WasmTask } from "../wasm/index.js";
import crypto from "crypto";

export class BlockTask implements ITask {
  manager: TaskManager;
  previous: Block;
  current: Block;

  name = () => "block";

  init = async (manager: TaskManager): Promise<void> => {
    this.manager = manager;
  };

  start = async (): Promise<void> => {};

  stop = async (): Promise<void> => {};

  propose = async (): Promise<Block> => {
    this.previous = this.current.clone();
    const txPool = this.manager.get<TxPoolTask>("txPool");
    const state = this.manager.get<StateTask>("state");
    const wasm = this.manager.get<WasmTask>("wasm");

    const db = new Map<string, Buffer>();
    const txs = new Array<string>();
    const success = new Array<string>();
    const failed = new Array<string>();
    const invalid = new Array<string>();
    const txTrie = await Trie.create({
      useRootPersistence: true,
      useKeyHashing: true,
      useKeyHashingFunction: (key: Uint8Array) => {
        return crypto.createHash("sha256").update(key).digest();
      },
    });

    let txCount = 0;
    for (const [hash, tx] of txPool.pending) {
      if (txCount > 100) {
        break;
      }
      try {
        const decodedTx = SignedTransaction.fromBuffer(tx);
        if (!(await decodedTx.verify())) {
          throw new Error("Invalid transaction.");
        }
        const fromValue =
          db.get(decodedTx.from) ??
          (await state.get(Buffer.from(decodedTx.from, "base64url")));
        if (!fromValue) {
          continue;
        }
        const fromAccount = Account.fromBuffer(fromValue);
        if (fromAccount.nonce !== decodedTx.nonce) {
          continue;
        }
        if (BigInt(fromAccount.balance) - BigInt(decodedTx.value) < 0) {
          throw new Error("From does not have enough value.");
        }
        const toValue =
          db.get(decodedTx.to) ??
          (await state.get(Buffer.from(decodedTx.to, "base64url")));
        const toAccount = toValue ? Account.fromBuffer(toValue) : Account.new();
        if (toAccount.code && decodedTx.input) {
          WasmCall.fromBuffer(
            decodedTx.to,
            Buffer.from(decodedTx.input, "utf8")
          );
        }

        const tempdb = new Map<string, Buffer>();
        fromAccount.balance = (
          BigInt(fromAccount.balance) - BigInt(decodedTx.value)
        ).toString();
        toAccount.balance = (
          BigInt(toAccount.balance) + BigInt(decodedTx.value)
        ).toString();
        fromAccount.nonce++;
        tempdb.set(decodedTx.to, toAccount.toBuffer());
        try {
          if (toAccount.code && decodedTx.input) {
            const call = WasmCall.fromBuffer(
              decodedTx.to,
              Buffer.from(decodedTx.input, "utf8")
            );
            await wasm.call(tempdb, decodedTx.from, call);
          }
          db.set(decodedTx.from, fromAccount.toBuffer());
          db.set(decodedTx.to, toAccount.toBuffer());
          success.push(hash);
        } catch (e: any) {
          failed.push(hash);
        }
        txs.push(hash);
        await txTrie.put(Buffer.from(hash, "hex"), tx);
        txCount++;
      } catch (e: any) {
        logger.debug(`${e.toString()} hash=${hash}`);
        invalid.push(hash);
      }
    }

    txPool.prune(success);
    txPool.prune(failed);
    txPool.prune(invalid);

    await state.apply(db);
    const stateRoot = state.root().toString("hex");
    const txRoot = txTrie.root().toString("hex");

    const number = this.previous.header.number + 1;
    const header = BlockHeader.new(
      number,
      this.previous.header.hash,
      txRoot,
      stateRoot
    );
    const block = Block.new(header, txs);

    this.current = block;
    return block;
  };
}
