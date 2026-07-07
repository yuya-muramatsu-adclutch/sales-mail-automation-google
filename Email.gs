function isEmailSendTarget_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return false;
  if (!isValidEmailAddress_(lead.email)) return false;
  if (normalizeBooleanLike_(lead.send_ng)) return false;
  if (normalizeBooleanLike_(lead.reply_checked)) return false;
  if (getPriorSuccessfulEmailBlockReason_(lead, masterContext)) return false;
  if (String(lead.deal_status || '未設定') !== '未設定') return false;
  if (SEND_EXCLUDED_STATUSES.indexOf(String(lead.status || '')) !== -1) return false;
  const blocked = masterContext ? isLeadBlockedByMastersInContext_(lead, masterContext) : isLeadBlockedByMasters_(lead);
  return !blocked.blocked;
}

function isFormSendTarget_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return false;
  if (!lead.form_url) return false;
  if (isValidEmailAddress_(lead.email)) return false;
  if (normalizeBooleanLike_(lead.send_ng)) return false;
  if (normalizeBooleanLike_(lead.reply_checked)) return false;
  if (String(lead.deal_status || '未設定') !== '未設定') return false;
  if (lead.form_status === '対応済み' || lead.form_status === '対応不要') return false;
  if (SEND_EXCLUDED_STATUSES.indexOf(String(lead.status || '')) !== -1) return false;
  const blocked = masterContext ? isLeadBlockedByMastersInContext_(lead, masterContext) : isLeadBlockedByMasters_(lead);
  return !blocked.blocked;
}

function isFormOutreachLead_(lead) {
  if (!lead || isArchivedLead_(lead)) return false;
  if (!lead.form_url) return false;
  if (isValidEmailAddress_(lead.email)) return false;
  return true;
}

function sendLeadEmail(leadId, templateId, options) {
  const input = options && typeof options === 'object' ? options : {};
  return withScriptLock_('sendLeadEmail', function () {
    const lead = getLeadById(leadId);
    const template = templateId ? findSheetRecordById_('email_templates', templateId) : findProductionTemplateForLead_(lead, input.template_type || 'initial');
    if (!template) {
      throw new Error('Email template not found.');
    }
    const masterContext = buildMasterBlockContext_();
    const priorSendReason = getPriorSuccessfulEmailBlockReason_(lead, masterContext);
    if (priorSendReason) {
      throw new Error(priorSendReason);
    }
    if (!isEmailSendTarget_(lead, masterContext) && input.force !== true) {
      const blocked = isLeadBlockedByMasters_(lead);
      throw new Error(blocked.blocked ? blocked.reason : 'Lead is not eligible for email sending.');
    }
    assertEmailSendLimitAvailable_();
    const rendered = renderTemplateForLead_(template, lead, {
      sender_name: input.sender_name || input.senderName || '',
      '差出人名': input.sender_name || input.senderName || '',
    });
    const sentAt = nowIso_();
    let sendResult = '成功';
    let errorMessage = '';
    let gmailMessageId = '';

    try {
      MailApp.sendEmail({
        to: lead.email,
        subject: rendered.subject,
        htmlBody: rendered.htmlBody,
        body: rendered.body,
        name: input.sender_name || input.senderName || '',
      });
    } catch (error) {
      sendResult = '失敗';
      errorMessage = error.message;
    }

    const history = appendSheetRecord_('send_histories', {
      lead_id: lead.id,
      sent_at: sentAt,
      send_type: input.send_type || input.sendType || '初回メール',
      to_email: lead.email,
      company_name: lead.company_name,
      facility_name: lead.facility_name,
      genre: lead.genre,
      template_id: template.id,
      template_name: template.name,
      subject: rendered.subject,
      body: rendered.body,
      send_result: sendResult,
      error_message: errorMessage,
      gmail_message_id: gmailMessageId,
      gmail_thread_id: '',
      sender_name: input.sender_name || input.senderName || '',
    });

    if (sendResult === '成功') {
      const nextStatus = input.send_type === '2ヶ月後メール' || input.sendType === '2ヶ月後メール' ? '2ヶ月後メール送信済み' : '初回メール送信済み';
      updateLeadAfterSend_(lead.id, {
        status: nextStatus,
        last_sent_at: sentAt,
        send_count: Number(lead.send_count || 0) + 1,
      });
    }

    return {
      ok: sendResult === '成功',
      history: history,
      errorMessage: errorMessage,
    };
  });
}

function buildMailSendSafetyContext_() {
  const histories = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories'));
  const sentLeadIds = {};
  const sentEmails = {};
  histories.forEach(function (history) {
    if (!isSuccessfulProductionSendHistory_(history)) return;
    const leadId = String(history.lead_id || '').trim();
    const email = normalizeEmailForSendSafety_(history.to_email || '');
    if (leadId) sentLeadIds[leadId] = true;
    if (email) sentEmails[email] = true;
  });
  return {
    sentLeadIds: sentLeadIds,
    sentEmails: sentEmails,
  };
}

function isSuccessfulProductionSendHistory_(history) {
  return history &&
    history.send_result === '成功' &&
    String(history.send_type || '').indexOf('テスト') === -1;
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
  return '';
}

function sendTestEmail(templateId, toEmail, sampleLeadInput) {
  const template = findSheetRecordById_('email_templates', templateId);
  if (!template) throw new Error('Email template not found.');
  if (!isValidEmailAddress_(toEmail)) throw new Error('Valid test recipient is required.');
  const sampleLead = Object.assign({
    company_name: '株式会社サンプル',
    facility_name: 'サンプル施設',
    genre: '美容',
    contact_name: 'ご担当者',
    email: toEmail,
    website_url: 'https://example.com',
    form_url: 'https://example.com/contact',
  }, sampleLeadInput || {});
  const rendered = renderTemplateForLead_(template, sampleLead, {
    sender_name: sampleLead.sender_name || sampleLead.senderName || '営業担当',
    '差出人名': sampleLead.sender_name || sampleLead.senderName || '営業担当',
  });

  const sentAt = nowIso_();
  const subject = '[テスト] ' + rendered.subject;
  const senderName = sampleLead.sender_name || sampleLead.senderName || '営業担当';
  let sendResult = '成功';
  let errorMessage = '';

  try {
    assertEmailSendLimitAvailable_();
    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      htmlBody: rendered.htmlBody,
      body: rendered.body,
      name: senderName,
    });
  } catch (error) {
    sendResult = '失敗';
    errorMessage = error.message || String(error);
  }

  return withScriptLock_('sendTestEmail:history', function () {
    const history = appendSheetRecord_('send_histories', {
      lead_id: sampleLead.id || sampleLead.lead_id || '',
      sent_at: sentAt,
      send_type: 'テスト送信',
      to_email: toEmail,
      company_name: sampleLead.company_name,
      facility_name: sampleLead.facility_name,
      genre: sampleLead.genre,
      template_id: template.id,
      template_name: template.name,
      subject: subject,
      body: rendered.body,
      send_result: sendResult,
      error_message: errorMessage,
      gmail_message_id: '',
      gmail_thread_id: '',
      sender_name: senderName,
    });

    if (sendResult === '成功') {
      updateSheetRecord_('email_templates', templateId, { last_test_sent_at: sentAt });
    }

    return {
      ok: sendResult === '成功',
      history: history,
      errorMessage: errorMessage,
    };
  });
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
    })
    .slice(0, limit);

  return {
    leadId: recordId,
    total: histories.length,
    items: histories,
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
}

function findProductionTemplateForLead_(lead, templateType) {
  const templates = listEmailTemplates({ limit: 1000 }).items;
  const active = templates.filter(function (template) {
    return template.template_type === templateType && normalizeBooleanLike_(template.is_production);
  });
  const genreMatch = active.find(function (template) {
    return template.genre && lead.genre && template.genre === lead.genre;
  });
  return genreMatch || active.find(function (template) { return !template.genre; }) || active[0] || null;
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

function assertEmailSendLimitAvailable_() {
  const today = todayText_();
  const dailyLimit = Number(getSettingValue_('gmail_daily_send_limit', 80));
  const sentToday = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'send_histories')).filter(function (record) {
    return String(record.sent_at || record.created_at || '').slice(0, 10) === today && record.send_result === '成功';
  }).length;
  const remainingQuota = MailApp.getRemainingDailyQuota ? MailApp.getRemainingDailyQuota() : dailyLimit;

  if (sentToday >= dailyLimit) {
    throw new Error('Daily app mail limit reached: ' + dailyLimit);
  }
  if (remainingQuota <= 0) {
    throw new Error('MailApp remaining daily quota is 0.');
  }
}

function isValidEmailAddress_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
