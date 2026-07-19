const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.env.APP_ROOT || path.resolve(__dirname, '..');
const files = ['Code.gs', 'Email.gs', 'Masters.gs', 'Operations.gs', 'Repository.gs', 'Serper.gs', 'WebApp.gs'];
const context = vm.createContext({ console });
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
assert(lockCalls.every((item) => item.options.waitMs === 90000));
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
unlockedMailContext.getOrCreateSpreadsheet_ = () => ({});
unlockedMailContext.ensureSheet_ = () => ({});
unlockedMailContext.readSheetRecords_ = () => [
  { lead_id: 'sent', to_email: 'sent@example.net', sent_at: '2026-07-15T00:00:00Z', send_result: '成功', send_type: '初回メール' },
  { lead_id: 'reserved', to_email: 'reserved@example.net', sent_at: '2026-07-15T00:01:00Z', send_result: '送信中', send_type: '初回メール' },
];
const dailyMailSafety = unlockedMailContext.buildMailSendSafetyContext_();
assert.strictEqual(dailyMailSafety.successfulCountToday, 1);
assert.strictEqual(dailyMailSafety.reservedCountToday, 1);
const dailyLimitContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), dailyLimitContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), dailyLimitContext, { filename: 'Email.gs' });
dailyLimitContext.getSettingValue_ = () => 2;
dailyLimitContext.MailApp = { getRemainingDailyQuota: () => 100 };
assert.throws(() => dailyLimitContext.assertEmailSendLimitAvailable_({ includeReservations: true, safety: dailyMailSafety }), /Daily app mail limit reached/);

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
  assert.strictEqual(options.waitMs, 90000);
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
context.readAllSheetRecordsByName_ = () => [
  { id: 'job-1', status: 'queued', query_json: '{}', updated_at: '1' },
  { id: 'job-2', status: 'queued', query_json: '{}', updated_at: '2' },
  { id: 'job-3', status: 'queued', query_json: '{}', updated_at: '3' },
  { id: 'job-4', status: 'queued', query_json: '{}', updated_at: '4' },
  { id: 'job-5', status: 'queued', query_json: '{}', updated_at: '5' },
];
context.recoverStaleCsvPreparationJobs_ = () => 0;
context.advanceSearchJob = (id) => ({ id, completed: id === 'job-1' });
context.appendSyncError_ = () => {};
const queue = context.advanceQueuedJobs({ maxJobs: 2, runtimeBudgetMs: 300000 });
assert.strictEqual(queue.jobs.length, 2);
assert.strictEqual(queue.remainingJobs, 4);
assert.strictEqual(queue.resumable, true);

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
const allActiveRecords = context.readAllActiveSheetRecords_('ng_masters');
assert.strictEqual(allActiveRecords.length, 1001);
assert.strictEqual(allActiveRecords[allActiveRecords.length - 1].id, 'record-1002');
const pagedActiveRecords = context.listSheetRecords('ng_masters', { limit: 5000 });
assert.strictEqual(pagedActiveRecords.total, 1001);
assert.strictEqual(pagedActiveRecords.items.length, 1000);
assert.strictEqual(context.readAllSheetRecordsByName_('ng_masters', { includeInactive: true }).length, 1002);
const usageFixture = Array.from({ length: 1002 }, () => ({ created_at: '2026-07-15T00:00:00.000Z', credits: 1 }));
assert.strictEqual(context.getSerperUsageCount_({ day: '2026-07-15' }, usageFixture), 1002);
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

let dashboardCacheUpdate = null;
context.readAllSheetRecordsByName_ = () => [
  { id: 'legacy-v4', cache_key: 'dashboard_stats_v4', updated_at: '2026-07-15T00:03:00.000Z' },
  { id: 'old-v5', cache_key: 'dashboard_stats_v5', updated_at: '2026-07-15T00:01:00.000Z' },
  { id: 'latest-v5', cache_key: 'dashboard_stats_v5', updated_at: '2026-07-15T00:02:00.000Z' },
];
context.updateSheetRecord_ = (sheetName, id, payload) => {
  dashboardCacheUpdate = { sheetName, id, payload };
  return payload;
};
context.appendSheetRecord_ = () => { throw new Error('dashboard cache must update instead of append'); };
context.Utilities = Object.assign({}, context.Utilities, { formatDate: () => '2026-07-15T00:30:00.000Z' });
context.Session = { getScriptTimeZone: () => 'Asia/Tokyo' };
context.upsertDashboardCacheSheet_({ leadsTotal: 1002 });
assert.strictEqual(dashboardCacheUpdate.sheetName, 'dashboard_cache');
assert.strictEqual(dashboardCacheUpdate.id, 'latest-v5');
assert.strictEqual(dashboardCacheUpdate.payload.cache_key, 'dashboard_stats_v5');

let persistedDashboardReads = 0;
context.CacheService = { getScriptCache: () => ({ get: () => null }) };
context.readDashboardStatsSheetCache_ = () => {
  persistedDashboardReads += 1;
  return { persistedCache: true };
};
assert.strictEqual(context.readDashboardStatsCache_({ allowPersisted: true }), null);
assert.strictEqual(persistedDashboardReads, 0);
assert.strictEqual(context.readDashboardStatsCache_({ allowPersisted: true, allowStale: true }).persistedCache, true);
assert.strictEqual(persistedDashboardReads, 1);

let domainCacheLock = null;
let domainCacheUpdate = null;
context.readAllSheetRecordsByName_ = () => [
  { id: 'domain-old', cache_key: 'lead-key', website_url: 'https://old.example', updated_at: '2026-07-15T00:01:00.000Z' },
  { id: 'domain-new', cache_key: 'lead-key', website_url: 'https://new.example', updated_at: '2026-07-15T00:02:00.000Z' },
];
assert.strictEqual(context.readDomainCache_('lead-key').website_url, 'https://new.example');
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
assert.strictEqual(domainCacheLock.options.waitMs, 90000);
assert.strictEqual(domainCacheUpdate.id, 'domain-new');

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
  assert.strictEqual(options.waitMs, 90000);
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
searchStartContext.readAllSheetRecordsByName_ = () => searchStartRecords;
searchStartContext.appendSheetRecord_ = (_sheetName, record) => {
  searchStartAppends += 1;
  const saved = Object.assign({ id: 'search-start-1' }, record);
  searchStartRecords.push(saved);
  return saved;
};
searchStartContext.ensureBackgroundJobTrigger_ = () => { searchTriggerChecks += 1; return {}; };
const firstSearchStart = searchStartContext.startSerperSearchJob({});
const duplicateSearchStart = searchStartContext.startSerperSearchJob({});
assert.strictEqual(searchStartAppends, 1);
assert.strictEqual(searchTriggerChecks, 2);
assert.strictEqual(firstSearchStart.reused, false);
assert.strictEqual(duplicateSearchStart.reused, true);
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
retryableShouldFail = false;
retryableFinalPatch = null;
const resumedSearchJob = retryableSearchContext.advanceSearchJob('search-retry-1', { maxItems: 1, runtimeBudgetMs: 60000 });
assert.strictEqual(resumedSearchJob.completed, true);
assert.strictEqual(retryableFinalPatch.status, 'completed');
assert.strictEqual(retryableJob.processed_count, 1);
assert.strictEqual(retryableJob.last_error, '');

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
assert.strictEqual(migrationLockOptions[0].waitMs, 90000);

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
assert(searchResultLinkLocks.every((item) => item.options.waitMs === 90000));
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
assert.strictEqual(replyRecordLock.options.waitMs, 90000);
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
replyRepairContext.listLeads = () => ({
  total: 3,
  items: [
    { id: 'lead-genuine', company_name: 'Genuine', email: 'genuine@example.net', reply_checked: true },
    { id: 'lead-auto-only', company_name: 'Auto', email: 'auto@example.net', reply_checked: true },
  ],
});
replyRepairContext.buildLatestSuccessfulMailHistoryByLeadId_ = () => ({
  'lead-genuine': { sent_at: '2026-07-15T10:00:00Z', send_type: '初回メール' },
  'lead-auto-only': { sent_at: '2026-07-15T10:00:00Z', send_type: '初回メール' },
});
replyRepairContext.readAllSheetRecordsByName_ = () => [
  { lead_id: 'lead-genuine', received_at: '2026-07-15T09:00:00Z', subject: '自動返信', snippet: '' },
  { lead_id: 'lead-genuine', received_at: '2026-07-15T11:00:00Z', subject: 'ご連絡ありがとうございます', snippet: '担当者からの返信です' },
  { lead_id: 'lead-auto-only', received_at: '2026-07-15T11:00:00Z', subject: '自動返信', snippet: '受付しました' },
];
const replyRepairCandidates = replyRepairContext.listReplyFalsePositiveCandidates({ limit: 2, offset: 0 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(replyRepairCandidates.candidates.map((item) => item.leadId))), ['lead-auto-only']);
assert.strictEqual(replyRepairCandidates.total, 3);
assert.strictEqual(replyRepairCandidates.remaining, 1);
assert.strictEqual(replyRepairCandidates.stoppedEarly, true);
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
candidateContext.readSheetRecords_ = () => [
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
const installedTriggers = [];
let automaticMailCadence = 0;
triggerContext.withScriptLock_ = (_operation, callback) => callback();
triggerContext.clearRuntimeCaches_ = () => {};
triggerContext.ScriptApp = {
  getProjectTriggers: () => installedTriggers,
  deleteTrigger: (trigger) => installedTriggers.splice(installedTriggers.indexOf(trigger), 1),
  newTrigger: (handler) => ({
    timeBased: () => ({
      everyMinutes: (minutes) => ({ create: () => {
        if (handler === 'runScheduledEmailBatch') automaticMailCadence = minutes;
        installedTriggers.push({ getHandlerFunction: () => handler, getEventType: () => 'CLOCK' });
      } }),
      everyHours: (_hours) => ({ create: () => installedTriggers.push({ getHandlerFunction: () => handler, getEventType: () => 'CLOCK' }) }),
    }),
  }),
};
const installed = triggerContext.installDefaultTriggers();
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(installed.triggers.map((trigger) => trigger.handler).sort())),
  ['advanceQueuedJobs', 'checkRepliesForLeads', 'runScheduledEmailBatch']
);
assert.strictEqual(automaticMailCadence, 10);

const historyContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'Code.gs'), 'utf8'), historyContext, { filename: 'Code.gs' });
vm.runInContext(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8'), historyContext, { filename: 'Email.gs' });
historyContext.getOrCreateSpreadsheet_ = () => ({});
historyContext.ensureSheet_ = () => ({});
historyContext.readSheetRecords_ = () => [
  { id: 'history-1', lead_id: 'lead-history', sent_at: '2026-07-15T00:03:00Z' },
  { id: 'history-2', lead_id: 'lead-history', sent_at: '2026-07-15T00:02:00Z' },
  { id: 'history-3', lead_id: 'lead-history', sent_at: '2026-07-15T00:01:00Z' },
  { id: 'other-history', lead_id: 'other-lead', sent_at: '2026-07-15T00:04:00Z' },
];
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
duplicateContext.readSheetRecords_ = () => [
  { id: 'current', company_name: 'Current' },
  { id: 'candidate-1', company_name: 'A' },
  { id: 'candidate-2', company_name: 'B' },
  { id: 'candidate-3', company_name: 'C' },
];
duplicateContext.duplicateKeysForLead_ = () => ({});
duplicateContext.duplicateMatchedKeys_ = () => ['email'];
duplicateContext.duplicateReasonLabels_ = () => ['メール'];
duplicateContext.duplicateReasonDetail_ = () => 'same@example.com';
const pagedDuplicates = duplicateContext.listLeadDuplicateCandidates('current', { limit: 2 });
assert.strictEqual(pagedDuplicates.total, 3);
assert.strictEqual(pagedDuplicates.items.length, 2);

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
assert(testMailOperations.every((item) => item.options.waitMs === 90000));

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
reviewDecisionContext.withScriptLock_ = (operation, callback, options) => {
  assert.strictEqual(operation, 'updateReviewLeadDecision');
  assert.strictEqual(options.waitMs, 6000);
  assert.strictEqual(options.attempts, 5);
  assert.strictEqual(options.retryDelayMs, 400);
  return callback();
};
reviewDecisionContext.getLeadById = () => Object.assign({}, reviewDecisionLead);
reviewDecisionContext.updateLeadLocked_ = (_id, patch) => {
  reviewDecisionWrites += 1;
  reviewDecisionLead = Object.assign({}, reviewDecisionLead, patch);
  return Object.assign({}, reviewDecisionLead);
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
assert.strictEqual(lockRetryContext.isScriptLockTimeoutError_(new Error('Exception: ロックのタイムアウト: 別のプロセスがロックを保持しています。')), true);
assert.strictEqual(lockRetryContext.isScriptLockTimeoutError_(new Error('Lock timed out waiting for another process')), true);

const sourceLockContext = vm.createContext({ console, URL });
files.forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sourceLockContext, { filename: file });
});
let sourceResultWrites = 0;
let sourceCreateCalls = 0;
sourceLockContext.findExistingSourcePageLead_ = () => null;
sourceLockContext.getSerperApiKey_ = () => '';
sourceLockContext.hasSearchJobRuntimeAvailable_ = () => true;
sourceLockContext.appendSourcePageResult_ = () => { sourceResultWrites += 1; };
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

assert.strictEqual(sourceLockContext.isLeadReviewPending_({
  source: 'source_page', status: '未対応', website_url: '', email: '', form_url: '',
}), false);
assert.strictEqual(sourceLockContext.isLeadReviewPending_({
  source: 'source_page', status: '未対応', website_url: 'https://camp.example/', email: '', form_url: '',
}), true);
assert.strictEqual(sourceLockContext.isLikelyOfficialCandidateUrl_('https://camp-go.com/camps/example', ''), false);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://yamagatakanko.com/attractions/detail_234.html'), true);
assert.strictEqual(sourceLockContext.isKnownNonAdvertiserLeadUrl_('https://www.town.nishikawa.yamagata.jp/site/kanko/'), false);
assert.strictEqual(sourceLockContext.isLikelyOfficialCandidateUrl_('https://facility.example/', ''), true);
const selectedOfficial = sourceLockContext.selectLeadSearchResult_([
  { title: '施設まとめ', link: 'https://camp-go.com/camps/example', snippet: '一覧' },
  { title: '星空キャンプ場 公式サイト', link: 'https://hoshizora.example/', snippet: '星空キャンプ場' },
], 'lead_official_site', { company_name: '星空キャンプ場' });
assert.strictEqual(selectedOfficial.url, 'https://hoshizora.example/');
const selectedAdvertiserSite = sourceLockContext.selectLeadSearchResult_([
  { title: '大沼キャンプ場 観光スポット', link: 'https://yamagatakanko.com/attractions/detail_234.html', snippet: '山形県観光情報ポータル' },
  { title: '大沼キャンプ場 公式案内', link: 'https://www.town.nishikawa.yamagata.jp/site/kanko/', snippet: '西川町公式サイト' },
], 'lead_official_site', { company_name: '大沼キャンプ場' });
assert.strictEqual(selectedAdvertiserSite.url, 'https://www.town.nishikawa.yamagata.jp/site/kanko/');
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
let searchClaimToken = 0;
searchReviewContext.Utilities = { getUuid: () => `search-claim-${++searchClaimToken}` };
searchReviewContext.withScriptLock_ = (operation, callback, options) => {
  searchReviewLock = { operation, options };
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
assert.strictEqual(searchReviewLock.options.waitMs, 90000);
const searchReviewRetry = searchReviewContext.reviewSearchResults({ ids: ['result-unconfirmed'], action: 'confirm' });
assert.strictEqual(searchReviewRetry.reviewed, 1);
assert.strictEqual(searchReviewRetry.conflicts.length, 0);
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

searchReviewContext.createLead = () => { throw new Error('simulated create failure'); };
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
  assert.strictEqual(options.waitMs, 90000);
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
assert(codeSource.includes('20260719_apps_script_full_workflow_v218_non_advertiser_review_cleanup_guard'));
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
assert(codeSource.includes('function updateReviewLeadDecision'));
assert(codeSource.includes('function repairReviewLeadsWithoutContact'));
assert(codeSource.includes('function repairNonAdvertiserReviewLeads'));
assert(codeSource.includes('function repairNonAdvertiserCleanupOverreach'));
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
assert(!mastersSource.includes("listSheetRecords('email_templates', { limit: 1000, includeInactive: true })"));
assert(emailSource.includes("const templates = readAllActiveSheetRecords_('email_templates')"));
assert(codeSource.includes("'FORM_SEND_NOT_RECORDED'"));
const operationsSource = fs.readFileSync(path.join(root, 'Operations.gs'), 'utf8');
assert(emailSource.includes('function runScheduledEmailBatch'));
assert(emailSource.includes("job_type: 'automatic_email_send'"));
assert(operationsSource.includes("newTrigger('runScheduledEmailBatch').timeBased().everyMinutes(10)"));
assert(operationsSource.includes("const guests = sendInvites ? String(source.guests || lead.email || '').trim() : ''"));
assert(operationsSource.includes("readAllSheetRecordsByName_('search_jobs'"));
assert(operationsSource.includes("readAllSheetRecordsByName_('reply_logs'"));
assert(operationsSource.includes("withScriptLock_('importLeadsFromCsv:item'"));
assert(operationsSource.includes('function startLeadCsvImport'));
assert(operationsSource.includes('function advanceLeadCsvImportJob'));
assert(operationsSource.includes('function buildLeadCsvImportRequestKey_'));
assert(operationsSource.includes('function recoverStaleCsvPreparationJobs_'));
assert(operationsSource.includes("withScriptLock_('startLeadCsvImport:appendRawChunk'"));
assert(operationsSource.includes("readAllSheetRecordsByName_('jobs'"));
assert(operationsSource.includes('function buildSyncFillPatch_'));
assert(operationsSource.includes("withScriptLock_('recordDetectedReply'"));
assert(operationsSource.includes('function findReplyLogByLeadAndThread_'));
assert(operationsSource.includes("withScriptLock_('restoreReplyFalsePositiveCandidate'"));
assert(operationsSource.includes('function findCalendarEventByClaim_'));
assert(operationsSource.includes("'管理ID: ' + claimMarker"));
assert(serperSource.includes("readAllSheetRecordsByName_('domain_cache'"));
assert(serperSource.includes("readAllSheetRecordsByName_('search_usage_logs'"));
assert(serperSource.includes("withScriptLock_('writeDomainCache'"));
assert(serperSource.includes('function buildSearchJobRequestKey_'));
assert(serperSource.includes('function isRetryableSearchJobError_'));
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
assert(serperSource.includes('function repairNapCampGenres'));
assert(serperSource.includes('function rankContactPageLinks_'));
assert(serperSource.includes('excludedFromReview: true'));
const webAppSource = fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8');
assert(webAppSource.includes("readAllSheetRecordsByName_('search_jobs'"));
assert(webAppSource.includes("getSerperUsageCount_({ day: today }, searchUsageLogs)"));
assert(webAppSource.includes("findLatestDashboardCacheRecord_(records, 'dashboard_stats_v5')"));
assert(!webAppSource.includes("record.cache_key === 'dashboard_stats_v4'"));
assert(webAppSource.includes("withScriptLock_('writeDashboardStatsCache'"));
assert(webAppSource.includes('analytics: buildAnalyticsSnapshot_(leads, sendHistories, today)'));
assert(webAppSource.includes("if (action === 'repairNapCampGenres')"));
assert(webAppSource.includes("if (action === 'repairReviewLeadsWithoutContact')"));
assert(webAppSource.includes("if (action === 'repairNonAdvertiserReviewLeads')"));
assert(webAppSource.includes('runLeadCollectionQualityMigrationV215_({ interactive: true })'));
assert(emailSource.includes("logError_('runLeadCollectionQualityMigrationV215_:scheduled'"));
const indexSource = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
assert(indexSource.includes('class="nav-more nav-section" data-nav-tabs="leads,reviewLeads,search,backgroundJobs"'));
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
assert(indexSource.includes("api('startLeadCsvImport', csvText, options || {})"));
assert(indexSource.includes("api('advanceLeadCsvImportJob', job.id, { maxItems: 25, runtimeBudgetMs: 90000 })"));
assert(indexSource.includes("apiQuiet('updateReviewLeadDecision'"));
assert(indexSource.includes('function saveReviewLeadDecisionWithRetry'));
assert(indexSource.includes('function isLockTimeoutApiError'));
assert(indexSource.includes('function enqueueReviewLeadDecisionSave'));
assert(indexSource.includes('reviewLeadSaveQueue = task.then'));
assert(indexSource.includes("const NAP_CAMP_GENRE_NAME = 'キャンプ'"));
assert(indexSource.includes('function syncSourcePageGenreWithUrl'));
assert(indexSource.includes('function sourcePageDefaultGenre'));
assert(indexSource.includes('reviewPendingLeadIds'));
assert(indexSource.includes('pendingJobResultIds'));
assert(indexSource.includes("item.review_status === 'unconfirmed' || item.review_status === 'adding'"));
assert(indexSource.includes("adding: '追加処理中'"));
assert(indexSource.includes('function isJobResultReviewActionable'));
assert(indexSource.includes('別処理で更新済みのため上書きしませんでした'));
assert(indexSource.includes('Promise.allSettled(['));
assert(indexSource.includes("window.addEventListener('unhandledrejection'"));
assert(indexSource.includes('if (state.analyticsData) return state.analyticsData;'));
['updateLeadLocked_', 'deleteLead', 'markLeadFormSent', 'unmarkLeadFormSent'].forEach((functionName) => {
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
assert(serperSource.includes("payload.job_type === 'source_page' ? String(progressRecord.cursor_json || job.cursor_json || '') : ''"));
assert(indexSource.includes('自動復旧して再開'));
assert(indexSource.includes("api('repairBackgroundJobs'"));
assert(serperSource.includes('function listSourcePageSiteStatuses'));
assert(indexSource.includes("request('listSourcePageSiteStatuses'"));
assert(indexSource.includes('全件調査完了'));
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
  ],
});
sourcePageStatusContext.readAllSheetRecordsByName_ = () => [
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
    total_count: 1,
    processed_count: 0,
    updated_at: '2026-07-17T00:00:00+09:00',
  },
];
const sourcePageStatuses = JSON.parse(JSON.stringify(sourcePageStatusContext.listSourcePageSiteStatuses()));
assert.strictEqual(sourcePageStatuses.total, 2);
assert.strictEqual(sourcePageStatuses.completed, 1);
assert.strictEqual(sourcePageStatuses.running, 1);
assert.strictEqual(sourcePageStatuses.items[0].statusLabel, '全件調査完了');
assert.strictEqual(sourcePageStatuses.items[0].processed, 5872);
assert.strictEqual(sourcePageStatuses.items[0].total, 5872);
assert.strictEqual(sourcePageStatuses.items[0].percent, 100);
assert.strictEqual(sourcePageStatuses.items[1].statusLabel, '調査中');
assert.strictEqual(sourcePageStatuses.items[1].processed, 124);
assert.strictEqual(sourcePageStatuses.items[1].percent, 12);

console.log('v218 non-advertiser site cleanup regression tests passed.');
