function isEmailSendTarget_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return false;
  if (!isValidEmailAddress_(lead.email)) return false;
  if (normalizeBooleanLike_(lead.send_ng)) return false;
  if (normalizeBooleanLike_(lead.reply_checked)) return false;
  if (lead.last_sent_at) return false;
  if (Number(lead.send_count || 0) > 0) return false;
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

function sendLeadEmail(leadId, templateId, options) {
  const input = options && typeof options === 'object' ? options : {};
  const result = withScriptLock_('sendLeadEmail', function () {
    const lead = getLeadById(leadId);
    const template = templateId ? findSheetRecordById_('email_templates', templateId) : findProductionTemplateForLead_(lead, input.template_type || 'initial');
    if (!template) {
      throw new Error('Email template not found.');
    }
    if (!isEmailSendTarget_(lead) && input.force !== true) {
      const blocked = isLeadBlockedByMasters_(lead);
      throw new Error(blocked.blocked ? blocked.reason : 'Lead is not eligible for email sending.');
    }
    assertEmailSendLimitAvailable_();

    return {
      lead: lead,
      template: template,
      rendered: renderTemplateForLead_(template, lead, {
        sender_name: input.sender_name || input.senderName || '',
        '差出人名': input.sender_name || input.senderName || '',
      }),
    };
  });

  const sentAt = nowIso_();
  let sendResult = '成功';
  let errorMessage = '';
  let gmailMessageId = '';

  try {
    MailApp.sendEmail({
      to: result.lead.email,
      subject: result.rendered.subject,
      htmlBody: result.rendered.htmlBody,
      body: result.rendered.body,
      name: input.sender_name || input.senderName || '',
    });
  } catch (error) {
    sendResult = '失敗';
    errorMessage = error.message;
  }

  return withScriptLock_('sendLeadEmail:afterSend', function () {
    const history = appendSheetRecord_('send_histories', {
      lead_id: result.lead.id,
      sent_at: sentAt,
      send_type: input.send_type || input.sendType || '初回メール',
      to_email: result.lead.email,
      company_name: result.lead.company_name,
      facility_name: result.lead.facility_name,
      genre: result.lead.genre,
      template_id: result.template.id,
      template_name: result.template.name,
      subject: result.rendered.subject,
      body: result.rendered.body,
      send_result: sendResult,
      error_message: errorMessage,
      gmail_message_id: gmailMessageId,
      gmail_thread_id: '',
      sender_name: input.sender_name || input.senderName || '',
    });

    if (sendResult === '成功') {
      const nextStatus = input.send_type === '2ヶ月後メール' || input.sendType === '2ヶ月後メール' ? '2ヶ月後メール送信済み' : '初回メール送信済み';
      updateLeadAfterSend_(result.lead.id, {
        status: nextStatus,
        last_sent_at: sentAt,
        send_count: Number(result.lead.send_count || 0) + 1,
      });
    }

    return {
      ok: sendResult === '成功',
      history: history,
      errorMessage: errorMessage,
    };
  });
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

  MailApp.sendEmail({
    to: toEmail,
    subject: '[テスト] ' + rendered.subject,
    htmlBody: rendered.htmlBody,
    body: rendered.body,
  });

  updateSheetRecord_('email_templates', templateId, { last_test_sent_at: nowIso_() });
  return { ok: true };
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
