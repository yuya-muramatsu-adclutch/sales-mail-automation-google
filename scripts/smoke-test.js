const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gsFiles = fs.readdirSync(root).filter((file) => file.endsWith('.gs')).sort();
const context = {
  console,
  Utilities: {
    formatDate(date, _timezone, pattern) {
      const iso = new Date(date).toISOString();
      return pattern === 'yyyy-MM-dd' ? iso.slice(0, 10) : iso;
    },
  },
  Session: {
    getScriptTimeZone() {
      return 'Asia/Tokyo';
    },
  },
};
vm.createContext(context);

for (const file of gsFiles) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

context.getSettingValue_ = (_key, defaultValue) => defaultValue;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = true;
  }
  assert(threw, message);
}

const lead = context.normalizeLeadInput_({
  company_name: '株式会社Example',
  websiteUrl: 'example.com/contact',
  email: 'SALES@EXAMPLE.COM',
  status: '商談予定',
  customFields: { rank: 'A' },
}, true);
lead.status = lead.status || '未対応';
lead.form_status = lead.form_status || '未対応';
lead.deal_status = lead.deal_status || '未設定';
lead.send_ng = false;
lead.reply_checked = false;
lead.send_count = 0;
context.applyLeadDerivedFields_(lead);
context.applyLeadStatusSideEffects_(lead, new Set(Object.keys(lead)));

assert(lead.normalized_company_name === 'example', 'company normalization failed');
assert(lead.email === 'sales@example.com', 'email normalization failed');
assert(lead.email_domain === 'example.com', 'email domain failed');
assert(lead.website_domain === 'example.com', 'website domain failed');
assert(lead.deal_status === '商談予定', 'deal status side effect failed');
assert(lead.reply_checked === true, 'reply side effect failed');

const template = context.normalizeEmailTemplateInput_({
  name: '初回',
  template_type: 'initial',
  subject: '{{company_name}} ご担当者様',
  body: '{{company_name}}\n{{contact_name}}様',
  is_production: false,
});
const rendered = context.renderTemplateForLead_(template, lead);
assert(rendered.subject === '株式会社Example ご担当者様', 'template subject rendering failed');
assert(rendered.body.includes('ご担当者'), 'template body rendering failed');

const sendLead = Object.assign({}, lead, {
  id: 'lead-send-1',
  genre: 'グランピング',
  email: 'send@sales-test.jp',
  status: '未対応',
  deal_status: '未設定',
  send_count: 0,
  last_sent_at: '',
});
const productionTemplate = {
  id: 'tpl-prod',
  active: true,
  template_type: 'initial',
  genre: 'グランピング',
  is_production: true,
  subject: '{{屋号}} ご担当者様',
  body: '{{屋号}}',
};
const draftTemplate = Object.assign({}, productionTemplate, { id: 'tpl-draft', is_production: false });
const formTemplate = Object.assign({}, productionTemplate, { id: 'tpl-form', template_type: 'form' });
const mismatchTemplate = Object.assign({}, productionTemplate, { id: 'tpl-mismatch', genre: '温泉旅館' });
context.validateEmailSendTemplate_(productionTemplate, sendLead, { send_type: '初回メール' });
assertThrows(() => context.validateEmailSendTemplate_(draftTemplate, sendLead, {}), 'draft template should be blocked');
assertThrows(() => context.validateEmailSendTemplate_(formTemplate, sendLead, {}), 'form template should be blocked for MailApp sends');
assertThrows(() => context.validateEmailSendTemplate_(mismatchTemplate, sendLead, {}), 'genre-mismatched template should be blocked');
assert(context.countSuccessfulProductionSends_([
  { send_result: '成功', send_type: '初回メール', sent_at: '2026-07-12T00:00:00Z' },
  { send_result: '成功', send_type: 'テスト送信', sent_at: '2026-07-12T01:00:00Z' },
  { send_result: '失敗', send_type: '初回メール', sent_at: '2026-07-12T02:00:00Z' },
], '2026-07-12') === 1, 'production send counter should exclude test and failed sends');
const originalListEmailTemplates = context.listEmailTemplates;
context.listEmailTemplates = () => ({ items: [mismatchTemplate, productionTemplate] });
assert(context.findProductionTemplateForLead_(sendLead, 'initial').id === 'tpl-prod', 'production template lookup should prefer exact genre');
context.listEmailTemplates = () => ({ items: [mismatchTemplate] });
assert(context.findProductionTemplateForLead_(sendLead, 'initial') === null, 'production template lookup should not fall back to mismatched genre');
context.listEmailTemplates = originalListEmailTemplates;

const ng = context.normalizeNgMasterInput_({
  email: 'block@example.com',
  reason: '配信停止',
});
assert(ng.domain === 'example.com', 'NG email domain failed');

const sendSafetyContext = {
  ngMasters: [],
  excludedDomains: [],
  mailSendSafety: { sentLeadIds: {}, sentEmails: {}, reservedLeadIds: {}, reservedEmails: {} },
};
const eligibleLead = Object.assign({}, sendLead, { send_ng: false, reply_checked: false });
assert(context.isEmailSendTarget_(eligibleLead, sendSafetyContext), 'eligible lead should remain sendable');
assert(context.isValidEmailAddress_('info@nupuka.jp'), 'normal business email should be valid');
assert(context.isValidEmailAddress_('rsv@489pro-x.com'), 'business email with a hyphenated domain should be valid');
assert(context.isValidEmailAddress_('u@business.jp'), 'one-letter local parts should remain valid');
[
  '1203-featured-75x75@1.5x.jpg',
  'button-only@2x.png',
  'e=.01@window.innerwidth',
  'u@i.msgs.jp',
  'info@example.com',
].forEach((email) => {
  assert(!context.isValidEmailAddress_(email), `scraped non-business email must be rejected: ${email}`);
});
assert(
  context.extractEmailFromSearchResult_('privacy@real-site.jp / info@real-site.jp') === 'info@real-site.jp',
  'contact email should be preferred over privacy email',
);
assert(!context.isEmailSendTarget_(Object.assign({}, eligibleLead, { send_ng: true }), sendSafetyContext), 'send_ng lead must be blocked');
assert(!context.isEmailSendTarget_(Object.assign({}, eligibleLead, { status: '送信NG' }), sendSafetyContext), 'send NG status must be blocked');
assert(!context.isEmailSendTarget_(Object.assign({}, eligibleLead, { company_name: '株式会社送信停止' }), Object.assign({}, sendSafetyContext, {
  ngMasters: [{ company_name: '株式会社送信停止', reason: '会社指定' }],
})), 'NG master company must be blocked');
assert(!context.isEmailSendTarget_(Object.assign({}, eligibleLead, { email: 'blocked@ng-test.jp' }), Object.assign({}, sendSafetyContext, {
  ngMasters: [{ email: 'blocked@ng-test.jp', reason: 'メール指定' }],
})), 'NG master email must be blocked');
assert(!context.isEmailSendTarget_(Object.assign({}, eligibleLead, { email: 'sales@sub.example.org' }), Object.assign({}, sendSafetyContext, {
  ngMasters: [{ domain: 'example.org', reason: 'ドメイン指定' }],
})), 'NG master domain and subdomain must be blocked');
assert(!context.isEmailSendTarget_(eligibleLead, Object.assign({}, sendSafetyContext, {
  mailSendSafety: { sentLeadIds: {}, sentEmails: {}, reservedLeadIds: { 'lead-send-1': true }, reservedEmails: {} },
})), 'pending production send reservation must block retry');
assert(!context.isEmailSendTarget_(Object.assign({}, eligibleLead, {
  email: 'sales@blocked-domain.example',
  website_url: 'https://different.example/',
  website_domain: 'different.example',
}), Object.assign({}, sendSafetyContext, {
  ngMasters: [{ domain: 'blocked-domain.example', reason: 'メールドメイン指定' }],
})), 'NG email domain must be checked even when website domain exists');

const originalSendSafetyWithLock = context.withScriptLock_;
const originalSendSafetyGetLead = context.getLeadById;
const originalSendSafetyFindTemplate = context.findSheetRecordById_;
const originalSendSafetyBuildContext = context.buildMasterBlockContext_;
const originalSendSafetyMailApp = context.MailApp;
const originalSendSafetyMailControl = context.getMailSendingControl_;
const originalSendSafetyWindow = context.buildSendWindowStatus_;
const originalSendSafetyLimit = context.assertEmailSendLimitAvailable_;
const originalSendSafetyAppend = context.appendSheetRecord_;
const originalSendSafetyUpdateRecord = context.updateSheetRecord_;
const originalSendSafetyUpdateLead = context.updateLeadAfterSend_;
let forcedNgSendCalls = 0;
context.withScriptLock_ = (_name, callback) => callback();
context.getLeadById = () => Object.assign({}, eligibleLead, { send_ng: true });
context.findSheetRecordById_ = () => productionTemplate;
context.buildMasterBlockContext_ = () => sendSafetyContext;
context.getMailSendingControl_ = () => ({ enabled: true, reason: '' });
context.buildSendWindowStatus_ = () => ({ enabled: true, allowed: true, label: '07:00-08:00' });
context.MailApp = { sendEmail() { forcedNgSendCalls += 1; } };
assertThrows(() => context.sendLeadEmail('lead-send-1', 'tpl-prod', { force: true }), 'force must not bypass send NG');
assert(forcedNgSendCalls === 0, 'MailApp must not run for send NG even when force is requested');
context.getLeadById = () => Object.assign({}, eligibleLead, { send_ng: false });
context.getMailSendingControl_ = () => ({ enabled: false, reason: '停止中' });
assertThrows(() => context.sendLeadEmail('lead-send-1', 'tpl-prod', {}), 'server must block production sends while mail control is disabled');
assert(forcedNgSendCalls === 0, 'MailApp must not run while mail control is disabled');
context.getMailSendingControl_ = () => ({ enabled: true, reason: '' });
context.buildSendWindowStatus_ = () => ({ enabled: true, allowed: false, label: '07:00-08:00' });
assertThrows(() => context.sendLeadEmailBatch(['lead-send-1'], 'tpl-prod', {}), 'server batch must block outside the configured send window');
assert(forcedNgSendCalls === 0, 'MailApp must not run outside the batch send window');
context.buildSendWindowStatus_ = () => ({ enabled: true, allowed: true, label: '07:00-08:00' });

const reservationEvents = [];
let reservationSequence = 0;
let reservedMailCalls = 0;
context.getLeadById = (id) => Object.assign({}, eligibleLead, { id, email: 'same-recipient@sales-test.jp', send_ng: false });
context.buildMasterBlockContext_ = () => ({
  ngMasters: [],
  excludedDomains: [],
  mailSendSafety: { sentLeadIds: {}, sentEmails: {}, reservedLeadIds: {}, reservedEmails: {} },
});
context.assertEmailSendLimitAvailable_ = () => {};
context.appendSheetRecord_ = (_sheetName, record) => {
  reservationEvents.push(record.send_result);
  reservationSequence += 1;
  return Object.assign({ id: `reservation-${reservationSequence}` }, record);
};
context.updateSheetRecord_ = (_sheetName, id, patch) => Object.assign({ id }, patch);
context.updateLeadAfterSend_ = () => {};
context.MailApp = {
  sendEmail() {
    reservationEvents.push('MailApp');
    reservedMailCalls += 1;
  },
};
const reservedBatch = context.sendLeadEmailBatch(['lead-send-1', 'lead-send-2'], 'tpl-prod', { send_type: '初回メール' });
assert(reservationEvents[0] === '送信中' && reservationEvents[1] === 'MailApp', 'production send reservation must be stored before MailApp');
assert(reservedBatch.success === 1 && reservedBatch.failed === 1 && reservedBatch.blocked === 1, 'server batch should block a second lead with the same reserved email');
assert(reservedMailCalls === 1, 'same recipient must be sent at most once in a server batch');
assert(context.isProductionSendReservationHistory_({ send_result: '送信中', send_type: '初回メール' }), 'production send reservation history detection failed');
assert(!context.isProductionSendReservationHistory_({ send_result: '送信中', send_type: 'テスト送信' }), 'test send reservation must not block production delivery');
context.withScriptLock_ = originalSendSafetyWithLock;
context.getLeadById = originalSendSafetyGetLead;
context.findSheetRecordById_ = originalSendSafetyFindTemplate;
context.buildMasterBlockContext_ = originalSendSafetyBuildContext;
context.MailApp = originalSendSafetyMailApp;
context.getMailSendingControl_ = originalSendSafetyMailControl;
context.buildSendWindowStatus_ = originalSendSafetyWindow;
context.assertEmailSendLimitAvailable_ = originalSendSafetyLimit;
context.appendSheetRecord_ = originalSendSafetyAppend;
context.updateSheetRecord_ = originalSendSafetyUpdateRecord;
context.updateLeadAfterSend_ = originalSendSafetyUpdateLead;

const job = context.normalizeSearchJobInput_({
  job_type: 'lead_official_site',
  leadId: 'lead-1',
  daily_limit: 100,
  job_limit: 5,
});
assert(job.items.length === 1 && job.items[0].lead_id === 'lead-1', 'search job lead item failed');

const prospectingJob = context.normalizeSearchJobInput_({
  job_type: 'prospecting',
  queries: ['グランピング 埼玉県 公式サイト', '温泉旅館 群馬県 お問い合わせ'],
  genre: '宿泊施設',
  job_limit: 10,
  resultsPerQuery: 8,
});
assert(prospectingJob.items.length === 2, 'prospecting multi-query job failed');
assert(prospectingJob.results_per_query === 8, 'prospecting results per query failed');

const sourcePageJob = context.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrls: ['example.com/list'],
  genre: '宿泊施設',
  label: 'まとめサイト',
  useSerperFallback: false,
});
assert(sourcePageJob.items.length === 1 && sourcePageJob.items[0].source_url === 'https://example.com/list', 'source page job item failed');
assert(sourcePageJob.use_serper_fallback === false, 'source page fallback flag failed');

context.UrlFetchApp = {
  fetch() {
    return {
      getResponseCode: () => 200,
      getContentText: () => [
        '<urlset>',
        '<url><loc>https://www.nap-camp.com/hokkaido/12139/</loc></url>',
        '<url><loc>https://www.nap-camp.com/hokkaido/12139/images</loc></url>',
        '<url><loc>https://www.nap-camp.com/tochigi/15952/</loc></url>',
        '<url><loc>https://www.nap-camp.com/chiba/14286/</loc></url>',
        '</urlset>',
      ].join(''),
    };
  },
};
const napCampJob = context.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrls: ['https://www.nap-camp.com/list'],
  genre: 'キャンプ場',
  label: 'なっぷ全国キャンプ場',
  crawlAll: true,
  sitePreset: 'nap_camp',
  resultsPerQuery: 2,
});
assert(napCampJob.crawl_all === true && napCampJob.site_preset === 'nap_camp', 'nap-camp crawl flags failed');
assert(napCampJob.items.length === 1, 'nap-camp full crawl should use one compact resumable item');
assert(napCampJob.items[0].offset === 0 && napCampJob.items[0].max_items === 3, 'nap-camp compact item range failed');
assert(napCampJob.items[0].total_candidates === 3, 'nap-camp candidate count failed');
assert(napCampJob.total_candidates === 3, 'nap-camp display total failed');

const originalFetchNapCampEntries = context.fetchNapCampCampsiteUrlEntries_;
context.fetchNapCampCampsiteUrlEntries_ = () => Array.from({ length: 5872 }, (_value, index) => ({
  detail_url: `https://www.nap-camp.com/test/${index + 1}`,
  campsite_id: String(index + 1),
  source_id: `nap_camp:test:${index + 1}`,
}));
const largeNapCampJob = context.normalizeSearchJobInput_({
  job_type: 'source_page',
  sourceUrls: ['https://www.nap-camp.com/'],
  genre: 'キャンプ',
  label: 'nap-camp.com',
  crawlAll: true,
  sitePreset: 'nap_camp',
});
assert(largeNapCampJob.items.length === 1 && largeNapCampJob.total_candidates === 5872, 'large nap-camp crawl should remain compact');
assert(JSON.stringify(largeNapCampJob).length < 50000, 'search job payload must stay below the Google Sheets cell limit');
context.fetchNapCampCampsiteUrlEntries_ = originalFetchNapCampEntries;

const sourcePageLeadIndex = context.buildSourcePageLeadIndexFromRecords_([
  {
    id: 'existing-source-id',
    source: 'source_page',
    source_id: 'nap_camp:test:1',
    external_id: 'https://www.nap-camp.com/test/1',
    company_name: '既存キャンプ場',
    website_url: 'https://existing-camp.example/',
    website_domain: 'existing-camp.example',
  },
]);
assert(context.findExistingSourcePageLead_({ source_id: 'nap_camp:test:1' }, '別名称', '', sourcePageLeadIndex).id === 'existing-source-id', 'source ID duplicate index failed');
assert(context.findExistingSourcePageLead_({ detail_url: 'https://www.nap-camp.com/test/1' }, '別名称', '', sourcePageLeadIndex).id === 'existing-source-id', 'source detail URL duplicate index failed');
assert(context.findExistingSourcePageLead_({}, '別施設', 'https://existing-camp.example/another-facility', sourcePageLeadIndex) === null, 'shared official domain must not hide a different facility');
context.addLeadToSourcePageIndex_(sourcePageLeadIndex, {
  id: 'added-in-run',
  source: 'source_page',
  source_id: 'nap_camp:test:2',
  company_name: '実行中追加キャンプ場',
  facility_name: '実行中追加キャンプ場',
});
assert(context.findExistingSourcePageLead_({ source_id: 'nap_camp:test:2' }, '実行中追加キャンプ場', '', sourcePageLeadIndex).id === 'added-in-run', 'same-run duplicate index update failed');

const consumerGasUsage = context.buildConsumerGasUsageStatus_({
  mailQuotaRemaining: 25,
  sentToday: 75,
  appMailLimit: 80,
  triggerCount: 14,
  urlFetchRecordedToday: 14000,
  batchRuntimeBudgetMs: 300000,
});
assert(consumerGasUsage.accountType === 'consumer', 'consumer GAS quota profile missing');
assert(consumerGasUsage.limits.emailRecipientsPerDay === 100, 'consumer mail quota should be 100 recipients');
assert(consumerGasUsage.limits.triggerRuntimeMinutesPerDay === 90, 'consumer trigger runtime quota should be 90 minutes');
assert(consumerGasUsage.email.used === 75 && consumerGasUsage.email.remaining === 25, 'consumer mail usage calculation failed');
assert(consumerGasUsage.alerts.some((item) => item.key === 'triggers'), 'trigger quota warning should be reported');
assert(consumerGasUsage.alerts.some((item) => item.key === 'urlFetch'), 'URL Fetch quota warning should be reported');
const disabledAutomaticReplySweep = context.checkRepliesForLeads();
assert(disabledAutomaticReplySweep.disabled === true && disabledAutomaticReplySweep.checked === 0, 'disabled automatic reply check should exit without Gmail access');

const originalTriggerWithLock = context.withScriptLock_;
const originalScriptApp = context.ScriptApp;
const mockProjectTriggers = [];
const mockTriggerSchedules = [];
context.withScriptLock_ = (_name, callback) => callback();
context.ScriptApp = {
  getProjectTriggers() {
    return mockProjectTriggers.slice();
  },
  newTrigger(handler) {
    const schedule = { handler, interval: '', value: 0 };
    const builder = {
      timeBased() { return builder; },
      everyMinutes(value) { schedule.interval = 'minutes'; schedule.value = value; return builder; },
      everyHours(value) { schedule.interval = 'hours'; schedule.value = value; return builder; },
      create() {
        mockTriggerSchedules.push(Object.assign({}, schedule));
        const trigger = {
          getHandlerFunction() { return handler; },
          getEventType() { return 'CLOCK'; },
        };
        mockProjectTriggers.push(trigger);
        return trigger;
      },
    };
    return builder;
  },
};
const firstTriggerInstall = context.installDefaultTriggers();
assert(firstTriggerInstall.triggers.length === 2, 'default cloud triggers should be created');
assert(mockTriggerSchedules.some((item) => item.handler === 'advanceQueuedJobs' && item.interval === 'minutes' && item.value === 10), 'background jobs should run every 10 minutes');
assert(mockTriggerSchedules.some((item) => item.handler === 'checkRepliesForLeads' && item.interval === 'hours' && item.value === 6), 'reply checks should run every 6 hours');
const secondTriggerInstall = context.installDefaultTriggers();
assert(secondTriggerInstall.triggers.length === 2 && mockProjectTriggers.length === 2, 'trigger installation should not create duplicates');
context.withScriptLock_ = originalTriggerWithLock;
context.ScriptApp = originalScriptApp;

const runWindow = context.buildSearchJobRunWindow_(300000, 1000);
assert(runWindow.deadlineMs === 271000, 'search job run window should reserve 30 seconds');
assert(context.isSearchJobRuntimeExhausted_(runWindow.deadlineMs, runWindow.deadlineMs), 'runtime deadline should stop processing');
assert(context.parseSearchJobCursor_('{"itemIndex":2,"offset":7}').offset === 7, 'search job cursor should restore item offset');
assert(context.parseSearchJobCursor_('{"itemIndex":2,"offset":7,"resumeAfter":"2026-07-13T00:05:00+09:00"}').resumeAfter === '2026-07-13T00:05:00+09:00', 'search job cursor should restore quota resume time');

const originalQuotaUsageCount = context.getSerperUsageCount_;
context.getSerperUsageCount_ = (range) => range && range.day ? 100 : 0;
let dailyQuotaError = null;
try {
  context.assertSerperLimitAvailable_();
} catch (error) {
  dailyQuotaError = error;
}
assert(dailyQuotaError && dailyQuotaError.code === 'SERPER_DAILY_LIMIT' && dailyQuotaError.expected === true, 'daily Serper limit should be an expected quota pause');
assert(context.serperQuotaResumeAfter_(dailyQuotaError, new Date('2026-07-12T03:00:00Z')) === '2026-07-13T00:05:00+09:00', 'daily Serper quota should resume after the next local reset');
context.getSerperUsageCount_ = (range) => range && range.month ? 1000 : 0;
let monthlyQuotaError = null;
try {
  context.assertSerperLimitAvailable_();
} catch (error) {
  monthlyQuotaError = error;
}
assert(monthlyQuotaError && monthlyQuotaError.code === 'SERPER_MONTHLY_LIMIT', 'monthly Serper limit should be classified');
assert(context.serperQuotaResumeAfter_(monthlyQuotaError, new Date('2026-07-12T03:00:00Z')) === '2026-08-01T00:05:00+09:00', 'monthly Serper quota should resume after the next monthly reset');
const perLeadQuotaError = context.createExpectedOperationError_('lead limit', 'SERPER_LEAD_LIMIT');
assert(!context.isSerperQuotaError_(perLeadQuotaError), 'per-lead limit must not pause the whole job until tomorrow');
assert(context.isSerperLeadLimitError_(perLeadQuotaError), 'per-lead limit should be classified as a permanent item skip');
context.getSerperUsageCount_ = originalQuotaUsageCount;

const originalClaimSearchJobRun = context.claimSearchJobRun_;
const originalUpdateClaimedSearchJob = context.updateClaimedSearchJob_;
const originalProcessProspectingSearchItem = context.processProspectingSearchItem_;
const originalProcessSourcePageSearchItem = context.processSourcePageSearchItem_;
const originalAppendSyncError = context.appendSyncError_;
const originalBuildSourcePageLeadIndex = context.buildSourcePageLeadIndex_;
let mockSearchJob = {
  id: 'job-runtime-test',
  status: 'running',
  lock_token: 'lock-runtime-test',
  processed_count: 0,
  total_count: 3,
  attempt_count: 1,
  cursor_json: '',
  query_json: JSON.stringify({
    job_type: 'prospecting',
    job_limit: 3,
    items: [{ query: 'one' }, { query: 'two' }, { query: 'three' }],
  }),
};
context.claimSearchJobRun_ = () => ({ claimed: true, busy: false, job: Object.assign({}, mockSearchJob), lockToken: 'lock-runtime-test' });
context.updateClaimedSearchJob_ = (_jobId, _lockToken, patch, release) => {
  mockSearchJob = Object.assign({}, mockSearchJob, patch);
  if (release) mockSearchJob.lock_token = '';
  return { owned: true, record: Object.assign({}, mockSearchJob) };
};
context.processProspectingSearchItem_ = () => {};
context.appendSyncError_ = () => {};
context.buildSourcePageLeadIndex_ = () => context.buildSourcePageLeadIndexFromRecords_([]);
const firstJobRun = context.advanceSearchJob('job-runtime-test', { maxItems: 2, runtimeBudgetMs: 10000 });
assert(firstJobRun.processedCount === 2 && firstJobRun.resumable === true, 'first search job run should persist progress and remain resumable');
assert(mockSearchJob.status === 'queued' && mockSearchJob.processed_count === 2, 'partial search job should return to queued state');
mockSearchJob.lock_token = 'lock-runtime-test';
mockSearchJob.status = 'running';
const secondJobRun = context.advanceSearchJob('job-runtime-test', { maxItems: 2, runtimeBudgetMs: 10000 });
assert(secondJobRun.completed === true && secondJobRun.processedCount === 3, 'second search job run should resume and complete');

context.claimSearchJobRun_ = () => ({ claimed: false, busy: true, reason: 'already_running', job: Object.assign({}, mockSearchJob, { status: 'running' }) });
const busyJobRun = context.advanceSearchJob('job-runtime-test', { maxItems: 1, runtimeBudgetMs: 10000 });
assert(busyJobRun.busy === true && busyJobRun.skipped === true && busyJobRun.processed === 0, 'active search job claim should prevent duplicate processing');

mockSearchJob = {
  id: 'job-source-cursor-test',
  status: 'running',
  lock_token: 'lock-source-test',
  processed_count: 0,
  total_count: 1,
  attempt_count: 1,
  cursor_json: '',
  query_json: JSON.stringify({
    job_type: 'source_page',
    job_limit: 1,
    items: [{ source_url: 'example.com/list' }],
  }),
};
context.claimSearchJobRun_ = () => ({ claimed: true, busy: false, job: Object.assign({}, mockSearchJob), lockToken: 'lock-source-test' });
context.processSourcePageSearchItem_ = () => ({ created: 1, processedCandidates: 2, processedAll: false, nextOffset: 2 });
const cursorJobRun = context.advanceSearchJob('job-source-cursor-test', { maxItems: 1, runtimeBudgetMs: 10000 });
const storedCursor = JSON.parse(mockSearchJob.cursor_json || '{}');
assert(cursorJobRun.pausedForRuntime === true && cursorJobRun.processedCount === 0, 'partial source page item should pause without advancing the outer item');
assert(storedCursor.itemIndex === 0 && storedCursor.offset === 2, 'partial source page item should persist its inner cursor');

mockSearchJob.lock_token = 'lock-source-test';
mockSearchJob.status = 'running';
mockSearchJob.cursor_json = '';
context.processSourcePageSearchItem_ = () => ({
  created: 0,
  processedCandidates: 2,
  processedAll: false,
  nextOffset: 2,
  pausedForQuota: true,
  resumeAfter: '2099-01-01T00:05:00+09:00',
});
const quotaPausedJobRun = context.advanceSearchJob('job-source-cursor-test', { maxItems: 1, runtimeBudgetMs: 10000 });
const quotaCursor = JSON.parse(mockSearchJob.cursor_json || '{}');
assert(quotaPausedJobRun.pausedForQuota === true && quotaPausedJobRun.pausedForRuntime === false, 'quota pause must be distinct from runtime pause');
assert(quotaCursor.offset === 2 && quotaCursor.resumeAfter === '2099-01-01T00:05:00+09:00', 'quota pause should preserve the facility cursor and resume time');

let pausedProcessorCalls = 0;
mockSearchJob.lock_token = 'lock-source-test';
mockSearchJob.status = 'running';
context.processSourcePageSearchItem_ = () => { pausedProcessorCalls += 1; return { processedAll: true }; };
const waitingQuotaJobRun = context.advanceSearchJob('job-source-cursor-test', { maxItems: 1, runtimeBudgetMs: 10000 });
assert(waitingQuotaJobRun.pausedForQuota === true && pausedProcessorCalls === 0, 'quota-waiting job should exit before rebuilding or processing candidates');

context.claimSearchJobRun_ = originalClaimSearchJobRun;
context.updateClaimedSearchJob_ = originalUpdateClaimedSearchJob;
context.processProspectingSearchItem_ = originalProcessProspectingSearchItem;
context.processSourcePageSearchItem_ = originalProcessSourcePageSearchItem;
context.appendSyncError_ = originalAppendSyncError;
context.buildSourcePageLeadIndex_ = originalBuildSourcePageLeadIndex;

const originalPropertiesService = context.PropertiesService;
const originalGmailApp = context.GmailApp;
const originalListLeads = context.listLeads;
const originalWithScriptLock = context.withScriptLock_;
const originalClaimGmailReplyCheckRun = context.claimGmailReplyCheckRun_;
const originalReleaseGmailReplyCheckRun = context.releaseGmailReplyCheckRun_;
const replyCursorStore = {};
const replyLeads = Array.from({ length: 5 }, (_value, index) => ({
  id: `reply-lead-${index + 1}`,
  email: `reply${index + 1}@reply-test.jp`,
  reply_checked: false,
}));
context.PropertiesService = {
  getScriptProperties() {
    return {
      getProperty(key) { return replyCursorStore[key] || ''; },
      setProperty(key, value) { replyCursorStore[key] = String(value); },
      deleteProperty(key) { delete replyCursorStore[key]; },
    };
  },
};
context.GmailApp = { search() { return []; } };
context.listLeads = (options) => ({
  total: replyLeads.length,
  items: replyLeads.slice(Number(options.offset || 0), Number(options.offset || 0) + Number(options.limit || 100)),
});
context.withScriptLock_ = (_operation, callback) => callback();
context.claimGmailReplyCheckRun_ = () => ({ claimed: true, busy: false, lockToken: 'reply-check-test-lock' });
context.releaseGmailReplyCheckRun_ = () => true;
const firstReplySweep = context.checkRepliesForLeads({ maxThreads: 2, limit: 5, runtimeBudgetMs: 10000 });
assert(firstReplySweep.attemptedChecks === 2 && firstReplySweep.nextCursorOffset === 2, 'reply check should cap attempts and persist the next cursor');
const secondReplySweep = context.checkRepliesForLeads({ maxThreads: 2, limit: 5, runtimeBudgetMs: 10000 });
assert(secondReplySweep.cursorOffset === 2 && secondReplySweep.nextCursorOffset === 4, 'reply check should resume from the persisted cursor');
context.claimGmailReplyCheckRun_ = () => ({ claimed: false, busy: true });
const busyReplySweep = context.checkRepliesForLeads({ maxThreads: 2, limit: 5, runtimeBudgetMs: 10000 });
assert(busyReplySweep.busy === true && busyReplySweep.checked === 0, 'concurrent reply check should be skipped safely');
context.PropertiesService = originalPropertiesService;
context.GmailApp = originalGmailApp;
context.listLeads = originalListLeads;
context.withScriptLock_ = originalWithScriptLock;
context.claimGmailReplyCheckRun_ = originalClaimGmailReplyCheckRun;
context.releaseGmailReplyCheckRun_ = originalReleaseGmailReplyCheckRun;

const html = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
const code = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
const webApp = fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8');
const masters = fs.readFileSync(path.join(root, 'Masters.gs'), 'utf8');
const emailSource = fs.readFileSync(path.join(root, 'Email.gs'), 'utf8');
const operationsSource = fs.readFileSync(path.join(root, 'Operations.gs'), 'utf8');
const serperSource = fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8');
assert(code.includes('20260712_apps_script_full_workflow_v152_collection_mail_safety'), 'v152 app version missing');
assert(code.includes("'cursor_json'"), 'search job cursor column missing');
assert(code.includes("'lock_token'"), 'search job lock token column missing');
assert(code.includes('GMAIL_REPLY_CHECK_CURSOR'), 'Gmail reply cursor property missing');
assert(html.includes('id="gasUsagePanel"'), 'consumer GAS usage panel missing');
assert(html.includes('function renderGasUsagePanel()'), 'consumer GAS usage renderer missing');
assert(html.includes('一般Googleアカウント'), 'consumer account quota label missing');
assert(html.includes('1回の最大処理時間'), 'maximum runtime label missing');
assert(!html.includes('1回の実行予算'), 'ambiguous runtime budget label should not be shown');
assert(webApp.includes('function buildConsumerGasUsageStatus_'), 'consumer GAS usage status builder missing');
assert(manifest.includes('https://www.googleapis.com/auth/script.send_mail'), 'MailApp send scope missing');
assert(emailSource.includes('function getEmailSendTargetBlockReason_'), 'server-side email block reason helper missing');
assert(!emailSource.includes('input.force !== true'), 'email safety checks must not be bypassable with force');
assert(operationsSource.includes("listSheetRecords('search_jobs', { limit: 1000"), 'cloud job scan should include older queued jobs');
assert(serperSource.includes('ensureBackgroundJobTrigger_();'), 'new search jobs should ensure the cloud continuation trigger');
assert(serperSource.includes('function buildSourcePageLeadIndexFromRecords_'), 'source-page duplicate index builder missing');
assert(serperSource.includes('addLeadToSourcePageIndex_(leadIndex, lead);'), 'same-run source-page index update missing');
assert(!serperSource.includes('officialDomain && index.domains'), 'source-page collection must not deduplicate different facilities by domain alone');
assert(code.includes("clearRuntimeCaches_('leads');\n    return lead;"), 'lead creation should return the written UUID record without a full reread');
assert(html.includes('function searchJobDisplayProgress(job, parsedPayload)'), 'facility-level collection progress helper missing');
assert(html.includes("payload.total_candidates"), 'facility total should be used for collection progress');
assert(html.includes("api('advanceSearchJob', jobId, { maxItems: 1 })"), 'manual search job resume should pass the server arguments separately');
assert(manifest.includes('https://mail.google.com/'), 'GmailApp full mail scope missing');
assert(webApp.includes("action === 'importEmailTemplates'"), 'email template bulk import dispatch missing');
assert(webApp.includes("action === 'importSendHistories'"), 'send history bulk import dispatch missing');
assert(masters.includes('function importEmailTemplates'), 'email template bulk import API missing');
assert(emailSource.includes('function importSendHistories'), 'send history bulk import API missing');
assert(webApp.includes("action === 'importExcludedDomains'"), 'excluded domain bulk import dispatch missing');
assert(masters.includes('function importExcludedDomains'), 'excluded domain bulk import API missing');
assert(html.includes('HTTPS_PROTOCOL_PREFIX'), 'Apps Script-safe URL prefix helper missing');
assert(!html.includes('https://'), 'Index.html should not contain raw https:// literals that Apps Script can split in userCodeAppPanel');
assert(html.includes('<span>WEBサイト</span>'), 'website mini link should display WEBサイト label');
assert(!html.includes('<span>WEB</span><small>${escapeHtml(compactUrl(lead.website_url))}</small>'), 'website mini link should not display the compact domain');
assert(html.includes('id="leadLoadPanel"'), 'lead manual load panel missing');
assert(html.includes('flex-wrap: wrap'), 'lead load panel should wrap progress without squeezing text');
assert(html.includes('getStartupDashboardStats_') || webApp.includes('getStartupDashboardStats_'), 'startup should use cached/lightweight dashboard stats');
assert(html.includes('schedulePostStartupRefresh'), 'startup should schedule deferred dashboard refresh');
assert(html.includes('ensureTabDataLoaded'), 'tabs should lazy-load their own data');
assert(!html.includes('await Promise.all([leadLoadTask, loadTemplates(), loadMasters(), loadSearchResults(), loadOpsData(), loadEmailLeads(), loadDealLeads()])'), 'startup should not block on every secondary list');
assert(html.includes('TABLE_RENDER_BATCHES'), 'table render batch limits missing');
assert(html.includes('limitedTableRows'), 'limited table row renderer missing');
assert(html.includes('table-load-more-row'), 'table load more row UI missing');
assert(html.includes('renderActiveLoadedScreen'), 'active-screen only deferred renderer missing');
assert(html.includes('onCollectionSupportToggle'), 'collection support lazy load handler missing');
assert(html.includes('onAdminDisclosureToggle'), 'admin detail lazy load handler missing');
assert(html.includes('onGmailDisclosureToggle'), 'Gmail detail lazy load handler missing');
assert(html.includes("if (name === 'search') {\n            renderCollectionCommandCenter(state.serper || {});\n            return;"), 'search tab should not load collection logs before details open');
assert(html.includes("ensureDataLoaded('ops', () => loadOpsData({ render: false }))"), 'ops data should load without rendering every legacy table');
assert(html.includes('show-background-center-button'), 'background center button should not always overlay primary screens');
assert(html.includes('function updateBackgroundCenterButton'), 'background center visibility controller missing');
assert(html.includes('messageClearTimer'), 'success message auto-clear missing');
assert(html.includes('#formWorkPanel:empty'), 'empty form work panel should not render as a blank sticky card');
assert(html.includes('#dashboardSendQueue:empty'), 'empty dashboard dynamic card should be hidden until data renders');
assert(html.includes("renderSerper(initial.serper);\n          message('', '');"), 'global loading message should clear after primary dashboard render');
assert(html.includes('loadInitialReviewLeads()'), 'initial review-only lead load missing');
assert(html.includes("filter: 'review', mode: 'review', limit: INITIAL_REVIEW_LEAD_LIMIT"), 'initial load should request review leads only');
assert(html.includes('data-tab="reviewLeads"'), 'review leads sidebar menu missing');
assert(html.includes('id="reviewLeads"'), 'review leads section missing');
assert(html.includes('loadReviewLeadMenu'), 'review leads menu loader missing');
assert(html.includes('renderReviewLeadsScreen'), 'review leads renderer missing');
assert(html.includes('updateReviewLeadStatus'), 'review leads status action missing');
assert(html.includes('openReviewLeadsInList'), 'review leads list handoff missing');
assert(html.includes("if (name === 'reviewLeads')"), 'review leads tab should lazy-load its own queue');
assert(html.includes("data-shortcut-tab=\"reviewLeads\""), 'top shortcut should prioritize review leads');
assert(html.includes('<section id="reviewLeads" class="section active">'), 'app should start on review leads section');
assert(html.includes("let currentTab = 'reviewLeads';"), 'current tab should start as review leads');
assert(html.includes(`data-shortcut-tab="reviewLeads" onclick="showTab('reviewLeads')" aria-current="page"`), 'review leads shortcut should start active');
assert(html.includes('loadAllLeadsManually'), 'manual full lead load action missing');
assert(html.includes('leadLoadProgressBar'), 'lead load progress UI missing');
assert(html.includes('id="leadSendTemplate"'), 'lead email send UI missing');
assert(html.includes('sendSelectedLeadEmail'), 'lead email send handler missing');
assert(html.includes('isLeadSendTemplateOption'), 'lead detail send template filtering missing');
assert(html.includes("template.template_type !== 'initial'"), 'lead send template options should exclude non-initial templates');
assert(html.includes('本番テンプレートを自動選択'), 'lead send template auto-selection option missing');
assert(html.includes('id="meetingStart"'), 'calendar event UI missing');
assert(html.includes('createSelectedLeadCalendarEvent'), 'calendar event handler missing');
assert(html.includes('id="leadPager"'), 'lead pager UI missing');
assert(html.includes('lead-pagination-pages'), 'legacy lead pager page buttons missing');
assert(html.includes('chevronFirst'), 'legacy lead pager first icon missing');
assert(html.includes('全${formatNumber(total)}件'), 'legacy lead pager total display missing');
assert(html.includes('class="sidebar"'), 'sidebar layout missing');
assert(html.includes('authGate'), 'legacy login/auth gate missing');
assert(html.includes('login-card'), 'legacy login card styling missing');
assert(html.includes('renderAuthorizationGate'), 'authorization gate renderer missing');
assert(html.includes('class="tab nav-item active"'), 'sidebar nav item missing');
assert(html.includes('class="section-header"'), 'section header UI missing');
assert(html.includes('NAV_ICON_SVGS'), 'legacy lucide-style navigation icon map missing');
assert(html.includes('hydrateLegacyNavigationIcons'), 'legacy navigation icon hydration missing');
assert(html.includes('DASHBOARD_ICON_KEYS'), 'legacy dashboard card icon map missing');
assert(html.includes('dashboard-signal-icon'), 'legacy dashboard signal card icon slot missing');
assert(html.includes('dashboardIcon(iconKey)'), 'legacy dashboard card icon renderer missing');
assert(html.includes('legacy-component-parity'), 'legacy common component parity marker missing');
assert(html.includes('status-pill pill'), 'legacy StatusPill class alias missing');
assert(html.includes('overscroll-behavior-inline: contain'), 'legacy DataTable scroll behavior missing');
assert(html.includes('tr:focus-within td'), 'legacy DataTable focus state missing');
assert(html.includes('table-link-button.primary-action'), 'legacy table primary action button style missing');
assert(html.includes('.mini-button.active'), 'legacy mini button active style missing');
assert(html.includes('.button-link.secondary'), 'legacy secondary action button style missing');
assert(html.includes('LEGACY_UI_ICON_SVGS'), 'legacy utility icon map missing');
assert(html.includes('hydrateLegacyUtilityIcons'), 'legacy utility icon hydration missing');
assert(html.includes('list-filter-panel-icon'), 'legacy ListSearchFilters slider icon missing');
assert(html.includes('list-filter-actions'), 'legacy ListSearchFilters action row missing');
assert(html.includes('clearFormFilters'), 'legacy form filter clear action missing');
assert(html.includes('data-table-empty-cell'), 'legacy DataTable empty state missing');
assert(html.includes('table-wrap::-webkit-scrollbar'), 'legacy table scrollbar styling missing');
assert(html.includes('url-mini-link'), 'legacy URL mini link style missing');
assert(html.includes("legacyUiIcon('external')"), 'legacy URL external icon missing');
assert(html.includes('formUrlMiniLink'), 'legacy form URL mini link helper missing');
assert(html.includes('facility-copy-button'), 'legacy facility copy button style missing');
assert(html.includes('copyFormLeadFacilityName'), 'legacy facility copy handler missing');
assert(html.includes('selectNextFormLead'), 'legacy form work next action missing');
assert(html.includes('formStatusToneClient'), 'legacy form work status tone helper missing');
assert(html.includes("legacyUiIcon('mousePointer')"), 'legacy form work facility copy icon missing');
assert(html.includes("legacyUiIcon('clipboard')"), 'legacy form work clipboard icon missing');
assert(html.includes("legacyUiIcon('checkCircle')"), 'legacy form work sent icon missing');
assert(html.includes('.form-work-actions .form-url-link'), 'legacy form work URL link sizing missing');
assert(html.includes('button.primary,'), 'legacy primary button tone override missing');
assert(html.includes('design-system-polish'), 'global design polish layer missing');
assert(html.includes('--role-primary: #111827'), 'design color role token missing');
assert(html.includes('.status-pill,\n      .pill') && html.includes('font-size: 11px'), 'compact status pill rule missing');
assert(html.includes('table {\n        font-size: 12px;'), 'dense table typography rule missing');
assert(html.includes('.panel,\n      .template-sender-banner'), 'quiet panel/card rule missing');
assert(html.includes('v129-header-status-action-pill-rules'), 'v129 design rule layer missing');
assert(html.includes('grid-template-columns: minmax(0, 1fr) auto'), 'common section header layout missing');
assert(html.includes('.app-safety-strip[hidden]'), 'normal status strip hide rule missing');
assert(html.includes('if (!issues.length && sendingEnabled)'), 'normal app safety status should hide when healthy');
assert(html.includes('target.className = `app-safety-strip ${severityClass}`'), 'abnormal status tone class missing');
assert(html.includes('.lead-action-cell,\n      .table-action-row,\n      .template-action-row,\n      .job-result-actions,\n      .excluded-domain-actions'), 'table row action hierarchy selector missing');
assert(html.includes('max-width: min(100%, 13rem);'), 'strict pill max-width rule missing');
assert(html.includes('title="${escapeHtml(label)}"'), 'pill full-label title guard missing');
assert(html.includes("showTab('admin')"), 'dashboard API action should point to admin like legacy AppFrame');
assert(html.includes("icon: 'keyRound', label: 'OAuth Client'"), 'legacy Google credentials OAuth icon missing');
assert(html.includes("icon: 'refreshCw', label: 'Refresh Token'"), 'legacy Google credentials refresh icon missing');
assert(html.includes("icon: 'mailCheck', label: 'テスト宛先'"), 'legacy Google credentials test recipient icon missing');
assert(html.includes('onclick="refreshGmailAuthorizationStatus()"'), 'Gmail authorization status refresh button missing');
assert(html.includes('onclick="runGmailIntegrationCheck()"'), 'Gmail integration check button missing');
assert(html.includes('初期表示はGmail承認、送信枠、時間主導トリガーだけ'), 'Gmail overview should stay compact');
assert(html.includes('grid-template-columns: repeat(3, minmax(180px, 1fr))'), 'Gmail overview card grid spacing missing');
assert(html.includes('.settings-status-item small'), 'status card detail text should use compact small spacing');
assert(html.includes('.settings-status-item > div,\n      .readiness-item > div'), 'status card label/detail stack spacing guard missing');
assert(html.includes('.settings-status-item strong,\n      .readiness-item strong'), 'status card title wrapping guard missing');
assert(html.includes('.settings-status-item .pill,\n      .readiness-item .pill'), 'status card pill alignment guard missing');
assert(html.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'dashboard API list should use readable compact grid');
assert(html.includes('.dashboard-api-row > span:nth-child(2)'), 'dashboard API row text spacing guard missing');
assert(html.includes('.dashboard-api-row small') && html.includes('display: none;'), 'dashboard API details should be compact on desktop');
assert(html.includes('admin-primary-grid'), 'admin compact primary grid missing');
assert(html.includes('admin-accordion-list'), 'admin accordion list missing');
assert(html.includes('admin-inner-disclosure'), 'admin detail disclosure missing');
assert(html.includes('admin-automation-summary'), 'admin automation summary missing');
assert(html.includes('#admin .panel.stack'), 'admin panel spacing override missing');
assert(html.includes('.admin-disclosure-body') && html.includes('align-items: start'), 'admin accordion child card alignment guard missing');
assert(html.includes('.admin-disclosure-body > .panel') && html.includes('align-self: start'), 'admin accordion child panel stretch guard missing');
assert(html.includes('grid-template-columns: repeat(auto-fit, minmax(520px, 1fr))'), 'admin accordion detail cards should use readable two-column sizing');
assert(html.includes('.admin-disclosure-body > .panel:last-child:nth-child(odd)'), 'admin accordion odd child card span guard missing');
assert(html.includes('const adminLoadResults = await Promise.allSettled'), 'admin deferred render should tolerate partial data load failures');
assert(html.includes('--card-pad: 18px'), 'global card padding token missing');
assert(html.includes('.panel-body:not(.table-wrap)'), 'panel body spacing guardrail missing');
assert(html.includes('.panel.stack > .table-wrap'), 'panel stack table edge compensation missing');
assert(html.includes('.panel .settings-status-item'), 'nested card spacing guardrail missing');
assert(html.includes('.background-guide-panel .panel-body'), 'background guide layout override missing');
assert(html.includes('.exclusion-hero-panel:empty'), 'empty exclusion/send-ng hero panel should not render as a blank card');
assert(html.includes('.template-tag-card *'), 'template tag card text wrapping guard missing');
assert(html.includes('.sync-preview-card'), 'sync preview nested card guard missing');
assert(html.includes('.sync-preview-head'), 'sync metric card header spacing missing');
assert(html.includes('function syncMetricIcon(label)'), 'sync metric card should use icons instead of truncated label text');
assert(!html.includes('label.slice(0, 2)'), 'sync metric card should not render clipped label text as an icon');
assert(html.includes('.collection-status-item *'), 'collection status nested card text wrapping guard missing');
assert(html.includes('.panel:empty'), 'empty dynamic panel guard missing');
assert(html.includes('.stats-grid:empty'), 'empty stats grid guard missing');
assert(html.includes('.template-tag-panel:empty'), 'empty template tag panel guard missing');
assert(html.includes('.lead-quick-views:empty'), 'empty lead quick view guard missing');
assert(html.includes('.collection-command-center:empty'), 'empty collection command center guard missing');
assert(html.includes('.table-wrap:has(> table:empty)'), 'empty table wrapper guard missing');
assert(html.includes('sending-plan-panel:has(#sendingPlanGrid:empty):has(#sendingPlanTable:empty)'), 'empty sending plan panel guard missing');
assert(html.includes('formLeadEmptyState'), 'form lead empty state missing');
assert(html.includes('renderFormLeadEmptyState'), 'form lead empty renderer missing');
assert(html.includes('.dashboard-hero-grid') && html.includes('align-items: start'), 'dashboard card stretch guard missing');
assert(html.includes('list-view-settings-summary-copy'), 'list view settings accordion copy missing');
assert(html.includes('.prospecting-progress-empty > svg'), 'prospecting empty icon size guard missing');
assert(html.includes('.setup-step a svg'), 'setup guide external icon size guard missing');
assert(html.includes('.dashboard-focus-section:has(.dashboard-signal-grid:empty)'), 'empty dashboard focus section guard missing');
assert(html.includes('id="gmailOverviewPanel"'), 'Gmail compact overview panel missing');
assert(html.includes('gmail-accordion-list'), 'Gmail accordion list missing');
assert(html.includes('#gmail .panel.stack'), 'Gmail panel spacing override missing');
assert(html.includes('gmail-overview-status-grid'), 'Gmail overview status grid missing');
assert(html.includes('renderMailSendLockPanel();\n            ensureDataLoaded'), 'Gmail tab should render send lock before async data load');
assert(html.includes("legacyUiIcon('shieldCheck')}連携テスト"), 'legacy Gmail connection check icon button missing');
assert(html.includes('gmail-connection-status-grid'), 'legacy Gmail connection status grid missing');
assert(html.includes("legacyUiIcon('triangleAlert')"), 'legacy Gmail missing-scope alert icon missing');
assert(html.includes("icon: locked ? 'lock' : 'unlock'"), 'legacy mail send lock status icon missing');
assert(html.includes("legacyUiIcon('unlock')}ジョブ処理を確認"), 'legacy mail send unlock button icon missing');
assert(html.includes('messageCircleReply'), 'legacy Gmail reply check icon missing');
assert(html.includes("legacyUiIcon('messageCircleReply')}返信チェック"), 'legacy Gmail reply check button icon missing');
assert(html.includes("legacyUiIcon('refreshCw')}候補を確認"), 'legacy reply false-positive scan icon missing');
assert(html.includes("legacyUiIcon('rotateCcw')}候補を戻す"), 'legacy reply false-positive restore icon missing');
assert(html.includes('grid-template-columns: auto minmax(0, 1fr) auto;'), 'legacy reply note icon layout missing');
assert(html.includes('background: #fffbeb;'), 'legacy reply false-positive warning card tone missing');
assert(html.includes("legacyUiIcon('save')}保存する"), 'legacy calendar save icon missing');
assert(html.includes('templateActionDialogHost'), 'legacy template action dialog host missing');
assert(html.includes('openTemplateEditDialog'), 'legacy template edit dialog opener missing');
assert(html.includes('template-edit-dialog'), 'legacy template edit dialog shell missing');
assert(html.includes('template-test-dialog'), 'legacy template test dialog shell missing');
assert(html.includes('template-test-recipient'), 'legacy template test recipient card missing');
assert(html.includes('.template-test-layout,'), 'legacy template test dialog responsive rule missing');
assert(html.includes('runTemplateTestSend'), 'legacy template test dialog send action missing');
assert(html.includes("legacyUiIcon('send')}この内容でテスト送信"), 'legacy template test send icon button missing');
assert(html.includes("const TEMPLATE_TEST_FIXED_EMAIL = 'yuya1998nu@gmail.com'"), 'template test fixed recipient missing');
assert(html.includes("const TEMPLATE_TEST_FIXED_NAME = '村松侑哉'"), 'template test fixed recipient name missing');
assert(html.includes('会社名<input id="templateTestCompany" value="${escapeHtml(sampleLead.company_name || \'\')}" readonly>'), 'template test company should be fixed readonly');
assert(html.includes('appSafetyStrip'), 'legacy app safety strip missing');
assert(html.includes("icon: 'shieldCheck'"), 'abnormal safety strip shield issue icon missing');
assert(html.includes("icon: 'clock3'"), 'abnormal safety strip clock issue icon missing');
assert(html.includes("icon: 'mailCheck'"), 'abnormal safety strip Gmail issue icon missing');
assert(html.includes("icon: 'plug'"), 'abnormal safety strip plug issue icon missing');
assert(html.includes('settings-status-item with-icon'), 'legacy admin status icon row missing');
assert(html.includes('readiness-item with-icon'), 'legacy readiness icon row missing');
assert(html.includes('.readiness-item > div'), 'legacy readiness label/detail vertical stack missing');
assert(html.includes('.readiness-item small'), 'legacy readiness detail block style missing');
assert(html.includes('table-wrap table-email-leads'), 'legacy email-leads table wrapper missing');
assert(html.includes('.table-email-leads table'), 'legacy email-leads table layout missing');
assert(html.includes('.table-email-leads td'), 'legacy email-leads truncation missing');
assert(html.includes('prospecting-collection-tool'), 'legacy prospecting collection tool shell missing');
assert(html.includes('collection-command-center simple'), 'legacy collection command center should be first-class shell');
assert(html.includes('collection-simple-links'), 'legacy collection command header links missing');
assert(html.includes('collection-management-summary'), 'simplified collection management summary missing');
assert(html.includes('collection-overview-panel'), 'simplified collection overview panel missing');
assert(html.includes('collection-advanced-actions'), 'simplified collection advanced accordion missing');
assert(html.includes('collection-focus-panel'), 'collection focus card missing');
assert(html.includes('collection-focus-meta'), 'collection focus status chips missing');
assert(html.includes('collectionPrimaryAction'), 'collection primary action helper missing');
assert(html.includes('補助機能・詳細設定'), 'collection support accordion label missing');
assert(!html.includes('<div class="collection-stepper"'), 'collection stepper should not be visible in initial command center');
assert(!html.includes('<div class="collection-status-bar"'), 'collection status card bar should not be visible in initial command center');
assert(!html.includes('<aside class="collection-result-summary"'), 'collection result summary should be moved out of the initial command center');
assert(html.includes('collectionSupportDetails'), 'collection detail logs accordion missing');
assert(html.includes('openCollectionSupport'), 'collection detail logs opener missing');
assert(html.includes('updateCollectionAreaPreview'), 'collection area preview live updater missing');
assert(html.includes('収集ルート'), 'collection focus route label missing');
assert(html.includes('キーワード型'), 'keyword collection route missing');
assert(html.includes('サイト収集型'), 'source-page collection route missing');
assert(html.includes('collectionKeywordTerms'), 'keyword collection textarea missing');
assert(html.includes('buildKeywordCollectionQueries'), 'keyword collection query builder missing');
assert(html.includes('sourcePageUrls'), 'source-page URL textarea missing');
assert(html.includes('sourcePageUseSerperFallback'), 'source-page Serper fallback toggle missing');
assert(html.includes('.collection-overview-card svg'), 'collection overview icon size guard missing');
assert(html.includes('prospecting-activity-panel compact'), 'legacy collection activity panel should be compact');
assert(html.includes('prospecting-activity-detail-toggle'), 'legacy collection recent results should be collapsible');
assert(html.includes('prospecting-activity-empty-note'), 'legacy collection empty recent results note missing');
assert(html.includes('.prospecting-activity-empty-note svg'), 'legacy collection empty note icon should be size constrained');
assert(html.includes("legacyUiIcon('mapPinned')") || html.includes('mapPinned'), 'legacy genre-area collection icon missing');
assert(html.includes("legacyUiIcon('globe2')") || html.includes('globe2'), 'legacy source-page collection icon missing');
assert(code.includes("['serper', 'search_job', 'prospecting', 'source_page']"), 'source-page leads should be included in review filter');
assert(fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8').includes('processSourcePageSearchItem_'), 'source-page search processor missing');
assert(html.indexOf('id="collectionCommandCenter"') < html.indexOf('id="searchActivityPanel"'), 'step collection manager should precede detailed activity');
assert(html.indexOf('id="collectionCommandCenter"') < html.indexOf('id="searchOverview"'), 'legacy collection tool should appear before support overview cards');
assert(html.includes("item.icon || 'rocket'"), 'legacy readiness default rocket icon missing');
assert(html.includes("icon: 'database', label: 'Google Sheets'"), 'legacy admin database status item missing');
assert(html.includes("icon: 'searchCheck', label: 'Serper'"), 'legacy admin Serper status item missing');
assert(html.includes("icon: 'serverCog', label: 'GAS分割処理'"), 'legacy admin server cog status item missing');
assert(html.includes("legacyUiIcon('keyRound')"), 'legacy Serper setup key icon missing');
assert(html.includes("legacyUiIcon('refreshCw')}残量確認"), 'legacy Serper refresh icon missing');
assert(html.includes("api('refreshSerperCredits')"), 'Serper remaining credit refresh should call the server credit checker');
assert(fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8').includes('function refreshSerperCredits'), 'Serper credit refresh API missing');
assert(fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8').includes('SERPER_CREDIT_ENDPOINTS'), 'Serper credit endpoint fallback list missing');
assert(html.includes("legacyUiIcon('searchCheck')}検索APIテスト"), 'legacy Serper search test icon missing');
assert(html.includes("legacyUiIcon('serverCog')}<span>環境変数ではなくApps ScriptのPropertiesService"), 'legacy Serper setup command icon missing');
assert(!html.includes('aria-hidden=\"true\">SK</span>'), 'legacy Serper summary text badge should be icon');
assert(!html.includes('aria-hidden=\"true\">KY</span>'), 'legacy Serper setup text badge should be icon');
assert(!html.includes('aria-hidden=\"true\">PS</span>'), 'legacy Serper command text badge should be icon');
assert(html.includes('automationCardHeader'), 'legacy automation card icon header helper missing');
assert(html.includes('automation-card-title'), 'legacy automation card title icon layout missing');
assert(html.includes('automation-status-grid'), 'legacy email discovery status grid missing');
assert(html.includes("automationCardHeader('mailSearch'"), 'legacy email discovery header icon missing');
assert(html.includes("icon: 'mailSearch', label: '自動取得'"), 'legacy email discovery status item missing');
assert(html.includes("icon: 'timerReset', label: '再実行スキップ'"), 'legacy email discovery timer reset item missing');
assert(html.includes("icon: 'history', label: '最終更新'"), 'legacy email discovery history item missing');
assert(html.includes('appRouteProgress'), 'legacy route progress missing');
assert(html.includes('toolbar-shortcut'), 'legacy top shortcut bar missing');
assert(html.includes('data-shortcut-tab="emailLeads"'), 'legacy top shortcut email tab missing');
assert(!html.includes('class="utility-action"'), 'top shortcut bar should not include GAS utility actions');
assert(html.includes("legacyUiIcon('eye')}差し込み後を確認"), 'legacy email preview eye icon missing');
assert(html.includes("legacyUiIcon('send')}この内容で1件送信"), 'legacy email preview send icon missing');
assert(html.includes("legacyUiIcon('send')}対象リストを確認して自動送信"), 'legacy email batch send icon missing');
assert(html.includes('data-ui-icon="download"></span>CSV出力'), 'legacy histories CSV download icon missing');
assert(html.includes('data-ui-icon="send"></span>送信プレビューへ'), 'legacy histories send preview icon missing');
assert(!html.includes("${legacyUiIcon('download')}CSV出力"), 'histories CSV button should not show raw template text');
assert(!html.includes("${legacyUiIcon('send')}送信プレビューへ"), 'histories send preview button should not show raw template text');
assert(html.includes("['listPlus', '今月追加'"), 'legacy analytics list plus icon missing');
assert(html.includes("legacyUiIcon(step.icon || 'barChart3')"), 'legacy analytics funnel icons missing');
assert(html.includes("['shieldAlert', '送信NG'"), 'legacy analytics risk shield icon missing');
assert(html.includes("['trendingDown', '失注'"), 'legacy analytics risk trend icon missing');
assert(html.includes('backgroundToastStack'), 'legacy background job toast stack missing');
assert(html.includes('background-center-button'), 'legacy background center button missing');
assert(html.includes('background-guide-panel'), 'legacy background progress guide panel missing');
assert(html.includes('data-ui-icon="listChecks"'), 'legacy background progress list checks icon missing');
assert(html.includes('data-ui-icon="arrowLeft"'), 'legacy background progress back icon missing');
assert(html.includes('prospectingProgressDashboard'), 'legacy ProspectingProgressDashboard host missing');
assert(html.includes('renderProspectingProgressDashboard'), 'legacy ProspectingProgressDashboard renderer missing');
assert(html.includes('prospecting-progress-dashboard'), 'legacy ProspectingProgressDashboard shell missing');
assert(html.includes('prospecting-progress-stat'), 'legacy ProspectingProgressDashboard stat tiles missing');
assert(html.includes('prospecting-details-section'), 'legacy ProspectingProgressDashboard details missing');
assert(html.includes("listChecks: iconSvg"), 'legacy list checks icon definition missing');
assert(html.includes("arrowLeft: iconSvg"), 'legacy arrow left icon definition missing');
assert(html.includes("legacyUiIcon('loaderCircle')"), 'legacy background toast loader icon missing');
assert(html.includes("legacyUiIcon('xCircle')"), 'legacy background toast failure icon missing');
assert(html.includes('background-toast-spin'), 'legacy background toast spinner animation missing');
assert(html.includes('background-toast-resume'), 'legacy background toast action class missing');
assert(html.includes('background-toast-found-list'), 'legacy background toast found list missing');
assert(html.includes('displayBackgroundJobLabel'), 'legacy background toast label cleanup missing');
assert(html.includes('displayBackgroundJobMessage'), 'legacy background toast message cleanup missing');
assert(html.includes('backgroundOverviewPanel'), 'legacy background overview panel missing');
assert(html.includes('background-overview-kpis'), 'legacy background overview KPI UI missing');
assert(html.includes('renderLegacyBackgroundOverview'), 'legacy background overview renderer missing');
assert(html.includes('setBackgroundOverviewView'), 'legacy background overview filters missing');
assert(html.includes('syncImportPanel'), 'legacy sync import panel missing');
assert(html.includes('sync-preview-metrics'), 'legacy sync preview metrics missing');
assert(html.includes('.grid.sync-page-grid'), 'legacy sync page grid should keep import panel from collapsing');
assert(html.includes('sync-rule-panel'), 'legacy sync rule panel missing');
assert(html.includes('renderLegacySyncImportPanel'), 'legacy sync import renderer missing');
assert(html.includes('handleSyncImportFile'), 'legacy sync file upload handler missing');
assert(html.includes('runLegacySyncImport'), 'legacy sync import action missing');
assert(html.includes('addJobResultLead'), 'legacy job result add action missing');
assert(html.includes('reviewSelectedJobResults'), 'legacy job result bulk review action missing');
assert(html.includes('excludeJobResult'), 'legacy job result exclude action missing');
assert(html.includes('toggleAllVisibleJobResults'), 'legacy job result selection action missing');
assert(html.includes('jobResultEmail_'), 'legacy job result editable email missing');
assert(html.includes('jobResultRenderLimit'), 'legacy job result render limit state missing');
assert(html.includes('reviewVisibleEmailJobResults'), 'legacy visible email review action missing');
assert(html.includes('reviewAllEmailJobResults'), 'legacy all email review action missing');
assert(html.includes('reviewAllUrlJobResults'), 'legacy all URL review action missing');
assert(html.includes('loadMoreJobResults'), 'legacy job result load more action missing');
assert(html.includes('job-results-load-more'), 'legacy job result load more UI missing');
assert(html.includes("legacyUiIcon('squarePen')"), 'legacy job result edit icon missing');
assert(html.includes("legacyUiIcon('xCircle')"), 'legacy job result exclude icon missing');
assert(html.includes('grid-template-columns: repeat(5, minmax(0, 1fr));'), 'legacy job result category grid missing');
assert(html.includes('grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));'), 'legacy job result card grid missing');
assert(html.includes('content-visibility: auto;'), 'legacy job result card virtualization hint missing');
assert(code.includes("'review_status'"), 'search result review status schema missing');
assert(fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8').includes('addSearchResultToLead'), 'search result add API missing');
assert(webApp.includes('reviewSearchResults'), 'search result review API dispatch missing');
assert(html.includes('gmailReplyCheckPanel'), 'legacy Gmail reply check panel missing');
assert(html.includes('adminGmailReplyCheckPanel'), 'legacy admin Gmail reply check panel missing');
assert(html.includes('calendarAutoCreateSettingsPanel'), 'legacy calendar auto-create settings panel missing');
assert(html.includes('scanReplyFalsePositives'), 'legacy reply false-positive scan missing');
assert(fs.readFileSync(path.join(root, 'Operations.gs'), 'utf8').includes('listReplyFalsePositiveCandidates'), 'reply false-positive API missing');
assert(html.includes('row-send-ng'), 'lead row status styling missing');
assert(html.includes('dashboard-hero-grid'), 'legacy-style dashboard hero missing');
assert(html.includes('dashboard-signal-grid'), 'legacy-style dashboard signals missing');
assert(html.includes('dashboardMailSendingControl'), 'legacy mail sending control card missing');
assert(html.includes('dashboardProspectingStatus'), 'legacy dashboard prospecting status card missing');
assert(html.includes('toggleMailSendingControl'), 'legacy mail sending toggle missing');
assert(code.includes('mail_sending_control'), 'mail sending control default setting missing');
assert(html.includes('lead-quick-views'), 'lead quick views missing');
assert(html.includes('lead-kpi-grid'), 'lead KPI grid missing');
assert(html.includes('leadBulkActionBar'), 'legacy lead bulk action bar missing');
assert(html.includes('leadDetailDialog'), 'legacy lead detail dialog missing');
assert(html.includes('quick-lead-dialog'), 'legacy quick lead dialog shell missing');
assert(html.includes('quick-dialog-header-actions'), 'legacy quick lead dialog header actions missing');
assert(html.includes('leadDialogStatusPills'), 'legacy quick lead dialog status pills missing');
assert(html.includes('renderLeadDialogStatusPills'), 'legacy quick lead dialog status renderer missing');
assert(html.includes('prospecting-review-guide'), 'legacy review guide missing');
assert(html.includes('table-link-button'), 'legacy lead table action button missing');
assert(html.includes('lead-select-cell'), 'legacy lead table select cell missing');
assert(html.includes('templateSafetyPanel'), 'legacy template safety panel missing');
assert(html.includes('templateSenderBanner'), 'legacy template sender banner missing');
assert(html.includes('template-create-panel'), 'legacy template create panel shell missing');
assert(html.includes('templateWorkbenchDetails'), 'simplified template workbench accordion missing');
assert(html.includes('templateTagDetails'), 'simplified template tag accordion missing');
assert(html.includes('template-example-disclosure'), 'simplified template example accordion missing');
assert(html.includes('template-sample-actions'), 'legacy template sample actions missing');
assert(html.includes('templateSubmitButton'), 'legacy template save button state missing');
assert(html.includes('templateNewButton'), 'legacy template create-another action missing');
assert(html.includes('updateTemplateFormState'), 'legacy template form state renderer missing');
assert(html.includes('startNewTemplate'), 'legacy template start new action missing');
assert(html.includes('フォーム営業用は件名なし可'), 'legacy form template subject optional hint missing');
assert(html.includes('保存済みテンプレートを更新'), 'legacy saved template update label missing');
assert(html.includes('sendNgHero'), 'legacy send NG hero missing');
assert(html.includes('exclusionsHero'), 'legacy exclusions hero missing');
assert(html.includes('excluded-domain-manager'), 'legacy ExcludedDomainManager shell missing');
assert(html.includes('exclusion-workbench'), 'legacy ExcludedDomainManager workbench missing');
assert(html.includes('excludedDomainSearch'), 'legacy excluded domain search missing');
assert(html.includes('excludedDomainStatus'), 'legacy excluded domain status filter missing');
assert(html.includes("api('listExcludedDomains', { limit: 300, includeInactive: true })"), 'excluded domains manager should load inactive rows for status filter');
assert(html.includes('renderExcludedDomainManager'), 'legacy ExcludedDomainManager renderer missing');
assert(html.includes('editExcludedDomain'), 'legacy excluded domain edit action missing');
assert(html.includes('stopExcludedDomain'), 'legacy excluded domain stop action missing');
assert(html.includes('reactivateExcludedDomain'), 'legacy excluded domain reactivate action missing');
assert(html.includes('formOutreachSummary'), 'legacy form outreach summary missing');
assert(html.includes('form-work-panel'), 'form outreach panel missing');
assert(html.includes('form-board-grid'), 'legacy form board layout missing');
assert(html.includes('searchOverview'), 'Serper search overview missing');
assert(html.includes('searchActivityPanel'), 'legacy prospecting activity panel missing');
assert(html.includes('collectionCommandCenter'), 'legacy collection command center missing');
assert(html.includes('serperKeyManagerPanel'), 'legacy Serper key manager panel missing');
assert(html.includes('api-key-summary'), 'legacy Serper key summary missing');
assert(html.includes('searchUsageTable'), 'Serper usage table missing');
assert(html.includes('opsReadinessPanel'), 'legacy operations readiness panel missing');
assert(html.includes('opsStatusGrid'), 'legacy operations status grid missing');
assert(html.includes('jobTable'), 'operations job table missing');
assert(html.includes('syncLogTable'), 'operations sync log table missing');
[
  'backgroundJobs',
  'emailLeads',
  'sending',
  'histories',
  'deals',
  'analytics',
  'sync',
  'gmail',
  'admin',
  'sendNg',
  'exclusions',
].forEach((tabId) => {
  assert(html.includes(`data-tab="${tabId}"`), `legacy nav tab missing: ${tabId}`);
  assert(html.includes(`id="${tabId}"`), `legacy section missing: ${tabId}`);
});
[
  'backgroundActivity',
  'errors',
  'ops',
].forEach((sectionId) => {
  assert(html.includes(`id="${sectionId}"`), `legacy supporting section missing: ${sectionId}`);
});
[
  'backgroundJobTable',
  'backgroundActivityTable',
  'emailLeadTable',
  'sendingPlanTable',
  'sendHistoryScreenTable',
  'dealTable',
  'analyticsFunnel',
  'syncScreenTable',
  'gmailStatusPills',
  'adminReadinessPanel',
  'errorDetailsTable',
].forEach((marker) => {
  assert(html.includes(marker), `legacy expanded UI marker missing: ${marker}`);
});
[
  'emailPreviewPanel',
  'templateTestRecipientPanel',
  'jobResultsReviewPanel',
  'gmailConnectionCheckPanel',
  'mailSendLockPanel',
  'googleCredentialSummaryPanel',
  'adminReadinessRunnerPanel',
  'schemaStatusPanel',
  'renderAdminReadinessRunnerPanel',
  'renderSchemaStatusPanel',
  'runAdminReadinessCheck',
  'refreshSchemaStatus',
  'adminAutomationSettingsPanel',
  'customFieldDefinitionPanel',
  'leadListViewSettingsPanel',
  'renderListViewSettingsPanel',
  'renderCustomFieldDefinitionPanel',
  'saveCustomFieldDefinitionFromForm',
  'templateTagMenuPanel',
  'template-tag-panel',
  'renderTemplateTagMenuPanel',
  'insertTemplateTag',
  'applyTemplateSample',
  'renderTemplateVariablePreview',
  'renderBackgroundJobWidgets',
  'goBackFromBackgroundCenter',
  'dismissBackgroundToast',
  'duplicateLeadManagerPanel',
  'adminErrorDetailsPanel',
  'renderBackgroundActivityScreen',
  'renderErrorDetailsScreen',
  'collection-tab-panel',
  'autoCollectionEnabled',
  'submitCollectionAreaSearch',
  'submitCollectionKeywordSearch',
  'importCollectionCsv',
  'saveSourcePageCollectionSettings',
  'genreManagerPanel',
  'reasonMasterManagerPanel',
  'renderGenreManagerPanel',
  'renderReasonMasterManagerPanel',
  'saveGenreFromForm',
  'saveReasonFromForm',
  'leadStatusControlPanel',
  'renderLeadStatusControlPanel',
  'quick-status-layout',
  'status-lock-box',
  'leadSendNgReason',
  'leadFormStatus',
  'meeting-form',
  'leadMeetLink',
  'leadHistoryPanel',
  'quick-history-section',
  'quick-history-item',
  'loadLeadSendHistoriesForDialog',
  'renderLeadHistoryPanel',
  'leadFormHistoryPanel',
  'quick-form-history-summary',
  'formHistoryItemsClient',
  'copyLeadFormHistoryBody',
  'dialog-eyebrow',
  'data-ui-icon="x"',
  'form-sent-check',
  'toggleFormLeadSent',
  'markFormLeadSent',
  'unmarkFormLeadSent',
  'formSendSummaryCell',
  "filter: 'form_all'",
  'leadDangerPanel',
  'renderLeadDangerPanel',
  'excludeSelectedLeadDomainAndArchive',
  'archiveSelectedLeadFromDangerZone',
  'leadDuplicatePanel',
  'loadLeadDuplicateCandidatesForDialog',
  'renderLeadDuplicatePanel',
  'keepCurrentLeadFromDuplicatePanel',
  'keepExistingLeadFromDuplicatePanel',
  'renderTemplateProductionStatus',
  'renderTemplateActionCell',
  'sendTemplateTestFromRow',
  'toggleTemplateProduction',
  'deleteTemplateFromRow',
  "legacyUiIcon('pencil')",
  "legacyUiIcon('eye')",
  "legacyUiIcon('power')",
  "legacyUiIcon('trash2')",
  "legacyUiIcon('save')",
  'mail-sending-control',
  'mail-sending-status',
  'dashboard-prospecting-stats',
  'renderDashboardMailSendingControl',
  'renderDashboardProspectingStatus',
  'dialog-backdrop',
  'dialog-panel',
  'send-target-preview',
  'emailBatchConfirmOpen',
  'openEmailBatchConfirm',
  'runConfirmedEmailBatch',
  '対象リストを確認して自動送信',
  '対象リストを自動送信しますか？',
  'gmailTestSendHistoryPanel',
  'renderGmailTestSendHistoryPanel',
  'Gmailテスト送信履歴',
  'isTestSendHistory',
  'template-variable-empty-list',
  "template-variable-card ${item.empty ? 'empty' : ''}",
  '空欄タグ',
  '空欄なし',
  'template-body-diff-panel',
  'template-subject-diff-panel',
  'template-empty-token',
  'template-filled-token',
  'renderTemplateSubjectDiffPreview',
  'renderTemplateBodyDiffPreview',
  'renderTemplateWithVariableMarkers',
  'collectEmptyTemplateContexts',
  '件名差分',
  'テンプレート件名',
  '送信時件名',
  '件名内の差し込みタグ',
  '本文差分',
  'historyFilterPanel',
  'history-filter-panel',
  'filteredSendHistories',
  'exportFilteredSendHistoriesCsv',
  'renderHistoryActionCell',
  '本文/Gmail',
  '履歴区分',
  '絞り込み中',
  'analytics-source-panel',
  'analyticsSourceGrid',
  'analyticsRiskStrip',
  'analyticsDailyTable',
  'analyticsMonthlyTable',
  'analyticsTemplateTable',
  'buildClientAnalyticsData',
  'buildClientAnalyticsTemplateRows',
  'メール文別返信率',
  'テンプレート別の反応',
  'mail-copy-cell',
].forEach((marker) => {
  assert(html.includes(marker), `legacy UI marker missing: ${marker}`);
});
assert(emailSource.includes("send_type: 'テスト送信'"), 'test send history type missing');
assert(emailSource.includes("const TEMPLATE_TEST_FIXED_EMAIL_ = 'yuya1998nu@gmail.com'"), 'server test send fixed recipient missing');
assert(emailSource.includes("const TEMPLATE_TEST_FIXED_NAME_ = '村松侑哉'"), 'server test send fixed name missing');
assert(emailSource.includes("error_message: errorMessage"), 'test send failure reason history missing');
assert(emailSource.includes("return withScriptLock_('sendLeadEmail'"), 'sendLeadEmail should keep send/check/update in one script lock');
assert(!emailSource.includes('sendLeadEmail:afterSend'), 'sendLeadEmail should not split post-send update into a second lock');
assert(emailSource.includes("send_result: PRODUCTION_SEND_RESERVED_RESULT_"), 'production history reservation must be written before delivery');
assert(emailSource.indexOf("send_result: PRODUCTION_SEND_RESERVED_RESULT_") < emailSource.indexOf('MailApp.sendEmail({'), 'production reservation must precede MailApp delivery');
assert(emailSource.includes('function sendLeadEmailBatch('), 'server-side email batch function missing');
assert(emailSource.includes('assertProductionMailDeliveryAllowed_(true);'), 'server-side batch must enforce send control and send window');
assert(html.includes("api('sendLeadEmailBatch'"), 'client batch should use one server-side batch request');
assert(html.includes("['1回上限', `${formatNumber(batchLimit)}件`]"), 'send plan should show the configured batch limit');
assert(html.includes('1回${formatNumber(batchLimit)}件まで'), 'send limit pill should use the configured batch limit');
assert(emailSource.includes('getPriorSuccessfulEmailBlockReason_'), 'prior successful send guard missing');
assert(emailSource.includes('buildMailSendSafetyContext_'), 'send history safety context missing');
assert(emailSource.includes('sentEmails[email] = true'), 'same email successful history guard missing');
assert(emailSource.includes('reservedEmails[email] = true'), 'pending send reservation email guard missing');
assert(emailSource.includes("String(history.send_type || '').indexOf('テスト') === -1"), 'test sends should not block production send history guard');
assert(emailSource.includes('function validateEmailSendTemplate_'), 'server-side send template validation missing');
assert(emailSource.includes('フォーム用テンプレートはメール送信できません。'), 'server should block form templates for MailApp sends');
assert(emailSource.includes('本番ONのテンプレートだけメール送信できます。'), 'server should block draft templates for MailApp sends');
assert(emailSource.includes('テンプレートと営業先のジャンルが一致していません。'), 'server should block genre-mismatched templates');
assert(!emailSource.includes('|| active[0] || null'), 'production template lookup must not fall back to mismatched first template');
assert(emailSource.includes('function countSuccessfulProductionSends_'), 'production send counter helper missing');
assert(webApp.includes('countSuccessfulProductionSends_(sendHistories, today)'), 'dashboard sentToday should exclude test sends');
assert(webApp.includes('countSuccessfulProductionSends_(sendHistories, month)'), 'dashboard sentMonth should exclude test sends');
assert(code.includes('isSuccessfulProductionSendHistory_(history)'), 'latest successful send lookup should exclude test histories');
assert(masters.includes('mailSendSafety: buildMailSendSafetyContext_()'), 'master context should include mail send safety history');
assert(html.includes('const seenEmails = new Set();'), 'email batch should dedupe same recipient in the client preview');
assert(code.includes("createExpectedOperationError_('Duplicate lead exists:"), 'expected duplicate should not be logged as a system error');
assert(html.includes("Number(lead.send_count || 0) > 0 || String(lead.status || '').includes('送信済み')"), 'client email eligibility should block previously sent leads');
assert(html.includes('会社名') && html.includes('差し込みメニュー'), 'legacy template tag menu labels missing');
assert(emailSource.includes("'会社名'"), 'server Japanese template variables missing');
assert(masters.includes("templateType !== 'form' && !subject"), 'form template subject optional server rule missing');
[
  'custom_field_definitions',
  'list_view_settings',
].forEach((marker) => {
  assert(code.includes(marker), `legacy custom/list schema missing: ${marker}`);
});
const refreshAllBlock = html.slice(html.indexOf('async function refreshAll'), html.indexOf('async function showStartupError'));
assert(refreshAllBlock.includes("api('getInitialData')"), 'refreshAll should load initial data');
assert(!refreshAllBlock.includes("api('getAuthorizationStatus')"), 'refreshAll should not preflight authorization');
assert(html.includes("limit: INITIAL_REVIEW_LEAD_LIMIT, quiet: true"), 'initial review lead load should not lock global navigation');
assert(html.includes("loadOptions.quiet ? await apiQuiet('listLeads', request) : await api('listLeads', request)"), 'loadLeads should support quiet mode');
const navHtml = html.slice(html.indexOf('<nav class="tabs">'), html.indexOf('</nav>', html.indexOf('<nav class="tabs">')));
assert(!navHtml.includes('tab nav-item secondary'), 'AppFrame sidebar should expose only the legacy primary menu items');
[
  'data-tab="leads"',
  'data-tab="reviewLeads"',
  'data-tab="search"',
  'data-tab="backgroundJobs"',
  'data-tab="emailLeads"',
  'data-tab="forms"',
  'data-tab="dashboard"',
  'data-tab="analytics"',
  'data-tab="sync"',
  'data-tab="sendNg"',
  'data-tab="exclusions"',
  'data-tab="templates"',
  'data-tab="sending"',
  'data-tab="histories"',
  'data-tab="deals"',
  'data-tab="gmail"',
  'data-tab="admin"',
].reduce((lastIndex, marker) => {
  const index = navHtml.indexOf(marker);
  assert(index > lastIndex, `AppFrame nav order mismatch near ${marker}`);
  return index;
}, -1);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
for (const [index, script] of scripts.entries()) {
  new Function(script);
  console.log(`Index.html script ${index + 1} OK`);
}

const initialDataBlock = webApp.slice(webApp.indexOf('function getInitialData'), webApp.indexOf('function getStartupDashboardStats_'));
assert(!initialDataBlock.includes('setup()'), 'getInitialData should not run setup on every startup');
assert(initialDataBlock.includes('getStartupSerperInfo_()'), 'getInitialData should use lightweight Serper startup info');
assert(webApp.includes('function getReferenceData'), 'reference data should be loaded separately from startup');
assert(webApp.includes('function getGmailAuthorizationStatus'), 'Gmail authorization status API missing');
assert(webApp.includes('function checkGmailIntegration'), 'Gmail integration check API missing');
assert(webApp.includes('function isAuthorizationRequiredStatus_'), 'authorization status strict helper missing');
assert(!webApp.includes("status.indexOf('REQUIRED') !== -1"), 'NOT_REQUIRED must not be treated as REQUIRED');
assert(webApp.includes("'https://www.googleapis.com/auth/script.send_mail'"), 'server Gmail required scopes should include MailApp send scope');
assert(webApp.includes("'https://mail.google.com/'"), 'server Gmail required scopes should include GmailApp mail scope');
assert(webApp.includes("readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'leads'))"), 'dashboard should read all lead rows');
assert(webApp.includes('dashboard_stats_v4'), 'dashboard cache key should include consumer GAS usage payload');
[
  'saveEmailTemplate',
  'importEmailTemplates',
  'setEmailTemplateProduction',
  'setMailSendingControl',
  'saveNgMaster',
  'saveExcludedDomain',
  'importExcludedDomains',
  'listGenres',
  'saveGenre',
  'deleteGenre',
  'listReasons',
  'saveReason',
  'updateReason',
  'saveSerperApiKey',
  'listSerperApiKeyManager',
  'refreshSerperCredits',
  'saveSerperApiKeyEntry',
  'updateSerperApiKeyEntry',
  'deleteSerperApiKeyEntry',
  'listLeadSendHistories',
  'importSendHistories',
  'listLeadDuplicateCandidates',
  'markLeadFormSent',
  'unmarkLeadFormSent',
  'checkRepliesForLeads',
  'createCalendarEventForLead',
  'importLeadsFromCsv',
  'createSpreadsheetBackup',
  'saveCustomFieldDefinition',
  'updateCustomFieldDefinition',
  'saveListViewSettings',
  'prepareLeadMigration',
  'writeLeadMigrationRows',
  'finalizeLeadMigration',
  'getSchemaStatus',
].forEach((action) => {
  assert(webApp.includes(`action === '${action}'`), `doPost action missing: ${action}`);
});
assert(masters.includes('function setEmailTemplateProduction'), 'template production API missing');

console.log('smoke-test OK');
