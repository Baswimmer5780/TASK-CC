const $ = s => document.querySelector(s);
let tasks=[], categories=[], capacity=180, currentTab='today', editing=null, categorySignature=null;
const editor=$('#editor'), form=$('#taskForm');
function message(s=''){ $('#message').textContent=s; }
async function run(fn){try{await fn();message();}catch(e){message(e.message);}}
async function load(){const data=await api('state');tasks=data.tasks;capacity=data.capacity;categories=data.categories;$('#storageStatus').textContent='DB / LOCAL READY';render();}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function fmtDue(t,p){if(!t.due)return '期限なし';const due=new Date(t.due);const stamp=due.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});const hours=Math.abs(p.d)*24;return `${stamp} / ${p.overdue?'超過':'残り'}${hours<1?Math.ceil(hours*60)+'分':hours<24?Math.ceil(hours)+'時間':Math.ceil(hours/24)+'日'}`;}
function render(){
 $('#dashboard').hidden=currentTab==='manage';$('#management').hidden=currentTab!=='manage';if(currentTab==='manage')renderCategories();
 const now=new Date();$('#currentDate').textContent=now.toLocaleDateString('ja-JP');
 const pending=tasks.filter(t=>!t.completed_at).map(t=>({...t,p:calculatePriority(t,capacity,now)})).sort((a,b)=>rankOrder.indexOf(a.p.rank)-rankOrder.indexOf(b.p.rank)||b.p.score-a.p.score||b.p.raw-a.p.raw||a.id-b.id);
 const history=tasks.filter(t=>t.completed_at).sort((a,b)=>b.completed_at.localeCompare(a.completed_at));
 const critical=pending.filter(t=>['s','s-minus'].includes(t.p.rank));
 const counts=[pending.length,critical.length,pending.filter(t=>t.p.overdue).length,history.length];
 ['pending','critical','overdue','completed'].forEach((id,i)=>$('#'+id+' strong').textContent=String(counts[i]).padStart(2,'0'));
 const distribution=rankOrder.map(r=>pending.filter(t=>t.p.rank===r).length), max=Math.max(1,...distribution);
 distribution.forEach((n,i)=>{$('#counter'+(i+1)).textContent=n;$('#meter'+(i+1)+' .meter-fill').style.height=n/max*100+'%';});
 $('#specialAlert').hidden=!critical.length;$('#alertStatus').textContent=`特別警戒対象のタスクが${critical.length}件あります。`;
 // 必須タスクは容量を超えても表示。残り枠に入るタスクを優先度順に選ぶ。
 const mandatory=t=>t.today_date===now.toLocaleDateString('sv-SE') || (t.importance!=='任意'&&(t.p.overdue||t.p.d<=1||['s','s-minus'].includes(t.p.rank)));
 const selected=new Set(pending.filter(mandatory).map(t=>t.id));let minutes=pending.filter(t=>selected.has(t.id)).reduce((s,t)=>s+t.minutes,0);
 for(const t of pending){if(selected.has(t.id))continue;if(t.importance==='任意'&&pending.some(x=>x.importance!=='任意'&&!selected.has(x.id)))continue;if(minutes+t.minutes<=capacity){selected.add(t.id);minutes+=t.minutes;}}
 $('#workloadTime').textContent=`${minutes} / ${capacity} min`;$('#workloadFill').style.width=Math.min(100,minutes/capacity*100)+'%';$('#workloadFill').style.background=minutes>capacity?'var(--color-warning)':'var(--color-accent)';$('#workloadStatusBar').setAttribute('aria-valuemax',capacity);$('#workloadStatusBar').setAttribute('aria-valuenow',Math.min(minutes,capacity));
 $('#taskHeading').textContent={today:'本日の推奨タスク',all:'全タスク一覧',history:'完了済みタスク',manage:'ジャンル管理'}[currentTab];
 document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.tab===currentTab);b.setAttribute('aria-pressed',b.dataset.tab===currentTab);});
 const visible=currentTab==='history'?history:currentTab==='today'?pending.filter(t=>selected.has(t.id)):pending;
 const list=$('.grid-container2');list.replaceChildren();$('#empty').hidden=visible.length>0;
 for(const t of visible){const done=!!t.completed_at,p=t.p||{rank:t.completed_rank,score:t.completed_score};const row=el('div','task rank-'+p.rank+(done?' completed':''));const check=el('input');check.type='checkbox';check.checked=done;check.setAttribute('aria-label',t.name+(done?'を未完了に戻す':'を完了'));check.addEventListener('change',()=>{check.disabled=true;run(async()=>{await api('tasks/'+t.id,'PATCH',{completed:!done,score:done?null:p.score,rank:done?null:p.rank});await load();}).finally(()=>{check.disabled=false;check.checked=done;});});const wrap=el('div','checkbox');wrap.append(check);
 const info=done?`完了：${new Date(t.completed_at).toLocaleString('ja-JP')} / ${t.category}`:`${t.category} / ${fmtDue(t,p)} / ${t.minutes}min / ${t.importance}`;
 row.append(wrap,el('div','taskName',t.name),el('div','taskInfo',info),el('div','score',p.score),el('div','SCORE','SCORE'),el('div','priority',rankLabels[rankOrder.indexOf(p.rank)]));
 if(t.notes)row.append(el('div','task-notes',t.notes));const actions=el('div','task-actions');if(!done){const edit=el('button','','編集');edit.onclick=()=>openEditor(t);actions.append(edit);}const del=el('button','','削除');del.onclick=()=>{if(confirm('このタスクを削除しますか？'))run(async()=>{await api('tasks/'+t.id,'DELETE');await load();});};actions.append(del);row.append(actions);list.append(row);}
}
function openEditor(t){editing=t?.id??null;form.reset();form.elements.category.replaceChildren(...categories.map(n=>new Option(n,n)));form.elements.category.value=categories.includes('その他')?'その他':categories[0];$('#formTitle').textContent=t?'タスク編集':'タスク追加';if(t){for(const k of ['name','category','importance','due','minutes','notes'])form.elements[k].value=t[k]??'';form.elements.today.checked=t.today_date===new Date().toLocaleDateString('sv-SE');}$('#formError').textContent='';preview();editor.showModal();}
$('#add').onclick=()=>openEditor();$('#cancel').onclick=()=>editor.close();function preview(){const f=Object.fromEntries(new FormData(form));const p=calculatePriority({...f,minutes:Number(f.minutes)||1},capacity);$('#preview').textContent=`現在優先度：${rankLabels[rankOrder.indexOf(p.rank)]} / ${p.score}点`;$('#preview').style.color=`var(--priority-${p.rank})`;}
form.addEventListener('input',preview);
form.onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));data.name=data.name.trim();data.category=data.category.trim();data.minutes=Number(data.minutes);data.today_date=form.elements.today.checked?new Date().toLocaleDateString('sv-SE'):null;delete data.today;const btn=form.querySelector('[type=submit]');btn.disabled=true;try{if(!data.name||!data.category)throw Error('タスク名とジャンルを入力してください');await api(editing?'tasks/'+editing:'tasks',editing?'PATCH':'POST',data);await load();editor.close();currentTab='all';render();}catch(e){$('#formError').textContent=e.message;}finally{btn.disabled=false;}};
$('#settings').onclick=()=>{$('#configForm').elements.capacity.value=capacity;$('#config').showModal();};$('#cancelConfig').onclick=()=>$('#config').close();$('#configForm').onsubmit=e=>{e.preventDefault();run(async()=>{await api('settings','PATCH',{capacity:Number(e.target.elements.capacity.value)});$('#config').close();await load();});};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;render();});
if(window.lucide)lucide.createIcons();render();$('#add').disabled=true;$('#settings').disabled=true;openDatabase().then(load).then(()=>{$('#add').disabled=false;$('#settings').disabled=false;document.querySelector('[data-tab=manage]').disabled=false;}).catch(e=>{message('データベースを開けません：'+e.message);$('#storageStatus').textContent='DB / STORAGE ERROR';});setInterval(render,60000);window.addEventListener('focus',()=>{if(db)run(load);});
$('#export').onclick=async()=>{try{const b=await exportBackup();const url=URL.createObjectURL(new Blob([JSON.stringify(b,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='tcc-backup-'+new Date().toLocaleDateString('sv-SE')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$('#configError').textContent=e.message;}};
$('#import').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const b=JSON.parse(await f.text());if(confirm('現在のタスクをバックアップの内容で置き換えますか？')){await restoreBackup(b);await load();$('#configForm').elements.capacity.value=capacity;$('#configError').textContent='復元しました';}}catch(e){$('#configError').textContent=e.message;}finally{e.target.value='';}};


function updateNetwork(){const e=$('#networkStatus');e.textContent=navigator.onLine?'● ONLINE':'● OFFLINE';e.classList.toggle('offline',!navigator.onLine);}
updateNetwork();window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
function cacheStatus(text){$('#cacheStatus').textContent='CACHE / '+text;}
if('serviceWorker' in navigator && window.isSecureContext){
 cacheStatus('PREPARING');
 navigator.serviceWorker.register('./sw.js').then(reg=>{
   const track=worker=>{if(!worker)return;const update=()=>{if(worker.state==='activated')cacheStatus('READY');else if(worker.state==='redundant'&&!reg.active)cacheStatus('UNAVAILABLE');};worker.addEventListener('statechange',update);update();};
   if(reg.active)cacheStatus('READY');else track(reg.installing||reg.waiting);
   reg.addEventListener('updatefound',()=>track(reg.installing));
   navigator.serviceWorker.ready.then(()=>cacheStatus('READY'));
 }).catch(e=>{cacheStatus('UNAVAILABLE');console.warn('Offline cache unavailable',e);});
}else cacheStatus('UNAVAILABLE');
function renderCategories(force=false){const signature=JSON.stringify(categories.map(n=>[n,tasks.filter(t=>t.category===n).length]));if(!force&&signature===categorySignature)return;categorySignature=signature;const list=$('#categoryList');list.replaceChildren();for(const name of categories){const count=tasks.filter(t=>t.category===name).length;const row=el('div','category-row');const title=el('div','category-label');title.append(el('strong','',name),el('small','',`${count}件（履歴を含む）`));const rename=el('button','','名前変更');rename.onclick=()=>{const input=el('input');input.value=name;input.maxLength=80;input.setAttribute('aria-label','変更後のジャンル名');const save=el('button','','保存');const cancel=el('button','','取消');row.replaceChildren(input,save,cancel);input.focus();save.onclick=()=>categoryAction('rename',name,input.value.trim());cancel.onclick=()=>renderCategories(true);};const del=el('button','','削除');del.disabled=count>0||categories.length<=1;del.title=count?'使用中のため削除不可':'';del.onclick=()=>{if(confirm('ジャンル「'+name+'」を削除しますか？'))categoryAction('delete',name,'');};row.append(title,rename,del);list.append(row);}}
async function categoryAction(action,oldName,newName){try{await changeCategory(action,oldName,newName);await load();renderCategories(true);$('#categoryError').textContent='';return true;}catch(e){$('#categoryError').textContent=e.message;return false;}}
$('#categoryForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{if(await categoryAction('add',null,$('#categoryName').value.trim()))$('#categoryName').value='';}finally{btn.disabled=false;}};$('#manageSettings').onclick=()=>$('#settings').click();
