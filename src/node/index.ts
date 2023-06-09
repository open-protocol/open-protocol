import { Command } from "commander";
import fs, { readFileSync } from "fs";
import { RpcTask } from "../rpc/index.js";
import { NetworkTask } from "../network/index.js";
import { TaskManager } from "../task/index.js";
import { createEd25519PeerId } from "@libp2p/peer-id-factory";
import env from "dotenv";
import { WasmTask } from "../wasm/index.js";
import { StateTask } from "../state/index.js";
import { Keypair } from "../keypair/index.js";
import { TxPoolTask } from "../txpool/index.js";
import { ConsensusTask } from "../consensus/index.js";
import { UnsignedTransaction } from "../types/index.js";
import { logger } from "../logger/index.js";
import { Codec } from "@open-protocol/codec";

env.config();

const program = new Command();
program.command("key").action(async () => {
  const { privateKey, publicKey, address } = await Keypair.new();
  const keypair = { privateKey, publicKey, address };
  const keypairJson = JSON.stringify(keypair, null, "  ");
  console.log(keypairJson);
  fs.writeFileSync(`key-${new Date().getTime()}.json`, keypairJson);
});

program
  .command("sign")
  .requiredOption("-f, --file-path <file>", "key file path")
  .requiredOption("-m, --message <message>", "hex encoded message")
  .action(async (options) => {
    const loaded = fs.readFileSync(options.filePath, "utf8");
    const keypair = JSON.parse(loaded);
    if (keypair.privateKey) {
      const privateKey = Codec.encodeString(keypair.privateKey);
      const mesasge = Codec.encodeString(options.message);
      const signature = (await Keypair.sign(privateKey, mesasge)).toString(
        "hex"
      );
      console.log(signature);
      fs.writeFileSync(`signature-${new Date().getTime()}.txt`, signature);
    } else {
      logger.error("Invalid key format.");
    }
  });

program.command("peerkey").action(async () => {
  const peerId = await createEd25519PeerId();
  const privateKey = Buffer.from(peerId.privateKey).toString("hex");
  const publicKey = Buffer.from(peerId.publicKey).toString("hex");
  const keypair = { privateKey, publicKey, peerId: peerId.toString() };
  const keypairJson = JSON.stringify(keypair, null, "  ");
  console.log(keypairJson);
  fs.writeFileSync(`peerkey-${new Date().getTime()}.json`, keypairJson);
});

program.command("node").action(async () => {
  const manager = new TaskManager();
  manager.add(new TxPoolTask());
  manager.add(new RpcTask());
  manager.add(new StateTask());
  manager.add(new NetworkTask());
  manager.add(new WasmTask());
  manager.add(new ConsensusTask());

  await manager.initialize();
  await manager.start();

  process.on("SIGINT", manager.stop);
  process.on("SIGTERM", manager.stop);
});

program
  .command("wasm")
  .requiredOption("-f, --file-path <file>", "file path")
  .action((options) => {
    const path = options.filePath;
    const buffer = readFileSync(path);
    const compiled = buffer.toString("hex");
    fs.writeFileSync(`contract-${new Date().getTime()}.txt`, compiled);
  });

program
  .command("encode")
  .requiredOption("-t, --transaction <transaction>", "encode transaction")
  .action(async (options) => {
    try {
      const tx = UnsignedTransaction.fromJson(options.transaction);
      const transaction = {
        hash: tx.toHash().toString("hex"),
        data: tx.toBuffer().toString("hex"),
      };
      const transactionJson = JSON.stringify(transaction, null, "  ");
      console.log(transactionJson);
      fs.writeFileSync(
        `transaction-${new Date().getTime()}.json`,
        transactionJson
      );
    } catch (e: any) {
      logger.error(e.message);
    }
  });

program.parse(process.argv);
