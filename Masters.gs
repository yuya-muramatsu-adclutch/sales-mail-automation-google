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
  if (!subject) throw new Error('Template subject is required.');
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
