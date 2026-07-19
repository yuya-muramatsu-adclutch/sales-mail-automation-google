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
  const latestSentAtByLeadId = buildLatestSuccessfulMailSentAtByLeadId_();
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
    const sentAtText = String(latestSentAtByLeadId[String(lead.id || '')] || '');
    const sentAt = new Date(sentAtText);
    if (!sentAtText || !Number.isFinite(sentAt.getTime())) continue;
    attemptedChecks += 1;
    try {
      const timezone = Session.getScriptTimeZone() || 'Asia/Tokyo';
      const sentDateQuery = Utilities.formatDate(sentAt, timezone, 'yyyy/MM/dd');
      const query = 'from:' + lead.email + ' after:' + sentDateQuery;
      const threads = GmailApp.search(query, 0, 10);
      if (threads.length === 0) {
        checked.push({ leadId: lead.id, replied: false });
        continue;
      }

      const detected = findHumanReplyAfterSend_(threads, lead.email, sentAt);
      ignoredAutoReplies += detected.ignoredAutoReplies;
      if (!detected.message) {
        checked.push({
          leadId: lead.id,
          replied: false,
          ignoredAutoReply: detected.ignoredAutoReplies > 0,
          threadId: detected.latestIgnoredThreadId || '',
        });
        continue;
      }
      const thread = detected.thread;
      const latest = detected.message;
      const subject = detected.subject;
      const snippet = detected.snippet;

      recordDetectedReply_(lead.id, {
        lead_id: lead.id,
        thread_id: thread.getId(),
        from_email: detected.fromEmail || lead.email,
        subject: subject,
        snippet: snippet,
        received_at: Utilities.formatDate(latest.getDate(), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
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

function recordDetectedReply_(leadId, reply) {
  const source = reply && typeof reply === 'object' ? reply : {};
  const threadId = String(source.thread_id || source.threadId || '').trim();
  if (!threadId) throw new Error('Gmail thread id is required.');
  return withScriptLock_('recordDetectedReply', function () {
    const lead = getLeadById(leadId);
    if (isArchivedLead_(lead)) {
      throw createExpectedOperationError_('アーカイブ済み営業先のため返信反映を停止しました。', 'REPLY_LEAD_ARCHIVED');
    }
    if (normalizeBooleanLike_(lead.reply_checked)) {
      return { ok: true, alreadyRecorded: true, lead: lead, log: findReplyLogByLeadAndThread_(lead.id, threadId) };
    }

    let log = findReplyLogByLeadAndThread_(lead.id, threadId);
    if (!log) {
      log = appendSheetRecord_('reply_logs', {
        lead_id: lead.id,
        thread_id: threadId,
        from_email: source.from_email || source.fromEmail || lead.email || '',
        subject: source.subject || '',
        snippet: source.snippet || '',
        received_at: source.received_at || source.receivedAt || nowIso_(),
      });
    }
    const updatedLead = updateLeadLocked_(lead.id, {
      status: '返信あり',
      reply_checked: true,
      last_gmail_thread_id: threadId,
    });
    return { ok: true, alreadyRecorded: false, lead: updatedLead, log: log };
  }, { waitMs: 90000 });
}

function findReplyLogByLeadAndThread_(leadId, threadId) {
  const normalizedLeadId = String(leadId || '').trim();
  const normalizedThreadId = String(threadId || '').trim();
  if (!normalizedLeadId || !normalizedThreadId) return null;
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'reply_logs');
  const headers = getHeaders_(sheet);
  const threadColumnIndex = headers.indexOf('thread_id');
  const lastRow = sheet.getLastRow();
  if (threadColumnIndex === -1 || lastRow < 2) return null;
  const match = sheet
    .getRange(2, threadColumnIndex + 1, lastRow - 1, 1)
    .createTextFinder(normalizedThreadId)
    .matchEntireCell(true)
    .matchCase(true)
    .useRegularExpression(false)
    .findAll()
    .map(function (range) {
      const row = sheet.getRange(range.getRow(), 1, 1, headers.length).getValues()[0];
      return rowToRecord_(headers, row);
    })
    .find(function (record) {
      return String(record.lead_id || '') === normalizedLeadId && String(record.thread_id || '') === normalizedThreadId;
    });
  return match || null;
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
  const offset = Math.max(Number(input.offset) || 0, 0);
  const startedAt = Date.now();
  const page = listLeads({ filter: 'reply', limit: limit, offset: offset, includeArchived: false });
  const leads = page.items || [];
  const latestHistoryByLeadId = buildLatestSuccessfulMailHistoryByLeadId_();
  const logsByLeadId = readAllSheetRecordsByName_('reply_logs', { includeInactive: true, includeArchived: true }).reduce(function (acc, log) {
    const leadId = String(log.lead_id || '');
    if (!leadId) return acc;
    if (!acc[leadId]) acc[leadId] = [];
    acc[leadId].push(log);
    return acc;
  }, {});
  const candidates = [];

  leads.forEach(function (lead) {
    const leadId = String(lead.id || '');
    const latestHistory = latestHistoryByLeadId[leadId] || null;
    const sentAtMs = latestHistory ? new Date(latestHistory.sent_at || latestHistory.created_at || 0).getTime() : NaN;
    const leadLogs = logsByLeadId[leadId] || [];
    const validHumanLogs = leadLogs.filter(function (log) {
      const receivedAtMs = new Date(log.received_at || log.created_at || 0).getTime();
      return Number.isFinite(sentAtMs) && Number.isFinite(receivedAtMs) && receivedAtMs > sentAtMs && !isAutoReplyMessage_(log.subject, log.snippet);
    });
    if (validHumanLogs.length) return;
    const logs = leadLogs.filter(function (log) {
      const receivedAtMs = new Date(log.received_at || log.created_at || 0).getTime();
      const beforeDelivery = Number.isFinite(receivedAtMs) && (!Number.isFinite(sentAtMs) || receivedAtMs <= sentAtMs);
      return beforeDelivery || isAutoReplyMessage_(log.subject, log.snippet);
    });
    if (!logs.length) return;
    candidates.push({
      leadId: lead.id,
      companyName: lead.company_name || '',
      facilityName: lead.facility_name || '',
      email: lead.email || '',
      ignoredMessages: logs.length,
      restoreStatus: replyFalsePositiveRestoreStatus_(lead, latestHistory),
      expectedStatus: String(lead.status || ''),
      expectedReplyChecked: normalizeBooleanLike_(lead.reply_checked),
      expectedThreadId: String(lead.last_gmail_thread_id || ''),
      sampleFrom: logs[0].from_email || lead.email || '',
      sampleSubject: logs[0].subject || '',
    });
  });

  return {
    candidates: candidates,
    checked: leads.length,
    total: page.total,
    offset: offset,
    limit: limit,
    elapsedMs: Date.now() - startedAt,
    errors: [],
    remaining: Math.max(Number(page.total || 0) - (offset + leads.length), 0),
    stoppedEarly: offset + leads.length < Number(page.total || 0),
    updated: 0,
  };
}

function restoreReplyFalsePositiveCandidates(options) {
  const result = listReplyFalsePositiveCandidates(options);
  const errors = [];
  let updated = 0;
  result.candidates.forEach(function (candidate) {
    try {
      const outcome = restoreReplyFalsePositiveCandidate_(candidate);
      if (outcome.conflict) {
        errors.push({
          leadId: candidate.leadId,
          conflict: true,
          message: '別の処理で営業先が更新されたため上書きしませんでした。',
        });
        return;
      }
      updated += 1;
    } catch (error) {
      errors.push({
        leadId: candidate.leadId,
        message: error.message || String(error),
      });
    }
  });
  result.updated = updated;
  result.errors = errors;
  result.reviewedCandidates = result.candidates.slice();
  if (errors.length) {
    const failedLeadIds = {};
    errors.forEach(function (error) { failedLeadIds[String(error.leadId || '')] = true; });
    result.candidates = result.candidates.filter(function (candidate) {
      return failedLeadIds[String(candidate.leadId || '')];
    });
  } else {
    result.candidates = [];
  }
  return result;
}

function replyFalsePositiveRestoreStatus_(lead, latestHistory) {
  if (latestHistory) {
    return String(latestHistory.send_type || '') === '2ヶ月後メール'
      ? '2ヶ月後メール送信済み'
      : '初回メール送信済み';
  }
  return ['serper', 'search_job', 'prospecting', 'source_page'].indexOf(String(lead && lead.source || '')) !== -1
    ? '対応中'
    : '未対応';
}

function restoreReplyFalsePositiveCandidate_(candidate) {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  return withScriptLock_('restoreReplyFalsePositiveCandidate', function () {
    const lead = getLeadById(source.leadId);
    const unchanged = !isArchivedLead_(lead) &&
      String(lead.status || '') === String(source.expectedStatus || '') &&
      normalizeBooleanLike_(lead.reply_checked) === Boolean(source.expectedReplyChecked) &&
      String(lead.last_gmail_thread_id || '') === String(source.expectedThreadId || '');
    if (!unchanged) {
      return {
        ok: false,
        conflict: true,
        lead: lead,
      };
    }
    const updatedLead = updateLeadLocked_(lead.id, {
      status: source.restoreStatus,
      reply_checked: false,
      last_gmail_thread_id: '',
    });
    return {
      ok: true,
      conflict: false,
      lead: updatedLead,
    };
  }, { waitMs: 90000 });
}

function isAutoReplyMessage_(subject, body) {
  const text = [subject, body].join(' ').toLowerCase();
  if (/auto[- ]?reply|automatic reply|out of office|delivery status notification|delivery failure|failure notice|undeliver(ed|able)|undelivered mail|returned mail|mail delivery subsystem|mailer-daemon|address not found|不在|自動返信|配信不能|配信エラー|送信できません|宛先不明/.test(text)) return true;
  return /(?:お問い合わせ|お申し込み|メール).*(?:お客様控え|受付いたしました|受付しました|自動送信)|(?:thank you for (?:your )?(?:inquiry|message)|we have received your (?:inquiry|message))/.test(text);
}

function buildLatestSuccessfulMailSentAtByLeadId_() {
  const histories = buildLatestSuccessfulMailHistoryByLeadId_();
  const result = {};
  Object.keys(histories).forEach(function (leadId) {
    const history = histories[leadId];
    result[leadId] = String(history.sent_at || history.created_at || '');
  });
  return result;
}

function buildLatestSuccessfulMailHistoryByLeadId_() {
  const result = {};
  readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories')).forEach(function (history) {
    if (!isSuccessfulProductionSendHistory_(history)) return;
    const leadId = String(history.lead_id || '').trim();
    const sentAt = String(history.sent_at || history.created_at || '').trim();
    if (!leadId || !sentAt) return;
    const current = result[leadId];
    const currentSentAt = current ? String(current.sent_at || current.created_at || '') : '';
    if (!current || sentAt > currentSentAt) result[leadId] = history;
  });
  return result;
}

function findHumanReplyAfterSend_(threads, leadEmail, sentAt) {
  const targetEmail = normalizeEmailForSendSafety_(leadEmail);
  const sentAtMs = sentAt instanceof Date ? sentAt.getTime() : new Date(sentAt).getTime();
  const candidates = [];
  let ignoredAutoReplies = 0;
  let latestIgnoredThreadId = '';
  let latestIgnoredAt = 0;

  (threads || []).forEach(function (thread) {
    const threadId = String(thread.getId ? thread.getId() : '');
    const messages = thread.getMessages ? thread.getMessages() : [];
    messages.forEach(function (message) {
      const receivedAt = message.getDate ? message.getDate() : null;
      const receivedAtMs = receivedAt instanceof Date ? receivedAt.getTime() : new Date(receivedAt || 0).getTime();
      if (!Number.isFinite(receivedAtMs) || !Number.isFinite(sentAtMs) || receivedAtMs <= sentAtMs) return;
      const fromHeader = message.getFrom ? message.getFrom() : '';
      const fromEmails = extractEmailsFromMessageHeader_(fromHeader);
      if (fromEmails.indexOf(targetEmail) === -1) return;
      const subject = message.getSubject ? String(message.getSubject() || '') : '';
      const snippet = message.getPlainBody ? String(message.getPlainBody() || '').slice(0, 500) : '';
      if (isAutomatedGmailMessage_(message, subject, snippet, fromEmails)) {
        ignoredAutoReplies += 1;
        if (receivedAtMs > latestIgnoredAt) {
          latestIgnoredAt = receivedAtMs;
          latestIgnoredThreadId = threadId;
        }
        return;
      }
      candidates.push({
        thread: thread,
        message: message,
        subject: subject,
        snippet: snippet,
        fromEmail: fromEmails[0] || targetEmail,
        receivedAtMs: receivedAtMs,
      });
    });
  });

  candidates.sort(function (left, right) { return right.receivedAtMs - left.receivedAtMs; });
  const latest = candidates[0] || {};
  return {
    thread: latest.thread || null,
    message: latest.message || null,
    subject: latest.subject || '',
    snippet: latest.snippet || '',
    fromEmail: latest.fromEmail || '',
    ignoredAutoReplies: ignoredAutoReplies,
    latestIgnoredThreadId: latestIgnoredThreadId,
  };
}

function extractEmailsFromMessageHeader_(value) {
  const matches = String(value || '').match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/ig) || [];
  return Array.from(new Set(matches.map(function (email) {
    return normalizeEmailForSendSafety_(email);
  }).filter(Boolean)));
}

function gmailMessageHeader_(message, name) {
  try {
    return message && message.getHeader ? String(message.getHeader(name) || '') : '';
  } catch (error) {
    return '';
  }
}

function isAutomatedGmailMessage_(message, subject, snippet, fromEmails) {
  if (isAutoReplyMessage_(subject, snippet)) return true;
  const autoSubmitted = gmailMessageHeader_(message, 'Auto-Submitted').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') return true;
  const precedence = gmailMessageHeader_(message, 'Precedence').toLowerCase();
  if (/^(?:bulk|junk|list|auto[_-]?reply)$/.test(precedence)) return true;
  if (gmailMessageHeader_(message, 'List-Id')) return true;
  if (gmailMessageHeader_(message, 'X-Failed-Recipients')) return true;
  return (fromEmails || []).some(function (email) {
    return /^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster)@/i.test(String(email || ''));
  });
}

function createCalendarEventForLead(leadId, input) {
  const source = input && typeof input === 'object' ? input : {};
  const start = source.start || source.start_at || source.startAt;
  const end = source.end || source.end_at || source.endAt;
  if (!start || !end) throw new Error('Calendar event start and end are required.');

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
    throw new Error('Invalid calendar event date range.');
  }

  const claim = withScriptLock_('claimCalendarEventForLead', function () {
    const lead = getLeadById(leadId);
    const existingEventId = String(lead.calendar_event_id || '').trim();
    if (existingEventId) return { claimed: false, lead: lead, existingEventId: existingEventId };
    const sendInvites = source.sendInvites === true;
    const guests = sendInvites ? String(source.guests || lead.email || '').trim() : '';
    if (sendInvites) assertCalendarInviteAllowed_(lead, guests);
    const properties = PropertiesService.getScriptProperties();
    const propertyKey = calendarEventClaimPropertyKey_(lead.id);
    const currentClaim = parseCalendarEventClaim_(properties.getProperty(propertyKey));
    const claimedAtMs = new Date(currentClaim.claimedAt || 0).getTime();
    if (currentClaim.token && Number.isFinite(claimedAtMs) && Date.now() - claimedAtMs < 10 * 60 * 1000) {
      throw createExpectedOperationError_('Calendar登録は別の処理で実行中です。しばらく待ってから再度お試しください。', 'CALENDAR_EVENT_BUSY');
    }
    const recovering = Boolean(currentClaim.token);
    const token = recovering ? String(currentClaim.token) : Utilities.getUuid();
    const recoveryStart = String(currentClaim.start || startDate.toISOString());
    const recoveryEnd = String(currentClaim.end || endDate.toISOString());
    properties.setProperty(propertyKey, JSON.stringify({
      token: token,
      claimedAt: nowIso_(),
      start: recoveryStart,
      end: recoveryEnd,
    }));
    return {
      claimed: true,
      lead: lead,
      token: token,
      sendInvites: sendInvites,
      guests: guests,
      recovering: recovering,
      recoveryStart: recoveryStart,
      recoveryEnd: recoveryEnd,
    };
  }, { waitMs: 90000 });

  let calendar;
  try {
    calendar = CalendarApp.getDefaultCalendar();
  } catch (error) {
    if (claim.claimed) releaseCalendarEventClaim_(claim.lead.id, claim.token);
    throw error;
  }
  if (!claim.claimed) {
    let existingEvent = null;
    try {
      existingEvent = calendar.getEventById(claim.existingEventId);
    } catch (error) {
      throw createExpectedOperationError_('Calendar登録済みですが、既存イベントを確認できません。', 'CALENDAR_EVENT_LOOKUP_FAILED');
    }
    if (existingEvent) {
      return {
        ok: true,
        existing: true,
        eventId: claim.existingEventId,
        title: existingEvent.getTitle ? existingEvent.getTitle() : String(source.title || '商談'),
      };
    }
    if (source.__staleCalendarRetry === true) {
      throw createExpectedOperationError_('保存済みのCalendarイベントIDを復旧できませんでした。', 'CALENDAR_EVENT_STALE_ID');
    }
    withScriptLock_('clearStaleCalendarEventForLead', function () {
      const currentLead = getLeadById(claim.lead.id);
      if (String(currentLead.calendar_event_id || '').trim() === claim.existingEventId) {
        updateLeadLocked_(currentLead.id, { calendar_event_id: '' });
      }
    }, { waitMs: 90000 });
    return createCalendarEventForLead(leadId, Object.assign({}, source, { __staleCalendarRetry: true }));
  }

  const lead = claim.lead;
  const title = String(source.title || [lead.company_name, lead.facility_name, '商談'].filter(Boolean).join(' ')).trim();
  const claimMarker = calendarEventClaimMarker_(claim.token);
  const description = [
    '会社名: ' + (lead.company_name || ''),
    '施設名: ' + (lead.facility_name || ''),
    'メール: ' + (lead.email || ''),
    '電話: ' + (lead.phone || ''),
    'Web: ' + (lead.website_url || ''),
    'メモ: ' + (source.memo || lead.meeting_memo || ''),
    '管理ID: ' + claimMarker,
  ].join('\n');
  const eventOptions = {
    description: description,
    location: source.location || lead.address || '',
    sendInvites: claim.sendInvites,
  };
  if (claim.guests) eventOptions.guests = claim.guests;
  let event = null;
  let eventId = '';
  let recoveredEvent = false;
  if (claim.recovering) {
    try {
      event = findCalendarEventByClaim_(calendar, claim, startDate, endDate);
      if (event) {
        eventId = String(event.getId() || '');
        recoveredEvent = Boolean(eventId);
      }
    } catch (error) {
      throw createExpectedOperationError_(
        '前回作成したCalendarイベントを確認できませんでした。重複防止のため時間をおいて再度お試しください。',
        'CALENDAR_EVENT_RECOVERY_FAILED'
      );
    }
  }
  try {
    if (!eventId) {
      event = calendar.createEvent(title, startDate, endDate, eventOptions);
      eventId = String(event.getId() || '');
    }
    if (!eventId) throw new Error('Calendar event ID was not returned.');
  } catch (error) {
    if (event && event.deleteEvent) {
      try {
        event.deleteEvent();
      } catch (rollbackError) {
        logCalendarErrorSafely_('createCalendarEventForLeadCreateRollback', rollbackError, {
          target_sheet: 'leads',
          target_id: lead.id,
        });
      }
    }
    releaseCalendarEventClaim_(lead.id, claim.token);
    throw error;
  }

  let eventStartDate = startDate;
  let eventEndDate = endDate;
  if (recoveredEvent) {
    try {
      const recoveredStart = event.getStartTime ? event.getStartTime() : null;
      const recoveredEnd = event.getEndTime ? event.getEndTime() : null;
      if (recoveredStart && Number.isFinite(new Date(recoveredStart).getTime())) eventStartDate = recoveredStart;
      if (recoveredEnd && Number.isFinite(new Date(recoveredEnd).getTime())) eventEndDate = recoveredEnd;
    } catch (error) {
      console.warn('Recovered Calendar event time lookup skipped: ' + String(error && error.message || error));
    }
  }

  try {
    withScriptLock_('finalizeCalendarEventForLead', function () {
      const properties = PropertiesService.getScriptProperties();
      const propertyKey = calendarEventClaimPropertyKey_(lead.id);
      const currentClaim = parseCalendarEventClaim_(properties.getProperty(propertyKey));
      if (currentClaim.token !== claim.token) {
        throw createExpectedOperationError_('Calendar登録の確定権限を失いました。作成イベントを取り消します。', 'CALENDAR_EVENT_CLAIM_LOST');
      }
      const currentLead = getLeadById(lead.id);
      if (String(currentLead.calendar_event_id || '').trim()) {
        throw createExpectedOperationError_('別のCalendarイベントが先に登録されました。作成イベントを取り消します。', 'CALENDAR_EVENT_CONFLICT');
      }
      updateLeadLocked_(lead.id, {
        status: '商談予定',
        meeting_start_at: Utilities.formatDate(eventStartDate, Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
        meeting_end_at: Utilities.formatDate(eventEndDate, Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
        meeting_memo: source.memo || lead.meeting_memo || '',
        calendar_event_id: eventId,
      });
      try {
        properties.deleteProperty(propertyKey);
      } catch (propertyError) {
        logCalendarErrorSafely_('finalizeCalendarEventForLead:claimCleanup', propertyError, {
          target_sheet: 'leads',
          target_id: lead.id,
          calendar_event_id: eventId,
        });
      }
    }, { waitMs: 90000 });
  } catch (error) {
    try {
      event.deleteEvent();
    } catch (rollbackError) {
      logCalendarErrorSafely_('createCalendarEventForLeadRollback', rollbackError, {
        target_sheet: 'leads',
        target_id: lead.id,
        calendar_event_id: eventId,
        original_error: error.message || String(error),
      });
    }
    releaseCalendarEventClaim_(lead.id, claim.token);
    throw error;
  }

  let eventTitle = title;
  try {
    eventTitle = event.getTitle ? event.getTitle() : title;
  } catch (error) {
    eventTitle = title;
  }
  return {
    ok: true,
    existing: recoveredEvent,
    recovered: recoveredEvent,
    eventId: eventId,
    title: eventTitle,
  };
}

function calendarEventClaimMarker_(token) {
  return 'calendar_event_claim:' + requireId_(token);
}

function findCalendarEventByClaim_(calendar, claim, fallbackStart, fallbackEnd) {
  const token = requireId_(claim && claim.token);
  const startDate = new Date(String(claim && claim.recoveryStart || fallbackStart || ''));
  const endDate = new Date(String(claim && claim.recoveryEnd || fallbackEnd || ''));
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) return null;
  const marker = calendarEventClaimMarker_(token);
  const rangeStart = new Date(startDate.getTime() - 60000);
  const rangeEnd = new Date(endDate.getTime() + 60000);
  const events = calendar.getEvents(rangeStart, rangeEnd);
  return (events || []).find(function (event) {
    try {
      return String(event.getDescription ? event.getDescription() : '').indexOf(marker) !== -1;
    } catch (error) {
      return false;
    }
  }) || null;
}

function calendarEventClaimPropertyKey_(leadId) {
  return 'calendar_event_claim:' + requireId_(leadId);
}

function parseCalendarEventClaim_(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function releaseCalendarEventClaim_(leadId, token) {
  try {
    withScriptLock_('releaseCalendarEventForLead', function () {
      const properties = PropertiesService.getScriptProperties();
      const propertyKey = calendarEventClaimPropertyKey_(leadId);
      const currentClaim = parseCalendarEventClaim_(properties.getProperty(propertyKey));
      if (currentClaim.token === token) properties.deleteProperty(propertyKey);
    }, { waitMs: 90000 });
  } catch (error) {
    logCalendarErrorSafely_('releaseCalendarEventForLead', error, {
      target_sheet: 'leads',
      target_id: leadId,
    });
  }
}

function logCalendarErrorSafely_(operation, error, context) {
  try {
    logError_(operation, error, context || {});
  } catch (logError) {
    console.warn(operation + ' logging skipped: ' + (logError.message || String(logError)));
  }
}

function assertCalendarInviteAllowed_(lead, guests) {
  if (!lead || isArchivedLead_(lead)) {
    throw createExpectedOperationError_('営業対象外のためCalendar招待を送信できません。', 'CALENDAR_INVITE_BLOCKED');
  }
  if (isLeadReviewPending_(lead)) {
    throw createExpectedOperationError_('確認待ちのためCalendar招待を送信できません。', 'CALENDAR_INVITE_BLOCKED');
  }
  if (normalizeBooleanLike_(lead.send_ng) || String(lead.status || '') === '送信NG' || String(lead.status || '') === '対応不要') {
    throw createExpectedOperationError_('送信NGまたは対応不要のためCalendar招待を送信できません。', 'CALENDAR_INVITE_BLOCKED');
  }
  const guestEmails = extractEmailsFromMessageHeader_(guests);
  if (!guestEmails.length || guestEmails.some(function (email) { return !isValidEmailAddress_(email); })) {
    throw createExpectedOperationError_('Calendar招待先のメールアドレスが無効です。', 'CALENDAR_INVITE_BLOCKED');
  }
  const masterContext = buildMasterBlockContext_();
  for (let index = 0; index < guestEmails.length; index += 1) {
    const blocked = isLeadBlockedByMastersInContext_(Object.assign({}, lead, {
      email: guestEmails[index],
      email_domain: extractDomainFromEmail_(guestEmails[index]),
    }), masterContext);
    if (blocked.blocked) {
      throw createExpectedOperationError_(blocked.reason || 'Calendar招待先が送信除外です。', 'CALENDAR_INVITE_BLOCKED');
    }
  }
}

const SYNC_FILLABLE_LEAD_FIELDS_ = Object.freeze([
  'company_name',
  'facility_name',
  'contact_name',
  'contact_email',
  'email',
  'phone',
  'website_url',
  'form_url',
  'address',
  'genre',
  'notes',
  'source_id',
  'external_id',
]);

function importLeadsFromCsv(csvText, options) {
  const input = options && typeof options === 'object' ? options : {};
  const rows = Utilities.parseCsv(String(csvText || ''));
  if (rows.length < 2) throw new Error('CSV must include a header row and at least one data row.');
  const headers = rows[0].map(function (header) {
    return normalizeCsvHeader_(header);
  });
  const result = {
    added: 0,
    filled: 0,
    filledFields: 0,
    skipped: 0,
    errors: [],
  };

  rows.slice(1).forEach(function (row, index) {
    if (isBlankCsvDataRow_(row)) return;
    const raw = {};
    headers.forEach(function (header, columnIndex) {
      if (header) raw[header] = row[columnIndex] || '';
    });
    try {
      const outcome = withScriptLock_('importLeadsFromCsv:item', function () {
        return upsertSyncLeadLocked_(raw, input);
      }, { waitMs: 90000 });
      if (outcome.action === 'added') result.added += 1;
      if (outcome.action === 'filled') {
        result.filled += 1;
        result.filledFields += Number(outcome.filledFields || 0);
      }
      if (outcome.action === 'skipped') result.skipped += 1;
    } catch (error) {
      result.errors.push({
        row: index + 2,
        code: String(error.code || ''),
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

  result.added_count = result.added;
  result.filled_count = result.filled;
  result.duplicate_skip_count = result.skipped;
  result.error_count = result.errors.length;

  appendSheetRecord_('sync_logs', {
    event_type: 'csv_import',
    operation: 'importLeadsFromCsv',
    source: String(input.source || 'csv'),
    status: result.errors.length > 0 ? 'completed_with_errors' : 'completed',
    target_sheet: 'leads',
    target_id: '',
    level: result.errors.length > 0 ? 'warn' : 'info',
    added_count: result.added,
    filled_count: result.filled,
    duplicate_skip_count: result.skipped,
    excluded_count: 0,
    error_count: result.errors.length,
    message: 'CSV import completed. added=' + result.added + ', filled=' + result.filled + ', skipped=' + result.skipped + ', errors=' + result.errors.length,
    stack: '',
    context_json: safeJsonStringify_(result),
  });

  return result;
}

function isBlankCsvDataRow_(row) {
  return !Array.isArray(row) || !row.some(function (value) {
    return String(value == null ? '' : value).trim() !== '';
  });
}

function startLeadCsvImport(csvText, options) {
  const input = options && typeof options === 'object' ? options : {};
  const csvSource = String(csvText || '');
  const rows = Utilities.parseCsv(csvSource);
  if (rows.length < 2) throw new Error('CSV must include a header row and at least one data row.');
  const headers = rows[0].map(function (header) {
    return normalizeCsvHeader_(header);
  });
  if (!headers.some(Boolean)) throw new Error('CSV header row does not contain supported columns.');
  const dataRows = rows.slice(1).map(function (row, index) {
    return { row: row, sourceRowNumber: index + 2 };
  }).filter(function (item) {
    return !isBlankCsvDataRow_(item.row);
  });
  if (!dataRows.length) throw new Error('CSV does not contain any non-empty data rows.');
  if (dataRows.length > 20000) {
    throw createExpectedOperationError_('CSVは1回20,000行までです。ファイルを分割して取り込んでください。', 'CSV_IMPORT_TOO_LARGE');
  }

  const jobId = Utilities.getUuid();
  const source = String(input.source || 'csv_upload').trim() || 'csv_upload';
  const jobOptions = {
    source: source,
    allow_duplicate: input.allow_duplicate === true || input.allowDuplicate === true,
  };
  const requestKey = buildLeadCsvImportRequestKey_(csvSource, jobOptions);
  const rawRecords = dataRows.map(function (item) {
    const raw = {};
    headers.forEach(function (header, columnIndex) {
      if (header) raw[header] = item.row[columnIndex] || '';
    });
    const rowJson = safeJsonStringify_(raw);
    if (rowJson.length > 45000) {
      throw createExpectedOperationError_('CSVの' + item.sourceRowNumber + '行目が長すぎます。1行を45,000文字未満にしてください。', 'CSV_IMPORT_ROW_TOO_LARGE');
    }
    return {
      id: Utilities.getUuid(),
      import_job_id: jobId,
      source_row_number: item.sourceRowNumber,
      row_json: rowJson,
      status: 'queued',
      result_json: '',
      error_message: '',
    };
  });

  const queued = withScriptLock_('startLeadCsvImport', function () {
    const existing = findReusableLeadCsvImportJob_(requestKey);
    if (existing) return { job: existing, reused: true };
    const preparationStartedAt = nowIso_();
    const job = appendSheetRecord_('jobs', {
      id: jobId,
      job_type: 'csv_import',
      status: 'preparing',
      request_key: requestKey,
      source: source,
      payload_json: safeJsonStringify_({ options: jobOptions }),
      cursor_json: safeJsonStringify_({ nextRow: 0 }),
      total_count: rawRecords.length,
      processed_count: 0,
      added_count: 0,
      filled_count: 0,
      duplicate_skip_count: 0,
      excluded_count: 0,
      error_count: 0,
      found_results_json: '',
      current_query: 'CSV取込 ' + rawRecords.length + '件',
      last_error: '',
      lock_token: 'prepare:' + jobId,
      locked_at: preparationStartedAt,
      last_heartbeat_at: preparationStartedAt,
      attempt_count: 0,
      started_at: preparationStartedAt,
      finished_at: '',
    });
    return { job: job, reused: false };
  }, { waitMs: 90000 });

  if (queued.reused) {
    const reusedTrigger = ensureBackgroundJobTriggerBestEffort_();
    return Object.assign({}, queued.job, {
      queued: String(queued.job.status || '') === 'queued',
      preparing: String(queued.job.status || '') === 'preparing',
      reused: true,
      duplicatePrevented: true,
      total: Number(queued.job.total_count || rawRecords.length),
      triggerWarning: reusedTrigger.warning || '',
    });
  }

  try {
    // Keep individual lock holds short. A 20,000-row import must not block a
    // review decision or mail finalization for the entire bulk write.
    for (let offset = 0; offset < rawRecords.length; offset += 500) {
      const chunk = rawRecords.slice(offset, offset + 500);
      withScriptLock_('startLeadCsvImport:appendRawChunk', function () {
        appendSheetRecords_('raw_import', chunk);
        updateSheetRecord_('jobs', queued.job.id, {
          last_heartbeat_at: nowIso_(),
          current_query: 'CSV準備 ' + Math.min(offset + chunk.length, rawRecords.length) + ' / ' + rawRecords.length,
        });
      }, { waitMs: 90000 });
    }
    queued.job = withScriptLock_('startLeadCsvImport:finalize', function () {
      return updateSheetRecord_('jobs', queued.job.id, {
        status: 'queued',
        current_query: 'CSV取込 ' + rawRecords.length + '件',
        last_error: '',
        lock_token: '',
        locked_at: '',
        last_heartbeat_at: nowIso_(),
      });
    }, { waitMs: 90000 });
  } catch (error) {
    try {
      withScriptLock_('startLeadCsvImport:fail', function () {
        updateSheetRecord_('jobs', queued.job.id, {
          status: 'failed',
          last_error: String(error.message || error).slice(0, 4000),
          lock_token: '',
          locked_at: '',
          last_heartbeat_at: nowIso_(),
          finished_at: nowIso_(),
        });
      }, { waitMs: 90000 });
    } catch (finalizeError) {
      console.error('CSV import failure state could not be saved: ' + String(finalizeError.message || finalizeError));
    }
    throw error;
  }

  const triggerResult = ensureBackgroundJobTriggerBestEffort_();
  return Object.assign({}, queued.job, {
    queued: true,
    preparing: false,
    reused: false,
    duplicatePrevented: false,
    total: rawRecords.length,
    triggerWarning: triggerResult.warning || '',
  });
}

function buildLeadCsvImportRequestKey_(csvText, options) {
  const input = options && typeof options === 'object' ? options : {};
  return 'csv:' + computeRequestDigest_(safeJsonStringify_({
    source: String(input.source || 'csv_upload'),
    allow_duplicate: input.allow_duplicate === true,
  }) + '\n' + String(csvText || ''));
}

function findReusableLeadCsvImportJob_(requestKey) {
  const key = String(requestKey || '').trim();
  if (!key) return null;
  const candidates = readAllSheetRecordsByName_('jobs', { includeInactive: true, includeArchived: true }).filter(function (job) {
    return String(job.job_type || '') === 'csv_import' &&
      ['preparing', 'queued', 'running'].indexOf(String(job.status || '')) !== -1 &&
      String(job.request_key || '') === key;
  });
  for (let index = 0; index < candidates.length; index += 1) {
    const job = candidates[index];
    if (String(job.status || '') === 'preparing' && isCsvImportPreparationStale_(job)) {
      updateSheetRecord_('jobs', job.id, {
        status: 'failed',
        last_error: 'CSV準備処理が中断されたため終了しました。もう一度取り込んでください。',
        lock_token: '',
        locked_at: '',
        last_heartbeat_at: nowIso_(),
        finished_at: nowIso_(),
      });
      continue;
    }
    return job;
  }
  return null;
}

function isCsvImportPreparationStale_(job, nowMs) {
  const source = job && typeof job === 'object' ? job : {};
  const heartbeatMs = new Date(source.last_heartbeat_at || source.locked_at || source.updated_at || source.created_at || 0).getTime();
  return !Number.isFinite(heartbeatMs) || (Number(nowMs) || Date.now()) - heartbeatMs >= 15 * 60 * 1000;
}

function recoverStaleCsvPreparationJobs_() {
  return withScriptLock_('recoverStaleCsvPreparationJobs', function () {
    const staleJobs = readAllSheetRecordsByName_('jobs', { includeInactive: true, includeArchived: true }).filter(function (job) {
      return String(job.job_type || '') === 'csv_import' &&
        String(job.status || '') === 'preparing' &&
        isCsvImportPreparationStale_(job);
    });
    staleJobs.forEach(function (job) {
      updateSheetRecord_('jobs', job.id, {
        status: 'failed',
        last_error: 'CSV準備処理が中断されたため終了しました。もう一度取り込んでください。',
        lock_token: '',
        locked_at: '',
        last_heartbeat_at: nowIso_(),
        finished_at: nowIso_(),
      });
    });
    return staleJobs.length;
  }, { waitMs: 90000 });
}

function advanceLeadCsvImportJob(jobId, options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxItems = Math.min(Math.max(Number(input.maxItems) || 250, 1), 1000);
  const runtimeBudgetMs = Math.min(Math.max(Number(input.runtimeBudgetMs) || 240000, 10000), 330000);
  const runWindow = buildSearchJobRunWindow_(runtimeBudgetMs, Date.now());
  const claim = claimLeadCsvImportJobRun_(jobId, runtimeBudgetMs);
  if (!claim.claimed) {
    return {
      job: claim.job,
      claimed: false,
      busy: claim.busy,
      completed: String((claim.job || {}).status || '') === 'completed',
      reason: claim.reason,
      processed: Number((claim.job || {}).processed_count || 0),
      total: Number((claim.job || {}).total_count || 0),
      errors: Number((claim.job || {}).error_count || 0),
      resumable: ['preparing', 'queued', 'running'].indexOf(String((claim.job || {}).status || '')) !== -1,
    };
  }

  const job = claim.job;
  const payload = parseJsonObjectSafe_(job.payload_json);
  const jobOptions = payload.options && typeof payload.options === 'object' ? payload.options : {};
  const pendingRows = listRawImportRowsForJob_(job.id).filter(function (row) {
    return String(row.status || 'queued') === 'queued';
  }).slice(0, maxItems);
  let infrastructureError = '';

  for (let index = 0; index < pendingRows.length; index += 1) {
    if (isSearchJobRuntimeExhausted_(runWindow.deadlineMs)) break;
    const rawImport = pendingRows[index];
    try {
      withScriptLock_('advanceLeadCsvImportJob:item', function () {
        const latest = findSheetRecordById_('raw_import', rawImport.id);
        if (!latest || String(latest.status || 'queued') !== 'queued') return;
        const raw = parseJsonObjectSafe_(latest.row_json);
        try {
          const outcome = upsertSyncLeadLocked_(raw, Object.assign({}, jobOptions, { import_row_id: latest.id }));
          updateSheetRecord_('raw_import', latest.id, {
            status: 'completed',
            result_json: safeJsonStringify_({
              action: String(outcome.action || 'skipped'),
              filledFields: Number(outcome.filledFields || 0),
              fields: Array.isArray(outcome.fields) ? outcome.fields : [],
              leadId: outcome.lead ? String(outcome.lead.id || '') : '',
            }),
            error_message: '',
          });
        } catch (error) {
          if (isRetryableCsvImportError_(error)) throw error;
          updateSheetRecord_('raw_import', latest.id, {
            status: 'failed',
            result_json: safeJsonStringify_({ action: 'error', code: String(error.code || '') }),
            error_message: String(error.message || error).slice(0, 4000),
          });
        }
      }, { waitMs: 90000 });
    } catch (error) {
      infrastructureError = String(error.message || error);
      appendSyncError_('advanceLeadCsvImportJob', error, {
        target_sheet: 'jobs',
        target_id: job.id,
      });
      break;
    }
  }

  const summary = summarizeLeadCsvImportRows_(listRawImportRowsForJob_(job.id));
  const completed = summary.processed >= summary.total;
  const now = nowIso_();
  const update = updateClaimedLeadCsvImportJob_(job.id, claim.lockToken, {
    status: completed ? 'completed' : 'queued',
    cursor_json: safeJsonStringify_({ nextRow: summary.processed }),
    total_count: summary.total,
    processed_count: summary.processed,
    added_count: summary.added,
    filled_count: summary.filled,
    duplicate_skip_count: summary.skipped,
    error_count: summary.errors,
    found_results_json: safeJsonStringify_(summary),
    current_query: completed ? 'CSV取込完了' : 'CSV取込 ' + summary.processed + ' / ' + summary.total,
    last_error: infrastructureError,
    finished_at: completed ? now : '',
  }, true);

  if (completed && update.owned) {
    try {
      withScriptLock_('logLeadCsvImportCompletion', function () {
        appendSheetRecord_('sync_logs', {
          event_type: 'csv_import',
          operation: 'startLeadCsvImport',
          source: String(job.source || jobOptions.source || 'csv_upload'),
          status: summary.errors > 0 ? 'completed_with_errors' : 'completed',
          target_sheet: 'leads',
          target_id: job.id,
          level: summary.errors > 0 ? 'warn' : 'info',
          added_count: summary.added,
          filled_count: summary.filled,
          duplicate_skip_count: summary.skipped,
          excluded_count: 0,
          error_count: summary.errors,
          message: 'Background CSV import completed. added=' + summary.added + ', filled=' + summary.filled + ', skipped=' + summary.skipped + ', errors=' + summary.errors,
          stack: '',
          context_json: safeJsonStringify_(summary),
        });
      }, { waitMs: 90000 });
    } catch (error) {
      console.warn('CSV import completion log skipped: ' + String(error.message || error));
    }
  }

  return Object.assign({
    job: update.record || job,
    claimed: true,
    busy: false,
    completed: completed,
    resumable: !completed,
    stoppedForRuntime: !completed && isSearchJobRuntimeExhausted_(runWindow.deadlineMs),
  }, summary);
}

function isRetryableCsvImportError_(error) {
  const code = String((error && error.code) || '').trim();
  if (code === 'SPREADSHEET_UNAVAILABLE') return true;
  const message = String((error && error.message) || error || '');
  return /lock.*timeout|ロック.*タイムアウト|service invoked too many times|service (?:spreadsheets|sheets|drive).*failed|internal error|timed? out|一時的|try again|exceeded maximum execution time|quota exceeded/i.test(message);
}

function claimLeadCsvImportJobRun_(jobId, runtimeBudgetMs) {
  return withScriptLock_('claimLeadCsvImportJobRun', function () {
    const job = findSheetRecordById_('jobs', jobId);
    if (!job) throw new Error('CSV import job not found: ' + jobId);
    if (String(job.job_type || '') !== 'csv_import') throw new Error('Not a CSV import job: ' + jobId);
    const status = String(job.status || 'queued');
    if (status === 'preparing') {
      return { claimed: false, busy: true, job: job, reason: 'preparing' };
    }
    if (status === 'completed' || status === 'failed' || status === 'paused') {
      return { claimed: false, busy: false, job: job, reason: status };
    }
    const lockedAtMs = new Date(job.locked_at || 0).getTime();
    const leaseMs = Math.max(420000, Number(runtimeBudgetMs || 240000) + 90000);
    const activeClaim = status === 'running' && job.lock_token && Number.isFinite(lockedAtMs) && Date.now() - lockedAtMs < leaseMs;
    if (activeClaim) return { claimed: false, busy: true, job: job, reason: 'already_running' };
    const now = nowIso_();
    const lockToken = Utilities.getUuid();
    const claimedJob = updateSheetRecord_('jobs', job.id, {
      status: 'running',
      lock_token: lockToken,
      locked_at: now,
      last_heartbeat_at: now,
      attempt_count: Number(job.attempt_count || 0) + 1,
      started_at: job.started_at || now,
      finished_at: '',
      last_error: '',
    });
    return { claimed: true, busy: false, job: claimedJob, lockToken: lockToken, reason: status === 'running' ? 'stale_recovery' : 'claimed' };
  }, { waitMs: 90000 });
}

function updateClaimedLeadCsvImportJob_(jobId, lockToken, patch, release) {
  return withScriptLock_('updateClaimedLeadCsvImportJob', function () {
    const current = findSheetRecordById_('jobs', jobId);
    if (!current || String(current.lock_token || '') !== String(lockToken || '')) {
      return { owned: false, record: current || null };
    }
    const nextPatch = Object.assign({}, patch || {});
    if (release === true) {
      nextPatch.lock_token = '';
      nextPatch.locked_at = '';
      nextPatch.last_heartbeat_at = nowIso_();
    }
    return {
      owned: true,
      record: updateSheetRecord_('jobs', jobId, nextPatch),
    };
  }, { waitMs: 90000 });
}

function listRawImportRowsForJob_(jobId) {
  const targetId = requireId_(jobId);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'raw_import');
  const headers = getHeaders_(sheet);
  const jobColumnIndex = headers.indexOf('import_job_id');
  const lastRow = sheet.getLastRow();
  if (jobColumnIndex === -1 || lastRow < 2) return [];
  const matches = sheet
    .getRange(2, jobColumnIndex + 1, lastRow - 1, 1)
    .createTextFinder(targetId)
    .matchEntireCell(true)
    .matchCase(true)
    .useRegularExpression(false)
    .findAll();
  if (!matches.length) return [];
  const rowNumbers = matches.map(function (range) { return range.getRow(); }).sort(function (a, b) { return a - b; });
  const startRow = rowNumbers[0];
  const endRow = rowNumbers[rowNumbers.length - 1];
  return sheet.getRange(startRow, 1, endRow - startRow + 1, headers.length).getValues()
    .map(function (row, index) {
      const record = rowToRecord_(headers, row);
      record._row_number = startRow + index;
      return record;
    })
    .filter(function (record) {
      return String(record.import_job_id || '') === targetId;
    })
    .sort(function (left, right) {
      return Number(left.source_row_number || left._row_number || 0) - Number(right.source_row_number || right._row_number || 0);
    });
}

function summarizeLeadCsvImportRows_(rows) {
  const summary = { total: 0, processed: 0, added: 0, filled: 0, filledFields: 0, skipped: 0, errors: 0 };
  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    summary.total += 1;
    const status = String(row.status || 'queued');
    if (status !== 'completed' && status !== 'failed') return;
    summary.processed += 1;
    const result = parseJsonObjectSafe_(row.result_json);
    const action = String(result.action || (status === 'failed' ? 'error' : 'skipped'));
    if (action === 'added') summary.added += 1;
    else if (action === 'filled') {
      summary.filled += 1;
      summary.filledFields += Number(result.filledFields || 0);
    } else if (action === 'error' || status === 'failed') summary.errors += 1;
    else summary.skipped += 1;
  });
  return summary;
}

function upsertSyncLeadLocked_(raw, options) {
  const input = options && typeof options === 'object' ? options : {};
  const leadInput = buildSyncLeadInput_(raw, input);
  const importRowId = String(input.import_row_id || input.importRowId || '').trim();
  if (importRowId) {
    leadInput.import_row_id = importRowId;
    const importSheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
    const importMatches = findLeadRecordsByExactColumnValue_(importSheet, getHeaders_(importSheet), 'import_row_id', importRowId, true);
    if (importMatches.length > 1) {
      throw createExpectedOperationError_('同じCSV取込行IDを持つ営業先が複数あります。', 'CSV_IMPORT_IDEMPOTENCY_CONFLICT');
    }
    if (importMatches.length === 1) {
      return { action: 'skipped', lead: importMatches[0], filledFields: 0, reused: true };
    }
  }
  const allowDuplicate = input.allow_duplicate === true || input.allowDuplicate === true;
  if (allowDuplicate) {
    return { action: 'added', lead: createLeadLocked_(Object.assign({}, leadInput, { allow_duplicate: true })) };
  }

  const candidate = normalizeLeadInput_(leadInput, true);
  applyLeadDerivedFields_(candidate);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const existing = findSyncLeadMatchLocked_(sheet, candidate);
  if (!existing) {
    return { action: 'added', lead: createLeadLocked_(leadInput) };
  }

  const patch = buildSyncFillPatch_(existing, candidate);
  const fields = Object.keys(patch);
  if (!fields.length) {
    return { action: 'skipped', lead: existing, filledFields: 0 };
  }

  return {
    action: 'filled',
    lead: updateLeadLocked_(existing.id, patch),
    filledFields: fields.length,
    fields: fields,
  };
}

function buildSyncLeadInput_(raw, options) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const input = options && typeof options === 'object' ? options : {};
  const result = {};
  SYNC_FILLABLE_LEAD_FIELDS_.forEach(function (field) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) return;
    const value = String(source[field] === undefined || source[field] === null ? '' : source[field]).trim();
    if (value) result[field] = value;
  });

  ['email', 'contact_email'].forEach(function (field) {
    const value = String(result[field] || '').trim();
    if (!value || (!/^https?:\/\//i.test(value) && !/^www\./i.test(value))) return;
    if (!result.form_url) result.form_url = value;
    delete result[field];
  });
  result.source = String(source.source || input.source || 'csv').trim() || 'csv';
  return result;
}

function buildSyncFillPatch_(existing, candidate) {
  const patch = {};
  SYNC_FILLABLE_LEAD_FIELDS_.forEach(function (field) {
    const currentValue = existing ? existing[field] : '';
    const nextValue = candidate ? candidate[field] : '';
    if (String(currentValue === undefined || currentValue === null ? '' : currentValue).trim()) return;
    if (!String(nextValue === undefined || nextValue === null ? '' : nextValue).trim()) return;
    patch[field] = nextValue;
  });
  return patch;
}

function findSyncLeadMatchLocked_(sheet, candidate) {
  const headers = getHeaders_(sheet);
  const sourceMatches = candidate.source && candidate.source_id
    ? findLeadRecordsByExactColumnValue_(sheet, headers, 'source_id', candidate.source_id, true).filter(function (lead) {
        return String(lead.source || '') === String(candidate.source || '');
      })
    : [];
  const emailMatches = candidate.email
    ? findLeadRecordsByExactColumnValue_(sheet, headers, 'email', candidate.email, false)
    : [];
  const companyMatches = candidate.normalized_company_name
    ? findLeadRecordsByExactColumnValue_(sheet, headers, 'normalized_company_name', candidate.normalized_company_name, false)
    : [];
  const explicitDomain = firstAvailableDomain_(candidate.website_url, candidate.form_url, '');
  const domainMatches = explicitDomain
    ? findLeadRecordsByExactColumnValue_(sheet, headers, 'website_domain', explicitDomain, false)
    : [];
  return resolveSyncLeadMatch_(sourceMatches, emailMatches, companyMatches, domainMatches);
}

function findLeadRecordsByExactColumnValue_(sheet, headers, columnName, value, matchCase) {
  const text = String(value || '').trim();
  const columnIndex = headers.indexOf(columnName);
  const lastRow = sheet.getLastRow();
  if (!text || columnIndex === -1 || lastRow < 2) return [];
  const seen = {};
  return sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .createTextFinder(text)
    .matchEntireCell(true)
    .matchCase(matchCase === true)
    .useRegularExpression(false)
    .findAll()
    .map(function (range) {
      const row = sheet.getRange(range.getRow(), 1, 1, headers.length).getValues()[0];
      return rowToRecord_(headers, row);
    })
    .filter(function (lead) {
      const id = String(lead.id || '');
      if (!id || seen[id] || isArchivedLead_(lead)) return false;
      seen[id] = true;
      return true;
    });
}

function resolveSyncLeadMatch_(sourceMatches, emailMatches, companyMatches, domainMatches) {
  const resolved = [];
  const addUniqueMatch = function (matches, label) {
    const unique = uniqueLeadRecordsById_(matches);
    if (unique.length > 1) {
      throw createExpectedOperationError_(label + 'が複数の既存営業先に一致したため、自動補完できません。', 'SYNC_AMBIGUOUS_MATCH');
    }
    if (unique.length === 1) resolved.push(unique[0]);
  };

  addUniqueMatch(sourceMatches, '追加元ID');
  addUniqueMatch(emailMatches, 'メールアドレス');

  const companies = uniqueLeadRecordsById_(companyMatches);
  const domains = uniqueLeadRecordsById_(domainMatches);
  const definitive = uniqueLeadRecordsById_(resolved);
  if (definitive.length > 1) {
    throw createExpectedOperationError_('追加元IDとメールアドレスが別々の既存営業先に一致したため、自動補完できません。', 'SYNC_CONFLICTING_IDENTIFIERS');
  }
  if (definitive.length === 1) {
    const definitiveId = String(definitive[0].id || '');
    const companyConflict = companies.length && !companies.some(function (lead) { return String(lead.id || '') === definitiveId; });
    const domainConflict = domains.length && !domains.some(function (lead) { return String(lead.id || '') === definitiveId; });
    if (companyConflict || domainConflict) {
      throw createExpectedOperationError_('入力された会社名またはドメインが、メール・追加元IDとは別の既存営業先に一致しました。', 'SYNC_CONFLICTING_IDENTIFIERS');
    }
    return definitive[0];
  }

  if (companies.length && domains.length) {
    const domainIds = {};
    domains.forEach(function (lead) { domainIds[String(lead.id || '')] = true; });
    const intersection = companies.filter(function (lead) { return domainIds[String(lead.id || '')]; });
    if (intersection.length) {
      addUniqueMatch(intersection, '会社名とドメイン');
    } else {
      throw createExpectedOperationError_('会社名とドメインが別々の既存営業先に一致したため、自動補完できません。', 'SYNC_CONFLICTING_IDENTIFIERS');
    }
  } else if (companies.length) {
    addUniqueMatch(companies, '会社名');
  } else if (domains.length) {
    addUniqueMatch(domains, 'ドメイン');
  }

  const uniqueResolved = uniqueLeadRecordsById_(resolved);
  if (uniqueResolved.length > 1) {
    throw createExpectedOperationError_('入力された識別情報が別々の既存営業先に一致したため、自動補完できません。', 'SYNC_CONFLICTING_IDENTIFIERS');
  }
  return uniqueResolved[0] || null;
}

function uniqueLeadRecordsById_(records) {
  const seen = {};
  return (Array.isArray(records) ? records : []).filter(function (record) {
    const id = String(record && record.id || '');
    if (!id || seen[id]) return false;
    seen[id] = true;
    return true;
  });
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
  recordBackgroundWorkerStatus_('running', { source: input.source || 'trigger' });
  const recoveredSearchJobs = recoverStaleSearchJobs_();
  const recoveredPreparations = recoverStaleCsvPreparationJobs_();
  const maxJobs = Math.min(Math.max(Number(input.maxJobs) || 3, 1), 10);
  const totalRuntimeBudgetMs = Math.min(Math.max(Number(input.runtimeBudgetMs || getSettingValue_('batch_runtime_budget_ms', 300000)) || 300000, 10000), 330000);
  const runWindow = buildSearchJobRunWindow_(totalRuntimeBudgetMs, Date.now());
  const activeSearchJobs = readAllSheetRecordsByName_('search_jobs', { includeInactive: true, includeArchived: true }).filter(function (job) {
    return job.status === 'queued' || job.status === 'running';
  }).map(function (job) {
    return { kind: 'search', job: job };
  });
  const activeImportJobs = readAllSheetRecordsByName_('jobs', { includeInactive: true, includeArchived: true }).filter(function (job) {
    return String(job.job_type || '') === 'csv_import' && (job.status === 'queued' || job.status === 'running');
  }).map(function (job) {
    return { kind: 'csv_import', job: job };
  });
  const activeJobs = activeSearchJobs.concat(activeImportJobs).sort(function (left, right) {
    return String(left.job.updated_at || left.job.created_at || '').localeCompare(String(right.job.updated_at || right.job.created_at || ''));
  });
  const jobs = activeJobs.slice(0, maxJobs);
  const results = [];
  const errors = [];
  let stoppedForRuntime = false;

  for (let index = 0; index < jobs.length; index += 1) {
    if (isSearchJobRuntimeExhausted_(runWindow.deadlineMs)) {
      stoppedForRuntime = true;
      break;
    }
    const queued = jobs[index];
    const job = queued.job;
    let payload = {};
    try {
      const remainingBudgetMs = Math.max(runWindow.deadlineMs - Date.now(), 0);
      if (remainingBudgetMs < 10000) {
        stoppedForRuntime = true;
        break;
      }
      if (queued.kind === 'csv_import') {
        results.push(advanceLeadCsvImportJob(job.id, {
          maxItems: input.csvMaxItems || input.csv_max_items || input.maxItems || 500,
          runtimeBudgetMs: Math.min(totalRuntimeBudgetMs, remainingBudgetMs),
        }));
      } else {
        payload = JSON.parse(job.query_json || '{}');
        results.push(advanceSearchJob(job.id, {
          maxItems: payload.crawl_all ? 1 : (input.maxItems || 5),
          runtimeBudgetMs: Math.min(totalRuntimeBudgetMs, remainingBudgetMs),
        }));
      }
    } catch (error) {
      errors.push({ jobId: job.id, kind: queued.kind, message: error.message || String(error) });
      appendSyncError_('advanceQueuedJobs', error, {
        target_sheet: queued.kind === 'csv_import' ? 'jobs' : 'search_jobs',
        target_id: job.id,
      });
    }
  }

  const completedJobs = results.filter(function (result) { return result.completed; }).length;
  const remainingJobs = Math.max(activeJobs.length - completedJobs, 0);
  let collectionQualityMigration = getLeadCollectionQualityMigrationV215Status_();
  const qualityMigrationMinimumRuntimeMs = 150000;
  let remainingRuntimeMs = Math.max(runWindow.deadlineMs - Date.now(), 0);
  if (!stoppedForRuntime && collectionQualityMigration.pending === true && remainingRuntimeMs >= qualityMigrationMinimumRuntimeMs) {
    try {
      collectionQualityMigration = runLeadCollectionQualityMigrationV215_({ source: input.source || 'trigger' });
    } catch (error) {
      collectionQualityMigration = {
        ok: false,
        pending: true,
        skipped: false,
        reason: 'migration_failed',
        error: error.message || String(error),
      };
      appendSyncError_('runLeadCollectionQualityMigrationV215_:background', error, {
        target_sheet: 'leads',
      });
    }
  } else if (collectionQualityMigration.pending === true) {
    collectionQualityMigration = Object.assign({}, collectionQualityMigration, {
      skipped: true,
      reason: stoppedForRuntime ? 'runtime_exhausted' : 'runtime_reserved',
    });
  }
  let dashboardCacheRefresh = {
    refreshed: false,
    skipped: true,
    reason: stoppedForRuntime ? 'runtime_exhausted' : 'runtime_reserved',
  };
  const dashboardRefreshMinimumRuntimeMs = 90000;
  remainingRuntimeMs = Math.max(runWindow.deadlineMs - Date.now(), 0);
  if (!stoppedForRuntime && remainingRuntimeMs >= dashboardRefreshMinimumRuntimeMs) {
    try {
      dashboardCacheRefresh = refreshDashboardStatsCacheIfDue_({ source: input.source || 'trigger' });
    } catch (error) {
      dashboardCacheRefresh = {
        refreshed: false,
        skipped: false,
        reason: 'refresh_failed',
        error: error.message || String(error),
      };
      appendSyncError_('refreshDashboardStatsCacheIfDue_', error, {
        target_sheet: 'dashboard_cache',
      });
    }
  }
  const response = {
    jobs: results,
    errors: errors,
    elapsedMs: Date.now() - runWindow.startedAtMs,
    stoppedForRuntime: stoppedForRuntime,
    resumable: remainingJobs > 0,
    remainingJobs: remainingJobs,
    recoveredPreparations: recoveredPreparations,
    recoveredSearchJobs: recoveredSearchJobs,
    collectionQualityMigration: collectionQualityMigration,
    dashboardCacheRefresh: dashboardCacheRefresh,
  };
  recordBackgroundWorkerStatus_('idle', {
    source: input.source || 'trigger',
    remainingJobs: remainingJobs,
    recoveredSearchJobs: recoveredSearchJobs.length,
    errorCount: errors.length,
  });
  return response;
}

function isStaleSearchJob_(job, nowMs, staleAfterMs) {
  const source = job && typeof job === 'object' ? job : {};
  if (String(source.status || '') !== 'running') return false;
  const heartbeatMs = new Date(source.last_heartbeat_at || source.locked_at || source.updated_at || source.created_at || 0).getTime();
  const thresholdMs = Math.max(Number(staleAfterMs) || 15 * 60 * 1000, 7 * 60 * 1000);
  return !Number.isFinite(heartbeatMs) || (Number(nowMs) || Date.now()) - heartbeatMs >= thresholdMs;
}

function buildStaleSearchJobRecoveryPatch_(job) {
  const source = job && typeof job === 'object' ? job : {};
  let payload = {};
  let cursor = {};
  try {
    payload = JSON.parse(source.query_json || '{}') || {};
  } catch (error) {
    payload = {};
  }
  try {
    cursor = JSON.parse(source.cursor_json || '{}') || {};
  } catch (error) {
    cursor = {};
  }

  const patch = {
    status: 'queued',
    lock_token: '',
    locked_at: '',
    last_heartbeat_at: nowIso_(),
    finished_at: '',
  };
  let skippedCandidate = false;
  let staleRecoveryCount = 0;
  if (String(payload.job_type || source.job_type || '') === 'source_page') {
    staleRecoveryCount = Math.max(Number(cursor.staleRecoveryCount || cursor.stale_recovery_count) || 0, 0) + 1;
    if (staleRecoveryCount >= 3) {
      const skippedOffset = Math.max(Number(cursor.offset) || 0, 0);
      cursor.offset = skippedOffset + 1;
      cursor.staleRecoveryCount = 0;
      patch.last_error = '同じ候補で3回連続して実行が中断されたため、候補' + (skippedOffset + 1) + 'をスキップして自動再開しました。';
      skippedCandidate = true;
    } else {
      cursor.staleRecoveryCount = staleRecoveryCount;
    }
    patch.cursor_json = safeJsonStringify_(cursor);
  }
  return {
    patch: patch,
    skippedCandidate: skippedCandidate,
    staleRecoveryCount: staleRecoveryCount,
  };
}

function recoverStaleSearchJobs_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const targetId = String(input.jobId || input.job_id || '').trim();
  const nowMs = Date.now();
  const staleAfterMs = Math.max(Number(input.staleAfterMs || input.stale_after_ms) || 15 * 60 * 1000, 7 * 60 * 1000);
  const candidates = readAllSheetRecordsByName_('search_jobs', { includeInactive: true, includeArchived: true }).filter(function (job) {
    if (targetId && String(job.id || '') !== targetId) return false;
    return isStaleSearchJob_(job, nowMs, staleAfterMs);
  });
  const recovered = [];

  candidates.forEach(function (candidate) {
    const result = withScriptLock_('recoverStaleSearchJob', function () {
      const current = findSheetRecordById_('search_jobs', candidate.id);
      if (!current || !isStaleSearchJob_(current, Date.now(), staleAfterMs)) return null;
      const recovery = buildStaleSearchJobRecoveryPatch_(current);
      const updated = updateSheetRecord_('search_jobs', current.id, recovery.patch);
      let cursorOffset = 0;
      try {
        cursorOffset = Math.max(Number(JSON.parse(updated.cursor_json || '{}').offset) || 0, 0);
      } catch (error) {
        cursorOffset = 0;
      }
      return {
        id: current.id,
        processedCount: Number(current.processed_count || 0),
        cursorOffset: cursorOffset,
        skippedCandidate: recovery.skippedCandidate,
        staleRecoveryCount: recovery.staleRecoveryCount,
      };
    }, { waitMs: 90000 });
    if (result) recovered.push(result);
  });
  return recovered;
}

function recordBackgroundWorkerStatus_(status, detail) {
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties || typeof properties.setProperty !== 'function') return;
    properties.setProperty(PROPERTY_KEYS.BACKGROUND_WORKER_STATUS_JSON, JSON.stringify({
      status: String(status || 'idle'),
      updatedAt: nowIso_(),
      detail: detail && typeof detail === 'object' ? detail : {},
    }));
  } catch (error) {
    console.warn('バックグラウンド実行状態を保存できませんでした: ' + String(error.message || error));
  }
}

function getBackgroundWorkerHealth() {
  const properties = PropertiesService.getScriptProperties();
  let worker = {};
  try {
    worker = JSON.parse(String(properties.getProperty(PROPERTY_KEYS.BACKGROUND_WORKER_STATUS_JSON) || '{}')) || {};
  } catch (error) {
    worker = {};
  }
  const activeJobs = readAllSheetRecordsByName_('search_jobs', { includeInactive: true, includeArchived: true }).filter(function (job) {
    return ['queued', 'running'].indexOf(String(job.status || '')) !== -1;
  });
  const triggers = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'advanceQueuedJobs';
  });
  return {
    ok: triggers.length > 0,
    triggerCount: triggers.length,
    activeJobCount: activeJobs.length,
    staleJobIds: activeJobs.filter(function (job) { return isStaleSearchJob_(job); }).map(function (job) { return job.id; }),
    worker: worker,
  };
}

function repairBackgroundJobs(options) {
  const input = options && typeof options === 'object' ? options : {};
  const jobId = String(input.jobId || input.job_id || '').trim();
  const trigger = ensureBackgroundJobTriggerBestEffort_();
  const recoveredSearchJobs = recoverStaleSearchJobs_({ jobId: jobId });
  const recoveredPreparations = recoverStaleCsvPreparationJobs_();
  let runResult = null;
  if (jobId) {
    const job = findSheetRecordById_('search_jobs', jobId);
    if (!job) throw new Error('Search job not found: ' + jobId);
    if (['queued', 'running'].indexOf(String(job.status || '')) !== -1) {
      runResult = advanceSearchJob(jobId, {
        maxItems: 1,
        runtimeBudgetMs: Math.min(Math.max(Number(input.runtimeBudgetMs || input.runtime_budget_ms) || 120000, 60000), 180000),
      });
    }
  } else {
    runResult = advanceQueuedJobs({
      maxJobs: Math.min(Math.max(Number(input.maxJobs) || 1, 1), 3),
      maxItems: 1,
      runtimeBudgetMs: Math.min(Math.max(Number(input.runtimeBudgetMs || input.runtime_budget_ms) || 120000, 60000), 180000),
      source: 'manual_repair',
    });
  }
  return {
    ok: true,
    jobId: jobId,
    trigger: trigger.result,
    triggerWarning: trigger.warning || '',
    recoveredSearchJobs: recoveredSearchJobs,
    recoveredPreparations: recoveredPreparations,
    runResult: runResult,
    health: getBackgroundWorkerHealth(),
  };
}

function ensureBackgroundJobTrigger_() {
  return ensureSingleProjectTrigger_('advanceQueuedJobs', function () {
    return ScriptApp.newTrigger('advanceQueuedJobs').timeBased().everyMinutes(10).create();
  });
}

function ensureBackgroundJobTriggerBestEffort_() {
  try {
    return { result: ensureBackgroundJobTrigger_(), warning: '' };
  } catch (error) {
    const warning = 'バックグラウンド自動再開トリガーを確認できませんでした: ' + String(error.message || error);
    console.warn(warning);
    return { result: null, warning: warning };
  }
}

function ensureReplyCheckTrigger_() {
  return ensureSingleProjectTrigger_('checkRepliesForLeads', function () {
    return ScriptApp.newTrigger('checkRepliesForLeads').timeBased().everyHours(6).create();
  });
}

function ensureAutomaticMailTrigger_() {
  return ensureSingleProjectTrigger_('runScheduledEmailBatch', function () {
    return ScriptApp.newTrigger('runScheduledEmailBatch').timeBased().everyMinutes(10).create();
  });
}

function getProjectTriggerHandlerCount_(handler) {
  try {
    return ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === handler;
    }).length;
  } catch (error) {
    return 0;
  }
}

function ensureSingleProjectTrigger_(handler, createTrigger) {
  const existing = ScriptApp.getProjectTriggers();
  const matches = existing.filter(function (trigger) {
    return trigger.getHandlerFunction() === handler;
  });
  let created = false;
  if (!matches.length) {
    createTrigger();
    created = true;
  }
  const duplicates = matches.slice(1);
  duplicates.forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  return {
    handler: handler,
    created: created,
    removedDuplicates: duplicates.length,
  };
}

function installDefaultTriggers() {
  return withScriptLock_('installDefaultTriggers', function () {
    const ensured = [ensureBackgroundJobTrigger_(), ensureReplyCheckTrigger_(), ensureAutomaticMailTrigger_()];
    clearRuntimeCaches_('triggers');
    return {
      ok: true,
      ensured: ensured,
      triggers: ScriptApp.getProjectTriggers().map(function (trigger) {
        return {
          handler: trigger.getHandlerFunction(),
          type: String(trigger.getEventType()),
        };
      }),
    };
  });
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

const LEAD_MIGRATION_STAGING_SHEET_ = '__leads_migration_staging';

function prepareLeadMigration(input) {
  return withScriptLock_('prepareLeadMigration', function () {
    const source = input && typeof input === 'object' ? input : {};
    const totalRows = Math.max(Number(source.totalRows || source.total_rows) || 0, 0);
    const allowEmpty = source.allowEmpty === true || source.allow_empty === true;
    if (totalRows === 0 && !allowEmpty) {
      throw createExpectedOperationError_('移行予定件数が0件です。全件削除を意図する場合だけ allowEmpty を指定してください。', 'LEAD_MIGRATION_EMPTY_BLOCKED');
    }
    const replace = source.replace === true;
    const spreadsheet = getOrCreateSpreadsheet_();
    const liveSheet = ensureSheet_(spreadsheet, 'leads');
    const headers = getHeaders_(liveSheet);
    const expectedHeaders = SHEET_DEFINITIONS.leads;
    const mismatch = expectedHeaders.find(function (header, index) {
      return headers[index] !== header;
    });

    if (mismatch) {
      throw new Error('leads header mismatch: ' + mismatch);
    }

    const existingRows = countNonBlankSheetRows_(liveSheet, expectedHeaders.length);
    if (existingRows > 0 && !replace) {
      throw new Error('leads already has rows: ' + existingRows);
    }

    const stagingSheet = getLeadMigrationStagingSheet_(spreadsheet, true);
    stagingSheet.getRange(1, 1, stagingSheet.getMaxRows(), stagingSheet.getMaxColumns()).clearContent();
    ensureSheetGridSize_(stagingSheet, Math.max(totalRows + 1, 2), expectedHeaders.length);
    stagingSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    formatHeaderRow_(stagingSheet, expectedHeaders.length);
    stagingSheet.setFrozenRows(1);

    return {
      ok: true,
      totalRows: totalRows,
      existingRows: existingRows,
      replace: replace,
      headers: expectedHeaders,
      stagingSheet: LEAD_MIGRATION_STAGING_SHEET_,
      liveDataPreserved: true,
    };
  }, { waitMs: 90000 });
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
    const sheet = getLeadMigrationStagingSheet_(spreadsheet, false);
    assertLeadMigrationStagingHeaders_(sheet, headers);
    ensureSheetGridSize_(sheet, startRow + rows.length - 1, headers.length);
    const values = rows.map(function (row) {
      return normalizeMigratedLeadRow_(row, headers.length);
    });
    sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
    return {
      ok: true,
      written: values.length,
      startRow: startRow,
      endRow: startRow + values.length - 1,
      stagingSheet: LEAD_MIGRATION_STAGING_SHEET_,
    };
  }, { waitMs: 90000 });
}

function finalizeLeadMigration(input) {
  return withScriptLock_('finalizeLeadMigration', function () {
    const source = input && typeof input === 'object' ? input : {};
    const spreadsheet = getOrCreateSpreadsheet_();
    const liveSheet = ensureSheet_(spreadsheet, 'leads');
    const stagingSheet = getLeadMigrationStagingSheet_(spreadsheet, false);
    const headers = SHEET_DEFINITIONS.leads;
    assertLeadMigrationStagingHeaders_(stagingSheet, headers);
    const migrationRows = readValidatedLeadMigrationRows_(stagingSheet, headers);
    const migratedRows = migrationRows.length;
    const expectedRows = Number(source.expectedRows || source.expected_rows || 0);
    const allowEmpty = source.allowEmpty === true || source.allow_empty === true;
    if (migratedRows === 0 && !allowEmpty) {
      throw createExpectedOperationError_('移行データが0件のため本番切替を停止しました。', 'LEAD_MIGRATION_EMPTY_BLOCKED');
    }
    if (expectedRows > 0 && expectedRows !== migratedRows) {
      throw createExpectedOperationError_('移行件数が一致しません。expected=' + expectedRows + ', actual=' + migratedRows, 'LEAD_MIGRATION_COUNT_MISMATCH');
    }

    const backup = createSpreadsheetBackup();
    const previousValues = liveSheet.getDataRange().getValues();
    const nextValues = [headers].concat(migrationRows);
    try {
      ensureSheetGridSize_(liveSheet, Math.max(nextValues.length, 2), headers.length);
      liveSheet.getRange(1, 1, liveSheet.getMaxRows(), liveSheet.getMaxColumns()).clearContent();
      liveSheet.getRange(1, 1, nextValues.length, headers.length).setValues(nextValues);
      formatHeaderRow_(liveSheet, headers.length);
      liveSheet.setFrozenRows(1);
    } catch (error) {
      try {
        ensureSheetGridSize_(liveSheet, Math.max(previousValues.length, 2), Math.max(previousValues[0] ? previousValues[0].length : 1, 1));
        liveSheet.getRange(1, 1, liveSheet.getMaxRows(), liveSheet.getMaxColumns()).clearContent();
        if (previousValues.length && previousValues[0].length) {
          liveSheet.getRange(1, 1, previousValues.length, previousValues[0].length).setValues(previousValues);
        }
      } catch (rollbackError) {
        logError_('finalizeLeadMigrationRollback', rollbackError, {
          target_sheet: 'leads',
          backup_id: backup.id,
          original_error: error.message || String(error),
        });
      }
      throw error;
    }

    const result = {
      ok: true,
      migratedRows: migratedRows,
      expectedRows: expectedRows,
      source: String(source.source || ''),
      finishedAt: nowIso_(),
      backup: backup,
      liveDataPreservedUntilFinalize: true,
    };

    appendSheetRecord_('sync_logs', {
      event_type: 'migration',
      operation: 'finalizeLeadMigration',
      target_sheet: 'leads',
      target_id: '',
      level: 'info',
      message: 'Lead migration finished. migrated=' + migratedRows + ', expected=' + result.expectedRows,
      stack: '',
      context_json: safeJsonStringify_(result),
    });
    try {
      spreadsheet.deleteSheet(stagingSheet);
    } catch (error) {
      console.warn('Lead migration staging cleanup skipped: ' + String(error.message || error));
    }
    clearRuntimeCaches_('leads');
    return result;
  }, { waitMs: 90000 });
}

function getLeadMigrationStagingSheet_(spreadsheet, createIfMissing) {
  let sheet = spreadsheet.getSheetByName(LEAD_MIGRATION_STAGING_SHEET_);
  if (!sheet && createIfMissing === true) {
    sheet = spreadsheet.insertSheet(LEAD_MIGRATION_STAGING_SHEET_);
  }
  if (!sheet) {
    throw createExpectedOperationError_('移行ステージングがありません。先に prepareLeadMigration を実行してください。', 'LEAD_MIGRATION_NOT_PREPARED');
  }
  return sheet;
}

function assertLeadMigrationStagingHeaders_(sheet, expectedHeaders) {
  const headers = getHeaders_(sheet);
  const mismatch = expectedHeaders.find(function (header, index) {
    return headers[index] !== header;
  });
  if (mismatch || headers.length !== expectedHeaders.length) {
    throw createExpectedOperationError_('移行ステージングの見出しが一致しません。再度 prepareLeadMigration を実行してください。', 'LEAD_MIGRATION_HEADER_MISMATCH');
  }
}

function readValidatedLeadMigrationRows_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues().map(function (row, index) {
    return { values: row, rowNumber: index + 2 };
  }).filter(function (item) {
    return item.values.some(function (cell) { return String(cell == null ? '' : cell).trim() !== ''; });
  });
  const idIndex = headers.indexOf('id');
  const identityIndexes = ['company_name', 'facility_name', 'email', 'form_url'].map(function (header) {
    return headers.indexOf(header);
  });
  const seenIds = {};
  rows.forEach(function (item) {
    const row = item.values;
    const rowNumber = item.rowNumber;
    const id = String(row[idIndex] || '').trim();
    if (!id) throw createExpectedOperationError_('移行データの' + rowNumber + '行目にIDがありません。', 'LEAD_MIGRATION_INVALID_ROW');
    if (seenIds[id]) throw createExpectedOperationError_('移行データに重複IDがあります: ' + id, 'LEAD_MIGRATION_DUPLICATE_ID');
    seenIds[id] = true;
    const hasIdentity = identityIndexes.some(function (columnIndex) {
      return columnIndex >= 0 && String(row[columnIndex] || '').trim() !== '';
    });
    if (!hasIdentity) {
      throw createExpectedOperationError_('移行データの' + rowNumber + '行目に会社名・屋号・メール・フォームURLがありません。', 'LEAD_MIGRATION_INVALID_ROW');
    }
  });
  return rows.map(function (item) { return normalizeMigratedLeadRow_(item.values, headers.length); });
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
