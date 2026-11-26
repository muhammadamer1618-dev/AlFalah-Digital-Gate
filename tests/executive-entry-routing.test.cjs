const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/../',sso=fs.readFileSync(root+'alfalah-sso.js','utf8');
const routeContext=vm.createContext({});vm.runInContext(sso.slice(sso.indexOf('function rasedUrl(s){'),sso.indexOf('function followupUrl(s){')),routeContext);
const route=session=>{routeContext.session=session;return vm.runInContext('rasedUrl(session)',routeContext);};
const supervisorPage=fs.readFileSync(root+'rased/supervisor-dashboard.html','utf8');
async function verify(profile,executiveMode=false,target=null){
 const values={currentUserEmail:'actor',rasedExecutiveReadOnly:executiveMode?'1':'',rasedExecutiveTarget:target};
 const nodes={};const ctx=vm.createContext({sessionStorage:{getItem:k=>values[k]||null},window:{},localStorage:{getItem:()=>null},rasedAuthGet:k=>values[k]||'',rasedAuthSet:(k,v)=>values[k]=v,location:{href:'',replace(url){this.href=url;}},db:{collection:()=>({doc:id=>({get:async()=>({exists:true,data:()=>id==='target'?{role:'supervisor',supervisorType:'supervisor',name:'مشرف'}:profile})})})},applyPermissions(){},roleTypeLabel:()=>'',supName:{},supRoleLabel:{},portalRoleTitle:{}});
 vm.runInContext(supervisorPage.slice(supervisorPage.indexOf('async function verifyAccount(){'),supervisorPage.indexOf('async function loadCollectionIfAllowed(')),ctx);
 const result=await vm.runInContext('verifyAccount()',ctx);return {ctx,result};
}
module.exports=(async()=>{
 for(const name of ['جوهرة الزهراني','أحمد سمير عباس'])assert.equal(route({name,type:'supervision',rasedRole:'supervisor',currentUserType:'executive_viewer'}),'rased/executive-dashboard.html','executive accounts must use their dashboard from unified portal');
 assert.equal(route({rasedRole:'supervisor',currentUserType:' EXECUTIVE_VIEWER '}),'rased/executive-dashboard.html');
 assert.equal(route({rasedRole:'supervisor',currentUserType:'supervisor'}),'rased/supervisor-dashboard.html');
 assert.equal(route({rasedRole:'supervisor'}),'rased/supervisor-dashboard.html');
 for(const [role,page]of [['manager','manager'],['superadmin','admin'],['student_counselor','student-counselor'],['activity_leader','activity-leader']])assert.equal(route({rasedRole:role}),'rased/'+page+'.html');
 assert.equal(route({type:'teacher'}),'rased/teacher.html');
 const executive=await verify({role:'supervisor',supervisorType:'executive_viewer'});assert.equal(executive.ctx.location.href,'executive-dashboard.html','old supervisor links redirect using fresh account type');assert.equal(executive.result,false,'normal supervisor data must not load after redirect');
 const normal=await verify({role:'supervisor',supervisorType:'supervisor'});assert.equal(normal.ctx.location.href,'');assert.equal(normal.result,true);
 const selected=await verify({role:'supervisor',supervisorType:'executive_viewer'},true,'target');assert.equal(selected.ctx.location.href,'','legacy read-only supervisor inspection stays available');assert.equal(selected.result,true);
 const page=fs.readFileSync(root+'rased/executive-dashboard.html','utf8');assert(page.includes('نظام راصد — مدارس الفلاح الأهلية • تصميم محمد عامر أحمد'));assert(!page.includes('متابعة دون إضافة أو تعديل أو حذف'));
 assert(fs.readFileSync(root+'index.html','utf8').includes('alfalah-sso.js?v=20261126-executive-routing-1'));
 assert(supervisorPage.includes('if(await verifyAccount()===false)return;'));
 console.log('PASS: executive unified login route, legacy links, fresh account type, regular roles, read-only selection, cache version and requested footer.');
})();
