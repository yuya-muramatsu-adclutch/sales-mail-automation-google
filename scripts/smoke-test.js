const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const gsFiles = fs.readdirSync(root).filter((file) => file.endsWith('.gs')).sort();
const context = {
  console,
  Utilities: {
    formatDate(date) {
      return new Date(date).toISOString();
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

const ng = context.normalizeNgMasterInput_({
  email: 'block@example.com',
  reason: '配信停止',
});
assert(ng.domain === 'example.com', 'NG email domain failed');

const job = context.normalizeSearchJobInput_({
  job_type: 'lead_official_site',
  leadId: 'lead-1',
  daily_limit: 100,
  job_limit: 5,
});
assert(job.items.length === 1 && job.items[0].lead_id === 'lead-1', 'search job lead item failed');

const html = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
const code = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
assert(code.includes('20260705_apps_script_full_workflow_v41_appframe_nav_parity'), 'v41 app version missing');
assert(html.includes('id="leadSendTemplate"'), 'lead email send UI missing');
assert(html.includes('sendSelectedLeadEmail'), 'lead email send handler missing');
assert(html.includes('id="meetingStart"'), 'calendar event UI missing');
assert(html.includes('createSelectedLeadCalendarEvent'), 'calendar event handler missing');
assert(html.includes('id="leadPager"'), 'lead pager UI missing');
assert(html.includes('全 ${total} 件中'), 'lead pager total display missing');
assert(html.includes('class="sidebar"'), 'sidebar layout missing');
assert(html.includes('authGate'), 'legacy login/auth gate missing');
assert(html.includes('login-card'), 'legacy login card styling missing');
assert(html.includes('renderAuthorizationGate'), 'authorization gate renderer missing');
assert(html.includes('class="tab nav-item active"'), 'sidebar nav item missing');
assert(html.includes('tab nav-item secondary'), 'secondary sidebar nav item missing');
assert(html.includes('class="section-header"'), 'section header UI missing');
assert(html.includes('appSafetyStrip'), 'legacy app safety strip missing');
assert(html.includes('appRouteProgress'), 'legacy route progress missing');
assert(html.includes('toolbar-shortcut'), 'legacy top shortcut bar missing');
assert(html.includes('backgroundToastStack'), 'legacy background job toast stack missing');
assert(html.includes('background-center-button'), 'legacy background center button missing');
assert(html.includes('backgroundOverviewPanel'), 'legacy background overview panel missing');
assert(html.includes('background-overview-kpis'), 'legacy background overview KPI UI missing');
assert(html.includes('renderLegacyBackgroundOverview'), 'legacy background overview renderer missing');
assert(html.includes('setBackgroundOverviewView'), 'legacy background overview filters missing');
assert(html.includes('syncImportPanel'), 'legacy sync import panel missing');
assert(html.includes('sync-preview-metrics'), 'legacy sync preview metrics missing');
assert(html.includes('renderLegacySyncImportPanel'), 'legacy sync import renderer missing');
assert(html.includes('handleSyncImportFile'), 'legacy sync file upload handler missing');
assert(html.includes('runLegacySyncImport'), 'legacy sync import action missing');
assert(html.includes('addJobResultLead'), 'legacy job result add action missing');
assert(html.includes('reviewSelectedJobResults'), 'legacy job result bulk review action missing');
assert(html.includes('excludeJobResult'), 'legacy job result exclude action missing');
assert(html.includes('toggleAllVisibleJobResults'), 'legacy job result selection action missing');
assert(html.includes('jobResultEmail_'), 'legacy job result editable email missing');
assert(code.includes("'review_status'"), 'search result review status schema missing');
assert(fs.readFileSync(path.join(root, 'Serper.gs'), 'utf8').includes('addSearchResultToLead'), 'search result add API missing');
assert(fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8').includes('reviewSearchResults'), 'search result review API dispatch missing');
assert(html.includes('gmailReplyCheckPanel'), 'legacy Gmail reply check panel missing');
assert(html.includes('adminGmailReplyCheckPanel'), 'legacy admin Gmail reply check panel missing');
assert(html.includes('calendarAutoCreateSettingsPanel'), 'legacy calendar auto-create settings panel missing');
assert(html.includes('scanReplyFalsePositives'), 'legacy reply false-positive scan missing');
assert(fs.readFileSync(path.join(root, 'Operations.gs'), 'utf8').includes('listReplyFalsePositiveCandidates'), 'reply false-positive API missing');
assert(html.includes('row-send-ng'), 'lead row status styling missing');
assert(html.includes('dashboard-hero-grid'), 'legacy-style dashboard hero missing');
assert(html.includes('dashboard-signal-grid'), 'legacy-style dashboard signals missing');
assert(html.includes('lead-quick-views'), 'lead quick views missing');
assert(html.includes('lead-kpi-grid'), 'lead KPI grid missing');
assert(html.includes('leadBulkActionBar'), 'legacy lead bulk action bar missing');
assert(html.includes('leadDetailDialog'), 'legacy lead detail dialog missing');
assert(html.includes('prospecting-review-guide'), 'legacy review guide missing');
assert(html.includes('table-link-button'), 'legacy lead table action button missing');
assert(html.includes('lead-select-cell'), 'legacy lead table select cell missing');
assert(html.includes('templateSafetyPanel'), 'legacy template safety panel missing');
assert(html.includes('templateSenderBanner'), 'legacy template sender banner missing');
assert(html.includes('sendNgHero'), 'legacy send NG hero missing');
assert(html.includes('exclusionsHero'), 'legacy exclusions hero missing');
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
  'backgroundActivity',
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
  'errors',
].forEach((tabId) => {
  assert(html.includes(`data-tab="${tabId}"`), `legacy nav tab missing: ${tabId}`);
  assert(html.includes(`id="${tabId}"`), `legacy section missing: ${tabId}`);
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
].forEach((marker) => {
  assert(html.includes(marker), `legacy UI marker missing: ${marker}`);
});
assert(html.includes('会社名') && html.includes('差し込みメニュー'), 'legacy template tag menu labels missing');
assert(fs.readFileSync(path.join(root, 'Email.gs'), 'utf8').includes("'会社名'"), 'server Japanese template variables missing');
[
  'custom_field_definitions',
  'list_view_settings',
].forEach((marker) => {
  assert(code.includes(marker), `legacy custom/list schema missing: ${marker}`);
});
const refreshAllBlock = html.slice(html.indexOf('async function refreshAll'), html.indexOf('async function showStartupError'));
assert(refreshAllBlock.includes("api('getInitialData')"), 'refreshAll should load initial data');
assert(!refreshAllBlock.includes("api('getAuthorizationStatus')"), 'refreshAll should not preflight authorization');
const navHtml = html.slice(html.indexOf('<nav class="tabs">'), html.indexOf('</nav>', html.indexOf('<nav class="tabs">')));
[
  'data-tab="leads"',
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

const webApp = fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8');
assert(webApp.includes("readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'leads'))"), 'dashboard should read all lead rows');
assert(webApp.includes('dashboard_stats_v3'), 'dashboard cache key should reflect v11 operations payload');
[
  'saveEmailTemplate',
  'setEmailTemplateProduction',
  'saveNgMaster',
  'saveExcludedDomain',
  'listGenres',
  'saveGenre',
  'deleteGenre',
  'listReasons',
  'saveReason',
  'updateReason',
  'saveSerperApiKey',
  'listSerperApiKeyManager',
  'saveSerperApiKeyEntry',
  'updateSerperApiKeyEntry',
  'deleteSerperApiKeyEntry',
  'listLeadSendHistories',
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
assert(fs.readFileSync(path.join(root, 'Masters.gs'), 'utf8').includes('function setEmailTemplateProduction'), 'template production API missing');

console.log('smoke-test OK');
