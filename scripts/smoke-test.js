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
const manifest = fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8');
assert(code.includes('20260706_apps_script_full_workflow_v96_admin_page_compact_layout'), 'v96 app version missing');
assert(manifest.includes('https://www.googleapis.com/auth/script.send_mail'), 'MailApp send scope missing');
assert(manifest.includes('https://mail.google.com/'), 'GmailApp full mail scope missing');
assert(html.includes('HTTPS_PROTOCOL_PREFIX'), 'Apps Script-safe URL prefix helper missing');
assert(!html.includes('https://'), 'Index.html should not contain raw https:// literals that Apps Script can split in userCodeAppPanel');
assert(html.includes('<span>WEBサイト</span>'), 'website mini link should display WEBサイト label');
assert(!html.includes('<span>WEB</span><small>${escapeHtml(compactUrl(lead.website_url))}</small>'), 'website mini link should not display the compact domain');
assert(html.includes('id="leadLoadPanel"'), 'lead manual load panel missing');
assert(html.includes('flex-wrap: wrap'), 'lead load panel should wrap progress without squeezing text');
assert(html.includes('getStartupDashboardStats_') || fs.readFileSync(path.join(root, 'WebApp.gs'), 'utf8').includes('getStartupDashboardStats_'), 'startup should use cached/lightweight dashboard stats');
assert(html.includes('schedulePostStartupRefresh'), 'startup should schedule deferred dashboard refresh');
assert(html.includes('ensureTabDataLoaded'), 'tabs should lazy-load their own data');
assert(!html.includes('await Promise.all([leadLoadTask, loadTemplates(), loadMasters(), loadSearchResults(), loadOpsData(), loadEmailLeads(), loadDealLeads()])'), 'startup should not block on every secondary list');
assert(html.includes('show-background-center-button'), 'background center button should not always overlay primary screens');
assert(html.includes('function updateBackgroundCenterButton'), 'background center visibility controller missing');
assert(html.includes('messageClearTimer'), 'success message auto-clear missing');
assert(html.includes('#formWorkPanel:empty'), 'empty form work panel should not render as a blank sticky card');
assert(html.includes('#dashboardSendQueue:empty'), 'empty dashboard dynamic card should be hidden until data renders');
assert(html.includes("renderSerper(initial.serper);\n          message('', '');"), 'global loading message should clear after primary dashboard render');
assert(html.includes('loadInitialReviewLeads()'), 'initial review-only lead load missing');
assert(html.includes("filter: 'review', mode: 'review', limit: INITIAL_REVIEW_LEAD_LIMIT"), 'initial load should request review leads only');
assert(html.includes('loadAllLeadsManually'), 'manual full lead load action missing');
assert(html.includes('leadLoadProgressBar'), 'lead load progress UI missing');
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
assert(html.includes("icon: 'keyRound', label: 'OAuth Client'"), 'legacy Google credentials OAuth icon missing');
assert(html.includes("icon: 'refreshCw', label: 'Refresh Token'"), 'legacy Google credentials refresh icon missing');
assert(html.includes("icon: 'mailCheck', label: 'テスト宛先'"), 'legacy Google credentials test recipient icon missing');
assert(html.includes('onclick="refreshGmailAuthorizationStatus()"'), 'Gmail authorization status refresh button missing');
assert(html.includes('onclick="runGmailIntegrationCheck()"'), 'Gmail integration check button missing');
assert(html.includes('admin-primary-grid'), 'admin compact primary grid missing');
assert(html.includes('admin-accordion-list'), 'admin accordion list missing');
assert(html.includes('admin-inner-disclosure'), 'admin detail disclosure missing');
assert(html.includes('admin-automation-summary'), 'admin automation summary missing');
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
assert(html.includes('appSafetyStrip'), 'legacy app safety strip missing');
assert(html.includes("legacyUiIcon('shieldCheck')"), 'legacy safety strip shield icon missing');
assert(html.includes("legacyUiIcon('clock3')"), 'legacy safety strip clock icon missing');
assert(html.includes("legacyUiIcon('mailCheck')"), 'legacy safety strip Gmail icon missing');
assert(html.includes("legacyUiIcon('plug')"), 'legacy safety strip plug icon missing');
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
assert(html.includes('prospecting-activity-panel compact'), 'legacy collection activity panel should be compact');
assert(html.includes('prospecting-activity-detail-toggle'), 'legacy collection recent results should be collapsible');
assert(html.includes('prospecting-activity-empty-note'), 'legacy collection empty recent results note missing');
assert(html.includes('.prospecting-activity-empty-note svg'), 'legacy collection empty note icon should be size constrained');
assert(html.includes('function collectionStatusItem'), 'legacy collection status icon row helper missing');
assert(html.includes("legacyUiIcon('mapPinned')") || html.includes('mapPinned'), 'legacy genre-area collection icon missing');
assert(html.includes("legacyUiIcon('globe2')") || html.includes('globe2'), 'legacy source-page collection icon missing');
assert(html.indexOf('id="searchActivityPanel"') < html.indexOf('id="collectionCommandCenter"'), 'legacy prospecting activity should precede collection tool');
assert(html.indexOf('id="collectionCommandCenter"') < html.indexOf('id="searchOverview"'), 'legacy collection tool should appear before support overview cards');
assert(html.includes("item.icon || 'rocket'"), 'legacy readiness default rocket icon missing');
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
assert(html.includes("limit: INITIAL_REVIEW_LEAD_LIMIT, quiet: true"), 'initial review lead load should not lock global navigation');
assert(html.includes("loadOptions.quiet ? await apiQuiet('listLeads', request) : await api('listLeads', request)"), 'loadLeads should support quiet mode');
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
