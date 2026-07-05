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
assert(code.includes('20260705_apps_script_full_workflow_v65_serper_setup_icon_parity'), 'v65 app version missing');
assert(html.includes('id="leadSendTemplate"'), 'lead email send UI missing');
assert(html.includes('sendSelectedLeadEmail'), 'lead email send handler missing');
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
assert(html.includes("showTab('admin')"), 'dashboard API action should point to admin like legacy AppFrame');
assert(html.includes('appSafetyStrip'), 'legacy app safety strip missing');
assert(html.includes("legacyUiIcon('shieldCheck')"), 'legacy safety strip shield icon missing');
assert(html.includes("legacyUiIcon('clock3')"), 'legacy safety strip clock icon missing');
assert(html.includes("legacyUiIcon('mailCheck')"), 'legacy safety strip Gmail icon missing');
assert(html.includes("legacyUiIcon('plug')"), 'legacy safety strip plug icon missing');
assert(html.includes('settings-status-item with-icon'), 'legacy admin status icon row missing');
assert(html.includes('readiness-item with-icon'), 'legacy readiness icon row missing');
assert(html.includes("legacyUiIcon('rocket')"), 'legacy readiness rocket icon missing');
assert(html.includes("icon: 'database', label: 'Google Sheets'"), 'legacy admin database status item missing');
assert(html.includes("icon: 'searchCheck', label: 'Serper'"), 'legacy admin Serper status item missing');
assert(html.includes("icon: 'serverCog', label: 'GAS分割処理'"), 'legacy admin server cog status item missing');
assert(html.includes("legacyUiIcon('keyRound')"), 'legacy Serper setup key icon missing');
assert(html.includes("legacyUiIcon('refreshCw')}残量確認"), 'legacy Serper refresh icon missing');
assert(html.includes("legacyUiIcon('searchCheck')}検索APIテスト"), 'legacy Serper search test icon missing');
assert(html.includes("legacyUiIcon('serverCog')}<span>環境変数ではなくApps ScriptのPropertiesService"), 'legacy Serper setup command icon missing');
assert(!html.includes('aria-hidden=\"true\">SK</span>'), 'legacy Serper summary text badge should be icon');
assert(!html.includes('aria-hidden=\"true\">KY</span>'), 'legacy Serper setup text badge should be icon');
assert(!html.includes('aria-hidden=\"true\">PS</span>'), 'legacy Serper command text badge should be icon');
assert(html.includes('appRouteProgress'), 'legacy route progress missing');
assert(html.includes('toolbar-shortcut'), 'legacy top shortcut bar missing');
assert(html.includes('data-shortcut-tab="emailLeads"'), 'legacy top shortcut email tab missing');
assert(!html.includes('class="utility-action"'), 'top shortcut bar should not include GAS utility actions');
assert(html.includes("legacyUiIcon('eye')}差し込み後を確認"), 'legacy email preview eye icon missing');
assert(html.includes("legacyUiIcon('send')}この内容で1件送信"), 'legacy email preview send icon missing');
assert(html.includes("legacyUiIcon('send')}対象リストを確認して自動送信"), 'legacy email batch send icon missing');
assert(html.includes("legacyUiIcon('download')}CSV出力"), 'legacy histories CSV download icon missing');
assert(html.includes("legacyUiIcon('send')}送信プレビューへ"), 'legacy histories send preview icon missing');
assert(html.includes("['listPlus', '今月追加'"), 'legacy analytics list plus icon missing');
assert(html.includes("legacyUiIcon(step.icon || 'barChart3')"), 'legacy analytics funnel icons missing');
assert(html.includes("['shieldAlert', '送信NG'"), 'legacy analytics risk shield icon missing');
assert(html.includes("['trendingDown', '失注'"), 'legacy analytics risk trend icon missing');
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
assert(html.includes('template-sample-actions'), 'legacy template sample actions missing');
assert(html.includes('templateSubmitButton'), 'legacy template save button state missing');
assert(html.includes('templateNewButton'), 'legacy template create-another action missing');
assert(html.includes('updateTemplateFormState'), 'legacy template form state renderer missing');
assert(html.includes('startNewTemplate'), 'legacy template start new action missing');
assert(html.includes('フォーム営業用は件名なし可'), 'legacy form template subject optional hint missing');
assert(html.includes('保存済みテンプレートを更新'), 'legacy saved template update label missing');
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
const emailSource = fs.readFileSync(path.join(root, 'Email.gs'), 'utf8');
assert(emailSource.includes("send_type: 'テスト送信'"), 'test send history type missing');
assert(emailSource.includes("error_message: errorMessage"), 'test send failure reason history missing');
assert(html.includes('会社名') && html.includes('差し込みメニュー'), 'legacy template tag menu labels missing');
assert(emailSource.includes("'会社名'"), 'server Japanese template variables missing');
assert(fs.readFileSync(path.join(root, 'Masters.gs'), 'utf8').includes("templateType !== 'form' && !subject"), 'form template subject optional server rule missing');
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
assert(!navHtml.includes('tab nav-item secondary'), 'AppFrame sidebar should expose only the legacy primary menu items');
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
  'setMailSendingControl',
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
