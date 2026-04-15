// script.js (FINAL, CORRECTED & COMPLETE VERSION)

const DB_NAME = 'Tahqeeq369_PHP_Final';
let db;
let activeGoalId = null;
let activeAlarmInterval = null;
let activeMusicPlayer = null;

// --- CONFIGURATION OBJECTS ---
const PHASES = [
    { key: 'phase1', day: 1, title: "🧲 اطلق بوضوح", color: "#e74c3c", placeholder: "لقد حددت هدفي بوضوح مطلق وهو..." },
    { key: 'phase2', day: 6, title: "🌟 صدّق", color: "#f1c40f", placeholder: "أنا أؤمن وأصدق أنني أستحق هذا الهدف وهو يتحقق الآن..." },
    { key: 'phase3', day: 11, title: "🎁 استقبل", color: "#2ecc71", placeholder: "أنا منفتح ومستعد لاستقبال هدفي بأفضل صورة..." },
    { key: 'phase4', day: 16, title: "🔄 الإحساس", color: "#3498db", placeholder: "أشعر بمشاعر الفرح والبهجة لتحقق هدفي..." },
    { key: 'phase5', day: 21, title: "🙏 الامتنان", color: "#9b59b6", placeholder: "أنا ممتن لله على كل النعم وعلى هدفي الذي تحقق..." }
];

// --- DATA & SETTINGS ---
let appSettings = {
    notifications: true,
    defaultTimes: {
        morning: '08:00 AM',
        afternoon: '01:00 PM',
        evening: '09:00 PM'
    },
    audio: {
        blobs: {
            sounds: { general: null, morning: null, afternoon: null, evening: null },
            music: { phase1: null, phase2: null, phase3: null, phase4: null, phase5: null }
        },
        urls: { sounds: {}, music: {} }
    }
};

let appData = {
    settings: appSettings,
    goals: []
};

// --- TIME FORMAT CONVERSION HELPERS ---
function convertTo12HourFormat(time24) { if (!time24) return '12:00 AM'; let [h, m] = time24.split(':'); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; return `${String(h).padStart(2, '0')}:${m} ${ampm}`; }
function convertTo24HourFormat(time12) { if (!time12 || !time12.includes(' ')) return '00:00'; let [time, mod] = time12.split(' '); let [h, m] = time.split(':'); if (h === '12') h = '00'; if (mod.toUpperCase() === 'PM') h = parseInt(h, 10) + 12; return `${String(h).padStart(2, '0')}:${m}`; }

// --- INITIALIZATION ---
window.onload = () => {
    if (document.readyState === "complete") initApp();
    else document.onreadystatechange = () => { if (document.readyState === "complete") initApp(); };
};

function initApp() {
    initDB();
    startClock();
    if ("Notification" in window) Notification.requestPermission();
    renderDefaultTimesEditor();
    document.getElementById('newGoalStart').addEventListener('change', updateEndDate);
    
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const wasActive = item.classList.contains('active');
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
            if (!wasActive) item.classList.add('active');
        });
    });

    document.querySelectorAll('.sound-upload').forEach(input => input.addEventListener('change', (e) => handleAudioUpload(e, 'sounds')));
    document.querySelectorAll('.music-upload').forEach(input => input.addEventListener('change', (e) => handleAudioUpload(e, 'music')));
}

// --- DATABASE & DATA HANDLING ---
function initDB() { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = (e) => { const d = e.target.result; if (!d.objectStoreNames.contains('data')) d.createObjectStore('data', { keyPath: 'id' }); }; request.onsuccess = (e) => { db = e.target.result; loadData(); }; request.onerror = (e) => console.error("DB Error", e); }
function saveData() { if (!db) return; const tx = db.transaction(['data'], 'readwrite'); tx.objectStore('data').put({ id: 'app', ...appData }); }

function loadData() {
    if (!db) return;
    const tx = db.transaction(['data'], 'readonly');
    const req = tx.objectStore('data').get('app');
    req.onsuccess = (e) => {
        if (e.target.result) {
            const saved = e.target.result;
            appData.settings = { ...appSettings, ...saved.settings, defaultTimes: { ...appSettings.defaultTimes, ...saved.settings.defaultTimes }, audio: { ...appSettings.audio, ...saved.settings.audio, blobs: { ...appSettings.audio.blobs, ...saved.settings.audio?.blobs } } };
            Object.keys(appData.settings.defaultTimes).forEach(key => { const time = appData.settings.defaultTimes[key]; if (time && !time.includes('M')) appData.settings.defaultTimes[key] = convertTo12HourFormat(time); });
            recreateAudioUrls();
        }
        document.getElementById('notifToggle').checked = appData.settings.notifications;
        renderDashboard();
        renderDefaultTimesEditor();
    };
    req.onerror = (e) => console.error("Load Error", e);
}

function base64ToBlob(base64Data) { const parts = base64Data.split(';base64,'); const contentType = parts[0].split(':')[1]; const raw = window.atob(parts[1]); const rawLength = raw.length; const uInt8Array = new Uint8Array(rawLength); for (let i = 0; i < rawLength; ++i) { uInt8Array[i] = raw.charCodeAt(i); } return new Blob([uInt8Array], { type: contentType }); }

// --- AUDIO HANDLING ---
function handleAudioUpload(event, type) {
    const input = event.target;
    const file = input.files[0];
    const key = input.dataset[`${type.slice(0, -1)}Key`];
    if (file && key) {
        const reader = new FileReader();
        reader.onload = (e) => {
            appData.settings.audio.blobs[type][key] = e.target.result;
            saveData();
            appData.settings.audio.urls[type][key] = URL.createObjectURL(file);
            showToast(`تم حفظ ${type === 'sounds' ? 'النغمة' : 'الموسيقى'} بنجاح`);
        };
        reader.readAsDataURL(file);
    }
}

function recreateAudioUrls() {
    const audioSettings = appData.settings.audio.blobs;
    if (!audioSettings) return;
    ['sounds', 'music'].forEach(type => {
        if (audioSettings[type]) {
            Object.keys(audioSettings[type]).forEach(key => {
                const base64Data = audioSettings[type][key];
                if (base64Data) {
                    try {
                        const blob = base64ToBlob(base64Data);
                        appData.settings.audio.urls[type][key] = URL.createObjectURL(blob);
                    } catch (err) { console.error(`Failed to recreate audio URL for ${type}/${key}:`, err); }
                }
            });
        }
    });
}

function stopAllMusic() { if (activeMusicPlayer) { activeMusicPlayer.pause(); activeMusicPlayer.currentTime = 0; activeMusicPlayer = null; } }

function applyPhaseMusic(goal) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startDate = new Date(goal.startDate); startDate.setHours(0, 0, 0, 0);
    if (today < startDate || today > new Date(goal.endDate)) return;
    const currentDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    let currentPhase = PHASES[0];
    for (let i = PHASES.length - 1; i >= 0; i--) { if (currentDay >= PHASES[i].day) { currentPhase = PHASES[i]; break; } }
    const musicUrl = appData.settings.audio.urls.music[currentPhase.key];
    if (musicUrl) {
        stopAllMusic();
        activeMusicPlayer = new Audio(musicUrl);
        activeMusicPlayer.loop = true;
        activeMusicPlayer.play().catch(e => console.warn("Music autoplay was blocked."));
    }
}

// --- CORE LOGIC & UI ---
function startClock() { setInterval(() => { const now = new Date(); let h = now.getHours(); const m = String(now.getMinutes()).padStart(2, '0'); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; document.getElementById('clock').innerText = `${String(h).padStart(2, '0')}:${m} ${ampm}`; checkReminders(now); }, 1000); }
function renderDefaultTimesEditor() { const container = document.getElementById('defaultRitualTimes'); container.innerHTML = `<div class="ritual-time-editor"><label>الصباح</label><input type="time" value="${convertTo24HourFormat(appData.settings.defaultTimes.morning)}" onchange="updateDefaultTime('morning', this.value)"></div><div class="ritual-time-editor"><label>الظهر</label><input type="time" value="${convertTo24HourFormat(appData.settings.defaultTimes.afternoon)}" onchange="updateDefaultTime('afternoon', this.value)"></div><div class="ritual-time-editor"><label>المساء</label><input type="time" value="${convertTo24HourFormat(appData.settings.defaultTimes.evening)}" onchange="updateDefaultTime('evening', this.value)"></div>`; }
function updateDefaultTime(period, time24) { appData.settings.defaultTimes[period] = convertTo12HourFormat(time24); saveData(); showToast(`تم تحديث وقت ${period === 'morning' ? 'الصباح' : period === 'afternoon' ? 'الظهر' : 'المساء'}`); renderDefaultTimesEditor(); }

function checkReminders(now) {
    if (!appData.settings.notifications) return;
    let h = now.getHours(); const m = String(now.getMinutes()).padStart(2, '0'); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12;
    const currentTimeStr = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    const todayDateStr = now.toISOString().split('T')[0];
    appData.goals.forEach(goal => {
        if (todayDateStr < goal.startDate || todayDateStr > goal.endDate) return;
        goal.rituals.forEach(r => {
            if (r.time === currentTimeStr) {
                const flag = `notif_${goal.id}_${r.id}_${todayDateStr}`;
                if (sessionStorage.getItem(flag)) return;
                let soundKey = 'general';
                if (r.id === 'm') soundKey = 'morning'; else if (r.id === 'a') soundKey = 'afternoon'; else if (r.id === 'e') soundKey = 'evening';
                const soundUrl = appData.settings.audio.urls.sounds[soundKey] || appData.settings.audio.urls.sounds['general'];
                triggerAlarm(goal.name, r.name, soundUrl);
                sessionStorage.setItem(flag, 'true');
            }
        });
    });
}

function triggerAlarm(goalName, ritualName, soundUrl) {
    if (Notification.permission === "granted") { new Notification(`⏰ ${goalName}`, { body: `حان وقت طقوس ${ritualName}`, icon: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png', tag: Date.now( ).toString() }); }
    const audio = document.getElementById('alarmSound');
    audio.src = soundUrl || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
    const playPromise = audio.play( );
    if (playPromise !== undefined) {
        playPromise.then(() => {
            document.getElementById('audioControl').classList.add('show');
            if (activeAlarmInterval) clearTimeout(activeAlarmInterval);
            activeAlarmInterval = setTimeout(stopAlarm, 60000);
        }).catch(error => console.error("Audio Error:", error));
    }
}

function stopAlarm() { const audio = document.getElementById('alarmSound'); audio.pause(); audio.currentTime = 0; document.getElementById('audioControl').classList.remove('show'); }

function createNewGoal() { const name = document.getElementById('newGoalName').value.trim(); const start = document.getElementById('newGoalStart').value; const end = document.getElementById('newGoalEnd').value; if (!name || !start || !end) return showToast("يرجى ملء جميع الحقول"); const newGoal = { id: Date.now().toString(), name: name, image: null, startDate: start, endDate: end, rituals: [{ id: 'm', name: 'صباح', time: appData.settings.defaultTimes.morning, count: 3 }, { id: 'a', name: 'ظهر', time: appData.settings.defaultTimes.afternoon, count: 6 }, { id: 'e', name: 'مساء', time: appData.settings.defaultTimes.evening, count: 9 }], entries: [] }; appData.goals.push(newGoal); saveData(); closeModal(); renderDashboard(); showToast("تم إضافة الهدف"); }

function openGoal(id) {
    activeGoalId = id;
    const goal = appData.goals.find(g => g.id === id);
    if (!goal) return;
    applyPhaseMusic(goal);
    document.getElementById('pageTitle').innerText = goal.name;
    document.getElementById('backBtn').style.display = 'block';
    document.getElementById('mainNav').style.display = 'none';
    document.getElementById('activeGoalPeriod').innerText = `${goal.startDate} - ${goal.endDate}`;
    if (goal.image) { document.getElementById('activeGoalImg').src = goal.image; document.getElementById('activeGoalImg').style.display = 'block'; document.getElementById('noGoalImg').style.display = 'none'; } else { document.getElementById('activeGoalImg').style.display = 'none'; document.getElementById('noGoalImg').style.display = 'block'; }
    updatePhaseIndicator(goal);
    const today = new Date().toISOString().split('T')[0];
    const completionCard = document.getElementById('completionCard');
    if (today > goal.endDate && goal.image) { document.getElementById('completionImage').src = goal.image; completionCard.style.display = 'block'; } else { completionCard.style.display = 'none'; }
    document.body.classList.add('show-guide');
    switchSection('goal-detail-section');
    renderRitualsForGoal(goal);
}

function goHome() {
    activeGoalId = null;
    stopAllMusic();
    document.getElementById('pageTitle').innerText = "تحقيق 369";
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('mainNav').style.display = 'flex';
    document.body.classList.remove('show-guide');
    if (document.getElementById('guideWidget').classList.contains('expanded')) toggleGuide();
    switchSection('dashboard-section');
    renderDashboard();
}

function renderRitualsForGoal(goal) { const container = document.getElementById('ritualsContainer'); container.innerHTML = ''; const today = new Date(); today.setHours(0, 0, 0, 0); const startDate = new Date(goal.startDate); startDate.setHours(0, 0, 0, 0); let placeholder = "اكتب توكيدك هنا..."; if (today >= startDate && today <= new Date(goal.endDate)) { const currentDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1; let currentPhase = PHASES[0]; for (let i = PHASES.length - 1; i >= 0; i--) { if (currentDay >= PHASES[i].day) { currentPhase = PHASES[i]; break; } } placeholder = currentPhase.placeholder; } const todayString = new Date().toDateString(); goal.rituals.forEach(r => { const todayEntries = goal.entries.filter(e => e.ritualId === r.id && new Date(e.date).toDateString() === todayString); const isDone = todayEntries.length >= r.count; let html = `<div class="ritual-block"><div class="ritual-header"><span style="font-weight:bold">${r.name}</span><span style="background:var(--input-bg); padding:2px 6px; border-radius:4px; font-size:0.8rem">⏰ ${r.time}</span></div><div class="ritual-count">تم: <span>${todayEntries.length}</span> / ${r.count}</div>`; if (!isDone) { html += `<textarea id="ritual-text-${r.id}" placeholder="${placeholder}"></textarea><button class="btn btn-sm" onclick="saveRitualEntry('${r.id}')">تسجيل</button>`; } else { html += `<div style="text-align:center; color:var(--primary); font-weight:bold; margin:5px 0;">✓ مكتمل</div>`; } html += `<div class="entry-log">`; todayEntries.forEach(e => html += `<div class="log-item">• ${e.text}</div>`); if (todayEntries.length === 0) html += `<div style="text-align:center; font-size:0.8rem; color:#999">لا يوجد سجل</div>`; html += `</div></div>`; container.innerHTML += html; }); }
function saveRitualEntry(ritualId) { const text = document.getElementById(`ritual-text-${ritualId}`).value.trim(); if (!text) return showToast("اكتب شيئاً أولاً"); const goal = appData.goals.find(g => g.id === activeGoalId); const ritual = goal.rituals.find(r => r.id === ritualId); const todayEntries = goal.entries.filter(e => e.ritualId === ritualId && new Date(e.date).toDateString() === new Date().toDateString()); if (todayEntries.length >= ritual.count) return showToast("اكملت العدد المطلوب"); goal.entries.push({ id: Date.now(), ritualId: ritualId, text: text, date: new Date().toISOString() }); saveData(); renderRitualsForGoal(goal); showToast("تم التسجيل"); }

function syncAndRefreshData() { if (!appData.goals || appData.goals.length === 0) { showToast("لا توجد أهداف حالية لمزامنتها."); return; } if (!confirm("هل تريد تطبيق أوقات الطقوس الافتراضية الحالية على جميع أهدافك؟")) return; appData.goals.forEach(goal => { goal.rituals.forEach(ritual => { if (ritual.id === 'm') ritual.time = appData.settings.defaultTimes.morning; else if (ritual.id === 'a') ritual.time = appData.settings.defaultTimes.afternoon; else if (ritual.id === 'e') ritual.time = appData.settings.defaultTimes.evening; }); }); saveData(); showToast("✅ تم تحديث ومزامنة جميع الأهداف بنجاح!"); renderDashboard(); }
function renderDashboard() { const container = document.getElementById('goalsList'); container.innerHTML = ''; const today = new Date(); today.setHours(0, 0, 0, 0); appData.goals.forEach(goal => { const startDate = new Date(goal.startDate); const endDate = new Date(goal.endDate); const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1; const elapsedDays = Math.max(0, (today - startDate) / (1000 * 60 * 60 * 24)); const progress = Math.min(100, (elapsedDays / totalDays) * 100); const isActive = today >= startDate && today <= endDate; const statusColor = isActive ? 'var(--primary)' : '#999'; const thumbStyle = goal.image ? `background-image:url('${goal.image}'); background-size:cover;` : ''; const div = document.createElement('div'); div.className = 'goal-item'; div.onclick = () => openGoal(goal.id); div.innerHTML = `<div class="goal-thumb" style="${thumbStyle}"></div><div class="goal-info"><div class="goal-name" style="color:${statusColor}">${goal.name}</div><div class="goal-dates">من ${goal.startDate} إلى ${goal.endDate}</div><div class="goal-progress"><div class="goal-bar" style="width:${progress}%; background:${statusColor}"></div></div></div><div style="color:var(--text-sub);">➜</div>`; container.appendChild(div); }); }

// **THIS IS THE MISSING PART OF THE FUNCTION**
function updatePhaseIndicator(goal) {
    const card = document.getElementById('phaseIndicatorCard');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startDate = new Date(goal.startDate); startDate.setHours(0, 0, 0, 0);
    if (today < startDate || today > new Date(goal.endDate)) {
        card.style.display = 'none';
        return;
    }
    const currentDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    let currentPhase = PHASES[0];
    for (let i = PHASES.length - 1; i >= 0; i--) {
        if (currentDay >= PHASES[i].day) {
            currentPhase = PHASES[i];
            break;
        }
    }
    const nextPhaseDay = PHASES.find(p => p.day > currentPhase.day)?.day || 26;
    const daysInPhase = nextPhaseDay - currentPhase.day;
    const dayWithinPhase = currentDay - currentPhase.day + 1;
    const phaseProgress = (dayWithinPhase / daysInPhase) * 100;
    document.getElementById('phaseTitle').innerText = currentPhase.title;
    document.getElementById('phaseDescription').innerText = `أنت في اليوم ${dayWithinPhase} من ${daysInPhase} لهذه المرحلة. (اليوم الكلي: ${currentDay}/25)`;
    const progressBar = document.getElementById('phaseProgressBar');
    progressBar.style.width = `${phaseProgress}%`;
    progressBar.style.backgroundColor = currentPhase.color;
    card.style.borderLeftColor = currentPhase.color;
    card.style.display = 'block';
}

function toggleNotifs() { appData.settings.notifications = document.getElementById('notifToggle').checked; if (appData.settings.notifications) { if (Notification.permission !== "granted") { Notification.requestPermission().then(p => { if (p !== "granted") { appData.settings.notifications = false; document.getElementById('notifToggle').checked = false; showToast("يجب السماح بالإشعارات من المتصفح"); } else { showToast("تم تفعيل التنبيهات"); } }); } else { showToast("التنبيهات مفعلة"); } } else { showToast("تم إيقاف التنبيهات"); } saveData(); }
function testNotification() { if (Notification.permission !== "granted") { Notification.requestPermission().then(p => { if (p === "granted") doTest(); else showToast("تم رفض الإشعارات"); }); } else { doTest(); } }
function doTest() { new Notification("🔔 اختبار التنبيه", { body: "إذا سمعت الصوت ورأيت هذه الرسالة، فكل شيء يعمل!", icon: "https://cdn-icons-png.flaticon.com/512/2693/2693507.png" } ); const audio = document.getElementById('alarmSound'); audio.src = appData.settings.audio.urls.sounds.general || "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"; audio.play( ).then(() => { document.getElementById('audioControl').classList.add('show'); setTimeout(stopAlarm, 5000); }).catch(e => console.error(e)); showToast("جاري إرسال اختبار..."); }
function uploadGoalImage() { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = e => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = ev => { const base64Data = ev.target.result; const goal = appData.goals.find(g => g.id === activeGoalId); if (goal) { goal.image = base64Data; saveData(); document.getElementById('activeGoalImg').src = base64Data; document.getElementById('activeGoalImg').style.display = 'block'; document.getElementById('noGoalImg').style.display = 'none'; if (document.getElementById('completionCard').style.display !== 'none') { document.getElementById('completionImage').src = base64Data; } showToast("تم حفظ الصورة"); } }; reader.readAsDataURL(file); } }; input.click(); }
function switchSection(id) { document.querySelectorAll('.section').forEach(e => e.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function switchTab(tab) { document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active')); if (tab === 'dashboard') { goHome(); document.querySelector('.nav-item:first-child').classList.add('active'); } else if (tab === 'settings') { stopAllMusic(); switchSection('settings-section'); document.body.classList.remove('show-guide'); document.querySelector('.nav-item:last-child').classList.add('active'); document.getElementById('pageTitle').innerText = "الإعدادات"; document.getElementById('backBtn').style.display = 'none'; } }
function openAddGoalModal() { document.getElementById('addGoalModal').style.display = 'flex'; const today = new Date().toISOString().split('T')[0]; document.getElementById('newGoalName').value = ''; document.getElementById('newGoalStart').value = today; updateEndDate(); }
function updateEndDate() { const startDateInput = document.getElementById('newGoalStart'); if (startDateInput.value) { const start = new Date(startDateInput.value); start.setDate(start.getDate() + 24); document.getElementById('newGoalEnd').value = start.toISOString().split('T')[0]; } }
function closeModal() { document.getElementById('addGoalModal').style.display = 'none'; }
function exportData() { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData)); const a = document.createElement('a'); a.href = dataStr; a.download = `backup_369_${new Date().toISOString().slice(0, 10)}.json`; a.click(); }
function importData(input) { const file = input.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const imported = JSON.parse(e.target.result); if (imported.goals && imported.settings) { appData = imported; saveData(); location.reload(); } else { showToast("ملف غير صالح"); } } catch (err) { showToast("خطأ في الملف"); } }; reader.readAsText(file); }
function resetApp() { if (confirm("هل أنت متأكد أنك تريد حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.")) { indexedDB.deleteDatabase(DB_NAME); sessionStorage.clear(); location.reload(); } }
function showToast(msg) { const t = document.getElementById('toast'); t.innerText = msg; t.className = 'show'; setTimeout(() => t.className = t.className.replace('show', ''), 3000); }
function toggleGuide() { document.getElementById('guideWidget').classList.toggle('expanded'); }
