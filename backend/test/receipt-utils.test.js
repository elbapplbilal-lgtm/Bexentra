import test from "node:test";
import assert from "node:assert/strict";
import {integerUnits,parseBnbReceipt,parseSolanaTransaction} from "../src/receipt-utils.js";

const hash="0x"+"a".repeat(64);
const receipt={
 transactionHash:hash,blockNumber:"0x100",status:"0x1",
 gasUsed:"0x5208",effectiveGasPrice:"0x12a05f200",
 from:"0x"+"b".repeat(40),to:"0x"+"c".repeat(40)
};

test("BNB receipt success: confirmed status and exact wei gas fee",()=>{
 const parsed=parseBnbReceipt(receipt,hash);
 assert.equal(parsed.status,"success");
 assert.equal(parsed.fee_native,(21000n*5000000000n).toString());
 assert.equal(parsed.block_height,256);
 assert.equal(parsed.sender,receipt.from);
 assert.equal(parsed.recipient,receipt.to);
});

test("BNB reverted transaction has failed status but still owes gas",()=>{
 const parsed=parseBnbReceipt({...receipt,status:"0x0"},hash);
 assert.equal(parsed.status,"failed");
 assert.equal(parsed.fee_native,"105000000000000");
});

test("BNB legacy receipt may use gasPrice",()=>{
 const {effectiveGasPrice,...legacy}=receipt;
 const parsed=parseBnbReceipt({...legacy,gasPrice:"0x3b9aca00"},hash);
 assert.equal(parsed.fee_native,"21000000000000");
});

test("BNB receipt with no gas price never invents fee",()=>{
 const {effectiveGasPrice,...partial}=receipt;
 const parsed=parseBnbReceipt(partial,hash);
 assert.equal(parsed.status,"success");
 assert.equal(parsed.fee_native,null);
});

test("BNB receipt from another transaction is rejected",()=>{
 assert.equal(parseBnbReceipt(receipt,"0x"+"f".repeat(64)),null);
 assert.equal(parseBnbReceipt(null,hash),null);
});

test("Solana successful finalized tx includes true lamport fee",()=>{
 const parsed=parseSolanaTransaction({
  slot:1234567,meta:{err:null,fee:5000},
  transaction:{message:{accountKeys:["Payer11111111111111111111111111111111"]}}
 });
 assert.equal(parsed.status,"success");
 assert.equal(parsed.fee_native,"5000");
 assert.equal(parsed.block_height,1234567);
 assert.equal(parsed.recipient,null);
});

test("Solana transaction with an error records failed status",()=>{
 const parsed=parseSolanaTransaction({
  slot:1234567,meta:{err:{InstructionError:[0,"Custom"]},fee:8000}
 });
 assert.equal(parsed.status,"failed");
 assert.equal(parsed.fee_native,"8000");
});

test("Missing Solana metadata is not represented as success",()=>{
 assert.equal(parseSolanaTransaction({slot:1234567}),null);
 assert.equal(parseSolanaTransaction(null),null);
});

test("Zero fee is legitimate, unsafe integers are rejected",()=>{
 const parsed=parseSolanaTransaction({slot:1,meta:{err:null,fee:0}});
 assert.equal(parsed.fee_native,"0");
 assert.equal(integerUnits(-1),null);
 assert.equal(integerUnits(9007199254740992),null);
 assert.equal(integerUnits("1.234"),null);
 assert.equal(integerUnits("0x"),null);
});
