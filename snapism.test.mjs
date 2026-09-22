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
test('SNAPISM categories separate model-specific repairs, replacement and care while preserving held sections',()=>{
 const ctx=vm.createContext({URL,SNAPISM_MANUALS:data});vm.runInContext(readFileSync(new URL('snapism-manuals-ui.js',import.meta.url),'utf8'),ctx);
 const repair=ctx.snapEntries('CX7600','repair');assert.equal(repair.length,12);assert.ok(repair.find(e=>e.title.includes('Ink Run Out')).held);
 assert.equal(ctx.snapEntries('CX7600','replace').length,1);assert.ok(ctx.snapEntries('CX7600','replace')[0].sections.every(s=>!s.title.includes('DS620')));
 assert.ok(ctx.snapEntries('DS620','replace')[0].sections.every(s=>!s.title.includes('CX7600')));
 assert.equal(ctx.snapEntries('CX7600','care').length,5);assert.equal(ctx.snapEntries('카드리더기','repair')[0].sections.length,5);
 const reachable=new Set(['CX7600','DS620','모니터','PC','카드리더기','서비스코인','키오스크'].flatMap(d=>['repair','replace','care','info'].flatMap(c=>ctx.snapEntries(d,c).flatMap(e=>e.cards.flatMap(s=>s.images)))));
 assert.equal(reachable.size,74);
});
