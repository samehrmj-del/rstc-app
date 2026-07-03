// قالب HTML حکم ماموریت (سمت سرور)
// این فایل توسط server.js برای تولید PDF حکم ماموریت استفاده می‌شود.

const path = require('path');

function buildMissionDecreeHTML(m) {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const chk = v => v ? '☑' : '☐';
    const calcDays = (s, e) => {
        try {
            const sp = String(s).split('/').map(Number);
            const ep = String(e).split('/').map(Number);
            const sd = sp[0] * 365 + sp[1] * 31 + sp[2];
            const ed = ep[0] * 365 + ep[1] * 31 + ep[2];
            return Math.max(1, ed - sd + 1);
        } catch { return m.duration || '—'; }
    };
    const days = m.duration || calcDays(m.start_date, m.end_date);
    const logoUrl = 'file://' + path.join(__dirname, 'public', 'logo.png').replace(/\\/g, '/');

    return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<title>حکم ماموریت</title>
<style>
@page{size:210mm 297mm;margin:10mm 12mm;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:186mm;}
body{font-family:Tahoma,'B Nazanin',sans-serif;font-size:10pt;direction:rtl;color:#000;}
.wrap{width:186mm;margin:0 auto;}
table.main{width:100%;border-collapse:collapse;table-layout:fixed;}
td,th{border:1px solid #000;padding:4px 6px;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;}
.lc{font-weight:bold;font-size:9.5pt;}
.sh{font-weight:bold;font-size:10pt;padding:4px 6px;}
.sd{padding:6px 8px;font-size:9.5pt;line-height:1.7;}
.ck{display:inline-flex;align-items:center;gap:3px;font-size:9.5pt;}
.sgr{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.sbox{border:1px solid #000;padding:6px 10px;min-height:60px;}
.stit{font-size:9.5pt;font-weight:bold;border-bottom:1px solid #000;margin-bottom:4px;padding-bottom:3px;}
.sln{border-top:1px dashed #888;margin-top:24px;font-size:8.5pt;color:#888;text-align:center;}
.ft{display:flex;justify-content:space-between;font-size:9pt;border-top:1px solid #000;padding-top:4px;margin-top:4px;}
</style></head><body><div class="wrap">
<table class="main">
<tr>
  <td colspan="4" style="border:none;padding:4px 0;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <img src="${logoUrl}" style="height:60px;" onerror="this.style.display='none'">
      <div style="font-size:17pt;font-weight:bold;text-align:center;">حکم ماموریت اداری</div>
      <div style="font-size:8pt;text-align:left;border:1px solid #000;padding:4px 8px;border-radius:2px;">شماره: <strong>${esc(m.decree_num) || '........'}</strong><br>تاریخ: <strong>${esc(m.issue_date) || '........'}</strong></div>
    </div>
  </td>
</tr>
<tr>
  <td class="lc" style="width:22%;">۱- نام و نام خانوادگی مامور</td>
  <td style="width:28%;">${esc(m.name) || '........'} ${esc(m.lname) || ''}</td>
  <td class="lc" style="width:18%;">۲- عنوان شغل</td>
  <td style="width:32%;">${esc(m.job_title) || '........'}</td>
</tr>
<tr>
  <td class="lc">۳- عنوان مأموریت:</td>
  <td colspan="3" style="padding:4px 8px;">
    <span class="ck">${chk(m.is_single)} انفرادی</span> &nbsp;&nbsp;
    <span class="ck">${chk(m.is_group)} گروهی</span>
  </td>
</tr>
<tr>
  <td class="lc">۴- توضیحات:</td>
  <td colspan="3" style="min-height:20px;">${esc(m.subject) || ''}</td>
</tr>
<tr>
  <td class="lc">۵- واحد درخواست کننده:</td>
  <td>مدیریت ماشین آلات</td>
  <td class="lc">۶- مدت مأموریت:</td>
  <td><strong>${esc(days)}</strong> روز &nbsp;&nbsp; از: <strong>${esc(m.start_date) || '........'}</strong> &nbsp;&nbsp; تا: <strong>${esc(m.end_date) || '........'}</strong></td>
</tr>
<tr>
  <td class="lc">۷- محل ماموریت:</td>
  <td colspan="3">${esc(m.location) || '........'} ${m.region ? '— ناحیه ' + esc(m.region) : ''}</td>
</tr>
</table>

<div style="border:1px solid #000;margin:6px 0 0 0;">
  <div class="sh" style="border-bottom:1px solid #000;">۸- موضوع ماموریت:</div>
  <div class="sd">${m.device_type ? 'نوع دستگاه: ' + esc(m.device_type) + ' &nbsp; ' : ''}${m.device_serial ? 'سریال: ' + esc(m.device_serial) + ' &nbsp; ' : ''}${m.repair_type ? 'نوع تعمیر: ' + esc(m.repair_type) : ''}${m.subject ? '<br>' + esc(m.subject) : ''}</div>
</div>

<table class="main" style="margin-top:0;">
<tr>
  <td class="lc" style="width:22%;">۹- نحوه عزیمت:</td>
  <td colspan="3" style="padding:6px 10px;">
    <span class="ck">${chk(m.is_plane)} هواپیما</span> &nbsp;&nbsp;
    <span class="ck">${chk(m.is_train)} قطار</span> &nbsp;&nbsp;
    <span class="ck">${chk(m.is_bus)} اتوبوس</span> &nbsp;&nbsp;
    <span class="ck">${chk(m.is_gov)} خودرودولتی</span> &nbsp;&nbsp;
    <span class="ck">${chk(m.is_agency)} آژانس</span> &nbsp;&nbsp;
    <span class="ck">${chk(m.is_personal)} وسیله شخصی</span>
  </td>
</tr>
</table>

<div style="border:1px solid #000;margin:0 0 6px 0;padding:8px 10px;font-size:9.5pt;line-height:1.7;">
  ۱۰- بدینوسیله به شما مأموریت داده می‌شود به منظور انجام وظیفه به شرح بند ۸ در زمان تعیین شده اقدام و پس از انجام مأموریت گزارش نمایید.
</div>

<div class="sgr" style="margin:0 0 6px 0;">
  <div class="sbox">
    <div class="stit">نام و نام خانوادگی مدیر واحد مربوطه</div>
    <div style="font-size:9.5pt;">غلامرضا فضلی</div>
    <div class="sln">امضاء</div>
  </div>
  <div class="sbox">
    <div class="stit">نام و نام خانوادگی مدیر عامل</div>
    <div style="font-size:9.5pt;">مصطفی معینی</div>
    <div class="sln">امضاء</div>
  </div>
</div>

<div style="border:1px solid #000;margin:0 0 6px 0;">
  <div class="sh" style="border-bottom:1px solid #000;">۱۱- گزارش مأموریت:</div>
  <div class="sd" style="min-height:50px;"></div>
</div>

<div style="border:1px solid #000;margin:0 0 6px 0;">
  <div class="sh" style="border-bottom:1px solid #000;">۱۲- گزارش هزینه انجام شده در مأموریت:</div>
  <div class="sd" style="font-size:9pt;line-height:1.8;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px;font-size:8.5pt;">
      <span>بلیط</span><span>درآورای این حکم ساعت</span><span>مبلغ</span>
      <span>وعده صبحانه و</span><span>وعده ناهار و</span><span>وعده شام جمعاً به مبلغ</span>
    </div>
    <div style="text-align:justify;">
      تمام مأموریت مراجعت نموده که در این ایام تعداد ......... وعده صبحانه و ......... وعده ناهار و ......... وعده شام جمعاً به مبلغ ............. مبلغ بابت فاکتور پیوست مبلغ ریال هزینه هتل و مبلغ ریال فاکتور پیوست مبلغ ریال هزینه ایاب و ذهاب بلیط پیوست که جمعاً معادل مبلغ ریال هزینه انجام یافته است خواهشمند است پس از تأیید انجام مأموریت نسبت به هزینه های انجام یافته و اعضای مأموریت دستور پرداخت صادر فرمایید خصماً در طی این مدت از تعداد غذای اداری استفاده نموده ام.
    </div>
    <div style="margin-top:8px;display:flex;justify-content:space-between;">
      <span>نام و نام خانوادگی: ${esc(m.name) || ''} ${esc(m.lname) || ''}</span>
      <span>امضاء: .....................</span>
    </div>
  </div>
</div>

<div style="border:1px solid #000;margin:0 0 6px 0;">
  <div class="sh" style="border-bottom:1px solid #000;">۱۳- تأیید محل انجام مأموریت:</div>
  <div class="sd" style="font-size:9.5pt;min-height:50px;">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px;">
      <span>۱- نامبرده در تاریخ ............ ساعت ............ وارد کارگاه/منطقه/کارخانجات گردید.</span>
    </div>
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
      <span>۲- نامبرده در تاریخ ............ ساعت ............ از کارگاه/منطقه/کارخانجات خارج گردید.</span>
    </div>
    <div>مدیر منطقه/کارخانجات/سرپرست کارگاه</div>
  </div>
</div>

<div class="sgr" style="margin:0 0 6px 0;">
  <div style="border:1px solid #000;">
    <div class="sh" style="border-bottom:1px solid #000;">۱۴- مدیریت امور مالی:</div>
    <div class="sd" style="font-size:9.5pt;min-height:50px;">
      لطفاً نسبت به پرداخت اقدام نمایید.
      <div style="margin-top:6px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
        <span>نام و نام خانوادگی:</span><span>معاون مالی و پشتیبانی</span>
      </div>
      <div style="margin-top:10px;border-top:1px dashed #888;padding-top:6px;text-align:center;">امضاء</div>
    </div>
  </div>
  <div style="border:1px solid #000;">
    <div class="sh" style="border-bottom:1px solid #000;">۱۵- اداره دریافت و پرداخت:</div>
    <div class="sd" style="font-size:9.5pt;min-height:50px;">
      جهت بررسی و اقدام لازم
      <div style="margin-top:6px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
        <span>نام و نام خانوادگی : شهرام حسن سلطانی</span><span>مدیر امور مالی</span>
      </div>
      <div style="margin-top:10px;border-top:1px dashed #888;padding-top:6px;text-align:center;">امضاء</div>
    </div>
  </div>
</div>

<div class="ft">
  <span>شماره: ${esc(m.decree_num) || '........'}/ص۳۴</span>
  <span style="font-size:10pt;font-weight:bold;">نسخه: مالی</span>
  <span>تاریخ: ${esc(m.issue_date) || '...........'}</span>
</div>
</div></body></html>`;
}

module.exports = { buildMissionDecreeHTML };
