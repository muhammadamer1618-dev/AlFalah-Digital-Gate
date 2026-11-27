const assert=require('node:assert/strict');
const U=require('../rased/rased-executive-workspace.js');
assert.equal(U.normalize(' إِشراف   المعلّمين '),'اشراف المعلمين');
const clicked=[];const button={hidden:false,disabled:false,style:{display:''},getAttribute:()=>null,click:()=>clicked.push(true)};const win={getComputedStyle:()=>({display:'flex',visibility:'visible'})};
assert.equal(U.activate(button,win),true);button.disabled=true;assert.equal(U.activate(button,win),false);button.disabled=false;button.hidden=true;assert.equal(U.activate(button,win),false);button.hidden=false;button.style.display='none';assert.equal(U.activate(button,win),false);assert.equal(clicked.length,1);
console.log('PASS: executive Arabic search and native unavailable-action guards.');
