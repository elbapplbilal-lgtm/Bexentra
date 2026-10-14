import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicAddress,readList,addEntry,balanceText,verifiedBalance,explorerUrl,WATCHLIST_LIMIT} from '../public/watchlist-utils.mjs';
const addr='0x'+'A'.repeat(40),sol='4'.repeat(44),bnb={chain:'bnb',address:addr};
test('valid public addresses and normalization',()=>{
 assert.equal(parsePublicAddress(addr,'bnb'),'0x'+'a'.repeat(40));
 assert.equal(parsePublicAddress('A'.repeat(40),'bnb'),'0x'+'a'.repeat(40));
 assert.equal(parsePublicAddress(sol,'solana'),sol);
 for(const invalid of ['','0x1','seed phrase twelve words','A'.repeat(64),'<img onerror=alert(1)>'])
  assert.throws(()=>parsePublicAddress(invalid,'bnb'));
 assert.throws(()=>parsePublicAddress(addr,'wrong'));
});
test('corrupt storage is rejected and duplicates removed',()=>{
 assert.deepEqual(readList('{bad'),[]);
 assert.deepEqual(readList(JSON.stringify([{chain:'bnb',address:addr},{chain:'bnb',address:addr.toLowerCase()},{chain:'bnb',address:'invalid'}])),
  [{chain:'bnb',address:addr.toLowerCase(),label:''}]);
});
test('watchlist bound and duplicate guard',()=>{
 const first=addEntry([],{...bnb,label:' Testing '});
 assert.equal(first[0].label,'Testing');
 assert.throws(()=>addEntry(first,{...bnb,address:addr.toLowerCase()}),/duplicate/);
 const full=Array.from({length:WATCHLIST_LIMIT},(_,i)=>({chain:'solana',address:String(i+1).repeat(44),label:''}));
 assert.throws(()=>addEntry(full,bnb),/limit/);
});
test('exact native decimals, small nonzero, zero',()=>{
 assert.equal(balanceText('1000000000000000000','bnb'),'1');
 assert.equal(balanceText('1234567890000000000','bnb'),'1.234567');
 assert.equal(balanceText('1234567890','solana'),'1.234567');
 assert.equal(balanceText('1','bnb'),'<0.000001');
 assert.equal(balanceText('0','solana'),'0');
 assert.throws(()=>balanceText('-4','bnb'));
});
test('RPC balance validates source, coverage, account, freshness',()=>{
 const entry={chain:'bnb',address:addr.toLowerCase()};
 const now=Date.now();
 const body={chain:'bnb',address:addr,source:'rpc_live',coverage:'current_native_balance_only',
 native_unit:'BNB',native_balance:'2000000000000000000',observed_at:new Date(now).toISOString()};
 assert.equal(verifiedBalance(body,entry,now),'2');
 assert.throws(()=>verifiedBalance({...body,source:'database'},entry,now));
 assert.throws(()=>verifiedBalance({...body,observed_at:new Date(now-180000).toISOString()},entry,now));
 assert.throws(()=>verifiedBalance({...body,address:'0x'+'b'.repeat(40)},entry,now));
 assert.throws(()=>verifiedBalance({...body,native_balance:null},entry,now));
});
test('wallet explorer link is correctly encoded',()=>{
 const u=new URL(explorerUrl({chain:'solana',address:sol}),'https://example.org/');
 assert.equal(u.searchParams.get('type'),'address');
 assert.equal(u.searchParams.get('q'),sol);
});
