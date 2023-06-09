import { Codec } from "@open-protocol/codec";
import crypto from "crypto";
import { Keypair } from "../keypair/index.js";

interface IUnsignedTransaction {
  from: string;
  to: string;
  value: string;
  nonce: number;
  input: string;
}

export class UnsignedTransaction implements IUnsignedTransaction {
  constructor(
    public from: string,
    public to: string,
    public value: string,
    public nonce: number,
    public input: string
  ) {}

  public static fromBuffer = (buffer: Buffer): UnsignedTransaction => {
    const values = Codec.decode(buffer);
    if (
      typeof values[0] !== "string" ||
      typeof values[1] !== "string" ||
      typeof values[2] !== "string" ||
      typeof values[3] !== "number" ||
      typeof values[4] !== "string"
    ) {
      throw new Error("Failed to encode buffer.");
    }
    return new UnsignedTransaction(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4]
    );
  };

  public static fromJson = (str: string): UnsignedTransaction => {
    const { from, to, value, nonce, input } = JSON.parse(str);
    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      typeof value !== "string" ||
      typeof nonce !== "number" ||
      typeof input !== "string"
    ) {
      throw new Error("Failed to parse json.");
    }
    return new UnsignedTransaction(from, to, value, nonce, input);
  };

  public toBuffer = (): Buffer => {
    return Codec.encode([
      this.from,
      this.to,
      this.value,
      this.nonce,
      this.input,
    ]);
  };

  public toHash = (): Buffer => {
    return crypto.createHash("sha256").update(this.toBuffer()).digest();
  };

  public static fromSignedTx = (
    signedTx: SignedTransaction
  ): UnsignedTransaction => {
    return new UnsignedTransaction(
      signedTx.from,
      signedTx.to,
      signedTx.value,
      signedTx.nonce,
      signedTx.input
    );
  };
}

interface ISignedTransaction {
  from: string;
  to: string;
  value: string;
  nonce: number;
  input: string;
  signature: string;
}

export class SignedTransaction implements ISignedTransaction {
  constructor(
    public from: string,
    public to: string,
    public value: string,
    public nonce: number,
    public input: string,
    public signature: string
  ) {}

  public static fromBuffer = (buffer: Buffer): SignedTransaction => {
    const values = Codec.decode(buffer);
    if (
      typeof values[0] !== "string" ||
      typeof values[1] !== "string" ||
      typeof values[2] !== "string" ||
      typeof values[3] !== "number" ||
      typeof values[4] !== "string" ||
      typeof values[5] !== "string"
    ) {
      throw new Error("Failed to encode buffer.");
    }
    return new SignedTransaction(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5]
    );
  };

  public static fromJson = (str: string): SignedTransaction => {
    const { from, to, value, nonce, input, signature } = JSON.parse(str);
    return new SignedTransaction(from, to, value, nonce, input, signature);
  };

  public toBuffer = (): Buffer => {
    return Codec.encode([
      this.from,
      this.to,
      this.value,
      this.nonce,
      this.input,
      this.signature,
    ]);
  };

  public toHash = (): Buffer => {
    const unsignedTx = UnsignedTransaction.fromSignedTx(this);
    return crypto.createHash("sha256").update(unsignedTx.toBuffer()).digest();
  };

  public verify = async (): Promise<boolean> => {
    const unsignedTx = UnsignedTransaction.fromSignedTx(this);
    return await Keypair.verify(
      Codec.encodeString(this.signature),
      unsignedTx.toBuffer(),
      Codec.encodeString(this.from)
    );
  };
}

export type MemoryKey = string | number | bigint;
export type MemoryValue =
  | string
  | number
  | bigint
  | MemoryValue[]
  | Map<MemoryKey, MemoryValue>;

interface IAccount {
  publicKey: string;
  balance: string;
  nonce: number;
  code: string;
  memory: Map<MemoryKey, MemoryValue>;
}

export class Account implements IAccount {
  constructor(
    public publicKey: string,
    public balance: string,
    public nonce: number,
    public code: string,
    public memory: Map<MemoryKey, MemoryValue>
  ) {}

  public static new = (publicKey: string): Account => {
    if (publicKey !== "64") {
      throw new Error("Invalid public key.");
    }
    return new Account(
      publicKey,
      "00",
      0,
      "00",
      new Map<MemoryKey, MemoryValue>()
    );
  };

  public static fromBuffer = (buffer: Buffer): Account => {
    const values = Codec.decode(buffer);
    if (
      typeof values[0] !== "string" ||
      typeof values[1] !== "string" ||
      typeof values[2] !== "number" ||
      typeof values[3] !== "string" ||
      !(values[4] instanceof Map)
    ) {
      throw new Error("Failed to encode buffer.");
    }
    return new Account(values[0], values[1], values[2], values[3], values[4]);
  };

  public toBuffer = (): Buffer => {
    return Codec.encode([
      this.publicKey,
      this.balance,
      this.nonce,
      this.code,
      this.memory,
    ]);
  };
}

interface IWasmCall {
  address: string;
  method: string;
  params: string;
}

export class WasmCall implements IWasmCall {
  constructor(
    public address: string,
    public method: string,
    public params: string
  ) {}

  public static fromBuffer = (address: string, buffer: Buffer): WasmCall => {
    const values = Codec.decode(buffer);
    if (typeof values[0] !== "string" || typeof values[1] !== "string") {
      throw new Error("Failed to encode buffer.");
    }
    return new WasmCall(address, values[0], values[1]);
  };
}

interface IBlockHeader {
  hash: string;
  number: number;
  previous: string;
  txroot: string;
  stateroot: string;
  timestamp: number;
}

export class BlockHeader implements IBlockHeader {
  constructor(
    public hash: string,
    public number: number,
    public previous: string,
    public txroot: string,
    public stateroot: string,
    public timestamp: number
  ) {}

  public static new = (
    number: number,
    previous: string,
    txroot: string,
    stateroot: string
  ): BlockHeader => {
    const timestamp = Date.now();
    const buffer = Codec.encode([
      number,
      previous,
      txroot,
      stateroot,
      timestamp,
    ]);
    const hash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest()
      .toString("hex");

    return new BlockHeader(
      hash,
      number,
      previous,
      txroot,
      stateroot,
      timestamp
    );
  };

  public clone = (): BlockHeader => {
    return new BlockHeader(
      this.hash,
      this.number,
      this.previous,
      this.txroot,
      this.stateroot,
      this.timestamp
    );
  };

  public toBuffer = (): Buffer => {
    return Codec.encode([
      this.number,
      this.previous,
      this.txroot,
      this.stateroot,
      this.timestamp,
    ]);
  };
}

interface IBlock {
  header: IBlockHeader;
  txs: Array<string>;
}

export class Block implements IBlock {
  constructor(public header: BlockHeader, public txs: Array<string>) {}

  public static new = (header: BlockHeader, txs: Array<string>): Block => {
    return new Block(header, txs);
  };

  public clone = (): Block => {
    const header = this.header.clone();
    return new Block(header, this.txs.slice());
  };

  public toBuffer = (): Buffer => {
    const header = this.header.toBuffer();
    const txs = Codec.encode([this.txs]);
    return Buffer.concat([header, txs]);
  };
}
