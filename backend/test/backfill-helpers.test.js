import test from "node:test";
import assert from "node:assert/strict";
import {historicalRange,safeBlockTxs} from "../src/backfill-helpers.js";
const H="0x"+"a".repeat(64),A="0x"+"b".repeat(40),S="3".repeat(88);
test("bounded earliest-first reverse history without false full archive",()=>{
 assert.deepEqual(historicalRange(100,3),[99,98,97]);
 assert.deepEqual(historicalRange(2,100),[1,0]);
 assert.deepEqual(historicalRange(null,4),[]);
 assert.deepEqual(historicalRange(20,-1),[]);
 assert.equal(historicalRange(1000,300).length,25);
});
test("only genuine chain hashes can be stored as historical transaction rows",()=>{
 assert.deepEqual(safeBlockTxs([{hash:H,from:A,to:A},{hash:"not-a-hash"}],"bnb"),
  [{hash:H,sender:A,recipient:A}]);
 assert.deepEqual(safeBlockTxs([S,"bad"],"solana"),
  [{hash:S,sender:null,recipient:null}]);
 assert.deepEqual(safeBlockTxs("bad","bnb"),[]);
});
