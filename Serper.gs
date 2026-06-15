const SERPER_SEARCH_ENDPOINT = 'https://google.serper.dev/search';

function getSerperApiKeyInfo() {
  const key = getSerperApiKey_();
  return {
    configured: Boolean(key),
    key_mask: key ? maskSecret_(key) : '',
  };
}

function testSerperApiKey() {
  const result = callSerperSearch_('OpenAI official site', {
    num: 1,
    purpose: 'manual_search_preview',
    source: 'api_key_test',
  });
  return {
    ok: true,
    resultCount: result.organic.length,
  };
}

function runSmallSearchJob(input) {
  const job = startSerperSearchJob(input || {});
  return advanceSearchJob(job.id, {
    maxItems: Number(input && input.maxItems) || 5,
  });
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
  return String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
}

function maskSecret_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 8) return '****';
  return text.slice(0, 4) + '****' + text.slice(-4);
}

function appendSyncError_(operation, error, context) {
  logError_(operation, error, context || {});
}
