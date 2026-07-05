const SERPER_SEARCH_ENDPOINT = 'https://google.serper.dev/search';

function getSerperApiKeyInfo() {
  const key = getSerperApiKey_();
  const manager = buildSerperApiKeyManagerInfo_();
  return Object.assign({}, manager, {
    configured: Boolean(key),
    key_mask: key ? maskSecret_(key) : '',
  });
}

function testSerperApiKey() {
  try {
    const result = callSerperSearch_('OpenAI official site', {
      num: 1,
      purpose: 'manual_search_preview',
      source: 'api_key_test',
    });
    recordSerperActiveKeyTestResult_(true, result.organic.length, '');
    return {
      ok: true,
      resultCount: result.organic.length,
      checkedAt: nowIso_(),
      manager: buildSerperApiKeyManagerInfo_(),
    };
  } catch (error) {
    recordSerperActiveKeyTestResult_(false, 0, error.message || String(error));
    throw error;
  }
}

function listSerperApiKeyManager() {
  return buildSerperApiKeyManagerInfo_();
}

function saveSerperApiKeyEntry(input) {
  const source = input && typeof input === 'object' ? input : {};
  const key = String(source.key || source.apiKey || source.api_key || '').trim();
  if (!key) throw new Error('Serper API key is required.');
  return withScriptLock_('saveSerperApiKeyEntry', function () {
    const role = source.role === 'sub' ? 'sub' : 'main';
    const name = String(source.name || '').trim() || (role === 'main' ? 'メインキー' : 'サブキー');
    const now = nowIso_();
    const records = readSerperApiKeyRecords_();
    const nextRecords = records.map(function (record) {
      return role === 'main' ? Object.assign({}, record, { role: 'sub', updated_at: now }) : record;
    });
    nextRecords.push({
      id: Utilities.getUuid(),
      name: name,
      role: role,
      key: key,
      active: source.active === false ? false : true,
      source: 'managed',
      created_at: now,
      updated_at: now,
      last_status: '未確認',
      last_search_status: '未確認',
    });
    writeSerperApiKeyRecords_(nextRecords);
    syncPrimarySerperApiKeyProperty_(nextRecords);
    return buildSerperApiKeyManagerInfo_('Serper APIキーを保存しました。');
  });
}

function updateSerperApiKeyEntry(id, patch) {
  const targetId = requireId_(id);
  const input = patch && typeof patch === 'object' ? patch : {};
  return withScriptLock_('updateSerperApiKeyEntry', function () {
    const now = nowIso_();
    const records = readSerperApiKeyRecords_();
    let found = false;
    const nextRecords = records.map(function (record) {
      if (record.id !== targetId) {
        if (input.role === 'main') return Object.assign({}, record, { role: 'sub', updated_at: now });
        return record;
      }
      found = true;
      const next = Object.assign({}, record, { updated_at: now });
      if (Object.prototype.hasOwnProperty.call(input, 'active')) next.active = input.active !== false;
      if (input.name) next.name = String(input.name).trim();
      if (input.role === 'main' || input.role === 'sub') next.role = input.role;
      return next;
    });
    if (!found) throw new Error('Serper API key entry not found: ' + targetId);
    writeSerperApiKeyRecords_(nextRecords);
    syncPrimarySerperApiKeyProperty_(nextRecords);
    return buildSerperApiKeyManagerInfo_('Serper APIキー設定を更新しました。');
  });
}

function deleteSerperApiKeyEntry(id) {
  const targetId = requireId_(id);
  return withScriptLock_('deleteSerperApiKeyEntry', function () {
    const records = readSerperApiKeyRecords_();
    const nextRecords = records.filter(function (record) {
      return record.id !== targetId;
    });
    if (nextRecords.length === records.length) {
      throw new Error('Serper API key entry not found: ' + targetId);
    }
    writeSerperApiKeyRecords_(nextRecords);
    syncPrimarySerperApiKeyProperty_(nextRecords);
    return buildSerperApiKeyManagerInfo_('Serper APIキーを削除しました。');
  });
}

function runSmallSearchJob(input) {
  const job = startSerperSearchJob(input || {});
  return advanceSearchJob(job.id, {
    maxItems: Number(input && input.maxItems) || 5,
  });
}

function addSearchResultToLead(resultId, input) {
  const id = requireId_(resultId);
  const overrides = input && typeof input === 'object' ? input : {};
  const result = findSheetRecordById_('search_results', id);
  if (!result) throw new Error('Search result not found: ' + id);

  if (result.lead_id) {
    const existingLead = getLeadById(result.lead_id);
    updateSheetRecord_('search_results', id, {
      review_status: 'added',
      review_action: 'add_lead',
      reviewed_at: nowIso_(),
    });
    return {
      ok: true,
      lead: existingLead,
      result: findSheetRecordById_('search_results', id),
      reused: true,
    };
  }

  const title = String(overrides.company_name || overrides.facility_name || result.title || '').trim();
  const url = String(overrides.website_url || result.url || '').trim();
  const snippet = String(overrides.snippet || result.snippet || '').trim();
  const resultType = String(result.result_type || '').trim();
  const formUrl = String(overrides.form_url || (isFormSearchResult_(result, overrides) ? url : '') || '').trim();
  const websiteUrl = String(overrides.website_url || (formUrl && url === formUrl ? '' : url) || url || '').trim();
  const email = String(overrides.email || extractEmailFromSearchResult_(snippet) || '').trim();
  const companyName = title || deriveSearchResultCompanyName_(websiteUrl || formUrl || email || id);
  const lead = createLead({
    source: 'prospecting',
    source_id: id,
    external_id: result.job_id || '',
    genre: overrides.genre || '',
    company_name: companyName,
    facility_name: overrides.facility_name || companyName,
    email: email,
    website_url: websiteUrl,
    form_url: formUrl,
    status: '未対応',
    notes: 'Serper検索結果レビューから追加',
    source_payload_json: safeJsonStringify_({
      search_result_id: id,
      job_id: result.job_id || '',
      query: result.query || '',
      result_type: resultType,
      title: result.title || '',
      url: result.url || '',
      snippet: result.snippet || '',
      rank: result.rank || '',
      override: overrides,
    }),
  });

  updateSheetRecord_('search_results', id, {
    lead_id: lead.id,
    review_status: 'added',
    review_action: 'add_lead',
    reviewed_at: nowIso_(),
  });

  return {
    ok: true,
    lead: lead,
    result: findSheetRecordById_('search_results', id),
    reused: false,
  };
}

function reviewSearchResults(input) {
  const source = input && typeof input === 'object' ? input : {};
  const ids = Array.isArray(source.ids) ? source.ids : [source.id || source.resultId || source.result_id].filter(Boolean);
  const action = String(source.action || 'dismiss').trim();
  const status = action === 'add_lead' ? 'added'
    : action === 'confirm' || action === 'confirmed' ? 'confirmed'
      : action === 'exclude' || action === 'excluded' ? 'excluded'
        : 'dismissed';
  const reviewed = [];

  ids.forEach(function (id) {
    if (!id) return;
    const record = findSheetRecordById_('search_results', id);
    if (!record) return;
    reviewed.push(updateSheetRecord_('search_results', id, {
      review_status: status,
      review_action: action,
      reviewed_at: nowIso_(),
    }));
  });

  return {
    ok: true,
    reviewed: reviewed.length,
    items: reviewed,
  };
}

function isFormSearchResult_(result, overrides) {
  const text = [
    result.result_type,
    result.url,
    result.title,
    result.snippet,
    overrides && overrides.form_url,
  ].join(' ');
  return /form|contact|inquiry|問い合わせ|お問い合わせ/i.test(text);
}

function extractEmailFromSearchResult_(text) {
  const match = String(text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : '';
}

function deriveSearchResultCompanyName_(value) {
  const text = String(value || '').trim();
  if (!text) return '検索結果候補';
  if (text.indexOf('@') !== -1) return text.split('@')[1].replace(/^www\./, '');
  try {
    const url = /^https?:\/\//i.test(text) ? text : 'https://' + text;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return text.slice(0, 80) || '検索結果候補';
  }
}

function startSerperSearchJob(input) {
  return withScriptLock_('startSerperSearchJob', function () {
    const payload = normalizeSearchJobInput_(input);
    return appendSheetRecord_('search_jobs', {
      job_type: payload.job_type,
      status: 'queued',
      query_json: safeJsonStringify_(payload),
      total_count: payload.items.length,
      processed_count: 0,
      daily_limit: payload.daily_limit,
      job_limit: payload.job_limit,
      last_error: '',
      started_at: '',
      finished_at: '',
    });
  });
}

function advanceSearchJob(jobId, options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxItems = Math.min(Math.max(Number(input.maxItems) || 5, 1), 20);
  const runtimeBudgetMs = Math.min(Math.max(Number(input.runtimeBudgetMs || getSettingValue_('batch_runtime_budget_ms', 300000)) || 300000, 10000), 330000);
  const startedAtMs = Date.now();
  const job = findSheetRecordById_('search_jobs', jobId);
  if (!job) throw new Error('Search job not found: ' + jobId);
  const payload = JSON.parse(job.query_json || '{}');
  const items = Array.isArray(payload.items) ? payload.items : [];
  const startIndex = Number(job.processed_count || 0);
  const endIndex = Math.min(startIndex + maxItems, items.length, Number(payload.job_limit || items.length));
  const startedAt = job.started_at || nowIso_();
  const summary = {
    id: job.id,
    processed: 0,
    updatedLeads: 0,
    errors: [],
    completed: false,
  };

  updateSheetRecord_('search_jobs', job.id, {
    status: 'running',
    started_at: startedAt,
    last_error: '',
  });

  for (let index = startIndex; index < endIndex; index += 1) {
    if (Date.now() - startedAtMs > runtimeBudgetMs - 15000) {
      break;
    }

    const item = items[index];
    try {
      if (payload.job_type === 'lead_official_site' || payload.job_type === 'lead_form_url') {
        const result = processLeadSearchItem_(item, payload.job_type, job.id);
        if (result.updated) summary.updatedLeads += 1;
      } else {
        processProspectingSearchItem_(item, payload, job.id);
      }
      summary.processed += 1;
      updateSheetRecord_('search_jobs', job.id, {
        processed_count: index + 1,
      });
    } catch (error) {
      summary.errors.push({
        index: index,
        message: error.message,
      });
      appendSyncError_('advanceSearchJob', error, {
        target_sheet: 'search_jobs',
        target_id: job.id,
        item: item,
      });
      updateSheetRecord_('search_jobs', job.id, {
        processed_count: index + 1,
        last_error: error.message,
      });
    }
  }

  const latestJob = findSheetRecordById_('search_jobs', job.id);
  const processedCount = Number(latestJob.processed_count || 0);
  const completed = processedCount >= items.length || processedCount >= Number(payload.job_limit || items.length);
  if (completed) {
    updateSheetRecord_('search_jobs', job.id, {
      status: summary.errors.length > 0 ? 'failed' : 'completed',
      finished_at: nowIso_(),
    });
  } else {
    updateSheetRecord_('search_jobs', job.id, {
      status: 'queued',
    });
  }

  summary.completed = completed;
  return summary;
}

function normalizeSearchJobInput_(input) {
  const source = input && typeof input === 'object' ? input : {};
  const jobType = String(source.job_type || source.jobType || 'lead_official_site').trim();
  const allowedTypes = ['lead_official_site', 'lead_form_url', 'prospecting'];
  if (allowedTypes.indexOf(jobType) === -1) {
    throw new Error('Invalid search job type: ' + jobType);
  }

  const dailyLimit = Math.min(Number(source.daily_limit || source.dailyLimit || getSettingValue_('serper_daily_search_limit', 100)), getSettingValue_('serper_daily_search_limit', 100));
  const jobLimit = Math.min(Number(source.job_limit || source.jobLimit || 20), 100);
  const items = buildSearchJobItems_(source, jobType).slice(0, jobLimit);

  if (items.length === 0) {
    throw new Error('Search job has no items.');
  }

  return {
    job_type: jobType,
    daily_limit: dailyLimit,
    job_limit: jobLimit,
    items: items,
    created_at: nowIso_(),
  };
}

function buildSearchJobItems_(source, jobType) {
  if (Array.isArray(source.leadIds) && source.leadIds.length > 0) {
    return source.leadIds.map(function (leadId) {
      return { lead_id: requireId_(leadId) };
    });
  }

  if (source.leadId) {
    return [{ lead_id: requireId_(source.leadId) }];
  }

  if (jobType === 'prospecting') {
    const genre = String(source.genre || '').trim();
    const region = String(source.region || source.area || '').trim();
    const query = String(source.query || [genre, region].filter(Boolean).join(' ')).trim();
    if (!query) throw new Error('Prospecting query is required.');
    return [{ query: query, genre: genre, region: region }];
  }

  const leads = listLeads({
    limit: Number(source.limit || 20),
    status: source.status || '',
  }).items;
  return leads.filter(function (lead) {
    if (jobType === 'lead_official_site') return !lead.website_url;
    if (jobType === 'lead_form_url') return !lead.form_url;
    return true;
  }).map(function (lead) {
    return { lead_id: lead.id };
  });
}

function processLeadSearchItem_(item, jobType, jobId) {
  const lead = getLeadById(item.lead_id);
  const cacheKey = buildDomainCacheKey_(lead, jobType);
  const cached = readDomainCache_(cacheKey);
  if (cached) {
    updateLeadFromSearchResult_(lead, cached, jobType);
    return { updated: true, cacheHit: true };
  }

  assertSerperLimitAvailable_(lead.id);
  const query = buildLeadSearchQuery_(lead, jobType);
  const response = callSerperSearch_(query, {
    num: 5,
    purpose: jobType === 'lead_official_site' ? 'official_site_search' : 'form_url_search',
    source: 'search_job',
    leadId: lead.id,
  });
  const selected = selectLeadSearchResult_(response.organic, jobType);

  response.organic.forEach(function (result, index) {
    appendSheetRecord_('search_results', {
      job_id: jobId || '',
      lead_id: lead.id,
      query: query,
      result_type: jobType,
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      rank: index + 1,
      raw_json: safeJsonStringify_(result),
    });
  });

  if (!selected.url) {
    return { updated: false, cacheHit: false };
  }

  const cacheRecord = writeDomainCache_(cacheKey, lead, selected, jobType);
  updateLeadFromSearchResult_(lead, cacheRecord, jobType);
  return { updated: true, cacheHit: false };
}

function processProspectingSearchItem_(item, payload, jobId) {
  assertSerperLimitAvailable_();
  const response = callSerperSearch_(item.query, {
    num: 10,
    purpose: 'genre_area_search',
    source: 'prospecting',
  });

  response.organic.forEach(function (result, index) {
    appendSheetRecord_('search_results', {
      job_id: jobId || '',
      lead_id: '',
      query: item.query,
      result_type: 'prospecting',
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      rank: index + 1,
      raw_json: safeJsonStringify_(result),
    });
  });
}

function buildLeadSearchQuery_(lead, jobType) {
  const base = [lead.company_name, lead.facility_name, lead.address, lead.genre].filter(Boolean).join(' ');
  if (jobType === 'lead_form_url') {
    return [base, '問い合わせ OR お問い合わせ OR contact'].filter(Boolean).join(' ');
  }
  return [base, '公式サイト'].filter(Boolean).join(' ');
}

function selectLeadSearchResult_(results, jobType) {
  const organic = Array.isArray(results) ? results : [];
  const excludedHosts = ['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'map.yahoo.co.jp', 'google.com'];
  const contactPattern = /(contact|inquiry|お問い合わせ|問い合わせ|お問合せ|toiawase|otoiawase)/i;
  const candidates = organic.filter(function (result) {
    const domain = normalizeDomain_(result.link || '');
    return domain && !excludedHosts.some(function (host) { return isDomainOrSubdomain_(domain, host); });
  });

  if (jobType === 'lead_form_url') {
    const contact = candidates.find(function (result) {
      return contactPattern.test(String(result.link || '') + ' ' + String(result.title || '') + ' ' + String(result.snippet || ''));
    });
    if (contact) return { url: contact.link, confidence: 0.9, source: contact };
  }

  const first = candidates[0];
  return first ? { url: first.link, confidence: 0.7, source: first } : { url: '', confidence: 0, source: null };
}

function updateLeadFromSearchResult_(lead, result, jobType) {
  const patch = {};
  if (jobType === 'lead_form_url') {
    patch.form_url = result.form_url || result.url || result.website_url || '';
    if (patch.form_url && lead.status !== 'フォーム対応済み') {
      patch.status = lead.status === '未対応' ? 'フォーム対応中' : lead.status;
    }
  } else {
    patch.website_url = result.website_url || result.url || '';
  }

  if (!patch.website_url && result.website_url) patch.website_url = result.website_url;
  if (!patch.form_url && result.form_url) patch.form_url = result.form_url;

  if (Object.keys(patch).length > 0) {
    updateLead(lead.id, patch);
  }
}

function readDomainCache_(cacheKey) {
  const records = listSheetRecords('domain_cache', { limit: 1000, includeInactive: true }).items;
  const now = new Date().getTime();
  const record = records.find(function (item) {
    if (item.cache_key !== cacheKey) return false;
    if (!item.expires_at) return true;
    const expiresAt = new Date(item.expires_at).getTime();
    return !Number.isFinite(expiresAt) || expiresAt > now;
  });

  if (!record) return null;
  return {
    website_url: record.website_url,
    form_url: record.form_url,
    domain: record.domain,
    confidence: Number(record.confidence || 0),
    source_json: record.source_json,
  };
}

function writeDomainCache_(cacheKey, lead, selected, jobType) {
  const url = selected.url || '';
  const domain = normalizeDomain_(url);
  const expiresAt = Utilities.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), Session.getScriptTimeZone() || 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ssXXX");
  const record = {
    cache_key: cacheKey,
    company_name: lead.company_name || '',
    normalized_company_name: lead.normalized_company_name || normalizeCompanyName_(lead.company_name),
    domain: domain,
    website_url: jobType === 'lead_official_site' ? url : lead.website_url || '',
    form_url: jobType === 'lead_form_url' ? url : lead.form_url || '',
    confidence: selected.confidence || 0,
    source_json: safeJsonStringify_(selected.source || {}),
    expires_at: expiresAt,
  };
  const existing = listSheetRecords('domain_cache', { limit: 1000, includeInactive: true }).items.find(function (item) {
    return item.cache_key === cacheKey;
  });

  if (existing) {
    return updateSheetRecord_('domain_cache', existing.id, record);
  }

  return appendSheetRecord_('domain_cache', record);
}

function buildDomainCacheKey_(lead, jobType) {
  return [jobType, normalizeCompanyName_(lead.company_name), normalizeDomain_(lead.website_url || lead.form_url || lead.email_domain), String(lead.address || '').trim()].join('|');
}

function callSerperSearch_(query, options) {
  const key = getSerperApiKey_();
  if (!key) throw new Error('Serper API key is not configured.');
  const input = options && typeof options === 'object' ? options : {};
  const payload = {
    q: String(query || '').trim(),
    gl: 'jp',
    hl: 'ja',
    num: Math.min(Math.max(Number(input.num) || 5, 1), 20),
  };
  if (!payload.q) throw new Error('Serper query is required.');

  const response = UrlFetchApp.fetch(SERPER_SEARCH_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-API-KEY': key,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  let data = {};
  try {
    data = JSON.parse(text || '{}');
  } catch (error) {
    data = { raw: text };
  }

  logSerperUsage_({
    credits: 1,
    jobId: input.jobId || null,
    leadId: input.leadId || '',
    num: payload.num,
    purpose: input.purpose || 'unknown',
    query: payload.q,
    resultCount: Array.isArray(data.organic) ? data.organic.length : 0,
    source: input.source || '',
    status: code >= 200 && code < 300 ? 'success' : 'error',
    errorMessage: code >= 200 && code < 300 ? '' : String(data.message || text || 'Serper request failed'),
  });

  if (code < 200 || code >= 300) {
    throw new Error('Serper request failed: HTTP ' + code + ' ' + String(data.message || text));
  }

  return {
    organic: Array.isArray(data.organic) ? data.organic : [],
    raw: data,
  };
}

function assertSerperLimitAvailable_(leadId) {
  const today = todayText_();
  const month = monthText_();
  const dailyLimit = Number(getSettingValue_('serper_daily_search_limit', 100));
  const monthlyLimit = Number(getSettingValue_('serper_monthly_search_limit', 1000));
  const perLeadLimit = Number(getSettingValue_('serper_per_lead_search_limit', 3));
  const todayCount = getSerperUsageCount_({ day: today });
  const monthCount = getSerperUsageCount_({ month: month });

  if (todayCount >= dailyLimit) {
    throw new Error('Daily Serper limit reached: ' + dailyLimit);
  }
  if (monthCount >= monthlyLimit) {
    throw new Error('Monthly Serper limit reached: ' + monthlyLimit);
  }
  if (leadId) {
    const leadCount = getSerperUsageCount_({ leadId: leadId });
    if (leadCount >= perLeadLimit) {
      throw new Error('Per-lead Serper limit reached for lead: ' + leadId);
    }
  }
}

function getSerperUsageCount_(range) {
  const records = listSheetRecords('search_usage_logs', { limit: 5000, includeInactive: true }).items;
  return records.reduce(function (sum, record) {
    const createdAt = String(record.created_at || '').trim();
    if (range.day && createdAt.slice(0, 10) !== range.day) return sum;
    if (range.month && createdAt.slice(0, 7) !== range.month) return sum;
    if (range.leadId && String(record.lead_id || '') !== String(range.leadId)) return sum;
    return sum + Number(record.credits || record.request_count || 1);
  }, 0);
}

function logSerperUsage_(entry) {
  const now = nowIso_();
  appendSheetRecord_('search_usage_logs', {
    usage_date: now.slice(0, 10),
    usage_month: now.slice(0, 7),
    job_id: entry.jobId || '',
    lead_id: entry.leadId || '',
    purpose: entry.purpose || 'unknown',
    source: entry.source || '',
    query: entry.query || '',
    request_count: 1,
    credits: entry.credits || 1,
    result_count: entry.resultCount || 0,
    status: entry.status || 'success',
    cache_hit: false,
    error_message: entry.errorMessage || '',
    created_at: now,
  });
}

function getSerperApiKey_() {
  const selected = selectPrimarySerperApiKeyRecord_(readSerperApiKeyRecords_());
  if (selected && selected.key) return String(selected.key || '').trim();
  return String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
}

function maskSecret_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 8) return '****';
  return text.slice(0, 4) + '****' + text.slice(-4);
}

function upsertSerperPrimaryKey_(key, name) {
  const normalized = String(key || '').trim();
  if (!normalized) return;
  const now = nowIso_();
  const records = readSerperApiKeyRecords_();
  const primary = selectPrimarySerperApiKeyRecord_(records);
  let nextRecords = records.map(function (record) {
    if (primary && record.id === primary.id) {
      return Object.assign({}, record, {
        key: normalized,
        name: name || record.name || 'メインキー',
        role: 'main',
        active: true,
        updated_at: now,
      });
    }
    return Object.assign({}, record, {
      role: record.role === 'main' ? 'sub' : record.role,
      updated_at: record.role === 'main' ? now : record.updated_at,
    });
  });
  if (!primary) {
    nextRecords.push({
      id: Utilities.getUuid(),
      name: name || 'メインキー',
      role: 'main',
      key: normalized,
      active: true,
      source: 'managed',
      created_at: now,
      updated_at: now,
      last_status: '未確認',
      last_search_status: '未確認',
    });
  }
  writeSerperApiKeyRecords_(nextRecords);
  syncPrimarySerperApiKeyProperty_(nextRecords);
}

function buildSerperApiKeyManagerInfo_(message) {
  const records = readSerperApiKeyRecords_();
  const legacyKey = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
  const selected = selectPrimarySerperApiKeyRecord_(records);
  const configured = Boolean(selected && selected.key) || Boolean(legacyKey);
  const today = todayText_();
  const month = monthText_();
  const todayUsed = getSerperUsageCount_({ day: today });
  const monthUsed = getSerperUsageCount_({ month: month });
  const dailyLimit = Number(getSettingValue_('serper_daily_search_limit', 100));
  const monthlyLimit = Number(getSettingValue_('serper_monthly_search_limit', 1000));
  const sanitized = records.map(sanitizeSerperApiKeyRecord_);
  if (!sanitized.length && legacyKey) {
    sanitized.push({
      active: true,
      id: 'legacy-main',
      key_mask: maskSecret_(legacyKey),
      last_checked_at: '',
      last_error: '',
      last_remaining: '',
      last_search_error: '',
      last_search_result_count: '',
      last_search_status: '未確認',
      last_status: '利用可能',
      name: 'PropertiesService メインキー',
      readonly: true,
      role: 'main',
      source: 'env',
    });
  }
  return {
    configured: configured,
    credit: {
      detail: configured
        ? '本日残り ' + Math.max(0, dailyLimit - todayUsed) + '件 / 月間残り ' + Math.max(0, monthlyLimit - monthUsed) + '件'
        : 'Serper APIキーをPropertiesServiceへ保存してください。',
      label: configured ? 'Serper利用可能' : 'Serper未設定',
      ready: configured,
      tone: configured ? 'ok' : 'warn',
    },
    key_mask: configured ? maskSecret_(selected && selected.key ? selected.key : legacyKey) : '',
    keys: sanitized,
    limits: {
      daily: dailyLimit,
      monthly: monthlyLimit,
      todayUsed: todayUsed,
      monthUsed: monthUsed,
      todayRemaining: Math.max(0, dailyLimit - todayUsed),
      monthRemaining: Math.max(0, monthlyLimit - monthUsed),
    },
    message: message || '',
  };
}

function sanitizeSerperApiKeyRecord_(record) {
  return {
    active: record.active !== false,
    id: record.id,
    key_mask: maskSecret_(record.key || ''),
    last_checked_at: record.last_checked_at || '',
    last_error: record.last_error || '',
    last_remaining: record.last_remaining || '',
    last_search_error: record.last_search_error || '',
    last_search_result_count: record.last_search_result_count || '',
    last_search_status: record.last_search_status || '未確認',
    last_search_test_at: record.last_search_test_at || '',
    last_status: record.last_status || '未確認',
    name: record.name || (record.role === 'main' ? 'メインキー' : 'サブキー'),
    readonly: false,
    role: record.role === 'sub' ? 'sub' : 'main',
    source: record.source || 'managed',
  };
}

function readSerperApiKeyRecords_() {
  const raw = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEYS_JSON) || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(function (record) {
        return record && typeof record === 'object' && !Array.isArray(record) && record.id && record.key;
      })
      .map(function (record) {
        return {
          active: record.active !== false,
          created_at: String(record.created_at || ''),
          id: String(record.id || ''),
          key: String(record.key || ''),
          last_checked_at: String(record.last_checked_at || ''),
          last_error: String(record.last_error || ''),
          last_remaining: record.last_remaining || '',
          last_search_error: String(record.last_search_error || ''),
          last_search_result_count: record.last_search_result_count || '',
          last_search_status: String(record.last_search_status || '未確認'),
          last_search_test_at: String(record.last_search_test_at || ''),
          last_status: String(record.last_status || '未確認'),
          name: String(record.name || ''),
          role: record.role === 'sub' ? 'sub' : 'main',
          source: record.source === 'env' ? 'env' : 'managed',
          updated_at: String(record.updated_at || ''),
        };
      });
  } catch (error) {
    return [];
  }
}

function writeSerperApiKeyRecords_(records) {
  const safeRecords = (Array.isArray(records) ? records : [])
    .filter(function (record) {
      return record && record.id && record.key;
    })
    .slice(0, 10);
  PropertiesService.getScriptProperties().setProperty(PROPERTY_KEYS.SERPER_API_KEYS_JSON, JSON.stringify(safeRecords));
}

function selectPrimarySerperApiKeyRecord_(records) {
  const activeRecords = (Array.isArray(records) ? records : []).filter(function (record) {
    return record && record.active !== false && record.key;
  });
  return activeRecords.find(function (record) { return record.role === 'main'; }) || activeRecords[0] || null;
}

function syncPrimarySerperApiKeyProperty_(records) {
  const selected = selectPrimarySerperApiKeyRecord_(records);
  const properties = PropertiesService.getScriptProperties();
  if (selected && selected.key) {
    properties.setProperty(PROPERTY_KEYS.SERPER_API_KEY, selected.key);
  } else {
    properties.deleteProperty(PROPERTY_KEYS.SERPER_API_KEY);
  }
}

function recordSerperActiveKeyTestResult_(ok, resultCount, errorMessage) {
  const records = readSerperApiKeyRecords_();
  const selected = selectPrimarySerperApiKeyRecord_(records);
  if (!selected) return;
  const now = nowIso_();
  const nextRecords = records.map(function (record) {
    if (record.id !== selected.id) return record;
    return Object.assign({}, record, {
      last_checked_at: now,
      last_error: ok ? '' : errorMessage,
      last_remaining: '',
      last_search_error: ok ? '' : errorMessage,
      last_search_result_count: Number(resultCount || 0),
      last_search_status: ok ? '成功' : '失敗',
      last_search_test_at: now,
      last_status: ok ? '利用可能' : 'エラー',
      updated_at: now,
    });
  });
  writeSerperApiKeyRecords_(nextRecords);
}

function appendSyncError_(operation, error, context) {
  logError_(operation, error, context || {});
}
