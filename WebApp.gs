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
  if (action === 'getLead') return getLead(data.id || data.leadId || data.lead_id || data);
  if (action === 'listEmailSendCandidates') return listEmailSendCandidates(data);
  if (action === 'createLead') return createLead(data);
  if (action === 'updateLead') return updateLead(data.id, data.patch || data);
  if (action === 'updateReviewLeadDecision') return updateReviewLeadDecision(data.id || data.leadId || data.lead_id, data.options || data.decision || data);
  if (action === 'deleteLead') return deleteLead(data.id, data.options || {});
  if (action === 'listLeadDuplicateCandidates') return listLeadDuplicateCandidates(data.leadId || data.lead_id || data.id, data.options || data);
  if (action === 'markLeadFormSent') return markLeadFormSent(data.leadId || data.lead_id || data.id, data.options || data);
  if (action === 'unmarkLeadFormSent') return unmarkLeadFormSent(data.leadId || data.lead_id || data.id);
  if (action === 'listSheetRecords') return listSheetRecords(data.sheetName || data.sheet_name, data.options || data);
  if (action === 'getSendHistoryDetail') return getSendHistoryDetail(data.id || data.historyId || data.history_id || data);
  if (action === 'listEmailTemplates') return listEmailTemplates(data);
  if (action === 'saveEmailTemplate') return saveEmailTemplate(data);
  if (action === 'importEmailTemplates') return importEmailTemplates(data);
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
  if (action === 'getSearxngConfig') return getSearxngConfig();
  if (action === 'saveSearxngConfig') return saveSearxngConfig(data);
  if (action === 'testSearxngConnection') return testSearxngConnection();
  if (action === 'runSmallSearchJob') return runSmallSearchJob(data);
  if (action === 'advanceSearchJob') return advanceSearchJob(data.jobId || data.job_id || data.id, data.options || data);
  if (action === 'addSearchResultToLead') return addSearchResultToLead(data.resultId || data.result_id || data.id, data.options || data);
  if (action === 'reviewSearchResults') return reviewSearchResults(data);
  if (action === 'sendLeadEmail') return sendLeadEmail(data.leadId || data.lead_id, data.templateId || data.template_id, data.options || {});
  if (action === 'sendLeadEmailBatch') return sendLeadEmailBatch(data.leadIds || data.lead_ids || [], data.templateId || data.template_id, data.options || {});
  if (action === 'listLeadSendHistories') return listLeadSendHistories(data.leadId || data.lead_id, data.options || data);
  if (action === 'importSendHistories') return importSendHistories(data);
  if (action === 'sendTestEmail') return sendTestEmail(data.templateId || data.template_id, data.toEmail || data.to_email, data.sampleLead || data.sample_lead || {});
  if (action === 'checkRepliesForLeads') return checkRepliesForLeads(data);
  if (action === 'listReplyFalsePositiveCandidates') return listReplyFalsePositiveCandidates(data);
  if (action === 'restoreReplyFalsePositiveCandidates') return restoreReplyFalsePositiveCandidates(data);
  if (action === 'createCalendarEventForLead') return createCalendarEventForLead(data.leadId || data.lead_id, data.event || data.options || data);
  if (action === 'importLeadsFromCsv') return importLeadsFromCsv(data.csvText || data.csv_text || data.text, data.options || data);
  if (action === 'startLeadCsvImport') return startLeadCsvImport(data.csvText || data.csv_text || data.text, data.options || data);
  if (action === 'advanceLeadCsvImportJob') return advanceLeadCsvImportJob(data.jobId || data.job_id || data.id, data.options || data);
  if (action === 'advanceQueuedJobs') return advanceQueuedJobs(data);
  if (action === 'getBackgroundWorkerHealth') return getBackgroundWorkerHealth();
  if (action === 'getStorageHealth') return getStorageHealth(data);
  if (action === 'listSourcePageSiteStatuses') return listSourcePageSiteStatuses(data);
  if (action === 'repairBackgroundJobs') return repairBackgroundJobs(data);
  if (action === 'repairNapCampGenres') return repairNapCampGenres(data);
  if (action === 'repairReviewLeadsWithoutContact') return repairReviewLeadsWithoutContact(data);
  if (action === 'repairNonAdvertiserReviewLeads') return repairNonAdvertiserReviewLeads(data);
  if (action === 'repairNonAdvertiserCleanupOverreach') return repairNonAdvertiserCleanupOverreach(data);
  if (action === 'installDefaultTriggers') return installDefaultTriggers();
  if (action === 'createSpreadsheetBackup') return createSpreadsheetBackup();
  if (action === 'setSettingValue') return setSettingValue(data.key, data.value, data.valueType || data.value_type, data.description);
  if (action === 'setGmailSenderEmail') return setGmailSenderEmail(data.email || data.senderEmail || data.sender_email);
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
  const serperInfo = getStartupSerperInfo_();
  return {
    app: appInfo,
    enums: getClientEnums_(),
    dashboard: mergeStartupSerperIntoDashboard_(getStartupDashboardStats_(serperInfo), serperInfo),
    genres: [],
    genreMasters: [],
    reasons: [],
    settings: [],
    customFieldDefinitions: [],
    listViewSettings: [],
    schemaStatus: null,
    serper: serperInfo,
    collectionQualityMigration: getLeadCollectionQualityMigrationV215Status_(),
  };
}

function mergeStartupSerperIntoDashboard_(dashboard, serperInfo) {
  const source = dashboard && typeof dashboard === 'object' ? dashboard : {};
  const serper = serperInfo && typeof serperInfo === 'object' ? serperInfo : {};
  return Object.assign({}, source, {
    serperConfigured: serper.configured === true,
    searchConfigured: serper.searchConfigured === true,
    searxngConfigured: Boolean(serper.searxng && serper.searxng.configured === true),
    searxngEnabled: Boolean(serper.searxng && serper.searxng.enabled !== false),
    searxngStatus: String(serper.searxng && serper.searxng.lastStatus || ''),
    serperKeyMask: String(serper.key_mask || ''),
    serperUnlimited: true,
    serperCreditRemaining: String(serper.creditRemaining || ''),
    serperCreditRemainingValue: serper.creditRemainingValue === '' || serper.creditRemainingValue === undefined ? '' : Number(serper.creditRemainingValue),
    serperCreditTotal: serper.creditTotal === '' || serper.creditTotal === undefined ? '' : Number(serper.creditTotal),
    serperCreditPercent: serper.creditPercent === '' || serper.creditPercent === undefined ? '' : Number(serper.creditPercent),
    serperCreditPercentKnown: serper.creditPercentKnown === true,
    serperCreditLow: serper.creditLow === true,
    serperCreditAlertThresholdPercent: SERPER_LOW_CREDIT_THRESHOLD_PERCENT,
    integrations: Object.assign({}, source.integrations || {}, {
      serper: serper.configured === true,
    }),
  });
}

function getStartupDashboardStats_(serperInfo) {
  return readDashboardStatsCache_({ allowPersisted: true, allowStale: true }) || buildStartupDashboardPlaceholder_(serperInfo);
}

function getReferenceData(options) {
  const input = options && typeof options === 'object' ? options : {};
  if (input.bypassCache !== true) {
    const cached = readReferenceDataCache_();
    if (cached) return cached;
  }

  const genreMasters = readAllSheetRecordsByName_('genres', { includeInactive: true }).map(normalizeGenreRecord_);
  const settings = readAllSheetRecordsByName_('settings', { includeInactive: true });
  const reference = {
    genres: genreMasters.filter(function (genre) { return genre.active !== false; }),
    genreMasters: genreMasters,
    reasons: readAllSheetRecordsByName_('reasons', { includeInactive: true }).map(normalizeReasonRecord_),
    settings: settings,
    customFieldDefinitions: listCustomFieldDefinitions({ includeInactive: true }).items,
    listViewSettings: listListViewSettings({}).items,
    schemaStatus: getSchemaStatus({ settingsRecords: settings }),
    serper: getSerperApiKeyInfo(),
  };
  writeReferenceDataCache_(reference);
  return reference;
}

function referenceDataCacheKey_() {
  return 'reference_data_' + String(APP_VERSION || 'v1');
}

function readReferenceDataCache_() {
  try {
    const cached = CacheService.getScriptCache().get(referenceDataCacheKey_());
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Reference data cache read skipped: ' + error.message);
    return null;
  }
}

function writeReferenceDataCache_(reference) {
  try {
    CacheService.getScriptCache().put(referenceDataCacheKey_(), JSON.stringify(reference), 600);
  } catch (error) {
    console.warn('Reference data cache write skipped: ' + error.message);
  }
}

function clearReferenceDataCache_() {
  try {
    CacheService.getScriptCache().remove(referenceDataCacheKey_());
  } catch (error) {
    console.warn('Reference data cache clear skipped: ' + error.message);
  }
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
    const sender = getGmailSenderIdentityStatus_();
    return {
      ok: true,
      authorization: authorization,
      mailSendAvailable: remaining > 0,
      mailQuotaRemaining: Math.max(0, Number(remaining) || 0),
      gmailReadable: true,
      sampleThreadCount: threads.length,
      senderName: sender.senderName,
      configuredSenderEmail: sender.configuredEmail,
      selectedSenderEmail: sender.selectedEmail,
      primarySenderEmail: sender.primaryEmail,
      sendAsAliases: sender.aliases,
      availableSenderEmails: sender.availableEmails,
      senderEmailAvailable: sender.available,
      senderDiagnosticError: sender.diagnosticError,
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
    const cached = readDashboardStatsCache_({
      allowPersisted: true,
      allowStale: input.allowStale === true || input.cacheOnly === true,
    });
    if (cached) {
      if (input.cacheOnly === true) {
        cached.cacheRefreshPending = getDashboardCacheRefreshState_().due;
      }
      return cached;
    }
  }

  if (input.cacheOnly === true) {
    const placeholder = buildStartupDashboardPlaceholder_();
    placeholder.cacheRefreshPending = true;
    return placeholder;
  }

  const leads = readSheetRecordFields_('leads', dashboardLeadFields_(), { maxGapColumns: 2 });
  const templates = readAllSheetRecordsByName_('email_templates');
  const searchJobs = readSheetRecordFields_('search_jobs', ['status']);
  const syncLogs = readSheetRecordFields_('sync_logs', [
    'level',
    'added_count',
    'added',
    'duplicate_skip_count',
    'skipped',
    'excluded_count',
    'protected_skip_count',
  ]);
  const searchUsageLogs = readSheetRecordFields_('search_usage_logs', ['created_at', 'credits', 'request_count']);
  const today = todayText_();
  const month = today.slice(0, 7);
  const sendHistories = readSheetRecordFields_('send_histories', dashboardSendHistoryFields_());
  const pendingSendReservations = buildPendingSendReservationStatus_(sendHistories);
  const sendTrackingMismatchCount = countLeadSendTrackingMismatches_(leads, sendHistories);
  const sentToday = countSuccessfulProductionSends_(sendHistories, today);
  const sentMonth = countSuccessfulProductionSends_(sendHistories, month);
  const serperToday = getSerperUsageCount_({ day: today }, searchUsageLogs);
  const serperMonth = getSerperUsageCount_({ month: month }, searchUsageLogs);
  const masterContext = buildMasterBlockContext_();
  const listStats = buildLeadListStats_(leads, masterContext, '');
  const sendWindow = buildSendWindowStatus_();
  const dailyMailLimit = Number(getSettingValue_('gmail_daily_send_limit', 80));
  const mailQuota = getMailQuotaStatus_(dailyMailLimit);
  const mailSendingControl = getMailSendingControl_();
  const todayRemaining = Math.max(0, Math.min(
    dailyMailLimit - sentToday - pendingSendReservations.count,
    mailQuota.remaining
  ));
  const todayEmailTargets = mailSendingControl.enabled ? Math.min(listStats.sendable, todayRemaining) : 0;
  const serperInfo = getSerperApiKeyInfo();
  const serperLimits = serperInfo.limits || {};
  const triggerCount = getProjectTriggerCount_();
  const automaticMailTriggerCount = getProjectTriggerHandlerCount_('runScheduledEmailBatch');
  const gasUsage = buildConsumerGasUsageStatus_({
    mailQuotaRemaining: mailQuota.remaining,
    sentToday: sentToday,
    pendingSendReservations: pendingSendReservations.count,
    stalePendingSendReservations: pendingSendReservations.staleCount,
    oldestPendingSendReservationAt: pendingSendReservations.oldestAt,
    sendTrackingMismatchCount: sendTrackingMismatchCount,
    appMailLimit: dailyMailLimit,
    triggerCount: triggerCount,
    urlFetchRecordedToday: serperToday,
    batchRuntimeBudgetMs: Number(getSettingValue_('batch_runtime_budget_ms', 300000)) || 300000,
  });
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
    pendingSendReservations: pendingSendReservations.count,
    stalePendingSendReservations: pendingSendReservations.staleCount,
    oldestPendingSendReservationAt: pendingSendReservations.oldestAt,
    sendTrackingMismatchCount: sendTrackingMismatchCount,
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
    serperUnlimited: true,
    serperCreditRemaining: String(serperLimits.actualRemaining || ''),
    serperCreditRemainingValue: serperLimits.remainingValue === '' || serperLimits.remainingValue === undefined ? '' : Number(serperLimits.remainingValue),
    serperCreditTotal: serperLimits.totalValue === '' || serperLimits.totalValue === undefined ? '' : Number(serperLimits.totalValue),
    serperCreditPercent: serperLimits.remainingPercent === '' || serperLimits.remainingPercent === undefined ? '' : Number(serperLimits.remainingPercent),
    serperCreditPercentKnown: serperLimits.percentKnown === true,
    serperCreditLow: serperLimits.lowCredit === true,
    serperCreditAlertThresholdPercent: Number(serperLimits.alertThresholdPercent || SERPER_LOW_CREDIT_THRESHOLD_PERCENT),
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
    prospectingReason: activeSearchJobs.length
      ? '営業リスト収集ジョブを処理中です'
      : '現在は待機中です。必要に応じて収集ツールから実行できます。',
    prospectingResumeAfter: '',
    prospectingResumeOffset: 0,
    prospectingDetail: 'GAS版では search_jobs / sync_logs から直近成果を集計します。',
    integrations: {
      sheets: true,
      gmail: mailQuota.available,
      calendar: true,
      serper: serperInfo.configured,
      triggers: triggerCount > 0,
    },
    triggerCount: triggerCount,
    automaticMailTriggerCount: automaticMailTriggerCount,
    automaticMailTriggerInstalled: automaticMailTriggerCount > 0,
    gasUsage: gasUsage,
    thisMonth: thisMonth,
    analytics: buildAnalyticsSnapshot_(leads, sendHistories, today, templates),
    byStatus: byStatus,
    byGenre: byGenre,
    updatedAt: nowIso_(),
    cached: false,
  };

  writeDashboardStatsCache_(stats);
  return stats;
}

function dashboardSendHistoryFields_() {
  return [
    'id',
    'lead_id',
    'sent_at',
    'send_type',
    'to_email',
    'genre',
    'template_id',
    'template_name',
    'send_result',
    'created_at',
  ];
}

function dashboardLeadFields_() {
  return [
    'id',
    'source',
    'genre',
    'company_name',
    'email',
    'website_url',
    'website_domain',
    'form_url',
    'status',
    'send_ng',
    'reply_checked',
    'form_status',
    'last_sent_at',
    'send_count',
    'deal_status',
    'created_at',
    'updated_at',
    'archived_at',
  ];
}

function buildAnalyticsSnapshot_(leadRecords, historyRecords, todayKey, templateRecords) {
  const leads = (Array.isArray(leadRecords) ? leadRecords : []).filter(function (lead) {
    return !isArchivedLead_(lead) && String(lead.status || '') !== 'アーカイブ';
  });
  const histories = Array.isArray(historyRecords) ? historyRecords : [];
  const templateById = {};
  const templateByName = {};
  (Array.isArray(templateRecords) ? templateRecords : []).forEach(function (template) {
    const templateId = String(template.id || '').trim();
    const templateName = String(template.name || '').trim();
    if (templateId) templateById[templateId] = template;
    if (templateName && !templateByName[templateName]) templateByName[templateName] = template;
  });
  const productionSends = histories.filter(isSuccessfulProductionSendHistory_).map(function (history) {
    const templateId = String(history.template_id || '').trim();
    const templateName = String(history.template_name || '').trim();
    const template = (templateId && templateById[templateId]) || (templateName && templateByName[templateName]) || {};
    return Object.assign({}, history, {
      subject: history.subject || template.subject || '',
      body: history.body || template.body || '',
    });
  });
  const productionAttempts = histories.filter(function (history) {
    return String(history.send_type || '').indexOf('テスト') === -1 && String(history.send_result || '') !== '送信中';
  });
  const leadById = {};
  const leadByEmail = {};
  leads.forEach(function (lead) {
    if (lead.id) leadById[String(lead.id)] = lead;
    const email = String(lead.email || '').trim().toLowerCase();
    if (email && !leadByEmail[email]) leadByEmail[email] = lead;
  });

  const dayKeys = recentAnalyticsDayKeys_(todayKey, 30);
  const monthKeys = recentAnalyticsMonthKeys_(todayKey, 6);
  const dayRowsByKey = {};
  dayKeys.forEach(function (key) {
    dayRowsByKey[key] = { key: key, label: key.slice(5).replace('-', '/'), addedLeads: 0, sent: 0 };
  });
  const monthRowsByKey = {};
  monthKeys.forEach(function (key) {
    monthRowsByKey[key] = {
      key: key,
      label: analyticsMonthLabel_(key),
      addedLeads: 0,
      sent: 0,
      replies: 0,
      sendNg: 0,
      deals: 0,
      contracts: 0,
      lost: 0,
    };
  });

  const currentMonthKey = String(todayKey || todayText_()).slice(0, 7);
  const sourceRowsByKey = {};
  const genreRowsByKey = {};
  leads.forEach(function (lead) {
    const createdDay = String(lead.created_at || '').slice(0, 10);
    const createdMonth = createdDay.slice(0, 7);
    const updatedMonth = String(lead.updated_at || lead.created_at || '').slice(0, 7);
    if (dayRowsByKey[createdDay]) dayRowsByKey[createdDay].addedLeads += 1;
    if (monthRowsByKey[createdMonth]) monthRowsByKey[createdMonth].addedLeads += 1;
    if (monthRowsByKey[updatedMonth]) {
      if (hasAnalyticsReplySignal_(lead)) monthRowsByKey[updatedMonth].replies += 1;
      if (isAnalyticsSendNgLead_(lead)) monthRowsByKey[updatedMonth].sendNg += 1;
      if (hasAnalyticsDealProgress_(lead)) monthRowsByKey[updatedMonth].deals += 1;
      if (isAnalyticsContractLead_(lead)) monthRowsByKey[updatedMonth].contracts += 1;
      if (isAnalyticsLostLead_(lead)) monthRowsByKey[updatedMonth].lost += 1;
    }
    if (createdMonth === currentMonthKey) {
      const source = analyticsLeadSource_(lead);
      const sourceRow = sourceRowsByKey[source.key] || { sourceKey: source.key, label: source.label, addedLeads: 0 };
      sourceRow.addedLeads += 1;
      sourceRowsByKey[source.key] = sourceRow;
    }

    const genre = String(lead.genre || '未設定');
    const genreRow = genreRowsByKey[genre] || {
      genre: genre,
      leads: 0,
      sent: 0,
      replies: 0,
      sendNg: 0,
      deals: 0,
      contracts: 0,
      lost: 0,
    };
    genreRow.leads += 1;
    if (hasAnalyticsReplySignal_(lead)) genreRow.replies += 1;
    if (isAnalyticsSendNgLead_(lead)) genreRow.sendNg += 1;
    if (hasAnalyticsDealProgress_(lead)) genreRow.deals += 1;
    if (isAnalyticsContractLead_(lead)) genreRow.contracts += 1;
    if (isAnalyticsLostLead_(lead)) genreRow.lost += 1;
    genreRowsByKey[genre] = genreRow;
  });

  const latestTemplateByLead = {};
  productionSends.forEach(function (history) {
    const sentDay = String(history.sent_at || history.created_at || '').slice(0, 10);
    const sentMonth = sentDay.slice(0, 7);
    if (dayRowsByKey[sentDay]) dayRowsByKey[sentDay].sent += 1;
    if (monthRowsByKey[sentMonth]) monthRowsByKey[sentMonth].sent += 1;
    const lead = history.lead_id ? leadById[String(history.lead_id)] : null;
    const genre = String(history.genre || (lead && lead.genre) || '未設定');
    const genreRow = genreRowsByKey[genre] || {
      genre: genre,
      leads: 0,
      sent: 0,
      replies: 0,
      sendNg: 0,
      deals: 0,
      contracts: 0,
      lost: 0,
    };
    genreRow.sent += 1;
    genreRowsByKey[genre] = genreRow;

    const leadId = String(history.lead_id || '');
    if (leadId) {
      const sentAt = String(history.sent_at || history.created_at || '');
      const current = latestTemplateByLead[leadId];
      if (!current || sentAt >= current.sentAt) {
        latestTemplateByLead[leadId] = { key: analyticsTemplateKey_(history), sentAt: sentAt };
      }
    }
  });

  const templateRowsByKey = {};
  productionSends.forEach(function (history, index) {
    const key = analyticsTemplateKey_(history);
    const leadId = String(history.lead_id || '');
    const lead = leadId ? leadById[leadId] : null;
    const genre = String(history.genre || (lead && lead.genre) || '未設定');
    const row = templateRowsByKey[key] || {
      templateId: history.template_id || '',
      templateName: history.template_name || 'テンプレート未記録',
      subject: compactAnalyticsText_(history.subject || '') || '-',
      bodyPreview: compactAnalyticsText_(history.body || '').slice(0, 120) || '-',
      genre: genre,
      sent: 0,
      replies: 0,
      sendNg: 0,
      deals: 0,
      contracts: 0,
      lost: 0,
      latestSentAt: history.sent_at || history.created_at || '',
      countedLeadKeys: {},
    };
    if (row.genre !== genre) row.genre = '複数ジャンル';
    if (String(history.sent_at || history.created_at || '') > String(row.latestSentAt || '')) {
      row.latestSentAt = history.sent_at || history.created_at || row.latestSentAt;
    }
    const leadKey = leadId || ('history:' + String(history.id || index));
    if (!row.countedLeadKeys[leadKey]) {
      row.countedLeadKeys[leadKey] = true;
      row.sent += 1;
      const attributed = leadId && latestTemplateByLead[leadId] && latestTemplateByLead[leadId].key === key;
      if (lead && attributed) {
        if (hasAnalyticsReplySignal_(lead)) row.replies += 1;
        if (isAnalyticsSendNgLead_(lead)) row.sendNg += 1;
        if (hasAnalyticsDealProgress_(lead)) row.deals += 1;
        if (isAnalyticsContractLead_(lead)) row.contracts += 1;
        if (isAnalyticsLostLead_(lead)) row.lost += 1;
      }
    }
    templateRowsByKey[key] = row;
  });

  const monthlyRows = monthKeys.map(function (key) {
    const row = monthRowsByKey[key];
    row.replyRate = analyticsRate_(row.replies, row.sent);
    row.dealRate = analyticsRate_(row.deals, row.replies);
    row.contractRate = analyticsRate_(row.contracts, row.deals);
    return row;
  });
  const currentMonth = Object.assign({}, monthRowsByKey[currentMonthKey] || {
    key: currentMonthKey,
    label: analyticsMonthLabel_(currentMonthKey),
    addedLeads: 0,
    sent: 0,
    replies: 0,
    sendNg: 0,
    deals: 0,
    contracts: 0,
    lost: 0,
  });
  currentMonth.replyRate = analyticsRate_(currentMonth.replies, currentMonth.sent);
  currentMonth.dealRate = analyticsRate_(currentMonth.deals, currentMonth.replies);
  currentMonth.contractRate = analyticsRate_(currentMonth.contracts, currentMonth.deals);

  const replies = leads.filter(hasAnalyticsReplySignal_).length;
  const deals = leads.filter(hasAnalyticsDealProgress_).length;
  const contracts = leads.filter(isAnalyticsContractLead_).length;
  const lost = leads.filter(isAnalyticsLostLead_).length;
  const sendNg = leads.filter(isAnalyticsSendNgLead_).length;
  const sendSuccesses = productionSends.length;
  const sendTotal = productionAttempts.length;
  const sentRecipientKeys = {};
  productionSends.forEach(function (history, index) {
    const historyEmail = String(history.to_email || '').trim().toLowerCase();
    const matchedLead = history.lead_id ? leadById[String(history.lead_id)] : leadByEmail[historyEmail];
    const key = matchedLead && matchedLead.id
      ? 'lead:' + String(matchedLead.id)
      : historyEmail
        ? 'email:' + historyEmail
        : 'history:' + String(history.id || index);
    sentRecipientKeys[key] = true;
  });
  const repliedRecipientCount = Object.keys(sentRecipientKeys).filter(function (key) {
    if (key.indexOf('lead:') !== 0) return false;
    const lead = leadById[key.slice(5)];
    return lead && hasAnalyticsReplySignal_(lead);
  }).length;
  const sourceRows = Object.keys(sourceRowsByKey).map(function (key) {
    const row = sourceRowsByKey[key];
    return Object.assign({}, row, { share: analyticsRate_(row.addedLeads, currentMonth.addedLeads) });
  }).sort(function (left, right) { return right.addedLeads - left.addedLeads; });
  const genreRows = Object.keys(genreRowsByKey).map(function (key) {
    const row = genreRowsByKey[key];
    return Object.assign({}, row, {
      replyRate: analyticsRate_(row.replies, row.sent),
      dealRate: analyticsRate_(row.deals, row.replies),
      contractRate: analyticsRate_(row.contracts, row.deals),
    });
  }).sort(function (left, right) {
    return right.sent - left.sent || right.leads - left.leads;
  }).slice(0, 20);
  const templateRows = Object.keys(templateRowsByKey).map(function (key) {
    const row = templateRowsByKey[key];
    const result = Object.assign({}, row, { replyRate: analyticsRate_(row.replies, row.sent) });
    delete result.countedLeadKeys;
    return result;
  }).sort(function (left, right) {
    return right.sent - left.sent || right.replyRate - left.replyRate;
  }).slice(0, 20);

  return {
    generatedAt: nowIso_(),
    currentMonth: currentMonth,
    currentMonthLeadSourceRows: sourceRows,
    dailyRows: dayKeys.map(function (key) { return dayRowsByKey[key]; }),
    monthlyRows: monthlyRows,
    funnel: {
      leads: leads.length,
      sent: sendSuccesses,
      replies: replies,
      deals: deals,
      contracts: contracts,
      lost: lost,
      sendNg: sendNg,
      replyRate: analyticsRate_(replies, sendSuccesses),
      dealRateFromReplies: analyticsRate_(deals, replies),
      contractRateFromDeals: analyticsRate_(contracts, deals),
    },
    funnelSteps: [
      { icon: 'barChart3', label: '営業リスト', value: leads.length },
      { icon: 'send', label: '送信成功', value: sendSuccesses },
      { icon: 'reply', label: '返信・反応', value: replies, metric: formatAnalyticsPercent_(analyticsRate_(replies, sendSuccesses)) },
      { icon: 'calendarCheck', label: '商談', value: deals, metric: formatAnalyticsPercent_(analyticsRate_(deals, replies)) },
      { icon: 'checkCircle', label: '成約', value: contracts, metric: formatAnalyticsPercent_(analyticsRate_(contracts, deals)) },
    ],
    genreRows: genreRows,
    templateRows: templateRows,
    quality: {
      sendSuccesses: sendSuccesses,
      sendFailures: Math.max(0, sendTotal - sendSuccesses),
      sendTotal: sendTotal,
      sendSuccessRate: analyticsRate_(sendSuccesses, sendTotal),
      noReply: Math.max(0, Object.keys(sentRecipientKeys).length - repliedRecipientCount),
      lost: lost,
      sendNg: sendNg,
      sendNgRate: analyticsRate_(sendNg, leads.length),
    },
  };
}

function recentAnalyticsDayKeys_(todayKey, count) {
  const parts = String(todayKey || todayText_()).slice(0, 10).split('-').map(Number);
  const base = Date.UTC(parts[0], Math.max(0, parts[1] - 1), parts[2] || 1);
  const keys = [];
  for (let offset = Math.max(1, Number(count) || 1) - 1; offset >= 0; offset -= 1) {
    keys.push(new Date(base - offset * 86400000).toISOString().slice(0, 10));
  }
  return keys;
}

function recentAnalyticsMonthKeys_(todayKey, count) {
  const parts = String(todayKey || todayText_()).slice(0, 7).split('-').map(Number);
  const keys = [];
  for (let offset = Math.max(1, Number(count) || 1) - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(parts[0], Math.max(0, parts[1] - 1) - offset, 1));
    keys.push(date.toISOString().slice(0, 7));
  }
  return keys;
}

function analyticsMonthLabel_(key) {
  const parts = String(key || '').split('-');
  return parts.length === 2 ? String(Number(parts[0])) + '年' + String(Number(parts[1])) + '月' : String(key || '今月');
}

function analyticsRate_(numerator, denominator) {
  const bottom = Number(denominator || 0);
  return bottom > 0 ? Math.round((Number(numerator || 0) / bottom) * 1000) / 10 : 0;
}

function formatAnalyticsPercent_(value) {
  return String(Number(value || 0).toFixed(1)).replace(/\.0$/, '') + '%';
}

function compactAnalyticsText_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function analyticsTemplateKey_(history) {
  return String(history.template_id || '') || ((history.template_name || 'テンプレート未記録') + '::' + compactAnalyticsText_(history.subject || '').slice(0, 200));
}

function analyticsLeadSource_(lead) {
  const text = String(lead.source || lead.source_type || '').toLowerCase();
  if (/serper|search|prospect|source_page|collection/.test(text)) return { key: 'prospecting', label: '営業リスト収集' };
  if (/csv|sync|import/.test(text)) return { key: 'sync', label: 'CSV/同期' };
  if (/manual|手動/.test(text)) return { key: 'manual', label: '手動追加' };
  if (/form/.test(text)) return { key: 'form', label: 'フォーム営業' };
  return { key: 'unknown', label: '未設定' };
}

function hasAnalyticsReplySignal_(lead) {
  return normalizeBooleanLike_(lead.reply_checked) || String(lead.status || '') === '返信あり' || hasAnalyticsDealProgress_(lead);
}

function hasAnalyticsDealProgress_(lead) {
  return Boolean(lead.deal_status && String(lead.deal_status) !== '未設定') || ['商談予定', '商談済み', '受注', '失注'].indexOf(String(lead.status || '')) !== -1;
}

function isAnalyticsContractLead_(lead) {
  return String(lead.deal_status || '') === '受注' || String(lead.status || '') === '受注';
}

function isAnalyticsLostLead_(lead) {
  return String(lead.deal_status || '') === '失注' || String(lead.status || '') === '失注';
}

function isAnalyticsSendNgLead_(lead) {
  return normalizeBooleanLike_(lead.send_ng) || String(lead.status || '') === '送信NG';
}

function buildStartupDashboardPlaceholder_(startupSerperInfo) {
  const month = monthText_();
  const mailSendingControl = {
    enabled: false,
    reason: '初回表示中です。詳細な送信設定は背景で確認しています。',
    updatedAt: null,
  };
  const dailyMailLimit = 80;
  const serperInfo = startupSerperInfo && typeof startupSerperInfo === 'object'
    ? startupSerperInfo
    : getStartupSerperInfo_();
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
    pendingSendReservations: 0,
    stalePendingSendReservations: 0,
    oldestPendingSendReservationAt: '',
    sendTrackingMismatchCount: 0,
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
    serperUnlimited: true,
    serperCreditRemaining: String(serperInfo.creditRemaining || ''),
    serperCreditRemainingValue: serperInfo.creditRemainingValue,
    serperCreditTotal: serperInfo.creditTotal,
    serperCreditPercent: serperInfo.creditPercent,
    serperCreditPercentKnown: serperInfo.creditPercentKnown,
    serperCreditLow: serperInfo.creditLow,
    serperCreditAlertThresholdPercent: SERPER_LOW_CREDIT_THRESHOLD_PERCENT,
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
    automaticMailTriggerCount: 0,
    automaticMailTriggerInstalled: false,
    gasUsage: buildConsumerGasUsageStatus_({
      mailQuotaRemaining: 100,
      sentToday: 0,
      appMailLimit: dailyMailLimit,
      triggerCount: triggerCount,
      urlFetchRecordedToday: 0,
      batchRuntimeBudgetMs: 300000,
      startupPlaceholder: true,
    }),
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
  const records = harmonizeSerperCreditRecords_(readSerperApiKeyRecords_());
  const selected = selectPrimarySerperApiKeyRecord_(records);
  const legacyKey = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
  const key = selected && selected.key ? String(selected.key || '').trim() : legacyKey;
  const creditStatus = buildSerperCreditStatusFromRecord_(selected);
  const configured = Boolean(key);
  const searxng = getSearxngConfigInfo_();
  const searchConfigured = configured || (searxng.configured && searxng.enabled);
  const remainingLabel = creditStatus.remainingLabel;
  return {
    configured: configured,
    searchConfigured: searchConfigured,
    searxng: searxng,
    key_mask: key ? maskSecret_(key) : '',
    unlimited: true,
    todayUsed: 0,
    monthUsed: 0,
    creditRemaining: creditStatus.remainingLabel,
    creditRemainingValue: creditStatus.remainingValue,
    creditTotal: creditStatus.totalValue,
    creditPercent: creditStatus.remainingPercent,
    creditPercentKnown: creditStatus.percentKnown,
    creditLow: creditStatus.lowCredit,
    credit: {
      detail: configured
        ? (remainingLabel
          ? 'Serper残量 ' + remainingLabel + (creditStatus.percentKnown ? ' / ' + Math.round(creditStatus.remainingPercent * 10) / 10 + '%（20%未満で警告）' : ' / 残量率の基準を確認中')
          : 'Serper残量の確認待ち')
        : 'Serper APIキーをPropertiesServiceへ保存してください。',
      label: configured ? (creditStatus.lowCredit ? 'Serper残量20%未満' : 'Serper利用可能') : 'Serper未設定',
      ready: configured,
      tone: configured ? (creditStatus.lowCredit ? 'warn' : 'ok') : 'warn',
    },
    limits: {
      unlimited: true,
      alertThresholdPercent: SERPER_LOW_CREDIT_THRESHOLD_PERCENT,
      todayUsed: 0,
      monthUsed: 0,
      actualRemaining: remainingLabel,
      remainingValue: creditStatus.remainingValue,
      totalValue: creditStatus.totalValue,
      remainingPercent: creditStatus.remainingPercent,
      percentKnown: creditStatus.percentKnown,
      lowCredit: creditStatus.lowCredit,
    },
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
    const cached = CacheService.getScriptCache().get('dashboard_stats_v5');
    if (!cached) {
      return query.allowPersisted !== false
        ? readDashboardStatsSheetCache_(query)
        : null;
    }

    const parsed = JSON.parse(cached);
    parsed.cached = true;
    return parsed;
  } catch (error) {
    console.warn('Dashboard cache read skipped: ' + error.message);
    return query.allowPersisted !== false
      ? readDashboardStatsSheetCache_(query)
      : null;
  }
}

function writeDashboardStatsCache_(stats) {
  try {
    CacheService.getScriptCache().put('dashboard_stats_v5', JSON.stringify(stats), 600);
  } catch (error) {
    console.warn('Dashboard runtime cache write skipped: ' + error.message);
  }
  let persisted = false;
  try {
    withScriptLock_('writeDashboardStatsCache', function () {
      upsertDashboardCacheSheet_(stats);
    }, { waitMs: 10000 });
    persisted = true;
  } catch (error) {
    console.warn('Dashboard sheet cache write skipped: ' + error.message);
  }
  if (persisted) {
    markDashboardCacheRefreshed_(stats && stats.updatedAt ? stats.updatedAt : nowIso_());
  }
}

function markDashboardCacheRefreshed_(refreshedAt) {
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties || typeof properties.setProperty !== 'function') return;
    properties.setProperty(PROPERTY_KEYS.DASHBOARD_CACHE_REFRESHED_AT, String(refreshedAt || nowIso_()));
    if (typeof properties.deleteProperty === 'function') {
      properties.deleteProperty(PROPERTY_KEYS.DASHBOARD_CACHE_DIRTY_AT);
    }
  } catch (error) {
    console.warn('Dashboard cache refresh state write skipped: ' + error.message);
  }
}

function getDashboardCacheRefreshState_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const nowMs = Number(input.nowMs) || Date.now();
  const maxAgeMs = Math.max(Number(input.maxAgeMs) || 30 * 60 * 1000, 5 * 60 * 1000);
  let dirtyAt = '';
  let refreshedAt = '';
  try {
    const properties = PropertiesService.getScriptProperties();
    dirtyAt = String(properties.getProperty(PROPERTY_KEYS.DASHBOARD_CACHE_DIRTY_AT) || '');
    refreshedAt = String(properties.getProperty(PROPERTY_KEYS.DASHBOARD_CACHE_REFRESHED_AT) || '');
  } catch (error) {
    return {
      due: true,
      reason: 'state_unavailable',
      dirtyAt: dirtyAt,
      refreshedAt: refreshedAt,
    };
  }

  const dirtyMs = dirtyAt ? new Date(dirtyAt).getTime() : 0;
  const refreshedMs = refreshedAt ? new Date(refreshedAt).getTime() : 0;
  let reason = 'fresh';
  if (!Number.isFinite(refreshedMs) || refreshedMs <= 0) {
    reason = 'never_refreshed';
  } else if (Number.isFinite(dirtyMs) && dirtyMs > refreshedMs) {
    reason = 'dirty';
  } else if (nowMs - refreshedMs >= maxAgeMs) {
    reason = 'expired';
  }
  return {
    due: reason !== 'fresh',
    reason: reason,
    dirtyAt: dirtyAt,
    refreshedAt: refreshedAt,
    ageMs: refreshedMs > 0 ? Math.max(nowMs - refreshedMs, 0) : null,
  };
}

function refreshDashboardStatsCacheIfDue_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const state = getDashboardCacheRefreshState_(input);
  if (input.force !== true && state.due !== true) {
    return {
      refreshed: false,
      skipped: true,
      reason: state.reason,
      refreshedAt: state.refreshedAt,
    };
  }

  const stats = getDashboardStats({ bypassCache: true });
  return {
    refreshed: true,
    skipped: false,
    reason: state.reason,
    refreshedAt: String(stats.updatedAt || nowIso_()),
    leadsTotal: Number(stats.leadsTotal || 0),
  };
}

function readDashboardStatsSheetCache_(options) {
  try {
    const query = options && typeof options === 'object' ? options : {};
    const records = findSheetRecordsByExactFieldValues_(
      'dashboard_cache',
      'cache_key',
      ['dashboard_stats_v5'],
      dashboardStatsCacheReadFields_()
    );
    const cached = findLatestDashboardCacheRecord_(records, 'dashboard_stats_v5');
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
  const records = findSheetRecordsByExactFieldValues_(
    'dashboard_cache',
    'cache_key',
    ['dashboard_stats_v5', 'dashboard_stats_v4'],
    dashboardStatsCacheWriteLookupFields_()
  );
  const existing = findLatestDashboardCacheRecord_(records, 'dashboard_stats_v5') ||
    findLatestDashboardCacheRecord_(records, 'dashboard_stats_v4');
  const expiresAt = Utilities.formatDate(new Date(Date.now() + 30 * 60 * 1000), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const payload = {
    cache_key: 'dashboard_stats_v5',
    value_json: JSON.stringify(stats),
    expires_at: expiresAt,
  };

  if (existing) {
    updateSheetRecord_('dashboard_cache', existing.id, payload);
  } else {
    appendSheetRecord_('dashboard_cache', payload);
  }
}

function dashboardStatsCacheReadFields_() {
  return ['cache_key', 'value_json', 'expires_at', 'created_at', 'updated_at'];
}

function dashboardStatsCacheWriteLookupFields_() {
  return ['id', 'cache_key', 'created_at', 'updated_at'];
}

function findLatestDashboardCacheRecord_(records, cacheKey) {
  return (Array.isArray(records) ? records : []).filter(function (record) {
    return String(record.cache_key || '') === String(cacheKey || '');
  }).sort(function (left, right) {
    return String(right.updated_at || right.created_at || '').localeCompare(String(left.updated_at || left.created_at || ''));
  })[0] || null;
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

function buildConsumerGasUsageStatus_(input) {
  const source = input && typeof input === 'object' ? input : {};
  const limits = {
    emailRecipientsPerDay: 100,
    triggerRuntimeMinutesPerDay: 90,
    urlFetchCallsPerDay: 20000,
    propertiesReadWritePerDay: 50000,
    runtimeSecondsPerExecution: 360,
    triggersPerUserPerScript: 20,
    simultaneousExecutionsPerUser: 30,
    simultaneousExecutionsPerScript: 1000,
    propertyValueKb: 9,
    propertyStoreKb: 500,
    versionsPerScript: 200,
  };
  const actualMailRemaining = Math.max(0, Number(source.mailQuotaRemaining) || 0);
  const consumerMailRemaining = Math.min(limits.emailRecipientsPerDay, actualMailRemaining);
  const sentToday = Math.max(0, Number(source.sentToday) || 0);
  const emailUsed = Math.min(
    limits.emailRecipientsPerDay,
    Math.max(sentToday, limits.emailRecipientsPerDay - consumerMailRemaining)
  );
  const triggerCount = Math.max(0, Number(source.triggerCount) || 0);
  const urlFetchRecordedToday = Math.max(0, Number(source.urlFetchRecordedToday) || 0);
  const batchRuntimeBudgetMs = Math.min(Math.max(Number(source.batchRuntimeBudgetMs) || 300000, 10000), 330000);
  const versionMatch = String(APP_VERSION || '').match(/_v(\d+)(?:_|$)/);
  const codeVersion = versionMatch ? Number(versionMatch[1]) : 0;
  const alerts = [];

  if (emailUsed >= 95) {
    alerts.push({ key: 'email', tone: 'bad', title: 'メール送信枠が残りわずかです', detail: '一般Googleアカウントの100受信者/日を基準にしています。' });
  } else if (emailUsed >= 80) {
    alerts.push({ key: 'email', tone: 'warn', title: 'メール送信枠が80%を超えました', detail: '本日の追加送信前に残数を確認してください。' });
  }
  if (triggerCount >= 18) {
    alerts.push({ key: 'triggers', tone: 'bad', title: 'トリガー登録数が上限に近づいています', detail: triggerCount + '/20件です。不要なトリガーを整理してください。' });
  } else if (triggerCount >= 14) {
    alerts.push({ key: 'triggers', tone: 'warn', title: 'トリガー登録数が70%を超えました', detail: triggerCount + '/20件です。' });
  }
  if (urlFetchRecordedToday >= 18000) {
    alerts.push({ key: 'urlFetch', tone: 'bad', title: 'URL取得回数が上限に近づいています', detail: 'アプリ記録分だけで' + urlFetchRecordedToday + '/20,000回です。' });
  } else if (urlFetchRecordedToday >= 14000) {
    alerts.push({ key: 'urlFetch', tone: 'warn', title: 'URL取得回数が70%を超えました', detail: 'アプリ記録分だけで' + urlFetchRecordedToday + '/20,000回です。' });
  }
  if (batchRuntimeBudgetMs > 330000) {
    alerts.push({ key: 'runtime', tone: 'warn', title: '1回の最大処理時間が長すぎます', detail: '6分制限より前に終了できる値へ戻してください。' });
  }
  if (codeVersion >= 180) {
    alerts.push({ key: 'versions', tone: 'bad', title: 'Apps Scriptバージョン上限が近いです', detail: 'コード版v' + codeVersion + ' / 上限200です。新しいスクリプトへの移行準備が必要です。' });
  } else if (codeVersion >= 140) {
    alerts.push({ key: 'versions', tone: 'warn', title: 'Apps Scriptバージョンが70%に達しました', detail: 'コード版v' + codeVersion + ' / 上限200です。不要なデプロイを増やさない運用を推奨します。' });
  }

  return {
    accountType: 'consumer',
    accountLabel: '一般Googleアカウント',
    limits: limits,
    email: {
      used: emailUsed,
      remaining: Math.max(0, limits.emailRecipientsPerDay - emailUsed),
      actualRemaining: actualMailRemaining,
      limit: limits.emailRecipientsPerDay,
      appLimit: Math.max(0, Number(source.appMailLimit) || 0),
      exact: true,
    },
    triggers: {
      used: triggerCount,
      remaining: Math.max(0, limits.triggersPerUserPerScript - triggerCount),
      limit: limits.triggersPerUserPerScript,
      exact: true,
    },
    runtime: {
      budgetSeconds: Math.round(batchRuntimeBudgetMs / 1000),
      limitSeconds: limits.runtimeSecondsPerExecution,
      exact: true,
    },
    urlFetch: {
      recorded: urlFetchRecordedToday,
      limit: limits.urlFetchCallsPerDay,
      exact: false,
    },
    versions: {
      used: codeVersion,
      remaining: Math.max(0, limits.versionsPerScript - codeVersion),
      limit: limits.versionsPerScript,
      exact: false,
    },
    alerts: alerts,
    status: alerts.some(function (item) { return item.tone === 'bad'; }) ? 'danger' : alerts.length ? 'warning' : 'ok',
    startupPlaceholder: source.startupPlaceholder === true,
    checkedAt: nowIso_(),
  };
}
