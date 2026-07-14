const NORMALIZE_MAP = {
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'
};

function normalizeDigits(str) {
  if (str == null) return str;
  return String(str).replace(/[۰-۹٠-٩]/g, ch => NORMALIZE_MAP[ch] || ch);
}

function normalizePersian(str) {
  if (str == null) return str;
  return String(str)
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ۀ]/g, 'ه')
    .replace(/[ـ]/g, '')
    .replace(/[\u200C\u200D\u200B\u200E\u200F]/g, '');
}

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

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

function formatJalali(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d)) return esc(isoDate);
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`;
}

const PERSIAN_STOP_WORDS = new Set([
  'و','در','به','از','که','با','این','را','برای','است','بود','شد','شود','دارم','دارد','داریم','ندارم','ندارد','نداریم',
  'همه','لیست','فهرست','نشانی','جستجو','یاب','پیدا','کدام','چه','کی',
  'نفر','عدد','مورد','نوع','وضعیت','تاریخ','از','تا','بین','روز','ماه','سال',
  'پدر','کد ملی','شماره','پرسنلی','استخدام','شغل','عنوان','عنوان شغل',
  'شماره تماس','آدرس','توضیحات','مدرک','تحصیلی','آخرین','پست','سازمانی',
  'مدرک','تحصیلی','آخرین','پست','سازمانی',
  'حکم','دستگاه','سریال','ناحیه','محل','موضوع','مدت','اضافکاری',
  'تامین','شده','نشده','صدور','تمدید',
  'هواپیما','قطار','اتوبوس','آژانس','شخصی','دولتی','خودرو',
  'توسط','قبل','بعد','هم','تنها','فقط','همچنین','یا','اگر','وقتی','جا','جای','جایی',
  'بگیر','بده','کن','بکن','برو','بیا','بگو','بشن','ببین','بخون','نویس',
  'های','هایی','ها','ی','مان','تان','شان','تر','ترین','بار'
]);

const INTENT_WORDS = new Set([
  'چند','تعداد','کل','مجموع','لیست','همه','فهرست','نشانی','جستجو','کدام','چه','کی'
]);

const SEARCH_FILTER_WORDS = new Set([
  'پرسنل', 'نفر', 'کارمند', 'کارگر', 'استخدام', 'استخدامی',
  'ماموریت', 'مأموریت', 'حکم',
  'انفرادی', 'گروهی', 'گروهانه'
]);

function filterSearchKeywords(keywords) {
  const suffixes = ['های', 'ها', 'ی'];
  return keywords.filter(k => {
    if (SEARCH_FILTER_WORDS.has(k)) return false;
    for (const s of suffixes) {
      if (SEARCH_FILTER_WORDS.has(k.slice(0, -s.length)) && k.endsWith(s)) return false;
    }
    return true;
  });
}

function extractKeywords(q) {
  const text = normalizePersian(normalizeDigits(q));
  const words = text.split(/[\s،,\.\?\!]+/);
  const keywords = [];
  for (const w of words) {
    let trimmed = w.trim().replace(/[؟،؛:!؟\.\,\-\+\(\)\[\]\{\}«»„"']/g, '');
    if (!trimmed) continue;
    if (PERSIAN_STOP_WORDS.has(trimmed)) continue;
    if (INTENT_WORDS.has(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) { keywords.push(trimmed); continue; }
    if (trimmed.length >= 2) keywords.push(trimmed);
  }
  return keywords;
}

function detectEntity(keywords, originalQuestion) {
  const qLower = originalQuestion.toLowerCase();
  const qNormalized = normalizeDigits(qLower);
  
  const hasPersonnel = /پرسنل|نفر|کارمند|کارگر|استخدام|استخدامی|نگهبان|تعمیرکار|اپراتور|کاردان|مکانیسین/.test(qNormalized);
  const hasMission = /ماموریت|مأموریت|حکم/.test(qNormalized);
  
  if (hasPersonnel && !hasMission) return 'personnel';
  if (hasMission && !hasPersonnel) return 'missions';
  if (hasPersonnel && hasMission) {
    if (/ماموریت.*پرسنل|پرسنل.*ماموریت|مأموریت.*پرسنل|پرسنل.*مأموریت/.test(qNormalized)) return 'personnel_mission';
    return 'missions';
  }
  
  const hasCountOrList = /چند|تعداد|همه|لیست|فهرست|نشانی|جستجو/.test(qNormalized);
  if (hasCountOrList) {
    if (hasPersonnel) return 'personnel';
    if (hasMission) return 'missions';
  }
  
  return 'personnel';
}

function buildPersonnelQuery(keywords) {
  const searchKws = filterSearchKeywords(keywords);
  const conditions = [];
  const params = [];
  
  const searchableFields = [
    { field: 'name', weight: 2 },
    { field: 'lname', weight: 2 },
    { field: 'emp_num', weight: 3 },
    { field: 'national_id', weight: 3 },
    { field: 'job_title', weight: 2 },
    { field: 'org_post', weight: 1 },
    { field: 'phone', weight: 1 },
    { field: 'last_degree', weight: 1 },
    { field: 'emp_type', weight: 1 }
  ];
  
  for (const kw of searchKws) {
    const fieldConds = [];
    for (const f of searchableFields) {
      fieldConds.push(`${f.field} LIKE ?`);
      params.push(`%${kw}%`);
    }
    conditions.push('(' + fieldConds.join(' OR ') + ')');
  }
  
  return { sql: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
}

function buildMissionQuery(keywords, specialFilters = {}) {
  const searchKws = filterSearchKeywords(keywords);
  const conditions = [];
  const params = [];
  
  const searchableFields = [
    { field: 'decree_num', weight: 3 },
    { field: 'name', weight: 2 },
    { field: 'lname', weight: 2 },
    { field: 'mission_type', weight: 2 },
    { field: 'device_type', weight: 2 },
    { field: 'repair_type', weight: 1 },
    { field: 'region', weight: 2 },
    { field: 'location', weight: 2 },
    { field: 'subject', weight: 1 },
    { field: 'device_serial', weight: 1 },
    { field: 'emp_num', weight: 1 }
  ];
  
  for (const kw of searchKws) {
    const fieldConds = [];
    for (const f of searchableFields) {
      fieldConds.push(`${f.field} LIKE ?`);
      params.push(`%${kw}%`);
    }
    conditions.push('(' + fieldConds.join(' OR ') + ')');
  }
  
  if (specialFilters.is_single) { conditions.push('is_single = 1'); }
  if (specialFilters.is_group) { conditions.push('is_group = 1'); }
  if (specialFilters.is_supplied) { conditions.push('is_supplied = 1'); }
  if (specialFilters.is_unsupplied) { conditions.push('is_unsupplied = 1'); }
  if (specialFilters.is_plane) { conditions.push('is_plane = 1'); }
  if (specialFilters.is_train) { conditions.push('is_train = 1'); }
  if (specialFilters.is_bus) { conditions.push('is_bus = 1'); }
  if (specialFilters.is_agency) { conditions.push('is_agency = 1'); }
  if (specialFilters.is_personal) { conditions.push('is_personal = 1'); }
  if (specialFilters.is_gov) { conditions.push('is_gov = 1'); }
  
  return { sql: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
}

async function answerStats(dbGet, dbAll) {
  const p = await dbGet('SELECT COUNT(*) as c FROM Personnel');
  const m = await dbGet('SELECT COUNT(*) as c FROM Missions');
  const single = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_single=1');
  const group = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_group=1');
  const supplied = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_supplied=1');
  const issued = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_issued=1');
  const extended = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_extended=1');
  const personal = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_personal=1');
  const gov = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_gov=1');
  const plane = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_plane=1');
  const train = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_train=1');
  const bus = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_bus=1');
  const agency = await dbGet('SELECT COUNT(*) as c FROM Missions WHERE is_agency=1');
  const active = await dbGet(`SELECT COUNT(*) as c FROM Personnel WHERE status = 'فعال'`);
  const inactive = await dbGet(`SELECT COUNT(*) as c FROM Personnel WHERE status != 'فعال'`);
  const regions = await dbAll("SELECT region, COUNT(*) as c FROM Missions WHERE region IS NOT NULL AND region != '' GROUP BY region");
  let text = `📊 آمار کلی پایگاه داده:\n\n`;
  text += `👥 کل پرسنل: ${p.c} نفر\n`;
  text += `   • فعال: ${active.c} | سایر: ${inactive.c}\n\n`;
  text += `🚀 کل ماموریت‌ها: ${m.c} عدد\n`;
  text += `   • انفرادی: ${single.c} | گروهی: ${group.c}\n`;
  text += `   • تامین شده: ${supplied.c} | تامین نشده: ${m.c - supplied.c}\n`;
  text += `   • صادر شده: ${issued.c} | تمدید شده: ${extended.c}\n`;
  text += `   • شخصی: ${personal.c} | دولتی: ${gov.c}\n`;
  text += `   • هوایی: ${plane.c} | قطار: ${train.c} | اتوبوس: ${bus.c} | آژانس: ${agency.c}\n\n`;
  if (regions.length) {
    text += `🗺️ ماموریت‌ها بر اساس ناحیه:\n`;
    regions.forEach(r => text += `   • ${esc(r.region)}: ${r.c} عدد\n`);
  }
  return text;
}

async function flexibleAnswer(dbGet, dbAll, keywords, originalQuestion, entityType) {
  const isCount = /چند|تعداد|کل|مجموع/.test(originalQuestion);
  const qLower = originalQuestion.toLowerCase();
  const searchKws = filterSearchKeywords(keywords);
  
  const specialFilters = {};
  if (/انفرادی/.test(qLower)) specialFilters.is_single = 1;
  if (/گروهی|گروه\s*انه/.test(qLower)) specialFilters.is_group = 1;
  if (/تامین\s*شده/.test(qLower)) specialFilters.is_supplied = 1;
  if (/تامین\s*نشده/.test(qLower)) specialFilters.is_unsupplied = 1;
  if (/هواپیما|هوایی/.test(qLower)) specialFilters.is_plane = 1;
  if (/قطار/.test(qLower)) specialFilters.is_train = 1;
  if (/اتوبوس/.test(qLower)) specialFilters.is_bus = 1;
  if (/آژانس/.test(qLower)) specialFilters.is_agency = 1;
  if (/شخصی|وسیله\s*شخصی/.test(qLower)) specialFilters.is_personal = 1;
  if (/دولتی|خودرو\s*دولتی/.test(qLower)) specialFilters.is_gov = 1;
  
  if (/آمار|امار|خلاصه|وضعیت\s*کلی|گزارش\s*کلی/.test(qLower)) {
    return await answerStats(dbGet, dbAll);
  }
  
  switch (entityType) {
    case 'personnel': {
      const { sql, params } = buildPersonnelQuery(keywords);
      if (isCount) {
        const r = await dbGet(`SELECT COUNT(*) as cnt FROM Personnel ${sql}`, params);
        const kwText = searchKws.length ? ` با کلیدواژه «${esc(searchKws.join(' '))}»` : '';
        return `تعداد پرسنل${kwText}: ${r.cnt} نفر`;
      }
      const rows = await dbAll(`SELECT name, lname, emp_num, job_title, status FROM Personnel ${sql} ORDER BY id DESC LIMIT 20`, params);
      if (!rows.length) return 'هیچ پرسنلی با این شرایط یافت نشد.';
      const kwText = searchKws.length ? ` (جستجو: «${esc(searchKws.join(' '))}»)` : '';
      let text = `لیست پرسنل${kwText} (${rows.length} مورد):\n\n`;
      rows.forEach((r, i) => {
        text += `${i + 1}. ${esc(r.name)} ${esc(r.lname)} — ${esc(r.job_title) || '—'} — کد: ${esc(r.emp_num) || '—'} — وضعیت: ${esc(r.status)}\n`;
      });
      return text;
    }
    case 'missions': {
      const { sql, params } = buildMissionQuery(keywords, specialFilters);
      if (isCount) {
        const r = await dbGet(`SELECT COUNT(*) as cnt FROM Missions ${sql}`, params);
        const kwText = searchKws.length ? ` با کلیدواژه «${esc(searchKws.join(' '))}»` : '';
        const filterText = Object.keys(specialFilters).length ? ' (با فیلترهای وضعیت)' : '';
        return `تعداد ماموریت‌ها${kwText}${filterText}: ${r.cnt} عدد`;
      }
      const rows = await dbAll(`SELECT decree_num, name, lname, mission_type, region, location, start_date FROM Missions ${sql} ORDER BY id DESC LIMIT 20`, params);
      if (!rows.length) return 'هیچ ماموریتی با این شرایط یافت نشد.';
      const kwText = searchKws.length ? ` (جستجو: «${esc(searchKws.join(' '))}»)` : '';
      const filterText = Object.keys(specialFilters).length ? ' (با فیلترهای وضعیت)' : '';
      let text = `لیست ماموریت‌ها${kwText}${filterText} (${rows.length} مورد):\n\n`;
      rows.forEach((r, i) => {
        text += `${i + 1}. حکم ${esc(r.decree_num)} — ${esc(r.name)} ${esc(r.lname || '')} — ${esc(r.mission_type) || '—'} — ${esc(r.location || r.region || '—')} — ${formatJalali(r.start_date)}\n`;
      });
      return text;
    }
    case 'personnel_mission': {
      const { sql: pSql, params: pParams } = buildPersonnelQuery(keywords);
      const personnel = await dbAll(`SELECT id, name, lname, emp_num FROM Personnel ${pSql} LIMIT 5`, pParams);
      if (!personnel.length) return 'پرسنلی با این مشخصات یافت نشد.';
      let text = '';
      for (const p of personnel.slice(0, 3)) {
        const mKws = filterSearchKeywords([...keywords, p.name, p.lname, p.emp_num || '']);
        const { sql: mSql, params: mParams } = buildMissionQuery(mKws);
        const missions = await dbAll(`SELECT m.decree_num, m.mission_type, m.location, m.start_date, m.end_date FROM Missions m ${mSql} ORDER BY m.id DESC LIMIT 10`, mParams);
        text += `${esc(p.name)} ${esc(p.lname)}:\n`;
        if (!missions.length) { text += '   — هیچ ماموریتی یافت نشد\n\n'; continue; }
        missions.forEach((m, i) => {
          text += `   ${i + 1}. حکم ${esc(m.decree_num)} — ${esc(m.mission_type) || '—'} — ${esc(m.location || '—')} — ${formatJalali(m.start_date)}\n`;
        });
        text += '\n';
      }
      return text.trim();
    }
  }
  return 'متوجه سوال شما شدم. لطفاً واضح‌تر بنویسید.';
}

async function parseAndAnswer(question, dbGet, dbAll) {
  const q = question.trim();
  if (!q) return 'لطفاً سوال خود را بنویسید.';
  
  const keywords = extractKeywords(q);
  if (!keywords.length) {
    return 'لطفاً کلمه‌ای برای جستجو وارد کنید. مثال: «چند پرسنل نگهبان داریم؟» یا «ماموریت‌های انفرادی»';
  }
  
  const entityType = detectEntity(keywords, q);
  return await flexibleAnswer(dbGet, dbAll, keywords, q, entityType);
}

module.exports = { parseAndAnswer, extractKeywords, detectEntity, buildPersonnelQuery, buildMissionQuery };
