 "use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Award, Bell, Check, ChevronLeft, ChevronRight, Coins, LayoutDashboard,
  LogOut, Mail, Menu, PawPrint, Search, ShieldCheck, ShoppingBag, Users, UsersRound,
  X, RefreshCw, Send, Plus, Pencil, Ban, CheckCircle2, ClipboardList, Gift, HeartPulse,
  History, Crown, Trash2, Eye, RotateCcw, Filter, Sparkles, CalendarDays, ShieldOff,
} from "lucide-react";
import Brand from "@/components/Brand";
import { request, getAdmin, peekCached, prefetch } from "@/lib/api";

type Section =
  | "overview" | "users" | "pets" | "contacts" | "guardians" | "guardianMembers" | "guardianInvites"
  | "rewards" | "rewardLedger" | "achievements" | "referrals" | "catalog"
  | "stickerOwnership" | "tasks" | "taskHistory" | "health" | "frameUnlocks" | "rankUsers" | "rankPets"
  | "notifications" | "audit";
type Row = Record<string, any>;
type Field = { key: string; label: string; type?: "text"|"number"|"email"|"password"|"date"|"time"|"textarea"|"select"|"checkbox"; options?: string[]; required?: boolean; placeholder?: string };
const nav: {id:Section;label:string;icon:any;group:string}[] = [
  {id:"overview",label:"Overview",icon:LayoutDashboard,group:"WORKSPACE"},
  {id:"users",label:"Users",icon:Users,group:"PEOPLE & PETS"},
  {id:"pets",label:"Pets",icon:PawPrint,group:"PEOPLE & PETS"},
  {id:"frameUnlocks",label:"Avatar frame unlocks",icon:Crown,group:"PEOPLE & PETS"},
  {id:"guardians",label:"Guardian requests",icon:ShieldCheck,group:"PEOPLE & PETS"},
  {id:"guardianMembers",label:"Guardian access",icon:ShieldOff,group:"PEOPLE & PETS"},
  {id:"guardianInvites",label:"Guardian invites",icon:Mail,group:"PEOPLE & PETS"},
  {id:"contacts",label:"Contact inbox",icon:Mail,group:"PEOPLE & PETS"},
  {id:"health",label:"Health & reminders",icon:HeartPulse,group:"PET CARE"},
  {id:"tasks",label:"Tasks",icon:ClipboardList,group:"PET CARE"},
  {id:"taskHistory",label:"Task completion log",icon:History,group:"PET CARE"},
  {id:"rewards",label:"Reward wallets",icon:Coins,group:"GAMIFICATION"},
  {id:"rewardLedger",label:"Reward activity log",icon:History,group:"GAMIFICATION"},
  {id:"referrals",label:"Referrals",icon:UsersRound,group:"GAMIFICATION"},
  {id:"achievements",label:"Achievements & levels",icon:Award,group:"GAMIFICATION"},
  {id:"rankUsers",label:"User rankings",icon:Crown,group:"GAMIFICATION"},
  {id:"rankPets",label:"Pet rankings",icon:Crown,group:"GAMIFICATION"},
  {id:"catalog",label:"Sticker & avatar catalog",icon:ShoppingBag,group:"APP CONTENT"},
  {id:"stickerOwnership",label:"Sticker purchase log",icon:Gift,group:"APP CONTENT"},
  {id:"notifications",label:"Notifications",icon:Bell,group:"APP CONTENT"},
  {id:"audit",label:"Admin audit log",icon:Activity,group:"SYSTEM"},
];
const endpoint: Partial<Record<Section,string>> = {
  users:"/admin/users",pets:"/admin/pets",contacts:"/admin/contacts",guardians:"/admin/guardians",
  guardianMembers:"/admin/guardians/members",guardianInvites:"/admin/guardians/invites",health:"/admin/health",frameUnlocks:"/admin/pets/frames",tasks:"/admin/tasks",
  taskHistory:"/admin/tasks/completions",rewards:"/admin/rewards",rewardLedger:"/admin/rewards/ledger",
  referrals:"/admin/referrals",achievements:"/admin/achievements",catalog:"/admin/catalog",
  stickerOwnership:"/admin/catalog/ownership",notifications:"/admin/notifications",audit:"/admin/audit",
  rankUsers:"/admin/rankings/users",rankPets:"/admin/rankings/pets",
};
const fields: Partial<Record<Section,Field[]>> = {
  users:[{key:"name",label:"Full name",required:true},{key:"email",label:"Email",type:"email",required:true},{key:"phone",label:"Phone"},{key:"verified",label:"Email verified",type:"checkbox"},{key:"password",label:"Initial password",type:"password"}],
  pets:[{key:"ownerId",label:"Owner user ID",required:true},{key:"name",label:"Pet name",required:true},{key:"type",label:"Pet type",type:"select",options:["dog","cat","rabbit","bird","other"],required:true},{key:"breed",label:"Breed"},{key:"gender",label:"Gender",type:"select",options:["male","female","unknown"]},{key:"birthDate",label:"Birth date",type:"date"},{key:"weightKg",label:"Weight (kg)",type:"number"},{key:"avatarKey",label:"Avatar key",required:true}],
  health:[{key:"petId",label:"Pet ID",required:true},{key:"type",label:"Record type",type:"select",options:["vaccination","deworming","flea_tick","vet_visit","checkup","medication","weight","allergy","condition","surgery","dental","lab_test","grooming","other"],required:true},{key:"title",label:"Title",required:true},{key:"date",label:"Date",type:"date",required:true},{key:"nextDueDate",label:"Next due date",type:"date"},{key:"weightKg",label:"Weight (kg)",type:"number"},{key:"vetName",label:"Veterinarian"},{key:"dosage",label:"Dosage"},{key:"repeatEveryDays",label:"Repeat every (days)",type:"number"},{key:"reminderDaysBefore",label:"Remind days before",type:"number"},{key:"notes",label:"Notes",type:"textarea"}],
  catalog:[{key:"kind",label:"Type",type:"select",options:["sticker","avatar"],required:true},{key:"key",label:"Unique asset key",required:true},{key:"label",label:"Display name"},{key:"petType",label:"Pet type",type:"select",options:["all","dog","cat","rabbit","bird"]},{key:"sortOrder",label:"Sort order",type:"number"},{key:"price",label:"Paw Points price",type:"number"},{key:"active",label:"Visible in app",type:"checkbox"}],
  tasks:[{key:"petId",label:"Pet ID",required:true},{key:"title",label:"Task title",required:true},{key:"category",label:"Category",type:"select",options:["food","water","walk","play","grooming","training","medication","vet","hygiene","other"],required:true},{key:"note",label:"Description",type:"textarea"},{key:"recurrence",label:"Recurrence JSON",type:"textarea",required:true,placeholder:'{"type":"daily","daysOfWeek":[],"startDate":"2026-11-03","endDate":null}'},{key:"timeOfDay",label:"Time of day (HH:MM)"},{key:"reminder",label:"Reminder JSON",type:"textarea",required:true,placeholder:'{"enabled":true,"minutesBefore":0,"sound":true,"vibrate":true}'}],
  notifications:[{key:"title",label:"Notification title",required:true},{key:"body",label:"Message",type:"textarea",required:true}],
};
const titleCase=(s:string)=>s.replace(/([A-Z])/g," $1").replace(/_/g," ").replace(/^./,x=>x.toUpperCase());
const idOf=(r:Row)=>String(r.id||r._id||"");
const fmt=(v:any):string=>{
  if(v===null||v===undefined||v==="") return "—";
  if(typeof v==="boolean") return v?"Yes":"No";
  if(Array.isArray(v)) return v.length? v.map(fmt).join(", "):"—";
  if(typeof v==="object") return v.name || v.label || v.email || v.title || v.id || v._id || JSON.stringify(v);
  if(typeof v==="string" && /^\d{4}-\d\d-\d\dT/.test(v)) return new Date(v).toLocaleString();
  return String(v);
};
const displayId=(r:Row)=>r.name||r.title||r.label||r.email||r.id||r._id||"Record";
function person(v:any){return v?`${v.name||"Unknown"}${v.email?` · ${v.email}`:""}`:"—";}
function defaultFilters(section:Section){
  if(section==="guardians")return [{value:"",label:"All requests"},{value:"pending",label:"Pending"},{value:"approved",label:"Approved"},{value:"rejected",label:"Rejected"}];
  if(section==="referrals")return [{value:"",label:"All referrals"},{value:"false",label:"Reward pending"},{value:"true",label:"Handled"}];
  if(section==="health")return [{value:"",label:"All health records"},{value:"overdue",label:"Overdue"},{value:"today",label:"Due today"},{value:"soon",label:"Due in 7 days"},{value:"completed",label:"Completed"}];
  if(section==="catalog")return [{value:"",label:"All assets"},{value:"sticker",label:"Stickers"},{value:"avatar",label:"Avatar frames"}];
  if(section==="rankUsers"||section==="rankPets")return [{value:"all",label:"All time"},{value:"week",label:"Last 7 days"},{value:"month",label:"Last 30 days"}];
  return [];
}
export default function Dashboard(){
  const router=useRouter();
  const [admin,setAdmin]=useState<Row|null>(null);
  const [section,setSection]=useState<Section>("overview");
  const [sidebar,setSidebar]=useState(true);
  const [data,setData]=useState<Row[]>([]);
  const [stats,setStats]=useState<Row|null>(null);
  const [pagination,setPagination]=useState({page:1,limit:25,total:0,pages:1});
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [filter,setFilter]=useState("");
  const [sortBy,setSortBy]=useState("");
  const [sortOrder,setSortOrder]=useState("desc");
  const [selected,setSelected]=useState<Row|null>(null);
  const [modal,setModal]=useState<{mode:"create"|"edit"|"adjust"|"confirm"|"grant"|"reply";row?:Row;action?:string}|null>(null);
  const [form,setForm]=useState<Record<string,any>>({});
  const [busy,setBusy]=useState(false);
  const [reply,setReply]=useState("");
  const [page,setPage]=useState(1);
  const [searchDebounced,setSearchDebounced]=useState("");

  useEffect(()=>{const timer=setTimeout(()=>setSearchDebounced(search.trim()),600);return()=>clearTimeout(timer);},[search]);
  const queryFor=useCallback((p:number,term:string)=>{
    const q=new URLSearchParams({page:String(p),limit:"25"});
    if(term)q.set("search",term);
    if(filter){
      if(section==="guardians")q.set("status",filter);
      else if(section==="referrals")q.set("rewarded",filter);
      else if(section==="health")q.set("status",filter);
      else if(section==="catalog")q.set("kind",filter);
    }
    if(sortBy){q.set("sort",sortBy);q.set("order",sortOrder);}
    if(section==="rankUsers"||section==="rankPets"){
      q.set("by",sortBy || (section==="rankUsers"?"lifetime":"xp"));
      q.set("period",filter||"all");
      q.delete("sort");q.delete("order");
    }
    return q.toString();
  },[filter,section,sortBy,sortOrder]);
  const loadSeq=useRef(0);
  const load=useCallback(async(p=1,term=searchDebounced)=>{
    const mine=++loadSeq.current; // only the newest request may update the screen
    const path=section==="overview"?"/admin/overview":`${endpoint[section]}?${queryFor(p,term)}`;
    const apply=(result:any)=>{
      if(section==="overview"){setStats(result.stats||{});setData([]);return;}
      setData(result.items||result.users||result.requests||[]);
      const pg=result.pagination||{};
      setPagination({page:pg.page||p,limit:pg.limit||25,total:pg.total??pg.totalUsers??0,pages:pg.pages??pg.totalPages??1});
    };
    setError("");
    /* Already visited? Show it instantly, then re-check quietly (a 304 means nothing changed). */
    const saved=peekCached(path);
    if(saved){apply(saved);setLoading(false);}else setLoading(true);
    const sessionLost=(msg:string)=>{if(/log in|session|unauthorized/i.test(msg))router.replace("/login");};
    getAdmin().then(a=>{if(mine===loadSeq.current)setAdmin(a);}).catch(e=>sessionLost(e instanceof Error?e.message:""));
    try{
      const result=await request(path);
      if(mine!==loadSeq.current)return;
      apply(result);
      /* Fill the cache for the busiest sections while the admin reads this one. */
      if(section==="overview")prefetch(["users","pets","tasks","health","contacts","guardians","notifications","rewards"].map(k=>`${endpoint[k as Section]}?page=1&limit=25`));
    }catch(e){
      if(mine!==loadSeq.current)return;
      const msg=e instanceof Error?e.message:"Unable to load data";
      /* Fallback: keep the saved table on screen and say so, instead of an empty page. */
      setError(saved?`Showing saved data - ${msg}`:msg);
      sessionLost(msg);
    }
    finally{if(mine===loadSeq.current)setLoading(false);}
  },[router,section,searchDebounced,queryFor]);
  useEffect(()=>{setPage(1);setFilter("");setSortBy("");setSortOrder("desc");},[section]);
  useEffect(()=>{load(page,searchDebounced);},[load,page,searchDebounced]);
  async function logout(){try{await request("/auth/logout",{method:"POST",body:{}});}finally{router.replace("/login");}}
  const columns=useMemo(()=>{
    if(!data.length)return [];
    const preferred:Partial<Record<Section,string[]>>={
      users:["name","email","phone","isEmailVerified","level","totalXp","petCount","createdAt"],
      pets:["name","type","breed","owner","level","xp","streak","activeFrameKey","unlockedFrameKeys","createdAt"],
      frameUnlocks:["pet","owner","level","xp","unlockedFrameKeys","activeFrameKey"],
      contacts:["name","email","subject","status","replyCount","createdAt"],
      guardians:["pet","requester","status","createdAt"],
      guardianMembers:["pet","user","role","permissions","since"],
      guardianInvites:["pet","createdBy","expiresAt","useCount","maxUses","active","createdAt"],
      health:["pet","owner","type","title","date","nextDueDate","status"],
      tasks:["title","pet","category","points","xp","completions","archived"],
      taskHistory:["task","pet","user","pointsAwarded","xpAwarded","date"],
      rewards:["user","pawPoints","lifetimePoints","updatedAt"],
      rewardLedger:["user","pet","kind","points","xp","createdAt"],
      achievements:["user","pet","title","key","unlockedAt"],
      referrals:["referrer","referee","code","rewarded","rewardSkipped","rewardedAt","createdAt"],
      catalog:["kind","key","label","petType","price","active","sortOrder"],
      stickerOwnership:["user","stickerLabel","stickerKey","pricePaid","purchasedAt"],
      notifications:["user","type","title","body","read","createdAt"],
      rankUsers:["rank","user","level","totalXp","petCount","achievements","value"],
      rankPets:["rank","pet","owner","level","xp","streak","achievements","value"],
      audit:["admin","action","entity","entityId","summary","createdAt"],
    };
    return (preferred[section]||Object.keys(data[0])).filter(k=>data.some(r=>r[k]!==undefined)).slice(0,9);
  },[data,section]);
  const sectionTitle=nav.find(x=>x.id===section)?.label||"Overview";
  function startCreate(){setForm({active:true,price:0,petType:"all",verified:true,reminderDaysBefore:1,recurrence:JSON.stringify({type:"daily",daysOfWeek:[],startDate:new Date().toISOString().slice(0,10),endDate:null},null,2),reminder:JSON.stringify({enabled:true,minutesBefore:0,sound:true,vibrate:true},null,2)});setModal({mode:"create"});}
  function startEdit(row:Row){const f:Record<string,any>={};(fields[section]||[]).forEach(x=>{let v=x.key==="verified"?row.isEmailVerified:row[x.key];if(v&&typeof v==="object"&&v.id)v=v.id;if((x.key==="recurrence"||x.key==="reminder")&&v&&typeof v==="object")v=JSON.stringify(v,null,2);f[x.key]=v??(x.type==="checkbox"?false:"");});setForm(f);setModal({mode:"edit",row});}
  function startAction(row:Row,action:string){setModal({mode:"confirm",row,action});}
  async function mutate(path:string,method:string,body?:Row){
    setBusy(true);setError("");setNotice("");
    try{const result=await request(path,{method,body});setNotice(result.message||"Changes saved successfully.");setModal(null);setSelected(null);await load(page);}
    catch(e){setError(e instanceof Error?e.message:"Action failed");}
    finally{setBusy(false);}
  }
  function openCreate(){if(section==="notifications"){setForm({title:"",body:"",push:true,audienceAll:true});setModal({mode:"create"});return;}if(section==="achievements"){setForm({petId:"",key:""});setModal({mode:"grant"});return;}startCreate();}
  async function submitForm(){
    const row=modal?.row;const id=idOf(row||{});
    const body:Row={...form};
    Object.keys(body).forEach(k=>{if(body[k]===""||body[k]===undefined||(k==="password"&&modal?.mode==="edit"))delete body[k];});
    for(const key of ["recurrence","reminder"]){if(typeof body[key]==="string"&&body[key]){try{body[key]=JSON.parse(body[key]);}catch{setError(`${titleCase(key)} must be valid JSON.`);return;}}}
    if(section==="tasks"&&modal?.mode==="create"){body.recurrence??={type:"daily",daysOfWeek:[],startDate:new Date().toISOString().slice(0,10),endDate:null};body.reminder??={enabled:true,minutesBefore:0,sound:true,vibrate:true};}
    if(section==="health"&&modal?.mode==="create")body.reminderDaysBefore=Number(body.reminderDaysBefore??1);
    if(section==="health"&&body.reminderDaysBefore!==undefined)body.reminderDaysBefore=Number(body.reminderDaysBefore);
    if(section==="health"&&body.repeatEveryDays!==undefined)body.repeatEveryDays=Number(body.repeatEveryDays);
    if(section==="health"&&body.weightKg!==undefined)body.weightKg=Number(body.weightKg);
    if(section==="users"&&modal?.mode==="create")body.password=String(form.password||"");
    if(section==="users"&&modal?.mode==="edit"){if(body.verified!==undefined)body.isEmailVerified=body.verified;delete body.verified;}
    if(modal?.mode==="edit"){delete body.ownerId;delete body.petId;}
    if(section==="catalog"&&modal?.mode==="edit"){delete body.kind;delete body.key;}
    const path=endpoint[section]||"";
    if(modal?.mode==="adjust"){
      const uid=String(row?.user?.id||row?.user?._id||row?.userId||"");
      return mutate(`/admin/rewards/${uid}/adjust`,"POST",{points:Number(form.points),note:String(form.note||"Admin reward adjustment")});
    }
    if(modal?.mode==="reply"&&row)return mutate(`/admin/contacts/${id}/reply`,"POST",{message:String(form.message||""),resolve:Boolean(form.resolve)});
    if(modal?.mode==="grant"){
      if(section==="referrals")return mutate(`/admin/referrals/${id}/reward`,"POST",{note:String(form.note||"Manual referral reward")});
      if(section==="achievements")return mutate("/admin/achievements/grant","POST",{petId:String(form.petId||""),key:String(form.key||"")});
      if(section==="pets"&&modal.action==="xp")return mutate(`/admin/pets/${id}/grant-xp`,"POST",{xp:Number(form.xp),note:String(form.note||"Admin XP grant")});
    }
    if(modal?.mode==="create"&&section==="notifications"){
      const payload={title:String(form.title||""),body:String(form.body||""),push:true,audience:{all:Boolean(form.audienceAll)}};
      return mutate(path,"POST",payload);
    }
    if(modal?.mode==="create")return mutate(path,"POST",body);
    if(modal?.mode==="edit")return mutate(`${path}/${id}`,"PATCH",body);
  }
  async function runAction(){
    if(!modal?.row)return;
    const row=modal.row,id=idOf(row),action=modal.action;
    const path=endpoint[section]||"";
    if(section==="users"){
      if(action==="toggle")return mutate(`${path}/${id}`,"PATCH",{disabled:!row.disabledAt});
      if(action==="revoke")return mutate(`${path}/${id}/revoke-sessions`,"POST",{});
      if(action==="delete")return mutate(`${path}/${id}`,"DELETE",section==="users"?{confirmEmail:String(row.email||"")}:undefined);
    }
    if(section==="pets"){
      if(action==="delete")return mutate(`${path}/${id}`,"DELETE",section==="pets"?{confirmName:String(row.name||"")}:undefined);
      if(action==="qr")return mutate(`${path}/${id}/regenerate-qr`,"POST",{});
      if(action==="xp") {setForm({xp:100,note:"Bonus XP granted by PetCard admin"});setModal({mode:"grant",row,action:"xp"});return;}
    }
    if(section==="health"){
      if(action==="delete")return mutate(`${path}/${id}`,"DELETE",{confirmName:String(row.name||"")});
      if(action==="complete")return mutate(`${path}/${id}/complete`,"POST",{});
    }
    if(section==="tasks"){
      if(action==="archive")return mutate(`${path}/${id}/archive`,"POST",{});
      if(action==="unarchive")return mutate(`${path}/${id}/unarchive`,"POST",{});
      if(action==="delete")return mutate(`${path}/${id}`,"DELETE");
    }
    if(section==="catalog"&&action==="delete")return mutate(`${path}/${id}`,"DELETE");
    if(section==="guardians"){
      return mutate(`${path}/${id}/decision`,"PATCH",{status:action});
    }
    if(section==="guardianMembers"&&action==="revoke")return mutate(`${path}/${id}`,"DELETE");
    if(section==="guardianInvites"&&action==="revoke")return mutate(`${path}/${id}`,"DELETE");
    if(section==="referrals"){
      if(action==="reward")return mutate(`/admin/referrals/${id}/reward`,"POST",{note:"Manually granted by admin."});
      if(action==="skip")return mutate(`/admin/referrals/${id}/skip`,"PATCH",{note:"Marked ineligible by admin."});
    }
    if(section==="achievements"&&action==="revoke")return mutate(`${path}/${id}`,"DELETE");
    if(section==="notifications"&&action==="delete")return mutate(`${path}/${id}`,"DELETE");
    if(section==="contacts"&&action==="delete")return mutate(`${path}/${id}`,"DELETE");
    if(section==="contacts"&&(action==="resolved"||action==="in_progress"))return mutate(`${path}/${id}`,"PATCH",{status:action});
  }
  const actionButton=(label:string,icon:any,fn:()=>void,kind="")=>{const Icon=icon;return <button className={`actionBtn ${kind}`} title={label} aria-label={label} onClick={fn}><Icon size={15}/></button>;};
  function rowActions(row:Row){
    const id=idOf(row);
    return <div className="rowActions">
      {actionButton("View details",Eye,()=>setSelected(row))}
      {(["users","pets","health","catalog","tasks"].includes(section))&&actionButton("Edit",Pencil,()=>startEdit(row))}
      {section==="users"&&<>{actionButton(row.disabledAt?"Reactivate":"Deactivate",row.disabledAt?CheckCircle2:Ban,()=>startAction(row,"toggle"))}{actionButton("Revoke sessions",RotateCcw,()=>startAction(row,"revoke"))}{actionButton("Delete user",Trash2,()=>startAction(row,"delete"),"danger")}</>}
      {section==="pets"&&<>{actionButton("Grant XP",Sparkles,()=>startAction(row,"xp"))}{actionButton("Regenerate QR",RotateCcw,()=>startAction(row,"qr"))}{actionButton("Delete pet",Trash2,()=>startAction(row,"delete"),"danger")}</>}
      {section==="health"&&<>{actionButton("Mark complete",Check,()=>startAction(row,"complete"))}{actionButton("Delete record",Trash2,()=>startAction(row,"delete"),"danger")}</>}
      {section==="tasks"&&<>{actionButton(row.archived?"Restore":"Archive",row.archived?RotateCcw:Ban,()=>startAction(row,row.archived?"unarchive":"archive"))}{actionButton("Delete task",Trash2,()=>startAction(row,"delete"),"danger")}</>}
      {section==="guardians"&&row.status==="pending"&&<>{actionButton("Approve",Check,()=>startAction(row,"approved"),"approve")}{actionButton("Reject",X,()=>startAction(row,"rejected"),"danger")}</>}
      {section==="guardianMembers"&&row.role!=="owner"&&actionButton("Revoke guardian access",ShieldOff,()=>startAction(row,"revoke"),"danger")}
      {section==="guardianInvites"&&row.active&&actionButton("Revoke invite",ShieldOff,()=>startAction(row,"revoke"),"danger")}
      {section==="referrals"&&(!row.rewarded||row.rewardSkipped)&&<>{actionButton("Grant referral reward",Gift,()=>startAction(row,"reward"),"approve")}{actionButton("Mark ineligible",Ban,()=>startAction(row,"skip"),"danger")}</>}
      {section==="achievements"&&actionButton("Revoke achievement",Trash2,()=>startAction(row,"revoke"),"danger")}
      {section==="catalog"&&actionButton("Delete catalog item",Trash2,()=>startAction(row,"delete"),"danger")}
      {section==="notifications"&&actionButton("Delete notification",Trash2,()=>startAction(row,"delete"),"danger")}
      {section==="contacts"&&<>{actionButton("Reply to contact",Mail,()=>{setForm({message:"",resolve:false});setModal({mode:"reply",row});})}{actionButton("Mark resolved",Check,()=>startAction(row,"resolved"),"approve")}{actionButton("Delete message",Trash2,()=>startAction(row,"delete"),"danger")}</>}
      {section==="rewards"&&actionButton("Adjust Paw Points",Coins,()=>{setForm({points:0,note:"Manual admin adjustment"});setModal({mode:"adjust",row});})}
    </div>;
  }
  const filters=defaultFilters(section);
  const canCreate=["users","pets","health","tasks","catalog","notifications","achievements"].includes(section);
  const sortOptions=section==="rankUsers"?["lifetime","points","xp","level","achievements"]:section==="rankPets"?["xp","streak","longestStreak","achievements","tasks"]:section==="rewards"?["lifetimePoints","pawPoints","updatedAt"]:section==="catalog"?["sortOrder","price","label"]:section==="tasks"?["createdAt","title","category"]:section==="pets"?["createdAt","name","level","xp"]:section==="health"?["date","nextDueDate","createdAt"]:["createdAt"];
  return <div className="adminShell">
    <aside className={`adminSidebar ${sidebar?"":"mini"}`}>
      <div className="adminBrand"><Brand size="sm" markOnly={!sidebar}/></div>
      <div className="sideNav">{["WORKSPACE","PEOPLE & PETS","PET CARE","GAMIFICATION","APP CONTENT","SYSTEM"].map(group=><div key={group}><div className="sideCaption">{group}</div><nav>{nav.filter(x=>x.group===group).map(item=>{const Icon=item.icon;return <button key={item.id} className={`sideLink ${section===item.id?"active":""}`} onClick={()=>{setSection(item.id);setSelected(null);setSearch("");setPage(1);}}><Icon size={17}/><span>{item.label}</span>{item.id==="contacts"&&(stats?.pendingContacts??0)>0&&<i>{stats?.pendingContacts}</i>}</button>;})}</nav></div>)}</div>
      <div className="sideAccount"><div className="adminAvatar">{admin?.name?.[0]||"A"}</div><div className="accountText"><b>{admin?.name||"Administrator"}</b><small>Super Admin</small></div><button title="Sign out" onClick={logout}><LogOut size={17}/></button></div>
    </aside>
    <main className="adminMain">
      <header className="adminTopbar"><button className="iconButton" onClick={()=>setSidebar(!sidebar)}><Menu size={19}/></button><div className="breadcrumbs">PetCard <span>/</span> {sectionTitle}</div><div className="topActions"><span className="secureLabel"><ShieldCheck size={15}/> Secure workspace</span><button className="iconButton" onClick={()=>load(page)} title="Refresh"><RefreshCw size={17}/></button><div className="topAdmin"><div className="adminAvatar">{admin?.name?.[0]||"A"}</div><div><b>{admin?.name||"Admin"}</b><small>Super Admin</small></div></div></div></header>
      <section className="pageBody">
        <div className="pageHeading"><div><span className="overline">PETCARD CONTROL CENTER</span><h1>{section==="overview"?"Welcome back":sectionTitle}</h1><p>{section==="overview"?"A live view of members, pet care, rewards and app operations.":`Manage and inspect ${sectionTitle.toLowerCase()} across PetCard.`}</p></div>{canCreate&&<button className="primaryButton" onClick={openCreate}><Plus size={16}/> Add {section==="catalog"?"catalog item":section==="health"?"health record":section==="tasks"?"task":section==="users"?"user":section==="pets"?"pet":"notification"}</button>}</div>
        {error&&<div className="alert errorAlert">{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
        {notice&&<div className="alert successAlert">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        {section==="overview"?<Overview stats={stats} onNavigate={setSection}/>:<>
          <div className="toolbar">
            <div className="searchBox"><Search size={17}/><input value={search} placeholder={`Search ${sectionTitle.toLowerCase()}…`} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="clearSearch" onClick={()=>setSearch("")}><X size={14}/></button>}</div>
            {filters.length>0&&<select className="filterSelect" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}>{filters.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>}
            {sortOptions.length>0&&<><select className="filterSelect" value={sortBy} onChange={e=>{setSortBy(e.target.value);setPage(1);}}><option value="">{section.startsWith("rank")?"Metric":"Sort by"}</option>{sortOptions.map(x=><option key={x} value={x}>{titleCase(x)}</option>)}</select><select className="filterSelect orderSelect" value={sortOrder} onChange={e=>{setSortOrder(e.target.value);setPage(1);}}><option value="desc">Descending</option><option value="asc">Ascending</option></select></>}
            <span className="resultCount">{pagination.total.toLocaleString()} records</span>
          </div>
          <div className="searchHint"><span className="liveDot"/> Search runs a moment after you stop typing. No API request per keystroke.</div>
          <div className="dataCard">
            {loading?<div className="emptyState"><RefreshCw className="spin"/><b>Loading {sectionTitle.toLowerCase()}…</b></div>:data.length===0?<div className="emptyState"><PawPrint size={25}/><b>No records found</b><span>Try changing the filters or search term.</span></div>:<div className="tableScroll"><table><thead><tr>{columns.map(c=><th key={c}>{titleCase(c)}</th>)}<th className="actionsHead">Actions</th></tr></thead><tbody>{data.map((row,i)=><tr key={idOf(row)||i}>{columns.map(c=><td key={c}><span className="cellText" title={fmt(row[c])}>{c==="user"||c==="owner"||c==="referrer"||c==="referee"||c==="requester"?person(row[c]):fmt(row[c])}</span></td>)}<td>{rowActions(row)}</td></tr>)}</tbody></table></div>}
            <div className="pagination"><span>Page {pagination.page} of {Math.max(1,pagination.pages)} · {pagination.total.toLocaleString()} total</span><div><button disabled={page<=1||loading} onClick={()=>setPage(x=>x-1)}><ChevronLeft size={16}/></button><button disabled={page>=pagination.pages||loading} onClick={()=>setPage(x=>x+1)}><ChevronRight size={16}/></button></div></div>
          </div>
        </>}
        <footer className="adminFooter">© {new Date().getFullYear()} PetCard · Admin Control Center <span>Built with care 🐾</span></footer>
      </section>
    </main>
    {selected&&<div className="modalBackdrop" onMouseDown={()=>setSelected(null)}><section className="detailModal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span className="overline">RECORD DETAILS</span><h2>{displayId(selected)}</h2></div><button className="iconButton" onClick={()=>setSelected(null)}><X/></button></div><div className="detailGrid">{Object.entries(selected).filter(([k,v])=>!k.startsWith("_")&&v!==undefined).map(([k,v])=><div className="detailItem" key={k}><small>{titleCase(k)}</small><b>{typeof v==="object"?fmt(v):fmt(v)}</b></div>)}</div>{section==="pets"&&<div className="detailNote"><b>Progress snapshot</b><p>Level: {fmt(selected.level)} · XP: {fmt(selected.xp)} · Current streak: {fmt(selected.streak?.current)} · Longest streak: {fmt(selected.streak?.longest)}</p><p>Unlocked frames: {fmt(selected.unlockedFrameKeys)} · Active frame: {fmt(selected.activeFrameKey)}</p></div>}<button className="secondaryButton fullButton" onClick={()=>setSelected(null)}>Close details</button></section></div>}
    {modal&&<div className="modalBackdrop" onMouseDown={()=>!busy&&setModal(null)}><section className="actionModal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modalHead"><div><span className="overline">PETCARD ADMIN ACTION</span><h2>{modal.mode==="create"?"Create new record":modal.mode==="edit"?"Edit record":modal.mode==="adjust"?"Adjust Paw Points":modal.mode==="reply"?"Reply to contact":modal.mode==="grant"?"Grant reward / progress":"Confirm action"}</h2></div><button className="iconButton" disabled={busy} onClick={()=>setModal(null)}><X/></button></div>
      {modal.mode==="confirm"?<><div className="confirmIcon"><ShieldCheck size={23}/></div><h3>{confirmTitle(section,modal.action||"")}</h3><p className="modalDescription">{confirmDescription(section,modal.action||"",modal.row||{})}</p><div className="modalActions"><button className="secondaryButton" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button className={`primaryButton ${["delete","revoke","skip","rejected"].includes(modal.action||"")?"dangerPrimary":""}`} disabled={busy} onClick={runAction}>{busy?"Processing…":"Confirm action"}</button></div></>:<>
        <div className="formGrid">
          {modal.mode==="reply"?<><FieldInput field={{key:"message",label:"Reply message",type:"textarea",required:true}} value={form.message} onChange={v=>setForm(x=>({...x,message:v}))}/><FieldInput field={{key:"resolve",label:"Mark conversation resolved",type:"checkbox"}} value={form.resolve} onChange={v=>setForm(x=>({...x,resolve:v}))}/></>
          :modal.mode==="adjust"?<><FieldInput field={{key:"points",label:"Points (+ credit / − debit)",type:"number",required:true}} value={form.points} onChange={v=>setForm(x=>({...x,points:v}))}/><FieldInput field={{key:"note",label:"Reason / audit note",type:"textarea",required:true}} value={form.note} onChange={v=>setForm(x=>({...x,note:v}))}/></>
          :modal.mode==="grant"&&modal.action==="xp"?<><FieldInput field={{key:"xp",label:"XP to grant",type:"number",required:true}} value={form.xp} onChange={v=>setForm(x=>({...x,xp:v}))}/><FieldInput field={{key:"note",label:"Reason / audit note",type:"textarea",required:true}} value={form.note} onChange={v=>setForm(x=>({...x,note:v}))}/></>
          :modal.mode==="grant"&&section==="achievements"?<><FieldInput field={{key:"petId",label:"Pet ID",required:true}} value={form.petId} onChange={v=>setForm(x=>({...x,petId:v}))}/><FieldInput field={{key:"key",label:"Achievement key",required:true}} value={form.key} onChange={v=>setForm(x=>({...x,key:v}))}/></>
          :modal.mode==="grant"&&section==="referrals"?<FieldInput field={{key:"note",label:"Admin note",type:"textarea"}} value={form.note} onChange={v=>setForm(x=>({...x,note:v}))}/>
          :section==="notifications"?<><FieldInput field={{key:"title",label:"Title",required:true}} value={form.title} onChange={v=>setForm(x=>({...x,title:v}))}/><FieldInput field={{key:"body",label:"Message",type:"textarea",required:true}} value={form.body} onChange={v=>setForm(x=>({...x,body:v}))}/><FieldInput field={{key:"audienceAll",label:"Send to all active users",type:"checkbox"}} value={form.audienceAll??true} onChange={v=>setForm(x=>({...x,audienceAll:v}))}/></>
          :(fields[section]||[]).map(f=><FieldInput key={f.key} field={f} value={form[f.key]} onChange={v=>setForm(x=>({...x,[f.key]:v}))}/>)}
        </div>
        {modal.mode==="create"&&section==="notifications"&&<p className="modalDescription">Announcement will be sent to the selected audience. Push notifications are enabled by default.</p>}
        <div className="modalActions"><button className="secondaryButton" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button className="primaryButton" disabled={busy} onClick={submitForm}>{busy?"Saving…":modal.mode==="create"?"Create record":modal.mode==="edit"?"Save changes":modal.mode==="adjust"?"Apply adjustment":modal.mode==="grant"?"Grant":"Continue"}</button></div>
      </>}
    </section></div>}
  </div>;
}
function FieldInput({field,value,onChange}:{field:Field;value:any;onChange:(v:any)=>void}){
  const common={value:value??"",onChange:(e:any)=>onChange(field.type==="number"?(e.target.value===""?"":Number(e.target.value)):e.target.value),required:field.required,placeholder:field.placeholder||field.label};
  return <label className={`formField ${field.type==="textarea"?"wideField":""}`}><span>{field.label}{field.required&&<i>*</i>}</span>
    {field.type==="textarea"?<textarea {...common} rows={4}/>:field.type==="select"?<select {...common}><option value="">Select…</option>{(field.options||[]).map(o=><option key={o} value={o}>{titleCase(o)}</option>)}</select>:field.type==="checkbox"?<input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/>:<input {...common} type={field.type||"text"}/>}
  </label>;
}
function confirmTitle(section:Section,action:string){
  const names:Record<string,string>={delete:"Delete this record?",revoke:"Revoke access / sessions?",toggle:"Change account status?",approved:"Approve guardian request?",rejected:"Reject guardian request?",reward:"Grant referral reward?",skip:"Mark referral ineligible?",archive:"Archive this task?",unarchive:"Restore this task?",complete:"Mark health record complete?",qr:"Regenerate pet QR code?",xp:"Grant XP to this pet?"};
  return names[action]||"Confirm this action?";
}
function confirmDescription(section:Section,action:string,row:Row){
  if(section==="referrals"&&action==="reward")return `This will grant the configured referral reward to ${person(row.referrer)}. The backend ledger prevents paying the same referral twice.`;
  if(section==="guardianMembers"&&action==="revoke")return "This immediately removes the guardian's access to the selected pet. The pet owner's account and pet data remain intact.";
  if(section==="guardianInvites"&&action==="revoke")return "This revokes the outstanding invite link so it can no longer be used to gain guardian access.";
  if(action==="delete")return "This is a destructive operation. Continue only if you have verified the selected record.";
  if(action==="toggle")return "The user's account access will be changed. You can reverse deactivation by reactivating the account.";
  if(action==="xp")return "Grant XP through the server-authoritative progress service. The pet's level will be recalculated by the backend.";
  return `Apply ${action} to ${displayId(row)}?`;
}
function Overview({stats,onNavigate}:{stats:Row|null;onNavigate:(s:Section)=>void}){
 const cards=[["Registered users",stats?.users,Users,"users"],["Registered pets",stats?.pets,PawPrint,"pets"],["Health records",stats?.healthRecords,HeartPulse,"health"],["Pending guardians",stats?.pendingGuardianRequests,ShieldCheck,"guardians"],["Paw Points in circulation",stats?.pawPointsInCirculation,Coins,"rewards"],["Referral records",stats?.referrals,UsersRound,"referrals"],["Achievements unlocked",stats?.achievements,Award,"achievements"],["Active tasks",stats?.activeTasks,ClipboardList,"tasks"]] as const;
 return <><div className="metricGrid">{cards.map(([label,value,Icon,target])=><button className="metricCard" key={label} onClick={()=>onNavigate(target as Section)}><span className="metricIcon"><Icon size={19}/></span><span className="metricLabel">{label}</span><strong>{typeof value==="number"?value.toLocaleString():"—"}</strong><small>Open management <span>→</span></small></button>)}</div><div className="overviewLower"><article className="welcomePanel"><div className="welcomeIcon"><PawPrint size={26}/></div><span className="overline">ONE WORKSPACE. FULL CONTROL.</span><h2>Every PetCard operation, connected.</h2><p>Manage member accounts, pet profiles, guardian permissions, health and reminders, rewards, referrals, achievements, stickers and avatar frames.</p></article><article className="quickPanel"><h3>Quick management</h3><p>Jump to the operational area you need.</p><div className="quickGrid">{nav.filter(x=>x.id!=="overview").slice(0,12).map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>onNavigate(item.id)}><Icon size={17}/>{item.label}<span>↗</span></button>})}</div></article></div><div className="statsFootnote"><Activity size={15}/> Dashboard figures are read from the live database. Detailed lists are paginated and searchable.</div></>;
}
