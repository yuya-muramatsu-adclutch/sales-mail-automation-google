const TEMPLATE_TEST_FIXED_EMAIL_ = 'yuya1998nu@gmail.com';
const TEMPLATE_TEST_FIXED_NAME_ = '村松侑哉';
const PRODUCTION_SEND_RESERVED_RESULT_ = '送信中';
const DEFAULT_GMAIL_SENDER_NAME_ = '【Ad Clutch】村松 侑哉';
const DEFAULT_GMAIL_PRIMARY_SENDER_EMAIL_ = 'yuya.adclutch@gmail.com';
const MAIL_DELIVERY_RECEIPT_PREFIX_ = 'MAIL_DELIVERY_RECEIPT_V1_';
const SCHEDULED_EMAIL_DEFAULT_RUNTIME_BUDGET_MS_ = 240000;
const SCHEDULED_EMAIL_MAX_RUNTIME_BUDGET_MS_ = 240000;

function getDefaultGmailSenderName_() {
  const configured = String(getSettingValue_('gmail_sender_name', DEFAULT_GMAIL_SENDER_NAME_) || '').trim();
  return (configured || DEFAULT_GMAIL_SENDER_NAME_).slice(0, 100);
}

function getConfiguredGmailSenderEmail_() {
  return String(getSettingValue_('gmail_sender_email', '') || '').trim().toLowerCase();
}

function getGmailPrimaryEmail_() {
  try {
    const response = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      },
      muteHttpExceptions: true,
    });
    const statusCode = Number(response.getResponseCode()) || 0;
    if (statusCode < 200 || statusCode >= 300) return DEFAULT_GMAIL_PRIMARY_SENDER_EMAIL_;
    const profile = JSON.parse(response.getContentText() || '{}');
    const email = String(profile.emailAddress || '').trim().toLowerCase();
    return isValidEmailAddress_(email) ? email : DEFAULT_GMAIL_PRIMARY_SENDER_EMAIL_;
  } catch (error) {
    return DEFAULT_GMAIL_PRIMARY_SENDER_EMAIL_;
  }
}

function getGmailSendAsAddresses_() {
  const result = {
    primaryEmail: '',
    aliases: [],
    error: '',
  };
  try {
    const response = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      },
      muteHttpExceptions: true,
    });
    const statusCode = Number(response.getResponseCode()) || 0;
    if (statusCode < 200 || statusCode >= 300) {
      result.error = 'Gmail send-as API HTTP ' + statusCode;
      return result;
    }
    const payload = JSON.parse(response.getContentText() || '{}');
    (Array.isArray(payload.sendAs) ? payload.sendAs : []).forEach(function (item) {
      const email = String(item && item.sendAsEmail || '').trim().toLowerCase();
      if (!isValidEmailAddress_(email)) return;
      if (item.isPrimary === true) {
        result.primaryEmail = email;
        return;
      }
      if (!item.verificationStatus || String(item.verificationStatus).toLowerCase() === 'accepted') {
        result.aliases.push(email);
      }
    });
    result.aliases = Array.from(new Set(result.aliases));
    return result;
  } catch (error) {
    result.error = error.message || String(error);
    return result;
  }
}

function getGmailSenderIdentityStatus_(candidateEmail) {
  const configuredEmail = candidateEmail === undefined
    ? getConfiguredGmailSenderEmail_()
    : String(candidateEmail || '').trim().toLowerCase();
  const sendAs = getGmailSendAsAddresses_();
  const primaryEmail = sendAs.primaryEmail || getGmailPrimaryEmail_();
  const aliases = Array.from(new Set((GmailApp.getAliases() || []).concat(sendAs.aliases || []).map(function (email) {
    return String(email || '').trim().toLowerCase();
  }).filter(function (email) {
    return isValidEmailAddress_(email);
  })));
  const availableEmails = Array.from(new Set([primaryEmail].concat(aliases).filter(function (email) {
    return isValidEmailAddress_(email);
  })));
  const selectedEmail = configuredEmail || primaryEmail;
  const available = !selectedEmail || availableEmails.indexOf(selectedEmail) !== -1;
  return {
    senderName: getDefaultGmailSenderName_(),
    configuredEmail: configuredEmail,
    selectedEmail: selectedEmail,
    primaryEmail: primaryEmail,
    aliases: aliases,
    availableEmails: availableEmails,
    available: available,
    usesAlias: Boolean(configuredEmail && configuredEmail !== primaryEmail),
    diagnosticError: sendAs.error || '',
  };
}

function setGmailSenderEmail(email) {
  const candidate = String(email || '').trim().toLowerCase();
  if (!isValidEmailAddress_(candidate)) {
    throw createExpectedOperationError_('有効な差出人メールアドレスを指定してください。', 'INVALID_GMAIL_SENDER_EMAIL');
  }
  const status = getGmailSenderIdentityStatus_(candidate);
  if (!status.available) {
    throw createExpectedOperationError_('指定したアドレスはGmailの送信元に登録されていません。Gmailの「名前」設定で先に追加してください。', 'GMAIL_SENDER_ALIAS_UNAVAILABLE');
  }
  setSettingValue('gmail_sender_email', candidate, 'string', 'Verified Gmail sender address used by this app.');
  return getGmailSenderIdentityStatus_(candidate);
}

function sendGmailMessage_(message) {
  const source = message && typeof message === 'object' ? message : {};
  const configuredEmail = getConfiguredGmailSenderEmail_();
  if (!configuredEmail) {
    MailApp.sendEmail({
      to: source.to,
      subject: source.subject,
      htmlBody: source.htmlBody,
      body: source.body,
      name: source.name,
    });
    return;
  }

  const options = {
    htmlBody: source.htmlBody,
    name: source.name,
    replyTo: configuredEmail,
  };
  if (configuredEmail !== DEFAULT_GMAIL_PRIMARY_SENDER_EMAIL_) {
    const aliases = (GmailApp.getAliases() || []).map(function (email) {
      return String(email || '').trim().toLowerCase();
    });
    if (aliases.indexOf(configuredEmail) === -1) {
      throw createExpectedOperationError_('設定済みの差出人アドレスがGmailで利用できません: ' + configuredEmail, 'GMAIL_SENDER_ALIAS_UNAVAILABLE');
    }
    options.from = configuredEmail;
  }
  GmailApp.sendEmail(source.to, source.subject, source.body, options);
}

function resolveGmailSenderName_(input) {
  const source = input && typeof input === 'object' ? input : {};
  const requested = String(source.sender_name || source.senderName || '').trim();
  if (!requested || requested === '営業担当') return getDefaultGmailSenderName_();
  return requested.slice(0, 100);
}

function getEmailSendTargetBlockReason_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return '営業対象外のため送信できません。';
  if (isClearlyClosedLead_(lead)) return '閉鎖・営業終了・休業が確認できるため送信できません。';
  if (isLeadLinkDefinitelyBroken_(lead)) return 'リンク切れが確認できるため送信できません。';
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
  if (isClearlyClosedLead_(lead)) return '閉鎖・営業終了・休業が確認できるためフォーム送信できません。';
  if (isLeadLinkDefinitelyBroken_(lead)) return 'リンク切れが確認できるためフォーム送信できません。';
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

function validateFormSendTemplate_(template, lead) {
  if (!template) throw createExpectedOperationError_('フォーム用テンプレートが見つかりません。', 'FORM_TEMPLATE_NOT_FOUND');
  if (Object.prototype.hasOwnProperty.call(template, 'active') && normalizeBooleanLike_(template.active) === false) {
    throw createExpectedOperationError_('無効なフォーム用テンプレートは使用できません。', 'FORM_TEMPLATE_INACTIVE');
  }
  if (String(template.template_type || '') !== 'form') {
    throw createExpectedOperationError_('フォーム営業用テンプレートを選択してください。', 'FORM_TEMPLATE_TYPE_INVALID');
  }
  if (!normalizeBooleanLike_(template.is_production)) {
    throw createExpectedOperationError_('本番ONのフォーム用テンプレートだけ使用できます。', 'FORM_TEMPLATE_NOT_PRODUCTION');
  }
  if (!String(template.body || '').trim()) {
    throw createExpectedOperationError_('フォーム用テンプレートの本文が空です。', 'FORM_TEMPLATE_BODY_EMPTY');
  }
  const templateGenre = String(template.genre || '').trim();
  const leadGenre = String(lead && lead.genre || '').trim();
  const priorityMatch = String(template.id || '') === EMAIL_GENRE_PRIORITY_FORM_TEMPLATE_ID_ &&
    emailGenrePriorityMatches_(templateGenre, EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_) &&
    emailGenrePriorityMatches_(leadGenre, EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_);
  if (templateGenre && templateGenre !== leadGenre && !priorityMatch) {
    throw createExpectedOperationError_('テンプレートと営業先のジャンルが一致していません。', 'FORM_TEMPLATE_GENRE_MISMATCH');
  }
  if (String(template.id || '') === EMAIL_GENRE_PRIORITY_FORM_TEMPLATE_ID_ && String(template.body || '').indexOf(EMAIL_GENRE_PRIORITY_LP_URL_) === -1) {
    throw createExpectedOperationError_('ChatGPT広告フォーム用テンプレートに専用LPが含まれていません。', 'FORM_TEMPLATE_LP_MISSING');
  }
  const mismatchReason = getTemplateGenreContentMismatchReason_(template);
  if (mismatchReason) throw createExpectedOperationError_(mismatchReason, 'FORM_TEMPLATE_CONTENT_MISMATCH');
  return true;
}

function getGlampingChatgptFormSendState_(lead) {
  const customFields = parseJsonObjectSafe_(lead && lead.custom_fields_json);
  const activeEvents = activeFormSendEvents_(formSendEventsFromCustomFields_(customFields));
  const dedicatedEvent = activeEvents.slice().reverse().find(function (event) {
    return String(event.template_id || '') === EMAIL_GENRE_PRIORITY_FORM_TEMPLATE_ID_ ||
      String(event.campaign_key || '') === EMAIL_GENRE_PRIORITY_FORM_CAMPAIGN_KEY_;
  });
  const latestEvent = activeEvents.length ? activeEvents[activeEvents.length - 1] : null;
  const dedicatedAt = String(customFields.glamping_chatgpt_ads_form_sent_at || (dedicatedEvent && dedicatedEvent.at) || '');
  const latestAt = String((latestEvent && latestEvent.at) || customFields.last_form_sent_at || '');
  const recordedCount = Math.max(Number(customFields.form_send_count || 0), activeEvents.length);
  const hasPriorFormSend = recordedCount > 0 || Boolean(latestAt) ||
    String(lead && lead.form_status || '') === '対応済み' || String(lead && lead.status || '') === 'フォーム対応済み';
  return {
    customFields: customFields,
    activeEvents: activeEvents,
    dedicatedAt: dedicatedAt,
    latestAt: latestAt,
    recordedCount: recordedCount,
    hasPriorFormSend: hasPriorFormSend,
  };
}

function hasGlampingChatgptEmailSendOrReservationForLead_(lead) {
  const leadId = String(lead && lead.id || '').trim();
  if (!leadId) return false;
  return findSheetRecordsByExactFieldValues_(
    'send_histories',
    'lead_id',
    [leadId],
    mailSendSafetyHistoryFields_()
  ).some(function (history) {
    return String(history.lead_id || '') === leadId &&
      String(history.template_id || '') === EMAIL_GENRE_PRIORITY_TEMPLATE_ID_ &&
      ['成功', PRODUCTION_SEND_RESERVED_RESULT_].indexOf(String(history.send_result || '')) !== -1;
  });
}

function hasSuccessfulGlampingChatgptEmailSend_(lead, masterContext) {
  const safety = masterContext && masterContext.mailSendSafety;
  if (!safety) return false;
  const leadId = String(lead && lead.id || '').trim();
  const email = normalizeEmailForSendSafety_(lead && lead.email || '');
  return Boolean(
    (leadId && safety.sentTemplateLeadIds && safety.sentTemplateLeadIds[EMAIL_GENRE_PRIORITY_TEMPLATE_ID_ + '\n' + leadId]) ||
    (email && safety.sentTemplateEmails && safety.sentTemplateEmails[EMAIL_GENRE_PRIORITY_TEMPLATE_ID_ + '\n' + email])
  );
}

function getGlampingChatgptFormEligibility_(lead, masterContext, nowMs) {
  const currentMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const intervalMs = EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_ * 24 * 60 * 60 * 1000;
  if (!lead || isArchivedLead_(lead)) return { blockReason: '営業対象外のためフォーム送信できません。', kind: 'blocked' };
  if (!emailGenrePriorityMatches_(lead.genre, EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_)) {
    return { blockReason: 'ChatGPT広告フォームはグランピング施設だけが対象です。', kind: 'blocked' };
  }
  if (isClearlyClosedLead_(lead)) return { blockReason: '閉鎖・営業終了・休業が確認できるためフォーム送信できません。', kind: 'blocked' };
  if (isLeadLinkDefinitelyBroken_(lead)) return { blockReason: 'リンク切れが確認できるためフォーム送信できません。', kind: 'blocked' };
  if (isLeadReviewPending_(lead)) return { blockReason: '確認待ちのため、確認済みにするまでフォーム送信できません。', kind: 'blocked' };
  if (!String(lead.form_url || '').trim()) return { blockReason: 'フォームURLがないため送信できません。', kind: 'blocked' };
  if (isValidEmailAddress_(lead.email)) return { blockReason: '有効なメールアドレスがあるため、ChatGPT広告はメール送信を使用してください。', kind: 'blocked' };
  if (normalizeBooleanLike_(lead.send_ng) || String(lead.status || '') === '送信NG') return { blockReason: '送信NGに指定されているため送信できません。', kind: 'blocked' };
  if (normalizeBooleanLike_(lead.reply_checked) || String(lead.status || '') === '返信あり') return { blockReason: '返信確認済みのため送信できません。', kind: 'blocked' };
  if (String(lead.deal_status || '未設定') !== '未設定') return { blockReason: '商談状態が設定済みのため送信できません。', kind: 'blocked' };
  if (String(lead.form_status || '') === '対応不要' || String(lead.status || '') === '対応不要') {
    return { blockReason: '対応不要に指定されているため送信できません。', kind: 'blocked' };
  }
  if (SEND_EXCLUDED_STATUSES.indexOf(String(lead.status || '')) !== -1 && String(lead.status || '') !== 'フォーム対応済み') {
    return { blockReason: '現在のステータスでは送信できません。', kind: 'blocked' };
  }
  const blocked = masterContext ? isLeadBlockedByMastersInContext_(lead, masterContext) : isLeadBlockedByMasters_(lead);
  if (blocked.blocked) return { blockReason: blocked.reason, kind: 'blocked' };
  if (hasSuccessfulGlampingChatgptEmailSend_(lead, masterContext)) {
    return { blockReason: 'グランピング向けChatGPT広告をメールで送信済みです。', kind: 'blocked' };
  }

  const state = getGlampingChatgptFormSendState_(lead);
  if (state.dedicatedAt) {
    return { blockReason: 'グランピング向けChatGPT広告をフォームで送信済みです。', kind: 'blocked', dedicatedSentAt: state.dedicatedAt };
  }
  if (!state.hasPriorFormSend) {
    return { blockReason: '', kind: 'unsent', previousSuccessfulAtMs: 0, availableAt: '' };
  }
  const previousSuccessfulAtMs = state.latestAt ? new Date(state.latestAt).getTime() : NaN;
  if (!Number.isFinite(previousSuccessfulAtMs)) {
    return { blockReason: '通常フォームの送信済み記録はありますが、前回送信日を確認できないため停止しています。', kind: 'blocked' };
  }
  const availableAtMs = previousSuccessfulAtMs + intervalMs;
  if (currentMs < availableAtMs) {
    const remainingDays = Math.max(1, Math.ceil((availableAtMs - currentMs) / (24 * 60 * 60 * 1000)));
    return {
      blockReason: '前回フォーム送信から' + EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_ + '日未満です。あと' + remainingDays + '日経過後に対象になります。',
      kind: 'blocked',
      previousSuccessfulAtMs: previousSuccessfulAtMs,
      availableAt: new Date(availableAtMs).toISOString(),
    };
  }
  return {
    blockReason: '',
    kind: 'previously_sent',
    previousSuccessfulAtMs: previousSuccessfulAtMs,
    availableAt: new Date(availableAtMs).toISOString(),
  };
}

function decorateGlampingChatgptFormLead_(lead, masterContext, nowMs) {
  if (!emailGenrePriorityMatches_(lead && lead.genre, EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_)) return lead;
  const eligibility = getGlampingChatgptFormEligibility_(lead, masterContext, nowMs);
  return Object.assign({}, lead, {
    glamping_chatgpt_form_template_id: EMAIL_GENRE_PRIORITY_FORM_TEMPLATE_ID_,
    glamping_chatgpt_form_eligible: !eligibility.blockReason,
    glamping_chatgpt_form_block_reason: String(eligibility.blockReason || ''),
    glamping_chatgpt_form_kind: String(eligibility.kind || 'blocked'),
    glamping_chatgpt_form_available_at: String(eligibility.availableAt || ''),
    glamping_chatgpt_form_sent_at: String(eligibility.dedicatedSentAt || ''),
  });
}

function isFormOutreachLead_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return false;
  if (isClearlyClosedLead_(lead)) return false;
  if (isLeadLinkDefinitelyBroken_(lead)) return false;
  if (!lead.form_url) return false;
  if (isValidEmailAddress_(lead.email)) return false;
  const leadId = String(lead.id || '').trim();
  if (leadId && masterContext && masterContext.formEmailPreferredLeadIds && masterContext.formEmailPreferredLeadIds[leadId]) {
    return false;
  }
  return true;
}

function sendLeadEmail(leadId, templateId, options) {
  const input = options && typeof options === 'object' ? options : {};
  enforceEmailGenrePriorityForLeadIds_([leadId], templateId);
  const prepared = withScriptLock_('prepareLeadEmailSend', function () {
    enforceEmailGenrePriorityForLeadIds_([leadId], templateId, { skipAvailabilityCheck: true });
    return prepareLeadEmailSend_(leadId, templateId, input, false);
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  const result = deliverPreparedLeadEmail_(prepared);
  result.emailGenrePriority = maybeAutoDeactivateEmailGenrePriority_();
  return result;
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
  enforceEmailGenrePriorityForLeadIds_(ids, templateId);

  const runtimeDeadlineMs = Number(input.runtimeDeadlineMs || input.runtime_deadline_ms) || 0;
  const results = [];
  let runtimeBudgetReached = false;
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (runtimeDeadlineMs > 0 && Date.now() >= runtimeDeadlineMs) {
      runtimeBudgetReached = true;
      break;
    }
    try {
      const prepared = withScriptLock_('prepareLeadEmailBatchItem', function () {
        enforceEmailGenrePriorityForLeadIds_([id], templateId, { skipAvailabilityCheck: true });
        return prepareLeadEmailSend_(id, templateId, input, true);
      }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
      results.push(deliverPreparedLeadEmail_(prepared));
    } catch (error) {
      if (!isExpectedOperationError_(error)) {
        logError_('sendLeadEmailBatch:item', error, {
          target_sheet: 'leads',
          target_id: id,
        });
      }
      results.push({
        ok: false,
        blocked: isExpectedOperationError_(error),
        leadId: id,
        errorMessage: error.message || String(error),
      });
    }
  }
  const success = results.filter(function (result) { return result.ok; }).length;
  const blocked = results.filter(function (result) { return result.blocked; }).length;
  const emailGenrePriority = maybeAutoDeactivateEmailGenrePriority_();
  return {
    ok: success === results.length,
    total: results.length,
    requestedTotal: ids.length,
    success: success,
    failed: results.length - success,
    blocked: blocked,
    deferred: Math.max(0, ids.length - results.length),
    runtimeBudgetReached: runtimeBudgetReached,
    emailGenrePriority: emailGenrePriority,
    results: results,
  };
}

function runScheduledEmailBatch(options) {
  const input = options && typeof options === 'object' ? options : {};
  const runtimeStartedAtMs = Date.now();
  const runtimeBudgetMs = Math.min(Math.max(Number(
    input.runtimeBudgetMs || input.runtime_budget_ms ||
    getSettingValue_('batch_runtime_budget_ms', SCHEDULED_EMAIL_DEFAULT_RUNTIME_BUDGET_MS_)
  ) || SCHEDULED_EMAIL_DEFAULT_RUNTIME_BUDGET_MS_, 10000), SCHEDULED_EMAIL_MAX_RUNTIME_BUDGET_MS_);
  const runtimeDeadlineMs = runtimeStartedAtMs + runtimeBudgetMs;
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
    let runtimeBudgetReached = false;
    let priorityAutoReleased = false;
    for (let groupIndex = 0; groupIndex < plan.groups.length; groupIndex += 1) {
      const group = plan.groups[groupIndex];
      if (Date.now() >= runtimeDeadlineMs) {
        runtimeBudgetReached = true;
        break;
      }
      try {
        const batch = sendLeadEmailBatch(group.leadIds, group.templateId, {
          send_type: '初回メール',
          sender_name: getDefaultGmailSenderName_(),
          source: 'automatic_email_trigger',
          runtimeDeadlineMs: runtimeDeadlineMs,
        });
        success += Number(batch.success || 0);
        failed += Number(batch.failed || 0);
        blocked += Number(batch.blocked || 0);
        runtimeBudgetReached = runtimeBudgetReached || batch.runtimeBudgetReached === true;
        priorityAutoReleased = priorityAutoReleased || Boolean(batch.emailGenrePriority && batch.emailGenrePriority.autoReleased);
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
      if (runtimeBudgetReached) break;
    }

    const issueMessages = results.filter(function (result) {
      return !result.ok || result.warning;
    }).map(function (result) {
      return result.errorMessage || result.warning;
    }).filter(Boolean);
    const status = success === 0 && failed > 0 ? 'failed' : 'completed';
    const deliveryRecoveryCount = Number((plan.deliveryRecovery || {}).processed || 0);
    const staleRecoveryCount = Number((plan.staleRecovery || {}).processed || 0);
    const deferred = Math.max(0, Number(plan.selectedCount || 0) - success - failed);
    const message = '完全自動送信: 成功 ' + success + '件 / 失敗 ' + failed + '件 / 対象外 ' + blocked + '件' +
      (deliveryRecoveryCount + staleRecoveryCount > 0 ? ' / 履歴復旧 ' + (deliveryRecoveryCount + staleRecoveryCount) + '件' : '') +
      (deferred > 0 ? ' / 次回へ繰越 ' + deferred + '件' : '') +
      (priorityAutoReleased ? ' / グランピング優先を自動解除' : '');
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
    const sanitizedPlan = sanitizeScheduledEmailPlan_(plan);
    return {
      ok: failed === 0,
      skipped: false,
      jobId: job.id,
      total: plan.selectedCount,
      success: success,
      failed: failed,
      blocked: blocked,
      deferred: deferred,
      runtimeBudgetReached: runtimeBudgetReached,
      runtimeBudgetMs: runtimeBudgetMs,
      groups: sanitizedPlan.groups,
      deliveryRecovery: sanitizedPlan.deliveryRecovery,
      staleRecovery: sanitizedPlan.staleRecovery,
      emailGenrePriority: Object.assign({}, sanitizedPlan.emailGenrePriority || {}, {
        autoReleased: priorityAutoReleased || Boolean((sanitizedPlan.emailGenrePriority || {}).autoReleased),
      }),
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
  let histories = readMailSendSafetyHistories_();
  const deliveryRecovery = reconcileMailDeliveryReceipts_(histories, { maxItems: 20 });
  if (deliveryRecovery.processed > 0) {
    histories = readMailSendSafetyHistories_();
  }
  const staleRecovery = reconcileStaleMailReservations_(histories, { maxItems: 5 });
  if (staleRecovery.processed > 0) {
    histories = readMailSendSafetyHistories_();
  }
  const pendingStatus = buildPendingSendReservationStatus_(histories);
  if (pendingStatus.staleCount > 0) {
    return {
      blockCode: 'stale_send_reservations',
      blockReason: '30分以上「送信中」の履歴が' + pendingStatus.staleCount + '件あるため、完全自動送信を停止しました。',
      selectedCount: 0,
      groups: [],
      deliveryRecovery: deliveryRecovery,
      staleRecovery: staleRecovery,
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
      deliveryRecovery: deliveryRecovery,
      staleRecovery: staleRecovery,
    };
  }

  const masterContext = {
    ngMasters: readAllActiveSheetRecords_('ng_masters'),
    excludedDomains: readAllActiveSheetRecords_('excluded_domains'),
    mailSendSafety: safety,
  };
  let templates = readAllActiveSheetRecords_('email_templates').filter(function (template) {
    return String(template.template_type || '') === 'initial' &&
      normalizeBooleanLike_(template.is_production) &&
      String(template.genre || '').trim() &&
      !getTemplateGenreContentMismatchReason_(template);
  });
  const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 });
  const priorityState = getEmailGenrePrioritySetting_();
  let emailGenrePriority = sanitizeEmailGenrePriorityState_(priorityState);
  let selection = null;
  if (priorityState.enabled) {
    const priorityTemplate = findSheetRecordById_('email_templates', priorityState.templateId);
    const priorityTemplateBlockReason = getEmailGenrePriorityTemplateBlockReason_(priorityState, priorityTemplate, {
      requireProduction: true,
      requireTest: true,
    });
    emailGenrePriority.templateName = String(priorityTemplate && priorityTemplate.name || EMAIL_GENRE_PRIORITY_TEMPLATE_NAME_);
    if (priorityTemplateBlockReason) {
      return {
        blockCode: 'priority_template_unavailable',
        blockReason: priorityTemplateBlockReason,
        selectedCount: 0,
        dailyRemaining: dailyRemaining,
        mailQuota: mailQuota,
        groups: [],
        emailGenrePriority: emailGenrePriority,
        deliveryRecovery: deliveryRecovery,
        staleRecovery: staleRecovery,
      };
    }
    selection = selectEmailGenrePriorityCandidates_(leads, priorityTemplate, masterContext, availableSlots, priorityState.genreKeyword);
    if (!selection.selected.length) {
      const released = deactivateEmailGenrePrioritySystem_('送信可能なグランピング施設が0件になったため自動解除しました。');
      emailGenrePriority = Object.assign({}, sanitizeEmailGenrePriorityState_(released), {
        autoReleased: true,
        templateName: String(priorityTemplate.name || EMAIL_GENRE_PRIORITY_TEMPLATE_NAME_),
      });
      templates = readAllActiveSheetRecords_('email_templates').filter(function (template) {
        return String(template.template_type || '') === 'initial' &&
          normalizeBooleanLike_(template.is_production) &&
          String(template.genre || '').trim() &&
          !getTemplateGenreContentMismatchReason_(template);
      });
      selection = null;
    }
  }

  if (!selection && !templates.length) {
    return {
      blockCode: 'no_production_templates',
      blockReason: '本番ONの初回メールテンプレートがありません。',
      selectedCount: 0,
      dailyRemaining: dailyRemaining,
      mailQuota: mailQuota,
      groups: [],
      emailGenrePriority: emailGenrePriority,
      deliveryRecovery: deliveryRecovery,
      staleRecovery: staleRecovery,
    };
  }

  if (!selection) selection = selectScheduledEmailCandidates_(leads, templates, masterContext, availableSlots);
  if (!selection.selected.length) {
    return {
      blockCode: 'no_sendable_targets',
      blockReason: '本番テンプレートとジャンルが一致する未送信の営業先がありません。',
      selectedCount: 0,
      dailyRemaining: dailyRemaining,
      mailQuota: mailQuota,
      groups: [],
      emailGenrePriority: emailGenrePriority,
      deliveryRecovery: deliveryRecovery,
      staleRecovery: staleRecovery,
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
    emailGenrePriority: emailGenrePriority,
    deliveryRecovery: deliveryRecovery,
    staleRecovery: staleRecovery,
  };
}

function mailSendCandidateLeadFields_() {
  return [
    'id',
    'source',
    'genre',
    'company_name',
    'facility_name',
    'email',
    'website_url',
    'website_domain',
    'form_url',
    'status',
    'send_ng',
    'reply_checked',
    'last_sent_at',
    'send_count',
    'deal_status',
    'custom_fields_json',
    'created_at',
    'updated_at',
    'archived_at',
  ];
}

function emailDeliveryStatusHistoryFields_() {
  return [
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
    'send_result',
    'error_message',
    'created_at',
    'updated_at',
  ];
}

function emailDeliveryHistoryDateKey_(history, timezone) {
  const timestamp = String(history && (history.sent_at || history.created_at) || '').trim();
  if (!timestamp) return '';
  const parsed = new Date(timestamp);
  if (!Number.isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, timezone || Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  return timestamp.slice(0, 10);
}

function classifyEmailDeliveryHistory_(history) {
  const sendType = String(history && history.send_type || '');
  if (sendType.indexOf('テスト') !== -1) return 'test';
  const result = String(history && history.send_result || '');
  if (result === '成功') return 'success';
  if (result === PRODUCTION_SEND_RESERVED_RESULT_) return 'sending';
  if (result === '失敗' || result) return 'failed';
  return 'other';
}

function buildNextAutomaticEmailRun_(control, sendWindow, triggerInstalled) {
  if (!control || !control.enabled) {
    return { available: false, label: '自動送信停止中', scheduledDate: '', scheduledTime: '' };
  }
  if (!triggerInstalled) {
    return { available: false, label: '自動送信トリガー未設定', scheduledDate: '', scheduledTime: '' };
  }
  if (!sendWindow || sendWindow.enabled === false) {
    return { available: false, label: '送信時間帯が無効', scheduledDate: '', scheduledTime: '' };
  }
  if (sendWindow.allowed) {
    return {
      available: true,
      label: '送信時間内（次回の10分トリガー）',
      scheduledDate: todayText_(),
      scheduledTime: String(sendWindow.currentTime || ''),
    };
  }

  const timezone = sendWindow.timezone || Session.getScriptTimeZone() || 'Asia/Tokyo';
  const now = new Date();
  const today = Utilities.formatDate(now, timezone, 'yyyy-MM-dd');
  const targetDate = String(sendWindow.currentTime || '') < String(sendWindow.start || '07:00')
    ? today
    : Utilities.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), timezone, 'yyyy-MM-dd');
  return {
    available: true,
    label: targetDate + ' ' + String(sendWindow.start || '07:00') + '以降',
    scheduledDate: targetDate,
    scheduledTime: String(sendWindow.start || '07:00'),
  };
}

function isEmailDeliveryPreviewTemplate_(template) {
  return Boolean(template) &&
    String(template.template_type || '') === 'initial' &&
    normalizeBooleanLike_(template.active) &&
    String(template.genre || '').trim() &&
    !getTemplateGenreContentMismatchReason_(template);
}

function emailDeliverySelectionExecutionOrder_(selection) {
  const source = selection && typeof selection === 'object' ? selection : {};
  const selected = Array.isArray(source.selected) ? source.selected : [];
  const groups = Array.isArray(source.groups) ? source.groups : [];
  if (!groups.length) return selected.slice();
  const itemByLeadId = {};
  selected.forEach(function (item) {
    const leadId = String(item && item.lead && item.lead.id || '');
    if (leadId) itemByLeadId[leadId] = item;
  });
  const ordered = [];
  groups.forEach(function (group) {
    (group.leadIds || []).forEach(function (leadId) {
      const item = itemByLeadId[String(leadId || '')];
      if (item) ordered.push(item);
    });
  });
  return ordered.length === selected.length ? ordered : selected.slice();
}

function buildEmailDeliveryPreviewFromSelection_(selection, dailyLimit, batchLimit) {
  const source = selection && typeof selection === 'object' ? selection : {};
  const selected = Array.isArray(source.selected) ? source.selected : [];
  const groups = Array.isArray(source.groups) ? source.groups : [];
  const safeDailyLimit = Math.max(0, Number(dailyLimit) || 0);
  const safeBatchLimit = Math.max(1, Number(batchLimit) || 1);
  if (!selected.length || !safeDailyLimit) return { selected: [], batches: [] };

  const itemByLeadId = {};
  selected.forEach(function (item) {
    const leadId = String(item && item.lead && item.lead.id || '');
    if (leadId) itemByLeadId[leadId] = item;
  });
  const queues = groups.map(function (group) {
    return {
      group: group,
      items: (group.leadIds || []).map(function (leadId) {
        return itemByLeadId[String(leadId || '')];
      }).filter(Boolean),
    };
  }).filter(function (queue) { return queue.items.length; });

  if (!queues.length) {
    return {
      selected: selected.slice(0, safeDailyLimit),
      batches: selected.length ? [{ index: 1, count: Math.min(selected.length, safeDailyLimit), groups: [] }] : [],
    };
  }

  const ordered = [];
  const batches = [];
  while (ordered.length < safeDailyLimit) {
    const requested = Math.min(safeBatchLimit, safeDailyLimit - ordered.length);
    const batchByQueue = queues.map(function () { return []; });
    let selectedInBatch = 0;
    while (selectedInBatch < requested) {
      let added = false;
      queues.forEach(function (queue, queueIndex) {
        if (selectedInBatch >= requested || !queue.items.length) return;
        batchByQueue[queueIndex].push(queue.items.shift());
        selectedInBatch += 1;
        added = true;
      });
      if (!added) break;
    }
    if (!selectedInBatch) break;

    const batchGroups = [];
    batchByQueue.forEach(function (items, queueIndex) {
      if (!items.length) return;
      items.forEach(function (item) { ordered.push(item); });
      const group = queues[queueIndex].group || {};
      batchGroups.push({
        templateId: String(group.templateId || ''),
        leadIds: items.map(function (item) { return String(item && item.lead && item.lead.id || ''); }),
      });
    });
    batches.push({ index: batches.length + 1, count: selectedInBatch, groups: batchGroups });
    if (selectedInBatch < requested) break;
  }
  return { selected: ordered, batches: batches };
}

function buildEmailDeliveryPreviewSchedule_(leads, templates, masterContext, dailyLimit, batchLimit, options) {
  const input = options && typeof options === 'object' ? options : {};
  const selection = input.prioritySelection || (input.priorityTemplate
    ? selectEmailGenrePriorityCandidates_(leads, input.priorityTemplate, masterContext, Number.MAX_SAFE_INTEGER, input.genreKeyword)
    : selectScheduledEmailCandidates_(leads, templates, masterContext, Number.MAX_SAFE_INTEGER));
  return buildEmailDeliveryPreviewFromSelection_(selection, dailyLimit, batchLimit);
}

function buildEmailDeliveryTemplateCoverage_(leads, templates, masterContext, itemLimit) {
  const templateGenres = {};
  (Array.isArray(templates) ? templates : []).forEach(function (template) {
    const genre = String(template && template.genre || '').trim();
    if (genre) templateGenres[genre] = true;
  });

  const sendable = (Array.isArray(leads) ? leads : []).filter(function (lead) {
    return !isArchivedLead_(lead) && isEmailSendTarget_(lead, masterContext);
  });
  sortLeads_(sendable, 'updated_desc');

  const unique = [];
  const seenEmails = {};
  sendable.forEach(function (lead) {
    const email = normalizeEmailForSendSafety_(lead.email);
    if (!email || seenEmails[email]) return;
    seenEmails[email] = true;
    unique.push(lead);
  });

  const scheduledEmails = {};
  sendable.forEach(function (lead) {
    const genre = String(lead.genre || '').trim();
    const email = normalizeEmailForSendSafety_(lead.email);
    if (genre && templateGenres[genre] && email) scheduledEmails[email] = true;
  });
  const waiting = unique.filter(function (lead) {
    const genre = String(lead.genre || '').trim();
    const email = normalizeEmailForSendSafety_(lead.email);
    return !templateGenres[genre] && !scheduledEmails[email];
  });
  const genreCounts = {};
  waiting.forEach(function (lead) {
    const genre = String(lead.genre || '').trim() || 'ジャンル未設定';
    genreCounts[genre] = Number(genreCounts[genre] || 0) + 1;
  });
  const genres = Object.keys(genreCounts).map(function (genre) {
    return { genre: genre, count: genreCounts[genre] };
  }).sort(function (left, right) {
    if (right.count !== left.count) return right.count - left.count;
    return left.genre.localeCompare(right.genre, 'ja');
  });
  const safeLimit = Math.min(Math.max(Number(itemLimit) || 20, 1), 100);

  return {
    sendableCount: unique.length,
    scheduledGenreCount: Object.keys(templateGenres).length,
    waitingCount: waiting.length,
    displayed: Math.min(waiting.length, safeLimit),
    genres: genres,
    items: waiting.slice(0, safeLimit).map(function (lead, index) {
      return {
        order: index + 1,
        leadId: String(lead.id || ''),
        facilityName: String(lead.facility_name || lead.company_name || ''),
        companyName: String(lead.company_name || ''),
        genre: String(lead.genre || ''),
        toEmail: String(lead.email || ''),
      };
    }),
  };
}

function emailDeliveryTemplateCoverageReason_(coverage) {
  const source = coverage && typeof coverage === 'object' ? coverage : {};
  const waitingCount = Number(source.waitingCount || 0);
  if (!waitingCount) return '';
  const genreSummary = (source.genres || []).slice(0, 4).map(function (item) {
    return String(item.genre || 'ジャンル未設定') + ' ' + Number(item.count || 0) + '件';
  }).join('・');
  return '送信可能な営業先は' + waitingCount + '件ありますが、本番テンプレート未設定のため明日の自動送信には入りません。' +
    (genreSummary ? ' 内訳: ' + genreSummary : '');
}

function getEmailDeliveryOverview(options) {
  const input = options && typeof options === 'object' ? options : {};
  const timezone = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const today = todayText_();
  const historyLimit = Math.min(Math.max(Number(input.historyLimit || input.history_limit) || 200, 20), 500);
  const histories = readSheetRecordFields_('send_histories', emailDeliveryStatusHistoryFields_());
  const safety = buildMailSendSafetyContext_(histories);
  const pending = buildPendingSendReservationStatus_(histories);
  const todayHistories = histories.filter(function (history) {
    return emailDeliveryHistoryDateKey_(history, timezone) === today;
  }).sort(function (left, right) {
    return String(right.sent_at || right.created_at || '').localeCompare(String(left.sent_at || left.created_at || ''));
  });
  const todayCounts = {
    total: todayHistories.length,
    success: 0,
    failed: 0,
    sending: 0,
    test: 0,
    other: 0,
  };
  const todayItems = todayHistories.slice(0, historyLimit).map(function (history) {
    const category = classifyEmailDeliveryHistory_(history);
    todayCounts[category] = Number(todayCounts[category] || 0) + 1;
    return {
      id: String(history.id || ''),
      leadId: String(history.lead_id || ''),
      sentAt: String(history.sent_at || history.created_at || ''),
      sendType: String(history.send_type || ''),
      toEmail: String(history.to_email || ''),
      companyName: String(history.company_name || ''),
      facilityName: String(history.facility_name || history.company_name || ''),
      genre: String(history.genre || ''),
      templateId: String(history.template_id || ''),
      templateName: String(history.template_name || ''),
      subject: String(history.subject || ''),
      sendResult: String(history.send_result || ''),
      errorMessage: String(history.error_message || ''),
      category: category,
    };
  });
  if (todayHistories.length > todayItems.length) {
    todayHistories.slice(todayItems.length).forEach(function (history) {
      const category = classifyEmailDeliveryHistory_(history);
      todayCounts[category] = Number(todayCounts[category] || 0) + 1;
    });
  }

  const dailyLimit = Math.min(Math.max(Number(getSettingValue_('gmail_daily_send_limit', 80)) || 80, 1), 100);
  const batchLimit = Math.min(Math.max(Number(getSettingValue_('email_batch_send_limit', 20)) || 20, 1), 100);
  const quota = getMailQuotaStatus_(dailyLimit);
  const remainingByLimit = Math.max(0, dailyLimit - Number(safety.successfulCountToday || 0) - Number(safety.reservedCountToday || 0));
  const remainingToday = Math.max(0, Math.min(remainingByLimit, Number(quota.remaining || 0)));
  const sendWindow = buildSendWindowStatus_();
  const control = getMailSendingControl_();
  const triggerCount = getProjectTriggerHandlerCount_('runScheduledEmailBatch');
  const triggerInstalled = triggerCount > 0;
  const allTemplates = readAllActiveSheetRecords_('email_templates');
  const priorityState = getEmailGenrePrioritySetting_();
  const priorityTemplate = allTemplates.find(function (template) {
    return String(template.id || '') === String(priorityState.templateId || '');
  }) || null;
  const priorityTemplateBlockReason = getEmailGenrePriorityTemplateBlockReason_(priorityState, priorityTemplate, {
    requireTest: true,
    requireProduction: priorityState.enabled,
  });
  const admin = getEmailGenrePriorityAdminStatus_();
  const priority = Object.assign({}, sanitizeEmailGenrePriorityState_(priorityState), {
    adminAllowed: admin.allowed,
    adminMode: admin.mode,
    targetCount: null,
    unsentTargetCount: null,
    previouslySentTargetCount: null,
    resendIntervalDays: EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_,
    targetCountPending: true,
    templateName: String(priorityTemplate && priorityTemplate.name || EMAIL_GENRE_PRIORITY_TEMPLATE_NAME_),
    templateActive: Boolean(priorityTemplate && normalizeBooleanLike_(priorityTemplate.active)),
    templateProduction: Boolean(priorityTemplate && normalizeBooleanLike_(priorityTemplate.is_production)),
    templateTestedAt: String(priorityTemplate && priorityTemplate.last_test_sent_at || ''),
    templateBlockReason: priorityTemplateBlockReason,
    canActivate: false,
    canDeactivate: priorityState.enabled && admin.allowed,
    canInspect: true,
    diagnostics: {
      keyword: String(priorityState.genreKeyword || EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_),
      totalCount: null,
      sendableCount: null,
      blockedCount: null,
      reasons: [],
      items: [],
      loading: true,
    },
    lpUrl: EMAIL_GENRE_PRIORITY_LP_URL_,
    exclusive: priorityState.enabled,
  });

  const alerts = [];
  if (!control.enabled) alerts.push({ tone: 'bad', title: '自動送信は停止中です', detail: control.reason || '管理者により停止されています。' });
  if (!triggerInstalled) alerts.push({ tone: 'bad', title: '自動送信トリガーがありません', detail: '完全自動送信の10分トリガーを確認してください。' });
  if (sendWindow.enabled === false) alerts.push({ tone: 'bad', title: '送信時間帯が無効です', detail: '管理画面で送信時間帯を有効にしてください。' });
  if (pending.staleCount > 0) alerts.push({ tone: 'bad', title: '送信中の履歴が滞留しています', detail: '30分以上の滞留が' + pending.staleCount + '件あります。' });
  if (todayCounts.failed > 0) alerts.push({ tone: 'warn', title: '本日の失敗があります', detail: todayCounts.failed + '件の詳細を確認してください。' });
  if (priorityState.enabled && priorityTemplateBlockReason) alerts.push({ tone: 'bad', title: '優先テンプレートを使用できません', detail: priorityTemplateBlockReason });
  if (!alerts.length) alerts.push({ tone: 'info', title: '明日の送信候補を計算しています', detail: '今日の履歴と設定は取得済みです。候補一覧は計算完了後に表示します。' });

  return {
    generatedAt: nowIso_(),
    timezone: timezone,
    overviewOnly: true,
    control: Object.assign({}, control, {
      adminAllowed: admin.allowed,
      adminMode: admin.mode,
    }),
    sendWindow: sendWindow,
    trigger: {
      installed: triggerInstalled,
      count: triggerCount,
      intervalMinutes: 10,
    },
    nextRun: buildNextAutomaticEmailRun_(control, sendWindow, triggerInstalled),
    today: {
      date: today,
      counts: todayCounts,
      successfulProduction: Number(safety.successfulCountToday || 0),
      sendingProduction: Number(safety.reservedCountToday || 0),
      dailyLimit: dailyLimit,
      gmailQuotaRemaining: Number(quota.remaining || 0),
      gmailQuotaAvailable: quota.available !== false,
      remaining: remainingToday,
      displayed: todayItems.length,
      total: todayHistories.length,
      items: todayItems,
    },
    priority: priority,
    tomorrow: {
      date: Utilities.formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000), timezone, 'yyyy-MM-dd'),
      dailyLimit: dailyLimit,
      batchLimit: batchLimit,
      candidateCount: null,
      loading: true,
      blockCode: '',
      blockReason: '',
      priorityAutoReleaseExpected: false,
      items: [],
    },
    safety: {
      pendingCount: pending.count,
      stalePendingCount: pending.staleCount,
      oldestPendingAt: pending.oldestAt,
      trackingMismatchCount: null,
    },
    alerts: alerts,
  };
}

function getEmailDeliveryStatus(options) {
  const input = options && typeof options === 'object' ? options : {};
  const timezone = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const today = todayText_();
  const generatedAt = nowIso_();
  const historyLimit = Math.min(Math.max(Number(input.historyLimit || input.history_limit) || 200, 20), 500);
  const histories = readSheetRecordFields_('send_histories', emailDeliveryStatusHistoryFields_());
  const safety = buildMailSendSafetyContext_(histories);
  const pending = buildPendingSendReservationStatus_(histories);
  const todayHistories = histories.filter(function (history) {
    return emailDeliveryHistoryDateKey_(history, timezone) === today;
  }).sort(function (left, right) {
    return String(right.sent_at || right.created_at || '').localeCompare(String(left.sent_at || left.created_at || ''));
  });
  const todayCounts = {
    total: todayHistories.length,
    success: 0,
    failed: 0,
    sending: 0,
    test: 0,
    other: 0,
  };
  const todayItems = todayHistories.slice(0, historyLimit).map(function (history) {
    const category = classifyEmailDeliveryHistory_(history);
    todayCounts[category] = Number(todayCounts[category] || 0) + 1;
    return {
      id: String(history.id || ''),
      leadId: String(history.lead_id || ''),
      sentAt: String(history.sent_at || history.created_at || ''),
      sendType: String(history.send_type || ''),
      toEmail: String(history.to_email || ''),
      companyName: String(history.company_name || ''),
      facilityName: String(history.facility_name || history.company_name || ''),
      genre: String(history.genre || ''),
      templateId: String(history.template_id || ''),
      templateName: String(history.template_name || ''),
      subject: String(history.subject || ''),
      sendResult: String(history.send_result || ''),
      errorMessage: String(history.error_message || ''),
      category: category,
    };
  });
  if (todayHistories.length > todayItems.length) {
    todayHistories.slice(todayItems.length).forEach(function (history) {
      const category = classifyEmailDeliveryHistory_(history);
      todayCounts[category] = Number(todayCounts[category] || 0) + 1;
    });
  }

  const dailyLimit = Math.min(Math.max(Number(getSettingValue_('gmail_daily_send_limit', 80)) || 80, 1), 100);
  const batchLimit = Math.min(Math.max(Number(getSettingValue_('email_batch_send_limit', 20)) || 20, 1), 100);
  const quota = getMailQuotaStatus_(dailyLimit);
  const remainingByLimit = Math.max(0, dailyLimit - Number(safety.successfulCountToday || 0) - Number(safety.reservedCountToday || 0));
  const remainingToday = Math.max(0, Math.min(remainingByLimit, Number(quota.remaining || 0)));
  const sendWindow = buildSendWindowStatus_();
  const control = getMailSendingControl_();
  const triggerCount = getProjectTriggerHandlerCount_('runScheduledEmailBatch');
  const triggerInstalled = triggerCount > 0;

  const masterRules = buildMasterBlockRulesContext_();
  const masterContext = Object.assign({}, masterRules, { mailSendSafety: safety });
  const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 });
  const allTemplates = readAllActiveSheetRecords_('email_templates');
  let productionTemplates = allTemplates.filter(function (template) {
    return isEmailDeliveryPreviewTemplate_(template) && normalizeBooleanLike_(template.is_production);
  });
  const priorityState = getEmailGenrePrioritySetting_();
  const priorityTemplate = allTemplates.find(function (template) {
    return String(template.id || '') === String(priorityState.templateId || '');
  }) || null;
  const priorityTemplateBlockReason = getEmailGenrePriorityTemplateBlockReason_(priorityState, priorityTemplate, {
    requireTest: true,
    requireProduction: priorityState.enabled,
  });
  const priorityAllSelection = priorityTemplate
    ? selectEmailGenrePriorityCandidates_(leads, priorityTemplate, masterContext, Number.MAX_SAFE_INTEGER, priorityState.genreKeyword)
    : { selected: [], groups: [], total: 0 };
  const priorityDiagnostics = buildEmailGenrePriorityDiagnostics_(leads, priorityTemplate, masterContext, priorityState.genreKeyword);
  const admin = getEmailGenrePriorityAdminStatus_();
  const priority = Object.assign({}, sanitizeEmailGenrePriorityState_(priorityState), {
    adminAllowed: admin.allowed,
    adminMode: admin.mode,
    targetCount: Number(priorityAllSelection.total || priorityAllSelection.selected.length || 0),
    unsentTargetCount: Number(priorityAllSelection.breakdown && priorityAllSelection.breakdown.unsent || 0),
    previouslySentTargetCount: Number(priorityAllSelection.breakdown && priorityAllSelection.breakdown.previouslySent || 0),
    resendIntervalDays: EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_,
    targetCountPending: false,
    templateName: String(priorityTemplate && priorityTemplate.name || EMAIL_GENRE_PRIORITY_TEMPLATE_NAME_),
    templateActive: Boolean(priorityTemplate && normalizeBooleanLike_(priorityTemplate.active)),
    templateProduction: Boolean(priorityTemplate && normalizeBooleanLike_(priorityTemplate.is_production)),
    templateTestedAt: String(priorityTemplate && priorityTemplate.last_test_sent_at || ''),
    templateBlockReason: priorityTemplateBlockReason,
    canActivate: !priorityState.enabled && admin.allowed && Number(priorityAllSelection.total || priorityAllSelection.selected.length || 0) > 0 && !priorityTemplateBlockReason,
    canDeactivate: priorityState.enabled && admin.allowed,
    canInspect: true,
    diagnostics: priorityDiagnostics,
    lpUrl: EMAIL_GENRE_PRIORITY_LP_URL_,
    exclusive: priorityState.enabled,
  });

  let tomorrowSelection = { selected: [], groups: [] };
  let tomorrowBlockCode = '';
  let tomorrowBlockReason = '';
  let priorityAutoReleaseExpected = false;
  if (!control.enabled) {
    tomorrowBlockCode = 'mail_disabled';
    tomorrowBlockReason = control.reason || '自動送信停止中です。';
  } else if (!triggerInstalled) {
    tomorrowBlockCode = 'trigger_missing';
    tomorrowBlockReason = '完全自動送信トリガーが設定されていません。';
  } else if (sendWindow.enabled === false) {
    tomorrowBlockCode = 'send_window_disabled';
    tomorrowBlockReason = '自動送信時間帯が無効です。';
  } else if (pending.staleCount > 0) {
    tomorrowBlockCode = 'stale_send_reservations';
    tomorrowBlockReason = '30分以上「送信中」の履歴が' + pending.staleCount + '件あるため、自動送信は停止します。';
  } else if (priorityState.enabled) {
    if (priorityTemplateBlockReason) {
      tomorrowBlockCode = 'priority_template_unavailable';
      tomorrowBlockReason = priorityTemplateBlockReason;
    } else {
      tomorrowSelection = buildEmailDeliveryPreviewSchedule_(leads, [], masterContext, dailyLimit, batchLimit, {
        priorityTemplate: priorityTemplate,
        prioritySelection: priorityAllSelection,
        genreKeyword: priorityState.genreKeyword,
      });
      if (!tomorrowSelection.selected.length) {
        priorityAutoReleaseExpected = true;
        const restoredTemplateIds = {};
        (priorityState.previousProductionTemplateIds || []).forEach(function (id) {
          restoredTemplateIds[String(id || '')] = true;
        });
        productionTemplates = allTemplates.filter(function (template) {
          const productionAfterRelease = normalizeBooleanLike_(template.is_production) ||
            restoredTemplateIds[String(template.id || '')];
          return productionAfterRelease &&
            String(template.id || '') !== String(priorityState.templateId || '') &&
            isEmailDeliveryPreviewTemplate_(template);
        });
        tomorrowSelection = buildEmailDeliveryPreviewSchedule_(leads, productionTemplates, masterContext, dailyLimit, batchLimit);
        if (!tomorrowSelection.selected.length) {
          tomorrowBlockCode = 'no_sendable_targets';
          tomorrowBlockReason = '優先対象が0件のため自動解除予定ですが、通常送信の候補もありません。';
        }
      }
    }
  } else if (!productionTemplates.length) {
    tomorrowBlockCode = 'no_production_templates';
    tomorrowBlockReason = '本番ONの初回メールテンプレートがありません。';
  } else {
    tomorrowSelection = buildEmailDeliveryPreviewSchedule_(leads, productionTemplates, masterContext, dailyLimit, batchLimit);
    if (!tomorrowSelection.selected.length) {
      tomorrowBlockCode = 'no_sendable_targets';
      tomorrowBlockReason = '本番テンプレートとジャンルが一致する未送信の営業先がありません。';
    }
  }

  const templateCoverage = (!priorityState.enabled || priorityAutoReleaseExpected)
    ? buildEmailDeliveryTemplateCoverage_(leads, productionTemplates, masterContext, dailyLimit)
    : { sendableCount: 0, scheduledGenreCount: 0, waitingCount: 0, displayed: 0, genres: [], items: [] };
  if (!tomorrowSelection.selected.length &&
      Number(templateCoverage.waitingCount || 0) > 0 &&
      ['no_sendable_targets', 'no_production_templates'].indexOf(tomorrowBlockCode) !== -1) {
    tomorrowBlockCode = 'production_template_missing';
    tomorrowBlockReason = emailDeliveryTemplateCoverageReason_(templateCoverage);
  }

  const tomorrowItems = (tomorrowSelection.selected || []).slice(0, dailyLimit).map(function (item, index) {
    const lead = item.lead || {};
    const template = item.template || {};
    return {
      order: index + 1,
      leadId: String(lead.id || ''),
      facilityName: String(lead.facility_name || lead.company_name || ''),
      companyName: String(lead.company_name || ''),
      genre: String(lead.genre || ''),
      toEmail: String(lead.email || ''),
      templateId: String(template.id || ''),
      templateName: String(template.name || ''),
      priorityEligibilityKind: String(item.priorityEligibility && item.priorityEligibility.kind || ''),
    };
  });

  const trackingMismatchCount = countLeadSendTrackingMismatches_(leads, histories);
  const alerts = [];
  if (!control.enabled) alerts.push({ tone: 'bad', title: '自動送信は停止中です', detail: control.reason || '管理者により停止されています。' });
  if (!triggerInstalled) alerts.push({ tone: 'bad', title: '自動送信トリガーがありません', detail: '完全自動送信の10分トリガーを確認してください。' });
  if (sendWindow.enabled === false) alerts.push({ tone: 'bad', title: '送信時間帯が無効です', detail: '管理画面で送信時間帯を有効にしてください。' });
  if (pending.staleCount > 0) alerts.push({ tone: 'bad', title: '送信中の履歴が滞留しています', detail: '30分以上の滞留が' + pending.staleCount + '件あります。' });
  if (todayCounts.failed > 0) alerts.push({ tone: 'warn', title: '本日の失敗があります', detail: todayCounts.failed + '件の詳細を確認してください。' });
  if (trackingMismatchCount > 0) alerts.push({ tone: 'warn', title: '送信回数の不一致があります', detail: trackingMismatchCount + '件の営業先で履歴との不一致があります。' });
  if (priorityState.enabled && priorityTemplateBlockReason) alerts.push({ tone: 'bad', title: '優先テンプレートを使用できません', detail: priorityTemplateBlockReason });
  if (priorityAutoReleaseExpected) alerts.push({ tone: 'info', title: 'グランピング優先は自動解除予定です', detail: '送信可能な優先対象が0件のため、次回実行時に通常送信へ戻ります。' });
  if (!tomorrowItems.length && tomorrowBlockReason) alerts.push({
    tone: tomorrowBlockCode === 'production_template_missing' ? 'warn' : 'info',
    title: tomorrowBlockCode === 'production_template_missing' ? '本番テンプレートの設定待ちです' : '明日の送信候補はありません',
    detail: tomorrowBlockReason,
  });
  if (!alerts.length) alerts.push({ tone: 'good', title: '送信を妨げる問題はありません', detail: '現在の設定と送信履歴では、自動送信を継続できます。' });

  return {
    generatedAt: generatedAt,
    timezone: timezone,
    control: Object.assign({}, control, {
      adminAllowed: admin.allowed,
      adminMode: admin.mode,
    }),
    sendWindow: sendWindow,
    trigger: {
      installed: triggerInstalled,
      count: triggerCount,
      intervalMinutes: 10,
    },
    nextRun: buildNextAutomaticEmailRun_(control, sendWindow, triggerInstalled),
    today: {
      date: today,
      counts: todayCounts,
      successfulProduction: Number(safety.successfulCountToday || 0),
      sendingProduction: Number(safety.reservedCountToday || 0),
      dailyLimit: dailyLimit,
      gmailQuotaRemaining: Number(quota.remaining || 0),
      gmailQuotaAvailable: quota.available !== false,
      remaining: remainingToday,
      displayed: todayItems.length,
      total: todayHistories.length,
      items: todayItems,
    },
    priority: priority,
    tomorrow: {
      date: Utilities.formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000), timezone, 'yyyy-MM-dd'),
      dailyLimit: dailyLimit,
      batchLimit: batchLimit,
      candidateCount: tomorrowItems.length,
      blockCode: tomorrowBlockCode,
      blockReason: tomorrowBlockReason,
      priorityAutoReleaseExpected: priorityAutoReleaseExpected,
      items: tomorrowItems,
      templateWaiting: templateCoverage,
    },
    safety: {
      pendingCount: pending.count,
      stalePendingCount: pending.staleCount,
      oldestPendingAt: pending.oldestAt,
      trackingMismatchCount: trackingMismatchCount,
    },
    alerts: alerts,
  };
}

function defaultEmailGenrePrioritySetting_() {
  return {
    enabled: false,
    genreKeyword: EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_,
    templateId: EMAIL_GENRE_PRIORITY_TEMPLATE_ID_,
    previousProductionTemplateIds: [],
    activatedAt: null,
    activatedBy: '',
    updatedAt: null,
    deactivatedReason: '',
  };
}

function getEmailGenrePrioritySetting_() {
  const fallback = defaultEmailGenrePrioritySetting_();
  const source = getSettingValue_(EMAIL_GENRE_PRIORITY_SETTING_KEY_, fallback);
  if (!source || typeof source !== 'object' || Array.isArray(source)) return fallback;
  const previousTemplateIds = source.previousProductionTemplateIds || source.previous_production_template_ids || [];
  return {
    enabled: source.enabled === true,
    genreKeyword: String(source.genreKeyword || source.genre_keyword || fallback.genreKeyword).trim() || fallback.genreKeyword,
    templateId: String(source.templateId || source.template_id || fallback.templateId).trim() || fallback.templateId,
    previousProductionTemplateIds: Array.from(new Set((Array.isArray(previousTemplateIds) ? previousTemplateIds : []).map(function (id) {
      return String(id || '').trim();
    }).filter(Boolean))),
    activatedAt: source.activatedAt || source.activated_at || null,
    activatedBy: String(source.activatedBy || source.activated_by || ''),
    updatedAt: source.updatedAt || source.updated_at || null,
    deactivatedReason: String(source.deactivatedReason || source.deactivated_reason || ''),
  };
}

function sanitizeEmailGenrePriorityState_(state) {
  const source = state && typeof state === 'object' ? state : defaultEmailGenrePrioritySetting_();
  return {
    enabled: source.enabled === true,
    genreKeyword: String(source.genreKeyword || EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_),
    templateId: String(source.templateId || EMAIL_GENRE_PRIORITY_TEMPLATE_ID_),
    activatedAt: source.activatedAt || null,
    updatedAt: source.updatedAt || null,
    deactivatedReason: String(source.deactivatedReason || ''),
    autoReleased: source.autoReleased === true,
  };
}

function emailGenrePriorityMatches_(genre, keyword) {
  const target = String(genre || '').trim().toLowerCase();
  const needle = String(keyword || EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_).trim().toLowerCase();
  return Boolean(target && needle && target.indexOf(needle) !== -1);
}

function getEmailGenrePriorityTemplateBlockReason_(state, template, options) {
  const source = state && typeof state === 'object' ? state : defaultEmailGenrePrioritySetting_();
  const input = options && typeof options === 'object' ? options : {};
  if (!template) return 'グランピング優先用テンプレートが見つからないため、送信を停止しました。';
  if (String(template.id || '') !== String(source.templateId || '')) return 'グランピング優先用テンプレートIDが一致しないため、送信を停止しました。';
  if (normalizeBooleanLike_(template.active) === false) return 'グランピング優先用テンプレートが無効なため、送信を停止しました。';
  if (String(template.template_type || '') !== 'initial') return 'グランピング優先用テンプレートが初回メールではないため、送信を停止しました。';
  if (!emailGenrePriorityMatches_(template.genre, source.genreKeyword)) return 'グランピング優先用テンプレートのジャンルが一致しないため、送信を停止しました。';
  if (!String(template.subject || '').trim() || !String(template.body || '').trim()) return 'グランピング優先用テンプレートの件名または本文が空です。';
  if (String(template.body || '').indexOf(EMAIL_GENRE_PRIORITY_LP_URL_) === -1) return 'グランピング優先用テンプレートに専用LPが含まれていません。';
  if (input.requireTest === true && !String(template.last_test_sent_at || '').trim()) return 'グランピング優先用テンプレートを本番利用する前にテスト送信してください。';
  if (input.requireProduction === true && !normalizeBooleanLike_(template.is_production)) return 'グランピング優先用テンプレートが本番ONではないため、送信を停止しました。';
  const mismatchReason = getTemplateGenreContentMismatchReason_(template);
  return mismatchReason || '';
}

function getEmailGenrePriorityEligibility_(lead, template, masterContext, nowMs) {
  const currentMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const intervalMs = EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_ * 24 * 60 * 60 * 1000;
  if (!lead || isArchivedLead_(lead)) return { blockReason: '営業対象外のため送信できません。', kind: 'blocked' };
  if (isClearlyClosedLead_(lead)) return { blockReason: '閉鎖・営業終了・休業が確認できるため送信できません。', kind: 'blocked' };
  if (isLeadLinkDefinitelyBroken_(lead)) return { blockReason: 'リンク切れが確認できるため送信できません。', kind: 'blocked' };
  if (isLeadReviewPending_(lead)) return { blockReason: '確認待ちのため、確認済みにするまで送信できません。', kind: 'blocked' };
  if (!isValidEmailAddress_(lead.email)) return { blockReason: '有効なメールアドレスがないため送信できません。', kind: 'blocked' };
  if (normalizeBooleanLike_(lead.send_ng) || String(lead.status || '') === '送信NG') {
    return { blockReason: '送信NGに指定されているため送信できません。', kind: 'blocked' };
  }
  if (normalizeBooleanLike_(lead.reply_checked)) return { blockReason: '返信確認済みのため送信できません。', kind: 'blocked' };

  const safety = masterContext && masterContext.mailSendSafety;
  const leadId = String(lead.id || '').trim();
  const email = normalizeEmailForSendSafety_(lead.email);
  if (safety) {
    if (leadId && safety.reservedLeadIds && safety.reservedLeadIds[leadId]) {
      return { blockReason: 'Lead already has a pending send reservation.', kind: 'blocked' };
    }
    if (email && safety.reservedEmails && safety.reservedEmails[email]) {
      return { blockReason: 'Email address already has a pending send reservation.', kind: 'blocked' };
    }
  }

  const templateId = String(template && template.id || EMAIL_GENRE_PRIORITY_TEMPLATE_ID_).trim();
  if (safety && templateId) {
    const sentByLead = leadId && safety.sentTemplateLeadIds && safety.sentTemplateLeadIds[templateId + '\n' + leadId];
    const sentByEmail = email && safety.sentTemplateEmails && safety.sentTemplateEmails[templateId + '\n' + email];
    if (sentByLead || sentByEmail) {
      return { blockReason: 'グランピング向けChatGPT広告の専用メールを送信済みです。', kind: 'blocked' };
    }
  }
  const formCampaignState = getGlampingChatgptFormSendState_(lead);
  if (formCampaignState.dedicatedAt) {
    return { blockReason: 'グランピング向けChatGPT広告をフォームで送信済みです。', kind: 'blocked' };
  }

  if (String(lead.deal_status || '未設定') !== '未設定') {
    return { blockReason: '商談状態が設定済みのため送信できません。', kind: 'blocked' };
  }
  if (SEND_EXCLUDED_STATUSES.indexOf(String(lead.status || '')) !== -1) {
    return { blockReason: '現在のステータスでは送信できません。', kind: 'blocked' };
  }
  const blocked = masterContext ? isLeadBlockedByMastersInContext_(lead, masterContext) : isLeadBlockedByMasters_(lead);
  if (blocked.blocked) return { blockReason: blocked.reason, kind: 'blocked' };

  const successfulAtCandidates = [];
  const leadLastSentAt = String(lead.last_sent_at || '').trim();
  const leadLastSentAtMs = leadLastSentAt ? new Date(leadLastSentAt).getTime() : NaN;
  if (Number.isFinite(leadLastSentAtMs)) successfulAtCandidates.push(leadLastSentAtMs);
  if (safety) {
    const leadHistoryAtMs = Number(safety.latestSuccessfulAtByLeadId && safety.latestSuccessfulAtByLeadId[leadId]);
    const emailHistoryAtMs = Number(safety.latestSuccessfulAtByEmail && safety.latestSuccessfulAtByEmail[email]);
    if (Number.isFinite(leadHistoryAtMs) && leadHistoryAtMs > 0) successfulAtCandidates.push(leadHistoryAtMs);
    if (Number.isFinite(emailHistoryAtMs) && emailHistoryAtMs > 0) successfulAtCandidates.push(emailHistoryAtMs);
  }
  const hasPriorSuccessfulSend = Boolean(
    lead.last_sent_at ||
    Number(lead.send_count || 0) > 0 ||
    String(lead.status || '').indexOf('送信済み') !== -1 ||
    (safety && leadId && safety.sentLeadIds && safety.sentLeadIds[leadId]) ||
    (safety && email && safety.sentEmails && safety.sentEmails[email])
  );
  if (!hasPriorSuccessfulSend) {
    return { blockReason: '', kind: 'unsent', previousSuccessfulAtMs: 0, availableAt: '' };
  }
  if (!successfulAtCandidates.length) {
    return {
      blockReason: '通常メールの送信済み記録はありますが、前回送信日を確認できないため送信を停止しています。',
      kind: 'blocked',
    };
  }

  const previousSuccessfulAtMs = Math.max.apply(null, successfulAtCandidates);
  const availableAtMs = previousSuccessfulAtMs + intervalMs;
  if (currentMs < availableAtMs) {
    const remainingDays = Math.max(1, Math.ceil((availableAtMs - currentMs) / (24 * 60 * 60 * 1000)));
    return {
      blockReason: '前回メール送信から' + EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_ + '日未満です。あと' + remainingDays + '日経過後に対象になります。',
      kind: 'blocked',
      previousSuccessfulAtMs: previousSuccessfulAtMs,
      availableAt: new Date(availableAtMs).toISOString(),
    };
  }
  return {
    blockReason: '',
    kind: 'previously_sent',
    previousSuccessfulAtMs: previousSuccessfulAtMs,
    availableAt: new Date(availableAtMs).toISOString(),
  };
}

function getEmailGenrePriorityCandidateBlockReason_(lead, template, masterContext, nowMs) {
  return getEmailGenrePriorityEligibility_(lead, template, masterContext, nowMs).blockReason;
}

function compareEmailGenrePriorityEvaluated_(left, right) {
  const leftRank = left.eligibility.kind === 'unsent' ? 0 : 1;
  const rightRank = right.eligibility.kind === 'unsent' ? 0 : 1;
  if (leftRank !== rightRank) return leftRank - rightRank;
  if (leftRank === 1) {
    const dateDifference = Number(left.eligibility.previousSuccessfulAtMs || 0) - Number(right.eligibility.previousSuccessfulAtMs || 0);
    if (dateDifference) return dateDifference;
  }
  return String(right.lead.updated_at || right.lead.created_at || '').localeCompare(String(left.lead.updated_at || left.lead.created_at || ''));
}

function sortEmailGenrePriorityEvaluated_(evaluated) {
  evaluated.sort(compareEmailGenrePriorityEvaluated_);
  return evaluated;
}

function selectEmailGenrePriorityCandidates_(leads, template, masterContext, limit, genreKeyword, nowMs) {
  const keyword = String(genreKeyword || EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_).trim();
  const evaluated = (Array.isArray(leads) ? leads : []).filter(function (lead) {
    return emailGenrePriorityMatches_(lead && lead.genre, keyword);
  }).map(function (lead) {
    return { lead: lead, eligibility: getEmailGenrePriorityEligibility_(lead, template, masterContext, nowMs) };
  }).filter(function (item) {
    return !item.eligibility.blockReason;
  });
  sortEmailGenrePriorityEvaluated_(evaluated);
  const seenEmails = {};
  const unique = evaluated.filter(function (item) {
    const email = normalizeEmailForSendSafety_(item.lead.email);
    if (!email || seenEmails[email]) return false;
    seenEmails[email] = true;
    return true;
  });
  const safeLimit = Math.max(0, Number(limit) || 0);
  const selectedItems = unique.slice(0, safeLimit);
  const breakdown = unique.reduce(function (result, item) {
    if (item.eligibility.kind === 'unsent') result.unsent += 1;
    if (item.eligibility.kind === 'previously_sent') result.previouslySent += 1;
    return result;
  }, { unsent: 0, previouslySent: 0 });
  return {
    total: unique.length,
    breakdown: breakdown,
    selected: selectedItems.map(function (item) {
      return { lead: item.lead, template: template, priorityEligibility: item.eligibility };
    }),
    groups: selectedItems.length ? [{
      templateId: String(template.id || ''),
      templateName: String(template.name || ''),
      genre: keyword,
      leadIds: selectedItems.map(function (item) { return item.lead.id; }),
    }] : [],
  };
}

function classifyEmailGenrePriorityBlockReason_(blockReason, eligibilityKind) {
  const reason = String(blockReason || '').trim();
  if (!reason && eligibilityKind === 'unsent') {
    return { key: 'sendable_unsent', label: '送信可能（未送信）', detail: '成功した本番メール履歴がないため、最初に送信します。' };
  }
  if (!reason && eligibilityKind === 'previously_sent') {
    return { key: 'sendable_previously_sent', label: '送信可能（通常メール送信済み）', detail: '通常メールの前回送信から30日以上経過しているため、未送信施設の後に送信します。' };
  }
  if (!reason) return { key: 'sendable', label: '送信可能', detail: '優先送信の対象です。' };
  if (/営業対象外|archived/i.test(reason)) return { key: 'archived', label: '営業対象外', detail: reason };
  if (/閉鎖|閉店|閉館|閉園|閉業|廃業|休業|営業終了/i.test(reason)) return { key: 'closed', label: '閉鎖・休業', detail: reason };
  if (/リンク切れ|URL|DNS|host|certificate|SSL/i.test(reason)) return { key: 'broken_link', label: 'リンク切れ', detail: reason };
  if (/確認待ち/.test(reason)) return { key: 'review_pending', label: '確認待ち', detail: reason };
  if (/有効なメールアドレス/.test(reason)) return { key: 'invalid_email', label: 'メールアドレスなし・不正', detail: reason };
  if (/送信NG/.test(reason)) return { key: 'send_ng', label: '送信NG', detail: reason };
  if (/返信確認済み|返信あり/.test(reason)) return { key: 'reply', label: '返信確認済み', detail: reason };
  if (/pending send reservation|送信中|送信予約/i.test(reason)) {
    return { key: 'sending', label: '送信中', detail: '送信中の予約が残っているため、二重送信防止中です。' };
  }
  if (/専用メールを送信済み|ChatGPT広告.*送信済み/.test(reason)) {
    return { key: 'dedicated_sent', label: '専用メール送信済み', detail: reason };
  }
  if (/30日未満|経過後に対象/.test(reason)) return { key: 'waiting_period', label: '30日待機中', detail: reason };
  if (/前回送信日を確認できない/.test(reason)) return { key: 'sent_date_unknown', label: '前回送信日を要確認', detail: reason };
  if (/already has|already sent|送信済み|successful send/i.test(reason)) {
    return { key: 'sent', label: '送信済み', detail: 'すでに送信済み、または成功した送信履歴があります。' };
  }
  if (/商談状態|商談予定|商談済み|受注|失注/.test(reason)) return { key: 'deal', label: '商談状態あり', detail: reason };
  if (/除外ドメイン/.test(reason)) return { key: 'excluded_domain', label: '除外ドメイン', detail: reason };
  if (/現在のステータス/.test(reason)) return { key: 'status', label: '現在のステータス', detail: reason };
  return { key: 'other', label: 'その他の送信条件', detail: reason };
}

function buildEmailGenrePriorityDiagnostics_(leads, template, masterContext, genreKeyword, nowMs) {
  const keyword = String(genreKeyword || EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_).trim();
  const evaluated = (Array.isArray(leads) ? leads : []).filter(function (lead) {
    return emailGenrePriorityMatches_(lead && lead.genre, keyword);
  }).map(function (lead) {
    return { lead: lead, eligibility: getEmailGenrePriorityEligibility_(lead, template, masterContext, nowMs) };
  });
  evaluated.sort(function (left, right) {
    const leftSendable = left.eligibility.blockReason ? 1 : 0;
    const rightSendable = right.eligibility.blockReason ? 1 : 0;
    if (leftSendable !== rightSendable) return leftSendable - rightSendable;
    if (!leftSendable) return compareEmailGenrePriorityEvaluated_(left, right);
    return String(right.lead.updated_at || right.lead.created_at || '').localeCompare(String(left.lead.updated_at || left.lead.created_at || ''));
  });

  const seenSendableEmails = {};
  const reasonCounts = {};
  const reasonLabels = {};
  let sendableCount = 0;
  let unsentCount = 0;
  let previouslySentCount = 0;
  const items = evaluated.map(function (evaluatedItem) {
    const lead = evaluatedItem.lead;
    const eligibility = evaluatedItem.eligibility;
    let blockReason = eligibility.blockReason;
    if (!blockReason) {
      const email = normalizeEmailForSendSafety_(lead.email);
      if (email && seenSendableEmails[email]) {
        blockReason = '同じメールアドレスの先行候補があるため、重複送信を防止しています。';
      } else if (email) {
        seenSendableEmails[email] = true;
      }
    }
    let category = classifyEmailGenrePriorityBlockReason_(blockReason, eligibility.kind);
    if (/重複送信/.test(String(blockReason || ''))) {
      category = { key: 'duplicate_email', label: '同一宛先の重複', detail: String(blockReason || '') };
    }
    if (category.key.indexOf('sendable') === 0) {
      sendableCount += 1;
      if (eligibility.kind === 'unsent') unsentCount += 1;
      if (eligibility.kind === 'previously_sent') previouslySentCount += 1;
    }
    reasonCounts[category.key] = Number(reasonCounts[category.key] || 0) + 1;
    reasonLabels[category.key] = category.label;
    return {
      leadId: String(lead.id || ''),
      facilityName: String(lead.facility_name || lead.company_name || ''),
      companyName: String(lead.company_name || ''),
      genre: String(lead.genre || ''),
      toEmail: String(lead.email || ''),
      status: String(lead.status || ''),
      sendable: category.key.indexOf('sendable') === 0,
      reasonKey: category.key,
      reasonLabel: category.label,
      reasonDetail: category.detail,
      eligibilityKind: eligibility.kind,
      previousSuccessfulAt: eligibility.previousSuccessfulAtMs ? new Date(eligibility.previousSuccessfulAtMs).toISOString() : '',
      availableAt: String(eligibility.availableAt || ''),
    };
  });

  const reasonOrder = [
    'sendable_unsent',
    'sendable_previously_sent',
    'sendable',
    'invalid_email',
    'waiting_period',
    'dedicated_sent',
    'sent_date_unknown',
    'sent',
    'archived',
    'send_ng',
    'review_pending',
    'excluded_domain',
    'sending',
    'duplicate_email',
    'reply',
    'deal',
    'closed',
    'broken_link',
    'status',
    'other',
  ];
  const reasons = reasonOrder.filter(function (key) {
    return Number(reasonCounts[key] || 0) > 0;
  }).map(function (key) {
    return { key: key, label: reasonLabels[key] || key, count: Number(reasonCounts[key] || 0) };
  });

  return {
    keyword: keyword,
    totalCount: items.length,
    sendableCount: sendableCount,
    unsentCount: unsentCount,
    previouslySentCount: previouslySentCount,
    blockedCount: Math.max(0, items.length - sendableCount),
    reasons: reasons,
    items: items,
  };
}

function getEmailGenrePriorityAdminStatus_() {
  let activeEmail = '';
  let effectiveEmail = '';
  try {
    activeEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  } catch (error) {
    activeEmail = '';
  }
  try {
    effectiveEmail = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  } catch (error) {
    effectiveEmail = '';
  }
  const allowed = !activeEmail || !effectiveEmail || activeEmail === effectiveEmail;
  return {
    allowed: allowed,
    email: activeEmail || effectiveEmail,
    mode: activeEmail ? 'active_user' : 'myself_deployment',
  };
}

function assertEmailGenrePriorityAdmin_() {
  const admin = getEmailGenrePriorityAdminStatus_();
  if (!admin.allowed) {
    throw createExpectedOperationError_('グランピング優先は管理者だけが変更できます。', 'EMAIL_GENRE_PRIORITY_ADMIN_REQUIRED');
  }
  return admin;
}

function saveEmailGenrePrioritySettingUnlocked_(state) {
  const normalized = normalizeSettingForSave_(EMAIL_GENRE_PRIORITY_SETTING_KEY_, state, 'json');
  upsertSettingValueUnlocked_(normalized, 'Exclusive email genre priority. Disabled until an administrator explicitly starts it.');
  return JSON.parse(normalized.value);
}

function deactivateEmailGenrePriorityUnlocked_(state, reason) {
  const source = state && typeof state === 'object' ? state : getEmailGenrePrioritySetting_();
  const dedicatedTemplate = findSheetRecordById_('email_templates', source.templateId);
  if (dedicatedTemplate && normalizeBooleanLike_(dedicatedTemplate.is_production)) {
    updateSheetRecord_('email_templates', dedicatedTemplate.id, {
      is_production: false,
      production_enabled_at: '',
    }, { clearCaches: false });
  }
  (source.previousProductionTemplateIds || []).forEach(function (templateId) {
    const template = findSheetRecordById_('email_templates', templateId);
    if (!template || normalizeBooleanLike_(template.active) === false || String(template.template_type || '') !== 'initial') return;
    updateSheetRecord_('email_templates', template.id, {
      is_production: true,
      production_enabled_at: nowIso_(),
    }, { clearCaches: false });
  });
  clearRuntimeCaches_('email_templates');
  return saveEmailGenrePrioritySettingUnlocked_(Object.assign({}, source, {
    enabled: false,
    previousProductionTemplateIds: [],
    updatedAt: nowIso_(),
    deactivatedReason: String(reason || '管理者が解除しました。').slice(0, 500),
  }));
}

function deactivateEmailGenrePrioritySystem_(reason) {
  return withScriptLock_('deactivateEmailGenrePrioritySystem', function () {
    const state = getEmailGenrePrioritySetting_();
    if (!state.enabled) return state;
    return deactivateEmailGenrePriorityUnlocked_(state, reason);
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function setEmailGenrePriority(input) {
  const source = input && typeof input === 'object' ? input : {};
  if (typeof source.enabled !== 'boolean') {
    throw createExpectedOperationError_('enabled is required.', 'EMAIL_GENRE_PRIORITY_INVALID_INPUT');
  }
  const admin = assertEmailGenrePriorityAdmin_();
  withScriptLock_('setEmailGenrePriority', function () {
    const current = getEmailGenrePrioritySetting_();
    if (!source.enabled) {
      if (current.enabled) deactivateEmailGenrePriorityUnlocked_(current, source.reason || '管理者が解除しました。');
      return;
    }
    if (current.enabled) return;

    const template = findSheetRecordById_('email_templates', current.templateId);
    const blockReason = getEmailGenrePriorityTemplateBlockReason_(current, template, { requireTest: true });
    if (blockReason) throw createExpectedOperationError_(blockReason, 'EMAIL_GENRE_PRIORITY_TEMPLATE_NOT_READY');

    const masterContext = buildMasterBlockContext_();
    const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 });
    const selection = selectEmailGenrePriorityCandidates_(leads, template, masterContext, 1, current.genreKeyword);
    if (!selection.total) {
      throw createExpectedOperationError_('現時点で送信可能なグランピング施設が0件のため、優先を開始できません。', 'EMAIL_GENRE_PRIORITY_NO_TARGETS');
    }

    const productionTemplates = readAllActiveSheetRecords_('email_templates').filter(function (item) {
      return String(item.id || '') !== String(template.id || '') &&
        String(item.template_type || '') === 'initial' &&
        normalizeBooleanLike_(item.is_production) &&
        emailGenrePriorityMatches_(item.genre, current.genreKeyword);
    });
    const dedicatedWasProduction = normalizeBooleanLike_(template.is_production);
    try {
      productionTemplates.forEach(function (item) {
        updateSheetRecord_('email_templates', item.id, {
          is_production: false,
          production_enabled_at: '',
        }, { clearCaches: false });
      });
      updateSheetRecord_('email_templates', template.id, {
        is_production: true,
        production_enabled_at: nowIso_(),
      }, { clearCaches: false });
      clearRuntimeCaches_('email_templates');
      saveEmailGenrePrioritySettingUnlocked_(Object.assign({}, current, {
        enabled: true,
        previousProductionTemplateIds: productionTemplates.map(function (item) { return item.id; }),
        activatedAt: nowIso_(),
        activatedBy: admin.email,
        updatedAt: nowIso_(),
        deactivatedReason: '',
      }));
    } catch (error) {
      try {
        updateSheetRecord_('email_templates', template.id, {
          is_production: dedicatedWasProduction,
          production_enabled_at: dedicatedWasProduction ? String(template.production_enabled_at || '') : '',
        }, { clearCaches: false });
        productionTemplates.forEach(function (item) {
          updateSheetRecord_('email_templates', item.id, {
            is_production: true,
            production_enabled_at: String(item.production_enabled_at || nowIso_()),
          }, { clearCaches: false });
        });
        clearRuntimeCaches_('email_templates');
      } catch (rollbackError) {
        logError_('setEmailGenrePriorityRollback', rollbackError, { original_error: error.message || String(error) });
      }
      throw error;
    }
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  return getEmailGenrePriorityStatus();
}

function getEmailGenrePriorityStatus(options) {
  const input = options && typeof options === 'object' ? options : {};
  const state = getEmailGenrePrioritySetting_();
  const template = findSheetRecordById_('email_templates', state.templateId);
  const admin = getEmailGenrePriorityAdminStatus_();
  let targetCount = null;
  let targetBreakdown = { unsent: 0, previouslySent: 0 };
  if (input.includeCounts !== false) {
    const masterContext = buildMasterBlockContext_();
    const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 });
    const selection = selectEmailGenrePriorityCandidates_(leads, template || EMAIL_GENRE_PRIORITY_TEMPLATE_, masterContext, Number.MAX_SAFE_INTEGER, state.genreKeyword);
    targetCount = selection.total;
    targetBreakdown = selection.breakdown || targetBreakdown;
  }
  const templateBlockReason = getEmailGenrePriorityTemplateBlockReason_(state, template, {
    requireTest: true,
    requireProduction: state.enabled,
  });
  return Object.assign({}, sanitizeEmailGenrePriorityState_(state), {
    adminAllowed: admin.allowed,
    adminMode: admin.mode,
    targetCount: targetCount,
    unsentTargetCount: input.includeCounts === false ? null : Number(targetBreakdown.unsent || 0),
    previouslySentTargetCount: input.includeCounts === false ? null : Number(targetBreakdown.previouslySent || 0),
    resendIntervalDays: EMAIL_GENRE_PRIORITY_RESEND_INTERVAL_DAYS_,
    templateName: String(template && template.name || EMAIL_GENRE_PRIORITY_TEMPLATE_NAME_),
    templateActive: Boolean(template && normalizeBooleanLike_(template.active)),
    templateProduction: Boolean(template && normalizeBooleanLike_(template.is_production)),
    templateTestedAt: String(template && template.last_test_sent_at || ''),
    templateBlockReason: templateBlockReason,
    canActivate: !state.enabled && admin.allowed && targetCount !== 0 && !templateBlockReason,
    canDeactivate: state.enabled && admin.allowed,
    lpUrl: EMAIL_GENRE_PRIORITY_LP_URL_,
    exclusive: state.enabled,
  });
}

function enforceEmailGenrePriorityForLeadIds_(leadIds, templateId, options) {
  const input = options && typeof options === 'object' ? options : {};
  const state = getEmailGenrePrioritySetting_();
  if (!state.enabled) return sanitizeEmailGenrePriorityState_(state);
  const template = findSheetRecordById_('email_templates', state.templateId);
  const templateBlockReason = getEmailGenrePriorityTemplateBlockReason_(state, template, {
    requireTest: true,
    requireProduction: true,
  });
  if (templateBlockReason) throw createExpectedOperationError_(templateBlockReason, 'EMAIL_GENRE_PRIORITY_TEMPLATE_UNAVAILABLE');

  if (input.skipAvailabilityCheck !== true) {
    const masterContext = buildMasterBlockContext_();
    const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 });
    const selection = selectEmailGenrePriorityCandidates_(leads, template, masterContext, 1, state.genreKeyword);
    if (!selection.total) {
      const released = deactivateEmailGenrePrioritySystem_('送信可能なグランピング施設が0件になったため自動解除しました。');
      return Object.assign({}, sanitizeEmailGenrePriorityState_(released), { autoReleased: true });
    }
  }
  if (String(templateId || '') !== String(state.templateId || '')) {
    throw createExpectedOperationError_('現在はグランピング優先中です。専用テンプレート以外では送信できません。', 'EMAIL_GENRE_PRIORITY_TEMPLATE_BLOCKED');
  }
  const invalidLead = (Array.isArray(leadIds) ? leadIds : []).map(function (leadId) {
    return getLeadById(leadId);
  }).find(function (lead) {
    return !emailGenrePriorityMatches_(lead && lead.genre, state.genreKeyword);
  });
  if (invalidLead) {
    throw createExpectedOperationError_('現在はグランピング優先中です。他ジャンルには送信できません。', 'EMAIL_GENRE_PRIORITY_GENRE_BLOCKED');
  }
  return sanitizeEmailGenrePriorityState_(state);
}

function maybeAutoDeactivateEmailGenrePriority_() {
  const state = getEmailGenrePrioritySetting_();
  if (!state.enabled) return sanitizeEmailGenrePriorityState_(state);
  const template = findSheetRecordById_('email_templates', state.templateId);
  if (getEmailGenrePriorityTemplateBlockReason_(state, template, { requireTest: true, requireProduction: true })) {
    return sanitizeEmailGenrePriorityState_(state);
  }
  const masterContext = buildMasterBlockContext_();
  const leads = readSheetRecordFields_('leads', mailSendCandidateLeadFields_(), { maxGapColumns: 2 });
  const selection = selectEmailGenrePriorityCandidates_(leads, template, masterContext, 1, state.genreKeyword);
  if (selection.total) return sanitizeEmailGenrePriorityState_(state);
  const released = deactivateEmailGenrePrioritySystem_('送信可能なグランピング施設が0件になったため自動解除しました。');
  return Object.assign({}, sanitizeEmailGenrePriorityState_(released), { autoReleased: true });
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
  const recovery = source.deliveryRecovery && typeof source.deliveryRecovery === 'object' ? source.deliveryRecovery : {};
  const staleRecovery = source.staleRecovery && typeof source.staleRecovery === 'object' ? source.staleRecovery : {};
  return {
    selectedCount: Number(source.selectedCount || 0),
    dailyRemaining: Number(source.dailyRemaining || 0),
    mailQuota: Number(source.mailQuota || 0),
    deliveryRecovery: {
      found: Number(recovery.found || 0),
      processed: Number(recovery.processed || 0),
      recoveredSuccess: Number(recovery.recoveredSuccess || 0),
      recoveredFailure: Number(recovery.recoveredFailure || 0),
      errorCount: Array.isArray(recovery.errors) ? recovery.errors.length : 0,
    },
    staleRecovery: {
      found: Number(staleRecovery.found || 0),
      processed: Number(staleRecovery.processed || 0),
      recoveredSuccess: Number(staleRecovery.recoveredSuccess || 0),
      recoveredFailure: Number(staleRecovery.recoveredFailure || 0),
      errorCount: Array.isArray(staleRecovery.errors) ? staleRecovery.errors.length : 0,
    },
    emailGenrePriority: Object.assign({
      enabled: false,
      genreKeyword: EMAIL_GENRE_PRIORITY_DEFAULT_GENRE_,
      templateId: EMAIL_GENRE_PRIORITY_TEMPLATE_ID_,
      templateName: EMAIL_GENRE_PRIORITY_TEMPLATE_NAME_,
      autoReleased: false,
    }, source.emailGenrePriority || {}),
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

function scheduledEmailJobClaimFields_() {
  return [
    'id',
    'job_type',
    'status',
    'last_heartbeat_at',
    'started_at',
    'created_at',
    'updated_at',
  ];
}

function claimScheduledEmailJob_() {
  const retryDelaysMs = [500, 1500];
  let lastError = null;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return claimScheduledEmailJobOnce_();
    } catch (error) {
      lastError = error;
      if (!isRetryableGoogleSheetsServiceError_(error) || attempt >= retryDelaysMs.length) {
        logError_('claimScheduledEmailJob', error, {
          attempt: attempt + 1,
          attempts: retryDelaysMs.length + 1,
        });
        throw error;
      }
      Utilities.sleep(retryDelaysMs[attempt]);
    }
  }
  throw lastError || new Error('完全自動送信ジョブを開始できませんでした。');
}

function claimScheduledEmailJobOnce_() {
  return withScriptLock_('claimScheduledEmailJob', function () {
    const jobs = readSheetRecordFields_('jobs', scheduledEmailJobClaimFields_(), { maxGapColumns: 0 });
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
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400, logErrors: false });
}

function isRetryableGoogleSheetsServiceError_(error) {
  const message = String(error && (error.message || error.details) || error || '');
  return /スプレッドシート.*(?:サービス.*(?:タイムアウト|接続でき)|アクセス中)|Service (?:Spreadsheets|Sheets) (?:failed|timed out)|internal error|try again/i.test(message);
}

function heartbeatScheduledEmailJob_(jobId, processed, total) {
  return withScriptLock_('heartbeatScheduledEmailJob', function () {
    return updateSheetRecord_('jobs', jobId, {
      total_count: Number(total || 0),
      processed_count: Number(processed || 0),
      current_query: '完全自動送信 ' + Number(processed || 0) + ' / ' + Number(total || 0) + '件',
      last_heartbeat_at: nowIso_(),
    });
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
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
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
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
  const isGenrePriorityTemplate = String(template.id || '') === EMAIL_GENRE_PRIORITY_TEMPLATE_ID_;
  const sendBlockReason = isGenrePriorityTemplate
    ? getEmailGenrePriorityCandidateBlockReason_(lead, template, context)
    : getEmailSendTargetBlockReason_(lead, context);
  if (sendBlockReason) throw createExpectedOperationError_(sendBlockReason, 'MAIL_TARGET_BLOCKED');
  assertEmailSendLimitAvailable_({
    includeReservations: true,
    safety: context.mailSendSafety,
  });

  const senderName = resolveGmailSenderName_(input);
  const sendType = isGenrePriorityTemplate
    ? EMAIL_GENRE_PRIORITY_SEND_TYPE_
    : (input.send_type || input.sendType || '初回メール');
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
    sendGmailMessage_({
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
  recordMailDeliveryReceipt_(reservation, sendResult, errorMessage);

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
    }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
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
  } else {
    clearMailDeliveryReceipt_(reservation.id);
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

function mailSendSafetyHistoryFields_() {
  return ['id', 'lead_id', 'sent_at', 'send_type', 'to_email', 'send_result', 'template_id', 'created_at'];
}

function readMailSendSafetyHistories_() {
  return readSheetRecordFields_('send_histories', mailSendSafetyHistoryFields_());
}

function buildMailSendSafetyContext_(historyRecords) {
  const histories = Array.isArray(historyRecords)
    ? historyRecords
    : readMailSendSafetyHistories_();
  const today = todayText_();
  const sentLeadIds = {};
  const sentEmails = {};
  const sentTemplateLeadIds = {};
  const sentTemplateEmails = {};
  const latestSuccessfulAtByLeadId = {};
  const latestSuccessfulAtByEmail = {};
  const reservedLeadIds = {};
  const reservedEmails = {};
  let successfulCountToday = 0;
  let reservedCountToday = 0;
  histories.forEach(function (history) {
    const leadId = String(history.lead_id || '').trim();
    const email = normalizeEmailForSendSafety_(history.to_email || '');
    const templateId = String(history.template_id || '').trim();
    const historyDate = String(history.sent_at || history.created_at || '').slice(0, today.length);
    if (isSuccessfulProductionSendHistory_(history)) {
      if (leadId) sentLeadIds[leadId] = true;
      if (email) sentEmails[email] = true;
      if (templateId && leadId) sentTemplateLeadIds[templateId + '\n' + leadId] = true;
      if (templateId && email) sentTemplateEmails[templateId + '\n' + email] = true;
      const successfulAt = String(history.sent_at || history.created_at || '').trim();
      const successfulAtMs = new Date(successfulAt || 0).getTime();
      if (leadId && Number.isFinite(successfulAtMs) && successfulAtMs > Number(latestSuccessfulAtByLeadId[leadId] || 0)) {
        latestSuccessfulAtByLeadId[leadId] = successfulAtMs;
      }
      if (email && Number.isFinite(successfulAtMs) && successfulAtMs > Number(latestSuccessfulAtByEmail[email] || 0)) {
        latestSuccessfulAtByEmail[email] = successfulAtMs;
      }
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
    sentTemplateLeadIds: sentTemplateLeadIds,
    sentTemplateEmails: sentTemplateEmails,
    latestSuccessfulAtByLeadId: latestSuccessfulAtByLeadId,
    latestSuccessfulAtByEmail: latestSuccessfulAtByEmail,
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

function mailDeliveryReceiptPropertyKey_(reservationId) {
  const normalizedId = String(reservationId || '').trim();
  return normalizedId ? MAIL_DELIVERY_RECEIPT_PREFIX_ + normalizedId : '';
}

function recordMailDeliveryReceipt_(reservation, sendResult, errorMessage) {
  const source = reservation && typeof reservation === 'object' ? reservation : {};
  const propertyKey = mailDeliveryReceiptPropertyKey_(source.id);
  const receipt = {
    reservationId: String(source.id || ''),
    leadId: String(source.lead_id || ''),
    sendResult: String(sendResult || '失敗') === '成功' ? '成功' : '失敗',
    errorMessage: String(errorMessage || '').slice(0, 2000),
    sentAt: String(source.sent_at || source.created_at || nowIso_()),
    sendType: String(source.send_type || '初回メール'),
    recordedAt: nowIso_(),
  };
  if (!propertyKey || typeof PropertiesService === 'undefined') return { persisted: false, receipt: receipt };
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties || typeof properties.setProperty !== 'function') return { persisted: false, receipt: receipt };
    properties.setProperty(propertyKey, JSON.stringify(receipt));
    return { persisted: true, receipt: receipt };
  } catch (error) {
    console.warn('メール送信結果の一時保存に失敗しました: ' + String(error.message || error));
    return { persisted: false, receipt: receipt };
  }
}

function clearMailDeliveryReceipt_(reservationId) {
  const propertyKey = mailDeliveryReceiptPropertyKey_(reservationId);
  if (!propertyKey || typeof PropertiesService === 'undefined') return false;
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties || typeof properties.deleteProperty !== 'function') return false;
    properties.deleteProperty(propertyKey);
    return true;
  } catch (error) {
    console.warn('メール送信結果の一時記録を削除できませんでした: ' + String(error.message || error));
    return false;
  }
}

function listMailDeliveryReceipts_() {
  if (typeof PropertiesService === 'undefined') return [];
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties || typeof properties.getProperties !== 'function') return [];
    const allProperties = properties.getProperties() || {};
    return Object.keys(allProperties).filter(function (key) {
      return String(key || '').indexOf(MAIL_DELIVERY_RECEIPT_PREFIX_) === 0;
    }).map(function (key) {
      try {
        const receipt = JSON.parse(String(allProperties[key] || '{}')) || {};
        receipt.propertyKey = key;
        return receipt;
      } catch (error) {
        return { propertyKey: key, invalid: true };
      }
    });
  } catch (error) {
    console.warn('メール送信結果の一時記録を読み込めませんでした: ' + String(error.message || error));
    return [];
  }
}

function reconcileMailDeliveryReceipts_(historyRecords, options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxItems = Math.min(Math.max(Number(input.maxItems) || 20, 1), 100);
  const histories = Array.isArray(historyRecords) ? historyRecords : [];
  const historyById = {};
  histories.forEach(function (history) {
    const historyId = String(history.id || '').trim();
    if (historyId) historyById[historyId] = history;
  });
  const receipts = listMailDeliveryReceipts_().slice(0, maxItems);
  const summary = {
    found: receipts.length,
    processed: 0,
    recoveredSuccess: 0,
    recoveredFailure: 0,
    errors: [],
  };
  receipts.forEach(function (receipt) {
    const reservationId = String(receipt.reservationId || '').trim();
    const knownHistory = historyById[reservationId];
    if (receipt.invalid || !reservationId || !knownHistory || String(knownHistory.send_type || '').indexOf('テスト') !== -1) return;
    try {
      const result = withScriptLock_('reconcileMailDeliveryReceipt', function () {
        const current = findSheetRecordById_('send_histories', reservationId);
        if (!current) throw new Error('送信履歴が見つかりません: ' + reservationId);
        const desiredResult = String(receipt.sendResult || '') === '成功' ? '成功' : '失敗';
        let finalized = current;
        if (String(current.send_result || '') === PRODUCTION_SEND_RESERVED_RESULT_) {
          finalized = updateSheetRecord_('send_histories', reservationId, {
            send_result: desiredResult,
            error_message: desiredResult === '成功' ? '' : String(receipt.errorMessage || 'メール送信に失敗しました。'),
          });
        }
        if (desiredResult === '成功' && String(finalized.send_result || '') === '成功') {
          reconcileLeadSendTrackingFromHistory_(finalized);
        }
        clearMailDeliveryReceipt_(reservationId);
        return {
          sendResult: String(finalized.send_result || desiredResult),
        };
      }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
      summary.processed += 1;
      if (result.sendResult === '成功') summary.recoveredSuccess += 1;
      else summary.recoveredFailure += 1;
    } catch (error) {
      summary.errors.push({ reservationId: reservationId, message: error.message || String(error) });
      if (!isExpectedOperationError_(error)) {
        logError_('reconcileMailDeliveryReceipt', error, {
          target_sheet: 'send_histories',
          target_id: reservationId,
        });
      }
    }
  });
  return summary;
}

function reconcileStaleMailReservations_(historyRecords, options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxItems = Math.min(Math.max(Number(input.maxItems) || 5, 1), 20);
  const currentMs = Number.isFinite(Number(input.nowMs)) ? Number(input.nowMs) : Date.now();
  const stale = (Array.isArray(historyRecords) ? historyRecords : []).filter(function (history) {
    if (!isProductionSendReservationHistory_(history)) return false;
    const timestampMs = new Date(String(history.sent_at || history.created_at || '') || 0).getTime();
    return !Number.isFinite(timestampMs) || currentMs - timestampMs >= 30 * 60 * 1000;
  }).slice(0, maxItems);
  const summary = {
    found: stale.length,
    processed: 0,
    recoveredSuccess: 0,
    recoveredFailure: 0,
    errors: [],
  };

  stale.forEach(function (history) {
    const reservationId = String(history.id || '').trim();
    if (!reservationId) return;
    try {
      const current = findSheetRecordById_('send_histories', reservationId);
      if (!current || !isProductionSendReservationHistory_(current)) return;
      const delivery = findSentGmailMessageForReservation_(current);
      const desiredResult = delivery.found ? '成功' : '失敗';
      const finalized = withScriptLock_('reconcileStaleMailReservation', function () {
        const latest = findSheetRecordById_('send_histories', reservationId);
        if (!latest) throw new Error('送信履歴が見つかりません: ' + reservationId);
        if (!isProductionSendReservationHistory_(latest)) return latest;
        return updateSheetRecord_('send_histories', reservationId, {
          send_result: desiredResult,
          error_message: delivery.found
            ? ''
            : '自動送信処理が中断し、Gmail送信済みに該当メールがないため自動解除しました。',
          gmail_message_id: delivery.messageId || '',
          gmail_thread_id: delivery.threadId || '',
        });
      }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
      if (desiredResult === '成功' && String(finalized.send_result || '') === '成功') {
        reconcileLeadSendTrackingFromHistory_(finalized);
      }
      clearMailDeliveryReceipt_(reservationId);
      summary.processed += 1;
      if (desiredResult === '成功') summary.recoveredSuccess += 1;
      else summary.recoveredFailure += 1;
    } catch (error) {
      summary.errors.push({ reservationId: reservationId, message: error.message || String(error) });
      if (!isExpectedOperationError_(error)) {
        logError_('reconcileStaleMailReservation', error, {
          target_sheet: 'send_histories',
          target_id: reservationId,
        });
      }
    }
  });
  return summary;
}

function findSentGmailMessageForReservation_(history) {
  const source = history && typeof history === 'object' ? history : {};
  const email = normalizeEmailForSendSafety_(source.to_email || '');
  const subject = String(source.subject || '').trim();
  const sentAtMs = new Date(String(source.sent_at || source.created_at || '') || 0).getTime();
  if (!email || !subject || !Number.isFinite(sentAtMs)) {
    throw new Error('送信済み照合に必要な宛先・件名・送信日時が不足しています。');
  }
  if (typeof GmailApp === 'undefined' || typeof GmailApp.search !== 'function') {
    throw new Error('Gmail送信済みを照合できません。');
  }
  const timezone = typeof Session !== 'undefined' && Session.getScriptTimeZone
    ? (Session.getScriptTimeZone() || 'Asia/Tokyo')
    : 'Asia/Tokyo';
  const queryStart = new Date(sentAtMs - 24 * 60 * 60 * 1000);
  const queryEnd = new Date(sentAtMs + 2 * 24 * 60 * 60 * 1000);
  const query = 'in:sent to:' + email +
    ' after:' + Utilities.formatDate(queryStart, timezone, 'yyyy/MM/dd') +
    ' before:' + Utilities.formatDate(queryEnd, timezone, 'yyyy/MM/dd');
  const threads = GmailApp.search(query, 0, 50) || [];
  let closest = null;
  threads.forEach(function (thread) {
    (thread.getMessages ? thread.getMessages() : []).forEach(function (message) {
      const messageDate = message.getDate ? message.getDate() : null;
      const messageMs = messageDate && messageDate.getTime ? messageDate.getTime() : NaN;
      if (!Number.isFinite(messageMs) || Math.abs(messageMs - sentAtMs) > 6 * 60 * 60 * 1000) return;
      if (String(message.getSubject ? message.getSubject() : '').trim() !== subject) return;
      if (String(message.getTo ? message.getTo() : '').toLowerCase().indexOf(email) === -1) return;
      const distance = Math.abs(messageMs - sentAtMs);
      if (!closest || distance < closest.distance) {
        closest = {
          found: true,
          messageId: String(message.getId ? message.getId() : ''),
          threadId: String(thread.getId ? thread.getId() : ''),
          distance: distance,
        };
      }
    });
  });
  return closest || { found: false, messageId: '', threadId: '' };
}

function reconcileLeadSendTrackingFromHistory_(history) {
  const source = history && typeof history === 'object' ? history : {};
  const leadId = String(source.lead_id || '').trim();
  if (!leadId) return false;
  const lead = getLeadById(leadId);
  if (!lead) return false;
  const successful = findSheetRecordsByExactFieldValues_(
    'send_histories',
    'lead_id',
    [leadId],
    mailSendSafetyHistoryFields_()
  ).filter(function (item) {
    return String(item.lead_id || '') === leadId && isSuccessfulProductionSendHistory_(item);
  }).sort(function (left, right) {
    return String(right.sent_at || right.created_at || '').localeCompare(String(left.sent_at || left.created_at || ''));
  });
  if (!successful.length) return false;
  const latest = successful[0];
  const patch = {
    last_sent_at: String(latest.sent_at || latest.created_at || ''),
    send_count: successful.length,
  };
  const currentStatus = String(lead.status || '');
  if (['未対応', '対応中', '初回メール送信済み', '2ヶ月後メール送信済み'].indexOf(currentStatus) !== -1 && !normalizeBooleanLike_(lead.reply_checked)) {
    patch.status = String(latest.send_type || '') === '2ヶ月後メール' ? '2ヶ月後メール送信済み' : '初回メール送信済み';
  }
  updateLeadAfterSend_(leadId, patch);
  return true;
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
    readMailSendSafetyHistories_(),
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
  const priorityState = getEmailGenrePrioritySetting_();
  const priorityMatch = priorityState.enabled &&
    String(template.id || '') === String(priorityState.templateId || '') &&
    emailGenrePriorityMatches_(templateGenre, priorityState.genreKeyword) &&
    emailGenrePriorityMatches_(leadGenre, priorityState.genreKeyword);
  if (templateGenre !== leadGenre && !priorityMatch) {
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
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  let sendResult = '成功';
  let errorMessage = '';

  try {
    sendGmailMessage_({
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
    }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
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
  const histories = findSheetRecordsByExactFieldValues_('send_histories', 'lead_id', [recordId])
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
    const existing = readSheetRecordFields_('send_histories', ['id']);
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
  const headers = found.headers || getHeaders_(sheet);
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
  return readMailSendSafetyHistories_().filter(function (history) {
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
