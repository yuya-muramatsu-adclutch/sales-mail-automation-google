function checkRepliesForLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  const replySetting = getSettingValue_('gmail_reply_check', { enabled: false, maxThreads: 100 }) || {};
  const manualRun = Object.prototype.hasOwnProperty.call(input, 'maxThreads') || input.force === true;
  if (!manualRun && replySetting.enabled !== true) {
    return {
      checked: 0,
      detected: 0,
      elapsedMs: 0,
      errors: [],
      ignoredAutoReplies: 0,
      attemptedChecks: 0,
      remaining: 0,
      replies: 0,
      scanned: 0,
      skipped: 0,
      stoppedEarly: false,
      stoppedForRuntime: false,
      busy: false,
      disabled: true,
      resumable: false,
      items: [],
    };
  }
  const maxChecks = Math.min(Math.max(Number(input.maxThreads) || Number(replySetting.maxThreads || 100), 1), 500);
  const candidateLimit = Math.min(Math.max(Number(input.limit || 200), 1), 1000);
  const runtimeBudgetMs = Math.min(Math.max(Number(input.runtimeBudgetMs || getSettingValue_('batch_runtime_budget_ms', 300000)) || 300000, 10000), 330000);
  const runClaim = claimGmailReplyCheckRun_(runtimeBudgetMs);
  if (!runClaim.claimed) {
    return {
      checked: 0,
      detected: 0,
      elapsedMs: 0,
      errors: [],
      ignoredAutoReplies: 0,
      attemptedChecks: 0,
      remaining: 0,
      replies: 0,
      scanned: 0,
      skipped: 0,
      stoppedEarly: true,
      stoppedForRuntime: false,
      busy: true,
      resumable: true,
      items: [],
    };
  }
  try {
  const runWindow = buildSearchJobRunWindow_(runtimeBudgetMs, Date.now());
  const properties = PropertiesService.getScriptProperties();
  let cursorOffset = Math.max(Number(properties.getProperty(PROPERTY_KEYS.GMAIL_REPLY_CHECK_CURSOR)) || 0, 0);
  let page = listLeads({ limit: candidateLimit, offset: cursorOffset, includeArchived: false, sort: 'created_desc' });
  if (!page.items.length && cursorOffset > 0 && page.total > 0) {
    cursorOffset = 0;
    page = listLeads({ limit: candidateLimit, offset: 0, includeArchived: false, sort: 'created_desc' });
  }
  const leads = page.items || [];
  const checked = [];
  const errors = [];
  let ignoredAutoReplies = 0;
  let scanned = 0;
  let attemptedChecks = 0;
  let stoppedForRuntime = false;

  for (let index = 0; index < leads.length; index += 1) {
    if (attemptedChecks >= maxChecks) break;
    if (isSearchJobRuntimeExhausted_(runWindow.deadlineMs)) {
      stoppedForRuntime = true;
      break;
    }
    const lead = leads[index];
    scanned += 1;
    if (!isValidEmailAddress_(lead.email) || normalizeBooleanLike_(lead.reply_checked)) continue;
    attemptedChecks += 1;
    try {
      const query = 'from:' + lead.email + ' newer_than:365d';
      const threads = GmailApp.search(query, 0, 10);
      if (threads.length === 0) {
        checked.push({ leadId: lead.id, replied: false });
        continue;
      }

      const thread = threads[0];
      const messages = thread.getMessages();
      const latest = messages[messages.length - 1];
      const subject = latest.getSubject();
      const snippet = latest.getPlainBody().slice(0, 500);
      if (isAutoReplyMessage_(subject, snippet)) {
        ignoredAutoReplies += 1;
        checked.push({ leadId: lead.id, replied: false, ignoredAutoReply: true, threadId: thread.getId() });
        continue;
      }

      appendSheetRecord_('reply_logs', {
        lead_id: lead.id,
        thread_id: thread.getId(),
        from_email: lead.email,
        subject: subject,
        snippet: snippet,
        received_at: Utilities.formatDate(latest.getDate(), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      });
      updateLead(lead.id, {
        status: '返信あり',
        reply_checked: true,
        last_gmail_thread_id: thread.getId(),
      });
      checked.push({ leadId: lead.id, replied: true, threadId: thread.getId() });
    } catch (error) {
      errors.push({
        leadId: lead.id,
        message: error.message,
        threadId: '',
      });
    }
  }

  const rawNextOffset = cursorOffset + scanned;
  const wrapped = page.total === 0 || rawNextOffset >= page.total;
  const nextCursorOffset = wrapped ? 0 : rawNextOffset;
  withScriptLock_('saveGmailReplyCheckCursor', function () {
    properties.setProperty(PROPERTY_KEYS.GMAIL_REPLY_CHECK_CURSOR, String(nextCursorOffset));
  });

  return {
    checked: checked.length,
    detected: checked.filter(function (item) { return item.replied; }).length,
    elapsedMs: Date.now() - runWindow.startedAtMs,
    errors: errors,
    ignoredAutoReplies: ignoredAutoReplies,
    attemptedChecks: attemptedChecks,
    remaining: wrapped ? 0 : Math.max(page.total - nextCursorOffset, 0),
    replies: checked.filter(function (item) { return item.replied; }).length,
    scanned: scanned,
    skipped: Math.max(scanned - checked.length, 0),
    stoppedEarly: stoppedForRuntime || scanned < leads.length || !wrapped,
    stoppedForRuntime: stoppedForRuntime,
    cursorOffset: cursorOffset,
    nextCursorOffset: nextCursorOffset,
    wrapped: wrapped,
    resumable: page.total > 0,
    updated: checked.filter(function (item) { return item.replied; }).length,
    items: checked,
  };
  } finally {
    releaseGmailReplyCheckRun_(runClaim.lockToken);
  }
}

function claimGmailReplyCheckRun_(runtimeBudgetMs) {
  return withScriptLock_('claimGmailReplyCheckRun', function () {
    const properties = PropertiesService.getScriptProperties();
    let current = {};
    try {
      current = JSON.parse(properties.getProperty(PROPERTY_KEYS.GMAIL_REPLY_CHECK_LOCK) || '{}');
    } catch (error) {
      current = {};
    }
    const lockedAtMs = new Date(current.lockedAt || 0).getTime();
    const leaseMs = Math.max(420000, Number(runtimeBudgetMs || 300000) + 90000);
    if (current.token && Number.isFinite(lockedAtMs) && Date.now() - lockedAtMs < leaseMs) {
      return { claimed: false, busy: true, reason: 'already_running' };
    }
    const claim = {
      token: Utilities.getUuid(),
      lockedAt: nowIso_(),
    };
    properties.setProperty(PROPERTY_KEYS.GMAIL_REPLY_CHECK_LOCK, JSON.stringify(claim));
    return { claimed: true, busy: false, lockToken: claim.token };
  });
}

function releaseGmailReplyCheckRun_(lockToken) {
  return withScriptLock_('releaseGmailReplyCheckRun', function () {
    const properties = PropertiesService.getScriptProperties();
    let current = {};
    try {
      current = JSON.parse(properties.getProperty(PROPERTY_KEYS.GMAIL_REPLY_CHECK_LOCK) || '{}');
    } catch (error) {
      current = {};
    }
    if (String(current.token || '') !== String(lockToken || '')) return false;
    properties.deleteProperty(PROPERTY_KEYS.GMAIL_REPLY_CHECK_LOCK);
    return true;
  });
}

function listReplyFalsePositiveCandidates(options) {
  const input = options && typeof options === 'object' ? options : {};
  const limit = Math.min(Math.max(Number(input.limit) || 100, 1), 500);
  const startedAt = Date.now();
  const leads = listLeads({ filter: 'reply', limit: limit, includeArchived: false }).items;
  const logsByLeadId = listSheetRecords('reply_logs', { limit: 1000, includeInactive: true }).items.reduce(function (acc, log) {
    const leadId = String(log.lead_id || '');
    if (!leadId) return acc;
    if (!acc[leadId]) acc[leadId] = [];
    acc[leadId].push(log);
    return acc;
  }, {});
  const candidates = [];

  leads.forEach(function (lead) {
    const logs = (logsByLeadId[String(lead.id || '')] || []).filter(function (log) {
      return isAutoReplyMessage_(log.subject, log.snippet);
    });
    if (!logs.length) return;
    candidates.push({
      leadId: lead.id,
      companyName: lead.company_name || '',
      facilityName: lead.facility_name || '',
      email: lead.email || '',
      ignoredMessages: logs.length,
      restoreStatus: lead.last_sent_at ? '初回メール送信済み' : '未対応',
      sampleFrom: logs[0].from_email || lead.email || '',
      sampleSubject: logs[0].subject || '',
    });
  });

  return {
    candidates: candidates,
    checked: leads.length,
    elapsedMs: Date.now() - startedAt,
    errors: [],
    remaining: Math.max(leads.length - candidates.length, 0),
    stoppedEarly: false,
    updated: 0,
  };
}

function restoreReplyFalsePositiveCandidates(options) {
  const result = listReplyFalsePositiveCandidates(options);
  result.candidates.forEach(function (candidate) {
    updateLead(candidate.leadId, {
      status: candidate.restoreStatus,
      reply_checked: false,
    });
  });
  result.updated = result.candidates.length;
  return result;
}

function isAutoReplyMessage_(subject, body) {
  const text = [subject, body].join(' ').toLowerCase();
  return /auto[- ]?reply|automatic reply|out of office|delivery status notification|failure notice|undeliver(ed|able)|mailer-daemon|不在|自動返信|配信不能|配信エラー|送信できません|宛先不明/.test(text);
}

function createCalendarEventForLead(leadId, input) {
  const lead = getLeadById(leadId);
  const source = input && typeof input === 'object' ? input : {};
  const title = String(source.title || [lead.company_name, lead.facility_name, '商談'].filter(Boolean).join(' ')).trim();
  const start = source.start || source.start_at || source.startAt;
  const end = source.end || source.end_at || source.endAt;
  if (!start || !end) throw new Error('Calendar event start and end are required.');

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
    throw new Error('Invalid calendar event date range.');
  }

  const description = [
    '会社名: ' + (lead.company_name || ''),
    '施設名: ' + (lead.facility_name || ''),
    'メール: ' + (lead.email || ''),
    '電話: ' + (lead.phone || ''),
    'Web: ' + (lead.website_url || ''),
    'メモ: ' + (source.memo || lead.meeting_memo || ''),
  ].join('\n');
  const event = CalendarApp.getDefaultCalendar().createEvent(title, startDate, endDate, {
    description: description,
    location: source.location || lead.address || '',
    guests: source.guests || lead.email || '',
    sendInvites: source.sendInvites === true,
  });

  updateLead(lead.id, {
    status: '商談予定',
    meeting_start_at: Utilities.formatDate(startDate, Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    meeting_end_at: Utilities.formatDate(endDate, Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    meeting_memo: source.memo || lead.meeting_memo || '',
    calendar_event_id: event.getId(),
  });

  return {
    ok: true,
    eventId: event.getId(),
    title: event.getTitle(),
  };
}

function importLeadsFromCsv(csvText, options) {
  const input = options && typeof options === 'object' ? options : {};
  const rows = Utilities.parseCsv(String(csvText || ''));
  if (rows.length < 2) throw new Error('CSV must include a header row and at least one data row.');
  const headers = rows[0].map(function (header) {
    return normalizeCsvHeader_(header);
  });
  const result = {
    added: 0,
    skipped: 0,
    errors: [],
  };

  rows.slice(1).forEach(function (row, index) {
    const raw = {};
    headers.forEach(function (header, columnIndex) {
      if (header) raw[header] = row[columnIndex] || '';
    });
    try {
      createLead(Object.assign({}, raw, {
        source: raw.source || input.source || 'csv',
        allow_duplicate: input.allow_duplicate === true || input.allowDuplicate === true,
      }));
      result.added += 1;
    } catch (error) {
      result.skipped += 1;
      result.errors.push({
        row: index + 2,
        message: error.message,
      });
      appendSheetRecord_('raw_import', {
        import_job_id: input.import_job_id || input.importJobId || '',
        row_json: safeJsonStringify_(raw),
        status: 'error',
        error_message: error.message,
      });
    }
  });

  appendSheetRecord_('sync_logs', {
    event_type: 'csv_import',
    operation: 'importLeadsFromCsv',
    target_sheet: 'leads',
    target_id: '',
    level: result.errors.length > 0 ? 'warn' : 'info',
    message: 'CSV import completed. added=' + result.added + ', skipped=' + result.skipped,
    stack: '',
    context_json: safeJsonStringify_(result),
  });

  return result;
}

function normalizeCsvHeader_(header) {
  const text = String(header || '').trim();
  const aliases = {
    会社名: 'company_name',
    会社: 'company_name',
    企業名: 'company_name',
    施設名: 'facility_name',
    屋号: 'facility_name',
    サービス名: 'facility_name',
    店舗名: 'facility_name',
    メール: 'email',
    メールアドレス: 'email',
    'メール/フォームURL': 'email',
    'メール／フォームURL': 'email',
    'メール・フォームURL': 'email',
    メールまたはフォームURL: 'email',
    連絡先: 'email',
    問い合わせ先: 'email',
    担当者メール: 'contact_email',
    担当者メールアドレス: 'contact_email',
    電話: 'phone',
    電話番号: 'phone',
    公式サイト: 'website_url',
    Webサイト: 'website_url',
    WebサイトURL: 'website_url',
    WEBサイトURL: 'website_url',
    WEB: 'website_url',
    Web: 'website_url',
    ホームページ: 'website_url',
    サイトURL: 'website_url',
    URL: 'website_url',
    問い合わせフォーム: 'form_url',
    フォームURL: 'form_url',
    問い合わせURL: 'form_url',
    住所: 'address',
    業種: 'genre',
    ジャンル: 'genre',
    担当者: 'contact_name',
    担当者名: 'contact_name',
    メモ: 'notes',
    source_id: 'source_id',
    external_id: 'external_id',
  };
  return aliases[text] || normalizeLeadInputKey_(text);
}

function advanceQueuedJobs(options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxJobs = Math.min(Math.max(Number(input.maxJobs) || 3, 1), 10);
  const totalRuntimeBudgetMs = Math.min(Math.max(Number(input.runtimeBudgetMs || getSettingValue_('batch_runtime_budget_ms', 300000)) || 300000, 10000), 330000);
  const runWindow = buildSearchJobRunWindow_(totalRuntimeBudgetMs, Date.now());
  const jobs = listSheetRecords('search_jobs', { limit: 100, includeInactive: true }).items.filter(function (job) {
    return job.status === 'queued' || job.status === 'running';
  }).sort(function (left, right) {
    return String(left.updated_at || left.created_at || '').localeCompare(String(right.updated_at || right.created_at || ''));
  }).slice(0, maxJobs);
  const results = [];
  const errors = [];
  let stoppedForRuntime = false;

  for (let index = 0; index < jobs.length; index += 1) {
    if (isSearchJobRuntimeExhausted_(runWindow.deadlineMs)) {
      stoppedForRuntime = true;
      break;
    }
    const job = jobs[index];
    let payload = {};
    try {
      payload = JSON.parse(job.query_json || '{}');
      const remainingBudgetMs = Math.max(runWindow.deadlineMs - Date.now(), 0);
      if (remainingBudgetMs < 10000) {
        stoppedForRuntime = true;
        break;
      }
      results.push(advanceSearchJob(job.id, {
        maxItems: payload.crawl_all ? 1 : (input.maxItems || 5),
        runtimeBudgetMs: Math.min(totalRuntimeBudgetMs, remainingBudgetMs),
      }));
    } catch (error) {
      errors.push({ jobId: job.id, message: error.message || String(error) });
      appendSyncError_('advanceQueuedJobs', error, {
        target_sheet: 'search_jobs',
        target_id: job.id,
      });
    }
  }

  return {
    jobs: results,
    errors: errors,
    elapsedMs: Date.now() - runWindow.startedAtMs,
    stoppedForRuntime: stoppedForRuntime,
    resumable: jobs.length > results.filter(function (result) { return result.completed; }).length,
    remainingJobs: Math.max(jobs.length - results.length, 0) + results.filter(function (result) { return !result.completed; }).length,
  };
}

function installDefaultTriggers() {
  const existing = ScriptApp.getProjectTriggers();
  const handlers = existing.map(function (trigger) {
    return trigger.getHandlerFunction();
  });

  if (handlers.indexOf('advanceQueuedJobs') === -1) {
    ScriptApp.newTrigger('advanceQueuedJobs').timeBased().everyMinutes(10).create();
  }
  if (handlers.indexOf('checkRepliesForLeads') === -1) {
    ScriptApp.newTrigger('checkRepliesForLeads').timeBased().everyHours(6).create();
  }

  return {
    ok: true,
    triggers: ScriptApp.getProjectTriggers().map(function (trigger) {
      return {
        handler: trigger.getHandlerFunction(),
        type: String(trigger.getEventType()),
      };
    }),
  };
}

function createSpreadsheetBackup() {
  const spreadsheet = getOrCreateSpreadsheet_();
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
  const sourceFile = DriveApp.getFileById(spreadsheet.getId());
  const backupName = spreadsheet.getName() + '_backup_' + timestamp;
  const backupFile = sourceFile.makeCopy(backupName);
  const result = {
    ok: true,
    id: backupFile.getId(),
    name: backupFile.getName(),
    url: backupFile.getUrl(),
    createdAt: nowIso_(),
  };

  appendSheetRecord_('sync_logs', {
    event_type: 'backup',
    operation: 'createSpreadsheetBackup',
    target_sheet: '',
    target_id: spreadsheet.getId(),
    level: 'info',
    message: 'Spreadsheet backup created: ' + backupName,
    stack: '',
    context_json: safeJsonStringify_(result),
  });

  return result;
}

function prepareLeadMigration(input) {
  return withScriptLock_('prepareLeadMigration', function () {
    const source = input && typeof input === 'object' ? input : {};
    const totalRows = Math.max(Number(source.totalRows || source.total_rows) || 0, 0);
    const replace = source.replace === true;
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const headers = getHeaders_(sheet);
    const expectedHeaders = SHEET_DEFINITIONS.leads;
    const mismatch = expectedHeaders.find(function (header, index) {
      return headers[index] !== header;
    });

    if (mismatch) {
      throw new Error('leads header mismatch: ' + mismatch);
    }

    const existingRows = countNonBlankSheetRows_(sheet, expectedHeaders.length);
    if (existingRows > 0 && !replace) {
      throw new Error('leads already has rows: ' + existingRows);
    }

    ensureSheetGridSize_(sheet, Math.max(totalRows + 1, 2), expectedHeaders.length);
    if (sheet.getMaxRows() > 1) {
      sheet.getRange(2, 1, sheet.getMaxRows() - 1, expectedHeaders.length).clearContent();
    }
    clearRuntimeCaches_('leads');

    return {
      ok: true,
      totalRows: totalRows,
      existingRows: existingRows,
      replace: replace,
      headers: expectedHeaders,
    };
  });
}

function writeLeadMigrationRows(input) {
  return withScriptLock_('writeLeadMigrationRows', function () {
    const source = input && typeof input === 'object' ? input : {};
    const rows = Array.isArray(source.rows) ? source.rows : [];
    const startRow = Math.max(Number(source.startRow || source.start_row) || 2, 2);
    const headers = SHEET_DEFINITIONS.leads;

    if (rows.length === 0) {
      return {
        ok: true,
        written: 0,
        startRow: startRow,
      };
    }
    if (rows.length > 500) {
      throw new Error('writeLeadMigrationRows accepts up to 500 rows per call.');
    }

    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    ensureSheetGridSize_(sheet, startRow + rows.length - 1, headers.length);
    const values = rows.map(function (row) {
      return normalizeMigratedLeadRow_(row, headers.length);
    });
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
    clearRuntimeCaches_('leads');

    return {
      ok: true,
      written: values.length,
      startRow: startRow,
      endRow: startRow + values.length - 1,
    };
  });
}

function finalizeLeadMigration(input) {
  return withScriptLock_('finalizeLeadMigration', function () {
    const source = input && typeof input === 'object' ? input : {};
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'leads');
    const migratedRows = countNonBlankSheetRows_(sheet, SHEET_DEFINITIONS.leads.length);
    const result = {
      ok: true,
      migratedRows: migratedRows,
      expectedRows: Number(source.expectedRows || source.expected_rows || 0),
      source: String(source.source || ''),
      finishedAt: nowIso_(),
    };

    appendSheetRecord_('sync_logs', {
      event_type: 'migration',
      operation: 'finalizeLeadMigration',
      target_sheet: 'leads',
      target_id: '',
      level: result.expectedRows && result.expectedRows !== migratedRows ? 'warn' : 'info',
      message: 'Lead migration finished. migrated=' + migratedRows + ', expected=' + result.expectedRows,
      stack: '',
      context_json: safeJsonStringify_(result),
    });
    clearRuntimeCaches_('leads');
    return result;
  });
}

function ensureSheetGridSize_(sheet, rowCount, columnCount) {
  if (sheet.getMaxRows() < rowCount) {
    sheet.insertRowsAfter(sheet.getMaxRows(), rowCount - sheet.getMaxRows());
  }
  if (sheet.getMaxColumns() < columnCount) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columnCount - sheet.getMaxColumns());
  }
}

function normalizeMigratedLeadRow_(row, columnCount) {
  const source = Array.isArray(row) ? row : [];
  const values = [];
  for (let index = 0; index < columnCount; index += 1) {
    values.push(valueOrBlank_(source[index]));
  }
  return values;
}

function countNonBlankSheetRows_(sheet, columnCount) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const values = sheet.getRange(2, 1, lastRow - 1, columnCount).getValues();
  return values.filter(function (row) {
    return row.some(function (cell) {
      return String(cell || '').trim() !== '';
    });
  }).length;
}
