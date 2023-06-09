import { Account, SignedTransaction, UnsignedTransaction } from "./index.js";
import { Codec } from "@open-protocol/codec";
import { Keypair } from "../keypair/index.js";

test("transaction encode test", () => {
  const txJson =
    '{"from": "7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc","to": "48cddaa3e83ba437487defec48e92f5023cffd67f2c7e506dace3977c662cc56","value": "ff","nonce": 1,"input": "00"}';
  const unsignedTx = UnsignedTransaction.fromJson(txJson);

  expect(unsignedTx.toBuffer().toString("hex")).toBe(
    "0220007e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc02200048cddaa3e83ba437487defec48e92f5023cffd67f2c7e506dace3977c662cc56020100ff0101000102010000"
  );
});

test("transaction decode test", () => {
  const txJson =
    '{"from": "7e9cd855ddb203964649da096ebba0515070db91a0bfcba96e4f692ad582f2dc","to": "48cddaa3e83ba437487defec48e92f5023cffd67f2c7e506dace3977c662cc56","value": "ff","nonce": 1,"input": "00"}';
  const unsignedTx = UnsignedTransaction.fromJson(txJson);
  const encoded = unsignedTx.toBuffer();
  const decoded = UnsignedTransaction.fromBuffer(encoded);
  expect(decoded.from).toBe(unsignedTx.from);
  expect(decoded.to).toBe(unsignedTx.to);
  expect(decoded.value).toBe(unsignedTx.value);
  expect(decoded.nonce).toBe(unsignedTx.nonce);
  expect(decoded.input).toBe(unsignedTx.input);
});

test("transaction verify test", async () => {
  const txJson =
    '{"from": "75867f7c47fccf0b1efb6e17a954fd9198c41b0b5354cb59e2035a1d2d1a38a3","to": "48cddaa3e83ba437487defec48e92f5023cffd67f2c7e506dace3977c662cc56","value": "ff","nonce": 1,"input": "00"}';
  const unsignedTx = UnsignedTransaction.fromJson(txJson);
  const privateKey = Codec.encodeString(
    "6534378d2ec57534efd03b9c32c25579b68a08915a4c9d2a6b240adaa7a1f6ce"
  );
  const signature = await Keypair.sign(privateKey, unsignedTx.toBuffer());
  const signedTx = new SignedTransaction(
    unsignedTx.from,
    unsignedTx.to,
    unsignedTx.value,
    unsignedTx.nonce,
    unsignedTx.input,
    signature.toString("hex")
  );
  const result = await signedTx.verify();

  expect(result).toBe(true);
});

test("account new test", async () => {
  const publicKey =
    "9c02a283a8562478ccaf221b9ba2b7cf6348d1dc31a52c0a7af513ed88d62321";
  const account = new Account(publicKey, "00", 10000, "00", new Map());

  expect(account.toBuffer().toString("hex")).toBe(
    "0220009c02a283a8562478ccaf221b9ba2b7cf6348d1dc31a52c0a7af513ed88d62321020100000102002710020100000400000000"
  );
});
