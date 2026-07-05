function checkRepliesForLeads(options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxThreads = Math.min(Math.max(Number(input.maxThreads) || Number(getSettingValue_('gmail_reply_check', {}).maxThreads || 100), 1), 500);
  const leads = listLeads({ limit: Number(input.limit || 200), includeArchived: false }).items.filter(function (lead) {
    return isValidEmailAddress_(lead.email) && !normalizeBooleanLike_(lead.reply_checked);
  });
  const checked = [];
  let remaining = maxThreads;

  leads.forEach(function (lead) {
    if (remaining <= 0) return;
    const query = 'from:' + lead.email + ' newer_than:365d';
    const threads = GmailApp.search(query, 0, Math.min(remaining, 10));
    remaining -= threads.length;
    if (threads.length === 0) {
      checked.push({ leadId: lead.id, replied: false });
      return;
    }

    const thread = threads[0];
    const messages = thread.getMessages();
    const latest = messages[messages.length - 1];
    appendSheetRecord_('reply_logs', {
      lead_id: lead.id,
      thread_id: thread.getId(),
      from_email: lead.email,
      subject: latest.getSubject(),
      snippet: latest.getPlainBody().slice(0, 500),
      received_at: Utilities.formatDate(latest.getDate(), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
    });
    updateLead(lead.id, {
      status: '返信あり',
      reply_checked: true,
      last_gmail_thread_id: thread.getId(),
    });
    checked.push({ leadId: lead.id, replied: true, threadId: thread.getId() });
  });

  return {
    checked: checked.length,
    replies: checked.filter(function (item) { return item.replied; }).length,
    items: checked,
  };
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
  const jobs = listSheetRecords('search_jobs', { limit: 100, includeInactive: true }).items.filter(function (job) {
    return job.status === 'queued' || job.status === 'running';
  }).slice(0, maxJobs);

  return {
    jobs: jobs.map(function (job) {
      return advanceSearchJob(job.id, {
        maxItems: input.maxItems || 5,
      });
    }),
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
