function listEmailTemplates(options) {
  return listSheetRecords('email_templates', options || { limit: 200 });
}

function saveEmailTemplate(input) {
  return withScriptLock_('saveEmailTemplate', function () {
    const normalized = normalizeEmailTemplateInput_(input);

    if (normalized.id) {
      const templateId = normalized.id;
      delete normalized.id;
      return updateSheetRecord_('email_templates', templateId, normalized);
    }

    return appendSheetRecord_('email_templates', normalized);
  });
}

function deleteEmailTemplate(id) {
  return withScriptLock_('deleteEmailTemplate', function () {
    return updateSheetRecord_('email_templates', requireId_(id), {
      active: false,
      is_production: false,
    });
  });
}

function setEmailTemplateProduction(id, input) {
  return withScriptLock_('setEmailTemplateProduction', function () {
    const templateId = requireId_(id);
    const source = input && typeof input === 'object' ? input : {};
    const enabled = normalizeBooleanLike_(source.enabled);
    const template = findSheetRecordById_('email_templates', templateId);
    if (!template) throw new Error('Email template not found: ' + templateId);

    if (enabled) {
      if (!template.last_test_sent_at) throw new Error('本番ONにする前にテスト送信してください。');
      if (template.template_type === 'followup_2m') throw new Error('2ヶ月後メールは現在の自動送信では使用しません。');
      if (template.template_type !== 'form' && !template.genre) throw new Error('本番ONにする前にジャンルを設定してください。');

      listSheetRecords('email_templates', { limit: 1000, includeInactive: true }).items
        .filter(function (item) {
          return item.id !== templateId
            && normalizeBooleanLike_(item.active)
            && normalizeBooleanLike_(item.is_production)
            && String(item.template_type || '') === String(template.template_type || '')
            && String(item.genre || '') === String(template.genre || '');
        })
        .forEach(function (item) {
          updateSheetRecord_('email_templates', item.id, {
            is_production: false,
            production_enabled_at: '',
          });
        });
    }

    return updateSheetRecord_('email_templates', templateId, {
      is_production: enabled,
      production_enabled_at: enabled ? nowIso_() : '',
    });
  });
}

function normalizeEmailTemplateInput_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Template input must be an object.');
  }

  const templateType = String(input.template_type || input.templateType || 'initial').trim();
  if (['initial', 'followup_2m', 'form'].indexOf(templateType) === -1) {
    throw new Error('Invalid template type: ' + templateType);
  }

  const name = String(input.name || '').trim();
  const subject = String(input.subject || '').trim();
  const body = String(input.body || '').trim();
  if (!name) throw new Error('Template name is required.');
  if (templateType !== 'form' && !subject) throw new Error('Template subject is required.');
  if (!body) throw new Error('Template body is required.');

  const isProduction = normalizeBooleanLike_(input.is_production || input.isProduction || false);
  const now = nowIso_();
  return {
    id: String(input.id || '').trim(),
    genre: String(input.genre || '').trim(),
    template_type: templateType,
    name: name,
    subject: subject,
    body: body,
    is_production: isProduction,
    production_enabled_at: isProduction ? String(input.production_enabled_at || now) : '',
    last_test_sent_at: String(input.last_test_sent_at || '').trim(),
    version: Number(input.version || 1),
    active: input.active === undefined ? true : normalizeBooleanLike_(input.active),
  };
}

function listNgMasters(options) {
  return listSheetRecords('ng_masters', options || { limit: 300 });
}

function saveNgMaster(input) {
  return withScriptLock_('saveNgMaster', function () {
    const normalized = normalizeNgMasterInput_(input);

    if (normalized.id) {
      const id = normalized.id;
      delete normalized.id;
      return updateSheetRecord_('ng_masters', id, normalized);
    }

    return appendSheetRecord_('ng_masters', normalized);
  });
}

function deleteNgMaster(id) {
  return withScriptLock_('deleteNgMaster', function () {
    return updateSheetRecord_('ng_masters', requireId_(id), { active: false });
  });
}

function normalizeNgMasterInput_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('NG master input must be an object.');
  }

  const email = String(input.email || '').trim().toLowerCase();
  const domain = normalizeDomain_(input.domain || extractDomainFromEmail_(email));
  const companyName = String(input.company_name || input.companyName || '').trim();
  if (!email && !domain && !companyName) {
    throw new Error('NG master requires email, domain, or company_name.');
  }

  return {
    id: String(input.id || '').trim(),
    email: email,
    domain: domain,
    company_name: companyName,
    normalized_company_name: normalizeCompanyName_(companyName),
    reason: String(input.reason || '').trim(),
    memo: String(input.memo || '').trim(),
    active: input.active === undefined ? true : normalizeBooleanLike_(input.active),
  };
}

function listExcludedDomains(options) {
  return listSheetRecords('excluded_domains', options || { limit: 300 });
}

function saveExcludedDomain(input) {
  return withScriptLock_('saveExcludedDomain', function () {
    const normalized = normalizeExcludedDomainInput_(input);

    if (normalized.id) {
      const id = normalized.id;
      delete normalized.id;
      return updateSheetRecord_('excluded_domains', id, normalized);
    }

    return appendSheetRecord_('excluded_domains', normalized);
  });
}

function deleteExcludedDomain(id) {
  return withScriptLock_('deleteExcludedDomain', function () {
    return updateSheetRecord_('excluded_domains', requireId_(id), { active: false });
  });
}

function listGenres(options) {
  const query = Object.assign({
    limit: 300,
    includeInactive: true,
  }, options || {});
  return listSheetRecords('genres', query);
}

function saveGenre(input) {
  return withScriptLock_('saveGenre', function () {
    const normalized = normalizeGenreInput_(input);
    assertUniqueGenreName_(normalized);

    if (normalized.id) {
      const id = normalized.id;
      delete normalized.id;
      return normalizeGenreRecord_(updateSheetRecord_('genres', id, normalized));
    }

    return normalizeGenreRecord_(appendSheetRecord_('genres', normalized));
  });
}

function deleteGenre(id) {
  return withScriptLock_('deleteGenre', function () {
    return normalizeGenreRecord_(updateSheetRecord_('genres', requireId_(id), { active: false }));
  });
}

function listReasons(options) {
  const query = Object.assign({
    limit: 500,
    includeInactive: true,
  }, options || {});
  const result = listSheetRecords('reasons', query);
  result.items = result.items.map(normalizeReasonRecord_);
  return result;
}

function saveReason(input) {
  return withScriptLock_('saveReason', function () {
    const normalized = normalizeReasonInput_(input);
    assertUniqueReasonName_(normalized);

    if (normalized.id) {
      const id = normalized.id;
      delete normalized.id;
      return normalizeReasonRecord_(updateSheetRecord_('reasons', id, normalized));
    }

    return normalizeReasonRecord_(appendSheetRecord_('reasons', normalized));
  });
}

function updateReason(id, patch) {
  return withScriptLock_('updateReason', function () {
    const recordId = requireId_(id);
    const current = findSheetRecordById_('reasons', recordId);
    if (!current) throw new Error('理由が見つかりません: ' + recordId);
    const updates = normalizeReasonPatch_(patch || {});
    const candidate = Object.assign({}, current, updates, { id: recordId });
    assertUniqueReasonName_(candidate);
    return normalizeReasonRecord_(updateSheetRecord_('reasons', recordId, updates));
  });
}

function normalizeExcludedDomainInput_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Excluded domain input must be an object.');
  }

  const domain = normalizeDomain_(input.domain);
  if (!domain) {
    throw new Error('domain is required.');
  }

  return {
    id: String(input.id || '').trim(),
    domain: domain,
    reason: String(input.reason || '').trim(),
    active: input.active === undefined ? true : normalizeBooleanLike_(input.active),
  };
}

function normalizeGenreInput_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Genre input must be an object.');
  }

  const name = String(input.name || '').trim();
  if (!name) throw new Error('ジャンル名は必須です。');

  return {
    id: String(input.id || '').trim(),
    name: name,
    description: String(input.description || '').trim(),
    active: input.active === undefined ? true : normalizeBooleanLike_(input.active),
  };
}

function normalizeGenreRecord_(record) {
  const normalized = Object.assign({}, record);
  normalized.active = normalized.active === '' ? true : normalizeBooleanLike_(normalized.active);
  return normalized;
}

function assertUniqueGenreName_(genre) {
  const name = normalizeMasterName_(genre.name);
  const records = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'genres'));
  const duplicate = records.find(function (record) {
    return normalizeBooleanLike_(record.active) !== false &&
      normalizeMasterName_(record.name) === name &&
      (!genre.id || String(record.id || '') !== String(genre.id));
  });
  if (duplicate) {
    throw new Error('同じジャンル名がすでに登録されています。');
  }
}

function normalizeReasonInput_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Reason input must be an object.');
  }

  const normalized = normalizeReasonPatch_(input);
  if (!normalized.category) normalized.category = 'send_ng_reason';
  if (!normalized.name) throw new Error('理由は必須です。');
  normalized.id = String(input.id || '').trim();
  normalized.active = input.active === undefined ? true : normalizeBooleanLike_(input.active);
  return normalized;
}

function normalizeReasonPatch_(patch) {
  const updates = {};
  if (patch.category !== undefined) updates.category = normalizeReasonCategory_(patch.category);
  if (patch.name !== undefined) {
    const name = String(patch.name || '').trim();
    if (!name) throw new Error('理由は必須です。');
    updates.name = name;
  }
  if (patch.description !== undefined) updates.description = String(patch.description || '').trim();
  if (patch.active !== undefined) updates.active = normalizeBooleanLike_(patch.active);
  return updates;
}

function normalizeReasonRecord_(record) {
  const normalized = Object.assign({}, record);
  normalized.category = normalizeReasonCategory_(normalized.category || 'send_ng_reason');
  normalized.active = normalized.active === '' ? true : normalizeBooleanLike_(normalized.active);
  return normalized;
}

function normalizeReasonCategory_(category) {
  const normalized = String(category || '').trim();
  const allowed = ['send_ng_reason', 'lost_reason', 'no_action_reason', 'decline_reason'];
  if (allowed.indexOf(normalized) === -1) {
    throw new Error('理由カテゴリが不正です: ' + normalized);
  }
  return normalized;
}

function assertUniqueReasonName_(reason) {
  const category = normalizeReasonCategory_(reason.category || 'send_ng_reason');
  const name = normalizeMasterName_(reason.name);
  const records = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'reasons'));
  const duplicate = records.find(function (record) {
    return normalizeBooleanLike_(record.active) !== false &&
      normalizeReasonCategory_(record.category || 'send_ng_reason') === category &&
      normalizeMasterName_(record.name) === name &&
      (!reason.id || String(record.id || '') !== String(reason.id));
  });
  if (duplicate) {
    throw new Error('同じカテゴリに同じ理由がすでに登録されています。');
  }
}

function normalizeMasterName_(value) {
  return String(value || '').trim().replace(/[ \t\n\r　]+/g, '').toLowerCase();
}

function isLeadBlockedByMasters_(lead) {
  return isLeadBlockedByMastersInContext_(lead, buildMasterBlockContext_());
}

function buildMasterBlockContext_() {
  return {
    ngMasters: listNgMasters({ limit: 1000 }).items,
    excludedDomains: listExcludedDomains({ limit: 1000 }).items,
  };
}

function isLeadBlockedByMastersInContext_(lead, context) {
  const email = String(lead.email || '').trim().toLowerCase();
  const emailDomain = extractDomainFromEmail_(email);
  const websiteDomain = normalizeDomain_(lead.website_domain || lead.website_url || lead.form_url);
  const companyName = normalizeCompanyName_(lead.company_name);
  const ngMasters = context && Array.isArray(context.ngMasters) ? context.ngMasters : [];
  const excludedDomains = context && Array.isArray(context.excludedDomains) ? context.excludedDomains : [];
  const domainBlocked = excludedDomains.find(function (record) {
    return isDomainOrSubdomain_(websiteDomain || emailDomain, record.domain);
  });

  if (domainBlocked) {
    return {
      blocked: true,
      reason: '除外ドメイン: ' + (domainBlocked.reason || domainBlocked.domain),
    };
  }

  const ngBlocked = ngMasters.find(function (record) {
    const recordEmail = String(record.email || '').trim().toLowerCase();
    const recordDomain = normalizeDomain_(record.domain || recordEmail);
    const recordCompany = normalizeCompanyName_(record.company_name);
    return Boolean(
      (email && recordEmail && email === recordEmail) ||
      ((websiteDomain || emailDomain) && recordDomain && isDomainOrSubdomain_(websiteDomain || emailDomain, recordDomain)) ||
      (companyName && recordCompany && companyName === recordCompany)
    );
  });

  if (ngBlocked) {
    return {
      blocked: true,
      reason: '送信NG: ' + (ngBlocked.reason || ngBlocked.memo || ngBlocked.company_name || ngBlocked.email || ngBlocked.domain),
    };
  }

  return {
    blocked: false,
    reason: '',
  };
}

function isDomainOrSubdomain_(domain, blockedDomain) {
  const normalizedDomain = normalizeDomain_(domain);
  const normalizedBlocked = normalizeDomain_(blockedDomain);
  if (!normalizedDomain || !normalizedBlocked) {
    return false;
  }

  return normalizedDomain === normalizedBlocked || normalizedDomain.endsWith('.' + normalizedBlocked);
}
