import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C=createRequire(import.meta.url)('./card-sales-core.js');
test('numeric booth labels match while named booths stay distinct',()=>{
 assert.equal(C.compare([{store:'A',booth:'1번'}],[{store:'A',booth:'01'}],true).missing.length,0);
 assert.equal(C.compare([{store:'A',booth:'하이앵글'}],[{store:'A',booth:'하이앵글 2번'}],true).missing.length,1);
});
test('absent booths remain missing even with no sales rows',()=>{
 assert.equal(C.compare([{store:'A',booth:'1번'}],[],true).missing.length,1);
});
test('explicit Coex alias does not require fuzzy matching',()=>{
 assert.equal(C.compare([{store:'서울 코엑스 컬러드',booth:'1번'}],[{store:'서울 코엑스점 컬러드',booth:'01'}],true).missing.length,0);
});
