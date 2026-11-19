const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../rased/executive-dashboard.html','utf8');
const code=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean).join('\n');
new vm.Script(code);
const docs=rows=>({docs:rows.map(x=>({id:x.id,data:()=>x}))});
async function session(role='supervisor',type='executive_viewer'){
 const elements={},calls=[],buttons=[];let fail=false;
 function el(id){return elements[id]??= {value:'',innerHTML:'',textContent:'',disabled:false,add(){},scrollIntoView(){}}}
 const data={users:[{id:'boss',role:'supervisor',supervisorType:type},{id:'sup1',name:'المشرف',role:'supervisor'}],teachers:[{id:'t1',name:'المعلم',email:'teacher@test'}],students:[{id:'s1',name:'الطالب الأول',grade:'3'},{id:'s2',name:'الطالب الثاني',grade:'4'}],visits:[{id:'v1',teacherEmail:'teacher@test',supervisorId:'sup1',date:'2026-11-01',notes:'زيارة حقيقية'}]};
 const store={collection(name){return {get:async()=>{calls.push(name);if(fail)throw Error('permission-denied');return docs(data[name]||[])},doc(id){return {get:async()=>({exists:true,data:()=>data.users[0]})}}}}};
 const storage={getItem:k=>({currentUserEmail:'boss',currentUserRole:role}[k]||null),removeItem(){}};
 const ctx=vm.createContext({document:{getElementById:el,querySelectorAll:()=>buttons},firebase:{initializeApp:()=>({firestore:()=>store}),firestore:()=>store},sessionStorage:storage,localStorage:storage,location:{href:''},Option:function(){},console:{error(){}}});
 vm.runInContext(code.replace('init().catch','globalThis.started=init().catch'),ctx);await ctx.started;
 return {ctx,el,calls,setFail:()=>{fail=true},run:src=>vm.runInContext(src,ctx)};
}
module.exports=(async()=>{
 const denied=await session('teacher');assert.equal(denied.ctx.location.href,'index.html');assert.equal(denied.calls.length,0);
 const wrong=await session('supervisor','other');assert.equal(wrong.ctx.location.href,'index.html');assert.equal(wrong.calls.length,0);
 const s=await session();assert.equal(s.el('total').textContent,(2).toLocaleString('ar'));assert(s.el('rows').innerHTML.includes('الطالب الأول'));assert.equal((s.el('sectionCards').innerHTML.match(/data-category=/g)||[]).length,9);
 s.el('search').value='الثاني';await s.run('showResults(false)');assert.equal(s.el('total').textContent,(1).toLocaleString('ar'));assert(!s.el('rows').innerHTML.includes('الطالب الأول'));
 await s.run("openCategory('visits')");assert(s.el('rows').innerHTML.includes('زيارة حقيقية'));s.el('from').value='2026-11-02';await s.run('showResults(false)');assert.equal(s.el('total').textContent,(0).toLocaleString('ar'));
 assert.equal(s.run("typeof db.collection('users').doc('boss').update"),'undefined');assert.equal(s.run("typeof db.collection('users').add"),'undefined');assert.equal(s.run('typeof db.batch'),'undefined');
 assert(!s.run("summary({password:'secret',token:'secret',notes:'public'})").includes('secret'));
 s.setFail();await s.run('showResults()');assert.equal(s.el('total').textContent,'—');assert(s.el('status').textContent.includes('لم يكتمل'));
 assert(!html.includes('changePassword'));assert(fs.readFileSync(__dirname+'/../.github/workflows/sync-rased.yml','utf8').includes("--exclude 'executive-dashboard.html'"));
 console.log('PASS: parsing, login/role guards, nine cards, real-source fixtures, search/date filters, read-only adapter, sensitive-field exclusion, load errors, sync protection. Firebase server rules and real account access are NOT tested.');
})();
