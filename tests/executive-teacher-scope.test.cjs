const assert=require('node:assert/strict'),V=require('../rased/executive-viewer.js');
const teachers=[{id:'a@test',name:'معلم أ',phone:'0501234567',assignments:[{grade:'5 ابتدائي',section:'أ'}]},{id:'b@test',name:'معلم ب',phone:'0507654321',assignments:[{grade:'5 ابتدائي',section:'أ'}]}];
const supervisor={id:'super-a',supervisorType:'supervisor',assignedTeacherEmails:['a@test']},ctx=V.makeContext(supervisor,teachers);
for(const kind of ['studentFollowupEvents','studentClassAttendance']){
 const rows=[{id:'own',teacherEmail:'a@test',grade:'5 ابتدائي',section:'أ'},{id:'other',teacherEmail:'b@test',grade:'5 ابتدائي',section:'أ'},{id:'missing',grade:'5 ابتدائي',section:'أ'},{id:'other-class',teacherEmail:'a@test',grade:'6 ابتدائي',section:'أ'}];
 assert.deepEqual(V.scopeRecords(kind,rows,ctx).map(x=>x.id),['own'],kind+' must not include another teacher in the same class or an unidentified author');
 assert.equal(V.scopeRecords(kind,rows,V.makeContext({...supervisor,assignedTeacherEmails:[]},teachers)).length,0);
}
const leaders=[{id:'weekly-a',role:'classLeader',name:'معلم أ',username:'a@test',grade:'الخامس الابتدائي',section:'أ'},{id:'weekly-b',role:'classLeader',name:'معلم ب',username:'b@test',grade:'الخامس الابتدائي',section:'أ'},{id:'name-only',role:'classLeader',name:'معلم أ',username:'unrelated'},{id:'admin',role:'admin',username:'a@test'}];
assert.deepEqual(V.matchWeeklyLeaders(ctx.teachers,leaders).map(x=>x.leader.id),['weekly-a']);
assert.deepEqual(V.matchWeeklyLeaders(ctx.teachers,[{id:'phone',role:'classLeader',phone:'966501234567'}]).map(x=>x.leader.id),['phone']);
assert.equal(V.matchWeeklyLeaders(ctx.teachers,[{id:'x',role:'classLeader',username:'a@test'},{id:'y',role:'classLeader',username:'a@test'}]).length,0,'ambiguous linked accounts must not expose plans');
assert.equal(V.matchWeeklyLeaders(ctx.teachers,[{id:'x',role:'classLeader',name:'معلم أ'}]).length,0,'names alone are not an account link');
assert.equal(V.matchWeeklyLeaders([{id:'0501234567'}],[{id:'phone-id',role:'classLeader',username:'966501234567'}]).length,1);
console.log('PASS: same-class teacher ownership, empty assignment isolation, weekly username/phone links, changed class spelling, ambiguous accounts and duplicate names.');
