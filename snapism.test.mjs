import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const data=JSON.parse(readFileSync(new URL('snapism-manuals.json',import.meta.url)));
test('SNAPISM reviewed equipment sources exclude both disputed procedures and wrong model image',()=>{
 assert.equal(data.length,16);
 assert.equal(data.flatMap(m=>m.sections).filter(s=>s.held).length,2);
 for(const m of data){assert.match(m.source,/channel.works\/op2z1\/document\/spaces\/12234\/articles\//);for(const s of m.sections){if(s.held)assert.equal(s.cards.length,0);for(const c of s.cards){assert.doesNotMatch(c.text,/DS-RX1/);for(const u of c.images)assert.equal(new URL(u).hostname,'cf.channel.io');for(const u of c.videos)assert.match(u,/^https:\/\/www.youtube.com\/watch\?v=/);}}}
});
test('SNAPISM printer routes match their model and shared replacement only; photo inventory includes applied manuals',()=>{
 const ctx=vm.createContext({URL,SNAPISM_MANUALS:data});vm.runInContext(readFileSync(new URL('snapism-manuals-ui.js',import.meta.url),'utf8'),ctx);vm.runInContext(readFileSync(new URL('community-ui.js',import.meta.url),'utf8'),ctx);
 assert.ok(data.filter(m=>ctx.snapManualMatches(m,'CX7600 프린터 (포토카드)')).every(m=>m.device==='CX7600'||m.device==='프린터'));
 assert.equal(ctx.helperPhotoCatalog({},{}).length,74);
 assert.equal(ctx.helperPhotoCoverage({},{},{}).length,16);
 assert.equal(new Set(data.flatMap(m=>m.sections.flatMap(s=>s.cards.flatMap(c=>c.videos)))).size,2);
});
