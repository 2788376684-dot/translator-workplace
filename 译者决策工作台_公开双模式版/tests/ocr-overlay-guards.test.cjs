'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','atelier-review-enhancements.js'),'utf8');
test('OCR preview retains SVG and canvas geometry layers',()=>{
 assert.match(source,/el\.matches\('svg,canvas'\)/,'outer preview must explicitly skip vectors');
 assert.match(source,/const vector=\['svg','canvas','line','rect','polygon','polyline','path'\]\.includes\(tag\)/);
 assert.match(source,/if\(!vector&&!guide&&mark&&pos/,'nested OCR filter must exclude interactive guides');
 assert.doesNotMatch(source,/if\(tag==='svg'\|\|tag==='canvas'/,'no unconditional hiding of SVG/canvas');
});
test('OCR filtering requires positive annotation evidence and excludes drag controls',()=>{
 assert.match(source,/const annotation=\/ocr/);
 assert.match(source,/const geometry=\/geometry\|grid\|boundary\|divider\|drag\|handle\|resize/);
 assert.match(source,/annotation&&!geometry/);
 assert.match(source,/mark&&pos&&!el\.querySelector\('canvas,svg,button,input,\[draggable\]'\)/);
});
