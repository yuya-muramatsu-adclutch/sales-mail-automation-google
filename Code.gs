const APP_NAME = 'Auto Sales List App';
const APP_VERSION = '20260803_apps_script_full_workflow_v331_review_efficiency_controls';
const BACKGROUND_JOB_SAFE_RUNTIME_MAX_MS = 240000;
const BACKGROUND_JOB_DEFAULT_RUNTIME_MS = 240000;
const BACKGROUND_JOB_IMMEDIATE_DELAY_MS = 5000;
const BACKGROUND_JOB_RETRY_DELAY_MS = 60000;
const REVIEW_DECISION_QUEUE_PROPERTY_PREFIX_ = 'REVIEW_DECISION_QUEUE_V1_';
const REVIEW_DECISION_QUEUE_TRIGGER_HANDLER_ = 'processPendingReviewLeadDecisionsNow';
const REVIEW_DECISION_QUEUE_BATCH_SIZE_ = 50;
const REVIEW_ACTIVITY_UNDO_WINDOW_MS_ = 24 * 60 * 60 * 1000;
const PROPERTY_KEYS = Object.freeze({
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  SERPER_API_KEY: 'SERPER_API_KEY',
  SERPER_API_KEYS_JSON: 'SERPER_API_KEYS_JSON',
  SEARXNG_BASE_URL: 'SEARXNG_BASE_URL',
  SEARXNG_ACCESS_TOKEN: 'SEARXNG_ACCESS_TOKEN',
  SEARXNG_ENABLED: 'SEARXNG_ENABLED',
  SEARXNG_STATUS_JSON: 'SEARXNG_STATUS_JSON',
  GMAIL_REPLY_CHECK_CURSOR: 'GMAIL_REPLY_CHECK_CURSOR',
  GMAIL_REPLY_CHECK_LOCK: 'GMAIL_REPLY_CHECK_LOCK',
  BACKGROUND_WORKER_STATUS_JSON: 'BACKGROUND_WORKER_STATUS_JSON',
  BACKGROUND_WORKER_CLAIM_JSON: 'BACKGROUND_WORKER_CLAIM_JSON',
  DASHBOARD_CACHE_DIRTY_AT: 'DASHBOARD_CACHE_DIRTY_AT',
  DASHBOARD_CACHE_REFRESHED_AT: 'DASHBOARD_CACHE_REFRESHED_AT',
  LEAD_COLLECTION_QUALITY_MIGRATION_V215: 'MIGRATION_V215_NON_ADVERTISER_LEADS',
});

const EXISTING_APP_REFERENCE = Object.freeze({
  repo: '/Users/muramatsuyuuya/Documents/自動営業システム',
  schema: 'supabase/schema.sql',
  statusLogic: 'lib/lead-status.ts',
  leadTypes: 'lib/types.ts',
  domainLogic: 'lib/domain.ts',
  companyNormalize: 'lib/company-normalize.ts',
});

const SHEET_DEFINITIONS = Object.freeze({
  leads: [
    'id',
    'source',
    'source_id',
    'external_id',
    'genre',
    'company_name',
    'normalized_company_name',
    'facility_name',
    'email',
    'email_domain',
    'phone',
    'website_url',
    'website_domain',
    'form_url',
    'address',
    'status',
    'send_ng',
    'send_ng_reason',
    'send_ng_memo',
    'no_action_reason',
    'no_action_memo',
    'reply_checked',
    'form_status',
    'next_send_at',
    'last_sent_at',
    'last_gmail_thread_id',
    'send_count',
    'deal_status',
    'meeting_start_at',
    'meeting_end_at',
    'contact_name',
    'contact_email',
    'meeting_memo',
    'lost_reason',
    'decline_reason',
    'calendar_event_id',
    'google_meet_url',
    'calendar_auto_created_at',
    'custom_fields_json',
    'source_payload_json',
    'owner',
    'notes',
    'created_at',
    'updated_at',
    'archived_at',
    'import_row_id',
  ],
  send_histories: [
    'id',
    'lead_id',
    'sent_at',
    'send_type',
    'to_email',
    'company_name',
    'facility_name',
    'genre',
    'template_id',
    'template_name',
    'subject',
    'body',
    'send_result',
    'error_message',
    'gmail_message_id',
    'gmail_thread_id',
    'sender_name',
    'created_at',
    'updated_at',
  ],
  email_templates: [
    'id',
    'genre',
    'template_type',
    'name',
    'subject',
    'body',
    'is_production',
    'production_enabled_at',
    'last_test_sent_at',
    'version',
    'active',
    'created_at',
    'updated_at',
  ],
  ng_masters: [
    'id',
    'email',
    'domain',
    'company_name',
    'normalized_company_name',
    'reason',
    'memo',
    'active',
    'created_at',
    'updated_at',
  ],
  excluded_domains: [
    'id',
    'domain',
    'reason',
    'active',
    'created_at',
    'updated_at',
  ],
  genres: [
    'id',
    'name',
    'description',
    'active',
    'created_at',
    'updated_at',
  ],
  reasons: [
    'id',
    'category',
    'name',
    'description',
    'active',
    'created_at',
    'updated_at',
  ],
  custom_field_definitions: [
    'id',
    'genre_id',
    'genre',
    'field_key',
    'label',
    'input_type',
    'options_json',
    'list_visible',
    'detail_visible',
    'template_enabled',
    'required',
    'active',
    'sort_order',
    'created_at',
    'updated_at',
  ],
  list_view_settings: [
    'id',
    'genre_id',
    'genre',
    'columns_json',
    'created_at',
    'updated_at',
  ],
  search_jobs: [
    'id',
    'job_type',
    'status',
    'request_key',
    'query_json',
    'total_count',
    'processed_count',
    'daily_limit',
    'job_limit',
    'cursor_json',
    'progress_json',
    'last_error',
    'error_count',
    'lock_token',
    'locked_at',
    'last_heartbeat_at',
    'attempt_count',
    'started_at',
    'finished_at',
    'created_at',
    'updated_at',
  ],
  search_results: [
    'id',
    'job_id',
    'lead_id',
    'query',
    'result_type',
    'title',
    'url',
    'snippet',
    'rank',
    'raw_json',
    'review_status',
    'review_action',
    'reviewed_at',
    'created_at',
    'updated_at',
  ],
  search_usage_logs: [
    'id',
    'usage_date',
    'usage_month',
    'job_id',
    'lead_id',
    'purpose',
    'source',
    'query',
    'request_count',
    'credits',
    'result_count',
    'status',
    'cache_hit',
    'error_message',
    'created_at',
  ],
  domain_cache: [
    'id',
    'cache_key',
    'company_name',
    'normalized_company_name',
    'domain',
    'website_url',
    'form_url',
    'confidence',
    'source_json',
    'expires_at',
    'created_at',
    'updated_at',
  ],
  reply_logs: [
    'id',
    'lead_id',
    'thread_id',
    'from_email',
    'subject',
    'snippet',
    'received_at',
    'created_at',
  ],
  sync_logs: [
    'id',
    'event_type',
    'operation',
    'source',
    'status',
    'target_sheet',
    'target_id',
    'level',
    'added_count',
    'filled_count',
    'duplicate_skip_count',
    'excluded_count',
    'error_count',
    'message',
    'stack',
    'context_json',
    'created_at',
  ],
  review_activity_logs: [
    'id',
    'lead_id',
    'facility_name',
    'website_url',
    'action_type',
    'action_label',
    'previous_status',
    'next_status',
    'snapshot_json',
    'detail_json',
    'reversible_until',
    'undone_at',
    'undo_log_id',
    'actor',
    'created_at',
    'updated_at',
  ],
  jobs: [
    'id',
    'job_type',
    'status',
    'request_key',
    'source',
    'payload_json',
    'cursor_json',
    'total_count',
    'processed_count',
    'added_count',
    'filled_count',
    'duplicate_skip_count',
    'excluded_count',
    'error_count',
    'found_results_json',
    'current_query',
    'last_error',
    'lock_token',
    'locked_at',
    'last_heartbeat_at',
    'attempt_count',
    'started_at',
    'finished_at',
    'created_at',
    'updated_at',
  ],
  settings: [
    'id',
    'key',
    'value',
    'value_type',
    'description',
    'updated_at',
  ],
  dashboard_cache: [
    'id',
    'cache_key',
    'value_json',
    'expires_at',
    'created_at',
    'updated_at',
  ],
  raw_import: [
    'id',
    'import_job_id',
    'source_row_number',
    'row_json',
    'status',
    'result_json',
    'error_message',
    'created_at',
    'updated_at',
  ],
});

const DEFAULT_GENRES = Object.freeze([
  '介護',
  '美容',
  '医療',
  '教育',
  'その他',
  'グランピング',
  'キャンプ',
  '温泉旅館',
  '貸別荘',
  'サウナ施設',
  'アウトドア施設',
]);

const DEFAULT_REASONS = Object.freeze([
  { category: 'send_ng_reason', name: '既に他社と契約している' },
  { category: 'send_ng_reason', name: '現在は契約を考えていない' },
  { category: 'send_ng_reason', name: '連絡NG' },
  { category: 'send_ng_reason', name: '別の部署に連絡して欲しい' },
  { category: 'send_ng_reason', name: '配信停止依頼' },
  { category: 'send_ng_reason', name: '競合・取引不可' },
  { category: 'send_ng_reason', name: '過去クレーム' },
  { category: 'lost_reason', name: '予算が合わない' },
  { category: 'lost_reason', name: '時期が合わない' },
  { category: 'lost_reason', name: '他社利用中' },
  { category: 'no_action_reason', name: '対象外業種' },
  { category: 'no_action_reason', name: '重複施設' },
  { category: 'no_action_reason', name: '問い合わせ不可' },
  { category: 'decline_reason', name: '今回は見送り' },
  { category: 'decline_reason', name: '担当者不在' },
  { category: 'decline_reason', name: '連絡を希望しない' },
]);

const DEFAULT_SETTINGS = Object.freeze([
  {
    key: 'gmail_sender_name',
    value: '【Ad Clutch】村松 侑哉',
    value_type: 'string',
    description: 'Display name used for Gmail messages sent by this app.',
  },
  {
    key: 'gmail_sender_email',
    value: '',
    value_type: 'string',
    description: 'Verified Gmail sender address used by this app. Blank keeps the Google account default.',
  },
  {
    key: 'gmail_daily_send_limit',
    value: '80',
    value_type: 'number',
    description: 'Daily Gmail recipient cap used by this app. Keep below the personal account quota.',
  },
  {
    key: 'email_batch_send_limit',
    value: '20',
    value_type: 'number',
    description: 'Maximum recipients in one Apps Script send batch.',
  },
  {
    key: 'email_send_window',
    value: '{"enabled":true,"start":"07:00","end":"08:00","timezone":"Asia/Tokyo"}',
    value_type: 'json',
    description: 'Default send window ported from the existing app.',
  },
  {
    key: 'mail_sending_control',
    value: '{"enabled":false,"reason":"初期状態では安全のためメール送信を停止しています。","updatedAt":null}',
    value_type: 'json',
    description: 'Automatic mail sending control ported from the existing app.',
  },
  {
    key: 'gmail_reply_check',
    value: '{"enabled":false,"maxThreads":200}',
    value_type: 'json',
    description: 'Reply check setting ported from the existing app.',
  },
  {
    key: 'calendar_auto_create',
    value: '{"enabled":false}',
    value_type: 'json',
    description: 'Calendar auto-create setting ported from the existing app.',
  },
  {
    key: 'batch_runtime_budget_ms',
    value: '240000',
    value_type: 'number',
    description: 'Safe runtime budget per batch. Leaves recovery time before the Apps Script 6-minute limit.',
  },
]);

const SYSTEM_STATUS_OPTIONS = Object.freeze(['初回メール送信済み', '2ヶ月後メール送信済み']);
const PRE_SEND_MANUAL_STATUS_OPTIONS = Object.freeze([
  '未対応',
  '対応中',
  'フォーム対応中',
  'フォーム対応済み',
  '返信あり',
  '商談予定',
  '商談済み',
  '受注',
  '失注',
  '対応不要',
  '送信NG',
]);
const POST_SEND_MANUAL_STATUS_OPTIONS = Object.freeze([
  '初回メール送信済み',
  '返信あり',
  '商談予定',
  '商談済み',
  '受注',
  '失注',
  '対応不要',
  '送信NG',
]);
const LEAD_STATUSES = Object.freeze([
  '未対応',
  '対応中',
  '初回メール送信済み',
  '2ヶ月後メール送信済み',
  'フォーム対応中',
  'フォーム対応済み',
  '返信あり',
  '商談予定',
  '商談済み',
  '受注',
  '失注',
  '対応不要',
  '送信NG',
]);
const SEND_EXCLUDED_STATUSES = Object.freeze([
  'フォーム対応済み',
  '返信あり',
  '商談予定',
  '商談済み',
  '受注',
  '失注',
  '対応不要',
  '送信NG',
]);
const DEAL_STATUSES = Object.freeze(['商談予定', '商談済み', '受注', '失注']);
const FORM_STATUSES = Object.freeze(['未対応', '対応中', '対応済み', '対応不要']);
const LEAD_LIST_STATE_DEFINITIONS_ = Object.freeze([
  { key: 'email_sendable', label: 'メール送信可能', detail: '未送信で自動送信の対象', icon: 'ML' },
  { key: 'form_sendable', label: 'フォーム対応可能', detail: 'メールなし・フォームあり', icon: 'FM' },
  { key: 'review', label: '確認待ち', detail: '検索追加候補の確認前', icon: 'RV' },
  { key: 'no_contact', label: '連絡先なし', detail: 'メール・フォーム未取得', icon: 'NC' },
  { key: 'sent', label: 'メール送信済み', detail: '送信後・返信待ち', icon: 'SD' },
  { key: 'reply', label: '返信あり', detail: '返信確認済み', icon: 'RP' },
  { key: 'deal', label: '商談中', detail: '商談予定・商談済み', icon: 'MT' },
  { key: 'won', label: '成約', detail: '受注', icon: 'WN' },
  { key: 'lost', label: '失注', detail: '商談失注', icon: 'LS' },
  { key: 'send_ng', label: '送信NG', detail: '配信対象外', icon: 'NG' },
  { key: 'no_action', label: '対応不要', detail: '営業対象外・対応完了', icon: 'NA' },
  { key: 'form_in_progress', label: 'フォーム対応中', detail: 'フォーム作業中', icon: 'FI' },
  { key: 'form_completed', label: 'フォーム対応済み', detail: 'フォーム送信完了', icon: 'FC' },
  { key: 'other', label: 'その他・要確認', detail: '連絡先あり・送信条件外', icon: 'OT' },
]);
const LEAD_LIST_STATE_GROUP_DEFINITIONS_ = Object.freeze([
  { key: 'ready', label: '送信準備', detail: '今すぐ送信・フォーム対応できる', states: ['email_sendable', 'form_sendable'] },
  { key: 'review', label: '確認待ち', detail: '内容の確認が必要', states: ['review', 'other'] },
  { key: 'active', label: '対応中', detail: '送信後・返信・商談を進行中', states: ['sent', 'reply', 'deal', 'form_in_progress'] },
  { key: 'no_contact', label: '連絡先なし', detail: 'メール・フォーム未取得（送信NGを除く）', states: ['no_contact'] },
  { key: 'send_ng', label: '送信NG', detail: '今後の送信対象から除外', states: ['send_ng'] },
  { key: 'closed', label: '完了', detail: '成約・失注・対応完了', states: ['won', 'lost', 'no_action', 'form_completed'] },
]);

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Auto Sales')
      .addItem('Run setup', 'setup')
      .addItem('Open app sidebar', 'showSidebar')
      .addItem('List leads in log', 'debugListLeads')
      .addToUi();
  } catch (error) {
    console.warn('onOpen menu skipped: ' + error.message);
  }
}

function setup() {
  return withScriptLock_('setup', function () {
    const spreadsheet = getOrCreateSpreadsheet_();
    ensureAllSheets_(spreadsheet);
    seedDefaultSettings_(spreadsheet);
    seedDefaultGenres_(spreadsheet);
    seedDefaultReasons_(spreadsheet);
    removeBlankDefaultSheets_(spreadsheet);
    clearReferenceDataCache_();
    clearAppInfoCache_();

    return {
      ok: true,
      appName: APP_NAME,
      version: APP_VERSION,
      reference: EXISTING_APP_REFERENCE,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      sheets: Object.keys(SHEET_DEFINITIONS),
    };
  });
}

function getAppInfo() {
  const storedId = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SPREADSHEET_ID) || '').trim();
  if (storedId) {
    try {
      const cached = CacheService.getScriptCache().get(appInfoCacheKey_(storedId));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.spreadsheetId === storedId && parsed.version === APP_VERSION) return parsed;
      }
    } catch (error) {
      console.warn('App info cache read skipped: ' + error.message);
    }
    return {
      appName: APP_NAME,
      version: APP_VERSION,
      reference: EXISTING_APP_REFERENCE,
      spreadsheetId: storedId,
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(storedId),
    };
  }
  const spreadsheet = getOrCreateSpreadsheet_();
  const info = {
    appName: APP_NAME,
    version: APP_VERSION,
    reference: EXISTING_APP_REFERENCE,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
  try {
    CacheService.getScriptCache().put(appInfoCacheKey_(info.spreadsheetId), JSON.stringify(info), 120);
  } catch (error) {
    console.warn('App info cache write skipped: ' + error.message);
  }
  return info;
}

function appInfoCacheKey_(spreadsheetId) {
  return 'app_info_' + String(APP_VERSION || 'v1') + '_' + String(spreadsheetId || 'none');
}

function clearAppInfoCache_() {
  try {
    const storedId = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SPREADSHEET_ID) || '').trim();
    if (storedId) CacheService.getScriptCache().remove(appInfoCacheKey_(storedId));
  } catch (error) {
    console.warn('App info cache clear skipped: ' + error.message);
  }
}

function getSchemaStatus(options) {
  const input = options && typeof options === 'object' ? options : {};
  const spreadsheet = getOrCreateSpreadsheet_();
  const suppliedSettings = Array.isArray(input.settingsRecords) ? input.settingsRecords : null;
  const schemaChecks = [
    {
      key: 'leads-core',
      label: 'leads 基本列',
      sheet: 'leads',
      columns: ['id', 'company_name', 'email', 'status', 'custom_fields_json'],
    },
    {
      key: 'leads-gmail-calendar',
      label: 'leads Gmail / Calendar列',
      sheet: 'leads',
      columns: ['reply_checked', 'last_gmail_thread_id', 'meeting_start_at', 'meeting_end_at', 'calendar_event_id', 'calendar_auto_created_at'],
    },
    {
      key: 'templates-production',
      label: 'email_templates 本番管理列',
      sheet: 'email_templates',
      columns: ['is_production', 'production_enabled_at', 'last_test_sent_at', 'version', 'active'],
    },
    {
      key: 'search-result-review',
      label: 'search_results レビュー列',
      sheet: 'search_results',
      columns: ['review_status', 'review_action', 'reviewed_at', 'lead_id'],
    },
    {
      key: 'reply-logs',
      label: 'reply_logs 返信ログ列',
      sheet: 'reply_logs',
      columns: ['lead_id', 'thread_id', 'subject', 'snippet', 'received_at'],
    },
    {
      key: 'settings-core',
      label: 'settings 運用設定キー',
      sheet: 'settings',
      settingKeys: ['gmail_sender_name', 'gmail_sender_email', 'gmail_daily_send_limit', 'email_batch_send_limit', 'email_send_window', 'mail_sending_control', 'gmail_reply_check', 'calendar_auto_create', 'batch_runtime_budget_ms'],
    },
  ];
  const checks = schemaChecks.map(function (check) {
    const sheet = spreadsheet.getSheetByName(check.sheet);
    if (!sheet) {
      return {
        key: check.key,
        label: check.label,
        detail: check.sheet + ' シートがありません',
        ready: false,
      };
    }

    const headers = getHeaders_(sheet);
    const missingColumns = (check.columns || []).filter(function (column) {
      return headers.indexOf(column) === -1;
    });
    let missingSettings = [];
    if (check.settingKeys && check.settingKeys.length) {
      const records = check.sheet === 'settings' && suppliedSettings ? suppliedSettings : readSheetRecords_(sheet);
      const keys = records.map(function (record) { return String(record.key || ''); });
      missingSettings = check.settingKeys.filter(function (key) {
        return keys.indexOf(key) === -1;
      });
    }
    const missing = missingColumns.concat(missingSettings);
    return {
      key: check.key,
      label: check.label,
      detail: missing.length ? '不足: ' + missing.join(', ') : 'OK: ' + check.sheet,
      ready: missing.length === 0,
    };
  });
  const schemaIntegrityIssues = [];
  Object.keys(SHEET_DEFINITIONS).forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      schemaIntegrityIssues.push(sheetName + ': シートなし');
      return;
    }
    const headers = getHeaders_(sheet);
    const missing = SHEET_DEFINITIONS[sheetName].filter(function (header) {
      return headers.indexOf(header) === -1;
    });
    const blankColumns = headers.map(function (header, index) {
      return header ? 0 : index + 1;
    }).filter(Boolean);
    const duplicateHeaders = headers.filter(function (header, index) {
      return header && headers.indexOf(header) !== index;
    });
    if (missing.length) schemaIntegrityIssues.push(sheetName + ': 不足 ' + missing.join(', '));
    if (blankColumns.length) schemaIntegrityIssues.push(sheetName + ': 空の見出し列 ' + blankColumns.join(', '));
    if (duplicateHeaders.length) schemaIntegrityIssues.push(sheetName + ': 重複見出し ' + Array.from(new Set(duplicateHeaders)).join(', '));
  });
  checks.push({
    key: 'all-sheet-header-integrity',
    label: '全シート見出し整合性',
    detail: schemaIntegrityIssues.length ? schemaIntegrityIssues.slice(0, 8).join(' / ') : 'OK: 全シート',
    ready: schemaIntegrityIssues.length === 0,
  });
  const recoverySteps = [
    'Apps Script editorで setup() を実行',
    'Webアプリを再読み込み',
    '空の見出し列または重複見出しが残る場合は、管理画面の表示内容を確認して見出し行を修復',
    '必要なら COMPLETION_AUDIT.md の対象Versionを確認',
  ].join('\n');

  return {
    checks: checks,
    migrationSql: recoverySteps,
    ready: checks.every(function (check) { return check.ready; }),
    generatedAt: nowIso_(),
  };
}

function createLead(input) {
  return createLeadWithLockOptions_(input, null);
}

function createLeadWithLockOptions_(input, lockOptions, validationOptions) {
  assertAutomatedLeadSiteAvailableBeforeCreate_(input, validationOptions);
  return withScriptLock_('createLead', function () {
    return createLeadLocked_(input);
  }, lockOptions);
}

function createLeadLocked_(input) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'leads');
  const headers = getHeaders_(sheet);
  const now = nowIso_();
  const allowDuplicate = Boolean(input && (input.allow_duplicate === true || input.allowDuplicate === true));
  const lead = normalizeLeadInput_(input, true);
  const explicitFields = new Set(Object.keys(lead));

  lead.id = Utilities.getUuid();
  lead.status = lead.status || '未対応';
  lead.form_status = lead.form_status || '未対応';
  lead.deal_status = lead.deal_status || '未設定';
  lead.send_ng = valueOrDefault_(lead.send_ng, false);
  lead.reply_checked = valueOrDefault_(lead.reply_checked, false);
  lead.send_count = valueOrDefault_(lead.send_count, 0);
  lead.created_at = now;
  lead.updated_at = now;
  lead.archived_at = '';
  applyLeadDerivedFields_(lead);
  applyLeadStatusSideEffects_(lead, explicitFields);
  assertLeadCollectionDestinationAllowed_(lead);
  if (!allowDuplicate) {
    assertNoDuplicateLead_(sheet, lead);
  }

  sheet.appendRow(headers.map(function (header) {
    return valueOrBlank_(lead[header]);
  }));

  clearRuntimeCaches_('leads');
  return lead;
}

function getLeadById(id) {
  const leadId = requireId_(id);
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'leads');
  const found = findRowById_(sheet, leadId);

  if (!found) {
    throw new Error('Lead not found: ' + leadId);
  }

  return found.record;
}

function reviewDecisionQueuePropertyKey_(leadId, requestId) {
  return REVIEW_DECISION_QUEUE_PROPERTY_PREFIX_ + encodeURIComponent(String(leadId || '')) + '_' + String(requestId || '');
}

function createReviewDecisionRequestId_() {
  try {
    if (typeof Utilities !== 'undefined' && typeof Utilities.getUuid === 'function') {
      return String(Utilities.getUuid()).replace(/[^A-Za-z0-9_-]/g, '');
    }
  } catch (error) {
    // Fall back to a timestamp-based id in local tests or restricted runtimes.
  }
  return String(Date.now()) + '_' + Math.random().toString(36).slice(2, 10);
}

function normalizePendingReviewDecisionRecord_(propertyKey, value) {
  try {
    const parsed = JSON.parse(String(value || ''));
    const leadId = String(parsed.id || parsed.leadId || '').trim();
    const requestId = String(parsed.requestId || parsed.request_id || '').trim();
    const status = String(parsed.status || '').trim();
    const expectedStatus = String(parsed.expectedStatus || parsed.expected_status || '').trim();
    if (!leadId || !requestId || !status || !expectedStatus) return null;
    return {
      propertyKey: String(propertyKey || ''),
      id: leadId,
      requestId: requestId,
      mode: String(parsed.mode || 'decision'),
      expectedStatus: expectedStatus,
      status: status,
      sendNgReason: String(parsed.sendNgReason || parsed.send_ng_reason || ''),
      sendNgMemo: String(parsed.sendNgMemo || parsed.send_ng_memo || ''),
      excludeDomainFromCollection: parsed.excludeDomainFromCollection === true || parsed.exclude_domain_from_collection === true,
      excludeDomainFromCollectionSpecified: parsed.excludeDomainFromCollectionSpecified === true || parsed.exclude_domain_from_collection_specified === true,
      requestedAt: String(parsed.requestedAt || parsed.requested_at || ''),
      queuedReason: String(parsed.queuedReason || parsed.queued_reason || ''),
    };
  } catch (error) {
    return null;
  }
}

function listPendingReviewDecisionRecords_() {
  try {
    if (typeof PropertiesService === 'undefined') return [];
    const properties = PropertiesService.getScriptProperties();
    if (!properties || typeof properties.getProperties !== 'function') return [];
    const values = properties.getProperties() || {};
    return Object.keys(values).filter(function (key) {
      return key.indexOf(REVIEW_DECISION_QUEUE_PROPERTY_PREFIX_) === 0;
    }).map(function (key) {
      return normalizePendingReviewDecisionRecord_(key, values[key]);
    }).filter(Boolean).sort(function (a, b) {
      return String(a.requestedAt || '').localeCompare(String(b.requestedAt || '')) ||
        String(a.requestId || '').localeCompare(String(b.requestId || ''));
    });
  } catch (error) {
    console.warn('確認結果の保存待ち一覧を読み込めませんでした: ' + String(error.message || error));
    return [];
  }
}

function latestPendingReviewDecisionsByLead_() {
  return listPendingReviewDecisionRecords_().reduce(function (result, record) {
    result[record.id] = record;
    return result;
  }, {});
}

function overlayPendingReviewDecisionsOnLeads_(rows) {
  const latestByLead = latestPendingReviewDecisionsByLead_();
  return (Array.isArray(rows) ? rows : []).map(function (lead) {
    const pending = latestByLead[String(lead && lead.id || '')];
    if (!pending) return lead;
    const currentStatus = String(lead.status || '');
    if (currentStatus !== pending.expectedStatus && currentStatus !== pending.status) return lead;
    return Object.assign({}, lead, {
      status: pending.status,
      review_decision_pending: true,
      review_decision_requested_at: pending.requestedAt,
    });
  });
}

function enqueuePendingReviewDecision_(leadId, decision, reason, options) {
  const input = options && typeof options === 'object' ? options : {};
  const id = requireId_(leadId);
  const requestId = createReviewDecisionRequestId_();
  const record = {
    id: id,
    requestId: requestId,
    mode: String(decision.mode || 'decision'),
    expectedStatus: String(decision.expectedStatus || ''),
    status: String(decision.nextStatus || decision.status || ''),
    sendNgReason: String(decision.sendNgReason || decision.send_ng_reason || ''),
    sendNgMemo: String(decision.sendNgMemo || decision.send_ng_memo || ''),
    excludeDomainFromCollection: decision.excludeDomainFromCollection === true || decision.exclude_domain_from_collection === true,
    excludeDomainFromCollectionSpecified: decision.excludeDomainFromCollectionSpecified === true || decision.exclude_domain_from_collection_specified === true,
    requestedAt: nowIso_(),
    queuedReason: String(reason || 'lock_timeout'),
  };
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(reviewDecisionQueuePropertyKey_(id, requestId), JSON.stringify(record));
  if (input.bumpCache !== false) bumpLeadListCacheRevision_();
  const trigger = input.scheduleTrigger === false
    ? { result: null, warning: '' }
    : (typeof ensurePendingReviewDecisionTriggerBestEffort_ === 'function'
      ? ensurePendingReviewDecisionTriggerBestEffort_(BACKGROUND_JOB_IMMEDIATE_DELAY_MS)
      : { result: null, warning: '保存待ちの自動再実行トリガーを確認できませんでした。' });
  return {
    record: record,
    trigger: trigger.result,
    triggerWarning: trigger.warning || '',
  };
}

function getLead(id) {
  return getLeadById(id);
}

function reviewLeadPriorityScore_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  let score = 25;
  if (String(source.website_url || '').trim()) score += 20;
  if (isValidEmailAddress_(source.email)) score += 25;
  if (String(source.form_url || '').trim()) score += 15;
  if (String(source.address || '').trim()) score += 5;
  if (String(source.genre || '').trim()) score += 5;
  if (isAutomatedLeadCollectionSource_(source.source)) score += 5;
  if (!isValidEmailAddress_(source.email) && !String(source.form_url || '').trim()) score -= 20;
  if (isKnownNonAdvertiserLeadUrl_(source.website_url || source.form_url || '')) score -= 40;
  if (isClearlyClosedLead_(source) || isLeadLinkDefinitelyBroken_(source)) score = 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function reviewLeadPriorityTier_(score) {
  const value = Number(score || 0);
  if (value >= 70) return 'high';
  if (value >= 45) return 'medium';
  return 'low';
}

function reviewLeadPriorityLabel_(score) {
  const tier = reviewLeadPriorityTier_(score);
  if (tier === 'high') return '優先';
  if (tier === 'medium') return '通常';
  return '要確認';
}

function reviewLeadReasonItems_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  const reasons = [];
  const add = function (key, label, detail, tone) {
    reasons.push({ key: key, label: label, detail: detail || '', tone: tone || 'info' });
  };
  if (String(source.website_url || '').trim()) {
    add(
      'website',
      isKnownNonAdvertiserLeadUrl_(source.website_url) ? '情報サイトの可能性' : '公式サイト候補あり',
      normalizeDomain_(source.website_url),
      isKnownNonAdvertiserLeadUrl_(source.website_url) ? 'warn' : 'good'
    );
  } else {
    add('website_missing', 'WEBサイト未取得', '公式サイトの再探索を推奨', 'warn');
  }
  if (isValidEmailAddress_(source.email)) add('email', 'メール取得済み', String(source.email || ''), 'good');
  if (String(source.form_url || '').trim()) add('form', '問い合わせフォームあり', normalizeDomain_(source.form_url), 'good');
  if (!isValidEmailAddress_(source.email) && !String(source.form_url || '').trim()) {
    add('contact_missing', '連絡先未取得', 'メール・フォームを確認してください', 'warn');
  }
  if (String(source.address || '').trim()) add('address', '住所取得済み', String(source.address || ''), 'info');
  add('source', '追加元を記録', String(source.source || '不明'), 'info');
  return reasons;
}

function decorateReviewLeadForList_(lead) {
  const score = reviewLeadPriorityScore_(lead);
  return Object.assign({}, lead, {
    review_priority_score: score,
    review_priority_tier: reviewLeadPriorityTier_(score),
    review_priority_label: reviewLeadPriorityLabel_(score),
    review_reason_items: reviewLeadReasonItems_(lead),
  });
}

function reviewRegistrableDomain_(value) {
  const domain = normalizeDomain_(value);
  if (!domain) return '';
  const parts = domain.split('.').filter(Boolean);
  if (parts.length <= 2) return domain;
  const publicSuffix = parts.slice(-2).join('.');
  const multiPartSuffixes = [
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp', 'lg.jp', 'gr.jp',
    'co.uk', 'org.uk', 'com.au', 'net.au', 'com.sg', 'com.tw',
  ];
  return multiPartSuffixes.indexOf(publicSuffix) !== -1
    ? parts.slice(-3).join('.')
    : parts.slice(-2).join('.');
}

function isSharedReviewRootDomain_(domain) {
  const root = reviewRegistrableDomain_(domain);
  return [
    'wixsite.com', 'jimdosite.com', 'wordpress.com', 'amebaownd.com', 'fc2.com',
    'webnode.jp', 'strikingly.com', 'studio.site', 'google.com', 'notion.site',
  ].indexOf(root) !== -1;
}

function reviewLeadComparableNames_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return Array.from(new Set([
    normalizeCompanyName_(source.facility_name || ''),
    normalizeCompanyName_(source.company_name || ''),
    normalizeCompanyName_(source.normalized_company_name || ''),
  ].filter(function (name) { return name && name.length >= 4; })));
}

function reviewLeadRelatedCandidates_(current, leads, limit) {
  const source = current && typeof current === 'object' ? current : {};
  const currentId = String(source.id || '');
  const currentDomain = normalizeDomain_(source.website_domain || source.website_url || '');
  const currentRoot = reviewRegistrableDomain_(currentDomain);
  const currentEmail = String(source.email || '').trim().toLowerCase();
  const currentNames = reviewLeadComparableNames_(source);
  const maxItems = Math.min(Math.max(Number(limit) || 8, 1), 20);

  return (leads || []).map(function (lead) {
    if (!lead || String(lead.id || '') === currentId) return null;
    const domain = normalizeDomain_(lead.website_domain || lead.website_url || '');
    const root = reviewRegistrableDomain_(domain);
    const email = String(lead.email || '').trim().toLowerCase();
    const names = reviewLeadComparableNames_(lead);
    const reasons = [];
    let score = 0;
    if (currentDomain && domain && currentDomain === domain) {
      reasons.push('公式サイトのドメイン一致');
      score = Math.max(score, 100);
    }
    if (currentEmail && email && currentEmail === email) {
      reasons.push('メールアドレス一致');
      score = Math.max(score, 98);
    }
    if (currentNames.some(function (name) { return names.indexOf(name) !== -1; })) {
      reasons.push('施設名・会社名一致');
      score = Math.max(score, 82);
    }
    if (currentDomain && domain && currentDomain !== domain && currentRoot && currentRoot === root && !isSharedReviewRootDomain_(root)) {
      reasons.push('親ドメイン一致');
      score = Math.max(score, 55);
    }
    if (!reasons.length) return null;
    return {
      id: String(lead.id || ''),
      facility_name: String(lead.facility_name || lead.company_name || '名称未取得'),
      company_name: String(lead.company_name || ''),
      website_url: String(lead.website_url || ''),
      domain: domain,
      status: String(lead.status || ''),
      source: String(lead.source || ''),
      archived: isArchivedLead_(lead),
      updated_at: String(lead.updated_at || lead.created_at || ''),
      confidence: score >= 90 ? 'high' : score >= 75 ? 'medium' : 'caution',
      confidence_label: score >= 90 ? '一致度 高' : score >= 75 ? '一致度 中' : '関連候補',
      score: score,
      reasons: reasons,
    };
  }).filter(Boolean).sort(function (left, right) {
    return Number(right.score || 0) - Number(left.score || 0) ||
      String(right.updated_at || '').localeCompare(String(left.updated_at || ''));
  }).slice(0, maxItems);
}

function reviewLeadWorkspaceFields_() {
  return [
    'id', 'source', 'source_id', 'external_id', 'company_name', 'normalized_company_name', 'facility_name',
    'email', 'email_domain', 'website_url', 'website_domain', 'form_url', 'status', 'send_ng', 'form_status',
    'last_sent_at', 'send_count', 'source_payload_json', 'created_at', 'updated_at', 'archived_at',
  ];
}

function getReviewLeadWorkspace(leadId, options) {
  const recordId = requireId_(leadId);
  const query = options && typeof options === 'object' ? options : {};
  const current = getLeadById(recordId);
  const leads = readSheetRecordFields_('leads', reviewLeadWorkspaceFields_(), { maxGapColumns: 2 });
  const decorated = decorateReviewLeadForList_(current);
  const activities = listReviewActivities({ leadId: recordId, limit: 30 }).items;
  const timeline = [{
    id: 'collected_' + recordId,
    lead_id: recordId,
    action_type: 'collected',
    action_label: '収集して確認待ちに追加',
    detail: String(current.source || '不明') + 'から追加',
    created_at: String(current.created_at || ''),
    reversible: false,
  }].concat(activities);
  return {
    leadId: recordId,
    priority: {
      score: decorated.review_priority_score,
      tier: decorated.review_priority_tier,
      label: decorated.review_priority_label,
    },
    reasons: decorated.review_reason_items,
    related: reviewLeadRelatedCandidates_(current, leads, query.relatedLimit || query.related_limit || 8),
    timeline: timeline.sort(function (left, right) {
      return String(right.created_at || '').localeCompare(String(left.created_at || ''));
    }),
    generatedAt: nowIso_(),
  };
}

function reviewActivityFields_() {
  return SHEET_DEFINITIONS.review_activity_logs.slice();
}

function listReviewActivities(options) {
  const query = options && typeof options === 'object' ? options : {};
  const leadId = String(query.leadId || query.lead_id || '').trim();
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const nowMs = Date.now();
  const rows = readSheetRecordFields_('review_activity_logs', reviewActivityFields_(), { maxGapColumns: 0 })
    .filter(function (record) { return !leadId || String(record.lead_id || '') === leadId; })
    .sort(function (left, right) {
      return String(right.created_at || '').localeCompare(String(left.created_at || ''));
    });
  const items = rows.slice(0, limit).map(function (record) {
    const reversibleUntilMs = new Date(record.reversible_until || 0).getTime();
    return Object.assign({}, record, {
      reversible: !record.undone_at && Number.isFinite(reversibleUntilMs) && reversibleUntilMs > nowMs,
    });
  });
  return { total: rows.length, limit: limit, items: items };
}

function buildReviewActivityRecord_(write, options) {
  const input = options && typeof options === 'object' ? options : {};
  const previous = write && write.previous || {};
  const record = write && write.record || {};
  const nextStatus = String(record.status || input.nextStatus || '');
  const labels = { '対応中': '確認済みに更新', '送信NG': '送信NGに更新', '対応不要': '対応不要に更新', '未対応': '確認待ちに復元' };
  const reversible = input.reversible !== false && nextStatus !== '未対応';
  const createdAt = nowIso_();
  return {
    lead_id: String(record.id || previous.id || ''),
    facility_name: String(record.facility_name || record.company_name || previous.facility_name || previous.company_name || '名称未取得'),
    website_url: String(record.website_url || previous.website_url || ''),
    action_type: String(input.actionType || (nextStatus === '未対応' ? 'review_undo' : 'review_decision')),
    action_label: String(input.actionLabel || labels[nextStatus] || '確認状態を更新'),
    previous_status: String(previous.status || input.previousStatus || ''),
    next_status: nextStatus,
    snapshot_json: safeJsonStringify_({
      status: String(previous.status || ''),
      send_ng: normalizeBooleanLike_(previous.send_ng),
      send_ng_reason: String(previous.send_ng_reason || ''),
      send_ng_memo: String(previous.send_ng_memo || ''),
      form_status: String(previous.form_status || ''),
      next_send_at: String(previous.next_send_at || ''),
      no_action_reason: String(previous.no_action_reason || ''),
      no_action_memo: String(previous.no_action_memo || ''),
      source_payload_json: String(previous.source_payload_json || '{}'),
    }),
    detail_json: safeJsonStringify_({ source: String(record.source || previous.source || ''), request_id: String(input.requestId || '') }),
    reversible_until: reversible ? new Date(Date.now() + REVIEW_ACTIVITY_UNDO_WINDOW_MS_).toISOString() : '',
    undone_at: '',
    undo_log_id: String(input.undoLogId || ''),
    actor: String(input.actor || 'app_user'),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function appendReviewActivityRecordsLocked_(spreadsheet, records) {
  const source = (Array.isArray(records) ? records : [records]).filter(function (record) {
    return record && String(record.lead_id || '').trim();
  });
  if (!source.length) return [];
  const targetSpreadsheet = spreadsheet || getOrCreateSpreadsheet_();
  if (!targetSpreadsheet || typeof targetSpreadsheet.getSheetByName !== 'function') return [];
  const sheet = ensureSheet_(targetSpreadsheet, 'review_activity_logs');
  const headers = getHeaders_(sheet);
  const now = nowIso_();
  const saved = source.map(function (record) {
    return Object.assign({}, record, {
      id: record.id || Utilities.getUuid(),
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, saved.length, headers.length).setValues(saved.map(function (record) {
    return headers.map(function (header) { return valueOrBlank_(record[header]); });
  }));
  return saved;
}

function appendReviewActivityRecordsBestEffortLocked_(spreadsheet, records) {
  try {
    return {
      records: appendReviewActivityRecordsLocked_(spreadsheet, records),
      warning: '',
    };
  } catch (error) {
    const warning = '確認結果は保存しましたが、操作履歴の記録を保留しました: ' + String(error.message || error);
    console.warn(warning);
    return { records: [], warning: warning };
  }
}

function undoReviewActivity(activityId) {
  const recordId = requireId_(activityId);
  const result = withScriptLock_('undoReviewActivity', function () {
    const spreadsheet = getOrCreateSpreadsheet_();
    const activitySheet = ensureSheet_(spreadsheet, 'review_activity_logs');
    const activityFound = findRowById_(activitySheet, recordId);
    if (!activityFound) throw createExpectedOperationError_('操作履歴が見つかりませんでした。', 'REVIEW_ACTIVITY_NOT_FOUND');
    const activity = activityFound.record;
    if (activity.undone_at) throw createExpectedOperationError_('この操作はすでに取り消されています。', 'REVIEW_ACTIVITY_ALREADY_UNDONE');
    const reversibleUntilMs = new Date(activity.reversible_until || 0).getTime();
    if (!Number.isFinite(reversibleUntilMs) || reversibleUntilMs <= Date.now()) {
      throw createExpectedOperationError_('この操作の取り消し期限（24時間）を過ぎています。', 'REVIEW_ACTIVITY_EXPIRED');
    }
    const leadSheet = ensureSheet_(spreadsheet, 'leads');
    const leadFound = findRowById_(leadSheet, activity.lead_id);
    if (!leadFound) throw createExpectedOperationError_('対象の営業先が見つかりませんでした。', 'REVIEW_ACTIVITY_LEAD_NOT_FOUND');
    const currentStatus = String(leadFound.record.status || '');
    if (currentStatus !== String(activity.next_status || '')) {
      throw createExpectedOperationError_('履歴の後に状態が変更されているため、安全のため取り消しませんでした。', 'REVIEW_ACTIVITY_CONFLICT');
    }
    const snapshot = parseJsonObjectSafe_(activity.snapshot_json);
    const restoreStatus = String(snapshot.status || activity.previous_status || '未対応');
    const restored = buildUpdatedLeadRecord_(leadFound, {
      status: restoreStatus,
      send_ng: normalizeBooleanLike_(snapshot.send_ng),
      send_ng_reason: String(snapshot.send_ng_reason || ''),
      send_ng_memo: String(snapshot.send_ng_memo || ''),
      form_status: String(snapshot.form_status || '未対応'),
      next_send_at: String(snapshot.next_send_at || ''),
      no_action_reason: String(snapshot.no_action_reason || ''),
      no_action_memo: String(snapshot.no_action_memo || ''),
      source_payload_json: String(snapshot.source_payload_json || leadFound.record.source_payload_json || '{}'),
    });
    writeLeadRecordsToRowsGroupedLocked_(leadSheet, leadFound.headers || getHeaders_(leadSheet), [{
      rowNumber: leadFound.rowNumber,
      previous: leadFound.record,
      record: restored,
    }]);
    const undoLog = appendReviewActivityRecordsLocked_(spreadsheet, [buildReviewActivityRecord_({
      previous: leadFound.record,
      record: restored,
    }, { actionType: 'review_undo', reversible: false, undoLogId: recordId })])[0];
    const activityHeaders = activityFound.headers || getHeaders_(activitySheet);
    writeRecordToRow_(activitySheet, activityFound.rowNumber, activityHeaders, Object.assign({}, activity, {
      undone_at: nowIso_(),
      undo_log_id: undoLog.id,
      updated_at: nowIso_(),
    }));
    return { ok: true, lead: restored, activity: undoLog };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  clearReviewLeadCachesBestEffort_();
  return result;
}

function leadListFields_(additionalFields) {
  const baseFields = [
    'id',
    'source',
    'genre',
    'company_name',
    'facility_name',
    'email',
    'website_url',
    'form_url',
    'status',
    'send_ng',
    'reply_checked',
    'form_status',
    'next_send_at',
    'last_sent_at',
    'send_count',
    'deal_status',
    'created_at',
    'updated_at',
    'archived_at',
  ];
  const allowedFields = SHEET_DEFINITIONS.leads;
  const extras = (Array.isArray(additionalFields) ? additionalFields : [additionalFields]).map(function (fieldName) {
    return String(fieldName || '').trim();
  }).filter(function (fieldName) {
    return fieldName && allowedFields.indexOf(fieldName) !== -1;
  });
  return Array.from(new Set(baseFields.concat(extras)));
}

const LEAD_LIST_CACHE_TTL_SECONDS_ = 300;
const LEAD_LIST_STATS_CACHE_TTL_SECONDS_ = 300;
const LEAD_LIST_CACHE_MAX_CHARS_ = 95000;
const LEAD_LIST_CACHE_REVISION_PROPERTY_ = 'LEAD_LIST_CACHE_REVISION_V1';
const LEAD_LIST_READ_MAX_GAP_COLUMNS_ = 2;
const LEAD_LIST_PRIMARY_FILTERS_ = Object.freeze(['all'].concat(LEAD_LIST_STATE_GROUP_DEFINITIONS_.map(function (definition) {
  return 'group_' + definition.key;
})));

function leadListCacheRevision_() {
  try {
    if (typeof PropertiesService === 'undefined') return '0';
    const properties = PropertiesService.getScriptProperties();
    return String(properties.getProperty(LEAD_LIST_CACHE_REVISION_PROPERTY_) || '0');
  } catch (error) {
    return '0';
  }
}

function bumpLeadListCacheRevision_() {
  try {
    if (typeof PropertiesService === 'undefined') return '';
    const revision = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8);
    PropertiesService.getScriptProperties().setProperty(LEAD_LIST_CACHE_REVISION_PROPERTY_, revision);
    return revision;
  } catch (error) {
    console.warn('Lead list cache revision update skipped: ' + error.message);
    return '';
  }
}

function leadListCacheHash_(value) {
  const text = String(value || '');
  let first = 2166136261;
  let second = 2246822507;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489909);
  }
  return (first >>> 0).toString(36) + (second >>> 0).toString(36);
}

function leadListCacheKey_(kind, payload) {
  const source = JSON.stringify({
    version: String(APP_VERSION || 'v1'),
    payload: payload || {},
  });
  return 'lead_list_' + String(kind || 'page') + '_' + leadListCacheHash_(source);
}

function readLeadListCache_(kind, payload) {
  try {
    if (typeof CacheService === 'undefined') return null;
    const cached = CacheService.getScriptCache().get(leadListCacheKey_(kind, payload));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed || typeof parsed !== 'object') return null;
    parsed.cacheHit = true;
    return parsed;
  } catch (error) {
    console.warn('Lead list cache read skipped: ' + error.message);
    return null;
  }
}

function writeLeadListCache_(kind, payload, value, ttlSeconds) {
  try {
    if (typeof CacheService === 'undefined') return false;
    const serialized = JSON.stringify(value);
    const serializedSize = typeof Utilities !== 'undefined' && Utilities.newBlob
      ? Utilities.newBlob(serialized).getBytes().length
      : serialized.length;
    if (!serialized || serializedSize > LEAD_LIST_CACHE_MAX_CHARS_) return false;
    CacheService.getScriptCache().put(
      leadListCacheKey_(kind, payload),
      serialized,
      Math.max(Number(ttlSeconds) || LEAD_LIST_CACHE_TTL_SECONDS_, 1)
    );
    return true;
  } catch (error) {
    console.warn('Lead list cache write skipped: ' + error.message);
    return false;
  }
}

function leadListCachePayload_(query) {
  const source = query && typeof query === 'object' ? query : {};
  return {
    revision: leadListCacheRevision_(),
    limit: source.limit,
    offset: source.offset,
    status: source.status,
    genre: source.genre,
    filter: source.filter,
    formStatus: source.formStatus,
    sort: source.sort,
    search: source.search,
    includeArchived: source.includeArchived === true,
    includeStats: source.includeStats === true,
    includeFields: (source.includeFields || []).slice().sort(),
    reviewPriority: source.reviewPriority || 'all',
    reviewContact: source.reviewContact || 'all',
  };
}

function buildReviewDuplicateLeadIds_(rows) {
  const suppressed = {};
  const index = buildSourcePageLeadIndexFromRecords_([]);
  (rows || []).forEach(function (lead) {
    if (lead && isArchivedLead_(lead)) addLeadToSourcePageIndex_(index, lead);
  });
  (rows || []).forEach(function (lead) {
    if (!lead || isArchivedLead_(lead)) return;
    const displayName = String(lead.facility_name || lead.company_name || '').trim();
    const existing = findExistingSourcePageLead_({
      source_id: lead.source_id || '',
      detail_url: lead.external_id || '',
    }, displayName, lead.website_url || '', index);
    const leadId = String(lead.id || '').trim();
    if (leadId && existing && isLeadReviewPending_(lead) && shouldSuppressReviewDuplicate_(lead, existing)) {
      suppressed[leadId] = String(existing.id || '');
      return;
    }
    addLeadToSourcePageIndex_(index, lead);
  });
  return suppressed;
}

function shouldSuppressReviewDuplicate_(candidate, existing) {
  const lead = candidate && typeof candidate === 'object' ? candidate : {};
  const current = existing && typeof existing === 'object' ? existing : {};
  const candidateSourceId = String(lead.source_id || '').trim();
  const existingSourceId = String(current.source_id || '').trim();
  if (candidateSourceId && existingSourceId && candidateSourceId === existingSourceId) return true;

  const candidateExternal = normalizeSourcePageComparableUrl_(lead.external_id || '');
  const existingExternal = normalizeSourcePageComparableUrl_(current.external_id || '');
  if (candidateExternal && existingExternal && candidateExternal === existingExternal) return true;

  const candidateWebsite = normalizeSourcePageComparableUrl_(lead.website_url || '');
  const existingWebsite = normalizeSourcePageComparableUrl_(current.website_url || '');
  if (candidateWebsite && existingWebsite && candidateWebsite === existingWebsite) return true;

  const candidateDomain = leadDuplicateWebsiteDomain_(lead);
  const existingDomain = leadDuplicateWebsiteDomain_(current);
  if (candidateDomain && existingDomain && candidateDomain === existingDomain) return true;

  const candidateName = String(lead.facility_name || lead.company_name || '');
  const existingName = String(current.facility_name || current.company_name || '');
  if (!areSourcePageLeadNamesClearlySame_(candidateName, existingName)) return false;
  return String(current.status || '').trim() !== '未対応' ||
    String(current.form_status || '').trim() === '対応不要' ||
    normalizeBooleanLike_(current.send_ng) ||
    Number(current.send_count || 0) > 0 ||
    Boolean(String(current.last_sent_at || '').trim());
}

function buildLeadListMasterContext_(rows) {
  return Object.assign({}, buildMasterBlockRulesContext_(), {
    reviewDuplicateLeadIds: buildReviewDuplicateLeadIds_(rows),
  });
}

function canBuildLeadListPrimaryFilterBundle_(query) {
  const source = query && typeof query === 'object' ? query : {};
  return String(source.filter || '').indexOf('group_') === 0 &&
    LEAD_LIST_PRIMARY_FILTERS_.indexOf(String(source.filter || '')) !== -1 &&
    Number(source.offset || 0) === 0 &&
    String(source.sort || 'updated_desc') === 'updated_desc' &&
    !source.search &&
    !source.status &&
    !source.formStatus &&
    source.includeArchived !== true &&
    source.includeStats === false;
}

function buildLeadListPrimaryFilterBundle_(rows, query, masterContext) {
  if (!canBuildLeadListPrimaryFilterBundle_(query)) return null;

  const groupByState = LEAD_LIST_STATE_GROUP_DEFINITIONS_.reduce(function (result, definition) {
    definition.states.forEach(function (stateKey) {
      result[stateKey] = 'group_' + definition.key;
    });
    return result;
  }, {});
  const buckets = LEAD_LIST_PRIMARY_FILTERS_.reduce(function (result, filter) {
    result[filter] = [];
    return result;
  }, {});
  const activeRows = (rows || []).filter(function (lead) {
    if (isArchivedLead_(lead)) return false;
    return !query.genre || String(lead.genre || '') === query.genre;
  });
  sortLeads_(activeRows, 'updated_desc');
  activeRows.forEach(function (lead) {
    buckets.all.push(lead);
    const groupFilter = groupByState[classifyLeadListState_(lead, masterContext)];
    if (groupFilter && buckets[groupFilter]) buckets[groupFilter].push(lead);
  });

  let selectedResponse = null;
  LEAD_LIST_PRIMARY_FILTERS_.forEach(function (filter) {
    const items = buckets[filter] || [];
    const variantQuery = Object.assign({}, query, { filter: filter });
    const response = {
      total: items.length,
      offset: 0,
      limit: query.limit,
      filter: filter,
      genre: query.genre,
      sort: query.sort,
      items: items.slice(0, query.limit),
      cacheHit: false,
    };
    writeLeadListCache_('page', leadListCachePayload_(variantQuery), response, LEAD_LIST_CACHE_TTL_SECONDS_);
    if (filter === query.filter) selectedResponse = response;
  });
  return selectedResponse;
}

function listLeads(options) {
  const query = normalizeListOptions_(options);
  const cachePayload = leadListCachePayload_(query);
  const cached = readLeadListCache_('page', cachePayload);
  if (cached) return cached;
  const rows = overlayPendingReviewDecisionsOnLeads_(
    readSheetRecordFields_('leads', leadListFields_(query.includeFields), { maxGapColumns: LEAD_LIST_READ_MAX_GAP_COLUMNS_ })
  );
  const masterContext = leadListQueryNeedsMasterContext_(query) ? buildLeadListMasterContext_(rows) : {};
  const primaryFilterResponse = buildLeadListPrimaryFilterBundle_(rows, query, masterContext);
  if (primaryFilterResponse) return primaryFilterResponse;
  const preparedRows = query.filter === 'review' ? rows.map(function (lead) {
    return isLeadReviewPending_(lead) ? decorateReviewLeadForList_(lead) : lead;
  }) : rows;
  const filterPreparedRows = function (filterQuery) {
    return preparedRows.filter(function (lead) {
      if (!filterQuery.includeArchived && isArchivedLead_(lead)) {
        return false;
      }
      if (filterQuery.status && lead.status !== filterQuery.status) {
        return false;
      }
      if (filterQuery.genre && String(lead.genre || '') !== filterQuery.genre) {
        return false;
      }
      if (filterQuery.formStatus && !matchesFormStatusFilter_(lead, filterQuery.formStatus)) {
        return false;
      }
      if (!matchesLeadListFilter_(lead, filterQuery.filter, masterContext)) {
        return false;
      }
      if (filterQuery.filter === 'review' && !matchesReviewLeadConvenienceFilters_(lead, filterQuery)) return false;
      if (!filterQuery.search) {
        return true;
      }

      const haystack = [
        lead.company_name,
        lead.facility_name,
        lead.website_url,
        lead.form_url,
        lead.email,
        lead.genre,
        lead.status,
        lead.source,
      ].join(' ').toLowerCase();

      return haystack.indexOf(filterQuery.search) !== -1;
    });
  };
  const filtered = filterPreparedRows(query);

  sortLeads_(filtered, query.sort);

  const response = {
    total: filtered.length,
    offset: query.offset,
    limit: query.limit,
    filter: query.filter,
    genre: query.genre,
    sort: query.sort,
    items: filtered.slice(query.offset, query.offset + query.limit),
  };
  if (query.filter === 'review') {
    response.reviewOverallTotal = preparedRows.filter(function (lead) {
      return !isArchivedLead_(lead) && matchesLeadListFilter_(lead, 'review', masterContext);
    }).length;
    const reviewContactRows = query.reviewContact === 'all'
      ? filtered
      : filterPreparedRows(Object.assign({}, query, { reviewContact: 'all' }));
    response.reviewContactSummary = buildReviewContactSummary_(reviewContactRows);
  }
  if (query.includeStats) {
    response.stats = buildLeadListStats_(rows, masterContext, query.genre);
    response.filteredStats = buildLeadListStats_(filtered, masterContext, query.genre);
  }
  response.cacheHit = false;
  writeLeadListCache_('page', cachePayload, response, LEAD_LIST_CACHE_TTL_SECONDS_);
  return response;
}

function getLeadListStats(options) {
  const input = options && typeof options === 'object' ? options : {};
  const genre = String(input.genre || '').trim();
  const cachePayload = { revision: leadListCacheRevision_(), genre: genre };
  const cached = readLeadListCache_('stats', cachePayload);
  if (cached) return cached;

  const rows = overlayPendingReviewDecisionsOnLeads_(
    readSheetRecordFields_('leads', leadListFields_(['source_payload_json']), { maxGapColumns: LEAD_LIST_READ_MAX_GAP_COLUMNS_ })
  );
  const stats = buildLeadListStats_(rows, buildLeadListMasterContext_(rows), genre);
  const response = {
    genre: genre,
    stats: stats,
    generatedAt: nowIso_(),
    cacheHit: false,
  };
  writeLeadListCache_('stats', cachePayload, response, LEAD_LIST_STATS_CACHE_TTL_SECONDS_);
  return response;
}

function leadListQueryNeedsMasterContext_(query) {
  const source = query && typeof query === 'object' ? query : {};
  const filter = String(source.filter || 'all');
  if (source.includeStats !== false) return true;
  if (filter.indexOf('state_') === 0 || filter.indexOf('group_') === 0) return true;
  return ['email', 'form', 'unsent', 'review'].indexOf(filter) !== -1;
}

function listEmailSendCandidates(options) {
  const input = options && typeof options === 'object' ? options : {};
  const limit = Math.min(Math.max(Number(input.limit) || 100, 1), 100);
  const genre = String(input.genre || '').trim();
  const masterContext = buildMasterBlockContext_();
  const candidates = readSheetRecordFields_('leads', leadListFields_(['contact_name']), { maxGapColumns: 0 }).filter(function (lead) {
    if (isArchivedLead_(lead) || !isEmailSendTarget_(lead, masterContext)) return false;
    return !genre || String(lead.genre || '').trim() === genre;
  });
  sortLeads_(candidates, 'updated_desc');

  const seenEmails = {};
  const uniqueCandidates = candidates.filter(function (lead) {
    const email = String(lead.email || '').trim().toLowerCase();
    if (!email || seenEmails[email]) return false;
    seenEmails[email] = true;
    return true;
  });

  return {
    total: uniqueCandidates.length,
    limit: limit,
    genre: genre,
    items: uniqueCandidates.slice(0, limit),
  };
}

function sortLeads_(leads, sort) {
  leads.sort(function (a, b) {
    if (sort === 'review_email_first') {
      return Number(hasLeadEmailForSort_(b)) - Number(hasLeadEmailForSort_(a)) ||
        String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
    }
    if (sort === 'review_priority_desc') {
      return Number(b.review_priority_score || reviewLeadPriorityScore_(b)) - Number(a.review_priority_score || reviewLeadPriorityScore_(a)) ||
        String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
    }
    if (sort === 'company_asc') {
      return String(a.company_name || a.facility_name || '').localeCompare(String(b.company_name || b.facility_name || ''), 'ja');
    }
    if (sort === 'status_asc') {
      return String(a.status || '').localeCompare(String(b.status || ''), 'ja') ||
        String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
    }
    if (sort === 'created_desc') {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    }
    if (sort === 'last_sent_desc') {
      return String(b.last_sent_at || '').localeCompare(String(a.last_sent_at || '')) ||
        String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
    }
    return String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
  });
}

function hasLeadEmailForSort_(lead) {
  return Boolean(String(lead && lead.email || '').trim());
}

function matchesReviewLeadConvenienceFilters_(lead, query) {
  const source = query && typeof query === 'object' ? query : {};
  const priority = String(source.reviewPriority || 'all');
  const contact = String(source.reviewContact || 'all');
  const tier = String(lead.review_priority_tier || reviewLeadPriorityTier_(reviewLeadPriorityScore_(lead)));
  if (priority !== 'all' && tier !== priority) return false;
  const hasEmail = hasLeadEmailForSort_(lead);
  const hasForm = Boolean(String(lead.form_url || '').trim());
  if (contact === 'contact' && !hasEmail && !hasForm) return false;
  if (contact === 'no_contact' && (hasEmail || hasForm)) return false;
  if (contact === 'email' && !hasEmail) return false;
  if (contact === 'form' && !hasForm) return false;
  if (contact === 'form_only' && (!hasForm || hasEmail)) return false;
  return true;
}

function buildReviewContactSummary_(rows) {
  const source = Array.isArray(rows) ? rows : [];
  return source.reduce(function (summary, lead) {
    const hasEmail = hasLeadEmailForSort_(lead);
    const hasForm = Boolean(String(lead && lead.form_url || '').trim());
    summary.all += 1;
    if (hasEmail) summary.email += 1;
    if (hasForm && !hasEmail) summary.form_only += 1;
    if (!hasEmail && !hasForm) summary.no_contact += 1;
    return summary;
  }, { all: 0, email: 0, form_only: 0, no_contact: 0 });
}

function matchesLeadListFilter_(lead, filter, masterContext) {
  const value = String(filter || 'all');
  if (value === 'all') return true;
  const status = String(lead.status || '');
  const dealStatus = String(lead.deal_status || '未設定');
  const sendCount = Number(lead.send_count || 0);
  const replied = normalizeBooleanLike_(lead.reply_checked) || status === '返信あり';
  const sendNg = normalizeBooleanLike_(lead.send_ng) || status === '送信NG';
  const sent = sendCount > 0 || Boolean(lead.last_sent_at) || status.indexOf('送信済み') !== -1;
  const deal = dealStatus !== '未設定' || DEAL_STATUSES.indexOf(status) !== -1;

  if (value.indexOf('state_') === 0) {
    return classifyLeadListState_(lead, masterContext) === value.slice('state_'.length);
  }
  if (value.indexOf('group_') === 0) {
    const group = LEAD_LIST_STATE_GROUP_DEFINITIONS_.find(function (definition) {
      return definition.key === value.slice('group_'.length);
    });
    return Boolean(group) && group.states.indexOf(classifyLeadListState_(lead, masterContext)) !== -1;
  }

  if (value === 'email') return isEmailSendTarget_(lead, masterContext);
  if (value === 'has_email') return isValidEmailAddress_(lead.email);
  if (value === 'form') return isFormSendTarget_(lead, masterContext);
  if (value === 'form_all') return isFormOutreachLead_(lead);
  if (value === 'excluded') return sendNg || SEND_EXCLUDED_STATUSES.indexOf(status) !== -1;
  if (value === 'send_ng') return sendNg;
  if (value === 'unsent') return isValidEmailAddress_(lead.email) && !sent && !sendNg && !replied && !deal;
  if (value === 'sent') return sent;
  if (value === 'reply') return replied;
  if (value === 'deal') return deal;
  if (value === 'no_contact') return !sendNg && !isValidEmailAddress_(lead.email) && !lead.form_url;
  if (value === 'won') return dealStatus === '受注' || status === '受注';
  if (value === 'lost') return dealStatus === '失注' || status === '失注';
  if (value === 'review') return isLeadReviewPending_(lead) && !isSuppressedReviewDuplicate_(lead, masterContext);
  return true;
}

function classifyLeadListState_(lead, masterContext) {
  const source = lead && typeof lead === 'object' ? lead : {};
  const status = String(source.status || '');
  const dealStatus = String(source.deal_status || '未設定');
  const formStatus = String(source.form_status || '未対応');
  const sent = Number(source.send_count || 0) > 0 || Boolean(source.last_sent_at) || status.indexOf('送信済み') !== -1;

  if (dealStatus === '受注' || status === '受注') return 'won';
  if (dealStatus === '失注' || status === '失注') return 'lost';
  if (dealStatus === '商談予定' || dealStatus === '商談済み' || status === '商談予定' || status === '商談済み') return 'deal';
  if (normalizeBooleanLike_(source.reply_checked) || status === '返信あり') return 'reply';
  if (normalizeBooleanLike_(source.send_ng) || status === '送信NG') return 'send_ng';
  if (status === '対応不要' || formStatus === '対応不要') return 'no_action';
  if (isClearlyClosedLead_(source)) return 'no_action';
  if (isLeadLinkDefinitelyBroken_(source)) return 'no_action';
  if (isSuppressedReviewDuplicate_(source, masterContext)) return 'no_action';
  if (isLeadReviewPending_(source)) return 'review';
  if (sent) return 'sent';
  if (status === 'フォーム対応済み' || formStatus === '対応済み') return 'form_completed';
  if (status === 'フォーム対応中' || formStatus === '対応中') return 'form_in_progress';
  if (isEmailSendTarget_(source, masterContext)) return 'email_sendable';
  if (isFormSendTarget_(source, masterContext)) return 'form_sendable';
  if (!isValidEmailAddress_(source.email) && !String(source.form_url || '').trim()) return 'no_contact';
  return 'other';
}

function buildLeadListStateBreakdown_(rows, masterContext) {
  const counts = LEAD_LIST_STATE_DEFINITIONS_.reduce(function (result, definition) {
    result[definition.key] = 0;
    return result;
  }, {});
  (rows || []).forEach(function (lead) {
    const key = classifyLeadListState_(lead, masterContext);
    counts[key] = Number(counts[key] || 0) + 1;
  });
  return LEAD_LIST_STATE_DEFINITIONS_.map(function (definition) {
    return {
      key: definition.key,
      filter: 'state_' + definition.key,
      label: definition.label,
      detail: definition.detail,
      icon: definition.icon,
      count: Number(counts[definition.key] || 0),
    };
  });
}

function buildLeadListStateGroups_(breakdown) {
  const counts = (breakdown || []).reduce(function (result, item) {
    result[item.key] = Number(item.count || 0);
    return result;
  }, {});
  return LEAD_LIST_STATE_GROUP_DEFINITIONS_.map(function (definition) {
    return {
      key: definition.key,
      filter: 'group_' + definition.key,
      label: definition.label,
      detail: definition.detail,
      states: definition.states.slice(),
      count: definition.states.reduce(function (sum, stateKey) {
        return sum + Number(counts[stateKey] || 0);
      }, 0),
    };
  });
}

function isLeadReviewPending_(lead) {
  return Boolean(lead) &&
    String(lead.status || '') === '未対応' &&
    isReviewLeadSource_(lead) &&
    hasLeadReviewDestination_(lead) &&
    !isClearlyClosedLead_(lead) &&
    !isLeadLinkDefinitelyBroken_(lead);
}

function isSuppressedReviewDuplicate_(lead, masterContext) {
  const leadId = String(lead && lead.id || '').trim();
  const suppressed = masterContext && masterContext.reviewDuplicateLeadIds;
  return Boolean(leadId && suppressed && suppressed[leadId]);
}

function isClearlyClosedLead_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (isSuspendedLeadTitle_(source)) return true;
  const label = [
    String(source.company_name || '').trim(),
    String(source.facility_name || '').trim(),
  ].filter(Boolean).join(' ');
  if (!label) return false;
  if (/(?:移転|リニューアル|新店舗|新施設|新サイト|新しい(?:店舗|施設|サイト|ホームページ)).{0,50}(?:営業中|営業しております|オープン|開設|こちら)/i.test(label)) {
    return false;
  }
  return /(?:閉鎖|閉店|閉館|閉園|閉業|廃業|営業(?:を|は|が)?終了|サービス(?:を|は|が)?終了|運営(?:を|は|が)?終了)/i.test(label);
}

function suspendedLeadTitleTexts_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  const payload = parseJsonObjectSafe_(source.source_payload_json);
  const serper = payload.serper && typeof payload.serper === 'object' ? payload.serper : {};
  const searchProvider = payload.search_provider && typeof payload.search_provider === 'object'
    ? payload.search_provider
    : {};
  const selectedSerper = serper.selected && serper.selected.source &&
    typeof serper.selected.source === 'object'
    ? serper.selected.source
    : {};
  const selectedProvider = searchProvider.selected && searchProvider.selected.source &&
    typeof searchProvider.selected.source === 'object'
    ? searchProvider.selected.source
    : {};
  const candidate = payload.candidate && typeof payload.candidate === 'object'
    ? payload.candidate
    : {};
  return [
    source.company_name,
    source.facility_name,
    source.title,
    payload.title,
    selectedSerper.title,
    selectedProvider.title,
    candidate.facility_name,
    candidate.text,
    candidate.title,
  ].map(function (value) {
    return String(value || '').trim();
  }).filter(Boolean);
}

function isSuspendedLeadTitle_(lead) {
  return suspendedLeadTitleTexts_(lead).some(function (text) {
    return /休業/i.test(text);
  });
}

function isDefinitiveBrokenLinkError_(value) {
  const message = String(value || '').trim();
  if (!message) return false;
  return /\bHTTP\s+(?:404|410)\b|DNS\s*(?:error|failure|lookup)|could\s+not\s+resolve\s+host|cannot\s+resolve\s+host|name\s+or\s+service\s+not\s+known|host(?:name)?\s+(?:not\s+found|does\s+not\s+exist|unreachable)|no\s+such\s+host|unknown\s+host|address\s+unavailable|invalid\s+(?:argument[^\r\n]*?)?(?:url|uri)|malformed\s+(?:url|uri)|unsupported\s+protocol|connection\s+refused|certificate[^\r\n]*(?:error|expired|invalid|verify\s+failed)|SSL\s+(?:error|certificate|handshake)|PKIX\s+path\s+building\s+failed|ドメイン名.*(?:見つかりません|解決できません)|ホスト名.*(?:見つかりません|解決できません)|DNS.*(?:失敗|エラー)|アドレス.*利用できません|URL.*(?:不正|無効)|証明書.*(?:エラー|期限切れ|無効)|接続を拒否/i.test(message);
}

function leadSourcePayloadErrorText_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  const payload = parseJsonObjectSafe_(source.source_payload_json);
  const contact = payload.contact && typeof payload.contact === 'object' ? payload.contact : {};
  return [
    payload.contact_error,
    payload.detail_error,
    payload.fetch_error,
    payload.link_error,
    payload.error,
    contact.errorMessage,
    contact.error_message,
  ].filter(Boolean).join(' / ');
}

function isLeadLinkDefinitelyBroken_(lead) {
  return isDefinitiveBrokenLinkError_(leadSourcePayloadErrorText_(lead));
}

function assertAutomatedLeadSiteAvailableBeforeCreate_(lead, options) {
  const source = lead && typeof lead === 'object' ? lead : {};
  const input = options && typeof options === 'object' ? options : {};
  if (!isAutomatedLeadCollectionSource_(source.source) ||
      input.siteAvailabilityChecked === true ||
      input.site_availability_checked === true) return true;
  const targetUrl = normalizeUrl_(source.website_url || source.form_url || '');
  if (!targetUrl) return true;
  const availability = inspectProspectingSiteAvailability_(targetUrl);
  if (!availability.closed && !availability.broken) return true;
  const reason = availability.reason || (availability.closed ? 'サイト停止' : 'リンク切れ');
  throw createExpectedOperationError_(
    (availability.closed ? '閉鎖・営業終了・休業' : 'リンク切れ') +
      'が確認できるため、確認待ちリストへ追加しませんでした: ' + reason,
    availability.closed ? 'CLOSED_SITE' : 'BROKEN_LINK'
  );
}

function isReviewLeadSource_(lead) {
  return Boolean(lead) &&
    ['serper', 'search_job', 'prospecting', 'source_page'].indexOf(String(lead.source || '')) !== -1;
}

function hasLeadReviewDestination_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return Boolean(
    String(source.website_url || '').trim() ||
    isValidEmailAddress_(source.email) ||
    String(source.form_url || '').trim()
  );
}

function partitionLeadRepairTargets_(targets, options) {
  const source = Array.isArray(targets) ? targets.slice() : [];
  const input = options && typeof options === 'object' ? options : {};
  const maxItems = Math.min(Math.max(Number(input.maxItems) || 25, 1), 100);
  const maxRowSpan = Math.min(Math.max(Number(input.maxRowSpan) || 100, 1), 500);
  const normalized = source.filter(function (target) {
    return target && Number(target.rowNumber) >= 2;
  }).sort(function (left, right) {
    return Number(left.rowNumber) - Number(right.rowNumber);
  });
  const batches = [];
  normalized.forEach(function (target) {
    const current = batches.length ? batches[batches.length - 1] : null;
    const rowNumber = Number(target.rowNumber);
    const firstRow = current && current.length ? Number(current[0].rowNumber) : rowNumber;
    if (!current || current.length >= maxItems || rowNumber - firstRow + 1 > maxRowSpan) {
      batches.push([target]);
      return;
    }
    current.push(target);
  });
  return batches;
}

function repairReviewLeadsWithoutContact(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const startRow = Math.max(Number(input.startRow || input.start_row) || 2, 2);
  const scanLimit = Math.min(Math.max(Number(input.scanLimit || input.scan_limit) || 20000, 1), 20000);
  const maxUpdates = Math.min(Math.max(Number(input.maxUpdates || input.max_updates) || 250, 1), 500);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const requiredHeaders = [
    'id',
    'source',
    'status',
    'website_url',
    'email',
    'form_url',
    'form_status',
    'next_send_at',
    'last_sent_at',
    'send_count',
    'reply_checked',
    'deal_status',
    'no_action_reason',
    'no_action_memo',
    'updated_at',
  ];
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('leadsシートに' + header + '列が必要です。');
  });

  const lastRow = sheet.getLastRow();
  if (startRow > lastRow) {
    return {
      ok: true,
      dryRun: dryRun,
      startRow: startRow,
      nextRow: startRow,
      lastRow: lastRow,
      scanned: 0,
      eligible: 0,
      matched: 0,
      updated: 0,
      done: true,
    };
  }

  const rowCount = Math.min(scanLimit, lastRow - startRow + 1);
  const values = sheet.getRange(startRow, 1, rowCount, headers.length).getValues();
  const indexes = {};
  requiredHeaders.forEach(function (header) { indexes[header] = headers.indexOf(header); });
  const targets = [];
  let eligible = 0;
  let lastScannedRow = startRow - 1;
  for (let index = 0; index < values.length; index += 1) {
    const rowNumber = startRow + index;
    lastScannedRow = rowNumber;
    const lead = {
      source: values[index][indexes.source],
      status: values[index][indexes.status],
      website_url: values[index][indexes.website_url],
      email: values[index][indexes.email],
      form_url: values[index][indexes.form_url],
    };
    if (!isReviewLeadSource_(lead) || String(lead.status || '') !== '未対応') continue;
    eligible += 1;
    if (hasLeadReviewDestination_(lead)) continue;
    targets.push({
      rowNumber: rowNumber,
      id: String(values[index][indexes.id] || ''),
    });
    if (targets.length >= maxUpdates) break;
  }

  const baseResult = {
    ok: true,
    dryRun: dryRun,
    startRow: startRow,
    nextRow: lastScannedRow + 1,
    lastRow: lastRow,
    scanned: Math.max(lastScannedRow - startRow + 1, 0),
    eligible: eligible,
    matched: targets.length,
    updated: 0,
    lockBatches: 0,
    done: lastScannedRow >= lastRow,
  };
  if (dryRun || !targets.length) return baseResult;

  let updated = 0;
  const batches = partitionLeadRepairTargets_(targets);
  batches.forEach(function (batch) {
    updated += withScriptLock_('repairReviewLeadsWithoutContact:batch', function () {
      const firstRow = Number(batch[0].rowNumber);
      const lastBatchRow = Number(batch[batch.length - 1].rowNumber);
      const currentValues = sheet.getRange(firstRow, 1, lastBatchRow - firstRow + 1, headers.length).getValues();
      const verifiedRows = [];
      batch.forEach(function (target) {
        const current = currentValues[Number(target.rowNumber) - firstRow] || [];
        if (String(current[indexes.id] || '') !== String(target.id || '')) return;
        const lead = {
          source: current[indexes.source],
          status: current[indexes.status],
          website_url: current[indexes.website_url],
          email: current[indexes.email],
          form_url: current[indexes.form_url],
        };
        if (!isReviewLeadSource_(lead) || String(lead.status || '') !== '未対応' || hasLeadReviewDestination_(lead)) return;
        verifiedRows.push(Number(target.rowNumber));
      });

      if (verifiedRows.length) {
        const setColumnValue = function (header, value) {
          const columnA1 = columnNumberToA1_(indexes[header] + 1);
          sheet.getRangeList(verifiedRows.map(function (rowNumber) {
            return columnA1 + rowNumber;
          })).setValue(value);
        };
        setColumnValue('status', '対応不要');
        setColumnValue('form_status', '対応不要');
        setColumnValue('next_send_at', '');
        setColumnValue('no_action_reason', '問い合わせ不可');
        setColumnValue('no_action_memo', 'WEBサイト・メール・フォーム未取得のため自動除外');
        setColumnValue('updated_at', nowIso_());
        clearRuntimeCaches_('leads');
        SpreadsheetApp.flush();
      }
      return verifiedRows.length;
    }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  });

  return Object.assign({}, baseResult, {
    updated: updated,
    lockBatches: batches.length,
  });
}

function repairNonAdvertiserReviewLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const tourismOnly = input.tourismOnly === true || input.tourism_only === true;
  const suspendedOnly = input.suspendedOnly === true || input.suspended_only === true;
  const blogMediaOnly = input.blogMediaOnly === true || input.blog_media_only === true;
  const registerExcludedDomains = (tourismOnly || blogMediaOnly) &&
    input.registerExcludedDomains !== false &&
    input.register_excluded_domains !== false;
  const startRow = Math.max(Number(input.startRow || input.start_row) || 2, 2);
  const scanLimit = Math.min(Math.max(Number(input.scanLimit || input.scan_limit) || 20000, 1), 20000);
  const maxUpdates = Math.min(Math.max(Number(input.maxUpdates || input.max_updates) || 250, 1), 500);
  const lockWaitMs = Math.min(Math.max(Number(input.lockWaitMs || input.lock_wait_ms) || 6000, 1000), 6000);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const requiredHeaders = [
    'id',
    'source',
    'company_name',
    'facility_name',
    'status',
    'website_url',
    'form_url',
    'last_sent_at',
    'send_count',
    'reply_checked',
    'deal_status',
    'form_status',
    'next_send_at',
    'no_action_reason',
    'no_action_memo',
    'source_payload_json',
    'archived_at',
    'updated_at',
  ];
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('leadsシートに' + header + '列が必要です。');
  });

  const lastRow = sheet.getLastRow();
  if (startRow > lastRow) {
    return {
      ok: true,
      dryRun: dryRun,
      tourismOnly: tourismOnly,
      suspendedOnly: suspendedOnly,
      blogMediaOnly: blogMediaOnly,
      startRow: startRow,
      nextRow: startRow,
      lastRow: lastRow,
      scanned: 0,
      matched: 0,
      deleted: 0,
      done: true,
      items: [],
    };
  }

  const rowCount = Math.min(scanLimit, lastRow - startRow + 1);
  const values = sheet.getRange(startRow, 1, rowCount, headers.length).getValues();
  const indexes = {};
  requiredHeaders.forEach(function (header) { indexes[header] = headers.indexOf(header); });
  const excludedDomains = getLeadCollectionExcludedDomainRecords_();
  const targets = [];
  let lastScannedRow = startRow - 1;
  for (let index = 0; index < values.length; index += 1) {
    const rowNumber = startRow + index;
    lastScannedRow = rowNumber;
    const lead = {
      id: values[index][indexes.id],
      source: values[index][indexes.source],
      company_name: values[index][indexes.company_name],
      facility_name: values[index][indexes.facility_name],
      status: values[index][indexes.status],
      website_url: values[index][indexes.website_url],
      form_url: values[index][indexes.form_url],
      last_sent_at: values[index][indexes.last_sent_at],
      send_count: values[index][indexes.send_count],
      reply_checked: values[index][indexes.reply_checked],
      deal_status: values[index][indexes.deal_status],
      source_payload_json: values[index][indexes.source_payload_json],
      archived_at: values[index][indexes.archived_at],
    };
    const isCleanupCandidate = suspendedOnly
      ? isSuspendedLeadCleanupCandidate_(lead)
      : blogMediaOnly
        ? isBlogMediaCleanupCandidate_(lead)
      : tourismOnly
        ? isTourismPortalCleanupCandidate_(lead)
        : isNonAdvertiserCleanupCandidate_(lead, excludedDomains);
    if (!isCleanupCandidate) continue;
    const leadUrls = [lead.website_url, lead.form_url].filter(Boolean);
    const blockedUrl = tourismOnly || suspendedOnly || blogMediaOnly
      ? leadUrls[0] || ''
      : leadUrls.find(function (url) {
        return isLeadCollectionExcludedUrl_(url, excludedDomains);
      });
    if (!blockedUrl && !suspendedOnly) continue;
    targets.push({
      rowNumber: rowNumber,
      id: String(lead.id || ''),
      name: String(lead.facility_name || lead.company_name || ''),
      domain: normalizeDomain_(blockedUrl),
      url: normalizeUrl_(blockedUrl),
    });
    if (targets.length >= maxUpdates) break;
  }

  const baseResult = {
    ok: true,
    dryRun: dryRun,
    tourismOnly: tourismOnly,
    suspendedOnly: suspendedOnly,
    blogMediaOnly: blogMediaOnly,
    startRow: startRow,
    nextRow: lastScannedRow + 1,
    lastRow: lastRow,
    scanned: Math.max(lastScannedRow - startRow + 1, 0),
    matched: targets.length,
    deleted: 0,
    lockBatches: 0,
    done: lastScannedRow >= lastRow,
    items: targets.slice(0, 50),
  };
  if (dryRun || !targets.length) return baseResult;

  let exclusions = { ok: true, inserted: 0, updated: 0, skipped: 0, total: 0 };
  if (registerExcludedDomains) {
    const recordsByDomain = {};
    targets.forEach(function (target) {
      const domain = normalizeDomain_(target.domain || target.url || '');
      if (!domain || isDomainOrSubdomain_(domain, 'honda.co.jp')) return;
      recordsByDomain[domain] = {
        domain: domain,
        reason: blogMediaOnly
          ? 'ブログ・編集メディア・施設検索サイトのため収集対象外'
          : '観光協会・自治体観光案内・旅行情報メディアのため収集対象外',
        active: true,
      };
    });
    exclusions = importExcludedDomains({
      records: Object.keys(recordsByDomain).sort().map(function (domain) {
        return recordsByDomain[domain];
      }),
      lockWaitMs: Math.max(lockWaitMs, 6000),
    });
  }

  let deleted = 0;
  const batches = partitionLeadRepairTargets_(targets);
  batches.forEach(function (batch) {
    deleted += withScriptLock_('repairNonAdvertiserReviewLeads:batch', function () {
      const firstRow = Number(batch[0].rowNumber);
      const lastBatchRow = Number(batch[batch.length - 1].rowNumber);
      const currentValues = sheet.getRange(firstRow, 1, lastBatchRow - firstRow + 1, headers.length).getValues();
      const verifiedRows = [];
      batch.forEach(function (target) {
        const current = currentValues[Number(target.rowNumber) - firstRow] || [];
        if (String(current[indexes.id] || '') !== String(target.id || '')) return;
        const lead = {
          source: current[indexes.source],
          company_name: current[indexes.company_name],
          facility_name: current[indexes.facility_name],
          status: current[indexes.status],
          website_url: current[indexes.website_url],
          form_url: current[indexes.form_url],
          last_sent_at: current[indexes.last_sent_at],
          send_count: current[indexes.send_count],
          reply_checked: current[indexes.reply_checked],
          deal_status: current[indexes.deal_status],
          source_payload_json: current[indexes.source_payload_json],
          archived_at: current[indexes.archived_at],
        };
        const isCleanupCandidate = suspendedOnly
          ? isSuspendedLeadCleanupCandidate_(lead)
          : blogMediaOnly
            ? isBlogMediaCleanupCandidate_(lead)
          : tourismOnly
            ? isTourismPortalCleanupCandidate_(lead)
            : isNonAdvertiserCleanupCandidate_(lead, excludedDomains);
        if (isCleanupCandidate) verifiedRows.push(Number(target.rowNumber));
      });

      if (verifiedRows.length) {
        const now = nowIso_();
        const setColumnValue = function (header, value) {
          const columnA1 = columnNumberToA1_(indexes[header] + 1);
          sheet.getRangeList(verifiedRows.map(function (rowNumber) {
            return columnA1 + rowNumber;
          })).setValue(value);
        };
        setColumnValue('status', '対応不要');
        setColumnValue('form_status', '対応不要');
        setColumnValue('next_send_at', '');
        setColumnValue(
          'no_action_reason',
          suspendedOnly
            ? '休業'
            : blogMediaOnly
              ? 'ブログ・情報サイト'
              : tourismOnly
                ? '観光サイト'
                : '収集対象外サイト'
        );
        setColumnValue(
          'no_action_memo',
          suspendedOnly
            ? '施設名・ページタイトル・見出しに休業の表記があるため自動除外'
            : blogMediaOnly
            ? '個人ブログ・編集記事・施設検索／紹介サイトのため自動除外'
            : tourismOnly
            ? '観光協会・自治体観光案内・旅行情報メディアの紹介ページのため自動除外'
            : '広告主の公式サイトではないポータル・比較・観光情報ページのため自動削除'
        );
        setColumnValue('archived_at', now);
        setColumnValue('updated_at', now);
        clearRuntimeCaches_('leads');
        SpreadsheetApp.flush();
      }
      return verifiedRows.length;
    }, { waitMs: lockWaitMs, attempts: 5, retryDelayMs: 400 });
  });

  return Object.assign({}, baseResult, {
    deleted: deleted,
    lockBatches: batches.length,
    exclusions: exclusions,
  });
}

function repairTourismPortalReviewLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  return repairNonAdvertiserReviewLeads(Object.assign({}, input, {
    tourismOnly: true,
    registerExcludedDomains: input.registerExcludedDomains !== false &&
      input.register_excluded_domains !== false,
  }));
}

function repairBlogMediaReviewLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  return repairNonAdvertiserReviewLeads(Object.assign({}, input, {
    blogMediaOnly: true,
    registerExcludedDomains: input.registerExcludedDomains !== false &&
      input.register_excluded_domains !== false,
  }));
}

function repairSuspendedReviewLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  return repairNonAdvertiserReviewLeads(Object.assign({}, input, {
    suspendedOnly: true,
    registerExcludedDomains: false,
  }));
}

function isVerifiedBrokenReviewFinding_(finding) {
  const source = finding && typeof finding === 'object' ? finding : {};
  const statusCode = Number(source.statusCode || source.status_code || 0);
  if (statusCode === 404 || statusCode === 410) return true;
  return isDefinitiveBrokenLinkError_(
    source.reason || source.errorMessage || source.error_message || ''
  );
}

function brokenReviewLeadTargetUrl_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return normalizeUrl_(source.website_url || source.form_url || '');
}

function isBrokenReviewLeadCleanupCandidate_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return isSafeNonAdvertiserLeadCleanupTarget_(source) &&
    String(source.status || '') === '未対応' &&
    isReviewLeadSource_(source) &&
    Boolean(brokenReviewLeadTargetUrl_(source));
}

function repairBrokenReviewLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const findings = Array.isArray(input.findings) ? input.findings : [];
  const maxUpdates = Math.min(Math.max(Number(input.maxUpdates || input.max_updates) || 500, 1), 500);
  const lockWaitMs = Math.min(Math.max(Number(input.lockWaitMs || input.lock_wait_ms) || 6000, 1000), 6000);
  const verifiedFindings = {};
  findings.forEach(function (finding) {
    const id = String(finding && finding.id || '').trim();
    const url = normalizeUrl_(finding && finding.url || '');
    if (!id || !url || !isVerifiedBrokenReviewFinding_(finding)) return;
    verifiedFindings[id] = {
      id: id,
      url: url,
      statusCode: Number(finding.statusCode || finding.status_code || 0),
      reason: String(finding.reason || finding.errorMessage || finding.error_message || '').trim(),
    };
  });

  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const requiredHeaders = [
    'id', 'source', 'status', 'website_url', 'form_url', 'last_sent_at', 'send_count',
    'reply_checked', 'deal_status', 'form_status', 'next_send_at', 'no_action_reason',
    'no_action_memo', 'source_payload_json', 'archived_at', 'updated_at',
  ];
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('leadsシートに' + header + '列が必要です。');
  });
  const indexes = {};
  requiredHeaders.forEach(function (header) { indexes[header] = headers.indexOf(header); });
  const lastRow = sheet.getLastRow();
  const rowCount = Math.max(lastRow - 1, 0);
  if (!rowCount || !Object.keys(verifiedFindings).length) {
    return { ok: true, dryRun: dryRun, findings: findings.length, verified: 0, matched: 0, archived: 0, items: [] };
  }

  const values = sheet.getRange(2, 1, rowCount, headers.length).getValues();
  const targets = [];
  values.some(function (row, index) {
    const id = String(row[indexes.id] || '').trim();
    const finding = verifiedFindings[id];
    if (!finding) return false;
    const lead = rowToRecord_(headers, row);
    if (!isBrokenReviewLeadCleanupCandidate_(lead) ||
        brokenReviewLeadTargetUrl_(lead) !== finding.url) return false;
    targets.push({
      rowNumber: index + 2,
      id: id,
      url: finding.url,
      statusCode: finding.statusCode,
      reason: finding.reason || ('HTTP ' + finding.statusCode),
    });
    return targets.length >= maxUpdates;
  });

  const result = {
    ok: true,
    dryRun: dryRun,
    findings: findings.length,
    verified: Object.keys(verifiedFindings).length,
    matched: targets.length,
    archived: 0,
    items: targets.slice(0, 100),
  };
  if (dryRun || !targets.length) return result;

  let archived = 0;
  const batches = partitionLeadRepairTargets_(targets);
  batches.forEach(function (batch) {
    archived += withScriptLock_('repairBrokenReviewLeads:batch', function () {
      const firstRow = Number(batch[0].rowNumber);
      const lastBatchRow = Number(batch[batch.length - 1].rowNumber);
      const range = sheet.getRange(firstRow, 1, lastBatchRow - firstRow + 1, headers.length);
      const currentValues = range.getValues();
      let updated = 0;
      const now = nowIso_();
      batch.forEach(function (target) {
        const offset = Number(target.rowNumber) - firstRow;
        const row = currentValues[offset] || [];
        const lead = rowToRecord_(headers, row);
        if (String(lead.id || '') !== target.id ||
            !isBrokenReviewLeadCleanupCandidate_(lead) ||
            brokenReviewLeadTargetUrl_(lead) !== target.url) return;
        const payload = parseJsonObjectSafe_(lead.source_payload_json);
        payload.link_error = target.reason;
        payload.link_checked_at = now;
        row[indexes.status] = '対応不要';
        row[indexes.form_status] = '対応不要';
        row[indexes.next_send_at] = '';
        row[indexes.no_action_reason] = 'リンク切れ';
        row[indexes.no_action_memo] = '公式サイトへアクセスできないため自動除外: ' + target.reason;
        row[indexes.source_payload_json] = safeJsonStringify_(payload);
        row[indexes.archived_at] = now;
        row[indexes.updated_at] = now;
        updated += 1;
      });
      if (updated) {
        range.setValues(currentValues);
        clearRuntimeCaches_('leads');
        SpreadsheetApp.flush();
      }
      return updated;
    }, { waitMs: lockWaitMs, attempts: 5, retryDelayMs: 400 });
  });
  return Object.assign({}, result, { archived: archived, lockBatches: batches.length });
}

function repairNonAdvertiserCleanupOverreach(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const scanLimit = Math.min(Math.max(Number(input.scanLimit || input.scan_limit) || 20000, 1), 20000);
  const maxUpdates = Math.min(Math.max(Number(input.maxUpdates || input.max_updates) || 250, 1), 500);
  const lockWaitMs = Math.min(Math.max(Number(input.lockWaitMs || input.lock_wait_ms) || 6000, 1000), 6000);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const requiredHeaders = [
    'id', 'source', 'company_name', 'facility_name', 'status', 'website_url', 'form_url',
    'send_ng', 'form_status', 'next_send_at', 'no_action_reason', 'no_action_memo',
    'archived_at', 'updated_at',
  ];
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('leadsシートに' + header + '列が必要です。');
  });
  const indexes = {};
  requiredHeaders.forEach(function (header) { indexes[header] = headers.indexOf(header); });
  const lastRow = sheet.getLastRow();
  const rowCount = Math.min(scanLimit, Math.max(lastRow - 1, 0));
  if (!rowCount) return { ok: true, dryRun: dryRun, scanned: 0, matched: 0, restored: 0, done: true, items: [] };

  const cleanupMemo = '広告主の公式サイトではないポータル・比較・観光情報ページのため自動削除';
  const values = sheet.getRange(2, 1, rowCount, headers.length).getValues();
  const targets = [];
  let lastScannedRow = 1;
  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    lastScannedRow = index + 2;
    const websiteUrl = row[indexes.website_url];
    const formUrl = row[indexes.form_url];
    const urls = [websiteUrl, formUrl].filter(Boolean);
    if (!row[indexes.archived_at] || row[indexes.no_action_memo] !== cleanupMemo) continue;
    if (!isAutomatedLeadCollectionSource_(row[indexes.source])) continue;
    if (urls.some(function (url) { return isKnownNonAdvertiserLeadUrl_(url); })) continue;
    targets.push({
      rowNumber: index + 2,
      id: String(row[indexes.id] || ''),
      name: String(row[indexes.facility_name] || row[indexes.company_name] || ''),
      domain: normalizeDomain_(websiteUrl || formUrl),
      sendNg: normalizeBooleanLike_(row[indexes.send_ng]),
    });
    if (targets.length >= maxUpdates) break;
  }
  const result = {
    ok: true,
    dryRun: dryRun,
    scanned: Math.max(lastScannedRow - 1, 0),
    matched: targets.length,
    restored: 0,
    lockBatches: 0,
    done: lastScannedRow >= lastRow,
    items: targets.slice(0, 50),
  };
  if (dryRun || !targets.length) return result;

  let restored = 0;
  const batches = partitionLeadRepairTargets_(targets);
  batches.forEach(function (batch) {
    restored += withScriptLock_('repairNonAdvertiserCleanupOverreach:batch', function () {
      const firstRow = Number(batch[0].rowNumber);
      const lastBatchRow = Number(batch[batch.length - 1].rowNumber);
      const currentValues = sheet.getRange(firstRow, 1, lastBatchRow - firstRow + 1, headers.length).getValues();
      const verified = batch.reduce(function (items, target) {
        const row = currentValues[Number(target.rowNumber) - firstRow] || [];
        if (String(row[indexes.id] || '') !== String(target.id || '')) return items;
        const urls = [row[indexes.website_url], row[indexes.form_url]].filter(Boolean);
        if (!row[indexes.archived_at] || row[indexes.no_action_memo] !== cleanupMemo ||
          !isAutomatedLeadCollectionSource_(row[indexes.source]) ||
          urls.some(function (url) { return isKnownNonAdvertiserLeadUrl_(url); })) return items;
        items.push(Object.assign({}, target, {
          sendNg: normalizeBooleanLike_(row[indexes.send_ng]),
        }));
        return items;
      }, []);
      if (verified.length) {
        const rowsFor = function (items) { return items.map(function (target) { return Number(target.rowNumber); }); };
        const setRows = function (header, rows, value) {
          if (!rows.length) return;
          const columnA1 = columnNumberToA1_(indexes[header] + 1);
          sheet.getRangeList(rows.map(function (rowNumber) { return columnA1 + rowNumber; })).setValue(value);
        };
        const allRows = rowsFor(verified);
        setRows('status', rowsFor(verified.filter(function (target) { return target.sendNg; })), '送信NG');
        setRows('status', rowsFor(verified.filter(function (target) { return !target.sendNg; })), '未対応');
        setRows('form_status', allRows, '未対応');
        setRows('next_send_at', allRows, '');
        setRows('no_action_reason', allRows, '');
        setRows('no_action_memo', allRows, '');
        setRows('archived_at', allRows, '');
        setRows('updated_at', allRows, nowIso_());
        clearRuntimeCaches_('leads');
        SpreadsheetApp.flush();
      }
      return verified.length;
    }, { waitMs: lockWaitMs, attempts: 5, retryDelayMs: 400 });
  });

  return Object.assign({}, result, {
    restored: restored,
    lockBatches: batches.length,
  });
}

function leadDuplicateWebsiteDomain_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return normalizeDomain_(source.website_url || '');
}

function duplicateDomainKeeperScore_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  const status = String(source.status || '').trim();
  const dealStatus = String(source.deal_status || '未設定').trim() || '未設定';
  const displayName = String(source.facility_name || source.company_name || '').trim();
  let score = 0;
  if (dealStatus === '受注' || status === '受注') score += 9000000;
  else if (dealStatus !== '未設定' || DEAL_STATUSES.indexOf(status) !== -1) score += 8000000;
  if (normalizeBooleanLike_(source.reply_checked) || status === '返信あり') score += 7000000;
  if (Number(source.send_count || 0) > 0 || String(source.last_sent_at || '').trim() || status.indexOf('送信済み') !== -1) {
    score += 6000000 + Math.min(Number(source.send_count || 0), 999) * 1000;
  }
  if (String(source.source || '').trim() === 'manual') score += 500000;
  if (isValidEmailAddress_(source.email)) score += 100000;
  if (String(source.form_url || '').trim()) score += 50000;
  if (String(source.website_url || '').trim()) score += 20000;
  if (String(source.phone || '').trim()) score += 10000;
  if (String(source.address || '').trim()) score += 5000;
  if (displayName) score += 1000;
  if (status === '対応不要' || String(source.no_action_reason || '').trim()) score -= 1000000;
  if (/(?:閉鎖|閉場|閉園|廃止|休止|営業終了|移転の為閉鎖)/.test(displayName)) score -= 2000000;
  if (/(?:全国\d+件|公式HPをみる|ご利用案内)$/.test(displayName)) score -= 300000;
  return score;
}

function sortDuplicateDomainLeadsForKeeper_(leads) {
  return (leads || []).slice().sort(function (left, right) {
    const scoreDiff = duplicateDomainKeeperScore_(right) - duplicateDomainKeeperScore_(left);
    if (scoreDiff) return scoreDiff;
    const createdDiff = String(left.created_at || '').localeCompare(String(right.created_at || ''));
    if (createdDiff) return createdDiff;
    return String(left.id || '').localeCompare(String(right.id || ''));
  });
}

function duplicateDomainGroupsFromRecords_(leads) {
  const groups = {};
  (leads || []).forEach(function (lead) {
    if (!lead || isArchivedLead_(lead)) return;
    const domain = leadDuplicateWebsiteDomain_(lead);
    if (!domain) return;
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(lead);
  });
  return Object.keys(groups).filter(function (domain) {
    return groups[domain].length > 1;
  }).sort().map(function (domain) {
    const sorted = sortDuplicateDomainLeadsForKeeper_(groups[domain]);
    return {
      domain: domain,
      keeper: sorted[0],
      duplicates: sorted.slice(1),
      leads: sorted,
    };
  });
}

function mergeDuplicateDomainContactFields_(keeper, duplicates) {
  const merged = Object.assign({}, keeper || {});
  const candidates = (duplicates || []).slice();
  ['email', 'phone', 'form_url', 'address'].forEach(function (field) {
    if (String(merged[field] || '').trim()) return;
    const donor = candidates.find(function (lead) { return String(lead[field] || '').trim(); });
    if (donor) merged[field] = donor[field];
  });
  return merged;
}

function repairDuplicateLeadDomains(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const scanLimit = Math.min(Math.max(Number(input.scanLimit || input.scan_limit) || 20000, 1), 20000);
  const maxGroups = Math.min(Math.max(Number(input.maxGroups || input.max_groups) || 200, 1), 500);
  const lockWaitMs = Math.min(Math.max(Number(input.lockWaitMs || input.lock_wait_ms) || 6000, 1000), 6000);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const requiredHeaders = [
    'id', 'source', 'company_name', 'facility_name', 'email', 'phone', 'website_url', 'form_url', 'address',
    'status', 'form_status', 'next_send_at', 'last_sent_at', 'send_count', 'reply_checked', 'deal_status',
    'no_action_reason', 'no_action_memo', 'created_at', 'updated_at', 'archived_at',
  ];
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('leadsシートに' + header + '列が必要です。');
  });
  const lastRow = sheet.getLastRow();
  const rowCount = Math.min(scanLimit, Math.max(lastRow - 1, 0));
  if (!rowCount) {
    return { ok: true, dryRun: dryRun, scanned: 0, totalGroups: 0, duplicateCount: 0, archived: 0, merged: 0, done: true, items: [] };
  }

  const values = sheet.getRange(2, 1, rowCount, headers.length).getValues();
  const records = values.map(function (row, index) {
    const record = rowToRecord_(headers, row);
    record.__rowNumber = index + 2;
    return record;
  });
  const allGroups = duplicateDomainGroupsFromRecords_(records);
  const targetGroups = allGroups.slice(0, maxGroups);
  const result = {
    ok: true,
    dryRun: dryRun,
    scanned: rowCount,
    totalGroups: allGroups.length,
    duplicateCount: allGroups.reduce(function (sum, group) { return sum + group.duplicates.length; }, 0),
    archived: 0,
    merged: 0,
    done: allGroups.length <= maxGroups,
    items: targetGroups.slice(0, 100).map(function (group) {
      return {
        domain: group.domain,
        keeperId: String(group.keeper.id || ''),
        keeperName: String(group.keeper.facility_name || group.keeper.company_name || ''),
        duplicateIds: group.duplicates.map(function (lead) { return String(lead.id || ''); }),
        duplicateNames: group.duplicates.map(function (lead) { return String(lead.facility_name || lead.company_name || ''); }),
      };
    }),
  };
  if (dryRun || !targetGroups.length) return result;

  let archived = 0;
  let merged = 0;
  targetGroups.forEach(function (targetGroup) {
    const applied = withScriptLock_('repairDuplicateLeadDomains:group', function () {
      const currentLeads = targetGroup.leads.map(function (target) {
        const rowNumber = Number(target.__rowNumber || 0);
        if (rowNumber < 2) return null;
        const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
        const current = rowToRecord_(headers, row);
        current.__rowNumber = rowNumber;
        if (String(current.id || '') !== String(target.id || '') || isArchivedLead_(current)) return null;
        return leadDuplicateWebsiteDomain_(current) === targetGroup.domain ? current : null;
      }).filter(Boolean);
      if (currentLeads.length < 2) return { archived: 0, merged: 0 };

      const sorted = sortDuplicateDomainLeadsForKeeper_(currentLeads);
      const keeper = sorted[0];
      const duplicates = sorted.slice(1);
      const mergedKeeper = mergeDuplicateDomainContactFields_(keeper, duplicates);
      const contactMerged = ['email', 'phone', 'form_url', 'address'].some(function (field) {
        return String(mergedKeeper[field] || '') !== String(keeper[field] || '');
      });
      if (contactMerged) {
        mergedKeeper.updated_at = nowIso_();
        applyLeadDerivedFields_(mergedKeeper);
        writeRecordToRow_(sheet, keeper.__rowNumber, headers, mergedKeeper);
      }

      const now = nowIso_();
      duplicates.forEach(function (duplicate) {
        const archivedLead = Object.assign({}, duplicate, {
          status: '対応不要',
          form_status: '対応不要',
          next_send_at: '',
          no_action_reason: '重複ドメイン',
          no_action_memo: '同一公式サイトの営業先を1件に統合: ' + targetGroup.domain + ' / 残存ID ' + String(keeper.id || ''),
          archived_at: now,
          updated_at: now,
        });
        writeRecordToRow_(sheet, duplicate.__rowNumber, headers, archivedLead);
      });
      return { archived: duplicates.length, merged: contactMerged ? 1 : 0 };
    }, { waitMs: lockWaitMs, attempts: 5, retryDelayMs: 400 });
    archived += Number(applied.archived || 0);
    merged += Number(applied.merged || 0);
  });
  if (archived || merged) {
    clearRuntimeCaches_('leads');
    SpreadsheetApp.flush();
  }
  return Object.assign({}, result, { archived: archived, merged: merged });
}

function historicalReviewDomainDuplicateTargetsFromRecords_(records) {
  const groups = {};
  (records || []).forEach(function (lead) {
    if (!lead) return;
    const domain = leadDuplicateWebsiteDomain_(lead);
    if (!domain) return;
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(lead);
  });

  const targets = [];
  Object.keys(groups).sort().forEach(function (domain) {
    const leads = groups[domain];
    const candidates = leads.filter(function (lead) {
      return !isArchivedLead_(lead) &&
        isLeadReviewPending_(lead) &&
        isSafeNonAdvertiserLeadCleanupTarget_(lead);
    });
    if (!candidates.length) return;

    const candidateIds = {};
    candidates.forEach(function (lead) { candidateIds[String(lead.id || '')] = true; });
    const existing = leads.filter(function (lead) {
      return !candidateIds[String(lead.id || '')];
    }).sort(function (left, right) {
      return String(left.created_at || '').localeCompare(String(right.created_at || '')) ||
        String(left.id || '').localeCompare(String(right.id || ''));
    });
    if (!existing.length) return;
    const matched = existing[0];
    candidates.forEach(function (candidate) {
      targets.push({
        rowNumber: Number(candidate.__rowNumber || 0),
        id: String(candidate.id || ''),
        name: String(candidate.facility_name || candidate.company_name || ''),
        domain: domain,
        url: normalizeUrl_(candidate.website_url || ''),
        existingRowNumber: Number(matched.__rowNumber || 0),
        existingId: String(matched.id || ''),
        existingName: String(matched.facility_name || matched.company_name || ''),
        existingArchived: isArchivedLead_(matched),
      });
    });
  });
  return targets;
}

function repairHistoricalReviewDomainDuplicates(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const scanLimit = Math.min(Math.max(Number(input.scanLimit || input.scan_limit) || 20000, 1), 20000);
  const maxUpdates = Math.min(Math.max(Number(input.maxUpdates || input.max_updates) || 500, 1), 500);
  const lockWaitMs = Math.min(Math.max(Number(input.lockWaitMs || input.lock_wait_ms) || 6000, 1000), 6000);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const requiredHeaders = [
    'id', 'source', 'company_name', 'facility_name', 'website_url', 'form_url', 'email',
    'status', 'form_status', 'next_send_at', 'last_sent_at', 'send_count', 'reply_checked',
    'deal_status', 'no_action_reason', 'no_action_memo', 'source_payload_json',
    'created_at', 'updated_at', 'archived_at',
  ];
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) throw new Error('leadsシートに' + header + '列が必要です。');
  });
  const indexes = {};
  requiredHeaders.forEach(function (header) { indexes[header] = headers.indexOf(header); });
  const lastRow = sheet.getLastRow();
  const rowCount = Math.min(scanLimit, Math.max(lastRow - 1, 0));
  if (!rowCount) {
    return { ok: true, dryRun: dryRun, scanned: 0, matched: 0, archived: 0, done: true, items: [] };
  }

  const records = sheet.getRange(2, 1, rowCount, headers.length).getValues().map(function (row, index) {
    const record = rowToRecord_(headers, row);
    record.__rowNumber = index + 2;
    return record;
  });
  const allTargets = historicalReviewDomainDuplicateTargetsFromRecords_(records);
  const targets = allTargets.slice(0, maxUpdates);
  const result = {
    ok: true,
    dryRun: dryRun,
    scanned: rowCount,
    matched: allTargets.length,
    archived: 0,
    done: allTargets.length <= maxUpdates,
    items: targets.slice(0, 100),
  };
  if (dryRun || !targets.length) return result;

  let archived = 0;
  const batches = partitionLeadRepairTargets_(targets);
  batches.forEach(function (batch) {
    archived += withScriptLock_('repairHistoricalReviewDomainDuplicates:batch', function () {
      const firstRow = Number(batch[0].rowNumber);
      const lastBatchRow = Number(batch[batch.length - 1].rowNumber);
      const currentValues = sheet.getRange(
        firstRow,
        1,
        lastBatchRow - firstRow + 1,
        headers.length
      ).getValues();
      const verifiedRows = [];
      batch.forEach(function (target) {
        if (target.rowNumber < 2 || target.existingRowNumber < 2) return;
        const candidateRow = currentValues[Number(target.rowNumber) - firstRow] || [];
        const candidate = rowToRecord_(headers, candidateRow);
        if (String(candidate.id || '') !== target.id ||
          leadDuplicateWebsiteDomain_(candidate) !== target.domain) return;
        if (isArchivedLead_(candidate) || !isLeadReviewPending_(candidate) ||
          !isSafeNonAdvertiserLeadCleanupTarget_(candidate)) return;
        verifiedRows.push(Number(target.rowNumber));
      });

      if (verifiedRows.length) {
        const now = nowIso_();
        const setColumnValue = function (header, value) {
          const columnA1 = columnNumberToA1_(indexes[header] + 1);
          sheet.getRangeList(verifiedRows.map(function (rowNumber) {
            return columnA1 + rowNumber;
          })).setValue(value);
        };
        setColumnValue('status', '対応不要');
        setColumnValue('form_status', '対応不要');
        setColumnValue('next_send_at', '');
        setColumnValue('no_action_reason', '既存ドメイン');
        setColumnValue('no_action_memo', '営業リストに同一ドメインが登録済みのため自動除外');
        setColumnValue('archived_at', now);
        setColumnValue('updated_at', now);
        clearRuntimeCaches_('leads');
        SpreadsheetApp.flush();
      }
      return verifiedRows.length;
    }, { waitMs: lockWaitMs, attempts: 5, retryDelayMs: 400 });
  });
  return Object.assign({}, result, {
    archived: archived,
    lockBatches: batches.length,
  });
}

function runLeadCollectionQualityMigrationV215_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const lockWaitMs = input.interactive === true ? 2000 : 6000;
  const properties = PropertiesService.getScriptProperties();
  const completedAt = properties.getProperty(PROPERTY_KEYS.LEAD_COLLECTION_QUALITY_MIGRATION_V215);
  if (completedAt) {
    return { ok: true, skipped: true, pending: false, completedAt: completedAt };
  }

  const exclusions = importExcludedDomains({
    records: [{
      domain: 'yamagatakanko.com',
      reason: '広告主の公式サイトではない観光情報ポータル',
      active: true,
    }],
    lockWaitMs: lockWaitMs,
  });
  const cleanup = repairNonAdvertiserReviewLeads({
    dryRun: false,
    scanLimit: 20000,
    maxUpdates: 250,
    lockWaitMs: lockWaitMs,
  });
  let nextCompletedAt = '';
  if (cleanup.done) {
    nextCompletedAt = nowIso_();
    properties.setProperty(PROPERTY_KEYS.LEAD_COLLECTION_QUALITY_MIGRATION_V215, nextCompletedAt);
  }
  return {
    ok: true,
    skipped: false,
    pending: cleanup.done !== true,
    completedAt: nextCompletedAt,
    exclusions: exclusions,
    cleanup: cleanup,
  };
}

function getLeadCollectionQualityMigrationV215Status_() {
  try {
    const completedAt = String(PropertiesService.getScriptProperties()
      .getProperty(PROPERTY_KEYS.LEAD_COLLECTION_QUALITY_MIGRATION_V215) || '');
    return {
      ok: true,
      pending: !completedAt,
      completed: Boolean(completedAt),
      completedAt: completedAt,
    };
  } catch (error) {
    return {
      ok: false,
      pending: true,
      completed: false,
      completedAt: '',
      error: error.message || String(error),
    };
  }
}

function matchesFormStatusFilter_(lead, formStatus) {
  const status = String(lead.form_status || '未対応');
  if (formStatus === 'all') return true;
  if (formStatus === 'active') return status === '未対応' || status === '対応中' || !status;
  return status === formStatus;
}

function buildLeadListStats_(rows, masterContext, genre) {
  const active = rows.filter(function (lead) {
    if (isArchivedLead_(lead)) return false;
    if (genre && String(lead.genre || '') !== genre) return false;
    return true;
  });

  const breakdown = buildLeadListStateBreakdown_(active, masterContext);
  const groups = buildLeadListStateGroups_(breakdown);
  return {
    totalLeadCount: active.length,
    sendable: active.filter(function (lead) { return isEmailSendTarget_(lead, masterContext); }).length,
    formTargets: active.filter(function (lead) { return isFormSendTarget_(lead, masterContext); }).length,
    replies: active.filter(function (lead) { return normalizeBooleanLike_(lead.reply_checked) || lead.status === '返信あり'; }).length,
    sendNg: active.filter(function (lead) { return normalizeBooleanLike_(lead.send_ng) || lead.status === '送信NG'; }).length,
    deals: active.filter(function (lead) { return String(lead.deal_status || '未設定') !== '未設定' || DEAL_STATUSES.indexOf(String(lead.status || '')) !== -1; }).length,
    won: active.filter(function (lead) { return lead.deal_status === '受注' || lead.status === '受注'; }).length,
    lost: active.filter(function (lead) { return lead.deal_status === '失注' || lead.status === '失注'; }).length,
    sent: active.filter(function (lead) { return Number(lead.send_count || 0) > 0 || Boolean(lead.last_sent_at) || String(lead.status || '').indexOf('送信済み') !== -1; }).length,
    unsent: active.filter(function (lead) { return matchesLeadListFilter_(lead, 'unsent', masterContext); }).length,
    noContact: active.filter(function (lead) { return matchesLeadListFilter_(lead, 'no_contact', masterContext); }).length,
    reviewPending: active.filter(function (lead) { return matchesLeadListFilter_(lead, 'review', masterContext); }).length,
    breakdown: breakdown,
    breakdownTotal: breakdown.reduce(function (sum, item) { return sum + Number(item.count || 0); }, 0),
    groups: groups,
    groupTotal: groups.reduce(function (sum, item) { return sum + Number(item.count || 0); }, 0),
  };
}

function updateLead(id, patch) {
  return withScriptLock_('updateLead', function () {
    return updateLeadLocked_(id, patch);
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function normalizeReviewDecisionMetadata_(source, nextStatus, mode) {
  const input = source && typeof source === 'object' ? source : {};
  const isSendNgDecision = String(mode || 'decision') === 'decision' && String(nextStatus || '') === '送信NG';
  const hasDomainChoice = Object.prototype.hasOwnProperty.call(input, 'excludeDomainFromCollection') ||
    Object.prototype.hasOwnProperty.call(input, 'exclude_domain_from_collection');
  if (!isSendNgDecision) {
    return {
      sendNgReason: '',
      sendNgMemo: '',
      excludeDomainFromCollection: false,
      excludeDomainFromCollectionSpecified: false,
    };
  }
  const reason = String(input.sendNgReason || input.send_ng_reason || '').trim();
  const memo = String(input.sendNgMemo || input.send_ng_memo || '').trim();
  const allowedReasons = ['情報サイト・ブログ', '観光ガイドサイト', '休業・閉鎖', 'リンク切れ', '営業対象外', 'その他'];
  if (reason && allowedReasons.indexOf(reason) === -1) {
    throw createExpectedOperationError_('送信NG理由が不正です。', 'REVIEW_SEND_NG_REASON_INVALID');
  }
  if (reason === 'その他' && !memo) {
    throw createExpectedOperationError_('「その他」の理由を入力してください。', 'REVIEW_SEND_NG_MEMO_REQUIRED');
  }
  return {
    sendNgReason: reason.slice(0, 200),
    sendNgMemo: memo.slice(0, 1000),
    excludeDomainFromCollection: input.excludeDomainFromCollection === true || input.exclude_domain_from_collection === true,
    excludeDomainFromCollectionSpecified: hasDomainChoice,
  };
}

function buildReviewDecisionLeadPatch_(current, decision) {
  const source = decision && typeof decision === 'object' ? decision : {};
  const mode = String(source.mode || 'decision');
  const nextStatus = String(source.nextStatus || source.status || '');
  const patch = { status: nextStatus };
  const payload = parseJsonObjectSafe_(current && current.source_payload_json);
  if (mode === 'decision' && nextStatus === '送信NG') {
    if (String(source.sendNgReason || '').trim()) patch.send_ng_reason = String(source.sendNgReason || '').trim();
    if (String(source.sendNgMemo || '').trim()) patch.send_ng_memo = String(source.sendNgMemo || '').trim();
    if (source.excludeDomainFromCollectionSpecified === true) {
      payload.review_exclude_domain_from_collection = source.excludeDomainFromCollection === true;
      patch.source_payload_json = safeJsonStringify_(payload);
    }
  } else if (mode === 'undo') {
    delete payload.review_exclude_domain_from_collection;
    patch.source_payload_json = safeJsonStringify_(payload);
  }
  return patch;
}

function updateReviewLeadDecision(id, input) {
  const source = input && typeof input === 'object' ? input : {};
  const mode = String(source.mode || 'decision').trim();
  const nextStatus = String(source.status || source.nextStatus || source.next_status || '').trim();
  const requestedExpectedStatus = String(source.expectedStatus || source.expected_status || '').trim();
  const expectedStatus = mode === 'decision' ? '未対応' : requestedExpectedStatus;
  const decisionStatuses = ['対応中', '送信NG', '対応不要'];

  if (mode === 'undo') {
    if (nextStatus !== '未対応' || decisionStatuses.indexOf(expectedStatus) === -1) {
      throw createExpectedOperationError_('確認操作の取り消し条件が不正です。', 'REVIEW_DECISION_INVALID');
    }
  } else if (mode !== 'decision' || decisionStatuses.indexOf(nextStatus) === -1) {
    throw createExpectedOperationError_('確認待ちで選べない更新内容です。', 'REVIEW_DECISION_INVALID');
  }

  const leadId = requireId_(id);
  const decision = Object.assign({
    mode: mode,
    expectedStatus: expectedStatus,
    nextStatus: nextStatus,
  }, normalizeReviewDecisionMetadata_(source, nextStatus, mode));
  try {
    const outcome = withScriptLock_('updateReviewLeadDecision', function () {
      const spreadsheet = getOrCreateSpreadsheet_();
      const sheet = ensureSheet_(spreadsheet, 'leads');
      return applyReviewLeadDecisionLocked_(sheet, leadId, decision);
    }, { waitMs: 2500, attempts: 2, retryDelayMs: 250, logErrors: false });
    if (outcome.cacheDirty) clearReviewLeadCachesBestEffort_();
    return outcome.response;
  } catch (error) {
    if (!isScriptLockTimeoutError_(error)) {
      if (!isExpectedOperationError_(error)) logError_('updateReviewLeadDecision', error, { lead_id: leadId });
      throw error;
    }
    try {
      const queued = enqueuePendingReviewDecision_(leadId, decision, 'lock_timeout');
      return {
        ok: true,
        queued: true,
        reused: false,
        conflict: false,
        lead: null,
        previous_status: expectedStatus,
        status: nextStatus,
        request_id: queued.record.requestId,
        triggerWarning: queued.triggerWarning || '',
        message: '確認結果を保存待ちとして受け付けました。自動的に再実行します。',
      };
    } catch (queueError) {
      logError_('updateReviewLeadDecision', queueError, {
        lead_id: leadId,
        fallback_from: 'lock_timeout',
      });
      throw error;
    }
  }
}

function applyReviewLeadDecisionLocked_(sheet, leadId, decision) {
  const found = findRowById_(sheet, leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  const outcome = buildReviewLeadDecisionOutcome_(found, decision);
  let activity = null;
  if (outcome.write) {
    writeLeadRecordsToRowsGroupedLocked_(sheet, found.headers || getHeaders_(sheet), [outcome.write]);
    const spreadsheet = sheet && typeof sheet.getParent === 'function' ? sheet.getParent() : null;
    if (spreadsheet) {
      const activityResult = appendReviewActivityRecordsBestEffortLocked_(spreadsheet, [buildReviewActivityRecord_(outcome.write, {
        actionType: String(decision.mode || 'decision') === 'undo' ? 'review_undo' : 'review_decision',
        reversible: String(decision.mode || 'decision') !== 'undo',
      })]);
      activity = activityResult.records[0] || null;
      if (activityResult.warning) outcome.response.warning = activityResult.warning;
    }
    if (activity) outcome.response.activity_id = activity.id;
  }
  return {
    response: outcome.response,
    cacheDirty: Boolean(outcome.write),
    activity: activity,
  };
}

function buildReviewLeadDecisionOutcome_(found, decision) {
  if (!found || !found.record) throw new Error('Lead row is required for review decision.');
  const mode = String(decision.mode || 'decision');
  const expectedStatus = String(decision.expectedStatus || '');
  const nextStatus = String(decision.nextStatus || decision.status || '');
  const current = found.record;
  const currentStatus = String(current.status || '');
  const reviewSource = ['serper', 'search_job', 'prospecting', 'source_page'].indexOf(String(current.source || '')) !== -1;

  if (!reviewSource) {
    return { response: buildReviewLeadConflict_(current, 'この営業先は確認待ち由来ではないため更新しませんでした。'), write: null };
  }
  if (currentStatus === nextStatus) {
    return { response: {
      ok: true,
      reused: true,
      conflict: false,
      lead: current,
      previous_status: expectedStatus,
      status: nextStatus,
    }, write: null };
  }
  if (currentStatus !== expectedStatus) {
    return { response: buildReviewLeadConflict_(current, '別の処理で状態が「' + (currentStatus || '未設定') + '」に更新されたため、古い確認操作では上書きしませんでした。'), write: null };
  }
  if (mode === 'decision' && !isLeadReviewPending_(current)) {
    return { response: buildReviewLeadConflict_(current, 'この営業先はすでに確認待ちではないため更新しませんでした。'), write: null };
  }

  const updated = buildUpdatedLeadRecord_(found, buildReviewDecisionLeadPatch_(current, decision));
  return {
    response: {
      ok: true,
      reused: false,
      conflict: false,
      lead: updated,
      previous_status: expectedStatus,
      status: nextStatus,
    },
    write: {
      rowNumber: found.rowNumber,
      previous: current,
      record: updated,
    },
  };
}

function clearReviewLeadCachesBestEffort_() {
  try {
    clearRuntimeCaches_('leads');
    return '';
  } catch (error) {
    const warning = '確認結果は保存しましたが、一覧キャッシュを更新できませんでした: ' + String(error.message || error);
    console.warn(warning);
    return warning;
  }
}

function updateReviewLeadDecisions(input) {
  const source = input && typeof input === 'object' ? input : {};
  const mode = String(source.mode || 'decision').trim();
  const nextStatus = String(source.status || source.nextStatus || source.next_status || '').trim();
  const requestedExpectedStatus = String(source.expectedStatus || source.expected_status || '').trim();
  const expectedStatus = mode === 'decision' ? '未対応' : requestedExpectedStatus;
  const decisionStatuses = ['対応中', '送信NG'];
  const rawIds = Array.isArray(source.ids) ? source.ids
    : Array.isArray(source.leadIds) ? source.leadIds
      : Array.isArray(source.lead_ids) ? source.lead_ids
        : [];
  const ids = Array.from(new Set(rawIds.map(function (id) {
    return String(id || '').trim();
  }).filter(Boolean)));

  if (!ids.length) {
    throw createExpectedOperationError_('一括更新する確認待ちを選択してください。', 'REVIEW_BULK_EMPTY');
  }
  if (ids.length > 50) {
    throw createExpectedOperationError_('一括更新は50件までです。', 'REVIEW_BULK_LIMIT');
  }
  if (mode === 'undo') {
    if (nextStatus !== '未対応' || decisionStatuses.indexOf(expectedStatus) === -1) {
      throw createExpectedOperationError_('確認待ち一括操作の取り消し条件が不正です。', 'REVIEW_DECISION_INVALID');
    }
  } else if (mode !== 'decision' || decisionStatuses.indexOf(nextStatus) === -1) {
    throw createExpectedOperationError_('確認待ち一括操作で選べない更新内容です。', 'REVIEW_DECISION_INVALID');
  }

  const decision = Object.assign({
    mode: mode,
    expectedStatus: expectedStatus,
    nextStatus: nextStatus,
  }, normalizeReviewDecisionMetadata_(source, nextStatus, mode));
  let result;
  try {
    result = withScriptLock_('updateReviewLeadDecisions', function () {
      const spreadsheet = getOrCreateSpreadsheet_();
      const sheet = ensureSheet_(spreadsheet, 'leads');
      const values = sheet.getDataRange().getValues();
    const headers = values.length ? values[0].map(function (value) {
      return String(value || '').trim();
    }) : [];
    const idColumnIndex = headers.indexOf('id');
    if (idColumnIndex === -1) throw new Error('Sheet is missing id header: leads');

    const requested = {};
    ids.forEach(function (id) { requested[id] = true; });
    const foundById = {};
    values.slice(1).forEach(function (row, index) {
      const id = String(row[idColumnIndex] || '').trim();
      if (!requested[id] || foundById[id]) return;
      foundById[id] = {
        rowNumber: index + 2,
        headers: headers,
        record: rowToRecord_(headers, row),
      };
    });

    const items = [];
    const pendingWrites = [];
    let updated = 0;
    let reused = 0;
    let conflicts = 0;
    ids.forEach(function (id) {
      const found = foundById[id];
      if (!found) {
        conflicts += 1;
        items.push({ id: id, ok: false, reused: false, conflict: true, lead: null, message: '営業先が見つかりませんでした。' });
        return;
      }
      const current = found.record;
      const currentStatus = String(current.status || '');
      if (!isReviewLeadSource_(current)) {
        conflicts += 1;
        items.push(buildReviewLeadConflict_(current, 'この営業先は確認待ち由来ではないため更新しませんでした。'));
        return;
      }
      if (currentStatus === nextStatus) {
        reused += 1;
        items.push({ ok: true, reused: true, conflict: false, lead: current, previous_status: expectedStatus, status: nextStatus });
        return;
      }
      if (currentStatus !== expectedStatus) {
        conflicts += 1;
        items.push(buildReviewLeadConflict_(current, '別の処理で状態が「' + (currentStatus || '未設定') + '」に更新されたため、古い一括操作では上書きしませんでした。'));
        return;
      }
      if (mode === 'decision' && !isLeadReviewPending_(current)) {
        conflicts += 1;
        items.push(buildReviewLeadConflict_(current, 'この営業先はすでに確認待ちではないため更新しませんでした。'));
        return;
      }

      const lead = buildUpdatedLeadRecord_(found, buildReviewDecisionLeadPatch_(current, decision));
      pendingWrites.push({
        rowNumber: found.rowNumber,
        previous: current,
        record: lead,
      });
      updated += 1;
      items.push({ ok: true, reused: false, conflict: false, lead: lead, previous_status: expectedStatus, status: nextStatus });
    });
    if (updated > 0) {
      writeLeadRecordsToRowsGroupedLocked_(sheet, headers, pendingWrites);
      const activityResult = appendReviewActivityRecordsBestEffortLocked_(spreadsheet, pendingWrites.map(function (write) {
        return buildReviewActivityRecord_(write, {
          actionType: mode === 'undo' ? 'review_undo' : 'review_decision',
          reversible: mode !== 'undo',
        });
      }));
      if (activityResult.warning) {
        items.forEach(function (item) {
          if (item && item.ok && !item.reused) item.warning = activityResult.warning;
        });
      }
    }

    return {
      ok: true,
      mode: mode,
      status: nextStatus,
      requested: ids.length,
      updated: updated,
      reused: reused,
      conflicts: conflicts,
      items: items,
    };
    }, { waitMs: 2500, attempts: 2, retryDelayMs: 250, logErrors: false });
  } catch (error) {
    if (!isScriptLockTimeoutError_(error)) {
      if (!isExpectedOperationError_(error)) logError_('updateReviewLeadDecisions', error, { requested: ids.length });
      throw error;
    }
    try {
      const items = ids.map(function (leadId) {
        const queued = enqueuePendingReviewDecision_(leadId, decision, 'bulk_lock_timeout', {
          bumpCache: false,
          scheduleTrigger: false,
        });
        return {
          id: leadId,
          ok: true,
          queued: true,
          reused: false,
          conflict: false,
          lead: null,
          previous_status: expectedStatus,
          status: nextStatus,
          request_id: queued.record.requestId,
        };
      });
      bumpLeadListCacheRevision_();
      const trigger = ensurePendingReviewDecisionTriggerBestEffort_(BACKGROUND_JOB_IMMEDIATE_DELAY_MS);
      return {
        ok: true,
        queued: ids.length,
        mode: mode,
        status: nextStatus,
        requested: ids.length,
        updated: ids.length,
        reused: 0,
        conflicts: 0,
        items: items,
        triggerWarning: trigger.warning || '',
      };
    } catch (queueError) {
      logError_('updateReviewLeadDecisions', queueError, {
        requested: ids.length,
        fallback_from: 'lock_timeout',
      });
      throw error;
    }
  }
  if (result.updated > 0) clearReviewLeadCachesBestEffort_();
  return result;
}

function buildReviewLeadConflict_(lead, message) {
  return {
    ok: false,
    reused: false,
    conflict: true,
    lead: lead || null,
    message: String(message || '営業先の状態が変わったため更新しませんでした。'),
  };
}

function updateLeadLocked_(id, patch) {
  const leadId = requireId_(id);
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'leads');
  const found = findRowById_(sheet, leadId);

  if (!found) {
    throw new Error('Lead not found: ' + leadId);
  }

  return updateLeadFoundLocked_(sheet, found, patch);
}

function updateLeadFoundLocked_(sheet, found, patch, options) {
  if (!sheet || !found || !found.record || !found.rowNumber) {
    throw new Error('Lead row is required for update.');
  }

  const headers = found.headers || getHeaders_(sheet);
  const nextRecord = buildUpdatedLeadRecord_(found, patch);
  const explicitFields = new Set(Object.keys(normalizeLeadPatch_(patch)));
  if (['email', 'website_url', 'form_url'].some(function (field) { return explicitFields.has(field); })) {
    assertNoDuplicateLead_(sheet, nextRecord, { excludeLeadId: found.record.id });
  }

  writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
  if (!options || options.clearCaches !== false) clearRuntimeCaches_('leads');

  return nextRecord;
}

function buildUpdatedLeadRecord_(found, patch) {
  if (!found || !found.record) {
    throw new Error('Lead row is required for update.');
  }

  const updates = normalizeLeadPatch_(patch);
  const explicitFields = new Set(Object.keys(updates));
  const nextRecord = Object.assign({}, found.record, updates, {
    id: found.record.id,
    created_at: found.record.created_at,
    updated_at: nowIso_(),
  });
  applyLeadDerivedFields_(nextRecord);
  if (explicitFields.has('status')) {
    applyLeadStatusSideEffects_(nextRecord, explicitFields);
  }
  return nextRecord;
}

function writeLeadRecordsToRowsGroupedLocked_(sheet, headers, writes) {
  const source = Array.isArray(writes) ? writes : [];
  if (!source.length) return 0;
  const normalizedHeaders = Array.isArray(headers) ? headers : [];
  const deferredHeaders = ['status', 'updated_at'];
  const orderedHeaders = normalizedHeaders.filter(function (header) {
    return deferredHeaders.indexOf(header) === -1;
  }).concat(deferredHeaders.filter(function (header) {
    return normalizedHeaders.indexOf(header) !== -1;
  }));
  let writeGroups = 0;

  orderedHeaders.forEach(function (header) {
    const columnIndex = normalizedHeaders.indexOf(header);
    if (columnIndex === -1) return;
    const groups = {};
    source.forEach(function (item) {
      const before = valueOrBlank_(item && item.previous ? item.previous[header] : '');
      const after = valueOrBlank_(item && item.record ? item.record[header] : '');
      if (before === after) return;
      const key = typeof after + ':' + String(after);
      if (!groups[key]) groups[key] = { value: after, rows: [] };
      groups[key].rows.push(Number(item.rowNumber));
    });
    Object.keys(groups).forEach(function (key) {
      const group = groups[key];
      const ranges = group.rows.filter(function (rowNumber) {
        return Number.isFinite(rowNumber) && rowNumber >= 2;
      }).map(function (rowNumber) {
        return columnNumberToA1_(columnIndex + 1) + rowNumber;
      });
      if (!ranges.length) return;
      sheet.getRangeList(ranges).setValue(group.value);
      writeGroups += 1;
    });
  });
  return writeGroups;
}

function deleteLead(id, options) {
  return withScriptLock_('deleteLead', function () {
    const leadId = requireId_(id);
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const found = findRowById_(sheet, leadId);

    if (!found) {
      throw new Error('Lead not found: ' + leadId);
    }

    if (options && options.hardDelete === true) {
      assertLeadHardDeleteAllowed_(found.record);
      sheet.deleteRow(found.rowNumber);
      clearRuntimeCaches_('leads');
      return {
        ok: true,
        id: leadId,
        deleted: true,
        hardDeleted: true,
      };
    }

    const headers = found.headers || getHeaders_(sheet);
    const now = nowIso_();
    const nextRecord = Object.assign({}, found.record, {
      status: '対応不要',
      form_status: '対応不要',
      next_send_at: '',
      archived_at: now,
      updated_at: now,
    });

    writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
    clearRuntimeCaches_('leads');
    return nextRecord;
  });
}

function assertLeadHardDeleteAllowed_(lead, relatedRowsBySheet) {
  const references = listLeadHardDeleteReferences_(lead, relatedRowsBySheet);
  if (!references.length) return true;
  const detail = references.map(function (reference) {
    return reference.label + (reference.count > 1 ? ' ' + reference.count + '件' : '');
  }).join('、');
  throw createExpectedOperationError_(
    '関連データ（' + detail + '）があるため物理削除できません。通常の削除でアーカイブしてください。',
    'LEAD_HARD_DELETE_BLOCKED'
  );
}

function listLeadHardDeleteReferences_(lead, relatedRowsBySheet) {
  const leadId = requireId_(lead && lead.id);
  const rowsBySheet = relatedRowsBySheet && typeof relatedRowsBySheet === 'object' ? relatedRowsBySheet : null;
  const definitions = [
    { sheet: 'send_histories', label: '送信履歴' },
    { sheet: 'reply_logs', label: '返信ログ' },
    { sheet: 'search_results', label: '検索結果' },
    { sheet: 'search_usage_logs', label: '検索利用履歴' },
  ];
  const references = definitions.map(function (definition) {
    const count = rowsBySheet
      ? (Array.isArray(rowsBySheet[definition.sheet]) ? rowsBySheet[definition.sheet] : []).filter(function (record) {
          return String(record.lead_id || '').trim() === leadId;
        }).length
      : countSheetExactMatches_(definition.sheet, 'lead_id', leadId);
    return {
      sheet: definition.sheet,
      label: definition.label,
      count: count,
    };
  }).filter(function (reference) {
    return reference.count > 0;
  });
  if (String(lead.calendar_event_id || '').trim()) {
    references.push({ sheet: 'calendar', label: 'Calendarイベント', count: 1 });
  }
  return references;
}

function countSheetExactMatches_(sheetName, columnName, value) {
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const headers = getHeaders_(sheet);
  const columnIndex = headers.indexOf(columnName);
  if (columnIndex === -1) return 0;
  return sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .createTextFinder(String(value || ''))
    .matchEntireCell(true)
    .matchCase(true)
    .useRegularExpression(false)
    .findAll()
    .length;
}

function markLeadFormSent(leadId, options) {
  const input = options && typeof options === 'object' ? options : {};
  return withScriptLock_('markLeadFormSent', function () {
    const id = requireId_(leadId);
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const found = findRowById_(sheet, id);

    if (!found) {
      throw new Error('Lead not found: ' + id);
    }

    const blockReason = getFormSendTargetBlockReason_(found.record, buildMasterBlockRulesContext_());
    if (blockReason) {
      throw createExpectedOperationError_(blockReason, 'FORM_TARGET_BLOCKED');
    }

    const now = nowIso_();
    const headers = found.headers || getHeaders_(sheet);
    const customFields = parseJsonObjectSafe_(found.record.custom_fields_json);
    const events = formSendEventsFromCustomFields_(customFields);
    const body = typeof input.body === 'string' ? input.body : '';
    const templateId = String(input.template_id || input.templateId || '').trim();
    const nextCount = Number(customFields.form_send_count || 0) + 1;

    events.unshift({
      at: now,
      type: 'sent',
      body: body,
      template_id: templateId,
      previous_status: String(found.record.status || '未対応'),
    });

    customFields.form_send_count = nextCount;
    customFields.last_form_sent_at = now;
    customFields.last_form_body = body;
    customFields.last_form_previous_status = String(found.record.status || '未対応');
    if (templateId) customFields.last_form_template_id = templateId;
    customFields.form_send_events = events.slice(0, 50);

    const nextRecord = Object.assign({}, found.record, {
      status: 'フォーム対応済み',
      form_status: '対応済み',
      last_sent_at: now,
      next_send_at: '',
      custom_fields_json: safeJsonStringify_(customFields),
      updated_at: now,
    });

    writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
    clearRuntimeCaches_('leads');
    return nextRecord;
  });
}

function unmarkLeadFormSent(leadId) {
  return withScriptLock_('unmarkLeadFormSent', function () {
    const id = requireId_(leadId);
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const found = findRowById_(sheet, id);

    if (!found) {
      throw new Error('Lead not found: ' + id);
    }

    const now = nowIso_();
    const headers = found.headers || getHeaders_(sheet);
    const customFields = parseJsonObjectSafe_(found.record.custom_fields_json);
    const currentCount = Math.max(0, Number(customFields.form_send_count || 0));
    const hasRecordedFormSend = currentCount > 0 ||
      Boolean(customFields.last_form_sent_at) ||
      String(found.record.status || '') === 'フォーム対応済み' ||
      String(found.record.form_status || '') === '対応済み';
    if (!hasRecordedFormSend) {
      throw createExpectedOperationError_('取り消せるフォーム送信記録がありません。', 'FORM_SEND_NOT_RECORDED');
    }
    const events = formSendEventsFromCustomFields_(customFields);
    const nextCount = Math.max(0, currentCount - 1);
    const fallbackSentAt = latestSuccessfulMailSentAt_(id);
    const previousSentEvent = events.find(function (event) {
      return event && event.type === 'sent' && event.previous_status;
    });
    const reviewFallbackStatus = ['serper', 'search_job', 'prospecting', 'source_page'].indexOf(String(found.record.source || '')) !== -1
      ? '対応中'
      : '未対応';
    const previousStatus = String(customFields.last_form_previous_status || (previousSentEvent && previousSentEvent.previous_status) || reviewFallbackStatus);
    const restoreStatus = LEAD_STATUSES.indexOf(previousStatus) !== -1 && SYSTEM_STATUS_OPTIONS.indexOf(previousStatus) === -1
      ? previousStatus
      : reviewFallbackStatus;

    events.unshift({
      at: now,
      type: 'unsent',
      body: '',
    });

    customFields.form_send_count = nextCount;
    customFields.form_send_events = events.slice(0, 50);
    delete customFields.last_form_sent_at;
    delete customFields.last_form_body;
    delete customFields.last_form_template_id;
    delete customFields.last_form_previous_status;

    const nextRecord = Object.assign({}, found.record, {
      status: found.record.status === 'フォーム対応済み' ? restoreStatus : (found.record.status || restoreStatus),
      form_status: '未対応',
      last_sent_at: fallbackSentAt || '',
      custom_fields_json: safeJsonStringify_(customFields),
      updated_at: now,
    });

    writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
    clearRuntimeCaches_('leads');
    return nextRecord;
  });
}

function leadDuplicateCandidateFields_() {
  return [
    'id',
    'company_name',
    'normalized_company_name',
    'facility_name',
    'email',
    'email_domain',
    'website_url',
    'website_domain',
    'form_url',
    'status',
    'send_count',
    'archived_at',
  ];
}

function listLeadDuplicateCandidates(leadId, options) {
  const recordId = requireId_(leadId);
  const query = options && typeof options === 'object' ? options : {};
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const leads = readSheetRecordFields_('leads', leadDuplicateCandidateFields_(), { maxGapColumns: 0 }).filter(function (lead) {
    return !isArchivedLead_(lead);
  });
  const current = leads.find(function (lead) {
    return String(lead.id || '') === recordId;
  });

  if (!current) {
    throw new Error('Lead not found: ' + recordId);
  }

  const currentKeys = duplicateKeysForLead_(current);
  const candidates = leads
    .filter(function (lead) {
      return String(lead.id || '') !== recordId;
    })
    .map(function (lead) {
      const matched = duplicateMatchedKeys_(currentKeys, duplicateKeysForLead_(lead));
      if (!matched.length) return null;
      return {
        id: lead.id,
        company_name: lead.company_name,
        facility_name: lead.facility_name,
        email: lead.email,
        website_url: lead.website_url,
        reason: duplicateReasonLabels_(matched).join('・') || '重複候補',
        reason_detail: matched.map(function (key) { return duplicateReasonDetail_(key); }).filter(Boolean).join(' / '),
        send_count: lead.send_count,
        status: lead.status,
      };
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return Number(b.send_count || 0) - Number(a.send_count || 0) || String(a.company_name || a.facility_name || '').localeCompare(String(b.company_name || b.facility_name || ''), 'ja');
    });

  return {
    leadId: recordId,
    current: {
      id: current.id,
      company_name: current.company_name,
      facility_name: current.facility_name,
      email: current.email,
      website_url: current.website_url,
    },
    total: candidates.length,
    items: candidates.slice(0, limit),
  };
}

function saveSerperApiKey(apiKey) {
  const normalized = String(apiKey || '').trim();

  if (!normalized) {
    throw new Error('Serper API key is required.');
  }

  return withScriptLock_('saveSerperApiKey', function () {
    PropertiesService.getScriptProperties().setProperty(PROPERTY_KEYS.SERPER_API_KEY, normalized);
    upsertSerperPrimaryKey_(normalized, 'Serperキー');

    return {
      ok: true,
      saved: true,
    };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function debugListLeads() {
  const result = listLeads({
    limit: 20,
    includeArchived: true,
  });

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function getOrCreateSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(PROPERTY_KEYS.SPREADSHEET_ID);

  if (storedId) {
    try {
      return SpreadsheetApp.openById(storedId);
    } catch (error) {
      logError_('getOrCreateSpreadsheet_', error, {
        storedId: storedId,
      });
      throw createExpectedOperationError_(
        '保存先スプレッドシートを開けません。保存先IDは保持しています。権限または一時的なGoogle側エラーを確認してから再試行してください。',
        'SPREADSHEET_UNAVAILABLE'
      );
    }
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSpreadsheet) {
    properties.setProperty(PROPERTY_KEYS.SPREADSHEET_ID, activeSpreadsheet.getId());
    return activeSpreadsheet;
  }

  const created = SpreadsheetApp.create('Auto Sales List App DB');
  properties.setProperty(PROPERTY_KEYS.SPREADSHEET_ID, created.getId());
  return created;
}

function ensureAllSheets_(spreadsheet) {
  Object.keys(SHEET_DEFINITIONS).forEach(function (sheetName) {
    ensureSheet_(spreadsheet, sheetName);
  });
}

function ensureSheet_(spreadsheet, sheetName) {
  if (!SHEET_DEFINITIONS[sheetName]) {
    throw new Error('Unknown sheet definition: ' + sheetName);
  }

  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  ensureHeaders_(sheet, SHEET_DEFINITIONS[sheetName]);
  sheet.setFrozenRows(1);
  return sheet;
}

function ensureHeaders_(sheet, requiredHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), requiredHeaders.length, 1);
  const headerRange = sheet.getRange(1, 1, 1, lastColumn);
  const currentHeaders = headerRange.getValues()[0].map(function (value) {
    return String(value || '').trim();
  });
  const nonEmptyHeaders = currentHeaders.filter(Boolean);

  if (nonEmptyHeaders.length === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    formatHeaderRow_(sheet, requiredHeaders.length);
    return;
  }

  const lastHeaderColumn = currentHeaders.reduce(function (lastIndex, header, index) {
    return header ? index + 1 : lastIndex;
  }, 0);
  const missingHeaders = requiredHeaders.filter(function (header) {
    return nonEmptyHeaders.indexOf(header) === -1;
  });

  if (missingHeaders.length > 0) {
    sheet.getRange(1, lastHeaderColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  formatHeaderRow_(sheet, lastHeaderColumn + missingHeaders.length);
}

function formatHeaderRow_(sheet, width) {
  sheet.getRange(1, 1, 1, width)
    .setFontWeight('bold')
    .setBackground('#f1f5f9')
    .setVerticalAlignment('middle');
}

function seedDefaultSettings_(spreadsheet) {
  const sheet = ensureSheet_(spreadsheet, 'settings');
  const records = readSheetRecords_(sheet);
  const existingKeys = records.reduce(function (accumulator, record) {
    accumulator[record.key] = true;
    return accumulator;
  }, {});
  const headers = getHeaders_(sheet);
  const now = nowIso_();
  const rowsToAppend = DEFAULT_SETTINGS.filter(function (setting) {
    return !existingKeys[setting.key];
  }).map(function (setting) {
    const row = Object.assign({}, setting, {
      id: Utilities.getUuid(),
      updated_at: now,
    });

    return headers.map(function (header) {
      return valueOrBlank_(row[header]);
    });
  });

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
}

function seedDefaultGenres_(spreadsheet) {
  const sheet = ensureSheet_(spreadsheet, 'genres');
  const records = readSheetRecords_(sheet);
  const existingNames = records.reduce(function (accumulator, record) {
    accumulator[String(record.name || '').trim()] = true;
    return accumulator;
  }, {});
  const headers = getHeaders_(sheet);
  const now = nowIso_();
  const rowsToAppend = DEFAULT_GENRES.filter(function (name) {
    return !existingNames[name];
  }).map(function (name) {
    const row = {
      id: Utilities.getUuid(),
      name: name,
      description: '',
      active: true,
      created_at: now,
      updated_at: now,
    };

    return headers.map(function (header) {
      return valueOrBlank_(row[header]);
    });
  });

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
}

function seedDefaultReasons_(spreadsheet) {
  const sheet = ensureSheet_(spreadsheet, 'reasons');
  const records = readSheetRecords_(sheet);
  const existingKeys = records.reduce(function (accumulator, record) {
    accumulator[buildReasonKey_(record.category, record.name)] = true;
    return accumulator;
  }, {});
  const headers = getHeaders_(sheet);
  const now = nowIso_();
  const rowsToAppend = DEFAULT_REASONS.filter(function (reason) {
    return !existingKeys[buildReasonKey_(reason.category, reason.name)];
  }).map(function (reason) {
    const row = {
      id: Utilities.getUuid(),
      category: reason.category,
      name: reason.name,
      description: '',
      active: true,
      created_at: now,
      updated_at: now,
    };

    return headers.map(function (header) {
      return valueOrBlank_(row[header]);
    });
  });

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
}

function buildReasonKey_(category, name) {
  return [String(category || '').trim(), String(name || '').trim()].join('\u0000');
}

function readSheetRecords_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(function (value) {
    return String(value || '').trim();
  });

  return values.slice(1).map(function (row) {
    return rowToRecord_(headers, row);
  }).filter(function (record) {
    return Object.keys(record).some(function (key) {
      return record[key] !== '';
    });
  });
}

function writeRecordToRow_(sheet, rowNumber, headers, record) {
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([
    headers.map(function (header) {
      return valueOrBlank_(record[header]);
    }),
  ]);
}

function removeBlankDefaultSheets_(spreadsheet) {
  ['Sheet1', 'シート1'].forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet || spreadsheet.getSheets().length <= 1) {
      return;
    }

    const values = sheet.getDataRange().getValues();
    const isBlank = values.length === 1 && values[0].length === 1 && values[0][0] === '';

    if (isBlank) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

function rowToRecord_(headers, row) {
  return headers.reduce(function (record, header, index) {
    if (header) {
      record[header] = row[index] === null || row[index] === undefined ? '' : row[index];
    }
    return record;
  }, {});
}

function getHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || '').trim();
  });
}

function findRowById_(sheet, id) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  if (lastRow < 2) {
    return null;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || '').trim();
  });
  const idColumnIndex = headers.indexOf('id');

  if (idColumnIndex === -1) {
    throw new Error('Sheet is missing id header: ' + sheet.getName());
  }

  const targetId = String(id || '');
  const match = sheet
    .getRange(2, idColumnIndex + 1, lastRow - 1, 1)
    .createTextFinder(targetId)
    .matchEntireCell(true)
    .matchCase(true)
    .useRegularExpression(false)
    .findNext();
  if (!match) {
    return null;
  }

  const rowNumber = match.getRow();
  const row = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  if (String(row[idColumnIndex]) !== targetId) {
    return null;
  }

  return {
    rowNumber: rowNumber,
    headers: headers,
    record: rowToRecord_(headers, row),
  };
}

function findActiveLeadBySourceReference_(source, sourceId) {
  const normalizedSource = String(source || '').trim();
  const normalizedSourceId = String(sourceId || '').trim();
  if (!normalizedSource || !normalizedSourceId) return null;
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const sourceIdColumnIndex = headers.indexOf('source_id');
  const lastRow = sheet.getLastRow();
  if (sourceIdColumnIndex === -1 || lastRow < 2) return null;
  const seen = {};
  const matches = sheet
    .getRange(2, sourceIdColumnIndex + 1, lastRow - 1, 1)
    .createTextFinder(normalizedSourceId)
    .matchEntireCell(true)
    .matchCase(true)
    .useRegularExpression(false)
    .findAll()
    .map(function (range) {
      const row = sheet.getRange(range.getRow(), 1, 1, headers.length).getValues()[0];
      return rowToRecord_(headers, row);
    })
    .filter(function (lead) {
      const id = String(lead.id || '');
      if (!id || seen[id] || isArchivedLead_(lead)) return false;
      if (String(lead.source || '') !== normalizedSource || String(lead.source_id || '') !== normalizedSourceId) return false;
      seen[id] = true;
      return true;
    });
  if (matches.length > 1) {
    throw createExpectedOperationError_('同じ追加元IDを持つ営業先が複数あるため、自動復旧できません。', 'AMBIGUOUS_LEAD_SOURCE_REFERENCE');
  }
  return matches[0] || null;
}

function normalizeLeadInput_(input, isCreate) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Lead input must be an object.');
  }

  const normalized = normalizeLeadPatch_(input);

  if (isCreate && !normalized.company_name && !normalized.facility_name && !normalized.email && !normalized.form_url) {
    throw new Error('company_name, facility_name, email, or form_url is required.');
  }

  return normalized;
}

function normalizeLeadPatch_(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Lead patch must be an object.');
  }

  const allowedHeaders = SHEET_DEFINITIONS.leads;
  const readonlyFields = ['id', 'created_at', 'updated_at', 'normalized_company_name', 'email_domain', 'website_domain'];
  const normalized = {};

  Object.keys(patch).forEach(function (key) {
    const normalizedKey = normalizeLeadInputKey_(key);

    if (readonlyFields.indexOf(normalizedKey) !== -1 || allowedHeaders.indexOf(normalizedKey) === -1) {
      return;
    }

    normalized[normalizedKey] = normalizeCellValue_(normalizedKey, patch[key]);
  });

  if (Object.prototype.hasOwnProperty.call(normalized, 'status') && LEAD_STATUSES.indexOf(normalized.status) === -1) {
    throw new Error('Invalid lead status: ' + normalized.status);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'form_status') && FORM_STATUSES.indexOf(normalized.form_status) === -1) {
    throw new Error('Invalid form status: ' + normalized.form_status);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'deal_status') && normalized.deal_status && normalized.deal_status !== '未設定' && DEAL_STATUSES.indexOf(normalized.deal_status) === -1) {
    throw new Error('Invalid deal status: ' + normalized.deal_status);
  }

  return normalized;
}

function normalizeLeadInputKey_(key) {
  const aliases = {
    companyName: 'company_name',
    facilityName: 'facility_name',
    websiteUrl: 'website_url',
    formUrl: 'form_url',
    contact_url: 'form_url',
    contactUrl: 'form_url',
    addressText: 'address',
    contactName: 'contact_name',
    contactEmail: 'contact_email',
    custom_fields: 'custom_fields_json',
    customFields: 'custom_fields_json',
    source_payload: 'source_payload_json',
    sourcePayload: 'source_payload_json',
    sendNg: 'send_ng',
    sendNgReason: 'send_ng_reason',
    sendNgMemo: 'send_ng_memo',
    replyChecked: 'reply_checked',
    formStatus: 'form_status',
    nextSendAt: 'next_send_at',
    lastSentAt: 'last_sent_at',
    sendCount: 'send_count',
    dealStatus: 'deal_status',
  };

  return aliases[key] || key;
}

function normalizeCellValue_(key, value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (key === 'send_ng' || key === 'reply_checked') {
    return normalizeBoolean_(value);
  }

  if (key === 'send_count') {
    return normalizeInteger_(value);
  }

  if (key === 'website_domain' || key === 'email_domain') {
    return normalizeDomain_(value);
  }

  if (key === 'website_url' || key === 'contact_url') {
    return normalizeUrl_(value);
  }

  if (key === 'form_url') {
    return normalizeUrl_(value);
  }

  if (key === 'email') {
    return String(value).trim().toLowerCase();
  }

  if (key === 'custom_fields_json' || key === 'source_payload_json') {
    return normalizeJsonString_(value);
  }

  return String(value).trim();
}

function normalizeBoolean_(value) {
  if (value === true || value === false) {
    return value;
  }

  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes' || text === 'y' || text === 'on' || text === 'はい') {
    return true;
  }
  if (text === 'false' || text === '0' || text === 'no' || text === 'n' || text === 'off' || text === 'いいえ' || text === '') {
    return false;
  }

  throw new Error('Invalid boolean value: ' + value);
}

function normalizeInteger_(value) {
  if (value === '') {
    return 0;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error('Invalid non-negative integer: ' + value);
  }

  return Math.floor(numberValue);
}

function normalizeJsonString_(value) {
  if (value === '') {
    return '{}';
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return '{}';
    }

    JSON.parse(text);
    return text;
  }

  return safeJsonStringify_(value);
}

function applyLeadDerivedFields_(lead) {
  lead.normalized_company_name = normalizeCompanyName_(lead.company_name);
  lead.email = normalizeCellValue_('email', lead.email || '');
  lead.email_domain = extractDomainFromEmail_(lead.email);
  lead.website_url = normalizeCellValue_('website_url', lead.website_url || '');
  lead.form_url = normalizeCellValue_('form_url', lead.form_url || '');
  lead.website_domain = firstAvailableDomain_(lead.website_url, lead.form_url, lead.email_domain);
  lead.custom_fields_json = lead.custom_fields_json || '{}';
  lead.source_payload_json = lead.source_payload_json || '{}';
}

function applyLeadStatusSideEffects_(lead, explicitFields) {
  const status = String(lead.status || '').trim();
  if (!status) {
    return lead;
  }

  const isSentStatus = status === '初回メール送信済み' || status === '2ヶ月後メール送信済み';

  if (status === '返信あり') {
    lead.reply_checked = true;
  }

  if (DEAL_STATUSES.indexOf(status) !== -1) {
    lead.reply_checked = true;
    lead.deal_status = status;
  }

  if (SEND_EXCLUDED_STATUSES.indexOf(status) !== -1) {
    lead.next_send_at = '';
  }

  if (status === 'フォーム対応中') {
    lead.form_status = '対応中';
  }

  if (status === 'フォーム対応済み') {
    lead.form_status = '対応済み';
  }

  if (status === '対応不要') {
    lead.form_status = '対応不要';
  }

  if (status === '未対応' && !explicitFields.has('form_status') && String(lead.form_status || '') === '対応不要') {
    lead.form_status = '未対応';
  }

  if (status === '送信NG') {
    lead.send_ng = true;
  }

  if (status !== '送信NG' && !explicitFields.has('send_ng')) {
    lead.send_ng = false;
  }

  if (status !== '送信NG') {
    lead.send_ng_reason = '';
    lead.send_ng_memo = '';
  }

  if (isSentStatus) {
    if (!explicitFields.has('reply_checked')) {
      lead.reply_checked = false;
    }
    if (!explicitFields.has('deal_status')) {
      lead.deal_status = '未設定';
    }
  }

  if (status === '未対応' || status === '対応中') {
    if (!explicitFields.has('reply_checked')) {
      lead.reply_checked = false;
    }
    if (!explicitFields.has('deal_status')) {
      lead.deal_status = '未設定';
    }
  }

  return lead;
}

function assertNoDuplicateLead_(sheet, lead, options) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const input = options && typeof options === 'object' ? options : {};
  const excludeLeadId = String(input.excludeLeadId || input.exclude_lead_id || '').trim();
  const headers = getHeaders_(sheet);
  const candidateRows = {};
  const collectCandidateRows = function (columnName, value, matchCase) {
    const text = String(value || '').trim();
    const columnIndex = headers.indexOf(columnName);
    if (!text || columnIndex === -1) return;
    sheet
      .getRange(2, columnIndex + 1, lastRow - 1, 1)
      .createTextFinder(text)
      .matchEntireCell(false)
      .matchCase(matchCase === true)
      .useRegularExpression(false)
      .findAll()
      .forEach(function (range) {
        candidateRows[range.getRow()] = true;
      });
  };

  collectCandidateRows('email', lead.email, false);
  collectCandidateRows('source_id', lead.source_id, true);
  collectCandidateRows('normalized_company_name', lead.normalized_company_name, false);
  collectCandidateRows('website_domain', lead.website_domain, false);

  const duplicate = Object.keys(candidateRows).map(Number).sort(function (left, right) {
    return left - right;
  }).map(function (rowNumber) {
    const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    return rowToRecord_(headers, row);
  }).find(function (existing) {
    if (excludeLeadId && String(existing.id || '') === excludeLeadId) return false;
    return areLeadRecordsDuplicateForCreate_(existing, lead);
  });

  if (duplicate) {
    throw createExpectedOperationError_('Duplicate lead exists: ' + duplicate.id, 'DUPLICATE_LEAD');
  }
}

function areLeadRecordsDuplicateForCreate_(existing, candidate) {
  const current = existing && typeof existing === 'object' ? existing : {};
  const lead = candidate && typeof candidate === 'object' ? candidate : {};
  const existingWebsiteDomain = leadDuplicateWebsiteDomain_(current);
  const candidateWebsiteDomain = leadDuplicateWebsiteDomain_(lead);
  if (isArchivedLead_(current)) {
    return isAutomatedLeadCollectionSource_(lead.source) &&
      Boolean(existingWebsiteDomain && candidateWebsiteDomain &&
        existingWebsiteDomain === candidateWebsiteDomain);
  }

  const existingEmail = String(current.email || '').trim().toLowerCase();
  const candidateEmail = String(lead.email || '').trim().toLowerCase();
  if (candidateEmail && existingEmail && existingEmail === candidateEmail) return true;

  const existingSource = String(current.source || '').trim();
  const existingSourceId = String(current.source_id || '').trim();
  const candidateSource = String(lead.source || '').trim();
  const candidateSourceId = String(lead.source_id || '').trim();
  if (candidateSource && candidateSourceId && existingSource === candidateSource && existingSourceId === candidateSourceId) return true;

  const existingWebsite = normalizeLeadComparableUrl_(current.website_url || '');
  const candidateWebsite = normalizeLeadComparableUrl_(lead.website_url || '');
  if (existingWebsite && candidateWebsite && existingWebsite === candidateWebsite) return true;

  if (existingWebsiteDomain && candidateWebsiteDomain && existingWebsiteDomain === candidateWebsiteDomain) return true;

  const existingForm = normalizeLeadComparableUrl_(current.form_url || '');
  const candidateForm = normalizeLeadComparableUrl_(lead.form_url || '');
  if (existingForm && candidateForm && existingForm === candidateForm) return true;

  return false;
}

function normalizeLeadComparableUrl_(value) {
  const normalized = normalizeUrl_(value);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    const domain = normalizeDomain_(normalized);
    if (!domain) return '';
    const path = (String(parsed.pathname || '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/').toLowerCase();
    const queryParts = String(parsed.search || '').replace(/^\?/, '').split('&').filter(function (part) {
      if (!part) return false;
      const key = decodeLeadComparableUrlComponent_(part.split('=')[0] || '').toLowerCase();
      return !/^(?:utm_.+|gclid|fbclid|yclid|msclkid|ref|source)$/.test(key);
    }).sort();
    return domain + path + (queryParts.length ? '?' + queryParts.join('&') : '');
  } catch (error) {
    return normalized.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
  }
}

function decodeLeadComparableUrlComponent_(value) {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, '%20'));
  } catch (error) {
    return String(value || '');
  }
}

function duplicateKeysForLead_(lead) {
  const keys = [];
  const email = String(lead.email || '').trim().toLowerCase();
  const company = normalizeCompanyName_(lead.normalized_company_name || lead.company_name || lead.facility_name || '');
  const domain = leadDuplicateWebsiteDomain_(lead);
  if (email && email.indexOf('@') !== -1) keys.push('email:' + email);
  if (domain) keys.push('domain:' + domain);
  if (company && domain) keys.push('company_domain:' + company + ':' + domain);
  else if (company && company.length >= 4) keys.push('company:' + company);
  return Array.from(new Set(keys));
}

function duplicateMatchedKeys_(leftKeys, rightKeys) {
  const right = new Set(rightKeys || []);
  return (leftKeys || []).filter(function (key) {
    return right.has(key);
  });
}

function duplicateReasonLabels_(keys) {
  const labels = [];
  (keys || []).forEach(function (key) {
    if (key.indexOf('email:') === 0 && labels.indexOf('メール') === -1) labels.push('メール');
    if ((key.indexOf('domain:') === 0 || key.indexOf('company_domain:') === 0) && labels.indexOf('ドメイン') === -1) labels.push('ドメイン');
    if ((key.indexOf('company:') === 0 || key.indexOf('company_domain:') === 0) && labels.indexOf('会社名') === -1) labels.push('会社名');
  });
  return labels.length ? labels : ['重複候補'];
}

function duplicateReasonDetail_(key) {
  const text = String(key || '');
  if (text.indexOf('email:') === 0) return 'メール一致: ' + text.replace(/^email:/, '');
  if (text.indexOf('domain:') === 0) return 'ドメイン一致: ' + text.replace(/^domain:/, '');
  if (text.indexOf('company_domain:') === 0) return '会社名とドメインが一致';
  if (text.indexOf('company:') === 0) return '会社名一致';
  return '';
}

function normalizeUrl_(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  return 'https://' + text;
}

function normalizeDomain_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .replace(/:.*$/, '');
}

const NON_ADVERTISER_LEAD_DOMAINS_ = Object.freeze([
  'yamagatakanko.com',
  'kankou-hamada.or.jp',
  'umimachi-shimanecho.jp',
  'nkk-oki.com',
  'camping.gr.jp',
  'e-oki.net',
  'town-kofu.jp',
  'katsuragi-kanko.jp',
  'hokuei-kankou.jp',
  'jpcamp.jp',
  'kumano-area.jp',
  'kihoku-kanko.com',
  'minami-ise.jp',
  'web-odai.info',
  'gozashirahama.com',
  'kankomie.or.jp',
  'tomikan.jp',
  'doshi-kanko.jp',
  'odekake-wanko-bu.com',
  'moroyama-kanko.jp',
  'chichibuji.gr.jp',
  'rumoi-rasisa.jp',
  'kamishihoro.jp',
  'tic.mombetsu.net',
  'nakagawatourism.com',
  'bunto.com',
  'furunavi.jp',
  'katch.co.jp',
  'nap-camp.com',
  'camp-go.com',
  'campla.jp',
  'campiii.com',
  'hatinosu.net',
  'japancamp.jp',
  'my-kagawa.jp',
  'jalan.net',
  'rurubu.jp',
  'rurubu.travel',
  'mapple.net',
  'iko-yo.net',
  'asoview.com',
  'tripadvisor.jp',
  'tripadvisor.com',
  'navitime.co.jp',
  'travel.yahoo.co.jp',
  'travel.rakuten.co.jp',
  'booking.com',
  'agoda.com',
  'togakushi-21.jp',
  'ta-kankoukyoukai.com',
  'takibi-reservation.style',
  'boso-asobo.com',
  'campet.net',
  'tateyamacity.com',
  'agakanren.com',
  'oze-katashina.info',
  'enjoy-minakami.jp',
  'maebashi-cvb.com',
  'takasaki-kankoukyoukai.or.jp',
  'guruttoonuma.net',
  'apoi-geopark.jp',
  'hokkaido-hidaka-kankonavi.com',
  'engaru.jp',
  'kitamikanko.jp',
  'visitshibetsu.com',
  'hakobura.jp',
  'teshiotown.hokkaido.jp',
  'mashike.jp',
  'niikappu.jp',
  'sounkyo.net',
  'akkeshi-town.jp',
  'ms11.or.jp',
  'urakawa-tabi.com',
  'toya-colors.com',
  'gimmig.co.jp',
  'town-kyogoku.jp',
  'go-to-ashibetsu.com',
  'tabirai.net',
  'kochi-tabi.jp',
  'higashihiroshima-digital.com',
  'wankonowa.com',
  'cm-boso.com',
  'joypark-pv.com',
  'niwadandyism.top',
  'touring.hokkaido.world',
  'hokkaido-michinoeki.jp',
  'mori-locationmatch.net',
  'koureisha-jutaku.com',
  'job.kiracare.jp',
  'tonosoto.com',
  'colocal.jp',
  'ibaraki-camp.jp',
  'roushikyo-hokkaido.jp',
  'walkerplus.com',
  'ameblo.jp',
  'hatenablog.com',
  'hatenablog.jp',
  'blogspot.com',
  'blog.fc2.com',
  'livedoor.blog',
  'seesaa.net',
  'exblog.jp',
  'cocolog-nifty.com',
  'blog.goo.ne.jp',
  'muragon.com',
  'wordpress.com',
  'note.com',
  'jugem.jp',
  'webry.info',
  'ss-blog.jp',
  'diary.to',
  'plaza.rakuten.co.jp',
]);

function isGovernmentOrMunicipalLeadDomain_(value) {
  const domain = normalizeDomain_(value);
  if (!domain) return false;
  if (/(?:^|\.)go\.jp$/i.test(domain) || /(?:^|\.)lg\.jp$/i.test(domain)) return true;
  return /(?:^|\.)(?:pref|city|town|vill|village)\.[a-z0-9-]+(?:\.[a-z0-9-]+)?\.jp$/i.test(domain);
}

function isKnownNonAdvertiserLeadUrl_(value) {
  const normalizedUrl = normalizeUrl_(value);
  const domain = normalizeDomain_(normalizedUrl);
  if (!domain) return false;
  if (isGovernmentOrMunicipalLeadDomain_(domain)) return true;
  if (NON_ADVERTISER_LEAD_DOMAINS_.some(function (host) {
    return isDomainOrSubdomain_(domain, host);
  })) return true;

  let path = '';
  let decodedPath = '';
  try {
    path = new URL(normalizedUrl).pathname.toLowerCase();
    try {
      decodedPath = decodeURIComponent(path);
    } catch (decodeError) {
      decodedPath = path;
    }
  } catch (error) {
    path = String(normalizedUrl || '').toLowerCase();
    decodedPath = path;
  }
  // Tourism associations and regional guides commonly publish one page per facility,
  // then link visitors to a separate operator site. Reject only when both the host
  // and the directory-like path indicate a guide/listing so an operator's ordinary
  // /information or /news page is not removed by the generic rule.
  const tourismPortalDomain = /(?:^|[.-])(?:kanko|kankou|tourism|visit|odekake)(?:[.-]|$)/i.test(domain);
  const travelContentDomain = /(?:^|[.-])(?:travel|tabi|trip)(?:[.-]|$)/i.test(domain);
  const listingPath = /\/(?:attractions?|sightseeing|spots?|places?|see|articles?|archives?|guides?|guideposts?|features?|information|search|facilit(?:y|ies)|shisetsu|accommodations?|lodgings?|stay(?:ing)?(?:[_-][^/]*)?|play|leisure|detail(?:[_-][^/]*)?)(?:\/|$)/i.test(path) ||
    /\/(?:目的で選ぶ|観光スポット|施設|宿泊|遊ぶ)(?:\/|$)/i.test(decodedPath);
  const sharedCorporateTourismContent =
    isDomainOrSubdomain_(domain, 'honda.co.jp') && /^\/dog\/travel(?:\/|$)/i.test(path);
  return tourismPortalDomain || (travelContentDomain && listingPath) || sharedCorporateTourismContent;
}

function leadCollectionSendNgDomainsCacheKey_() {
  return 'lead_collection_send_ng_domains_' + String(APP_VERSION || 'v1');
}

function clearLeadCollectionSendNgDomainsCache_() {
  try {
    if (typeof CacheService === 'undefined') return;
    const cache = CacheService.getScriptCache();
    if (cache && typeof cache.remove === 'function') cache.remove(leadCollectionSendNgDomainsCacheKey_());
  } catch (error) {}
}

function getLeadCollectionSendNgDomainRecords_() {
  try {
    if (typeof CacheService !== 'undefined') {
      const cache = CacheService.getScriptCache();
      const cached = cache && typeof cache.get === 'function'
        ? cache.get(leadCollectionSendNgDomainsCacheKey_())
        : '';
      if (cached) {
        const domains = JSON.parse(cached);
        if (Array.isArray(domains)) {
          return domains.map(function (domain) {
            return { domain: String(domain || ''), source: 'send_ng_lead' };
          }).filter(function (record) { return Boolean(record.domain); });
        }
      }
    }
  } catch (error) {}

  const domains = {};
  try {
    const leads = readSheetRecordFields_('leads', [
      'website_url',
      'form_url',
      'email',
      'send_ng',
      'status',
      'source_payload_json',
    ], { maxGapColumns: 0 });
    leads.forEach(function (lead) {
      const source = lead && typeof lead === 'object' ? lead : {};
      if (!normalizeBooleanLike_(source.send_ng) && String(source.status || '') !== '送信NG') return;
      const payload = parseJsonObjectSafe_(source.source_payload_json);
      if (Object.prototype.hasOwnProperty.call(payload, 'review_exclude_domain_from_collection') && payload.review_exclude_domain_from_collection !== true) return;
      [
        normalizeDomain_(source.website_url || ''),
        normalizeDomain_(source.form_url || ''),
        extractDomainFromEmail_(source.email || ''),
      ].filter(Boolean).forEach(function (domain) {
        domains[String(domain).toLowerCase()] = true;
      });
    });
  } catch (error) {}

  const domainList = Object.keys(domains).sort();
  try {
    if (typeof CacheService !== 'undefined') {
      const cache = CacheService.getScriptCache();
      if (cache && typeof cache.put === 'function') {
        cache.put(
          leadCollectionSendNgDomainsCacheKey_(),
          JSON.stringify(domainList),
          300
        );
      }
    }
  } catch (error) {}
  return domainList.map(function (domain) {
    return { domain: domain, source: 'send_ng_lead' };
  });
}

function getLeadCollectionExcludedDomainRecords_() {
  let configured = [];
  try {
    configured = readAllActiveSheetRecords_('excluded_domains');
  } catch (error) {
    configured = [];
  }
  const merged = {};
  configured.concat(getLeadCollectionSendNgDomainRecords_()).forEach(function (record) {
    const source = record && typeof record === 'object' ? record : {};
    const domain = normalizeDomain_(source.domain || '');
    if (!domain || merged[domain]) return;
    merged[domain] = Object.assign({}, source, { domain: domain });
  });
  return Object.keys(merged).map(function (domain) { return merged[domain]; });
}

function isLeadCollectionExcludedUrl_(value, excludedDomains) {
  if (isKnownNonAdvertiserLeadUrl_(value)) return true;
  const domain = normalizeDomain_(value);
  if (!domain) return false;
  const records = Array.isArray(excludedDomains) ? excludedDomains : getLeadCollectionExcludedDomainRecords_();
  return records.some(function (record) {
    return isDomainOrSubdomain_(domain, record.domain);
  });
}

function isAutomatedLeadCollectionSource_(source) {
  return ['serper', 'search_job', 'prospecting', 'source_page'].indexOf(String(source || '')) !== -1;
}

function isSafeNonAdvertiserLeadCleanupTarget_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (isArchivedLead_(source) || !isAutomatedLeadCollectionSource_(source.source)) return false;
  if (Number(source.send_count || 0) > 0 || String(source.last_sent_at || '').trim()) return false;
  if (normalizeBooleanLike_(source.reply_checked)) return false;

  const status = String(source.status || '').trim();
  if (status === '返信あり' || DEAL_STATUSES.indexOf(status) !== -1) return false;
  const dealStatus = String(source.deal_status || '未設定').trim() || '未設定';
  return dealStatus === '未設定';
}

function isNonAdvertiserCleanupCandidate_(lead, excludedDomains) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (!isSafeNonAdvertiserLeadCleanupTarget_(source)) return false;
  const urls = [source.website_url, source.form_url].filter(Boolean);
  const knownNonAdvertiser = urls.some(function (url) { return isKnownNonAdvertiserLeadUrl_(url); });
  if (String(source.status || '') !== '未対応' && !knownNonAdvertiser) return false;
  return urls.some(function (url) { return isLeadCollectionExcludedUrl_(url, excludedDomains); });
}

function isTourismPortalCleanupCandidate_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (!isSafeNonAdvertiserLeadCleanupTarget_(source)) return false;
  const blockedByUrl = [source.website_url, source.form_url].filter(Boolean).some(function (url) {
    return isKnownNonAdvertiserLeadUrl_(url);
  });
  if (blockedByUrl) return true;
  const payload = parseJsonObjectSafe_(source.source_payload_json);
  const selected = payload && payload.serper && payload.serper.selected &&
    payload.serper.selected.source && typeof payload.serper.selected.source === 'object'
    ? payload.serper.selected.source
    : null;
  return Boolean(selected && typeof isTourismAssociationListingSearchResult_ === 'function' &&
    isTourismAssociationListingSearchResult_(selected));
}

function isBlogMediaCleanupCandidate_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (!isSafeNonAdvertiserLeadCleanupTarget_(source)) return false;
  if (String(source.status || '') !== '未対応') return false;
  const blockedByUrl = [source.website_url, source.form_url].filter(Boolean).some(function (url) {
    return isKnownNonAdvertiserLeadUrl_(url);
  });
  if (blockedByUrl) return true;
  const payload = parseJsonObjectSafe_(source.source_payload_json);
  const selected = payload && payload.serper && payload.serper.selected &&
    payload.serper.selected.source && typeof payload.serper.selected.source === 'object'
    ? payload.serper.selected.source
    : null;
  return Boolean(selected && typeof isBlogOrEditorialSearchResult_ === 'function' &&
    isBlogOrEditorialSearchResult_(selected));
}

function isSuspendedLeadCleanupCandidate_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return isSafeNonAdvertiserLeadCleanupTarget_(source) &&
    String(source.status || '') === '未対応' &&
    isSuspendedLeadTitle_(source);
}

function assertLeadCollectionDestinationAllowed_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (!isAutomatedLeadCollectionSource_(source.source)) return true;
  if (isSuspendedLeadTitle_(source)) {
    throw createExpectedOperationError_(
      '施設名・ページタイトル・見出しに休業の表記があるため収集対象から除外しました。',
      'SUSPENDED_SITE'
    );
  }
  const blockedUrl = [source.website_url, source.form_url].filter(Boolean).find(function (url) {
    return isLeadCollectionExcludedUrl_(url);
  });
  if (!blockedUrl) return true;
  throw createExpectedOperationError_(
    '広告主の公式サイトではないため収集対象から除外しました: ' + normalizeDomain_(blockedUrl),
    'NON_ADVERTISER_SITE'
  );
}

function extractDomain_(url) {
  return normalizeDomain_(url);
}

function extractDomainFromEmail_(email) {
  const text = String(email || '').trim();
  if (!text || text.indexOf('@') === -1) {
    return '';
  }

  return normalizeDomain_(text.split('@').pop());
}

function firstAvailableDomain_() {
  for (let index = 0; index < arguments.length; index += 1) {
    const domain = normalizeDomain_(arguments[index]);
    if (domain) {
      return domain;
    }
  }

  return '';
}

function normalizeCompanyName_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[ \t\n\r　]+/g, '')
    .replace(/[・･.,，．、。'"“”‘’()（）[\]【】\-ー_／/]/g, '')
    .replace(/^(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|公益社団法人|一般財団法人|公益財団法人|医療法人|社会福祉法人|学校法人|宗教法人|特定非営利活動法人|npo法人)/i, '')
    .replace(/(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|公益社団法人|一般財団法人|公益財団法人|医療法人|社会福祉法人|学校法人|宗教法人|特定非営利活動法人|npo法人|inc|incorporated|corp|corporation|co|company|ltd|limited|llc|kk)$/i, '')
    .trim();
}

function normalizeListOptions_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const limit = Math.min(Math.max(Number(input.limit) || 100, 1), 2000);
  const offset = Math.max(Number(input.offset) || 0, 0);
  const status = input.status ? String(input.status).trim() : '';
  const genre = String(input.genre || '').trim();
  const filter = String(input.filter || 'all').trim() || 'all';
  const formStatus = String(input.formStatus || input.form_status || '').trim();
  const sort = String(input.sort || 'updated_desc').trim() || 'updated_desc';
  const reviewPriority = String(input.reviewPriority || input.review_priority || 'all').trim() || 'all';
  const reviewContact = String(input.reviewContact || input.review_contact || 'all').trim() || 'all';
  const allowedFilters = ['all', 'email', 'has_email', 'form', 'form_all', 'excluded', 'send_ng', 'review', 'unsent', 'sent', 'reply', 'deal', 'no_contact', 'won', 'lost'].concat(LEAD_LIST_STATE_DEFINITIONS_.map(function (definition) {
    return 'state_' + definition.key;
  })).concat(LEAD_LIST_STATE_GROUP_DEFINITIONS_.map(function (definition) {
    return 'group_' + definition.key;
  }));
  const allowedSorts = ['updated_desc', 'created_desc', 'company_asc', 'status_asc', 'last_sent_desc', 'review_priority_desc', 'review_email_first'];

  if (status && LEAD_STATUSES.indexOf(status) === -1) {
    throw new Error('Invalid lead status: ' + status);
  }
  if (allowedFilters.indexOf(filter) === -1) {
    throw new Error('Invalid lead list filter: ' + filter);
  }
  if (formStatus && ['active', 'all'].concat(FORM_STATUSES).indexOf(formStatus) === -1) {
    throw new Error('Invalid form status filter: ' + formStatus);
  }
  if (allowedSorts.indexOf(sort) === -1) {
    throw new Error('Invalid lead sort: ' + sort);
  }
  if (['all', 'high', 'medium', 'low'].indexOf(reviewPriority) === -1) {
    throw new Error('Invalid review priority filter: ' + reviewPriority);
  }
  if (['all', 'contact', 'no_contact', 'email', 'form', 'form_only'].indexOf(reviewContact) === -1) {
    throw new Error('Invalid review contact filter: ' + reviewContact);
  }
  const includeFields = Array.isArray(input.includeFields || input.include_fields)
    ? (input.includeFields || input.include_fields).slice()
    : [];
  if (['review', 'state_review', 'group_review'].indexOf(filter) !== -1) {
    [
      'source_id', 'external_id', 'normalized_company_name', 'email_domain', 'website_domain',
      'address', 'no_action_reason', 'no_action_memo', 'source_payload_json',
    ].forEach(function (fieldName) {
      if (includeFields.indexOf(fieldName) === -1) includeFields.push(fieldName);
    });
  }

  return {
    limit: limit,
    offset: offset,
    status: status,
    genre: genre,
    filter: filter,
    formStatus: formStatus,
    sort: sort,
    reviewPriority: reviewPriority,
    reviewContact: reviewContact,
    search: String(input.search || '').trim().toLowerCase(),
    includeArchived: input.includeArchived === true,
    includeStats: input.includeStats !== false,
    includeFields: includeFields,
  };
}

function isArchivedLead_(lead) {
  return lead.status === 'archived' || Boolean(lead.archived_at);
}

function parseJsonObjectSafe_(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return Object.assign({}, value);

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function formSendEventsFromCustomFields_(customFields) {
  const raw = customFields && Array.isArray(customFields.form_send_events)
    ? customFields.form_send_events
    : [];
  return raw
    .filter(function (event) {
      return event && typeof event === 'object' && !Array.isArray(event) && (event.type === 'sent' || event.type === 'unsent') && event.at;
    })
    .map(function (event) {
      return {
        at: String(event.at || ''),
        type: String(event.type || ''),
        body: typeof event.body === 'string' ? event.body : '',
        template_id: event.template_id ? String(event.template_id) : '',
      };
    });
}

function latestSuccessfulMailSentAt_(leadId) {
  const normalizedLeadId = String(leadId || '');
  const histories = findSheetRecordsByExactFieldValues_(
    'send_histories',
    'lead_id',
    [normalizedLeadId],
    mailSendSafetyHistoryFields_()
  ).filter(function (history) {
    return String(history.lead_id || '') === normalizedLeadId && isSuccessfulProductionSendHistory_(history);
  })
    .sort(function (a, b) {
      return String(b.sent_at || b.created_at || '').localeCompare(String(a.sent_at || a.created_at || ''));
    });

  return histories.length ? String(histories[0].sent_at || histories[0].created_at || '') : '';
}

function requireId_(id) {
  const normalized = String(id || '').trim();

  if (!normalized) {
    throw new Error('id is required.');
  }

  return normalized;
}

function withScriptLock_(operation, callback, options) {
  const lockOptions = options && typeof options === 'object' ? options : {};
  const waitMs = Math.min(Math.max(Number(lockOptions.waitMs) || 6000, 1000), 300000);
  const attempts = Math.min(Math.max(Number(lockOptions.attempts) || 5, 1), 10);
  const retryDelayMs = Math.min(Math.max(Number(lockOptions.retryDelayMs) || 400, 0), 5000);
  const logErrors = lockOptions.logErrors !== false;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const lock = LockService.getScriptLock();
    let acquired = false;
    try {
      if (typeof lock.tryLock === 'function') {
        acquired = lock.tryLock(waitMs);
        if (!acquired) {
          throw createScriptLockTimeoutError_(operation, attempt, attempts);
        }
      } else {
        lock.waitLock(waitMs);
        acquired = true;
      }
      return callback();
    } catch (error) {
      lastError = error;
      const retryable = !acquired && isScriptLockTimeoutError_(error) && attempt < attempts;
      if (!retryable) {
        if (logErrors && !isExpectedOperationError_(error)) {
          logError_(operation, error, { lock_attempt: attempt, lock_attempts: attempts });
        }
        throw error;
      }
    } finally {
      if (acquired) {
        try {
          lock.releaseLock();
        } catch (releaseError) {
          console.warn('Lock release skipped: ' + releaseError.message);
        }
      }
    }

    if (retryDelayMs > 0) {
      Utilities.sleep(retryDelayMs * attempt);
    }
  }

  throw lastError || createScriptLockTimeoutError_(operation, attempts, attempts);
}

function normalizeBackgroundRuntimeBudgetMs_(value, fallback) {
  const defaultValue = Number(fallback) || BACKGROUND_JOB_DEFAULT_RUNTIME_MS;
  return Math.min(
    Math.max(Number(value) || defaultValue, 10000),
    BACKGROUND_JOB_SAFE_RUNTIME_MAX_MS
  );
}

function createScriptLockTimeoutError_(operation, attempt, attempts) {
  const error = new Error('ロックのタイムアウト: 別の処理が実行中です。しばらく待って自動再試行してください。');
  error.code = 'SCRIPT_LOCK_TIMEOUT';
  error.retryable = true;
  error.operation = String(operation || 'unknown');
  error.lock_attempt = Number(attempt) || 1;
  error.lock_attempts = Number(attempts) || 1;
  return error;
}

function isScriptLockTimeoutError_(error) {
  if (!error) return false;
  if (String(error.code || '') === 'SCRIPT_LOCK_TIMEOUT') return true;
  const message = String(error.message || error.details || error || '');
  return /ロック[^\n]*(タイムアウト|取得でき)|lock[^\n]*(timed?\s*out|timeout|acquir)|another process[^\n]*lock|別のプロセス[^\n]*ロック/i.test(message);
}

function createExpectedOperationError_(message, code) {
  const error = new Error(String(message || 'Operation was blocked.'));
  error.code = String(code || 'EXPECTED_OPERATION_BLOCK');
  error.expected = true;
  return error;
}

function isExpectedOperationError_(error) {
  return Boolean(error && error.expected === true);
}

function buildSyncLogIssueContext_() {
  let gmailSenderConfigured = false;
  try {
    gmailSenderConfigured = Boolean(String(getSettingValue_('gmail_sender_email', '') || '').trim());
  } catch (error) {
    console.warn('Gmail sender setting lookup skipped while classifying errors: ' + error.message);
  }
  return {
    gmailSenderConfigured: gmailSenderConfigured,
  };
}

function classifySyncLogIssue_(log, context) {
  const source = log && typeof log === 'object' ? log : {};
  const issueContext = context && typeof context === 'object' ? context : {};
  const level = String(source.level || '').toLowerCase();
  const message = String(source.message || source.stack || '');
  const operation = String(source.operation || source.event_type || '');
  const createdAtMs = Date.parse(String(source.created_at || ''));
  const occurredBefore = function (isoText) {
    const cutoffMs = Date.parse(isoText);
    return Number.isFinite(createdAtMs) && Number.isFinite(cutoffMs) && createdAtMs <= cutoffMs;
  };
  const occurredAtOrAfter = function (isoText) {
    const cutoffMs = Date.parse(isoText);
    return Number.isFinite(createdAtMs) && Number.isFinite(cutoffMs) && createdAtMs >= cutoffMs;
  };
  const resolved = function (resolution) {
    return {
      issue_status: 'resolved',
      resolved: true,
      resolution: resolution,
      resolved_by_version: APP_VERSION,
    };
  };

  if (level !== 'error' && level !== 'warn') {
    return {
      issue_status: 'informational',
      resolved: false,
      resolution: '',
      resolved_by_version: '',
    };
  }
  if (/Unsupported setting key:\s*gmail_sender_name/i.test(message)) {
    return resolved('差出人名設定は現在のバージョンで保存できます。');
  }
  if (/Unknown action:\s*getAppBootstrap/i.test(message)) {
    return resolved('旧getAppBootstrap APIを現行の初期データAPIへ接続しました。');
  }
  if (/Unknown action:\s*getDashboardData/i.test(message)) {
    return resolved('旧getDashboardData APIを現行のダッシュボードAPIへ接続しました。');
  }
  if (
    issueContext.gmailSenderConfigured === true &&
    occurredBefore('2026-07-18T14:00:00.000Z') &&
    /指定したアドレスはGmailの送信元に登録されていません|GMAIL_SENDER_ALIAS_UNAVAILABLE/i.test(message)
  ) {
    return resolved('確認済みのGmail差出人アドレスが現在設定されています。');
  }
  if (
    occurredBefore('2026-07-19T05:15:00.000Z') &&
    (isScriptLockTimeoutError_({ message: message }) || /updateLead/i.test(operation) && /ロック/i.test(message))
  ) {
    return resolved('短時間ロック・分割書き込み・自動再試行へ変更済みです。');
  }
  if (
    occurredBefore('2026-07-16T00:00:00.000Z') &&
    /スプレッドシート[^\n]*サービスに接続できなくなりました|Service Spreadsheets failed while accessing/i.test(message)
  ) {
    return resolved('一時的なGoogle Sheets接続障害です。現在の保存先とバックグラウンド処理は正常です。');
  }
  if (
    operation === 'doPost' &&
    occurredAtOrAfter('2026-07-22T03:08:00+09:00') &&
    occurredBefore('2026-07-22T03:10:00+09:00') &&
    /^Unknown sheet definition: undefined$/i.test(message.trim())
  ) {
    return resolved('全画面API監査の入力形式確認で発生した検証ログです。正しい引数で再検証済みです。');
  }
  if (
    operation === 'doPost' &&
    occurredAtOrAfter('2026-08-02T21:12:00+09:00') &&
    occurredBefore('2026-08-02T21:14:00+09:00') &&
    /^No valid fields requested for undefined\.$/i.test(message.trim())
  ) {
    return resolved('v322本番監査の入力形式確認で発生した検証ログです。正しい引数で再確認済みです。');
  }
  if (
    operation === 'updateReviewLeadDecision' &&
    occurredBefore('2026-08-02T21:32:00+09:00') &&
    isScriptLockTimeoutError_({ message: message })
  ) {
    return resolved('v323で短時間保存と永続的な保存待ちキューへ変更し、ロック競合時も自動反映するよう修正済みです。');
  }
  if (
    operation === 'claimBackgroundWorkerRun' &&
    occurredBefore('2026-08-02T21:20:00+09:00') &&
    isScriptLockTimeoutError_({ message: message })
  ) {
    return resolved('v322で競合時の不要なエラーログを抑え、30秒後に自動再試行するよう修正済みです。');
  }
  if (
    operation === 'doPost' &&
    occurredBefore('2026-07-29T23:19:00+09:00') &&
    /^Unknown action:\s*repairTourismPortalReviewLeads$/i.test(message.trim())
  ) {
    return resolved('観光サイト除外APIを現在のWebアプリへ接続済みです。');
  }
  if (
    operation === 'advanceSearchJob' &&
    occurredBefore('2026-07-26T20:29:00+09:00') &&
    /一覧ページから施設候補を抽出できませんでした/.test(message)
  ) {
    return resolved('一覧ページとサイトマップからの候補抽出、および候補未検出時の判定を改善済みです。');
  }
  if (
    operation === 'claimScheduledEmailJob' &&
    occurredBefore('2026-07-23T00:00:00+09:00') &&
    isRetryableGoogleSheetsServiceError_({ message: message })
  ) {
    return resolved('Google Sheetsの一時障害時に自動再試行し、失敗が続く場合だけエラーとして記録するよう修正済みです。');
  }
  if (
    operation === 'setSettingValue' &&
    occurredBefore('2026-07-13T00:00:00+09:00') &&
    /email_send_window start must be earlier than end/i.test(message)
  ) {
    return resolved('設定値の入力不備は利用者向けの案内として返し、障害ログには記録しないよう修正済みです。');
  }
  return {
    issue_status: 'open',
    resolved: false,
    resolution: '',
    resolved_by_version: '',
  };
}

function annotateSyncLogIssue_(log, context) {
  return Object.assign({}, log || {}, classifySyncLogIssue_(log, context));
}

function isUnresolvedSyncLogIssue_(log, context) {
  return classifySyncLogIssue_(log, context).issue_status === 'open';
}

function logError_(operation, error, context) {
  const message = error && error.message ? error.message : String(error);
  const stack = error && error.stack ? error.stack : '';

  console.error(operation + ': ' + message);

  try {
    const spreadsheet = getLoggingSpreadsheet_();
    if (!spreadsheet) {
      return;
    }

    const sheet = ensureSheet_(spreadsheet, 'sync_logs');
    const headers = getHeaders_(sheet);
    const row = {
      id: Utilities.getUuid(),
      event_type: 'error',
      operation: operation,
      target_sheet: context && context.target_sheet ? context.target_sheet : '',
      target_id: context && context.target_id ? context.target_id : '',
      level: 'error',
      message: message,
      stack: stack,
      context_json: safeJsonStringify_(context || {}),
      created_at: nowIso_(),
    };

    sheet.appendRow(headers.map(function (header) {
      return valueOrBlank_(row[header]);
    }));
  } catch (loggingError) {
    console.error('logError_ failed: ' + loggingError.message);
  }
}

function getLoggingSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(PROPERTY_KEYS.SPREADSHEET_ID);

  if (storedId) {
    return SpreadsheetApp.openById(storedId);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function safeJsonStringify_(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      stringifyError: error.message,
    });
  }
}

function computeRequestDigest_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value == null ? '' : value),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (byte) {
    return ('0' + ((Number(byte) + 256) % 256).toString(16)).slice(-2);
  }).join('');
}

function valueOrBlank_(value) {
  return value === null || value === undefined ? '' : value;
}

function valueOrDefault_(value, defaultValue) {
  return value === null || value === undefined || value === '' ? defaultValue : value;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
}
