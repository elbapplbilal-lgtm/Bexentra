import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedBackfillLimit,selectPreviousSlots} from '../src/gap-planner.js';
test('limit is constrained for free-tier RPC',()=>{
 assert.equal(boundedBackfillLimit(undefined),8);
 assert.equal(boundedBackfillLimit(10000),20);
 assert.equal(boundedBackfillLimit(-1),8);
});
test('choose only produced historical slots, sorted newest-first, without duplicates',()=>{
 assert.deepEqual(selectPreviousSlots([39,37,37,42,null,-1,36,41],41,3),[39,37,36]);
 assert.deepEqual(selectPreviousSlots(null,100),[]);
 assert.deepEqual(selectPreviousSlots([10],10),[]);
});
