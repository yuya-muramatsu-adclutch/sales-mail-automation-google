const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.env.APP_ROOT || path.resolve(__dirname, '..');
const files = ['Code.gs', 'Email.gs', 'Masters.gs', 'Operations.gs', 'Repository.gs', 'Serper.gs', 'WebApp.gs'];
const context = vm.createContext({ console, URL });
files.forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  new Function(source);
  vm.runInContext(source, context, { filename: file });
});
JSON.parse(fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8'));

const lockCalls = [];
let deliveryChecks = 0;
let masterBuilds = 0;
let mailLockDepth = 0;
context.withScriptLock_ = (operation, callback, options) => {
  lockCalls.push({ operation, options });
  mailLockDepth += 1;
  try {
    return callback();
  } finally {
    mailLockDepth -= 1;
  }
};
context.assertProductionMailDeliveryAllowed_ = () => { deliveryChecks += 1; };
context.getSettingValue_ = (key, fallback) => key === 'email_batch_send_limit' ? 20 : fallback;
context.buildMasterBlockContext_ = () => { masterBuilds += 1; return {}; };
context.prepareLeadEmailSend_ = (id) => {
  assert.strictEqual(mailLockDepth, 1);
  return { lead: { id } };
};
context.deliverPreparedLeadEmail_ = (prepared) => {
  assert.strictEqual(mailLockDepth, 0);
  return { ok: true, leadId: prepared.lead.id };
};
context.isExpectedOperationError_ = () => false;
context.logError_ = () => {};
const batch = context.sendLeadEmailBatch(['lead-1', 'lead-2', 'lead-1'], 'template-1', {});
assert.strictEqual(batch.total, 2);
assert.strictEqual(batch.success, 2);
assert.deepStrictEqual(lockCalls.map((item) => item.operation), ['prepareLeadEmailBatchItem', 'prepareLeadEmailBatchItem']);
assert(lockCalls.every((item) => item.options.waitMs === 6000 && item.options.attempts === 5));
assert.strictEqual(deliveryChecks, 1);
assert.strictEqual(masterBuilds, 0);

const unlockedMailContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), unlockedMailContext, { filename: file });
});
let unlockedMailDepth = 0;
const unlockedMailOperations = [];
const deliveryCheckDepths = [];
let finalizedLeadSend = 0;
const unlockedMailReceipts = {};
let unlockedReceiptWrites = 0;
let unlockedReceiptDeletes = 0;
unlockedMailContext.PropertiesService = {
  getScriptProperties: () => ({
    setProperty: (key, value) => {
      unlockedMailReceipts[key] = value;
      unlockedReceiptWrites += 1;
    },
    deleteProperty: (key) => {
      delete unlockedMailReceipts[key];
      unlockedReceiptDeletes += 1;
    },
    getProperties: () => Object.assign({}, unlockedMailReceipts),
  }),
};
unlockedMailContext.withScriptLock_ = (operation, callback, options) => {
  unlockedMailOperations.push({ operation, options });
  unlockedMailDepth += 1;
  try {
    return callback();
  } finally {
    unlockedMailDepth -= 1;
  }
};
unlockedMailContext.getSettingValue_ = (_key, fallback) => fallback;
unlockedMailContext.assertProductionMailDeliveryAllowed_ = () => { deliveryCheckDepths.push(unlockedMailDepth); };
unlockedMailContext.getLeadById = () => ({ id: 'lead-unlocked', email: 'safe@example.net', genre: 'キャンプ', send_count: 0 });
unlockedMailContext.findSheetRecordById_ = () => ({ id: 'template-unlocked', template_type: 'initial', is_production: true, active: true, genre: 'キャンプ', subject: 'Subject', body: 'Body' });
unlockedMailContext.validateEmailSendTemplate_ = () => {};
unlockedMailContext.buildMasterBlockContext_ = () => ({
  mailSendSafety: { sentLeadIds: {}, sentEmails: {}, reservedLeadIds: {}, reservedEmails: {}, successfulCountToday: 0, reservedCountToday: 0 },
});
unlockedMailContext.getEmailSendTargetBlockReason_ = () => '';
unlockedMailContext.assertEmailSendLimitAvailable_ = () => {};
unlockedMailContext.renderTemplateForLead_ = () => ({ subject: 'Subject', body: 'Body', htmlBody: 'Body' });
unlockedMailContext.nowIso_ = () => '2026-07-15T01:00:00.000Z';
unlockedMailContext.todayText_ = () => '2026-07-15';
unlockedMailContext.appendSheetRecord_ = (_sheet, record) => Object.assign({ id: 'reservation-unlocked' }, record);
unlockedMailContext.MailApp = {
  sendEmail: (payload) => {
    assert.strictEqual(unlockedMailDepth, 0, 'MailApp.sendEmail must run outside the script lock');
    assert.strictEqual(payload.name, '【Ad Clutch】村松 侑哉');
  },
};
unlockedMailContext.updateSheetRecord_ = (_sheet, _id, patch) => {
  assert.strictEqual(unlockedMailDepth, 1);
  return Object.assign({ id: 'reservation-unlocked' }, patch);
};
unlockedMailContext.updateLeadAfterSend_ = () => {
  assert.strictEqual(unlockedMailDepth, 1);
  finalizedLeadSend += 1;
};
unlockedMailContext.logError_ = () => {};
const unlockedMailResult = unlockedMailContext.sendLeadEmail('lead-unlocked', 'template-unlocked', {});
assert.strictEqual(unlockedMailResult.ok, true);
assert.strictEqual(finalizedLeadSend, 1);
assert.deepStrictEqual(unlockedMailOperations.map((item) => item.operation), ['prepareLeadEmailSend', 'finalizeLeadEmailSend']);
assert.strictEqual(unlockedMailOperations[1].options.waitMs, 6000);
assert.strictEqual(unlockedMailOperations[1].options.attempts, 5);
assert.strictEqual(unlockedMailOperations[1].options.retryDelayMs, 400);
assert.strictEqual(unlockedReceiptWrites, 1, 'a delivery outcome must be persisted before tracking finalization');
assert.strictEqual(unlockedReceiptDeletes, 1, 'a fully tracked delivery must clear its receipt');
assert.deepStrictEqual(unlockedMailReceipts, {});
assert.deepStrictEqual(deliveryCheckDepths, [1, 0]);
let aliasSendPayload = null;
unlockedMailContext.getSettingValue_ = (key, fallback) => key === 'gmail_sender_email' ? 'sales@adclutch.example' : fallback;
unlockedMailContext.Session = { getEffectiveUser: () => ({ getEmail: () => 'owner@gmail.com' }) };
unlockedMailContext.GmailApp = {
  getAliases: () => ['sales@adclutch.example'],
  sendEmail: (to, subject, body, options) => {
    assert.strictEqual(unlockedMailDepth, 0, 'GmailApp.sendEmail must run outside the script lock');
    aliasSendPayload = { to, subject, body, options };
  },
};
unlockedMailContext.MailApp.sendEmail = () => { throw new Error('configured aliases must use GmailApp.sendEmail'); };
unlockedMailContext.sendGmailMessage_({
  to: 'lead@example.net',
  subject: 'Alias subject',
  body: 'Alias body',
  htmlBody: '<p>Alias body</p>',
  name: '【Ad Clutch】村松 侑哉',
});
assert.strictEqual(aliasSendPayload.options.from, 'sales@adclutch.example');
assert.strictEqual(aliasSendPayload.options.replyTo, 'sales@adclutch.example');
assert.strictEqual(aliasSendPayload.options.name, '【Ad Clutch】村松 侑哉');
let primarySendPayload = null;
unlockedMailContext.getSettingValue_ = (key, fallback) => key === 'gmail_sender_email' ? 'yuya.adclutch@gmail.com' : fallback;
unlockedMailContext.GmailApp = {
  getAliases: () => { throw new Error('primary sender must not query aliases during delivery'); },
  sendEmail: (to, subject, body, options) => {
    primarySendPayload = { to, subject, body, options };
  },
};
unlockedMailContext.sendGmailMessage_({
  to: 'lead@example.net',
  subject: 'Primary subject',
  body: 'Primary body',
  htmlBody: '<p>Primary body</p>',
  name: '【Ad Clutch】村松 侑哉',
});
assert.strictEqual(primarySendPayload.options.from, undefined);
assert.strictEqual(primarySendPayload.options.replyTo, 'yuya.adclutch@gmail.com');

const leadBreakdownContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), leadBreakdownContext, { filename: file });
});
leadBreakdownContext.isEmailSendTarget_ = (lead) => lead.fixture === 'email_sendable';
leadBreakdownContext.isFormSendTarget_ = (lead) => lead.fixture === 'form_sendable';
leadBreakdownContext.isLeadReviewPending_ = (lead) => lead.fixture === 'review';
const leadStateFixtures = [
  { fixture: 'email_sendable', email: 'mail@example.com', status: '未対応' },
  { fixture: 'form_sendable', form_url: 'https://example.com/contact', status: '未対応' },
  { fixture: 'review', website_url: 'https://review.example', status: '未対応' },
  { fixture: 'no_contact', status: '対応中' },
  { fixture: 'sent', email: 'sent@example.com', send_count: 1, status: '初回メール送信済み' },
  { fixture: 'reply', email: 'reply@example.com', reply_checked: true, status: '返信あり' },
  { fixture: 'deal', email: 'deal@example.com', deal_status: '商談予定', status: '商談予定' },
  { fixture: 'won', email: 'won@example.com', deal_status: '受注', status: '受注' },
  { fixture: 'lost', email: 'lost@example.com', deal_status: '失注', status: '失注' },
  { fixture: 'send_ng', send_ng: true, status: '送信NG' },
  { fixture: 'no_action', status: '対応不要' },
  { fixture: 'form_in_progress', form_url: 'https://form-progress.example', status: 'フォーム対応中' },
  { fixture: 'form_completed', form_url: 'https://form-complete.example', status: 'フォーム対応済み' },
  { fixture: 'other', email: 'held@adclutch.jp', status: '対応中' },
];
const leadStateBreakdown = JSON.parse(JSON.stringify(leadBreakdownContext.buildLeadListStateBreakdown_(leadStateFixtures, {})));
assert.strictEqual(leadStateBreakdown.reduce((sum, item) => sum + item.count, 0), leadStateFixtures.length);
leadStateBreakdown.forEach((item) => assert.strictEqual(item.count, 1, `${item.key} must be mutually exclusive`));
const leadStateGroups = JSON.parse(JSON.stringify(leadBreakdownContext.buildLeadListStateGroups_(leadStateBreakdown)));
assert.deepStrictEqual(leadStateGroups.map((item) => [item.key, item.count]), [
  ['ready', 2],
  ['review', 2],
  ['active', 4],
  ['no_contact', 1],
  ['send_ng', 1],
  ['closed', 4],
]);
assert.strictEqual(leadStateGroups.reduce((sum, item) => sum + item.count, 0), leadStateFixtures.length);
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[7], 'state_won', {}), true);
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[7], 'state_lost', {}), false);
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[4], 'group_active', {}), true);
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[8], 'group_active', {}), false);
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[3], 'no_contact', {}), true);
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[9], 'no_contact', {}), false, 'send NG without contact details must not appear in no-contact results');
assert.strictEqual(leadBreakdownContext.matchesLeadListFilter_(leadStateFixtures[9], 'send_ng', {}), true);
assert.strictEqual(leadBreakdownContext.normalizeListOptions_({ includeStats: false }).includeStats, false);
assert.strictEqual(leadBreakdownContext.normalizeListOptions_({}).includeStats, true);
const leanListContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), leanListContext, { filename: file });
});
let leanListMasterBuilds = 0;
let leanListStatBuilds = 0;
leanListContext.getOrCreateSpreadsheet_ = () => ({});
leanListContext.ensureSheet_ = () => ({});
leanListContext.readSheetRecordFields_ = () => [
  { id: 'lean-a', company_name: 'A', status: '未対応', updated_at: '2026-07-19T00:00:00Z' },
  { id: 'lean-b', company_name: 'B', status: '対応中', updated_at: '2026-07-18T00:00:00Z' },
];
leanListContext.buildLeadListMasterContext_ = () => { leanListMasterBuilds += 1; return {}; };
leanListContext.buildLeadListStats_ = (rows) => { leanListStatBuilds += 1; return { totalLeadCount: rows.length }; };
const leanListResult = leanListContext.listLeads({ filter: 'all', includeStats: false, limit: 10 });
assert.strictEqual(leanListResult.total, 2);
assert.strictEqual(Object.prototype.hasOwnProperty.call(leanListResult, 'stats'), false);
assert.strictEqual(leanListMasterBuilds, 0, 'lean list routes must skip master context when their filter does not need it');
assert.strictEqual(leanListStatBuilds, 0, 'lean list routes must skip aggregate statistics');
const fullListResult = leanListContext.listLeads({ filter: 'all', limit: 10 });
assert.strictEqual(fullListResult.stats.totalLeadCount, 2);
assert.strictEqual(leanListMasterBuilds, 1);
assert.strictEqual(leanListStatBuilds, 2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(leanListContext.leadListFields_([]))), [
  'id', 'source', 'genre', 'company_name', 'facility_name', 'email', 'website_url', 'form_url',
  'status', 'send_ng', 'reply_checked', 'form_status', 'next_send_at', 'last_sent_at', 'send_count',
  'deal_status', 'created_at', 'updated_at', 'archived_at',
]);
assert(!leanListContext.leadListFields_([]).includes('address'));
assert(!leanListContext.leadListFields_([]).includes('notes'));
assert(leanListContext.leadListFields_(['address', 'custom_fields_json']).includes('address'));
assert(leanListContext.leadListFields_(['address', 'custom_fields_json']).includes('custom_fields_json'));
const cachedLeadListContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), cachedLeadListContext, { filename: file });
});
const leadListScriptCache = new Map();
const leadListProperties = {};
let cachedLeadListReads = 0;
cachedLeadListContext.CacheService = {
  getScriptCache: () => ({
    get: (key) => leadListScriptCache.get(key) || null,
    put: (key, value) => { leadListScriptCache.set(key, value); },
  }),
};
cachedLeadListContext.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => leadListProperties[key] || '',
    setProperty: (key, value) => { leadListProperties[key] = value; },
  }),
};
cachedLeadListContext.readSheetRecordFields_ = () => {
  cachedLeadListReads += 1;
  return [{ id: 'cached-lead', company_name: 'Cached', status: '未対応', updated_at: '2026-07-20T00:00:00Z' }];
};
const firstCachedLeadList = cachedLeadListContext.listLeads({ includeStats: false, limit: 50 });
const secondCachedLeadList = cachedLeadListContext.listLeads({ includeStats: false, limit: 50 });
assert.strictEqual(firstCachedLeadList.cacheHit, false);
assert.strictEqual(secondCachedLeadList.cacheHit, true);
assert.strictEqual(cachedLeadListReads, 1, 'identical lead list filters must reuse the server cache');
cachedLeadListContext.bumpLeadListCacheRevision_();
cachedLeadListContext.listLeads({ includeStats: false, limit: 50 });
assert.strictEqual(cachedLeadListReads, 2, 'lead list cache revision changes must invalidate old filter results');
const primaryFilterBundleContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), primaryFilterBundleContext, { filename: file });
});
const primaryFilterCache = new Map();
const primaryFilterProperties = {};
let primaryFilterReads = 0;
primaryFilterBundleContext.CacheService = {
  getScriptCache: () => ({
    get: (key) => primaryFilterCache.get(key) || null,
    put: (key, value) => { primaryFilterCache.set(key, value); },
  }),
};
primaryFilterBundleContext.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => primaryFilterProperties[key] || '',
    setProperty: (key, value) => { primaryFilterProperties[key] = value; },
  }),
};
primaryFilterBundleContext.readSheetRecordFields_ = () => {
  primaryFilterReads += 1;
  return leadStateFixtures.map((lead, index) => Object.assign({
    id: `primary-${index}`,
    source: index === 2 ? 'source_page' : 'manual',
    genre: 'テスト',
    form_status: '未対応',
    deal_status: '未設定',
    updated_at: `2026-07-20T00:${String(index).padStart(2, '0')}:00Z`,
  }, lead));
};
primaryFilterBundleContext.buildLeadListMasterContext_ = () => ({});
const readyPrimaryList = primaryFilterBundleContext.listLeads({
  filter: 'group_ready',
  genre: 'テスト',
  includeStats: false,
  limit: 50,
});
const noContactPrimaryList = primaryFilterBundleContext.listLeads({
  filter: 'group_no_contact',
  genre: 'テスト',
  includeStats: false,
  limit: 50,
});
assert.strictEqual(readyPrimaryList.total, 2);
assert(noContactPrimaryList.items.some((lead) => lead.fixture === 'no_contact'));
assert.strictEqual(noContactPrimaryList.cacheHit, true, 'switching primary lead filters must reuse the bundled cache');
assert.strictEqual(primaryFilterReads, 1, 'primary filter bundle must avoid another full lead-sheet read');
unlockedMailContext.getOrCreateSpreadsheet_ = () => ({});
unlockedMailContext.ensureSheet_ = () => ({});
const unlockedMailHistoryFixtures = [
  { lead_id: 'sent', to_email: 'sent@example.net', sent_at: '2026-07-15T00:00:00Z', send_result: '成功', send_type: '初回メール' },
  { lead_id: 'reserved', to_email: 'reserved@example.net', sent_at: '2026-07-15T00:01:00Z', send_result: '送信中', send_type: '初回メール' },
];
unlockedMailContext.readSheetRecords_ = () => unlockedMailHistoryFixtures;
let mailSafetyRequestedFields = [];
unlockedMailContext.readSheetRecordFields_ = (_sheetName, fields) => {
  mailSafetyRequestedFields = fields.slice();
  return unlockedMailHistoryFixtures;
};
const dailyMailSafety = unlockedMailContext.buildMailSendSafetyContext_();
assert.strictEqual(dailyMailSafety.successfulCountToday, 1);
assert.strictEqual(dailyMailSafety.reservedCountToday, 1);
assert.deepStrictEqual(JSON.parse(JSON.stringify(mailSafetyRequestedFields)), ['id', 'lead_id', 'sent_at', 'send_type', 'to_email', 'send_result', 'created_at']);
assert(!mailSafetyRequestedFields.includes('subject'));
assert(!mailSafetyRequestedFields.includes('body'));
assert(!mailSafetyRequestedFields.includes('error_message'));
const mailSafetyFullTextFixture = unlockedMailHistoryFixtures.map((history) => Object.assign({}, history, {
  subject: '不要な件名',
  body: '不要な本文'.repeat(1000),
  error_message: '不要なエラー詳細'.repeat(1000),
}));
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(unlockedMailContext.buildMailSendSafetyContext_(mailSafetyFullTextFixture))),
  JSON.parse(JSON.stringify(unlockedMailContext.buildMailSendSafetyContext_(unlockedMailHistoryFixtures))),
  'mail safety decisions must not depend on large history text fields'
);
const dailyLimitContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), dailyLimitContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), dailyLimitContext, { filename: 'Email.gs' });
dailyLimitContext.getSettingValue_ = () => 2;
dailyLimitContext.MailApp = { getRemainingDailyQuota: () => 100 };
assert.throws(() => dailyLimitContext.assertEmailSendLimitAvailable_({ includeReservations: true, safety: dailyMailSafety }), /Daily app mail limit reached/);

const mailReceiptContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), mailReceiptContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), mailReceiptContext, { filename: 'Email.gs' });
const mailReceiptProperties = { UNRELATED_SETTING: 'keep' };
const receiptHistories = {
  'receipt-success': {
    id: 'receipt-success', lead_id: 'lead-success', sent_at: '2026-07-19T01:00:00.000Z',
    send_type: '初回メール', send_result: '送信中', error_message: '',
  },
  'receipt-failure': {
    id: 'receipt-failure', lead_id: 'lead-failure', sent_at: '2026-07-19T01:01:00.000Z',
    send_type: '初回メール', send_result: '送信中', error_message: '',
  },
};
const receiptLeads = {
  'lead-success': { id: 'lead-success', status: '返信あり', reply_checked: true, send_count: 7, last_sent_at: '' },
  'lead-failure': { id: 'lead-failure', status: '未対応', reply_checked: false, send_count: 0, last_sent_at: '' },
};
const receiptLockCalls = [];
const receiptLoggedErrors = [];
mailReceiptContext.PropertiesService = {
  getScriptProperties: () => ({
    setProperty: (key, value) => { mailReceiptProperties[key] = value; },
    deleteProperty: (key) => { delete mailReceiptProperties[key]; },
    getProperties: () => Object.assign({}, mailReceiptProperties),
  }),
};
mailReceiptContext.nowIso_ = () => '2026-07-19T01:05:00.000Z';
mailReceiptContext.withScriptLock_ = (operation, callback, options) => {
  receiptLockCalls.push({ operation, options });
  return callback();
};
mailReceiptContext.findSheetRecordById_ = (_sheet, id) => receiptHistories[id] ? Object.assign({}, receiptHistories[id]) : null;
mailReceiptContext.updateSheetRecord_ = (_sheet, id, patch) => {
  receiptHistories[id] = Object.assign({}, receiptHistories[id], patch);
  return Object.assign({}, receiptHistories[id]);
};
mailReceiptContext.getLeadById = (id) => receiptLeads[id] ? Object.assign({}, receiptLeads[id]) : null;
mailReceiptContext.getOrCreateSpreadsheet_ = () => ({});
mailReceiptContext.ensureSheet_ = () => ({});
mailReceiptContext.readSheetRecords_ = () => Object.keys(receiptHistories).map((id) => Object.assign({}, receiptHistories[id]));
mailReceiptContext.findSheetRecordsByExactFieldValues_ = (_sheet, _field, values) => Object.keys(receiptHistories)
  .map((id) => Object.assign({}, receiptHistories[id]))
  .filter((history) => values.includes(history.lead_id));
mailReceiptContext.updateLeadAfterSend_ = (id, patch) => {
  receiptLeads[id] = Object.assign({}, receiptLeads[id], patch);
};
mailReceiptContext.isExpectedOperationError_ = () => false;
mailReceiptContext.logError_ = (operation, error) => { receiptLoggedErrors.push({ operation, error: error.message }); };
assert.strictEqual(mailReceiptContext.recordMailDeliveryReceipt_(receiptHistories['receipt-success'], '成功', '').persisted, true);
assert.strictEqual(mailReceiptContext.recordMailDeliveryReceipt_(receiptHistories['receipt-failure'], '失敗', 'SMTP rejected').persisted, true);
assert.strictEqual(mailReceiptContext.listMailDeliveryReceipts_().length, 2);
const receiptRecovery = mailReceiptContext.reconcileMailDeliveryReceipts_(Object.values(receiptHistories), { maxItems: 20 });
assert.strictEqual(receiptRecovery.found, 2);
assert.strictEqual(receiptRecovery.processed, 2);
assert.strictEqual(receiptRecovery.recoveredSuccess, 1);
assert.strictEqual(receiptRecovery.recoveredFailure, 1);
assert.strictEqual(receiptRecovery.errors.length, 0);
assert.strictEqual(receiptHistories['receipt-success'].send_result, '成功');
assert.strictEqual(receiptHistories['receipt-failure'].send_result, '失敗');
assert.strictEqual(receiptHistories['receipt-failure'].error_message, 'SMTP rejected');
assert.strictEqual(receiptLeads['lead-success'].send_count, 1, 'receipt recovery must repair lead send counts from successful history');
assert.strictEqual(receiptLeads['lead-success'].last_sent_at, '2026-07-19T01:00:00.000Z');
assert.strictEqual(receiptLeads['lead-success'].status, '返信あり', 'receipt recovery must preserve a later reply status');
assert.strictEqual(receiptLeads['lead-failure'].send_count, 0);
assert.deepStrictEqual(JSON.parse(JSON.stringify(mailReceiptContext.listMailDeliveryReceipts_())), []);
assert.strictEqual(mailReceiptProperties.UNRELATED_SETTING, 'keep');
assert(receiptLockCalls.every((item) => item.operation === 'reconcileMailDeliveryReceipt'));
assert(receiptLockCalls.every((item) => item.options.waitMs === 6000 && item.options.attempts === 5));
receiptHistories['receipt-error'] = {
  id: 'receipt-error', lead_id: 'lead-success', sent_at: '2026-07-19T01:02:00.000Z',
  send_type: '初回メール', send_result: '送信中', error_message: '',
};
mailReceiptContext.recordMailDeliveryReceipt_(receiptHistories['receipt-error'], '成功', '');
mailReceiptContext.findSheetRecordById_ = (_sheet, id) => {
  if (id === 'receipt-error') throw new Error('temporary sheet failure');
  return receiptHistories[id] ? Object.assign({}, receiptHistories[id]) : null;
};
const failedReceiptRecovery = mailReceiptContext.reconcileMailDeliveryReceipts_([receiptHistories['receipt-error']], { maxItems: 20 });
assert.strictEqual(failedReceiptRecovery.processed, 0);
assert.strictEqual(failedReceiptRecovery.errors.length, 1);
assert(mailReceiptProperties['MAIL_DELIVERY_RECEIPT_V1_receipt-error'], 'a failed reconciliation must retain its receipt for the next run');
assert.strictEqual(receiptLoggedErrors.length, 1);

let creditFetches = 0;
let fetchesObservedAtLock = -1;
let creditWriteCount = 0;
context.nowIso_ = () => '2026-07-15T00:00:00.000Z';
context.PropertiesService = {
  getScriptProperties: () => ({ getProperty: () => 'legacy-key' }),
};
context.Utilities = { getUuid: () => 'uuid-1' };
context.readSerperApiKeyRecords_ = () => [{
  id: 'key-1', key: 'secret-key', active: true, role: 'main', name: 'main', source: 'managed',
}];
context.fetchSerperCreditInfo_ = () => {
  creditFetches += 1;
  return { ok: true, remaining: 25 };
};
context.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'refreshSerperCredits:save');
  assert.strictEqual(options.waitMs, 6000);
  assert.strictEqual(options.attempts, 5);
  fetchesObservedAtLock = creditFetches;
  return callback();
};
context.mergeSerperCreditRecord_ = (record) => Object.assign({}, record, { last_remaining: 25 });
context.harmonizeSerperCreditRecords_ = (records) => records;
context.writeSerperApiKeyRecords_ = () => { creditWriteCount += 1; };
context.syncPrimarySerperApiKeyProperty_ = () => {};
context.buildSerperApiKeyManagerInfo_ = (message) => ({ message });
const creditResult = context.refreshSerperCredits();
assert.strictEqual(creditFetches, 1);
assert.strictEqual(fetchesObservedAtLock, 1);
assert.strictEqual(creditWriteCount, 1);
assert.strictEqual(creditResult.message, 'Serper残量を確認しました。');

context.getSettingValue_ = (_key, fallback) => fallback;
context.buildSearchJobRunWindow_ = (budget, startedAt) => ({ deadlineMs: startedAt + budget, startedAtMs: startedAt });
context.isSearchJobRuntimeExhausted_ = () => false;
const originalReadAllSheetRecordsByName = context.readAllSheetRecordsByName_;
const originalFindSheetRecordsByExactFieldValues = context.findSheetRecordsByExactFieldValues_;
let queuedJobSheetReads = 0;
const queuedSearchJobs = [
  { id: 'job-1', status: 'queued', query_json: '{}', updated_at: '1' },
  { id: 'job-2', status: 'queued', query_json: '{}', updated_at: '2' },
  { id: 'job-3', status: 'queued', query_json: '{}', updated_at: '3' },
  { id: 'job-4', status: 'queued', query_json: '{}', updated_at: '4' },
  { id: 'job-5', status: 'queued', query_json: '{}', updated_at: '5' },
];
context.findSheetRecordsByExactFieldValues_ = (sheetName) => {
  queuedJobSheetReads += 1;
  return sheetName === 'search_jobs' ? queuedSearchJobs : [];
};
let queuedWorkerClaims = 0;
let queuedWorkerReleases = 0;
let queuedStaleRecoveries = 0;
const queuedWorkerStatuses = [];
context.claimBackgroundWorkerRun_ = () => {
  queuedWorkerClaims += 1;
  return { claimed: true, busy: false, lockToken: `worker-${queuedWorkerClaims}`, recoveredStaleClaim: false };
};
context.releaseBackgroundWorkerRun_ = (lockToken) => {
  assert.strictEqual(lockToken, `worker-${queuedWorkerReleases + 1}`);
  queuedWorkerReleases += 1;
  return true;
};
context.recordBackgroundWorkerStatus_ = (status) => { queuedWorkerStatuses.push(status); };
context.recoverStaleSearchJobs_ = () => {
  queuedStaleRecoveries += 1;
  return [];
};
context.recoverStaleCsvPreparationJobs_ = () => 0;
context.advanceSearchJob = (id) => ({ id, completed: id === 'job-1' });
context.appendSyncError_ = () => {};
let qualityMigrationRuns = 0;
context.getLeadCollectionQualityMigrationV215Status_ = () => ({ ok: true, pending: true, completed: false });
context.runLeadCollectionQualityMigrationV215_ = () => {
  qualityMigrationRuns += 1;
  return { ok: true, pending: false, skipped: false, cleanup: { done: true } };
};
let dashboardRefreshCalls = 0;
context.refreshDashboardStatsCacheIfDue_ = () => {
  dashboardRefreshCalls += 1;
  return { refreshed: true, skipped: false, reason: 'dirty' };
};
const queuedResumeDelays = [];
context.ensureImmediateBackgroundJobTriggerBestEffort_ = (delayMs) => {
  queuedResumeDelays.push(delayMs);
  return { result: { created: true }, warning: '' };
};
const queue = context.advanceQueuedJobs({ maxJobs: 2, runtimeBudgetMs: 300000 });
assert.strictEqual(queue.jobs.length, 2);
assert.strictEqual(queue.remainingJobs, 4);
assert.strictEqual(queue.resumable, true);
assert.strictEqual(queue.collectionQualityMigration.pending, true);
assert.strictEqual(queue.collectionQualityMigration.reason, 'jobs_pending');
assert.strictEqual(qualityMigrationRuns, 0, 'maintenance must not consume runtime while user jobs are pending');
assert.strictEqual(queue.dashboardCacheRefresh.refreshed, false);
assert.strictEqual(queue.dashboardCacheRefresh.reason, 'jobs_pending');
assert.strictEqual(dashboardRefreshCalls, 0);
assert.strictEqual(queuedResumeDelays[0], 5000, 'unfinished jobs must receive an immediate continuation trigger');
const shortQueue = context.advanceQueuedJobs({ maxJobs: 1, runtimeBudgetMs: 80000 });
assert.strictEqual(shortQueue.dashboardCacheRefresh.reason, 'jobs_pending');
assert.strictEqual(shortQueue.collectionQualityMigration.reason, 'jobs_pending');
assert.strictEqual(qualityMigrationRuns, 0, 'quality migration must preserve runtime for pending jobs');
assert.strictEqual(dashboardRefreshCalls, 0, 'dashboard refresh must preserve runtime for pending jobs');
assert.strictEqual(queuedWorkerClaims, 2);
assert.strictEqual(queuedWorkerReleases, 2, 'every completed worker must release its claim');
assert.deepStrictEqual(queuedWorkerStatuses, ['running', 'idle', 'running', 'idle']);
const jobReadsBeforeBusyWorker = queuedJobSheetReads;
const staleRecoveriesBeforeBusyWorker = queuedStaleRecoveries;
context.claimBackgroundWorkerRun_ = () => ({
  claimed: false,
  busy: true,
  reason: 'already_running',
  claim: { busy: true, source: 'trigger', startedAt: '2026-07-19T00:00:00.000Z', expiresAt: '2026-07-19T00:07:00.000Z', stale: false },
});
const busyQueue = context.advanceQueuedJobs({ maxJobs: 2, runtimeBudgetMs: 300000, source: 'manual_repair' });
assert.strictEqual(busyQueue.skipped, true);
assert.strictEqual(busyQueue.busy, true);
assert.strictEqual(busyQueue.reason, 'already_running');
assert.strictEqual(busyQueue.remainingJobs, null);
assert.strictEqual(queuedResumeDelays[2], 30000, 'a busy immediate worker must re-arm a delayed continuation');
assert.strictEqual(queuedJobSheetReads, jobReadsBeforeBusyWorker, 'a busy worker must not read job sheets');
assert.strictEqual(queuedStaleRecoveries, staleRecoveriesBeforeBusyWorker, 'a busy worker must not run stale recovery');
assert.strictEqual(queuedWorkerReleases, 2, 'a worker that did not acquire ownership must not release it');

const workerFailureContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), workerFailureContext, { filename: file });
});
const workerFailureStatuses = [];
let workerFailureReleases = 0;
workerFailureContext.getSettingValue_ = (_key, fallback) => fallback;
workerFailureContext.claimBackgroundWorkerRun_ = () => ({ claimed: true, busy: false, lockToken: 'failure-worker' });
workerFailureContext.releaseBackgroundWorkerRun_ = (lockToken) => {
  assert.strictEqual(lockToken, 'failure-worker');
  workerFailureReleases += 1;
  return true;
};
workerFailureContext.recordBackgroundWorkerStatus_ = (status, detail) => {
  workerFailureStatuses.push({ status, detail });
};
let workerFailureRetryDelay = 0;
workerFailureContext.ensureImmediateBackgroundJobTriggerBestEffort_ = (delayMs) => {
  workerFailureRetryDelay = delayMs;
  return { result: { created: true }, warning: '' };
};
workerFailureContext.recoverStaleSearchJobs_ = () => { throw new Error('recovery exploded'); };
assert.throws(() => workerFailureContext.advanceQueuedJobs({ source: 'trigger' }), /recovery exploded/);
assert.deepStrictEqual(workerFailureStatuses.map((item) => item.status), ['running', 'failed']);
assert.match(workerFailureStatuses[1].detail.error, /recovery exploded/);
assert.strictEqual(workerFailureStatuses[1].detail.recoveryScheduled, true);
assert.strictEqual(workerFailureRetryDelay, 60000, 'unexpected worker failures must schedule a delayed retry');
assert.strictEqual(workerFailureReleases, 1, 'a failed worker must release its claim in finally');

const workerClaimContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), workerClaimContext, { filename: file });
});
const workerClaimProperties = {};
let workerUuid = 0;
const workerClaimLocks = [];
workerClaimContext.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => workerClaimProperties[key] || '',
    setProperty: (key, value) => { workerClaimProperties[key] = value; },
    deleteProperty: (key) => { delete workerClaimProperties[key]; },
  }),
};
workerClaimContext.Utilities = { getUuid: () => `worker-uuid-${++workerUuid}` };
workerClaimContext.withScriptLock_ = (operation, callback, options) => {
  workerClaimLocks.push({ operation, options });
  return callback();
};
const claimNowMs = Date.parse('2026-07-19T01:00:00.000Z');
workerClaimProperties.BACKGROUND_WORKER_CLAIM_JSON = JSON.stringify({
  token: 'existing-worker',
  source: 'trigger',
  startedAt: '2026-07-19T00:59:00.000Z',
  expiresAt: '2026-07-19T01:05:00.000Z',
});
const activeWorkerClaim = workerClaimContext.claimBackgroundWorkerRun_({ source: 'manual_repair', runtimeBudgetMs: 180000, nowMs: claimNowMs });
assert.strictEqual(activeWorkerClaim.claimed, false);
assert.strictEqual(activeWorkerClaim.busy, true);
assert.strictEqual(activeWorkerClaim.claim.source, 'trigger');
assert.strictEqual(Object.prototype.hasOwnProperty.call(activeWorkerClaim.claim, 'token'), false, 'claim summaries must not expose ownership tokens');
workerClaimProperties.BACKGROUND_WORKER_CLAIM_JSON = JSON.stringify({
  token: 'stale-worker',
  source: 'trigger',
  startedAt: '2026-07-19T00:40:00.000Z',
  expiresAt: '2026-07-19T00:50:00.000Z',
});
const recoveredWorkerClaim = workerClaimContext.claimBackgroundWorkerRun_({ source: 'manual_repair', runtimeBudgetMs: 180000, nowMs: claimNowMs });
assert.strictEqual(recoveredWorkerClaim.claimed, true);
assert.strictEqual(recoveredWorkerClaim.recoveredStaleClaim, true);
assert.strictEqual(recoveredWorkerClaim.lockToken, 'worker-uuid-1');
assert.strictEqual(workerClaimContext.releaseBackgroundWorkerRun_('wrong-token'), false);
assert(workerClaimProperties.BACKGROUND_WORKER_CLAIM_JSON, 'a mismatched release must preserve the active claim');
assert.strictEqual(workerClaimContext.releaseBackgroundWorkerRun_('worker-uuid-1'), true);
assert.strictEqual(workerClaimProperties.BACKGROUND_WORKER_CLAIM_JSON, undefined);
assert.deepStrictEqual(workerClaimLocks.map((item) => item.operation), [
  'claimBackgroundWorkerRun',
  'claimBackgroundWorkerRun',
  'releaseBackgroundWorkerRun',
  'releaseBackgroundWorkerRun',
]);
assert(workerClaimLocks.every((item) => item.options.waitMs === 5000));
workerClaimProperties.BACKGROUND_WORKER_STATUS_JSON = JSON.stringify({ status: 'running' });
workerClaimProperties.BACKGROUND_WORKER_CLAIM_JSON = JSON.stringify({
  token: 'health-worker-token',
  source: 'trigger',
  startedAt: new Date(Date.now() - 1000).toISOString(),
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
workerClaimContext.findSheetRecordsByExactFieldValues_ = () => [];
workerClaimContext.ScriptApp = {
  getProjectTriggers: () => [{ getHandlerFunction: () => 'advanceQueuedJobs' }],
};
const activeWorkerHealth = workerClaimContext.getBackgroundWorkerHealth();
assert.strictEqual(activeWorkerHealth.ok, true);
assert.strictEqual(activeWorkerHealth.workerClaim.busy, true);
assert.strictEqual(activeWorkerHealth.workerClaim.stale, false);
assert.strictEqual(JSON.stringify(activeWorkerHealth).includes('health-worker-token'), false, 'worker health must not expose ownership tokens');
workerClaimProperties.BACKGROUND_WORKER_CLAIM_JSON = JSON.stringify({
  token: 'stale-health-token',
  source: 'trigger',
  startedAt: new Date(Date.now() - 120000).toISOString(),
  expiresAt: new Date(Date.now() - 60000).toISOString(),
});
const staleWorkerHealth = workerClaimContext.getBackgroundWorkerHealth();
assert.strictEqual(staleWorkerHealth.workerClaim.busy, false);
assert.strictEqual(staleWorkerHealth.workerClaim.stale, true);

const activeJobLookupContext = vm.createContext({ console });
['Code.gs', 'Repository.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), activeJobLookupContext, { filename: file });
});
const activeJobLookupHeaders = ['id', 'status', 'query_json'];
const activeJobLookupRows = {
  2: ['completed-1', 'completed', '{}'],
  3: ['queued-1', 'queued', '{"kind":"queued"}'],
  4: ['running-1', 'running', '{"kind":"running"}'],
  5: ['failed-1', 'failed', '{}'],
};
let activeJobFullRowReads = 0;
const activeJobRecordRanges = [];
const activeJobLookupSheet = {
  getLastColumn: () => activeJobLookupHeaders.length,
  getLastRow: () => 5,
  getRange: (row, column, rowCount, columnCount) => {
    if (row === 1) return { getValues: () => [activeJobLookupHeaders] };
    if (row === 2 && column === 2 && rowCount === 4 && columnCount === 1) {
      return {
        createTextFinder: (value) => {
          const finder = {
            matchEntireCell: () => finder,
            matchCase: () => finder,
            useRegularExpression: () => finder,
            findAll: () => Object.keys(activeJobLookupRows).map(Number).filter((rowNumber) => activeJobLookupRows[rowNumber][1] === value).map((rowNumber) => ({ getRow: () => rowNumber })),
          };
          return finder;
        },
      };
    }
    activeJobFullRowReads += 1;
    activeJobRecordRanges.push({ row, column, columnCount });
    return { getValues: () => [activeJobLookupRows[row]] };
  },
};
activeJobLookupContext.getOrCreateSpreadsheet_ = () => ({});
activeJobLookupContext.ensureSheet_ = () => activeJobLookupSheet;
const activeJobLookup = JSON.parse(JSON.stringify(activeJobLookupContext.findSheetRecordsByExactFieldValues_(
  'search_jobs',
  'status',
  ['queued', 'running', 'queued']
)));
assert.deepStrictEqual(activeJobLookup.map((job) => job.id), ['queued-1', 'running-1']);
assert.strictEqual(activeJobFullRowReads, 2, 'active job lookup must read only matched full rows');
const projectedActiveJobLookup = JSON.parse(JSON.stringify(activeJobLookupContext.findSheetRecordsByExactFieldValues_(
  'search_jobs',
  'status',
  ['queued', 'running'],
  ['id', 'status']
)));
assert.deepStrictEqual(projectedActiveJobLookup, [
  { id: 'queued-1', status: 'queued' },
  { id: 'running-1', status: 'running' },
]);
assert.strictEqual(activeJobFullRowReads, 4, 'projected exact lookup must read only matched rows and requested columns');
assert.deepStrictEqual(activeJobRecordRanges.slice(2), [
  { row: 3, column: 1, columnCount: 2 },
  { row: 4, column: 1, columnCount: 2 },
]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(projectedActiveJobLookup[0], 'query_json'), false);

const selectedFieldContext = vm.createContext({ console });
['Code.gs', 'Repository.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), selectedFieldContext, { filename: file });
});
const selectedFieldHeaders = ['id', 'status', 'query_json', 'created_at', 'credits', 'request_count', 'error_message'];
const selectedFieldRows = [
  ['job-1', 'queued', 'large secret payload 1', '2026-07-19T01:00:00+09:00', 1, 1, ''],
  ['job-2', 'completed', 'large secret payload 2', '2026-07-18T01:00:00+09:00', 2, 1, ''],
  ['job-3', '', 'irrelevant-only row', '', '', '', 'not requested'],
];
const selectedFieldRanges = [];
const selectedFieldSheet = {
  getLastColumn: () => selectedFieldHeaders.length,
  getLastRow: () => selectedFieldRows.length + 1,
  getRange: (row, column, rowCount, columnCount) => {
    if (row === 1) return { getValues: () => [selectedFieldHeaders] };
    selectedFieldRanges.push({ column, columnCount });
    return {
      getValues: () => selectedFieldRows.slice(0, rowCount).map((values) => values.slice(column - 1, column - 1 + columnCount)),
    };
  },
};
selectedFieldContext.getOrCreateSpreadsheet_ = () => ({});
selectedFieldContext.ensureSheet_ = () => selectedFieldSheet;
const selectedFields = JSON.parse(JSON.stringify(selectedFieldContext.readSheetRecordFields_(
  'search_usage_logs',
  ['status', 'created_at', 'credits', 'request_count', 'missing_field', 'credits']
)));
assert.deepStrictEqual(selectedFieldRanges, [
  { column: 2, columnCount: 1 },
  { column: 4, columnCount: 3 },
]);
assert.strictEqual(selectedFields.length, 2);
assert.strictEqual(Object.prototype.hasOwnProperty.call(selectedFields[0], 'query_json'), false, 'unrequested payload columns must not be transferred');
assert.strictEqual(context.getSerperUsageCount_({ day: '2026-07-19' }, selectedFields), 1);
assert.strictEqual(context.getSerperUsageCount_({ month: '2026-07' }, selectedFields), 3);
selectedFieldRanges.length = 0;
const gapMergedSelectedFields = JSON.parse(JSON.stringify(selectedFieldContext.readSheetRecordFields_(
  'search_usage_logs',
  ['status', 'created_at', 'credits', 'request_count'],
  { maxGapColumns: 2 }
)));
assert.deepStrictEqual(selectedFieldRanges, [{ column: 2, columnCount: 5 }]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(gapMergedSelectedFields[0], 'query_json'), false, 'gap merging must not expose unrequested fields');

const leadProjectionHeaders = JSON.parse(JSON.stringify(vm.runInContext('SHEET_DEFINITIONS.leads', selectedFieldContext)));
const leadProjectionRanges = [];
const leadProjectionSheet = {
  getLastColumn: () => leadProjectionHeaders.length,
  getLastRow: () => 2,
  getRange: (row, column, rowCount, columnCount) => {
    if (row === 1) return { getValues: () => [leadProjectionHeaders] };
    leadProjectionRanges.push({ column, columnCount });
    const values = Array.from({ length: leadProjectionHeaders.length }, () => '');
    values[0] = 'lead-projection';
    values[15] = '未対応';
    values[43] = '2026-07-20T00:00:00Z';
    return { getValues: () => [values.slice(column - 1, column - 1 + columnCount)] };
  },
};
selectedFieldContext.ensureSheet_ = () => leadProjectionSheet;
selectedFieldContext.readSheetRecordFields_(
  'leads',
  selectedFieldContext.leadListFields_([]),
  { maxGapColumns: vm.runInContext('LEAD_LIST_READ_MAX_GAP_COLUMNS_', selectedFieldContext) }
);
assert.deepStrictEqual(leadProjectionRanges, [
  { column: 1, columnCount: 17 },
  { column: 22, columnCount: 7 },
  { column: 43, columnCount: 3 },
], 'lead list projection must use three Sheets reads instead of ten fragmented reads');

const hardDeleteReferences = context.listLeadHardDeleteReferences_({ id: 'lead-1', calendar_event_id: '' }, {
  send_histories: [],
  reply_logs: [],
  search_results: [],
  search_usage_logs: [{ lead_id: 'lead-1' }, { lead_id: 'lead-2' }],
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(hardDeleteReferences)), [{
  sheet: 'search_usage_logs',
  label: '検索利用履歴',
  count: 1,
}]);

const activeRecordsFixture = Array.from({ length: 1002 }, (_value, index) => ({
  id: `record-${index + 1}`,
  active: index === 500 ? false : true,
}));
context.getOrCreateSpreadsheet_ = () => ({});
context.ensureSheet_ = () => ({});
context.readSheetRecords_ = () => activeRecordsFixture;
context.readAllSheetRecordsByName_ = originalReadAllSheetRecordsByName;
context.findSheetRecordsByExactFieldValues_ = originalFindSheetRecordsByExactFieldValues;
const allActiveRecords = context.readAllActiveSheetRecords_('ng_masters');
assert.strictEqual(allActiveRecords.length, 1001);
assert.strictEqual(allActiveRecords[allActiveRecords.length - 1].id, 'record-1002');
const pagedActiveRecords = context.listSheetRecords('ng_masters', { limit: 5000 });
assert.strictEqual(pagedActiveRecords.total, 1001);
assert.strictEqual(pagedActiveRecords.items.length, 1000);
assert.strictEqual(context.readAllSheetRecordsByName_('ng_masters', { includeInactive: true }).length, 1002);
let projectedListRead = null;
context.readSheetRecordFields_ = (sheetName, fields, options) => {
  projectedListRead = {
    sheetName,
    fields: JSON.parse(JSON.stringify(fields)),
    options: JSON.parse(JSON.stringify(options)),
  };
  return [
    { id: 'result-old', title: 'Old', raw_json: '{"large":true}', created_at: '2026-07-15T00:01:00.000Z', updated_at: '2026-07-15T00:01:00.000Z' },
    { id: 'result-new', title: 'New', raw_json: '{"large":true}', created_at: '2026-07-15T00:02:00.000Z', updated_at: '2026-07-15T00:02:00.000Z' },
  ];
};
const projectedList = context.listSheetRecords('search_results', {
  limit: 1,
  includeInactive: true,
  includeArchived: true,
  fields: ['id', 'title', 'created_at'],
});
assert.deepStrictEqual(projectedListRead, {
  sheetName: 'search_results',
  fields: ['id', 'title', 'created_at', 'updated_at'],
  options: { maxGapColumns: 0 },
});
assert.strictEqual(projectedList.total, 2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(projectedList.items)), [{ id: 'result-new', title: 'New', created_at: '2026-07-15T00:02:00.000Z' }]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(projectedList.items[0], 'raw_json'), false);
assert.throws(() => context.listSheetRecords('search_results', { fields: ['missing_field'] }), /No valid fields requested/);
const usageFixture = Array.from({ length: 1002 }, () => ({ created_at: '2026-07-15T00:00:00.000Z', credits: 1 }));
assert.strictEqual(context.getSerperUsageCount_({ day: '2026-07-15' }, usageFixture), 1002);
let serperUsageProjectionReads = 0;
context.readSheetRecordFields_ = (sheetName, fields, options) => {
  serperUsageProjectionReads += 1;
  assert.strictEqual(sheetName, 'search_usage_logs');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(fields)), ['created_at', 'lead_id', 'credits', 'request_count']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(options)), { maxGapColumns: 0 });
  return usageFixture;
};
assert.strictEqual(context.getSerperUsageCount_({ month: '2026-07' }), 1002);
assert.strictEqual(serperUsageProjectionReads, 1);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.normalizeSettingForSave_('gmail_sender_name', ' 【Ad Clutch】村松 侑哉 ', 'string'))),
  { key: 'gmail_sender_name', value: '【Ad Clutch】村松 侑哉', valueType: 'string' }
);
assert.throws(() => context.normalizeSettingForSave_('gmail_sender_name', '', 'string'), /is required/);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.normalizeSettingForSave_('gmail_sender_email', ' Sales@AdClutch.Example ', 'string'))),
  { key: 'gmail_sender_email', value: 'Sales@AdClutch.Example', valueType: 'string' }
);
assert.throws(() => context.normalizeSettingForSave_('gmail_sender_email', 'invalid-address', 'string'), /valid email address/);
const settingValidationContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), settingValidationContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Repository.gs'), 'utf8'), settingValidationContext, { filename: 'Repository.gs' });
let invalidSettingLockCalls = 0;
settingValidationContext.withScriptLock_ = () => {
  invalidSettingLockCalls += 1;
  throw new Error('invalid settings must be rejected before acquiring the script lock');
};
assert.throws(
  () => settingValidationContext.setSettingValue('email_send_window', {
    enabled: true,
    start: '08:00',
    end: '07:00',
    timezone: 'Asia/Tokyo',
  }, 'json'),
  (error) => error && error.code === 'SETTING_VALIDATION_ERROR' && error.expected === true
);
assert.strictEqual(invalidSettingLockCalls, 0, 'invalid settings must not contend for the script lock or create an error log');

let dashboardCacheUpdate = null;
const dashboardCacheLookupCalls = [];
const dashboardCacheFixture = [
  { id: 'legacy-v4', cache_key: 'dashboard_stats_v4', value_json: '{"leadsTotal":999}', expires_at: '2999-07-15T00:30:00.000Z', updated_at: '2026-07-15T00:03:00.000Z' },
  { id: 'old-v5', cache_key: 'dashboard_stats_v5', value_json: '{"leadsTotal":1001}', expires_at: '2999-07-15T00:30:00.000Z', updated_at: '2026-07-15T00:01:00.000Z' },
  { id: 'latest-v5', cache_key: 'dashboard_stats_v5', value_json: '{"leadsTotal":1002}', expires_at: '2999-07-15T00:30:00.000Z', updated_at: '2026-07-15T00:02:00.000Z' },
  { id: 'old-v6', cache_key: 'dashboard_stats_v6', value_json: '{"leadsTotal":1003}', expires_at: '2999-07-15T00:30:00.000Z', updated_at: '2026-07-15T00:03:00.000Z' },
  { id: 'latest-v6', cache_key: 'dashboard_stats_v6', value_json: '{"leadsTotal":1004}', expires_at: '2999-07-15T00:30:00.000Z', updated_at: '2026-07-15T00:04:00.000Z' },
  { id: 'latest-v7', cache_key: 'dashboard_stats_v7', value_json: '{"leadsTotal":1005}', expires_at: '2999-07-15T00:30:00.000Z', updated_at: '2026-07-15T00:05:00.000Z' },
];
context.findSheetRecordsByExactFieldValues_ = (sheetName, fieldName, values, fields) => {
  dashboardCacheLookupCalls.push({
    sheetName,
    fieldName,
    values: JSON.parse(JSON.stringify(values)),
    fields: JSON.parse(JSON.stringify(fields)),
  });
  return dashboardCacheFixture.filter((record) => values.includes(record.cache_key));
};
const persistedDashboardStats = context.readDashboardStatsSheetCache_({});
assert.strictEqual(persistedDashboardStats.leadsTotal, 1005);
assert.strictEqual(persistedDashboardStats.persistedCache, true);
context.updateSheetRecord_ = (sheetName, id, payload) => {
  dashboardCacheUpdate = { sheetName, id, payload };
  return payload;
};
context.appendSheetRecord_ = () => { throw new Error('dashboard cache must update instead of append'); };
context.Utilities = Object.assign({}, context.Utilities, { formatDate: () => '2026-07-15T00:30:00.000Z' });
context.Session = { getScriptTimeZone: () => 'Asia/Tokyo' };
context.upsertDashboardCacheSheet_({ leadsTotal: 1005 });
assert.strictEqual(dashboardCacheUpdate.sheetName, 'dashboard_cache');
assert.strictEqual(dashboardCacheUpdate.id, 'latest-v7');
assert.strictEqual(dashboardCacheUpdate.payload.cache_key, 'dashboard_stats_v7');
assert.deepStrictEqual(dashboardCacheLookupCalls, [
  {
    sheetName: 'dashboard_cache',
    fieldName: 'cache_key',
    values: ['dashboard_stats_v7'],
    fields: ['cache_key', 'value_json', 'expires_at', 'created_at', 'updated_at'],
  },
  {
    sheetName: 'dashboard_cache',
    fieldName: 'cache_key',
    values: ['dashboard_stats_v7', 'dashboard_stats_v6', 'dashboard_stats_v5'],
    fields: ['id', 'cache_key', 'created_at', 'updated_at'],
  },
]);

let persistedDashboardReads = 0;
context.CacheService = { getScriptCache: () => ({ get: () => null }) };
context.readDashboardStatsSheetCache_ = () => {
  persistedDashboardReads += 1;
  return { persistedCache: true };
};
assert.strictEqual(context.readDashboardStatsCache_({ allowPersisted: true }).persistedCache, true);
assert.strictEqual(persistedDashboardReads, 1);
assert.strictEqual(context.readDashboardStatsCache_({ allowPersisted: true, allowStale: true }).persistedCache, true);
assert.strictEqual(persistedDashboardReads, 2);

const dashboardContext = vm.createContext({ console });
['Code.gs', 'Repository.gs', 'WebApp.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), dashboardContext, { filename: file });
});
const dashboardProperties = {};
dashboardContext.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => dashboardProperties[key] || '',
    setProperty: (key, value) => { dashboardProperties[key] = value; },
    deleteProperty: (key) => { delete dashboardProperties[key]; },
  }),
};
dashboardContext.nowIso_ = () => '2026-07-19T10:05:00+09:00';
const removedDashboardCacheKeys = [];
dashboardContext.CacheService = {
  getScriptCache: () => ({
    remove: (key) => { removedDashboardCacheKeys.push(key); },
  }),
};
dashboardContext.clearRuntimeCaches_('leads');
assert.strictEqual(dashboardProperties.DASHBOARD_CACHE_DIRTY_AT, '2026-07-19T10:05:00+09:00');
assert(removedDashboardCacheKeys.includes('dashboard_stats_v5'));
assert(removedDashboardCacheKeys.includes('dashboard_stats_v6'));
assert(removedDashboardCacheKeys.includes('dashboard_stats_v7'));
dashboardContext.clearRuntimeCaches_('search_jobs');
assert(removedDashboardCacheKeys.includes('source_page_site_status_v1'));
assert(removedDashboardCacheKeys.includes('source_page_site_status_v2'));
assert(removedDashboardCacheKeys.includes('source_page_site_status_v3'));
assert(removedDashboardCacheKeys.includes('source_page_site_status_v4'));
assert(removedDashboardCacheKeys.includes('source_page_site_status_v5'));
const pendingQualityMigration = dashboardContext.getLeadCollectionQualityMigrationV215Status_();
assert.strictEqual(pendingQualityMigration.pending, true);
assert.strictEqual(pendingQualityMigration.completed, false);
dashboardProperties.MIGRATION_V215_NON_ADVERTISER_LEADS = '2026-07-19T09:00:00+09:00';
const completedQualityMigration = dashboardContext.getLeadCollectionQualityMigrationV215Status_();
assert.strictEqual(completedQualityMigration.pending, false);
assert.strictEqual(completedQualityMigration.completed, true);
assert.strictEqual(completedQualityMigration.completedAt, '2026-07-19T09:00:00+09:00');

dashboardProperties.DASHBOARD_CACHE_REFRESHED_AT = '2026-07-19T10:00:00+09:00';
let dashboardRefreshState = dashboardContext.getDashboardCacheRefreshState_({
  nowMs: Date.parse('2026-07-19T10:10:00+09:00'),
});
assert.strictEqual(dashboardRefreshState.due, true);
assert.strictEqual(dashboardRefreshState.reason, 'dirty');
dashboardContext.markDashboardCacheRefreshed_('2026-07-19T10:06:00+09:00');
dashboardRefreshState = dashboardContext.getDashboardCacheRefreshState_({
  nowMs: Date.parse('2026-07-19T10:10:00+09:00'),
});
assert.strictEqual(dashboardRefreshState.due, false);
assert.strictEqual(dashboardRefreshState.reason, 'fresh');
dashboardRefreshState = dashboardContext.getDashboardCacheRefreshState_({
  nowMs: Date.parse('2026-07-19T10:40:00+09:00'),
});
assert.strictEqual(dashboardRefreshState.due, true);
assert.strictEqual(dashboardRefreshState.reason, 'expired');

let fullDashboardReads = 0;
dashboardContext.readDashboardStatsCache_ = () => null;
dashboardContext.buildStartupDashboardPlaceholder_ = () => ({ startupPlaceholder: true });
dashboardContext.readSheetRecords_ = () => { fullDashboardReads += 1; throw new Error('cache-only request must not aggregate sheets'); };
const cacheOnlyDashboard = dashboardContext.getDashboardStats({ cacheOnly: true });
assert.strictEqual(cacheOnlyDashboard.startupPlaceholder, true);
assert.strictEqual(cacheOnlyDashboard.cacheRefreshPending, true);
assert.strictEqual(fullDashboardReads, 0);

const referenceContext = vm.createContext({ console });
['Code.gs', 'Repository.gs', 'Masters.gs', 'WebApp.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), referenceContext, { filename: file });
});
const referenceCache = {};
const removedReferenceKeys = [];
referenceContext.CacheService = {
  getScriptCache: () => ({
    get: (key) => referenceCache[key] || null,
    put: (key, value) => { referenceCache[key] = value; },
    remove: (key) => { removedReferenceKeys.push(key); delete referenceCache[key]; },
  }),
};
referenceContext.PropertiesService = {
  getScriptProperties: () => ({ setProperty: () => {} }),
};
referenceContext.nowIso_ = () => '2026-07-19T11:00:00+09:00';
const referenceSheetReads = {};
referenceContext.readAllSheetRecordsByName_ = (sheetName) => {
  referenceSheetReads[sheetName] = (referenceSheetReads[sheetName] || 0) + 1;
  if (sheetName === 'genres') return [
    { id: 'genre-active', name: 'キャンプ', active: true },
    { id: 'genre-inactive', name: '旧ジャンル', active: false },
  ];
  if (sheetName === 'reasons') return [{ id: 'reason-1', category: 'send_ng_reason', name: '対象外', active: true }];
  if (sheetName === 'settings') return [{ id: 'setting-1', key: 'gmail_sender_name', value: 'Sender' }];
  return [];
};
referenceContext.listCustomFieldDefinitions = () => ({ items: [{ id: 'custom-1' }] });
referenceContext.listListViewSettings = () => ({ items: [{ id: 'view-1' }] });
let referenceSchemaReads = 0;
referenceContext.getSchemaStatus = (options) => {
  referenceSchemaReads += 1;
  assert.strictEqual(options.settingsRecords.length, 1);
  return { ready: true };
};
referenceContext.getSerperApiKeyInfo = () => ({ configured: true });
const firstReference = referenceContext.getReferenceData();
assert.strictEqual(firstReference.genres.length, 1);
assert.strictEqual(firstReference.genreMasters.length, 2);
assert.strictEqual(referenceSheetReads.genres, 1, 'reference data must read genres once');
assert.strictEqual(referenceSheetReads.settings, 1);
assert.strictEqual(referenceSchemaReads, 1);
referenceContext.getReferenceData();
assert.strictEqual(referenceSheetReads.genres, 1, 'second reference request must use CacheService');
assert.strictEqual(referenceSchemaReads, 1);
referenceContext.clearRuntimeCaches_('leads');
referenceContext.getReferenceData();
assert.strictEqual(referenceSheetReads.genres, 1, 'lead mutations must not invalidate reference data');
assert.strictEqual(referenceContext.shouldInvalidateReferenceDataCache_('settings'), true);
assert.strictEqual(referenceContext.shouldInvalidateReferenceDataCache_('leads'), false);
referenceContext.clearRuntimeCaches_('settings');
referenceContext.getReferenceData();
assert.strictEqual(referenceSheetReads.genres, 2, 'setting mutations must invalidate reference data');
assert(removedReferenceKeys.includes(referenceContext.referenceDataCacheKey_()));
referenceContext.getReferenceData({ bypassCache: true });
assert.strictEqual(referenceSheetReads.genres, 3, 'explicit bypass must rebuild reference data');

let domainCacheLock = null;
let domainCacheUpdate = null;
const domainCacheLookupCalls = [];
context.findSheetRecordsByExactFieldValues_ = (sheetName, fieldName, values, fields) => {
  domainCacheLookupCalls.push({
    sheetName,
    fieldName,
    values: JSON.parse(JSON.stringify(values)),
    fields: JSON.parse(JSON.stringify(fields)),
  });
  return [
  { id: 'domain-old', cache_key: 'lead-key', website_url: 'https://old.example', updated_at: '2026-07-15T00:01:00.000Z' },
  { id: 'domain-new', cache_key: 'lead-key', website_url: 'https://new.example', updated_at: '2026-07-15T00:02:00.000Z' },
  ];
};
assert.strictEqual(context.readDomainCache_('lead-key').website_url, 'https://new.example');
assert.deepStrictEqual(domainCacheLookupCalls[0], {
  sheetName: 'domain_cache',
  fieldName: 'cache_key',
  values: ['lead-key'],
  fields: ['id', 'cache_key', 'domain', 'website_url', 'form_url', 'confidence', 'source_json', 'expires_at', 'created_at', 'updated_at'],
});
context.withScriptLock_ = (operation, callback, options) => {
  domainCacheLock = { operation, options };
  return callback();
};
context.updateSheetRecord_ = (sheetName, id, payload) => {
  domainCacheUpdate = { sheetName, id, payload };
  return payload;
};
context.appendSheetRecord_ = () => { throw new Error('domain cache must update instead of append'); };
context.writeDomainCache_('lead-key', { company_name: 'Example' }, { url: 'https://latest.example', confidence: 0.9, source: {} }, 'lead_official_site');
assert.strictEqual(domainCacheLock.operation, 'writeDomainCache');
assert.strictEqual(domainCacheLock.options.waitMs, 6000);
assert.strictEqual(domainCacheLock.options.attempts, 5);
assert.strictEqual(domainCacheUpdate.id, 'domain-new');
assert.deepStrictEqual(domainCacheLookupCalls[1], {
  sheetName: 'domain_cache',
  fieldName: 'cache_key',
  values: ['lead-key'],
  fields: ['id', 'cache_key', 'created_at', 'updated_at'],
});

context.withScriptLock_ = (_operation, callback) => callback();
context.getOrCreateSpreadsheet_ = () => ({});
context.ensureSheet_ = () => ({});
context.findRowById_ = () => ({
  rowNumber: 2,
  record: { id: 'lead-form', status: '対応中', form_status: '未対応', custom_fields_json: '{}' },
});
context.getHeaders_ = () => ['id', 'status', 'form_status', 'custom_fields_json'];
assert.throws(() => context.unmarkLeadFormSent('lead-form'), /取り消せるフォーム送信記録がありません/);

let capturedCalendarOptions = null;
let calendarLockDepth = 0;
let calendarCreateCount = 0;
const calendarSearches = [];
let calendarEventsForRecovery = [];
const calendarClaims = {};
context.withScriptLock_ = (_operation, callback) => {
  calendarLockDepth += 1;
  try {
    return callback();
  } finally {
    calendarLockDepth -= 1;
  }
};
context.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => calendarClaims[key] || '',
    setProperty: (key, value) => { calendarClaims[key] = value; },
    deleteProperty: (key) => { delete calendarClaims[key]; },
  }),
};
let calendarLead = {
  id: 'lead-calendar', status: '対応中', source: 'manual', send_ng: false,
  email: 'guest@example.com', calendar_event_id: '', company_name: 'Example', facility_name: 'Example',
};
context.getLeadById = () => calendarLead;
context.updateLeadLocked_ = (_id, patch) => {
  assert.strictEqual(calendarLockDepth, 1);
  calendarLead = Object.assign({}, calendarLead, patch);
  return calendarLead;
};
context.assertCalendarInviteAllowed_ = () => {};
context.CalendarApp = {
  getDefaultCalendar: () => {
    assert.strictEqual(calendarLockDepth, 0);
    return {
    getEventById: () => { assert.strictEqual(calendarLockDepth, 0); return null; },
    getEvents: (_start, _end, options) => {
      assert.strictEqual(calendarLockDepth, 0, 'Calendar recovery lookup must run outside the script lock');
      calendarSearches.push(options);
      return calendarEventsForRecovery.slice();
    },
    createEvent: (_title, _start, _end, options) => {
      assert.strictEqual(calendarLockDepth, 0, 'Calendar createEvent must run outside the script lock');
      calendarCreateCount += 1;
      capturedCalendarOptions = options;
      return {
        getId: () => `event-${calendarCreateCount}`,
        getTitle: () => 'Example meeting',
        getDescription: () => options.description || '',
        getStartTime: () => _start,
        getEndTime: () => _end,
        deleteEvent: () => {},
      };
    },
  };
  },
};
context.Utilities = Object.assign({}, context.Utilities, { formatDate: () => '2026-07-20T10:00:00+09:00' });
context.Session = { getScriptTimeZone: () => 'Asia/Tokyo' };
context.createCalendarEventForLead('lead-calendar', {
  start: '2026-07-20T10:00:00+09:00',
  end: '2026-07-20T11:00:00+09:00',
});
assert.strictEqual(capturedCalendarOptions.sendInvites, false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(capturedCalendarOptions, 'guests'), false);
assert(capturedCalendarOptions.description.includes('calendar_event_claim:uuid-1'));
calendarLead = Object.assign({}, calendarLead, { calendar_event_id: '' });
context.createCalendarEventForLead('lead-calendar', {
  start: '2026-07-20T10:00:00+09:00',
  end: '2026-07-20T11:00:00+09:00',
  sendInvites: true,
  guests: 'guest@example.com',
});
assert.strictEqual(capturedCalendarOptions.sendInvites, true);
assert.strictEqual(capturedCalendarOptions.guests, 'guest@example.com');

calendarLead = Object.assign({}, calendarLead, { calendar_event_id: '', status: '対応中' });
calendarClaims['calendar_event_claim:lead-calendar'] = JSON.stringify({
  token: 'orphan-token',
  claimedAt: '2000-01-01T00:00:00.000Z',
  start: '2026-07-20T10:00:00+09:00',
  end: '2026-07-20T11:00:00+09:00',
});
calendarEventsForRecovery = [{
  getId: () => 'orphan-event',
  getTitle: () => 'Recovered meeting',
  getDescription: () => '管理ID: calendar_event_claim:orphan-token',
  getStartTime: () => new Date('2026-07-20T10:00:00+09:00'),
  getEndTime: () => new Date('2026-07-20T11:00:00+09:00'),
  deleteEvent: () => { throw new Error('a recovered event must not be deleted after successful finalization'); },
}];
const calendarCreateCountBeforeRecovery = calendarCreateCount;
const recoveredCalendarEvent = context.createCalendarEventForLead('lead-calendar', {
  start: '2026-07-20T10:00:00+09:00',
  end: '2026-07-20T11:00:00+09:00',
});
assert.strictEqual(recoveredCalendarEvent.recovered, true);
assert.strictEqual(recoveredCalendarEvent.existing, true);
assert.strictEqual(recoveredCalendarEvent.eventId, 'orphan-event');
assert.strictEqual(calendarCreateCount, calendarCreateCountBeforeRecovery, 'stale Calendar retries must reuse the orphan event');
assert(calendarSearches.length > 0, 'a stale Calendar claim must scan the original event range');
assert.strictEqual(calendarLead.calendar_event_id, 'orphan-event');

assert.doesNotThrow(() => context.normalizeLeadInput_({ facility_name: '屋号のみ' }, true));
assert.throws(() => context.normalizeLeadInput_({}, true), /company_name, facility_name, email, or form_url is required/);
assert.strictEqual(context.areLeadRecordsDuplicateForCreate_({
  website_url: 'http://www.shared.example/facility/?utm_source=listing',
  website_domain: 'shared.example',
  normalized_company_name: '旧表記',
}, {
  website_url: 'https://shared.example/facility',
  website_domain: 'shared.example',
  normalized_company_name: '新表記',
}), true, 'the same official URL must be a duplicate even when the facility name and tracking parameters differ');
assert.strictEqual(context.areLeadRecordsDuplicateForCreate_({
  website_url: 'https://shared.example/facility-a',
  website_domain: 'shared.example',
  normalized_company_name: '施設A',
}, {
  website_url: 'https://shared.example/facility-b',
  website_domain: 'shared.example',
  normalized_company_name: '施設B',
}), true, 'different paths on the same official domain must be treated as one sales destination');
assert.strictEqual(context.areLeadRecordsDuplicateForCreate_({
  form_url: 'https://forms.example/response?id=abc&utm_campaign=test',
  website_domain: 'forms.example',
  normalized_company_name: '施設A',
}, {
  form_url: 'https://forms.example/response?id=abc',
  website_domain: 'forms.example',
  normalized_company_name: '施設B',
}), true, 'the same form URL must be a duplicate after tracking parameters are removed');
assert.strictEqual(context.areLeadRecordsDuplicateForCreate_({
  form_url: 'https://forms.example/response?id=abc',
  website_domain: 'forms.example',
  normalized_company_name: '施設A',
}, {
  form_url: 'https://forms.example/response?id=xyz',
  website_domain: 'forms.example',
  normalized_company_name: '施設B',
}), false, 'different form identifiers on a shared form host must remain allowed');
assert.strictEqual(context.areLeadRecordsDuplicateForCreate_({
  website_url: 'https://historical.example/old',
  status: '対応不要',
  archived_at: '2026-07-01T00:00:00+09:00',
}, {
  source: 'source_page',
  website_url: 'https://www.historical.example/new-path',
  status: '未対応',
}), true, 'automated collection must not re-add a domain retained in archived sales history');
assert.strictEqual(context.areLeadRecordsDuplicateForCreate_({
  website_url: 'https://historical.example/old',
  status: '対応不要',
  archived_at: '2026-07-01T00:00:00+09:00',
}, {
  source: 'manual',
  website_url: 'https://historical.example/manual',
  status: '未対応',
}), false, 'manual registration must remain available for intentional restoration');
const historicalReviewTargets = JSON.parse(JSON.stringify(context.historicalReviewDomainDuplicateTargetsFromRecords_([
  {
    __rowNumber: 2,
    id: 'historical-record',
    source: 'source_page',
    facility_name: '過去登録施設',
    website_url: 'https://historical.example/old',
    status: '対応不要',
    deal_status: '未設定',
    archived_at: '2026-07-01T00:00:00+09:00',
    created_at: '2026-06-01T00:00:00+09:00',
  },
  {
    __rowNumber: 3,
    id: 'review-record',
    source: 'source_page',
    facility_name: '再収集候補',
    website_url: 'https://www.historical.example/new-path',
    status: '未対応',
    send_count: 0,
    last_sent_at: '',
    reply_checked: false,
    deal_status: '未設定',
    archived_at: '',
    created_at: '2026-07-01T00:00:00+09:00',
  },
  {
    __rowNumber: 4,
    id: 'unrelated-record',
    source: 'source_page',
    facility_name: '別ドメイン',
    website_url: 'https://unrelated.example/',
    status: '未対応',
    send_count: 0,
    last_sent_at: '',
    reply_checked: false,
    deal_status: '未設定',
    archived_at: '',
  },
])));
assert.deepStrictEqual(historicalReviewTargets.map((target) => ({
  id: target.id,
  existingId: target.existingId,
  domain: target.domain,
})), [{
  id: 'review-record',
  existingId: 'historical-record',
  domain: 'historical.example',
}]);
const duplicateDomainGroups = JSON.parse(JSON.stringify(context.duplicateDomainGroupsFromRecords_([
  {
    id: 'sent-keeper', source: 'source_page', company_name: '送信履歴あり', facility_name: '本館',
    website_url: 'https://duplicate.example/main', email: '', send_count: 1, last_sent_at: '2026-07-01T00:00:00+09:00',
    status: '初回メール送信済み', deal_status: '未設定', created_at: '2026-06-01T00:00:00+09:00', archived_at: '',
  },
  {
    id: 'contact-donor', source: 'source_page', company_name: '未送信', facility_name: '別館',
    website_url: 'https://www.duplicate.example/annex', email: 'info@duplicate.example', form_url: 'https://duplicate.example/contact',
    send_count: 0, status: '未対応', deal_status: '未設定', created_at: '2026-07-01T00:00:00+09:00', archived_at: '',
  },
  {
    id: 'email-only', email: 'other@duplicate.example', website_url: '', status: '未対応', archived_at: '',
  },
  {
    id: 'archived-copy', website_url: 'https://duplicate.example/old', status: '対応不要', archived_at: '2026-07-02T00:00:00+09:00',
  },
])));
assert.strictEqual(duplicateDomainGroups.length, 1);
assert.strictEqual(duplicateDomainGroups[0].domain, 'duplicate.example');
assert.strictEqual(duplicateDomainGroups[0].keeper.id, 'sent-keeper', 'send and reply history must win the keeper selection');
assert.deepStrictEqual(duplicateDomainGroups[0].duplicates.map((lead) => lead.id), ['contact-donor']);
const mergedDuplicateContact = JSON.parse(JSON.stringify(context.mergeDuplicateDomainContactFields_(
  duplicateDomainGroups[0].keeper,
  duplicateDomainGroups[0].duplicates
)));
assert.strictEqual(mergedDuplicateContact.email, 'info@duplicate.example');
assert.strictEqual(mergedDuplicateContact.form_url, 'https://duplicate.example/contact');
assert.strictEqual(context.sortDuplicateDomainLeadsForKeeper_([
  {
    id: 'closed', facility_name: '【R7/7 移転の為閉鎖】旧キャンプ場', website_url: 'https://active.example/old',
    email: 'old@active.example', status: '未対応', deal_status: '未設定', created_at: '2026-01-01',
  },
  {
    id: 'active', facility_name: '営業中キャンプ場', website_url: 'https://active.example/current',
    status: '未対応', deal_status: '未設定', created_at: '2026-02-01',
  },
])[0].id, 'active', 'closed facility labels must not win an otherwise unengaged duplicate group');
const syncInput = JSON.parse(JSON.stringify(context.buildSyncLeadInput_({
  company_name: 'Example',
  email: 'https://example.com/contact',
  status: '送信NG',
}, { source: 'csv_upload' })));
assert.deepStrictEqual(syncInput, {
  company_name: 'Example',
  form_url: 'https://example.com/contact',
  source: 'csv_upload',
});
const syncPatch = JSON.parse(JSON.stringify(context.buildSyncFillPatch_({
  company_name: '既存会社', facility_name: '', email: '', notes: '既存メモ',
}, {
  company_name: '上書き禁止', facility_name: '補完屋号', email: 'new@example.com', notes: '上書き禁止',
})));
assert.deepStrictEqual(syncPatch, { facility_name: '補完屋号', email: 'new@example.com' });

const leadA = { id: 'lead-a' };
const leadB = { id: 'lead-b' };
assert.strictEqual(context.resolveSyncLeadMatch_([], [leadA], [leadA], [leadA, leadB]).id, 'lead-a');
assert.strictEqual(context.resolveSyncLeadMatch_([], [], [leadA, leadB], [leadA]).id, 'lead-a');
assert.throws(() => context.resolveSyncLeadMatch_([], [leadA], [leadB], []), /別の既存営業先/);
assert.throws(() => context.resolveSyncLeadMatch_([], [leadA, leadB], [], []), /複数の既存営業先/);

let capturedSyncPatch = null;
context.getOrCreateSpreadsheet_ = () => ({});
context.ensureSheet_ = () => ({});
context.findSyncLeadMatchLocked_ = () => ({ id: 'sync-lead', company_name: '既存会社', facility_name: '', email: '', notes: '既存メモ' });
context.updateLeadLocked_ = (id, patch) => {
  capturedSyncPatch = { id, patch };
  return Object.assign({ id }, patch);
};
const syncUpsert = context.upsertSyncLeadLocked_({ company_name: '既存会社', facility_name: '補完屋号', email: 'new@example.com', notes: '上書き禁止' }, {});
assert.strictEqual(syncUpsert.action, 'filled');
assert.strictEqual(syncUpsert.filledFields, 2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(capturedSyncPatch)), {
  id: 'sync-lead',
  patch: { facility_name: '補完屋号', email: 'new@example.com' },
});

const repositoryWriteContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), repositoryWriteContext, { filename: file });
});
let repositoryFindCalls = 0;
let repositoryAppendedRow = null;
let repositoryWrittenRows = null;
let repositoryCacheClears = 0;
let repositoryHeaderReads = 0;
const repositoryHeaders = ['id', 'name', 'active', 'created_at', 'updated_at'];
const repositorySheet = {
  appendRow: (row) => { repositoryAppendedRow = row.slice(); },
  getRange: () => ({ setValues: (rows) => { repositoryWrittenRows = rows.map((row) => row.slice()); } }),
};
repositoryWriteContext.Utilities = { getUuid: () => 'record-new' };
repositoryWriteContext.nowIso_ = () => '2026-07-19T14:00:00+09:00';
repositoryWriteContext.getOrCreateSpreadsheet_ = () => ({});
repositoryWriteContext.ensureSheet_ = () => repositorySheet;
repositoryWriteContext.getHeaders_ = () => { repositoryHeaderReads += 1; return repositoryHeaders.slice(); };
repositoryWriteContext.clearRuntimeCaches_ = () => { repositoryCacheClears += 1; };
repositoryWriteContext.findRowById_ = () => {
  repositoryFindCalls += 1;
  return {
    rowNumber: 2,
    headers: repositoryHeaders.slice(),
    record: { id: 'record-existing', name: 'Before', active: true, created_at: 'created-old', updated_at: 'updated-old' },
  };
};
const appendedRepositoryRecord = repositoryWriteContext.appendSheetRecord_('jobs', { name: 'New', active: false });
assert.strictEqual(repositoryFindCalls, 0, 'append must not reread the sheet after a successful write');
assert.deepStrictEqual(JSON.parse(JSON.stringify(appendedRepositoryRecord)), {
  id: 'record-new', name: 'New', active: false, created_at: '2026-07-19T14:00:00+09:00', updated_at: '2026-07-19T14:00:00+09:00',
});
assert.deepStrictEqual(repositoryAppendedRow, ['record-new', 'New', false, '2026-07-19T14:00:00+09:00', '2026-07-19T14:00:00+09:00']);
const updatedRepositoryRecord = repositoryWriteContext.updateSheetRecord_('jobs', 'record-existing', { name: 'After' });
assert.strictEqual(repositoryFindCalls, 1, 'update must locate the row once and must not reread it after writing');
assert.deepStrictEqual(JSON.parse(JSON.stringify(updatedRepositoryRecord)), {
  id: 'record-existing', name: 'After', active: true, created_at: 'created-old', updated_at: '2026-07-19T14:00:00+09:00',
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(repositoryWrittenRows)), [['record-existing', 'After', true, 'created-old', '2026-07-19T14:00:00+09:00']]);
assert.strictEqual(repositoryCacheClears, 2);
assert.strictEqual(repositoryHeaderReads, 1, 'the update must reuse headers returned by the row lookup');
repositoryWriteContext.updateSheetRecord_('jobs', 'record-existing', { name: 'Progress' }, { clearCaches: false });
assert.strictEqual(repositoryCacheClears, 2, 'progress-only writes must be able to skip broad cache invalidation');

let importItemLocks = 0;
let syncLogEntry = null;
context.Utilities = Object.assign({}, context.Utilities, {
  parseCsv: () => [
    ['会社名'],
    ['追加'],
    ['補完'],
    ['重複'],
    ['失敗'],
    ['   '],
  ],
});
context.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'importLeadsFromCsv:item');
  assert.strictEqual(options.waitMs, 6000);
  assert.strictEqual(options.attempts, 5);
  importItemLocks += 1;
  return callback();
};
context.upsertSyncLeadLocked_ = (raw) => {
  if (raw.company_name === '追加') return { action: 'added' };
  if (raw.company_name === '補完') return { action: 'filled', filledFields: 2 };
  if (raw.company_name === '重複') return { action: 'skipped' };
  throw Object.assign(new Error('入力エラー'), { code: 'SYNC_TEST_ERROR' });
};
context.appendSheetRecord_ = (sheetName, entry) => {
  if (sheetName === 'sync_logs') syncLogEntry = entry;
  return entry;
};
const importResult = context.importLeadsFromCsv('ignored', { source: 'csv_upload' });
assert.strictEqual(importItemLocks, 4);
assert.strictEqual(importResult.added, 1);
assert.strictEqual(importResult.filled, 1);
assert.strictEqual(importResult.filledFields, 2);
assert.strictEqual(importResult.skipped, 1);
assert.strictEqual(importResult.error_count, 1);
assert.strictEqual(syncLogEntry.added_count, 1);
assert.strictEqual(syncLogEntry.filled_count, 1);
assert.strictEqual(syncLogEntry.duplicate_skip_count, 1);
assert.strictEqual(syncLogEntry.error_count, 1);

let queuedJobRecord = null;
let queuedRawRecords = null;
let ensuredCsvTrigger = 0;
let csvUuid = 0;
context.Utilities = Object.assign({}, context.Utilities, {
  parseCsv: () => [
    ['会社名', 'メールアドレス'],
    ['会社A', 'a@example.com'],
    ['', ''],
    ['会社B', 'b@example.com'],
  ],
  getUuid: () => `csv-uuid-${++csvUuid}`,
  computeDigest: (_algorithm, value) => Array.from(Buffer.from(String(value), 'utf8')).slice(0, 32),
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  Charset: { UTF_8: 'UTF_8' },
});
context.withScriptLock_ = (_operation, callback) => callback();
context.ensureBackgroundJobTrigger_ = () => { ensuredCsvTrigger += 1; };
context.readAllSheetRecordsByName_ = () => [];
context.findSheetRecordsByExactFieldValues_ = () => [];
context.appendSheetRecord_ = (sheetName, record) => {
  assert.strictEqual(sheetName, 'jobs');
  queuedJobRecord = Object.assign({}, record);
  return queuedJobRecord;
};
context.appendSheetRecords_ = (sheetName, records) => {
  assert.strictEqual(sheetName, 'raw_import');
  queuedRawRecords = records;
  return records;
};
context.updateSheetRecord_ = (sheetName, id, patch) => {
  assert.strictEqual(sheetName, 'jobs');
  assert.strictEqual(id, queuedJobRecord.id);
  queuedJobRecord = Object.assign({}, queuedJobRecord, patch);
  return queuedJobRecord;
};
const queuedCsv = context.startLeadCsvImport('ignored', { source: 'csv_upload' });
assert.strictEqual(ensuredCsvTrigger, 1);
assert.strictEqual(queuedCsv.total, 2);
assert.strictEqual(queuedJobRecord.job_type, 'csv_import');
assert.strictEqual(queuedJobRecord.status, 'queued');
assert(/^csv:/.test(queuedJobRecord.request_key));
assert.strictEqual(queuedRawRecords.length, 2);
assert(queuedRawRecords.every((row) => row.id));
assert.strictEqual(queuedRawRecords[0].source_row_number, 2);
assert.strictEqual(queuedRawRecords[1].source_row_number, 4);
assert.strictEqual(context.isCsvImportPreparationStale_({ last_heartbeat_at: '2026-07-15T00:00:00.000Z' }, Date.parse('2026-07-15T00:14:59.000Z')), false);
assert.strictEqual(context.isCsvImportPreparationStale_({ last_heartbeat_at: '2026-07-15T00:00:00.000Z' }, Date.parse('2026-07-15T00:15:00.000Z')), true);
const queuedCsvSummary = context.summarizeLeadCsvImportRows_([
  { status: 'completed', result_json: '{"action":"added"}' },
  { status: 'completed', result_json: '{"action":"filled","filledFields":2}' },
  { status: 'completed', result_json: '{"action":"skipped"}' },
  { status: 'failed', result_json: '{"action":"error"}' },
  { status: 'queued', result_json: '' },
]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(queuedCsvSummary)), {
  total: 5, processed: 4, added: 1, filled: 1, filledFields: 2, skipped: 1, errors: 1,
});

const searchStartContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), searchStartContext, { filename: file });
});
let searchStartLockDepth = 0;
let searchStartAppends = 0;
let searchTriggerChecks = 0;
const searchStartRecords = [];
searchStartContext.Utilities = {
  computeDigest: (_algorithm, value) => Array.from(Buffer.from(String(value), 'utf8')).slice(0, 32),
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  Charset: { UTF_8: 'UTF_8' },
};
searchStartContext.normalizeSearchJobInput_ = () => {
  assert.strictEqual(searchStartLockDepth, 0, 'search payload normalization and sitemap fetches must run outside ScriptLock');
  return {
    job_type: 'source_page', job_limit: 1, items: [{ source_url: 'https://example.com/list' }],
    results_per_query: 10, crawl_all: true, created_at: 'volatile',
  };
};
searchStartContext.withScriptLock_ = (_operation, callback) => {
  searchStartLockDepth += 1;
  try {
    return callback();
  } finally {
    searchStartLockDepth -= 1;
  }
};
searchStartContext.findSheetRecordsByExactFieldValues_ = () => searchStartRecords.filter((job) => ['queued', 'running'].includes(job.status));
searchStartContext.appendSheetRecord_ = (_sheetName, record) => {
  searchStartAppends += 1;
  const saved = Object.assign({ id: 'search-start-1' }, record);
  searchStartRecords.push(saved);
  return saved;
};
searchStartContext.ensureBackgroundJobTrigger_ = () => { searchTriggerChecks += 1; return {}; };
searchStartContext.ensureImmediateBackgroundJobTriggerBestEffort_ = () => ({ result: {}, warning: '' });
const firstSearchStart = searchStartContext.startSerperSearchJob({});
const duplicateSearchStart = searchStartContext.startSerperSearchJob({});
const publicSearchStart = searchStartContext.startSearchJob({});
assert.strictEqual(searchStartAppends, 1);
assert.strictEqual(searchTriggerChecks, 3);
assert.strictEqual(firstSearchStart.reused, false);
assert.strictEqual(duplicateSearchStart.reused, true);
assert.strictEqual(publicSearchStart.reused, true);
assert.strictEqual(duplicateSearchStart.duplicatePrevented, true);
assert.strictEqual(duplicateSearchStart.id, firstSearchStart.id);

const searchRecoveryContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), searchRecoveryContext, { filename: file });
});
let recoveryJob = {
  id: 'search-recovery-1', status: 'running', lock_token: 'search-lock', processed_count: 1,
  total_count: 2, error_count: 1, last_error: 'prior item failed', attempt_count: 2,
  query_json: JSON.stringify({
    job_type: 'prospecting', job_limit: 2, items: [{ query: 'first' }, { query: 'second' }],
  }),
};
let recoveryFinalPatch = null;
searchRecoveryContext.getSettingValue_ = (_key, fallback) => fallback;
searchRecoveryContext.claimSearchJobRun_ = () => ({ claimed: true, busy: false, job: recoveryJob, lockToken: 'search-lock' });
searchRecoveryContext.processProspectingSearchItem_ = () => {};
searchRecoveryContext.isSearchJobRuntimeExhausted_ = () => false;
searchRecoveryContext.nowIso_ = () => '2026-07-15T05:00:00.000Z';
searchRecoveryContext.updateClaimedSearchJob_ = (_id, _token, patch, release) => {
  recoveryJob = Object.assign({}, recoveryJob, patch);
  if (release) recoveryFinalPatch = Object.assign({}, patch);
  return { owned: true, record: recoveryJob };
};
searchRecoveryContext.appendSyncError_ = () => {};
const recoveredSearchJob = searchRecoveryContext.advanceSearchJob('search-recovery-1', { maxItems: 1, runtimeBudgetMs: 60000 });
assert.strictEqual(recoveredSearchJob.completed, true);
assert.strictEqual(recoveryFinalPatch.status, 'failed', 'a prior chunk error must not be erased by a later clean chunk');
assert.strictEqual(recoveryJob.error_count, 1);
assert.strictEqual(recoveryJob.last_error, 'prior item failed');
assert.strictEqual(searchRecoveryContext.isRetryableSearchJobError_(new Error('Serper request failed: HTTP 503 unavailable')), true);
assert.strictEqual(searchRecoveryContext.isRetryableSearchJobError_(new Error('Serper API key is not configured.')), false);

const retryableSearchContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), retryableSearchContext, { filename: file });
});
let retryableJob = {
  id: 'search-retry-1', status: 'queued', lock_token: 'retry-lock', processed_count: 0,
  total_count: 1, error_count: 0, last_error: '', attempt_count: 0,
  query_json: JSON.stringify({ job_type: 'prospecting', job_limit: 1, items: [{ query: 'retry me' }] }),
};
let retryableShouldFail = true;
let retryableFinalPatch = null;
retryableSearchContext.getSettingValue_ = (_key, fallback) => fallback;
retryableSearchContext.claimSearchJobRun_ = () => ({ claimed: true, busy: false, job: retryableJob, lockToken: 'retry-lock' });
retryableSearchContext.processProspectingSearchItem_ = () => {
  if (retryableShouldFail) throw new Error('Serper request failed: HTTP 503 unavailable');
};
retryableSearchContext.isSearchJobRuntimeExhausted_ = () => false;
retryableSearchContext.nowIso_ = () => '2026-07-15T05:10:00.000Z';
retryableSearchContext.appendSyncError_ = () => {};
const retryableResumeDelays = [];
retryableSearchContext.ensureImmediateBackgroundJobTriggerBestEffort_ = (delayMs) => {
  retryableResumeDelays.push(delayMs);
  return { result: { created: true }, warning: '' };
};
retryableSearchContext.updateClaimedSearchJob_ = (_id, _token, patch, release) => {
  retryableJob = Object.assign({}, retryableJob, patch);
  if (release) retryableFinalPatch = Object.assign({}, patch);
  return { owned: true, record: retryableJob };
};
const pausedSearchJob = retryableSearchContext.advanceSearchJob('search-retry-1', { maxItems: 1, runtimeBudgetMs: 60000 });
assert.strictEqual(pausedSearchJob.pausedForRetry, true);
assert.strictEqual(pausedSearchJob.completed, false);
assert.strictEqual(retryableFinalPatch.status, 'queued');
assert.strictEqual(retryableJob.processed_count, 0);
assert.strictEqual(retryableJob.error_count, 0);
assert(/HTTP 503/.test(retryableJob.last_error));
assert.strictEqual(retryableResumeDelays[0], 60000, 'retryable provider failures must resume automatically after a short backoff');
retryableShouldFail = false;
retryableFinalPatch = null;
const resumedSearchJob = retryableSearchContext.advanceSearchJob('search-retry-1', { maxItems: 1, runtimeBudgetMs: 60000 });
assert.strictEqual(resumedSearchJob.completed, true);
assert.strictEqual(retryableFinalPatch.status, 'completed');
assert.strictEqual(retryableJob.processed_count, 1);
assert.strictEqual(retryableJob.last_error, '');

const searchProviderContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), searchProviderContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8'), searchProviderContext, { filename: 'Serper.gs' });
let providerSerperKey = 'serper-key';
let providerSearxConfig = { enabled: true, baseUrl: 'https://search.example.net', accessToken: 'token' };
let providerSearxResult = { organic: [{ title: 'PC result', link: 'https://pc.example', snippet: '' }], provider: 'searxng' };
let providerSearxError = null;
let providerSerperResult = { organic: [{ title: 'Serper result', link: 'https://serper.example', snippet: '' }], provider: 'serper' };
let providerSerperError = null;
let providerSerperCalls = 0;
let providerFailureCacheWrites = 0;
let providerFailureCacheClears = 0;
let providerSerperSkipped = false;
searchProviderContext.getSerperApiKey_ = () => providerSerperKey;
searchProviderContext.readSearxngConfig_ = () => providerSearxConfig;
searchProviderContext.isSerperSearchTemporarilyUnavailable_ = () => providerSerperSkipped;
searchProviderContext.callSearxngSearch_ = () => {
  if (providerSearxError) throw providerSearxError;
  return JSON.parse(JSON.stringify(providerSearxResult));
};
searchProviderContext.callSerperSearchDirect_ = () => {
  providerSerperCalls += 1;
  if (providerSerperError) throw providerSerperError;
  return JSON.parse(JSON.stringify(providerSerperResult));
};
searchProviderContext.markSerperSearchUnavailable_ = () => { providerFailureCacheWrites += 1; };
searchProviderContext.clearSerperSearchUnavailable_ = () => { providerFailureCacheClears += 1; };
const primarySearxResult = searchProviderContext.callSerperSearch_('施設 公式');
assert.strictEqual(primarySearxResult.provider, 'searxng');
assert.strictEqual(providerSerperCalls, 0, 'non-empty SearXNG results must not consume Serper credits');
providerSearxResult = { organic: [], provider: 'searxng' };
const emptySearxFallback = searchProviderContext.callSerperSearch_('施設 公式');
assert.strictEqual(emptySearxFallback.provider, 'serper');
assert.strictEqual(emptySearxFallback.fallbackFrom, 'searxng_empty');
assert.strictEqual(providerSerperCalls, 1, 'an empty SearXNG result should use the configured Serper fallback');
assert.strictEqual(providerFailureCacheClears, 1);
providerSerperError = searchProviderContext.createSearchProviderError_('Serper HTTP 503', 'SERPER_HTTP_503', true);
const emptySearxWithFailedFallback = searchProviderContext.callSerperSearch_('施設 公式');
assert.strictEqual(emptySearxWithFailedFallback.provider, 'searxng');
assert.strictEqual(emptySearxWithFailedFallback.organic.length, 0);
assert.match(emptySearxWithFailedFallback.fallbackError, /503/);
assert.strictEqual(providerFailureCacheWrites, 1, 'retryable Serper failures should activate the short failure cache');
providerSearxResult = { organic: [], provider: 'searxng' };
providerSearxError = searchProviderContext.createSearchProviderError_('PC検索 HTTP 401', 'SEARXNG_HTTP_401', false);
providerSerperKey = '';
providerSerperError = null;
assert.throws(() => searchProviderContext.callSerperSearch_('施設 公式'), (error) => {
  assert.strictEqual(error.code, 'SEARCH_PROVIDERS_UNAVAILABLE');
  assert.strictEqual(error.retryable, false, 'permanent provider configuration errors must not retry forever');
  return true;
});
providerSerperKey = 'serper-key';
providerSearxError = searchProviderContext.createSearchProviderError_('PC検索 timeout', 'SEARXNG_CONNECTION_FAILED', true);
providerSerperError = searchProviderContext.createSearchProviderError_('Serper HTTP 401', 'SERPER_HTTP_401', false);
assert.throws(() => searchProviderContext.callSerperSearch_('施設 公式'), (error) => {
  assert.strictEqual(error.code, 'SEARCH_PROVIDERS_UNAVAILABLE');
  assert.strictEqual(error.retryable, true, 'a transient primary failure should keep the job resumable');
  return true;
});
providerSearxError = null;
providerSearxConfig = { enabled: false, baseUrl: '', accessToken: '' };
providerSerperKey = '';
assert.throws(() => searchProviderContext.callSerperSearch_('施設 公式'), (error) => {
  assert.strictEqual(error.code, 'SEARCH_PROVIDER_NOT_CONFIGURED');
  assert.strictEqual(error.retryable, false);
  return true;
});
providerSearxConfig = { enabled: true, baseUrl: 'https://search.example.net', accessToken: 'token' };
assert.strictEqual(searchProviderContext.hasSearchProviderConfigured_(), true, 'SearXNG-only setups must enable official-site fallback');
assert.strictEqual(searchProviderContext.isSearchProviderRetryableHttpStatus_(401), false);
assert.strictEqual(searchProviderContext.isSearchProviderRetryableHttpStatus_(429), true);
assert.strictEqual(searchProviderContext.isSearchProviderRetryableHttpStatus_(503), true);
const permanentCombinedError = searchProviderContext.createSearchProviderError_('検索プロバイダーを利用できません。', 'SEARCH_PROVIDERS_UNAVAILABLE', false);
assert.strictEqual(searchProviderContext.isRetryableSearchJobError_(permanentCombinedError), false);

const advanceImportContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), advanceImportContext, { filename: file });
});
const importJobFixture = {
  id: 'csv-job-1', job_type: 'csv_import', status: 'running', source: 'csv_upload',
  payload_json: '{"options":{"source":"csv_upload"}}', lock_token: 'csv-lock', total_count: 3,
};
const importRawFixture = [
  { id: 'raw-1', import_job_id: 'csv-job-1', status: 'queued', row_json: '{"company_name":"追加"}', result_json: '' },
  { id: 'raw-2', import_job_id: 'csv-job-1', status: 'queued', row_json: '{"company_name":"補完"}', result_json: '' },
  { id: 'raw-3', import_job_id: 'csv-job-1', status: 'queued', row_json: '{"company_name":"失敗"}', result_json: '' },
];
let finalizedImportPatch = null;
let completionLogCount = 0;
advanceImportContext.buildSearchJobRunWindow_ = () => ({ deadlineMs: Date.now() + 60000, startedAtMs: Date.now() });
advanceImportContext.isSearchJobRuntimeExhausted_ = () => false;
advanceImportContext.claimLeadCsvImportJobRun_ = () => ({ claimed: true, busy: false, job: importJobFixture, lockToken: 'csv-lock' });
advanceImportContext.listRawImportRowsForJob_ = () => importRawFixture.map((row) => Object.assign({}, row));
advanceImportContext.withScriptLock_ = (_operation, callback) => callback();
advanceImportContext.findSheetRecordById_ = (_sheetName, id) => importRawFixture.find((row) => row.id === id) || null;
advanceImportContext.upsertSyncLeadLocked_ = (raw) => {
  if (raw.company_name === '追加') return { action: 'added', lead: { id: 'lead-added' } };
  if (raw.company_name === '補完') return { action: 'filled', filledFields: 2, fields: ['email', 'phone'], lead: { id: 'lead-filled' } };
  throw Object.assign(new Error('invalid row'), { code: 'SYNC_INVALID' });
};
advanceImportContext.updateSheetRecord_ = (sheetName, id, patch) => {
  assert.strictEqual(sheetName, 'raw_import');
  const row = importRawFixture.find((item) => item.id === id);
  Object.assign(row, patch);
  return row;
};
advanceImportContext.updateClaimedLeadCsvImportJob_ = (_id, _token, patch) => {
  finalizedImportPatch = patch;
  return { owned: true, record: Object.assign({}, importJobFixture, patch) };
};
advanceImportContext.appendSheetRecord_ = (sheetName) => {
  assert.strictEqual(sheetName, 'sync_logs');
  completionLogCount += 1;
  return {};
};
advanceImportContext.appendSyncError_ = () => {};
advanceImportContext.nowIso_ = () => '2026-07-15T01:00:00.000Z';
const advancedImport = advanceImportContext.advanceLeadCsvImportJob('csv-job-1', { maxItems: 10, runtimeBudgetMs: 60000 });
assert.strictEqual(advancedImport.completed, true);
assert.strictEqual(advancedImport.added, 1);
assert.strictEqual(advancedImport.filled, 1);
assert.strictEqual(advancedImport.errors, 1);
assert.strictEqual(finalizedImportPatch.status, 'completed');
assert.strictEqual(finalizedImportPatch.processed_count, 3);
assert.strictEqual(completionLogCount, 1);
assert.strictEqual(advanceImportContext.isRetryableCsvImportError_({ code: 'SPREADSHEET_UNAVAILABLE', message: 'temporary' }), true);
assert.strictEqual(advanceImportContext.isRetryableCsvImportError_(new Error('Invalid email address.')), false);

const importIdempotencyContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), importIdempotencyContext, { filename: file });
});
importIdempotencyContext.getOrCreateSpreadsheet_ = () => ({});
importIdempotencyContext.ensureSheet_ = () => ({});
importIdempotencyContext.getHeaders_ = () => ['id', 'import_row_id'];
importIdempotencyContext.findLeadRecordsByExactColumnValue_ = () => [{ id: 'already-created', import_row_id: 'raw-idempotent' }];
importIdempotencyContext.createLeadLocked_ = () => { throw new Error('idempotent retry must not create another lead'); };
const idempotentImportRetry = importIdempotencyContext.upsertSyncLeadLocked_(
  { company_name: 'Retry company', email: 'retry@example.com' },
  { source: 'csv_upload', allow_duplicate: true, import_row_id: 'raw-idempotent' },
);
assert.strictEqual(idempotentImportRetry.action, 'skipped');
assert.strictEqual(idempotentImportRetry.reused, true);

const migrationContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), migrationContext, { filename: file });
});
const migrationHeaders = vm.runInContext('SHEET_DEFINITIONS.leads.slice()', migrationContext);
let stagingClearCount = 0;
let stagingHeaderWrite = null;
let migrationBackupCalls = 0;
let liveClearCount = 0;
let liveWriteValues = null;
let stagingDeleted = 0;
const stagingSheet = {
  getMaxRows: () => 10,
  getMaxColumns: () => 100,
  getLastColumn: () => migrationHeaders.length,
  getLastRow: () => 1,
  getRange: (row, column, rowCount, columnCount) => ({
    clearContent: () => { stagingClearCount += 1; },
    setValues: (values) => { if (row === 1) stagingHeaderWrite = values; },
    getValues: () => [],
  }),
  setFrozenRows: () => {},
};
const liveSheet = {
  getMaxRows: () => 10,
  getMaxColumns: () => 100,
  getDataRange: () => ({ getValues: () => [['id', 'company_name'], ['old-id', 'Old company']] }),
  getRange: (_row, _column, rowCount, _columnCount) => ({
    clearContent: () => { liveClearCount += 1; },
    setValues: (values) => { if (rowCount > 1) liveWriteValues = values; },
  }),
  setFrozenRows: () => {},
};
const migrationSpreadsheet = {
  getSheetByName: (name) => name === '__leads_migration_staging' ? stagingSheet : null,
  insertSheet: () => { throw new Error('staging already exists'); },
  deleteSheet: (sheet) => { assert.strictEqual(sheet, stagingSheet); stagingDeleted += 1; },
};
const migrationLockOptions = [];
migrationContext.withScriptLock_ = (_operation, callback, options) => {
  migrationLockOptions.push(options);
  return callback();
};
migrationContext.getOrCreateSpreadsheet_ = () => migrationSpreadsheet;
migrationContext.ensureSheet_ = () => liveSheet;
migrationContext.getHeaders_ = (sheet) => sheet === liveSheet ? migrationHeaders.slice() : migrationHeaders.slice();
migrationContext.countNonBlankSheetRows_ = () => 5;
migrationContext.ensureSheetGridSize_ = () => {};
migrationContext.formatHeaderRow_ = () => {};
migrationContext.clearRuntimeCaches_ = () => { throw new Error('prepare must not invalidate or replace live leads'); };
const preparedMigration = migrationContext.prepareLeadMigration({ totalRows: 3, replace: true });
assert.strictEqual(preparedMigration.liveDataPreserved, true);
assert.strictEqual(stagingClearCount, 1);
assert.deepStrictEqual(JSON.parse(JSON.stringify(stagingHeaderWrite)), [JSON.parse(JSON.stringify(migrationHeaders))]);
assert.strictEqual(liveClearCount, 0);
assert.strictEqual(migrationLockOptions[0].waitMs, 6000);
assert.strictEqual(migrationLockOptions[0].attempts, 5);

const duplicateMigrationRows = [
  (() => { const row = Array(migrationHeaders.length).fill(''); row[migrationHeaders.indexOf('id')] = 'duplicate-id'; row[migrationHeaders.indexOf('company_name')] = 'Company A'; return row; })(),
  (() => { const row = Array(migrationHeaders.length).fill(''); row[migrationHeaders.indexOf('id')] = 'duplicate-id'; row[migrationHeaders.indexOf('company_name')] = 'Company B'; return row; })(),
];
const duplicateMigrationSheet = {
  getLastRow: () => 3,
  getRange: () => ({ getValues: () => duplicateMigrationRows }),
};
assert.throws(() => migrationContext.readValidatedLeadMigrationRows_(duplicateMigrationSheet, migrationHeaders), /重複ID/);

const nextMigrationRow = Array(migrationHeaders.length).fill('');
nextMigrationRow[migrationHeaders.indexOf('id')] = 'new-id';
nextMigrationRow[migrationHeaders.indexOf('company_name')] = 'New company';
migrationContext.getLeadMigrationStagingSheet_ = () => stagingSheet;
migrationContext.assertLeadMigrationStagingHeaders_ = () => {};
migrationContext.readValidatedLeadMigrationRows_ = () => [nextMigrationRow];
migrationContext.createSpreadsheetBackup = () => { migrationBackupCalls += 1; return { id: 'backup-id', url: 'https://drive.example/backup' }; };
migrationContext.appendSheetRecord_ = () => ({});
migrationContext.nowIso_ = () => '2026-07-15T03:00:00.000Z';
migrationContext.safeJsonStringify_ = JSON.stringify;
migrationContext.clearRuntimeCaches_ = () => {};
assert.throws(() => migrationContext.finalizeLeadMigration({ expectedRows: 2 }), /移行件数が一致しません/);
assert.strictEqual(migrationBackupCalls, 0);
assert.strictEqual(liveClearCount, 0);
const finalizedMigration = migrationContext.finalizeLeadMigration({ expectedRows: 1, source: 'test' });
assert.strictEqual(finalizedMigration.migratedRows, 1);
assert.strictEqual(finalizedMigration.backup.id, 'backup-id');
assert.strictEqual(migrationBackupCalls, 1);
assert.strictEqual(liveClearCount, 1);
assert.strictEqual(liveWriteValues.length, 2);
assert.strictEqual(stagingDeleted, 1);

let searchResultRecord = {
  id: 'result-1', lead_id: '', job_id: 'job-1', result_type: 'prospecting',
  title: '復旧対象', url: 'https://example.com', snippet: '',
};
const searchResultLinkLocks = [];
context.findSheetRecordById_ = (sheetName) => sheetName === 'search_results' ? searchResultRecord : null;
context.findActiveLeadBySourceReference_ = () => ({ id: 'recovered-lead', company_name: '復旧対象' });
context.createLead = () => { throw new Error('recovery must reuse the previously created lead'); };
context.withScriptLock_ = (operation, callback, options) => {
  searchResultLinkLocks.push({ operation, options });
  return callback();
};
context.updateSheetRecord_ = (_sheetName, _id, patch) => {
  searchResultRecord = Object.assign({}, searchResultRecord, patch);
  return searchResultRecord;
};
const recoveredSearchResult = context.addSearchResultToLead('result-1', {});
assert.strictEqual(recoveredSearchResult.lead.id, 'recovered-lead');
assert.strictEqual(recoveredSearchResult.reused, true);
assert.strictEqual(recoveredSearchResult.recovered, true);
assert.strictEqual(recoveredSearchResult.result.lead_id, 'recovered-lead');
assert.deepStrictEqual(searchResultLinkLocks.map((item) => item.operation), [
  'claimSearchResultForLeadCreation',
  'finalizeSearchResultLeadCreation',
]);
assert(searchResultLinkLocks.every((item) => item.options.waitMs === 6000 && item.options.attempts === 5));
searchResultRecord = Object.assign({}, searchResultRecord, { lead_id: 'other-lead' });
assert.throws(() => context.finalizeSearchResultLeadCreation_('result-1', 'recovered-lead', 'uuid-1'), /別の営業先に紐付け済み/);

let replyLead = { id: 'reply-lead', status: '初回メール送信済み', reply_checked: false, archived_at: '' };
let replyUpdate = null;
let replyRecordLock = null;
context.getLeadById = () => replyLead;
context.findReplyLogByLeadAndThread_ = () => ({ id: 'existing-reply-log', lead_id: 'reply-lead', thread_id: 'thread-1' });
context.appendSheetRecord_ = () => { throw new Error('existing reply log must not be appended again'); };
context.updateLeadLocked_ = (id, patch) => {
  replyUpdate = { id, patch };
  replyLead = Object.assign({}, replyLead, patch);
  return replyLead;
};
context.withScriptLock_ = (operation, callback, options) => {
  replyRecordLock = { operation, options };
  return callback();
};
const recordedReply = context.recordDetectedReply_('reply-lead', { thread_id: 'thread-1', subject: '返信' });
assert.strictEqual(recordedReply.log.id, 'existing-reply-log');
assert.strictEqual(recordedReply.lead.reply_checked, true);
assert.strictEqual(replyUpdate.id, 'reply-lead');
assert.strictEqual(replyUpdate.patch.last_gmail_thread_id, 'thread-1');
assert.strictEqual(replyRecordLock.operation, 'recordDetectedReply');
assert.strictEqual(replyRecordLock.options.waitMs, 6000);
assert.strictEqual(replyRecordLock.options.attempts, 5);
replyUpdate = null;
const alreadyRecordedReply = context.recordDetectedReply_('reply-lead', { thread_id: 'thread-1' });
assert.strictEqual(alreadyRecordedReply.alreadyRecorded, true);
assert.strictEqual(replyUpdate, null);
assert.strictEqual(context.replyFalsePositiveRestoreStatus_({ source: 'source_page' }, null), '対応中');
assert.strictEqual(context.replyFalsePositiveRestoreStatus_({ source: 'manual' }, null), '未対応');
assert.strictEqual(context.replyFalsePositiveRestoreStatus_({}, { send_type: '初回メール' }), '初回メール送信済み');
replyLead = Object.assign({}, replyLead, {
  status: '返信あり',
  reply_checked: true,
  last_gmail_thread_id: 'legacy-thread',
  source: 'source_page',
});
const restoredFalsePositive = context.restoreReplyFalsePositiveCandidate_({
  leadId: 'reply-lead',
  restoreStatus: '初回メール送信済み',
  expectedStatus: '返信あり',
  expectedReplyChecked: true,
  expectedThreadId: 'legacy-thread',
});
assert.strictEqual(restoredFalsePositive.ok, true);
assert.strictEqual(replyLead.status, '初回メール送信済み');
assert.strictEqual(replyLead.reply_checked, false);
replyLead = Object.assign({}, replyLead, {
  status: '商談予定',
  reply_checked: true,
  last_gmail_thread_id: 'new-human-thread',
});
replyUpdate = null;
const staleFalsePositiveRestore = context.restoreReplyFalsePositiveCandidate_({
  leadId: 'reply-lead',
  restoreStatus: '初回メール送信済み',
  expectedStatus: '返信あり',
  expectedReplyChecked: true,
  expectedThreadId: 'legacy-thread',
});
assert.strictEqual(staleFalsePositiveRestore.conflict, true);
assert.strictEqual(replyUpdate, null, 'a stale false-positive repair must not overwrite a newer lead state');

const replyRepairContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), replyRepairContext, { filename: file });
});
let replyRepairLeadQuery = null;
let replyRepairLogFields = [];
let replyRepairLogReadOptions = null;
replyRepairContext.listLeads = (query) => {
  replyRepairLeadQuery = Object.assign({}, query);
  return ({
  total: 3,
  items: [
    { id: 'lead-genuine', company_name: 'Genuine', email: 'genuine@example.net', reply_checked: true, last_gmail_thread_id: 'thread-genuine' },
    { id: 'lead-auto-only', company_name: 'Auto', email: 'auto@example.net', reply_checked: true, last_gmail_thread_id: 'thread-auto' },
  ],
  });
};
replyRepairContext.buildLatestSuccessfulMailHistoryByLeadId_ = () => ({
  'lead-genuine': { sent_at: '2026-07-15T10:00:00Z', send_type: '初回メール' },
  'lead-auto-only': { sent_at: '2026-07-15T10:00:00Z', send_type: '初回メール' },
});
replyRepairContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  assert.strictEqual(sheetName, 'reply_logs');
  replyRepairLogFields = fields.slice();
  replyRepairLogReadOptions = Object.assign({}, options);
  return [
  { lead_id: 'lead-genuine', received_at: '2026-07-15T09:00:00Z', subject: '自動返信', snippet: '' },
  { lead_id: 'lead-genuine', received_at: '2026-07-15T11:00:00Z', subject: 'ご連絡ありがとうございます', snippet: '担当者からの返信です' },
  { lead_id: 'lead-auto-only', received_at: '2026-07-15T11:00:00Z', subject: '自動返信', snippet: '受付しました' },
  { lead_id: 'lead-outside-page', received_at: '2026-07-15T11:00:00Z', subject: '自動返信', snippet: '対象ページ外' },
  ];
};
const replyRepairCandidates = replyRepairContext.listReplyFalsePositiveCandidates({ limit: 2, offset: 0 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(replyRepairCandidates.candidates.map((item) => item.leadId))), ['lead-auto-only']);
assert.strictEqual(replyRepairCandidates.candidates[0].expectedThreadId, 'thread-auto');
assert.strictEqual(replyRepairCandidates.total, 3);
assert.strictEqual(replyRepairCandidates.remaining, 1);
assert.strictEqual(replyRepairCandidates.stoppedEarly, true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(replyRepairLeadQuery)), {
  filter: 'reply', limit: 2, offset: 0, includeArchived: false, includeStats: false, includeFields: ['last_gmail_thread_id'],
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(replyRepairLogFields)), [
  'lead_id', 'from_email', 'subject', 'snippet', 'received_at', 'created_at',
]);
assert.deepStrictEqual(replyRepairLogReadOptions, { maxGapColumns: 0 });
replyRepairContext.listReplyFalsePositiveCandidates = () => ({
  candidates: [{ leadId: 'restore-ok', restoreStatus: '未対応' }, { leadId: 'restore-fail', restoreStatus: '未対応' }],
  errors: [], remaining: 0,
});
replyRepairContext.restoreReplyFalsePositiveCandidate_ = (candidate) => {
  if (candidate.leadId === 'restore-fail') throw new Error('temporary update failure');
  return { ok: true, conflict: false };
};
const partialReplyRestore = replyRepairContext.restoreReplyFalsePositiveCandidates({});
assert.strictEqual(partialReplyRestore.updated, 1);
assert.strictEqual(partialReplyRestore.errors.length, 1);
assert.deepStrictEqual(JSON.parse(JSON.stringify(partialReplyRestore.candidates.map((item) => item.leadId))), ['restore-fail']);

let spreadsheetBindingDeleted = false;
let replacementSpreadsheetCreated = false;
const bindingContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), bindingContext, { filename: 'Code.gs' });
bindingContext.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: () => 'stored-spreadsheet-id',
    deleteProperty: () => { spreadsheetBindingDeleted = true; },
    setProperty: () => {},
  }),
};
bindingContext.SpreadsheetApp = {
  openById: () => { throw new Error('temporary Google Sheets failure'); },
  getActiveSpreadsheet: () => ({ id: 'unexpected-active' }),
  create: () => { replacementSpreadsheetCreated = true; return {}; },
};
bindingContext.logError_ = () => {};
assert.throws(() => bindingContext.getOrCreateSpreadsheet_(), /保存先スプレッドシートを開けません/);
assert.strictEqual(spreadsheetBindingDeleted, false);
assert.strictEqual(replacementSpreadsheetCreated, false);

const candidateContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), candidateContext, { filename: 'Code.gs' });
candidateContext.getOrCreateSpreadsheet_ = () => ({});
candidateContext.ensureSheet_ = () => ({});
candidateContext.buildMasterBlockContext_ = () => ({});
candidateContext.isArchivedLead_ = (lead) => Boolean(lead.archived_at);
candidateContext.isEmailSendTarget_ = (lead) => Boolean(lead.sendable);
candidateContext.isValidEmailAddress_ = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''));
candidateContext.normalizeBooleanLike_ = (value) => value === true;
candidateContext.readSheetRecordFields_ = () => [
  { id: 'other-genre', email: 'other@example.com', genre: '医療', sendable: true, updated_at: '2026-07-15T00:04:00Z' },
  { id: 'duplicate-old', email: 'same@example.com', genre: 'キャンプ', sendable: true, updated_at: '2026-07-15T00:01:00Z' },
  { id: 'duplicate-new', email: 'SAME@example.com', genre: 'キャンプ', sendable: true, updated_at: '2026-07-15T00:03:00Z' },
  { id: 'unique', email: 'unique@example.com', genre: 'キャンプ', sendable: true, updated_at: '2026-07-15T00:02:00Z' },
  { id: 'blocked', email: 'blocked@example.com', genre: 'キャンプ', sendable: false, updated_at: '2026-07-15T00:05:00Z' },
];
const emailCandidates = candidateContext.listEmailSendCandidates({ genre: 'キャンプ', limit: 100 });
assert.strictEqual(emailCandidates.total, 2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(emailCandidates.items.map((lead) => lead.id))), ['duplicate-new', 'unique']);
assert.strictEqual(candidateContext.matchesLeadListFilter_({ email: 'contact@example.com' }, 'has_email', {}), true);
assert.strictEqual(candidateContext.matchesLeadListFilter_({ email: 'not-an-email' }, 'has_email', {}), false);
assert.strictEqual(candidateContext.normalizeListOptions_({ filter: 'has_email' }).filter, 'has_email');

const scheduledCandidateContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), scheduledCandidateContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), scheduledCandidateContext, { filename: 'Email.gs' });
scheduledCandidateContext.isArchivedLead_ = (lead) => Boolean(lead.archived_at);
scheduledCandidateContext.isEmailSendTarget_ = (lead) => Boolean(lead.sendable);
const scheduledSelection = scheduledCandidateContext.selectScheduledEmailCandidates_([
  { id: 'camp-old', email: 'camp-old@example.com', genre: 'キャンプ', sendable: true, updated_at: '2026-07-17T00:01:00Z' },
  { id: 'care-new', email: 'care@example.com', genre: '介護', sendable: true, updated_at: '2026-07-17T00:04:00Z' },
  { id: 'camp-new', email: 'camp-new@example.com', genre: 'キャンプ', sendable: true, updated_at: '2026-07-17T00:03:00Z' },
  { id: 'camp-duplicate', email: 'CAMP-NEW@example.com', genre: 'キャンプ', sendable: true, updated_at: '2026-07-17T00:02:00Z' },
  { id: 'unsupported', email: 'medical@example.com', genre: '医療', sendable: true, updated_at: '2026-07-17T00:05:00Z' },
], [
  { id: 'template-camp', name: 'キャンプ初回', genre: 'キャンプ' },
  { id: 'template-care', name: '介護初回', genre: '介護' },
], {}, 3);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(scheduledSelection.selected.map((item) => item.lead.id))),
  ['camp-new', 'care-new', 'camp-old'],
  'automatic sending should round-robin production template genres and deduplicate email addresses'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(scheduledSelection.groups.map((group) => [group.templateId, group.leadIds.length]))),
  [['template-camp', 2], ['template-care', 1]]
);

const scheduledRunContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), scheduledRunContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), scheduledRunContext, { filename: 'Email.gs' });
let scheduledClaimCount = 0;
let scheduledHeartbeat = null;
let scheduledFinal = null;
scheduledRunContext.getMailSendingControl_ = () => ({ enabled: true, reason: '' });
scheduledRunContext.buildSendWindowStatus_ = () => ({ enabled: true, allowed: true, label: '07:00-08:00' });
scheduledRunContext.claimScheduledEmailJob_ = () => { scheduledClaimCount += 1; return { busy: false, job: { id: 'automatic-job' } }; };
scheduledRunContext.buildScheduledEmailBatchPlan_ = () => ({
  selectedCount: 2,
  dailyRemaining: 80,
  mailQuota: 94,
  groups: [{ templateId: 'template-camp', templateName: 'キャンプ初回', genre: 'キャンプ', leadIds: ['lead-1', 'lead-2'] }],
});
scheduledRunContext.sendLeadEmailBatch = (ids, templateId, options) => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ids)), ['lead-1', 'lead-2']);
  assert.strictEqual(templateId, 'template-camp');
  assert.strictEqual(options.source, 'automatic_email_trigger');
  return { success: 2, failed: 0, blocked: 0, results: ids.map((id) => ({ ok: true, leadId: id })) };
};
scheduledRunContext.getDefaultGmailSenderName_ = () => '【Ad Clutch】村松 侑哉';
scheduledRunContext.heartbeatScheduledEmailJob_ = (jobId, processed, total) => { scheduledHeartbeat = { jobId, processed, total }; };
scheduledRunContext.finalizeScheduledEmailJob_ = (jobId, summary) => { scheduledFinal = { jobId, summary }; };
scheduledRunContext.clearRuntimeCaches_ = () => {};
scheduledRunContext.isExpectedOperationError_ = () => false;
scheduledRunContext.logError_ = () => {};
const scheduledRun = scheduledRunContext.runScheduledEmailBatch({});
assert.strictEqual(scheduledRun.success, 2);
assert.strictEqual(scheduledRun.failed, 0);
assert.strictEqual(scheduledRun.deliveryRecovery.processed, 0);
assert.strictEqual(scheduledClaimCount, 1);
assert.deepStrictEqual(scheduledHeartbeat, { jobId: 'automatic-job', processed: 2, total: 2 });
assert.strictEqual(scheduledFinal.summary.status, 'completed');

scheduledRunContext.buildSendWindowStatus_ = () => ({ enabled: true, allowed: false, label: '07:00-08:00' });
const scheduledOutsideWindow = scheduledRunContext.runScheduledEmailBatch({});
assert.strictEqual(scheduledOutsideWindow.skipped, true);
assert.strictEqual(scheduledOutsideWindow.reason, 'outside_send_window');
assert.strictEqual(scheduledClaimCount, 1, 'outside-window trigger checks must not create a send job');

const triggerContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Operations.gs'), 'utf8'), triggerContext, { filename: 'Operations.gs' });
triggerContext.BACKGROUND_JOB_DEFAULT_RUNTIME_MS = 240000;
triggerContext.BACKGROUND_JOB_IMMEDIATE_DELAY_MS = 5000;
const installedTriggers = [];
let automaticMailCadence = 0;
let dailyDuplicateCleanupHour = null;
let immediateBackgroundDelay = null;
triggerContext.withScriptLock_ = (_operation, callback) => callback();
triggerContext.clearRuntimeCaches_ = () => {};
triggerContext.repairDuplicateLeadDomains = (options) => ({ ok: true, archived: 2, options });
triggerContext.appendSyncError_ = () => {};
triggerContext.ScriptApp = {
  getProjectTriggers: () => installedTriggers,
  deleteTrigger: (trigger) => installedTriggers.splice(installedTriggers.indexOf(trigger), 1),
  newTrigger: (handler) => ({
    timeBased: () => ({
      after: (delayMs) => ({ create: () => {
        immediateBackgroundDelay = delayMs;
        installedTriggers.push({ getHandlerFunction: () => handler, getEventType: () => 'CLOCK' });
      } }),
      everyMinutes: (minutes) => ({ create: () => {
        if (handler === 'runScheduledEmailBatch') automaticMailCadence = minutes;
        installedTriggers.push({ getHandlerFunction: () => handler, getEventType: () => 'CLOCK' });
      } }),
      everyHours: (_hours) => ({ create: () => installedTriggers.push({ getHandlerFunction: () => handler, getEventType: () => 'CLOCK' }) }),
      atHour: (hour) => ({
        everyDays: (_days) => ({ create: () => {
          if (handler === 'runDailyDuplicateDomainCleanup') dailyDuplicateCleanupHour = hour;
          installedTriggers.push({ getHandlerFunction: () => handler, getEventType: () => 'CLOCK' });
        } }),
      }),
    }),
  }),
};
const installed = triggerContext.installDefaultTriggers();
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(installed.triggers.map((trigger) => trigger.handler).sort())),
  ['advanceQueuedJobs', 'checkRepliesForLeads', 'runDailyDuplicateDomainCleanup', 'runScheduledEmailBatch']
);
const reinstalled = triggerContext.installDefaultTriggers();
assert.strictEqual(reinstalled.triggers.length, 4, 'reinstalling defaults must not create duplicate triggers');
assert.strictEqual(
  reinstalled.triggers.filter((trigger) => trigger.handler === 'runDailyDuplicateDomainCleanup').length,
  1
);
assert.strictEqual(automaticMailCadence, 10);
assert.strictEqual(dailyDuplicateCleanupHour, 3);
const immediateBackgroundTrigger = triggerContext.ensureImmediateBackgroundJobTrigger_();
assert.strictEqual(immediateBackgroundTrigger.created, true);
assert.strictEqual(immediateBackgroundDelay, 5000);
triggerContext.clearProjectTriggersForHandler_('advanceQueuedJobsNow');
triggerContext.ensureImmediateBackgroundJobTrigger_(60000);
assert.strictEqual(immediateBackgroundDelay, 60000);
assert(installedTriggers.some((trigger) => trigger.getHandlerFunction() === 'advanceQueuedJobsNow'));
triggerContext.advanceQueuedJobs = (options) => ({ options });
const immediateBackgroundRun = triggerContext.advanceQueuedJobsNow();
assert.strictEqual(immediateBackgroundRun.options.source, 'immediate_trigger');
assert(!installedTriggers.some((trigger) => trigger.getHandlerFunction() === 'advanceQueuedJobsNow'));
const dailyDuplicateCleanup = triggerContext.runDailyDuplicateDomainCleanup();
assert.strictEqual(dailyDuplicateCleanup.archived, 2);
assert.strictEqual(dailyDuplicateCleanup.scheduled, true);
assert.strictEqual(dailyDuplicateCleanup.schedule, 'daily');
assert.deepStrictEqual(JSON.parse(JSON.stringify(dailyDuplicateCleanup.options)), {
  dryRun: false,
  scanLimit: 20000,
  maxGroups: 50,
  lockWaitMs: 6000,
});

const historyContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), historyContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), historyContext, { filename: 'Email.gs' });
historyContext.getOrCreateSpreadsheet_ = () => ({});
historyContext.ensureSheet_ = () => ({});
historyContext.findSheetRecordsByExactFieldValues_ = (_sheet, _field, values) => [
  { id: 'history-1', lead_id: 'lead-history', sent_at: '2026-07-15T00:03:00Z' },
  { id: 'history-2', lead_id: 'lead-history', sent_at: '2026-07-15T00:02:00Z' },
  { id: 'history-3', lead_id: 'lead-history', sent_at: '2026-07-15T00:01:00Z' },
  { id: 'other-history', lead_id: 'other-lead', sent_at: '2026-07-15T00:04:00Z' },
].filter((history) => values.includes(history.lead_id));
const pagedHistories = historyContext.listLeadSendHistories('lead-history', { limit: 2 });
assert.strictEqual(pagedHistories.total, 3);
assert.strictEqual(pagedHistories.items.length, 2);

const duplicateImportContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), duplicateImportContext, { filename: file });
});
duplicateImportContext.withScriptLock_ = (_operation, callback) => callback();
duplicateImportContext.getOrCreateSpreadsheet_ = () => ({});
duplicateImportContext.ensureSheet_ = () => ({});
duplicateImportContext.getHeaders_ = () => [];
duplicateImportContext.readSheetRecords_ = () => [];
duplicateImportContext.readSheetRecordFields_ = () => [];
duplicateImportContext.nowIso_ = () => '2026-07-15T00:00:00.000Z';
duplicateImportContext.Utilities = { getUuid: () => 'generated-id' };
const templateDuplicateImport = duplicateImportContext.importEmailTemplates({
  dryRun: true,
  records: [
    { id: 'template-duplicate', name: 'A', subject: 'Subject', body: 'Body' },
    { id: 'template-duplicate', name: 'B', subject: 'Subject', body: 'Body' },
  ],
});
assert.strictEqual(templateDuplicateImport.inserted, 1);
assert.strictEqual(templateDuplicateImport.skipped, 1);
const historyDuplicateImport = duplicateImportContext.importSendHistories({
  dryRun: true,
  records: [
    { id: 'history-duplicate', lead_id: 'lead-1' },
    { id: 'history-duplicate', lead_id: 'lead-1' },
  ],
});
assert.strictEqual(historyDuplicateImport.inserted, 1);
assert.strictEqual(historyDuplicateImport.skipped, 1);

const duplicateContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), duplicateContext, { filename: 'Code.gs' });
duplicateContext.getOrCreateSpreadsheet_ = () => ({});
duplicateContext.ensureSheet_ = () => ({});
duplicateContext.isArchivedLead_ = () => false;
let duplicateCandidateRequestedFields = [];
let duplicateCandidateReadOptions = null;
duplicateContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  assert.strictEqual(sheetName, 'leads');
  duplicateCandidateRequestedFields = fields.slice();
  duplicateCandidateReadOptions = Object.assign({}, options);
  return [
  { id: 'current', company_name: 'Current' },
  { id: 'candidate-1', company_name: 'A' },
  { id: 'candidate-2', company_name: 'B' },
  { id: 'candidate-3', company_name: 'C' },
  ];
};
duplicateContext.duplicateKeysForLead_ = () => ({});
duplicateContext.duplicateMatchedKeys_ = () => ['email'];
duplicateContext.duplicateReasonLabels_ = () => ['メール'];
duplicateContext.duplicateReasonDetail_ = () => 'same@example.com';
const pagedDuplicates = duplicateContext.listLeadDuplicateCandidates('current', { limit: 2 });
assert.strictEqual(pagedDuplicates.total, 3);
assert.strictEqual(pagedDuplicates.items.length, 2);
assert.deepStrictEqual(JSON.parse(JSON.stringify(duplicateCandidateRequestedFields)), [
  'id', 'company_name', 'normalized_company_name', 'facility_name', 'email', 'email_domain',
  'website_url', 'website_domain', 'form_url', 'status', 'send_count', 'archived_at',
]);
['custom_fields_json', 'source_payload_json', 'notes', 'address', 'meeting_memo'].forEach((field) => {
  assert(!duplicateCandidateRequestedFields.includes(field));
});
assert.deepStrictEqual(duplicateCandidateReadOptions, { maxGapColumns: 0 });

const duplicateProjectionContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), duplicateProjectionContext, { filename: file });
});
const duplicateProjectionFixtures = [
  {
    id: 'current-lead', company_name: '株式会社サンプル', normalized_company_name: 'サンプル', facility_name: '本店',
    email: 'info@sample.example', email_domain: 'sample.example', website_url: 'https://sample.example/',
    website_domain: 'sample.example', form_url: 'https://sample.example/contact', status: '未対応', send_count: 1,
    source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }), notes: 'large'.repeat(1000),
  },
  {
    id: 'same-email', company_name: '別名', normalized_company_name: '別名', facility_name: '支店',
    email: 'INFO@sample.example', email_domain: 'sample.example', website_url: 'https://other.example/',
    website_domain: 'other.example', status: '対応中', send_count: 3,
    source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }),
  },
  {
    id: 'same-domain', company_name: '株式会社サンプル', normalized_company_name: 'サンプル', facility_name: '別館',
    email: 'branch@sample.example', email_domain: 'sample.example', website_url: 'https://sample.example/about',
    website_domain: 'sample.example', status: '未対応', send_count: 0,
    source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }),
  },
  {
    id: 'archived-same-domain', company_name: '株式会社サンプル', normalized_company_name: 'サンプル',
    website_domain: 'sample.example', status: '対応不要', archived_at: '2026-07-01T00:00:00+09:00',
  },
  { id: 'unrelated', company_name: '無関係', normalized_company_name: '無関係', email: 'hello@other.example', website_domain: 'other.example', status: '未対応' },
];
duplicateProjectionContext.readSheetRecordFields_ = () => duplicateProjectionFixtures.map((lead) => Object.assign({}, lead));
const fullDuplicateProjectionResult = JSON.parse(JSON.stringify(duplicateProjectionContext.listLeadDuplicateCandidates('current-lead', { limit: 10 })));
const duplicateProjectionFields = JSON.parse(JSON.stringify(duplicateProjectionContext.leadDuplicateCandidateFields_()));
duplicateProjectionContext.readSheetRecordFields_ = () => duplicateProjectionFixtures.map((lead) => duplicateProjectionFields.reduce((record, field) => {
  record[field] = lead[field] === undefined ? '' : lead[field];
  return record;
}, {}));
const projectedDuplicateProjectionResult = JSON.parse(JSON.stringify(duplicateProjectionContext.listLeadDuplicateCandidates('current-lead', { limit: 10 })));
assert.deepStrictEqual(projectedDuplicateProjectionResult, fullDuplicateProjectionResult);
assert.deepStrictEqual(projectedDuplicateProjectionResult.items.map((item) => item.id), ['same-email', 'same-domain']);
assert(projectedDuplicateProjectionResult.items[0].reason.includes('メール'));
assert(projectedDuplicateProjectionResult.items[1].reason.includes('ドメイン'));

const sourcePageIndexContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sourcePageIndexContext, { filename: file });
});
const sourcePageIndexFixtures = [
  {
    id: 'source-id-match', source: 'source_page', source_id: 'site:item:1', external_id: 'https://guide.example/detail/1',
    company_name: '株式会社森のキャンプ', normalized_company_name: '森のキャンプ', facility_name: '森のキャンプ場',
    website_url: 'https://forest-camp.example/', source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }),
    notes: 'large'.repeat(1000),
  },
  {
    id: 'website-match', source: 'manual', source_id: '', external_id: '', company_name: '湖畔リゾート',
    normalized_company_name: '湖畔リゾート', facility_name: '湖畔リゾート', website_url: 'https://lake.example/path/',
    source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }),
  },
  {
    id: 'retreat-match', source: 'manual', source_id: '', external_id: '', company_name: 'RetreatCampまほろば',
    normalized_company_name: 'retreatcampまほろば', facility_name: 'RetreatCampまほろば',
    website_url: 'https://retreatcamp-mahoroba.example/',
  },
  {
    id: 'tadayoi-match', source: 'manual', source_id: '', external_id: '', company_name: 'TADAYOI',
    normalized_company_name: 'tadayoi', facility_name: 'TADAYOI', website_url: 'https://ama-tadayoi.example/',
  },
  {
    id: 'crystal-villa-distinct', source: 'manual', source_id: '', external_id: '', company_name: 'クリスタルヴィラ白良浜ビーチ',
    normalized_company_name: 'クリスタルヴィラ白良浜ビチ', facility_name: 'クリスタルヴィラ白良浜ビーチ',
    website_url: 'https://shirarahama-crystalvilla.example/',
  },
  {
    id: 'generic-camp-name', source: 'manual', source_id: '', external_id: '', company_name: 'オートキャンプ場',
    normalized_company_name: 'オートキャンプ場', facility_name: 'オートキャンプ場',
    website_url: 'https://generic-auto-camp.example/',
  },
  {
    id: 'archived-match', source: 'source_page', source_id: 'archived:item', external_id: 'https://guide.example/archived',
    company_name: '閉鎖施設', normalized_company_name: '閉鎖施設', facility_name: '閉鎖施設', website_url: 'https://closed.example/',
    archived_at: '2026-07-01T00:00:00+09:00',
  },
];
let sourcePageIndexRequestedFields = [];
let sourcePageIndexReadOptions = null;
let sourcePageIndexProjectionEnabled = false;
sourcePageIndexContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  assert.strictEqual(sheetName, 'leads');
  sourcePageIndexRequestedFields = fields.slice();
  sourcePageIndexReadOptions = Object.assign({}, options);
  if (!sourcePageIndexProjectionEnabled) return sourcePageIndexFixtures.map((lead) => Object.assign({}, lead));
  return sourcePageIndexFixtures.map((lead) => fields.reduce((record, field) => {
    record[field] = lead[field] === undefined ? '' : lead[field];
    return record;
  }, {}));
};
const summarizeSourcePageIndex = (index) => ['sourceIds', 'externalUrls', 'websiteUrls', 'websiteDomains', 'historicalWebsiteDomains', 'names'].reduce((summary, key) => {
  summary[key] = Object.keys(index[key] || {}).sort().map((value) => [value, index[key][value].id]);
  return summary;
}, {});
const fullSourcePageIndex = sourcePageIndexContext.buildSourcePageLeadIndex_();
sourcePageIndexProjectionEnabled = true;
const projectedSourcePageIndex = sourcePageIndexContext.buildSourcePageLeadIndex_();
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(summarizeSourcePageIndex(projectedSourcePageIndex))),
  JSON.parse(JSON.stringify(summarizeSourcePageIndex(fullSourcePageIndex)))
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(sourcePageIndexRequestedFields)), [
  'id', 'source', 'source_id', 'external_id', 'company_name', 'normalized_company_name', 'facility_name', 'website_url', 'archived_at',
]);
['custom_fields_json', 'source_payload_json', 'notes', 'address', 'email', 'form_url'].forEach((field) => {
  assert(!sourcePageIndexRequestedFields.includes(field));
});
assert.deepStrictEqual(sourcePageIndexReadOptions, { maxGapColumns: 0 });
assert.strictEqual(sourcePageIndexContext.findExistingSourcePageLead_({ source_id: 'site:item:1' }, '', '', projectedSourcePageIndex).id, 'source-id-match');
assert.strictEqual(sourcePageIndexContext.findExistingSourcePageLead_({ detail_url: 'https://guide.example/detail/1' }, '', '', projectedSourcePageIndex).id, 'source-id-match');
assert.strictEqual(sourcePageIndexContext.findExistingSourcePageLead_({}, '', 'https://lake.example/path/', projectedSourcePageIndex).id, 'website-match');
assert.strictEqual(sourcePageIndexContext.findExistingSourcePageLead_({}, '', 'https://lake.example/different-path/', projectedSourcePageIndex).id, 'website-match');
assert.strictEqual(sourcePageIndexContext.findExistingSourcePageLead_({}, '湖畔リゾート', '', projectedSourcePageIndex).id, 'website-match');
assert.strictEqual(
  sourcePageIndexContext.findExistingSourcePageLead_(
    {},
    'RetreatCampまほろば -リトリートキャンプまほろば',
    'https://glamping-yamanashi.example/',
    projectedSourcePageIndex
  ).id,
  'retreat-match',
  'strong facility-name containment must block re-adding the same lead from a different listing domain'
);
assert.strictEqual(
  sourcePageIndexContext.findExistingSourcePageLead_(
    {},
    'TADAYOI 海士グランピング',
    'https://glamping-shimane.example/',
    projectedSourcePageIndex
  ).id,
  'tadayoi-match',
  'distinctive seven-character brands must block re-adding the same lead from a different listing domain'
);
assert.strictEqual(
  sourcePageIndexContext.findExistingSourcePageLead_(
    {},
    'クリスタルヴィラ白浜',
    'https://shirahama-crystalvilla.example/',
    projectedSourcePageIndex
  ),
  null,
  'similar but non-contained facility names must remain separate'
);
assert.strictEqual(
  sourcePageIndexContext.findExistingSourcePageLead_(
    {},
    '青木湖オートキャンプ場',
    'https://aokiko-auto-camp.example/',
    projectedSourcePageIndex
  ),
  null,
  'generic facility labels must not cause broad false-positive deduplication'
);
[
  ['ウェナヴィレッジくじゅう', 'ウェナヴィレッジくじゅう キャンプ場'],
  ['太陽と星が輝く宿 季楽～KIRA～', '太陽と星が輝く宿 季楽'],
  ['こしかの温泉グランピング', '美肌の湯 こしかの温泉グランピング'],
  ['MARINE Q', 'MARINE-Qキャンプ'],
  ['大月アウトドアフィールド KASHINISHI', '大月アウトドアフィールド KASHINISHI（旧：樫西園地キャンプ場 ）'],
].forEach(([candidateName, existingName]) => {
  assert.strictEqual(
    sourcePageIndexContext.areSourcePageLeadNamesClearlySame_(candidateName, existingName),
    true,
    `observed duplicate names must match: ${candidateName} / ${existingName}`
  );
});
const reviewDuplicateExisting = {
  id: 'existing-mahoroba',
  source: 'manual',
  facility_name: 'RetreatCampまほろば',
  website_url: 'https://retreatcamp-mahoroba.example/',
  status: '初回メール送信済み',
};
const reviewDuplicateCandidate = {
  id: 'review-mahoroba',
  source: 'source_page',
  facility_name: 'RetreatCampまほろば -リトリートキャンプまほろば',
  website_url: 'https://glamping-yamanashi.example/',
  status: '未対応',
};
const distinctReviewCandidate = {
  id: 'review-crystal-shirahama',
  source: 'source_page',
  facility_name: 'クリスタルヴィラ白浜',
  website_url: 'https://shirahama-crystalvilla.example/',
  status: '未対応',
};
const distinctExistingLead = {
  id: 'existing-crystal-shirarahama',
  source: 'manual',
  facility_name: 'クリスタルヴィラ白良浜ビーチ',
  website_url: 'https://shirarahama-crystalvilla.example/',
  status: '未対応',
};
const reviewDuplicateIds = sourcePageIndexContext.buildReviewDuplicateLeadIds_([
  reviewDuplicateExisting,
  distinctExistingLead,
  reviewDuplicateCandidate,
  distinctReviewCandidate,
]);
assert.strictEqual(reviewDuplicateIds['review-mahoroba'], 'existing-mahoroba');
assert.strictEqual(reviewDuplicateIds['review-crystal-shirahama'], undefined);
const unhandledSameNameIds = sourcePageIndexContext.buildReviewDuplicateLeadIds_([
  {
    id: 'unhandled-first',
    source: 'source_page',
    facility_name: 'みどりの丘',
    website_url: 'https://first-midori.example/',
    status: '未対応',
  },
  {
    id: 'unhandled-second',
    source: 'source_page',
    facility_name: 'みどりの丘',
    website_url: 'https://second-midori.example/',
    status: '未対応',
  },
]);
assert.strictEqual(
  unhandledSameNameIds['unhandled-second'],
  undefined,
  'an ambiguous same-name lead must remain visible when the earlier lead is also unhandled and the domains differ'
);
assert.strictEqual(
  sourcePageIndexContext.matchesLeadListFilter_(reviewDuplicateCandidate, 'review', { reviewDuplicateLeadIds: reviewDuplicateIds }),
  false,
  'existing sales leads must not reappear in the review queue'
);
assert.strictEqual(
  sourcePageIndexContext.classifyLeadListState_(reviewDuplicateCandidate, { reviewDuplicateLeadIds: reviewDuplicateIds }),
  'no_action',
  'suppressed review duplicates must stay out of the review state group'
);
assert.strictEqual(sourcePageIndexContext.leadListQueryNeedsMasterContext_({ filter: 'review', includeStats: false }), true);
assert.strictEqual(
  sourcePageIndexContext.findExistingSourcePageLead_(
    { source_id: 'archived:item' },
    '閉鎖施設',
    'https://closed.example/',
    projectedSourcePageIndex
  ).id,
  'archived-match',
  'archived sales-history domains must block automated source-page re-collection'
);
const historicalReviewDuplicateIds = sourcePageIndexContext.buildReviewDuplicateLeadIds_([
  {
    id: 'review-before-history',
    source: 'source_page',
    facility_name: '再収集候補',
    website_url: 'https://history-order.example/new',
    status: '未対応',
  },
  {
    id: 'archived-after-review',
    source: 'source_page',
    facility_name: '過去登録施設',
    website_url: 'https://history-order.example/old',
    status: '対応不要',
    archived_at: '2026-07-01T00:00:00+09:00',
  },
]);
assert.strictEqual(
  historicalReviewDuplicateIds['review-before-history'],
  'archived-after-review',
  'archived domains must suppress review candidates regardless of sheet row order'
);

const sparseHeaders = historyContext.getHeaders_({
  getLastColumn: () => 3,
  getRange: () => ({ getValues: () => [['id', '', 'email']] }),
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(sparseHeaders)), ['id', '', 'email']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(historyContext.rowToRecord_(sparseHeaders, ['lead-1', 'orphaned-value', 'safe@example.com']))), {
  id: 'lead-1',
  email: 'safe@example.com',
});

const analyticsContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), analyticsContext, { filename: file });
});
analyticsContext.nowIso_ = () => '2026-07-15T12:00:00+09:00';
const analyticsSnapshot = analyticsContext.buildAnalyticsSnapshot_([
  { id: 'lead-a', created_at: '2026-07-01T09:00:00+09:00', updated_at: '2026-07-10T09:00:00+09:00', source: 'source_page', genre: 'キャンプ', reply_checked: true, status: '返信あり' },
  { id: 'lead-b', created_at: '2026-06-01T09:00:00+09:00', updated_at: '2026-07-11T09:00:00+09:00', source: 'csv_upload', genre: '美容', send_ng: true, status: '送信NG' },
  { id: 'lead-c', created_at: '2026-06-02T09:00:00+09:00', updated_at: '2026-06-20T09:00:00+09:00', source: 'manual', genre: 'キャンプ', deal_status: '受注', status: '受注' },
  { id: 'lead-archived', created_at: '2026-07-01T09:00:00+09:00', updated_at: '2026-07-01T09:00:00+09:00', archived_at: '2026-07-02T09:00:00+09:00', genre: 'キャンプ' },
], [
  { id: 'history-a1', lead_id: 'lead-a', sent_at: '2026-07-14T10:00:00+09:00', send_type: '初回メール', send_result: '成功', template_id: 'template-a', template_name: 'A', genre: 'キャンプ' },
  { id: 'history-a2', lead_id: 'lead-a', sent_at: '2026-07-15T10:00:00+09:00', send_type: 'フォロー', send_result: '成功', template_id: 'template-a', template_name: 'A', genre: 'キャンプ' },
  { id: 'history-b1', lead_id: 'lead-b', sent_at: '2026-07-15T10:00:00+09:00', send_type: '初回メール', send_result: '失敗', template_id: 'template-b', template_name: 'B', genre: '美容' },
  { id: 'history-b2', lead_id: 'lead-b', sent_at: '2026-07-15T10:01:00+09:00', send_type: '初回メール', send_result: '送信中', template_id: 'template-b', template_name: 'B', genre: '美容' },
  { id: 'history-c1', lead_id: 'lead-c', sent_at: '2026-06-15T10:00:00+09:00', send_type: '初回メール', send_result: '成功', template_id: 'template-c', template_name: 'C', genre: 'キャンプ' },
  { id: 'history-test', lead_id: 'lead-a', sent_at: '2026-07-15T11:00:00+09:00', send_type: 'テスト送信', send_result: '成功', template_id: 'template-a', template_name: 'A' },
], '2026-07-15');
assert.strictEqual(analyticsSnapshot.funnel.leads, 3);
assert.strictEqual(analyticsSnapshot.funnel.sent, 3);
assert.strictEqual(analyticsSnapshot.funnel.replies, 2, 'send NG alone must not count as a reply');
assert.strictEqual(analyticsSnapshot.funnel.sendNg, 1);
assert.strictEqual(analyticsSnapshot.quality.sendTotal, 4, 'pending and test histories must not count as completed attempts');
assert.strictEqual(analyticsSnapshot.quality.sendFailures, 1);
assert.strictEqual(analyticsSnapshot.quality.noReply, 0, 'multiple sends to one replied lead must not inflate no-reply count');
assert.strictEqual(analyticsSnapshot.currentMonth.sent, 2);
assert.strictEqual(analyticsSnapshot.currentMonth.replies, 1);
assert.strictEqual(analyticsSnapshot.currentMonthLeadSourceRows[0].sourceKey, 'prospecting');
assert.strictEqual(analyticsSnapshot.templateRows.find((row) => row.templateId === 'template-a').sent, 1);
const dashboardHistoryFields = JSON.parse(JSON.stringify(analyticsContext.dashboardSendHistoryFields_()));
assert.deepStrictEqual(dashboardHistoryFields, [
  'id', 'lead_id', 'sent_at', 'send_type', 'to_email', 'genre', 'template_id', 'template_name', 'send_result', 'created_at',
]);
assert(!dashboardHistoryFields.includes('subject'));
assert(!dashboardHistoryFields.includes('body'));
assert(!dashboardHistoryFields.includes('error_message'));
const analyticsHistoryWithLargeText = [{
  id: 'history-text',
  lead_id: 'lead-a',
  sent_at: '2026-07-15T10:00:00+09:00',
  send_type: '初回メール',
  to_email: 'lead-a@example.com',
  genre: 'キャンプ',
  template_id: 'template-text',
  template_name: '本文確認',
  send_result: '成功',
  created_at: '2026-07-15T10:00:00+09:00',
  subject: '現在の件名',
  body: '非常に長い本文'.repeat(1000),
  error_message: '取得してはいけないエラー詳細'.repeat(1000),
}];
const analyticsTemplateTextFixture = [{
  id: 'template-text',
  name: '本文確認',
  subject: '現在の件名',
  body: '非常に長い本文'.repeat(1000),
}];
const projectedAnalyticsHistories = analyticsHistoryWithLargeText.map((history) => {
  const projected = {};
  dashboardHistoryFields.forEach((field) => { projected[field] = history[field] || ''; });
  return projected;
});
const analyticsWithFullHistoryText = analyticsContext.buildAnalyticsSnapshot_(
  [{ id: 'lead-a', email: 'lead-a@example.com', created_at: '2026-07-01T09:00:00+09:00', genre: 'キャンプ', status: '未対応' }],
  analyticsHistoryWithLargeText,
  '2026-07-15',
  analyticsTemplateTextFixture
);
const analyticsWithProjectedHistory = analyticsContext.buildAnalyticsSnapshot_(
  [{ id: 'lead-a', email: 'lead-a@example.com', created_at: '2026-07-01T09:00:00+09:00', genre: 'キャンプ', status: '未対応' }],
  projectedAnalyticsHistories,
  '2026-07-15',
  analyticsTemplateTextFixture
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(analyticsWithProjectedHistory)),
  JSON.parse(JSON.stringify(analyticsWithFullHistoryText)),
  'dashboard analytics must stay identical when large history text columns are omitted'
);
assert.strictEqual(analyticsWithProjectedHistory.templateRows[0].subject, '現在の件名');
assert(analyticsWithProjectedHistory.templateRows[0].bodyPreview.startsWith('非常に長い本文'));
const dashboardLeadFields = JSON.parse(JSON.stringify(analyticsContext.dashboardLeadFields_()));
assert.deepStrictEqual(dashboardLeadFields, [
  'id', 'source', 'source_id', 'external_id', 'genre', 'company_name', 'normalized_company_name', 'facility_name',
  'email', 'email_domain', 'website_url', 'website_domain', 'form_url', 'status', 'send_ng', 'reply_checked',
  'form_status', 'last_sent_at', 'send_count', 'deal_status', 'address', 'source_payload_json', 'created_at', 'updated_at', 'archived_at',
]);
['custom_fields_json', 'notes'].forEach((field) => {
  assert(!dashboardLeadFields.includes(field));
});
const dashboardLeadFixtures = [
  { id: 'lead-email', source: 'manual', genre: 'キャンプ', company_name: 'メール対象', email: 'mail@example.com', website_url: 'https://example.com', status: '未対応', form_status: '未対応', created_at: '2026-07-01T00:00:00+09:00', updated_at: '2026-07-02T00:00:00+09:00' },
  { id: 'lead-form', source: 'manual', genre: 'キャンプ', company_name: 'フォーム対象', form_url: 'https://form.example/contact', status: '未対応', form_status: '未対応', created_at: '2026-07-03T00:00:00+09:00', updated_at: '2026-07-03T00:00:00+09:00' },
  { id: 'lead-reply', source: 'csv_upload', genre: '美容', company_name: '返信済み', email: 'reply@example.com', status: '返信あり', reply_checked: true, created_at: '2026-06-01T00:00:00+09:00', updated_at: '2026-07-04T00:00:00+09:00' },
  { id: 'lead-ng', source: 'source_page', genre: '美容', company_name: '送信NG', email: 'ng@example.com', status: '送信NG', send_ng: true, created_at: '2026-07-05T00:00:00+09:00', updated_at: '2026-07-05T00:00:00+09:00' },
  { id: 'lead-deal', source: 'prospecting', genre: '介護', company_name: '商談', email: 'deal@example.com', status: '商談予定', deal_status: '商談予定', created_at: '2026-07-06T00:00:00+09:00', updated_at: '2026-07-06T00:00:00+09:00' },
  { id: 'lead-archived', source: 'manual', genre: '介護', company_name: 'アーカイブ', status: '未対応', archived_at: '2026-07-07T00:00:00+09:00', created_at: '2026-07-01T00:00:00+09:00', updated_at: '2026-07-07T00:00:00+09:00' },
].map((lead) => Object.assign({}, lead, {
  custom_fields_json: JSON.stringify({ payload: 'large'.repeat(1000) }),
  source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }),
  notes: 'large note'.repeat(1000),
  address: '東京都'.repeat(1000),
  facility_name: '施設名'.repeat(1000),
}));
const projectedDashboardLeads = dashboardLeadFixtures.map((lead) => {
  const projected = {};
  dashboardLeadFields.forEach((field) => { projected[field] = lead[field] || ''; });
  return projected;
});
const dashboardMasterFixture = { ngMasters: [], excludedDomains: [], mailSendSafety: {} };
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(analyticsContext.buildLeadListStats_(projectedDashboardLeads, dashboardMasterFixture, ''))),
  JSON.parse(JSON.stringify(analyticsContext.buildLeadListStats_(dashboardLeadFixtures, dashboardMasterFixture, ''))),
  'lead state and sendability summaries must stay identical with projected dashboard leads'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(analyticsContext.buildAnalyticsSnapshot_(projectedDashboardLeads, [], '2026-07-15', []))),
  JSON.parse(JSON.stringify(analyticsContext.buildAnalyticsSnapshot_(dashboardLeadFixtures, [], '2026-07-15', []))),
  'dashboard analytics must stay identical when large lead payload columns are omitted'
);
const mailCandidateLeadFields = JSON.parse(JSON.stringify(analyticsContext.mailSendCandidateLeadFields_()));
assert.deepStrictEqual(mailCandidateLeadFields, [
  'id', 'source', 'genre', 'company_name', 'email', 'website_url', 'website_domain', 'form_url', 'status',
  'send_ng', 'reply_checked', 'last_sent_at', 'send_count', 'deal_status', 'created_at', 'updated_at', 'archived_at',
]);
['custom_fields_json', 'source_payload_json', 'notes', 'address', 'facility_name', 'form_status'].forEach((field) => {
  assert(!mailCandidateLeadFields.includes(field));
});
const projectedMailCandidateLeads = dashboardLeadFixtures.map((lead) => {
  const projected = {};
  mailCandidateLeadFields.forEach((field) => { projected[field] = lead[field] || ''; });
  return projected;
});
const candidateTemplates = [
  { id: 'template-camp', name: 'キャンプ初回', genre: 'キャンプ' },
  { id: 'template-beauty', name: '美容初回', genre: '美容' },
  { id: 'template-care', name: '介護初回', genre: '介護' },
];
const fullPayloadCandidateSelection = analyticsContext.selectScheduledEmailCandidates_(dashboardLeadFixtures, candidateTemplates, dashboardMasterFixture, 10);
const projectedCandidateSelection = analyticsContext.selectScheduledEmailCandidates_(projectedMailCandidateLeads, candidateTemplates, dashboardMasterFixture, 10);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(projectedCandidateSelection.groups)),
  JSON.parse(JSON.stringify(fullPayloadCandidateSelection.groups)),
  'automatic candidate groups must stay identical with projected leads'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(projectedCandidateSelection.selected.map((item) => item.lead.id))),
  JSON.parse(JSON.stringify(fullPayloadCandidateSelection.selected.map((item) => item.lead.id))),
  'automatic candidate order and exclusions must stay identical with projected leads'
);

const leadListContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), leadListContext, { filename: file });
});
const leadListFields = JSON.parse(JSON.stringify(leadListContext.leadListFields_()));
assert.deepStrictEqual(leadListFields, [
  'id', 'source', 'genre', 'company_name', 'facility_name', 'email', 'website_url', 'form_url',
  'status', 'send_ng', 'reply_checked', 'form_status', 'next_send_at', 'last_sent_at', 'send_count',
  'deal_status', 'created_at', 'updated_at', 'archived_at',
]);
['source_payload_json', 'send_ng_reason', 'meeting_start_at', 'contact_name', 'google_meet_url', 'address', 'notes', 'custom_fields_json'].forEach((field) => {
  assert(!leadListFields.includes(field), `sales list base projection must omit ${field}`);
});
const leadListFieldsWithExtras = JSON.parse(JSON.stringify(leadListContext.leadListFields_([
  'contact_name', 'meeting_start_at', 'not_a_lead_field', 'contact_name',
])));
assert(leadListFieldsWithExtras.includes('contact_name'));
assert(leadListFieldsWithExtras.includes('meeting_start_at'));
assert(!leadListFieldsWithExtras.includes('not_a_lead_field'));
assert.strictEqual(leadListFieldsWithExtras.filter((field) => field === 'contact_name').length, 1);
const leadListFixtures = [
  {
    id: 'lead-yamagata', source: 'manual', genre: 'キャンプ', company_name: '山形キャンプ', facility_name: '山形の森',
    email: 'hello@example.com', website_url: 'https://example.com', address: '山形県山形市', status: '未対応',
    form_status: '未対応', deal_status: '未設定', contact_name: '山田様', custom_fields_json: '{}',
    notes: '夏季営業', created_at: '2026-07-01T00:00:00+09:00', updated_at: '2026-07-03T00:00:00+09:00',
    source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }), meeting_start_at: '2026-08-01T10:00:00+09:00',
  },
  {
    id: 'lead-tokyo', source: 'manual', genre: '美容', company_name: '東京サロン', facility_name: '東京店',
    email: 'salon@example.com', address: '東京都渋谷区', status: '未対応', form_status: '未対応', deal_status: '未設定',
    contact_name: '佐藤様', custom_fields_json: '{}', created_at: '2026-07-02T00:00:00+09:00', updated_at: '2026-07-04T00:00:00+09:00',
    source_payload_json: JSON.stringify({ html: 'large'.repeat(1000) }),
  },
];
let requestedLeadListFields = [];
let requestedLeadListOptions = null;
leadListContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  assert.strictEqual(sheetName, 'leads');
  requestedLeadListFields = fields.slice();
  requestedLeadListOptions = Object.assign({}, options);
  return leadListFixtures.map((lead) => fields.reduce((record, field) => {
    record[field] = lead[field] === undefined ? '' : lead[field];
    return record;
  }, {}));
};
const projectedLeadListResult = JSON.parse(JSON.stringify(leadListContext.listLeads({
  search: '山形',
  includeStats: false,
  includeFields: ['contact_name', 'not_a_lead_field'],
  limit: 50,
})));
assert.strictEqual(projectedLeadListResult.total, 1);
assert.strictEqual(projectedLeadListResult.items[0].id, 'lead-yamagata');
assert.strictEqual(projectedLeadListResult.items[0].contact_name, '山田様');
assert.strictEqual(projectedLeadListResult.items[0].source_payload_json, undefined);
assert(requestedLeadListFields.includes('contact_name'));
assert(!requestedLeadListFields.includes('not_a_lead_field'));
assert(!requestedLeadListFields.includes('source_payload_json'));
assert.deepStrictEqual(requestedLeadListOptions, { maxGapColumns: 2 });

const scheduledJobClaimFields = JSON.parse(JSON.stringify(leadListContext.scheduledEmailJobClaimFields_()));
assert.deepStrictEqual(scheduledJobClaimFields, [
  'id', 'job_type', 'status', 'last_heartbeat_at', 'started_at', 'created_at', 'updated_at',
]);
['payload_json', 'cursor_json', 'found_results_json', 'last_error', 'current_query'].forEach((field) => {
  assert(!scheduledJobClaimFields.includes(field), `scheduled mail job claim must omit ${field}`);
});
const scheduledJobClaimContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), scheduledJobClaimContext, { filename: file });
});
let scheduledJobClaimFieldsRead = [];
let scheduledJobClaimReadOptions = null;
let scheduledJobClaimAppends = 0;
const scheduledJobClaimUpdates = [];
scheduledJobClaimContext.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'claimScheduledEmailJob');
  assert.strictEqual(options.waitMs, 6000);
  assert.strictEqual(options.logErrors, false);
  return callback();
};
scheduledJobClaimContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  assert.strictEqual(sheetName, 'jobs');
  scheduledJobClaimFieldsRead = fields.slice();
  scheduledJobClaimReadOptions = Object.assign({}, options);
  return [{
    id: 'active-mail-job',
    job_type: 'automatic_email_send',
    status: 'running',
    last_heartbeat_at: new Date(Date.now() - 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 1000).toISOString(),
  }];
};
scheduledJobClaimContext.updateSheetRecord_ = (_sheetName, id, patch) => {
  scheduledJobClaimUpdates.push({ id, patch });
  return Object.assign({ id }, patch);
};
scheduledJobClaimContext.appendSheetRecord_ = (_sheetName, record) => {
  scheduledJobClaimAppends += 1;
  return Object.assign({ id: 'new-mail-job' }, record);
};
scheduledJobClaimContext.nowIso_ = () => '2026-07-19T23:30:00+09:00';
scheduledJobClaimContext.todayText_ = () => '2026-07-19';
const activeScheduledJobClaim = JSON.parse(JSON.stringify(scheduledJobClaimContext.claimScheduledEmailJob_()));
assert.strictEqual(activeScheduledJobClaim.busy, true);
assert.strictEqual(activeScheduledJobClaim.job.id, 'active-mail-job');
assert.deepStrictEqual(JSON.parse(JSON.stringify(scheduledJobClaimFieldsRead)), scheduledJobClaimFields);
assert.deepStrictEqual(scheduledJobClaimReadOptions, { maxGapColumns: 0 });
assert.strictEqual(scheduledJobClaimAppends, 0);
assert.strictEqual(scheduledJobClaimUpdates.length, 0);
scheduledJobClaimContext.readSheetRecordFields_ = () => [{
  id: 'stale-mail-job',
  job_type: 'automatic_email_send',
  status: 'running',
  last_heartbeat_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
}];
const recoveredScheduledJobClaim = JSON.parse(JSON.stringify(scheduledJobClaimContext.claimScheduledEmailJob_()));
assert.strictEqual(recoveredScheduledJobClaim.busy, false);
assert.strictEqual(recoveredScheduledJobClaim.job.id, 'new-mail-job');
assert.strictEqual(scheduledJobClaimUpdates.length, 1);
assert.strictEqual(scheduledJobClaimUpdates[0].id, 'stale-mail-job');
assert.strictEqual(scheduledJobClaimUpdates[0].patch.status, 'failed');
assert.strictEqual(scheduledJobClaimAppends, 1);

const scheduledJobRetryContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), scheduledJobRetryContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), scheduledJobRetryContext, { filename: 'Email.gs' });
let scheduledJobRetryAttempts = 0;
const scheduledJobRetrySleeps = [];
let scheduledJobRetryLogs = 0;
scheduledJobRetryContext.Utilities = {
  sleep: (delayMs) => { scheduledJobRetrySleeps.push(delayMs); },
};
scheduledJobRetryContext.logError_ = () => { scheduledJobRetryLogs += 1; };
scheduledJobRetryContext.claimScheduledEmailJobOnce_ = () => {
  scheduledJobRetryAttempts += 1;
  if (scheduledJobRetryAttempts < 3) {
    throw new Error('ドキュメントにアクセス中に スプレッドシート のサービスがタイムアウトしました。');
  }
  return { busy: false, job: { id: 'retry-success' } };
};
const scheduledJobRetryClaim = JSON.parse(JSON.stringify(scheduledJobRetryContext.claimScheduledEmailJob_()));
assert.strictEqual(scheduledJobRetryClaim.job.id, 'retry-success');
assert.strictEqual(scheduledJobRetryAttempts, 3);
assert.deepStrictEqual(scheduledJobRetrySleeps, [500, 1500]);
assert.strictEqual(scheduledJobRetryLogs, 0, 'a recovered transient Sheets timeout must not remain as an active error');

scheduledJobRetryAttempts = 0;
scheduledJobRetrySleeps.length = 0;
scheduledJobRetryLogs = 0;
scheduledJobRetryContext.claimScheduledEmailJobOnce_ = () => {
  scheduledJobRetryAttempts += 1;
  throw new Error('Service Spreadsheets timed out while accessing document.');
};
assert.throws(() => scheduledJobRetryContext.claimScheduledEmailJob_(), /timed out/);
assert.strictEqual(scheduledJobRetryAttempts, 3);
assert.deepStrictEqual(scheduledJobRetrySleeps, [500, 1500]);
assert.strictEqual(scheduledJobRetryLogs, 1, 'a persistent Sheets outage must create only one actionable error log');

const testMailContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), testMailContext, { filename: file });
});
let testMailLockDepth = 0;
const testMailOperations = [];
testMailContext.withScriptLock_ = (operation, callback, options) => {
  testMailOperations.push({ operation, options });
  testMailLockDepth += 1;
  try {
    return callback();
  } finally {
    testMailLockDepth -= 1;
  }
};
testMailContext.findSheetRecordById_ = () => ({ id: 'template-test', name: 'Test', subject: 'Subject', body: 'Body' });
testMailContext.getSettingValue_ = (_key, fallback) => fallback;
assert.strictEqual(testMailContext.resolveGmailSenderName_({}), '【Ad Clutch】村松 侑哉');
assert.strictEqual(testMailContext.resolveGmailSenderName_({ sender_name: '営業担当' }), '【Ad Clutch】村松 侑哉');
testMailContext.isValidEmailAddress_ = () => true;
testMailContext.renderTemplateForLead_ = () => ({ subject: 'Subject', body: 'Body', htmlBody: '<p>Body</p>' });
testMailContext.nowIso_ = () => '2026-07-15T12:00:00+09:00';
testMailContext.assertEmailSendLimitAvailable_ = () => { assert.strictEqual(testMailLockDepth, 1); };
testMailContext.appendSheetRecord_ = (_sheet, record) => {
  assert.strictEqual(testMailLockDepth, 1);
  assert.strictEqual(record.send_result, '送信中');
  assert.strictEqual(record.sender_name, '【Ad Clutch】村松 侑哉');
  return Object.assign({ id: 'test-reservation' }, record);
};
testMailContext.MailApp = { sendEmail: (payload) => {
  assert.strictEqual(testMailLockDepth, 0);
  assert.strictEqual(payload.name, '【Ad Clutch】村松 侑哉');
} };
testMailContext.updateSheetRecord_ = (_sheet, _id, patch) => {
  assert.strictEqual(testMailLockDepth, 1);
  return Object.assign({ id: 'updated' }, patch);
};
testMailContext.logError_ = () => {};
const testMailResult = testMailContext.sendTestEmail('template-test', 'ignored@example.com', {});
assert.strictEqual(testMailResult.ok, true);
assert.deepStrictEqual(testMailOperations.map((item) => item.operation), ['sendTestEmail:prepare', 'sendTestEmail:finalize']);
assert(testMailOperations.every((item) => item.options.waitMs === 6000 && item.options.attempts === 5));

const reviewDecisionContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), reviewDecisionContext, { filename: file });
});
let reviewDecisionLead = {
  id: 'review-1',
  status: '未対応',
  source: 'source_page',
  website_url: 'https://review.example/',
  send_ng: false,
};
let reviewDecisionWrites = 0;
let reviewDecisionFinds = 0;
const reviewDecisionHeaders = Object.keys(reviewDecisionLead);
const reviewDecisionSheet = {
  getRangeList: (ranges) => ({
    setValue: (value) => {
      reviewDecisionWrites += 1;
      ranges.forEach((a1) => {
        const match = /^([A-Z]+)(\d+)$/.exec(a1);
        assert(match, 'single review write must use a single-cell A1 range');
        const columnNumber = match[1].split('').reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
        reviewDecisionLead[reviewDecisionHeaders[columnNumber - 1]] = value;
      });
    },
  }),
};
reviewDecisionContext.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'updateReviewLeadDecision');
  assert.strictEqual(options.waitMs, 2500);
  assert.strictEqual(options.attempts, 2);
  assert.strictEqual(options.retryDelayMs, 250);
  assert.strictEqual(options.logErrors, false);
  return callback();
};
reviewDecisionContext.getOrCreateSpreadsheet_ = () => ({});
reviewDecisionContext.ensureSheet_ = () => reviewDecisionSheet;
reviewDecisionContext.nowIso_ = () => '2026-08-02T22:00:00+09:00';
reviewDecisionContext.clearReviewLeadCachesBestEffort_ = () => '';
reviewDecisionContext.findRowById_ = (_sheet, id) => {
  reviewDecisionFinds += 1;
  return {
    rowNumber: 2,
    headers: reviewDecisionHeaders,
    record: Object.assign({}, reviewDecisionLead, { id }),
  };
};
const reviewDecision = reviewDecisionContext.updateReviewLeadDecision('review-1', {
  mode: 'decision', expected_status: '未対応', status: '対応中',
});
assert.strictEqual(reviewDecision.ok, true);
assert.strictEqual(reviewDecision.reused, false);
assert.strictEqual(reviewDecisionLead.status, '対応中');
const reviewDecisionRetry = reviewDecisionContext.updateReviewLeadDecision('review-1', {
  mode: 'decision', expected_status: '未対応', status: '対応中',
});
assert.strictEqual(reviewDecisionRetry.ok, true);
assert.strictEqual(reviewDecisionRetry.reused, true);
assert.strictEqual(reviewDecisionWrites, 1, 'a retried review decision must not write twice');
reviewDecisionLead.status = '返信あり';
const reviewDecisionConflict = reviewDecisionContext.updateReviewLeadDecision('review-1', {
  mode: 'decision', expected_status: '未対応', status: '送信NG',
});
assert.strictEqual(reviewDecisionConflict.ok, false);
assert.strictEqual(reviewDecisionConflict.conflict, true);
assert.strictEqual(reviewDecisionLead.status, '返信あり');
assert.strictEqual(reviewDecisionWrites, 1, 'a stale review action must not overwrite a reply status');
reviewDecisionLead.status = '対応中';
const reviewUndo = reviewDecisionContext.updateReviewLeadDecision('review-1', {
  mode: 'undo', expected_status: '対応中', status: '未対応',
});
assert.strictEqual(reviewUndo.ok, true);
assert.strictEqual(reviewDecisionLead.status, '未対応');
assert.throws(() => reviewDecisionContext.updateReviewLeadDecision('review-1', {
  mode: 'decision', expected_status: '未対応', status: '返信あり',
}), /選べない更新内容/);
const normalizedStaleClientDecision = reviewDecisionContext.updateReviewLeadDecision('review-1', {
  mode: 'decision', expected_status: '対応中', status: '対応中',
});
assert.strictEqual(normalizedStaleClientDecision.ok, true, 'a stale client-side expected status must not reject a valid review decision');
assert.strictEqual(reviewDecisionLead.status, '対応中');
assert.strictEqual(reviewDecisionFinds, 5, 'each valid review request must look up the lead row only once');
const reviewDecisionCodeSource = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
const reviewDecisionStart = reviewDecisionCodeSource.indexOf('function updateReviewLeadDecision(id, input)');
const reviewDecisionEnd = reviewDecisionCodeSource.indexOf('\nfunction ', reviewDecisionStart + 10);
const reviewDecisionBody = reviewDecisionCodeSource.slice(reviewDecisionStart, reviewDecisionEnd);
assert(!reviewDecisionBody.includes('getLeadById('), 'review decisions must not perform a second lead lookup');
assert(reviewDecisionBody.includes('applyReviewLeadDecisionLocked_(sheet, leadId, decision)'));

const reviewBulkContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), reviewBulkContext, { filename: file });
});
const reviewBulkHeaders = ['id', 'status', 'source', 'website_url', 'email', 'form_url', 'facility_name', 'send_ng'];
const reviewBulkRecords = [
  { id: 'bulk-1', status: '未対応', source: 'source_page', website_url: 'https://bulk-1.example/', facility_name: '一括1', send_ng: false },
  { id: 'bulk-2', status: '未対応', source: 'serper', website_url: 'https://bulk-2.example/', facility_name: '一括2', send_ng: false },
  { id: 'bulk-stale', status: '返信あり', source: 'source_page', website_url: 'https://bulk-stale.example/', facility_name: '競合', send_ng: false },
];
const reviewBulkSheet = {
  getDataRange: () => ({
    getValues: () => [reviewBulkHeaders].concat(reviewBulkRecords.map((record) => reviewBulkHeaders.map((header) => record[header] || ''))),
  }),
  getRangeList: (ranges) => ({
    setValue: (value) => {
      reviewBulkRangeListWrites += 1;
      ranges.forEach((a1) => {
        const match = /^([A-Z]+)(\d+)$/.exec(a1);
        assert(match, 'grouped review write must use a single-cell A1 range');
        const columnNumber = match[1].split('').reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
        const record = reviewBulkRecords[Number(match[2]) - 2];
        assert(record, 'grouped review write must target an existing lead row');
        record[reviewBulkHeaders[columnNumber - 1]] = value;
      });
    },
  }),
};
let reviewBulkRangeListWrites = 0;
let reviewBulkCacheClears = 0;
reviewBulkContext.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'updateReviewLeadDecisions');
  assert.strictEqual(options.waitMs, 2500);
  assert.strictEqual(options.attempts, 2);
  assert.strictEqual(options.retryDelayMs, 250);
  assert.strictEqual(options.logErrors, false);
  return callback();
};
reviewBulkContext.getOrCreateSpreadsheet_ = () => ({});
reviewBulkContext.ensureSheet_ = () => reviewBulkSheet;
reviewBulkContext.nowIso_ = () => '2026-08-02T17:05:00+09:00';
reviewBulkContext.clearRuntimeCaches_ = (sheetName) => {
  assert.strictEqual(sheetName, 'leads');
  reviewBulkCacheClears += 1;
};
const reviewBulkDecision = reviewBulkContext.updateReviewLeadDecisions({
  ids: ['bulk-1', 'bulk-2', 'bulk-stale', 'bulk-missing', 'bulk-1'],
  mode: 'decision',
  expected_status: '未対応',
  status: '送信NG',
});
assert.strictEqual(reviewBulkDecision.requested, 4, 'duplicate selected IDs must be collapsed');
assert.strictEqual(reviewBulkDecision.updated, 2);
assert.strictEqual(reviewBulkDecision.conflicts, 2);
assert.strictEqual(reviewBulkRangeListWrites, 2, 'bulk review must group identical status and send-NG writes instead of writing every row separately');
assert.strictEqual(reviewBulkCacheClears, 1, 'bulk review updates must invalidate caches only once');
assert.strictEqual(reviewBulkRecords[0].status, '送信NG');
assert.strictEqual(reviewBulkRecords[1].send_ng, true);
const reviewBulkUndo = reviewBulkContext.updateReviewLeadDecisions({
  ids: ['bulk-1', 'bulk-2'],
  mode: 'undo',
  expected_status: '送信NG',
  status: '未対応',
});
assert.strictEqual(reviewBulkUndo.updated, 2);
assert.strictEqual(reviewBulkRecords[0].status, '未対応');
assert.strictEqual(reviewBulkRangeListWrites, 4, 'bulk undo must also use grouped writes');
const normalizedStaleBulkDecision = reviewBulkContext.updateReviewLeadDecisions({
  ids: ['bulk-1', 'bulk-2'], mode: 'decision', expected_status: '対応中', status: '対応中',
});
assert.strictEqual(normalizedStaleBulkDecision.updated, 2, 'bulk review must use the authoritative pending status instead of stale client state');
assert.strictEqual(reviewBulkRecords[0].status, '対応中');
assert.throws(() => reviewBulkContext.updateReviewLeadDecisions({
  ids: ['bulk-1'], mode: 'decision', expected_status: '未対応', status: '対応不要',
}), /選べない更新内容/);
assert.throws(() => reviewBulkContext.updateReviewLeadDecisions({
  ids: Array.from({ length: 51 }, (_value, index) => 'bulk-' + index), mode: 'decision', expected_status: '未対応', status: '対応中',
}), /50件まで/);

const reviewQueueContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), reviewQueueContext, { filename: file });
});
const reviewQueueProperties = {};
const reviewQueuePropertyService = {
  getProperty: (key) => reviewQueueProperties[key] || null,
  getProperties: () => Object.assign({}, reviewQueueProperties),
  setProperty: (key, value) => { reviewQueueProperties[key] = String(value); },
  deleteProperty: (key) => { delete reviewQueueProperties[key]; },
};
reviewQueueContext.PropertiesService = { getScriptProperties: () => reviewQueuePropertyService };
const reviewQueueLockError = new Error('ロックのタイムアウト: 別の処理が実行中です。');
reviewQueueLockError.code = 'SCRIPT_LOCK_TIMEOUT';
reviewQueueContext.withScriptLock_ = () => { throw reviewQueueLockError; };
let reviewQueueRequestSequence = 0;
let reviewQueueTimeSequence = 0;
reviewQueueContext.createReviewDecisionRequestId_ = () => 'request-' + (++reviewQueueRequestSequence);
reviewQueueContext.nowIso_ = () => '2026-08-02T22:10:0' + (++reviewQueueTimeSequence) + '+09:00';
let reviewQueueCacheBumps = 0;
reviewQueueContext.bumpLeadListCacheRevision_ = () => { reviewQueueCacheBumps += 1; };
const reviewQueueTriggerDelays = [];
reviewQueueContext.ensurePendingReviewDecisionTriggerBestEffort_ = (delayMs) => {
  reviewQueueTriggerDelays.push(delayMs);
  return { result: { created: true }, warning: '' };
};
reviewQueueContext.logError_ = () => { throw new Error('successful queue fallback must not log an error'); };
const queuedReviewDecision = reviewQueueContext.updateReviewLeadDecision('queued-review-1', {
  mode: 'decision', expected_status: '未対応', status: '対応中',
});
assert.strictEqual(queuedReviewDecision.ok, true);
assert.strictEqual(queuedReviewDecision.queued, true, 'a lock timeout must persist the decision instead of returning it to review');
assert.strictEqual(reviewQueueContext.listPendingReviewDecisionRecords_().length, 1);
let queuedOverlay = reviewQueueContext.overlayPendingReviewDecisionsOnLeads_([{
  id: 'queued-review-1', status: '未対応', source: 'source_page', website_url: 'https://queued.example/',
}]);
assert.strictEqual(queuedOverlay[0].status, '対応中', 'a queued confirmation must stay hidden after a list reload');
assert.strictEqual(queuedOverlay[0].review_decision_pending, true);
const queuedReviewUndo = reviewQueueContext.updateReviewLeadDecision('queued-review-1', {
  mode: 'undo', expected_status: '対応中', status: '未対応',
});
assert.strictEqual(queuedReviewUndo.queued, true);
queuedOverlay = reviewQueueContext.overlayPendingReviewDecisionsOnLeads_([{
  id: 'queued-review-1', status: '未対応', source: 'source_page', website_url: 'https://queued.example/',
}]);
assert.strictEqual(queuedOverlay[0].status, '未対応', 'undo must supersede a confirmation that is still queued');
const queuedBulkDecision = reviewQueueContext.updateReviewLeadDecisions({
  ids: ['queued-bulk-1', 'queued-bulk-2'], mode: 'decision', expected_status: '未対応', status: '対応中',
});
assert.strictEqual(queuedBulkDecision.queued, 2);
assert.strictEqual(queuedBulkDecision.updated, 2, 'accepted queued decisions must count as handled in the UI');
assert.deepStrictEqual(JSON.parse(JSON.stringify(queuedBulkDecision.items.map((item) => item.id))), ['queued-bulk-1', 'queued-bulk-2']);
assert.strictEqual(reviewQueueTriggerDelays.every((delayMs) => delayMs === 5000), true);
assert.strictEqual(reviewQueueCacheBumps, 3, 'single, undo, and bulk queue acceptance must each invalidate list cache once');

const reviewQueueProcessorContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), reviewQueueProcessorContext, { filename: file });
});
const reviewProcessorProperties = {};
const reviewProcessorPropertyService = {
  getProperty: (key) => reviewProcessorProperties[key] || null,
  getProperties: () => Object.assign({}, reviewProcessorProperties),
  setProperty: (key, value) => { reviewProcessorProperties[key] = String(value); },
  deleteProperty: (key) => { delete reviewProcessorProperties[key]; },
};
reviewQueueProcessorContext.PropertiesService = { getScriptProperties: () => reviewProcessorPropertyService };
reviewQueueProcessorContext.nowIso_ = () => '2026-08-02T22:15:00+09:00';
reviewQueueProcessorContext.withScriptLock_ = (_operation, callback, options) => {
  assert.strictEqual(options.waitMs, 2500);
  assert.strictEqual(options.attempts, 2);
  assert.strictEqual(options.logErrors, false);
  return callback();
};
reviewQueueProcessorContext.getOrCreateSpreadsheet_ = () => ({});
const reviewProcessorHeaders = ['id', 'status', 'source', 'website_url', 'send_ng', 'reply_checked', 'deal_status', 'next_send_at', 'send_ng_reason', 'send_ng_memo', 'updated_at'];
const reviewProcessorRecords = [
  { id: 'process-1', status: '未対応', source: 'source_page', website_url: 'https://process-1.example/', send_ng: false, reply_checked: false, deal_status: '未設定' },
  { id: 'process-2', status: '未対応', source: 'serper', website_url: 'https://process-2.example/', send_ng: false, reply_checked: false, deal_status: '未設定' },
  { id: 'process-undo', status: '未対応', source: 'source_page', website_url: 'https://process-undo.example/', send_ng: false, reply_checked: false, deal_status: '未設定' },
];
let reviewProcessorRangeWrites = 0;
const reviewProcessorSheet = {
  getDataRange: () => ({
    getValues: () => [reviewProcessorHeaders].concat(reviewProcessorRecords.map((record) => reviewProcessorHeaders.map((header) => record[header] || ''))),
  }),
  getRangeList: (ranges) => ({
    setValue: (value) => {
      reviewProcessorRangeWrites += 1;
      ranges.forEach((a1) => {
        const match = /^([A-Z]+)(\d+)$/.exec(a1);
        const columnNumber = match[1].split('').reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
        reviewProcessorRecords[Number(match[2]) - 2][reviewProcessorHeaders[columnNumber - 1]] = value;
      });
    },
  }),
};
reviewQueueProcessorContext.ensureSheet_ = () => reviewProcessorSheet;
let reviewProcessorCacheClears = 0;
reviewQueueProcessorContext.clearReviewLeadCachesBestEffort_ = () => { reviewProcessorCacheClears += 1; return ''; };
const reviewProcessorTriggerDelays = [];
reviewQueueProcessorContext.ensurePendingReviewDecisionTriggerBestEffort_ = (delayMs) => {
  reviewProcessorTriggerDelays.push(delayMs);
  return { result: { created: true }, warning: '' };
};
reviewQueueProcessorContext.appendSyncError_ = () => {};
function addReviewProcessorQueueRecord(id, requestId, mode, expectedStatus, status, requestedAt) {
  const propertyKey = reviewQueueProcessorContext.reviewDecisionQueuePropertyKey_(id, requestId);
  reviewProcessorProperties[propertyKey] = JSON.stringify({ id, requestId, mode, expectedStatus, status, requestedAt });
}
addReviewProcessorQueueRecord('process-1', 'process-request-1', 'decision', '未対応', '対応中', '2026-08-02T22:14:01+09:00');
addReviewProcessorQueueRecord('process-2', 'process-request-2', 'decision', '未対応', '送信NG', '2026-08-02T22:14:02+09:00');
let processedReviewQueue = reviewQueueProcessorContext.processPendingReviewLeadDecisions_({ maxItems: 10, source: 'test' });
assert.strictEqual(processedReviewQueue.ok, true);
assert.strictEqual(processedReviewQueue.updated, 2);
assert.strictEqual(processedReviewQueue.remaining, 0);
assert.strictEqual(reviewProcessorRecords[0].status, '対応中');
assert.strictEqual(reviewProcessorRecords[1].status, '送信NG');
assert.strictEqual(reviewProcessorRecords[1].send_ng, true);
assert.strictEqual(reviewProcessorCacheClears, 1);
assert(reviewProcessorRangeWrites > 0);
addReviewProcessorQueueRecord('process-undo', 'process-request-confirm', 'decision', '未対応', '対応中', '2026-08-02T22:14:03+09:00');
addReviewProcessorQueueRecord('process-undo', 'process-request-undo', 'undo', '対応中', '未対応', '2026-08-02T22:14:04+09:00');
processedReviewQueue = reviewQueueProcessorContext.processPendingReviewLeadDecisions_({ maxItems: 10, source: 'test' });
assert.strictEqual(processedReviewQueue.updated, 0);
assert.strictEqual(processedReviewQueue.reused, 1, 'the latest undo must supersede an unapplied queued confirmation');
assert.strictEqual(processedReviewQueue.remaining, 0);
addReviewProcessorQueueRecord('process-1', 'process-request-busy', 'undo', '対応中', '未対応', '2026-08-02T22:14:05+09:00');
reviewQueueProcessorContext.withScriptLock_ = () => {
  const error = new Error('ロックのタイムアウト');
  error.code = 'SCRIPT_LOCK_TIMEOUT';
  throw error;
};
processedReviewQueue = reviewQueueProcessorContext.processPendingReviewLeadDecisions_({ maxItems: 10, source: 'test' });
assert.strictEqual(processedReviewQueue.busy, true);
assert.strictEqual(processedReviewQueue.remaining, 1);
assert.strictEqual(reviewProcessorTriggerDelays[0], 30000, 'a busy review queue worker must retry automatically');
assert.strictEqual(reviewQueueProcessorContext.listPendingReviewDecisionRecords_().length, 1, 'a busy queue worker must retain pending decisions');

const lockRetryContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), lockRetryContext, { filename: 'Code.gs' });
let lockTryCount = 0;
let lockReleaseCount = 0;
const lockSleepCalls = [];
lockRetryContext.LockService = {
  getScriptLock: () => ({
    tryLock: (waitMs) => {
      assert.strictEqual(waitMs, 1000);
      lockTryCount += 1;
      return lockTryCount >= 3;
    },
    releaseLock: () => { lockReleaseCount += 1; },
  }),
};
lockRetryContext.Utilities = { sleep: (waitMs) => { lockSleepCalls.push(waitMs); } };
lockRetryContext.logError_ = () => { throw new Error('successful retry must not be logged'); };
const lockRetryResult = lockRetryContext.withScriptLock_('lockRetryTest', () => 'acquired', {
  waitMs: 1000,
  attempts: 3,
  retryDelayMs: 10,
});
assert.strictEqual(lockRetryResult, 'acquired');
assert.strictEqual(lockTryCount, 3);
assert.strictEqual(lockReleaseCount, 1, 'only an acquired lock may be released');
assert.deepStrictEqual(lockSleepCalls, [10, 20]);
lockTryCount = 0;
lockReleaseCount = 0;
lockSleepCalls.length = 0;
lockRetryContext.LockService = {
  getScriptLock: () => ({
    tryLock: (waitMs) => {
      assert.strictEqual(waitMs, 6000);
      lockTryCount += 1;
      return lockTryCount >= 2;
    },
    releaseLock: () => { lockReleaseCount += 1; },
  }),
};
const defaultLockRetryResult = lockRetryContext.withScriptLock_('defaultLockRetryTest', () => 'default-acquired');
assert.strictEqual(defaultLockRetryResult, 'default-acquired');
assert.strictEqual(lockTryCount, 2);
assert.strictEqual(lockReleaseCount, 1);
assert.deepStrictEqual(lockSleepCalls, [400], 'default lock policy must retry after a short wait');
assert.strictEqual(lockRetryContext.isScriptLockTimeoutError_(new Error('Exception: ロックのタイムアウト: 別のプロセスがロックを保持しています。')), true);
assert.strictEqual(lockRetryContext.isScriptLockTimeoutError_(new Error('Lock timed out waiting for another process')), true);
assert.strictEqual(lockRetryContext.normalizeBackgroundRuntimeBudgetMs_(300000), 240000, 'background work must leave recovery time before the six-minute hard limit');
let suppressedLockLogs = 0;
lockRetryContext.LockService = {
  getScriptLock: () => ({ tryLock: () => false, releaseLock: () => {} }),
};
lockRetryContext.logError_ = () => { suppressedLockLogs += 1; };
assert.throws(() => lockRetryContext.withScriptLock_('expectedBusyClaim', () => null, {
  waitMs: 1000,
  attempts: 1,
  logErrors: false,
}), /ロックのタイムアウト/);
assert.strictEqual(suppressedLockLogs, 0, 'expected worker-claim contention must not be recorded as an application error');

const sourceLockContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sourceLockContext, { filename: file });
});
let sourceResultWrites = 0;
let sourceCreateCalls = 0;
const sourceResultPayloads = [];
sourceLockContext.findExistingSourcePageLead_ = () => null;
sourceLockContext.getSerperApiKey_ = () => '';
sourceLockContext.hasSearchJobRuntimeAvailable_ = () => true;
sourceLockContext.appendSourcePageResult_ = (_jobId, result) => {
  sourceResultWrites += 1;
  sourceResultPayloads.push(result);
};
sourceLockContext.fetchProspectingHtml_ = (url) => ({ url, html: '<html></html>' });
sourceLockContext.createLeadWithLockOptions_ = (_input, options) => {
  sourceCreateCalls += 1;
  assert.strictEqual(options.waitMs, 5000);
  assert.strictEqual(options.attempts, 1);
  throw sourceLockContext.createScriptLockTimeoutError_('createLead', 1, 1);
};
const deferredSourceLead = sourceLockContext.processSourcePageCandidate_(
  { facility_name: 'ロック競合テスト', source_id: 'source-lock-test', official_url: 'https://camp.example/' },
  {},
  { use_serper_fallback: false },
  'job-lock-test',
  0,
  {}
);
assert.strictEqual(deferredSourceLead.created, false);
assert.strictEqual(deferredSourceLead.deferred, true);
assert.strictEqual(deferredSourceLead.lockContention, true);
assert.strictEqual(sourceResultWrites, 0, 'lock contention must keep the candidate cursor for retry');
assert.strictEqual(sourceCreateCalls, 1);
const unresolvedSourceLead = sourceLockContext.processSourcePageCandidate_(
  { facility_name: '公式サイトなし', source_id: 'source-unresolved-test', create_without_official: true },
  {},
  { create_unresolved_leads: true, use_serper_fallback: false },
  'job-unresolved-test',
  0,
  {}
);
assert.strictEqual(unresolvedSourceLead.created, false);
assert.strictEqual(unresolvedSourceLead.unresolved, true);
assert.strictEqual(unresolvedSourceLead.excludedFromReview, true);
assert.strictEqual(sourceCreateCalls, 1, 'an unresolved candidate must never create a review lead');
assert.strictEqual(sourceResultWrites, 1, 'an unresolved candidate should remain in search results for audit');
assert.strictEqual(sourceLockContext.detectClosedProspectingSite_({
  html: '<html><head><title>営業終了のお知らせ</title></head><body>当施設は営業を終了しました。</body></html>',
}).closed, true);
assert.strictEqual(sourceLockContext.detectClosedProspectingSite_({
  html: '<html><head><title>冬季休業のお知らせ</title></head><body>営業再開日は未定です。</body></html>',
}).closed, true, '休業 in the page title must block collection');
assert.strictEqual(sourceLockContext.detectClosedProspectingSite_({
  html: '<html><head><title>森の家キャンプ場</title></head><body><h2>当面休業のお知らせ</h2></body></html>',
}).closed, true, '休業 in an h1-h6 heading must block collection');
assert.strictEqual(sourceLockContext.detectClosedProspectingSite_({
  html: '<html><head><title>営業中の森の家キャンプ場</title></head><body><p>毎週火曜日は休業日です。</p></body></html>',
}).closed, false, '休業 in ordinary body copy alone must not block collection');
assert.strictEqual(sourceLockContext.detectClosedProspectingSite_({
  title: '株式会社サンプル',
  description: '旧店舗は閉店しましたが、新店舗へ移転して営業中です。',
}).closed, false, 'an active relocated business must not be treated as closed');
assert.strictEqual(sourceLockContext.isClearlyClosedSearchResult_({
  title: 'サンプル施設は閉館しました',
  snippet: '長年のご利用ありがとうございました。',
}), true);
assert.strictEqual(sourceLockContext.isClearlyClosedSearchResult_({
  title: '本サービスは終了いたしました',
  snippet: 'ご利用ありがとうございました。',
}), true);
assert.strictEqual(sourceLockContext.isClearlyClosedSearchResult_({
  title: '森の家キャンプ場 冬季休業のお知らせ',
  snippet: '営業再開日は未定です。',
}), true, '休業 in a search-result title must block collection');
sourceLockContext.fetchProspectingHtml_ = (url) => ({
  url,
  html: '<html><head><title>営業終了のお知らせ</title></head><body>当施設は営業を終了しました。</body></html>',
});
const closedSourceLead = sourceLockContext.processSourcePageCandidate_(
  { facility_name: '閉鎖判定テスト', source_id: 'source-closed-test', official_url: 'https://closed.example/' },
  {},
  { use_serper_fallback: false },
  'job-closed-test',
  1,
  {}
);
assert.strictEqual(closedSourceLead.created, false);
assert.strictEqual(closedSourceLead.skipped, true);
assert.strictEqual(closedSourceLead.closed, true);
assert.strictEqual(sourceCreateCalls, 1, 'a closed official site must never create a review lead');
assert.strictEqual(sourceResultWrites, 2, 'a closed site should retain one dismissed audit result');
assert.strictEqual(sourceResultPayloads[1].resultType, 'source_page_closed');
assert.strictEqual(sourceResultPayloads[1].reviewStatus, 'dismissed');
sourceLockContext.fetchProspectingHtml_ = () => {
  throw new Error('Source page fetch failed: DNS error https://missing-host.example/');
};
const brokenSourceLead = sourceLockContext.processSourcePageCandidate_(
  { facility_name: 'リンク切れ判定テスト', source_id: 'source-broken-test', official_url: 'https://missing-host.example/' },
  {},
  { use_serper_fallback: false },
  'job-broken-test',
  2,
  {}
);
assert.strictEqual(brokenSourceLead.created, false);
assert.strictEqual(brokenSourceLead.skipped, true);
assert.strictEqual(brokenSourceLead.closed, false);
assert.strictEqual(brokenSourceLead.broken, true);
assert.strictEqual(sourceCreateCalls, 1, 'a definitely broken official link must never create a review lead');
assert.strictEqual(sourceResultWrites, 3, 'a broken link should retain one dismissed audit result');
assert.strictEqual(sourceResultPayloads[2].resultType, 'source_page_broken_link');
assert.strictEqual(sourceResultPayloads[2].reviewStatus, 'dismissed');
assert.strictEqual(sourceResultPayloads[2].reviewAction, 'exclude_broken_link');
sourceLockContext.fetchProspectingHtml_ = () => {
  throw new Error('Source page fetch failed: HTTP 410 https://closed.example/');
};
const goneSite = sourceLockContext.inspectProspectingSiteAvailability_('https://closed.example/');
assert.strictEqual(goneSite.closed, true);
assert.strictEqual(goneSite.broken, false);
assert.strictEqual(goneSite.reason, 'HTTP 410');
sourceLockContext.fetchProspectingHtml_ = () => {
  throw new Error('Source page fetch failed: DNS error https://missing-host.example/');
};
const missingHostSite = sourceLockContext.inspectProspectingSiteAvailability_('https://missing-host.example/');
assert.strictEqual(missingHostSite.closed, false);
assert.strictEqual(missingHostSite.broken, true);
sourceLockContext.fetchProspectingHtml_ = () => {
  throw new Error('Source page fetch failed: timeout https://slow.example/');
};
const temporaryTimeoutSite = sourceLockContext.inspectProspectingSiteAvailability_('https://slow.example/');
assert.strictEqual(temporaryTimeoutSite.closed, false);
assert.strictEqual(temporaryTimeoutSite.broken, false, 'timeouts must remain eligible because they can be transient');
sourceLockContext.fetchProspectingHtml_ = (url) => ({ url, html: '<html></html>' });
assert.strictEqual(sourceLockContext.resolveSourcePageGenre_(
  { source_preset: 'nap_camp' },
  { genre: '介護' },
  { genre: '介護' }
), 'キャンプ');
assert.strictEqual(sourceLockContext.resolveSourcePageGenre_(
  {},
  { genre: '温泉旅館' },
  { genre: '介護' }
), '温泉旅館');
assert.strictEqual(sourceLockContext.isNapCampSourcePageLead_({ source: 'source_page', source_id: 'nap_camp:tokyo:123' }), true);
assert.strictEqual(sourceLockContext.isNapCampSourcePageLead_({ source: 'prospecting', source_id: 'nap_camp:tokyo:123' }), false);
sourceLockContext.nowIso_ = () => '2026-07-15T12:00:00+09:00';
const normalizedNapInput = sourceLockContext.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrl: 'https://www.nap-camp.com/list',
  genre: '介護',
});
assert.strictEqual(normalizedNapInput.site_preset, 'nap_camp');
assert.strictEqual(normalizedNapInput.genre, 'キャンプ');
assert.strictEqual(normalizedNapInput.items[0].genre, 'キャンプ');
assert.strictEqual(normalizedNapInput.create_unresolved_leads, false);
const normalizedGenericSourceInput = sourceLockContext.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrl: 'https://directory.example/company-list',
  genre: '',
  crawlAll: true,
  resultsPerQuery: 10,
});
assert.strictEqual(normalizedGenericSourceInput.site_preset, '');
assert.strictEqual(normalizedGenericSourceInput.genre, '');
assert.strictEqual(normalizedGenericSourceInput.crawl_all, true);
assert.strictEqual(normalizedGenericSourceInput.items[0].source_url, 'https://directory.example/company-list');
const genericSourceCandidates = sourceLockContext.extractSourcePageCandidates_(
  '<a href="/members/alpha">株式会社アルファ</a><a href="https://beta-corp.example.jp/">公式サイト</a><a href="/about">会社概要</a>',
  'https://directory.example/company-list',
  10,
);
assert.strictEqual(genericSourceCandidates.length, 3);
assert.strictEqual(genericSourceCandidates[0].facility_name, '株式会社アルファ');
assert.strictEqual(genericSourceCandidates[0].detail_url, 'https://directory.example/members/alpha');
assert.strictEqual(genericSourceCandidates[1].official_url, 'https://beta-corp.example.jp/');
const normalizedResortGlampingInput = sourceLockContext.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrl: 'resort-glamping.com',
  genre: 'グランピング',
  crawlAll: true,
});
assert.strictEqual(normalizedResortGlampingInput.site_preset, 'resort_glamping');
assert.strictEqual(normalizedResortGlampingInput.source_url, 'https://resort-glamping.com');
assert.strictEqual(normalizedResortGlampingInput.items[0].source_url, 'https://resort-glamping.com');
assert.strictEqual(normalizedResortGlampingInput.items[0].collection_url, 'https://www.resort-glamping.com/accommodation/');
const automaticResortFullCrawlInput = sourceLockContext.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrl: 'https://www.resort-glamping.com/',
  label: 'nap-camp.com',
  resultsPerQuery: 10,
});
assert.strictEqual(automaticResortFullCrawlInput.crawl_all, true);
assert.strictEqual(automaticResortFullCrawlInput.items[0].crawl_all, true);
assert.strictEqual(automaticResortFullCrawlInput.job_limit, 1);
assert.strictEqual(automaticResortFullCrawlInput.label, 'resort-glamping.com');
assert.strictEqual(automaticResortFullCrawlInput.items[0].label, 'resort-glamping.com');
const manyResortSitemapCandidates = sourceLockContext.extractResortGlampingSitemapCandidates_(
  '<urlset>' + Array.from({ length: 25 }, (_unused, index) =>
    `<url><loc>https://www.resort-glamping.com/accommodation/full-crawl-${index + 1}/</loc></url>`
  ).join('') + '</urlset>',
  'https://www.resort-glamping.com/accommodation/',
  500,
);
assert.strictEqual(manyResortSitemapCandidates.length, 25, 'full crawl must continue beyond the first 10 facilities');
const ordinaryDirectoryInput = sourceLockContext.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrl: 'https://directory.example/members',
  resultsPerQuery: 10,
});
assert.strictEqual(ordinaryDirectoryInput.crawl_all, false);
const resortGlampingCandidates = sourceLockContext.extractResortGlampingCandidates_(
  '<ul><li class="js-more-item"><div><a href="https://www.resort-glamping.com/accommodation/sample-glamping/"></a>' +
    '<p class="ttl">サンプル・グランピング</p><p class="address-txt">山梨県南都留郡</p></div></li>' +
    '<li class="js-more-item"><div><a href="/accommodation/second-villa/"></a>' +
    '<p class="ttl">セカンドヴィラ</p><p class="address-txt">千葉県いすみ市</p></div></li></ul>',
  'https://www.resort-glamping.com/accommodation/',
  500,
);
assert.strictEqual(resortGlampingCandidates.length, 2);
assert.strictEqual(resortGlampingCandidates[0].facility_name, 'サンプル・グランピング');
assert.strictEqual(resortGlampingCandidates[0].address, '山梨県南都留郡');
assert.strictEqual(resortGlampingCandidates[0].source_id, 'resort_glamping:sample-glamping');
assert.strictEqual(resortGlampingCandidates[1].detail_url, 'https://www.resort-glamping.com/accommodation/second-villa/');
const resortGlampingSitemapCandidates = sourceLockContext.extractResortGlampingSitemapCandidates_(
  '<?xml version="1.0"?><urlset>' +
    '<url><loc>https://www.resort-glamping.com/accommodation/blue-dome/</loc></url>' +
    '<url><loc>https://www.resort-glamping.com/accommodation/glamp-dome/</loc></url>' +
    '<url><loc>https://www.resort-glamping.com/accommodation/blue-dome/</loc></url>' +
    '</urlset>',
  'https://www.resort-glamping.com/accommodation/',
  500,
);
assert.strictEqual(resortGlampingSitemapCandidates.length, 2);
assert.strictEqual(resortGlampingSitemapCandidates[0].facility_name, '');
assert.strictEqual(resortGlampingSitemapCandidates[0].source_id, 'resort_glamping:blue-dome');
const enrichedResortGlampingCandidate = sourceLockContext.enrichResortGlampingCandidateFromDetailHtml_(
  resortGlampingSitemapCandidates[0],
  '<html><head><meta name="description" content="海が見える施設">' +
    '<meta property="og:title" content="ブルードーム京都天橋立-関西・京都エリア"></head>' +
    '<body><span class="post post-accommodation current-item">ブルードーム京都天橋立</span>' +
    '<a href="https://www.dome-blue.com/">公式サイト</a></body></html>',
  'resort-glamping.com',
);
assert.strictEqual(enrichedResortGlampingCandidate.facility_name, 'ブルードーム京都天橋立');
assert.strictEqual(enrichedResortGlampingCandidate.official_url, 'https://www.dome-blue.com/');
assert.strictEqual(enrichedResortGlampingCandidate.detail_checked, true);
const gasUrlContext = vm.createContext({ console });
['Code.gs', 'Masters.gs', 'Serper.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), gasUrlContext, { filename: file });
});
assert.strictEqual(
  gasUrlContext.resolveSourcePageUrl_('/accommodation/blue-dome/', 'https://www.resort-glamping.com/accommodation/'),
  'https://www.resort-glamping.com/accommodation/blue-dome/'
);
assert.strictEqual(
  gasUrlContext.resolveSourcePageUrl_('../contact/?from=list#form', 'https://www.resort-glamping.com/accommodation/blue-dome/'),
  'https://www.resort-glamping.com/accommodation/contact/?from=list'
);
assert.strictEqual(
  gasUrlContext.resolveSourcePageUrl_('//www.dome-blue.com/', 'https://www.resort-glamping.com/accommodation/blue-dome/'),
  'https://www.dome-blue.com/'
);
assert.strictEqual(
  gasUrlContext.extractFirstOfficialLinkFromHtml_(
    '<a href="https://www.dome-blue.com/">公式サイト</a>',
    'https://www.resort-glamping.com/accommodation/blue-dome/',
    'resort-glamping.com'
  ),
  'https://www.dome-blue.com/'
);
const resortPageWithManyLinks = Array.from({ length: 550 }, (_, index) =>
  `<a href="/menu/${index + 1}/">メニュー${index + 1}</a>`
).join('') +
  '<a href="https://www.kobe-glamping.com/" class="nobdr clickBtn_accommodation_site" id="sitebtn_click">公式サイト</a>';
assert.strictEqual(
  gasUrlContext.extractHtmlLinks_(
    resortPageWithManyLinks,
    'https://www.resort-glamping.com/accommodation/glampdome-kobetenku/'
  ).length,
  500,
  'generic link extraction remains bounded'
);
assert.strictEqual(
  gasUrlContext.extractFirstOfficialLinkFromHtml_(
    resortPageWithManyLinks,
    'https://www.resort-glamping.com/accommodation/glampdome-kobetenku/',
    'resort-glamping.com'
  ),
  'https://www.kobe-glamping.com/',
  'explicit official links must be found even after the generic 500-link cap'
);
assert.strictEqual(
  gasUrlContext.extractResortGlampingSitemapCandidates_(
    '<urlset><url><loc>https://www.resort-glamping.com/accommodation/blue-dome/</loc></url></urlset>',
    'https://www.resort-glamping.com/accommodation/',
    10
  )[0].source_id,
  'resort_glamping:blue-dome'
);
assert.strictEqual(sourceLockContext.sourcePageSiteIdentityKey_('https://resort-glamping.com'), 'preset:resort_glamping');
assert.strictEqual(sourceLockContext.sourcePageSiteIdentityKey_('https://www.resort-glamping.com/'), 'preset:resort_glamping');
assert.strictEqual(sourceLockContext.sourcePageSiteIdentityKey_('https://www.resort-glamping.com/accommodation/'), 'preset:resort_glamping');
const deduplicatedResortGlampingSites = JSON.parse(JSON.stringify(sourceLockContext.buildSourcePageStatusSites_(
  [{ id: 'saved-resort', label: 'リゾグラ', url: 'https://www.resort-glamping.com/', sitePreset: 'resort_glamping' }],
  [
    {
      job: { id: 'root-job', job_type: 'source_page', updated_at: '2026-07-26T19:00:00+09:00' },
      payload: { source_url: 'https://resort-glamping.com' },
    },
    {
      job: { id: 'list-job', job_type: 'source_page', updated_at: '2026-07-26T20:00:00+09:00' },
      payload: {
        source_url: 'https://www.resort-glamping.com/',
        items: [{
          source_url: 'https://www.resort-glamping.com/',
          collection_url: 'https://www.resort-glamping.com/accommodation/',
          site_preset: 'resort_glamping',
        }],
      },
    },
  ],
)));
assert.strictEqual(deduplicatedResortGlampingSites.length, 1);
assert.strictEqual(deduplicatedResortGlampingSites[0].id, 'saved-resort');
const correctedResortGlampingSites = JSON.parse(JSON.stringify(sourceLockContext.buildSourcePageStatusSites_(
  [],
  [{
    job: { id: 'running-resort', job_type: 'source_page', status: 'running', updated_at: '2026-07-28T00:31:19+09:00' },
    payload: {
      source_url: 'https://www.resort-glamping.com/',
      label: 'nap-camp.com',
      site_preset: 'resort_glamping',
      items: [{
        source_url: 'https://www.resort-glamping.com/',
        label: 'nap-camp.com',
        site_preset: 'resort_glamping',
        crawl_all: true,
      }],
    },
  }],
)));
assert.strictEqual(correctedResortGlampingSites[0].label, 'resort-glamping.com');
const correctedRunningResortProgress = sourceLockContext.buildSourcePageJobProgress_({
  id: 'b2b44ffe-46d7-4119-bd6e-d91ea619a00d',
  job_type: 'source_page',
  status: 'running',
  progress_json: '{"processedTargets":62,"totalTargets":403}',
  updated_at: '2026-07-28T00:31:19+09:00',
}, {
  source_url: 'https://www.resort-glamping.com/',
  label: 'nap-camp.com',
  site_preset: 'resort_glamping',
  items: [{
    source_url: 'https://www.resort-glamping.com/',
    label: 'nap-camp.com',
    site_preset: 'resort_glamping',
  }],
});
assert.strictEqual(correctedRunningResortProgress.label, 'resort-glamping.com');
const noCandidateJobProgress = sourceLockContext.buildSourcePageJobProgress_({
  id: 'empty-source-page',
  job_type: 'source_page',
  status: 'completed',
  total_count: 1,
  processed_count: 1,
  updated_at: '2026-07-26T19:07:51+09:00',
}, {
  job_type: 'source_page',
  source_url: 'https://resort-glamping.com',
  total_candidates: 0,
  items: [{ source_url: 'https://resort-glamping.com' }],
});
assert.strictEqual(noCandidateJobProgress.statusLabel, '候補未検出');
assert.strictEqual(noCandidateJobProgress.processedTargets, 0);
assert.strictEqual(noCandidateJobProgress.totalTargets, 0);
assert.strictEqual(noCandidateJobProgress.percent, 0);
assert.match(noCandidateJobProgress.lastError, /施設候補を抽出できません/);
assert.throws(
  () => sourceLockContext.processSourcePageSearchItem_(
    { source_url: 'https://empty-directory.example/list', label: '空の一覧' },
    { job_type: 'source_page', results_per_query: 10, crawl_all: false },
    'empty-source-job',
    {},
  ),
  /施設候補を抽出できません/,
  'an empty source page must fail visibly instead of completing as one processed URL',
);
assert.strictEqual(sourceResultPayloads[sourceResultPayloads.length - 1].resultType, 'source_page_empty');

assert.strictEqual(sourceLockContext.isLeadReviewPending_({
  source: 'source_page', status: '未対応', website_url: '', email: '', form_url: '',
}), false);
assert.strictEqual(sourceLockContext.isLeadReviewPending_({
  source: 'source_page', status: '未対応', website_url: 'https://camp.example/', email: '', form_url: '',
}), true);
assert.strictEqual(sourceLockContext.normalizeUrl_('resort-glamping.com'), 'https://resort-glamping.com');
const existingClosedReviewLead = {
  source: 'source_page',
  status: '未対応',
  company_name: '【R8/3現在 閉鎖】伊豆キャンパーズヴィレッジ',
  facility_name: '【R8/3現在 閉鎖】伊豆キャンパーズヴィレッジ',
  website_url: 'https://closed-camp.example/',
  email: 'info@closed-camp.example',
  form_url: 'https://closed-camp.example/contact',
  deal_status: '未設定',
};
assert.strictEqual(sourceLockContext.isClearlyClosedLead_(existingClosedReviewLead), true);
assert.strictEqual(sourceLockContext.isLeadReviewPending_(existingClosedReviewLead), false, 'existing closed labels must disappear from the review queue');
assert.strictEqual(sourceLockContext.classifyLeadListState_(existingClosedReviewLead, {}), 'no_action', 'closed review records must be treated as no-action, not as another review state');
assert.match(sourceLockContext.getEmailSendTargetBlockReason_(existingClosedReviewLead, {}), /閉鎖・営業終了/);
assert.match(sourceLockContext.getFormSendTargetBlockReason_(existingClosedReviewLead, {}), /閉鎖・営業終了/);
assert.strictEqual(sourceLockContext.isFormOutreachLead_(existingClosedReviewLead), false);
assert.throws(
  () => sourceLockContext.assertCalendarInviteAllowed_(existingClosedReviewLead, 'info@closed-camp.example'),
  /閉鎖・営業終了/
);
const existingSuspendedReviewLead = {
  source: 'source_page',
  status: '未対応',
  company_name: '【R3.12 休業】森の家キャンプ場',
  facility_name: '【R3.12 休業】森の家キャンプ場',
  website_url: 'https://takamori.camp/',
  email: 'info@takamori.camp',
  form_url: '',
  deal_status: '未設定',
};
assert.strictEqual(sourceLockContext.isSuspendedLeadTitle_(existingSuspendedReviewLead), true);
assert.strictEqual(sourceLockContext.isClearlyClosedLead_(existingSuspendedReviewLead), true);
assert.strictEqual(sourceLockContext.isLeadReviewPending_(existingSuspendedReviewLead), false, '休業 labels must disappear from the review queue');
assert.strictEqual(sourceLockContext.classifyLeadListState_(existingSuspendedReviewLead, {}), 'no_action');
assert.match(sourceLockContext.getEmailSendTargetBlockReason_(existingSuspendedReviewLead, {}), /休業/);
const existingBrokenLinkLead = {
  source: 'source_page',
  status: '未対応',
  company_name: 'リンク切れ施設',
  facility_name: 'リンク切れ施設',
  website_url: 'https://missing-host.example/',
  email: 'info@missing-host.example',
  form_url: 'https://missing-host.example/contact',
  deal_status: '未設定',
  source_payload_json: JSON.stringify({
    contact_error: 'Exception: DNS error: https://missing-host.example/',
  }),
};
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Source page fetch failed: HTTP 404'), true);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Exception: DNS error: host not found'), true);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('SSL certificate verify failed'), true);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Exception: Address unavailable: https://missing-host.example/'), true);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Exception: Invalid argument: url'), true);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Source page fetch failed: HTTP 403'), false);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Source page fetch failed: HTTP 429'), false);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Source page fetch failed: HTTP 503'), false);
assert.strictEqual(sourceLockContext.isDefinitiveBrokenLinkError_('Source page fetch failed: timeout'), false);
assert.strictEqual(sourceLockContext.isVerifiedBrokenReviewFinding_({ statusCode: 404, reason: 'HTTP 404' }), true);
assert.strictEqual(sourceLockContext.isVerifiedBrokenReviewFinding_({ reason: 'Exception: DNS error: host not found' }), true);
assert.strictEqual(sourceLockContext.isVerifiedBrokenReviewFinding_({ statusCode: 503, reason: 'HTTP 503' }), false);
assert.strictEqual(sourceLockContext.isVerifiedBrokenReviewFinding_({ reason: 'timeout' }), false);
assert.strictEqual(sourceLockContext.isBrokenReviewLeadCleanupCandidate_(existingBrokenLinkLead), true);
let centralizedAvailabilityChecks = 0;
sourceLockContext.inspectProspectingSiteAvailability_ = () => {
  centralizedAvailabilityChecks += 1;
  return { closed: false, broken: true, reason: 'DNS error: host not found' };
};
assert.throws(
  () => sourceLockContext.assertAutomatedLeadSiteAvailableBeforeCreate_(existingBrokenLinkLead, {}),
  /確認待ちリストへ追加しませんでした/
);
assert.strictEqual(centralizedAvailabilityChecks, 1);
assert.strictEqual(sourceLockContext.assertAutomatedLeadSiteAvailableBeforeCreate_(existingBrokenLinkLead, { siteAvailabilityChecked: true }), true);
assert.strictEqual(centralizedAvailabilityChecks, 1, 'already checked collection paths must not fetch the same URL twice');
assert.strictEqual(sourceLockContext.assertAutomatedLeadSiteAvailableBeforeCreate_({ source: 'manual', website_url: 'https://missing-host.example/' }, {}), true);
assert.strictEqual(centralizedAvailabilityChecks, 1, 'manual leads must not be blocked by the automated collection guard');
assert.strictEqual(sourceLockContext.isLeadLinkDefinitelyBroken_(existingBrokenLinkLead), true);
assert.strictEqual(sourceLockContext.isLeadReviewPending_(existingBrokenLinkLead), false, 'saved definitive fetch errors must disappear from the review queue');
assert.strictEqual(sourceLockContext.classifyLeadListState_(existingBrokenLinkLead, {}), 'no_action', 'broken-link records must be treated as no-action');
assert.match(sourceLockContext.getEmailSendTargetBlockReason_(existingBrokenLinkLead, {}), /リンク切れ/);
assert.match(sourceLockContext.getFormSendTargetBlockReason_(existingBrokenLinkLead, {}), /リンク切れ/);
assert.strictEqual(sourceLockContext.isFormOutreachLead_(existingBrokenLinkLead), false);
assert.throws(
  () => sourceLockContext.assertCalendarInviteAllowed_(existingBrokenLinkLead, 'info@missing-host.example'),
  /リンク切れ/
);
assert(sourceLockContext.normalizeListOptions_({ filter: 'review' }).includeFields.includes('source_payload_json'));
assert.strictEqual(sourceLockContext.isClearlyClosedLead_({
  company_name: '旧店舗は閉店しましたが新店舗へ移転して営業中',
  facility_name: 'サンプルキャンプ場',
}), false, 'active relocated businesses must stay eligible');
assert.strictEqual(sourceLockContext.isLikelyOfficialCandidateUrl_('https://camp-go.com/camps/example', ''), false);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://yamagatakanko.com/attractions/detail_234.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://kankou-hamada.or.jp/guidepost/6434'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://umimachi-shimanecho.jp/archives/546'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://nkk-oki.com/japan/information/shimanebana-campsite/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('http://www.camping.gr.jp/spot.php?campsite_id=38'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.e-oki.net/accommodation/11102/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.town-kofu.jp/2/spot/r681/y128/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.katsuragi-kanko.jp/facility/%E6%96%B0%E5%AD%90%E3%82%AD%E3%83%A3%E3%83%B3%E3%83%91%E3%83%BC%E3%82%BA%E3%83%91%E3%83%BC%E3%82%AF/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.hokuei-kankou.jp/%E7%9B%AE%E7%9A%84%E3%81%A7%E9%81%B8%E3%81%B6/%E9%81%8A%E3%81%B6/%E3%81%8A%E5%8F%B0%E5%A0%B4%E5%85%AC%E5%9C%92/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.jpcamp.jp/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.kumano-area.jp/facility/1047/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://kihoku-kanko.com/see/747/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.minami-ise.jp/staying_13.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://web-odai.info/stay/stay-133.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://gozashirahama.com/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.kankomie.or.jp/spot/3483'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://tomikan.jp/area/yunomaru-shigeno/yunomarucampsite/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.doshi-kanko.jp/camp/shimomura/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://odekake-wanko-bu.com/spot/mbs_camp/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.chichibuji.gr.jp/experience/camp-syousai30/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.honda.co.jp/dog/travel/data/aruba/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://nakagawatourism.com/napautopark'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://togakushi-21.jp/spot/362/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://campet.net/region/koshinetsu/1019'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://tateyamacity.com/activities/cimatateyama/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.maebashi-cvb.com/spot/8517'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.hakobura.jp/spots/314'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://tabirai.net/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://wankonowa.com/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.cm-boso.com/member_256.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://japancamp.jp/camp_search/camp-147/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.niwadandyism.top/9363'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://tonosoto.com/27181/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://touring.hokkaido.world/?p=98'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://example-camper.ameblo.jp/entry-1.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://official-camp.amebaownd.com/'), false, 'website builders used by facility operators must remain eligible');
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.motosuko-camp.com/'), false, 'a facility-specific official site must remain eligible even when operated by a tourism association');
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://wakasugicamp.sasagurikanko.com/'), false, 'a facility-specific tourism-association subdomain must remain eligible');
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://narukokankouhotel.co.jp/'), false, 'a hotel name containing kankou must remain eligible');
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.nihonalpskankou.com/'), false, 'an operator site containing kankou must remain eligible');
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://salps36.com/'), false, 'an official lodging site with guide articles must remain eligible');
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.bunto.com/shisetsu/?p=401'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://tp.furunavi.jp/Plan/Detail?plId=10332'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.katch.co.jp/community/kinjo/arekore/arekore324/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://kankou-example.or.jp/guidepost/123'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://visit-example.jp/spots/123'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://kanko-example.jp/facility/hoshizora-camp/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://visit-example.jp/accommodation/123/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://kankou-example.jp/%E7%9B%AE%E7%9A%84%E3%81%A7%E9%81%B8%E3%81%B6/%E9%81%8A%E3%81%B6/hoshizora/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://official-camp.example/information/'), false);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://official-camp.example/facility/'), false);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://official-hotel.example/accommodation/'), false);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.pref.yamagata.jp/050011/kurashi/shizen/koen/shiduyaeiguide.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.town.nishikawa.yamagata.jp/site/kanko/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.city.sakata.lg.jp/sangyo/kanko/rejyashisetsu/kazokuryokomura.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.city.example.lg.jp/camp/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.mlit.go.jp/'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://prefecture-camp.example/'), false);
assert.strictEqual(sourceLockContext.isLikelyOfficialCandidateUrl_('https://facility.example/', ''), true);
const selectedOfficial = sourceLockContext.selectLeadSearchResult_([
  { title: '施設まとめ', link: 'https://camp-go.com/camps/example', snippet: '一覧' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora.example/', snippet: '星空キャンプ場' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedOfficial.url, 'https://hoshizora.example/');
const selectedAfterClosedResult = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場は営業を終了しました', link: 'https://hoshizora-closed.example/', snippet: '長年のご利用ありがとうございました。' },
  { title: '星空キャンプ場 新公式サイト', link: 'https://hoshizora-active.example/', snippet: '予約・お問い合わせ受付中' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterClosedResult.url, 'https://hoshizora-active.example/', 'closed search results must not be selected as official sites');
const selectedAdvertiserSite = sourceLockContext.selectLeadSearchResult_([
  { title: '志津野営場 観光スポット', link: 'https://yamagatakanko.com/attractions/detail_234.html', snippet: '山形県観光情報ポータル' },
  { title: '山形県志津野営場の概要', link: 'https://www.pref.yamagata.jp/050011/kurashi/shizen/koen/shiduyaeiguide.html', snippet: '山形県公式サイト' },
  { title: '志津野営場 申込先 公式サイト', link: 'https://gassan-bunarin.jp/', snippet: '山形県立自然博物園' },
], 'lead_official_site', { company_name: '志津野営場' });
assert.strictEqual(selectedAdvertiserSite.url, 'https://gassan-bunarin.jp/');
const selectedPastTourismAssociation = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場 | 地域公式観光ガイド', link: 'https://regional-guide.example/information/hoshizora-camp/', snippet: '一般社団法人 地域観光協会' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-camp.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedPastTourismAssociation.url, 'https://hoshizora-camp.example/');
const selectedMunicipalListing = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場 | ○○町行政サイト', link: 'https://portal.example/spot/hoshizora/', snippet: '○○町役場が運営する施設案内' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-operator.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedMunicipalListing.url, 'https://hoshizora-operator.example/');
const selectedRegionalTourismListing = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場 | ○○エリア観光', link: 'https://regional-area.example/facility/123/', snippet: '地域観光推進実行委員会の施設・スポット情報' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-regional.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedRegionalTourismListing.url, 'https://hoshizora-regional.example/');
const selectedAfterTourismUnion = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場 | ○○観光組合', link: 'https://regional-union.example/see/123/', snippet: '観光組合による施設案内' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-union.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterTourismUnion.url, 'https://hoshizora-union.example/');
const selectedAfterPublicFacilityGuide = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場 | 施設案内', link: 'https://public-foundation.example/shisetsu/?p=401', snippet: '公益財団法人○○文化都市協会が管理する公園施設' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-public.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterPublicFacilityGuide.url, 'https://hoshizora-public.example/');
const selectedAfterTravelMarketplace = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場 | ふるなびトラベル', link: 'https://travel-market.example/Plan/Detail?plId=1', snippet: 'ふるさと納税のトラベルポイントが使える提携店' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-market.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterTravelMarketplace.url, 'https://hoshizora-market.example/');
const selectedAfterLocalMediaArticle = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場をスタッフが取材', link: 'https://local-media.example/community/kinjo/arekore/123/', snippet: '地域・番組情報の取材記事' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-media.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterLocalMediaArticle.url, 'https://hoshizora-media.example/');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: '星空キャンプ場 公式サイト', link: 'https://operator.example/shisetsu/', snippet: '宿泊予約・お問い合わせ',
}), false, 'an operator facility path without public-facility ownership must remain eligible');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: '星空キャンプ場のお知らせ', link: 'https://operator.example/community/', snippet: 'ご利用案内と予約',
}), false, 'an operator community path without editorial context must remain eligible');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: '湯の丸キャンプ場 – 一般社団法人 信州とうみ観光協会',
  link: 'https://regional.example/area/yunomaru/camp/',
  snippet: '観光協会による施設紹介',
}), true, 'tourism-association area pages must be excluded');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: 'ログ貸別荘 | 北海道 | おでかけ情報',
  link: 'https://www.honda.co.jp/dog/travel/data/aruba/',
  snippet: '旅行者向けの紹介記事',
}), true, 'tourism content hosted under a broader corporate domain must be excluded by path');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: 'CIMAたてやま体験センター | 南房総館山の体験観光35選',
  link: 'https://unknown-local-media.example/activities/cimatateyama/',
  snippet: '公式サイトはこちら',
}), true, 'tourism guide list pages must be excluded even when the domain has no tourism token');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: '南アルプス36 公式サイト',
  link: 'https://salps36.com/guide/',
  snippet: '宿泊棟の利用案内',
}), false, 'an official operator guide page must not be excluded by its path alone');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: 'ASHIGAWA CAMPING SITE 芦川オートキャンプ場',
  link: 'https://directory.example/camp_search/camp-147/',
  snippet: '山梨県笛吹市のキャンプ場情報',
}), true, 'camp-search directory detail pages must be excluded even when search snippets look like official facilities');
assert.strictEqual(sourceLockContext.isTourismAssociationListingSearchResult_({
  title: '星空キャンプ場 公式サイト',
  link: 'https://operator.example/camp/',
  snippet: '宿泊予約・お問い合わせ',
}), false, 'an operator camp page must remain eligible without directory evidence');
assert.strictEqual(sourceLockContext.isBlogOrEditorialSearchResult_({
  title: '星空キャンプ場へ行ってきました',
  link: 'https://camper-life.example/2026/07/20/hoshizora/',
  snippet: 'ソロキャンプ体験記。場内の様子をレポートします。',
}), true, 'personal experience articles must not be selected as official sites');
assert.strictEqual(sourceLockContext.isBlogOrEditorialSearchResult_({
  title: '地域の宿を紹介するローカルWebマガジン',
  link: 'https://local-story.example/',
  snippet: '編集部とライターが各地の施設を取材します。',
}), true, 'editorial media homepages must be excluded without relying on a known domain');
assert.strictEqual(sourceLockContext.isBlogOrEditorialSearchResult_({
  title: '星空キャンプ場 公式サイト',
  link: 'https://operator.example/2026/07/20/summer-event/',
  snippet: '夏イベントのお知らせ。宿泊予約・お問い合わせ受付中です。',
}), false, 'a dated page on an operator site must not be rejected by URL structure alone');
const selectedAfterBlogArticle = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場に行ってきました', link: 'https://camper-life.example/9363/', snippet: 'キャンプ場体験記と徹底レビュー' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-blog-guard.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterBlogArticle.url, 'https://hoshizora-blog-guard.example/');
const selectedAfterCampDirectory = sourceLockContext.selectLeadSearchResult_([
  { title: '星空キャンプ場', link: 'https://directory.example/camp_search/camp-999/', snippet: 'キャンプ場情報' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-direct.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterCampDirectory.url, 'https://hoshizora-direct.example/');
const selectedAfterNationwideDirectory = sourceLockContext.selectLeadSearchResult_([
  { title: 'Best Campsites in Japan | Search 6,200+ Spots', link: 'https://national-directory.example/', snippet: 'Every campsite in Japan on one map' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora-direct.example/', snippet: '宿泊予約・お問い合わせ' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedAfterNationwideDirectory.url, 'https://hoshizora-direct.example/');
const contactPages = {
  'https://camp.example/': '<a href="/privacy">プライバシー</a><a href="/contact">お問い合わせ</a>',
  'https://camp.example/contact': '<div class="wpcf7">お問い合わせ</div><p>sales (at) camp (dot) example</p><form><input type="email"><textarea name="message"></textarea></form>',
};
sourceLockContext.fetchProspectingHtml_ = (url) => ({ url, html: contactPages[url] || '' });
const discoveredContact = sourceLockContext.extractContactFromOfficialPage_('https://camp.example/');
assert.strictEqual(discoveredContact.formUrl, 'https://camp.example/contact');
assert.strictEqual(discoveredContact.email, 'sales@camp.example');
assert.deepStrictEqual(Array.from(discoveredContact.checkedUrls), ['https://camp.example/', 'https://camp.example/contact']);
const falsePositivePages = {
  'https://guide.example/': '<a href="/guide">お問い合わせ・利用案内</a>',
  'https://guide.example/guide': '<p>お問い合わせはお電話で</p><form action="/search"><input type="text" name="q"></form>',
};
sourceLockContext.fetchProspectingHtml_ = (url) => ({ url, html: falsePositivePages[url] || '' });
const rejectedFalsePositive = sourceLockContext.extractContactFromOfficialPage_('https://guide.example/');
assert.strictEqual(rejectedFalsePositive.formUrl, '', 'a guide page with only a search form is not a contact form');
const contactDepthPages = {
  'https://operator.example/': '<a href="/contact-broken">お問い合わせ</a><a href="/company">運営会社・会社概要</a>',
  'https://operator.example/company': '<span data-domain="operator.example" data-user="sales"></span><form class="newsletter"><input type="email"></form>',
};
sourceLockContext.fetchProspectingHtml_ = (url) => {
  if (url === 'https://operator.example/contact-broken') throw new Error('temporary fetch failure');
  return { url, html: contactDepthPages[url] || '' };
};
const discoveredFromCompanyPage = sourceLockContext.extractContactFromOfficialPage_('https://operator.example/');
assert.strictEqual(discoveredFromCompanyPage.email, 'sales@operator.example');
assert.strictEqual(discoveredFromCompanyPage.formUrl, '', 'a newsletter form must not be treated as a contact form');
assert.deepStrictEqual(Array.from(discoveredFromCompanyPage.checkedUrls), ['https://operator.example/', 'https://operator.example/company']);
assert(sourceLockContext.scoreContactPageLink_({ url: 'https://operator.example/company', text: '会社概要' }, 'operator.example') >= 60);
assert(sourceLockContext.scoreContactPageLink_({ url: 'https://external.example/company', text: '会社概要' }, 'operator.example') < 60);
assert.strictEqual(sourceLockContext.isKnownContactFormHost_('https://forms.office.com/r/abc123'), true);
const cloudflareEmail = 'info@cloud.example';
const cloudflareKey = 0x12;
const cloudflareHex = cloudflareKey.toString(16).padStart(2, '0') + Array.from(cloudflareEmail).map((character) =>
  (character.charCodeAt(0) ^ cloudflareKey).toString(16).padStart(2, '0')
).join('');
assert(sourceLockContext.decodeContactDiscoveryHtml_('<a data-cfemail="' + cloudflareHex + '">email</a>').includes(cloudflareEmail));
const encodedMailLink = sourceLockContext.extractHtmlLinks_('<a href="mailto:hello%40camp.example?subject=test">mail</a>', 'https://camp.example/')[0];
assert.strictEqual(encodedMailLink.email, 'hello@camp.example');
const depthPages = {};
for (let depth = 0; depth < 8; depth += 1) {
  const currentUrl = depth === 0 ? 'https://depth.example/' : 'https://depth.example/about/' + depth;
  const nextUrl = 'https://depth.example/about/' + (depth + 1);
  depthPages[currentUrl] = '<a href="' + nextUrl + '">会社概要</a>';
}
sourceLockContext.fetchProspectingHtml_ = (url) => ({ url, html: depthPages[url] || '' });
const boundedContactDiscovery = sourceLockContext.extractContactFromOfficialPage_('https://depth.example/');
assert.strictEqual(boundedContactDiscovery.checkedUrls.length, 4, 'contact discovery must remain bounded to four successful pages');
const normalizedNapPayload = sourceLockContext.normalizeNapCampJobGenrePayload_({
  job_type: 'source_page',
  site_preset: 'nap_camp',
  genre: '介護',
  items: [{ site_preset: 'nap_camp', genre: '介護' }],
});
assert.strictEqual(normalizedNapPayload.changed, true);
assert.strictEqual(normalizedNapPayload.payload.genre, 'キャンプ');
assert.strictEqual(normalizedNapPayload.payload.items[0].genre, 'キャンプ');
assert.strictEqual(sourceLockContext.columnNumberToA1_(1), 'A');
assert.strictEqual(sourceLockContext.columnNumberToA1_(26), 'Z');
assert.strictEqual(sourceLockContext.columnNumberToA1_(27), 'AA');

const searchReviewContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), searchReviewContext, { filename: file });
});
const searchReviewRecords = {
  'result-unconfirmed': { id: 'result-unconfirmed', review_status: 'unconfirmed', review_action: '' },
  'result-added': { id: 'result-added', review_status: 'added', review_action: 'add_lead', lead_id: 'lead-existing' },
  'result-excluded': { id: 'result-excluded', review_status: 'excluded', review_action: 'exclude', lead_id: '' },
  'result-claim': { id: 'result-claim', review_status: 'unconfirmed', review_action: '', title: 'Claim target', url: 'https://claim.example' },
  'result-retry': { id: 'result-retry', review_status: 'adding', review_action: 'add_lead_claim:lost-token', reviewed_at: new Date().toISOString(), title: 'Retry target', url: 'https://retry.example' },
  'result-release': { id: 'result-release', review_status: 'unconfirmed', review_action: '', title: 'Release target', url: 'https://release.example' },
  'result-failure': { id: 'result-failure', review_status: 'unconfirmed', review_action: '', title: 'Failure target', url: 'https://failure.example' },
};
let searchReviewLock = null;
let searchReviewLockCount = 0;
let searchClaimToken = 0;
searchReviewContext.Utilities = { getUuid: () => `search-claim-${++searchClaimToken}` };
searchReviewContext.withScriptLock_ = (operation, callback, options) => {
  searchReviewLock = { operation, options };
  searchReviewLockCount += 1;
  return callback();
};
searchReviewContext.findSheetRecordById_ = (_sheet, id) => searchReviewRecords[id] ? Object.assign({}, searchReviewRecords[id]) : null;
searchReviewContext.updateSheetRecord_ = (_sheet, id, patch) => {
  searchReviewRecords[id] = Object.assign({}, searchReviewRecords[id], patch);
  return Object.assign({}, searchReviewRecords[id]);
};
searchReviewContext.nowIso_ = () => new Date().toISOString();
const searchReview = searchReviewContext.reviewSearchResults({
  ids: ['result-unconfirmed', 'result-added', 'missing-result', 'result-unconfirmed'], action: 'confirm',
});
assert.strictEqual(searchReview.reviewed, 1);
assert.strictEqual(searchReview.conflicts.length, 1);
assert.strictEqual(searchReview.missing.length, 1);
assert.strictEqual(searchReviewRecords['result-unconfirmed'].review_status, 'confirmed');
assert.strictEqual(searchReviewRecords['result-added'].review_status, 'added');
assert.strictEqual(searchReviewLock.operation, 'reviewSearchResults');
assert.strictEqual(searchReviewLock.options.waitMs, 6000);
assert.strictEqual(searchReviewLock.options.attempts, 5);
const searchReviewRetry = searchReviewContext.reviewSearchResults({ ids: ['result-unconfirmed'], action: 'confirm' });
assert.strictEqual(searchReviewRetry.reviewed, 1);
assert.strictEqual(searchReviewRetry.conflicts.length, 0);
const bulkReviewIds = Array.from({ length: 26 }, (_value, index) => 'result-bulk-' + index);
bulkReviewIds.forEach((id) => {
  searchReviewRecords[id] = { id, review_status: 'unconfirmed', review_action: '' };
});
const lockCountBeforeBulkReview = searchReviewLockCount;
const chunkedSearchReview = searchReviewContext.reviewSearchResults({ ids: bulkReviewIds, action: 'exclude' });
assert.strictEqual(chunkedSearchReview.reviewed, 26);
assert.strictEqual(chunkedSearchReview.chunks, 2);
assert.strictEqual(searchReviewLockCount - lockCountBeforeBulkReview, 2, 'bulk review must release the script lock every 25 records');
assert(bulkReviewIds.every((id) => searchReviewRecords[id].review_status === 'excluded'));
assert.throws(() => searchReviewContext.reviewSearchResults({ ids: ['result-unconfirmed'], action: 'add_lead' }), /操作が不正/);
searchReviewContext.findActiveLeadBySourceReference_ = () => null;
assert.throws(() => searchReviewContext.addSearchResultToLead('result-excluded', {}), /すでに/);

const searchClaim = searchReviewContext.claimSearchResultForLeadCreation_('result-claim', '');
assert.strictEqual(searchReviewRecords['result-claim'].review_status, 'adding');
assert.strictEqual(searchReviewRecords['result-claim'].review_action, `add_lead_claim:${searchClaim.token}`);
const reviewDuringClaim = searchReviewContext.reviewSearchResults({ ids: ['result-claim'], action: 'exclude' });
assert.strictEqual(reviewDuringClaim.reviewed, 0);
assert.strictEqual(reviewDuringClaim.conflicts.length, 1);
assert.strictEqual(searchReviewRecords['result-claim'].review_status, 'adding', 'review must not overwrite an active add claim');
assert.throws(() => searchReviewContext.claimSearchResultForLeadCreation_('result-claim', ''), /別の処理で営業リストへ追加中/);
const finalizedClaim = searchReviewContext.finalizeSearchResultLeadCreation_('result-claim', 'lead-from-claim', searchClaim.token);
assert.strictEqual(finalizedClaim.review_status, 'added');
assert.strictEqual(finalizedClaim.lead_id, 'lead-from-claim');

const retryClaim = searchReviewContext.claimSearchResultForLeadCreation_('result-retry', 'recovered-retry-lead');
assert.notStrictEqual(retryClaim.token, 'lost-token');
assert.strictEqual(retryClaim.reused, true);
const finalizedRetry = searchReviewContext.finalizeSearchResultLeadCreation_('result-retry', 'recovered-retry-lead', retryClaim.token);
assert.strictEqual(finalizedRetry.lead_id, 'recovered-retry-lead', 'a retry must recover the previously created lead');

const releasableClaim = searchReviewContext.claimSearchResultForLeadCreation_('result-release', '');
const releasedClaim = searchReviewContext.releaseSearchResultLeadCreationClaim_('result-release', releasableClaim.token);
assert.strictEqual(releasedClaim.review_status, 'unconfirmed');
assert.strictEqual(releasedClaim.review_action, '');

searchReviewContext.createLeadWithLockOptions_ = () => { throw new Error('simulated create failure'); };
assert.throws(() => searchReviewContext.addSearchResultToLead('result-failure', {}), /simulated create failure/);
assert.strictEqual(searchReviewRecords['result-failure'].review_status, 'unconfirmed', 'a failed create must release its claim');
assert.strictEqual(searchReviewRecords['result-failure'].review_action, '');

const searchMergeContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), searchMergeContext, { filename: file });
});
let searchMergeLead = {
  id: 'merge-lead',
  status: '送信NG',
  website_url: 'https://manual.example',
  form_url: '',
};
let searchMergePatch = null;
searchMergeContext.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'updateLeadFromSearchResult');
  assert.strictEqual(options.waitMs, 6000);
  assert.strictEqual(options.attempts, 5);
  return callback();
};
searchMergeContext.getLeadById = () => Object.assign({}, searchMergeLead);
searchMergeContext.updateLeadLocked_ = (_id, patch) => {
  searchMergePatch = Object.assign({}, patch);
  searchMergeLead = Object.assign({}, searchMergeLead, patch);
  return Object.assign({}, searchMergeLead);
};
const preservedSearchMerge = searchMergeContext.updateLeadFromSearchResult_(
  { id: 'merge-lead', status: '未対応', website_url: '' },
  { website_url: 'https://search.example', form_url: 'https://search.example/contact' },
  'lead_form_url'
);
assert.strictEqual(preservedSearchMerge.updated, true);
assert.strictEqual(searchMergeLead.website_url, 'https://manual.example', 'search must not overwrite a manually entered website');
assert.strictEqual(searchMergeLead.form_url, 'https://search.example/contact');
assert.strictEqual(searchMergeLead.status, '送信NG', 'search must not overwrite a newer send-NG decision');
assert.strictEqual(Object.prototype.hasOwnProperty.call(searchMergePatch, 'status'), false);
searchMergeLead = { id: 'merge-lead', status: '未対応', website_url: '', form_url: '' };
searchMergePatch = null;
const filledSearchMerge = searchMergeContext.updateLeadFromSearchResult_(
  { id: 'merge-lead' },
  { website_url: 'https://search.example', form_url: 'https://search.example/contact' },
  'lead_form_url'
);
assert.strictEqual(filledSearchMerge.updated, true);
assert.strictEqual(searchMergeLead.website_url, 'https://search.example');
assert.strictEqual(searchMergeLead.form_url, 'https://search.example/contact');
assert.strictEqual(searchMergeLead.status, 'フォーム対応中');
searchMergePatch = null;
const skippedSearchMerge = searchMergeContext.updateLeadFromSearchResult_(
  { id: 'merge-lead' },
  { website_url: 'https://different.example', form_url: 'https://different.example/contact' },
  'lead_form_url'
);
assert.strictEqual(skippedSearchMerge.updated, false);
assert.strictEqual(searchMergePatch, null);
searchMergeLead = {
  id: 'merge-lead', status: '未対応', website_url: 'https://verified.example', form_url: '', email: '',
};
searchMergePatch = null;
const emailOnlySearchMerge = searchMergeContext.updateLeadFromSearchResult_(
  { id: 'merge-lead' },
  {
    website_url: 'https://verified.example',
    email: 'info@verified.example',
    form_url: '',
    url: 'https://verified.example/contact-info',
    contact_verified: true,
  },
  'lead_form_url'
);
assert.strictEqual(emailOnlySearchMerge.updated, true);
assert.strictEqual(searchMergeLead.email, 'info@verified.example');
assert.strictEqual(searchMergeLead.form_url, '', 'verified email-only discovery must not invent a form URL');
assert.strictEqual(searchMergeLead.status, '未対応');

const codeSource = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
const emailSource = fs.readFileSync(path.join(root, 'Email.gs'), 'utf8');
const serperSource = fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8');
const repositorySource = fs.readFileSync(path.join(root, 'Repository.gs'), 'utf8');
const webAppSource = fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
assert(codeSource.includes('20260803_apps_script_full_workflow_v328_compact_review_controls'));
const appInfoContext = vm.createContext({ console });
vm.runInContext(codeSource, appInfoContext, { filename: 'Code.gs' });
appInfoContext.PropertiesService = {
  getScriptProperties: () => ({ getProperty: () => 'stored-spreadsheet-id' }),
};
appInfoContext.CacheService = {
  getScriptCache: () => ({ get: () => null }),
};
appInfoContext.getOrCreateSpreadsheet_ = () => {
  throw new Error('getAppInfo must not open SpreadsheetApp when SPREADSHEET_ID is already stored');
};
const fastAppInfo = appInfoContext.getAppInfo();
assert.strictEqual(fastAppInfo.spreadsheetId, 'stored-spreadsheet-id');
assert.strictEqual(fastAppInfo.spreadsheetUrl, 'https://docs.google.com/spreadsheets/d/stored-spreadsheet-id');
assert(indexSource.includes('v276-guided-collection-ui'));
assert(indexSource.includes('v277-collection-focus-mode'));
assert(indexSource.includes('v278-universal-source-collection'));
assert(indexSource.includes('v281-source-page-reference-fidelity'));
assert(!indexSource.includes('https://'), 'Index.html must not contain a raw https:// literal because Apps Script HTML delivery truncates inline template markup after it');
assert(indexSource.includes('営業先をどう探しますか？'));
assert(indexSource.includes('class="collection-flow-guide"'));
assert(indexSource.includes('class="collection-guided-form"'));
assert(indexSource.includes("target.classList.toggle('is-collection-active', !isOverview)"));
assert(indexSource.includes("document.body.classList.toggle('collection-source-focus', focused)"));
assert(indexSource.includes('function updateCollectionFocusMode()'));
assert(indexSource.includes('function sourcePageUrlRequiresFullCrawl(value)'));
assert(indexSource.includes("hostname === 'resort-glamping.com'"));
assert(indexSource.includes('function renderCollectionAlternativeMethods(methodsOpen)'));
assert(indexSource.includes('function renderSectionLoading(name)'));
assert(indexSource.includes('取得が完了すると、この画面を自動で更新します。'));
assert(indexSource.includes("document.querySelector('.source-page-minimal-route')"));
assert(indexSource.includes('メール・ドメイン・会社名のいずれか1つを入力してください。'));
assert(indexSource.includes('画面を閉じても継続'));
assert(!indexSource.includes('POST / doPost startLeadCsvImport'));
assert(!indexSource.includes('class="background-center-button"'));
const collectionCommandCenterSource = indexSource.slice(
  indexSource.indexOf('function renderCollectionCommandCenter(info)'),
  indexSource.indexOf('function renderCollectionStatusStrip('),
);
assert(collectionCommandCenterSource.indexOf('renderCollectionTabPanel(activeTab, searchReady, dashboard)') < collectionCommandCenterSource.lastIndexOf('renderCollectionStatusStrip(searxng, reviewTargets, autoSettings)'), 'active collection form must render before the secondary status strip');
assert(collectionCommandCenterSource.includes("if (!isOverview && activeTab === 'sourcePage')"), 'source-page estimate refresh must remain inside renderCollectionCommandCenter where its route state is defined');
const searchActivityPanelSource = indexSource.slice(
  indexSource.indexOf('function renderSearchActivityPanel()'),
  indexSource.indexOf('function renderProspectingProgressDashboard()'),
);
assert(!searchActivityPanelSource.includes('isOverview'), 'search activity rendering must not reference collection-only route state');
assert(!searchActivityPanelSource.includes('activeTab'), 'search activity rendering must not reference collection-only activeTab');
assert(indexSource.includes('class="collection-route-back"'));
assert(indexSource.includes('tabindex="-1"'));
assert(indexSource.includes('業種・地域から探す'));
assert(indexSource.includes('一覧ページから取り込む'));
assert(indexSource.includes('function renderCollectionLastResult()'));
assert(indexSource.includes('この条件で収集を開始'));
assert(indexSource.includes('id="sourcePageSubmitButton"'));
assert(indexSource.includes('class="source-page-field-heading">ソースを選択'));
assert(indexSource.includes('class="source-page-source-selector" role="group" aria-label="一覧ページの入力方法"'));
assert(indexSource.includes('aria-pressed="${inputMode === \'new\' ? \'true\' : \'false\'}"'));
assert(!indexSource.includes('class="source-page-source-selector" role="tablist"'), 'the source selector behaves as a two-option button group, not an incomplete ARIA tab widget');
assert(indexSource.includes('body.modal-open'));
assert(indexSource.includes('function getActiveModalDialog()'));
assert(indexSource.includes('function keepFocusInsideDialog(event, dialog)'));
assert(indexSource.includes('function closeActiveModalDialog()'));
assert(indexSource.includes('function focusActiveSectionHeading(sectionId)'));
assert(indexSource.includes('focusActiveSectionHeading(name);'));
assert(indexSource.includes('.section-header h1:focus-visible'));
assert(indexSource.includes('function focusTaskCenterClose()'));
assert(indexSource.includes('closeTaskCenter({ restoreFocus: false });'));
assert(indexSource.includes('aria-labelledby="templateEditDialogTitle" tabindex="-1"'));
assert(indexSource.includes('aria-labelledby="templateTestDialogTitle" tabindex="-1"'));
assert(indexSource.includes('aria-labelledby="emailBatchConfirmTitle" tabindex="-1"'));
assert(indexSource.includes('id="leadDetailDialog" class="lead-detail-backdrop"'));
assert(indexSource.includes('aria-labelledby="leadFormTitle" tabindex="-1"'));
assert(indexSource.includes('id="adminSettingsSearch" type="search" aria-label="設定を検索"'));
assert(indexSource.includes('id="templateTestTo" type="email" aria-label="テスト送信先"'));
assert(indexSource.includes('id="jobResultEmail_${escapeHtml(item.id)}" inputmode="email" aria-label='));
assert(indexSource.includes('id="jobResultForm_${escapeHtml(item.id)}" inputmode="url" aria-label='));
assert(indexSource.includes('id="genreEditName_${escapeHtml(genre.id)}" aria-label="ジャンル名を編集"'));
assert(indexSource.includes('id="genreEditDescription_${escapeHtml(genre.id)}" aria-label="ジャンルの説明を編集"'));
assert(indexSource.includes('id="reasonEditName_${escapeHtml(reason.id)}" aria-label="理由名を編集"'));
assert(indexSource.includes('id="reasonEditDescription_${escapeHtml(reason.id)}" aria-label="理由の説明を編集"'));
assert(indexSource.includes("scope.matches('[data-ui-icon]')"), 'dynamic icon hydration must also handle an inserted icon node itself');
assert(indexSource.includes('hydrateLegacyUtilityIcons(root);'), 'newly rendered controls must receive their utility icons');
assert(indexSource.includes("title: '確認待ちの営業先はありません'"));
assert(indexSource.includes("actionLabel: '営業先を収集'"));
assert(indexSource.includes("title: '条件に一致する営業先はありません'"));
assert(indexSource.includes("actionLabel: '検索条件をクリア'"));
assert(indexSource.includes("title: 'テンプレートはまだありません'"));
assert(indexSource.includes("actionLabel: 'テンプレートを作成'"));
assert(indexSource.includes("emptyLabel.setAttribute('role', 'status')"));
assert(indexSource.includes("title: 'バックグラウンド処理はありません'"));
assert(indexSource.includes("title: '送信できる営業先はありません'"));
assert(indexSource.includes("title: '同期履歴はまだありません'"));
assert(indexSource.includes("scope.closest('table')"), 'empty-state enhancement must reach the parent table when tbody or a row is inserted');
assert(indexSource.includes('class="section-load-error"') || indexSource.includes("className = 'section-load-error'"));
assert(indexSource.includes("renderSectionLoadError(name, error);"), 'deferred screen failures must expose a local retry action');
assert(indexSource.includes("if (!state.hasCompletedInitialLoad) await refreshAll();"), 'startup retry must reload the initial application data');
assert(indexSource.includes("renderSectionLoadError(currentTab || 'reviewLeads', error);"), 'startup failures must expose the same persistent recovery action');
const hydrateUtilityIconsSource = indexSource.slice(
  indexSource.indexOf('function hydrateLegacyUtilityIcons(root)'),
  indexSource.indexOf('function enhancePageHeaders()', indexSource.indexOf('function hydrateLegacyUtilityIcons(root)')),
);
const dynamicIconContext = {
  document: { nodeType: 9, querySelectorAll: () => [] },
  legacyUiIcon: (key) => `<svg data-test-icon="${key}"></svg>`,
};
vm.runInNewContext(`${hydrateUtilityIconsSource}; this.hydrateLegacyUtilityIcons = hydrateLegacyUtilityIcons;`, dynamicIconContext);
const dynamicIconTarget = {
  nodeType: 1,
  innerHTML: '',
  matches: (selector) => selector === '[data-ui-icon]',
  querySelectorAll: () => [],
  getAttribute: () => 'checkCircle',
  removeAttribute: function removeAttribute() { this.removed = true; },
  classList: { add: function add(value) { this.value = value; } },
};
dynamicIconContext.hydrateLegacyUtilityIcons(dynamicIconTarget);
assert(dynamicIconTarget.innerHTML.includes('checkCircle'), 'an inserted icon node must be hydrated even when it is the mutation root');
assert.strictEqual(dynamicIconTarget.classList.value, 'button-icon');
assert.strictEqual(dynamicIconTarget.removed, true);

const enhanceEmptyTableStatesSource = indexSource.slice(
  indexSource.indexOf('function enhanceEmptyTableStates(root)'),
  indexSource.indexOf('function initializeDesignSystem()', indexSource.indexOf('function enhanceEmptyTableStates(root)')),
);
const configuredEmptyTableIds = Array.from(enhanceEmptyTableStatesSource.matchAll(/^\s+([A-Za-z][\w]*Table): \{/gm), (match) => match[1]);
configuredEmptyTableIds.forEach((tableId) => {
  assert(indexSource.includes(`id="${tableId}"`), `guided empty state references missing table ${tableId}`);
});
const legacyIconRegistrySource = indexSource.slice(
  indexSource.indexOf('const LEGACY_UI_ICON_SVGS'),
  indexSource.indexOf('function legacyUiIcon(key)'),
);
const legacyIconKeys = new Set(Array.from(legacyIconRegistrySource.matchAll(/^\s+([A-Za-z][\w]*):/gm), (match) => match[1]));
Array.from(enhanceEmptyTableStatesSource.matchAll(/icon: '([^']+)'/g), (match) => match[1]).forEach((iconKey) => {
  assert(legacyIconKeys.has(iconKey), `guided empty state references missing icon ${iconKey}`);
});
const emptyStateButtons = [];
let emptyStateNavigation = '';
const emptyStateContext = {
  document: {
    createElement: () => {
      const button = {
        type: '',
        className: '',
        textContent: '',
        addEventListener: function addEventListener(_event, action) { this.action = action; },
      };
      emptyStateButtons.push(button);
      return button;
    },
  },
  legacyUiIcon: (key) => `<svg data-test-icon="${key}"></svg>`,
  escapeHtml: (value) => String(value),
  showTab: (name) => { emptyStateNavigation = name; },
  clearLeadFilters: () => {},
  newTemplate: () => {},
  setLeadFilter: () => {},
};
vm.runInNewContext(`${enhanceEmptyTableStatesSource}; this.enhanceEmptyTableStates = enhanceEmptyTableStates;`, emptyStateContext);
const emptyStateLabel = {
  dataset: {},
  textContent: 'データがありません',
  className: '',
  innerHTML: '',
  attributes: {},
  setAttribute: function setAttribute(name, value) { this.attributes[name] = value; },
  appendChild: function appendChild(child) { this.child = child; },
};
const emptyReviewTable = {
  id: 'reviewLeadTable',
  nodeType: 1,
  matches: (selector) => selector === 'table',
  querySelectorAll: () => [],
  querySelector: () => emptyStateLabel,
};
emptyStateContext.enhanceEmptyTableStates(emptyReviewTable);
assert.strictEqual(emptyStateLabel.dataset.emptyEnhanced, 'true');
assert.strictEqual(emptyStateLabel.attributes.role, 'status');
assert(emptyStateLabel.innerHTML.includes('確認待ちの営業先はありません'));
assert.strictEqual(emptyStateLabel.child.textContent, '営業先を収集');
emptyStateLabel.child.action();
assert.strictEqual(emptyStateNavigation, 'search');
const dynamicEmptyStateLabel = {
  dataset: {},
  textContent: 'データがありません',
  className: '',
  innerHTML: '',
  attributes: {},
  setAttribute: function setAttribute(name, value) { this.attributes[name] = value; },
  appendChild: function appendChild(child) { this.child = child; },
};
const dynamicEmptyTable = {
  id: 'sendingPlanTable',
  querySelector: () => dynamicEmptyStateLabel,
};
const insertedTableBody = {
  nodeType: 1,
  matches: () => false,
  closest: (selector) => selector === 'table' ? dynamicEmptyTable : null,
  querySelectorAll: () => [],
};
emptyStateContext.enhanceEmptyTableStates(insertedTableBody);
assert.strictEqual(dynamicEmptyStateLabel.dataset.emptyEnhanced, 'true', 'an inserted tbody must enhance its containing table');
assert(dynamicEmptyStateLabel.innerHTML.includes('送信できる営業先はありません'));
assert.strictEqual(dynamicEmptyStateLabel.child.textContent, '営業リストを見る');
const customEmptyStateLabel = {
  dataset: {},
  textContent: '除外ドメインはまだ登録されていません',
  className: '',
  innerHTML: '',
  attributes: {},
  setAttribute: function setAttribute(name, value) { this.attributes[name] = value; },
  appendChild: function appendChild(child) { this.child = child; },
};
const customEmptyTable = {
  id: 'excludedTable',
  nodeType: 1,
  matches: (selector) => selector === 'table',
  closest: () => null,
  querySelectorAll: () => [],
  querySelector: () => customEmptyStateLabel,
};
emptyStateContext.enhanceEmptyTableStates(customEmptyTable);
assert.strictEqual(customEmptyStateLabel.dataset.emptyEnhanced, 'true', 'a configured table must enhance its custom empty copy');
assert(customEmptyStateLabel.innerHTML.includes('除外サイトの登録はありません'));
const sectionLoadErrorSource = indexSource.slice(
  indexSource.indexOf('function sectionLoadErrorId(name)'),
  indexSource.indexOf('function ensureDataLoaded(key, loader)'),
);
let insertedSectionError = null;
const sectionLoadHeader = {
  insertAdjacentElement: (_position, element) => { insertedSectionError = element; },
};
const sectionLoadSection = {
  prepend: (element) => { insertedSectionError = element; },
  querySelector: (selector) => selector === '.section-header' ? sectionLoadHeader : null,
};
const sectionLoadErrorContext = {
  apiErrorText: (error) => error && error.message ? error.message : String(error || ''),
  clearTimeout,
  document: {
    createElement: () => ({
      attributes: {},
      className: '',
      id: '',
      innerHTML: '',
      setAttribute: function setAttribute(name, value) { this.attributes[name] = value; },
    }),
    getElementById: (id) => id === 'analytics' ? sectionLoadSection : null,
  },
  ensureTabDataLoaded: async () => {},
  escapeHtml: (value) => String(value),
  escapeJsString: (value) => String(value),
  legacyUiIcon: (key) => `<svg data-test-icon="${key}"></svg>`,
  setBusy: () => {},
};
vm.runInNewContext(`${sectionLoadErrorSource}; this.renderSectionLoadError = renderSectionLoadError;`, sectionLoadErrorContext);
sectionLoadErrorContext.renderSectionLoadError('analytics', new Error('一時的に読み込めません'));
assert(insertedSectionError, 'a failed screen load must insert a visible section error');
assert.strictEqual(insertedSectionError.id, 'sectionLoadError_analytics');
assert.strictEqual(insertedSectionError.attributes.role, 'alert');
assert(insertedSectionError.innerHTML.includes('画面データを読み込めませんでした'));
assert(insertedSectionError.innerHTML.includes("retrySectionLoad('analytics')"));
assert(insertedSectionError.innerHTML.includes('一時的に読み込めません'));
assert(indexSource.includes('--green: #087f5b;'));
assert(indexSource.includes('--amber: #9a5b08;'));
assert(/\.source-page-url-command input::placeholder\s*\{\s*color: var\(--muted\);/.test(indexSource), 'URL placeholder text must use the readable muted-text token');
assert(!indexSource.includes('gmailStatusPills'), 'dead Gmail fallback must not reference a DOM node that is never rendered');
assert(!indexSource.includes('Collection activity'));
assert(!indexSource.includes('Send check'));
const staticIdDefinitions = new Set(Array.from(indexSource.matchAll(/\bid\s*=\s*["']([A-Za-z][\w:-]*)["']/g), (match) => match[1]));
const literalIdReferences = Array.from(indexSource.matchAll(/getElementById\(\s*['"]([A-Za-z][\w:-]*)['"]\s*\)/g), (match) => match[1]);
assert.deepStrictEqual(
  Array.from(new Set(literalIdReferences.filter((id) => !staticIdDefinitions.has(id)))).sort(),
  [],
  'literal getElementById references must resolve to a rendered DOM id',
);
const applicationSections = Array.from(indexSource.matchAll(/<section id="([^"]+)" class="section(?: active)?">/g), (match) => match[1]);
assert.strictEqual(applicationSections.length, 20, 'the app-wide audit contract must cover all 20 routed screens');
const tabLoaderSource = indexSource.slice(
  indexSource.indexOf('async function ensureTabDataLoaded(name)'),
  indexSource.indexOf('async function onCollectionSupportToggle', indexSource.indexOf('async function ensureTabDataLoaded(name)')),
);
const directlyLoadedTabs = Array.from(tabLoaderSource.matchAll(/name === '([^']+)'/g), (match) => match[1]);
const groupedLoadedTabs = Array.from(tabLoaderSource.matchAll(/\[([^\]]+)\]\.includes\(name\)/g), (match) => (
  Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1])
)).flat();
assert.deepStrictEqual(
  Array.from(new Set(directlyLoadedTabs.concat(groupedLoadedTabs))).sort(),
  applicationSections.slice().sort(),
  'every routed screen must have an explicit lazy-load/render branch',
);
const tabTitleSource = indexSource.slice(indexSource.indexOf('const TAB_TITLES'), indexSource.indexOf('const PAGE_DESCRIPTIONS'));
const pageDescriptionSource = indexSource.slice(indexSource.indexOf('const PAGE_DESCRIPTIONS'), indexSource.indexOf('const RECENT_BACKGROUND_JOB_MS'));
applicationSections.forEach((sectionId) => {
  assert(new RegExp(`\\b${sectionId}\\s*:`).test(tabTitleSource), `${sectionId} must have a document title`);
  assert(new RegExp(`\\b${sectionId}\\s*:`).test(pageDescriptionSource), `${sectionId} must have a concise task description`);
  const sectionStart = indexSource.indexOf(`<section id="${sectionId}" class="section`);
  const nextSectionStart = indexSource.indexOf('<section id="', sectionStart + 20);
  const sectionMarkup = indexSource.slice(sectionStart, nextSectionStart > sectionStart ? nextSectionStart : indexSource.indexOf('</main>', sectionStart));
  assert(sectionMarkup.includes('<h1>'), `${sectionId} must expose one visible page heading`);
});
const inlineClientMatch = indexSource.match(/<script>([\s\S]*?)<\/script>/);
assert(inlineClientMatch, 'the application must expose one inline client script');
const clientDeclarationSource = inlineClientMatch[1].replace(
  /\n\s*hydrateLegacyNavigationIcons\(\);\s*\n\s*hydrateLegacyUtilityIcons\(\);\s*\n\s*initializeDesignSystem\(\);\s*\n\s*refreshAll\(\);\s*$/,
  '',
);
const clientStorageMock = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };
const clientDocumentMock = {
  addEventListener: () => {},
  createElement: () => ({
    addEventListener: () => {},
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    click: () => {},
    dataset: {},
    remove: () => {},
    style: {},
  }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  body: { appendChild: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
};
const clientWindowMock = {
  addEventListener: () => {},
  clearTimeout,
  history: { pushState: () => {}, replaceState: () => {} },
  location: { hash: '', search: '' },
  requestAnimationFrame: (callback) => callback(),
  scrollTo: () => {},
  sessionStorage: clientStorageMock,
  setTimeout,
};
clientWindowMock.window = clientWindowMock;
const fullClientContext = vm.createContext({
  Array,
  Blob: class Blob {},
  Boolean,
  Date,
  Intl,
  JSON,
  Map,
  Math,
  MutationObserver: class MutationObserver { observe() {} },
  Number,
  Object,
  Promise,
  RegExp,
  Set,
  String,
  URL,
  URLSearchParams,
  clearTimeout,
  console,
  document: clientDocumentMock,
  setTimeout,
  window: clientWindowMock,
});
vm.runInContext(clientDeclarationSource, fullClientContext, { filename: 'Index.inline.runtime.js' });
[
  'ensureTabDataLoaded',
  'renderAdminScreen',
  'renderAnalyticsScreen',
  'renderBackgroundActivityScreen',
  'renderBackgroundJobsScreen',
  'renderDealsScreen',
  'renderErrorDetailsScreen',
  'renderGmailScreen',
  'renderHistoriesScreen',
  'renderOpsReadinessPanel',
  'renderSyncScreen',
  'showTab',
].forEach((functionName) => {
  assert.strictEqual(typeof fullClientContext[functionName], 'function', `${functionName} must remain callable at application scope`);
});
const clientFunctionDefinitions = new Set(Array.from(indexSource.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g), (match) => match[1]));
const inlineHandlerAttributes = Array.from(indexSource.matchAll(/\bon(?:click|change|submit|input|toggle|keydown|keyup|blur|focus)\s*=\s*(["'])(.*?)\1/g), (match) => match[2]);
const inlineHandlerCalls = inlineHandlerAttributes.flatMap((handler) => Array.from(handler.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g), (match) => match[1]));
const nativeInlineCalls = new Set(['alert', 'confirm', 'focus', 'getElementById', 'Number', 'preventDefault', 'scrollIntoView', 'stopPropagation', 'String', 'test']);
assert.deepStrictEqual(
  Array.from(new Set(inlineHandlerCalls.filter((name) => !clientFunctionDefinitions.has(name) && !nativeInlineCalls.has(name)))).sort(),
  [],
  'every inline UI action must resolve to a client function or a known browser method',
);
assert(indexSource.includes('<input id="sourcePageUrls" type="text" inputmode="url" aria-label="一覧ページのURL"'));
assert(!indexSource.includes('<textarea id="sourcePageUrls"'), 'source page URL must use a closed single-line input so following HTML cannot be swallowed');
assert(indexSource.includes('class="source-page-conditions-stack"'));
assert(indexSource.includes('収集を開始</button>'));
assert(indexSource.includes('追加したURLと進捗'));
assert(indexSource.includes('過去に追加したURL'));
assert(!indexSource.includes('body.collection-source-focus #search .collection-saved-sources,'));
assert(
  indexSource.indexOf('<details class="collection-saved-sources" open>') <
    indexSource.indexOf('${renderSourcePageTargetProgress()}'),
  'past source-page URL progress must appear before the current-job progress panel',
);
const clientApiActions = Array.from(new Set(Array.from(indexSource.matchAll(/\bapi(?:Quiet|ReadOnly)?\(\s*['"]([^'"]+)['"]/g), (match) => match[1]))).sort();
const postApiActions = new Set(Array.from(webAppSource.matchAll(/action\s*===\s*['"]([^'"]+)['"]/g), (match) => match[1]));
assert.deepStrictEqual(clientApiActions.filter((action) => !postApiActions.has(action)), [], 'every literal client API action must have a matching WebApp dispatch route');
assert(!/message\([^\n]*,\s*['"]bad['"]\s*\)/.test(indexSource), 'global messages must use a supported tone such as error or ok');
assert(codeSource.includes("BACKGROUND_WORKER_CLAIM_JSON: 'BACKGROUND_WORKER_CLAIM_JSON'"));
assert(!serperSource.includes('waitMs: 90000'), 'search and contact operations must not wait on one script lock for 90 seconds');
assert(/function claimSearchJobRun_[\s\S]*?waitMs: 6000, attempts: 5, retryDelayMs: 400/.test(serperSource));
assert(/function updateClaimedSearchJob_[\s\S]*?waitMs: 6000, attempts: 5, retryDelayMs: 400/.test(serperSource));
assert(codeSource.includes("key: 'gmail_sender_name'"));
assert(codeSource.includes("key: 'gmail_sender_email'"));
assert(emailSource.includes("const DEFAULT_GMAIL_SENDER_NAME_ = '【Ad Clutch】村松 侑哉'"));
assert(emailSource.includes("const DEFAULT_GMAIL_PRIMARY_SENDER_EMAIL_ = 'yuya.adclutch@gmail.com'"));
assert(emailSource.includes('function getGmailSenderIdentityStatus_'));
assert(emailSource.includes('GmailApp.sendEmail(source.to, source.subject, source.body, options)'));
assert(codeSource.includes("'filled_count'"));
assert(codeSource.includes('function createLeadLocked_'));
assert(codeSource.includes('function findActiveLeadBySourceReference_'));
assert(codeSource.includes('function listEmailSendCandidates'));
const listLeadsStart = codeSource.indexOf('function listLeads(options)');
const listLeadsEnd = codeSource.indexOf('\nfunction ', listLeadsStart + 10);
const listLeadsBody = codeSource.slice(listLeadsStart, listLeadsEnd);
assert(listLeadsBody.includes("readSheetRecordFields_('leads', leadListFields_(query.includeFields), { maxGapColumns: LEAD_LIST_READ_MAX_GAP_COLUMNS_ })"));
assert(codeSource.includes('const LEAD_LIST_READ_MAX_GAP_COLUMNS_ = 2'));
assert(codeSource.includes('const LEAD_LIST_CACHE_TTL_SECONDS_ = 300'));
assert(codeSource.includes('const LEAD_LIST_STATS_CACHE_TTL_SECONDS_ = 300'));
assert(codeSource.includes('function buildLeadListPrimaryFilterBundle_'));
assert(codeSource.includes("String(source.filter || '').indexOf('group_') === 0"));
assert(!listLeadsBody.includes('readSheetRecords_('), 'sales list must not read every lead column');
const listEmailCandidatesStart = codeSource.indexOf('function listEmailSendCandidates(options)');
const listEmailCandidatesEnd = codeSource.indexOf('\nfunction ', listEmailCandidatesStart + 10);
const listEmailCandidatesBody = codeSource.slice(listEmailCandidatesStart, listEmailCandidatesEnd);
assert(listEmailCandidatesBody.includes("readSheetRecordFields_('leads', leadListFields_(['contact_name']), { maxGapColumns: 0 })"));
assert(!listEmailCandidatesBody.includes('readSheetRecords_('), 'manual mail candidates must not read every lead column');
const duplicateCandidatesStart = codeSource.indexOf('function listLeadDuplicateCandidates(leadId, options)');
const duplicateCandidatesEnd = codeSource.indexOf('\nfunction ', duplicateCandidatesStart + 10);
const duplicateCandidatesBody = codeSource.slice(duplicateCandidatesStart, duplicateCandidatesEnd);
assert(duplicateCandidatesBody.includes("readSheetRecordFields_('leads', leadDuplicateCandidateFields_(), { maxGapColumns: 0 })"));
assert(!duplicateCandidatesBody.includes('readSheetRecords_('), 'lead detail duplicate checks must not read every lead column');
assert(codeSource.includes('function updateReviewLeadDecision'));
assert(codeSource.includes('function updateReviewLeadDecisions'));
assert(webAppSource.includes("if (action === 'updateReviewLeadDecisions') return updateReviewLeadDecisions(data);"));
const markFormStart = codeSource.indexOf('function markLeadFormSent(leadId, options)');
const markFormEnd = codeSource.indexOf('\nfunction ', markFormStart + 10);
const markFormBody = codeSource.slice(markFormStart, markFormEnd);
assert(markFormBody.includes('buildMasterBlockRulesContext_()'));
assert(!markFormBody.includes('buildMasterBlockContext_()'), 'form recording must not scan mail send histories while locked');
const masterRulesSource = fs.readFileSync(path.join(root, 'Masters.gs'), 'utf8');
const masterRulesStart = masterRulesSource.indexOf('function buildMasterBlockRulesContext_()');
const masterRulesEnd = masterRulesSource.indexOf('\nfunction ', masterRulesStart + 10);
const masterRulesBody = masterRulesSource.slice(masterRulesStart, masterRulesEnd);
assert(masterRulesBody.includes("readAllActiveSheetRecords_('ng_masters')"));
assert(masterRulesBody.includes("readAllActiveSheetRecords_('excluded_domains')"));
assert(masterRulesBody.includes('readMasterBlockRulesCache_()'));
assert(masterRulesBody.includes('writeMasterBlockRulesCache_(context)'));
assert(!masterRulesBody.includes('buildMailSendSafetyContext_'));
assert(codeSource.includes('function repairReviewLeadsWithoutContact'));
assert(codeSource.includes('function repairNonAdvertiserReviewLeads'));
assert(codeSource.includes('function repairNonAdvertiserCleanupOverreach'));
assert(codeSource.includes('function repairDuplicateLeadDomains'));
assert(fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8').includes("if (action === 'repairDuplicateLeadDomains')"));
assert(codeSource.includes('function repairHistoricalReviewDomainDuplicates'));
assert(fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8').includes("if (action === 'repairHistoricalReviewDomainDuplicates')"));
assert(codeSource.includes('function repairBrokenReviewLeads(options)'));
assert(fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8').includes("if (action === 'repairBrokenReviewLeads') return repairBrokenReviewLeads(data);"));
const reviewEditIndexSource = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
assert(reviewEditIndexSource.includes('function saveReviewInboxLeadEdit'));
assert(reviewEditIndexSource.includes('施設名・メール・ジャンルを編集'));
assert(reviewEditIndexSource.includes('id="reviewInlineGenre"'));
assert(reviewEditIndexSource.includes("const genre = String(document.getElementById('reviewInlineGenre')?.value || '').trim();"));
assert(reviewEditIndexSource.includes("form.querySelectorAll('input, select, button')"));
assert(reviewEditIndexSource.includes("apiQuiet('updateLead', id"));
const updateLeadFoundStart = codeSource.indexOf('function updateLeadFoundLocked_');
const updateLeadFoundEnd = codeSource.indexOf('\nfunction ', updateLeadFoundStart + 10);
const updateLeadFoundBody = codeSource.slice(updateLeadFoundStart, updateLeadFoundEnd);
assert(updateLeadFoundBody.includes("assertNoDuplicateLead_(sheet, nextRecord, { excludeLeadId: found.record.id })"));
const repairTargetBatches = JSON.parse(JSON.stringify(context.partitionLeadRepairTargets_([
  { rowNumber: 2, id: 'a' },
  { rowNumber: 51, id: 'b' },
  { rowNumber: 252, id: 'c' },
  { rowNumber: 253, id: 'd' },
], { maxItems: 2, maxRowSpan: 250 })));
assert.deepStrictEqual(repairTargetBatches.map((batch) => batch.map((target) => target.id)), [['a', 'b'], ['c', 'd']]);
const repairByCountBatches = context.partitionLeadRepairTargets_(Array.from({ length: 51 }, (_value, index) => ({
  rowNumber: index + 2,
  id: 'row-' + index,
})));
assert.deepStrictEqual(JSON.parse(JSON.stringify(repairByCountBatches.map((batch) => batch.length))), [25, 25, 1], 'lead repair locks must be capped at 25 targets');
const nonAdvertiserRepairStart = codeSource.indexOf('function repairNonAdvertiserReviewLeads(options)');
const nonAdvertiserRepairEnd = codeSource.indexOf('\nfunction ', nonAdvertiserRepairStart + 10);
const nonAdvertiserRepairBody = codeSource.slice(nonAdvertiserRepairStart, nonAdvertiserRepairEnd);
const nonAdvertiserRequiredHeaders = nonAdvertiserRepairBody.slice(
  nonAdvertiserRepairBody.indexOf('const requiredHeaders = ['),
  nonAdvertiserRepairBody.indexOf('];', nonAdvertiserRepairBody.indexOf('const requiredHeaders = ['))
);
['last_sent_at', 'send_count', 'reply_checked', 'deal_status'].forEach((header) => {
  assert(nonAdvertiserRequiredHeaders.includes("'" + header + "'"), 'non-advertiser cleanup must load protected history field ' + header);
});
assert(nonAdvertiserRepairBody.includes("withScriptLock_('repairNonAdvertiserReviewLeads:batch'"));
assert(!nonAdvertiserRepairBody.includes('sheet.getRange(startRow, 1, Math.max(lastScannedRow'), 'lead cleanup must not re-read the full scan while locked');
const collectionBlockContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), collectionBlockContext, { filename: file });
});
let collectionBlockCache = '';
let collectionBlockLeadReads = 0;
collectionBlockContext.CacheService = {
  getScriptCache: () => ({
    get: () => collectionBlockCache,
    put: (_key, value) => { collectionBlockCache = value; },
    remove: () => { collectionBlockCache = ''; },
  }),
};
collectionBlockContext.readAllActiveSheetRecords_ = (sheetName) => {
  assert.strictEqual(sheetName, 'excluded_domains');
  return [{ domain: 'configured-block.example', reason: '手動除外' }];
};
collectionBlockContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  assert.strictEqual(sheetName, 'leads');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(fields)),
    ['website_url', 'form_url', 'email', 'send_ng', 'status']
  );
  assert.strictEqual(options.maxGapColumns, 0);
  collectionBlockLeadReads += 1;
  return [
    { website_url: 'https://blocked.example/path', send_ng: true, status: '送信NG' },
    { form_url: 'https://forms.blocked-two.example/contact', send_ng: false, status: '送信NG' },
    { email: 'info@mail-blocked.example', send_ng: true, status: '未対応' },
    { website_url: 'https://allowed.example/', send_ng: false, status: '未対応' },
    { website_url: 'https://www.blocked.example/other', send_ng: true, status: '送信NG' },
  ];
};
const collectionBlockedDomains = collectionBlockContext.getLeadCollectionExcludedDomainRecords_();
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(collectionBlockedDomains.map((record) => record.domain).sort())),
  ['blocked.example', 'configured-block.example', 'forms.blocked-two.example', 'mail-blocked.example']
);
assert.strictEqual(
  collectionBlockContext.isLeadCollectionExcludedUrl_('https://shop.blocked.example/new-page', collectionBlockedDomains),
  true,
  'subdomains of a send-NG lead domain must be excluded before collection'
);
assert.strictEqual(
  collectionBlockContext.isLeadCollectionExcludedUrl_('https://allowed.example/', collectionBlockedDomains),
  false
);
collectionBlockContext.getLeadCollectionExcludedDomainRecords_();
assert.strictEqual(collectionBlockLeadReads, 1, 'send-NG domains should be cached between collection candidates');
collectionBlockContext.clearLeadCollectionSendNgDomainsCache_();
collectionBlockContext.getLeadCollectionExcludedDomainRecords_();
assert.strictEqual(collectionBlockLeadReads, 2, 'clearing the send-NG domain cache must refresh lead status changes');
const repairSafetyContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), repairSafetyContext, { filename: file });
});
const repairSafetyHeaders = [
  'id', 'source', 'company_name', 'facility_name', 'status', 'website_url', 'form_url',
  'last_sent_at', 'send_count', 'reply_checked', 'deal_status', 'form_status', 'next_send_at',
  'no_action_reason', 'no_action_memo', 'source_payload_json', 'archived_at', 'updated_at',
];
const repairSafetyRows = [
  ['sent', 'source_page', '送信済み会社', '送信済み施設', '初回メール送信済み', 'https://directory.example/sent', '', '2026-07-19T00:00:00+09:00', 1, false, '未設定', '未対応', '', '', '', '', '', ''],
  ['unsent', 'source_page', '未送信会社', '未送信施設', '未対応', 'https://directory.example/unsent', '', '', 0, false, '未設定', '未対応', '', '', '', '', '', ''],
];
const repairSafetySheet = {
  getLastRow: () => repairSafetyRows.length + 1,
  getRange: (row, _column, rowCount) => ({
    getValues: () => repairSafetyRows.slice(row - 2, row - 2 + rowCount),
  }),
};
repairSafetyContext.getOrCreateSpreadsheet_ = () => ({});
repairSafetyContext.ensureSheet_ = () => repairSafetySheet;
repairSafetyContext.getHeaders_ = () => repairSafetyHeaders.slice();
repairSafetyContext.getLeadCollectionExcludedDomainRecords_ = () => [{ domain: 'directory.example' }];
const repairSafetyDryRun = JSON.parse(JSON.stringify(repairSafetyContext.repairNonAdvertiserReviewLeads({
  dryRun: true,
  scanLimit: 10,
  maxUpdates: 10,
})));
assert.strictEqual(repairSafetyDryRun.matched, 1, 'sent leads must be excluded from non-advertiser cleanup before locking');
assert.strictEqual(repairSafetyDryRun.items[0].id, 'unsent');
const repairIdentityContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), repairIdentityContext, { filename: file });
});
const repairIdentityHeaders = [
  'id', 'source', 'status', 'website_url', 'email', 'form_url', 'form_status', 'next_send_at',
  'last_sent_at', 'send_count', 'reply_checked', 'deal_status', 'no_action_reason', 'no_action_memo', 'updated_at',
];
const reviewRow = ['lead-before', 'source_page', '未対応', '', '', '', '未対応', '', '', 0, false, '未設定', '', '', ''];
const shiftedRow = ['lead-after', 'source_page', '未対応', '', '', '', '未対応', '', '', 0, false, '未設定', '', '', ''];
let repairIdentityReads = 0;
let repairIdentityWrites = 0;
const repairIdentitySheet = {
  getLastRow: () => 2,
  getRange: () => ({
    getValues: () => {
      repairIdentityReads += 1;
      return [repairIdentityReads === 1 ? reviewRow.slice() : shiftedRow.slice()];
    },
  }),
  getRangeList: () => ({
    setValue: () => { repairIdentityWrites += 1; },
  }),
};
repairIdentityContext.getOrCreateSpreadsheet_ = () => ({});
repairIdentityContext.ensureSheet_ = () => repairIdentitySheet;
repairIdentityContext.getHeaders_ = () => repairIdentityHeaders.slice();
repairIdentityContext.withScriptLock_ = (_operation, callback) => callback();
repairIdentityContext.SpreadsheetApp = { flush: () => {} };
const repairIdentityResult = JSON.parse(JSON.stringify(repairIdentityContext.repairReviewLeadsWithoutContact({
  dryRun: false,
  scanLimit: 10,
  maxUpdates: 10,
})));
assert.strictEqual(repairIdentityResult.matched, 1);
assert.strictEqual(repairIdentityResult.updated, 0, 'a shifted row must not update a different lead after the pre-lock scan');
assert.strictEqual(repairIdentityWrites, 0);
assert.strictEqual(context.isSafeNonAdvertiserLeadCleanupTarget_({
  source: 'source_page', status: '送信NG', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}), true, 'unsent automated non-advertiser leads should be safe to archive regardless of review status');
assert.strictEqual(context.isSafeNonAdvertiserLeadCleanupTarget_({
  source: 'source_page', status: '初回メール送信済み', send_count: 1, last_sent_at: '2026-07-19T00:00:00+09:00', reply_checked: false, deal_status: '未設定', archived_at: '',
}), false, 'sent leads must be retained for history');
assert.strictEqual(context.isSafeNonAdvertiserLeadCleanupTarget_({
  source: 'manual', status: '未対応', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}), false, 'manual leads must not be removed by automated collection cleanup');
const excludedPortalDomains = [{ domain: 'directory.example' }];
assert.strictEqual(context.isNonAdvertiserCleanupCandidate_({
  source: 'source_page', status: '未対応', website_url: 'https://directory.example/spot/1', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}, excludedPortalDomains), true, 'review candidates from configured excluded domains should be archived');
assert.strictEqual(context.isNonAdvertiserCleanupCandidate_({
  source: 'source_page', status: '送信NG', website_url: 'https://directory.example/spot/1', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}, excludedPortalDomains), false, 'non-review records on custom excluded domains should retain their history');
assert.strictEqual(context.isNonAdvertiserCleanupCandidate_({
  source: 'source_page', status: '送信NG', website_url: 'https://yamagatakanko.com/attractions/detail_234.html', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}, []), true, 'known tourism portals should be archived even when previously marked send NG');
assert.strictEqual(context.isTourismPortalCleanupCandidate_({
  source: 'source_page', status: '未対応', website_url: 'https://tomikan.jp/area/yunomaru/camp/', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}), true, 'review candidates on tourism portals must be archived');
assert.strictEqual(context.isTourismPortalCleanupCandidate_({
  source: 'source_page', status: '未対応', website_url: 'https://www.motosuko-camp.com/', send_count: 0, last_sent_at: '', reply_checked: false, deal_status: '未設定', archived_at: '',
}), false, 'facility-specific official sites must not be archived as tourism portals');
assert.strictEqual(context.isBlogMediaCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  website_url: 'https://www.niwadandyism.top/9363',
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), true, 'known personal-blog domains must be removed from the review queue');
assert.strictEqual(context.isBlogMediaCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  website_url: 'https://unknown-editorial.example/9363/',
  source_payload_json: JSON.stringify({
    serper: {
      selected: {
        source: {
          title: '星空キャンプ場へ行ってきました',
          link: 'https://unknown-editorial.example/9363/',
          snippet: 'キャンプ場体験記と実体験レビュー',
        },
      },
    },
  }),
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), true, 'stored search evidence must remove unknown editorial blog articles');
assert.strictEqual(context.isBlogMediaCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  website_url: 'https://official-operator.example/2026/07/20/summer-event/',
  source_payload_json: JSON.stringify({
    serper: {
      selected: {
        source: {
          title: '星空キャンプ場 公式サイト',
          link: 'https://official-operator.example/2026/07/20/summer-event/',
          snippet: '宿泊予約・お問い合わせ受付中',
        },
      },
    },
  }),
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), false, 'official operator pages must remain in review');
assert.strictEqual(context.isTourismPortalCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  website_url: 'https://regional.example/area/yunomaru/camp/',
  source_payload_json: JSON.stringify({
    serper: {
      selected: {
        source: {
          title: '湯の丸キャンプ場 – 一般社団法人 信州とうみ観光協会',
          link: 'https://regional.example/area/yunomaru/camp/',
          snippet: '観光協会による施設紹介',
        },
      },
    },
  }),
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), true, 'rich search-result evidence must exclude tourism portals without obvious domain tokens');
assert.strictEqual(context.isTourismPortalCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  website_url: 'https://www.motosuko-camp.com/',
  source_payload_json: JSON.stringify({
    serper: {
      selected: {
        source: {
          title: '本栖湖キャンプ場 オフィシャルHP 本栖湖観光協会が運営',
          link: 'https://www.motosuko-camp.com/',
          snippet: '予約・お問い合わせ受付中',
        },
      },
    },
  }),
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), false, 'tourism-association ownership alone must not exclude a facility-specific official site');
assert.strictEqual(context.isSuspendedLeadCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  facility_name: '【R3.12 休業】森の家キャンプ場',
  website_url: 'https://takamori.camp/',
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), true, 'review candidates with 休業 in their facility name must be archived');
assert.strictEqual(context.isSuspendedLeadCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  facility_name: '森の家キャンプ場',
  website_url: 'https://takamori.camp/',
  source_payload_json: JSON.stringify({
    serper: {
      selected: {
        source: {
          title: '森の家キャンプ場 冬季休業のお知らせ',
          snippet: '営業再開日は未定です。',
        },
      },
    },
  }),
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), true, 'review candidates with 休業 in stored search titles must be archived');
assert.strictEqual(context.isSuspendedLeadCleanupCandidate_({
  source: 'source_page',
  status: '未対応',
  facility_name: '営業中の森の家キャンプ場',
  website_url: 'https://takamori.camp/',
  source_payload_json: JSON.stringify({
    serper: {
      selected: {
        source: {
          title: '森の家キャンプ場 公式サイト',
          snippet: '毎週火曜日は休業日です。',
        },
      },
    },
  }),
  send_count: 0,
  last_sent_at: '',
  reply_checked: false,
  deal_status: '未設定',
  archived_at: '',
}), false, '休業 in a snippet alone must not archive an otherwise active facility');
assert(codeSource.includes('function repairTourismPortalReviewLeads(options)'));
assert(webAppSource.includes("if (action === 'repairTourismPortalReviewLeads') return repairTourismPortalReviewLeads(data);"));
assert(codeSource.includes('function repairBlogMediaReviewLeads(options)'));
assert(webAppSource.includes("if (action === 'repairBlogMediaReviewLeads') return repairBlogMediaReviewLeads(data);"));
assert(codeSource.includes('function repairSuspendedReviewLeads(options)'));
assert(webAppSource.includes("if (action === 'repairSuspendedReviewLeads') return repairSuspendedReviewLeads(data);"));
assert(codeSource.includes('function runLeadCollectionQualityMigrationV215_'));
assert(codeSource.includes('assertLeadCollectionDestinationAllowed_(lead);'));
assert(codeSource.includes('function classifyLeadListState_'));
assert(codeSource.includes('function buildLeadListStateBreakdown_'));
assert(codeSource.includes('function buildLeadListStateGroups_'));
assert(codeSource.includes("withScriptLock_('saveSerperApiKey'"));
const spreadsheetBindingStart = codeSource.indexOf('function getOrCreateSpreadsheet_');
const spreadsheetBindingEnd = codeSource.indexOf('\nfunction ', spreadsheetBindingStart + 10);
assert(!codeSource.slice(spreadsheetBindingStart, spreadsheetBindingEnd).includes('deleteProperty(PROPERTY_KEYS.SPREADSHEET_ID)'));
assert(!emailSource.includes("return withScriptLock_('sendLeadEmailBatch'"));
assert(serperSource.indexOf('fetchSerperCreditInfo_(key)') < serperSource.indexOf("withScriptLock_('refreshSerperCredits:save'"));
assert(codeSource.includes("{ sheet: 'search_usage_logs', label: '検索利用履歴' }"));
assert(codeSource.includes('countSheetExactMatches_'));
const mastersSource = fs.readFileSync(path.join(root, 'Masters.gs'), 'utf8');
assert(mastersSource.includes("ngMasters: readAllActiveSheetRecords_('ng_masters')"));
assert(mastersSource.includes("excludedDomains: readAllActiveSheetRecords_('excluded_domains')"));
assert(mastersSource.includes('function clearMasterBlockRulesCache_'));
assert(repositorySource.includes('clearMasterBlockRulesCache_();'));
assert(codeSource.includes('function getLeadCollectionSendNgDomainRecords_()'));
assert(repositorySource.includes('clearLeadCollectionSendNgDomainsCache_();'));
assert(!mastersSource.includes("listSheetRecords('email_templates', { limit: 1000, includeInactive: true })"));
assert(emailSource.includes("const templates = readAllActiveSheetRecords_('email_templates')"));
assert(codeSource.includes("'FORM_SEND_NOT_RECORDED'"));
const operationsSource = fs.readFileSync(path.join(root, 'Operations.gs'), 'utf8');
const storageHealthContext = vm.createContext({ console });
['Code.gs', 'Operations.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), storageHealthContext, { filename: file });
});
const storageRows = {
  search_results: 20001,
  search_usage_logs: 120,
  sync_logs: 30000,
  search_jobs: 30,
  jobs: 20,
  raw_import: 100,
  leads: 10000,
  send_histories: 2500,
  reply_logs: 300,
};
let storageCacheValue = '';
storageHealthContext.CacheService = {
  getScriptCache: () => ({
    get: () => storageCacheValue,
    put: (_key, value) => { storageCacheValue = value; },
  }),
};
storageHealthContext.getOrCreateSpreadsheet_ = () => ({
  getSheetByName: (sheetName) => ({ getLastRow: () => Number(storageRows[sheetName] || 0) + 1 }),
});
storageHealthContext.nowIso_ = () => '2026-07-19T12:00:00+09:00';
const storageHealth = JSON.parse(JSON.stringify(storageHealthContext.getStorageHealth({ bypassCache: true })));
assert.strictEqual(storageHealth.status, 'danger');
assert.strictEqual(storageHealth.noAutomaticDeletion, true);
assert.strictEqual(storageHealth.monitored.find((item) => item.key === 'search_results').status, 'warn');
assert.strictEqual(storageHealth.monitored.find((item) => item.key === 'sync_logs').status, 'danger');
assert.deepStrictEqual(storageHealth.protectedSheets.map((item) => item.key), ['leads', 'send_histories', 'reply_logs']);
assert(storageHealth.protectedSheets.every((item) => item.protected === true));
storageHealthContext.getOrCreateSpreadsheet_ = () => { throw new Error('cached storage health must avoid sheet reads'); };
assert.strictEqual(storageHealthContext.getStorageHealth({}).cached, true);
assert(!codeSource.includes('waitMs: 90000'), 'lead updates and legacy search settings must not wait on one script lock for 90 seconds');
assert(!emailSource.includes('waitMs: 90000'), 'mail preparation and tracking must not wait on one script lock for 90 seconds');
assert(!emailSource.includes('waitMs: 30000'), 'scheduled mail tracking must use the short retry policy');
assert(!operationsSource.includes('waitMs: 90000'), 'CSV, reply, calendar, and migration operations must not wait on one script lock for 90 seconds');
assert(emailSource.includes('function runScheduledEmailBatch'));
assert(emailSource.includes("job_type: 'automatic_email_send'"));
assert(emailSource.includes('function recordMailDeliveryReceipt_'));
assert(emailSource.includes('function reconcileMailDeliveryReceipts_'));
assert(emailSource.includes('reconcileMailDeliveryReceipts_(histories, { maxItems: 20 })'));
assert(operationsSource.includes("newTrigger('runScheduledEmailBatch').timeBased().everyMinutes(10)"));
assert(operationsSource.includes("const guests = sendInvites ? String(source.guests || lead.email || '').trim() : ''"));
assert(!operationsSource.includes("readAllSheetRecordsByName_('search_jobs'"), 'background worker paths must not scan completed search jobs');
assert(!operationsSource.includes("readAllSheetRecordsByName_('jobs'"), 'background worker paths must not scan completed import jobs');
assert(operationsSource.includes("findSheetRecordsByExactFieldValues_('search_jobs', 'status', ['queued', 'running'])"));
assert(operationsSource.includes("findSheetRecordsByExactFieldValues_('jobs', 'status', ['queued', 'running'])"));
assert(repositorySource.includes('function findSheetRecordsByExactFieldValues_'));
assert(!operationsSource.includes("readAllSheetRecordsByName_('reply_logs'"));
assert(operationsSource.includes("withScriptLock_('importLeadsFromCsv:item'"));
assert(operationsSource.includes('function startLeadCsvImport'));
assert(operationsSource.includes('function advanceLeadCsvImportJob'));
assert(operationsSource.includes('function buildLeadCsvImportRequestKey_'));
assert(operationsSource.includes('function recoverStaleCsvPreparationJobs_'));
assert(operationsSource.includes("withScriptLock_('startLeadCsvImport:appendRawChunk'"));
assert(operationsSource.includes('function buildSyncFillPatch_'));
assert(operationsSource.includes("withScriptLock_('recordDetectedReply'"));
assert(operationsSource.includes('function findReplyLogByLeadAndThread_'));
assert(operationsSource.includes("withScriptLock_('restoreReplyFalsePositiveCandidate'"));
const falsePositiveListStart = operationsSource.indexOf('function listReplyFalsePositiveCandidates(options)');
const falsePositiveListEnd = operationsSource.indexOf('\nfunction ', falsePositiveListStart + 10);
const falsePositiveListBody = operationsSource.slice(falsePositiveListStart, falsePositiveListEnd);
assert(falsePositiveListBody.includes("includeFields: ['last_gmail_thread_id']"));
assert(falsePositiveListBody.includes('includeStats: false'));
assert(falsePositiveListBody.includes("readSheetRecordFields_('reply_logs', replyFalsePositiveLogFields_(), { maxGapColumns: 0 })"));
assert(!falsePositiveListBody.includes("readAllSheetRecordsByName_('reply_logs'"));
assert(operationsSource.includes('function findCalendarEventByClaim_'));
assert(operationsSource.includes("'管理ID: ' + claimMarker"));
assert(!serperSource.includes("readAllSheetRecordsByName_('domain_cache'"));
const readDomainCacheStart = serperSource.indexOf('function readDomainCache_(cacheKey)');
const readDomainCacheEnd = serperSource.indexOf('\nfunction ', readDomainCacheStart + 10);
assert(serperSource.slice(readDomainCacheStart, readDomainCacheEnd).includes("findSheetRecordsByExactFieldValues_('domain_cache', 'cache_key', [cacheKey], domainCacheLookupFields_())"));
const writeDomainCacheStart = serperSource.indexOf('function writeDomainCache_(cacheKey, lead, selected, jobType)');
const writeDomainCacheEnd = serperSource.indexOf('\nfunction ', writeDomainCacheStart + 10);
assert(serperSource.slice(writeDomainCacheStart, writeDomainCacheEnd).includes("['id', 'cache_key', 'created_at', 'updated_at']"));
assert(!serperSource.includes("readAllSheetRecordsByName_('search_usage_logs'"));
const serperUsageCountStart = serperSource.indexOf('function getSerperUsageCount_(range, records)');
const serperUsageCountEnd = serperSource.indexOf('\nfunction ', serperUsageCountStart + 10);
const serperUsageCountBody = serperSource.slice(serperUsageCountStart, serperUsageCountEnd);
assert(serperUsageCountBody.includes("readSheetRecordFields_(\n      'search_usage_logs'"));
const serperManagerStart = serperSource.indexOf('function buildSerperApiKeyManagerInfo_(message)');
const serperManagerEnd = serperSource.indexOf('\nfunction ', serperManagerStart + 10);
const serperManagerBody = serperSource.slice(serperManagerStart, serperManagerEnd);
assert(serperManagerBody.includes("const usageRecords = readSheetRecordFields_(\n    'search_usage_logs'"));
assert(serperManagerBody.includes("['created_at', 'credits', 'request_count']"));
assert(serperManagerBody.includes('getSerperUsageCount_({ day: today }, usageRecords)'));
assert(serperManagerBody.includes('getSerperUsageCount_({ month: month }, usageRecords)'));
assert(!serperManagerBody.includes('getSerperUsageCount_({ day: today });'));
assert(serperSource.includes("withScriptLock_('writeDomainCache'"));
assert(serperSource.includes('function buildSearchJobRequestKey_'));
assert(serperSource.includes('function isRetryableSearchJobError_'));
assert(serperSource.includes('function hasSearchProviderConfigured_'));
assert(serperSource.includes('payload.use_serper_fallback !== false && hasSearchProviderConfigured_()'));
assert(serperSource.includes("result.fallbackFrom = 'searxng_empty'"));
assert(serperSource.includes("discoveryMode = response.provider === 'searxng' ? 'searxng_fallback' : 'serper_fallback'"));
assert(serperSource.includes("'source_page_searxng'"));
assert(serperSource.includes("withScriptLock_('reviewSearchResults'"));
assert(serperSource.includes("withScriptLock_('claimSearchResultForLeadCreation'"));
assert(serperSource.includes("withScriptLock_('finalizeSearchResultLeadCreation'"));
assert(serperSource.includes('function releaseSearchResultLeadCreationClaim_'));
assert(serperSource.includes("withScriptLock_('updateLeadFromSearchResult'"));
assert(serperSource.includes("withScriptLock_('recordSerperActiveKeyTestResult'"));
assert(serperSource.includes("withScriptLock_('recordSerperActiveKeyCreditResult'"));
assert(serperSource.includes("withScriptLock_('saveSearxngConfig'"));
assert(serperSource.includes("{ waitMs: 5000, attempts: 1 }"));
assert(serperSource.includes('lockContention: true'));
assert(serperSource.includes("const NAP_CAMP_GENRE = 'キャンプ'"));
const napGenreRepairStart = serperSource.indexOf('function repairNapCampGenres(options)');
const napGenreRepairEnd = serperSource.indexOf('\nfunction ', napGenreRepairStart + 10);
const napGenreRepairBody = serperSource.slice(napGenreRepairStart, napGenreRepairEnd);
assert(napGenreRepairBody.includes("withScriptLock_('repairNapCampGenres:batch'"));
assert(serperSource.includes("withScriptLock_('repairNapCampGenres:jobs'"));
assert(napGenreRepairBody.includes('repairNapCampJobGenreCandidates_(jobCandidates)'));
assert(napGenreRepairBody.includes("headers.indexOf('id')"));
assert(napGenreRepairBody.includes('String(current[idColumn]'));
assert(!napGenreRepairBody.includes('verifyCount'), 'genre repair must not re-read the full scan while locked');
assert(serperSource.includes('function repairNapCampGenres'));
const sourcePageStatusListStart = serperSource.indexOf('function listSourcePageSiteStatuses');
const sourcePageStatusListEnd = serperSource.indexOf('\nfunction ', sourcePageStatusListStart + 10);
const sourcePageStatusListBody = serperSource.slice(sourcePageStatusListStart, sourcePageStatusListEnd);
assert(sourcePageStatusListBody.includes("readSheetRecordFields_('search_jobs'"));
assert(!sourcePageStatusListBody.includes("readAllSheetRecordsByName_('search_jobs'"));
assert(sourcePageStatusListBody.includes("CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 300)"));
assert(serperSource.includes('function rankContactPageLinks_'));
assert(serperSource.includes('excludedFromReview: true'));
const sourcePageLeadIndexStart = serperSource.indexOf('function buildSourcePageLeadIndex_()');
const sourcePageLeadIndexEnd = serperSource.indexOf('\nfunction ', sourcePageLeadIndexStart + 10);
const sourcePageLeadIndexBody = serperSource.slice(sourcePageLeadIndexStart, sourcePageLeadIndexEnd);
assert(sourcePageLeadIndexBody.includes("readSheetRecordFields_('leads', sourcePageLeadIndexFields_(), { maxGapColumns: 0 })"));
assert(!sourcePageLeadIndexBody.includes('readSheetRecords_('), 'source-page collection must not read every lead column for duplicate indexing');
assert(!webAppSource.includes("readAllSheetRecordsByName_('search_jobs'"), 'dashboard must not read all search-job columns');
assert(!webAppSource.includes("readAllSheetRecordsByName_('sync_logs'"), 'dashboard must not read all sync-log columns');
assert(!webAppSource.includes("readAllSheetRecordsByName_('search_usage_logs'"), 'dashboard must not read all search-usage columns');
assert(webAppSource.includes("const searchJobs = readSheetRecordFields_('search_jobs', ["));
assert(webAppSource.includes("'id', 'job_type', 'status', 'query_json', 'progress_json', 'last_error', 'error_count'"));
assert(webAppSource.includes("readSheetRecordFields_('search_usage_logs', ['created_at', 'credits', 'request_count'])"));
assert(webAppSource.includes('getStartupDashboardStats_(serperInfo)'));
assert(webAppSource.includes('function getStartupDashboardStats_(serperInfo)'));
assert(webAppSource.includes('buildStartupDashboardPlaceholder_(serperInfo)'));
assert(webAppSource.includes('function buildStartupDashboardPlaceholder_(startupSerperInfo)'));
assert(codeSource.includes('function appInfoCacheKey_(spreadsheetId)'));
assert(codeSource.includes("CacheService.getScriptCache().put(appInfoCacheKey_(info.spreadsheetId), JSON.stringify(info), 120)"));
assert(codeSource.includes('clearAppInfoCache_();'));
assert(repositorySource.includes('function readSheetRecordFields_'));
assert(repositorySource.includes('function findSheetRecordsByExactFieldValues_(sheetName, fieldName, values, resultFieldNames)'));
assert(repositorySource.includes("const projectionRequested = Array.isArray(query.fields) && query.fields.length > 0"));
assert(repositorySource.includes('function readSettingsRecordsCached_()'));
assert(repositorySource.includes("CacheService.getScriptCache().put(settingsRecordsCacheKey_(), JSON.stringify(records), 300)"));
assert(repositorySource.includes("if (String(changedSheetName || '') === 'settings')"));
assert(repositorySource.includes('function getSendHistoryDetail(id)'));
assert(repositorySource.includes("findSheetRecordsByExactFieldValues_(\n    'send_histories',\n    'id'"));
const searchSupportIndexSource = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
const searchSupportLoadStart = searchSupportIndexSource.indexOf('async function loadSearchResults()');
const searchSupportLoadEnd = searchSupportIndexSource.indexOf('\n      function ', searchSupportLoadStart + 20);
const searchSupportLoadBody = searchSupportIndexSource.slice(searchSupportLoadStart, searchSupportLoadEnd);
assert(searchSupportLoadBody.includes("fields: ['id', 'job_id', 'lead_id', 'query', 'result_type', 'title', 'url', 'snippet', 'rank', 'review_status', 'review_action', 'reviewed_at', 'created_at', 'updated_at']"));
assert(searchSupportLoadBody.includes("fields: ['created_at', 'purpose', 'query', 'result_count', 'status']"));
assert(!searchSupportLoadBody.includes("'raw_json'"));
assert(searchSupportLoadBody.includes("fields: ['id', 'job_type', 'status', 'query_json', 'total_count', 'processed_count', 'cursor_json', 'progress_json', 'last_error', 'error_count', 'started_at', 'finished_at', 'created_at', 'updated_at']"));
assert(!searchSupportLoadBody.includes("'request_key'"), 'search screen job list must not transfer request keys');
assert(!searchSupportLoadBody.includes("'lock_token'"), 'search screen job list must not transfer job lock tokens');
const historyLoadStart = searchSupportIndexSource.indexOf('async function loadHistoryData(options)');
const historyLoadEnd = searchSupportIndexSource.indexOf('\n      async function loadSyncLogData(options)', historyLoadStart + 20);
const historyLoadBody = searchSupportIndexSource.slice(historyLoadStart, historyLoadEnd);
assert(historyLoadBody.includes("fields: ['id', 'lead_id', 'sent_at', 'send_type'"));
assert(!historyLoadBody.includes("'body'"), 'initial history load must not transfer send-history bodies');
const syncLogLoadStart = searchSupportIndexSource.indexOf('async function loadSyncLogData(options)');
const syncLogLoadEnd = searchSupportIndexSource.indexOf('\n      async function loadJobData(options)', syncLogLoadStart + 20);
const syncLogLoadBody = searchSupportIndexSource.slice(syncLogLoadStart, syncLogLoadEnd);
assert(syncLogLoadBody.includes("request('listErrorLogs'"));
assert(syncLogLoadBody.includes("fields: ['id', 'event_type', 'operation', 'source', 'status', 'level', 'added_count', 'filled_count', 'duplicate_skip_count', 'excluded_count', 'error_count', 'message', 'created_at']"));
assert(!syncLogLoadBody.includes("'stack'"), 'initial sync-log load must not transfer stacks');
assert(!syncLogLoadBody.includes("'context_json'"), 'initial sync-log load must not transfer contexts');
const jobLoadStart = searchSupportIndexSource.indexOf('async function loadJobData(options)');
const jobLoadEnd = searchSupportIndexSource.indexOf('\n      async function loadOpsData(options)', jobLoadStart + 20);
const jobLoadBody = searchSupportIndexSource.slice(jobLoadStart, jobLoadEnd);
assert(jobLoadBody.includes("fields: ['id', 'job_type', 'status', 'source', 'cursor_json', 'total_count', 'processed_count', 'added_count', 'filled_count', 'duplicate_skip_count', 'excluded_count', 'error_count', 'found_results_json', 'current_query', 'last_error', 'last_heartbeat_at', 'attempt_count', 'started_at', 'finished_at', 'created_at', 'updated_at']"));
assert(jobLoadBody.includes("fields: ['id', 'job_type', 'status', 'query_json', 'total_count', 'processed_count', 'cursor_json', 'progress_json', 'last_error', 'error_count', 'last_heartbeat_at', 'attempt_count', 'started_at', 'finished_at', 'created_at', 'updated_at']"));
assert(!jobLoadBody.includes("'payload_json'"), 'operations job list must not transfer unused job payloads');
assert(!jobLoadBody.includes("'request_key'"), 'operations job list must not transfer request keys');
assert(!jobLoadBody.includes("'lock_token'"), 'operations job list must not transfer job lock tokens');
const opsLoadStart = searchSupportIndexSource.indexOf('async function loadOpsData(options)');
const opsLoadEnd = searchSupportIndexSource.indexOf('\n      async function loadHistories()', opsLoadStart + 20);
const opsLoadBody = searchSupportIndexSource.slice(opsLoadStart, opsLoadEnd);
assert(opsLoadBody.includes('loadHistoryData({ render: false'));
assert(opsLoadBody.includes('loadSyncLogData({ render: false'));
assert(opsLoadBody.includes('loadJobData({ render: false'));
assert(searchSupportIndexSource.includes("ensureDataLoaded('histories', () => loadHistoryData({ render: false }))"));
assert(searchSupportIndexSource.includes("ensureDataLoaded('jobs', () => loadJobData({ render: false }))"));
assert(searchSupportIndexSource.includes("ensureDataLoaded('syncLogs', () => loadSyncLogData({ render: false }))"));
assert(!searchSupportIndexSource.includes("if (['backgroundJobs', 'backgroundActivity', 'ops', 'errors', 'sync', 'histories'].includes(name))"));
assert(searchSupportIndexSource.includes('async function loadSendHistoryBody(id)'));
assert(searchSupportIndexSource.includes("fields: ['id', 'body']"));
assert(searchSupportIndexSource.includes("apiQuiet('getSendHistoryDetail', historyId)"));
assert(searchSupportIndexSource.includes('async function loadSyncLogDetails()'));
assert(searchSupportIndexSource.includes("fields: ['id', 'stack', 'context_json']"));
assert(searchSupportIndexSource.includes("await ensureDataLoaded('syncLogDetails', loadSyncLogDetails)"));

let sendHistoryDetailLookup = null;
context.findSheetRecordsByExactFieldValues_ = (sheetName, fieldName, values, fields) => {
  sendHistoryDetailLookup = {
    sheetName,
    fieldName,
    values: JSON.parse(JSON.stringify(values)),
    fields: JSON.parse(JSON.stringify(fields)),
  };
  return [{ id: 'history-1', body: '本文', updated_at: '2026-07-19T00:00:00.000Z' }];
};
assert.strictEqual(context.getSendHistoryDetail('history-1').body, '本文');
assert.deepStrictEqual(sendHistoryDetailLookup, {
  sheetName: 'send_histories',
  fieldName: 'id',
  values: ['history-1'],
  fields: ['id', 'body', 'updated_at'],
});

const settingsCacheContext = vm.createContext({ console });
['Code.gs', 'Repository.gs'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), settingsCacheContext, { filename: file });
});
const settingsCacheStore = {};
const removedSettingsCacheKeys = [];
settingsCacheContext.CacheService = {
  getScriptCache: () => ({
    get: (key) => settingsCacheStore[key] || null,
    put: (key, value) => { settingsCacheStore[key] = value; },
    remove: (key) => {
      removedSettingsCacheKeys.push(key);
      delete settingsCacheStore[key];
    },
  }),
};
let settingsSheetReads = 0;
settingsCacheContext.readSheetRecordFields_ = (sheetName, fields, options) => {
  settingsSheetReads += 1;
  assert.strictEqual(sheetName, 'settings');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(fields)), ['id', 'key', 'value', 'value_type', 'description', 'updated_at']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(options)), { maxGapColumns: 0 });
  return [
    { id: 'setting-1', key: 'gmail_daily_send_limit', value: 80, value_type: 'number', description: '', updated_at: '2026-07-19T00:00:00.000Z' },
    { id: 'setting-2', key: 'mail_sending_control', value: '{"enabled":true}', value_type: 'json', description: '', updated_at: '2026-07-19T00:00:00.000Z' },
  ];
};
assert.strictEqual(settingsCacheContext.getSettingValue_('gmail_daily_send_limit', 10), 80);
assert.deepStrictEqual(JSON.parse(JSON.stringify(settingsCacheContext.getSettingValue_('mail_sending_control', {}))), { enabled: true });
assert.strictEqual(settingsSheetReads, 1, 'repeated setting reads must reuse CacheService');
settingsCacheContext.clearSettingsRecordsCache_();
assert.strictEqual(removedSettingsCacheKeys.includes(settingsCacheContext.settingsRecordsCacheKey_()), true);
assert.strictEqual(settingsCacheContext.getSettingValue_('gmail_daily_send_limit', 10), 80);
assert.strictEqual(settingsSheetReads, 2, 'cache invalidation must force a fresh settings read');
assert(webAppSource.includes("getSerperUsageCount_({ day: today }, searchUsageLogs)"));
assert(!webAppSource.includes("readAllSheetRecordsByName_('dashboard_cache'"), 'dashboard cache paths must not transfer every cached payload');
assert(webAppSource.includes("findLatestDashboardCacheRecord_(records, 'dashboard_stats_v7')"));
assert(webAppSource.includes("['dashboard_stats_v7'],\n      dashboardStatsCacheReadFields_()"));
assert(webAppSource.includes("['dashboard_stats_v7', 'dashboard_stats_v6', 'dashboard_stats_v5'],\n    dashboardStatsCacheWriteLookupFields_()"));
assert(!webAppSource.includes("record.cache_key === 'dashboard_stats_v4'"));
assert(webAppSource.includes("withScriptLock_('writeDashboardStatsCache'"));
assert(webAppSource.includes('dailyMailLimit - sentToday - pendingSendReservations.count'));
assert(webAppSource.includes("const sendHistories = readSheetRecordFields_('send_histories', dashboardSendHistoryFields_())"));
assert(webAppSource.includes("const leads = readSheetRecordFields_('leads', dashboardLeadFields_(), { maxGapColumns: 2 })"));
assert(!webAppSource.includes("const leads = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'leads'))"), 'dashboard must not read all lead columns');
assert(!webAppSource.includes("readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'))"), 'dashboard must not read all send-history columns');
assert(webAppSource.includes('analytics: buildAnalyticsSnapshot_(leads, sendHistories, today, templates)'));
const fullSendHistoryRead = "readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'))";
assert(!emailSource.includes(fullSendHistoryRead), 'mail paths must not transfer every send-history column');
assert(!codeSource.includes(fullSendHistoryRead), 'lead mail-date lookup must not transfer every send-history column');
assert(!operationsSource.includes(fullSendHistoryRead), 'reply checks must not transfer every send-history column');
assert(emailSource.includes('let histories = readMailSendSafetyHistories_()'));
assert(emailSource.includes("const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 })"));
assert(!emailSource.includes("const leads = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'leads'))"), 'automatic mail planning must not read all lead columns');
const scheduledJobClaimStart = emailSource.indexOf('function claimScheduledEmailJobOnce_()');
const scheduledJobClaimEnd = emailSource.indexOf('\nfunction ', scheduledJobClaimStart + 10);
const scheduledJobClaimBody = emailSource.slice(scheduledJobClaimStart, scheduledJobClaimEnd);
assert(scheduledJobClaimBody.includes("readSheetRecordFields_('jobs', scheduledEmailJobClaimFields_(), { maxGapColumns: 0 })"));
assert(!scheduledJobClaimBody.includes("readAllSheetRecordsByName_('jobs'"), 'scheduled mail claim must not read every job column');
assert(emailSource.includes("findSheetRecordsByExactFieldValues_(\n    'send_histories',\n    'lead_id',\n    [leadId],\n    mailSendSafetyHistoryFields_()"));
assert(emailSource.includes("findSheetRecordsByExactFieldValues_('send_histories', 'lead_id', [recordId])"));
assert(webAppSource.includes("if (action === 'repairNapCampGenres')"));
assert(webAppSource.includes("if (action === 'repairReviewLeadsWithoutContact')"));
assert(webAppSource.includes("if (action === 'repairNonAdvertiserReviewLeads')"));
assert(webAppSource.includes("if (action === 'getStorageHealth') return getStorageHealth(data);"));
assert(webAppSource.includes("if (action === 'listSourcePageSiteStatuses') return listSourcePageSiteStatuses(data);"));
const initialDataStart = webAppSource.indexOf('function getInitialData()');
const initialDataEnd = webAppSource.indexOf('\nfunction ', initialDataStart + 10);
const initialDataBody = webAppSource.slice(initialDataStart, initialDataEnd);
assert(initialDataBody.includes('getLeadCollectionQualityMigrationV215Status_()'));
assert(!initialDataBody.includes('runLeadCollectionQualityMigrationV215_'), 'startup must not run data migrations');
const scheduledEmailStart = emailSource.indexOf('function runScheduledEmailBatch');
const scheduledEmailEnd = emailSource.indexOf('\nfunction ', scheduledEmailStart + 10);
assert(!emailSource.slice(scheduledEmailStart, scheduledEmailEnd).includes('runLeadCollectionQualityMigrationV215_'), 'mail trigger must not run data migrations');
assert(operationsSource.includes('runLeadCollectionQualityMigrationV215_({ source: source })'));
assert(operationsSource.includes('const qualityMigrationMinimumRuntimeMs = 150000'));
assert(webAppSource.includes("return 'reference_data_' + String(APP_VERSION || 'v1')"));
assert(webAppSource.includes('getSchemaStatus({ settingsRecords: settings })'));
assert(codeSource.includes('clearReferenceDataCache_();'));
assert(serperSource.includes('function writeSerperApiKeyRecords_'));
assert((serperSource.match(/clearReferenceDataCache_\(\);/g) || []).length >= 3);
assert(indexSource.includes('class="workflow-nav" aria-label="主要な業務フロー"'));
assert(indexSource.includes('data-tab="dashboard" onclick="showTab(\'dashboard\')"'));
assert(indexSource.includes('data-tab="search" onclick="showTab(\'search\')"'));
assert(indexSource.includes('data-tab="reviewLeads" onclick="showTab(\'reviewLeads\')" aria-current="page"'));
assert(indexSource.includes('data-tab="emailLeads" onclick="showTab(\'emailLeads\')"'));
assert(indexSource.includes('data-tab="analytics" onclick="showTab(\'analytics\')"'));
assert(indexSource.includes('id="navReviewCount" class="nav-count" hidden'));
assert(indexSource.includes('id="navSendCount" class="nav-count" hidden'));
assert(indexSource.includes('<h1>今日の営業フロー</h1>'));
assert(indexSource.includes('id="dashboardWorkflow" class="dashboard-workflow"'));
assert(indexSource.includes('id="dashboardTaskQueue" class="dashboard-task-queue"'));
assert(indexSource.includes('id="dashboardOperations" class="dashboard-operation-list"'));
assert(indexSource.includes('id="dashboardOutcomes" class="dashboard-outcome-grid"'));
assert(indexSource.includes('class="dashboard-detail-disclosure"'));
assert(indexSource.includes("dashboardWorkflowStep({ label: '確認'"));
assert(indexSource.includes("dashboardTaskItem({ label: '確認待ちを進める'"));
assert(indexSource.includes("dashboardTaskItem({ label: '送信キューを確認する'"));
assert(indexSource.includes("dashboardOperationRow('API連携'"));
assert(indexSource.includes("dashboardOutcomeItem('今月新規リスト'"));
assert(indexSource.includes('aria-current="step"'));
assert(indexSource.includes('@media (max-width: 620px)'));
assert(!indexSource.includes('id="dashboardSignals"'));
assert(!indexSource.includes('id="dashboardActions"'));
assert(indexSource.includes('class="nav-more nav-section" data-nav-tabs="leads,backgroundJobs,forms,sending,histories,templates,deals"'));
assert(indexSource.includes("disclosure.open = hasActiveTab;"));
assert(indexSource.includes("tab.setAttribute('aria-current', 'page')"));
assert(indexSource.includes('const pendingMutationRoots = new Set();'));
assert(indexSource.includes('pendingMutationRoots.size > 24 ? [main] : Array.from(pendingMutationRoots)'));
assert(!indexSource.includes('const SECONDARY_NAV_TABS'));
assert(!indexSource.includes('const TOP_SHORTCUT_TABS'));
assert(!indexSource.includes('function updateTopShortcutBar'));
assert(!indexSource.includes('renderTodayLabel'));
assert(indexSource.includes('role="status" aria-live="polite"'));
assert(indexSource.includes('@media (prefers-reduced-motion: reduce)'));
assert(indexSource.includes('async function refreshActiveRouteData(activeTab, options)'));
assert(indexSource.includes("if (tab === 'dashboard') return;"));
assert(indexSource.includes("ensureDataLoaded('reference', () => loadReferenceData({ quiet: true }))"));
assert(indexSource.includes('loadDashboardStats({\n            quiet: true,\n            cacheOnly: true,'));
assert(indexSource.includes('cacheOnly: config.cacheOnly === true'));
assert(!indexSource.includes('await (isInitialLoad ? loadInitialReviewLeads() : loadLeads())'));
assert(indexSource.includes('await loadReviewLeadMenu({ quiet: true, includeStats: false })'));
assert(indexSource.includes("request.includeStats = config.includeStats === true"));
assert(indexSource.includes("await loadLeads(0, {\n          filter: 'review',\n          mode: 'review'"));
assert((indexSource.match(/includeStats: false/g) || []).length >= 5);
assert(indexSource.includes('const LEAD_LIST_CLIENT_CACHE_TTL_MS = 120000'));
assert(indexSource.includes('const LEAD_LIST_SESSION_CACHE_TTL_MS = 600000'));
assert(indexSource.includes("const LEAD_LIST_SESSION_CACHE_PREFIX = 'lead-list-display-v267:'"));
assert(indexSource.includes('const leadListResponseCache = new Map()'));
assert(indexSource.includes('const leadListPrefetchSignatures = new Set()'));
assert(indexSource.includes('const requestSequence = ++leadListRequestSequence'));
assert(indexSource.includes('if (requestSequence !== leadListRequestSequence) return false;'));
assert(indexSource.includes("pending = apiQuiet('getLeadListStats', { genre })"));
assert(indexSource.includes('const persistentCacheKey = `stats:${cacheKey}`'));
assert(indexSource.includes('function applyLeadListStatsResult(result, genre, requestSequence)'));
assert(indexSource.includes('includeFields: leadListAdditionalFields()'));
assert(indexSource.includes('oninput="scheduleLeadSearchFilter()"'));
assert(indexSource.includes('LEAD_LIST_SEARCH_DEBOUNCE_MS = 400'));
assert(indexSource.includes('function readLeadListSessionCache(requestKey)'));
assert(indexSource.includes('function writeLeadListSessionCache(requestKey, value, cachedAt)'));
assert(indexSource.includes('function revalidateLeadListInBackground(request, requestKey, requestSequence, loadOptions)'));
assert(indexSource.includes('function scheduleLeadListPrefetch(request, result)'));
assert(indexSource.includes("await prefetchLeadListRequest(primaryRequests[0], { allowSessionSkip: false })"));
assert(indexSource.includes('window.requestIdleCallback'));
assert(indexSource.includes('clearLeadListSessionCache();'));
assert(indexSource.includes('保存済み表示を使用中・最新情報を確認中'));
assert(indexSource.includes('条件に合う一覧を読み込み中'));
assert(indexSource.includes('id="leadCacheStatus" class="lead-cache-status" role="status"'));
assert(indexSource.includes('<label>会社名（任意）<input id="leadCompany" autocomplete="organization"></label>'));
assert(!indexSource.includes('<input id="leadCompany" required'));
assert(indexSource.includes("document.getElementById('leadFacility').focus();"));
assert(indexSource.includes('function renderLeadRowsTable'));
assert(indexSource.includes('const columns = getVisibleLeadColumns()'));
assert(indexSource.includes("['操作', renderLeadActionCell(lead)]"));
assert(!indexSource.includes('id="leadWorkspaceDetail"'));
assert(!indexSource.includes('function renderLeadWorkspaceDetail'));
assert(indexSource.includes('id="leadBreakdownSummary"'));
assert(indexSource.includes('id="leadBreakdownDetails"'));
assert(indexSource.includes('id="leadBreakdownDetailGrid"'));
assert(indexSource.includes('id="leadHeaderTotal"'));
assert(indexSource.includes('class="lead-stage-filter lead-menu-stage-filter"'));
assert(indexSource.includes('class="lead-load-disclosure lead-utility-disclosure"'));
assert(indexSource.includes('id="leadListViewSettingsPanel" class="lead-view-settings-slot"'));
assert(indexSource.includes('id="storageHealthPanel" class="panel stack"'));
assert(indexSource.includes("ensureDataLoaded('storageHealth', () => loadStorageHealth({ quiet: true }))"));
assert(indexSource.includes('function renderStorageHealthPanel()'));
assert(indexSource.includes("request('listSourcePageSiteStatuses', { bypassCache: config.force === true })"));
assert(indexSource.includes("loadSourcePageSiteStatuses({ force: true })"));
assert(indexSource.includes("{ key: 'facility', label: '施設名', visible: true"));
assert(indexSource.includes('if (panel) panel.hidden = false;'));
const facilityCellSource = indexSource.slice(
  indexSource.indexOf('function renderFacilityCell'),
  indexSource.indexOf('function contactChannelCell')
);
assert(facilityCellSource.includes('normalizeName(lead.company_name) !== normalizeName(name)'));
assert(!facilityCellSource.includes('lead.address'));
assert(indexSource.includes("onclick=\"setLeadFilter('${escapeJsString(item.filter)}')\""));
assert(indexSource.includes('<option value="group_no_contact">連絡先なし</option>'));
assert(indexSource.includes('<option value="group_send_ng">送信NG</option>'));
assert(indexSource.includes("no_contact: (lead) => !lead.email && !lead.form_url && !normalizeBooleanLike(lead.send_ng) && String(lead.status || '') !== '送信NG'"));
assert(!indexSource.includes('function importCsv(event)'));
assert(indexSource.includes('finish();\n            reject(error);'));
assert(indexSource.includes("apiQuiet('listEmailSendCandidates', { genre, limit: 100 })"));
assert(indexSource.includes('async function editLead(id)'));
assert(indexSource.includes("lead = await api('getLead', id)"));
assert(indexSource.includes("includeFields: ['contact_name']"));
assert(indexSource.includes("includeFields: ['meeting_start_at', 'contact_name', 'google_meet_url', 'meeting_memo']"));
assert(webAppSource.includes("if (action === 'getLead') return getLead(data.id || data.leadId || data.lead_id || data);"));
assert(indexSource.includes("api('startLeadCsvImport', csvText, options || {})"));
assert(indexSource.includes("api('advanceLeadCsvImportJob', job.id, { maxItems: 25, runtimeBudgetMs: 90000 })"));
assert(indexSource.includes("callReviewApiWithLockRetry('updateReviewLeadDecision'"));
assert(indexSource.includes('function saveReviewLeadDecisionWithRetry'));
assert(indexSource.includes('const REVIEW_SAVE_LOCK_RETRY_DELAYS_MS = Object.freeze([1000, 2500, 5000])'));
assert(indexSource.includes('function callReviewApiWithLockRetry'));
assert(indexSource.includes('function saveReviewLeadDecisionsWithRetry'));
assert(indexSource.includes('function isLockTimeoutApiError'));
assert(indexSource.includes('function enqueueReviewLeadDecisionSave'));
assert(indexSource.includes('reviewLeadSaveQueue = task.then'));
assert(indexSource.includes('class="source-page-universal-form"'));
assert(indexSource.includes('新しい一覧ページURL'));
assert(indexSource.includes('保存済みURLを使う'));
assert(indexSource.includes('placeholder="例：${HTTPS_PROTOCOL_PREFIX}example.com/company-list"'));
assert(indexSource.includes('function sourcePageUrlIsValid'));
assert(indexSource.includes('function sourcePageInputState'));
assert(indexSource.includes('function sourcePageDefaultGenre'));
assert(indexSource.includes('const genericOption = `<option value=""'));
assert(indexSource.includes('>未分類</option>`'));
assert(!indexSource.includes('function syncSourcePageGenreWithUrl'));
assert(!indexSource.includes('なっぷ全国版を自動入力'));
assert(repositorySource.includes('maxItems: Math.floor(maxItems)'));
assert(repositorySource.includes('useSerperFallback: normalizeStrictSettingBoolean_'));
assert(serperSource.includes('const SOURCE_PAGE_FULL_CRAWL_MAX_CANDIDATES = 500'));
assert(serperSource.includes('payload.crawl_all === true ? SOURCE_PAGE_FULL_CRAWL_MAX_CANDIDATES : requestedLimit'));
assert(indexSource.includes('reviewPendingLeadIds'));
assert(indexSource.includes('pendingJobResultIds'));
assert(indexSource.includes("item.review_status === 'unconfirmed' || item.review_status === 'adding'"));
assert(indexSource.includes("adding: '追加処理中'"));
assert(indexSource.includes('function isJobResultReviewActionable'));
assert(indexSource.includes('別処理で更新済みのため上書きしませんでした'));
assert(indexSource.includes('Promise.allSettled(['));
assert(indexSource.includes("window.addEventListener('unhandledrejection'"));
assert(indexSource.includes('const API_CALL_TIMEOUT_MS = 120000'));
assert(indexSource.includes('const LONG_API_CALL_TIMEOUT_MS = 330000'));
assert(indexSource.includes("error.code = 'API_RESPONSE_TIMEOUT'"));
assert(indexSource.includes('if (timeoutId) window.clearTimeout(timeoutId)'));
assert(indexSource.includes('結果が反映済みの可能性があるため、再実行前に画面を更新してください'));
assert(indexSource.includes('if (state.analyticsData) return state.analyticsData;'));
['updateLeadFoundLocked_', 'deleteLead', 'markLeadFormSent', 'unmarkLeadFormSent'].forEach((functionName) => {
  const start = codeSource.indexOf(`function ${functionName}`);
  const next = codeSource.indexOf('\nfunction ', start + 10);
  const body = codeSource.slice(start, next === -1 ? codeSource.length : next);
  assert(body.includes("clearRuntimeCaches_('leads')"), `${functionName} must invalidate dashboard cache`);
});
const updateAfterSendStart = emailSource.indexOf('function updateLeadAfterSend_');
const updateAfterSendEnd = emailSource.indexOf('\nfunction ', updateAfterSendStart + 10);
assert(emailSource.slice(updateAfterSendStart, updateAfterSendEnd).includes("clearRuntimeCaches_('leads')"));

const backgroundRecoveryContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), backgroundRecoveryContext, { filename: file });
});
backgroundRecoveryContext.nowIso_ = () => '2026-07-15T12:00:00.000Z';
const stalledSourcePageJob = {
  id: 'stalled-source-page',
  job_type: 'source_page',
  status: 'running',
  query_json: JSON.stringify({ job_type: 'source_page' }),
  cursor_json: JSON.stringify({ itemIndex: 0, offset: 124, staleRecoveryCount: 2 }),
  error_count: 0,
  locked_at: '2026-07-15T10:00:00.000Z',
  last_heartbeat_at: '2026-07-15T10:00:00.000Z',
};
assert.strictEqual(backgroundRecoveryContext.isStaleSearchJob_(stalledSourcePageJob, Date.parse('2026-07-15T12:00:00.000Z')), true);
const poisonCandidateRecovery = backgroundRecoveryContext.buildStaleSearchJobRecoveryPatch_(stalledSourcePageJob);
const recoveredCursor = JSON.parse(poisonCandidateRecovery.patch.cursor_json);
assert.strictEqual(poisonCandidateRecovery.skippedCandidate, true);
assert.strictEqual(recoveredCursor.offset, 125);
assert.strictEqual(recoveredCursor.staleRecoveryCount, 0);
assert.strictEqual(poisonCandidateRecovery.patch.error_count, undefined);
assert.match(poisonCandidateRecovery.patch.last_error, /3回連続/);
const firstRecovery = backgroundRecoveryContext.buildStaleSearchJobRecoveryPatch_(Object.assign({}, stalledSourcePageJob, {
  cursor_json: JSON.stringify({ itemIndex: 0, offset: 124 }),
}));
assert.strictEqual(JSON.parse(firstRecovery.patch.cursor_json).offset, 124);
assert.strictEqual(JSON.parse(firstRecovery.patch.cursor_json).staleRecoveryCount, 1);
assert(operationsSource.includes('function repairBackgroundJobs'));
assert(operationsSource.includes('function getBackgroundWorkerHealth'));
assert(operationsSource.includes('function recoverStaleSearchJobs_'));
assert(operationsSource.includes('function claimBackgroundWorkerRun_'));
assert(operationsSource.includes('function releaseBackgroundWorkerRun_'));
assert(operationsSource.includes("recordBackgroundWorkerStatus_('failed'"));
assert(serperSource.includes("payload.job_type === 'source_page' ? String(progressRecord.cursor_json || job.cursor_json || '') : ''"));
assert(indexSource.includes('自動復旧して再開'));
assert(indexSource.includes("api('repairBackgroundJobs'"));
assert(serperSource.includes('function listSourcePageSiteStatuses'));
assert(indexSource.includes("request('listSourcePageSiteStatuses'"));
assert(indexSource.includes('全件調査完了'));
assert(codeSource.includes("'progress_json'"));
assert(webAppSource.includes("if (action === 'startSearchJob') return startSearchJob(data);"));
assert(serperSource.includes('function startSearchJob(input)'));
assert(indexSource.includes("await api('startSearchJob', payload)"));
assert(indexSource.includes('収集対象サイトの進捗'));
assert(indexSource.includes('収集中は約8秒ごとに自動更新します。'));
assert(indexSource.includes('scheduleSourcePageProgressRefresh'));
assert(indexSource.includes('advanceQueuedSourcePageJobIfNeeded'));
assert(indexSource.includes("apiQuiet('advanceSearchJob', targetJob.id"));
assert(indexSource.includes("apiQuiet('repairBackgroundJobs', { jobId: targetJob.id"));
assert(indexSource.includes('progress_json'));
assert(indexSource.includes('runtimeBudgetMs: 180000'));
assert(operationsSource.includes('function advanceQueuedJobsNow'));
assert(operationsSource.includes('runtimeBudgetMs: BACKGROUND_JOB_DEFAULT_RUNTIME_MS'));
assert(operationsSource.includes('timeBased().after(normalizedDelayMs).create()'));
assert(operationsSource.includes("reason: stoppedForRuntime ? 'runtime_exhausted' : remainingJobs > 0 ? 'jobs_pending' : 'runtime_reserved'"));
assert(serperSource.includes('summary.pausedForRetry ? BACKGROUND_JOB_RETRY_DELAY_MS : BACKGROUND_JOB_IMMEDIATE_DELAY_MS'));
assert(serperSource.includes("}, false, { bestEffort: true });"));
assert(repositorySource.includes('if (input.clearCaches !== false) clearRuntimeCaches_(sheetName);'));
assert(serperSource.includes('function buildSourcePageStatusSites_'));
assert(serperSource.includes('function normalizeSourcePageDisplayLabel_'));
assert(indexSource.includes('function syncSourcePageLabelWithUrl(sourceUrl)'));
assert(indexSource.includes("const label = resolveSourcePageLabel(document.getElementById('sourcePageLabel').value, urls[0]);"));
assert(indexSource.includes("const DEFAULT_GMAIL_SENDER_NAME = '【Ad Clutch】村松 侑哉'"));

const sourcePageStatusContext = vm.createContext({ console });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sourcePageStatusContext, { filename: file });
});
sourcePageStatusContext.nowIso_ = () => '2026-07-17T00:00:00.000Z';
sourcePageStatusContext.getSettingValue_ = () => ({
  sites: [
    { id: 'nap', label: 'なっぷ', url: 'https://www.nap-camp.com/', genre: 'キャンプ', crawlAll: true },
    { id: 'running', label: '調査中サイト', url: 'https://example.com/list/', genre: 'キャンプ', crawlAll: true },
    { id: 'failed', label: '失敗サイト', url: 'https://failed.example/list/', genre: 'キャンプ', crawlAll: false },
    { id: 'not-started', label: '未実行サイト', url: 'https://not-started.example/list/', genre: 'キャンプ', crawlAll: false },
  ],
});
const sourcePageStatusJobs = [
  {
    id: 'completed-job',
    job_type: 'source_page',
    status: 'completed',
    query_json: JSON.stringify({
      source_url: 'https://www.nap-camp.com/',
      crawl_all: true,
      total_candidates: 5872,
      items: [{ source_url: 'https://www.nap-camp.com/', crawl_all: true, total_candidates: 5872 }],
    }),
    total_count: 1,
    processed_count: 1,
    finished_at: '2026-07-16T07:10:13+09:00',
    updated_at: '2026-07-16T07:10:15+09:00',
  },
  {
    id: 'older-completed-job',
    job_type: 'source_page',
    status: 'completed',
    query_json: JSON.stringify({
      source_url: 'https://example.com/list',
      crawl_all: true,
      total_candidates: 1000,
    }),
    total_count: 1,
    processed_count: 1,
    finished_at: '2026-07-16T00:00:00+09:00',
    updated_at: '2026-07-16T00:00:00+09:00',
  },
  {
    id: 'running-job',
    job_type: 'source_page',
    status: 'running',
    query_json: JSON.stringify({
      source_url: 'https://example.com/list',
      crawl_all: true,
      total_candidates: 1000,
      items: [{ source_url: 'https://example.com/list', crawl_all: true, total_candidates: 1000 }],
    }),
    cursor_json: JSON.stringify({ offset: 124 }),
    progress_json: JSON.stringify({
      itemIndex: 0,
      sourceUrl: 'https://example.com/list',
      processedTargets: 124,
      totalTargets: 1000,
      currentTargetName: '確認中キャンプ場',
      currentTargetUrl: 'https://camp.example/current',
      phase: 'processing',
      counts: { added: 80, duplicate: 20, excluded: 15, unresolved: 8, error: 1 },
      recentTargets: [
        { name: '直近キャンプ場', url: 'https://camp.example/recent', outcome: 'added', processedAt: '2026-07-17T00:00:00+09:00' },
      ],
      updatedAt: '2026-07-17T00:00:00+09:00',
    }),
    total_count: 1,
    processed_count: 0,
    updated_at: '2026-07-17T00:00:00+09:00',
  },
  {
    id: 'failed-job',
    job_type: 'source_page',
    status: 'failed',
    query_json: JSON.stringify({ source_url: 'https://failed.example/list' }),
    error_count: 1,
    last_error: '取得に失敗しました',
    updated_at: '2026-07-17T00:01:00+09:00',
  },
  {
    id: 'historical-job',
    job_type: 'source_page',
    status: 'completed',
    query_json: JSON.stringify({
      source_url: 'https://history.example/list',
      label: '過去の収集サイト',
      crawl_all: true,
      total_candidates: 20,
      items: [{
        source_url: 'https://history.example/list',
        label: '過去の収集サイト',
        crawl_all: true,
        total_candidates: 20,
      }],
    }),
    total_count: 1,
    processed_count: 1,
    finished_at: '2026-07-15T00:00:00+09:00',
    updated_at: '2026-07-15T00:00:00+09:00',
  },
];
let sourcePageStatusReads = 0;
let sourcePageStatusRequestedFields = [];
const sourcePageStatusCache = {};
sourcePageStatusContext.CacheService = {
  getScriptCache: () => ({
    get: (key) => sourcePageStatusCache[key] || null,
    put: (key, value) => { sourcePageStatusCache[key] = value; },
    remove: (key) => { delete sourcePageStatusCache[key]; },
  }),
};
sourcePageStatusContext.readSheetRecordFields_ = (_sheetName, fields) => {
  sourcePageStatusReads += 1;
  sourcePageStatusRequestedFields = fields.slice();
  return sourcePageStatusJobs;
};
const sourcePageStatuses = JSON.parse(JSON.stringify(sourcePageStatusContext.listSourcePageSiteStatuses()));
assert.strictEqual(sourcePageStatuses.total, 5);
assert.strictEqual(sourcePageStatuses.savedTotal, 4);
assert.strictEqual(sourcePageStatuses.completed, 2);
assert.strictEqual(sourcePageStatuses.running, 1);
assert.strictEqual(sourcePageStatuses.attention, 1);
assert.strictEqual(sourcePageStatuses.notStarted, 1);
assert.strictEqual(sourcePageStatuses.items[0].statusLabel, '全件調査完了');
assert.strictEqual(sourcePageStatuses.items[0].processed, 5872);
assert.strictEqual(sourcePageStatuses.items[0].total, 5872);
assert.strictEqual(sourcePageStatuses.items[0].percent, 100);
assert.strictEqual(sourcePageStatuses.items[1].statusLabel, '再調査中');
assert.strictEqual(sourcePageStatuses.items[1].processed, 124);
assert.strictEqual(sourcePageStatuses.items[1].percent, 12);
assert.strictEqual(sourcePageStatuses.items[2].statusLabel, '調査失敗');
assert.strictEqual(sourcePageStatuses.items[2].lastError, '取得に失敗しました');
assert.strictEqual(sourcePageStatuses.items[3].statusLabel, '未実行');
const historicalSourcePageStatus = sourcePageStatuses.items.find((item) => item.url === 'https://history.example/list');
assert(historicalSourcePageStatus, 'historical source-page URLs must remain visible even when they are no longer in saved settings');
assert.strictEqual(historicalSourcePageStatus.label, '過去の収集サイト');
assert.strictEqual(historicalSourcePageStatus.statusLabel, '全件調査完了');
assert.strictEqual(historicalSourcePageStatus.processed, 20);
assert.strictEqual(historicalSourcePageStatus.total, 20);
assert.strictEqual(historicalSourcePageStatus.percent, 100);
const emptySourcePageSiteStatus = sourcePageStatusContext.buildSourcePageSiteStatus_({
  id: 'empty-source',
  label: '候補なしサイト',
  url: 'https://empty-source.example/',
  crawlAll: true,
}, [{
  job: {
    id: 'empty-source-job',
    job_type: 'source_page',
    status: 'completed',
    total_count: 1,
    processed_count: 1,
    updated_at: '2026-07-17T00:02:00+09:00',
  },
  payload: {
    job_type: 'source_page',
    source_url: 'https://empty-source.example/',
    crawl_all: true,
    total_candidates: 0,
    items: [{ source_url: 'https://empty-source.example/' }],
  },
}]);
assert.strictEqual(emptySourcePageSiteStatus.statusKey, 'no_candidates');
assert.strictEqual(emptySourcePageSiteStatus.statusLabel, '候補未検出');
assert.strictEqual(emptySourcePageSiteStatus.completed, false);
assert.strictEqual(emptySourcePageSiteStatus.processed, 0);
assert.strictEqual(emptySourcePageSiteStatus.total, 0);
assert.strictEqual(emptySourcePageSiteStatus.percent, 0);
assert.strictEqual(sourcePageStatuses.jobs[0].id, 'running-job');
assert.strictEqual(sourcePageStatuses.jobs[0].processedTargets, 124);
assert.strictEqual(sourcePageStatuses.jobs[0].totalTargets, 1000);
assert.strictEqual(sourcePageStatuses.jobs[0].currentTargetName, '確認中キャンプ場');
assert.strictEqual(sourcePageStatuses.jobs[0].counts.added, 80);
assert.strictEqual(sourcePageStatuses.jobs[0].recentTargets[0].outcomeLabel, '追加');
assert.strictEqual(sourcePageStatusReads, 1);
assert(sourcePageStatusRequestedFields.includes('query_json'));
assert(sourcePageStatusRequestedFields.includes('progress_json'));
assert(!sourcePageStatusRequestedFields.includes('request_key'));
assert(!sourcePageStatusRequestedFields.includes('lock_token'));
const cachedSourcePageStatuses = sourcePageStatusContext.listSourcePageSiteStatuses();
assert.strictEqual(cachedSourcePageStatuses.cached, true);
assert.strictEqual(sourcePageStatusReads, 1, 'repeated source-page status checks must use the five-minute cache');
sourcePageStatusContext.listSourcePageSiteStatuses({ bypassCache: true });
assert.strictEqual(sourcePageStatusReads, 2, 'manual refresh must bypass the source-page status cache');

let progressSnapshot = {};
sourcePageStatusContext.updateClaimedSearchJob_ = (_jobId, _lockToken, patch) => {
  progressSnapshot = JSON.parse(patch.progress_json);
  return { owned: true, record: { progress_json: patch.progress_json } };
};
const reportTargetProgress = sourcePageStatusContext.createSourcePageProgressReporter_(
  'job-progress',
  'lock-progress',
  0,
  { source_url: 'https://directory.example/list' },
  { source_url: 'https://directory.example/list' },
  {},
  () => {}
);
assert.strictEqual(reportTargetProgress({
  phase: 'processing',
  processedTargets: 2,
  totalTargets: 10,
  targetName: '株式会社進捗',
  targetUrl: 'https://progress.example/',
}), true);
assert.strictEqual(reportTargetProgress({
  phase: 'processed',
  processedTargets: 3,
  totalTargets: 10,
  targetName: '株式会社進捗',
  targetUrl: 'https://progress.example/',
  outcome: 'added',
}), true);
assert.strictEqual(progressSnapshot.processedTargets, 3);
assert.strictEqual(progressSnapshot.totalTargets, 10);
assert.strictEqual(progressSnapshot.counts.added, 1);
assert.strictEqual(progressSnapshot.recentTargets[0].name, '株式会社進捗');

const resolvedSettingIssue = context.classifySyncLogIssue_({
  level: 'error',
  message: 'Unsupported setting key: gmail_sender_name',
  created_at: '2026-07-16T15:31:00.000Z',
}, { gmailSenderConfigured: true });
assert.strictEqual(resolvedSettingIssue.issue_status, 'resolved');
const resolvedBootstrapIssue = context.classifySyncLogIssue_({
  level: 'error',
  message: 'Unknown action: getAppBootstrap',
  created_at: '2026-07-16T15:07:00.000Z',
}, {});
assert.strictEqual(resolvedBootstrapIssue.issue_status, 'resolved');
const resolvedDashboardIssue = context.classifySyncLogIssue_({
  level: 'error',
  message: 'Unknown action: getDashboardData',
  created_at: '2026-07-18T13:27:00.000Z',
}, {});
assert.strictEqual(resolvedDashboardIssue.issue_status, 'resolved');
const resolvedGmailIssue = context.classifySyncLogIssue_({
  level: 'error',
  message: '指定したアドレスはGmailの送信元に登録されていません。',
  created_at: '2026-07-18T13:29:00.000Z',
}, { gmailSenderConfigured: true });
assert.strictEqual(resolvedGmailIssue.issue_status, 'resolved');
const currentUnknownIssue = context.classifySyncLogIssue_({
  level: 'error',
  message: 'Unknown action: newUnsupportedAction',
  created_at: '2026-07-20T04:00:00.000Z',
}, { gmailSenderConfigured: true });
assert.strictEqual(currentUnknownIssue.issue_status, 'open');
const resolvedLockIssue = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'updateLead',
  message: 'ロックのタイムアウト: 別のプロセスがロックを保持している時間が長すぎました。',
  created_at: '2026-07-15T14:20:00.000Z',
}, {});
assert.strictEqual(resolvedLockIssue.issue_status, 'resolved');
const currentLockIssue = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'updateLead',
  message: 'ロックのタイムアウト: 別の処理が実行中です。',
  created_at: '2026-07-20T04:00:00.000Z',
}, {});
assert.strictEqual(currentLockIssue.issue_status, 'open');
const resolvedSheetsOutage = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'createLead',
  message: 'ドキュメントにアクセス中に スプレッドシート のサービスに接続できなくなりました。',
  created_at: '2026-07-15T13:38:10+09:00',
}, {});
assert.strictEqual(resolvedSheetsOutage.issue_status, 'resolved');
const currentSheetsOutage = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'createLead',
  message: 'ドキュメントにアクセス中に スプレッドシート のサービスに接続できなくなりました。',
  created_at: '2026-07-22T04:00:00+09:00',
}, {});
assert.strictEqual(currentSheetsOutage.issue_status, 'open');
const gasUsageAtHighCodeVersion = context.buildConsumerGasUsageStatus_({
  mailQuotaRemaining: 100,
  sentToday: 0,
  triggerCount: 1,
  urlFetchRecordedToday: 0,
  batchRuntimeBudgetMs: 240000,
});
assert.strictEqual(gasUsageAtHighCodeVersion.versions.current, 328);
assert.strictEqual(gasUsageAtHighCodeVersion.versions.quotaComparable, false);
assert(!gasUsageAtHighCodeVersion.alerts.some((item) => item.key === 'versions'), 'the release label must not be treated as the number of stored Apps Script versions');
assert(!indexSource.includes("label: 'Apps Scriptバージョン', note: 'コード版から判定'"), 'the current release must not render as a quota meter');
const normalizedCachedGasUsage = context.normalizeDashboardGasUsage_({
  gasUsage: {
    alerts: [
      { key: 'versions', tone: 'bad' },
      { key: 'email', tone: 'warn' },
    ],
    versions: { used: 282, limit: 200 },
    status: 'danger',
  },
});
assert.strictEqual(normalizedCachedGasUsage.gasUsage.versions.current, 328);
assert.strictEqual(normalizedCachedGasUsage.gasUsage.versions.quotaComparable, false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(normalizedCachedGasUsage.gasUsage.alerts)), [{ key: 'email', tone: 'warn' }]);
assert.strictEqual(normalizedCachedGasUsage.gasUsage.status, 'warning');
const gasUsageWithUnsafeRuntime = context.buildConsumerGasUsageStatus_({
  mailQuotaRemaining: 100,
  sentToday: 0,
  triggerCount: 1,
  urlFetchRecordedToday: 0,
  batchRuntimeBudgetMs: 360000,
});
assert.strictEqual(gasUsageWithUnsafeRuntime.runtime.budgetSeconds, 240, 'runtime budget must leave recovery time before the Apps Script execution ceiling');
assert(gasUsageWithUnsafeRuntime.alerts.some((item) => item.key === 'runtime'), 'an unsafe configured runtime must remain visible after the effective value is clamped');
const resolvedAuditProbe = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'doPost',
  message: 'Unknown sheet definition: undefined',
  created_at: '2026-07-22T03:08:30+09:00',
}, {});
assert.strictEqual(resolvedAuditProbe.issue_status, 'resolved');
const futureUnknownSheetIssue = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'doPost',
  message: 'Unknown sheet definition: undefined',
  created_at: '2026-07-22T04:00:00+09:00',
}, {});
assert.strictEqual(futureUnknownSheetIssue.issue_status, 'open');
const reviewLockIssueBeforeV323 = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'updateReviewLeadDecision',
  message: 'ロックのタイムアウト: 別の処理が実行中です。',
  created_at: '2026-08-02T16:57:36+09:00',
}, {});
assert.strictEqual(reviewLockIssueBeforeV323.issue_status, 'resolved');
const reviewLockIssueAfterV323 = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'updateReviewLeadDecision',
  message: 'ロックのタイムアウト: 別の処理が実行中です。',
  created_at: '2026-08-02T21:40:00+09:00',
}, {});
assert.strictEqual(reviewLockIssueAfterV323.issue_status, 'open', 'new lock failures after v323 must remain visible');
const resolvedV322AuditProbe = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'doPost',
  message: 'No valid fields requested for undefined.',
  created_at: '2026-08-02T21:13:02+09:00',
}, {});
assert.strictEqual(resolvedV322AuditProbe.issue_status, 'resolved');
const resolvedBackgroundWorkerLock = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'claimBackgroundWorkerRun',
  message: 'ロックのタイムアウト: 別の処理が実行中です。',
  created_at: '2026-08-02T16:57:27+09:00',
}, {});
assert.strictEqual(resolvedBackgroundWorkerLock.issue_status, 'resolved');
const futureBackgroundWorkerLock = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'claimBackgroundWorkerRun',
  message: 'ロックのタイムアウト: 別の処理が実行中です。',
  created_at: '2026-08-02T21:30:00+09:00',
}, {});
assert.strictEqual(futureBackgroundWorkerLock.issue_status, 'open');
const resolvedTourismAction = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'doPost',
  message: 'Unknown action: repairTourismPortalReviewLeads',
  created_at: '2026-07-29T23:06:30+09:00',
}, {});
assert.strictEqual(resolvedTourismAction.issue_status, 'resolved');
const resolvedSourcePageExtraction = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'advanceSearchJob',
  message: '一覧ページから施設候補を抽出できませんでした。施設一覧ページのURLまたはサイト構造を確認してください。',
  created_at: '2026-07-26T20:01:32+09:00',
}, {});
assert.strictEqual(resolvedSourcePageExtraction.issue_status, 'resolved');
const futureSourcePageExtraction = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'advanceSearchJob',
  message: '一覧ページから施設候補を抽出できませんでした。施設一覧ページのURLまたはサイト構造を確認してください。',
  created_at: '2026-08-03T20:01:32+09:00',
}, {});
assert.strictEqual(futureSourcePageExtraction.issue_status, 'open');
const resolvedScheduledEmailTimeout = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'claimScheduledEmailJob',
  message: 'ドキュメントにアクセス中に スプレッドシート のサービスがタイムアウトしました。',
  created_at: '2026-07-22T07:14:25+09:00',
}, {});
assert.strictEqual(resolvedScheduledEmailTimeout.issue_status, 'resolved');
const futureScheduledEmailTimeout = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'claimScheduledEmailJob',
  message: 'ドキュメントにアクセス中に スプレッドシート のサービスがタイムアウトしました。',
  created_at: '2026-08-03T07:14:25+09:00',
}, {});
assert.strictEqual(futureScheduledEmailTimeout.issue_status, 'open');
const resolvedSettingValidation = context.classifySyncLogIssue_({
  level: 'error',
  operation: 'setSettingValue',
  message: 'email_send_window start must be earlier than end.',
  created_at: '2026-07-12T16:55:45+09:00',
}, {});
assert.strictEqual(resolvedSettingValidation.issue_status, 'resolved');
assert(webAppSource.includes("if (action === 'getAppBootstrap') return getInitialData();"));
assert(webAppSource.includes("if (action === 'getDashboardData') return getDashboardStats(data);"));
assert(webAppSource.includes("if (!isExpectedOperationError_(error))"));
assert(indexSource.includes('解消済みの履歴'));
assert(indexSource.includes("logs.filter((log) => appDateKey(log.created_at) === today)"));
const reviewInboxActionsStart = indexSource.indexOf('<div class="review-inbox-actions"');
const reviewInboxActionsEnd = indexSource.indexOf('</div>', reviewInboxActionsStart);
assert(reviewInboxActionsStart >= 0 && reviewInboxActionsEnd > reviewInboxActionsStart);
const reviewInboxActionsSource = indexSource.slice(reviewInboxActionsStart, reviewInboxActionsEnd);
assert.strictEqual((reviewInboxActionsSource.match(/<button /g) || []).length, 5);
assert(reviewInboxActionsSource.includes("reviewInboxUpdate('対応中')"));
assert(reviewInboxActionsSource.includes('startReviewInboxEdit('));
assert(reviewInboxActionsSource.includes("reviewInboxUpdate('送信NG')"));
assert(reviewInboxActionsSource.includes('setReviewTriageOverrideClient('));
assert(reviewInboxActionsSource.includes('openDomainHistory('));
assert(!reviewInboxActionsSource.includes('deferReviewInboxLead()'));
assert(!reviewInboxActionsSource.includes("reviewInboxUpdate('対応不要')"));
assert(reviewInboxActionsSource.includes('aria-label="施設名・メール・ジャンルを編集"'));
assert(reviewInboxActionsSource.includes('情報を編集'));
const reviewInboxHeaderStart = indexSource.indexOf('<header class="review-inbox-detail-header">');
const reviewInboxHeaderEnd = indexSource.indexOf('</header>', reviewInboxHeaderStart);
assert(reviewInboxHeaderStart >= 0 && reviewInboxHeaderEnd > reviewInboxHeaderStart);
assert(reviewInboxActionsStart > reviewInboxHeaderEnd, 'review actions must be directly below the facility header');
assert(reviewInboxActionsStart < indexSource.indexOf('<div class="review-inbox-detail-grid">', reviewInboxActionsStart), 'review actions must appear before lead details');
const reviewInboxHeaderSource = indexSource.slice(reviewInboxHeaderStart, reviewInboxHeaderEnd);
assert(reviewInboxHeaderSource.includes('${headerWebsite}'));
assert(!reviewInboxHeaderSource.includes("selected.company_name || ''"), 'the review detail header must not repeat the company or facility name');
assert(indexSource.includes('class="review-inbox-detail-url"'));
assert(indexSource.includes("'<p class=\"muted\">URL未取得</p>'"));
assert(indexSource.includes('class="review-inbox-detail-meta"'));
assert(indexSource.includes('class="review-intelligence-disclosure"'));
assert(indexSource.includes("content: '詳細を表示'"));
assert(indexSource.includes('position: sticky;'));
assert(indexSource.includes('id="reviewBulkActionBar"'));
assert(indexSource.includes('selectedReviewLeadIds: []'));
assert(indexSource.includes('function toggleReviewLeadSelection(id, checked)'));
assert(indexSource.includes('function toggleAllReviewLeadSelection(checked)'));
assert(indexSource.includes("function bulkUpdateSelectedReviewLeads(status)"));
assert(indexSource.includes("callReviewApiWithLockRetry('updateReviewLeadDecisions'"));
assert(codeSource.includes('function enqueuePendingReviewDecision_'));
assert(codeSource.includes('function overlayPendingReviewDecisionsOnLeads_'));
assert(operationsSource.includes('function processPendingReviewLeadDecisionsNow'));
assert(operationsSource.includes("source: source + ':background_safety_net'"));
assert(indexSource.includes('画面を閉じても自動的に反映します'));
assert(codeSource.includes('function writeLeadRecordsToRowsGroupedLocked_'));
assert(indexSource.includes('class="review-lead-select-input"'));
assert(indexSource.includes('除外対象にする'));
const reviewStatusUpdateStart = indexSource.indexOf('function updateReviewLeadStatus(id, status, options)');
const reviewStatusUpdateEnd = indexSource.indexOf('\n      function ', reviewStatusUpdateStart + 10);
const reviewStatusUpdateSource = indexSource.slice(reviewStatusUpdateStart, reviewStatusUpdateEnd);
assert(reviewStatusUpdateSource.includes('const configuredLead = config.lead && config.lead.id === id ? config.lead : null;'));
assert(reviewStatusUpdateSource.includes('const reviewLead = (state.reviewLeads || []).find'));
assert(reviewStatusUpdateSource.includes("expected_status: '未対応'"));
assert(!reviewStatusUpdateSource.includes('expected_status: mutation.previousStatus'));
assert(indexSource.includes('{ skipConfirm: true, allowUndo: true, lead: selected }'));

const highPriorityReview = context.decorateReviewLeadForList_({
  id: 'priority-high',
  source: 'source_page',
  genre: 'キャンプ',
  website_url: 'https://operator.example/camp',
  email: 'info@operator.example',
  form_url: 'https://operator.example/contact',
  address: '東京都',
});
const lowPriorityReview = context.decorateReviewLeadForList_({
  id: 'priority-low',
  source: 'source_page',
  website_url: '',
  email: '',
  form_url: '',
});
assert.strictEqual(highPriorityReview.review_priority_tier, 'high');
assert.strictEqual(lowPriorityReview.review_priority_tier, 'low');
assert(highPriorityReview.review_priority_score > lowPriorityReview.review_priority_score);
const reviewRelations = JSON.parse(JSON.stringify(context.reviewLeadRelatedCandidates_({
  id: 'current',
  facility_name: '山のキャンプ場',
  website_url: 'https://camp.operator.example/current',
  email: 'info@operator.example',
}, [
  { id: 'exact-email', facility_name: '別施設', website_url: 'https://other.example', email: 'info@operator.example', status: '対応中' },
  { id: 'same-root', facility_name: '海のキャンプ場', website_url: 'https://villa.operator.example', status: '未対応' },
], 8)));
assert.strictEqual(reviewRelations[0].id, 'exact-email');
assert.strictEqual(reviewRelations[0].confidence, 'high');
assert(reviewRelations.some((item) => item.id === 'same-root' && item.confidence === 'caution'));
const reviewListOptions = context.normalizeListOptions_({
  filter: 'review',
  sort: 'review_priority_desc',
  reviewPriority: 'high',
  reviewContact: 'email',
});
assert.strictEqual(reviewListOptions.sort, 'review_priority_desc');
assert.strictEqual(reviewListOptions.reviewPriority, 'high');
assert.strictEqual(reviewListOptions.reviewContact, 'email');
assert(vm.runInContext('SHEET_DEFINITIONS.review_activity_logs.includes("reversible_until")', context));
assert(codeSource.includes('function getReviewLeadWorkspace(leadId, options)'));
assert(codeSource.includes('function undoReviewActivity(activityId)'));
assert(codeSource.includes('function appendReviewActivityRecordsBestEffortLocked_'));
assert(webAppSource.includes("if (action === 'getReviewLeadWorkspace')"));
assert(webAppSource.includes("if (action === 'listReviewActivities')"));
assert(webAppSource.includes("if (action === 'undoReviewActivity')"));
assert(indexSource.includes('id="reviewConvenienceToolbar"'));
assert(indexSource.includes('function renderReviewIntelligencePanel(lead)'));
assert(indexSource.includes('id="reviewActivityPanel"'));
assert(indexSource.includes('function undoReviewActivityFromPanel(activityId)'));
assert(indexSource.includes('id="backgroundJobControlBar"'));
assert(indexSource.includes('function backgroundJobActionMarkup(job)'));
assert(indexSource.includes("onclick=\"loadJobs()\">最新状態を取得"));
assert(operationsSource.includes("['failed', 'cancelled'].indexOf(String(job.status || '')) !== -1"));

const triageMaster = { reviewDuplicateLeadIds: { 'duplicate-review': 'existing-lead' } };
const readyTriageLead = analyticsContext.decorateReviewLeadForList_({
  id: 'ready-review', source: 'source_page', status: '未対応', genre: 'キャンプ',
  website_url: 'https://operator-ready.example/', email: 'info@operator-ready.example',
  form_url: 'https://operator-ready.example/contact', address: '東京都', source_payload_json: '{}',
}, triageMaster);
const manualTriageLead = analyticsContext.decorateReviewLeadForList_({
  id: 'manual-review', source: 'source_page', status: '未対応', website_url: 'https://operator-manual.example/',
  source_payload_json: '{}',
}, triageMaster);
const duplicateTriageLead = analyticsContext.decorateReviewLeadForList_({
  id: 'duplicate-review', source: 'source_page', status: '未対応', website_url: 'https://operator-duplicate.example/',
  source_payload_json: '{}',
}, triageMaster);
const restoredTriageLead = analyticsContext.decorateReviewLeadForList_({
  id: 'duplicate-review', source: 'source_page', status: '未対応', website_url: 'https://operator-duplicate.example/',
  source_payload_json: JSON.stringify({ review_triage_override: 'review' }),
}, triageMaster);
assert.strictEqual(readyTriageLead.review_triage_bucket, 'ready');
assert.strictEqual(manualTriageLead.review_triage_bucket, 'manual');
assert.strictEqual(duplicateTriageLead.review_triage_bucket, 'excluded');
assert(duplicateTriageLead.review_triage_reasons.some((reason) => reason.key === 'duplicate'));
assert.strictEqual(restoredTriageLead.review_triage_bucket, 'manual');
assert.strictEqual(restoredTriageLead.review_triage_overridden, true);
assert.strictEqual(analyticsContext.matchesReviewLeadTriageFilter_(duplicateTriageLead, { reviewBucket: 'all' }, triageMaster), false);
assert.strictEqual(analyticsContext.matchesReviewLeadTriageFilter_(duplicateTriageLead, { reviewBucket: 'excluded' }, triageMaster), true);
assert.strictEqual(analyticsContext.normalizeListOptions_({ filter: 'review', reviewBucket: 'excluded' }).reviewBucket, 'excluded');
assert.throws(() => analyticsContext.normalizeListOptions_({ filter: 'review', reviewBucket: 'unknown' }), /Invalid review bucket filter/);
assert.deepStrictEqual(JSON.parse(JSON.stringify(analyticsContext.collectionSourceUrlsFromJob_({
  query_json: JSON.stringify({ source_url: 'https://one.example/list', items: [{ source_url: 'https://two.example/list' }] }),
}))), ['https://one.example/list', 'https://two.example/list']);
assert.strictEqual(analyticsContext.collectionSourceResultOutcome_({ lead_id: 'existing', result_type: 'source_page_duplicate' }), 'duplicate');
assert.strictEqual(analyticsContext.collectionSourceResultOutcome_({ lead_id: 'new', result_type: 'source_page_direct' }), 'added');
assert.strictEqual(analyticsContext.leadMatchesDomainRoot_({ website_url: 'https://sub.example.co.jp/path' }, 'example.co.jp'), true);
assert(webAppSource.includes("if (action === 'getCollectionSourcePerformance')"));
assert(webAppSource.includes("if (action === 'getDomainHistory')"));
assert(webAppSource.includes("if (action === 'setReviewTriageOverride')"));
assert(indexSource.includes('id="reviewTriagePanel"'));
assert(indexSource.includes('id="reviewBulkPreviewHost"'));
assert(indexSource.includes('id="domainHistoryHost"'));
assert(indexSource.includes('id="collectionSourcePerformancePanel"'));
assert(indexSource.includes('function openDailyWorkItem(type, id, tab)'));
assert(indexSource.includes('function renderReviewBulkPreviewDialog()'));
assert(indexSource.includes('function renderCollectionSourcePerformance()'));
assert(indexSource.includes('function openDomainHistory(value)'));

console.log('v328 compact-review-controls regression tests passed.');
