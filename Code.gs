const APP_NAME = 'Auto Sales List App';
const APP_VERSION = '20260706_apps_script_full_workflow_v102_nested_card_wrap_guard';
const PROPERTY_KEYS = Object.freeze({
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  SERPER_API_KEY: 'SERPER_API_KEY',
  SERPER_API_KEYS_JSON: 'SERPER_API_KEYS_JSON',
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
    'query_json',
    'total_count',
    'processed_count',
    'daily_limit',
    'job_limit',
    'last_error',
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
    'target_sheet',
    'target_id',
    'level',
    'message',
    'stack',
    'context_json',
    'created_at',
  ],
  jobs: [
    'id',
    'job_type',
    'status',
    'payload_json',
    'cursor_json',
    'total_count',
    'processed_count',
    'last_error',
    'locked_at',
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
    'row_json',
    'status',
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
    key: 'serper_daily_search_limit',
    value: '100',
    value_type: 'number',
    description: 'Daily Serper request cap used by this app.',
  },
  {
    key: 'serper_monthly_search_limit',
    value: '1000',
    value_type: 'number',
    description: 'Monthly Serper request cap used by this app.',
  },
  {
    key: 'serper_per_lead_search_limit',
    value: '3',
    value_type: 'number',
    description: 'Maximum Serper requests allowed for one lead.',
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
  const spreadsheet = getOrCreateSpreadsheet_();

  return {
    appName: APP_NAME,
    version: APP_VERSION,
    reference: EXISTING_APP_REFERENCE,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function getSchemaStatus() {
  const spreadsheet = getOrCreateSpreadsheet_();
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
      settingKeys: ['gmail_daily_send_limit', 'email_batch_send_limit', 'email_send_window', 'mail_sending_control', 'gmail_reply_check', 'calendar_auto_create', 'batch_runtime_budget_ms'],
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
      const records = readSheetRecords_(sheet);
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
  const recoverySteps = [
    'Apps Script editorで setup() を実行',
    'Webアプリを再読み込み',
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
  return withScriptLock_('createLead', function () {
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
    if (!allowDuplicate) {
      assertNoDuplicateLead_(sheet, lead);
    }

    sheet.appendRow(headers.map(function (header) {
      return valueOrBlank_(lead[header]);
    }));

    return getLeadById(lead.id);
  });
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

function listLeads(options) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'leads');
  const rows = readSheetRecords_(sheet);
  const query = normalizeListOptions_(options);
  const masterContext = buildMasterBlockContext_();
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
      lead.domain,
      lead.website_url,
      lead.website_domain,
      lead.form_url,
      lead.email,
      lead.email_domain,
      lead.phone,
      lead.address,
      lead.genre,
      lead.facility_name,
      lead.status,
      lead.source,
      lead.owner,
      lead.notes,
    ].join(' ').toLowerCase();

    return haystack.indexOf(query.search) !== -1;
  });

  sortLeads_(filtered, query.sort);

  return {
    total: filtered.length,
    offset: query.offset,
    limit: query.limit,
    filter: query.filter,
    genre: query.genre,
    sort: query.sort,
    stats: buildLeadListStats_(rows, masterContext, query.genre),
    filteredStats: buildLeadListStats_(filtered, masterContext, query.genre),
    items: filtered.slice(query.offset, query.offset + query.limit),
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

  if (value === 'email') return isEmailSendTarget_(lead, masterContext);
  if (value === 'form') return isFormSendTarget_(lead, masterContext);
  if (value === 'form_all') return isFormOutreachLead_(lead);
  if (value === 'excluded') return sendNg || SEND_EXCLUDED_STATUSES.indexOf(status) !== -1;
  if (value === 'send_ng') return sendNg;
  if (value === 'unsent') return isValidEmailAddress_(lead.email) && !sent && !sendNg && !replied && !deal;
  if (value === 'sent') return sent;
  if (value === 'reply') return replied;
  if (value === 'deal') return deal;
  if (value === 'no_contact') return !isValidEmailAddress_(lead.email) && !lead.form_url;
  if (value === 'won') return dealStatus === '受注' || status === '受注';
  if (value === 'lost') return dealStatus === '失注' || status === '失注';
  if (value === 'review') return status === '未対応' && ['serper', 'search_job', 'prospecting'].indexOf(String(lead.source || '')) !== -1;
  return true;
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
  };
}

function updateLead(id, patch) {
  return withScriptLock_('updateLead', function () {
    const leadId = requireId_(id);
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const found = findRowById_(sheet, leadId);

    if (!found) {
      throw new Error('Lead not found: ' + leadId);
    }

    const headers = getHeaders_(sheet);
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

    return getLeadById(leadId);
  });
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
      sheet.deleteRow(found.rowNumber);
      return {
        ok: true,
        id: leadId,
        deleted: true,
        hardDeleted: true,
      };
    }

    const headers = getHeaders_(sheet);
    const now = nowIso_();
    const nextRecord = Object.assign({}, found.record, {
      status: '対応不要',
      form_status: '対応不要',
      next_send_at: '',
      archived_at: now,
      updated_at: now,
    });

    writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
    return nextRecord;
  });
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

    const now = nowIso_();
    const headers = getHeaders_(sheet);
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
    });

    customFields.form_send_count = nextCount;
    customFields.last_form_sent_at = now;
    customFields.last_form_body = body;
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
    return getLeadById(id);
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
    const headers = getHeaders_(sheet);
    const customFields = parseJsonObjectSafe_(found.record.custom_fields_json);
    const events = formSendEventsFromCustomFields_(customFields);
    const nextCount = Math.max(0, Number(customFields.form_send_count || 0) - 1);
    const fallbackSentAt = latestSuccessfulMailSentAt_(id);

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

    const nextRecord = Object.assign({}, found.record, {
      status: found.record.status === 'フォーム対応済み' ? '未対応' : (found.record.status || '未対応'),
      form_status: '未対応',
      last_sent_at: fallbackSentAt || '',
      custom_fields_json: safeJsonStringify_(customFields),
      updated_at: now,
    });

    writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
    return getLeadById(id);
  });
}

function listLeadDuplicateCandidates(leadId, options) {
  const recordId = requireId_(leadId);
  const query = options && typeof options === 'object' ? options : {};
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'leads');
  const leads = readSheetRecords_(sheet).filter(function (lead) {
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
    })
    .slice(0, limit);

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
    items: candidates,
  };
}

function saveSerperApiKey(apiKey) {
  const normalized = String(apiKey || '').trim();

  if (!normalized) {
    throw new Error('Serper API key is required.');
  }

  PropertiesService.getScriptProperties().setProperty(PROPERTY_KEYS.SERPER_API_KEY, normalized);
  upsertSerperPrimaryKey_(normalized, 'Serperキー');

  return {
    ok: true,
    saved: true,
  };
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
      properties.deleteProperty(PROPERTY_KEYS.SPREADSHEET_ID);
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
  }).filter(Boolean);
}

function findRowById_(sheet, id) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return null;
  }

  const headers = values[0].map(function (value) {
    return String(value || '').trim();
  });
  const idColumnIndex = headers.indexOf('id');

  if (idColumnIndex === -1) {
    throw new Error('Sheet is missing id header: ' + sheet.getName());
  }

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][idColumnIndex]) === String(id)) {
      return {
        rowNumber: rowIndex + 1,
        record: rowToRecord_(headers, values[rowIndex]),
      };
    }
  }

  return null;
}

function normalizeLeadInput_(input, isCreate) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Lead input must be an object.');
  }

  const normalized = normalizeLeadPatch_(input);

  if (isCreate && !normalized.company_name) {
    throw new Error('company_name is required.');
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
  const existingLeads = readSheetRecords_(sheet);
  const duplicate = existingLeads.find(function (existing) {
    if (isArchivedLead_(existing)) {
      return false;
    }

    const existingEmail = String(existing.email || '').trim().toLowerCase();
    if (lead.email && existingEmail && existingEmail === lead.email) {
      return true;
    }

    const existingSource = String(existing.source || '').trim();
    const existingSourceId = String(existing.source_id || '').trim();
    if (lead.source && lead.source_id && existingSource === lead.source && existingSourceId === lead.source_id) {
      return true;
    }

    const sameCompany = String(existing.normalized_company_name || '') === String(lead.normalized_company_name || '');
    const sameDomain = String(existing.website_domain || '') && String(existing.website_domain || '') === String(lead.website_domain || '');
    return sameCompany && sameDomain;
  });

  if (duplicate) {
    throw new Error('Duplicate lead exists: ' + duplicate.id);
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
  const allowedFilters = ['all', 'email', 'form', 'form_all', 'excluded', 'send_ng', 'review', 'unsent', 'sent', 'reply', 'deal', 'no_contact', 'won', 'lost'];
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
  const histories = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'))
    .filter(function (history) {
      return String(history.lead_id || '') === String(leadId || '') && history.send_result === '成功';
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

function withScriptLock_(operation, callback) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
    return callback();
  } catch (error) {
    logError_(operation, error, {});
    throw error;
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseError) {
      console.warn('Lock release skipped: ' + releaseError.message);
    }
  }
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

function valueOrBlank_(value) {
  return value === null || value === undefined ? '' : value;
}

function valueOrDefault_(value, defaultValue) {
  return value === null || value === undefined || value === '' ? defaultValue : value;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
}
