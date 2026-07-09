function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('自動営業リスト')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);
    const action = String(payload.action || '').trim();
    const data = payload.data || {};
    const result = dispatchPostAction_(action, data);
    return jsonResponse_({
      ok: true,
      result: result,
    });
  } catch (error) {
    logError_('doPost', error, {});
    return jsonResponse_({
      ok: false,
      error: error.message,
    });
  }
}

function showSidebar() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('自動営業リスト');
  SpreadsheetApp.getUi().showSidebar(html);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function parsePostPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function dispatchPostAction_(action, data) {
  if (action === 'setup') return setup();
  if (action === 'getInitialData') return getInitialData();
  if (action === 'getReferenceData') return getReferenceData();
  if (action === 'getAuthorizationStatus') return getAuthorizationStatus();
  if (action === 'getGmailAuthorizationStatus') return getGmailAuthorizationStatus();
  if (action === 'checkGmailIntegration') return checkGmailIntegration();
  if (action === 'getDashboardStats') return getDashboardStats(data);
  if (action === 'getAppInfo') return getAppInfo();
  if (action === 'getSchemaStatus') return getSchemaStatus();
  if (action === 'listLeads') return listLeads(data);
  if (action === 'createLead') return createLead(data);
  if (action === 'updateLead') return updateLead(data.id, data.patch || data);
  if (action === 'deleteLead') return deleteLead(data.id, data.options || {});
  if (action === 'listLeadDuplicateCandidates') return listLeadDuplicateCandidates(data.leadId || data.lead_id || data.id, data.options || data);
  if (action === 'markLeadFormSent') return markLeadFormSent(data.leadId || data.lead_id || data.id, data.options || data);
  if (action === 'unmarkLeadFormSent') return unmarkLeadFormSent(data.leadId || data.lead_id || data.id);
  if (action === 'listSheetRecords') return listSheetRecords(data.sheetName || data.sheet_name, data.options || data);
  if (action === 'listEmailTemplates') return listEmailTemplates(data);
  if (action === 'saveEmailTemplate') return saveEmailTemplate(data);
  if (action === 'setEmailTemplateProduction') return setEmailTemplateProduction(data.id || data.templateId || data.template_id, data.options || data);
  if (action === 'deleteEmailTemplate') return deleteEmailTemplate(data.id);
  if (action === 'listNgMasters') return listNgMasters(data);
  if (action === 'saveNgMaster') return saveNgMaster(data);
  if (action === 'deleteNgMaster') return deleteNgMaster(data.id);
  if (action === 'listExcludedDomains') return listExcludedDomains(data);
  if (action === 'saveExcludedDomain') return saveExcludedDomain(data);
  if (action === 'importExcludedDomains') return importExcludedDomains(data);
  if (action === 'deleteExcludedDomain') return deleteExcludedDomain(data.id);
  if (action === 'listGenres') return listGenres(data);
  if (action === 'saveGenre') return saveGenre(data);
  if (action === 'deleteGenre') return deleteGenre(data.id);
  if (action === 'listReasons') return listReasons(data);
  if (action === 'saveReason') return saveReason(data);
  if (action === 'updateReason') return updateReason(data.id, data.patch || data);
  if (action === 'saveSerperApiKey') return saveSerperApiKey(data.apiKey || data.api_key || data.key);
  if (action === 'listSerperApiKeyManager') return listSerperApiKeyManager();
  if (action === 'refreshSerperCredits') return refreshSerperCredits();
  if (action === 'saveSerperApiKeyEntry') return saveSerperApiKeyEntry(data);
  if (action === 'updateSerperApiKeyEntry') return updateSerperApiKeyEntry(data.id, data.patch || data);
  if (action === 'deleteSerperApiKeyEntry') return deleteSerperApiKeyEntry(data.id);
  if (action === 'testSerperApiKey') return testSerperApiKey();
  if (action === 'runSmallSearchJob') return runSmallSearchJob(data);
  if (action === 'advanceSearchJob') return advanceSearchJob(data.jobId || data.job_id || data.id, data.options || data);
  if (action === 'addSearchResultToLead') return addSearchResultToLead(data.resultId || data.result_id || data.id, data.options || data);
  if (action === 'reviewSearchResults') return reviewSearchResults(data);
  if (action === 'sendLeadEmail') return sendLeadEmail(data.leadId || data.lead_id, data.templateId || data.template_id, data.options || {});
  if (action === 'listLeadSendHistories') return listLeadSendHistories(data.leadId || data.lead_id, data.options || data);
  if (action === 'sendTestEmail') return sendTestEmail(data.templateId || data.template_id, data.toEmail || data.to_email, data.sampleLead || data.sample_lead || {});
  if (action === 'checkRepliesForLeads') return checkRepliesForLeads(data);
  if (action === 'listReplyFalsePositiveCandidates') return listReplyFalsePositiveCandidates(data);
  if (action === 'restoreReplyFalsePositiveCandidates') return restoreReplyFalsePositiveCandidates(data);
  if (action === 'createCalendarEventForLead') return createCalendarEventForLead(data.leadId || data.lead_id, data.event || data.options || data);
  if (action === 'importLeadsFromCsv') return importLeadsFromCsv(data.csvText || data.csv_text || data.text, data.options || {});
  if (action === 'advanceQueuedJobs') return advanceQueuedJobs(data);
  if (action === 'installDefaultTriggers') return installDefaultTriggers();
  if (action === 'createSpreadsheetBackup') return createSpreadsheetBackup();
  if (action === 'setSettingValue') return setSettingValue(data.key, data.value, data.valueType || data.value_type, data.description);
  if (action === 'setMailSendingControl') return setMailSendingControl(data);
  if (action === 'listCustomFieldDefinitions') return listCustomFieldDefinitions(data);
  if (action === 'saveCustomFieldDefinition') return saveCustomFieldDefinition(data);
  if (action === 'updateCustomFieldDefinition') return updateCustomFieldDefinition(data.id, data.patch || data);
  if (action === 'getListViewSetting') return getListViewSetting(data.genreId || data.genre_id);
  if (action === 'listListViewSettings') return listListViewSettings(data);
  if (action === 'saveListViewSettings') return saveListViewSettings(data);
  if (action === 'prepareLeadMigration') return prepareLeadMigration(data);
  if (action === 'writeLeadMigrationRows') return writeLeadMigrationRows(data);
  if (action === 'finalizeLeadMigration') return finalizeLeadMigration(data);

  throw new Error('Unknown action: ' + action);
}

function jsonResponse_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

const GMAIL_INTEGRATION_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/script.send_mail',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/calendar',
]);

function getInitialData() {
  const appInfo = getAppInfo();
  return {
    app: appInfo,
    enums: getClientEnums_(),
    dashboard: getStartupDashboardStats_(),
    genres: [],
    genreMasters: [],
    reasons: [],
    settings: [],
    customFieldDefinitions: [],
    listViewSettings: [],
    schemaStatus: null,
    serper: getStartupSerperInfo_(),
  };
}

function getStartupDashboardStats_() {
  return readDashboardStatsCache_({ allowPersisted: true, allowStale: true }) || buildStartupDashboardPlaceholder_();
}

function getReferenceData() {
  return {
    genres: listSheetRecords('genres', { limit: 200 }).items,
    genreMasters: listGenres({ limit: 500, includeInactive: true }).items,
    reasons: listReasons({ limit: 500, includeInactive: true }).items,
    settings: listSheetRecords('settings', { limit: 200, includeInactive: true }).items,
    customFieldDefinitions: listCustomFieldDefinitions({ includeInactive: true }).items,
    listViewSettings: listListViewSettings({}).items,
    schemaStatus: getSchemaStatus(),
    serper: getSerperApiKeyInfo(),
  };
}

function getAuthorizationStatus() {
  try {
    const info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    const status = String(info.getAuthorizationStatus());
    return {
      required: isAuthorizationRequiredStatus_(status),
      status: status,
      authorizationUrl: info.getAuthorizationUrl() || '',
    };
  } catch (error) {
    return {
      required: false,
      status: 'UNKNOWN',
      authorizationUrl: '',
      error: error.message,
    };
  }
}

function getGmailAuthorizationStatus() {
  return getAuthorizationStatusForScopes_('gmail', GMAIL_INTEGRATION_SCOPES);
}

function isAuthorizationRequiredStatus_(status) {
  return String(status) === 'REQUIRED';
}

function getAuthorizationStatusForScopes_(key, scopes) {
  try {
    const info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL, scopes);
    const status = String(info.getAuthorizationStatus());
    return {
      key: key,
      required: isAuthorizationRequiredStatus_(status),
      status: status,
      authorizationUrl: info.getAuthorizationUrl() || '',
      scopes: scopes.slice(),
      checkedAt: nowIso_(),
    };
  } catch (error) {
    return {
      key: key,
      required: true,
      status: 'UNKNOWN',
      authorizationUrl: '',
      scopes: scopes.slice(),
      checkedAt: nowIso_(),
      error: error.message || String(error),
    };
  }
}

function checkGmailIntegration() {
  const authorization = getGmailAuthorizationStatus();
  if (authorization.required) {
    return {
      ok: false,
      authorization: authorization,
      mailSendAvailable: false,
      gmailReadable: false,
      checkedAt: nowIso_(),
      error: 'Gmail / MailApp / Calendar の追加承認が必要です。',
    };
  }

  try {
    const remaining = MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : 0;
    const threads = GmailApp.search('in:anywhere newer_than:7d', 0, 1);
    return {
      ok: true,
      authorization: authorization,
      mailSendAvailable: remaining > 0,
      mailQuotaRemaining: Math.max(0, Number(remaining) || 0),
      gmailReadable: true,
      sampleThreadCount: threads.length,
      checkedAt: nowIso_(),
    };
  } catch (error) {
    return {
      ok: false,
      authorization: getGmailAuthorizationStatus(),
      mailSendAvailable: false,
      gmailReadable: false,
      checkedAt: nowIso_(),
      error: error.message || String(error),
    };
  }
}

function getClientEnums_() {
  return {
    leadStatuses: LEAD_STATUSES,
    preSendManualStatuses: PRE_SEND_MANUAL_STATUS_OPTIONS,
    postSendManualStatuses: POST_SEND_MANUAL_STATUS_OPTIONS,
    sendExcludedStatuses: SEND_EXCLUDED_STATUSES,
    dealStatuses: ['未設定'].concat(DEAL_STATUSES),
    formStatuses: FORM_STATUSES,
    templateTypes: ['initial', 'followup_2m', 'form'],
    sendTypes: ['初回メール', '2ヶ月後メール', 'テスト送信'],
    sendResults: ['成功', '失敗'],
    jobStatuses: ['queued', 'running', 'paused', 'completed', 'failed'],
  };
}

function getDashboardStats(options) {
  const input = options && typeof options === 'object' ? options : {};
  if (input.bypassCache !== true) {
    const cached = readDashboardStatsCache_({ allowPersisted: true, allowStale: input.allowStale === true });
    if (cached) {
      return cached;
    }
  }

  const leads = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'leads'));
  const templates = listSheetRecords('email_templates', { limit: 1000 }).items;
  const searchJobs = listSheetRecords('search_jobs', { limit: 1000, includeInactive: true }).items;
  const syncLogs = listSheetRecords('sync_logs', { limit: 1000, includeInactive: true }).items;
  const today = todayText_();
  const month = today.slice(0, 7);
  const sentToday = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories')).filter(function (record) {
    return String(record.sent_at || record.created_at || '').slice(0, 10) === today && record.send_result === '成功';
  }).length;
  const sentMonth = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories')).filter(function (record) {
    return String(record.sent_at || record.created_at || '').slice(0, 7) === month && record.send_result === '成功';
  }).length;
  const serperToday = getSerperUsageCount_({ day: today });
  const serperMonth = getSerperUsageCount_({ month: month });
  const masterContext = buildMasterBlockContext_();
  const listStats = buildLeadListStats_(leads, masterContext, '');
  const sendWindow = buildSendWindowStatus_();
  const dailyMailLimit = Number(getSettingValue_('gmail_daily_send_limit', 80));
  const serperDailyLimit = Number(getSettingValue_('serper_daily_search_limit', 100));
  const serperMonthlyLimit = Number(getSettingValue_('serper_monthly_search_limit', 1000));
  const mailQuota = getMailQuotaStatus_(dailyMailLimit);
  const mailSendingControl = getMailSendingControl_();
  const todayRemaining = Math.max(0, Math.min(dailyMailLimit - sentToday, mailQuota.remaining));
  const todayEmailTargets = mailSendingControl.enabled ? Math.min(listStats.sendable, todayRemaining) : 0;
  const serperInfo = getSerperApiKeyInfo();
  const triggerCount = getProjectTriggerCount_();
  const activeSearchJobs = searchJobs.filter(function (job) {
    return job.status === 'queued' || job.status === 'running';
  });
  const failedSearchJobs = searchJobs.filter(function (job) {
    return job.status === 'failed';
  });
  const monthLeads = leads.filter(function (lead) {
    return !isArchivedLead_(lead) && String(lead.created_at || '').slice(0, 7) === month;
  });
  const thisMonth = {
    addedLeads: monthLeads.length,
    sent: sentMonth,
    replies: leads.filter(function (lead) {
      return normalizeBooleanLike_(lead.reply_checked) && String(lead.updated_at || lead.created_at || '').slice(0, 7) === month;
    }).length,
    deals: leads.filter(function (lead) {
      return String(lead.deal_status || '未設定') !== '未設定' && String(lead.updated_at || lead.created_at || '').slice(0, 7) === month;
    }).length,
  };
  thisMonth.replyRate = sentMonth > 0 ? Math.round((thisMonth.replies / sentMonth) * 1000) / 10 : 0;
  const byStatus = {};
  const byGenre = {};

  leads.forEach(function (lead) {
    const status = lead.status || '未設定';
    const genre = lead.genre || '未設定';
    byStatus[status] = (byStatus[status] || 0) + 1;
    byGenre[genre] = (byGenre[genre] || 0) + 1;
  });

  const stats = {
    leadsTotal: leads.filter(function (lead) { return !isArchivedLead_(lead); }).length,
    archivedLeads: leads.filter(isArchivedLead_).length,
    sendTargets: listStats.sendable,
    formTargets: listStats.formTargets,
    replies: listStats.replies,
    deals: listStats.deals,
    sendNg: listStats.sendNg,
    sent: listStats.sent,
    unsent: listStats.unsent,
    noContact: listStats.noContact,
    won: listStats.won,
    lost: listStats.lost,
    reviewTargets: listStats.reviewPending,
    sentToday: sentToday,
    serperToday: serperToday,
    serperMonth: serperMonth,
    productionTemplates: templates.filter(function (template) { return normalizeBooleanLike_(template.is_production); }).length,
    productionInitialTemplates: templates.filter(function (template) { return template.template_type === 'initial' && normalizeBooleanLike_(template.is_production); }).length,
    productionFormTemplates: templates.filter(function (template) { return template.template_type === 'form' && normalizeBooleanLike_(template.is_production); }).length,
    dailyMailLimit: dailyMailLimit,
    todayRemaining: todayRemaining,
    todayEmailTargets: todayEmailTargets,
    mailQuotaRemaining: mailQuota.remaining,
    mailQuotaAvailable: mailQuota.available,
    mailSendingEnabled: mailSendingControl.enabled,
    mailSendingReason: mailSendingControl.reason,
    mailSendingUpdatedAt: mailSendingControl.updatedAt,
    sendWindow: sendWindow,
    serperConfigured: serperInfo.configured,
    serperKeyMask: serperInfo.key_mask,
    serperDailyLimit: serperDailyLimit,
    serperMonthlyLimit: serperMonthlyLimit,
    serperTodayRemaining: Math.max(0, serperDailyLimit - serperToday),
    serperMonthRemaining: Math.max(0, serperMonthlyLimit - serperMonth),
    queuedJobs: searchJobs.filter(function (job) { return job.status === 'queued'; }).length,
    runningJobs: searchJobs.filter(function (job) { return job.status === 'running'; }).length,
    failedJobs: failedSearchJobs.length,
    completedJobs: searchJobs.filter(function (job) { return job.status === 'completed'; }).length,
    errorCount: syncLogs.filter(function (log) { return log.level === 'error' || log.level === 'warn'; }).length,
    prospectingAddedCount: sumNumericFields_(syncLogs, ['added_count', 'added']),
    prospectingDuplicateCount: sumNumericFields_(syncLogs, ['duplicate_skip_count', 'skipped']),
    prospectingExcludedCount: sumNumericFields_(syncLogs, ['excluded_count', 'protected_skip_count']),
    prospectingLabel: activeSearchJobs.length ? '実行中' : '待機中',
    prospectingTone: failedSearchJobs.length ? 'bad' : activeSearchJobs.length ? 'info' : 'ok',
    prospectingReason: activeSearchJobs.length ? '営業リスト収集ジョブを処理中です' : '現在は待機中です。必要に応じて収集ツールから実行できます。',
    prospectingDetail: 'GAS版では search_jobs / sync_logs から直近成果を集計します。',
    integrations: {
      sheets: true,
      gmail: mailQuota.available,
      calendar: true,
      serper: serperInfo.configured,
      triggers: triggerCount > 0,
    },
    triggerCount: triggerCount,
    thisMonth: thisMonth,
    byStatus: byStatus,
    byGenre: byGenre,
    updatedAt: nowIso_(),
    cached: false,
  };

  writeDashboardStatsCache_(stats);
  return stats;
}

function buildStartupDashboardPlaceholder_() {
  const month = monthText_();
  const mailSendingControl = {
    enabled: false,
    reason: '初回表示中です。詳細な送信設定は背景で確認しています。',
    updatedAt: null,
  };
  const dailyMailLimit = 80;
  const serperDailyLimit = 100;
  const serperMonthlyLimit = 1000;
  const serperInfo = getStartupSerperInfo_();
  const timezone = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const currentTime = Utilities.formatDate(new Date(), timezone, 'HH:mm');
  const sendWindow = {
    enabled: true,
    start: '07:00',
    end: '08:00',
    timezone: timezone,
    currentTime: currentTime,
    label: '07:00-08:00',
    allowed: currentTime >= '07:00' && currentTime <= '08:00',
  };
  const triggerCount = 0;
  return {
    leadsTotal: 0,
    archivedLeads: 0,
    sendTargets: 0,
    formTargets: 0,
    replies: 0,
    deals: 0,
    sendNg: 0,
    sent: 0,
    unsent: 0,
    noContact: 0,
    won: 0,
    lost: 0,
    reviewTargets: 0,
    sentToday: 0,
    serperToday: 0,
    serperMonth: 0,
    productionTemplates: 0,
    productionInitialTemplates: 0,
    productionFormTemplates: 0,
    dailyMailLimit: dailyMailLimit,
    todayRemaining: mailSendingControl.enabled ? dailyMailLimit : 0,
    todayEmailTargets: 0,
    mailQuotaRemaining: dailyMailLimit,
    mailQuotaAvailable: true,
    mailSendingEnabled: mailSendingControl.enabled,
    mailSendingReason: mailSendingControl.reason,
    mailSendingUpdatedAt: mailSendingControl.updatedAt,
    sendWindow: sendWindow,
    serperConfigured: serperInfo.configured,
    serperKeyMask: serperInfo.key_mask,
    serperDailyLimit: serperDailyLimit,
    serperMonthlyLimit: serperMonthlyLimit,
    serperTodayRemaining: serperDailyLimit,
    serperMonthRemaining: serperMonthlyLimit,
    queuedJobs: 0,
    runningJobs: 0,
    failedJobs: 0,
    completedJobs: 0,
    errorCount: 0,
    prospectingAddedCount: 0,
    prospectingDuplicateCount: 0,
    prospectingExcludedCount: 0,
    prospectingLabel: '確認中',
    prospectingTone: 'info',
    prospectingReason: '初回表示を優先し、詳細な集計は背景で更新しています。',
    prospectingDetail: '確認待ちリストを先に表示し、重い集計は後から反映します。',
    integrations: {
      sheets: true,
      gmail: true,
      calendar: true,
      serper: serperInfo.configured,
      triggers: triggerCount > 0,
    },
    triggerCount: triggerCount,
    thisMonth: {
      label: month,
      addedLeads: 0,
      sent: 0,
      replies: 0,
      deals: 0,
      replyRate: 0,
    },
    byStatus: {},
    byGenre: {},
    updatedAt: nowIso_(),
    cached: false,
    startupPlaceholder: true,
  };
}

function getStartupSerperInfo_() {
  const records = readSerperApiKeyRecords_();
  const selected = selectPrimarySerperApiKeyRecord_(records);
  const legacyKey = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
  const key = selected && selected.key ? String(selected.key || '').trim() : legacyKey;
  return {
    configured: Boolean(key),
    key_mask: key ? maskSecret_(key) : '',
    dailyLimit: 100,
    monthlyLimit: 1000,
    todayUsed: 0,
    monthUsed: 0,
    todayRemaining: 100,
    monthRemaining: 1000,
    keys: records.map(sanitizeSerperApiKeyRecord_),
    activeKeyId: selected ? selected.id : (legacyKey ? 'legacy-main' : ''),
    startupPlaceholder: true,
  };
}

function getMailSendingControl_() {
  const defaultControl = {
    enabled: false,
    reason: '初期状態では安全のためメール送信を停止しています。',
    updatedAt: null,
  };
  const source = getSettingValue_('mail_sending_control', defaultControl);
  const control = source && typeof source === 'object' ? source : defaultControl;
  const enabled = control.enabled === true;

  return {
    enabled: enabled,
    reason: enabled ? null : String(control.reason || defaultControl.reason),
    updatedAt: control.updatedAt || control.updated_at || null,
  };
}

function setMailSendingControl(input) {
  const source = input && typeof input === 'object' ? input : {};
  if (typeof source.enabled !== 'boolean') {
    throw new Error('enabled is required.');
  }

  const control = {
    enabled: source.enabled,
    reason: source.enabled ? null : String(source.reason || 'テンプレートや営業リストの準備中のため停止').trim(),
    updatedAt: nowIso_(),
  };
  setSettingValue('mail_sending_control', control, 'json', 'Automatic mail sending control ported from the existing app.');
  return control;
}

function sumNumericFields_(records, fields) {
  return (records || []).reduce(function (sum, record) {
    return sum + fields.reduce(function (innerSum, field) {
      const value = Number(record[field] || 0);
      return innerSum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, 0);
}

function todayText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd');
}

function monthText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM');
}

function readDashboardStatsCache_(options) {
  const query = options && typeof options === 'object' ? options : {};
  try {
    const cached = CacheService.getScriptCache().get('dashboard_stats_v3');
    if (!cached) {
      return query.allowPersisted === false ? null : readDashboardStatsSheetCache_(query);
    }

    const parsed = JSON.parse(cached);
    parsed.cached = true;
    return parsed;
  } catch (error) {
    console.warn('Dashboard cache read skipped: ' + error.message);
    return query.allowPersisted === false ? null : readDashboardStatsSheetCache_(query);
  }
}

function writeDashboardStatsCache_(stats) {
  try {
    CacheService.getScriptCache().put('dashboard_stats_v3', JSON.stringify(stats), 600);
    upsertDashboardCacheSheet_(stats);
  } catch (error) {
    console.warn('Dashboard cache write skipped: ' + error.message);
  }
}

function readDashboardStatsSheetCache_(options) {
  try {
    const query = options && typeof options === 'object' ? options : {};
    const records = listSheetRecords('dashboard_cache', { limit: 100, includeInactive: true }).items;
    const cached = records.find(function (record) {
      return record.cache_key === 'dashboard_stats_v3';
    });
    if (!cached || !cached.value_json) {
      return null;
    }
    if (query.allowStale !== true && cached.expires_at) {
      const expiresAt = new Date(cached.expires_at).getTime();
      if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
        return null;
      }
    }
    const parsed = JSON.parse(cached.value_json);
    parsed.cached = true;
    parsed.persistedCache = true;
    return parsed;
  } catch (error) {
    console.warn('Dashboard cache sheet read skipped: ' + error.message);
    return null;
  }
}

function upsertDashboardCacheSheet_(stats) {
  const records = listSheetRecords('dashboard_cache', { limit: 100, includeInactive: true }).items;
  const existing = records.find(function (record) {
    return record.cache_key === 'dashboard_stats_v3';
  });
  const expiresAt = Utilities.formatDate(new Date(Date.now() + 30 * 60 * 1000), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const payload = {
    cache_key: 'dashboard_stats_v3',
    value_json: JSON.stringify(stats),
    expires_at: expiresAt,
  };

  if (existing) {
    updateSheetRecord_('dashboard_cache', existing.id, payload);
  } else {
    appendSheetRecord_('dashboard_cache', payload);
  }
}

function buildSendWindowStatus_() {
  const setting = getSettingValue_('email_send_window', {
    enabled: true,
    start: '07:00',
    end: '08:00',
    timezone: 'Asia/Tokyo',
  });
  const enabled = setting.enabled !== false;
  const timezone = setting.timezone || Session.getScriptTimeZone() || 'Asia/Tokyo';
  const start = setting.start || '07:00';
  const end = setting.end || '08:00';
  const now = Utilities.formatDate(new Date(), timezone, 'HH:mm');
  return {
    enabled: enabled,
    start: start,
    end: end,
    timezone: timezone,
    currentTime: now,
    label: start + '-' + end,
    allowed: enabled && now >= start && now <= end,
  };
}

function getMailQuotaStatus_(dailyLimit) {
  try {
    const remaining = MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : dailyLimit;
    return {
      available: remaining > 0,
      remaining: Math.max(0, Number(remaining) || 0),
    };
  } catch (error) {
    return {
      available: false,
      remaining: dailyLimit,
      error: error.message,
    };
  }
}

function getProjectTriggerCount_() {
  try {
    return ScriptApp.getProjectTriggers().length;
  } catch (error) {
    return 0;
  }
}
