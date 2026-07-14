/* ===================================================
   RSTC App — script.js
   =================================================== */

'use strict';

// ===== تبدیل ارقام فارسی/عربی به انگلیسی (هنگام تایپ با کیبورد فارسی) =====
function normalizeDigits(str) {
    if (str === null || str === undefined) return str;
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    return String(str).replace(/[۰-۹٠-٩]/g, ch => {
        const pIdx = persian.indexOf(ch);
        if (pIdx > -1) return String(pIdx);
        const aIdx = arabic.indexOf(ch);
        if (aIdx > -1) return String(aIdx);
        return ch;
    });
}
function attachDigitNormalizer(id) {
    const elm = document.getElementById(id);
    if (!elm) return;
    elm.addEventListener('input', function () {
        const pos = this.selectionStart;
        const normalized = normalizeDigits(this.value);
        if (normalized !== this.value) {
            this.value = normalized;
            if (pos !== null) this.setSelectionRange(pos, pos);
        }
    });
}

// ===== THEME =====
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('rstc-theme', isDark ? 'dark' : 'light');
    const icon = document.querySelector('#themeToggle .theme-icon');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
}
function initTheme() {
    const saved = localStorage.getItem('rstc-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    if (isDark) {
        document.body.classList.add('dark');
        const icon = document.querySelector('#themeToggle .theme-icon');
        if (icon) icon.textContent = '☀️';
    }
}

// ===== STATE =====
let currentUserRole = 'user';
let currentUsername = '';
let currentUserPermissions = [];
let allPersonnel = [];
let allMissions = [];
let personnelCache = [];
let _allUsers = [];
let _editingUserId = null;

// ===== UTILS =====
function hasPerm(perms, perm) {
    if (!Array.isArray(perms)) return false;
    if (perms.includes('*')) return true;
    return perms.includes(perm);
}
function getToken() { return localStorage.getItem('rstc_token'); }
function setToken(t) { localStorage.setItem('rstc_token', t); }
function clearToken() { localStorage.removeItem('rstc_token'); }

// Legacy wrapper
function showToast(msg, type = '') { toast(msg, type || 'success'); }

function el(id) { return document.getElementById(id); }

// ===== TOAST NOTIFICATIONS =====
function toast(msg, type = 'info', duration = 3500) {
    const container = el('toast-container');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${_esc(msg)}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button><div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
    container.appendChild(t);
    const remove = () => { if (t.parentElement) { t.classList.add('leaving'); setTimeout(() => t.remove(), 250); } };
    t.addEventListener('click', remove);
    setTimeout(remove, duration);
}

// ===== CONFIRM MODAL =====
function _confirm(msg, icon = '⚠️') {
    return new Promise(resolve => {
        const modal = el('confirmModal');
        el('confirm-msg').textContent = msg;
        el('confirm-icon').textContent = icon;
        modal.style.display = 'flex';
        const yesBtn = el('confirm-yes');
        const noBtn = el('confirm-no');
        function cleanup() { modal.style.display = 'none'; yesBtn.onclick = null; noBtn.onclick = null; }
        yesBtn.onclick = () => { cleanup(); resolve(true); };
        noBtn.onclick = () => { cleanup(); resolve(false); };
    });
}

async function api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && getToken()) {
        clearToken();
        el('login-page').style.display = 'flex';
        el('dashboard-page').style.display = 'none';
        showToast('نشست شما منقضی شد. دوباره وارد شوید.', 'error');
        return Promise.reject(new Error('نشست منقضی شده'));
    }
    if (res.status === 204 || res.headers.get('content-type')?.includes('application/octet-stream')) return res;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'خطای سرور');
    return data;
}

function _debounce(fn, ms) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }

// ===== تقویم شمسی =====
function toJalaali(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy = (gy <= 1600) ? 0 : 979; gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { jy, jm, jd };
}
function toGregorian(jy, jm, jd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy2 = (jy > 979) ? jy - 979 : jy, jm2 = (jm > 2) ? (jm - 1) : jm, jd2 = jd - 1, gy = 0, gm = 0, gd = 0;
    var days = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4) + 78 + jd2 + ((jm2 < 7) ? (jm2 - 1) * 31 : ((jm2 - 1) * 30 + 6));
    gy = 400 * Math.floor(days / 146097); days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    gd = days + 1; gm = 1;
    for (var i = 0; i < 11; i++) { var leap = (((gy % 4) == 0 && ((gy % 100) != 0)) || ((gy % 400) == 0)) && gm > 1 ? 1 : 0; if (gd <= g_d_m[gm] + leap) break; gd -= g_d_m[gm] + leap; gm++; }
    return { gy, gm, gd };
}
function isLeapYearJ(jy) { return [1, 5, 9, 13, 17, 22, 26, 30].indexOf(jy % 33) !== -1; }
function jMonthLen(jy, jm) { return (jm <= 6) ? 31 : (jm <= 11) ? 30 : (isLeapYearJ(jy) ? 30 : 29); }
const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const weekDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

function _jalaliToday() {
    const n = new Date();
    return toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

// ===== DATE PICKER =====
// state مشترک برای یک popup واحد
let _dpActiveInput = null;
const _dp = { jy: 1404, jm: 1, jd: 1, todayJ: { jy: 1404, jm: 1, jd: 1 } };

// اگر کاربر با دکمه‌های ماه قبل/بعد از بازه اولیه سال‌ها خارج شود، این تابع
// سال جدید را در جای درست (مرتب) به دراپ‌داون اضافه می‌کند تا تقویم هرگز قفل نشود
function _dpEnsureYearOption(selectEl, year) {
    const has = Array.from(selectEl.options).some(o => +o.value === year);
    if (has) return;
    const opt = document.createElement('option');
    opt.value = year; opt.textContent = year;
    const insertBefore = Array.from(selectEl.options).find(o => +o.value > year);
    if (insertBefore) selectEl.insertBefore(opt, insertBefore);
    else selectEl.appendChild(opt);
}

function _dpRender() {
    const popup = document.getElementById('dp-popup');
    if (!popup) return;
    const selYear  = document.getElementById('dp-sel-year');
    const selMonth = document.getElementById('dp-sel-month');
    if (!selYear || !selMonth) return;
    // اگر با دکمه‌های ماه قبل/بعد از بازه اولیه دراپ‌داون خارج شدیم، گزینه جدید را اضافه می‌کنیم
    _dpEnsureYearOption(selYear, _dp.jy);
    selYear.value  = _dp.jy;
    selMonth.value = _dp.jm;
    const daysC = document.getElementById('dp-days');
    daysC.innerHTML = '';
    const fg  = toGregorian(_dp.jy, _dp.jm, 1);
    const dow = (new Date(fg.gy, fg.gm - 1, fg.gd).getDay() + 1) % 7;
    for (let i = 0; i < dow; i++) { const s = document.createElement('span'); daysC.appendChild(s); }
    const len = jMonthLen(_dp.jy, _dp.jm);
    const tj  = _dp.todayJ;
    for (let d = 1; d <= len; d++) {
        const s = document.createElement('span');
        s.textContent = d;
        let cls = '';
        if (d === _dp.jd) cls += ' dp-selected';
        if (d === tj.jd && _dp.jm === tj.jm && _dp.jy === tj.jy) cls += ' dp-today';
        if (cls) s.className = cls.trim();
        s.addEventListener('click', e => {
            e.stopPropagation();
            _dp.jd = d;
            if (_dpActiveInput) {
                _dpActiveInput.value = _dp.jy + '/' + String(_dp.jm).padStart(2,'0') + '/' + String(d).padStart(2,'0');
            }
            popup.style.display = 'none';
        });
        daysC.appendChild(s);
    }
}

function _dpPosition(popup, input) {
    const rect = input.getBoundingClientRect();
    const pw   = 300; // عرض popup
    const ph   = 340; // ارتفاع تقریبی popup
    // بررسی فضای پایین و بالا
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top, right;
    if (spaceBelow >= ph || spaceBelow >= spaceAbove) {
        top = rect.bottom + 4;
    } else {
        top = rect.top - ph - 4;
    }
    right = window.innerWidth - rect.right;
    // جلوگیری از خروج از لبه چپ
    if (window.innerWidth - right - pw < 0) right = window.innerWidth - pw - 8;
    if (right < 4) right = 4;
    if (top < 4) top = 4;
    popup.style.top   = top + 'px';
    popup.style.right = right + 'px';
    popup.style.left  = 'auto';
}

// ساخت popup — فقط یک بار
function _dpEnsurePopup() {
    let popup = document.getElementById('dp-popup');
    if (popup) return popup;
    popup = document.createElement('div');
    popup.id = 'dp-popup';
    popup.innerHTML = `
        <div class="dp-selects">
            <button type="button" id="dp-prev-month" class="dp-nav-btn" title="ماه قبل">‹</button>
            <select id="dp-sel-year"></select>
            <select id="dp-sel-month"></select>
            <button type="button" id="dp-next-month" class="dp-nav-btn" title="ماه بعد">›</button>
        </div>
        <div class="dp-weekdays">
            <span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span>
        </div>
        <div class="dp-days" id="dp-days"></div>
        <div class="dp-footer">
            <button id="dp-today-btn" class="dp-btn dp-btn-today">امروز</button>
            <button id="dp-clear-btn" class="dp-btn dp-btn-clear">پاک کردن</button>
        </div>`;
    document.body.appendChild(popup);

    // پر کردن سال و ماه — فقط یک بار
    // ✅ بازه‌ی سال‌ها: حداقل ۵۰ سال قبل تا ۲۰ سال بعد از سال جاری
    const todayJ  = _jalaliToday();
    _dp.todayJ    = todayJ;
    const selYear  = popup.querySelector('#dp-sel-year');
    const selMonth = popup.querySelector('#dp-sel-month');
    for (let y = todayJ.jy - 50; y <= todayJ.jy + 20; y++) {
        const o = document.createElement('option'); o.value = y; o.textContent = y; selYear.appendChild(o);
    }
    jMonths.forEach((m, i) => {
        const o = document.createElement('option'); o.value = i + 1; o.textContent = m; selMonth.appendChild(o);
    });

    // onchange فقط یک بار تعریف می‌شود — از _dp.state مشترک استفاده می‌کند
    selYear.addEventListener('change', e => { _dp.jy = +e.target.value; _dp.jd = 1; _dpRender(); });
    selMonth.addEventListener('change', e => { _dp.jm = +e.target.value; _dp.jd = 1; _dpRender(); });

    // ✅ دکمه‌های پیمایش سریع ماه قبل/بعد — بدون نیاز به باز کردن دراپ‌داون
    popup.querySelector('#dp-prev-month').addEventListener('click', e => {
        e.stopPropagation();
        _dp.jm -= 1;
        if (_dp.jm < 1) { _dp.jm = 12; _dp.jy -= 1; }
        _dp.jd = 1;
        _dpRender();
    });
    popup.querySelector('#dp-next-month').addEventListener('click', e => {
        e.stopPropagation();
        _dp.jm += 1;
        if (_dp.jm > 12) { _dp.jm = 1; _dp.jy += 1; }
        _dp.jd = 1;
        _dpRender();
    });

    // دکمه امروز
    popup.querySelector('#dp-today-btn').addEventListener('click', e => {
        e.stopPropagation();
        const tj = _jalaliToday();
        _dp.jy = tj.jy; _dp.jm = tj.jm; _dp.jd = tj.jd;
        if (_dpActiveInput) {
            _dpActiveInput.value = tj.jy + '/' + String(tj.jm).padStart(2,'0') + '/' + String(tj.jd).padStart(2,'0');
        }
        popup.style.display = 'none';
    });

    // دکمه پاک
    popup.querySelector('#dp-clear-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (_dpActiveInput) _dpActiveInput.value = '';
        popup.style.display = 'none';
    });

    // بستن با کلیک خارج
    document.addEventListener('click', e => {
        if (!popup || popup.style.display === 'none') return;
        if (popup.contains(e.target)) return;
        popup.style.display = 'none';
    }, true);

    return popup;
}

function initDatePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input._dpReady) return;
    input._dpReady = true;
    input.readOnly = true;
    input.style.cursor = 'pointer';

    input.addEventListener('click', e => {
        e.stopPropagation();
        const popup = _dpEnsurePopup();
        _dpActiveInput = input;
        // به‌روزرسانی todayJ هر بار که باز می‌شود
        _dp.todayJ = _jalaliToday();
        // خواندن مقدار فعلی input
        const val   = input.value.trim();
        const parts = val.split('/').map(Number);
        if (parts.length === 3 && parts[0] > 1300 && parts[1] >= 1 && parts[1] <= 12) {
            _dp.jy = parts[0]; _dp.jm = parts[1]; _dp.jd = parts[2];
        } else {
            _dp.jy = _dp.todayJ.jy; _dp.jm = _dp.todayJ.jm; _dp.jd = _dp.todayJ.jd;
        }
        _dpPosition(popup, input);
        popup.style.display = 'block';
        _dpRender();
    });
}

function initReportDatePickers() {
    ['r_start_from', 'r_start_to', 'r_end_from', 'r_end_to'].forEach(id => initDatePicker(id));
}

// ===== CLOCK & DATE =====
function updateClock() {
    const now = new Date();
    const c = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const dateEl = el('live-date');
    const clockEl = el('live-clock');
    if (dateEl) {
        const textEl = dateEl.querySelector('.datetime-text');
        if (textEl) textEl.textContent = weekDays[now.getDay()] + ' ' + c.jy + '/' + String(c.jm).padStart(2, '0') + '/' + String(c.jd).padStart(2, '0');
    }
    if (clockEl) {
        const textEl = clockEl.querySelector('.datetime-text');
        if (textEl) textEl.textContent = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

// ===== LOGIN CANVAS ANIMATION =====
let _loginAnimId = null;
(function initLoginCanvas() {
    const canvas = document.getElementById('login-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], lines = [], mouseX = 0, mouseY = 0;
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.r = Math.random() * 2 + 0.5;
            this.alpha = Math.random() * 0.4 + 0.1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            const dx = mouseX - this.x, dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) { this.x -= dx * 0.002; this.y -= dy * 0.002; }
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,168,75,${this.alpha})`;
            ctx.fill();
        }
    }

    class FloatingLine {
        constructor() {
            this.x1 = Math.random() * w;
            this.y1 = Math.random() * h;
            this.angle = Math.random() * Math.PI * 2;
            this.len = Math.random() * 100 + 40;
            this.speed = Math.random() * 0.3 + 0.1;
            this.alpha = Math.random() * 0.12 + 0.03;
        }
        update() {
            this.angle += this.speed * 0.01;
            this.x1 += Math.cos(this.angle) * 0.3;
            this.y1 += Math.sin(this.angle) * 0.3;
            if (this.x1 < -50 || this.x1 > w + 50 || this.y1 < -50 || this.y1 > h + 50) {
                this.x1 = Math.random() * w; this.y1 = Math.random() * h;
            }
        }
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x1 + Math.cos(this.angle) * this.len, this.y1 + Math.sin(this.angle) * this.len);
            ctx.strokeStyle = `rgba(200,168,75,${this.alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());
    for (let i = 0; i < 15; i++) lines.push(new FloatingLine());

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(200,168,75,${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        lines.forEach(l => { l.update(); l.draw(); });
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        _loginAnimId = requestAnimationFrame(animate);
    }
    _loginAnimId = requestAnimationFrame(animate);
    window.stopLoginCanvas = function() {
        if (_loginAnimId) { cancelAnimationFrame(_loginAnimId); _loginAnimId = null; }
        ctx.clearRect(0, 0, w, h);
        window.removeEventListener('resize', resize);
        document.removeEventListener('mousemove', () => {});
    };
})();

// ===== PASSWORD TOGGLE =====
function togglePass() {
    const i = el('password');
    const btn = el('password-toggle');
    if (!i || !btn) return;
    const show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    btn.classList.toggle('is-active', show);
    btn.setAttribute('aria-pressed', String(show));
    btn.querySelector('span').textContent = show ? '🙈' : '👁';
}

// ===== SESSION TIMEOUT =====
let _sessionTimer = null;
let _warningTimer = null;
function _startSessionTimer() {
    clearTimeout(_sessionTimer); clearTimeout(_warningTimer);
    const token = getToken();
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresIn = (payload.exp * 1000) - Date.now();
        if (expiresIn <= 0) { doLogout(); return; }
        const warningMs = Math.max(expiresIn - 10 * 60 * 1000, 0);
        _warningTimer = setTimeout(() => { showToast('نشست شما تا ۱۰ دقیقه دیگر منقضی می‌شود.', 'error'); }, warningMs);
        _sessionTimer = setTimeout(() => { doLogout(); showToast('نشست شما منقضی شد.', 'error'); }, expiresIn);
    } catch (e) { }
}
function _resetSessionTimer() { _startSessionTimer(); }

// ===== LOGIN =====
function _setLoginButtonState(isLoading) {
    const btn = el('loginBtn');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.classList.toggle('is-loading', isLoading);
    btn.innerHTML = isLoading
        ? '<span>در حال ورود...</span><span class="btn-loader" aria-hidden="true"></span>'
        : '<span>ورود به سیستم</span><span class="btn-arrow">←</span>';
}

async function doLogin() {
    const username = el('username').value.trim();
    const password = el('password').value;
    const errEl = el('login-error');
    errEl.style.display = 'none';
    if (!username || !password) { errEl.textContent = 'نام کاربری و رمز عبور الزامی است.'; errEl.style.display = 'block'; return; }
    _setLoginButtonState(true);
    try {
        const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        setToken(data.token); currentUserRole = data.role; currentUsername = data.username; currentUserPermissions = data.permissions || [];
        window.currentUser = { id: data.id, username: data.username, role: data.role };
        if (window.stopLoginCanvas) window.stopLoginCanvas();
        document.body.classList.add('logged-in');
        el('login-page').style.display = 'none';
        el('dashboard-page').style.display = 'flex';
        el('user-display-name').textContent = data.username;
        el('user-display-role').textContent = data.role === 'admin' ? 'مدیر کل' : (data.role === 'editor' ? 'ویرایشگر' : data.role === 'operator' ? 'امور ماموریت' : data.role === 'viewer' ? 'بیننده' : 'کاربر عادی');
        el('user-avatar').textContent = data.username[0].toUpperCase();
        if (hasPerm(currentUserPermissions, 'users:view')) el('nav-users').style.display = 'flex';
        if (hasPerm(currentUserPermissions, 'backup:view')) el('nav-backup').style.display = 'flex';
        if (hasPerm(currentUserPermissions, 'options:view')) el('nav-options').style.display = 'flex';
        if (hasPerm(currentUserPermissions, 'audit:view')) el('nav-audit').style.display = 'flex';
        const chatNav = el('nav-chat');
        if (chatNav) chatNav.style.display = 'flex';
        const aiWidget = el('ai-chat-widget');
        if (aiWidget) aiWidget.style.display = hasPerm(currentUserPermissions, 'ai_chat:view') ? 'flex' : 'none';
        _showPage('dashboard');
        updateClock(); loadDashboard(); _startSessionTimer(); loadAllOptions(); checkAnnouncement(); requestNotificationPermission(); checkUnreadChat();
    } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
    _setLoginButtonState(false);
}
el('password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
el('username').addEventListener('keydown', e => { if (e.key === 'Enter') el('password').focus(); });

// ===== LOGOUT =====
function doLogout() {
    clearTimeout(_sessionTimer); clearTimeout(_warningTimer);
    clearToken(); currentUserRole = 'user'; currentUsername = ''; currentUserPermissions = []; allPersonnel = []; allMissions = []; personnelCache = [];
    _pageLoaded = { dashboard: true, personnel: false, missions: false, users: false, reports: false };
    document.body.classList.remove('logged-in');
    el('dashboard-page').style.display = 'none';
    el('login-page').style.display = 'flex';
    el('username').value = ''; el('password').value = '';
    el('login-error').style.display = 'none';
    el('nav-users').style.display = 'none'; el('nav-backup').style.display = 'none'; el('nav-options').style.display = 'none'; el('nav-audit').style.display = 'none'; const chatNav = el('nav-chat'); if (chatNav) chatNav.style.display = 'none';
    const chatWidget = el('chat-widget'); if (chatWidget) chatWidget.classList.remove('chat-open');
    _chatOpen = false; stopChatPolling();
}

// ===== OPTIONS MANAGEMENT =====
let _allOptions = {};
let _currentOptionField = null;

async function loadAllOptions() {
    try {
        const data = await api('/api/options');
        _allOptions = data;
        populateAllSelects();
    } catch (e) { console.error('Options load error:', e); }
}

function populateSelect(selectId, options, placeholder) {
    const sel = el(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        sel.appendChild(o);
    });
    if (current && options.includes(current)) sel.value = current;
}

function populateAllSelects() {
    if (_allOptions.emp_type) populateSelect('p_emp_type', _allOptions.emp_type.options, 'انتخاب...');
    if (_allOptions.last_degree) populateSelect('p_last_degree', _allOptions.last_degree.options, 'انتخاب...');
    if (_allOptions.mission_type) {
        populateSelect('m_type', _allOptions.mission_type.options, 'انتخاب...');
        populateSelect('r_mission_type', _allOptions.mission_type.options, 'همه');
    }
    if (_allOptions.device_type) {
        populateSelect('m_device', _allOptions.device_type.options, 'انتخاب...');
        populateSelect('r_device', _allOptions.device_type.options, 'همه');
    }
    if (_allOptions.repair_type) populateSelect('m_repair', _allOptions.repair_type.options, 'انتخاب...');
    if (_allOptions.region) {
        populateSelect('m_region', _allOptions.region.options, 'انتخاب...');
        populateSelect('r_region', _allOptions.region.options, 'همه');
    }
}

function openOptionsModal() {
    _renderOptionsSidebar();
    el('optionsModal').style.display = 'flex';
}
function closeOptionsModal(e) {
    if (e && e.target !== e.currentTarget) return;
    el('optionsModal').style.display = 'none';
    _currentOptionField = null;
}

// ===== ANNOUNCEMENTS =====
async function checkAnnouncement() {
    try {
        const data = await api('/api/announcements/active');
        if (data && data.id) {
            showAnnouncementModal(data);
        }
    } catch (e) {
        console.warn('Announcement check failed:', e);
    }
}

function showAnnouncementModal(ann) {
    const modal = el('announcementModal');
    const body = el('announcementModalBody');
    const typeLabels = { info: 'اطلاعیه', warning: 'هشدار', danger: 'مهم', success: 'موفقیت' };
    const typeIcons = { info: 'ℹ️', warning: '⚠️', danger: '🚨', success: '✅' };
    body.innerHTML = `
        <div class="announcement-content">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="announcement-icon">${typeIcons[ann.type] || '📢'}</div>
                <div>
                    <h4 class="announcement-title">${_esc(ann.title)}</h4>
                    <span class="announcement-type-badge announcement-type-${ann.type}">${typeLabels[ann.type] || ann.type}</span>
                </div>
            </div>
            <div class="announcement-message">${_esc(ann.message)}</div>
            <div class="announcement-footer">
                <button class="btn-primary" onclick="closeAnnouncementModal()">متوجه شدم</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeAnnouncementModal(e) {
    if (e && e.target !== e.currentTarget) return;
    el('announcementModal').style.display = 'none';
}

// Admin: manage announcements
async function loadAnnouncements() {
    try {
        const data = await api('/api/announcements');
        const container = el('announcements-manage-container');
        if (!container) return;
        if (!data.results || !data.results.length) {
            container.innerHTML = '<div class="announcement-empty">هنوز اطلاعیه‌ای ثبت نشده</div>';
            return;
        }
        container.innerHTML = '<div class="announcement-manage-list">' + data.results.map(ann => `
            <div class="announcement-manage-item">
                <div class="announcement-manage-info">
                    <div class="announcement-manage-title">${_esc(ann.title)}</div>
                    <div class="announcement-manage-meta">${_esc(ann.type)} • ${_esc(ann.created_at)} • ${ann.is_active ? 'فعال' : 'غیرفعال'}</div>
                </div>
                <div class="announcement-manage-actions">
                    <button class="announcement-toggle-btn ${ann.is_active ? 'active' : ''}" onclick="toggleAnnouncement(${ann.id}, ${!ann.is_active})">
                        ${ann.is_active ? 'غیرفعال' : 'فعال'}
                    </button>
                    <button class="announcement-delete-btn" onclick="deleteAnnouncement(${ann.id})">🗑️</button>
                </div>
            </div>
        `).join('') + '</div>';
    } catch (e) {
        console.error('loadAnnouncements failed:', e);
    }
}

async function createAnnouncement() {
    const title = el('ann-title').value.trim();
    const message = el('ann-message').value.trim();
    const type = el('ann-type').value;
    if (!title || !message) { showToast('عنوان و متن اطلاعیه الزامی است', 'warning'); return; }
    try {
        await api('/api/announcements', { method: 'POST', body: JSON.stringify({ title, message, type }) });
        el('ann-title').value = ''; el('ann-message').value = '';
        showToast('اطلاعیه با موفقیت ایجاد شد', 'success');
        sendBrowserNotification('📢 اطلاعیه جدید', title, null);
        loadAnnouncements();
    } catch (e) { showToast(e.message, 'error'); }
}

async function toggleAnnouncement(id, active) {
    try {
        await api(`/api/announcements/${id}`, { method: 'PUT', body: JSON.stringify({ is_active: active }) });
        showToast(active ? 'اطلاعیه فعال شد' : 'اطلاعیه غیرفعال شد', 'success');
        loadAnnouncements();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteAnnouncement(id) {
    if (!await _confirm('آیا مطمئن هستید که این اطلاعیه حذف شود؟')) return;
    try {
        await api(`/api/announcements/${id}`, { method: 'DELETE' });
        showToast('اطلاعیه حذف شد', 'success');
        loadAnnouncements();
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== PUSH NOTIFICATIONS =====
function requestNotificationPermission() {
    if (!('Notification' in window)) { showToast('مرورگر شما از اعلان‌ها پشتیبانی نمی‌کند', 'warning'); return false; }
    if (Notification.permission === 'granted') {
        const btn = el('notifToggle');
        if (btn) btn.classList.add('granted');
        return true;
    }
    if (Notification.permission === 'denied') {
        showToast('اعلان‌ها در این مرورگر مسدود شده‌اند', 'warning');
        return false;
    }
    Notification.requestPermission().then(p => {
        if (p === 'granted') {
            const btn = el('notifToggle');
            if (btn) btn.classList.add('granted');
            showToast('اعلان‌ها فعال شدند', 'success');
        } else {
            showToast('اعلان‌ها فعال نشدند', 'warning');
        }
    });
}

function sendBrowserNotification(title, body, icon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const n = new Notification(title, {
            body: body || '',
            icon: icon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏢</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏢</text></svg>',
            tag: 'rstc-notif',
            renotify: true,
            requireInteraction: false
        });
        n.onclick = () => { window.focus(); n.close(); };
        setTimeout(() => n.close(), 8000);
    } catch (e) { console.warn('Notification failed:', e); }
}

// ===== CHAT =====
let _chatOpen = false;
let _chatUserId = null;
let _chatUserName = null;
let _chatPollId = null;

function openChat() {
    _chatOpen = true;
    el('chat-widget').classList.add('chat-open');
    el('nav-chat').classList.add('active');
    loadChatUsers();
    startChatPolling();
}

function toggleChat() {
    const widget = el('chat-widget');
    if (!widget.classList.contains('chat-open')) {
        _chatOpen = true;
        widget.classList.add('chat-open');
        el('nav-chat').classList.add('active');
        loadChatUsers();
        startChatPolling();
    } else {
        _chatOpen = false;
        widget.classList.remove('chat-open');
        el('nav-chat').classList.remove('active');
        stopChatPolling();
    }
}

async function loadChatUsers() {
    try {
        const data = await api('/api/chat/users');
        const list = el('chat-user-list');
        if (!data.users || !data.users.length) {
            list.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px;text-align:center;">کاربری یافت نشد</div>';
            return;
        }
        list.innerHTML = data.users.map(u => `
            <div class="chat-user-item ${_chatUserId === u.id ? 'active' : ''}" onclick="selectChatUser(${u.id}, '${_esc(u.username)}')">
                <div class="chat-user-avatar">${u.username[0].toUpperCase()}</div>
                <div class="chat-user-name">${_esc(u.username)}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('loadChatUsers failed:', e);
    }
}

async function selectChatUser(userId, userName) {
    _chatUserId = userId;
    _chatUserName = userName;
    el('chat-placeholder').style.display = 'none';
    el('chat-messages').style.display = 'flex';
    el('chat-input-area').style.display = 'flex';
    document.querySelector('.chat-user-item.active')?.classList.remove('active');
    event.currentTarget.classList.add('active');
    await loadChatMessages(userId);
}

async function loadChatMessages(userId) {
    try {
        const data = await api(`/api/chat/messages?userId=${userId}`);
        const container = el('chat-messages');
        if (!data.messages || !data.messages.length) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px;">هنوز پیامی تبادل نشده</div>';
            return;
        }
        container.innerHTML = data.messages.map(m => {
            const isMe = m.sender_id === parseInt(getCurrentUserId());
            return `<div class="chat-msg ${isMe ? 'sent' : 'received'}">
                <div>${_esc(m.message)}</div>
                <div class="chat-msg-time">${_formatTime(m.created_at)}</div>
            </div>`;
        }).join('');
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error('loadChatMessages failed:', e);
    }
}

async function sendChatMessage() {
    const input = el('chat-message-input');
    const text = input.value.trim();
    if (!text || !_chatUserId) return;
    try {
        await api('/api/chat/send', { method: 'POST', body: JSON.stringify({ receiver_id: _chatUserId, receiver_name: _chatUserName, message: text }) });
        input.value = '';
        await loadChatMessages(_chatUserId);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

el('chat-message-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
});

async function checkUnreadChat() {
    try {
        const data = await api('/api/chat/unread-count');
        const badge = el('chat-badge');
        if (data.count > 0) {
            badge.textContent = data.count > 99 ? '99+' : data.count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) { console.warn('Unread check failed:', e); }
}

function startChatPolling() {
    stopChatPolling();
    _chatPollId = setInterval(async () => {
        await checkUnreadChat();
        if (_chatOpen && _chatUserId) {
            await loadChatMessages(_chatUserId);
        }
    }, 3000);
}

function stopChatPolling() {
    if (_chatPollId) { clearInterval(_chatPollId); _chatPollId = null; }
}

function getCurrentUserId() {
    return (window.currentUser && window.currentUser.id) ? window.currentUser.id : null;
}

function _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

const _fieldIcons = { emp_type:'👔', last_degree:'🎓', mission_type:'📋', device_type:'🔧', repair_type:'🛠️', region:'📍', announcements:'📢' };

function _renderOptionsSidebar() {
    const c = el('options-sidebar-list');
    c.innerHTML = '';
    Object.keys(_allOptions).forEach(key => {
        const f = _allOptions[key];
        const d = document.createElement('div');
        d.className = 'opt-sidebar-item' + (key === _currentOptionField ? ' active' : '');
        d.innerHTML = `<span class="opt-sb-icon">${_fieldIcons[key]||'📌'}</span><span class="opt-sb-text">${f.label}</span><span class="opt-sb-count">${f.options.length}</span>`;
        d.onclick = () => { _currentOptionField = key; _renderOptionsSidebar(); _renderOptionsList(); };
        c.appendChild(d);
    });
    // Announcements item
    const annItem = document.createElement('div');
    annItem.className = 'opt-sidebar-item' + (_currentOptionField === 'announcements' ? ' active' : '');
    annItem.innerHTML = '<span class="opt-sb-icon">📢</span><span class="opt-sb-text">اطلاعیه‌ها</span><span class="opt-sb-count">📢</span>';
    annItem.onclick = () => { _currentOptionField = 'announcements'; _renderOptionsSidebar(); _renderOptionsList(); };
    c.appendChild(annItem);
}

function _renderOptionsList() {
    if (!_currentOptionField) { el('options-field-label').textContent = 'یک فیلد را انتخاب کنید'; el('options-list-container').innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px;">از سمت راست یک فیلد انتخاب کنید</div>'; return; }
    if (_currentOptionField === 'announcements') {
        el('options-field-label').textContent = 'مدیریت اطلاعیه‌ها';
        el('options-list-container').innerHTML = `
            <div class="announcement-form">
                <input type="text" id="ann-title" placeholder="عنوان اطلاعیه...">
                <textarea id="ann-message" placeholder="متن اطلاعیه..."></textarea>
                <select id="ann-type">
                    <option value="info">ℹ️ اطلاعیه</option>
                    <option value="warning">⚠️ هشدار</option>
                    <option value="danger">🚨 مهم</option>
                    <option value="success">✅ موفقیت</option>
                </select>
                <div class="announcement-form-actions">
                    <button class="btn-primary" onclick="createAnnouncement()">➕ ایجاد اطلاعیه</button>
                </div>
            </div>
            <div id="announcements-manage-container"></div>
        `;
        loadAnnouncements();
        return;
    }
    const field = _allOptions[_currentOptionField];
    el('options-field-label').textContent = field.label + ' (' + field.options.length + ' گزینه)';
    const c = el('options-list-container');
    if (!field.options.length) { c.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:30px;">هنوز گزینه‌ای تعریف نشده</div>'; return; }
    c.innerHTML = '';
    field.options.forEach((opt, i) => {
        const d = document.createElement('div');
        d.className = 'opt-item';
        d.innerHTML = `
            <span class="opt-item-text">${_esc(opt)}</span>
            <div class="opt-item-actions">
                <button class="opt-edit-btn" onclick="editOption(${i})" title="ویرایش">✏️</button>
                <button class="opt-del-btn" onclick="deleteOption(${i})" title="حذف">🗑️</button>
            </div>`;
        c.appendChild(d);
    });
}

async function addOption() {
    if (!_currentOptionField) return;
    const inp = el('new-option-input');
    const val = inp.value.trim();
    if (!val) return;
    try {
        const data = await api(`/api/options/${_currentOptionField}`, { method: 'POST', body: JSON.stringify({ value: val }) });
        _allOptions[_currentOptionField].options = data.options;
        inp.value = '';
        _renderOptionsList(); _renderOptionsSidebar();
        populateAllSelects();
    } catch (e) { toast(e.message, 'error'); }
}

function editOption(idx) {
    if (!_currentOptionField) return;
    const oldVal = _allOptions[_currentOptionField].options[idx];
    const newVal = prompt('ویرایش گزینه:', oldVal);
    if (newVal === null || newVal.trim() === '' || newVal.trim() === oldVal) return;
    api(`/api/options/${_currentOptionField}`, { method: 'PUT', body: JSON.stringify({ oldValue: oldVal, newValue: newVal.trim() }) })
        .then(data => { _allOptions[_currentOptionField].options = data.options; _renderOptionsList(); _renderOptionsSidebar(); populateAllSelects(); })
        .catch(e => toast(e.message, 'error'));
}

async function deleteOption(idx) {
    if (!_currentOptionField) return;
    const val = _allOptions[_currentOptionField].options[idx];
    if (!await _confirm(`آیا از حذف "${val}" مطمئنید؟`)) return;
    try {
        const data = await api(`/api/options/${_currentOptionField}/${idx}`, { method: 'DELETE' });
        _allOptions[_currentOptionField].options = data.options;
        _renderOptionsList(); _renderOptionsSidebar();
        populateAllSelects();
    } catch (e) { toast(e.message, 'error'); }
}

// ===== SIDEBAR NAVIGATION =====
function toggleSidebar() {
    el('sidebar').classList.toggle('open');
    el('sidebarOverlay').classList.toggle('open');
}
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        const target = this.dataset.page;
        if (!target) return;
        _showPage(target);
    });
});
document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', function () {
        const target = this.dataset.page;
        if (!target) return;
        _showPage(target);
    });
});
function _showPage(target) {
    const current = document.querySelector('.page.active-page');
    const next = el('page-' + target);
    if (!next || next === current) return;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`[data-page="${target}"]`);
    if (navItem) navItem.classList.add('active');
    const bottomItem = document.querySelector(`.bottom-nav-item[data-page="${target}"]`);
    if (bottomItem) bottomItem.classList.add('active');
    el('page-heading').textContent = { dashboard: 'داشبورد', personnel: 'مدیریت پرسنل', missions: 'صدور ماموریت', users: 'کاربران سیستم', reports: 'گزارش‌گیری ماموریت‌ها', backup: 'پشتیبان‌گیری', audit: 'لاگ فعالیت‌ها', help: 'راهنمای استفاده' }[target] || target;
    if (current) {
        current.classList.add('page-leaving');
        if (next) next.classList.add('page-entering');
        void next.offsetWidth;
        setTimeout(() => {
            current.classList.remove('active-page', 'page-leaving');
            if (next) {
                next.classList.remove('page-entering');
                next.classList.add('active-page');
            }
        }, 220);
    } else {
        next.classList.add('active-page');
    }
    if (target === 'reports') { _loadFiltersFromURL(); }
    if (target === 'backup') { _initRestoreDragDrop(); loadBackupHistory(); }
    _onPageShow(target);
    el('sidebar').classList.remove('open');
    el('sidebarOverlay').classList.remove('open');
}

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        const data = await api('/api/dashboard');
        if (el('stat-total')) el('stat-total').textContent = data.total || 0;
        if (el('stat-active')) el('stat-active').textContent = data.active || 0;
        if (el('stat-employment-rate')) el('stat-employment-rate').textContent = data.total ? Math.round((data.active / data.total) * 100) + '%' : '۰٪';
        if (el('stat-missions')) el('stat-missions').textContent = data.missionCount || 0;
        const sv = data.singleVsGroup || {};
        if (el('stat-single')) el('stat-single').textContent = sv.singleCount || 0;
        if (el('stat-group')) el('stat-group').textContent = sv.groupCount || 0;
        const sup = data.suppliedVsUn || {};
        if (el('stat-supplied')) el('stat-supplied').textContent = sup.supplied || 0;
        if (el('stat-unsupplied')) el('stat-unsupplied').textContent = sup.unsupplied || 0;
        _renderDonutChart('chart-mission-type', data.byMissionType || [], 'mission_type', 'legend-mission-type', 'chart-mtype-total', data.missionCount || 0);
        _renderBarChartHorizontal('chart-region', data.byRegion || [], 'region', 'chart-region-total');
        _renderDonutChart('chart-emp-type', data.byType || [], 'emp_type', 'legend-emp-type', 'chart-type-total', data.total || 0);
        _renderDonutChart('chart-degree', data.byDegree || [], 'last_degree', 'legend-degree', 'chart-degree-total', data.total || 0);
        if (el('recent-missions') && data.recentMissions) {
            el('recent-missions').innerHTML = data.recentMissions.length ? data.recentMissions.map(m => `<div class="recent-item"><span class="recent-name">${_esc(m.name)} ${_esc(m.lname || '')}</span><span class="recent-meta">${_esc(m.decree_num || '')} — ${_esc(m.location || '')}</span></div>`).join('') : '<p style="color:var(--text-muted);font-size:12px;padding:8px;">ماموریتی ثبت نشده</p>';
        }
        if (el('recent-personnel') && data.recentPersonnel) {
            el('recent-personnel').innerHTML = data.recentPersonnel.length ? data.recentPersonnel.map(p => `<div class="recent-item"><span class="recent-name">${_esc(p.name)} ${_esc(p.lname || '')}</span><span class="recent-meta">${_esc(p.job_title || '')} — ${_esc(p.status || '')}</span></div>`).join('') : '<p style="color:var(--text-muted);font-size:12px;padding:8px;">پرسنلی ثبت نشده</p>';
        }
        loadDashboardAnnouncement();
    } catch (e) { console.error('Dashboard error:', e); }
}

async function loadDashboardAnnouncement() {
    const banner = el('dashboard-announcement-banner');
    if (!banner) return;
    try {
        const data = await api('/api/announcements/active');
        if (!data || !data.id) { banner.innerHTML = ''; return; }
        const typeIcons = { info: 'ℹ️', warning: '⚠️', danger: '🚨', success: '✅' };
        banner.innerHTML = `
            <div class="dash-announcement">
                <div class="dash-announcement-icon">${typeIcons[data.type] || '📢'}</div>
                <div class="dash-announcement-body">
                    <div class="dash-announcement-title">${_esc(data.title)}</div>
                    <div class="dash-announcement-message">${_esc(data.message)}</div>
                </div>
                <div class="dash-announcement-actions">
                    <button class="dash-announcement-close" onclick="document.getElementById('dashboard-announcement-banner').innerHTML=''" title="بستن">✕</button>
                </div>
            </div>
        `;
    } catch (e) { console.error('Dashboard announcement load failed:', e); }
}

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

let _activeAc = { list: null, input: null };
function _positionAcFixed(acList, input) {
    if (!acList || !input) return;
    const rect = input.getBoundingClientRect();
    acList.style.position = 'fixed';
    acList.style.top = (rect.bottom + 4) + 'px';
    acList.style.left = rect.left + 'px';
    acList.style.width = rect.width + 'px';
}
function _setupAcScrollFix() {
    const pc = document.querySelector('.page-content');
    if (!pc) return;
    const reposition = () => { if (_activeAc.list && _activeAc.input) _positionAcFixed(_activeAc.list, _activeAc.input); };
    pc.addEventListener('scroll', reposition);
    window.addEventListener('resize', reposition);
}

function searchPersonnel(q) {
    if (!q || !q.length) return [];
    const matches = [];
    const seen = new Set();
    const norm = typeof normalizeDigits === 'function' ? normalizeDigits(q) : q;
    for (const p of personnelCache) {
        const name = String(p.name || '').toLowerCase().trim();
        const lname = String(p.lname || '').toLowerCase().trim();
        let natId = String(p.national_id || '').toLowerCase().trim();
        let empNum = String(p.emp_num || '').toLowerCase().trim();
        natId = typeof normalizeDigits === 'function' ? normalizeDigits(natId) : natId;
        empNum = typeof normalizeDigits === 'function' ? normalizeDigits(empNum) : empNum;
        const haystack = name + ' ' + lname + ' ' + natId + ' ' + empNum;
        if (haystack.includes(norm)) {
            const key = p.id;
            if (!seen.has(key)) { seen.add(key); matches.push(p); }
        }
    }
    return matches.slice(0, 10);
}

function _highlightAcItem(acList) {
    if (!acList) return;
    const items = acList.querySelectorAll('.ac-item');
    items.forEach((item, idx) => {
        item.style.background = idx === acList._selectedIndex ? '#e2e8f0' : '';
    });
}

function selectAutocompletePerson(acList, pid, input, lnameEl, empNumEl, jobTitleEl) {
    const p = personnelCache.find(x => x.id === pid);
    if (p) {
        if (input) input.value = p.name || '';
        if (lnameEl) lnameEl.value = p.lname || '';
        if (empNumEl) empNumEl.value = p.emp_num || '';
        if (jobTitleEl) jobTitleEl.value = p.job_title || '';
    }
    if (acList) acList.style.display = 'none';
}

async function importPersonnelAndSearch(q) {
    if (personnelCache.length) return searchPersonnel(q);
    try {
        const data = await api('/api/personnel');
        personnelCache = data;
        allPersonnel = data;
        return searchPersonnel(q);
    } catch (e) {
        console.warn('Fallback personnel import failed:', e);
        return [];
    }
}

function _renderDonutChart(containerId, data, labelKey, legendId, totalId, totalVal) {
    const c = el(containerId), legend = el(legendId), totalEl = el(totalId);
    if (!c) return;
    if (totalEl) totalEl.textContent = totalVal + (labelKey === 'mission_type' ? ' حکم' : ' نفر');
    if (!data || !data.length) { c.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px;">داده‌ای موجود نیست</p>'; if (legend) legend.innerHTML = ''; return; }
    const colors = ['#c8a84b', '#0f1f3d', '#16a34a', '#dc2626', '#2563eb', '#9333ea', '#ea580c', '#0891b2', '#be185d', '#65a30d'];
    const total = data.reduce((s, d) => s + (d.count || 0), 0);
    let cumPct = 0;
    const segments = data.map((d, i) => {
        const pct = total ? (d.count / total) * 100 : 0;
        const color = colors[i % colors.length];
        const seg = `${color} ${cumPct}% ${cumPct + pct}%`;
        cumPct += pct;
        return seg;
    });
    c.innerHTML = `<div class="donut-hole" style="background:conic-gradient(${segments.join(',')});"></div>`;
    if (legend) {
        legend.innerHTML = data.map((d, i) => `<div class="legend-item"><span class="legend-dot" style="background:${colors[i % colors.length]};"></span><span class="legend-label">${_esc(d[labelKey] || '—')}</span><span class="legend-count">${d.count}</span></div>`).join('');
    }
}

function _renderBarChartHorizontal(containerId, data, labelKey, totalId) {
    const c = el(containerId);
    if (!c) return;
    if (!data || !data.length) { c.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px;">داده‌ای موجود نیست</p>'; return; }
    const total = data.reduce((s, d) => s + (d.count || 0), 0);
    const totalEl = el(totalId);
    if (totalEl) totalEl.textContent = total + ' حکم';
    const max = Math.max(...data.map(d => d.count));
    c.innerHTML = data.map(d => `<div class="hbar-item"><span class="hbar-label">${_esc(d[labelKey] || '—')}</span><div class="hbar-track"><div class="hbar-fill" style="width:${Math.round((d.count / max) * 100)}%"></div></div><span class="hbar-count">${d.count}</span></div>`).join('');
}

// ===== USERS =====
async function loadUsers() {
    try {
        _allUsers = await api('/api/users');
        renderUsers(_allUsers);
    } catch (e) { showToast(e.message, 'error'); }
}

function _formatDatePersian(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return '—'; }
}

function _formatDateShort(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
    } catch { return '—'; }
}

function renderUsers(list) {
    el('users-table-body').innerHTML = list.map((u, i) => {
        const lastLogin = _formatDatePersian(u.last_login);
        const created = _formatDateShort(u.created_at);
        const isActive = u.status !== 'disabled';
        const roleBadge = u.role === 'admin' ? '<span class="badge badge-green">مدیر کل</span>' : 
            u.role === 'editor' ? '<span class="badge badge-blue">ویرایشگر</span>' :
            u.role === 'operator' ? '<span class="badge badge-teal">امور ماموریت</span>' :
            u.role === 'viewer' ? '<span class="badge badge-gray">بیننده</span>' :
            '<span class="badge badge-gray">کاربر عادی</span>';
        const statusBadge = isActive ? '<span class="badge badge-green">فعال</span>' : '<span class="badge badge-orange">غیرفعال</span>';
        const isMainAdmin = u.id === 1;
        return `<tr style="${!isActive ? 'opacity:0.55;' : ''}">
            <td>${i + 1}</td>
            <td><strong>${_esc(u.username)}</strong></td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td><span style="font-size:12px;color:var(--text-muted);">${created}</span></td>
            <td><span style="font-size:12px;color:var(--text-muted);">${lastLogin}</span></td>
            <td><span style="font-size:12px;font-weight:700;">${u.login_count || 0}</span></td>
            <td><div class="action-btns">
                <button class="btn-xs btn-view" onclick="editUser(${u.id})" title="ویرایش">✏️</button>
                <button class="btn-xs btn-edit" onclick="openPasswordModal(${u.id},'${u.username}')" title="تغییر رمز">🔑</button>
                ${isMainAdmin ? '<span style="color:var(--text-muted);font-size:11px;">مدیر اصلی</span>' :
                (isActive ?
                    `<button class="btn-xs btn-delete" onclick="toggleUserStatus(${u.id},0)" title="غیرفعال کردن">🚫</button>` :
                    `<button class="btn-xs btn-edit" onclick="toggleUserStatus(${u.id},1)" title="فعال کردن">✅</button>`
                )}
            </div></td>
        </tr>`;
    }).join('');
}

el('searchUser').addEventListener('input', _debounce(function () {
    const q = this.value.trim().toLowerCase();
    if (!q) { renderUsers(_allUsers); return; }
    renderUsers(_allUsers.filter(u => u.username.toLowerCase().includes(q)));
}, 300));

function toggleUserForm() {
    const card = el('user-form-card');
    if (!card.classList.contains('collapsed')) { closeUserForm(); return; }
    _editingUserId = null;
    el('user-form-title').textContent = 'افزودن کاربر';
    el('editUserId').value = '';
    el('newUsername').value = ''; el('newUsername').disabled = false;
    el('newPassword').value = ''; el('newPassword').placeholder = 'حداقل ۴ کاراکتر';
    el('newPassword').closest('.password-wrap').style.display = '';
    el('newRole').value = 'user';
    el('newStatus').value = 'active'; el('newStatus').disabled = false;
    el('pw-label').innerHTML = 'رمز عبور <span class="req">*</span>';
    el('pw-strength').style.display = 'none';
    el('btn-save-user').innerHTML = '💾 ذخیره';
    el('permission-matrix').style.display = 'none';
    card.classList.remove('collapsed');
    _initPermissionMatrix();
}

function _initPermissionMatrix() {
    const container = el('permission-groups');
    if (!container) return;
    const modules = [
        { key: 'dashboard', label: 'داشبورد', perms: ['view'] },
        { key: 'personnel', label: 'مدیریت پرسنل', perms: ['view', 'create', 'edit', 'delete'] },
        { key: 'missions', label: 'صدور ماموریت', perms: ['view', 'create', 'edit', 'delete'] },
        { key: 'reports', label: 'گزارش‌گیری', perms: ['view'] },
        { key: 'backup', label: 'پشتیبان‌گیری', perms: ['view', 'create', 'delete'] },
        { key: 'users', label: 'کاربران سیستم', perms: ['view', 'create', 'edit', 'delete'] },
        { key: 'options', label: 'گزینه‌های سیستم', perms: ['view', 'edit'] },
        { key: 'audit', label: 'لاگ فعالیت‌ها', perms: ['view'] },
        { key: 'ai_chat', label: 'دستیار هوشمند', perms: ['view'] }
    ];
    container.innerHTML = modules.map(m => `
        <div class="permission-group">
            <div class="permission-group-title">${m.label}</div>
            <div class="permission-group-actions">
                ${m.perms.map(a => `
                    <label class="permission-check">
                        <input type="checkbox" data-module="${m.key}" data-action="${a}" value="${m.key}:${a}">
                        <span>${a === 'view' ? 'مشاهده' : a === 'create' ? 'ایجاد' : a === 'edit' ? 'ویرایش' : 'حذف'}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function togglePermissionMatrix() {
    const role = el('newRole').value;
    const matrix = el('permission-matrix');
    if (role === 'custom') {
        matrix.style.display = 'block';
    } else {
        matrix.style.display = 'none';
    }
}

function selectAllPermissions() {
    el('permission-groups').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
}

function deselectAllPermissions() {
    el('permission-groups').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
}

function _getSelectedPermissions() {
    const checked = el('permission-groups').querySelectorAll('input[type=checkbox]:checked');
    return Array.from(checked).map(cb => cb.value);
}
function closeUserForm() { el('user-form-card').classList.add('collapsed'); _editingUserId = null; }

function editUser(id) {
    const u = _allUsers.find(x => x.id === id);
    if (!u) return;
    _editingUserId = id;
    el('user-form-title').textContent = 'ویرایش کاربر — ' + u.username;
    el('editUserId').value = id;
    el('newUsername').value = u.username; el('newUsername').disabled = (id === 1);
    el('newPassword').value = '';
    el('newRole').value = u.role;
    el('newStatus').value = u.status || 'active'; el('newStatus').disabled = (id === 1);
    el('pw-label').innerHTML = 'رمز عبور جدید <span style="font-weight:400;color:var(--text-muted);">(خالی = بدون تغییر)</span>';
    el('newPassword').placeholder = 'خالی بگذارید = بدون تغییر';
    el('btn-save-user').innerHTML = '💾 ذخیره تغییرات';
    el('user-form-card').classList.remove('collapsed');
    
    _initPermissionMatrix();
    const matrix = el('permission-matrix');
    if (u.permissions && u.permissions.length) {
        el('newRole').value = 'custom';
        matrix.style.display = 'block';
        el('permission-groups').querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.checked = u.permissions.includes(cb.value);
        });
    } else {
        el('newRole').value = u.role || 'user';
        matrix.style.display = 'none';
    }
}

async function saveUser() {
    const username = el('newUsername').value.trim();
    const password = el('newPassword').value;
    const role = el('newRole').value;
    const status = el('newStatus').value;
    const useCustomPerms = role === 'custom';
    const permissions = useCustomPerms ? _getSelectedPermissions() : undefined;
    if (!username) { showToast('نام کاربری الزامی است', 'error'); return; }
    if (!_editingUserId && !password) { showToast('رمز عبور الزامی است', 'error'); return; }
    if (username.length < 3) { showToast('نام کاربری باید حداقل ۳ کاراکتر باشد', 'error'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { showToast('نام کاربری فقط شامل حروف، اعداد و زیرخط باشد', 'error'); return; }
    if (password && password.length < 4) { showToast('رمز عبور باید حداقل ۴ کاراکتر باشد', 'error'); return; }
    if (useCustomPerms && !permissions.length) { showToast('حداقل یک دسترسی انتخاب کنید', 'error'); return; }
    try {
        if (_editingUserId) {
            const body = { username, role: useCustomPerms ? 'custom' : role, status };
            if (permissions) body.permissions = permissions;
            await api('/api/users/' + _editingUserId, { method: 'PUT', body: JSON.stringify(body) });
            if (password) await api('/api/users/' + _editingUserId + '/password', { method: 'PUT', body: JSON.stringify({ password }) });
            showToast('کاربر ویرایش شد', 'success');
        } else {
            const body = { username, password, role: useCustomPerms ? 'custom' : role };
            if (permissions) body.permissions = permissions;
            await api('/api/users', { method: 'POST', body: JSON.stringify(body) });
            showToast('کاربر اضافه شد', 'success');
        }
        closeUserForm(); loadUsers();
    } catch (e) { showToast(e.message, 'error'); }
}

async function toggleUserStatus(id, newStatus) {
    const u = _allUsers.find(x => x.id === id);
    if (!u) return;
    const action = newStatus ? 'فعال' : 'غیرفعال';
    if (!await _confirm(`آیا کاربر «${u.username}» ${action} شود؟`)) return;
    try {
        await api('/api/users/' + id, { method: 'PUT', body: JSON.stringify({ status: newStatus ? 'active' : 'disabled' }) });
        showToast(`کاربر ${action} شد`, 'success'); loadUsers();
    } catch (e) { showToast(e.message, 'error'); }
}

function openPasswordModal(id, username) {
    el('pw_user_id').value = id;
    el('passwordModalTitle').textContent = 'تغییر رمز — ' + username;
    el('newPwInput').value = ''; el('confirmPwInput').value = '';
    el('pw-error').style.display = 'none';
    el('modal-pw-strength').style.display = 'none'; el('pw-match').style.display = 'none';
    el('passwordModal').classList.add('open');
    el('newPwInput').focus();
}

function openSelfPasswordModal() {
    el('pw_user_id').value = 'self';
    el('passwordModalTitle').textContent = 'تغییر رمز عبور — ' + currentUsername;
    el('newPwInput').value = ''; el('confirmPwInput').value = '';
    el('pw-error').style.display = 'none';
    el('modal-pw-strength').style.display = 'none'; el('pw-match').style.display = 'none';
    el('passwordModal').classList.add('open');
    el('newPwInput').focus();
}

function closePasswordModal(e) {
    if (!e || e.target === el('passwordModal')) el('passwordModal').classList.remove('open');
}

function toggleModalPw(inputId) { const i = el(inputId); i.type = i.type === 'password' ? 'text' : 'password'; }
function toggleNewUserPass() { const i = el('newPassword'); i.type = i.type === 'password' ? 'text' : 'password'; }

function _calcPwStrength(pw) {
    let score = 0;
    if (pw.length >= 4) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}
function _updatePwStrength(pw, fillId, textId, containerId) {
    const container = el(containerId), fill = el(fillId), text = el(textId);
    if (!container || !fill || !text) return;
    if (!pw) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    const score = _calcPwStrength(pw);
    const levels = [
        { w: '20%', bg: '#ef4444', label: 'ضعیف', color: '#ef4444' },
        { w: '40%', bg: '#f97316', label: 'متوسط', color: '#f97316' },
        { w: '60%', bg: '#eab308', label: 'خوب', color: '#eab308' },
        { w: '80%', bg: '#22c55e', label: 'قوی', color: '#22c55e' },
        { w: '100%', bg: '#16a34a', label: 'بسیار قوی', color: '#16a34a' }
    ];
    const l = levels[Math.min(score, 4)];
    fill.style.width = l.w; fill.style.background = l.bg;
    text.textContent = l.label; text.style.color = l.color;
}

el('newPwInput').addEventListener('input', function () {
    _updatePwStrength(this.value, 'pw-strength-fill', 'pw-strength-text', 'pw-strength');
    _updatePwStrength(this.value, 'modal-pw-strength-fill', 'modal-pw-strength-text', 'modal-pw-strength');
    const cpw = el('confirmPwInput').value;
    const matchEl = el('pw-match');
    if (cpw) {
        matchEl.style.display = 'block';
        if (this.value === cpw) { matchEl.textContent = '✓ رمز مطابقت دارد'; matchEl.className = 'pw-match ok'; }
        else { matchEl.textContent = '✗ رمز مطابقت ندارد'; matchEl.className = 'pw-match fail'; }
    }
});

el('confirmPwInput').addEventListener('input', function () {
    const pw = el('newPwInput').value;
    const matchEl = el('pw-match');
    if (this.value) {
        matchEl.style.display = 'block';
        if (pw === this.value) { matchEl.textContent = '✓ رمز مطابقت دارد'; matchEl.className = 'pw-match ok'; }
        else { matchEl.textContent = '✗ رمز مطابقت ندارد'; matchEl.className = 'pw-match fail'; }
    } else { matchEl.style.display = 'none'; }
});

async function savePassword() {
    const userId = el('pw_user_id').value;
    const pw = el('newPwInput').value;
    const cpw = el('confirmPwInput').value;
    const errEl = el('pw-error'); errEl.style.display = 'none';
    if (!pw) { errEl.textContent = 'رمز عبور جدید را وارد کنید.'; errEl.style.display = 'block'; return; }
    if (pw.length < 4) { errEl.textContent = 'رمز عبور باید حداقل ۴ کاراکتر باشد.'; errEl.style.display = 'block'; return; }
    if (pw !== cpw) { errEl.textContent = 'رمز عبور و تأیید آن مطابقت ندارند.'; errEl.style.display = 'block'; return; }
    try {
        if (userId === 'self') {
            const curPw = prompt('رمز عبور فعلی خود را وارد کنید:');
            if (!curPw) { errEl.textContent = 'رمز عبور فعلی الزامی است.'; errEl.style.display = 'block'; return; }
            await api('/api/users/self/self-password', { method: 'PUT', body: JSON.stringify({ currentPassword: curPw, newPassword: pw }) });
        } else {
            await api('/api/users/' + userId + '/password', { method: 'PUT', body: JSON.stringify({ password: pw }) });
        }
        showToast('رمز عبور تغییر کرد', 'success'); closePasswordModal();
    } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
}

async function deleteUser(id) {
    if (!await _confirm('حذف این کاربر؟')) return;
    try { await api('/api/users/' + id, { method: 'DELETE' }); showToast('کاربر حذف شد'); loadUsers(); } catch (e) { showToast(e.message, 'error'); }
}

// ===== PERSONNEL =====
let _currentPersonnelList = [];

async function loadPersonnel() {
    try {
        allPersonnel = await api('/api/personnel');
        personnelCache = allPersonnel;
        _renderPersonnelTable(allPersonnel);
    } catch (e) { showToast(e.message, 'error'); }
}

function loadPersonnelCache() {
    if (personnelCache.length) return Promise.resolve();
    return api('/api/personnel').then(data => { personnelCache = data; allPersonnel = data; }).catch(e => { console.warn('loadPersonnelCache failed:', e); });
}

function _renderPersonnelTable(list) {
    _currentPersonnelList = Array.isArray(list) ? list : [];
    const tb = el('per-table-body');
    const empty = el('per-empty');
    if (!list || !list.length) { tb.innerHTML = ''; empty.style.display = 'flex'; el('per-pagination') && (el('per-pagination').innerHTML = ''); return; }
    empty.style.display = 'none';
    const pg = _pagState['per'] || { page: 1, size: 20 };
    const start = (pg.page - 1) * pg.size;
    const pageItems = list.slice(start, start + pg.size);
    tb.innerHTML = pageItems.map((p, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td><strong>${_esc(p.name)} ${_esc(p.lname)}</strong></td>
            <td>${_esc(p.national_id) || '—'}</td>
            <td>${_esc(p.emp_num) || '—'}</td>
            <td>${_esc(p.job_title) || '—'}</td>
            <td>${_esc(p.org_post) || '—'}</td>
            <td><span class="badge ${p.status === 'فعال' ? 'badge-green' : 'badge-red'}">${_esc(p.status)}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-xs btn-view" onclick="viewPer(${p.id})">جزئیات</button>
                    <button class="btn-xs btn-edit" onclick="editPer(${p.id})">ویرایش</button>
                    ${hasPerm(currentUserPermissions, 'personnel:delete') ? `<button class="btn-xs btn-delete" onclick="deletePer(${p.id})">حذف</button>` : ''}
                </div>
            </td>
        </tr>`).join('');
    _createPagination('per-pagination', list.length, pg.page, pg.size, (p) => { _pagState['per'] = { page: p, size: pg.size }; _renderPersonnelTable(list); });
}

document.getElementById('searchPer').addEventListener('input', _debounce(function () {
    const q = this.value.trim().toLowerCase();
    if (!q) { _renderPersonnelTable(allPersonnel); return; }
    _renderPersonnelTable(allPersonnel.filter(p =>
        (p.name + ' ' + p.lname).toLowerCase().includes(q) ||
        (p.national_id || '').includes(q) ||
        (p.emp_num || '').includes(q) ||
        (p.job_title || '').toLowerCase().includes(q)
    ));
}, 300));

function togglePerForm() {
    const card = el('per-form-card');
    if (!card.classList.contains('collapsed')) { closePerForm(); return; }
    card.classList.remove('collapsed');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function closePerForm() { clearPerForm(); el('per-form-card').classList.add('collapsed'); el('per-form-error').style.display = 'none'; }

function clearPerForm() {
    el('p_edit_id').value = '';
    ['p_name', 'p_lname', 'p_father', 'p_national_id', 'p_emp_num', 'p_hire_date', 'p_org_post', 'p_job_title', 'p_phone', 'p_address', 'p_notes'].forEach(id => { const e = el(id); if (e) e.value = ''; });
    ['p_emp_type', 'p_last_degree'].forEach(id => { const e = el(id); if (e) e.selectedIndex = 0; });
    el('p_status').value = 'فعال';
    el('savePerBtn').textContent = '💾 ذخیره'; el('savePerBtn').style.background = '';
    el('form-card-title').textContent = 'ثبت پرسنل جدید';
}

async function savePer() {
    const errEl = el('per-form-error'); errEl.style.display = 'none';
    const editId = el('p_edit_id').value;
    const data = {
        name: el('p_name').value.trim(), lname: el('p_lname').value.trim(),
        father_name: el('p_father').value.trim(),
        national_id: el('p_national_id').value.trim() || null,
        emp_num: el('p_emp_num').value.trim() || null,
        hire_date: el('p_hire_date').value.trim(),
        emp_type: el('p_emp_type').value,
        org_post: el('p_org_post').value.trim(),
        job_title: el('p_job_title').value.trim(),
        last_degree: el('p_last_degree').value,
        phone: el('p_phone').value.trim(),
        address: el('p_address').value.trim(),
        status: el('p_status').value,
        notes: el('p_notes').value.trim()
    };
    if (!data.name || !data.lname) { errEl.textContent = 'نام و نام خانوادگی الزامی است.'; errEl.style.display = 'block'; return; }
    try {
        const url = editId ? '/api/personnel/' + editId : '/api/personnel';
        const method = editId ? 'PUT' : 'POST';
        await api(url, { method, body: JSON.stringify(data) });
        showToast(editId ? 'اطلاعات بروزرسانی شد' : 'پرسنل با موفقیت ثبت شد', 'success');
        closePerForm(); loadPersonnel(); loadDashboard();
    } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
}

function viewPer(id) {
    const p = allPersonnel.find(u => u.id === id);
    if (!p) return;
    el('modal-body').innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><label>نام</label><span>${_esc(p.name)}</span></div>
            <div class="detail-item"><label>نام خانوادگی</label><span>${_esc(p.lname)}</span></div>
            <div class="detail-item"><label>نام پدر</label><span>${_esc(p.father_name) || '—'}</span></div>
            <div class="detail-item"><label>کد ملی</label><span>${_esc(p.national_id) || '—'}</span></div>
            <div class="detail-item"><label>شماره پرسنلی</label><span>${_esc(p.emp_num) || '—'}</span></div>
            <div class="detail-item"><label>تاریخ استخدام</label><span>${_esc(p.hire_date) || '—'}</span></div>
            <div class="detail-item"><label>نوع استخدام</label><span>${_esc(p.emp_type) || '—'}</span></div>
            <div class="detail-item"><label>پست سازمانی</label><span>${_esc(p.org_post) || '—'}</span></div>
            <div class="detail-item"><label>عنوان شغل</label><span>${_esc(p.job_title) || '—'}</span></div>
            <div class="detail-item"><label>آخرین مدرک</label><span>${_esc(p.last_degree) || '—'}</span></div>
            <div class="detail-item"><label>شماره تماس</label><span>${_esc(p.phone) || '—'}</span></div>
            <div class="detail-item"><label>وضعیت</label><span class="badge ${p.status === 'فعال' ? 'badge-green' : 'badge-red'}">${_esc(p.status)}</span></div>
            <div class="detail-item detail-full"><label>آدرس</label><span>${_esc(p.address) || '—'}</span></div>
            <div class="detail-item detail-full"><label>توضیحات</label><span>${_esc(p.notes) || '—'}</span></div>
        </div>`;
    el('detailsModal').classList.add('open');
}

function editPer(id) {
    const p = allPersonnel.find(u => u.id === id);
    if (!p) return;
    const card = el('per-form-card'); card.classList.remove('collapsed');
    el('p_edit_id').value = p.id;
    el('p_name').value = p.name; el('p_lname').value = p.lname;
    el('p_father').value = p.father_name || ''; el('p_national_id').value = p.national_id || '';
    el('p_emp_num').value = p.emp_num || ''; el('p_hire_date').value = p.hire_date || '';
    el('p_emp_type').value = p.emp_type || ''; el('p_org_post').value = p.org_post || '';
    el('p_job_title').value = p.job_title || ''; el('p_last_degree').value = p.last_degree || '';
    el('p_phone').value = p.phone || ''; el('p_address').value = p.address || '';
    el('p_status').value = p.status; el('p_notes').value = p.notes || '';
    el('savePerBtn').textContent = '✏️ بروزرسانی'; el('savePerBtn').style.background = '#f59e0b';
    el('form-card-title').textContent = 'ویرایش اطلاعات پرسنل';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deletePer(id) {
    if (!await _confirm('آیا از حذف این پرسنل مطمئن هستید؟')) return;
    try { await api('/api/personnel/' + id, { method: 'DELETE' }); showToast('پرسنل حذف شد'); loadPersonnel(); loadDashboard(); } catch (e) { showToast(e.message, 'error'); }
}

// ===== MISSIONS =====
let _editingMissionId = null;

async function loadMissions() {
    try {
        allMissions = await api('/api/missions');
        _renderMissionsTable(allMissions);
    } catch (e) { showToast(e.message, 'error'); }
}

function _renderMissionsTable(list) {
    const tb = el('missions-table-body');
    if (!list || !list.length) { tb.innerHTML = '<tr><td colspan="7"><div class="empty-state-improved"><div class="empty-icon">📋</div><div class="empty-title">هنوز ماموریتی ثبت نشده</div><div class="empty-desc">روی «ثبت ماموریت جدید» کلیک کنید تا اولین حکم ماموریت را صادر کنید</div></div></td></tr>'; el('missions-pagination') && (el('missions-pagination').innerHTML = ''); return; }
    const pg = _pagState['mis'] || { page: 1, size: 20 };
    const start = (pg.page - 1) * pg.size;
    const pageItems = list.slice(start, start + pg.size);
    tb.innerHTML = pageItems.map((m, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td><strong>${_esc(m.decree_num) || '—'}</strong></td>
            <td>${_esc(m.name)} ${_esc(m.lname) || ''}</td>
            <td>${_esc(m.mission_type) || '—'}</td>
            <td>${_esc(m.location) || '—'}</td>
            <td>${_esc(m.start_date) || '—'}</td>
            <td><div class="action-btns">
                <button class="btn-xs btn-view" onclick="viewMission(${m.id})">جزئیات</button>
                <button class="btn-xs btn-edit" onclick="editMission(${m.id})">ویرایش</button>
                <button class="btn-xs btn-view" onclick="printMission(${m.id})">🖨️</button>
                <button class="btn-xs btn-view" onclick="pdfMission(${m.id})" title="PDF">📄</button>
                ${hasPerm(currentUserPermissions, 'missions:delete') ? `<button class="btn-xs btn-delete" onclick="deleteMission(${m.id})">حذف</button>` : ''}
            </div></td>
        </tr>`).join('');
    _createPagination('missions-pagination', list.length, pg.page, pg.size, (p) => { _pagState['mis'] = { page: p, size: pg.size }; _renderMissionsTable(list); });
}

document.getElementById('searchMission').addEventListener('input', _debounce(function () {
    const q = this.value.trim().toLowerCase();
    if (!q) { _renderMissionsTable(allMissions); return; }
    _renderMissionsTable(allMissions.filter(m =>
        (m.decree_num || '').toLowerCase().includes(q) ||
        (m.name + ' ' + (m.lname || '')).toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q)
    ));
}, 300));

function toggleMissionForm() {
    const card = el('mission-form-card');
    if (!card.classList.contains('collapsed')) { closeMissionForm(); return; }
    _editingMissionId = null;
    el('mission-form-title').textContent = 'صدور حکم ماموریت';
    _clearMissionForm();
    el('m_decree').value = 'خودکار';
    card.classList.remove('collapsed');
    loadPersonnelCache().then(() => initMissionNameAutocomplete());
    initDatePicker('m_start'); initDatePicker('m_end'); initDatePicker('m_issue');
    el('saveMissionBtn').textContent = '💾 ذخیره حکم ماموریت';
}

function closeMissionForm() { el('mission-form-card').classList.add('collapsed'); _editingMissionId = null; const ac = el('m_name_ac'); if (ac) ac.style.display = 'none'; }

function _clearMissionForm() {
    ['m_decree', 'm_name', 'm_lname', 'm_emp_num', 'm_job_title', 'm_location', 'm_subject', 'm_serial', 'm_duration', 'm_overtime', 'm_start', 'm_end', 'm_issue'].forEach(id => { const e = el(id); if (e) e.value = ''; });
    ['m_type', 'm_device', 'm_repair', 'm_region'].forEach(id => { const e = el(id); if (e) e.selectedIndex = 0; });
    ['m_ch_single', 'm_ch_group', 'm_ch_supplied', 'm_ch_unsupplied', 'm_ch_issued', 'm_ch_extended', 'm_ch_gov', 'm_ch_plane', 'm_ch_train', 'm_ch_agency', 'm_ch_bus', 'm_ch_personal'].forEach(id => { const e = el(id); if (e) e.checked = false; });
    el('mission-form-error').style.display = 'none';
}

function initMissionNameAutocomplete() {
    const input = el('m_name');
    if (!input) return;
    let acList = document.getElementById('m_name_ac');
    if (!acList) {
        acList = document.createElement('div');
        acList.id = 'm_name_ac';
        acList.style.cssText = 'position:fixed;background:#fff;border:1.5px solid var(--border);border-radius:8px;max-height:260px;overflow-y:auto;display:none;z-index:9999;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.12);';
        document.body.appendChild(acList);
        _activeAc.list = acList; _activeAc.input = input;
        _setupAcScrollFix();
    }
    const positionAc = function() {
        const rect = input.getBoundingClientRect();
        acList.style.top = (rect.bottom + 4) + 'px';
        acList.style.left = rect.left + 'px';
        acList.style.width = rect.width + 'px';
    };
    input.oninput = _debounce(function () {
        const q = this.value.trim().toLowerCase();
        if (!q || q.length < 1) { acList.style.display = 'none'; return; }
        let matches = personnelCache.length ? searchPersonnel(q) : [];
        const renderFallback = function(ms) {
            if (!ms.length) { acList.style.display = 'none'; return; }
            acList.innerHTML = ms.map(p => `<div class="ac-item" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f5;" data-id="${p.id}"><strong>${_esc(p.name)} ${_esc(p.lname)}</strong><span style="color:#94a3b8;font-size:11px;margin-right:8px;">${_esc(p.emp_num) || ''} — ${_esc(p.job_title) || ''}${p.national_id ? ' — کد:' + _esc(p.national_id) : ''}</span></div>`).join('');
            positionAc();
            acList.style.display = 'block';
            acList._selectedIndex = -1;
            acList._matches = ms;
            acList.querySelectorAll('.ac-item').forEach((item, idx) => {
                item.onmouseenter = function () { acList._selectedIndex = idx; _highlightAcItem(acList); };
                item.onclick = function () { selectAutocompletePerson(acList, parseInt(this.dataset.id), input, el('m_lname'), el('m_emp_num'), el('m_job_title')); };
            });
        };
        if (matches.length) { renderFallback(matches); return; }
        if (q.length >= 2) {
            acList.innerHTML = '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">در حال جستجو...</div>';
            positionAc();
            acList.style.display = 'block';
            importPersonnelAndSearch(q).then(ms => renderFallback(ms)).catch(() => { acList.style.display = 'none'; });
            return;
        }
        acList.style.display = 'none';
    }, 150);
    input.onkeydown = function (e) {
        const ac = el('m_name_ac');
        if (!ac || ac.style.display === 'none') return;
        if (e.key === 'ArrowDown') { e.preventDefault(); ac._selectedIndex = Math.min(ac._selectedIndex + 1, (ac._matches || []).length - 1); _highlightAcItem(ac); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); ac._selectedIndex = Math.max(ac._selectedIndex - 1, 0); _highlightAcItem(ac); }
        else if (e.key === 'Enter') { e.preventDefault(); if (ac._selectedIndex >= 0 && ac._matches && ac._matches[ac._selectedIndex]) { const p = ac._matches[ac._selectedIndex]; selectAutocompletePerson(ac, p.id, input, el('m_lname'), el('m_emp_num'), el('m_job_title')); } }
        else if (e.key === 'Escape') { ac.style.display = 'none'; }
    };
    input.onblur = _debounce(function () { acList.style.display = 'none'; }, 250);
}

function _initReportsPersonnelAutocomplete() {
    const input = el('r_name');
    if (!input) return;
    let acList = document.getElementById('r_name_ac');
    if (!acList) {
        acList = document.createElement('div');
        acList.id = 'r_name_ac';
        acList.style.cssText = 'position:fixed;background:#fff;border:1.5px solid var(--border);border-radius:8px;max-height:200px;overflow-y:auto;display:none;z-index:9999;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.12);';
        document.body.appendChild(acList);
        _activeAc.list = acList; _activeAc.input = input;
        _setupAcScrollFix();
    }
    const show = function () {
        const q = input.value.trim().toLowerCase();
        if (!q || q.length < 1) { acList.style.display = 'none'; return; }
        const matches = personnelCache.length ? searchPersonnel(q) : [];
        const renderFallback = function(ms) {
            if (!ms.length) { acList.style.display = 'none'; return; }
            acList.innerHTML = ms.map(p => `<div class="ac-item" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f5;" data-id="${p.id}"><strong>${_esc(p.name)} ${_esc(p.lname)}</strong><span style="color:#94a3b8;font-size:11px;margin-right:8px;">${_esc(p.emp_num || '')} — ${_esc(p.job_title || '')}</span></div>`).join('');
            const rect = input.getBoundingClientRect();
            acList.style.top = (rect.bottom + 4) + 'px';
            acList.style.left = rect.left + 'px';
            acList.style.width = rect.width + 'px';
            acList.style.display = 'block';
            acList.querySelectorAll('.ac-item').forEach((item, idx) => {
                item.onmouseenter = function () { this.style.background = '#f8fafc'; };
                item.onmouseleave = function () { this.style.background = ''; };
                item.onclick = function () {
                    const pid = parseInt(this.dataset.id);
                    const p = personnelCache.find(x => x.id === pid);
                    if (p) {
                        input.value = p.name;
                        const lnameEl = el('r_lname'); if (lnameEl) lnameEl.value = p.lname || '';
                        const empEl = el('r_emp_num'); if (empEl) empEl.value = p.emp_num || '';
                    }
                    acList.style.display = 'none';
                };
            });
        };
        if (matches.length) { renderFallback(matches); return; }
        if (q.length >= 2) {
            acList.innerHTML = '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">در حال جستجو...</div>';
            const rect = input.getBoundingClientRect();
            acList.style.top = (rect.bottom + 4) + 'px';
            acList.style.left = rect.left + 'px';
            acList.style.width = rect.width + 'px';
            acList.style.display = 'block';
            importPersonnelAndSearch(q).then(ms => renderFallback(ms)).catch(() => { acList.style.display = 'none'; });
            return;
        }
        acList.style.display = 'none';
    };
    input.oninput = _debounce(show, 200);
    input.onblur = _debounce(function () { acList.style.display = 'none'; }, 250);
}

async function saveAdvancedMission() {
    const errEl = el('mission-form-error'); errEl.style.display = 'none';
    const data = {
        name: el('m_name').value.trim(),
        lname: el('m_lname').value.trim(),
        emp_num: el('m_emp_num').value.trim(),
        job_title: el('m_job_title').value.trim(),
        mission_type: el('m_type').value,
        device_type: el('m_device').value,
        repair_type: el('m_repair').value,
        region: el('m_region').value,
        location: el('m_location').value.trim(),
        subject: el('m_subject').value.trim(),
        device_serial: el('m_serial').value.trim(),
        duration: el('m_duration').value.trim(),
        overtime_hours: el('m_overtime').value.trim(),
        start_date: el('m_start').value.trim(),
        end_date: el('m_end').value.trim(),
        issue_date: el('m_issue').value.trim(),
        is_single: el('m_ch_single').checked ? 1 : 0,
        is_group: el('m_ch_group').checked ? 1 : 0,
        is_supplied: el('m_ch_supplied').checked ? 1 : 0,
        is_unsupplied: el('m_ch_unsupplied').checked ? 1 : 0,
        is_issued: el('m_ch_issued').checked ? 1 : 0,
        is_extended: el('m_ch_extended').checked ? 1 : 0,
        is_gov: el('m_ch_gov').checked ? 1 : 0,
        is_plane: el('m_ch_plane').checked ? 1 : 0,
        is_train: el('m_ch_train').checked ? 1 : 0,
        is_agency: el('m_ch_agency').checked ? 1 : 0,
        is_bus: el('m_ch_bus').checked ? 1 : 0,
        is_personal: el('m_ch_personal').checked ? 1 : 0,
    };
    if (!data.name) { errEl.textContent = 'نام الزامی است.'; errEl.style.display = 'block'; return; }
    if (!data.start_date) { errEl.textContent = 'تاریخ شروع الزامی است.'; errEl.style.display = 'block'; return; }
    if (!data.end_date) { errEl.textContent = 'تاریخ پایان الزامی است.'; errEl.style.display = 'block'; return; }
    if (!data.issue_date) { errEl.textContent = 'تاریخ صدور الزامی است.'; errEl.style.display = 'block'; return; }
    try {
        if (_editingMissionId) {
            await api('/api/missions/' + _editingMissionId, { method: 'PUT', body: JSON.stringify(data) });
            showToast('ماموریت بروزرسانی شد', 'success');
        } else {
            await api('/api/missions', { method: 'POST', body: JSON.stringify(data) });
            showToast('ماموریت ثبت شد', 'success');
            sendBrowserNotification('📋 ماموریت جدید', `${data.name} ${data.lname || ''} — ${data.location || ''}`, null);
        }
        closeMissionForm(); loadMissions(); loadDashboard();
    } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
}

function editMission(id) {
    const m = allMissions.find(x => x.id === id);
    if (!m) return;
    _editingMissionId = id;
    el('mission-form-title').textContent = 'ویرایش حکم ماموریت — ' + (m.decree_num || '');
    el('m_decree').value = m.decree_num || '';
    el('m_name').value = m.name || ''; el('m_lname').value = m.lname || '';
    el('m_emp_num').value = m.emp_num || ''; el('m_job_title').value = m.job_title || '';
    el('m_type').value = m.mission_type || ''; el('m_device').value = m.device_type || '';
    el('m_repair').value = m.repair_type || ''; el('m_region').value = m.region || '';
    el('m_location').value = m.location || ''; el('m_subject').value = m.subject || '';
    el('m_serial').value = m.device_serial || '';
    el('m_duration').value = m.duration || ''; el('m_overtime').value = m.overtime_hours || '';
    el('m_start').value = m.start_date || ''; el('m_end').value = m.end_date || '';
    el('m_issue').value = m.issue_date || '';
    el('m_ch_single').checked = !!m.is_single; el('m_ch_group').checked = !!m.is_group;
    el('m_ch_supplied').checked = !!m.is_supplied; el('m_ch_unsupplied').checked = !!m.is_unsupplied;
    el('m_ch_issued').checked = !!m.is_issued; el('m_ch_extended').checked = !!m.is_extended;
    el('m_ch_gov').checked = !!m.is_gov; el('m_ch_plane').checked = !!m.is_plane;
    el('m_ch_train').checked = !!m.is_train; el('m_ch_agency').checked = !!m.is_agency;
    el('m_ch_bus').checked = !!m.is_bus; el('m_ch_personal').checked = !!m.is_personal;
    el('saveMissionBtn').textContent = '✏️ بروزرسانی حکم';
    el('mission-form-card').classList.remove('collapsed');
    loadPersonnelCache().then(() => initMissionNameAutocomplete());
    initDatePicker('m_start'); initDatePicker('m_end'); initDatePicker('m_issue');
}

function viewMission(id) {
    const m = allMissions.find(x => x.id === id);
    if (!m) return;
    const flags = [];
    if (m.is_single) flags.push('انفرادی');
    if (m.is_group) flags.push('گروهی');
    if (m.is_supplied) flags.push('تامین شده');
    if (m.is_unsupplied) flags.push('تامین نشده');
    if (m.is_issued) flags.push('صدور');
    if (m.is_extended) flags.push('تمدید');
    if (m.is_gov) flags.push('دولتی');
    const transport = [];
    if (m.is_plane) transport.push('هواپیما');
    if (m.is_train) transport.push('قطار');
    if (m.is_agency) transport.push('آژانس');
    if (m.is_bus) transport.push('اتوبوس');
    if (m.is_personal) transport.push('شخصی');
    el('modal-body').innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><label>شماره حکم</label><span>${_esc(m.decree_num) || '—'}</span></div>
            <div class="detail-item"><label>نام</label><span>${_esc(m.name)} ${_esc(m.lname) || ''}</span></div>
            <div class="detail-item"><label>شماره پرسنلی</label><span>${_esc(m.emp_num) || '—'}</span></div>
            <div class="detail-item"><label>عنوان شغل</label><span>${_esc(m.job_title) || '—'}</span></div>
            <div class="detail-item"><label>نوع ماموریت</label><span>${_esc(m.mission_type) || '—'}</span></div>
            <div class="detail-item"><label>نوع دستگاه</label><span>${_esc(m.device_type) || '—'}</span></div>
            <div class="detail-item"><label>ناحیه</label><span>${_esc(m.region) || '—'}</span></div>
            <div class="detail-item"><label>محل ماموریت</label><span>${_esc(m.location) || '—'}</span></div>
            <div class="detail-item"><label>موضوع</label><span>${_esc(m.subject) || '—'}</span></div>
            <div class="detail-item"><label>سریال دستگاه</label><span>${_esc(m.device_serial) || '—'}</span></div>
            <div class="detail-item"><label>مدت</label><span>${_esc(m.duration) || '—'}</span></div>
            <div class="detail-item"><label>اضافکاری</label><span>${_esc(m.overtime_hours) || '—'}</span></div>
            <div class="detail-item"><label>تاریخ شروع</label><span>${_esc(m.start_date) || '—'}</span></div>
            <div class="detail-item"><label>تاریخ پایان</label><span>${_esc(m.end_date) || '—'}</span></div>
            <div class="detail-item"><label>تاریخ صدور</label><span>${_esc(m.issue_date) || '—'}</span></div>
            <div class="detail-item detail-full"><label>وضعیت</label><span>${flags.join('، ') || '—'}</span></div>
            <div class="detail-item detail-full"><label>وسیله نقلیه</label><span>${transport.join('، ') || '—'}</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-start;">
            <button class="btn btn-view" onclick="printMission(${m.id})">🖨️ چاپ حکم</button>
            <button class="btn btn-view" onclick="pdfMission(${m.id})">📄 خروجی PDF</button>
        </div>`;
    el('detailsModal').classList.add('open');
}

async function deleteMission(id) {
    if (!await _confirm('حذف این ماموریت؟')) return;
    try { await api('/api/missions/' + id, { method: 'DELETE' }); showToast('ماموریت حذف شد'); loadMissions(); loadDashboard(); } catch (e) { showToast(e.message, 'error'); }
}

function printMission(id) {
    const m = allMissions.find(x => x.id === id);
    if (!m) return;
    const chk = v => v ? '☑' : '☐';
    const calcDays = (s, e) => {
        try {
            const sp = s.split('/').map(Number), ep = e.split('/').map(Number);
            const sg = toGregorian(sp[0], sp[1], sp[2]), eg = toGregorian(ep[0], ep[1], ep[2]);
            const d1 = new Date(sg.gy, sg.gm - 1, sg.gd), d2 = new Date(eg.gy, eg.gm - 1, eg.gd);
            return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
        } catch { return m.duration || '—'; }
    };
    const days = m.duration || calcDays(m.start_date || '', m.end_date || '');
    fetch(window.location.origin + '/logo.png').then(r => r.ok ? r.blob() : null).then(blob => {
        return new Promise(resolve => {
            if (!blob) return resolve('');
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }).catch(() => '').then(logoDataUrl => {
    const html = _missionDecreeHTML(m, days, chk, logoDataUrl, { forPrint: true });
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { showToast('لطفاً popup را در مرورگر مجاز کنید', 'error'); return; }
    win.document.write(html);
    win.document.close();
    });
}

// ===== AUDIT LOG =====
async function loadAuditLog() {
    const entity = el('audit-filter-entity') ? el('audit-filter-entity').value : '';
    const search = el('audit-search') ? el('audit-search').value.trim() : '';
    try {
        let url = '/api/audit?limit=200';
        if (entity) url += '&entity=' + encodeURIComponent(entity);
        const resp = await api(url);
        let rows = (resp && resp.results) || resp || [];
        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(r => (r.username || '').toLowerCase().includes(q) || (r.action || '').toLowerCase().includes(q) || (r.detail || '').toLowerCase().includes(q));
        }
        const body = el('audit-table-body');
        if (!body) return;
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">هیچ رکوردی یافت نشد</td></tr>';
            return;
        }
        body.innerHTML = rows.map(r => {
            const dt = r.created_at ? new Date(r.created_at).toLocaleString('fa-IR') : '—';
            const actionLabel = { INSERT: '➕ ایجاد', UPDATE: '✏️ ویرایش', DELETE: '🗑️ حذف' }[r.action] || r.action;
            return `<tr>
                <td>${_esc(dt)}</td>
                <td>${_esc(r.username) || '—'}</td>
                <td>${actionLabel}</td>
                <td>${_esc(r.entity) || '—'}</td>
                <td style="max-width:300px;word-break:break-word;">${_esc(r.detail) || '—'}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('loadAuditLog error:', e);
    }
}

// ===== فرم حکم ماموریت — محتوای مشترک (body) =====
function _missionDecreeBodyHTML(m, days, chk, logoDataUrl) {
    return `<style>
*{margin:0;padding:0;box-sizing:border-box;}
.hokm-wrap{font-family:'Vazirmatn',Tahoma,sans-serif;font-size:10pt;direction:rtl;color:#000;width:190mm;height:281mm;background:#fff;padding:0;display:flex;flex-direction:column;}
.hokm-wrap table{width:100%;border-collapse:collapse;table-layout:fixed;}
.hokm-wrap td,.hokm-wrap th{border:1px solid #000;padding:4px 6px;vertical-align:middle;font-size:9.5pt;word-wrap:break-word;overflow-wrap:break-word;}
.hokm-wrap .lc{font-weight:bold;white-space:nowrap;}
.hokm-wrap .sh{font-weight:bold;font-size:9.5pt;padding:4px 6px;background:#f0f0f0;}
.hokm-wrap .sd{padding:5px 8px;font-size:9pt;line-height:1.6;}
.hokm-wrap .ck{display:inline-flex;align-items:center;gap:3px;font-size:9.5pt;margin-left:10px;}
.hokm-wrap .sgr{display:grid;grid-template-columns:1fr 1fr;gap:4px;}
.hokm-wrap .sbox{border:1px solid #000;padding:6px 10px;min-height:60px;}
.hokm-wrap .stit{font-size:9pt;font-weight:bold;border-bottom:1px solid #888;margin-bottom:4px;padding-bottom:2px;}
.hokm-wrap .sln{border-top:1px dashed #aaa;margin-top:20px;font-size:8pt;color:#555;text-align:center;}
.hokm-wrap .sec{border:1px solid #000;margin:3px 0;}
.hokm-wrap .ft{display:flex;justify-content:space-between;font-size:9pt;border-top:2px solid #000;padding-top:4px;margin-top:auto;}
</style>
<div class="hokm-wrap">

<table style="margin-bottom:3px;border:none;">
<tr style="border:none;">
  <td style="border:none;width:70px;padding:0;">
    ${logoDataUrl ? `<img src="${logoDataUrl}" style="height:55px;max-width:70px;object-fit:contain;" onerror="this.style.display='none'">` : '<div style="width:70px;height:55px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#999;">RSTC</div>'}
  </td>
  <td style="border:none;text-align:center;vertical-align:middle;">
    <div style="font-size:18pt;font-weight:bold;">حکم ماموریت اداری</div>
  </td>
  <td style="border:1px solid #000;width:120px;padding:5px 8px;font-size:9pt;text-align:right;vertical-align:top;">
    <div>شماره: <strong>${_esc(m.decree_num) || '........'}</strong></div>
    <div style="margin-top:3px;">تاریخ: <strong>${_esc(m.issue_date) || '........'}</strong></div>
    <div style="margin-top:3px;">نسخه: مالی</div>
  </td>
</tr>
</table>

<table>
<tr>
  <td class="lc" style="width:24%;">۱- نام و نام‌خانوادگی مامور</td>
  <td style="width:26%;"><strong>${_esc(m.name) || '........'} ${_esc(m.lname) || ''}</strong></td>
  <td class="lc" style="width:20%;">۲- عنوان شغل</td>
  <td style="width:30%;">${_esc(m.job_title) || '........'}</td>
</tr>
<tr>
  <td class="lc">۳- عنوان مأموریت:</td>
  <td colspan="3" style="padding:4px 8px;">
    <span class="ck">${chk(m.is_single)} انفرادی</span>
    <span class="ck">${chk(m.is_group)} گروهی</span>
    <span class="ck">${chk(m.is_supplied)} تامین شده</span>
    <span class="ck">${chk(m.is_issued)} صدور</span>
    <span class="ck">${chk(m.is_extended)} تمدید</span>
  </td>
</tr>
<tr>
  <td class="lc">۴- توضیحات:</td>
  <td colspan="3" style="min-height:22px;">${_esc(m.subject) || ''}</td>
</tr>
<tr>
  <td class="lc">۵- واحد درخواست کننده:</td>
  <td>مدیریت ماشین‌آلات</td>
  <td class="lc">۶- مدت مأموریت:</td>
  <td><strong>${days}</strong> روز &nbsp; از: <strong>${_esc(m.start_date) || '........'}</strong> &nbsp; تا: <strong>${_esc(m.end_date) || '........'}</strong></td>
</tr>
<tr>
  <td class="lc">۷- محل مأموریت:</td>
  <td colspan="3">${_esc(m.location) || '........'}${m.region ? ' — ناحیه ' + _esc(m.region) : ''}</td>
</tr>
</table>

<div class="sec">
  <div class="sh">۸- موضوع مأموریت:</div>
  <div class="sd" style="min-height:30px;">
    ${m.device_type ? '<strong>نوع دستگاه:</strong> ' + _esc(m.device_type) + '&nbsp;&nbsp;' : ''}
    ${m.device_serial ? '<strong>سریال:</strong> ' + _esc(m.device_serial) + '&nbsp;&nbsp;' : ''}
    ${m.repair_type ? '<strong>نوع تعمیر:</strong> ' + _esc(m.repair_type) : ''}
    ${(m.device_type || m.device_serial || m.repair_type) && m.subject ? '<br>' : ''}
    ${m.subject ? _esc(m.subject) : ''}
  </div>
</div>

<table>
<tr>
  <td class="lc" style="width:24%;">۹- نحوه عزیمت:</td>
  <td colspan="3" style="padding:5px 10px;">
    <span class="ck">${chk(m.is_plane)} هواپیما</span>
    <span class="ck">${chk(m.is_train)} قطار</span>
    <span class="ck">${chk(m.is_bus)} اتوبوس</span>
    <span class="ck">${chk(m.is_gov)} خودرودولتی</span>
    <span class="ck">${chk(m.is_agency)} آژانس</span>
    <span class="ck">${chk(m.is_personal)} وسیله شخصی</span>
  </td>
</tr>
</table>

<div class="sec" style="padding:5px 10px;font-size:9.5pt;line-height:1.6;margin:3px 0;">
  ۱۰- بدینوسیله به شما مأموریت داده می‌شود به منظور انجام وظیفه به شرح بند ۸ حکم صادره در زمان تعیین شده اقدام و پس از انجام مأموریت موارد را گزارش نمایید.
</div>

<div class="sgr" style="margin:3px 0;">
  <div class="sbox">
    <div class="stit">نام و نام‌خانوادگی مدیر واحد مربوطه</div>
    <div style="font-size:9.5pt;">غلامرضا فضلی</div>
    <div class="sln">امضاء</div>
  </div>
  <div class="sbox">
    <div class="stit">نام و نام‌خانوادگی مدیر عامل</div>
    <div style="font-size:9.5pt;">مصطفی معینی</div>
    <div class="sln">امضاء</div>
  </div>
</div>

<div class="sec" style="margin:3px 0;">
  <div class="sh">۱۱- گزارش مأموریت:</div>
  <div class="sd" style="min-height:45px;"></div>
</div>

<div class="sec" style="margin:3px 0;">
  <div class="sh">۱۲- گزارش هزینه انجام شده در مأموریت:</div>
  <div class="sd" style="font-size:8.5pt;line-height:1.7;min-height:55px;">
    اینجانب در اجرای این حکم ساعت ......... مورخ ........... به محل مأموریت حرکت و در ساعت ......... مورخ ........... پس از اتمام مأموریت مراجعت نموده که در این ایام تعداد ......... وعده صبحانه و ......... وعده ناهار و ......... وعده شام جمعاً به مبلغ ......... ریال بر اساس ......... برگ فاکتور پیوستی مبلغ ......... ریال هزینه هتل و ......... ریال هزینه ایاب و ذهاب طبق بلیط پیوست جمعاً معادل مبلغ ......... ریال هزینه انجام یافته است.
    <div style="margin-top:8px;display:flex;justify-content:space-between;">
      <span>نام و نام‌خانوادگی: ${_esc(m.name) || ''} ${_esc(m.lname) || ''}</span>
      <span>امضاء: ........................</span>
    </div>
  </div>
</div>

<div class="sec" style="margin:3px 0;">
  <div class="sh">۱۳- تأیید محل انجام مأموریت:</div>
  <div class="sd" style="font-size:9pt;min-height:45px;">
    <div>۱- نامبرده در تاریخ ........... ساعت ........... وارد کارگاه/منطقه/کارخانجات/ ........... گردید.</div>
    <div style="margin-top:4px;">۲- نامبرده در تاریخ ........... ساعت ........... از کارگاه/منطقه/کارخانجات/ ........... خارج گردید.</div>
    <div style="margin-top:10px;">مدیر منطقه/کارخانجات/سرپرست کارگاه: ........................</div>
  </div>
</div>

<div class="sgr" style="margin:3px 0;">
  <div style="border:1px solid #000;">
    <div class="sh">۱۴- مدیریت امور مالی:</div>
    <div class="sd" style="font-size:9pt;min-height:45px;">
      لطفاً نسبت به پرداخت اقدام نمایید.
      <div style="margin-top:4px;">نام و نام‌خانوادگی: ........................</div>
      <div>معاون مالی و پشتیبانی</div>
      <div class="sln">امضاء</div>
    </div>
  </div>
  <div style="border:1px solid #000;">
    <div class="sh">۱۵- اداره دریافت و پرداخت:</div>
    <div class="sd" style="font-size:9pt;min-height:45px;">
      جهت بررسی و اقدام لازم
      <div style="margin-top:4px;">نام و نام‌خانوادگی: شهرام حسن سلطانی</div>
      <div>مدیر امور مالی</div>
      <div class="sln">امضاء</div>
    </div>
  </div>
</div>

<div class="ft">
  <span>شماره/${_esc(m.decree_num) || '........'}RSTC-${_esc(m.issue_date ? m.issue_date.replace(/\//g,'') : '')}</span>
  <span style="font-weight:bold;">نسخه‌مالی</span>
  <span>تاریخ: ${_esc(m.issue_date) || '...........'}</span>
</div>

</div>`;
}

// ===== تولید HTML کامل برای چاپ (printMission) =====
function _missionDecreeHTML(m, days, chk, logoDataUrl, opts) {
    opts = opts || {};
    const printScript = opts.forPrint
        ? `<script>
            document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 400);
            });
           <\/script>`
        : '';
    return `<!DOCTYPE html><html lang="fa" dir="rtl"><head>
<meta charset="UTF-8">
<title>حکم ماموریت — ${_esc(m.decree_num) || ''}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>
@page { size: A4; margin: 8mm 10mm; }
body { margin: 0; padding: 0; background: #fff; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* ✅ FIX: قبلاً height:auto این باکس ست می‌شد و باعث می‌شد محتوا کل صفحه A4 را پر نکند
     و فضای خالی در پایین صفحه چاپ باقی بماند. حالا ارتفاع دقیقاً برابر فضای قابل چاپ
     (297mm صفحه منهای 2×8mm مارجین بالا/پایین در @page) نگه داشته می‌شود تا فوتر به ته صفحه بچسبد. */
  .hokm-wrap { width:190mm !important; height:281mm !important; }
}
</style>
</head><body>
<div style="width:190mm;margin:0 auto;">
${_missionDecreeBodyHTML(m, days, chk, logoDataUrl)}
</div>
${printScript}</body></html>`;
}

// ===== تولید PDF (با html2canvas + jsPDF - همان قالب پرینت) =====
async function pdfMission(id) {
    try {
        const m = allMissions.find(x => x.id === id);
        if (!m) {
            showToast('ماموریت یافت نشد', 'error');
            return;
        }
        if (!window.jspdf) {
            showToast('کتابخانه PDF (jsPDF) در مروربر بارگذاری نشده است', 'error');
            return;
        }
        if (!window.html2canvas) {
            showToast('کتابخانه html2canvas در مروربر بارگذاری نشده است', 'error');
            return;
        }
        showToast('در حال تولید PDF...', 'info');

        const calcDays = (s, e) => {
            try {
                const sp = s.split('/').map(Number), ep = e.split('/').map(Number);
                const sg = toGregorian(sp[0], sp[1], sp[2]), eg = toGregorian(ep[0], ep[1], ep[2]);
                const d1 = new Date(sg.gy, sg.gm - 1, sg.gd), d2 = new Date(eg.gy, eg.gm - 1, eg.gd);
                return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
            } catch { return m.duration || '—'; }
        };

        const days = m.duration || calcDays(m.start_date || '', m.end_date || '');
        const chk = v => v ? '☑' : '☐';

        // Fetch logo as data URL
        const logoDataUrl = await fetch(window.location.origin + '/logo.png')
            .then(r => r.ok ? r.blob() : null)
            .then(blob => blob ? new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }) : '')
            .catch(() => '');

        // Build the exact same HTML as print version
        const html = _missionDecreeHTML(m, days, chk, logoDataUrl, { forPrint: false });

        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;z-index:-1;';
        document.body.appendChild(iframe);

        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();

            // Wait for fonts and images to load
            await new Promise(resolve => {
                const checkReady = () => {
                    if (doc.fonts) {
                        doc.fonts.ready.then(resolve);
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });

            // Additional wait for images
            await new Promise(r => setTimeout(r, 500));

            // Capture with html2canvas
            const canvas = await html2canvas(doc.body, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: doc.body.scrollWidth,
                height: doc.body.scrollHeight,
                windowWidth: doc.body.scrollWidth,
                windowHeight: doc.body.scrollHeight,
                onclone: (clonedDoc) => {
                    // Ensure font is loaded in cloned doc
                    const link = clonedDoc.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css';
                    clonedDoc.head.appendChild(link);
                }
            });

            document.body.removeChild(iframe);

            // Create PDF from canvas
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
            const imgWidth = canvasWidth * ratio;
            const imgHeight = canvasHeight * ratio;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('Hokm_' + (m.decree_num || m.id) + '.pdf');
            showToast('PDF با موفقیت دانلود شد', 'success');
        } catch (err) {
            document.body.removeChild(iframe);
            throw err;
        }
    } catch (e) {
        console.error('pdfMission error:', e);
        showToast('خطا در تولید PDF: ' + e.message, 'error');
    }
}

// ===== REPORTS =====
let _reportResults = [];
let _reportSort = { col: null, asc: true };

function runReport() {
    const filters = {};
    const v = (id) => el(id) ? el(id).value.trim() : '';
    if (v('r_name')) filters.name = v('r_name');
    if (v('r_lname')) filters.lname = v('r_lname');
    if (v('r_emp_num')) filters.emp_num = v('r_emp_num');
    if (v('r_decree')) filters.decree_num = v('r_decree');
    if (v('r_mission_type')) filters.mission_type = v('r_mission_type');
    if (v('r_region')) filters.region = v('r_region');
    if (v('r_location')) filters.location = v('r_location');
    if (v('r_device')) filters.device_type = v('r_device');
    if (v('r_serial')) filters.device_serial = v('r_serial');
    if (v('r_start_from')) filters.start_date_from = v('r_start_from');
    if (v('r_start_to')) filters.start_date_to = v('r_start_to');
    if (v('r_end_from')) filters.end_date_from = v('r_end_from');
    if (v('r_end_to')) filters.end_date_to = v('r_end_to');
    _updateChips(filters);
    _saveFiltersToURL(filters);
    el('report-loading').style.display = 'flex';
    el('report-result-card').style.display = 'none';
    el('report-search-btn').disabled = true;
    api('/api/reports/missions', { method: 'POST', body: JSON.stringify(filters) })
        .then(data => {
            _reportResults = data.results || [];
            _reportSort = { col: null, asc: true };
            el('report-count').textContent = _toPersianNum(_reportResults.length) + ' نتیجه';
            el('report-loading').style.display = 'none';
            el('report-search-btn').disabled = false;
            _updateReportSummary(_reportResults);
            if (_reportResults.length) {
                el('report-result-card').style.display = 'block';
                _renderReportTable(_reportResults);
            } else {
                el('report-result-card').style.display = 'block';
                el('report-table-body').innerHTML = '<tr><td colspan="11"><div class="no-results"><div class="no-results-icon">📭</div><div class="no-results-text">نتیجه‌ای یافت نشد</div><div class="no-results-hint">فیلترهای جستجو را تغییر دهید</div></div></td></tr>';
                el('report-table-foot').style.display = 'none';
            }
        })
        .catch(e => {
            el('report-loading').style.display = 'none';
            el('report-search-btn').disabled = false;
            showToast(e.message, 'error');
        });
}

function _updateReportSummary(list) {
    const summary = el('report-summary');
    if (!summary) return;
    if (!list.length) { summary.style.display = 'none'; return; }
    const regions = {};
    const types = {};
    const devices = {};
    let totalDays = 0;
    list.forEach(m => {
        if (m.region) regions[m.region] = (regions[m.region] || 0) + 1;
        if (m.mission_type) types[m.mission_type] = (types[m.mission_type] || 0) + 1;
        if (m.device_type) devices[m.device_type] = (devices[m.device_type] || 0) + 1;
        if (m.duration) { const n = parseInt(m.duration); if (!isNaN(n)) totalDays += n; }
    });
    const topRegion = Object.entries(regions).sort((a, b) => b[1] - a[1])[0];
    const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
    const topDevice = Object.entries(devices).sort((a, b) => b[1] - a[1])[0];
    summary.style.display = 'grid';
    summary.innerHTML = `
        <div class="summary-card">
            <div class="summary-card-icon teal">📊</div>
            <div class="summary-card-body"><div class="summary-card-value">${_toPersianNum(list.length)}</div><div class="summary-card-label">حکم یافت شد</div></div>
        </div>
        ${topRegion ? `<div class="summary-card"><div class="summary-card-icon navy">📍</div><div class="summary-card-body"><div class="summary-card-value">${_esc(topRegion[0])}</div><div class="summary-card-label">پرتکرارترین ناحیه (${_toPersianNum(topRegion[1])})</div></div></div>` : ''}
        ${topType ? `<div class="summary-card"><div class="summary-card-icon gold">📋</div><div class="summary-card-body"><div class="summary-card-value">${_esc(topType[0])}</div><div class="summary-card-label">پرتکرارترین نوع (${_toPersianNum(topType[1])})</div></div></div>` : ''}
        ${topDevice ? `<div class="summary-card"><div class="summary-card-icon green">🔧</div><div class="summary-card-body"><div class="summary-card-value">${_esc(topDevice[0])}</div><div class="summary-card-label">تعداد دستگاه (${_toPersianNum(topDevice[1])})</div></div></div>` : ''}
        ${totalDays ? `<div class="summary-card"><div class="summary-card-icon teal">⏱️</div><div class="summary-card-body"><div class="summary-card-value">${_toPersianNum(totalDays)}</div><div class="summary-card-label">مجموع روز</div></div></div>` : ''}
    `;
}

function _renderReportTable(list) {
    const tbody = el('report-table-body');
    const tfoot = el('report-table-foot');
    tbody.innerHTML = list.map((m, i) => `
        <tr>
            <td><strong>${_toPersianNum(i + 1)}</strong></td>
            <td><strong>${_esc(m.decree_num) || '—'}</strong></td>
            <td>${_esc(m.name) || ''} ${_esc(m.lname) || ''}</td>
            <td>${_esc(m.emp_num) || '—'}</td>
            <td>${m.mission_type ? `<span class="mission-badge">${_esc(m.mission_type)}</span>` : '—'}</td>
            <td>${m.device_type ? `<span class="device-badge">${_esc(m.device_type)}</span>` : '—'}</td>
            <td>${m.region ? `<span class="region-badge">${_esc(m.region)}</span>` : '—'}</td>
            <td>${_esc(m.location) || '—'}</td>
            <td>${_esc(m.start_date) || '—'}</td>
            <td>${_esc(m.end_date) || '—'}</td>
            <td><strong>${_esc(m.duration) || '—'}</strong></td>
        </tr>`).join('');
    const totalDays = list.reduce((s, m) => {
        if (m.duration) { const n = parseInt(m.duration); if (!isNaN(n)) return s + n; }
        try {
            const sp = m.start_date.split('/').map(Number), ep = m.end_date.split('/').map(Number);
            const sg = toGregorian(sp[0], sp[1], sp[2]), eg = toGregorian(ep[0], ep[1], ep[2]);
            return s + Math.max(1, Math.round((new Date(eg.gy, eg.gm - 1, eg.gd) - new Date(sg.gy, sg.gm - 1, sg.gd)) / 86400000) + 1);
        } catch { return s; }
    }, 0);
    tfoot.style.display = 'table-footer-group';
    tfoot.innerHTML = `<tr><td colspan="10" style="text-align:left;padding:12px 14px;">📋 جمع کل: <strong>${_toPersianNum(list.length)}</strong> حکم ماموریت</td><td style="text-align:center;">${totalDays ? '⏱️ ' + _toPersianNum(totalDays) + ' روز' : '—'}</td></tr>`;
}

// Report table sorting
document.addEventListener('click', function (e) {
    const th = e.target.closest('th[data-sort]');
    if (!th || !th.closest('#report-table')) return;
    const col = th.dataset.sort;
    if (col === 'row') return;
    if (_reportSort.col === col) _reportSort.asc = !_reportSort.asc;
    else { _reportSort.col = col; _reportSort.asc = true; }
    const sorted = [..._reportResults].sort((a, b) => {
        const va = (a[col] || '').toString().toLowerCase();
        const vb = (b[col] || '').toString().toLowerCase();
        return _reportSort.asc ? va.localeCompare(vb, 'fa') : vb.localeCompare(va, 'fa');
    });
    _renderReportTable(sorted);
    document.querySelectorAll('#report-table th .sort-icon').forEach(s => s.textContent = '↕');
    th.querySelector('.sort-icon').textContent = _reportSort.asc ? '↑' : '↓';
});

function _toPersianNum(n) {
    return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function _updateChips(filters) {
    const chipsEl = el('filter-chips');
    const keys = { name: 'نام', lname: 'نام خانوادگی', emp_num: 'شماره پرسنلی', decree_num: 'شماره حکم', mission_type: 'نوع ماموریت', region: 'ناحیه', location: 'محل', device_type: 'نوع دستگاه', device_serial: 'سریال', start_date_from: 'تاریخ شروع از', start_date_to: 'تاریخ شروع تا', end_date_from: 'تاریخ پایان از', end_date_to: 'تاریخ پایان تا' };
    const active = Object.entries(filters).filter(([k, v]) => v).map(([k, v]) => `<span class="filter-chip"><span class="chip-label">${keys[k] || k}:</span> ${_esc(v)}<button class="chip-remove" onclick="removeFilter('${k}')">✕</button></span>`).join('');
    if (active) { chipsEl.innerHTML = active; chipsEl.style.display = 'flex'; } else { chipsEl.style.display = 'none'; }
}

function removeFilter(key) {
    const fieldMap = { name: 'r_name', lname: 'r_lname', emp_num: 'r_emp_num', decree_num: 'r_decree', mission_type: 'r_mission_type', region: 'r_region', location: 'r_location', device_type: 'r_device', device_serial: 'r_serial', start_date_from: 'r_start_from', start_date_to: 'r_start_to', end_date_from: 'r_end_from', end_date_to: 'r_end_to' };
    const input = el(fieldMap[key]);
    if (input) input.value = '';
    runReport();
}

function resetReportFilters() {
    ['r_name', 'r_lname', 'r_emp_num', 'r_decree', 'r_mission_type', 'r_region', 'r_location', 'r_device', 'r_serial', 'r_start_from', 'r_start_to', 'r_end_from', 'r_end_to'].forEach(id => { const e = el(id); if (e) e.value = ''; });
    el('filter-chips').style.display = 'none';
    el('report-result-card').style.display = 'none';
    el('report-summary').style.display = 'none';
    el('report-count').textContent = '۰ نتیجه';
    window.history.replaceState({}, '', window.location.pathname);
}

function toggleGroup(headerEl) {
    const group = headerEl.closest('.filter-group');
    if (group) group.classList.toggle('collapsed');
}
function toggleAllGroups() {
    const groups = document.querySelectorAll('#page-reports .filter-group');
    const allCollapsed = Array.from(groups).every(g => g.classList.contains('collapsed'));
    groups.forEach(g => { if (allCollapsed) g.classList.remove('collapsed'); else g.classList.add('collapsed'); });
    el('expand-icon').textContent = allCollapsed ? '▲' : '▼';
}

function setDatePreset(preset) {
    const now = new Date();
    const today = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const fmt = (jy, jm, jd) => jy + '/' + String(jm).padStart(2, '0') + '/' + String(jd).padStart(2, '0');
    let from, to;
    switch (preset) {
        case 'today': from = to = fmt(today.jy, today.jm, today.jd); break;
        case 'this_week': {
            const dayOfWeek = now.getDay();
            const daysSinceSat = (dayOfWeek + 1) % 7;
            const sat = new Date(now); sat.setDate(now.getDate() - daysSinceSat);
            const fri = new Date(sat); fri.setDate(sat.getDate() + 6);
            const s = toJalaali(sat.getFullYear(), sat.getMonth() + 1, sat.getDate());
            const f = toJalaali(fri.getFullYear(), fri.getMonth() + 1, fri.getDate());
            from = fmt(s.jy, s.jm, s.jd); to = fmt(f.jy, f.jm, f.jd);
            break;
        }
        case 'this_month': from = fmt(today.jy, today.jm, 1); to = fmt(today.jy, today.jm, jMonthLen(today.jy, today.jm)); break;
        case 'last_month': {
            const lm = today.jm === 1 ? 12 : today.jm - 1;
            const ly = today.jm === 1 ? today.jy - 1 : today.jy;
            from = fmt(ly, lm, 1); to = fmt(ly, lm, jMonthLen(ly, lm));
            break;
        }
        case 'this_year': from = fmt(today.jy, 1, 1); to = fmt(today.jy, 12, jMonthLen(today.jy, 12)); break;
        default: return;
    }
    el('r_start_from').value = from; el('r_start_to').value = to;
}

function quickReport(type) {
    resetReportFilters();
    switch (type) {
        case 'personnel': break;
        case 'monthly': setDatePreset('this_month'); break;
        case 'device': el('r_device').value = 'جرثقیل'; break;
        case 'region': el('r_region').value = 'تهران'; break;
    }
    runReport();
    document.querySelectorAll('#page-reports .filter-group').forEach(g => g.classList.remove('collapsed'));
}

function _saveFiltersToURL(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? window.location.pathname + '?' + qs : window.location.pathname);
}

function _loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;
    const fieldMap = { name: 'r_name', lname: 'r_lname', emp_num: 'r_emp_num', decree_num: 'r_decree', mission_type: 'r_mission_type', region: 'r_region', location: 'r_location', device_type: 'r_device', device_serial: 'r_serial', start_date_from: 'r_start_from', start_date_to: 'r_start_to', end_date_from: 'r_end_from', end_date_to: 'r_end_to' };
    params.forEach((v, k) => { const input = el(fieldMap[k]); if (input) input.value = v; });
    if (params.toString()) { setTimeout(() => runReport(), 200); }
}

function printReport() {
    if (!_reportResults.length) { showToast('گزارشی برای چاپ وجود ندارد', 'error'); return; }
    const rows = _reportResults.map((m, i) => `<tr><td>${i + 1}</td><td>${m.decree_num || '—'}</td><td>${m.name || ''} ${m.lname || ''}</td><td>${m.emp_num || '—'}</td><td>${m.mission_type || '—'}</td><td>${m.device_type || '—'}</td><td>${m.region || '—'}</td><td>${m.location || '—'}</td><td>${m.start_date || '—'}</td><td>${m.end_date || '—'}</td><td>${m.duration || '—'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>گزارش ماموریت</title>
    <style>@page{size:A4 landscape;margin:10mm;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Tahoma,sans-serif;font-size:9pt;direction:rtl;color:#000;}h2{text-align:center;margin-bottom:8px;font-size:14pt;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #444;padding:4px 6px;text-align:right;font-size:8.5pt;}th{background:#0f1f3d;color:#c8a84b;font-weight:bold;}tr:nth-child(even){background:#f9f9f9;}tfoot td{background:#0f1f3d;color:#fff;font-weight:bold;}</style></head><body>
    <h2>گزارش ماموریت‌ها — ${_toPersianNum(_reportResults.length)} حکم</h2>
    <table><thead><tr><th>ردیف</th><th>شماره حکم</th><th>نام و نام خانوادگی</th><th>شماره پرسنلی</th><th>نوع ماموریت</th><th>نوع دستگاه</th><th>ناحیه</th><th>محل</th><th>تاریخ شروع</th><th>تاریخ پایان</th><th>مدت</th></tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=function(){window.print();}<\/script></body></html>`;
    const win = window.open('', '_blank', 'width=1100,height=700');
    if (!win) { showToast('لطفاً popup را در مرورگر مجاز کنید', 'error'); return; }
    win.document.write(html); win.document.close();
}

function exportReportToExcel() {
    if (!_reportResults.length) { showToast('گزارشی برای خروجی وجود ندارد', 'error'); return; }
    const headers = ['ردیف', 'شماره حکم', 'نام', 'نام خانوادگی', 'شماره پرسنلی', 'نوع ماموریت', 'نوع دستگاه', 'ناحیه', 'محل', 'تاریخ شروع', 'تاریخ پایان', 'مدت'];
    const wsData = [headers, ..._reportResults.map((m, i) => [i + 1, m.decree_num || '', m.name || '', m.lname || '', m.emp_num || '', m.mission_type || '', m.device_type || '', m.region || '', m.location || '', m.start_date || '', m.end_date || '', m.duration || ''])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!sheetViews'] = [{ rightToLeft: true }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'گزارش ماموریت');
    XLSX.writeFile(wb, 'RSTC_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    showToast('فایل اکسل دانلود شد', 'success');
}

function exportMissionsToExcel() {
    if (!allMissions.length) { showToast('ماموریتی ثبت نشده', 'error'); return; }
    const headers = ['ردیف', 'شماره حکم', 'نام', 'نام خانوادگی', 'شماره پرسنلی', 'نوع ماموریت', 'محل', 'تاریخ شروع', 'تاریخ پایان'];
    const wsData = [headers, ...allMissions.map((m, i) => [i + 1, m.decree_num || '', m.name || '', m.lname || '', m.emp_num || '', m.mission_type || '', m.location || '', m.start_date || '', m.end_date || ''])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!sheetViews'] = [{ rightToLeft: true }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ماموریت‌ها');
    XLSX.writeFile(wb, 'RSTC_Missions.xlsx');
    showToast('فایل اکسل دانلود شد', 'success');
}

// ===== BACKUP & RESTORE =====
let _restoreFile = null;

function backupDatabase() {
    if (!hasPerm(currentUserPermissions, 'backup:create')) { showToast('فقط مدیر می‌تواند پشتیبان بگیرد', 'error'); return; }
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const filename = `RSTC_Backup_${dateStr}.db`;
    el('backup-filename').textContent = filename;
    el('backup-time').textContent = `${dateStr} ${timeStr}`;
    fetch('/api/backup', { headers: { 'Authorization': 'Bearer ' + getToken() } })
        .then(res => {
            if (!res.ok) throw new Error('خطا در دانلود');
            return res.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('پشتیبان با موفقیت دانلود شد', 'success');
        })
        .catch(e => showToast(e.message, 'error'));
}

function _initRestoreDragDrop() {
    const area = el('restore-upload-area');
    if (!area || area._ddInit) return;
    area._ddInit = true;
    ['dragenter', 'dragover'].forEach(ev => {
        area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); area.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
        area.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); area.classList.remove('drag-over'); });
    });
    area.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) _handleRestoreFileObj(file);
    });
}

function _handleRestoreFileObj(file) {
    if (!file.name.endsWith('.db')) { showToast('فقط فایل .db مجاز است', 'error'); return; }
    _restoreFile = file;
    el('restore-file-name').textContent = file.name;
    el('restore-file-size').textContent = (file.size / 1024).toFixed(1) + ' KB';
    el('restore-selected-file').style.display = 'flex';
    el('restore-upload-area').style.display = 'none';
    el('btn-restore').disabled = false;
}

function handleRestoreFile(input) {
    const file = input.files[0];
    if (file) _handleRestoreFileObj(file);
}

function removeRestoreFile() {
    _restoreFile = null;
    el('restore-selected-file').style.display = 'none';
    el('restore-upload-area').style.display = 'flex';
    el('btn-restore').disabled = true;
    el('restoreFile').value = '';
}

async function restoreDatabase() {
    if (!hasPerm(currentUserPermissions, 'backup:delete')) { showToast('فقط مدیر می‌تواند بازیابی کند', 'error'); return; }
    if (!_restoreFile) { showToast('فایل پشتیبان را انتخاب کنید', 'error'); return; }
    
    const progress = el('restore-progress');
    const progressText = el('restore-progress-text');
    progress.style.display = 'block';
    progressText.textContent = 'در حال اعتبارسنجی فایل...';
    
    try {
        const validation = await validateBackup(_restoreFile);
        if (!validation.valid) {
            progress.style.display = 'none';
            showToast('فایل نامعتبر است: ' + validation.error, 'error');
            return;
        }
        
        const preview = `📊 پیش‌نمایش فایل پشتیبان:
• یکپارچگی: ${validation.integrity}
• حجم: ${validation.sizeMB} MB
• جدول‌ها: ${validation.tables.length}
• رکوردها: ${Object.entries(validation.counts).map(([t,c]) => `${t}: ${c}`).join(', ')}`;
        
        if (!await _confirm('آیا مطمئن هستید؟ تمام اطلاعات فعلی با پشتیبان جایگزین می‌شود!\n\n' + preview)) {
            progress.style.display = 'none';
            return;
        }
        
        progressText.textContent = 'در حال بازیابی دیتابیس...';
        const buffer = await _restoreFile.arrayBuffer();
        await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/octet-stream' },
            body: buffer
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'خطا در بازیابی');
            return data;
        });
        progress.style.display = 'none';
        showToast('بازیابی با موفقیت انجام شد. صفحه را رفرش کنید.', 'success');
        removeRestoreFile();
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        progress.style.display = 'none';
        showToast(e.message, 'error');
    }
}

async function validateBackup(file) {
    const buffer = await file.arrayBuffer();
    return fetch('/api/backups/validate', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/octet-stream' },
        body: buffer
    }).then(res => res.json());
}

function switchBackupTab(tabId, btn) {
    document.querySelectorAll('.backup-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.backup-tab').forEach(el => el.classList.remove('active'));
    el('tab-' + tabId).classList.add('active');
    btn.classList.add('active');
    if (tabId === 'backup-history') loadBackupHistory();
}

async function loadBackupHistory() {
    try {
        const res = await fetch('/api/backups', { headers: { 'Authorization': 'Bearer ' + getToken() } });
        if (!res.ok) throw new Error('خطا در دریافت اطلاعات');
        const data = await res.json();
        const body = el('backup-history-body');
        if (!data.backups || !data.backups.length) {
            body.innerHTML = `<tr class="backup-history-empty-state"><td colspan="4"><span class="empty-icon">📭</span><p>هنوز پشتیبانی ایجاد نشده</p></td></tr>`;
            return;
        }
        body.innerHTML = data.backups.map(b => `
            <tr>
                <td><span class="backup-history-name">${_esc(b.name)}</span></td>
                <td><span class="backup-history-size">${b.sizeMB} MB</span></td>
                <td><span class="backup-history-date">${b.modifiedJalali}</span></td>
                <td>
                    <div class="backup-history-actions">
                        <a class="btn-history-download" href="/api/backups/${encodeURIComponent(b.name)}" download>
                            ⬇️ دانلود
                        </a>
                        <button class="btn-history-delete" onclick="deleteBackup('${_esc(b.name)}')" title="حذف">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        el('backup-history-body').innerHTML = `<tr><td colspan="4" style="text-align:center;color:red">خطا در بارگذاری</td></tr>`;
    }
}

async function downloadBackup(name) {
    const a = document.createElement('a');
    a.href = '/api/backups/' + encodeURIComponent(name);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function deleteBackup(name) {
    if (!await _confirm('آیا مطمئن هستید که پشتیبان «' + name + '» حذف شود؟')) return;
    try {
        const res = await fetch('/api/backups/' + encodeURIComponent(name), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('پشتیبان حذف شد', 'success');
        loadBackupHistory();
    } catch (e) { showToast(e.message, 'error'); }
}

// ===== MODAL CLOSE =====
function closeModal(e) {
    if (!e || e.target === el('detailsModal')) el('detailsModal').classList.remove('open');
}
function closeImportResult(e) {
    if (!e || e.target === el('importModal')) el('importModal').classList.remove('open');
}

// ===== EXCEL IMPORT =====
document.getElementById('importExcel').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const label = e.target.parentElement;
    const orig = label.innerText;
    label.innerText = 'در حال پردازش...'; label.style.opacity = '.6'; label.style.pointerEvents = 'none';
    const reader = new FileReader();
    reader.onload = async function (ev) {
        try {
            const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (!jsonData.length) { showToast('فایل اکسل خالی است', 'error'); return; }
            const result = await api('/api/personnel/bulk', { method: 'POST', body: JSON.stringify(jsonData) });
            let bodyHTML = '';
            if (result.failed === 0) {
                bodyHTML = `<div class="report-ok">✅ تمامی <strong>${result.imported}</strong> نفر با موفقیت ثبت شدند.</div>`;
            } else {
                bodyHTML = `<div class="report-err">⚠️ <strong>${result.failed}</strong> ردیف ثبت نشد:<ul class="error-list">${result.errors.map(err => `<li>${_esc(err)}</li>`).join('')}</ul></div>`;
                if (result.imported > 0) bodyHTML += `<div class="report-ok" style="margin-top:10px;">✅ ${result.imported} نفر ثبت شدند.</div>`;
            }
            el('importBody').innerHTML = bodyHTML;
            el('importTitle').textContent = `ورود اکسل — موفق: ${result.imported} / ناموفق: ${result.failed}`;
            el('importModal').classList.add('open');
            loadPersonnel(); loadDashboard();
        } catch (err) { showToast(err.message, 'error'); }
        finally { label.innerText = orig; label.style.opacity = '1'; label.style.pointerEvents = 'auto'; e.target.value = ''; }
    };
    reader.readAsArrayBuffer(file);
});

// ===== EXCEL EXPORT =====
function exportToExcel() {
    if (!allPersonnel.length) { showToast('لیست پرسنل خالی است', 'error'); return; }
    const headers = ['ردیف', 'نام', 'نام خانوادگی', 'نام پدر', 'کد ملی', 'شماره پرسنلی', 'تاریخ استخدام', 'نوع استخدام', 'پست سازمانی', 'عنوان شغل', 'آخرین مدرک', 'شماره تماس', 'آدرس', 'وضعیت', 'توضیحات'];
    const wsData = [headers, ...allPersonnel.map((p, i) => [i + 1, p.name, p.lname, p.father_name || '', p.national_id || '', p.emp_num || '', p.hire_date || '', p.emp_type || '', p.org_post || '', p.job_title || '', p.last_degree || '', p.phone || '', p.address || '', p.status, p.notes || ''])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!sheetViews'] = [{ rightToLeft: true }];
    ws['!cols'] = [5, 15, 20, 15, 12, 12, 14, 12, 15, 15, 12, 15, 25, 10, 25].map(wch => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'پرسنل');
    XLSX.writeFile(wb, 'RSTC_Personnel.xlsx');
    showToast('فایل اکسل دانلود شد', 'success');
}

function printTable() {
    const list = _currentPersonnelList.length ? _currentPersonnelList : allPersonnel;
    if (!list || !list.length) { showToast('لیست پرسنل خالی است', 'error'); return; }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateText = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
    const rows = list.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${_esc(p.name || '')} ${_esc(p.lname || '')}</td>
            <td>${_esc(p.national_id || '—')}</td>
            <td>${_esc(p.emp_num || '—')}</td>
            <td>${_esc(p.job_title || '—')}</td>
            <td>${_esc(p.org_post || '—')}</td>
            <td>${_esc(p.status || '—')}</td>
            <td>${_esc(p.phone || '—')}</td>
        </tr>`).join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
        showToast('مرورگر اجازه باز کردن پنجره پرینت را نمی‌دهد.', 'error');
        return;
    }

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>لیست پرسنل</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Tahoma, Arial, sans-serif; color: #111827; margin: 0; padding: 0; background: #fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; padding-bottom:10px; border-bottom:2px solid #0f1f3d; }
    .header h1 { margin:0; font-size:20px; color:#0f1f3d; }
    .header p { margin:4px 0 0; font-size:12px; color:#475569; }
    .meta { display:flex; flex-direction:column; gap:4px; font-size:11px; color:#475569; }
    table { width:100%; border-collapse:collapse; font-size:11px; direction:rtl; }
    th, td { border:1px solid #cbd5e1; padding:8px 6px; text-align:center; vertical-align:middle; }
    th { background:#f8fafc; color:#0f1f3d; font-weight:700; }
    tr:nth-child(even) td { background:#fcfdff; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>لیست پرسنل</h1>
      <p>سیستم مدیریت منابع انسانی RSTC</p>
    </div>
    <div class="meta">
      <span>تاریخ: ${dateText}</span>
      <span>تعداد: ${list.length} نفر</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>ردیف</th>
        <th>نام و نام خانوادگی</th>
        <th>کد ملی</th>
        <th>شماره پرسنلی</th>
        <th>عنوان شغل</th>
        <th>پست سازمانی</th>
        <th>وضعیت</th>
        <th>شماره تماس</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
    }, 300);
}

// ===== PAGINATION COMPONENT =====
const _pagState = {};

function _createPagination(containerId, totalItems, currentPage, pageSize, onPageChange) {
    const container = el(containerId);
    if (!container) return;
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalItems <= pageSize) { container.innerHTML = `<span class="pagination-info">نمایش ${totalItems} از ${totalItems}</span>`; return; }
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    const persianNums = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    let html = `<span class="pagination-info">نمایش ${persianNums(startItem)}-${persianNums(endItem)} از ${persianNums(totalItems)}</span>`;
    html += '<div class="pagination-btns">';
    if (currentPage > 1) html += `<button class="pagination-btn" data-page="${currentPage - 1}">❯</button>`;
    const range = 2;
    let startPage = Math.max(1, currentPage - range);
    let endPage = Math.min(totalPages, currentPage + range);
    if (startPage > 1) { html += `<button class="pagination-btn" data-page="1">۱</button>`; if (startPage > 2) html += '<span class="pagination-dots">...</span>'; }
    for (let p = startPage; p <= endPage; p++) {
        html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${persianNums(p)}</button>`;
    }
    if (endPage < totalPages) { if (endPage < totalPages - 1) html += '<span class="pagination-dots">...</span>'; html += `<button class="pagination-btn" data-page="${totalPages}">${persianNums(totalPages)}</button>`; }
    if (currentPage < totalPages) html += `<button class="pagination-btn" data-page="${currentPage + 1}">❮</button>`;
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', function () { const p = parseInt(this.dataset.page); if (p && p !== currentPage) onPageChange(p); });
    });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function (e) {
    if (!getToken()) return;
    _resetSessionTimer();
    if (e.key === 'Escape') {
        ['detailsModal', 'passwordModal', 'importModal'].forEach(id => {
            const m = el(id); if (m && m.classList.contains('open')) m.classList.remove('open');
        });
        const opts = el('optionsModal');
        if (opts && opts.style.display === 'flex') closeOptionsModal();
        const perForm = el('per-form-card');
        if (perForm && !perForm.classList.contains('collapsed')) closePerForm();
        const userForm = el('user-form-card');
        if (userForm && !userForm.classList.contains('collapsed')) closeUserForm();
        const missionForm = el('mission-form-card');
        if (missionForm && !missionForm.classList.contains('collapsed')) closeMissionForm();
    }
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const activePage = document.querySelector('.page[style*="flex"]');
        if (!activePage) return;
        const searchInput = activePage.querySelector('.search-input');
        if (searchInput) searchInput.focus();
    }
    if (e.key === 'Enter') {
        const activePage = document.querySelector('.page[style*="flex"]');
        if (activePage && activePage.id === 'page-reports') {
            const tgt = e.target;
            if (tgt && tgt.id && tgt.id.startsWith('r_')) {
                e.preventDefault();
                runReport();
            }
        }
    }
});
document.addEventListener('click', () => { _resetSessionTimer(); });

// ===== LAZY LOAD PAGES =====
let _pageLoaded = { dashboard: true, personnel: false, missions: false, users: false, reports: false };
function _onPageShow(target) {
    if (target === 'personnel' && !_pageLoaded.personnel) { _pageLoaded.personnel = true; loadPersonnel(); initDatePicker('p_hire_date'); }
    else if (target === 'personnel') { initDatePicker('p_hire_date'); }
    if (target === 'missions' && !_pageLoaded.missions) { _pageLoaded.missions = true; loadMissions(); }
    if (target === 'missions') { initDatePicker('m_start'); initDatePicker('m_end'); initDatePicker('m_issue'); }
    if (target === 'users' && !_pageLoaded.users) { _pageLoaded.users = true; loadUsers(); }
    if (target === 'reports' && !_pageLoaded.reports) { _pageLoaded.reports = true; if (!personnelCache.length) loadPersonnelCache(); initReportDatePickers(); _initReportsPersonnelAutocomplete(); }
    else if (target === 'reports') { initReportDatePickers(); _initReportsPersonnelAutocomplete(); }
    if (target === 'audit') { loadAuditLog(); }
}

// ===== AI CHAT =====
function toggleAIChat() {
    const panel = el('ai-chat-panel');
    if (panel) panel.classList.toggle('open');
}

function addAIMessage(text, sender) {
    const container = el('ai-chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `ai-msg ai-msg-${sender}`;
    div.innerHTML = `<div class="ai-msg-bubble">${_esc(text).replace(/\n/g, '<br>')}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showAITyping() {
    const container = el('ai-chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.id = 'ai-typing-indicator';
    div.className = 'ai-msg ai-msg-bot';
    div.innerHTML = '<div class="ai-chat-typing"><span></span><span></span><span></span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function hideAITyping() {
    const el2 = el('ai-typing-indicator');
    if (el2) el2.remove();
}

async function submitAIChat(e) {
    if (e) e.preventDefault();
    const input = el('ai-chat-input');
    const errorEl = el('ai-chat-error');
    const sendBtn = el('ai-chat-send');
    const question = input ? input.value.trim() : '';
    errorEl.style.display = 'none';
    if (!question) return;

    addAIMessage(question, 'user');
    if (input) input.value = '';
    if (sendBtn) sendBtn.disabled = true;
    showAITyping();

    try {
        const data = await api('/api/ai/ask', { method: 'POST', body: JSON.stringify({ question }) });
        hideAITyping();
        addAIMessage(data.answer || 'پاسخی دریافت نشد.', 'bot');
    } catch (err) {
        hideAITyping();
        addAIMessage('خطا: ' + err.message, 'bot');
        if (errorEl) { errorEl.textContent = err.message; errorEl.style.display = 'block'; }
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }
}

// ===== INIT on page load =====
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateClock();
    setInterval(updateClock, 1000);
    // نرمال‌سازی خودکار ارقام فارسی/عربی در فیلدهای عددی هنگام تایپ
    ['p_national_id', 'p_emp_num', 'p_phone', 'm_emp_num'].forEach(attachDigitNormalizer);
    const savedToken = getToken();
    if (savedToken) {
        try {
            const payload = JSON.parse(atob(savedToken.split('.')[1]));
            if (payload.exp * 1000 > Date.now()) {
                currentUserRole = payload.role; currentUsername = payload.username; currentUserPermissions = payload.permissions || [];
                _pageLoaded = { dashboard: true, personnel: false, missions: false, users: false, reports: false };
                document.body.classList.add('logged-in');
                el('login-page').style.display = 'none';
                el('dashboard-page').style.display = 'flex';
                el('user-display-name').textContent = payload.username;
                el('user-display-role').textContent = payload.role === 'admin' ? 'مدیر کل' : (payload.role === 'editor' ? 'ویرایشگر' : payload.role === 'operator' ? 'امور ماموریت' : payload.role === 'viewer' ? 'بیننده' : 'کاربر عادی');
                el('user-avatar').textContent = payload.username[0].toUpperCase();
                if (hasPerm(currentUserPermissions, 'users:view')) el('nav-users').style.display = 'flex';
                if (hasPerm(currentUserPermissions, 'backup:view')) el('nav-backup').style.display = 'flex';
                if (hasPerm(currentUserPermissions, 'options:view')) el('nav-options').style.display = 'flex';
                if (hasPerm(currentUserPermissions, 'audit:view')) el('nav-audit').style.display = 'flex';
                const aiWidget = el('ai-chat-widget');
                if (aiWidget) aiWidget.style.display = hasPerm(currentUserPermissions, 'ai_chat:view') ? 'flex' : 'none';
                loadDashboard(); _startSessionTimer(); loadAllOptions();
            } else { clearToken(); }
        } catch (e) { clearToken(); }
    }
});
