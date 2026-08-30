


const SUPABASE_URL = 'https://ltffbxrggflevlilqmze.supabase.co';
const SUPABASE_KEY = 'sb_publishable_svtQE6pna4HvyU07igxRnA_eUdi0rNJ';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let currentAuth=null,currentEmployee=null,employees=[],attendance=[],tasks=[],leaveRequests=[],officeSettings=null;
let productStocks=[],stockHistory=[],stockRealtimeChannel=null;
let attendanceArchive=[];
let routineJobs=[],routineChecks=[],digitalItems=[],digitalSecrets={},digitalBatchPreview=[];
let salesTransactions=[],salesPreviewData=[],salesPreviewFileName="";
let bossNotifications=[];
let sellers=[],sellerOrders=[],marketplaceOrders=[],sellerLedger=[],withdrawalRequests=[];
let payrollSettings={late_penalty:5000,izin_penalty:0,sakit_penalty:0,cuti_penalty:0};

const ymd=()=>{let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const hm=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function login(){
  $('#loginMsg').textContent='Memproses...';
  const {data,error}=await sb.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPass').value});
  if(error){$('#loginMsg').textContent=error.message;return}
  await boot(data.user);
}
$('#loginBtn').onclick=login;
$('#loginPass').onkeydown=e=>{if(e.key==='Enter')login()};
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload()};

async function boot(user){
  currentAuth=user;
  const {data:emp,error}=await sb.from('employees').select('*').eq('auth_user_id',user.id).single();
  if(error||!emp){$('#loginMsg').textContent='Akun ini belum dihubungkan ke data karyawan.';await sb.auth.signOut();return}
  currentEmployee=emp;
  $('#login').classList.add('hidden');$('#app').classList.remove('hidden');
  $('#sideName').textContent=emp.full_name;
  $('#sideRole').textContent=emp.role==='admin'?'Bos / Administrator':emp.job_title||'Karyawan';
  $('#roleBadge').textContent=emp.role==='admin'?'AKSES BOS':'AKSES KARYAWAN';
  $('#taskNav').textContent=emp.role==='admin'?'Tugas Karyawan':'Tugas Saya';
  $('#taskPageTitle').textContent=emp.role==='admin'?'Tugas Karyawan':'Tugas Saya';
  $('#taskSubtitle').textContent=emp.role==='admin'?'Buat dan pantau pekerjaan seluruh karyawan.':'Lihat pekerjaan yang diberikan Bos dan update progresnya.';
  $('#welcome').textContent=emp.role==='admin'?'Selamat datang, Bos.':'Selamat bekerja, '+emp.full_name+'.';
  const canSales = emp.role==='admin' || emp.can_manage_sales===true || emp.username==='aping';
  $$('.salesOnly').forEach(x=>x.classList.toggle('hidden',!canSales));
  $$('.salesUploaderOnly').forEach(x=>x.classList.toggle('hidden',!(emp.role==='admin'||emp.can_manage_sales===true||emp.username==='aping')));
  if(canSales){
    $('#salesRecapSubtitle').textContent=emp.role==='admin'?'Pantau seluruh rekap penjualan YANSTORE.':'Upload Excel rekap harian dan pantau hasilnya.';
  }

  $('#today').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#attendanceSubtitle').textContent=emp.role==='admin'?'Lihat absensi semua karyawan.':'Riwayat absensi milik kamu sendiri.';
  $('#stockNav').textContent=emp.role==='admin'?'▣ Stok Produk':'▣ Stok Hari Ini';
  $('#stockTitle').textContent=emp.role==='admin'?'Stok Produk YANSTORE':'Stok Hari Ini';
  $('#stockSubtitle').textContent=emp.role==='admin'?'Kelola stok produk premium.':'Lihat stok produk premium terbaru secara realtime.';
  $('#routineNav').textContent=emp.role==='admin'?'☑ Job Harian Karyawan':'☑ Job Harian Saya';
  $('#routineTitle').textContent=emp.role==='admin'?'Job Harian Karyawan':'Job Harian Saya';
  $('#routineSubtitle').textContent=emp.role==='admin'?'Atur pekerjaan rutin yang otomatis muncul setiap hari.':'Checklist pekerjaan rutin kamu hari ini.';
  $('#digitalStockNav').textContent=emp.role==='admin'?'⬡ Gudang Digital':'⬡ Ambil Stok Buyer';
  $('#digitalStockTitle').textContent=emp.role==='admin'?'Gudang Digital YANSTORE':'Ambil Stok untuk Buyer';
  $('#digitalStockSubtitle').textContent=emp.role==='admin'?'Kelola item digital satu-per-satu.':'Ambil satu item untuk buyer, lalu tandai setelah dikirim.';
  $$('.adminOnly').forEach(x=>x.classList.toggle('hidden',emp.role!=='admin'));
  $$('.employeeOnly').forEach(x=>x.classList.toggle('hidden',emp.role==='admin'));
  go('dashboard'); await refreshData();
  await loadAttendanceArchiveSafe();
  await loadStockSafe();
  await loadRoutineSafe();
  await loadDigitalSafe();
  await loadSalesSafe();
  await loadSellerCenterSafe();
  renderBossNotifications();
  setupSalesRealtime();
  setupFullRealtime();
}

function go(id){
  if((id==='employees'||id==='recap'||id==='settings'||id==='reports'||id==='payroll'||id==='sellercenter')&&currentEmployee.role!=='admin')id='dashboard';
  if(id==='profile'&&currentEmployee.role==='admin')id='dashboard';
  $$('.page').forEach(x=>x.classList.toggle('hidden',x.id!==id));
  $$('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  if(id==='profile')renderProfile();
}
$$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));

async function refreshData(){
  const {data:os}=await sb.from('office_settings').select('*').eq('id',1).single();
  officeSettings=os||{office_name:'HomeOffice',work_start:'09:00:00',late_after:'09:15:00',work_end:'21:00:00',work_monday:true,work_tuesday:true,work_wednesday:true,work_thursday:true,work_friday:true,work_saturday:true,work_sunday:false};
  if(currentEmployee.role==='admin'){
    const {data:e}=await sb.from('employees').select('*').order('full_name');
    employees=e||[];
    const {data:ps}=await sb.from('payroll_settings').select('*').eq('id',1).single();
    if(ps) payrollSettings=ps;
    const {data:a}=await sb.from('attendance').select('*, employees(full_name)').order('attendance_date',{ascending:false});
    attendance=(a||[]).map(x=>({...x,name:x.employees?.full_name||'-'}));
    const {data:t}=await sb.from('tasks').select('*, assignee:employees!tasks_assigned_to_fkey(full_name)').order('created_at',{ascending:false});
    tasks=(t||[]).map(x=>({...x,assignee_name:x.assignee?.full_name||'-'}));
    const {data:l}=await sb.from('leave_requests').select('*, employees(full_name)').order('created_at',{ascending:false});
    leaveRequests=(l||[]).map(x=>({...x,employee_name:x.employees?.full_name||'-'}));
  }else{
    employees=[currentEmployee];
    const {data:a}=await sb.from('attendance').select('*').eq('employee_id',currentEmployee.id).order('attendance_date',{ascending:false});
    attendance=(a||[]).map(x=>({...x,name:currentEmployee.full_name}));
    const {data:t}=await sb.from('tasks').select('*').eq('assigned_to',currentEmployee.id).order('created_at',{ascending:false});
    tasks=(t||[]).map(x=>({...x,assignee_name:currentEmployee.full_name}));
    const {data:l}=await sb.from('leave_requests').select('*').eq('employee_id',currentEmployee.id).order('created_at',{ascending:false});
    leaveRequests=(l||[]).map(x=>({...x,employee_name:currentEmployee.full_name}));
  }
  renderAll();
}

function badge(s){return '<span class="badge '+(s==='Hadir'?'hadir':s==='Terlambat'?'telat':s==='Izin'?'izin':'sakit')+'">'+esc(s)+'</span>'}

function isTodayWorkday(){
  const d=new Date().getDay();
  const map={0:'work_sunday',1:'work_monday',2:'work_tuesday',3:'work_wednesday',4:'work_thursday',5:'work_friday',6:'work_saturday'};
  return officeSettings ? officeSettings[map[d]]!==false : d!==0;
}
function openBossNotification(page){
  $('#bossNotifyPanel')?.classList.add('hidden');
  go(page);
}
function renderBossNotifications(){
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  const today=ymd(), active=employees.filter(e=>e.role==='employee'&&e.active);
  const todayAtt=attendance.filter(a=>a.attendance_date===today);
  const notes=[];
  const add=(icon,title,desc,page)=>notes.push({icon,title,desc,page});

  if(isTodayWorkday()){
    const absent=active.filter(e=>!todayAtt.some(a=>a.employee_id===e.id));
    if(absent.length)add('👤',absent.length+' karyawan belum absen',absent.map(x=>x.full_name).join(', '),'attendance');

    const late=todayAtt.filter(a=>a.status==='Terlambat');
    if(late.length)add('⏰',late.length+' karyawan terlambat',late.map(x=>x.name||'-').join(', '),'attendance');

    const now=new Date(), hh=now.getHours(), mm=now.getMinutes();
    if(hh>20||(hh===20&&mm>=30)){
      const noOut=todayAtt.filter(a=>a.check_in&&!a.check_out&&!['Izin','Sakit','Cuti'].includes(a.status));
      if(noOut.length)add('🚪',noOut.length+' karyawan belum checkout',noOut.map(x=>x.name||'-').join(', '),'attendance');
    }
  }

  const pending=leaveRequests.filter(x=>String(x.status||'').toLowerCase().includes('menunggu')||String(x.status||'').toLowerCase()==='pending');
  if(pending.length)add('📝',pending.length+' pengajuan menunggu','Izin / sakit / cuti perlu diperiksa.','leave');

  const unfinished=tasks.filter(x=>x.status!=='Selesai');
  const overdue=unfinished.filter(x=>x.due_date&&x.due_date<today);
  if(overdue.length)add('⚠️',overdue.length+' tugas lewat deadline','Ada tugas tambahan yang belum selesai.','tasks');
  else if(unfinished.length)add('📋',unfinished.length+' tugas belum selesai','Pantau progres tugas tambahan karyawan.','tasks');

  const openRoutine=routineJobs.filter(j=>!routineChecks.some(c=>c.job_id===j.id&&c.completed));
  if(openRoutine.length)add('☑️',openRoutine.length+' job harian belum selesai','Checklist hari ini masih ada yang terbuka.','routine');

  const out=productStocks.filter(p=>Number(p.stock)<=0);
  const low=productStocks.filter(p=>Number(p.stock)>0&&Number(p.stock)<=Number(p.minimum_stock));
  if(out.length)add('📦',out.length+' stok produk habis',out.map(x=>x.product_name).join(', '),'stock');
  if(low.length)add('📉',low.length+' stok produk menipis',low.map(x=>x.product_name).join(', '),'stock');

  const digitalAvailable=digitalItems.filter(x=>x.status==='available').length;
  if(digitalItems.length && digitalAvailable===0)add('💻','Gudang Digital kehabisan stok','Tidak ada item digital berstatus Tersedia.','digitalstock');

  const aping=employees.find(e=>e.username==='aping'&&e.active);
  if(isTodayWorkday()&&aping){
    const salesToday=salesTransactions.filter(x=>x.transaction_date===today);
    const now=new Date();
    if(now.getHours()>=18 && salesToday.length===0)add('📊','Rekap penjualan hari ini belum masuk','Belum ada transaksi rekap Aping untuk hari ini.','salesrecap');
  }

  bossNotifications=notes;
  const badge=$('#bossBellBadge'), list=$('#bossNotifyList');
  if(badge){
    badge.textContent=notes.length>99?'99+':notes.length;
    badge.classList.toggle('hidden',notes.length===0);
  }
  if(list){
    list.innerHTML=notes.length?notes.map((n,i)=>`<button class="notify-item" onclick="openBossNotification('${n.page}')"><span class="notify-icon">${n.icon}</span><span><div class="notify-title">${esc(n.title)}</div><div class="notify-desc">${esc(n.desc)}</div></span></button>`).join(''):`<div class="notify-empty"><div style="font-size:28px">✅</div><b>Semua aman</b><div style="margin-top:5px">Belum ada hal yang perlu perhatian Bos.</div></div>`;
  }
}
window.openBossNotification=openBossNotification;

function renderAll(){
 let td=attendance.filter(x=>x.attendance_date===ymd());
 $('#dH').textContent=td.filter(x=>x.status==='Hadir').length;
 $('#dT').textContent=td.filter(x=>x.status==='Terlambat').length;
 $('#dI').textContent=td.filter(x=>['Izin','Sakit'].includes(x.status)).length;
 $('#dE').textContent=employees.filter(x=>x.role==='employee'&&x.active).length;
 renderAttendance();renderEmployees();renderNotice();renderProfile();renderTasks();renderRecap();renderLeave();renderReports();renderPayroll();renderBossDashboard();renderSettings();renderBossNotifications();
}

function renderAttendance(){
 let d=$('#filterDate').value,s=$('#filterStatus').value;
 let rows=attendance.filter(x=>(!d||x.attendance_date===d)&&(!s||x.status===s));
 $('#attendanceRows').innerHTML=rows.length?rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.attendance_date)}</td><td>${esc(x.check_in||'-')}</td><td>${esc(x.check_out||'-')}</td><td>${badge(x.status)}</td><td>${esc(x.note||'-')}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:#8793a5;padding:28px">Belum ada data absensi.</td></tr>';
}

function renderEmployees(){
 if(!currentEmployee||currentEmployee.role!=='admin')return;
 let q=$('#employeeSearch').value.toLowerCase().trim();
 let es=employees.filter(x=>x.role==='employee'&&(!q||[x.full_name,x.username,x.job_title,x.phone].some(v=>String(v||'').toLowerCase().includes(q))));
 $('#employeeRows').innerHTML=es.length?es.map(x=>`<tr>
 <td><div class="empname"><div class="avatar">${esc((x.full_name||'?')[0].toUpperCase())}</div><b>${esc(x.full_name)}</b></div></td>
 <td>${esc(x.username)}</td><td>${esc(x.job_title||'-')}</td><td>${esc(x.phone||'-')}</td><td>${esc(x.join_date||'-')}</td>
 <td><span class="badge ${x.active?'aktif':'nonaktif'}">${x.active?'Aktif':'Nonaktif'}</span></td>
 <td><div class="rowactions"><button class="btn" onclick="viewEmployee('${x.id}')">Detail</button><button class="btn" onclick="editEmployee('${x.id}')">Edit</button><button class="btn ${x.active?'danger':''}" onclick="toggleEmployee('${x.id}')">${x.active?'Nonaktifkan':'Aktifkan'}</button></div></td>
 </tr>`).join(''):'<tr><td colspan="7" style="text-align:center;color:#8793a5;padding:28px">Belum ada karyawan.</td></tr>';
}

function renderNotice(){
 if(!currentEmployee||currentEmployee.role==='admin')return;
 let x=attendance.find(a=>a.attendance_date===ymd());
 let n=$('#dashNotice');n.classList.remove('hidden');
 n.textContent=!x?`Kamu belum melakukan absensi hari ini. Jam masuk ${time5(officeSettings.work_start)}, toleransi sampai ${time5(officeSettings.late_after)}, pulang ${time5(officeSettings.work_end)}.`:`Absensi hari ini: ${x.status} • Masuk ${x.check_in||'-'} • Pulang ${x.check_out||'-'}`;
}

function renderProfile(){
 if(!currentEmployee||currentEmployee.role==='admin')return;
 $('#profileContent').innerHTML=`<div class="detailgrid">
 <div class="detailitem"><span class="muted">Nama</span><b>${esc(currentEmployee.full_name)}</b></div>
 <div class="detailitem"><span class="muted">Jabatan</span><b>${esc(currentEmployee.job_title||'-')}</b></div>
 <div class="detailitem"><span class="muted">Username</span><b>${esc(currentEmployee.username||'-')}</b></div>
 <div class="detailitem"><span class="muted">Email</span><b>${esc(currentEmployee.email||currentAuth?.email||'-')}</b></div>
 <div class="detailitem"><span class="muted">Nomor HP</span><b>${esc(currentEmployee.phone||'-')}</b></div>
 <div class="detailitem"><span class="muted">Tanggal Masuk</span><b>${esc(currentEmployee.join_date||'-')}</b></div>
 <div class="detailitem" style="grid-column:1/-1"><span class="muted">Alamat</span><b>${esc(currentEmployee.address||'-')}</b></div>
 </div>`;
}

function taskStatusClass(s){return s==='Selesai'?'status-Selesai':s==='Dikerjakan'?'status-Dikerjakan':'status-Belum'}
function renderTasks(){if(!currentEmployee)return;let list=[...tasks],ef='',sf='';if(currentEmployee.role==='admin'){ef=$('#taskEmployeeFilter').value;sf=$('#taskStatusFilter').value;if(ef)list=list.filter(x=>x.assigned_to===ef);if(sf)list=list.filter(x=>x.status===sf);$('#taskEmployeeFilter').innerHTML='<option value="">Semua karyawan</option>'+employees.filter(x=>x.role==='employee').map(x=>`<option value="${x.id}" ${x.id===ef?'selected':''}>${esc(x.full_name)}</option>`).join('');}$('#tTodo').textContent=tasks.filter(x=>x.status==='Belum Dikerjakan').length;$('#tDoing').textContent=tasks.filter(x=>x.status==='Dikerjakan').length;$('#tDone').textContent=tasks.filter(x=>x.status==='Selesai').length;$('#tLate').textContent=tasks.filter(x=>x.status!=='Selesai'&&x.due_date&&x.due_date<ymd()).length;$('#taskRows').innerHTML=list.length?list.map(x=>{let late=x.status!=='Selesai'&&x.due_date&&x.due_date<ymd();let controls=currentEmployee.role==='admin'?`<div class="rowactions"><button class="btn" onclick="editTask('${x.id}')">Edit</button><button class="btn danger" onclick="deleteTask('${x.id}')">Hapus</button></div>`:`<div class="rowactions">${x.status==='Belum Dikerjakan'?`<button class="btn" onclick="setTaskStatus('${x.id}','Dikerjakan')">Mulai Kerjakan</button>`:''}${x.status!=='Selesai'?`<button class="btn primary" onclick="setTaskStatus('${x.id}','Selesai')">Tandai Selesai</button>`:`<button class="btn" onclick="setTaskStatus('${x.id}','Dikerjakan')">Buka Lagi</button>`}</div>`;return `<div class="taskcard"><div class="taskhead"><div><div class="tasktitle">${esc(x.title)}</div><div class="taskmeta">${currentEmployee.role==='admin'?`<span class="badge aktif">${esc(x.assignee_name)}</span>`:''}<span class="badge prio-${esc(x.priority)}">${esc(x.priority)}</span><span class="badge ${taskStatusClass(x.status)}">${esc(x.status)}</span>${x.due_date?`<span class="badge ${late?'sakit':'nonaktif'}">Deadline: ${esc(x.due_date)}${late?' - Terlambat':''}</span>`:''}</div></div>${controls}</div>${x.description?`<div class="taskdesc">${esc(x.description)}</div>`:''}</div>`;}).join(''):'<div class="card" style="text-align:center;color:#8793a5">Belum ada tugas.</div>'}
$('#taskEmployeeFilter').onchange=renderTasks;$('#taskStatusFilter').onchange=renderTasks;
function resetTaskForm(){$('#tId').value='';$('#tTitle').value='';$('#tDescription').value='';$('#tDue').value=ymd();$('#tPriority').value='Normal';$('#tEmployee').innerHTML=employees.filter(x=>x.role==='employee'&&x.active).map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join('')}
$('#addTask').onclick=()=>{resetTaskForm();$('#taskModalTitle').textContent='Tambah Tugas';openModal('#taskModal')};
window.editTask=id=>{let x=tasks.find(t=>t.id===id);if(!x)return;resetTaskForm();$('#taskModalTitle').textContent='Edit Tugas';$('#tId').value=x.id;$('#tTitle').value=x.title||'';$('#tDescription').value=x.description||'';$('#tDue').value=x.due_date||'';$('#tPriority').value=x.priority||'Normal';$('#tEmployee').value=x.assigned_to;openModal('#taskModal')};
$('#saveTask').onclick=async()=>{let id=$('#tId').value,title=$('#tTitle').value.trim(),assigned=$('#tEmployee').value;if(!title||!assigned){alert('Judul tugas dan karyawan wajib diisi.');return}let payload={title,description:$('#tDescription').value.trim()||null,assigned_to:assigned,due_date:$('#tDue').value||null,priority:$('#tPriority').value};if(!id)payload.created_by=currentEmployee.id;let res=id?await sb.from('tasks').update(payload).eq('id',id):await sb.from('tasks').insert(payload);if(res.error){alert(res.error.message);return}$('#taskModal').classList.remove('open');await refreshData()};
window.deleteTask=async id=>{if(!confirm('Hapus tugas ini?'))return;let {error}=await sb.from('tasks').delete().eq('id',id);if(error)alert(error.message);else await refreshData()};
window.setTaskStatus=async(id,status)=>{let {error}=await sb.from('tasks').update({status,completed_at:status==='Selesai'?new Date().toISOString():null}).eq('id',id);if(error){alert(error.message);return}await refreshData()};


function sellerStatusClass(s){return s==='approved'?'seller-status-approved':s==='suspended'?'seller-status-suspended':'seller-status-pending'}
function sellerStatusLabel(s){return s==='approved'?'Aktif':s==='suspended'?'Suspend':'Menunggu'}
async function loadSellerCenterSafe(){
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  const [a,b,c,d,e]=await Promise.all([
    sb.from('sellers').select('*').order('created_at',{ascending:false}),
    sb.from('seller_orders').select('*, sellers(display_name,store_name)').order('created_at',{ascending:false}),
    sb.from('seller_ledger').select('*, sellers(display_name)').order('created_at',{ascending:false}),
    sb.from('withdrawal_requests').select('*, sellers(display_name)').order('created_at',{ascending:false}),
    sb.from('marketplace_orders').select('*, sellers(display_name,store_name)').order('created_at',{ascending:false})
  ]);
  // Seller Center tetap tidak merusak HomeOffice kalau SQL V21 belum dijalankan.
  if(a.error){console.warn('Seller Center belum aktif:',a.error.message);sellers=[];sellerOrders=[];marketplaceOrders=[];sellerLedger=[];withdrawalRequests=[];renderSellerCenter();return}
  sellers=a.data||[];sellerOrders=b.data||[];sellerLedger=c.data||[];withdrawalRequests=d.data||[];marketplaceOrders=e.error?[]:(e.data||[]);renderSellerCenter();
}
function sellerBalance(id){return sellerLedger.filter(x=>x.seller_id===id).reduce((n,x)=>n+Number(x.amount||0),0)}
function renderSellerCenter(){
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  $('#scActive').textContent=sellers.filter(x=>x.status==='approved').length;
  $('#scOrders').textContent=sellerOrders.filter(x=>x.status==='Selesai').length+marketplaceOrders.filter(x=>x.status==='Selesai').length;
  $('#scProfit').textContent=rupiah(sellerLedger.filter(x=>Number(x.amount)>0).reduce((n,x)=>n+Number(x.amount||0),0));
  $('#scWithdraw').textContent=withdrawalRequests.filter(x=>x.status==='pending').length;
  let q=($('#sellerSearch')?.value||'').toLowerCase();
  let list=sellers.filter(x=>!q||[x.display_name,x.store_name,x.contact,x.email].some(v=>String(v||'').toLowerCase().includes(q)));
  $('#sellerRows').innerHTML=list.length?list.map(x=>`<tr><td><b>${esc(x.display_name)}</b></td><td>${esc(x.store_name||'-')}</td><td>${esc(x.contact||x.email||'-')}</td><td><span class="badge ${sellerStatusClass(x.status)}">${sellerStatusLabel(x.status)}</span></td><td class="seller-money">${rupiah(sellerBalance(x.id))}</td><td><div class="rowactions">${x.status!=='approved'?`<button class="btn primary" onclick="setSellerStatus('${x.id}','approved')">Aktifkan</button>`:''}${x.status!=='suspended'?`<button class="btn danger" onclick="setSellerStatus('${x.id}','suspended')">Suspend</button>`:`<button class="btn" onclick="setSellerStatus('${x.id}','approved')">Pulihkan</button>`}</div></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:#8793a5;padding:28px">Belum ada seller atau SQL V21 belum dijalankan.</td></tr>';
  let sf=$('#sellerOrderFilter')?.value||'';let orders=sf?sellerOrders.filter(x=>x.status===sf):sellerOrders;
  $('#sellerOrderRows').innerHTML=orders.length?orders.map(x=>`<tr><td>${esc((x.created_at||'').slice(0,10))}</td><td>${esc(x.sellers?.display_name||'-')}</td><td>${esc(x.buyer_name||'-')}</td><td>${esc(x.product_name)}</td><td>${rupiah(x.sell_price)}</td><td>${rupiah(x.cost_price)}</td><td class="seller-money">${rupiah(x.seller_profit)}</td><td><span class="badge ${x.status==='Selesai'?'aktif':x.status==='Dibatalkan'?'sakit':'telat'}">${esc(x.status)}</span></td><td>${x.status!=='Selesai'&&x.status!=='Dibatalkan'?`<button class="btn primary" onclick="finishSellerOrder('${x.id}')">Selesaikan</button>`:'-'}</td></tr>`).join(''):'<tr><td colspan="9" style="text-align:center;color:#8793a5;padding:28px">Belum ada order.</td></tr>';
  let mf=$('#marketplaceOrderFilter')?.value||'';let morders=mf?marketplaceOrders.filter(x=>x.status===mf):marketplaceOrders;
  $('#marketplaceOrderRows').innerHTML=morders.length?morders.map(x=>`<tr><td>${esc((x.created_at||'').slice(0,10))}</td><td><b>${esc(x.order_code)}</b></td><td>${esc(x.sellers?.display_name||x.store_name||'-')}</td><td>${esc(x.buyer_name)}<div class="muted">${esc(x.buyer_contact||'-')}</div></td><td>${esc(x.listing_title||x.product_name)}</td><td class="seller-money">${rupiah(x.sell_price)}</td><td><span class="badge ${x.payment_status==='Dibayar'?'aktif':'telat'}">${esc(x.payment_status)}</span></td><td><span class="badge ${x.status==='Selesai'?'aktif':x.status==='Dibatalkan'?'sakit':'telat'}">${esc(x.status)}</span></td><td><div class="rowactions">${x.payment_status!=='Dibayar'?`<button class="btn" onclick="setMarketplaceOrder('${x.id}','${x.status}','Dibayar')">Dibayar</button>`:''}${x.status==='Menunggu'?`<button class="btn primary" onclick="setMarketplaceOrder('${x.id}','Diproses','${x.payment_status}')">Proses</button>`:''}${x.status!=='Selesai'&&x.status!=='Dibatalkan'?`<button class="btn primary" onclick="setMarketplaceOrder('${x.id}','Selesai','${x.payment_status}')">Selesai</button><button class="btn danger" onclick="setMarketplaceOrder('${x.id}','Dibatalkan','${x.payment_status}')">Batal</button>`:'-'}</div></td></tr>`).join(''):'<tr><td colspan="9" style="text-align:center;color:#8793a5;padding:28px">Belum ada order Marketplace atau SQL V25 belum dijalankan.</td></tr>';
  $('#sellerLedgerRows').innerHTML=sellerLedger.length?sellerLedger.map(x=>`<tr><td>${esc(new Date(x.created_at).toLocaleString('id-ID'))}</td><td>${esc(x.sellers?.display_name||'-')}</td><td>${esc(x.entry_type)}</td><td class="seller-money">${Number(x.amount)>=0?'+':''}${rupiah(x.amount)}</td><td>${esc(x.reference_id||'-')}</td><td>${esc(x.note||'-')}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:#8793a5;padding:28px">Ledger masih kosong.</td></tr>';
  $('#withdrawalRows').innerHTML=withdrawalRequests.length?withdrawalRequests.map(x=>`<tr><td>${esc((x.created_at||'').slice(0,10))}</td><td>${esc(x.sellers?.display_name||'-')}</td><td class="seller-money">${rupiah(x.amount)}</td><td>${esc(x.destination_type+' • '+x.destination_account+' • '+x.destination_name)}</td><td><span class="badge ${x.status==='paid'?'aktif':x.status==='rejected'?'sakit':'telat'}">${x.status==='paid'?'Dibayar':x.status==='rejected'?'Ditolak':'Menunggu'}</span></td><td><div class="rowactions">${x.status==='pending'?`<button class="btn primary" onclick="markWithdrawalPaid('${x.id}')">Tandai Dibayar</button><button class="btn danger" onclick="rejectWithdrawal('${x.id}')">Tolak</button>`:'-'}</div></td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:#8793a5;padding:28px">Belum ada withdrawal.</td></tr>';
  let opts=sellers.filter(x=>x.status==='approved').map(x=>`<option value="${x.id}">${esc(x.display_name)}${x.store_name?' • '+esc(x.store_name):''}</option>`).join('');if($('#soSeller'))$('#soSeller').innerHTML=opts;if($('#wdSeller'))$('#wdSeller').innerHTML=opts;
}
$$('[data-seller-tab]').forEach(b=>b.onclick=()=>{$$('[data-seller-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('.seller-panel').forEach(x=>x.classList.remove('active'));$('#sellerPanel'+b.dataset.sellerTab[0].toUpperCase()+b.dataset.sellerTab.slice(1)).classList.add('active')});
$('#sellerSearch').oninput=renderSellerCenter;$('#sellerOrderFilter').onchange=renderSellerCenter;if($('#marketplaceOrderFilter'))$('#marketplaceOrderFilter').onchange=renderSellerCenter;
$('#addSellerBtn').onclick=()=>{$('#smName').value='';$('#smStore').value='';$('#smContact').value='';$('#smEmail').value='';openModal('#sellerModal')};
$('#saveSellerBtn').onclick=async()=>{let display_name=$('#smName').value.trim();if(!display_name){alert('Nama seller wajib diisi.');return}let {error}=await sb.from('sellers').insert({display_name,store_name:$('#smStore').value.trim()||null,contact:$('#smContact').value.trim()||null,email:$('#smEmail').value.trim()||null,status:'pending'});if(error){alert(error.message);return}$('#sellerModal').classList.remove('open');await loadSellerCenterSafe()};
window.setSellerStatus=async(id,status)=>{let {error}=await sb.from('sellers').update({status}).eq('id',id);if(error)alert(error.message);else await loadSellerCenterSafe()};
$('#addSellerOrderBtn').onclick=()=>{renderSellerCenter();$('#soBuyer').value='';$('#soProduct').value='';$('#soSell').value='';$('#soCost').value='';$('#soStatus').value='Pending';openModal('#sellerOrderModal')};
$('#saveSellerOrderBtn').onclick=async()=>{let sell=Number($('#soSell').value||0),cost=Number($('#soCost').value||0),seller_id=$('#soSeller').value,product_name=$('#soProduct').value.trim();if(!seller_id||!product_name||sell<cost){alert('Pilih seller, isi produk, dan pastikan harga jual tidak lebih kecil dari modal.');return}let {data,error}=await sb.from('seller_orders').insert({seller_id,buyer_name:$('#soBuyer').value.trim()||null,product_name,sell_price:sell,cost_price:cost,seller_profit:sell-cost,status:$('#soStatus').value,created_by:currentEmployee.id}).select().single();if(error){alert(error.message);return}if(data.status==='Selesai'){let lr=await sb.from('seller_ledger').insert({seller_id,entry_type:'order_profit',amount:data.seller_profit,reference_id:data.id,note:'Profit order '+product_name,created_by:currentEmployee.id});if(lr.error){alert('Order tersimpan, ledger gagal: '+lr.error.message)}}$('#sellerOrderModal').classList.remove('open');await loadSellerCenterSafe()};
window.setMarketplaceOrder=async(id,status,paymentStatus)=>{const x=marketplaceOrders.find(o=>o.id===id);if(!x)return;if(status==='Selesai'&&!confirm('Tandai order Marketplace '+x.order_code+' sebagai SELESAI? Stok dan ledger tidak berubah otomatis.'))return;if(status==='Dibatalkan'&&!confirm('Batalkan order Marketplace '+x.order_code+'?'))return;let {error}=await sb.rpc('admin_set_marketplace_order_status',{p_order_id:id,p_status:status,p_payment_status:paymentStatus});if(error)alert(error.message);else await loadSellerCenterSafe()};
window.finishSellerOrder=async id=>{let x=sellerOrders.find(o=>o.id===id);if(!x)return;if(!confirm('Tandai order selesai dan kreditkan profit seller '+rupiah(x.seller_profit)+'?'))return;let {error}=await sb.from('seller_orders').update({status:'Selesai',completed_at:new Date().toISOString()}).eq('id',id);if(error){alert(error.message);return}let {error:le}=await sb.from('seller_ledger').insert({seller_id:x.seller_id,entry_type:'order_profit',amount:x.seller_profit,reference_id:x.id,note:'Profit order '+x.product_name,created_by:currentEmployee.id});if(le&&!String(le.message).includes('duplicate'))alert('Status selesai, tetapi ledger gagal: '+le.message);await loadSellerCenterSafe()};
$('#addWithdrawalBtn').onclick=()=>{renderSellerCenter();$('#wdAmount').value='';$('#wdBank').value='';$('#wdAccount').value='';$('#wdOwner').value='';openModal('#withdrawalModal')};
$('#saveWithdrawalBtn').onclick=async()=>{let seller_id=$('#wdSeller').value,amount=Number($('#wdAmount').value||0),bal=sellerBalance(seller_id);if(!seller_id||amount<=0){alert('Seller dan nominal wajib diisi.');return}if(amount>bal){alert('Nominal melebihi saldo ledger seller ('+rupiah(bal)+').');return}let {error}=await sb.from('withdrawal_requests').insert({seller_id,amount,destination_type:$('#wdBank').value.trim()||'Manual',destination_account:$('#wdAccount').value.trim(),destination_name:$('#wdOwner').value.trim(),status:'pending',requested_by:currentEmployee.id});if(error){alert(error.message);return}$('#withdrawalModal').classList.remove('open');await loadSellerCenterSafe()};
window.markWithdrawalPaid=async id=>{let w=withdrawalRequests.find(x=>x.id===id);if(!w)return;if(!confirm('Pastikan transfer sudah benar-benar dilakukan di bank/e-wallet. Tandai sebagai DIBAYAR?'))return;let {error}=await sb.from('withdrawal_requests').update({status:'paid',processed_at:new Date().toISOString(),processed_by:currentEmployee.id}).eq('id',id);if(error){alert(error.message);return}let {error:le}=await sb.from('seller_ledger').insert({seller_id:w.seller_id,entry_type:'withdrawal',amount:-Math.abs(Number(w.amount)),reference_id:w.id,note:'Withdrawal manual dibayar',created_by:currentEmployee.id});if(le&&!String(le.message).includes('duplicate'))alert('Withdrawal ditandai dibayar, ledger debit gagal: '+le.message);await loadSellerCenterSafe()};
window.rejectWithdrawal=async id=>{if(!confirm('Tolak permintaan withdrawal ini?'))return;let {error}=await sb.from('withdrawal_requests').update({status:'rejected',processed_at:new Date().toISOString(),processed_by:currentEmployee.id}).eq('id',id);if(error)alert(error.message);else await loadSellerCenterSafe()};

function leaveStatusClass(s){return s==='Disetujui'?'disetujui':s==='Ditolak'?'ditolak':'menunggu'}
function renderLeave(){
  if(!currentEmployee)return;
  $('#lWait').textContent=leaveRequests.filter(x=>x.status==='Menunggu').length;
  $('#lApproved').textContent=leaveRequests.filter(x=>x.status==='Disetujui').length;
  $('#lRejected').textContent=leaveRequests.filter(x=>x.status==='Ditolak').length;
  $('#lTotal').textContent=leaveRequests.length;
  $('#leaveRows').innerHTML=leaveRequests.length?leaveRequests.map(x=>{
    let actions='';
    if(currentEmployee.role==='admin'&&x.status==='Menunggu'){
      actions=`<div class="rowactions"><button class="btn primary" onclick="approveLeave('${x.id}')">Setujui</button><button class="btn danger" onclick="rejectLeave('${x.id}')">Tolak</button></div>`;
    }
    return `<div class="leavecard"><div class="leavehead"><div><div class="leave-title">${currentEmployee.role==='admin'?esc(x.employee_name)+' • ':''}${esc(x.leave_type)}</div>
      <div class="leave-meta"><span class="badge ${leaveStatusClass(x.status)}">${esc(x.status)}</span><span class="badge nonaktif">${esc(x.start_date)} s/d ${esc(x.end_date)}</span></div></div>${actions}</div>
      <div class="leave-reason">${esc(x.reason)}</div>${x.admin_note?`<div class="muted" style="margin-top:8px">Catatan Bos: ${esc(x.admin_note)}</div>`:''}</div>`;
  }).join(''):'<div class="card" style="text-align:center;color:#8793a5">Belum ada pengajuan.</div>';
}

$('#addLeave').onclick=()=>{
  $('#lvType').value='Izin';$('#lvStart').value=ymd();$('#lvEnd').value=ymd();$('#lvReason').value='';
  openModal('#leaveModal');
};

$('#saveLeave').onclick=async()=>{
  let start=$('#lvStart').value,end=$('#lvEnd').value,reason=$('#lvReason').value.trim();
  if(!start||!end||!reason){alert('Tanggal dan alasan wajib diisi.');return}
  if(end<start){alert('Tanggal selesai tidak boleh sebelum tanggal mulai.');return}
  let {error}=await sb.from('leave_requests').insert({
    employee_id:currentEmployee.id,leave_type:$('#lvType').value,start_date:start,end_date:end,reason
  });
  if(error){alert(error.message);return}
  $('#leaveModal').classList.remove('open');await refreshData();
};

window.approveLeave=async id=>{
  let req=leaveRequests.find(x=>x.id===id);if(!req)return;
  let note=prompt('Catatan Bos (opsional):','')||null;
  let {error}=await sb.from('leave_requests').update({
    status:'Disetujui',admin_note:note,approved_by:currentEmployee.id,approved_at:new Date().toISOString()
  }).eq('id',id);
  if(error){alert(error.message);return}

  let d=new Date(req.start_date+'T00:00:00'),end=new Date(req.end_date+'T00:00:00');
  while(d<=end){
    if(d.getDay()!==0){
      let ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      let attStatus=req.leave_type==='Sakit'?'Sakit':'Izin';
      let res=await sb.from('attendance').upsert({
        employee_id:req.employee_id,attendance_date:ds,status:attStatus,note:req.leave_type+' - '+req.reason
      },{onConflict:'employee_id,attendance_date'});
      if(res.error){alert('Pengajuan disetujui, tapi rekap absensi gagal: '+res.error.message);break}
    }
    d.setDate(d.getDate()+1);
  }
  await refreshData();
};

window.rejectLeave=async id=>{
  let note=prompt('Alasan penolakan (opsional):','')||null;
  let {error}=await sb.from('leave_requests').update({
    status:'Ditolak',admin_note:note,approved_by:currentEmployee.id,approved_at:new Date().toISOString()
  }).eq('id',id);
  if(error){alert(error.message);return}
  await refreshData();
};


function time5(v){return (v||'').slice(0,5)}
function isWorkDay(d){
 const keys=['work_sunday','work_monday','work_tuesday','work_wednesday','work_thursday','work_friday','work_saturday'];
 return !!officeSettings[keys[d.getDay()]];
}
function workDayLabel(){
 const names=[['Sen',officeSettings.work_monday],['Sel',officeSettings.work_tuesday],['Rab',officeSettings.work_wednesday],['Kam',officeSettings.work_thursday],['Jum',officeSettings.work_friday],['Sab',officeSettings.work_saturday],['Min',officeSettings.work_sunday]];
 return names.filter(x=>x[1]).map(x=>x[0]).join(', ');
}
function renderSettings(){
 if(!officeSettings)return;
 $('#recapRule').textContent=`Hari kerja ${workDayLabel()} • Masuk ${time5(officeSettings.work_start)} • Toleransi ${time5(officeSettings.late_after)} • Pulang ${time5(officeSettings.work_end)}`;
 if(currentEmployee.role!=='admin')return;
 $('#sOffice').value=officeSettings.office_name||'HomeOffice'; $('#sStart').value=time5(officeSettings.work_start); $('#sLate').value=time5(officeSettings.late_after); $('#sEnd').value=time5(officeSettings.work_end);
 [['sMon','work_monday'],['sTue','work_tuesday'],['sWed','work_wednesday'],['sThu','work_thursday'],['sFri','work_friday'],['sSat','work_saturday'],['sSun','work_sunday']].forEach(([a,b])=>$('#'+a).checked=!!officeSettings[b]);
}
$('#saveSettings').onclick=async()=>{
 if($('#sLate').value<$('#sStart').value){alert('Batas toleransi tidak boleh sebelum jam masuk.');return}
 let payload={office_name:$('#sOffice').value.trim()||'HomeOffice',work_start:$('#sStart').value,late_after:$('#sLate').value,work_end:$('#sEnd').value,work_monday:$('#sMon').checked,work_tuesday:$('#sTue').checked,work_wednesday:$('#sWed').checked,work_thursday:$('#sThu').checked,work_friday:$('#sFri').checked,work_saturday:$('#sSat').checked,work_sunday:$('#sSun').checked,updated_at:new Date().toISOString()};
 if(!payload.work_start||!payload.late_after||!payload.work_end){alert('Jam masuk, toleransi, dan pulang wajib diisi.');return}
 let {error}=await sb.from('office_settings').update(payload).eq('id',1);
 if(error){alert(error.message);return} await refreshData(); alert('Pengaturan kantor berhasil disimpan.');
};




function buildSalarySlip(){
  if(!currentEmployee || currentEmployee.role!=='admin') return;
  let selected=$('#payrollEmployee').value;
  if(!selected){alert('Pilih satu karyawan terlebih dahulu.');return}
  let rows=getPayrollRows();
  let x=rows.find(r=>r.emp.id===selected);
  if(!x){alert('Data karyawan tidak ditemukan.');return}
  let month=$('#payrollMonth').value||ymd().slice(0,7);
  let [yy,mm]=month.split('-');
  let period=new Date(Number(yy),Number(mm)-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  $('#slipOffice').textContent=(officeSettings&&officeSettings.office_name)||'HomeOffice';
  $('#slipPeriod').textContent='Tanggal 1–30 • '+period;
  $('#slipName').textContent=x.emp.full_name;
  $('#slipDaily').textContent=rupiah(x.daily);
  $('#slipPaidDays').textContent=x.paidDays+' hari';
  $('#slipBase').textContent=rupiah(x.gross);
  $('#slipLate').textContent=x.late+' kejadian × '+rupiah(payrollSettings?.late_penalty||5000);
  $('#slipPenalty').textContent=rupiah(x.penalty);
  $('#slipIzin').textContent=x.izin+' hari';
  $('#slipSakit').textContent=x.sakit+' hari';
  $('#slipCuti').textContent=(x.cuti||0)+' hari';
  $('#slipNet').textContent=rupiah(x.net);
  openModal('#slipModal');
}
$('#openSlip').onclick=buildSalarySlip;
$('#printSlip').onclick=()=>window.print();


function openPayrollSettings(){
  $('#psLate').value=Number(payrollSettings?.late_penalty||0);
  $('#psIzin').value=Number(payrollSettings?.izin_penalty||0);
  $('#psSakit').value=Number(payrollSettings?.sakit_penalty||0);
  $('#psCuti').value=Number(payrollSettings?.cuti_penalty||0);
  openModal('#payrollSettingsModal');
}
$('#payrollSettingsBtn').onclick=openPayrollSettings;

$('#savePayrollSettings').onclick=async()=>{
  const payload={
    late_penalty:Math.max(0,Number($('#psLate').value||0)),
    izin_penalty:Math.max(0,Number($('#psIzin').value||0)),
    sakit_penalty:Math.max(0,Number($('#psSakit').value||0)),
    cuti_penalty:Math.max(0,Number($('#psCuti').value||0)),
    updated_at:new Date().toISOString()
  };
  const {data,error}=await sb.from('payroll_settings').update(payload).eq('id',1).select().single();
  if(error){alert(error.message);return}
  payrollSettings=data||payload;
  $('#payrollSettingsModal').classList.remove('open');
  renderPayroll();
  alert('Pengaturan potongan berhasil disimpan.');
};

const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0));

function getPayrollRows(){
  if(!currentEmployee || currentEmployee.role!=='admin') return [];
  if(!$('#payrollMonth').value) $('#payrollMonth').value=ymd().slice(0,7);
  let month=$('#payrollMonth').value;
  let selected=$('#payrollEmployee').value;
  const old=selected;

  $('#payrollEmployee').innerHTML='<option value="">Semua karyawan</option>'+
    employees.filter(x=>x.role==='employee').map(x=>`<option value="${x.id}" ${x.id===old?'selected':''}>${esc(x.full_name)}</option>`).join('');

  let staff=employees.filter(x=>x.role==='employee');
  if(selected) staff=staff.filter(x=>x.id===selected);

  return staff.map(emp=>{
    let a=attendance.filter(x=>x.employee_id===emp.id && x.attendance_date && x.attendance_date.startsWith(month));
    // V16: periode payroll hanya tanggal 1–30. Tanggal 31 tidak dihitung.
    a=a.filter(x=>Number((x.attendance_date||'').slice(-2))<=30);
    let paidDays=a.filter(x=>x.check_in&&x.check_out).length;
    let late=a.filter(x=>x.status==='Terlambat').length;
    let izin=a.filter(x=>x.status==='Izin').length;
    let sakit=a.filter(x=>x.status==='Sakit').length;
    let cuti=leaveRequests.filter(x=>x.employee_id===emp.id&&x.status==='Disetujui'&&x.leave_type==='Cuti'&&x.start_date&&x.start_date.startsWith(month)&&Number(x.start_date.slice(-2))<=30).length;
    let daily=Number(emp.daily_salary||0);
    let gross=paidDays*daily;
    let latePenalty=late*Number(payrollSettings?.late_penalty||0);
    let izinPenalty=izin*Number(payrollSettings?.izin_penalty||0);
    let sakitPenalty=sakit*Number(payrollSettings?.sakit_penalty||0);
    let cutiPenalty=cuti*Number(payrollSettings?.cuti_penalty||0);
    let penalty=latePenalty+izinPenalty+sakitPenalty+cutiPenalty;
    let net=Math.max(0,gross-penalty);
    return {emp,paidDays,daily,gross,late,izin,sakit,cuti,base:gross,latePenalty,izinPenalty,sakitPenalty,cutiPenalty,penalty,net};
  });
}

function renderPayroll(){
  if(!currentEmployee || currentEmployee.role!=='admin') return;
  let rows=getPayrollRows();

  $('#pBase').textContent=rupiah(rows.reduce((s,x)=>s+x.base,0));
  $('#pLate').textContent=rows.reduce((s,x)=>s+x.late,0);
  $('#pPenalty').textContent=rupiah(rows.reduce((s,x)=>s+x.penalty,0));
  $('#pNet').textContent=rupiah(rows.reduce((s,x)=>s+x.net,0));

  $('#payrollRows').innerHTML=rows.length?rows.map(x=>`<tr>
    <td><b>${esc(x.emp.full_name)}</b></td>
    <td>${rupiah(x.daily)}</td>
    <td><b>${x.paidDays} hari</b></td>
    <td>${rupiah(x.gross)}</td>
    <td>${x.late} × ${rupiah(payrollSettings?.late_penalty||0)}</td>
    <td>${x.izin} × ${rupiah(payrollSettings?.izin_penalty||0)}</td>
    <td>${x.sakit} × ${rupiah(payrollSettings?.sakit_penalty||0)}</td>
    <td>${x.cuti} × ${rupiah(payrollSettings?.cuti_penalty||0)}</td>
    <td>${rupiah(x.penalty)}</td>
    <td><b>${rupiah(x.net)}</b></td>
    <td><button class="btn" onclick="editSalary('${x.emp.id}')">Edit Gaji Harian</button></td>
  </tr>`).join(''):'<tr><td colspan="11" style="text-align:center;color:#8793a5;padding:28px">Belum ada data karyawan.</td></tr>';
}

$('#payrollMonth').onchange=renderPayroll;
$('#payrollEmployee').onchange=renderPayroll;

window.editSalary=id=>{
  let emp=employees.find(x=>x.id===id);if(!emp)return;
  $('#salaryEmployeeId').value=emp.id;
  $('#salaryEmployeeName').value=emp.full_name;
  $('#salaryAmount').value=Number(emp.base_salary||0);
  openModal('#salaryModal');
};

$('#saveSalary').onclick=async()=>{
  let id=$('#salaryEmployeeId').value;
  let amount=Number($('#salaryAmount').value||0);
  if(amount<0){alert('Gaji tidak boleh negatif.');return}
  let {error}=await sb.from('employees').update({base_salary:amount}).eq('id',id);
  if(error){alert(error.message);return}
  $('#salaryModal').classList.remove('open');
  await refreshData();
};

function getReportRows(){
  if(!currentEmployee || currentEmployee.role!=='admin') return [];
  if(!$('#reportMonth').value) $('#reportMonth').value=ymd().slice(0,7);
  let month=$('#reportMonth').value;
  let emp=$('#reportEmployee').value;

  const prev=emp;
  $('#reportEmployee').innerHTML='<option value="">Semua karyawan</option>'+
    employees.filter(x=>x.role==='employee').map(x=>`<option value="${x.id}" ${x.id===prev?'selected':''}>${esc(x.full_name)}</option>`).join('');

  let rows=attendance.filter(x=>x.attendance_date && x.attendance_date.startsWith(month));
  if(emp) rows=rows.filter(x=>x.employee_id===emp);
  return rows.sort((a,b)=>a.attendance_date.localeCompare(b.attendance_date) || String(a.name).localeCompare(String(b.name)));
}

function renderReports(){
  if(!currentEmployee || currentEmployee.role!=='admin') return;
  let rows=getReportRows();
  let early=x=>x.check_out && officeSettings && x.check_out < officeSettings.work_end.slice(0,5);

  $('#repHadir').textContent=rows.filter(x=>x.status==='Hadir').length;
  $('#repLate').textContent=rows.filter(x=>x.status==='Terlambat').length;
  $('#repLeave').textContent=rows.filter(x=>x.status==='Izin'||x.status==='Sakit').length;
  $('#repEarly').textContent=rows.filter(early).length;

  $('#reportRows').innerHTML=rows.length?rows.map(x=>{
    let day=new Date(x.attendance_date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long'});
    return `<tr>
      <td><b>${esc(x.name)}</b></td>
      <td>${esc(x.attendance_date)}</td>
      <td>${esc(day)}</td>
      <td>${esc(x.check_in||'-')}</td>
      <td>${esc(x.check_out||'-')}</td>
      <td>${badge(x.status)}</td>
      <td>${early(x)?'<span class="badge telat">Ya</span>':'Tidak'}</td>
      <td>${esc(x.note||'-')}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" style="text-align:center;color:#8793a5;padding:28px">Belum ada data laporan bulan ini.</td></tr>';
}

$('#reportMonth').onchange=renderReports;
$('#reportEmployee').onchange=renderReports;

$('#exportReport').onclick=()=>{
  let rows=getReportRows();
  if(!rows.length){alert('Belum ada data untuk diekspor.');return}
  let early=x=>x.check_out && officeSettings && x.check_out < officeSettings.work_end.slice(0,5);
  let data=rows.map(x=>({
    'Nama':x.name,
    'Tanggal':x.attendance_date,
    'Hari':new Date(x.attendance_date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long'}),
    'Jam Masuk':x.check_in||'',
    'Jam Pulang':x.check_out||'',
    'Status':x.status,
    'Pulang Cepat':early(x)?'Ya':'Tidak',
    'Catatan':x.note||''
  }));
  let ws=XLSX.utils.json_to_sheet(data);
  ws['!cols']=[{wch:25},{wch:12},{wch:12},{wch:12},{wch:12},{wch:15},{wch:14},{wch:35}];
  let wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Absensi');
  let month=$('#reportMonth').value||ymd().slice(0,7);
  let selectedName=$('#reportEmployee').selectedOptions[0]?.textContent||'Semua';
  let safe=selectedName.replace(/[^a-z0-9_-]+/gi,'_');
  XLSX.writeFile(wb,`Laporan_Absensi_${safe}_${month}.xlsx`);
};

function renderRecap(){
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  if(!$('#recapMonth').value)$('#recapMonth').value=ymd().slice(0,7);
  let chosen=$('#recapEmployee').value;
  $('#recapEmployee').innerHTML='<option value="">Semua karyawan</option>'+employees.filter(x=>x.role==='employee').map(x=>`<option value="${x.id}" ${x.id===chosen?'selected':''}>${esc(x.full_name)}</option>`).join('');
  let rows=attendance.filter(x=>x.attendance_date&&x.attendance_date.startsWith($('#recapMonth').value));
  if(chosen)rows=rows.filter(x=>x.employee_id===chosen);
  let early=x=>x.check_out&&x.check_out<time5(officeSettings.work_end);
  $('#rHadir').textContent=rows.filter(x=>x.status==='Hadir').length;
  $('#rLate').textContent=rows.filter(x=>x.status==='Terlambat').length;
  $('#rLeave').textContent=rows.filter(x=>x.status==='Izin'||x.status==='Sakit').length;
  $('#rEarly').textContent=rows.filter(early).length;
  let archived=attendanceArchive.filter(x=>x.attendance_date&&x.attendance_date.startsWith($('#recapMonth').value));
  if(chosen)archived=archived.filter(x=>x.employee_id===chosen);
  const liveHtml=rows.map(x=>{
    let day=new Date(x.attendance_date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long'});
    return `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.attendance_date)}</td><td>${esc(day)}</td><td>${esc(x.check_in||'-')}</td><td>${esc(x.check_out||'-')}</td><td>${badge(x.status)}</td><td>${early(x)?'<span class="badge telat">Pulang Cepat</span>':esc(x.note||'-')}</td></tr>`;
  }).join('');
  const archiveHtml=archived.map(x=>{
    let day=new Date(x.attendance_date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long'});
    return `<tr style="background:#fff8e6"><td><b>${esc(x.name)}</b><div class="muted">ARSIP RESET</div></td><td>${esc(x.attendance_date)}</td><td>${esc(day)}</td><td>${esc(x.check_in||'-')}</td><td>${esc(x.check_out||'-')}</td><td>${badge(x.status)}</td><td><span class="badge telat">ARSIP RESET</span> ${esc(x.reset_reason||'')}</td></tr>`;
  }).join('');
  $('#recapRows').innerHTML=(liveHtml+archiveHtml)||'<tr><td colspan="7" style="text-align:center;color:#8793a5;padding:28px">Belum ada data bulan ini.</td></tr>';
}
$('#recapMonth').onchange=renderRecap;$('#recapEmployee').onchange=renderRecap;

$('#filterDate').value='';$('#filterDate').onchange=renderAttendance;$('#filterStatus').onchange=renderAttendance;$('#employeeSearch').oninput=renderEmployees;

$('#clockIn').onclick=async()=>{
 let x=attendance.find(a=>a.attendance_date===ymd());
 if(x&&x.check_in){alert('Kamu sudah absen masuk hari ini.');return}
 if(!isWorkDay(new Date())){alert('Hari ini bukan hari kerja. Absensi tidak dibuka.');return}
 let t=hm(),status=t>time5(officeSettings.late_after)?'Terlambat':'Hadir';
 let res=x?await sb.from('attendance').update({check_in:t,status}).eq('id',x.id):await sb.from('attendance').insert({employee_id:currentEmployee.id,attendance_date:ymd(),check_in:t,status});
 if(res.error){alert(res.error.message);return}await refreshData();alert('Absensi masuk berhasil: '+t);
}

$('#clockOut').onclick=async()=>{
 let x=attendance.find(a=>a.attendance_date===ymd());
 if(!x||!x.check_in){alert('Silakan absen masuk terlebih dahulu.');return}
 if(x.check_out){alert('Kamu sudah absen pulang.');return}
 let t=hm();let {error}=await sb.from('attendance').update({check_out:t}).eq('id',x.id);
 if(error){alert(error.message);return}await refreshData();alert('Absensi pulang berhasil: '+t);
}

function openModal(id){$(id).classList.add('open')}$$('.modalCancel').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('open'));
function resetEmployeeForm(){$('#eId').value='';$('#eName').value='';$('#eJob').value='';$('#eUser').value='';$('#ePhone').value='';$('#eJoin').value=ymd();$('#eActive').value='true';$('#eEmail').value='';$('#eAddress').value=''}
$('#addEmployee').onclick=()=>{resetEmployeeForm();$('#employeeModalTitle').textContent='Tambah Data Karyawan';openModal('#employeeModal')};

window.editEmployee=id=>{let u=employees.find(x=>x.id===id);if(!u)return;$('#employeeModalTitle').textContent='Edit Karyawan';$('#eId').value=u.id;$('#eName').value=u.full_name||'';$('#eJob').value=u.job_title||'';$('#eUser').value=u.username||'';$('#ePhone').value=u.phone||'';$('#eJoin').value=u.join_date||'';$('#eActive').value=String(u.active);$('#eEmail').value=u.email||'';$('#eAddress').value=u.address||'';openModal('#employeeModal')};
window.viewEmployee=id=>{let u=employees.find(x=>x.id===id);if(!u)return;$('#employeeDetail').innerHTML=`<div class="detailgrid"><div class="detailitem"><span class="muted">Nama</span><b>${esc(u.full_name)}</b></div><div class="detailitem"><span class="muted">Jabatan</span><b>${esc(u.job_title||'-')}</b></div><div class="detailitem"><span class="muted">Username</span><b>${esc(u.username)}</b></div><div class="detailitem"><span class="muted">HP</span><b>${esc(u.phone||'-')}</b></div><div class="detailitem"><span class="muted">Email</span><b>${esc(u.email||'-')}</b></div><div class="detailitem"><span class="muted">Tanggal Masuk</span><b>${esc(u.join_date||'-')}</b></div><div class="detailitem"><span class="muted">Status</span><b>${u.active?'Aktif':'Nonaktif'}</b></div><div class="detailitem" style="grid-column:1/-1"><span class="muted">Alamat</span><b>${esc(u.address||'-')}</b></div></div>`;openModal('#employeeDetailModal')};

window.toggleEmployee=async id=>{let u=employees.find(x=>x.id===id);if(!u)return;let {error}=await sb.from('employees').update({active:!u.active}).eq('id',id);if(error)alert(error.message);else await refreshData()};

$('#saveEmployee').onclick=async()=>{
 let id=$('#eId').value,name=$('#eName').value.trim(),username=$('#eUser').value.trim();
 if(!name||!username){alert('Nama dan username wajib diisi.');return}
 let payload={full_name:name,username,job_title:$('#eJob').value.trim()||null,phone:$('#ePhone').value.trim()||null,email:$('#eEmail').value.trim()||null,join_date:$('#eJoin').value||null,address:$('#eAddress').value.trim()||null,active:$('#eActive').value==='true',role:'employee'};
 let res=id?await sb.from('employees').update(payload).eq('id',id):await sb.from('employees').insert(payload);
 if(res.error){alert(res.error.message);return}$('#employeeModal').classList.remove('open');await refreshData();
}

$('#manualAttendance').onclick=()=>{$('#aEmployee').innerHTML=employees.filter(x=>x.role==='employee'&&x.active).map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join('');$('#aDate').value=ymd();$('#aIn').value='';$('#aOut').value='';$('#aStatus').value='Hadir';$('#aNote').value='';openModal('#attendanceModal')};
$('#saveAttendance').onclick=async()=>{let payload={employee_id:$('#aEmployee').value,attendance_date:$('#aDate').value,check_in:$('#aIn').value||null,check_out:$('#aOut').value||null,status:$('#aStatus').value,note:$('#aNote').value.trim()||null};let {error}=await sb.from('attendance').upsert(payload,{onConflict:'employee_id,attendance_date'});if(error){alert(error.message);return}$('#attendanceModal').classList.remove('open');await refreshData()};


/* ===== V13 STOCK MODULE - isolated from core HomeOffice ===== */
function stockStatus(p){
  const qty=Number(p.stock||0), min=Number(p.minimum_stock||0);
  if(qty<=0) return {label:'Habis',cls:'stock-out'};
  if(qty<=min) return {label:'Menipis',cls:'stock-low'};
  return {label:'Aman',cls:'stock-ok'};
}

async function loadStockSafe(){
  try{
    const info=$('#stockLoadInfo');
    if(info){info.classList.add('hidden');info.textContent='';}

    const res=await sb.from('product_stock').select('*').eq('active',true).order('product_name');
    if(res.error) throw res.error;
    productStocks=res.data||[];

    if(currentEmployee && currentEmployee.role==='admin'){
      const hr=await sb.from('stock_history').select('*').order('created_at',{ascending:false}).limit(30);
      stockHistory=hr.error?[]:(hr.data||[]);
    }else{
      stockHistory=[];
    }
    renderStockSafe(); if(currentEmployee?.role==='admin')renderBossDashboard();
  }catch(err){
    console.error('Stock module:',err);
    const info=$('#stockLoadInfo');
    if(info){
      info.classList.remove('hidden');
      info.textContent='Modul stok gagal dimuat. Fitur HomeOffice lain tetap aman.';
    }
    renderStockSafe(); if(currentEmployee?.role==='admin')renderBossDashboard();
  }
}

function renderStockSafe(){
  const cards=$('#stockCards');
  if(!cards) return;

  $('#stockCount').textContent=productStocks.length;
  $('#stockSafe').textContent=productStocks.filter(p=>Number(p.stock)>Number(p.minimum_stock)).length;
  $('#stockLow').textContent=productStocks.filter(p=>Number(p.stock)>0&&Number(p.stock)<=Number(p.minimum_stock)).length;
  $('#stockOut').textContent=productStocks.filter(p=>Number(p.stock)<=0).length;

  cards.innerHTML=productStocks.length?productStocks.map(p=>{
    const st=stockStatus(p);
    const actions=(currentEmployee&&currentEmployee.role==='admin')?`
      <div class="stockactions">
        <button class="btn primary" onclick="openStockChange('${p.id}','add')">+ Stok</button>
        <button class="btn" onclick="openStockChange('${p.id}','subtract')">− Stok</button>
        <button class="btn" onclick="editStockProduct('${p.id}')">Edit</button>
        <button class="btn danger" onclick="removeStockProduct('${p.id}')">Hapus</button>
      </div>`:'';
    return `<div class="stockcard">
      <div class="stockname">${esc(p.product_name)}</div>
      <div style="margin-top:8px"><span class="badge ${st.cls}">${st.label}</span></div>
      <div class="stockqty">${Number(p.stock)}</div>
      <div class="muted">Stok tersedia hari ini</div>
      ${actions}
    </div>`;
  }).join(''):'<div class="card" style="text-align:center;color:#8793a5">Belum ada produk stok.</div>';

  if(currentEmployee&&currentEmployee.role==='admin'){
    const hist=$('#stockHistory');
    if(hist){
      hist.innerHTML=stockHistory.length?stockHistory.map(h=>{
        const p=productStocks.find(x=>x.id===h.product_id);
        const productName=p?p.product_name:'Produk';
        const sign=Number(h.change_amount)>0?'+':'';
        return `<div class="stock-history-item">
          <b>${esc(productName)}</b> &nbsp; ${h.old_stock} → ${h.new_stock}
          <span class="badge ${Number(h.change_amount)>=0?'stock-ok':'stock-low'}">${sign}${h.change_amount}</span>
          <div class="muted">${esc(h.note||'-')} • ${new Date(h.created_at).toLocaleString('id-ID')}</div>
        </div>`;
      }).join(''):'<div class="muted">Belum ada riwayat.</div>';
    }
  }
}

function setupStockRealtimeSafe(){
  try{
    if(stockRealtimeChannel){
      sb.removeChannel(stockRealtimeChannel);
      stockRealtimeChannel=null;
    }
    stockRealtimeChannel=sb.channel('yanstore-stock-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'product_stock'},()=>{loadStockSafe();})
      .subscribe();
  }catch(err){
    console.error('Realtime stock tidak aktif:',err);
  }
}

$('#addStockProduct').onclick=()=>{
  $('#stockProductModalTitle').textContent='Tambah Produk';
  $('#stockProductId').value='';
  $('#stockProductName').value='';
  $('#stockProductQty').value='0';
  $('#stockProductQty').disabled=false;
  $('#stockMinimum').value='5';
  openModal('#stockProductModal');
};

window.editStockProduct=id=>{
  const p=productStocks.find(x=>x.id===id);
  if(!p)return;
  $('#stockProductModalTitle').textContent='Edit Produk';
  $('#stockProductId').value=p.id;
  $('#stockProductName').value=p.product_name;
  $('#stockProductQty').value=p.stock;
  $('#stockProductQty').disabled=true;
  $('#stockMinimum').value=p.minimum_stock;
  openModal('#stockProductModal');
};

$('#saveStockProduct').onclick=async()=>{
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  const id=$('#stockProductId').value;
  const name=$('#stockProductName').value.trim();
  const minimum=Math.max(0,Math.floor(Number($('#stockMinimum').value||0)));
  if(!name){alert('Nama produk wajib diisi.');return}

  if(id){
    const r=await sb.from('product_stock').update({
      product_name:name,minimum_stock:minimum,updated_at:new Date().toISOString()
    }).eq('id',id);
    if(r.error){alert(r.error.message);return}
  }else{
    const qty=Math.max(0,Math.floor(Number($('#stockProductQty').value||0)));
    const r=await sb.from('product_stock').insert({
      product_name:name,stock:qty,minimum_stock:minimum,active:true
    }).select().single();
    if(r.error){alert(r.error.message);return}
    if(qty>0){
      await sb.from('stock_history').insert({
        product_id:r.data.id,old_stock:0,new_stock:qty,change_amount:qty,
        note:'Stok awal',changed_by:currentEmployee.id
      });
    }
  }
  $('#stockProductModal').classList.remove('open');
  await loadStockSafe();
  await loadRoutineSafe();
  await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();
};

window.openStockChange=(id,mode)=>{
  const p=productStocks.find(x=>x.id===id);
  if(!p)return;
  $('#stockChangeId').value=id;
  $('#stockChangeMode').value=mode;
  $('#stockChangeQty').value='1';
  $('#stockChangeNote').value='';
  $('#stockChangeTitle').textContent=(mode==='add'?'Tambah Stok - ':'Kurangi Stok - ')+p.product_name;
  openModal('#stockChangeModal');
};

$('#saveStockChange').onclick=async()=>{
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  const id=$('#stockChangeId').value;
  const mode=$('#stockChangeMode').value;
  const qty=Math.floor(Number($('#stockChangeQty').value||0));
  if(qty<1){alert('Jumlah minimal 1.');return}

  const p=productStocks.find(x=>x.id===id);
  if(!p){alert('Produk tidak ditemukan.');return}
  const oldStock=Number(p.stock||0);
  const newStock=mode==='add'?oldStock+qty:oldStock-qty;
  if(newStock<0){alert('Stok tidak cukup. Stok saat ini '+oldStock+'.');return}

  const r=await sb.from('product_stock').update({
    stock:newStock,updated_at:new Date().toISOString()
  }).eq('id',id);
  if(r.error){alert(r.error.message);return}

  const note=$('#stockChangeNote').value.trim()||(mode==='add'?'Stok masuk':'Stok keluar');
  const h=await sb.from('stock_history').insert({
    product_id:id,old_stock:oldStock,new_stock:newStock,
    change_amount:newStock-oldStock,note,changed_by:currentEmployee.id
  });
  if(h.error)console.warn('Riwayat stok:',h.error.message);

  $('#stockChangeModal').classList.remove('open');
  await loadStockSafe();
  await loadRoutineSafe();
  await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();
};

window.removeStockProduct=async id=>{
  if(!currentEmployee||currentEmployee.role!=='admin')return;
  const p=productStocks.find(x=>x.id===id);
  if(!p)return;
  if(!confirm('Hapus '+p.product_name+' dari daftar stok?'))return;
  const r=await sb.from('product_stock').delete().eq('id',id);
  if(r.error){alert(r.error.message);return}
  await loadStockSafe();
  await loadRoutineSafe();
  await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();
};
/* ===== END STOCK MODULE ===== */



async function loadAttendanceArchiveSafe(){
  try{
    if(!currentEmployee||currentEmployee.role!=='admin'){attendanceArchive=[];return}
    const {data,error}=await sb.from('attendance_archive')
      .select('*, employees(full_name)')
      .order('archived_at',{ascending:false});
    if(error)throw error;
    attendanceArchive=(data||[]).map(x=>({...x,name:x.employees?.full_name||x.employee_name||'-'}));
  }catch(err){
    console.error('Attendance archive:',err);
    attendanceArchive=[];
  }
}

async function archiveAndDeleteAttendance(row,reason){
  const ar=await sb.from('attendance_archive').insert({
    original_attendance_id:row.id,
    employee_id:row.employee_id,
    employee_name:row.name||null,
    attendance_date:row.attendance_date,
    check_in:row.check_in||null,
    check_out:row.check_out||null,
    status:row.status,
    note:row.note||null,
    reset_reason:reason||'Reset oleh Bos',
    reset_by:currentEmployee.id
  });
  if(ar.error)throw ar.error;
  const del=await sb.from('attendance').delete().eq('id',row.id);
  if(del.error)throw del.error;
}

$('#resetAttendanceEmployee').onclick=()=>{
  $('#resetEmployee').innerHTML=employees.filter(x=>x.role==='employee'&&x.active)
    .map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join('');
  $('#resetDate').value=ymd();
  $('#resetReason').value='';
  openModal('#resetAttendanceModal');
};

$('#confirmResetEmployee').onclick=async()=>{
  const employeeId=$('#resetEmployee').value;
  const date=$('#resetDate').value;
  const reason=$('#resetReason').value.trim()||'Reset oleh Bos';
  const row=attendance.find(x=>x.employee_id===employeeId&&x.attendance_date===date);
  if(!row){alert('Tidak ada absensi karyawan tersebut pada tanggal ini.');return}
  if(!confirm('Reset absensi '+row.name+' tanggal '+date+'? Data lama tetap masuk arsip rekap.'))return;
  try{
    await archiveAndDeleteAttendance(row,reason);
    $('#resetAttendanceModal').classList.remove('open');
    await refreshData();
    await loadAttendanceArchiveSafe();
    renderRecap();
    alert('Absensi berhasil di-reset. Karyawan dapat absen ulang.');
  }catch(err){alert('Reset gagal: '+err.message)}
};

$('#resetAttendanceAll').onclick=async()=>{
  const date=ymd();
  const rows=attendance.filter(x=>x.attendance_date===date);
  if(!rows.length){alert('Belum ada absensi hari ini.');return}
  if(!confirm('Reset SEMUA absensi hari ini ('+rows.length+' data)? Data lama tetap di arsip.'))return;
  try{
    for(const row of rows)await archiveAndDeleteAttendance(row,'Reset semua absensi hari ini oleh Bos');
    await refreshData();
    await loadAttendanceArchiveSafe();
    renderRecap();
    alert('Semua absensi hari ini berhasil di-reset.');
  }catch(err){alert('Reset gagal: '+err.message)}
}



function renderBossDashboard(){
  if(!currentEmployee || currentEmployee.role!=='admin') return;

  const activeEmployees=employees.filter(x=>x.role==='employee'&&x.active);
  const today=ymd();
  const todayAtt=attendance.filter(x=>x.attendance_date===today);

  const notIn=activeEmployees.filter(e=>!todayAtt.some(a=>a.employee_id===e.id&&a.check_in));
  const notOut=activeEmployees.filter(e=>todayAtt.some(a=>a.employee_id===e.id&&a.check_in&&!a.check_out));
  const pendingLeave=leaveRequests.filter(x=>x.status==='Menunggu').length;
  const openTasks=tasks.filter(x=>x.status!=='Selesai').length;
  const lowStock=productStocks.filter(x=>Number(x.stock)>0&&Number(x.stock)<=Number(x.minimum_stock)).length;
  const outStock=productStocks.filter(x=>Number(x.stock)<=0).length;

  let payrollRows=[];
  try{ payrollRows=getPayrollRows(); }catch(e){ payrollRows=[]; }
  const paidDays=payrollRows.reduce((s,x)=>s+Number(x.paidDays||0),0);
  const payroll=payrollRows.reduce((s,x)=>s+Number(x.net||0),0);

  $('#bNotIn').textContent=notIn.length;
  $('#bNotOut').textContent=notOut.length;
  $('#bPendingLeave').textContent=pendingLeave;
  $('#bOpenTasks').textContent=openTasks;
  $('#bLowStock').textContent=lowStock;
  $('#bOutStock').textContent=outStock;
  $('#bPaidDays').textContent=paidDays;
  $('#bPayroll').textContent=rupiah(payroll);

  const summary=$('#bossEmployeeSummary');
  summary.innerHTML=activeEmployees.length?activeEmployees.map(e=>{
    const a=todayAtt.find(x=>x.employee_id===e.id);
    let status='Belum Absen',cls='nonaktif';
    if(a){
      if(a.check_in&&!a.check_out){status='Sudah Masuk',cls='izin'}
      if(a.check_in&&a.check_out){status='Selesai',cls='hadir'}
      if(a.status==='Terlambat'){status='Terlambat',cls='telat'}
      if(a.status==='Izin'){status='Izin',cls='izin'}
      if(a.status==='Sakit'){status='Sakit',cls='sakit'}
    }
    return `<div class="bossrow"><div><b>${esc(e.full_name)}</b><div class="muted">${esc(e.job_title||'Karyawan')}</div></div><div style="text-align:right"><span class="badge ${cls}">${status}</span><div class="muted" style="margin-top:5px">${a?`${esc(a.check_in||'-')} → ${esc(a.check_out||'-')}`:'-'}</div></div></div>`;
  }).join(''):'<div class="muted">Belum ada karyawan aktif.</div>';
}



/* ===== V19 JOB HARIAN ===== */
async function loadRoutineSafe(){
  try{
    const today=ymd();
    if(currentEmployee.role==='admin'){
      const {data:j}=await sb.from('routine_jobs').select('*, employees(full_name)').eq('active',true).order('created_at');
      routineJobs=j||[];
      const {data:c}=await sb.from('routine_job_checks').select('*').eq('check_date',today);
      routineChecks=c||[];
    }else{
      const {data:j}=await sb.from('routine_jobs').select('*').eq('employee_id',currentEmployee.id).eq('active',true).order('created_at');
      routineJobs=j||[];
      const {data:c}=await sb.from('routine_job_checks').select('*').eq('employee_id',currentEmployee.id).eq('check_date',today);
      routineChecks=c||[];
    }
    renderRoutine();
  }catch(e){console.error('routine',e)}
}

function renderRoutine(){
  if(!currentEmployee)return;
  const today=ymd();
  $('#rjTotal').textContent=routineJobs.length;
  const done=routineJobs.filter(j=>routineChecks.some(c=>c.job_id===j.id&&c.completed)).length;
  $('#rjDone').textContent=done;
  $('#rjOpen').textContent=Math.max(0,routineJobs.length-done);
  $('#rjProgress').textContent=routineJobs.length?Math.round(done/routineJobs.length*100)+'%':'0%';

  $('#routineRows').innerHTML=routineJobs.length?routineJobs.map(j=>{
    const check=routineChecks.find(c=>c.job_id===j.id);
    const isDone=!!check?.completed;
    const name=j.employees?.full_name||currentEmployee.full_name;
    const action=currentEmployee.role==='admin'
      ? `<button class="btn danger" onclick="disableRoutine('${j.id}')">Nonaktifkan</button>`
      : `<button class="btn ${isDone?'':'primary'}" onclick="toggleRoutine('${j.id}',${isDone})">${isDone?'Batalkan Centang':'✓ Tandai Selesai'}</button>`;
    return `<div class="routinecard"><div class="routinehead"><div><b>${esc(j.title)}</b><div class="muted">${currentEmployee.role==='admin'?esc(name)+' • ':''}${esc(j.description||'')}</div></div>${action}</div>
      <div class="progressbar"><span style="width:${isDone?'100':'0'}%"></span></div>
      <div class="muted" style="margin-top:7px">${isDone?'Selesai hari ini':'Belum selesai hari ini'}</div></div>`;
  }).join(''):'<div class="card">Belum ada job harian.</div>';
}

$('#addRoutineJob').onclick=()=>{
  $('#routineEmployee').innerHTML=employees.filter(x=>x.role==='employee'&&x.active).map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join('');
  $('#routineJobTitle').value='';$('#routineJobDesc').value='';
  openModal('#routineModal');
};

$('#saveRoutineJob').onclick=async()=>{
  const employee_id=$('#routineEmployee').value,title=$('#routineJobTitle').value.trim();
  if(!employee_id||!title){alert('Karyawan dan judul wajib diisi.');return}
  const {error}=await sb.from('routine_jobs').insert({employee_id,title,description:$('#routineJobDesc').value.trim()||null,active:true,created_by:currentEmployee.id});
  if(error){alert(error.message);return}
  $('#routineModal').classList.remove('open');await loadRoutineSafe();
};

window.toggleRoutine=async(jobId,isDone)=>{
  const existing=routineChecks.find(c=>c.job_id===jobId);
  if(existing){
    const {error}=await sb.from('routine_job_checks').update({completed:!isDone,completed_at:!isDone?new Date().toISOString():null}).eq('id',existing.id);
    if(error){alert(error.message);return}
  }else{
    const {error}=await sb.from('routine_job_checks').insert({job_id:jobId,employee_id:currentEmployee.id,check_date:ymd(),completed:true,completed_at:new Date().toISOString()});
    if(error){alert(error.message);return}
  }
  await loadRoutineSafe();
};

window.disableRoutine=async id=>{
  const {error}=await sb.from('routine_jobs').update({active:false}).eq('id',id);
  if(error)alert(error.message);else await loadRoutineSafe();
};

/* ===== V20 GUDANG DIGITAL ===== */
async function loadDigitalSafe(){
  try{
    let q=sb.from('digital_inventory').select('*').order('created_at',{ascending:true});
    if(currentEmployee.role!=='admin') q=q.or(`status.eq.available,claimed_by.eq.${currentEmployee.id}`);
    const {data,error}=await q;
    if(error)throw error;
    digitalItems=data||[];

    digitalSecrets={};
    const canSeeSecrets=currentEmployee.role==='admin'||currentEmployee.username==='paqih';
    if(canSeeSecrets){
      const {data:sec,error:secErr}=await sb.from('digital_inventory_secrets').select('*');
      if(secErr)throw secErr;
      (sec||[]).forEach(s=>digitalSecrets[s.item_id]=s.secret_value);
    }
    renderDigital();
  }catch(e){console.error('digital',e)}
}

function renderDigital(){
  if(!currentEmployee)return;

  const canSeeSecrets=currentEmployee.role==='admin'||currentEmployee.username==='paqih';
  const q=($('#digitalSearch')?.value||'').trim().toLowerCase();
  const cat=$('#digitalCategoryFilter')?.value||'';
  const stf=$('#digitalStatusFilter')?.value||'';

  let rows=digitalItems.filter(x=>{
    if(cat && (x.category||'Lainnya')!==cat)return false;
    if(stf && x.status!==stf)return false;
    if(q){
      const hay=[x.product_name,x.category,x.note,x.buyer_ref].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });

  $('#dsAvailable').textContent=digitalItems.filter(x=>x.status==='available').length;
  $('#dsClaimed').textContent=digitalItems.filter(x=>x.status==='claimed').length;
  $('#dsDelivered').textContent=digitalItems.filter(x=>x.status==='delivered').length;
  $('#dsTotal').textContent=digitalItems.length;

  $('#digitalRows').innerHTML=rows.length?rows.map((x,i)=>{
    const secretValue=digitalSecrets[x.id]||'';
    let actions='';

    if(currentEmployee.role==='admin'){
      actions=`<div class="sheet-actions">
        <button class="btn" onclick="editDigital('${x.id}')">Edit</button>
        <button class="btn danger" onclick="deleteDigital('${x.id}')">Hapus</button>
      </div>`;
    }else if(x.status==='available'){
      actions=`<div class="sheet-actions"><button class="btn primary" onclick="openClaimDigital('${x.id}')">Ambil</button></div>`;
    }else if(x.claimed_by===currentEmployee.id){
      actions=x.status==='claimed'
        ? `<div class="sheet-actions"><button class="btn primary" onclick="markDelivered('${x.id}')">✓ Dikirim</button></div>`
        : `<span class="badge hadir">Selesai</span>`;
    }

    const cred=canSeeSecrets
      ? `<div class="sheet-cred">${esc(secretValue||'Belum ada credential')}</div>`
      : `<span class="sheet-locked">🔒 Hanya Bos & Faqih</span>`;

    const statusLabel=x.status==='available'?'Tersedia':x.status==='claimed'?'Diambil':'Terkirim';
    const statusClass=x.status==='available'?'hadir':x.status==='claimed'?'telat':'izin';

    return `<tr>
      <td class="sheet-index">${i+1}</td>
      <td class="sheet-product">
        <b>${esc(x.product_name||'-')}</b>
        <div style="margin-top:5px"><span class="categorypill">${esc(x.category||'Lainnya')}</span></div>
      </td>
      <td>${cred}</td>
      <td class="sheet-note">${esc(x.note||'-')}</td>
      <td class="sheet-status-buyer">
        <span class="badge ${statusClass}">${statusLabel}</span>
        <div class="muted" style="margin-top:6px">Buyer: ${esc(x.buyer_ref||'-')}</div>
      </td>
      <td>${actions}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="6" style="text-align:center;padding:28px;color:#8793a5">Belum ada data yang cocok.</td></tr>`;
}
$('#addDigitalItem').onclick=()=>{
  $('#digitalEditId').value='';
  $('#digitalModalTitle').textContent='Tambah Stok Digital';
  $('#digitalCategory').value='Netflix';
  $('#digitalProductName').value='';
  $('#digitalSecret').value='';
  $('#digitalNote').value='';
  openModal('#digitalModal');
};

window.editDigital=id=>{
  const item=digitalItems.find(x=>x.id===id);
  if(!item)return;
  $('#digitalEditId').value=item.id;
  $('#digitalModalTitle').textContent='Edit Stok Digital';
  $('#digitalCategory').value=item.category||'Lainnya';
  $('#digitalProductName').value=item.product_name||'';
  $('#digitalSecret').value=digitalSecrets[item.id]||'';
  $('#digitalNote').value=item.note||'';
  openModal('#digitalModal');
};

$('#saveDigitalItem').onclick=async()=>{
  const id=$('#digitalEditId').value;
  const category=$('#digitalCategory').value;
  const product_name=$('#digitalProductName').value.trim();
  const secret_value=$('#digitalSecret').value.trim();
  const note=$('#digitalNote').value.trim()||null;

  if(!product_name||!secret_value){
    alert('Produk dan akun/link/kode wajib diisi.');
    return;
  }

  let itemId=id;
  if(id){
    const {error}=await sb.from('digital_inventory').update({category,product_name,note}).eq('id',id);
    if(error){alert(error.message);return}
  }else{
    const {data,error}=await sb.from('digital_inventory').insert({category,product_name,note,status:'available',secret_value:null}).select().single();
    if(error){alert(error.message);return}
    itemId=data.id;
  }

  const {error:secErr}=await sb.from('digital_inventory_secrets').upsert({item_id:itemId,secret_value},{onConflict:'item_id'});
  if(secErr){alert('Credential gagal disimpan: '+secErr.message);return}

  $('#digitalModal').classList.remove('open');
  await loadDigitalSafe();
  await loadSalesSafe();
};

window.openClaimDigital=id=>{
  $('#claimItemId').value=id;$('#claimBuyer').value='';
  openModal('#claimBuyerModal');
};

$('#confirmClaimItem').onclick=async()=>{
  const id=$('#claimItemId').value,buyer=$('#claimBuyer').value.trim();
  if(!buyer){alert('Isi nama/ID buyer.');return}
  const {data,error}=await sb.from('digital_inventory').update({
    status:'claimed',claimed_by:currentEmployee.id,claimed_at:new Date().toISOString(),buyer_ref:buyer
  }).eq('id',id).eq('status','available').select().single();
  if(error||!data){alert('Item sudah diambil orang lain. Coba item lain.');await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();return}
  $('#claimBuyerModal').classList.remove('open');await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();
};

window.markDelivered=async id=>{
  const {error}=await sb.from('digital_inventory').update({status:'delivered',delivered_at:new Date().toISOString()}).eq('id',id).eq('claimed_by',currentEmployee.id);
  if(error)alert(error.message);else await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();
};

window.deleteDigital=async id=>{
  if(!confirm('Hapus item stok digital ini?'))return;
  const {error}=await sb.from('digital_inventory').delete().eq('id',id);
  if(error)alert(error.message);else await loadDigitalSafe();
  await loadSalesSafe();
  setupSalesRealtime();
};

function setupOpsRealtime(){
  try{
    sb.channel('yanstore-ops-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'routine_job_checks'},()=>loadRoutineSafe())
      .on('postgres_changes',{event:'*',schema:'public',table:'digital_inventory'},()=>loadDigitalSafe())
      .subscribe();
  }catch(e){console.error(e)}
}


/* ===== V20 SALES RECAP MODULE ===== */
function normalizeMoney(v){
  if(v===null||v===undefined||v==='')return 0;
  if(typeof v==='number')return Math.round(v);
  let s=String(v).trim().replace(/\s+/g,'').replace(/^rp/i,'');
  // Template uses commas as thousands separator. Remove all non-digits/minus.
  s=s.replace(/[^0-9-]/g,'');
  return Number(s)||0;
}
function excelDateToYMD(v){
  if(!v)return '';
  if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
  if(typeof v==='number'){
    const d=XLSX.SSF.parse_date_code(v); if(!d)return '';
    return d.y+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');
  }
  const s=String(v).trim();
  const iso=s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/); if(iso)return iso[1]+'-'+iso[2].padStart(2,'0')+'-'+iso[3].padStart(2,'0');
  const id=s.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})$/); if(id)return id[3]+'-'+id[2].padStart(2,'0')+'-'+id[1].padStart(2,'0');
  const d=new Date(s); if(!isNaN(d))return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return '';
}
function cleanText(v){return String(v??'').trim().replace(/\s+/g,' ')}
function simpleImportKey(file,rowIndex,date,product,customer,amount){
  const raw=[file,rowIndex,date,product.toLowerCase(),customer.toLowerCase(),amount].join('|');
  let h=2166136261; for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}
  return 'v20_'+(h>>>0).toString(16)+'_'+rowIndex;
}
async function loadSalesSafe(){
  try{
    if(!currentEmployee)return;
    const canSales=currentEmployee.role==='admin'||currentEmployee.can_manage_sales===true||currentEmployee.username==='aping';
    if(!canSales){salesTransactions=[];return}
    let q=sb.from('sales_transactions').select('*, employees(full_name)').order('transaction_date',{ascending:false}).order('created_at',{ascending:false}).limit(2000);
    if(currentEmployee.role!=='admin')q=q.eq('uploaded_by',currentEmployee.id);
    const {data,error}=await q; if(error)throw error;
    salesTransactions=(data||[]).map(x=>({...x,uploader_name:x.employees?.full_name||'-'}));
    renderSales();renderSalesDashboard();
  }catch(e){console.error('sales',e)}
}
function salesFilteredRows(){
  let rows=[...salesTransactions];
  const d=$('#salesDateFilter')?.value||''; const m=$('#salesMonthFilter')?.value||''; const q=($('#salesSearch')?.value||'').toLowerCase().trim();
  if(d)rows=rows.filter(x=>x.transaction_date===d); else if(m)rows=rows.filter(x=>x.transaction_date?.startsWith(m));
  if(q)rows=rows.filter(x=>(x.product_name||'').toLowerCase().includes(q)||(x.customer_name||'').toLowerCase().includes(q));
  return rows;
}
function renderSales(){
  if(!currentEmployee||!$('#salesRows'))return;
  const today=ymd(); if(!$('#salesMonthFilter').value)$('#salesMonthFilter').value=today.slice(0,7);
  const todayRows=salesTransactions.filter(x=>x.transaction_date===today);
  const rows=salesFilteredRows();
  $('#salesTodayCount').textContent=todayRows.length;
  $('#salesTodayRevenue').textContent=rupiah(todayRows.reduce((s,x)=>s+Number(x.amount||0),0));
  $('#salesPeriodCount').textContent=rows.length;
  $('#salesPeriodRevenue').textContent=rupiah(rows.reduce((s,x)=>s+Number(x.amount||0),0));
  $('#salesRows').innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(x.transaction_date)}</td><td><b>${esc(x.product_name)}</b></td><td>${esc(x.customer_name)}</td><td>${rupiah(x.amount)}</td><td>${esc(x.uploader_name||'-')}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:#8793a5;padding:28px">Belum ada data penjualan.</td></tr>';
}
function renderSalesDashboard(){
  const block=$('#salesDashboardBlock'); if(!block||!currentEmployee)return;
  const canSales=currentEmployee.role==='admin'||currentEmployee.can_manage_sales===true||currentEmployee.username==='aping';
  block.classList.toggle('hidden',!canSales); if(!canSales)return;
  const rows=salesTransactions.filter(x=>x.transaction_date===ymd());
  $('#dashSalesCount').textContent=rows.length;
  $('#dashSalesRevenue').textContent=rupiah(rows.reduce((s,x)=>s+Number(x.amount||0),0));
  $('#dashSalesProducts').textContent=new Set(rows.map(x=>(x.product_name||'').toLowerCase())).size;
  $('#dashSalesBuyers').textContent=new Set(rows.map(x=>(x.customer_name||'').toLowerCase())).size;
  $('#dashSalesRecent').innerHTML=rows.slice(0,5).map(x=>`<div class="sales-row"><div><b>${esc(x.product_name)}</b><div class="muted">${esc(x.customer_name)}</div></div><div style="text-align:right"><b>${rupiah(x.amount)}</b><div class="muted">${esc(x.transaction_date)}</div></div></div>`).join('')||'<div class="muted">Belum ada penjualan hari ini.</div>';
}
$('#salesDateFilter').onchange=()=>{if($('#salesDateFilter').value)$('#salesMonthFilter').value='';renderSales()};
$('#salesMonthFilter').onchange=()=>{if($('#salesMonthFilter').value)$('#salesDateFilter').value='';renderSales()};
$('#salesSearch').oninput=renderSales;

function resetSalesPreview(){salesPreviewData=[];salesPreviewFileName='';$('#salesPreviewWrap').classList.add('hidden');$('#salesFileInfo').classList.add('hidden');$('#salesFileInput').value=''}
async function parseSalesExcel(file){
  try{
    const buf=await file.arrayBuffer(); const wb=XLSX.read(buf,{type:'array',cellDates:true});
    const ws=wb.Sheets['Pendapatan']; if(!ws){alert('Sheet "Pendapatan" tidak ditemukan.');return}
    const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    if(!raw.length){alert('Sheet Pendapatan kosong.');return}
    const head=raw[0].map(x=>cleanText(x).toLowerCase());
    const idxDate=head.findIndex(x=>x==='tanggal');
    const idxProd=head.findIndex(x=>x==='aplikasi');
    const idxCust=head.findIndex(x=>x==='customer');
    const idxAmt=head.findIndex(x=>x.includes('jumlah'));
    if([idxDate,idxProd,idxCust,idxAmt].some(x=>x<0)){alert('Kolom Pendapatan tidak sesuai template.');return}
    const parsed=[];
    for(let i=1;i<raw.length;i++){
      const r=raw[i]; const date=excelDateToYMD(r[idxDate]); const product=cleanText(r[idxProd]); const customer=cleanText(r[idxCust]); const amount=normalizeMoney(r[idxAmt]);
      if(!date||!product||!customer||amount<=0)continue;
      parsed.push({transaction_date:date,product_name:product,customer_name:customer,amount,source_row:i+1,import_key:simpleImportKey(file.name,i+1,date,product,customer,amount)});
    }
    salesPreviewData=parsed;salesPreviewFileName=file.name;
    $('#salesFileInfo').textContent=`${file.name} • ${parsed.length} baris valid ditemukan`;$('#salesFileInfo').classList.remove('hidden');
    $('#salesPreviewCount').textContent=parsed.length;$('#salesPreviewRevenue').textContent=rupiah(parsed.reduce((s,x)=>s+x.amount,0));
    $('#salesPreviewRows').innerHTML=parsed.slice(0,100).map(x=>`<tr><td>${esc(x.transaction_date)}</td><td>${esc(x.product_name)}</td><td>${esc(x.customer_name)}</td><td>${rupiah(x.amount)}</td></tr>`).join('');
    $('#salesPreviewWrap').classList.remove('hidden');
  }catch(e){console.error(e);alert('File Excel gagal dibaca: '+e.message)}
}
const salesDrop=$('#salesDropZone');
salesDrop.onclick=()=>$('#salesFileInput').click();
$('#salesFileInput').onchange=e=>{const f=e.target.files?.[0];if(f)parseSalesExcel(f)};
['dragenter','dragover'].forEach(ev=>salesDrop.addEventListener(ev,e=>{e.preventDefault();salesDrop.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>salesDrop.addEventListener(ev,e=>{e.preventDefault();salesDrop.classList.remove('drag')}));
salesDrop.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f)parseSalesExcel(f)});
$('#cancelSalesImport').onclick=resetSalesPreview;
$('#confirmSalesImport').onclick=async()=>{
  if(!salesPreviewData.length){alert('Tidak ada data untuk diimport.');return}
  if(!confirm(`Import ${salesPreviewData.length} transaksi dengan omzet ${rupiah(salesPreviewData.reduce((s,x)=>s+x.amount,0))}?`))return;
  const rows=salesPreviewData.map(x=>({...x,uploaded_by:currentEmployee.id,source_file:salesPreviewFileName}));
  const batchSize=200; let inserted=0,duplicates=0;
  for(let i=0;i<rows.length;i+=batchSize){
    const part=rows.slice(i,i+batchSize);
    const {data,error}=await sb.from('sales_transactions').upsert(part,{onConflict:'import_key',ignoreDuplicates:true}).select('id');
    if(error){alert('Import gagal: '+error.message);return}
    inserted+=(data||[]).length; duplicates+=part.length-(data||[]).length;
  }
  await sb.from('sales_import_batches').insert({file_name:salesPreviewFileName,uploaded_by:currentEmployee.id,row_count:salesPreviewData.length,revenue_total:salesPreviewData.reduce((s,x)=>s+x.amount,0)});
  resetSalesPreview(); await loadSalesSafe(); alert(`Import selesai. Data baru: ${inserted}. Duplikat dilewati: ${duplicates}.`);
};
function setupSalesRealtime(){
  try{sb.channel('yanstore-sales-live').on('postgres_changes',{event:'*',schema:'public',table:'sales_transactions'},()=>loadSalesSafe()).subscribe()}catch(e){console.error(e)}
}
/* ===== END V20 SALES RECAP ===== */


/* ===== V20.1 FULL REALTIME ===== */
let fullRealtimeChannel=null;
let realtimeRefreshTimer=null;

function setRealtimeStatus(text,mode){
  const el=$('#realtimeStatus');
  if(!el)return;
  el.textContent='● '+text;
  el.classList.remove('rt-ok','rt-warn','rt-off');
  el.classList.add(mode==='ok'?'rt-ok':mode==='warn'?'rt-warn':'rt-off');
}

function scheduleRealtimeRefresh(source){
  clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer=setTimeout(async()=>{
    try{
      // Core HomeOffice data
      await refreshData();

      // Isolated modules
      if(typeof loadAttendanceArchiveSafe==='function') await loadAttendanceArchiveSafe();
      if(typeof loadStockSafe==='function') await loadStockSafe();
      if(typeof loadRoutineSafe==='function') await loadRoutineSafe();
      if(typeof loadDigitalSafe==='function') await loadDigitalSafe();
      if(typeof loadSalesSafe==='function') await loadSalesSafe();

      // Re-render dashboard after all module data is fresh
      if(typeof renderBossDashboard==='function') renderBossDashboard();
      if(typeof renderSalesDashboard==='function') renderSalesDashboard();
      if(typeof renderBossNotifications==='function') renderBossNotifications();

      setRealtimeStatus('Realtime aktif','ok');
      console.log('Realtime update:',source);
    }catch(err){
      console.error('Realtime refresh gagal:',err);
      setRealtimeStatus('Realtime terhubung, refresh data gagal','warn');
    }
  },350);
}

function setupFullRealtime(){
  try{
    if(fullRealtimeChannel){
      sb.removeChannel(fullRealtimeChannel);
      fullRealtimeChannel=null;
    }

    fullRealtimeChannel=sb.channel('homeoffice-full-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'attendance'},()=>scheduleRealtimeRefresh('attendance'))
      .on('postgres_changes',{event:'*',schema:'public',table:'employees'},()=>scheduleRealtimeRefresh('employees'))
      .on('postgres_changes',{event:'*',schema:'public',table:'leave_requests'},()=>scheduleRealtimeRefresh('leave_requests'))
      .on('postgres_changes',{event:'*',schema:'public',table:'tasks'},()=>scheduleRealtimeRefresh('tasks'))
      .on('postgres_changes',{event:'*',schema:'public',table:'routine_jobs'},()=>scheduleRealtimeRefresh('routine_jobs'))
      .on('postgres_changes',{event:'*',schema:'public',table:'routine_job_checks'},()=>scheduleRealtimeRefresh('routine_job_checks'))
      .on('postgres_changes',{event:'*',schema:'public',table:'product_stock'},()=>scheduleRealtimeRefresh('product_stock'))
      .on('postgres_changes',{event:'*',schema:'public',table:'digital_inventory'},()=>scheduleRealtimeRefresh('digital_inventory'))
      .on('postgres_changes',{event:'*',schema:'public',table:'sales_transactions'},()=>scheduleRealtimeRefresh('sales_transactions'))
      .subscribe((status)=>{
        if(status==='SUBSCRIBED')setRealtimeStatus('Realtime aktif','ok');
        else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setRealtimeStatus('Realtime bermasalah','off');
        else setRealtimeStatus('Menghubungkan realtime...','warn');
      });
  }catch(err){
    console.error('Setup realtime gagal:',err);
    setRealtimeStatus('Realtime gagal aktif','off');
  }
}
/* ===== END V20.1 FULL REALTIME ===== */



function parseBatchDigital(text,category,productDefault){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const items=[];
  let current={category,product_name:productDefault||category,email:'',password:'',notes:[]};

  const flush=()=>{
    if(current.email||current.password||current.notes.length){
      const sec=[];
      if(current.email)sec.push('email: '+current.email);
      if(current.password)sec.push('pass: '+current.password);
      items.push({
        category:current.category,
        product_name:current.product_name||category,
        secret_value:sec.join('\n')||current.notes.join('\n'),
        note:current.notes.join(' | ')||null
      });
    }
    current={category,product_name:productDefault||category,email:'',password:'',notes:[]};
  };

  for(const line of lines){
    const email=line.match(/(?:email|mail)\s*[:=]\s*(.+)/i);
    const pass=line.match(/(?:pass|password|pw)\s*[:=]\s*(.+)/i);
    if(email){
      if(current.email)flush();
      current.email=email[1].trim();
      continue;
    }
    if(pass){
      current.password=pass[1].trim();
      continue;
    }
    if(/^\(.*\)$/.test(line)){
      if(current.email||current.password||current.notes.length)flush();
      current.notes.push(line.replace(/^\(|\)$/g,''));
      continue;
    }
    current.notes.push(line);
  }
  flush();
  return items.filter(x=>x.secret_value);
}

$('#batchDigitalBtn').onclick=()=>{
  $('#batchCategory').value='Netflix';
  $('#batchProduct').value='Netflix Premium';
  $('#batchText').value='';
  $('#batchPreviewWrap').classList.add('hidden');
  $('#importBatch').disabled=true;
  digitalBatchPreview=[];
  openModal('#digitalBatchModal');
};

$('#previewBatch').onclick=()=>{
  digitalBatchPreview=parseBatchDigital($('#batchText').value,$('#batchCategory').value,$('#batchProduct').value.trim());
  $('#batchPreviewRows').innerHTML=digitalBatchPreview.map((x,i)=>{
    const em=(x.secret_value.match(/email:\s*(.*)/i)||[])[1]||'-';
    const pw=(x.secret_value.match(/pass:\s*(.*)/i)||[])[1]||'-';
    return `<tr><td>${i+1}</td><td>${esc(x.category)}</td><td>${esc(x.product_name)}</td><td>${esc(em)}</td><td>${esc(pw)}</td><td>${esc(x.note||'-')}</td></tr>`;
  }).join('');
  $('#batchPreviewInfo').textContent=digitalBatchPreview.length+' item siap diimport.';
  $('#batchPreviewWrap').classList.remove('hidden');
  $('#importBatch').disabled=digitalBatchPreview.length===0;
};

$('#importBatch').onclick=async()=>{
  if(!digitalBatchPreview.length)return;
  if(!confirm('Import '+digitalBatchPreview.length+' item?'))return;
  let success=0;
  for(const item of digitalBatchPreview){
    const {data,error}=await sb.from('digital_inventory').insert({category:item.category,product_name:item.product_name,note:item.note,status:'available',secret_value:null}).select().single();
    if(error){console.error(error);continue}
    const {error:secErr}=await sb.from('digital_inventory_secrets').insert({item_id:data.id,secret_value:item.secret_value});
    if(secErr){console.error(secErr);continue}
    success++;
  }
  alert(success+' item berhasil diimport.');
  $('#digitalBatchModal').classList.remove('open');
  await loadDigitalSafe();
};


['#digitalSearch','#digitalCategoryFilter','#digitalStatusFilter'].forEach(sel=>{
  const el=$(sel);
  if(el){
    el.addEventListener(sel==='#digitalSearch'?'input':'change',()=>renderDigital());
  }
});


$('#bossBell').onclick=(e)=>{
  e.stopPropagation();
  renderBossNotifications();
  $('#bossNotifyPanel').classList.toggle('hidden');
};
$('#closeBossNotify').onclick=()=>$('#bossNotifyPanel').classList.add('hidden');
document.addEventListener('click',(e)=>{
  const p=$('#bossNotifyPanel'), b=$('#bossBell');
  if(p&&!p.classList.contains('hidden')&&!p.contains(e.target)&&!b.contains(e.target))p.classList.add('hidden');
});

sb.auth.getSession().then(async ({data})=>{if(data.session)await boot(data.session.user)});
