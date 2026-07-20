const APP_NAME = 'Auto Sales List App';
const APP_VERSION = '20260720_apps_script_full_workflow_v267_display_cache_swr';
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
    value: '300000',
    value_type: 'number',
    description: 'Maximum runtime budget per batch. Apps Script hard limit is 6 minutes.',
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

function createLeadWithLockOptions_(input, lockOptions) {
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

function getLead(id) {
  return getLeadById(id);
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
  };
}

function buildLeadListMasterContext_() {
  return buildMasterBlockRulesContext_();
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
  const rows = readSheetRecordFields_('leads', leadListFields_(query.includeFields), { maxGapColumns: LEAD_LIST_READ_MAX_GAP_COLUMNS_ });
  const masterContext = leadListQueryNeedsMasterContext_(query) ? buildLeadListMasterContext_() : {};
  const primaryFilterResponse = buildLeadListPrimaryFilterBundle_(rows, query, masterContext);
  if (primaryFilterResponse) return primaryFilterResponse;
  const filtered = rows.filter(function (lead) {
    if (!query.includeArchived && isArchivedLead_(lead)) {
      return false;
    }
    if (query.status && lead.status !== query.status) {
      return false;
    }
    if (query.genre && String(lead.genre || '') !== query.genre) {
      return false;
    }
    if (query.formStatus && !matchesFormStatusFilter_(lead, query.formStatus)) {
      return false;
    }
    if (!matchesLeadListFilter_(lead, query.filter, masterContext)) {
      return false;
    }
    if (!query.search) {
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

    return haystack.indexOf(query.search) !== -1;
  });

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

  const rows = readSheetRecordFields_('leads', leadListFields_([]), { maxGapColumns: LEAD_LIST_READ_MAX_GAP_COLUMNS_ });
  const stats = buildLeadListStats_(rows, buildLeadListMasterContext_(), genre);
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
  return ['email', 'form', 'unsent'].indexOf(filter) !== -1;
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
  if (value === 'review') return isLeadReviewPending_(lead);
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
    hasLeadReviewDestination_(lead);
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
      archived_at: values[index][indexes.archived_at],
    };
    if (!isNonAdvertiserCleanupCandidate_(lead, excludedDomains)) continue;
    const blockedUrl = [lead.website_url, lead.form_url].filter(Boolean).find(function (url) {
      return isLeadCollectionExcludedUrl_(url, excludedDomains);
    });
    if (!blockedUrl) continue;
    targets.push({
      rowNumber: rowNumber,
      id: String(lead.id || ''),
      name: String(lead.facility_name || lead.company_name || ''),
      domain: normalizeDomain_(blockedUrl),
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
    matched: targets.length,
    deleted: 0,
    lockBatches: 0,
    done: lastScannedRow >= lastRow,
    items: targets.slice(0, 50),
  };
  if (dryRun || !targets.length) return baseResult;

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
          status: current[indexes.status],
          website_url: current[indexes.website_url],
          form_url: current[indexes.form_url],
          last_sent_at: current[indexes.last_sent_at],
          send_count: current[indexes.send_count],
          reply_checked: current[indexes.reply_checked],
          deal_status: current[indexes.deal_status],
          archived_at: current[indexes.archived_at],
        };
        if (isNonAdvertiserCleanupCandidate_(lead, excludedDomains)) verifiedRows.push(Number(target.rowNumber));
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
        setColumnValue('no_action_reason', '収集対象外サイト');
        setColumnValue('no_action_memo', '広告主の公式サイトではないポータル・比較・観光情報ページのため自動削除');
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
  });
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

function updateReviewLeadDecision(id, input) {
  const source = input && typeof input === 'object' ? input : {};
  const mode = String(source.mode || 'decision').trim();
  const nextStatus = String(source.status || source.nextStatus || source.next_status || '').trim();
  const expectedStatus = String(source.expectedStatus || source.expected_status || (mode === 'undo' ? '' : '未対応')).trim();
  const decisionStatuses = ['対応中', '送信NG', '対応不要'];

  if (mode === 'undo') {
    if (nextStatus !== '未対応' || decisionStatuses.indexOf(expectedStatus) === -1) {
      throw createExpectedOperationError_('確認操作の取り消し条件が不正です。', 'REVIEW_DECISION_INVALID');
    }
  } else if (mode !== 'decision' || expectedStatus !== '未対応' || decisionStatuses.indexOf(nextStatus) === -1) {
    throw createExpectedOperationError_('確認待ちで選べない更新内容です。', 'REVIEW_DECISION_INVALID');
  }

  return withScriptLock_('updateReviewLeadDecision', function () {
    const leadId = requireId_(id);
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const found = findRowById_(sheet, leadId);
    if (!found) throw new Error('Lead not found: ' + leadId);
    const current = found.record;
    const currentStatus = String(current.status || '');
    const reviewSource = ['serper', 'search_job', 'prospecting', 'source_page'].indexOf(String(current.source || '')) !== -1;

    if (!reviewSource) {
      return buildReviewLeadConflict_(current, 'この営業先は確認待ち由来ではないため更新しませんでした。');
    }
    if (currentStatus === nextStatus) {
      return {
        ok: true,
        reused: true,
        conflict: false,
        lead: current,
        previous_status: expectedStatus,
        status: nextStatus,
      };
    }
    if (currentStatus !== expectedStatus) {
      return buildReviewLeadConflict_(current, '別の処理で状態が「' + (currentStatus || '未設定') + '」に更新されたため、古い確認操作では上書きしませんでした。');
    }
    if (mode === 'decision' && !isLeadReviewPending_(current)) {
      return buildReviewLeadConflict_(current, 'この営業先はすでに確認待ちではないため更新しませんでした。');
    }

    const updated = updateLeadFoundLocked_(sheet, found, { status: nextStatus });
    return {
      ok: true,
      reused: false,
      conflict: false,
      lead: updated,
      previous_status: expectedStatus,
      status: nextStatus,
    };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
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

function updateLeadFoundLocked_(sheet, found, patch) {
  if (!sheet || !found || !found.record || !found.rowNumber) {
    throw new Error('Lead row is required for update.');
  }

  const headers = found.headers || getHeaders_(sheet);
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

  writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
  clearRuntimeCaches_('leads');

  return nextRecord;
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

function assertNoDuplicateLead_(sheet, lead) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
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
    return areLeadRecordsDuplicateForCreate_(existing, lead);
  });

  if (duplicate) {
    throw createExpectedOperationError_('Duplicate lead exists: ' + duplicate.id, 'DUPLICATE_LEAD');
  }
}

function areLeadRecordsDuplicateForCreate_(existing, candidate) {
  const current = existing && typeof existing === 'object' ? existing : {};
  const lead = candidate && typeof candidate === 'object' ? candidate : {};
  if (isArchivedLead_(current)) return false;

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

  const existingForm = normalizeLeadComparableUrl_(current.form_url || '');
  const candidateForm = normalizeLeadComparableUrl_(lead.form_url || '');
  if (existingForm && candidateForm && existingForm === candidateForm) return true;

  const sameCompany = String(current.normalized_company_name || '') === String(lead.normalized_company_name || '');
  const sameDomain = String(current.website_domain || '') && String(current.website_domain || '') === String(lead.website_domain || '');
  return sameCompany && sameDomain;
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
  const domain = normalizeDomain_(lead.website_domain || lead.email_domain || lead.website_url || lead.form_url || '');
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
  'nap-camp.com',
  'camp-go.com',
  'campla.jp',
  'campiii.com',
  'hatinosu.net',
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
  try {
    path = new URL(normalizedUrl).pathname.toLowerCase();
  } catch (error) {
    path = String(normalizedUrl || '').toLowerCase();
  }
  const tourismPortalDomain = /(?:^|[.-])(?:kanko|tourism|travel)(?:[.-]|$)/i.test(domain);
  const listingPath = /\/(?:attractions?|sightseeing|spots?|places?|articles?|guides?|features?|search|detail(?:[_/-]|$))/i.test(path);
  return tourismPortalDomain && listingPath;
}

function getLeadCollectionExcludedDomainRecords_() {
  try {
    return readAllActiveSheetRecords_('excluded_domains');
  } catch (error) {
    return [];
  }
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

function assertLeadCollectionDestinationAllowed_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  if (!isAutomatedLeadCollectionSource_(source.source)) return true;
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
  const allowedFilters = ['all', 'email', 'has_email', 'form', 'form_all', 'excluded', 'send_ng', 'review', 'unsent', 'sent', 'reply', 'deal', 'no_contact', 'won', 'lost'].concat(LEAD_LIST_STATE_DEFINITIONS_.map(function (definition) {
    return 'state_' + definition.key;
  })).concat(LEAD_LIST_STATE_GROUP_DEFINITIONS_.map(function (definition) {
    return 'group_' + definition.key;
  }));
  const allowedSorts = ['updated_desc', 'created_desc', 'company_asc', 'status_asc', 'last_sent_desc'];

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

  return {
    limit: limit,
    offset: offset,
    status: status,
    genre: genre,
    filter: filter,
    formStatus: formStatus,
    sort: sort,
    search: String(input.search || '').trim().toLowerCase(),
    includeArchived: input.includeArchived === true,
    includeStats: input.includeStats !== false,
    includeFields: Array.isArray(input.includeFields || input.include_fields)
      ? (input.includeFields || input.include_fields)
      : [],
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
        if (!isExpectedOperationError_(error)) {
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
