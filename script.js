/* ========= FIREBASE IMPORTS ========= */
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
    import {
      getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
      onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup
    } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
    import {
      getFirestore, collection, addDoc, deleteDoc, doc,
      onSnapshot, query, orderBy, getDoc, setDoc, updateDoc, getDocs
    } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

    /* ======= YOUR FIREBASE CONFIG (leave unchanged) ======= */
    const firebaseConfig = {
      apiKey: "AIzaSyD-0R_Sh_J8uCMV40W7qKYYFPH90gWum9U",
      authDomain: "expense-tracker-a611b.firebaseapp.com",
      projectId: "expense-tracker-a611b",
      storageBucket: "expense-tracker-a611b.firebasestorage.app",
      messagingSenderId: "481175764012",
      appId: "1:481175764012:web:5023598f4f1852aed62589",
      measurementId: "G-4XBWGDTX2K"
    };

    /* ======== INIT ======== */
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    /* ======== UI REFS ======== */
    const authCard = document.getElementById("authCard");
    const authError = document.getElementById("authError");
    const userEmail = document.getElementById("userEmail");
    const signOutBtn = document.getElementById("signOutBtn");
    const signOutTop = document.getElementById("signOut");

    const nameField = document.getElementById("nameField");
    const emailField = document.getElementById("emailField");
    const passwordField = document.getElementById("passwordField");
    const signInBtn = document.getElementById("signInBtn");
    const signUpBtn = document.getElementById("signUpBtn");
    const googleBtn = document.getElementById("googleBtn");
    const demoBtn = document.getElementById("demoBtn");

    const appSection = document.getElementById("app");
    const me = document.getElementById("me");
    const dateEl = document.getElementById("date");
    const catEl = document.getElementById("category");
    const notesEl = document.getElementById("notes");
    const amtEl = document.getElementById("amount");
    const addBtn = document.getElementById("addBtn");
    const tbody = document.getElementById("tbody");
    const selectedTotalEl = document.getElementById("selectedTotal");
    const monthPicker = document.getElementById("monthPicker");
    const appError = document.getElementById("appError");
    const searchBox = document.getElementById("searchBox");

    // settings refs
    const monthlyIncomeEl = document.getElementById("monthlyIncome");
    const monthlyTopUpTypeEl = document.getElementById("monthlyTopUpType");
    const monthlyBudgetInput = document.getElementById("monthlyBudgetInput");
    const bFood = document.getElementById("bFood");
    const bTransport = document.getElementById("bTransport");
    const bShopping = document.getElementById("bShopping");
    const bBills = document.getElementById("bBills");
    const bOther = document.getElementById("bOther");
    const saveSettings = document.getElementById("saveSettings");
    const recreateMonthWallet = document.getElementById("recreateMonthWallet");
    const deleteWalletMonth = document.getElementById("deleteWalletMonth");
    const darkToggle = document.getElementById("darkToggle");
    const budgetWarn = document.getElementById("budgetWarn");
    const viewMode = document.getElementById("viewMode");

    // export refs
    const exportMode = document.getElementById("exportMode");
    const exportFrom = document.getElementById("exportFrom");
    const exportTo = document.getElementById("exportTo");
    const exportBtn = document.getElementById("exportBtn");
    const printReport = document.getElementById("printReport");

    // default date
    dateEl.value = new Date().toISOString().slice(0,10);

    /* ========= HELPER UTILS ========= */
    function fmt(n){ return Number(n).toLocaleString(); }
    function monthKeyFromDate(dStr){ // 'YYYY-MM-DD' or 'YYYY-MM' => 'YYYY-MM'
      if (!dStr) return '';
      return (dStr.length >= 7) ? dStr.slice(0,7) : dStr;
    }
    function todayMonth(){ return new Date().toISOString().slice(0,7); }

    /* ========= FIRESTORE PATH HELPERS ========= */
    function userExpensesRef(uid){ return collection(db, "users", uid, "expenses"); }
    function userSettingsDoc(uid){ return doc(db, "users", uid, "settings", "prefs"); }
    function userWalletHistoryRef(uid){ return collection(db, "users", uid, "walletHistory"); }
    function userWalletMonthDoc(uid, monthKey){ return doc(db, "users", uid, "walletHistory", monthKey); }

    /* ========= NORMALIZE EXPENSE ======== */
    function normalizeExpenseData(d){
      const out = Object.assign({}, d);
      if (typeof out.amount === 'string') out.amount = parseFloat(out.amount) || 0;
      if (typeof out.amount !== 'number') out.amount = Number(out.amount) || 0;
      if (out.date && typeof out.date === 'object' && typeof out.date.toDate === 'function'){
        try { out.date = out.date.toDate().toISOString().slice(0,10); } catch(e){ out.date = '' }
      } else if (typeof out.date === 'number'){
        try { out.date = new Date(out.date).toISOString().slice(0,10); } catch(e){ out.date = '' }
      } else if (typeof out.date !== 'string'){
        out.date = out.date ? String(out.date) : '';
      }
      out.category = out.category || 'Other';
      out.notes = out.notes || '';
      out.uid = out.uid || '';
      return out;
    }

    /* ========= FRIENDLY ERRORS ========= */
    function friendlyAuthError(err){
      const code = (err && err.code) ? String(err.code) : (err && err.message ? String(err.message) : '');
      const m = String(code).match(/auth\/(.+)$/);
      const key = m ? m[1] : code;
      const map = {
        'email-already-in-use': 'That email is already registered. Try signing in or use another email.',
        'invalid-email': 'This email address looks invalid.',
        'user-not-found': 'No account found with that email.',
        'wrong-password': 'Incorrect password. Please try again.',
        'weak-password': 'Password should be at least 6 characters.',
        'popup-closed-by-user': 'Sign-in popup was closed. Try again.',
        'popup-blocked': 'Popup blocked by browser. Allow popups and try again.',
        'auth/unauthorized-domain': 'This domain is not authorized for Google sign-in. Add it in Firebase Console.'
      };
      if (map[key]) return map[key];
      return (err && err.message) ? String(err.message).replace(/^Firebase:\s*/i, '') : 'An unexpected error occurred.';
    }

    /* ========= AUTH HANDLERS ========= */
    signUpBtn.addEventListener("click", async () => {
      authError.style.display='none'; authError.textContent='';
      const name = nameField.value.trim(); const email = emailField.value.trim(); const pwd = passwordField.value;
      if (!email || !pwd) { authError.style.display='block'; authError.textContent='Email & password required.'; return; }
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        if (name) await updateProfile(cred.user, { displayName: name });
      } catch (err) { authError.style.display='block'; authError.textContent = friendlyAuthError(err); }
    });

    signInBtn.addEventListener("click", async () => {
      authError.style.display='none'; authError.textContent='';
      const email = emailField.value.trim(); const pwd = passwordField.value;
      if (!email || !pwd) { authError.style.display='block'; authError.textContent='Email & password required.'; return; }
      try { await signInWithEmailAndPassword(auth, email, pwd); }
      catch (err) { authError.style.display='block'; authError.textContent = friendlyAuthError(err); }
    });

    googleBtn.addEventListener("click", async () => {
      authError.style.display='none'; authError.textContent='';
      const provider = new GoogleAuthProvider();
      try { await signInWithPopup(auth, provider); }
      catch (err) { authError.style.display='block'; authError.textContent = friendlyAuthError(err); }
    });

    demoBtn.addEventListener("click", () => {
      alert("Demo mode: no cloud sync. Sign in to use cloud features.");
      authCard.classList.add("hidden"); appSection.classList.remove("hidden"); me.textContent = "Demo (local only)";
    });

    signOutBtn.addEventListener("click", () => auth.signOut());
    signOutTop.addEventListener("click", () => auth.signOut());

    /* ========= APP STATE ========= */
    let currentUser = null;
    let unsubscribeExpenses = null;
    let unsubscribeSettings = null;
    let unsubscribeWalletHistory = null;
    let allExpenses = []; // array of expense objects
    let walletHistory = []; // array of {month: 'YYYY-MM', wallet: number}
    let settings = null;

    /* ========= LISTENERS ========= */
    onAuthStateChanged(auth, user => {
      currentUser = user;
      authError.style.display='none'; authError.textContent='';
      appError.style.display='none'; appError.textContent='';

      if (user) {
        authCard.classList.add("hidden"); appSection.classList.remove("hidden");
        userEmail.textContent = user.email || user.displayName || "";
        me.textContent = user.displayName ? `${user.displayName} (${user.email})` : user.email;
        startExpensesListener(user.uid);
        startSettingsListener(user.uid);
        startWalletHistoryListener(user.uid);
      } else {
        authCard.classList.remove("hidden"); appSection.classList.add("hidden");
        userEmail.textContent = ""; me.textContent = "";
        if (unsubscribeExpenses) { unsubscribeExpenses(); unsubscribeExpenses = null; }
        if (unsubscribeSettings) { unsubscribeSettings(); unsubscribeSettings = null; }
        if (unsubscribeWalletHistory) { unsubscribeWalletHistory(); unsubscribeWalletHistory = null; }
        allExpenses = []; walletHistory = []; settings = null;
        renderFilteredData();
      }
    });

    /* ========= EXPENSES (LIVE) ========= */
    function startExpensesListener(uid){
      if (unsubscribeExpenses) unsubscribeExpenses();
      const q = query(userExpensesRef(uid), orderBy("date","desc"));
      unsubscribeExpenses = onSnapshot(q, snap => {
        allExpenses = [];
        snap.forEach(s => { const d = s.data(); const norm = normalizeExpenseData(d); allExpenses.push({ id: s.id, ...norm }); });
        renderFilteredData();
      }, err => { console.error("snapshot error", err); appError.style.display='block'; appError.textContent='Failed to load expenses.'; });
    }

    /* ========= WALLET HISTORY (LIVE) ========= */
    function startWalletHistoryListener(uid){
      if (unsubscribeWalletHistory) unsubscribeWalletHistory();
      const ref = userWalletHistoryRef(uid);
      unsubscribeWalletHistory = onSnapshot(ref, snap => {
        walletHistory = [];
        snap.forEach(s => {
          const m = s.id; // 'YYYY-MM'
          const data = s.data();
          walletHistory.push({ month: m, wallet: Number(data.wallet || 0), ts: data.timestamp || null, note: data.note || '' });
        });
        // keep sorted ascending by month (older -> newer)
        walletHistory.sort((a,b) => a.month.localeCompare(b.month));
        renderFilteredData();
      }, err => console.error("walletHistory snapshot error", err));
    }

    /* ========= SETTINGS (SINGLE DOC) ========= */
    async function ensureSettingsDoc(uid){
      const sref = userSettingsDoc(uid);
      try {
        const snap = await getDoc(sref);
        if (!snap.exists()) {
          const defaults = {
            monthlyIncome: 0,
            monthlyTopUpType: "reset",
            monthlyBudget: 0,
            darkMode: false,
            categoryBudgets: { Food:0, Transport:0, Shopping:0, Bills:0, Other:0 },
            lastTopUpMonth: "" // used for automatic top-ups
          };
          await setDoc(sref, defaults);
          return defaults;
        } else return snap.data();
      } catch (e){ console.error("ensureSettingsDoc error", e); return null; }
    }

    function startSettingsListener(uid){
      if (unsubscribeSettings) unsubscribeSettings();
      const sref = userSettingsDoc(uid);
      ensureSettingsDoc(uid).then(() => {
        unsubscribeSettings = onSnapshot(sref, snap => {
          settings = snap.exists() ? snap.data() : null;
          applySettingsToUI();
          // after settings loaded, ensure monthly wallet exists and possibly top-up
          runMonthlyTopUpIfNeeded(uid).then(()=>renderFilteredData());
        }, err => console.error("settings snapshot error", err));
      });
    }

    function applySettingsToUI(){
      if (!settings) {
        monthlyIncomeEl.value = ""; monthlyBudgetInput.value = ""; bFood.value = ""; bTransport.value = ""; bShopping.value = ""; bBills.value = ""; bOther.value = "";
        darkToggle.checked = false; document.documentElement.removeAttribute("data-theme"); return;
      }
      monthlyIncomeEl.value = settings.monthlyIncome || "";
      monthlyTopUpTypeEl.value = settings.monthlyTopUpType || "reset";
      monthlyBudgetInput.value = settings.monthlyBudget || "";
      const cb = settings.categoryBudgets || {};
      bFood.value = cb.Food || ""; bTransport.value = cb.Transport || ""; bShopping.value = cb.Shopping || ""; bBills.value = cb.Bills || ""; bOther.value = cb.Other || "";
      darkToggle.checked = !!settings.darkMode;
      if (settings.darkMode) document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme");
    }

    /* ========= AUTOMATIC MONTHLY TOP-UP / WALLET CREATION =========
       Behavior:
       - If there is no walletHistory doc for this month, create it automatically.
       - If monthlyTopUpType === 'reset' => set wallet = monthlyIncome
       - If monthlyTopUpType === 'topup' => set wallet = previousMonthLeftover + monthlyIncome (if previous exists)
       - Use settings.lastTopUpMonth guard to avoid duplicate top-ups.
    */
    async function runMonthlyTopUpIfNeeded(uid){
      if (!settings) return;
      const nowMonth = todayMonth(); // 'YYYY-MM'
      const last = settings.lastTopUpMonth || "";
      const monthlyIncome = Number(settings.monthlyIncome || 0);
      const topUpType = settings.monthlyTopUpType || "reset";

      // ensure wallet doc exists for current month
      const currentDocRef = userWalletMonthDoc(uid, nowMonth);
      try {
        const snap = await getDoc(currentDocRef);
        if (snap.exists()) {
          // already exists: but maybe top-up type changed and lastTopUpMonth not set
          if (last !== nowMonth && monthlyIncome > 0) {
            // apply top-up if user requested and month doc exists but top-up not recorded
            await updateDoc(userSettingsDoc(uid), { lastTopUpMonth: nowMonth });
          }
          return;
        }
        // no doc exists -> create according to settings
        let walletToSet = 0;
        if (topUpType === "reset") {
          walletToSet = monthlyIncome;
        } else { // 'topup' -> try derive leftover from previous month
          // find previous month in walletHistory
          const idx = walletHistory.findIndex(w => w.month === nowMonth);
          // if walletHistory has previous month, compute leftover = previous.wallet - previousMonthSpent
          // find max previous month < nowMonth
          let prev = null;
          for (let i = walletHistory.length - 1; i >= 0; --i) {
            if (walletHistory[i].month < nowMonth) { prev = walletHistory[i]; break; }
          }
          if (prev) {
            // compute prev month spent
            const prevSpent = allExpenses.filter(e => monthKeyFromDate(e.date) === prev.month).reduce((s,x)=>s+(Number(x.amount)||0),0);
            const leftover = (Number(prev.wallet)||0) - prevSpent;
            walletToSet = leftover + monthlyIncome;
          } else {
            walletToSet = monthlyIncome;
          }
        }
        // create doc
        await setDoc(currentDocRef, { wallet: Number(walletToSet||0), timestamp: new Date().toISOString(), note: 'Auto-created monthly wallet' });
        // record lastTopUpMonth
        await updateDoc(userSettingsDoc(uid), { lastTopUpMonth: nowMonth });
      } catch (err) {
        console.error('monthly top-up failed', err);
      }
    }

    /* ========= MANUAL SET / DELETE MONTH WALLET ========= */
    recreateMonthWallet.addEventListener("click", async () => {
      if (!currentUser) { alert("Sign in first"); return; }
      const m = monthPicker.value || todayMonth();
      const val = prompt(`Set wallet amount for ${m} (number):`, (settings && settings.monthlyIncome) || "0");
      if (val === null) return;
      const num = Number(val) || 0;
      try {
        await setDoc(userWalletMonthDoc(currentUser.uid, m), { wallet: num, timestamp: new Date().toISOString(), note: 'Manual set by user' }, { merge: true });
        alert('Saved');
      } catch (e) { console.error(e); alert('Failed to save'); }
    });

    deleteWalletMonth.addEventListener("click", async () => {
      if (!currentUser) { alert("Sign in first"); return; }
      const m = monthPicker.value || todayMonth();
      if (!confirm(`Delete wallet entry for ${m}? This cannot be undone.`)) return;
      try {
        await deleteDoc(userWalletMonthDoc(currentUser.uid, m));
        alert('Deleted');
      } catch (e) { console.error(e); alert('Failed to delete'); }
    });

    /* ========= ADD EXPENSE ========= */
    addBtn.addEventListener("click", async () => {
      appError.style.display='none'; appError.textContent='';
      if (!currentUser) { appError.style.display='block'; appError.textContent='Please sign in first.'; return; }
      const date = dateEl.value; const category = catEl.value; const amount = parseFloat(amtEl.value); const notes = (notesEl.value||"").trim();
      if (!date || !category || !amount || amount <= 0) { appError.style.display='block'; appError.textContent='Please fill all fields correctly.'; return; }
      if (category === 'Other' && !notes) { appError.style.display='block'; appError.textContent='Please add a note for "Other".'; return; }
      try {
        addBtn.disabled = true; addBtn.textContent = 'Adding...';
        await addDoc(userExpensesRef(currentUser.uid), { uid: currentUser.uid, date: date, category, amount: Number(amount), notes });
        // reset
        catEl.value = ''; amtEl.value = ''; notesEl.value = ''; dateEl.value = new Date().toISOString().slice(0,10);
      } catch (err) { console.error(err); appError.style.display='block'; appError.textContent='Failed to add expense.'; }
      finally { addBtn.disabled=false; addBtn.textContent = '+ Add Expense'; }
    });

    /* ========= DELETE EXPENSE ========= */
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest(".btn-del"); if (!btn) return;
      const id = btn.dataset.id; if (!id) return;
      if (!currentUser) { alert("Sign in first"); return; }
      if (!confirm("Delete this expense?")) return;
      try { await deleteDoc(doc(db, "users", currentUser.uid, "expenses", id)); } catch (err) { console.error(err); alert("Delete failed"); }
    });

    /* ========= RENDER & FILTER ========= */
    function renderFilteredData(){
      const mode = viewMode.value; // 'month' or 'all'
      const monthVal = monthPicker.value; // YYYY-MM or empty
      const search = (searchBox.value||'').trim().toLowerCase();

      // compute filtered rows for table (based on view)
      let filtered = allExpenses.filter(e => {
        if (!e.date) return false;
        if (mode === 'month') {
          if (!monthVal) return false;
          if (!String(e.date).startsWith(monthVal)) return false;
        }
        // search match
        if (search) {
          const hay = `${e.date} ${e.category} ${e.notes} ${e.amount}`.toLowerCase();
          return hay.indexOf(search) !== -1;
        }
        return true;
      });

      // sort desc by date
      filtered.sort((a,b)=> (b.date||'').localeCompare(a.date||''));

      // render table
      tbody.innerHTML = '';
      filtered.forEach(e => {
        const notesText = e.notes && e.notes.trim() ? e.notes : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${e.date}</td><td>${e.category}</td><td>₹${fmt(e.amount)}</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis">${notesText}</td><td><button class="btn btn-del" data-id="${e.id}">Delete</button></td>`;
        tbody.appendChild(tr);
      });

      // selected total
      const selTotal = filtered.reduce((s,x)=>s + (Number(x.amount)||0), 0);
      selectedTotalEl.textContent = fmt(selTotal);

      // compute totals & wallet logic
      // all-time totals
      const allTotal = allExpenses.reduce((s,x)=>s + (Number(x.amount)||0),0);

      // compute totalWallet (sum of walletHistory)
      const totalWallet = walletHistory.reduce((s,w)=>s + (Number(w.wallet)||0), 0);

      if (mode === 'month') {
        const m = monthVal;
        if (!m) {
          spentAmount.innerText = '—';
          remainingAmount.innerText = '—';
          walletAmount.innerText = '—';
          budgetWarn.style.display='none';
          return;
        }
        // monthSpent
        const monthSpent = allExpenses.filter(e => String(e.date).startsWith(m)).reduce((s,x)=>s + (Number(x.amount)||0), 0);
        // find wallet for this month
        const mw = walletHistory.find(w => w.month === m);
        const walletVal = mw ? Number(mw.wallet||0) : (settings ? Number(settings.monthlyIncome||0) : 0);
        // remaining = walletVal - monthSpent (can be negative)
        const remaining = walletVal - monthSpent;
        // budget
        const monthlyBudget = Number(settings ? settings.monthlyBudget || 0 : 0);
        // apply to UI
        document.getElementById('spentAmount').textContent = `₹${fmt(monthSpent)}`;
        document.getElementById('walletAmount').textContent = `₹${fmt(walletVal)}`;
        document.getElementById('remainingAmount').textContent = `₹${Number(Math.round(remaining * 100) / 100)}`;
        // budget warning
        if (monthlyBudget > 0 && monthSpent > monthlyBudget) {
          const exceeded = Math.round((monthSpent - monthlyBudget) * 100) / 100;
          budgetWarn.style.display='block';
          budgetWarn.textContent = `Budget Exceeded by ₹${fmt(exceeded)}`;
        } else { budgetWarn.style.display='none'; budgetWarn.textContent=''; }
      } else {
        // All time view
        // spent = allTotal
        // wallet total = totalWallet
        const remainingAll = totalWallet - allTotal;
        document.getElementById('spentAmount').textContent = `₹${fmt(allTotal)}`;
        document.getElementById('walletAmount').textContent = `₹${fmt(totalWallet)}`;
        document.getElementById('remainingAmount').textContent = `₹${Number(Math.round(remainingAll * 100) / 100)}`;
        budgetWarn.style.display='none';
      }
    }

    // hook inputs
    monthPicker.addEventListener("change", () => {
      // if switched to month view, ensure the month wallet exists
      if (currentUser && viewMode.value === 'month') runMonthlyTopUpIfNeeded(currentUser.uid);
      renderFilteredData();
    });
    viewMode.addEventListener("change", () => renderFilteredData());
    searchBox.addEventListener("input", () => renderFilteredData());

    /* ========= SETTINGS SAVE ========= */
    saveSettings.addEventListener("click", async () => {
      if (!currentUser) { alert("Sign in first"); return; }
      const docRef = userSettingsDoc(currentUser.uid);
      const newSettings = {
        monthlyIncome: Number(monthlyIncomeEl.value) || 0,
        monthlyTopUpType: monthlyTopUpTypeEl.value || "reset",
        monthlyBudget: Number(monthlyBudgetInput.value) || 0,
        darkMode: !!darkToggle.checked,
        categoryBudgets: {
          Food: Number(bFood.value) || 0,
          Transport: Number(bTransport.value) || 0,
          Shopping: Number(bShopping.value) || 0,
          Bills: Number(bBills.value) || 0,
          Other: Number(bOther.value) || 0
        }
      };
      try { await setDoc(docRef, newSettings, { merge: true }); alert('Settings saved'); }
      catch (e) { console.error(e); alert('Failed to save settings'); }
    });

    darkToggle.addEventListener("change", async () => {
      const isDark = darkToggle.checked;
      if (isDark) document.documentElement.setAttribute("data-theme","dark"); else document.documentElement.removeAttribute("data-theme");
      if (!currentUser) return;
      try { await updateDoc(userSettingsDoc(currentUser.uid), { darkMode: isDark }); }
      catch (e) { console.error('dark toggle save error', e); }
    });

    /* ========= EXPORT (WALLET HISTORY + EXPENSES) ========= */
    exportMode.addEventListener("change", () => {
      const mode = exportMode.value;
      if (mode === "range") { exportFrom.style.display='inline-block'; exportTo.style.display='inline-block'; } else { exportFrom.style.display='none'; exportTo.style.display='none'; }
    });

    function buildCSV(lines){ return lines.join("\n"); }

    exportBtn.addEventListener("click", async () => {
      const mode = exportMode.value;
      let header = []; let rows = []; // rows as CSV lines
      // include wallet history snapshot header
      header.push(`Xpensive Export`);
      header.push(`Generated: ${new Date().toISOString()}`);
      if (mode === 'all') {
        header.push('Period: All time');
        // Wallet history rows
        rows.push('WALLET HISTORY - Month,Wallet,Note,Timestamp');
        walletHistory.forEach(w => rows.push(`${w.month},${w.wallet},"${(w.note||'').replace(/"/g,'""')}",${w.ts||''}`));
        rows.push('');
        // Expense rows
        rows.push('EXPENSES - Date,Category,Amount,Notes');
        allExpenses.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(e => rows.push(`${e.date},${e.category},${e.amount},"${(e.notes||'').replace(/"/g,'""')}"`));
        // totals
        const totalWallet = walletHistory.reduce((s,w)=>s + (Number(w.wallet)||0),0);
        const totalSpent = allExpenses.reduce((s,x)=>s + (Number(x.amount)||0),0);
        rows.push('');
        rows.push(`TOTAL WALLET,${totalWallet}`);
        rows.push(`TOTAL SPENT,${totalSpent}`);
        rows.push(`REMAINING,${totalWallet - totalSpent}`);
      } else if (mode === 'month') {
        const m = monthPicker.value;
        if (!m) { alert('Choose a month first'); return; }
        header.push(`Period: ${m}`);
        // wallet for month
        const w = walletHistory.find(x=>x.month===m);
        rows.push(`WALLET,${m},${w ? w.wallet : (settings ? settings.monthlyIncome : 0)}`);
        rows.push('');
        rows.push('EXPENSES - Date,Category,Amount,Notes');
        const ex = allExpenses.filter(e => String(e.date).startsWith(m)).sort((a,b)=>a.date.localeCompare(b.date));
        ex.forEach(e => rows.push(`${e.date},${e.category},${e.amount},"${(e.notes||'').replace(/"/g,'""')}"`));
        const monthSpent = ex.reduce((s,x)=>s + (Number(x.amount)||0),0);
        rows.push('');
        rows.push(`TOTAL SPENT,${monthSpent}`);
        rows.push(`REMAINING,${(w?w.wallet:(settings?settings.monthlyIncome:0)) - monthSpent}`);
      } else if (mode === 'range') {
        const f = exportFrom.value; const t = exportTo.value;
        if (!f || !t) { alert('Choose from and to dates'); return; }
        header.push(`Period: ${f} to ${t}`);
        // wallets within range: include any months that intersect the range
        rows.push('WALLET HISTORY - Month,Wallet,Note,Timestamp');
        walletHistory.filter(w=>{
          // month start day as 'YYYY-MM-01' compare lexicographically
          const monthStart = `${w.month}-01`;
          return monthStart >= f && monthStart <= t;
        }).forEach(w => rows.push(`${w.month},${w.wallet},"${(w.note||'').replace(/"/g,'""')}",${w.ts||''}`));
        rows.push('');
        rows.push('EXPENSES - Date,Category,Amount,Notes');
        const ex = allExpenses.filter(e => e.date >= f && e.date <= t).sort((a,b)=>a.date.localeCompare(b.date));
        ex.forEach(e => rows.push(`${e.date},${e.category},${e.amount},"${(e.notes||'').replace(/"/g,'""')}"`));
        const totalWalletRange = walletHistory.filter(w=>(`${w.month}-01`) >= f && (`${w.month}-01`) <= t).reduce((s,x)=>s + (Number(x.wallet)||0),0);
        const totalSpentRange = ex.reduce((s,x)=>s + (Number(x.amount)||0),0);
        rows.push('');
        rows.push(`TOTAL WALLET IN RANGE,${totalWalletRange}`);
        rows.push(`TOTAL SPENT IN RANGE,${totalSpentRange}`);
        rows.push(`REMAINING,${totalWalletRange - totalSpentRange}`);
      }

      const out = header.concat(['']).concat(rows).join("\n");
      const blob = new Blob([out], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `xpensive-export-${Date.now()}.csv`; a.click();
    });

    /* ========= PRINT REPORT (structured) ========= */
    printReport.addEventListener("click", () => {
      const mode = exportMode.value;
      let rowsHTML = '';
      if (mode === 'all') {
        // wallet history table + expenses table
        rowsHTML += `<h3>Wallet history</h3><table border=1 cellpadding=6 style="border-collapse:collapse"><thead><tr><th>Month</th><th>Wallet</th><th>Note</th><th>Timestamp</th></tr></thead><tbody>`;
        walletHistory.forEach(w => rowsHTML += `<tr><td>${w.month}</td><td>₹${fmt(w.wallet)}</td><td>${(w.note||'')}</td><td>${w.ts||''}</td></tr>`);
        rowsHTML += `</tbody></table><h3 style="margin-top:12px">Expenses</h3><table border=1 cellpadding=6 style="border-collapse:collapse"><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Notes</th></tr></thead><tbody>`;
        allExpenses.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(e => rowsHTML += `<tr><td>${e.date}</td><td>${e.category}</td><td>₹${fmt(e.amount)}</td><td>${(e.notes||'')}</td></tr>`);
        rowsHTML += `</tbody></table>`;
      } else if (mode === 'month') {
        const m = monthPicker.value;
        if (!m) { alert('Choose a month first'); return; }
        const w = walletHistory.find(x=>x.month===m);
        rowsHTML += `<div><strong>Month:</strong> ${m}</div><div><strong>Wallet:</strong> ₹${fmt(w ? w.wallet : (settings?settings.monthlyIncome:0))}</div>`;
        rowsHTML += `<h3 style="margin-top:10px">Expenses</h3><table border=1 cellpadding=6 style="border-collapse:collapse"><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Notes</th></tr></thead><tbody>`;
        allExpenses.filter(e=>String(e.date).startsWith(m)).forEach(e => rowsHTML += `<tr><td>${e.date}</td><td>${e.category}</td><td>₹${fmt(e.amount)}</td><td>${(e.notes||'')}</td></tr>`);
        rowsHTML += `</tbody></table>`;
      } else {
        alert('Use Export CSV for range/all-time printing.');
        return;
      }
      const popup = window.open('','_blank','width=900,height=700');
      popup.document.write(`<html><head><title>Xpensive Report</title></head><body><h1>Xpensive Report</h1>${rowsHTML}</body></html>`);
      popup.document.close(); popup.print();
    });

    /* ========= INITIAL RENDER (empty) ========= */
    renderFilteredData();

    /* ========= END OF SCRIPT ========= */
