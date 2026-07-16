const TEMPLATE_TEST_FIXED_EMAIL_ = 'yuya1998nu@gmail.com';
const TEMPLATE_TEST_FIXED_NAME_ = '村松侑哉';
const PRODUCTION_SEND_RESERVED_RESULT_ = '送信中';
const DEFAULT_GMAIL_SENDER_NAME_ = '【Ad Clutch】村松 侑哉';

function getDefaultGmailSenderName_() {
  const configured = String(getSettingValue_('gmail_sender_name', DEFAULT_GMAIL_SENDER_NAME_) || '').trim();
  return (configured || DEFAULT_GMAIL_SENDER_NAME_).slice(0, 100);
}

function resolveGmailSenderName_(input) {
  const source = input && typeof input === 'object' ? input : {};
  const requested = String(source.sender_name || source.senderName || '').trim();
  if (!requested || requested === '営業担当') return getDefaultGmailSenderName_();
  return requested.slice(0, 100);
}

function getEmailSendTargetBlockReason_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return '営業対象外のため送信できません。';
  if (isLeadReviewPending_(lead)) return '確認待ちのため、確認済みにするまで送信できません。';
  if (!isValidEmailAddress_(lead.email)) return '有効なメールアドレスがないため送信できません。';
  if (normalizeBooleanLike_(lead.send_ng) || String(lead.status || '') === '送信NG') {
    return '送信NGに指定されているため送信できません。';
  }
  if (normalizeBooleanLike_(lead.reply_checked)) return '返信確認済みのため送信できません。';
  const priorSendReason = getPriorSuccessfulEmailBlockReason_(lead, masterContext);
  if (priorSendReason) return priorSendReason;
  if (String(lead.deal_status || '未設定') !== '未設定') return '商談状態が設定済みのため送信できません。';
  if (SEND_EXCLUDED_STATUSES.indexOf(String(lead.status || '')) !== -1) {
    return '現在のステータスでは送信できません。';
  }
  const blocked = masterContext ? isLeadBlockedByMastersInContext_(lead, masterContext) : isLeadBlockedByMasters_(lead);
  return blocked.blocked ? blocked.reason : '';
}

function isEmailSendTarget_(lead, masterContext) {
  return !getEmailSendTargetBlockReason_(lead, masterContext);
}

function isFormSendTarget_(lead, masterContext) {
  return !getFormSendTargetBlockReason_(lead, masterContext);
}

function getFormSendTargetBlockReason_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return '営業対象外のためフォーム送信できません。';
  if (isLeadReviewPending_(lead)) return '確認待ちのため、確認済みにするまでフォーム送信できません。';
  if (!lead.form_url) return 'フォームURLがないため送信できません。';
  if (isValidEmailAddress_(lead.email)) return 'メール送信対象のためフォーム送信対象外です。';
  if (normalizeBooleanLike_(lead.send_ng) || String(lead.status || '') === '送信NG') return '送信NGに指定されているため送信できません。';
  if (normalizeBooleanLike_(lead.reply_checked) || String(lead.status || '') === '返信あり') return '返信確認済みのため送信できません。';
  if (String(lead.deal_status || '未設定') !== '未設定') return '商談状態が設定済みのため送信できません。';
  if (lead.form_status === '対応済み' || lead.form_status === '対応不要') return 'フォーム対応済みのため送信できません。';
  if (SEND_EXCLUDED_STATUSES.indexOf(String(lead.status || '')) !== -1) return '現在のステータスでは送信できません。';
  const blocked = masterContext ? isLeadBlockedByMastersInContext_(lead, masterContext) : isLeadBlockedByMasters_(lead);
  return blocked.blocked ? blocked.reason : '';
}

function isFormOutreachLead_(lead) {
  if (!lead || isArchivedLead_(lead)) return false;
  if (!lead.form_url) return false;
  if (isValidEmailAddress_(lead.email)) return false;
  return true;
}

function sendLeadEmail(leadId, templateId, options) {
  const input = options && typeof options === 'object' ? options : {};
  const prepared = withScriptLock_('prepareLeadEmailSend', function () {
    return prepareLeadEmailSend_(leadId, templateId, input, false);
  }, { waitMs: 90000 });
  return deliverPreparedLeadEmail_(prepared);
}

function sendLeadEmailBatch(leadIds, templateId, options) {
  const input = options && typeof options === 'object' ? options : {};
  assertProductionMailDeliveryAllowed_(true);
  const batchLimit = Math.min(Math.max(Number(getSettingValue_('email_batch_send_limit', 20)) || 20, 1), 100);
  const ids = Array.from(new Set((Array.isArray(leadIds) ? leadIds : []).map(function (id) {
    return String(id || '').trim();
  }).filter(Boolean))).slice(0, batchLimit);
  if (!ids.length) {
    throw createExpectedOperationError_('送信対象がありません。', 'EMPTY_MAIL_BATCH');
  }

  const results = ids.map(function (id) {
    try {
      const prepared = withScriptLock_('prepareLeadEmailBatchItem', function () {
        return prepareLeadEmailSend_(id, templateId, input, true);
      }, { waitMs: 90000 });
      return deliverPreparedLeadEmail_(prepared);
    } catch (error) {
      if (!isExpectedOperationError_(error)) {
        logError_('sendLeadEmailBatch:item', error, {
          target_sheet: 'leads',
          target_id: id,
        });
      }
      return {
        ok: false,
        blocked: isExpectedOperationError_(error),
        leadId: id,
        errorMessage: error.message || String(error),
      };
    }
  });
  const success = results.filter(function (result) { return result.ok; }).length;
  const blocked = results.filter(function (result) { return result.blocked; }).length;
  return {
    ok: success === results.length,
    total: results.length,
    success: success,
    failed: results.length - success,
    blocked: blocked,
    results: results,
  };
}

function runScheduledEmailBatch(options) {
  const input = options && typeof options === 'object' ? options : {};
  const control = getMailSendingControl_();
  if (!control.enabled) {
    return buildScheduledEmailSkipResult_('mail_disabled', control.reason || '自動送信停止中です。');
  }

  const sendWindow = buildSendWindowStatus_();
  if (sendWindow.enabled === false) {
    return buildScheduledEmailSkipResult_('send_window_disabled', '完全自動送信では送信時間帯の設定が必要です。');
  }
  if (sendWindow.allowed === false) {
    return buildScheduledEmailSkipResult_('outside_send_window', '自動送信時間外です: ' + sendWindow.label);
  }

  const claimed = claimScheduledEmailJob_();
  if (claimed.busy) {
    return buildScheduledEmailSkipResult_('already_running', '別の完全自動送信処理が実行中です。', {
      jobId: claimed.job && claimed.job.id || '',
    });
  }

  const job = claimed.job;
  try {
    const plan = buildScheduledEmailBatchPlan_(input);
    if (plan.blockReason) {
      finalizeScheduledEmailJob_(job.id, {
        status: 'completed',
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        blocked: 0,
        message: plan.blockReason,
      });
      return buildScheduledEmailSkipResult_(plan.blockCode || 'no_targets', plan.blockReason, {
        jobId: job.id,
        plan: sanitizeScheduledEmailPlan_(plan),
      });
    }

    const results = [];
    let success = 0;
    let failed = 0;
    let blocked = 0;
    plan.groups.forEach(function (group) {
      try {
        const batch = sendLeadEmailBatch(group.leadIds, group.templateId, {
          send_type: '初回メール',
          sender_name: getDefaultGmailSenderName_(),
          source: 'automatic_email_trigger',
        });
        success += Number(batch.success || 0);
        failed += Number(batch.failed || 0);
        blocked += Number(batch.blocked || 0);
        Array.prototype.push.apply(results, batch.results || []);
      } catch (error) {
        const expected = isExpectedOperationError_(error);
        failed += group.leadIds.length;
        if (expected) blocked += group.leadIds.length;
        group.leadIds.forEach(function (leadId) {
          results.push({
            ok: false,
            blocked: expected,
            leadId: leadId,
            errorMessage: error.message || String(error),
          });
        });
      }
      heartbeatScheduledEmailJob_(job.id, success + failed, plan.selectedCount);
    });

    const issueMessages = results.filter(function (result) {
      return !result.ok || result.warning;
    }).map(function (result) {
      return result.errorMessage || result.warning;
    }).filter(Boolean);
    const status = success === 0 && failed > 0 ? 'failed' : 'completed';
    const message = '完全自動送信: 成功 ' + success + '件 / 失敗 ' + failed + '件 / 対象外 ' + blocked + '件';
    finalizeScheduledEmailJob_(job.id, {
      status: status,
      total: plan.selectedCount,
      processed: success + failed,
      success: success,
      failed: failed,
      blocked: blocked,
      message: message,
      lastError: issueMessages.slice(0, 5).join(' / '),
    });
    clearRuntimeCaches_('dashboard_stats');
    return {
      ok: failed === 0,
      skipped: false,
      jobId: job.id,
      total: plan.selectedCount,
      success: success,
      failed: failed,
      blocked: blocked,
      groups: sanitizeScheduledEmailPlan_(plan).groups,
      message: message,
    };
  } catch (error) {
    finalizeScheduledEmailJob_(job.id, {
      status: 'failed',
      total: 0,
      processed: 0,
      success: 0,
      failed: 1,
      blocked: 0,
      message: '完全自動送信の実行に失敗しました。',
      lastError: error.message || String(error),
    });
    logError_('runScheduledEmailBatch', error, {
      target_sheet: 'jobs',
      target_id: job.id,
    });
    throw error;
  }
}

function buildScheduledEmailSkipResult_(reason, message, extra) {
  return Object.assign({
    ok: true,
    skipped: true,
    reason: String(reason || 'skipped'),
    message: String(message || ''),
  }, extra || {});
}

function buildScheduledEmailBatchPlan_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const histories = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'));
  const pendingStatus = buildPendingSendReservationStatus_(histories);
  if (pendingStatus.staleCount > 0) {
    return {
      blockCode: 'stale_send_reservations',
      blockReason: '30分以上「送信中」の履歴が' + pendingStatus.staleCount + '件あるため、完全自動送信を停止しました。',
      selectedCount: 0,
      groups: [],
    };
  }

  const safety = buildMailSendSafetyContext_(histories);
  const dailyLimit = Math.min(Math.max(Number(getSettingValue_('gmail_daily_send_limit', 80)) || 80, 1), 100);
  const batchLimit = Math.min(Math.max(Number(getSettingValue_('email_batch_send_limit', 20)) || 20, 1), 100);
  const requestedLimit = Math.min(Math.max(Number(input.maxItems || input.max_items) || batchLimit, 1), batchLimit);
  const mailQuota = MailApp.getRemainingDailyQuota ? Math.max(0, Number(MailApp.getRemainingDailyQuota()) || 0) : dailyLimit;
  const dailyRemaining = Math.max(0, dailyLimit - Number(safety.successfulCountToday || 0) - Number(safety.reservedCountToday || 0));
  const availableSlots = Math.min(requestedLimit, dailyRemaining, mailQuota);
  if (availableSlots <= 0) {
    return {
      blockCode: 'daily_limit_reached',
      blockReason: '本日のメール送信上限に達しています。',
      selectedCount: 0,
      dailyRemaining: dailyRemaining,
      mailQuota: mailQuota,
      groups: [],
    };
  }

  const masterContext = {
    ngMasters: readAllActiveSheetRecords_('ng_masters'),
    excludedDomains: readAllActiveSheetRecords_('excluded_domains'),
    mailSendSafety: safety,
  };
  const templates = readAllActiveSheetRecords_('email_templates').filter(function (template) {
    return String(template.template_type || '') === 'initial' &&
      normalizeBooleanLike_(template.is_production) &&
      String(template.genre || '').trim() &&
      !getTemplateGenreContentMismatchReason_(template);
  });
  if (!templates.length) {
    return {
      blockCode: 'no_production_templates',
      blockReason: '本番ONの初回メールテンプレートがありません。',
      selectedCount: 0,
      dailyRemaining: dailyRemaining,
      mailQuota: mailQuota,
      groups: [],
    };
  }

  const leads = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'leads'));
  const selection = selectScheduledEmailCandidates_(leads, templates, masterContext, availableSlots);
  if (!selection.selected.length) {
    return {
      blockCode: 'no_sendable_targets',
      blockReason: '本番テンプレートとジャンルが一致する未送信の営業先がありません。',
      selectedCount: 0,
      dailyRemaining: dailyRemaining,
      mailQuota: mailQuota,
      groups: [],
    };
  }

  return {
    blockCode: '',
    blockReason: '',
    selectedCount: selection.selected.length,
    dailyRemaining: dailyRemaining,
    mailQuota: mailQuota,
    batchLimit: batchLimit,
    groups: selection.groups,
  };
}

function selectScheduledEmailCandidates_(leads, templates, masterContext, limit) {
  const templateByGenre = {};
  const genreOrder = [];
  (Array.isArray(templates) ? templates : []).forEach(function (template) {
    const genre = String(template.genre || '').trim();
    if (!genre || templateByGenre[genre]) return;
    templateByGenre[genre] = template;
    genreOrder.push(genre);
  });

  const candidates = (Array.isArray(leads) ? leads : []).filter(function (lead) {
    const genre = String(lead.genre || '').trim();
    return Boolean(templateByGenre[genre]) && !isArchivedLead_(lead) && isEmailSendTarget_(lead, masterContext);
  });
  sortLeads_(candidates, 'updated_desc');

  const queues = {};
  genreOrder.forEach(function (genre) { queues[genre] = []; });
  const seenEmails = {};
  candidates.forEach(function (lead) {
    const email = normalizeEmailForSendSafety_(lead.email);
    if (!email || seenEmails[email]) return;
    seenEmails[email] = true;
    queues[String(lead.genre || '').trim()].push(lead);
  });

  const selected = [];
  const safeLimit = Math.max(0, Number(limit) || 0);
  while (selected.length < safeLimit) {
    let added = false;
    genreOrder.forEach(function (genre) {
      if (selected.length >= safeLimit || !queues[genre].length) return;
      selected.push({ lead: queues[genre].shift(), template: templateByGenre[genre] });
      added = true;
    });
    if (!added) break;
  }

  const groupByTemplate = {};
  selected.forEach(function (item) {
    const templateId = String(item.template.id || '').trim();
    if (!groupByTemplate[templateId]) {
      groupByTemplate[templateId] = {
        templateId: templateId,
        templateName: String(item.template.name || ''),
        genre: String(item.template.genre || ''),
        leadIds: [],
      };
    }
    groupByTemplate[templateId].leadIds.push(item.lead.id);
  });

  return {
    selected: selected,
    groups: genreOrder.map(function (genre) {
      const template = templateByGenre[genre];
      return template && groupByTemplate[String(template.id || '').trim()];
    }).filter(Boolean),
  };
}

function sanitizeScheduledEmailPlan_(plan) {
  const source = plan && typeof plan === 'object' ? plan : {};
  return {
    selectedCount: Number(source.selectedCount || 0),
    dailyRemaining: Number(source.dailyRemaining || 0),
    mailQuota: Number(source.mailQuota || 0),
    groups: (source.groups || []).map(function (group) {
      return {
        templateId: String(group.templateId || ''),
        templateName: String(group.templateName || ''),
        genre: String(group.genre || ''),
        count: (group.leadIds || []).length,
      };
    }),
  };
}

function claimScheduledEmailJob_() {
  return withScriptLock_('claimScheduledEmailJob', function () {
    const jobs = readAllSheetRecordsByName_('jobs', { includeInactive: true, includeArchived: true });
    const now = Date.now();
    const running = jobs.filter(function (job) {
      return String(job.job_type || '') === 'automatic_email_send' && String(job.status || '') === 'running';
    }).sort(function (left, right) {
      return String(right.updated_at || right.created_at || '').localeCompare(String(left.updated_at || left.created_at || ''));
    });
    const active = running.find(function (job) {
      const timestamp = new Date(job.last_heartbeat_at || job.updated_at || job.started_at || job.created_at || 0).getTime();
      return Number.isFinite(timestamp) && now - timestamp < 10 * 60 * 1000;
    });
    if (active) return { busy: true, job: active };

    running.forEach(function (job) {
      updateSheetRecord_('jobs', job.id, {
        status: 'failed',
        last_error: '前回の完全自動送信が10分以上更新されなかったため終了しました。',
        finished_at: nowIso_(),
      });
    });

    const startedAt = nowIso_();
    return {
      busy: false,
      job: appendSheetRecord_('jobs', {
        job_type: 'automatic_email_send',
        status: 'running',
        request_key: 'automatic_email_send:' + todayText_() + ':' + startedAt,
        source: 'time_trigger',
        payload_json: safeJsonStringify_({ sendType: 'initial', automatic: true }),
        cursor_json: '',
        total_count: 0,
        processed_count: 0,
        added_count: 0,
        filled_count: 0,
        duplicate_skip_count: 0,
        excluded_count: 0,
        error_count: 0,
        found_results_json: '',
        current_query: '完全自動送信の対象を確認中',
        last_error: '',
        lock_token: '',
        locked_at: startedAt,
        last_heartbeat_at: startedAt,
        attempt_count: 1,
        started_at: startedAt,
        finished_at: '',
      }),
    };
  }, { waitMs: 30000 });
}

function heartbeatScheduledEmailJob_(jobId, processed, total) {
  return withScriptLock_('heartbeatScheduledEmailJob', function () {
    return updateSheetRecord_('jobs', jobId, {
      total_count: Number(total || 0),
      processed_count: Number(processed || 0),
      current_query: '完全自動送信 ' + Number(processed || 0) + ' / ' + Number(total || 0) + '件',
      last_heartbeat_at: nowIso_(),
    });
  }, { waitMs: 30000 });
}

function finalizeScheduledEmailJob_(jobId, summary) {
  const source = summary && typeof summary === 'object' ? summary : {};
  return withScriptLock_('finalizeScheduledEmailJob', function () {
    return updateSheetRecord_('jobs', jobId, {
      status: String(source.status || 'completed'),
      total_count: Number(source.total || 0),
      processed_count: Number(source.processed || 0),
      added_count: Number(source.success || 0),
      excluded_count: Number(source.blocked || 0),
      error_count: Number(source.failed || 0),
      current_query: String(source.message || '完全自動送信が完了しました。'),
      last_error: String(source.lastError || '').slice(0, 5000),
      last_heartbeat_at: nowIso_(),
      finished_at: nowIso_(),
      lock_token: '',
      locked_at: '',
    });
  }, { waitMs: 30000 });
}

function prepareLeadEmailSend_(leadId, templateId, input, requireSendWindow) {
  assertProductionMailDeliveryAllowed_(requireSendWindow === true);
  const lead = getLeadById(leadId);
  const template = templateId ? findSheetRecordById_('email_templates', templateId) : findProductionTemplateForLead_(lead, input.template_type || input.templateType || 'initial');
  if (!template) {
    throw createExpectedOperationError_('Email template not found.', 'MAIL_TEMPLATE_NOT_FOUND');
  }
  validateEmailSendTemplate_(template, lead, input);
  const context = buildMasterBlockContext_();
  const sendBlockReason = getEmailSendTargetBlockReason_(lead, context);
  if (sendBlockReason) throw createExpectedOperationError_(sendBlockReason, 'MAIL_TARGET_BLOCKED');
  assertEmailSendLimitAvailable_({
    includeReservations: true,
    safety: context.mailSendSafety,
  });

  const senderName = resolveGmailSenderName_(input);
  const sendType = input.send_type || input.sendType || '初回メール';
  const rendered = renderTemplateForLead_(template, lead, {
    sender_name: senderName,
    '差出人名': senderName,
  });
  const sentAt = nowIso_();
  const reservation = appendSheetRecord_('send_histories', {
    lead_id: lead.id,
    sent_at: sentAt,
    send_type: sendType,
    to_email: lead.email,
    company_name: lead.company_name,
    facility_name: lead.facility_name,
    genre: lead.genre,
    template_id: template.id,
    template_name: template.name,
    subject: rendered.subject,
    body: rendered.body,
    send_result: PRODUCTION_SEND_RESERVED_RESULT_,
    error_message: '送信結果の確定待ち',
    gmail_message_id: '',
    gmail_thread_id: '',
    sender_name: senderName,
  });
  addProductionSendReservationToSafetyContext_(context.mailSendSafety, reservation);

  return {
    lead: lead,
    template: template,
    senderName: senderName,
    sendType: sendType,
    rendered: rendered,
    sentAt: sentAt,
    reservation: reservation,
    requireSendWindow: requireSendWindow === true,
  };
}

function deliverPreparedLeadEmail_(prepared) {
  const input = prepared && typeof prepared === 'object' ? prepared : {};
  const lead = input.lead || {};
  const rendered = input.rendered || {};
  const reservation = input.reservation || {};
  let sendResult = '成功';
  let errorMessage = '';
  try {
    assertProductionMailDeliveryAllowed_(input.requireSendWindow === true);
    MailApp.sendEmail({
      to: lead.email,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      body: rendered.body,
      name: input.senderName,
    });
  } catch (error) {
    sendResult = '失敗';
    errorMessage = error.message || String(error);
  }

  let history = reservation;
  const trackingErrors = [];
  try {
    const finalized = withScriptLock_('finalizeLeadEmailSend', function () {
      const result = { history: reservation, trackingErrors: [] };
      try {
        result.history = updateSheetRecord_('send_histories', reservation.id, {
          send_result: sendResult,
          error_message: errorMessage,
        });
      } catch (error) {
        result.trackingErrors.push('履歴確定: ' + (error.message || String(error)));
      }

      if (sendResult === '成功') {
        try {
          const nextStatus = input.sendType === '2ヶ月後メール' ? '2ヶ月後メール送信済み' : '初回メール送信済み';
          updateLeadAfterSend_(lead.id, {
            status: nextStatus,
            last_sent_at: input.sentAt,
            send_count: Number(lead.send_count || 0) + 1,
          });
        } catch (error) {
          result.trackingErrors.push('営業先更新: ' + (error.message || String(error)));
        }
      }
      return result;
    }, { waitMs: 90000 });
    history = finalized.history || history;
    Array.prototype.push.apply(trackingErrors, finalized.trackingErrors || []);
  } catch (error) {
    trackingErrors.push('結果反映ロック: ' + (error.message || String(error)));
  }

  if (trackingErrors.length) {
    logError_('sendLeadEmailTracking', new Error(trackingErrors.join(' / ')), {
      target_sheet: 'send_histories',
      target_id: reservation.id,
      lead_id: lead.id,
      send_result: sendResult,
    });
  }

  return {
    ok: sendResult === '成功',
    leadId: lead.id,
    history: history,
    errorMessage: errorMessage,
    warning: trackingErrors.join(' / '),
  };
}

function assertProductionMailDeliveryAllowed_(requireSendWindow) {
  const control = getMailSendingControl_();
  if (!control.enabled) {
    throw createExpectedOperationError_(control.reason || '自動送信停止中です。', 'MAIL_SENDING_DISABLED');
  }
  if (requireSendWindow) {
    const sendWindow = buildSendWindowStatus_();
    if (sendWindow.enabled !== false && sendWindow.allowed === false) {
      throw createExpectedOperationError_('自動送信時間外です: ' + sendWindow.label, 'MAIL_SEND_WINDOW_CLOSED');
    }
  }
}

function buildMailSendSafetyContext_(historyRecords) {
  const histories = Array.isArray(historyRecords)
    ? historyRecords
    : readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'));
  const today = todayText_();
  const sentLeadIds = {};
  const sentEmails = {};
  const reservedLeadIds = {};
  const reservedEmails = {};
  let successfulCountToday = 0;
  let reservedCountToday = 0;
  histories.forEach(function (history) {
    const leadId = String(history.lead_id || '').trim();
    const email = normalizeEmailForSendSafety_(history.to_email || '');
    const historyDate = String(history.sent_at || history.created_at || '').slice(0, today.length);
    if (isSuccessfulProductionSendHistory_(history)) {
      if (leadId) sentLeadIds[leadId] = true;
      if (email) sentEmails[email] = true;
      if (historyDate === today) successfulCountToday += 1;
    } else if (isProductionSendReservationHistory_(history)) {
      if (leadId) reservedLeadIds[leadId] = true;
      if (email) reservedEmails[email] = true;
      if (historyDate === today) reservedCountToday += 1;
    }
  });
  return {
    sentLeadIds: sentLeadIds,
    sentEmails: sentEmails,
    reservedLeadIds: reservedLeadIds,
    reservedEmails: reservedEmails,
    successfulCountToday: successfulCountToday,
    reservedCountToday: reservedCountToday,
  };
}

function isProductionSendReservationHistory_(history) {
  return history &&
    String(history.send_result || '') === PRODUCTION_SEND_RESERVED_RESULT_ &&
    String(history.send_type || '').indexOf('テスト') === -1;
}

function buildPendingSendReservationStatus_(histories, nowMs) {
  const currentMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const pending = (Array.isArray(histories) ? histories : []).filter(isProductionSendReservationHistory_).map(function (history) {
    const timestamp = String(history.sent_at || history.created_at || '').trim();
    const timestampMs = new Date(timestamp || 0).getTime();
    return {
      id: String(history.id || ''),
      leadId: String(history.lead_id || ''),
      toEmail: String(history.to_email || ''),
      timestamp: timestamp,
      ageMinutes: Number.isFinite(timestampMs) ? Math.max(0, Math.floor((currentMs - timestampMs) / 60000)) : null,
    };
  });
  const stale = pending.filter(function (item) {
    return item.ageMinutes === null || item.ageMinutes >= 30;
  });
  pending.sort(function (left, right) {
    return String(left.timestamp || '').localeCompare(String(right.timestamp || ''));
  });
  return {
    count: pending.length,
    staleCount: stale.length,
    oldestAt: pending.length ? pending[0].timestamp : '',
  };
}

function addProductionSendReservationToSafetyContext_(safety, history) {
  if (!safety || !history) return safety;
  safety.reservedLeadIds = safety.reservedLeadIds || {};
  safety.reservedEmails = safety.reservedEmails || {};
  const leadId = String(history.lead_id || '').trim();
  const email = normalizeEmailForSendSafety_(history.to_email || '');
  if (leadId) safety.reservedLeadIds[leadId] = true;
  if (email) safety.reservedEmails[email] = true;
  const today = todayText_();
  if (String(history.sent_at || history.created_at || '').slice(0, today.length) === today) {
    safety.reservedCountToday = Number(safety.reservedCountToday || 0) + 1;
  }
  return safety;
}

function isSuccessfulProductionSendHistory_(history) {
  return history &&
    String(history.send_result || '') === '成功' &&
    String(history.send_type || '').indexOf('テスト') === -1;
}

function countSuccessfulProductionSends_(histories, datePrefix) {
  const prefix = String(datePrefix || '');
  return (histories || []).filter(function (history) {
    return isSuccessfulProductionSendHistory_(history) &&
      (!prefix || String(history.sent_at || history.created_at || '').slice(0, prefix.length) === prefix);
  }).length;
}

function countLeadSendTrackingMismatches_(leads, histories) {
  const successCounts = {};
  (Array.isArray(histories) ? histories : []).forEach(function (history) {
    if (!isSuccessfulProductionSendHistory_(history)) return;
    const leadId = String(history.lead_id || '').trim();
    if (leadId) successCounts[leadId] = (successCounts[leadId] || 0) + 1;
  });
  return (Array.isArray(leads) ? leads : []).filter(function (lead) {
    const leadId = String(lead.id || '').trim();
    const expected = successCounts[leadId] || 0;
    if (!expected) return false;
    return Number(lead.send_count || 0) !== expected;
  }).length;
}

function countSuccessfulProductionSendsOnDate_(datePrefix) {
  return countSuccessfulProductionSends_(
    readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories')),
    datePrefix
  );
}

function normalizeEmailForSendSafety_(email) {
  return String(email || '').trim().toLowerCase();
}

function getPriorSuccessfulEmailBlockReason_(lead, context) {
  if (!lead) return 'Lead is not eligible for email sending.';
  if (lead.last_sent_at) return 'Lead already has a successful send timestamp.';
  if (Number(lead.send_count || 0) > 0) return 'Lead already has successful send count.';
  if (String(lead.status || '').indexOf('送信済み') !== -1) return 'Lead status is already sent.';
  const safety = context && context.mailSendSafety;
  if (!safety) return '';
  const leadId = String(lead.id || '').trim();
  const email = normalizeEmailForSendSafety_(lead.email);
  if (leadId && safety.sentLeadIds && safety.sentLeadIds[leadId]) return 'Lead already has a successful send history.';
  if (email && safety.sentEmails && safety.sentEmails[email]) return 'Email address already has a successful send history.';
  if (leadId && safety.reservedLeadIds && safety.reservedLeadIds[leadId]) return 'Lead already has a pending send reservation.';
  if (email && safety.reservedEmails && safety.reservedEmails[email]) return 'Email address already has a pending send reservation.';
  return '';
}

function validateEmailSendTemplate_(template, lead, options) {
  const input = options && typeof options === 'object' ? options : {};
  if (!lead) throw new Error('Lead is not eligible for email sending.');
  if (!template) throw new Error('Email template not found.');
  if (Object.prototype.hasOwnProperty.call(template, 'active') && normalizeBooleanLike_(template.active) === false) {
    throw new Error('Inactive template cannot be used for email sending.');
  }

  const templateType = String(template.template_type || '').trim();
  const sendType = String(input.send_type || input.sendType || '初回メール').trim();
  if (templateType === 'form') throw new Error('フォーム用テンプレートはメール送信できません。');
  if (templateType === 'followup_2m' || sendType === '2ヶ月後メール') {
    throw new Error('2ヶ月後メールは現在の自動送信では使用しません。');
  }
  if (templateType !== 'initial') throw new Error('メール送信できるテンプレート種別ではありません。');
  if (!normalizeBooleanLike_(template.is_production)) {
    throw new Error('本番ONのテンプレートだけメール送信できます。');
  }
  const mismatchReason = getTemplateGenreContentMismatchReason_(template);
  if (mismatchReason) throw new Error(mismatchReason);

  const templateGenre = String(template.genre || '').trim();
  const leadGenre = String(lead.genre || '').trim();
  if (!templateGenre) throw new Error('テンプレートにジャンルが設定されていません。');
  if (!leadGenre) throw new Error('営業先のジャンルが設定されていません。');
  if (templateGenre !== leadGenre) {
    throw new Error('テンプレートと営業先のジャンルが一致していません。');
  }
}

function getTemplateGenreContentMismatchReason_(template) {
  const genre = String(template && template.genre || '').trim();
  if (!genre) return '';
  const content = [template.subject, template.body].filter(Boolean).join('\n');
  const explicitTargets = [
    { pattern: /温泉(?:宿|旅館)向け/g, genrePattern: /温泉|旅館/, label: '温泉宿' },
    { pattern: /キャンプ(?:施設|場)?向け/g, genrePattern: /キャンプ/, label: 'キャンプ施設' },
    { pattern: /グランピング(?:施設)?向け/g, genrePattern: /グランピング/, label: 'グランピング施設' },
    { pattern: /介護施設向け/g, genrePattern: /介護/, label: '介護施設' },
  ];
  for (let index = 0; index < explicitTargets.length; index += 1) {
    const target = explicitTargets[index];
    target.pattern.lastIndex = 0;
    if (target.pattern.test(content) && !target.genrePattern.test(genre)) {
      return 'テンプレート本文は「' + target.label + '向け」ですが、ジャンルは「' + genre + '」です。内容を修正して再度テスト送信してください。';
    }
  }
  return '';
}

function sendTestEmail(templateId, toEmail, sampleLeadInput) {
  const template = findSheetRecordById_('email_templates', templateId);
  if (!template) throw new Error('Email template not found.');
  const fixedToEmail = TEMPLATE_TEST_FIXED_EMAIL_;
  if (!isValidEmailAddress_(fixedToEmail)) throw new Error('Valid test recipient is required.');
  const sampleLead = Object.assign({
    company_name: TEMPLATE_TEST_FIXED_NAME_,
    facility_name: TEMPLATE_TEST_FIXED_NAME_,
    genre: '美容',
    contact_name: TEMPLATE_TEST_FIXED_NAME_,
    email: fixedToEmail,
    website_url: 'https://example.com',
    form_url: 'https://example.com/contact',
  }, sampleLeadInput || {}, {
    company_name: TEMPLATE_TEST_FIXED_NAME_,
    facility_name: TEMPLATE_TEST_FIXED_NAME_,
    contact_name: TEMPLATE_TEST_FIXED_NAME_,
    email: fixedToEmail,
  });
  const senderName = resolveGmailSenderName_(sampleLead);
  const rendered = renderTemplateForLead_(template, sampleLead, {
    sender_name: senderName,
    '差出人名': senderName,
  });

  const sentAt = nowIso_();
  const subject = '[テスト] ' + rendered.subject;
  const reservation = withScriptLock_('sendTestEmail:prepare', function () {
    assertEmailSendLimitAvailable_();
    return appendSheetRecord_('send_histories', {
      lead_id: sampleLead.id || sampleLead.lead_id || '',
      sent_at: sentAt,
      send_type: 'テスト送信',
      to_email: fixedToEmail,
      company_name: sampleLead.company_name,
      facility_name: sampleLead.facility_name,
      genre: sampleLead.genre,
      template_id: template.id,
      template_name: template.name,
      subject: subject,
      body: rendered.body,
      send_result: '送信中',
      error_message: '',
      gmail_message_id: '',
      gmail_thread_id: '',
      sender_name: senderName,
    });
  }, { waitMs: 90000 });
  let sendResult = '成功';
  let errorMessage = '';

  try {
    MailApp.sendEmail({
      to: fixedToEmail,
      subject: subject,
      htmlBody: rendered.htmlBody,
      body: rendered.body,
      name: senderName,
    });
  } catch (error) {
    sendResult = '失敗';
    errorMessage = error.message || String(error);
  }

  let history = reservation;
  const trackingErrors = [];
  try {
    const finalized = withScriptLock_('sendTestEmail:finalize', function () {
      const result = { history: reservation, trackingErrors: [] };
      try {
        result.history = updateSheetRecord_('send_histories', reservation.id, {
          send_result: sendResult,
          error_message: errorMessage,
        });
      } catch (error) {
        result.trackingErrors.push('履歴確定: ' + (error.message || String(error)));
      }
      if (sendResult === '成功') {
        try {
          updateSheetRecord_('email_templates', templateId, { last_test_sent_at: sentAt });
        } catch (error) {
          result.trackingErrors.push('テンプレート更新: ' + (error.message || String(error)));
        }
      }
      return result;
    }, { waitMs: 90000 });
    history = finalized.history || history;
    Array.prototype.push.apply(trackingErrors, finalized.trackingErrors || []);
  } catch (error) {
    trackingErrors.push('結果反映ロック: ' + (error.message || String(error)));
  }
  if (trackingErrors.length) {
    logError_('sendTestEmailTracking', new Error(trackingErrors.join(' / ')), {
      target_sheet: 'send_histories',
      target_id: reservation.id,
      send_result: sendResult,
    });
  }
  return {
    ok: sendResult === '成功',
    history: history,
    errorMessage: errorMessage,
    warning: trackingErrors.join(' / '),
  };
}

function listLeadSendHistories(leadId, options) {
  const recordId = requireId_(leadId);
  const query = options && typeof options === 'object' ? options : {};
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const histories = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'))
    .filter(function (history) {
      return String(history.lead_id || '') === recordId;
    })
    .sort(function (a, b) {
      return String(b.sent_at || b.created_at || '').localeCompare(String(a.sent_at || a.created_at || ''));
    });

  return {
    leadId: recordId,
    total: histories.length,
    items: histories.slice(0, limit),
  };
}

function importSendHistories(input) {
  const source = input && typeof input === 'object' ? input : {};
  const records = Array.isArray(source.records) ? source.records
    : Array.isArray(source.items) ? source.items
      : Array.isArray(source.histories) ? source.histories
        : [];
  const dryRun = source.dryRun === true || source.dry_run === true;
  if (!records.length) {
    return { ok: true, inserted: 0, existing: 0, skipped: 0, total: 0, dryRun: dryRun };
  }

  return withScriptLock_('importSendHistories', function () {
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'send_histories');
    const headers = getHeaders_(sheet);
    const existing = readSheetRecords_(sheet);
    const existingById = {};
    existing.forEach(function (record) {
      const id = String(record.id || '').trim();
      if (id) existingById[id] = true;
    });

    const inserts = [];
    const incomingIds = {};
    let existingCount = 0;
    let skipped = 0;
    records.forEach(function (record) {
      try {
        const normalized = normalizeSendHistoryImportRecord_(record);
        if (incomingIds[normalized.id]) {
          skipped += 1;
          return;
        }
        incomingIds[normalized.id] = true;
        if (existingById[normalized.id]) {
          existingCount += 1;
        } else {
          inserts.push(normalized);
        }
      } catch (error) {
        skipped += 1;
      }
    });

    if (dryRun) {
      return {
        ok: true,
        inserted: inserts.length,
        existing: existingCount,
        skipped: skipped,
        total: records.length,
        dryRun: true,
      };
    }

    if (inserts.length) {
      const values = inserts.map(function (record) {
        return headers.map(function (header) {
          return valueOrBlank_(record[header]);
        });
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
      clearRuntimeCaches_('send_histories');
    }

    return {
      ok: true,
      inserted: inserts.length,
      existing: existingCount,
      skipped: skipped,
      total: records.length,
      dryRun: false,
    };
  });
}

function normalizeSendHistoryImportRecord_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Send history input must be an object.');
  }
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Send history id is required.');
  const sentAt = String(input.sent_at || input.sentAt || input.created_at || '').trim();
  const createdAt = String(input.created_at || input.createdAt || sentAt || '').trim();
  return {
    id: id,
    lead_id: String(input.lead_id || input.leadId || '').trim(),
    sent_at: sentAt || nowIso_(),
    send_type: String(input.send_type || input.sendType || '初回メール').trim(),
    to_email: String(input.to_email || input.toEmail || '').trim().toLowerCase(),
    company_name: String(input.company_name || input.companyName || '').trim(),
    facility_name: String(input.facility_name || input.facilityName || '').trim(),
    genre: String(input.genre || '').trim(),
    template_id: String(input.template_id || input.templateId || '').trim(),
    template_name: String(input.template_name || input.templateName || '').trim(),
    subject: String(input.subject || '').trim(),
    body: String(input.body || ''),
    send_result: String(input.send_result || input.sendResult || '成功').trim(),
    error_message: String(input.error_message || input.errorMessage || '').trim(),
    gmail_message_id: String(input.gmail_message_id || input.gmailMessageId || '').trim(),
    gmail_thread_id: String(input.gmail_thread_id || input.gmailThreadId || '').trim(),
    sender_name: String(input.sender_name || input.senderName || '').trim(),
    created_at: createdAt || nowIso_(),
  };
}

function updateLeadAfterSend_(leadId, patch) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'leads');
  const found = findRowById_(sheet, leadId);
  if (!found) throw new Error('Lead not found: ' + leadId);
  const headers = getHeaders_(sheet);
  const nextRecord = Object.assign({}, found.record, patch, {
    id: found.record.id,
    created_at: found.record.created_at,
    updated_at: nowIso_(),
  });
  applyLeadDerivedFields_(nextRecord);
  applyLeadStatusSideEffects_(nextRecord, new Set(Object.keys(patch)));
  writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
  clearRuntimeCaches_('leads');
}

function findProductionTemplateForLead_(lead, templateType) {
  const templates = readAllActiveSheetRecords_('email_templates');
  const leadGenre = String(lead && lead.genre || '').trim();
  if (!leadGenre) return null;
  const active = templates.filter(function (template) {
    return template.template_type === templateType && normalizeBooleanLike_(template.is_production);
  });
  return active.find(function (template) {
    return String(template.genre || '').trim() === leadGenre;
  }) || null;
}

function countSuccessfulProductionSendsToday_() {
  return countSuccessfulProductionSendsOnDate_(todayText_());
}

function getRemainingAppMailLimit_() {
  const dailyLimit = Number(getSettingValue_('gmail_daily_send_limit', 80));
  return Math.max(0, dailyLimit - countSuccessfulProductionSendsToday_());
}

function assertEmailSendLimitAvailable_(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dailyLimit = Number(getSettingValue_('gmail_daily_send_limit', 80));
  const safety = input.safety && typeof input.safety === 'object' ? input.safety : null;
  const sentToday = safety ? Number(safety.successfulCountToday || 0) : countSuccessfulProductionSendsToday_();
  const reservedToday = input.includeReservations === true
    ? Number(safety ? safety.reservedCountToday || 0 : countPendingProductionSendReservationsOnDate_(todayText_()))
    : 0;
  const remainingQuota = MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : dailyLimit;

  if (sentToday + reservedToday >= dailyLimit) {
    throw new Error('Daily app mail limit reached: ' + dailyLimit);
  }
  if (remainingQuota <= 0) {
    throw new Error('MailApp remaining daily quota is 0.');
  }
}

function countPendingProductionSendReservationsOnDate_(datePrefix) {
  const prefix = String(datePrefix || '');
  return readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories')).filter(function (history) {
    return isProductionSendReservationHistory_(history) &&
      (!prefix || String(history.sent_at || history.created_at || '').slice(0, prefix.length) === prefix);
  }).length;
}

function isValidEmailAddress_(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value || value.length > 254 || value.indexOf('=') !== -1) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const local = parts[0];
  const domain = parts[1];
  if (local.length < 1 || local.length > 64 || local.charAt(0) === '.' || local.charAt(local.length - 1) === '.' || local.indexOf('..') !== -1) return false;
  if (!/^[a-z0-9.!#$%&'*+/^_`{|}~-]+$/i.test(local)) return false;
  if (/^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster)$/i.test(local)) return false;
  if (/^(?:privacy|personal-?information|kojinjoho|recruit(?:ing)?|careers?|saiyo|jinji|webmaster|abuse|security)(?:[._+-]|$)/i.test(local)) return false;
  if (domain.length > 253 || domain.indexOf('..') !== -1 || !/^[a-z0-9.-]+$/i.test(domain)) return false;
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some(function (label) {
    return !label || label.length > 63 || label.charAt(0) === '-' || label.charAt(label.length - 1) === '-';
  })) return false;
  const topLevelDomain = labels[labels.length - 1];
  if (!/^[a-z]{2,24}$/i.test(topLevelDomain)) return false;
  if (/^(?:jpg|jpeg|png|gif|webp|svg|ico|css|js|json|map|woff2?|ttf|eot|pdf)$/i.test(topLevelDomain)) return false;
  if (/(?:^|\.)(?:window|document|innerwidth|localhost|invalid)(?:\.|$)/i.test(domain)) return false;
  if (/^i\.msgs\.jp$/i.test(domain)) return false;
  if (/^example\.(?:com|org|net)$/i.test(domain)) return false;
  return true;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplateForLead_(template, lead, extraVariables) {
  const replacements = Object.assign(buildLeadTemplateVariables_(lead), extraVariables || {});
  const subject = replaceTemplateVariables_(template.subject || '', replacements);
  const body = replaceTemplateVariables_(template.body || '', replacements);
  const htmlBody = body
    .split('\n')
    .map(function (line) { return escapeHtml_(line); })
    .join('<br>');
  return {
    subject: subject,
    body: body,
    htmlBody: htmlBody,
  };
}

function buildLeadTemplateVariables_(lead) {
  const variables = {
    company_name: lead.company_name || '',
    companyName: lead.company_name || '',
    '会社名': lead.company_name || '',
    facility_name: lead.facility_name || '',
    facilityName: lead.facility_name || '',
    '屋号': lead.facility_name || '',
    genre: lead.genre || '',
    'ジャンル名': lead.genre || '',
    contact_name: lead.contact_name || 'ご担当者',
    contactName: lead.contact_name || 'ご担当者',
    '担当者名': lead.contact_name || 'ご担当者',
    email: lead.email || '',
    'メール': lead.email || '',
    phone: lead.phone || '',
    '電話番号': lead.phone || '',
    website_url: lead.website_url || '',
    websiteUrl: lead.website_url || '',
    'WEBサイトURL': lead.website_url || '',
    form_url: lead.form_url || '',
    formUrl: lead.form_url || '',
    'フォームURL': lead.form_url || '',
    address: lead.address || '',
    '住所': lead.address || '',
  };
  try {
    const customFields = JSON.parse(String(lead.custom_fields_json || '{}'));
    Object.keys(customFields || {}).forEach(function (key) {
      if (variables[key] === undefined) {
        variables[key] = customFields[key];
      }
    });
  } catch (error) {
    // Ignore malformed custom fields and keep standard variables available.
  }
  return variables;
}

function replaceTemplateVariables_(text, variables) {
  return String(text || '').replace(/\{\{\s*([^{}]+?)\s*\}\}/g, function (_, key) {
    const normalizedKey = String(key || '').trim();
    return variables[normalizedKey] === undefined ? '' : String(variables[normalizedKey]);
  });
}
