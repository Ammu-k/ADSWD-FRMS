
import {
    db,
    auth,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updatePassword
} from "../firebase.js";

import { t, setLanguage, getLang, initLang } from "./features/i18n.js";
import { esc, genId, formatDate } from "./utils/format.js";
import { toast } from "./ui/toast.js";
import { APP_KEY, THEME_KEY, KEYS, getItem, setItem, getJSON, setJSON, getSession, setSession } from "./services/storage-service.js";

// ===== STATE =====
window.APP_KEY = APP_KEY;
let currentUser = null;
let records = [];
let pendingImport = null;
let sortState = {col:'date', dir:'desc'};
let firestoreFallbackActive = false;

// ===== INIT =====
async function init(){
    await loadData();
    await loadRecordsFromFirestore();
    setupDragDrop();
    checkLogin();
    if(!getItem(KEYS.users)){
        const users = {
            admin: { password:'admin123', role:'admin', name:'Administrator' },
            staff: { password:'staff123', role:'staff', name:'Staff User' }
        };
        // Your existing code...
    }
    const today = new Date().toISOString().split('T')[0];
    ['rcDate','pmDate','pmPayDate'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.value = today;
    });
}

function saveRecordsToLocalStorage(){
    try{
        setJSON(KEYS.records, records);
    }catch(error){
        console.error('saveRecordsToLocalStorage', error);
    }
}

function loadRecordsFromLocalStorage(){
    try{
        const stored = getJSON(KEYS.records, []);
        records = Array.isArray(stored) ? stored : [];
    }catch(error){
        console.error('loadRecordsFromLocalStorage', error);
        records = [];
    }
}

async function handleFirestoreError(action, error, options = {}){
    console.error(action, error);
    if (!firestoreFallbackActive) {
        firestoreFallbackActive = true;
        if (options.silent !== true) {
            toast('Firestore is unavailable right now. Records are being saved locally in this browser.', 'info');
        }
    }
}

async function loadRecordsFromFirestore(){
    records = [];
    try{
        const snapshot = await getDocs(collection(db, "records"));
        const loadedRecords = [];
        snapshot.forEach((docSnap)=>{
            loadedRecords.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        records = loadedRecords;
        if (typeof filterRecords === 'function') filterRecords();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof generateReport === 'function') generateReport();
        console.log('[Firestore] Shared records loaded:', records.length);
    }catch(error){
        console.error('[Firestore] loadRecordsFromFirestore error:', error.code || error, error.message || '');
        await handleFirestoreError('loadRecordsFromFirestore', error, { silent: true });
    }
}

async function loadData(){
    await loadRecordsFromFirestore();
    initLang();
    const settings = getJSON(KEYS.settings, {});
    if(settings.deptName){
        const el=document.getElementById('settingDeptName');
        if(el) el.value=settings.deptName;
    }
    if(settings.finYear){
        const el=document.getElementById('settingFinYear');
        if(el) el.value=settings.finYear;
    }
}

async function saveData(){
    return true;
}

async function addRecordToFirestore(payload){
    const { id, ...recordData } = payload || {};
    const tempId = genId();
    const localRecord = { ...payload, id: tempId };
    records = [...records, localRecord];
    filterRecords();
    try{
        const docRef = await addDoc(collection(db, "records"), {
            ...recordData,
            createdBy: currentUser?.email || "anonymous",
            updatedAt: new Date().toISOString(),
        });
        const syncedRecord = { ...recordData, id: docRef.id };
        records = records.map((item) => item.id === tempId ? syncedRecord : item);
        filterRecords();
        console.log('[Firestore] Record created:', docRef.id);
        return syncedRecord;
    }catch(error){
        records = records.filter((item) => item.id !== tempId);
        filterRecords();
        console.error('[Firestore] Add error -', error.code, error.message);
        await handleFirestoreError('addRecordToFirestore', error);
        throw error;
    }
}

async function updateRecordInFirestore(id, payload){
    const { id: ignoredId, ...recordData } = payload || {};
    const updatedRecord = { ...payload, id };
    const previousRecords = [...records];
    records = records.map((item) => item.id === id ? updatedRecord : item);
    filterRecords();
    try{
        await updateDoc(doc(db, "records", id), {
            ...recordData,
            updatedBy: currentUser?.email || "anonymous",
            updatedAt: new Date().toISOString(),
        });
        console.log('[Firestore] Record updated:', id);
        return updatedRecord;
    }catch(error){
        records = previousRecords;
        filterRecords();
        console.error('[Firestore] Update error -', error.code, error.message);
        await handleFirestoreError('updateRecordInFirestore', error);
        throw error;
    }
}

async function deleteRecordFromFirestore(id){
    const previousRecords = [...records];
    records = records.filter((item) => item.id !== id);
    filterRecords();
    try{
        await deleteDoc(doc(db, "records", id));
        console.log('[Firestore] Record deleted:', id);
    }catch(error){
        records = previousRecords;
        filterRecords();
        console.error('[Firestore] Delete error -', error.code, error.message);
        await handleFirestoreError('deleteRecordFromFirestore', error);
        throw error;
    }
}

// ===== AUTH =====g
function checkLogin() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split("@")[0],
                role: "staff"
            };
            try {
                await loadRecordsFromFirestore();
            } catch (error) {
                console.error(error);
            }
            showApp();
        } else {
            document.getElementById("loginPage").style.display = "flex";
            document.getElementById("appLayout").style.display = "none";
        }
    });
}

async function handleLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value;
    if (!email || !pass) {
        toast(t('please_fill_all_fields'), "error");
        return;
    }
    try {
        const userCredential =
            await signInWithEmailAndPassword(auth, email, pass);
        currentUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.email.split("@")[0],
            role: "staff"
        };
        toast(t('login_successful'), "success");
        showApp();
        await loadRecordsFromFirestore();
    } catch (error) {
       toast(t('invalid_email_password'), "error");
    }
}
window.handleLogin = handleLogin;

async function handleGoogleSignIn() {
  try {
    const provider = new GoogleAuthProvider();
    // Always ask which account to use
    provider.setCustomParameters({
      prompt: "select_account"
    });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    currentUser = {
      username: user.email,
      name: user.displayName,
      email: user.email,
      role: "admin"
    };
    setSession(KEYS.session, JSON.stringify(currentUser));
    showApp();
    toast(t("google_signin_success"), "success");
  } catch (err) {
    console.error(err);
    toast(err.message, "error");
  }
}
window.handleGoogleSignIn = handleGoogleSignIn;

async function handleSignup() {
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const pass = document.getElementById("signupPass").value;
    const confirm = document.getElementById("signupConfirm").value;
    if (!name || !email || !pass) {
        toast(t('please_fill_all_fields'), "error");
        return;
    }
    if (pass !== confirm) {
        toast(t('passwords_do_not_match'), "error");
        return;
    }
    try {
        const userCredential =
            await createUserWithEmailAndPassword(auth, email, pass);
        currentUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: name,
            role: "staff"
        };
       toast(t('account_created_successfully'), "success");
        showApp();
    } catch (error) {
        toast(error.message, "error");
    }
}
window.handleSignup = handleSignup;

function switchLoginTab(tab){
  document.getElementById('tabSignin').classList.toggle('active',tab==='signin');
  document.getElementById('tabSignup').classList.toggle('active',tab==='signup');
  document.getElementById('signinForm').style.display=tab==='signin'?'block':'none';
  document.getElementById('signupForm').classList.toggle('active',tab==='signup');
  document.getElementById('signupForm').style.display=tab==='signup'?'block':'none';
}
window.switchLoginTab = switchLoginTab;

function showApp() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appLayout").style.display = "flex";

    const displayName = document.getElementById("userDisplayName");
    if (displayName)
        displayName.textContent = currentUser.name;

    const avatar = document.getElementById("userAvatar");
    if (avatar)
        avatar.textContent = currentUser.name[0].toUpperCase();

    const role = document.getElementById("userRole");
    if (role)
        role.textContent = currentUser.role === "admin" ? t('role_admin') : t('role_staff');

    const welcome = document.getElementById("topbarWelcome");
    if (welcome)
        welcome.textContent = `${t('welcome_back')}, ${currentUser.name}`;

    setLanguage(getLang());
    // Refresh UI after Firestore records have been loaded
    filterRecords();
    updateDashboard();
    generateReport();
    populateMonthSelectors();
    const backup = document.getElementById("backupRecordCount");
    if (backup)
        backup.textContent = records.length;
}

async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        document.getElementById("appLayout").style.display = "none";
        document.getElementById("loginPage").style.display = "flex";
        document.getElementById("loginPass").value = "";
        document.getElementById("signinForm").style.display = "block";
        document.getElementById("signupForm").style.display = "none";
        document.getElementById("forgotFormSection").classList.remove("active");
        switchLoginTab("signin");
       toast(t('logout_successful'), "success");
    } catch (error) {
        toast(error.message, "error");
    }
}
window.handleLogout = handleLogout;

function showForgot(){
  document.getElementById('signinForm').style.display='none';
  document.getElementById('signupForm').style.display='none';
  document.getElementById('forgotFormSection').classList.add('active');
}
function showLogin(){
  document.getElementById('forgotFormSection').classList.remove('active');
  document.getElementById('signinForm').style.display='block';
  document.getElementById('signupForm').style.display='none';
  switchLoginTab('signin');
}

function handleForgot(){
  const user=document.getElementById('forgotUser').value.trim();
  const newPass=document.getElementById('forgotNewPass').value;
  if(!user||!newPass){toast(t('please_fill_all_fields'),'error');return;}
  const users=getJSON(KEYS.users,{});
  if(!users[user]){toast(t('user_not_found'),'error');return;}
  users[user].password=newPass;
  setJSON(KEYS.users,users);
  toast(t('password_reset_successful'),'success');
  showLogin();
}

function changePassword(){
  const old=document.getElementById('settingOldPass').value;
  const np=document.getElementById('settingNewPass').value;
  const cp=document.getElementById('settingConfirmPass').value;
  if(!old||!np||!cp){toast(t('please_fill_all_fields'),'error');return;}
  if(np!==cp){toast(t('passwords_do_not_match'),'error');return;}
  const users=getJSON(KEYS.users,{});
  if(!users[currentUser.username]||users[currentUser.username].password!==old){toast(t('current_password_wrong'),'error');return;}
  users[currentUser.username].password=np;
  setJSON(KEYS.users,users);
  document.getElementById('settingOldPass').value='';
  document.getElementById('settingNewPass').value='';
  document.getElementById('settingConfirmPass').value='';
  toast(t('password_changed_successfully'),'success');
}

// ===== NAVIGATION =====
function navigateTo(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const target=document.getElementById('page-'+page);
  if(target){target.classList.add('active');}
  const navItem=document.querySelector(`.nav-item[data-page="${page}"]`);
  if(navItem)navItem.classList.add('active');
  if(page==='dashboard')updateDashboard();
  if(page==='records')filterRecords();
  if(page==='reports'){populateReportSelectors();generateReport();}
  if(page==='admin'){loadSettingsUI();document.getElementById('backupRecordCount').textContent=records.length;renderAdminUsers();}
}

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        document.getElementById("sidebar").classList.toggle("mobile-open");
    } else {
        document.querySelector(".app-layout").classList.toggle("collapsed");
    }
}

function checkResponsive(){
  const mt=document.getElementById('menuToggle');
  if(window.innerWidth<=768){mt.style.display='flex';}
  else{mt.style.display='none';document.getElementById('sidebar').classList.remove('mobile-open');}
}

// ===== THEME =====
let currentTheme='dark';

function getSystemTheme(){
  return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}

function applyTheme(theme){
  if(theme==='system')theme=getSystemTheme();
  document.body.setAttribute('data-theme',theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  const btn = icon.closest('button');
  const icons = {
    dark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    light: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    system: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
  };
  icon.innerHTML = icons[theme] || icons.dark;
  if (btn) {
    const labels = {
      dark: 'Dark',
      light: 'Light',
      system: 'System'
    };
    btn.title = labels[theme] || 'Toggle theme';
  }
}

function cycleTheme(){
  const modes=['dark','light','system'];
  const idx=modes.indexOf(currentTheme);
  currentTheme=modes[(idx+1)%3];
  setItem(THEME_KEY,currentTheme);
  applyTheme(currentTheme);
}

// Init theme
(function(){
  currentTheme=getItem(THEME_KEY,'dark');
  applyTheme(currentTheme);
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
    if(currentTheme==='system')applyTheme('system');
  });
})();

// ===== DASHBOARD =====
function updateDashboard(){
  document.getElementById('statTotal').textContent=records.length;

  const now=new Date();
  const currentMonth=now.getMonth();
  const currentYear=now.getFullYear();

  let monthTotal=0,yearTotal=0;
  records.forEach(r=>{
    if(!r.date)return;
    const d=new Date(r.date);
    const amt=parseFloat(r.grossAmount)||0;
    if(d.getFullYear()===currentYear){
      yearTotal+=amt;
      if(d.getMonth()===currentMonth) monthTotal+=amt;
    }
  });

  document.getElementById('statMonthTotal').textContent='â‚¹'+monthTotal.toLocaleString('en-IN');
  document.getElementById('statYearTotal').textContent='â‚¹'+yearTotal.toLocaleString('en-IN');
  document.getElementById('statStaffCount').textContent=records.length;

  const months=[
    t('jan'),t('feb'),t('mar'),t('apr'),
    t('may'),t('jun'),t('jul'),t('aug'),
    t('sep'),t('oct'),t('nov'),t('dec')
];
  const monthlyData=new Array(12).fill(0);
  records.forEach(r=>{
    if(!r.date)return;
    const d=new Date(r.date);
    if(d.getFullYear()===currentYear){
      monthlyData[d.getMonth()]+=parseFloat(r.grossAmount)||0;
    }
  });
  const maxVal=Math.max(...monthlyData,1);
  const chart=document.getElementById('barChart');

  // Y-axis labels
  const yLabels=[];
  for(let i=4;i>=0;i--){
    const v=Math.round((maxVal/4)*i);
    yLabels.push(v>=1000?(v/1000).toFixed(0)+'k':v.toString());
  }

  chart.innerHTML=`
    <div style="display:flex;gap:0;height:220px">
      <div style="display:flex;flex-direction:column;justify-content:space-between;padding:0 8px 24px 0;font-size:11px;color:var(--text-light);text-align:right;min-width:40px">
        ${yLabels.map(l=>`<span>${l}</span>`).join('')}
      </div>
      <div style="flex:1;display:flex;align-items:flex-end;gap:6px;border-bottom:1px solid var(--border);padding-bottom:0">
        ${months.map((m,i)=>{
          const h=Math.round((monthlyData[i]/maxVal)*190);
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:100%;height:${h}px;background:linear-gradient(180deg,#0d9488,#14b8a6);border-radius:4px 4px 0 0;transition:.3s;min-height:0"></div>
            <span style="font-size:10px;color:var(--text-light)">${m}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ===== CASH BOOK =====
function initMonthSelects(){
  const months=[
t('january'),t('february'),t('march'),t('april'),
t('may_full'),t('june'),t('july'),t('august'),
t('september'),t('october'),t('november'),t('december')
];
  const now=new Date();
  const el=document.getElementById('reportMonth');
  if(el) el.innerHTML=months.map((m,i)=>`<option value="${i}"${i===now.getMonth()?' selected':''}>${m}</option>`).join('');
  const years=[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1];
  const el2=document.getElementById('reportYear');
  if(el2) el2.innerHTML=years.map(y=>`<option value="${y}"${y===now.getFullYear()?' selected':''}>${y}</option>`).join('');
}

function populateMonthSelectors(){
  initMonthSelects();
  const months=[
t('january'),t('february'),t('march'),t('april'),
t('may_full'),t('june'),t('july'),t('august'),
t('september'),t('october'),t('november'),t('december')
];
  const mf=document.getElementById('recordMonthFilter');
  mf.innerHTML='<option value="">All Months</option>'+months.map((m,i)=>`<option value="${i}">${m}</option>`).join('');
}

function calcReceiptGross(){
  const net=parseFloat(document.getElementById('rcNetPay').value)||0;
  const ded=parseFloat(document.getElementById('rcDeduction').value)||0;
  document.getElementById('rcGrossAmount').value=(net+ded).toFixed(2);
  updateCashBookTotal();
}

function calcPaymentGross(){
  const net=parseFloat(document.getElementById('pmNetPay').value)||0;
  const ded=parseFloat(document.getElementById('pmDeduction').value)||0;
  document.getElementById('pmGrossAmount').value=(net+ded).toFixed(2);
  updateCashBookTotal();
}

function updateCashBookTotal(){
  const rGross=parseFloat(document.getElementById('rcGrossAmount').value)||0;
  const pGross=parseFloat(document.getElementById('pmGrossAmount').value)||0;
  document.getElementById('cbBankTotal').textContent='â‚¹'+(rGross).toLocaleString('en-IN');
}

function updateCashBook(){calcReceiptGross();calcPaymentGross();}

async function saveCashBook(){
  const rcDate=document.getElementById('rcDate').value;
  const rcReceiptNo=document.getElementById('rcReceiptNo').value.trim();
  const rcParticulars=document.getElementById('rcParticulars').value.trim();
  const rcNetPay=parseFloat(document.getElementById('rcNetPay').value)||0;
  const rcDeduction=parseFloat(document.getElementById('rcDeduction').value)||0;
  const rcGrossAmount=parseFloat(document.getElementById('rcGrossAmount').value)||0;

  const pmDate=document.getElementById('pmDate').value;
  const pmReceiptNo=document.getElementById('pmReceiptNo').value.trim();
  const pmBeneficiary=document.getElementById('pmBeneficiary').value.trim();
  const pmTokenNo=document.getElementById('pmTokenNo').value.trim();
  const pmUtrNo=document.getElementById('pmUtrNo').value.trim();
  const pmPayDate=document.getElementById('pmPayDate').value;
  const pmNetPay=parseFloat(document.getElementById('pmNetPay').value)||0;
  const pmDeduction=parseFloat(document.getElementById('pmDeduction').value)||0;
  const pmGrossAmount=parseFloat(document.getElementById('pmGrossAmount').value)||0;

  const hasReceipt=rcParticulars||rcNetPay||rcGrossAmount;
  const hasPayment=pmBeneficiary||pmNetPay||pmGrossAmount;

  if(!hasReceipt&&!hasPayment){toast(t('no_data_to_save'),'error');return;}

  try{
    const savedRecords=[];
    if(hasReceipt){
      const newRecord=await addRecordToFirestore({date:rcDate,receiptNo:rcReceiptNo,particulars:rcParticulars,netPay:rcNetPay,deduction:rcDeduction,grossAmount:rcGrossAmount,type:'receipt'});
      savedRecords.push(newRecord);
    }
    if(hasPayment){
      const newRecord=await addRecordToFirestore({date:pmDate,receiptNo:pmReceiptNo,particulars:pmBeneficiary,beneficiary:pmBeneficiary,tokenNo:pmTokenNo,utrNo:pmUtrNo,paymentDate:pmPayDate,netPay:pmNetPay,deduction:pmDeduction,grossAmount:pmGrossAmount,type:'payment'});
      savedRecords.push(newRecord);
    }

    await loadRecordsFromFirestore();
    filterRecords();
    updateDashboard();
    generateReport();
    const count=savedRecords.length;
    toast(`${t('saved')} ${count} ${t('records_saved')}`,'success');
    resetCashBook();
  }catch(error){
    await handleFirestoreError('saveCashBook', error);
  }
}

function submitCashBook(){
  saveCashBook();
}

function resetCashBook(){
  document.getElementById('rcDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('rcReceiptNo').value='';
  document.getElementById('rcParticulars').value='';
  document.getElementById('rcNetPay').value='';
  document.getElementById('rcDeduction').value='';
  document.getElementById('rcGrossAmount').value='';
  document.getElementById('pmDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('pmReceiptNo').value='';
  document.getElementById('pmBeneficiary').value='';
  document.getElementById('pmTokenNo').value='';
  document.getElementById('pmUtrNo').value='';
  document.getElementById('pmPayDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('pmNetPay').value='';
  document.getElementById('pmDeduction').value='';
  document.getElementById('pmGrossAmount').value='';
  updateCashBookTotal();
}
window.resetCashBook = resetCashBook;

// ===== RECORDS =====
function filterRecords(){
  const search=(document.getElementById('recordSearch').value||'').toLowerCase();
  const typeF=document.getElementById('recordTypeFilter').value;
  const monthF=document.getElementById('recordMonthFilter').value;
  const dateF=document.getElementById('recordDateFilter').value;

  let filtered=records.filter(r=>{
    if(typeF&&r.type!==typeF)return false;
    if(monthF!==''&&r.date){
      const m=new Date(r.date).getMonth().toString();
      if(m!==monthF)return false;
    }
    if(dateF&&r.date&&!r.date.startsWith(dateF))return false;
    if(search){
      const s=(r.particulars||'')+(r.receiptNo||'')+(r.beneficiary||'')+(r.date||'');
      if(!s.toLowerCase().includes(search))return false;
    }
    return true;
  });

  filtered.sort((a,b)=>{
    let va=a[sortState.col]||'',vb=b[sortState.col]||'';
    if(sortState.col==='grossAmount'||sortState.col==='netPay'||sortState.col==='deduction'){
      va=parseFloat(va)||0;vb=parseFloat(vb)||0;
    }
    if(va<vb)return sortState.dir==='asc'?-1:1;
    if(va>vb)return sortState.dir==='asc'?1:-1;
    return 0;
  });

  document.getElementById('recordCount').textContent=`${filtered.length} ${t('records')}`;
  const totalAmt=filtered.reduce((s,r)=>s+(parseFloat(r.grossAmount)||0),0);
  document.getElementById('recordsSubtitle').textContent=`${filtered.length} ${t('shown')} Â· â‚¹${totalAmt.toLocaleString('en-IN')}`;
  document.getElementById('recordsBody').innerHTML=filtered.length?filtered.map(r=>`<tr>
<td>${formatDate(r.date)}</td>
<td><span class="badge ${r.type==='receipt'?'badge-success':'badge-danger'}">${t(r.type)}</span></td>
<td>${esc(r.receiptNo||'-')}</td>
<td>${esc(r.particulars||'-')}</td>
<td>${esc(r.beneficiary||'-')}</td>
<td class="amount">â‚¹${parseFloat(r.netPay||0).toLocaleString('en-IN')}</td>
<td class="amount">â‚¹${parseFloat(r.deduction||0).toLocaleString('en-IN')}</td>
<td class="amount">â‚¹${parseFloat(r.grossAmount||0).toLocaleString('en-IN')}</td>
<td style="white-space:nowrap">
<button class="btn-icon btn-icon-edit" onclick="editRecord('${r.id}')" title="${t('edit')}">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
</button>
<button class="btn-icon btn-icon-delete" onclick="deleteRecord('${r.id}')" title="${t('delete')}">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
</button>
</td>
</tr>`).join(''):`<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light)">${t('no_records_found')}</td></tr>`;
}

function sortRecords(col){
  if(sortState.col===col)sortState.dir=sortState.dir==='asc'?'desc':'asc';
  else{sortState.col=col;sortState.dir='asc';}
  filterRecords();
}

function editRecord(id){
  const r=records.find(x=>x.id===id);if(!r)return;
  document.getElementById('editId').value=id;
  document.getElementById('editType').value=r.type;
  document.getElementById('editDate').value=r.date||'';
  document.getElementById('editReceiptNo').value=r.receiptNo||'';
  document.getElementById('editParticulars').value=r.particulars||'';
  document.getElementById('editBeneficiary').value=r.beneficiary||'';
  document.getElementById('editNetPay').value=r.netPay||'';
  document.getElementById('editDeduction').value=r.deduction||'';
  document.getElementById('editGrossAmount').value=r.grossAmount||'';
  document.getElementById('editModal').classList.add('active');
}

async function saveEdit(){
  const id=document.getElementById('editId').value;
  const idx=records.findIndex(x=>x.id===id);
  if(idx===-1)return;
  const updatedRecord={
    ...records[idx],
    type:document.getElementById('editType').value,
    date:document.getElementById('editDate').value,
    receiptNo:document.getElementById('editReceiptNo').value,
    particulars:document.getElementById('editParticulars').value,
    beneficiary:document.getElementById('editBeneficiary').value,
    netPay:parseFloat(document.getElementById('editNetPay').value)||0,
    deduction:parseFloat(document.getElementById('editDeduction').value)||0,
    grossAmount:parseFloat(document.getElementById('editGrossAmount').value)||0
  };
  try{
    await updateRecordInFirestore(id, updatedRecord);
    filterRecords();
    updateDashboard();
    generateReport();
    toast(t('record_updated'),'success');
  }catch(error){
    await handleFirestoreError('saveEdit', error);
    // Restore the UI
    filterRecords();
    updateDashboard();
    generateReport();
    // Show an error instead of a false success
    toast('Failed to update record','error');
    return;
}
  closeEditModal();
}

function closeEditModal(){document.getElementById('editModal').classList.remove('active');}

function deleteRecord(id){
  document.getElementById('confirmMessage').textContent=t('delete_record_confirm');
  document.getElementById('confirmModal').classList.add('active');
  document.getElementById('confirmAction').onclick=async ()=>{
    try{
      await deleteRecordFromFirestore(id);
      filterRecords();
      updateDashboard();
      generateReport();
      toast(t('record_deleted'),'success');
    }catch(error){
      await handleFirestoreError('deleteRecord', error);
      filterRecords();
      updateDashboard();
      generateReport();
      toast(t('record_deleted'),'success');
    }
    closeConfirmModal();
  };
}

function closeConfirmModal(){document.getElementById('confirmModal').classList.remove('active');}

// ===== REPORTS =====
function populateReportSelectors(){
  initMonthSelects();
  const dayEl=document.getElementById('reportDay');
  if(dayEl&&!dayEl.value){dayEl.value=new Date().toISOString().split('T')[0];}
  loadDaySignatures();
  if(dayEl)dayEl.onchange=()=>{generateReport();loadDaySignatures();};
  const pe=document.getElementById('reportPreparedBy');
  const ve=document.getElementById('reportVerifiedBy');
  if(pe)pe.onchange=()=>saveDaySignature('preparedBy',pe.value);
  if(ve)ve.onchange=()=>saveDaySignature('verifiedBy',ve.value);
}

function loadDaySignatures(){
  const dayVal=document.getElementById('reportDay')?.value;
  if(!dayVal)return;
  const store=getJSON(KEYS.daySignatures,{});
  const dayData=store[dayVal]||{preparedBy:'',verifiedBy:''};
  const pe=document.getElementById('reportPreparedBy');
  const ve=document.getElementById('reportVerifiedBy');
  if(pe)pe.value=dayData.preparedBy||'';
  if(ve)ve.value=dayData.verifiedBy||'';
}

function saveDaySignature(field,value){
  const dayVal=document.getElementById('reportDay')?.value;
  if(!dayVal)return;
  const store=getJSON(KEYS.daySignatures,{});
  if(!store[dayVal])store[dayVal]={preparedBy:'',verifiedBy:''};
  store[dayVal][field]=value;
  setJSON(KEYS.daySignatures,store);
}

function clearReportDay(){
  const dayEl=document.getElementById('reportDay');
  if(dayEl)dayEl.value='';
  generateReport();
}
window.clearReportDay = clearReportDay;

function generateReport(){
  const month=parseInt(document.getElementById('reportMonth').value);
  const year=parseInt(document.getElementById('reportYear').value);
  const dayVal=document.getElementById('reportDay').value;
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];

  let label;
  if(dayVal){
    const dd=new Date(dayVal);
    label=dd.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  }else{
    label=`${months[month]} ${year}`;
  }
  document.getElementById('reportMonthYear').textContent=label;
  document.getElementById('reportDept').textContent=(document.getElementById('settingDeptName')?.value)||t('default_department');

  let filtered;
  if(dayVal){
    filtered=records.filter(r=>{
      if(!r.date)return false;
      return r.date===dayVal;
    });
  }else{
    filtered=records.filter(r=>{
      if(!r.date)return false;
      const d=new Date(r.date);
      return d.getMonth()===month&&d.getFullYear()===year;
    });
  }
  
  const receipts=filtered.filter(r=>r.type==='receipt');
  const payments=filtered.filter(r=>r.type==='payment');
  
  let rNet=0,rDed=0,rGross=0,pNet=0,pDed=0,pGross=0;
  receipts.forEach(r=>{rNet+=parseFloat(r.netPay)||0;rDed+=parseFloat(r.deduction)||0;rGross+=parseFloat(r.grossAmount)||0;});
  payments.forEach(r=>{pNet+=parseFloat(r.netPay)||0;pDed+=parseFloat(r.deduction)||0;pGross+=parseFloat(r.grossAmount)||0;});
  
  document.getElementById('rptReceiptNet').textContent='â‚¹'+rNet.toLocaleString('en-IN');
  document.getElementById('rptReceiptDed').textContent='â‚¹'+rDed.toLocaleString('en-IN');
  document.getElementById('rptReceiptGrand').textContent='â‚¹'+rGross.toLocaleString('en-IN');
  document.getElementById('rptPaymentNet').textContent='â‚¹'+pNet.toLocaleString('en-IN');
  document.getElementById('rptPaymentDed').textContent='â‚¹'+pDed.toLocaleString('en-IN');
  document.getElementById('rptPaymentGrand').textContent='â‚¹'+pGross.toLocaleString('en-IN');
  
  const rcStyle='font-weight:700;background:var(--card);border-top:2px solid var(--border)';

  if(receipts.length){
    document.getElementById('rptReceiptBody').innerHTML=receipts.map(r=>`<tr>
  <td>${formatDate(r.date)}</td><td>${esc(r.receiptNo||'')}</td><td>${esc(r.particulars||'')}</td>
  <td class="amount">${parseFloat(r.netPay||0).toLocaleString('en-IN')}</td>
  <td class="amount">${parseFloat(r.deduction||0).toLocaleString('en-IN')}</td>
  <td class="amount">${parseFloat(r.grossAmount||0).toLocaleString('en-IN')}</td>
  <td class="amount">${parseFloat(r.grossAmount||0).toLocaleString('en-IN')}</td>
  </tr>`).join('')+`<tr style="${rcStyle}"><td colspan="3">${t('total')}</td><td class="amount">${rNet.toLocaleString('en-IN')}</td><td class="amount">${rDed.toLocaleString('en-IN')}</td><td class="amount">${rGross.toLocaleString('en-IN')}</td><td class="amount">${rGross.toLocaleString('en-IN')}</td></tr>`;
}else{
  document.getElementById('rptReceiptBody').innerHTML=`<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-light)">${t('no_receipt_records')}</td></tr>`;
}

if(payments.length){
  document.getElementById('rptPaymentBody').innerHTML=payments.map(r=>`<tr>
    <td>${formatDate(r.date)}</td><td>${esc(r.receiptNo||'')}</td><td>${esc(r.beneficiary||r.particulars||'')}</td>
    <td>${esc(r.tokenNo||'')}</td><td>${esc(r.utrNo||'')}</td>
    <td>${formatDate(r.paymentDate||r.date)}</td>
    <td class="amount">${parseFloat(r.netPay||0).toLocaleString('en-IN')}</td>
    <td class="amount">${parseFloat(r.deduction||0).toLocaleString('en-IN')}</td>
    <td class="amount">${parseFloat(r.grossAmount||0).toLocaleString('en-IN')}</td>
    </tr>`).join('')+`<tr style="${rcStyle}"><td colspan="6">${t('total')}</td><td class="amount">${pNet.toLocaleString('en-IN')}</td><td class="amount">${pDed.toLocaleString('en-IN')}</td><td class="amount">${pGross.toLocaleString('en-IN')}</td></tr>`;
  }else{
    document.getElementById('rptPaymentBody').innerHTML=`<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-light)">${t('no_payment_records')}</td></tr>`;
  }
}
window.generateReport = generateReport;

function printReport(){
    const layout=buildReportPrintLayout();
    document.body.appendChild(layout);
    setTimeout(() => {
        window.print();
        setTimeout(() => layout.remove(), 500);
    }, 150);
}
window.printReport = printReport;

async function exportReportPDF() {
    const layout = buildReportPrintLayout();
    document.body.appendChild(layout);
    const page = layout.querySelector(".print-report-page");
    console.log("Layout:", layout.getBoundingClientRect());
    console.log("Page:", page.getBoundingClientRect());
    try {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const page = layout.querySelector(".print-report-page");
        page.style.visibility = "visible";
        page.style.display = "block";
        console.log("HTML:", page.innerHTML);
        const canvas = await html2canvas(page, {
        scale: window.devicePixelRatio * 2,     
            useCORS: true,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0
        });
        const contentHeight = page.scrollHeight;
        const scale = canvas.height / page.offsetHeight;
        const croppedCanvas = document.createElement("canvas");
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = contentHeight * scale;
        const ctx = croppedCanvas.getContext("2d");
        ctx.drawImage(
            canvas,
            0, 0,
            canvas.width, croppedCanvas.height,
            0, 0,
            canvas.width, croppedCanvas.height
        );

const imgData = croppedCanvas.toDataURL("image/jpeg", 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = croppedCanvas.width / croppedCanvas.height;
        let imgWidth = pageWidth;
        let imgHeight = imgWidth / ratio;
        console.log({
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            pageWidth,
            pageHeight,
            imgWidth,
            imgHeight
        });
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        pdf.save("ADSWD_Report.pdf");
    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        layout.remove();
    }
}

function exportReportExcel(){
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const dayVal = document.getElementById('reportDay').value;
    let filtered;
    if(dayVal){
        filtered = records.filter(r => r.date === dayVal);
    }else{
        filtered = records.filter(r=>{
            if(!r.date) return false;
            const d = new Date(r.date);
            return d.getMonth()===month && d.getFullYear()===year;
        });
    }
    const receipts = filtered.filter(r=>r.type==="receipt");
    const payments = filtered.filter(r=>r.type==="payment");
    const rows = [];
    rows.push([
        "RECEIPTS","","","","","","",
        "PAYMENTS","","","","","",""
    ]);
    rows.push([
        "Date","Receipt No","Particulars","Net Pay","Deduction","Gross","Total",
        "Date","Receipt No","Particulars","Token","UTR","Net Pay","Gross"
    ]);
    const maxRows = Math.max(receipts.length,payments.length);
    for(let i=0;i<maxRows;i++){
        const r = receipts[i] || {};
        const p = payments[i] || {};
        rows.push([
            r.date || "",
            r.receiptNo || "",
            r.particulars || "",
            r.netPay || "",
            r.deduction || "",
            r.grossAmount || "",
            r.grossAmount || "",
            p.date || "",
            p.receiptNo || "",
            p.beneficiary || "",
            p.tokenNo || "",
            p.utrNo || "",
            p.netPay || "",
            p.grossAmount || ""
        ]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
        {wch:12},{wch:18},{wch:28},{wch:12},{wch:12},{wch:14},{wch:14},
        {wch:12},{wch:18},{wch:28},{wch:14},{wch:14},{wch:12},{wch:14}
    ];
    XLSX.utils.book_append_sheet(wb,ws,"Cash Book");
    const filename = dayVal
        ? `CashBook-${dayVal}.xlsx`
        : `CashBook-${year}-${month+1}.xlsx`;
    XLSX.writeFile(wb,filename);
    toast("Excel exported successfully","success");
}
window.exportReportExcel = exportReportExcel;

// ===== IMPORT =====
function setupDragDrop(){
  const zone=document.getElementById('importZone');
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');handleImportFile(e.dataTransfer.files[0]);});
}

function handleImport(e){handleImportFile(e.target.files[0]);}

function handleImportFile(file){
  if(!file)return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['xlsx','xls','csv'].includes(ext)){toast(t('unsupported_file_format'),'error');return;}

  if(ext==='csv'){
    const reader=new FileReader();
    reader.onload=e=>{
      const lines=e.target.result.split('\n').filter(l=>l.trim());
      const headers=lines[0].split(',').map(h=>h.trim().toLowerCase());
      const data=[];
      for(let i=1;i<lines.length;i++){
        const vals=lines[i].split(',');
        const row={};
        headers.forEach((h,j)=>row[h]=(vals[j]||'').trim());
        data.push(row);
      }
      showImportPreview(data);
    };
    reader.readAsText(file);
  }else{
    toast(t('save_as_csv_first'),'info');
  }
}

function showImportPreview(data){
  pendingImport=data;
  const preview=document.getElementById('importPreview');
  preview.style.display='block';
  const headers=Object.keys(data[0]||{});
  let html='<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>';
  headers.forEach(h=>{html+=`<th style="padding:6px 8px;background:var(--primary);color:#fff;border:1px solid var(--border)">${esc(h)}</th>`;});
  html+='</tr></thead><tbody>';
  data.slice(0,10).forEach(row=>{
    html+='<tr>';
    headers.forEach(h=>{html+=`<td style="padding:6px 8px;border:1px solid var(--border)">${esc(row[h]||'')}</td>`;});
    html+='</tr>';
  });
  if(data.length>10)html+=`<tr><td colspan="${headers.length}" style="padding:6px;text-align:center;color:var(--text-light)">${t('and')} ${data.length-10} ${t('more_rows')}</td></tr>`;
  html+='</tbody></table>';
  document.getElementById('importPreviewTable').innerHTML=html;
}

async function confirmImport(){
  if(!pendingImport)return;
  let imported=0,duplicates=0;
  try{
    for(const row of pendingImport){
      const date=row.date||row.Date||'';
      const receiptNo=row.receiptno||row['receipt no']||row['Receipt No.']||row.receipt_no||'';
      const particulars=row.particulars||row.Particulars||'';
      const netPay=row.netpay||row['net pay']||row['Net Pay']||row.net_pay||'0';
      const deduction=row.deduction||row.Deduction||'0';
      const grossAmount=row.grossamount||row['gross amount']||row['Gross Amount']||row.gross_amount||'0';
      const beneficiary=row.beneficiary||row.Beneficiary||row['beneficiary name']||'';

      const isDuplicate=records.some(r=>r.date===date&&r.receiptNo===receiptNo&&r.particulars===particulars&&r.type==='receipt');
      if(isDuplicate){duplicates++;continue;}

      const type=beneficiary||row.type==='payment'?'payment':'receipt';
      await addRecordToFirestore({type,date,receiptNo,particulars,netPay,deduction,grossAmount,beneficiary});
      imported++;
    }
    await loadRecordsFromFirestore();
    document.getElementById('importPreview').style.display='none';
    document.getElementById('importResult').style.display='block';
    document.getElementById('importResult').innerHTML=`<div style="padding:16px;border-radius:8px;background:rgba(22,163,74,.2);color:#34d399;font-size:13px">âœ… ${t('imported')} ${imported} ${t('records')}. ${duplicates} ${t('duplicates_skipped')}</div>`;
    pendingImport=null;
    filterRecords();
    updateDashboard();
    generateReport();
    toast(`${t('imported')} ${imported} ${t('records')}!`,'success');
  }catch(error){
    await handleFirestoreError('confirmImport', error);
  }
}

function cancelImport(){
  pendingImport=null;
  document.getElementById('importPreview').style.display='none';
}

// ===== EXPORT =====
function exportAllRecords(){exportRecordsToCSV(records,'adswd-all-records.csv');}
function exportMonthlyReport(){
  const now=new Date();
  const filtered=records.filter(r=>{if(!r.date)return false;const d=new Date(r.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  exportRecordsToCSV(filtered,`adswd-${now.getFullYear()}-${now.getMonth()+1}.csv`);
}

function exportRecordsToCSV(data,filename){
  if(!data.length){toast(t('no_data_to_export'),'error');return;}
  const headers=['Date','Type','Receipt No','Particulars','Beneficiary','Net Pay','Deduction','Gross Amount','Token No','UTR No','Payment Date'];
  const csv=[headers.join(',')];
  data.forEach(r=>{
    csv.push([r.date,r.type,r.receiptNo,r.particulars,r.beneficiary,r.netPay,r.deduction,r.grossAmount,r.tokenNo,r.utrNo,r.paymentDate].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ===== BACKUP =====
function createBackup(){
  const data={records,settings:getJSON(KEYS.settings,{}),exportDate:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`sw-frms-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
toast(t('backup_created'),'success');
}
window.createBackup = createBackup;

async function restoreBackup(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(data.records && Array.isArray(data.records)){
        try{
          const existingSnapshot = await getDocs(collection(db, "records"));
          await Promise.all(existingSnapshot.docs.map(docSnap => deleteDoc(doc(db, "records", docSnap.id))));
        }catch(error){
          await handleFirestoreError('restoreBackup:clearRemote', error);
        }
        const restoredRecords=[];
        for(const item of data.records){
          const { id, ...recordData } = item || {};
          try{
            const ref = await addDoc(collection(db, "records"), recordData);
            restoredRecords.push({ ...recordData, id: ref.id });
          }catch(error){
            restoredRecords.push({ ...recordData, id: item.id || genId() });
            await handleFirestoreError('restoreBackup:addLocal', error);
          }
        }
        records = restoredRecords;
        saveRecordsToLocalStorage();
        if(data.settings)setJSON(KEYS.settings,data.settings);
        document.getElementById('backupRecordCount').textContent=records.length;
        filterRecords();
        updateDashboard();
        generateReport();
        toast(`${t('restored')} ${records.length} ${t('records')}!`,'success');
      }
    }catch(err){
      await handleFirestoreError('restoreBackup', err);
      toast(t('invalid_backup_file'),'error');
    }
  };
  reader.readAsText(file);
}
window.restoreBackup = restoreBackup;

async function clearAllData(){
  if(!confirm(t('delete_all_records_confirm')))return;
  try{
    const existingSnapshot = await getDocs(collection(db, "records"));
    await Promise.all(existingSnapshot.docs.map(docSnap => deleteDoc(doc(db, "records", docSnap.id))));
  }catch(error){
    await handleFirestoreError('clearAllData', error);
  }
  records=[];
  saveRecordsToLocalStorage();
  document.getElementById('backupRecordCount').textContent='0';
  filterRecords();
  updateDashboard();
  generateReport();
  toast(t('all_data_cleared'),'success');
}
window.clearAllData = clearAllData;

// ===== SETTINGS =====
function saveSettings(){
  const settings={
    deptName:(document.getElementById('settingDeptName')?.value)||t('default_department'),
    finYear:(document.getElementById('settingFinYear')?.value)||'2026-2027',
    currency: document.getElementById('settingCurrency')?.value || 'INR'
  };
  setJSON(KEYS.settings,settings);
  document.getElementById('cbDeptName').textContent=settings.deptName;
  toast(t('settings_saved'),'success');
}
window.saveSettings = saveSettings;

function loadSettingsUI(){
  const s=getJSON(KEYS.settings,{});
  if(s.deptName){const el=document.getElementById('settingDeptName');if(el)el.value=s.deptName;}
  if(s.finYear){const el=document.getElementById('settingFinYear');if(el)el.value=s.finYear;}
}

// ===== INIT =====
window.t = t;
window.esc = esc;
window.toast = toast;
window.setLanguage = setLanguage;
window.cycleTheme = cycleTheme;
window.showForgot = showForgot;
window.showLogin = showLogin;
window.handleForgot = handleForgot;
window.handleLogin = handleLogin;
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.calcReceiptGross = calcReceiptGross;
window.calcPaymentGross = calcPaymentGross;
window.saveCashBook = saveCashBook;
window.submitCashBook = submitCashBook;
window.resetCashBook = resetCashBook;
window.filterRecords = filterRecords;
window.clearReportDay = clearReportDay;
window.printReport = printReport;
window.exportReportPDF = exportReportPDF;
window.exportReportExcel = exportReportExcel;
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.saveEdit = saveEdit;
window.closeEditModal = closeEditModal;
window.exportAllRecords = exportAllRecords;
window.exportMonthlyReport = exportMonthlyReport;
window.exportRecordsToCSV = exportRecordsToCSV;

init();
