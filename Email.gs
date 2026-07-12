const TEMPLATE_TEST_FIXED_EMAIL_ = 'yuya1998nu@gmail.com';
const TEMPLATE_TEST_FIXED_NAME_ = '村松侑哉';

function getEmailSendTargetBlockReason_(lead, masterContext) {
  if (!lead || isArchivedLead_(lead)) return '営業対象外のため送信できません。';
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
    const template = templateId ? findSheetRecordById_('email_templates', templateId) : findProductionTemplateForLead_(lead, input.template_type || input.templateType || 'initial');
    if (!template) {
      throw new Error('Email template not found.');
    }
    validateEmailSendTemplate_(template, lead, input);
    const masterContext = buildMasterBlockContext_();
    const sendBlockReason = getEmailSendTargetBlockReason_(lead, masterContext);
    if (sendBlockReason) throw new Error(sendBlockReason);
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

  const templateGenre = String(template.genre || '').trim();
  const leadGenre = String(lead.genre || '').trim();
  if (!templateGenre) throw new Error('テンプレートにジャンルが設定されていません。');
  if (!leadGenre) throw new Error('営業先のジャンルが設定されていません。');
  if (templateGenre !== leadGenre) {
    throw new Error('テンプレートと営業先のジャンルが一致していません。');
  }
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

  return withScriptLock_('sendTestEmail:history', function () {
    const history = appendSheetRecord_('send_histories', {
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
    let existingCount = 0;
    let skipped = 0;
    records.forEach(function (record) {
      try {
        const normalized = normalizeSendHistoryImportRecord_(record);
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
}

function findProductionTemplateForLead_(lead, templateType) {
  const templates = listEmailTemplates({ limit: 1000 }).items;
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

function assertEmailSendLimitAvailable_() {
  const dailyLimit = Number(getSettingValue_('gmail_daily_send_limit', 80));
  const sentToday = countSuccessfulProductionSendsToday_();
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
