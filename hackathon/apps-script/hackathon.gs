/**
 * Qubito Hackathon 2026 - forms backend (applications + partner requests).
 * Same mechanism as the existing join-us form: the site POSTs the form to this
 * Apps Script web app, which appends a row to the Google Sheet it is attached to.
 *
 * - Applications go to the "Applications" tab. Every applicant gets an automatic confirmation
 *   email. Free Gmail accounts can send about 100 emails a day: when the quota runs out the
 *   email is queued (status "pending") and sent by an hourly trigger once quota is back.
 * - Partner requests (form=partner) go to the "Partners" tab and notify the team right away.
 * - Flood protection: honeypot field, minimum fill time, one confirmation per email address,
 *   a global cap on submissions per 10 minutes, and caps on emails.
 *
 * Setup, on the teamqubito@gmail.com account:
 * 1. Create a Google Sheet, e.g. "Qubito Hackathon 2026". Extensions > Apps Script, paste this file.
 * 2. Check the settings below. Project Settings (gear icon) > Time zone: Europe/Rome.
 * 3. Select the function "setup" in the toolbar and press Run once. Accept the permissions
 *    ("Google hasn't verified this app" > Advanced > Go to ...). This creates the two tabs with
 *    their header rows and installs the hourly trigger.
 * 4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 * 5. Copy the web app URL into APPS_SCRIPT_URL in the site's src/config.ts, then rebuild and upload.
 * 6. Later changes: Deploy > Manage deployments > edit (pencil) > Version: New version.
 *    That keeps the SAME URL. "New deployment" creates a new URL that must be updated in the site.
 */

// ---------- settings ----------
const TEAM_EMAIL = 'teamqubito@gmail.com'; // replies, daily digest, partner requests, alerts
const RESULTS_DATE = { en: '[date TBA]', it: '[data da definire]' };
const DEADLINE = null; // e.g. '2026-11-20T23:59:00+01:00'; after it applications are refused (same value as src/config.ts)
const QUOTA_RESERVE = 5;          // emails per day kept free for digest, partner notifications, alerts
const MAX_PER_10_MIN = 30;        // above this many submissions in 10 minutes the form answers BUSY
const MIN_FILL_SECONDS = { application: 20, partner: 5 }; // bots submit instantly, humans don't
const MAX_PARTNER_EMAILS_PER_DAY = 10;

// ---------- sheet layout (add new fields at the END so old rows stay aligned) ----------
const FORMS = {
  application: {
    tab: 'Applications',
    fields: ['name', 'surname', 'email', 'level', 'university', 'field', 'quantum', 'diet',
             'statement', 'consent', 'photo_consent', 'lang'],
    required: ['name', 'surname', 'email', 'level', 'university', 'field', 'quantum', 'statement'],
    extra: ['confirmation'], // sent / pending / duplicate / failed
  },
  partner: {
    tab: 'Partners',
    fields: ['company', 'contact', 'email', 'interest', 'message', 'lang'],
    required: ['company', 'contact', 'email', 'interest'],
    extra: [],
  },
};
const MAX_LEN = { statement: 1500, message: 1500, default: 200 };
const ALLOWED = {
  level: ['bachelor', 'master', 'phd', 'other'],
  quantum: ['curious', 'course', 'sdk', 'research'],
  interest: ['challenge', 'talk', 'sponsor', 'other'],
  lang: ['en', 'it'],
};

function setup() {
  Object.keys(FORMS).forEach(k => tab_(k));
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'hourly')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('hourly').timeBased().everyHours(1).create();
}

function doPost(e) {
  const data = (e && e.parameter) || {};
  const kind = data.form === 'partner' ? 'partner' : 'application';

  // Bots: hidden "website" field filled, or form submitted faster than a human could. Pretend OK.
  if (data.website) return text_('OK');
  const t0 = Number(data.t0);
  if (!t0 || Date.now() - t0 < MIN_FILL_SECONDS[kind] * 1000) return text_('OK');

  if (kind === 'application' && DEADLINE && Date.now() > Date.parse(DEADLINE)) return text_('CLOSED');
  if (overRateLimit_()) return text_('BUSY');

  const errors = validate_(kind, data);
  if (errors.length) return text_('INVALID: ' + errors.join(', '));

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return kind === 'partner' ? savePartner_(data) : saveApplication_(data);
  } finally {
    lock.releaseLock();
  }
}

function saveApplication_(data) {
  const f = FORMS.application, sheet = tab_('application');
  const header = ['timestamp'].concat(f.fields, f.extra);
  const duplicate = sheet.getRange(1, header.indexOf('email') + 1, sheet.getLastRow(), 1)
    .createTextFinder(safe_(data.email)).matchEntireCell(true).matchCase(false).findNext() !== null;
  // A duplicate is still saved (it may be a correction) but gets no second confirmation email,
  // so nobody can use the form to send many emails to the same address.
  sheet.appendRow([new Date()].concat(values_(f.fields, data), [duplicate ? 'duplicate' : 'pending']));
  if (!duplicate && quotaLeft_() > 0) sendConfirmation_(sheet, sheet.getLastRow());
  return text_(duplicate ? 'DUPLICATE' : 'OK');
}

function savePartner_(data) {
  const f = FORMS.partner, sheet = tab_('partner');
  sheet.appendRow([new Date()].concat(values_(f.fields, data)));
  // Rare and worth answering quickly: tell the team now, within a daily cap. No email to the sender.
  if (countToday_('partnerMails') < MAX_PARTNER_EMAILS_PER_DAY && MailApp.getRemainingDailyQuota() > 0) {
    MailApp.sendEmail(TEAM_EMAIL, 'Hackathon partner request: ' + safe_(data.company).slice(0, 60),
      'Company: ' + safe_(data.company) + '\nContact: ' + safe_(data.contact) + '\nEmail: ' + safe_(data.email) +
      '\nInterest: ' + data.interest + '\n\nSheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
    bumpToday_('partnerMails');
  }
  return text_('OK');
}

// Runs every hour: sends queued confirmations while quota allows, and the daily digest in the evening.
function hourly() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const sheet = tab_('application');
    const last = sheet.getLastRow();
    const col = statusCol_();
    if (last >= 2) {
      const status = sheet.getRange(2, col, last - 1, 1).getValues();
      for (let i = 0; i < status.length && quotaLeft_() > 0; i++) {
        if (status[i][0] === 'pending') sendConfirmation_(sheet, i + 2);
      }
    }
    sendDigest_(sheet);
  } finally {
    lock.releaseLock();
  }
}

function sendConfirmation_(sheet, row) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rec = sheet.getRange(row, 1, 1, header.length).getValues()[0];
  const get = f => String(rec[header.indexOf(f)] || '');
  const lang = get('lang') === 'it' ? 'it' : 'en';
  const name = get('name').replace(/^'/, '').slice(0, 80);
  const col = statusCol_();
  try {
    MailApp.sendEmail({
      to: get('email'),
      replyTo: TEAM_EMAIL,
      name: 'Qubito Hackathon',
      subject: lang === 'it' ? 'Abbiamo ricevuto la tua candidatura - Qubito Hackathon 2026'
                             : 'We received your application - Qubito Hackathon 2026',
      body: confirmationText_(lang, name),
    });
    sheet.getRange(row, col).setValue('sent ' + Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd HH:mm'));
  } catch (err) {
    // Quota errors stay pending and are retried by the trigger; anything else is marked failed.
    const msg = String(err);
    sheet.getRange(row, col).setValue(/quota|limit/i.test(msg) ? 'pending' : 'failed: ' + msg.slice(0, 100));
  }
}

// Fixed text. Only the first name is inserted, never the applicant's free-text answers.
function confirmationText_(lang, name) {
  if (lang === 'it') {
    return 'Ciao ' + name + ',\n\n' +
      'grazie per esserti candidato/a al Qubito Hackathon (11-13 dicembre 2026, Torino). Abbiamo ricevuto la tua candidatura.\n\n' +
      'Valuteremo tutte le candidature dopo la scadenza e ti scriveremo con l\'esito entro il ' + RESULTS_DATE.it + '. ' +
      'I team da 4 persone vengono formati in sede all\'inizio dell\'evento.\n\n' +
      'Questo è un messaggio automatico. Per qualsiasi domanda puoi rispondere a questa email.\n\n' +
      'Il team di Qubito\nhttps://qubito.polito.it/hackathon/';
  }
  return 'Hi ' + name + ',\n\n' +
    'thanks for applying to the Qubito Hackathon (11-13 December 2026, Torino). We received your application.\n\n' +
    'We will review all applications after the deadline and email you the result by ' + RESULTS_DATE.en + '. ' +
    'Teams of 4 are formed on site at the start of the event.\n\n' +
    'This is an automatic message. If you have questions, just reply to this email.\n\n' +
    'The Qubito team\nhttps://qubito.polito.it/hackathon/';
}

// One email a day to the team with the counts, instead of one email per application (saves quota).
function sendDigest_(sheet) {
  const props = PropertiesService.getScriptProperties();
  const today = today_();
  if (props.getProperty('digestDay') === today || new Date().getHours() < 20) return; // evening, once
  const rows = Math.max(sheet.getLastRow() - 1, 0);
  const status = rows ? sheet.getRange(2, statusCol_(), rows, 1).getValues().map(r => String(r[0])) : [];
  const stamps = rows ? sheet.getRange(2, 1, rows, 1).getValues() : [];
  const todayCount = stamps.filter(r => Utilities.formatDate(new Date(r[0]), 'Europe/Rome', 'yyyy-MM-dd') === today).length;
  const count = s => status.filter(x => x.indexOf(s) === 0).length;
  MailApp.sendEmail(TEAM_EMAIL, 'Hackathon applications: ' + todayCount + ' today, ' + rows + ' total',
    'Applications today: ' + todayCount + '\nTotal rows: ' + rows +
    '\nDuplicates (same email): ' + count('duplicate') +
    '\nConfirmations still queued: ' + count('pending') + '\nConfirmations failed: ' + count('failed') +
    '\n\nSheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  props.setProperty('digestDay', today);
}

// Global cap: counts submissions in 10-minute buckets. A real launch-day peak stays far below it;
// a script flooding the form hits it and gets BUSY, and the team gets one alert per hour.
function overRateLimit_() {
  const cache = CacheService.getScriptCache();
  const key = 'rate-' + Math.floor(Date.now() / 600000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 900);
  if (n <= MAX_PER_10_MIN) return false;
  if (!cache.get('alerted') && MailApp.getRemainingDailyQuota() > 0) {
    MailApp.sendEmail(TEAM_EMAIL, 'Hackathon form: unusual traffic',
      'More than ' + MAX_PER_10_MIN + ' submissions in 10 minutes. Extra submissions are being rejected. Check the sheet.');
    cache.put('alerted', '1', 3600);
  }
  return true;
}

function validate_(kind, d) {
  const f = FORMS[kind], errors = [];
  f.required.forEach(k => { if (!d[k] || !String(d[k]).trim()) errors.push(k + ' missing'); });
  f.fields.forEach(k => {
    if (d[k] && String(d[k]).length > (MAX_LEN[k] || MAX_LEN.default)) errors.push(k + ' too long');
  });
  Object.keys(ALLOWED).forEach(k => {
    if (f.fields.indexOf(k) !== -1 && d[k] && ALLOWED[k].indexOf(d[k]) === -1) errors.push(k + ' not allowed');
  });
  if (d.email && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(d.email)) errors.push('email invalid');
  if (kind === 'application' && d.consent !== 'on') errors.push('consent missing');
  return errors;
}

function values_(fields, data) {
  return fields.map(f => {
    if (f === 'consent' || f === 'photo_consent') return data[f] === 'on' ? 'yes' : 'no';
    return safe_(data[f]);
  });
}

function tab_(kind) {
  const f = FORMS[kind], ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(f.tab);
  if (!sheet) {
    const first = ss.getSheets()[0];
    // reuse the empty default "Sheet1" for the first tab
    sheet = (first.getLastRow() === 0 && ss.getSheets().length === 1 && kind === 'application')
      ? first.setName(f.tab) : ss.insertSheet(f.tab);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp'].concat(f.fields, f.extra));
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function statusCol_() {
  return 1 + FORMS.application.fields.length + 1; // timestamp + fields + confirmation
}

function quotaLeft_() {
  return MailApp.getRemainingDailyQuota() - QUOTA_RESERVE;
}

function today_() {
  return Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
}
function countToday_(name) {
  return Number(PropertiesService.getScriptProperties().getProperty(name + '-' + today_()) || 0);
}
function bumpToday_(name) {
  PropertiesService.getScriptProperties().setProperty(name + '-' + today_(), String(countToday_(name) + 1));
}

// Stop spreadsheet formula injection: a cell starting with = + - @ would run as a formula
function safe_(v) {
  const s = v == null ? '' : String(v).trim();
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function text_(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}
