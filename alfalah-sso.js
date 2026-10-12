import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, limit, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const SESSION_KEY="alfalah.gate.session.v1";
const TTL=8*60*60*1000;

const rasedConfig={
  apiKey:"AIzaSyAfgSV-6_IMkXncgPWxY69omKfvFtGakgk",
  authDomain:"results2026-7c0dd.firebaseapp.com",
  projectId:"results2026-7c0dd",
  storageBucket:"results2026-7c0dd.firebasestorage.app",
  messagingSenderId:"241421115694",
  appId:"1:241421115694:web:96f55fd9fd1d5b18b31abf"
};
const weeklyConfig={
  apiKey:"AIzaSyBYxW_pdFvE1VZyDoTok4-EutPe6oigJhY",
  authDomain:"weekly-plan-3a743.firebaseapp.com",
  projectId:"weekly-plan-3a743",
  storageBucket:"weekly-plan-3a743.firebasestorage.app",
  messagingSenderId:"575884603803",
  appId:"1:575884603803:web:e8c4d82c69fd545bed313e"
};
const visitConfig={
  apiKey:"AIzaSyBbUryd9blqEG60L15-L_wU8-NORoHq4r4",
  authDomain:"visit-2026.firebaseapp.com",
  projectId:"visit-2026",
  storageBucket:"visit-2026.firebasestorage.app",
  messagingSenderId:"355064530699",
  appId:"1:355064530699:web:26ad1710ff493c76ce840e"
};

function getOrInit(config,name){
  const found=getApps().find(a=>a.name===name);
  return found||initializeApp(config,name);
}
const rasedApp=getOrInit(rasedConfig,"rasedGateSSO");
const rasedDb=getFirestore(rasedApp);
const visitApp=getOrInit(visitConfig,"visitGateSSO");
const visitDb=getFirestore(visitApp);
const weeklyApp=getApps().find(a=>a.name==="[DEFAULT]")||initializeApp(weeklyConfig);
const weeklyDb=getFirestore(weeklyApp);
const weeklyAuth=getAuth(weeklyApp);

const $=id=>document.getElementById(id);

function readSession(){
  try{
    const s=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
    if(!s||!s.username||!s.expiresAt)return null;
    if(Number(s.expiresAt)<=Date.now()){localStorage.removeItem(SESSION_KEY);return null}
    return s;
  }catch{return null}
}
function saveSession(s){
  s.expiresAt=Date.now()+TTL;
  localStorage.setItem(SESSION_KEY,JSON.stringify(s));
  return s;
}
function clearRasedSession(){
  ["currentUserRole","currentUser","currentUserName","currentUserEmail","currentUserType","currentUserPermissions"].forEach(k=>{
    localStorage.removeItem(k);sessionStorage.removeItem(k);
  });
  sessionStorage.removeItem("rasedTabAuthReady");
}
function setRased(k,v){
  if(v===undefined||v===null||v===""){localStorage.removeItem(k);sessionStorage.removeItem(k);return}
  localStorage.setItem(k,String(v));sessionStorage.setItem(k,String(v));
}
function seedRasedSession(s){
  clearRasedSession();
  sessionStorage.setItem("rasedTabAuthReady","1");
  setRased("currentUserRole",s.rasedRole);
  setRased("currentUser",s.username);
  setRased("currentUserEmail",s.username);
  setRased("currentUserName",s.name||s.username);
  if(s.currentUserType)setRased("currentUserType",s.currentUserType);
  if(s.permissions)setRased("currentUserPermissions",JSON.stringify(s.permissions));
}
function normalizePhone(raw){
  let p=String(raw||"").replace(/\D/g,"");
  if(p.startsWith("00966"))p=p.slice(2);
  if(p.startsWith("966"))return p;
  if(/^05\d{8}$/.test(p))return "966"+p.slice(1);
  if(/^5\d{8}$/.test(p))return "966"+p;
  return p;
}
async function findRasedUser(username){
  let d=await getDoc(doc(rasedDb,"users",username));
  if(d.exists())return {id:d.id,...d.data()};
  const lower=username.toLowerCase();
  if(lower!==username){
    d=await getDoc(doc(rasedDb,"users",lower));
    if(d.exists())return {id:d.id,...d.data()};
  }
  return null;
}
async function rasedLogin(username,password,type){
  const u=String(username||"").trim();
  if(type==="supervision"&&u.toLowerCase()==="manager"&&password==="123456"){
    return {username:"manager",name:"أحمد سمير",rasedRole:"manager",sourceRole:"manager",type};
  }
  const data=await findRasedUser(u);
  if(!data||String(data.password??"")!==String(password))throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");
  const role=String(data.role||"").trim().toLowerCase();
  if(type==="teacher"&&role!=="teacher")throw new Error("هذا الحساب ليس حساب معلم.");
  if(type==="supervision"&&!["supervisor","admin","superadmin","student_counselor","activity_leader","manager"].includes(role))throw new Error("هذا الحساب غير مفعّل ضمن بوابة الإشراف والإدارة.");
  let rasedRole=role;
  if(role==="admin")rasedRole="superadmin";
  return {
    username:data.id||u.toLowerCase(),
    name:data.name||u,
    type,
    sourceRole:role,
    rasedRole,
    currentUserType:role==="supervisor"?String(data.supervisorType||"general_supervisor"):"",
    phone:data.phone||data.mobile||"",
    permissions:role==="supervisor"&&data.permissions&&typeof data.permissions==="object"?data.permissions:null
  };
}
async function linkWeekly(s,password){
  try{
    if(typeof weeklyAuth.authStateReady==="function")await weeklyAuth.authStateReady();
    let cred=weeklyAuth.currentUser;
    if(!cred){
      const email=s.type==="teacher"
        ? s.username.toLowerCase()+"@weeklyplan.local"
        : "muhammadamer1618@gmail.com";
      cred=(await signInWithEmailAndPassword(weeklyAuth,email,password)).user;
    }
    const snap=await getDoc(doc(weeklyDb,"users",cred.uid));
    if(!snap.exists())throw new Error("weekly user missing");
    const data=snap.data()||{};
    const expected=s.type==="teacher"?"classLeader":"admin";
    if(data.active===false||data.role!==expected)throw new Error("weekly role mismatch");
    sessionStorage.setItem("weeklyPlanUserName",data.name||"");
    sessionStorage.setItem("weeklyPlanUserRole",data.role||"");
    sessionStorage.setItem("weeklyPlanUserId",cred.uid);
    s.weeklyReady=true;
    s.weeklyName=data.name||"";
  }catch(e){
    s.weeklyReady=false;
    try{await signOut(weeklyAuth)}catch{}
  }
}
async function linkTeacherVisits(s){
  try{
    let teacher=null;
    const rasedTeacher=await getDoc(doc(rasedDb,"teachers",s.username));
    const phone=normalizePhone(rasedTeacher.exists()?(rasedTeacher.data().phone||""):"");
    if(phone){
      const q=await getDocs(query(collection(visitDb,"teachers"),where("phone","==",phone),limit(5)));
      q.forEach(d=>{if(!teacher&&(d.data().active!==false))teacher={id:d.id,...d.data()}});
    }
    if(!teacher){
      const direct=await getDoc(doc(visitDb,"teachers",s.username));
      if(direct.exists()&&direct.data().active!==false)teacher={id:direct.id,...direct.data()};
    }
    if(!teacher){
      const q=await getDocs(query(collection(visitDb,"teachers"),where("code","==",s.username),limit(1)));
      if(!q.empty){const d=q.docs[0];teacher={id:d.id,...d.data()}}
    }
    if(!teacher)throw new Error("teacher not linked");
    const value=JSON.stringify({id:teacher.id,code:teacher.code||teacher.id,name:teacher.name||s.name||""});
    sessionStorage.setItem("currentTeacher",value);
    localStorage.setItem("currentTeacher",value);
    s.followupReady=true;
    s.followupRole="teacher";
  }catch(e){s.followupReady=false}
}
async function linkSupervisorVisits(s){
  try{
    const wantedPhone=normalizePhone(s.phone||"");
    if(!wantedPhone)throw new Error("supervisor phone missing in Rased");

    const all=await getDocs(collection(visitDb,"supervisors"));
    const candidates=all.docs.filter(x=>{
      const data=x.data()||{};
      return [
        data.username,
        data.phone,
        data.mobile
      ].some(v=>normalizePhone(v)===wantedPhone);
    });

    if(candidates.length!==1){
      throw new Error(candidates.length>1?"duplicate visit supervisor phone":"visit supervisor phone not found");
    }

    const d=candidates[0];
    const data=d.data()||{};
    if(data.active===false)throw new Error("visit supervisor account inactive");

    const value=JSON.stringify({
      id:d.id,
      name:data.name||s.name||"",
      username:data.username||data.phone||data.mobile||s.phone||"",
      phone:data.phone||data.mobile||s.phone||"",
      gateUsername:s.username,
      role:data.role||"supervisor",
      canVisitAllTeachers:data.canVisitAllTeachers===true
    });

    sessionStorage.setItem("currentSupervisor",value);
    localStorage.setItem("currentSupervisor",value);
    s.followupReady=true;
    s.followupRole=data.role||"supervisor";
    return true;
  }catch(e){
    console.warn("VISIT SSO LINK ERROR",e);
    s.followupReady=false;
    return false;
  }
}
async function refreshLinkedState(s){
  try{
    if(typeof weeklyAuth.authStateReady==="function")await weeklyAuth.authStateReady();
    if(weeklyAuth.currentUser){
      const d=await getDoc(doc(weeklyDb,"users",weeklyAuth.currentUser.uid));
      if(d.exists()){
        const x=d.data()||{},expected=s.type==="teacher"?"classLeader":"admin";
        if(x.active!==false&&x.role===expected){
          s.weeklyReady=true;
          sessionStorage.setItem("weeklyPlanUserName",x.name||"");
          sessionStorage.setItem("weeklyPlanUserRole",x.role||"");
          sessionStorage.setItem("weeklyPlanUserId",weeklyAuth.currentUser.uid);
        }
      }
    }
  }catch{}
  if(s.type==="teacher"){
    const raw=sessionStorage.getItem("currentTeacher")||localStorage.getItem("currentTeacher");
    if(raw)s.followupReady=true;
  }else{
    let linked=false;
    try{
      const x=JSON.parse(localStorage.getItem("currentSupervisor")||sessionStorage.getItem("currentSupervisor")||"null");
      const sameGate=String(x?.gateUsername||"")===String(s.username||"");
      const samePhone=normalizePhone(x?.phone||x?.username||"")===normalizePhone(s.phone||"") && !!normalizePhone(s.phone||"");
      if(x&&(sameGate||samePhone)){
        s.followupReady=true;
        s.followupRole=x.role||"supervisor";
        linked=true;
      }
    }catch{}
    if(!linked){
      await linkSupervisorVisits(s);
    }
  }
  saveSession(s);
}
function rasedUrl(s){
  if(s.type==="teacher")return "rased/teacher.html";
  if(s.rasedRole==="manager")return "rased/manager.html";
  if(s.rasedRole==="superadmin")return "rased/admin.html";
  if(s.rasedRole==="student_counselor")return "rased/student-counselor.html";
  if(s.rasedRole==="activity_leader")return "rased/activity-leader.html";
  if(s.rasedRole==="supervisor")return "rased/supervisor-dashboard.html";
  return "rased/index.html";
}
function followupUrl(s){
  if(s.type==="teacher")return s.followupReady?"follow-up/teacher-portal.html":"follow-up/teacher-portal.html";
  if(!s.followupReady)return "follow-up/supervisor-login.html";
  if(s.followupRole==="admin")return "follow-up/admin-dashboard.html";
  if(s.followupRole==="general_supervisor")return "follow-up/general-supervisor-reports.html";
  return "follow-up/supervisor-dashboard.html";
}
function weeklyUrl(s){
  if(s.type==="teacher")return s.weeklyReady?"weekly/teacher.html":"weekly/index.html";
  return s.weeklyReady?"weekly/admin.html":"weekly/admin-login.html";
}
function serviceRows(s){
  const isTeacher=s.type==="teacher";
  return [
    {
      name:isTeacher?"منصة المعلم":"منصة المشرف",
      desc:isTeacher
        ?"جميع خدمات المعلم في منصة واحدة"
        :"جميع خدمات المشرف في منصة واحدة",
      url:rasedUrl(s),
      ok:true
    }
  ];
}
function renderServices(s){
  const title=$("modalTitle"),list=$("systemList"),modal=$("portalModal");
  title.textContent=s.type==="teacher"?"خدمات المعلم":"خدمات المشرف";
  list.innerHTML="";
  serviceRows(s).forEach(x=>{
    const a=document.createElement("a");
    a.className="system-link";
    a.href=x.url;
    a.innerHTML='<div class="system-text"><strong>'+x.name+'</strong><span>'+x.desc+'</span></div><div class="arrow">'+(x.ok?"✓":"←")+'</div>';
    list.appendChild(a);
  });
  modal.classList.add("open");
}
function showLogin(type){
  const title=$("modalTitle"),list=$("systemList"),modal=$("portalModal");
  title.textContent=type==="teacher"?"دخول المعلم":"دخول الإشراف والإدارة";
  list.innerHTML='<div class="phone-area"><div class="phone-big-icon">🔐</div><h4>الدخول الموحد</h4><p>أدخل بيانات حساب راصد مرة واحدة للوصول إلى خدماتك.</p><input id="gateUsername" class="phone-input" type="text" autocomplete="username" placeholder="اسم المستخدم" style="direction:rtl"><input id="gatePassword" class="phone-input" type="password" autocomplete="current-password" placeholder="كلمة المرور" style="direction:rtl;margin-top:10px"><button id="gateLoginBtn" class="phone-btn" type="button">دخول</button><div id="gateMessage" class="message"></div></div>';
  modal.classList.add("open");
  const user=$("gateUsername"),pass=$("gatePassword"),btn=$("gateLoginBtn"),msg=$("gateMessage");
  const go=async()=>{
    const username=user.value.trim(),password=pass.value;
    msg.textContent="";
    if(!username||!password){msg.style.color="#b42318";msg.textContent="أدخل اسم المستخدم وكلمة المرور.";return}
    btn.disabled=true;btn.textContent="جاري التحقق...";
    try{
      localStorage.removeItem("currentTeacher");sessionStorage.removeItem("currentTeacher");
      localStorage.removeItem("currentSupervisor");sessionStorage.removeItem("currentSupervisor");
      const s=await rasedLogin(username,password,type);
      seedRasedSession(s);
      if(type==="teacher"){
        await linkWeekly(s,password);
        await linkTeacherVisits(s);
      }else if(["supervisor","superadmin","manager"].includes(s.rasedRole)){
        await linkWeekly(s,password);
        await linkSupervisorVisits(s);
      }
      saveSession(s);
      showAccountChip(s);
      window.location.href=rasedUrl(s);
    }catch(e){
      msg.style.color="#b42318";msg.textContent=e.message||"تعذر تسجيل الدخول.";
    }finally{btn.disabled=false;btn.textContent="دخول"}
  };
  btn.onclick=go;
  pass.addEventListener("keydown",e=>{if(e.key==="Enter")go()});
  setTimeout(()=>user.focus(),50);
}
function showAccountChip(s){
  let chip=document.getElementById("alfalahGateAccount");
  if(chip)chip.remove();
  chip=document.createElement("div");
  chip.id="alfalahGateAccount";
  chip.innerHTML='<span>👤 <b>'+String(s.name||s.username).replace(/[<>&"]/g,"")+'</b></span><button type="button">خروج</button>';
  chip.style.cssText="position:fixed;left:10px;top:10px;z-index:90;background:#fffdf8;border:1px solid rgba(201,151,44,.55);border-radius:14px;padding:7px 10px;display:flex;gap:8px;align-items:center;color:#004c3f;font-family:Tajawal,Tahoma,Arial,sans-serif;font-size:12px;box-shadow:0 7px 20px #0002";
  const b=chip.querySelector("button");
  b.style.cssText="border:0;border-radius:9px;background:#f3ead5;color:#7a5411;padding:6px 8px;font-family:inherit;font-weight:800;cursor:pointer";
  b.onclick=logoutUnified;
  document.body.appendChild(chip);
}
async function logoutUnified(){
  localStorage.removeItem(SESSION_KEY);
  clearRasedSession();
  ["weeklyPlanUserName","weeklyPlanUserRole","weeklyPlanUserId","currentTeacher","currentSupervisor"].forEach(k=>{sessionStorage.removeItem(k);localStorage.removeItem(k)});
  try{await signOut(weeklyAuth)}catch{}
  document.getElementById("alfalahGateAccount")?.remove();
  $("portalModal")?.classList.remove("open");
}
async function openUnified(type){
  let s=readSession();
  if(!s||s.type!==type){showLogin(type);return}
  seedRasedSession(s);
  await refreshLinkedState(s);
  showAccountChip(s);
  window.location.href=rasedUrl(s);
}
function install(){
  const timer=setInterval(()=>{
    if(typeof window.openPortal!=="function"||!$("portalModal"))return;
    clearInterval(timer);
    window.openPortal=openUnified;
    const s=readSession();
    if(s){seedRasedSession(s);refreshLinkedState(s).then(()=>showAccountChip(s))}
  },50);
  setTimeout(()=>clearInterval(timer),5000);
}
install();
