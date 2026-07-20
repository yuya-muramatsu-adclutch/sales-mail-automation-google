const SERPER_SEARCH_ENDPOINT = 'https://google.serper.dev/search';
const NAP_CAMP_LIST_URL = 'https://www.nap-camp.com/list';
const NAP_CAMP_SITEMAP_URL = 'https://www.nap-camp.com/sitemap-dynamic-campsite.xml';
const NAP_CAMP_GENRE = 'キャンプ';
const SERPER_CREDIT_ENDPOINTS = Object.freeze([
  'https://google.serper.dev/account',
  'https://google.serper.dev/credits',
  'https://google.serper.dev/usage',
]);
const SERPER_LOW_CREDIT_THRESHOLD_PERCENT = 20;
const SERPER_CREDIT_REFRESH_INTERVAL_SECONDS = 900;
const SERPER_SEARCH_FAILURE_CACHE_SECONDS = 600;
const SERPER_SEARCH_FAILURE_CACHE_KEY = 'serper_search_unavailable_v1';
const SEARXNG_ACCESS_TOKEN_HEADER = 'X-SearXNG-Token';
const SEARXNG_DEFAULT_LANGUAGE = 'ja-JP';

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
    const result = callSerperSearchDirect_('OpenAI official site', {
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

function getSearxngConfig() {
  return getSearxngConfigInfo_();
}

function saveSearxngConfig(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const baseUrl = normalizeSearxngBaseUrl_(payload.baseUrl || payload.base_url || '');
  const providedToken = String(payload.accessToken || payload.access_token || payload.token || '').trim();
  const enabled = payload.enabled !== false;

  if (!baseUrl) throw new Error('PC検索の公開URLを入力してください。');
  withScriptLock_('saveSearxngConfig', function () {
    const properties = PropertiesService.getScriptProperties();
    const existingToken = String(properties.getProperty(PROPERTY_KEYS.SEARXNG_ACCESS_TOKEN) || '').trim();
    const accessToken = providedToken || existingToken;
    if (!accessToken) throw new Error('PC検索のアクセストークンを入力してください。');

    properties.setProperties({
      [PROPERTY_KEYS.SEARXNG_BASE_URL]: baseUrl,
      [PROPERTY_KEYS.SEARXNG_ACCESS_TOKEN]: accessToken,
      [PROPERTY_KEYS.SEARXNG_ENABLED]: enabled ? 'true' : 'false',
    });

    return true;
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  clearReferenceDataCache_();
  return Object.assign({}, buildSerperApiKeyManagerInfo_('PC検索メイン設定を保存しました。'), {
    ok: true,
  });
}

function testSearxngConnection() {
  try {
    const result = callSearxngSearch_('神奈川 キャンプ場 公式', {
      num: 3,
      purpose: 'manual_search_preview',
      source: 'searxng_connection_test',
    });
    return {
      ok: true,
      provider: 'searxng',
      resultCount: result.organic.length,
      checkedAt: nowIso_(),
      manager: buildSerperApiKeyManagerInfo_('PC検索への接続を確認しました。'),
    };
  } catch (error) {
    recordSearxngStatus_(false, 0, error.message || String(error));
    throw error;
  }
}

function refreshSerperCredits() {
  const startedAt = nowIso_();
  const properties = PropertiesService.getScriptProperties();
  const legacyKey = String(properties.getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
  let requestedRecords = readSerperApiKeyRecords_();
  if (!requestedRecords.length && legacyKey) {
    requestedRecords = [{
      active: true,
      created_at: startedAt,
      id: Utilities.getUuid(),
      key: legacyKey,
      last_checked_at: '',
      last_error: '',
      last_remaining: '',
      last_search_error: '',
      last_search_result_count: '',
      last_search_status: '未確認',
      last_search_test_at: '',
      last_status: '未確認',
      name: 'PropertiesService メインキー',
      role: 'main',
      source: 'env',
      updated_at: startedAt,
    }];
  }
  if (!requestedRecords.length) {
    return buildSerperApiKeyManagerInfo_('Serper APIキーが未設定です。');
  }

  const creditResultByKey = Object.create(null);
  requestedRecords.forEach(function (record) {
    if (record.active === false) return;
    const key = String(record.key || '').trim();
    if (key && !Object.prototype.hasOwnProperty.call(creditResultByKey, key)) {
      creditResultByKey[key] = fetchSerperCreditInfo_(key);
    }
  });

  return withScriptLock_('refreshSerperCredits:save', function () {
    const now = nowIso_();
    let currentRecords = readSerperApiKeyRecords_();
    const currentLegacyKey = String(properties.getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
    if (!currentRecords.length && currentLegacyKey) {
      currentRecords = requestedRecords.filter(function (record) {
        return String(record.key || '').trim() === currentLegacyKey;
      });
    }
    if (!currentRecords.length) {
      return buildSerperApiKeyManagerInfo_('残量確認中にAPIキー設定が変更されたため、保存をスキップしました。');
    }

    const nextRecords = currentRecords.map(function (record) {
      if (record.active === false) {
        return Object.assign({}, record, {
          last_checked_at: now,
          last_error: '無効なキーのため残量確認をスキップしました。',
          last_status: '無効',
          updated_at: now,
        });
      }
      const key = String(record.key || '').trim();
      if (!Object.prototype.hasOwnProperty.call(creditResultByKey, key)) return record;
      const result = creditResultByKey[key];
      if (!result.ok) {
        return Object.assign({}, record, {
          last_checked_at: now,
          last_error: result.errorMessage,
          last_status: 'エラー',
          updated_at: now,
        });
      }
      return mergeSerperCreditRecord_(record, result, now);
    });
    const harmonizedRecords = harmonizeSerperCreditRecords_(nextRecords);
    writeSerperApiKeyRecords_(harmonizedRecords);
    syncPrimarySerperApiKeyProperty_(harmonizedRecords);
    return buildSerperApiKeyManagerInfo_('Serper残量を確認しました。');
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
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
      credit_total: '',
      credit_total_source: '',
      last_remaining_value: '',
      last_remaining_percent: '',
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
  const result = advanceSearchJob(job.id, {
    maxItems: Number(input && input.maxItems) || 5,
  });
  return Object.assign({}, result, {
    reusedJob: job.reused === true,
    duplicatePrevented: job.duplicatePrevented === true,
    triggerWarning: job.triggerWarning || '',
  });
}

function addSearchResultToLead(resultId, input) {
  const id = requireId_(resultId);
  const overrides = input && typeof input === 'object' ? input : {};
  const initialResult = findSheetRecordById_('search_results', id);
  if (!initialResult) throw new Error('Search result not found: ' + id);
  const requestedUrl = String(overrides.website_url || overrides.form_url || initialResult.url || '').trim();
  if (requestedUrl && isLeadCollectionExcludedUrl_(requestedUrl)) {
    reviewSearchResults({ ids: [id], action: 'exclude' });
    throw createExpectedOperationError_(
      '広告主の公式サイトではないため収集対象から除外しました: ' + normalizeDomain_(requestedUrl),
      'NON_ADVERTISER_SITE'
    );
  }

  const recoveryLead = initialResult.lead_id
    ? null
    : findActiveLeadBySourceReference_('prospecting', id);
  const claim = claimSearchResultForLeadCreation_(id, recoveryLead && recoveryLead.id);
  const result = claim.record;
  let lead = null;
  let reused = Boolean(claim.reused);
  let recovered = Boolean(recoveryLead);

  try {
    if (claim.leadId) {
      lead = getLeadById(claim.leadId);
      reused = true;
    } else if (recoveryLead) {
      lead = recoveryLead;
      reused = true;
      recovered = true;
    }

    const title = String(overrides.company_name || overrides.facility_name || result.title || '').trim();
    const url = String(overrides.website_url || result.url || '').trim();
    const snippet = String(overrides.snippet || result.snippet || '').trim();
    const resultType = String(result.result_type || '').trim();
    const formUrl = String(overrides.form_url || (isFormSearchResult_(result, overrides) ? url : '') || '').trim();
    const websiteUrl = String(overrides.website_url || (formUrl && url === formUrl ? '' : url) || url || '').trim();
    const email = String(overrides.email || extractEmailFromSearchResult_(snippet) || '').trim();
    const companyName = title || deriveSearchResultCompanyName_(websiteUrl || formUrl || email || id);

    if (!lead) {
      try {
        lead = createLead({
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
          notes: '検索結果レビューから追加',
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
      } catch (error) {
        const duplicate = String(error.code || '') === 'DUPLICATE_LEAD' || /^Duplicate lead exists:/.test(String(error.message || ''));
        if (!duplicate) throw error;
        lead = findActiveLeadBySourceReference_('prospecting', id);
        if (!lead) throw error;
        reused = true;
        recovered = true;
      }
    }

    const linkedResult = claim.token
      ? finalizeSearchResultLeadCreation_(id, lead.id, claim.token)
      : claim.record;

    return {
      ok: true,
      lead: lead,
      result: linkedResult,
      reused: reused,
      recovered: recovered,
    };
  } catch (error) {
    if (claim && claim.token) releaseSearchResultLeadCreationClaim_(id, claim.token);
    throw error;
  }
}

function claimSearchResultForLeadCreation_(resultId, recoveryLeadId) {
  return withScriptLock_('claimSearchResultForLeadCreation', function () {
    const id = requireId_(resultId);
    const current = findSheetRecordById_('search_results', id);
    if (!current) throw new Error('Search result not found: ' + id);
    const linkedLeadId = String(current.lead_id || '').trim();
    if (linkedLeadId) {
      const normalizedRecord = String(current.review_status || '') === 'added'
        ? current
        : updateSheetRecord_('search_results', id, {
          review_status: 'added',
          review_action: 'add_lead',
          reviewed_at: nowIso_(),
        });
      return {
        record: normalizedRecord,
        leadId: linkedLeadId,
        token: '',
        reused: true,
      };
    }

    const status = String(current.review_status || 'unconfirmed').trim() || 'unconfirmed';
    const recoveryId = String(recoveryLeadId || '').trim();
    if (status === 'adding' && !recoveryId && !isSearchResultLeadClaimStale_(current)) {
      throw createExpectedOperationError_('この検索結果は別の処理で営業リストへ追加中です。少し待ってから更新してください。', 'SEARCH_RESULT_ADD_BUSY');
    }
    if (status !== 'unconfirmed' && status !== 'adding') {
      throw createExpectedOperationError_('この検索結果はすでに「' + status + '」として確認済みです。結果一覧を更新してください。', 'SEARCH_RESULT_ALREADY_REVIEWED');
    }

    const token = Utilities.getUuid();
    const claimed = updateSheetRecord_('search_results', id, {
      review_status: 'adding',
      review_action: 'add_lead_claim:' + token,
      reviewed_at: nowIso_(),
    });
    return {
      record: claimed,
      leadId: '',
      token: token,
      reused: Boolean(recoveryId),
    };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function isSearchResultLeadClaimStale_(record) {
  const claimedAt = new Date(String(record && record.reviewed_at || '')).getTime();
  if (!isFinite(claimedAt)) return true;
  return Date.now() - claimedAt >= 15 * 60 * 1000;
}

function finalizeSearchResultLeadCreation_(resultId, leadId, token) {
  return withScriptLock_('finalizeSearchResultLeadCreation', function () {
    const id = requireId_(resultId);
    const normalizedLeadId = requireId_(leadId);
    const normalizedToken = requireId_(token);
    const current = findSheetRecordById_('search_results', id);
    if (!current) throw new Error('Search result not found: ' + id);
    const linkedLeadId = String(current.lead_id || '').trim();
    if (linkedLeadId) {
      if (linkedLeadId !== normalizedLeadId) {
        throw createExpectedOperationError_('検索結果は別の営業先に紐付け済みです。', 'SEARCH_RESULT_LEAD_CONFLICT');
      }
      return String(current.review_status || '') === 'added'
        ? current
        : updateSheetRecord_('search_results', id, {
          review_status: 'added',
          review_action: 'add_lead',
          reviewed_at: nowIso_(),
        });
    }

    const expectedAction = 'add_lead_claim:' + normalizedToken;
    if (String(current.review_status || '') !== 'adding' || String(current.review_action || '') !== expectedAction) {
      throw createExpectedOperationError_('検索結果の追加状態が別の処理で変更されました。結果一覧を更新してください。', 'SEARCH_RESULT_ADD_CONFLICT');
    }
    return updateSheetRecord_('search_results', id, {
      lead_id: normalizedLeadId,
      review_status: 'added',
      review_action: 'add_lead',
      reviewed_at: nowIso_(),
    });
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function releaseSearchResultLeadCreationClaim_(resultId, token) {
  try {
    return withScriptLock_('releaseSearchResultLeadCreationClaim', function () {
      const id = requireId_(resultId);
      const normalizedToken = requireId_(token);
      const current = findSheetRecordById_('search_results', id);
      if (!current) return null;
      if (String(current.review_status || '') !== 'adding' || String(current.review_action || '') !== 'add_lead_claim:' + normalizedToken) {
        return current;
      }
      return updateSheetRecord_('search_results', id, {
        review_status: 'unconfirmed',
        review_action: '',
        reviewed_at: '',
      });
    }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  } catch (error) {
    console.warn('Search result add claim release skipped: ' + String(error && error.message || error));
    return null;
  }
}

function reviewSearchResults(input) {
  const source = input && typeof input === 'object' ? input : {};
  const ids = Array.from(new Set((Array.isArray(source.ids) ? source.ids : [source.id || source.resultId || source.result_id]).filter(Boolean).map(String))).slice(0, 500);
  const rawAction = String(source.action || 'dismiss').trim();
  const action = rawAction === 'confirmed' ? 'confirm' : rawAction === 'excluded' ? 'exclude' : rawAction;
  const statusByAction = { confirm: 'confirmed', exclude: 'excluded', dismiss: 'dismissed' };
  const status = statusByAction[action];
  if (!status) throw createExpectedOperationError_('検索結果レビューの操作が不正です。', 'SEARCH_RESULT_REVIEW_INVALID');

  const reviewed = [];
  const conflicts = [];
  const missing = [];
  const chunkSize = 25;
  let chunks = 0;
  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunkIds = ids.slice(offset, offset + chunkSize);
    const chunkResult = withScriptLock_('reviewSearchResults', function () {
      const chunkReviewed = [];
      const chunkConflicts = [];
      const chunkMissing = [];
      chunkIds.forEach(function (id) {
        const record = findSheetRecordById_('search_results', id);
        if (!record) {
          chunkMissing.push(id);
          return;
        }
        const currentStatus = String(record.review_status || 'unconfirmed').trim() || 'unconfirmed';
        if (currentStatus === status) {
          chunkReviewed.push(record);
          return;
        }
        if (currentStatus !== 'unconfirmed') {
          chunkConflicts.push({
            id: id,
            status: currentStatus,
            record: record,
            message: '別の処理で「' + currentStatus + '」に更新済みです。',
          });
          return;
        }
        chunkReviewed.push(updateSheetRecord_('search_results', id, {
          review_status: status,
          review_action: action,
          reviewed_at: nowIso_(),
        }));
      });
      return { reviewed: chunkReviewed, conflicts: chunkConflicts, missing: chunkMissing };
    }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
    chunks += 1;
    Array.prototype.push.apply(reviewed, chunkResult.reviewed);
    Array.prototype.push.apply(conflicts, chunkResult.conflicts);
    Array.prototype.push.apply(missing, chunkResult.missing);
  }

  return {
    ok: conflicts.length === 0 && missing.length === 0,
    status: status,
    reviewed: reviewed.length,
    items: reviewed,
    conflicts: conflicts,
    missing: missing,
    chunks: chunks,
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
  const matches = String(text || '').match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/ig) || [];
  const candidates = Array.from(new Set(matches.map(function (value) {
    return String(value || '').replace(/[),;:'"<>\]]+$/g, '').toLowerCase();
  }).filter(isValidEmailAddress_)));
  candidates.sort(function (left, right) {
    return emailCandidateScore_(right) - emailCandidateScore_(left) || matches.indexOf(left) - matches.indexOf(right);
  });
  return candidates[0] || '';
}

function emailCandidateScore_(email) {
  const local = String(email || '').split('@')[0].toLowerCase();
  let score = 0;
  if (/^(?:info|contact|inquiry|otoiawase|toiawase|sales|support|office|customer|service)(?:[._+-]|$)/i.test(local)) score += 50;
  if (/(?:contact|inquiry|support|office|sales)/i.test(local)) score += 20;
  if (/(?:privacy|recruit|career|webmaster|system|admin)/i.test(local)) score -= 30;
  return score;
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
  // Building a full source-page payload may fetch a remote sitemap. Do that before
  // taking the global data lock so review/send operations cannot be starved.
  const payload = normalizeSearchJobInput_(input);
  const requestKey = buildSearchJobRequestKey_(payload);
  const queued = withScriptLock_('startSerperSearchJob', function () {
    const existing = findReusableSearchJob_(requestKey);
    if (existing) return { job: existing, reused: true };
    return { job: appendSheetRecord_('search_jobs', {
      job_type: payload.job_type,
      status: 'queued',
      request_key: requestKey,
      query_json: safeJsonStringify_(payload),
      total_count: payload.items.length,
      processed_count: 0,
      daily_limit: '',
      job_limit: payload.job_limit,
      cursor_json: '',
      last_error: '',
      error_count: 0,
      lock_token: '',
      locked_at: '',
      last_heartbeat_at: '',
      attempt_count: 0,
      started_at: '',
      finished_at: '',
    }), reused: false };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  const triggerResult = ensureBackgroundJobTriggerBestEffort_();
  return Object.assign({}, queued.job, {
    queued: String(queued.job.status || '') === 'queued',
    reused: queued.reused,
    duplicatePrevented: queued.reused,
    triggerWarning: triggerResult.warning || '',
  });
}

function buildSearchJobRequestKey_(payload) {
  const source = payload && typeof payload === 'object' ? Object.assign({}, payload) : {};
  delete source.created_at;
  return 'search:' + computeRequestDigest_(safeJsonStringify_(source));
}

function findReusableSearchJob_(requestKey) {
  const key = String(requestKey || '').trim();
  if (!key) return null;
  return findSheetRecordsByExactFieldValues_('search_jobs', 'status', ['queued', 'running']).find(function (job) {
    if (String(job.request_key || '') === key) return true;
    try {
      return buildSearchJobRequestKey_(JSON.parse(job.query_json || '{}')) === key;
    } catch (error) {
      return false;
    }
  }) || null;
}

function advanceSearchJob(jobId, options) {
  const input = options && typeof options === 'object' ? options : {};
  const maxItems = Math.min(Math.max(Number(input.maxItems) || 5, 1), 20);
  const runtimeBudgetMs = Math.min(Math.max(Number(input.runtimeBudgetMs || getSettingValue_('batch_runtime_budget_ms', 300000)) || 300000, 10000), 330000);
  const runWindow = buildSearchJobRunWindow_(runtimeBudgetMs, Date.now());
  const claim = claimSearchJobRun_(jobId, runtimeBudgetMs);
  const claimedJob = claim.job || {};
  if (!claim.claimed) {
    return {
      id: claimedJob.id || String(jobId || ''),
      processed: 0,
      processedCount: Number(claimedJob.processed_count || 0),
      total: Number(claimedJob.total_count || 0),
      remaining: Math.max(Number(claimedJob.total_count || 0) - Number(claimedJob.processed_count || 0), 0),
      updatedLeads: 0,
      errors: [],
      completed: ['completed', 'failed'].indexOf(String(claimedJob.status || '')) !== -1,
      busy: claim.busy === true,
      skipped: true,
      resumable: String(claimedJob.status || '') === 'queued' || String(claimedJob.status || '') === 'running',
      reason: claim.reason || 'not_claimed',
      elapsedMs: Date.now() - runWindow.startedAtMs,
    };
  }

  const job = claim.job;
  const lockToken = claim.lockToken;
  let payload = {};
  let items = [];
  try {
    payload = JSON.parse(job.query_json || '{}');
    items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) throw new Error('Search job payload has no items.');
  } catch (error) {
    updateClaimedSearchJob_(job.id, lockToken, {
      status: 'failed',
      last_error: error.message || String(error),
      finished_at: nowIso_(),
    }, true);
    appendSyncError_('advanceSearchJobPayload', error, {
      target_sheet: 'search_jobs',
      target_id: job.id,
    });
    return {
      id: job.id,
      processed: 0,
      processedCount: Number(job.processed_count || 0),
      total: Number(job.total_count || 0),
      remaining: Math.max(Number(job.total_count || 0) - Number(job.processed_count || 0), 0),
      updatedLeads: 0,
      errors: [{ index: Number(job.processed_count || 0), message: error.message || String(error) }],
      completed: true,
      failed: true,
      resumable: false,
      elapsedMs: Date.now() - runWindow.startedAtMs,
    };
  }

  const targetCount = Math.min(items.length, Number(payload.job_limit || items.length));
  const startIndex = Math.min(Math.max(Number(job.processed_count || 0), 0), targetCount);
  const endIndex = Math.min(startIndex + maxItems, targetCount);
  const cursor = parseSearchJobCursor_(job.cursor_json);
  let progressRecord = job;
  if (cursor.quotaCode === 'SERPER_MONTHLY_LIMIT') {
    cursor.resumeAfter = '';
    cursor.quotaCode = '';
    const migratedCursor = updateClaimedSearchJob_(job.id, lockToken, {
      cursor_json: safeJsonStringify_({ itemIndex: cursor.itemIndex, offset: cursor.offset }),
      last_error: '',
      last_heartbeat_at: nowIso_(),
    }, false);
    if (migratedCursor.owned) progressRecord = migratedCursor.record;
  }
  const summary = {
    id: job.id,
    processed: 0,
    processedCount: startIndex,
    total: targetCount,
    remaining: Math.max(targetCount - startIndex, 0),
    updatedLeads: 0,
    processedCandidates: 0,
    errors: [],
    completed: false,
    busy: false,
    skipped: false,
    resumable: true,
    pausedForRuntime: false,
    pausedForQuota: false,
    resumeAfter: cursor.resumeAfter || '',
    attemptCount: Number(job.attempt_count || 0),
  };

  const sourcePageLeadIndex = payload.job_type === 'source_page' ? buildSourcePageLeadIndex_() : null;

  for (let index = startIndex; index < endIndex; index += 1) {
    if (isSearchJobRuntimeExhausted_(runWindow.deadlineMs)) {
      summary.pausedForRuntime = true;
      break;
    }

    const item = items[index];
    try {
      if (payload.job_type === 'lead_official_site' || payload.job_type === 'lead_form_url') {
        const result = processLeadSearchItem_(item, payload.job_type, job.id);
        if (result.updated) summary.updatedLeads += 1;
      } else if (payload.job_type === 'source_page') {
        const result = processSourcePageSearchItem_(item, payload, job.id, {
          deadlineMs: runWindow.deadlineMs,
          cursorOffset: cursor.itemIndex === index ? cursor.offset : 0,
          leadIndex: sourcePageLeadIndex,
        });
        summary.updatedLeads += Number(result.created || 0);
        summary.processedCandidates += Number(result.processedCandidates || 0);
        if (result.processedAll === false) {
          summary.pausedForRuntime = true;
          const nextCursor = { itemIndex: index, offset: Number(result.nextOffset || 0) };
          const partialUpdate = updateClaimedSearchJob_(job.id, lockToken, {
            status: 'running',
            cursor_json: safeJsonStringify_(nextCursor),
            last_heartbeat_at: nowIso_(),
          }, false);
          if (partialUpdate.owned) progressRecord = partialUpdate.record;
          break;
        }
      } else {
        processProspectingSearchItem_(item, payload, job.id);
      }
      summary.processed += 1;
      const progressUpdate = updateClaimedSearchJob_(job.id, lockToken, {
        processed_count: index + 1,
        cursor_json: '',
        last_error: Number(progressRecord.error_count || 0) > 0 ? String(progressRecord.last_error || '') : '',
        last_heartbeat_at: nowIso_(),
      }, false);
      if (!progressUpdate.owned) {
        summary.errors.push({ index: index, message: 'Search job ownership was lost.' });
        break;
      }
      progressRecord = progressUpdate.record;
    } catch (error) {
      if (isRetryableSearchJobError_(error)) {
        summary.errors.push({
          index: index,
          message: error.message || String(error),
          retryable: true,
        });
        appendSyncError_('advanceSearchJobRetryable', error, {
          target_sheet: 'search_jobs',
          target_id: job.id,
          item: item,
        });
        const retryUpdate = updateClaimedSearchJob_(job.id, lockToken, {
          cursor_json: payload.job_type === 'source_page' ? String(progressRecord.cursor_json || job.cursor_json || '') : '',
          last_error: error.message || String(error),
          last_heartbeat_at: nowIso_(),
        }, false);
        if (retryUpdate.owned) progressRecord = retryUpdate.record;
        summary.pausedForRetry = true;
        break;
      }
      summary.errors.push({
        index: index,
        message: error.message || String(error),
      });
      appendSyncError_('advanceSearchJob', error, {
        target_sheet: 'search_jobs',
        target_id: job.id,
        item: item,
      });
      const errorUpdate = updateClaimedSearchJob_(job.id, lockToken, {
        processed_count: index + 1,
        cursor_json: '',
        last_error: error.message || String(error),
        error_count: Number(progressRecord.error_count || 0) + 1,
        last_heartbeat_at: nowIso_(),
      }, false);
      if (!errorUpdate.owned) break;
      progressRecord = errorUpdate.record;
    }
  }

  const processedCount = Number(progressRecord.processed_count || 0);
  const completed = processedCount >= targetCount;
  summary.processedCount = processedCount;
  summary.total = targetCount;
  summary.remaining = Math.max(targetCount - processedCount, 0);
  if (completed) {
    const cumulativeErrorCount = Number(progressRecord.error_count || 0);
    updateClaimedSearchJob_(job.id, lockToken, {
      status: cumulativeErrorCount > 0 ? 'failed' : 'completed',
      cursor_json: '',
      finished_at: nowIso_(),
    }, true);
  } else {
    updateClaimedSearchJob_(job.id, lockToken, {
      status: 'queued',
      finished_at: '',
    }, true);
  }

  summary.completed = completed;
  summary.resumable = !completed;
  summary.elapsedMs = Date.now() - runWindow.startedAtMs;
  return summary;
}

function buildSearchJobRunWindow_(runtimeBudgetMs, startedAtMs) {
  const budgetMs = Math.min(Math.max(Number(runtimeBudgetMs) || 300000, 10000), 330000);
  const startMs = Number(startedAtMs) || Date.now();
  const safetyMarginMs = Math.min(30000, Math.max(5000, Math.floor(budgetMs * 0.2)));
  return {
    startedAtMs: startMs,
    budgetMs: budgetMs,
    safetyMarginMs: safetyMarginMs,
    deadlineMs: startMs + budgetMs - safetyMarginMs,
  };
}

function isSearchJobRuntimeExhausted_(deadlineMs, nowMs) {
  return (Number(nowMs) || Date.now()) >= Number(deadlineMs || 0);
}

function hasSearchJobRuntimeAvailable_(context, reserveMs) {
  const input = context && typeof context === 'object' ? context : {};
  if (!input.deadlineMs) return true;
  return Date.now() + Math.max(Number(reserveMs) || 0, 0) < Number(input.deadlineMs);
}

function parseSearchJobCursor_(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
    return {
      itemIndex: Math.max(Number(parsed.itemIndex) || 0, 0),
      offset: Math.max(Number(parsed.offset) || 0, 0),
      resumeAfter: String(parsed.resumeAfter || parsed.resume_after || '').trim(),
      quotaCode: String(parsed.quotaCode || parsed.quota_code || '').trim(),
      staleRecoveryCount: Math.max(Number(parsed.staleRecoveryCount || parsed.stale_recovery_count) || 0, 0),
    };
  } catch (error) {
    return { itemIndex: 0, offset: 0, resumeAfter: '', quotaCode: '', staleRecoveryCount: 0 };
  }
}

function claimSearchJobRun_(jobId, runtimeBudgetMs) {
  return withScriptLock_('claimSearchJobRun', function () {
    const job = findSheetRecordById_('search_jobs', jobId);
    if (!job) throw new Error('Search job not found: ' + jobId);
    const status = String(job.status || 'queued');
    if (status === 'completed' || status === 'failed' || status === 'paused') {
      return { claimed: false, busy: false, job: job, reason: status };
    }
    const lockedAtMs = new Date(job.locked_at || 0).getTime();
    const leaseMs = Math.max(420000, Number(runtimeBudgetMs || 300000) + 90000);
    const activeClaim = status === 'running' && job.lock_token && Number.isFinite(lockedAtMs) && Date.now() - lockedAtMs < leaseMs;
    if (activeClaim) {
      return { claimed: false, busy: true, job: job, reason: 'already_running' };
    }
    const now = nowIso_();
    const lockToken = Utilities.getUuid();
    const staleRecovery = status === 'running' && isStaleSearchJob_(job, Date.now(), leaseMs)
      ? buildStaleSearchJobRecoveryPatch_(job)
      : { patch: {} };
    const claimedJob = updateSheetRecord_('search_jobs', job.id, Object.assign({}, staleRecovery.patch || {}, {
      status: 'running',
      lock_token: lockToken,
      locked_at: now,
      last_heartbeat_at: now,
      attempt_count: Number(job.attempt_count || 0) + 1,
      started_at: job.started_at || now,
      finished_at: '',
    }));
    return { claimed: true, busy: false, job: claimedJob, lockToken: lockToken, reason: status === 'running' ? 'stale_recovery' : 'claimed' };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function isRetryableSearchJobError_(error) {
  const code = String((error && error.code) || '').trim();
  if (code === 'SPREADSHEET_UNAVAILABLE') return true;
  if (error && typeof error.retryable === 'boolean') return error.retryable;
  const message = String((error && error.message) || error || '');
  if (/API key is not configured|query is required|invalid search job|not found|no items/i.test(message)) return false;
  return /lock.*timeout|ロック.*タイムアウト|service invoked too many times|service (?:spreadsheets|sheets|drive|urlfetch).*failed|internal error|timed? out|一時的|try again|exceeded maximum execution time|quota exceeded|検索プロバイダーを利用できません|へ接続できません|HTTP\s+(?:408|425|429|5\d\d)\b/i.test(message);
}

function updateClaimedSearchJob_(jobId, lockToken, patch, release) {
  return withScriptLock_('updateClaimedSearchJob', function () {
    const current = findSheetRecordById_('search_jobs', jobId);
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
      record: updateSheetRecord_('search_jobs', jobId, nextPatch),
    };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function normalizeSearchJobInput_(input) {
  const source = input && typeof input === 'object' ? input : {};
  const jobType = String(source.job_type || source.jobType || 'lead_official_site').trim();
  const allowedTypes = ['lead_official_site', 'lead_form_url', 'prospecting', 'source_page'];
  if (allowedTypes.indexOf(jobType) === -1) {
    throw new Error('Invalid search job type: ' + jobType);
  }

  const sourceUrls = jobType === 'source_page'
    ? parseSearchJobLines_(source.sourceUrls || source.source_urls || source.sourceUrl || source.source_url || source.url)
    : [];
  const firstSourceUrl = sourceUrls.length ? normalizeUrl_(sourceUrls[0]) : '';
  const sitePreset = jobType === 'source_page'
    ? String(source.site_preset || source.sitePreset || detectSourcePagePreset_(firstSourceUrl) || '').trim()
    : '';
  const normalizedSource = sitePreset === 'nap_camp'
    ? Object.assign({}, source, { genre: NAP_CAMP_GENRE })
    : source;
  const builtItems = buildSearchJobItems_(normalizedSource, jobType);
  const crawlAll = jobType === 'source_page' && isSourcePageCrawlAllInput_(source);
  const maxJobLimit = crawlAll ? 1000 : 100;
  const defaultJobLimit = crawlAll ? builtItems.length : 20;
  const jobLimit = Math.min(Number(source.job_limit || source.jobLimit || defaultJobLimit) || defaultJobLimit, maxJobLimit, builtItems.length);
  const items = builtItems.slice(0, jobLimit);

  if (items.length === 0) {
    throw new Error('Search job has no items.');
  }

  const resultLimitMax = crawlAll ? 20 : 20;
  const totalCandidates = crawlAll && sitePreset === 'nap_camp'
    ? Math.max(Number(items[0] && items[0].total_candidates) || 0, 0)
    : 0;

  return {
    job_type: jobType,
    job_limit: jobLimit,
    items: items,
    results_per_query: Math.min(Math.max(Number(source.results_per_query || source.resultsPerQuery || (crawlAll ? 20 : 10)) || (crawlAll ? 20 : 10), 1), resultLimitMax),
    use_serper_fallback: source.use_serper_fallback === false || source.useSerperFallback === false ? false : true,
    create_unresolved_leads: false,
    crawl_all: crawlAll,
    site_preset: sitePreset,
    source_url: firstSourceUrl,
    genre: sitePreset === 'nap_camp' ? NAP_CAMP_GENRE : String(source.genre || '').trim(),
    label: String(source.label || source.name || '').trim(),
    total_candidates: totalCandidates,
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
    const queries = parseSearchJobLines_(source.queries || source.query || [genre, region].filter(Boolean).join(' '));
    if (!queries.length) throw new Error('Prospecting query is required.');
    return queries.map(function (query) {
      return { query: query, genre: genre, region: region };
    });
  }

  if (jobType === 'source_page') {
    const genre = String(source.genre || '').trim();
    const label = String(source.label || source.name || '').trim();
    const urls = parseSearchJobLines_(source.sourceUrls || source.source_urls || source.sourceUrl || source.source_url || source.url);
    if (!urls.length) throw new Error('Source page URL is required.');
    const crawlAll = isSourcePageCrawlAllInput_(source);
    const allItems = [];
    urls.forEach(function (url) {
      const normalizedUrl = normalizeUrl_(url);
      const sitePreset = String(source.site_preset || source.sitePreset || detectSourcePagePreset_(normalizedUrl) || '').trim();
      if (crawlAll && sitePreset === 'nap_camp') {
        Array.prototype.push.apply(allItems, buildNapCampSourcePageItems_(normalizedUrl, source));
        return;
      }
      allItems.push({
        source_url: normalizedUrl,
        genre: genre,
        label: label,
        site_preset: sitePreset,
      });
    });
    return allItems.map(function (item) {
      return {
        source_url: item.source_url,
        genre: item.site_preset === 'nap_camp' ? NAP_CAMP_GENRE : (item.genre || genre),
        label: item.label || label,
        site_preset: item.site_preset || '',
        crawl_all: Boolean(item.crawl_all),
        offset: item.offset || 0,
        max_items: item.max_items || '',
        total_candidates: item.total_candidates || '',
      };
    });
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

function isSourcePageCrawlAllInput_(source) {
  const input = source && typeof source === 'object' ? source : {};
  return input.crawl_all === true || input.crawlAll === true || input.collect_all === true || input.collectAll === true;
}

function detectSourcePagePreset_(url) {
  const domain = normalizeDomain_(url);
  if (isDomainOrSubdomain_(domain, 'nap-camp.com')) return 'nap_camp';
  return '';
}

function buildNapCampSourcePageItems_(url, source) {
  const candidates = fetchNapCampCampsiteUrlEntries_();
  const sourceUrl = normalizeUrl_(url || NAP_CAMP_LIST_URL);
  return [{
    source_url: sourceUrl,
    site_preset: 'nap_camp',
    genre: NAP_CAMP_GENRE,
    crawl_all: true,
    offset: 0,
    max_items: candidates.length,
    total_candidates: candidates.length,
  }];
}

function parseSearchJobLines_(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
  }
  return String(value || '')
    .split(/\r?\n|,/)
    .map(function (item) { return item.trim(); })
    .filter(Boolean);
}

function processLeadSearchItem_(item, jobType, jobId) {
  const lead = getLeadById(item.lead_id);
  if (jobType === 'lead_form_url' && isLikelyOfficialCandidateUrl_(lead.website_url, '')) {
    const directContact = extractContactFromOfficialPage_(lead.website_url);
    if (directContact.email || directContact.formUrl) {
      const directMerged = updateLeadFromSearchResult_(lead, {
        website_url: lead.website_url,
        email: directContact.email || '',
        form_url: directContact.formUrl || '',
        url: directContact.formUrl || lead.website_url,
        contact_verified: true,
      }, jobType);
      return {
        updated: directMerged.updated,
        cacheHit: false,
        directDiscovery: true,
      };
    }
  }
  const cacheKey = buildDomainCacheKey_(lead, jobType);
  const cached = jobType === 'lead_form_url' ? null : readDomainCache_(cacheKey);
  if (cached) {
    const merged = updateLeadFromSearchResult_(lead, cached, jobType);
    return { updated: merged.updated, cacheHit: true };
  }

  const query = buildLeadSearchQuery_(lead, jobType);
  const response = callSerperSearch_(query, {
    num: 5,
    purpose: jobType === 'lead_official_site' ? 'official_site_search' : 'form_url_search',
    source: 'search_job',
    leadId: lead.id,
  });
  const selected = selectLeadSearchResult_(response.organic, jobType, lead);

  const excludedDomains = getLeadCollectionExcludedDomainRecords_();
  response.organic.filter(function (result) {
    return !isLeadCollectionExcludedUrl_(result.link || '', excludedDomains);
  }).forEach(function (result, index) {
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

  if (jobType === 'lead_form_url') {
    const verifiedContact = extractContactFromOfficialPage_(selected.url);
    if (!verifiedContact.email && !verifiedContact.formUrl) {
      return { updated: false, cacheHit: false, contactVerified: false };
    }
    const verifiedMerged = updateLeadFromSearchResult_(lead, {
      website_url: lead.website_url || '',
      email: verifiedContact.email || '',
      form_url: verifiedContact.formUrl || '',
      url: verifiedContact.formUrl || selected.url,
      contact_verified: true,
    }, jobType);
    return {
      updated: verifiedMerged.updated,
      cacheHit: false,
      contactVerified: true,
    };
  }

  const cacheRecord = writeDomainCache_(cacheKey, lead, selected, jobType);
  const merged = updateLeadFromSearchResult_(lead, cacheRecord, jobType);
  return { updated: merged.updated, cacheHit: false };
}

function processProspectingSearchItem_(item, payload, jobId) {
  const response = callSerperSearch_(item.query, {
    num: payload.results_per_query || 10,
    purpose: 'genre_area_search',
    source: 'prospecting',
  });

  const excludedDomains = getLeadCollectionExcludedDomainRecords_();
  response.organic.filter(function (result) {
    return !isLeadCollectionExcludedUrl_(result.link || '', excludedDomains);
  }).forEach(function (result, index) {
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

function processNapCampSourcePageItem_(item, payload, jobId, runtimeContext) {
  const sourceUrl = normalizeUrl_(item.source_url || payload.source_url || NAP_CAMP_LIST_URL);
  const cursorOffset = Math.max(Number(runtimeContext && runtimeContext.cursorOffset) || 0, 0);
  if (!hasSearchJobRuntimeAvailable_(runtimeContext, 30000)) {
    return {
      created: 0,
      skipped: 0,
      candidates: 0,
      offset: Math.max(Number(item.offset) || 0, 0),
      totalCandidates: Number(item.total_candidates || 0),
      processedCandidates: 0,
      processedAll: false,
      nextOffset: cursorOffset,
    };
  }
  const allCandidates = fetchNapCampCampsiteUrlEntries_();
  const offset = Math.max(Number(item.offset) || 0, 0);
  const fullCrawl = payload.crawl_all === true && String(item.site_preset || payload.site_preset || '') === 'nap_camp';
  const limit = fullCrawl
    ? Math.max(allCandidates.length - offset, 0)
    : Math.min(Math.max(Number(item.max_items || payload.results_per_query || 20) || 20, 1), 20);
  const chunkLength = Math.max(Math.min(limit, allCandidates.length - offset), 0);
  const candidates = allCandidates.slice(offset + cursorOffset, offset + chunkLength);
  const summary = {
    created: 0,
    skipped: 0,
    candidates: candidates.length,
    offset: offset,
    totalCandidates: allCandidates.length,
    processedCandidates: 0,
    processedAll: cursorOffset >= chunkLength,
    nextOffset: cursorOffset,
    pausedForQuota: false,
    resumeAfter: '',
    quotaCode: '',
  };

  if (!candidates.length) {
    if (chunkLength === 0 && cursorOffset === 0) {
      appendSourcePageResult_(jobId, {
        query: sourceUrl,
        resultType: 'source_page_empty',
        title: item.label || payload.label || 'なっぷ全件収集',
        url: sourceUrl,
        snippet: 'このチャンクには処理対象の施設がありません。',
        rank: offset + 1,
        reviewStatus: 'unconfirmed',
        raw: {
          source_url: sourceUrl,
          site_preset: 'nap_camp',
          offset: offset,
          total_candidates: allCandidates.length,
        },
      });
    }
    summary.processedAll = true;
    return summary;
  }

  for (let index = 0; index < candidates.length; index += 1) {
    if (!hasSearchJobRuntimeAvailable_(runtimeContext, 30000)) {
      break;
    }
    const entry = candidates[index];
    const rank = offset + cursorOffset + index + 1;
    try {
      const candidate = buildNapCampSourcePageCandidate_(entry, sourceUrl);
      const result = processSourcePageCandidate_(candidate, item, payload, jobId, rank - 1, runtimeContext);
      if (result.deferred) {
        summary.pausedForQuota = result.pausedForQuota === true;
        summary.resumeAfter = result.resumeAfter || '';
        summary.quotaCode = result.quotaCode || '';
        break;
      }
      if (result.created) summary.created += 1;
      if (result.skipped) summary.skipped += 1;
    } catch (error) {
      summary.skipped += 1;
      appendSyncError_('processNapCampSourcePageItem', error, {
        target_sheet: 'search_jobs',
        target_id: jobId || '',
        item: item,
        entry: entry,
      });
      appendSourcePageResult_(jobId, {
        query: sourceUrl,
        resultType: 'source_page_error',
        title: entry.detail_url || sourceUrl,
        url: entry.detail_url || sourceUrl,
        snippet: error.message || String(error),
        rank: rank,
        reviewStatus: 'dismissed',
        raw: {
          source_url: sourceUrl,
          site_preset: 'nap_camp',
          entry: entry,
          error: error.message || String(error),
        },
      });
    }
    summary.processedCandidates += 1;
    summary.nextOffset = cursorOffset + summary.processedCandidates;
  }

  summary.processedAll = summary.nextOffset >= chunkLength;
  return summary;
}

function fetchNapCampCampsiteUrlEntries_() {
  const response = UrlFetchApp.fetch(NAP_CAMP_SITEMAP_URL, {
    method: 'get',
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      Accept: 'application/xml,text/xml,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 AppsScript AutoSalesListBot',
    },
  });
  const code = response.getResponseCode();
  const text = response.getContentText('UTF-8') || '';
  if (code < 200 || code >= 400) {
    throw new Error('Nap-camp sitemap fetch failed: HTTP ' + code);
  }

  const entries = [];
  const seen = {};
  const pattern = /<loc>(https:\/\/www\.nap-camp\.com\/([a-z_]+)\/(\d+)\/)<\/loc>/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const detailUrl = String(match[1] || '').replace(/\/+$/, '');
    const prefecture = String(match[2] || '').trim();
    const campsiteId = String(match[3] || '').trim();
    const sourceId = ['nap_camp', prefecture, campsiteId].join(':');
    if (!detailUrl || seen[sourceId]) continue;
    seen[sourceId] = true;
    entries.push({
      detail_url: detailUrl,
      prefecture: prefecture,
      campsite_id: campsiteId,
      source_id: sourceId,
    });
  }

  if (!entries.length) {
    throw new Error('Nap-camp sitemap has no campsite detail URLs.');
  }
  return entries;
}

function buildNapCampSourcePageCandidate_(entry, sourceUrl) {
  const detailUrl = normalizeSourcePageComparableUrl_(entry.detail_url);
  let html = '';
  let facilityName = '';
  let address = '';
  let description = '';
  let detailError = '';

  try {
    const page = fetchProspectingHtml_(detailUrl);
    html = page.html || '';
    facilityName = extractNapCampFacilityName_(html);
    address = extractNapCampAddress_(html);
    description = extractMetaContentFromHtml_(html, 'description');
  } catch (error) {
    detailError = error.message || String(error);
  }

  const name = facilityName || ('なっぷ施設 ' + String(entry.campsite_id || '').trim());
  return {
    facility_name: name,
    text: name,
    url: detailUrl,
    detail_url: detailUrl,
    official_url: '',
    address: address,
    description: description,
    prefecture: entry.prefecture || '',
    campsite_id: entry.campsite_id || '',
    source_id: entry.source_id || '',
    source_preset: 'nap_camp',
    source_url: sourceUrl,
    skip_detail_official: true,
    create_without_official: false,
    detail_error: detailError,
    serper_query: [name, address, 'キャンプ場 公式サイト'].filter(Boolean).join(' '),
  };
}

function extractNapCampFacilityName_(html) {
  const detailMatch = String(html || '').match(/キャンプ場詳細<\/div><div[^>]*>([\s\S]*?)<\/div>/i);
  if (detailMatch && detailMatch[1]) {
    const fromDetail = cleanSourcePageText_(detailMatch[1]);
    if (fromDetail) return fromDetail;
  }

  const title = extractMetaContentFromHtml_(html, 'og:title') ||
    (String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  return cleanSourcePageText_(title)
    .replace(/の口コミ・予約.*$/g, '')
    .replace(/｜\s*なっぷ.*$/g, '')
    .replace(/\s+-\s+なっぷ.*$/g, '')
    .trim();
}

function extractNapCampAddress_(html) {
  const match = String(html || '').match(/住所<\/div><div[^>]*><span[^>]*>([\s\S]*?)(?:<button|<\/span>)/i);
  return match && match[1] ? cleanSourcePageText_(match[1]) : '';
}

function extractMetaContentFromHtml_(html, name) {
  const escapedName = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp("<meta\\s+[^>]*(?:property|name)=[\"']" + escapedName + "[\"'][^>]*content=[\"']([^\"']*)[\"']", 'i');
  const match = String(html || '').match(pattern);
  return match && match[1] ? decodeHtmlEntitiesBasic_(match[1]) : '';
}

function processSourcePageSearchItem_(item, payload, jobId, runtimeContext) {
  if (String(item.site_preset || payload.site_preset || '') === 'nap_camp') {
    return processNapCampSourcePageItem_(item, payload, jobId, runtimeContext);
  }

  const sourceUrl = normalizeUrl_(item.source_url || item.url || '');
  const limit = Math.min(Math.max(Number(payload.results_per_query || item.max_items || 5) || 5, 1), 20);
  const cursorOffset = Math.max(Number(runtimeContext && runtimeContext.cursorOffset) || 0, 0);
  if (!hasSearchJobRuntimeAvailable_(runtimeContext, 30000)) {
    return { created: 0, candidates: 0, processedCandidates: 0, processedAll: false, nextOffset: cursorOffset };
  }
  const page = fetchProspectingHtml_(sourceUrl);
  const candidates = extractSourcePageCandidates_(page.html, sourceUrl, limit);
  const summary = {
    created: 0,
    candidates: candidates.length,
    processedCandidates: 0,
    processedAll: cursorOffset >= candidates.length,
    nextOffset: cursorOffset,
    pausedForQuota: false,
    resumeAfter: '',
    quotaCode: '',
  };

  if (!candidates.length) {
    appendSourcePageResult_(jobId, {
      query: sourceUrl,
      resultType: 'source_page_empty',
      title: item.label || sourceUrl,
      url: sourceUrl,
      snippet: '施設候補を抽出できませんでした。',
      rank: 1,
      reviewStatus: 'unconfirmed',
      raw: {
        source_url: sourceUrl,
        reason: 'no_candidates',
      },
    });
    summary.processedAll = true;
    return summary;
  }

  const limitedCandidates = candidates.slice(0, limit);
  for (let index = cursorOffset; index < limitedCandidates.length; index += 1) {
    if (!hasSearchJobRuntimeAvailable_(runtimeContext, 30000)) {
      break;
    }
    const candidate = limitedCandidates[index];
    try {
      const result = processSourcePageCandidate_(candidate, item, payload, jobId, index, runtimeContext);
      if (result.deferred) {
        summary.pausedForQuota = result.pausedForQuota === true;
        summary.resumeAfter = result.resumeAfter || '';
        summary.quotaCode = result.quotaCode || '';
        break;
      }
      if (result.created) summary.created += 1;
    } catch (error) {
      appendSyncError_('processSourcePageCandidate', error, {
        target_sheet: 'search_jobs',
        target_id: jobId || '',
        item: item,
        candidate: candidate,
      });
      appendSourcePageResult_(jobId, {
        query: sourceUrl,
        resultType: 'source_page_error',
        title: candidate.facility_name || candidate.text || sourceUrl,
        url: candidate.official_url || candidate.detail_url || candidate.url || sourceUrl,
        snippet: error.message || String(error),
        rank: index + 1,
        reviewStatus: 'dismissed',
        raw: {
          source_url: sourceUrl,
          candidate: candidate,
          error: error.message || String(error),
        },
      });
    }
    summary.processedCandidates += 1;
    summary.nextOffset = index + 1;
  }

  summary.processedAll = summary.nextOffset >= limitedCandidates.length;
  return summary;
}

function resolveSourcePageGenre_(candidate, item, payload) {
  const preset = String(
    (candidate && candidate.source_preset) ||
    (item && item.site_preset) ||
    (payload && payload.site_preset) ||
    ''
  ).trim();
  if (preset === 'nap_camp') return NAP_CAMP_GENRE;
  return String((item && item.genre) || (payload && payload.genre) || '').trim();
}

function isNapCampSourcePageLead_(lead) {
  const source = lead && typeof lead === 'object' ? lead : {};
  return String(source.source || '').trim() === 'source_page' &&
    /^nap_camp:/i.test(String(source.source_id || '').trim());
}

function normalizeNapCampJobGenrePayload_(value) {
  const source = value && typeof value === 'object' ? value : {};
  const items = Array.isArray(source.items) ? source.items : [];
  const topLevelNap = String(source.site_preset || '') === 'nap_camp';
  const hasNapItem = items.some(function (item) {
    return String(item && item.site_preset || '') === 'nap_camp';
  });
  if (!topLevelNap && !hasNapItem) return { changed: false, payload: source };

  let changed = false;
  const normalized = Object.assign({}, source);
  if (topLevelNap && String(normalized.genre || '') !== NAP_CAMP_GENRE) {
    normalized.genre = NAP_CAMP_GENRE;
    changed = true;
  }
  normalized.items = items.map(function (item) {
    const nextItem = item && typeof item === 'object' ? Object.assign({}, item) : {};
    if (String(nextItem.site_preset || '') === 'nap_camp' && String(nextItem.genre || '') !== NAP_CAMP_GENRE) {
      nextItem.genre = NAP_CAMP_GENRE;
      changed = true;
    }
    return nextItem;
  });
  return { changed: changed, payload: normalized };
}

function findNapCampJobGenreRepairCandidates_() {
  return findSheetRecordsByExactFieldValues_('search_jobs', 'status', ['queued', 'running']).map(function (job) {
    let payload = {};
    try {
      payload = JSON.parse(String(job.query_json || '{}'));
    } catch (error) {
      return null;
    }
    const normalized = normalizeNapCampJobGenrePayload_(payload);
    return normalized.changed ? { job: job, payload: normalized.payload } : null;
  }).filter(Boolean);
}

function repairNapCampJobGenreCandidates_(candidates) {
  const jobTargetIds = {};
  (Array.isArray(candidates) ? candidates : []).slice(0, 25).forEach(function (candidate) {
    jobTargetIds[String(candidate && candidate.job && candidate.job.id || '')] = true;
  });
  if (!Object.keys(jobTargetIds).length) return 0;

  return withScriptLock_('repairNapCampGenres:jobs', function () {
    const currentJobCandidates = findNapCampJobGenreRepairCandidates_().filter(function (candidate) {
      return jobTargetIds[String(candidate.job.id || '')];
    });
    currentJobCandidates.forEach(function (candidate) {
      updateSheetRecord_('search_jobs', candidate.job.id, {
        query_json: safeJsonStringify_(candidate.payload),
      });
    });
    if (currentJobCandidates.length) SpreadsheetApp.flush();
    return currentJobCandidates.length;
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function repairNapCampGenres(options) {
  const input = options && typeof options === 'object' ? options : {};
  const dryRun = input.dryRun !== false && input.dry_run !== false;
  const startRow = Math.max(Number(input.startRow || input.start_row) || 2, 2);
  const scanLimit = Math.min(Math.max(Number(input.scanLimit || input.scan_limit) || 2000, 1), 20000);
  const maxUpdates = Math.min(Math.max(Number(input.maxUpdates || input.max_updates) || 250, 1), 500);
  const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'leads');
  const headers = getHeaders_(sheet);
  const idColumn = headers.indexOf('id');
  const sourceColumn = headers.indexOf('source');
  const sourceIdColumn = headers.indexOf('source_id');
  const genreColumn = headers.indexOf('genre');
  if (idColumn === -1 || sourceColumn === -1 || sourceIdColumn === -1 || genreColumn === -1) {
    throw new Error('leadsシートにid、source、source_id、genre列が必要です。');
  }

  const jobCandidates = findNapCampJobGenreRepairCandidates_();
  const lastRow = sheet.getLastRow();
  if (startRow > lastRow) {
    const jobsUpdated = dryRun ? 0 : repairNapCampJobGenreCandidates_(jobCandidates);
    return {
      ok: true,
      dryRun: dryRun,
      startRow: startRow,
      nextRow: startRow,
      lastRow: lastRow,
      scanned: 0,
      eligible: 0,
      matched: 0,
      updated: 0,
      jobsMatched: jobCandidates.length,
      jobsUpdated: jobsUpdated,
      done: true,
    };
  }

  const rowCount = Math.min(scanLimit, lastRow - startRow + 1);
  const idValues = sheet.getRange(startRow, idColumn + 1, rowCount, 1).getValues();
  const sourceValues = sheet.getRange(startRow, sourceColumn + 1, rowCount, 1).getValues();
  const sourceIdValues = sheet.getRange(startRow, sourceIdColumn + 1, rowCount, 1).getValues();
  const genreValues = sheet.getRange(startRow, genreColumn + 1, rowCount, 1).getValues();
  const targets = [];
  let eligible = 0;
  let lastScannedRow = startRow - 1;
  for (let index = 0; index < rowCount; index += 1) {
    const rowNumber = startRow + index;
    lastScannedRow = rowNumber;
    const lead = {
      source: sourceValues[index][0],
      source_id: sourceIdValues[index][0],
    };
    if (!isNapCampSourcePageLead_(lead)) continue;
    eligible += 1;
    if (String(genreValues[index][0] || '').trim() === NAP_CAMP_GENRE) continue;
    targets.push({
      rowNumber: rowNumber,
      id: String(idValues[index][0] || ''),
    });
    if (targets.length >= maxUpdates) break;
  }

  const baseResult = {
    ok: true,
    dryRun: dryRun,
    startRow: startRow,
    nextRow: lastScannedRow + 1,
    lastRow: lastRow,
    scanned: Math.max(lastScannedRow - startRow + 1, 0),
    eligible: eligible,
    matched: targets.length,
    updated: 0,
    lockBatches: 0,
    jobsMatched: jobCandidates.length,
    jobsUpdated: 0,
    done: lastScannedRow >= lastRow,
  };
  if (dryRun) return baseResult;

  let updated = 0;
  const batches = partitionLeadRepairTargets_(targets);
  batches.forEach(function (batch) {
    updated += withScriptLock_('repairNapCampGenres:batch', function () {
      const firstRow = Number(batch[0].rowNumber);
      const lastBatchRow = Number(batch[batch.length - 1].rowNumber);
      const currentValues = sheet.getRange(firstRow, 1, lastBatchRow - firstRow + 1, headers.length).getValues();
      const verifiedRows = [];
      batch.forEach(function (target) {
        const current = currentValues[Number(target.rowNumber) - firstRow] || [];
        if (String(current[idColumn] || '') !== String(target.id || '')) return;
        if (!isNapCampSourcePageLead_({
          source: current[sourceColumn],
          source_id: current[sourceIdColumn],
        })) return;
        if (String(current[genreColumn] || '').trim() === NAP_CAMP_GENRE) return;
        verifiedRows.push(Number(target.rowNumber));
      });

      if (verifiedRows.length) {
        const genreColumnA1 = columnNumberToA1_(genreColumn + 1);
        sheet.getRangeList(verifiedRows.map(function (rowNumber) {
          return genreColumnA1 + rowNumber;
        })).setValue(NAP_CAMP_GENRE);
        clearRuntimeCaches_('leads');
        SpreadsheetApp.flush();
      }
      return verifiedRows.length;
    }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
  });

  const jobsUpdated = repairNapCampJobGenreCandidates_(jobCandidates);

  return Object.assign({}, baseResult, {
    updated: updated,
    lockBatches: batches.length,
    jobsUpdated: jobsUpdated,
  });
}

function columnNumberToA1_(columnNumber) {
  let value = Math.max(Number(columnNumber) || 1, 1);
  let text = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    text = String.fromCharCode(65 + remainder) + text;
    value = Math.floor((value - 1) / 26);
  }
  return text;
}

function processSourcePageCandidate_(candidate, item, payload, jobId, index, runtimeContext) {
  const sourceUrl = normalizeUrl_(item.source_url || item.url || payload.source_url || candidate.source_url || '');
  const sourceDomain = normalizeDomain_(sourceUrl);
  const sitePreset = String(candidate.source_preset || item.site_preset || payload.site_preset || '').trim();
  const genre = resolveSourcePageGenre_(candidate, item, payload);
  const facilityName = String(candidate.facility_name || candidate.text || '').trim() ||
    deriveSearchResultCompanyName_(candidate.official_url || candidate.detail_url || sourceUrl);
  let officialUrl = candidate.official_url || '';
  let discoveryMode = officialUrl ? 'direct_official_link' : 'unresolved';
  if (officialUrl && isLeadCollectionExcludedUrl_(officialUrl)) {
    officialUrl = '';
    discoveryMode = 'excluded_non_advertiser_url';
  }
  let searchProviderResult = null;
  const sourceId = candidate.source_id || sourcePageLeadSourceId_(jobId, index, facilityName, officialUrl || candidate.detail_url || sourceUrl);
  const leadIndex = runtimeContext && runtimeContext.leadIndex;
  const existingBeforeSearch = findExistingSourcePageLead_(candidate, facilityName, officialUrl, leadIndex);
  if (existingBeforeSearch) {
    appendSourcePageResult_(jobId, {
      query: sourceUrl,
      resultType: 'source_page_duplicate',
      title: facilityName,
      url: candidate.detail_url || candidate.url || officialUrl || sourceUrl,
      snippet: '既存営業リストに登録済みのためスキップしました。',
      rank: index + 1,
      leadId: existingBeforeSearch.id || '',
      reviewStatus: 'duplicate',
      raw: {
        source_url: sourceUrl,
        site_preset: sitePreset,
        source_id: sourceId,
        candidate: candidate,
        duplicate_lead_id: existingBeforeSearch.id || '',
      },
    });
    return { created: false, skipped: true, duplicate: true };
  }

  if (!officialUrl && candidate.detail_url && !candidate.skip_detail_official) {
    if (!hasSearchJobRuntimeAvailable_(runtimeContext, 35000)) return { created: false, deferred: true };
    try {
      const detailPage = fetchProspectingHtml_(candidate.detail_url);
      officialUrl = extractFirstOfficialLinkFromHtml_(detailPage.html, candidate.detail_url, sourceDomain);
      if (officialUrl && isLeadCollectionExcludedUrl_(officialUrl)) {
        officialUrl = '';
        discoveryMode = 'excluded_non_advertiser_url';
      } else if (officialUrl) {
        discoveryMode = 'detail_page_official_link';
      }
    } catch (error) {
      candidate.detail_error = error.message || String(error);
    }
  }

  if (!officialUrl && payload.use_serper_fallback !== false && hasSearchProviderConfigured_()) {
    if (!hasSearchJobRuntimeAvailable_(runtimeContext, 45000)) return { created: false, deferred: true };
    try {
      const query = candidate.serper_query || [facilityName, candidate.address || '', genre, '公式サイト'].filter(Boolean).join(' ');
      const response = callSerperSearch_(query, {
        num: 5,
        purpose: 'source_page_official_site_fallback',
        source: 'source_page',
        jobId: jobId || '',
      });
      const selected = selectLeadSearchResult_(response.organic, 'lead_official_site', {
        company_name: facilityName,
        facility_name: facilityName,
        address: candidate.address || '',
      });
      searchProviderResult = {
        query: query,
        selected: selected,
        resultCount: response.organic.length,
        provider: String(response.provider || ''),
        fallbackFrom: String(response.fallbackFrom || ''),
        fallbackError: String(response.fallbackError || ''),
      };
      if (selected.url && !isDomainOrSubdomain_(normalizeDomain_(selected.url), sourceDomain)) {
        officialUrl = selected.url;
        discoveryMode = response.provider === 'searxng' ? 'searxng_fallback' : 'serper_fallback';
      }
    } catch (error) {
      searchProviderResult = {
        query: candidate.serper_query || [facilityName, candidate.address || '', genre, '公式サイト'].filter(Boolean).join(' '),
        selected: null,
        resultCount: 0,
        provider: '',
        error: error.message || String(error),
      };
    }
  }

  if (officialUrl && isLeadCollectionExcludedUrl_(officialUrl)) {
    officialUrl = '';
    discoveryMode = 'excluded_non_advertiser_url';
  }

  if (officialUrl) {
    const existingAfterSearch = findExistingSourcePageLead_(candidate, facilityName, officialUrl, leadIndex);
    if (existingAfterSearch) {
      appendSourcePageResult_(jobId, {
        query: sourceUrl,
        resultType: 'source_page_duplicate',
        title: facilityName,
        url: officialUrl,
        snippet: '公式URLが既存営業リストと一致したためスキップしました。',
        rank: index + 1,
        leadId: existingAfterSearch.id || '',
        reviewStatus: 'duplicate',
        raw: {
          source_url: sourceUrl,
          site_preset: sitePreset,
          source_id: sourceId,
          candidate: candidate,
          official_url: officialUrl,
          serper: searchProviderResult,
          search_provider: searchProviderResult,
          duplicate_lead_id: existingAfterSearch.id || '',
        },
      });
      return { created: false, skipped: true, duplicate: true };
    }
  }

  if (!officialUrl) {
    appendSourcePageResult_(jobId, {
      query: sourceUrl,
      resultType: 'source_page_unresolved',
      title: facilityName,
      url: candidate.detail_url || candidate.url || sourceUrl,
      snippet: payload.use_serper_fallback === false ? '公式URL未検出。検索補完はOFFです。' : '公式URLを特定できませんでした。',
      rank: index + 1,
      reviewStatus: 'unconfirmed',
      raw: {
        source_url: sourceUrl,
        site_preset: sitePreset,
        source_id: sourceId,
        candidate: candidate,
        serper: searchProviderResult,
        search_provider: searchProviderResult,
      },
    });
    return { created: false, unresolved: true, excludedFromReview: true };
  }

  if (officialUrl && !hasSearchJobRuntimeAvailable_(runtimeContext, 30000)) return { created: false, deferred: true };
  const contact = officialUrl ? extractContactFromOfficialPage_(officialUrl) : {
    email: '',
    formUrl: '',
    checkedUrl: '',
    errorMessage: '',
  };
  let lead = null;
  let reviewStatus = 'added';
  let errorMessage = '';
  if (!hasSearchJobRuntimeAvailable_(runtimeContext, 10000)) return { created: false, deferred: true };
  try {
    lead = createLeadWithLockOptions_({
      source: 'source_page',
      source_id: sourceId,
      external_id: candidate.detail_url || candidate.url || sourceUrl,
      genre: genre,
      company_name: facilityName,
      facility_name: facilityName,
      email: contact.email || '',
      website_url: officialUrl,
      form_url: contact.formUrl || '',
      address: candidate.address || '',
      status: '未対応',
      notes: officialUrl ? 'サイト収集型で追加' : 'サイト収集型で追加（公式URL未確認）',
      source_payload_json: safeJsonStringify_({
        collection_type: 'source_page',
        site_preset: sitePreset,
        source_url: sourceUrl,
        source_id: sourceId,
        detail_url: candidate.detail_url || '',
        address: candidate.address || '',
        discovery_mode: discoveryMode,
        serper: searchProviderResult,
        search_provider: searchProviderResult,
        contact_error: contact.errorMessage || '',
      }),
    }, { waitMs: 5000, attempts: 1 });
    addLeadToSourcePageIndex_(leadIndex, lead);
  } catch (error) {
    if (isScriptLockTimeoutError_(error)) {
      return { created: false, deferred: true, lockContention: true };
    }
    errorMessage = error.message || String(error);
    reviewStatus = error.code === 'DUPLICATE_LEAD' || /^Duplicate lead exists/.test(errorMessage) ? 'duplicate' : 'dismissed';
  }

  const usedSearchProviderFallback = discoveryMode === 'serper_fallback' || discoveryMode === 'searxng_fallback';
  const searchProviderLabel = discoveryMode === 'searxng_fallback' ? 'PC検索' : 'Serper';
  appendSourcePageResult_(jobId, {
    query: sourceUrl,
    resultType: officialUrl ? (usedSearchProviderFallback ? (discoveryMode === 'searxng_fallback' ? 'source_page_searxng' : 'source_page_serper') : 'source_page_direct') : 'source_page_unresolved_added',
    title: facilityName,
    url: officialUrl || candidate.detail_url || candidate.url || sourceUrl,
    snippet: errorMessage || [
      officialUrl ? (usedSearchProviderFallback ? searchProviderLabel + 'で公式URLを補完' : '公式URLから直接取得') : '公式URL未確認の施設候補として追加',
      contact.email ? 'メールあり' : 'メール未検出',
      contact.formUrl ? 'フォームあり' : 'フォーム未検出',
    ].join(' / '),
    rank: index + 1,
    leadId: lead ? lead.id : '',
    reviewStatus: reviewStatus,
    raw: {
      source_url: sourceUrl,
      site_preset: sitePreset,
      source_id: sourceId,
      candidate: candidate,
      official_url: officialUrl,
      contact: contact,
      serper: searchProviderResult,
      search_provider: searchProviderResult,
      error: errorMessage,
    },
  });

  return { created: Boolean(lead) };
}

function sourcePageLeadIndexFields_() {
  return [
    'id',
    'source',
    'source_id',
    'external_id',
    'company_name',
    'normalized_company_name',
    'facility_name',
    'website_url',
    'archived_at',
  ];
}

function buildSourcePageLeadIndex_() {
  return buildSourcePageLeadIndexFromRecords_(
    readSheetRecordFields_('leads', sourcePageLeadIndexFields_(), { maxGapColumns: 0 })
  );
}

function buildSourcePageLeadIndexFromRecords_(leads) {
  const index = {
    sourceIds: {},
    externalUrls: {},
    websiteUrls: {},
    websiteDomains: {},
    names: {},
  };
  (leads || []).forEach(function (lead) {
    addLeadToSourcePageIndex_(index, lead);
  });
  return index;
}

function addLeadToSourcePageIndex_(index, lead) {
  if (!index || !lead || isArchivedLead_(lead)) return index;
  if (!index.websiteDomains) index.websiteDomains = {};
  const source = String(lead.source || '').trim();
  const sourceId = String(lead.source_id || '').trim();
  const externalUrl = normalizeSourcePageComparableUrl_(lead.external_id || '');
  const websiteUrl = normalizeSourcePageComparableUrl_(lead.website_url || '');
  const websiteDomain = leadDuplicateWebsiteDomain_(lead);
  const name = normalizeCompanyName_(lead.normalized_company_name || lead.company_name || lead.facility_name || '');
  if (source === 'source_page' && sourceId && !index.sourceIds[sourceId]) index.sourceIds[sourceId] = lead;
  if (externalUrl && !index.externalUrls[externalUrl]) index.externalUrls[externalUrl] = lead;
  if (websiteUrl && !index.websiteUrls[websiteUrl]) index.websiteUrls[websiteUrl] = lead;
  if (websiteDomain && !index.websiteDomains[websiteDomain]) index.websiteDomains[websiteDomain] = lead;
  if (name && name.length >= 4 && !index.names[name]) index.names[name] = lead;
  return index;
}

function findExistingSourcePageLead_(candidate, facilityName, officialUrl, leadIndex) {
  const sourceId = String(candidate.source_id || '').trim();
  const candidateName = normalizeCompanyName_(facilityName || candidate.facility_name || candidate.text || '');
  const detailUrl = normalizeSourcePageComparableUrl_(candidate.detail_url || candidate.url || '');
  const officialComparableUrl = normalizeSourcePageComparableUrl_(officialUrl || candidate.official_url || '');
  const officialDomain = normalizeDomain_(officialUrl || candidate.official_url || '');
  const index = leadIndex || buildSourcePageLeadIndex_();
  return (sourceId && index.sourceIds[sourceId]) ||
    (detailUrl && index.externalUrls[detailUrl]) ||
    (detailUrl && index.websiteUrls[detailUrl]) ||
    (officialComparableUrl && index.websiteUrls[officialComparableUrl]) ||
    (officialDomain && index.websiteDomains[officialDomain]) ||
    (candidateName && candidateName.length >= 4 && index.names[candidateName]) ||
    null;
}

function normalizeSourcePageComparableUrl_(url) {
  return normalizeLeadComparableUrl_(url);
}

function parseSourcePageJobPayloadForStatus_(job) {
  try {
    const parsed = JSON.parse(String(job && job.query_json || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function sourcePageJobMatchesSavedUrl_(payload, comparableUrl) {
  const target = String(comparableUrl || '');
  if (!target) return false;
  const source = payload && typeof payload === 'object' ? payload : {};
  const urls = [source.source_url, source.sourceUrl];
  const sourceUrls = Array.isArray(source.source_urls)
    ? source.source_urls
    : (Array.isArray(source.sourceUrls) ? source.sourceUrls : []);
  sourceUrls.forEach(function (url) { urls.push(url); });
  (Array.isArray(source.items) ? source.items : []).forEach(function (item) {
    const value = item && typeof item === 'object' ? item : {};
    urls.push(value.source_url || value.sourceUrl || value.url || '');
  });
  return urls.some(function (url) {
    return normalizeSourcePageComparableUrl_(url) === target;
  });
}

function sourcePageJobIsFullCrawl_(payload, comparableUrl) {
  const source = payload && typeof payload === 'object' ? payload : {};
  if (source.crawl_all === true || source.crawlAll === true || String(source.crawl_all || source.crawlAll || '').toLowerCase() === 'true') {
    return true;
  }
  const target = String(comparableUrl || '');
  return (Array.isArray(source.items) ? source.items : []).some(function (item) {
    const value = item && typeof item === 'object' ? item : {};
    const itemUrl = normalizeSourcePageComparableUrl_(value.source_url || value.sourceUrl || value.url || '');
    const crawlAll = value.crawl_all === true || value.crawlAll === true || String(value.crawl_all || value.crawlAll || '').toLowerCase() === 'true';
    return crawlAll && (!target || itemUrl === target);
  });
}

function sourcePageJobFacilityTotal_(job, payload, comparableUrl) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const target = String(comparableUrl || '');
  const matchedItem = (Array.isArray(source.items) ? source.items : []).find(function (item) {
    const value = item && typeof item === 'object' ? item : {};
    return normalizeSourcePageComparableUrl_(value.source_url || value.sourceUrl || value.url || '') === target;
  }) || {};
  const candidates = [
    matchedItem.total_candidates,
    matchedItem.totalCandidates,
    source.total_candidates,
    source.totalCandidates,
    job && job.total_count,
  ];
  for (let index = 0; index < candidates.length; index += 1) {
    const numeric = Number(candidates[index]);
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  }
  return 0;
}

function sourcePageJobStatusTimestamp_(job) {
  const value = String(job && (job.updated_at || job.finished_at || job.started_at || job.created_at) || '');
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSourcePageSiteStatus_(site, searchJobs) {
  const savedSite = site && typeof site === 'object' ? site : {};
  const comparableUrl = normalizeSourcePageComparableUrl_(savedSite.url || '');
  const matching = (searchJobs || []).map(function (entry) {
    if (entry && entry.job && entry.payload) return entry;
    return {
      job: entry,
      payload: parseSourcePageJobPayloadForStatus_(entry),
    };
  }).filter(function (entry) {
    return String(entry.job.job_type || '') === 'source_page' && sourcePageJobMatchesSavedUrl_(entry.payload, comparableUrl);
  }).sort(function (a, b) {
    return sourcePageJobStatusTimestamp_(b.job) - sourcePageJobStatusTimestamp_(a.job);
  });

  const active = matching.find(function (entry) {
    return ['queued', 'running'].indexOf(String(entry.job.status || '')) !== -1;
  });
  const wantsFullCrawl = savedSite.crawlAll === true || savedSite.crawl_all === true || String(savedSite.crawlAll || savedSite.crawl_all || '').toLowerCase() === 'true';
  const latestFullCrawl = wantsFullCrawl ? matching.find(function (entry) {
    return sourcePageJobIsFullCrawl_(entry.payload, comparableUrl);
  }) : null;
  const selected = active || latestFullCrawl || matching[0] || null;

  const base = {
    id: String(savedSite.id || ''),
    label: String(savedSite.label || savedSite.url || ''),
    url: String(savedSite.url || ''),
    genre: String(savedSite.genre || savedSite.genreName || ''),
    enabled: savedSite.enabled !== false,
    crawlAll: wantsFullCrawl,
    sitePreset: String(savedSite.sitePreset || savedSite.site_preset || ''),
    savedAt: String(savedSite.updatedAt || savedSite.updated_at || ''),
    jobId: '',
    jobStatus: '',
    statusKey: 'not_started',
    statusLabel: '未実行',
    tone: 'muted',
    completed: false,
    processed: 0,
    total: 0,
    percent: 0,
    completedAt: '',
    updatedAt: '',
    lastError: '',
  };
  if (!selected) return base;

  const job = selected.job;
  const payload = selected.payload;
  const jobStatus = String(job.status || '').toLowerCase();
  const fullCrawl = sourcePageJobIsFullCrawl_(payload, comparableUrl);
  const total = sourcePageJobFacilityTotal_(job, payload, comparableUrl);
  let cursor = {};
  try {
    cursor = JSON.parse(String(job.cursor_json || '{}')) || {};
  } catch (error) {
    cursor = {};
  }
  const cursorOffset = Math.max(Number(cursor.offset || 0) || 0, 0);
  let processed = fullCrawl && total > 0
    ? (jobStatus === 'completed' ? total : Math.min(cursorOffset, total))
    : Math.max(Number(job.processed_count || 0) || 0, 0);
  if (total > 0) processed = Math.min(processed, total);
  const errorCount = Math.max(Number(job.error_count || 0) || 0, 0);
  const lastError = String(job.last_error || '').trim();
  const hasAttention = errorCount > 0 || Boolean(lastError);
  const completedAt = String(job.finished_at || (jobStatus === 'completed' ? job.updated_at : '') || '');
  let statusKey = jobStatus || 'attention';
  let statusLabel = '確認が必要';
  let tone = 'warn';
  let completed = false;

  if (jobStatus === 'queued' || jobStatus === 'running') {
    statusKey = 'running';
    statusLabel = matching.some(function (entry) { return String(entry.job.status || '') === 'completed'; }) ? '再調査中' : '調査中';
    tone = 'info';
  } else if (jobStatus === 'completed' && wantsFullCrawl && !fullCrawl) {
    statusKey = 'partial_completed';
    statusLabel = '一部調査完了';
    tone = 'warn';
  } else if (jobStatus === 'completed') {
    completed = true;
    statusKey = hasAttention ? 'completed_attention' : 'completed';
    statusLabel = fullCrawl ? '全件調査完了' : '登録URL調査完了';
    if (hasAttention) statusLabel += '（注意あり）';
    tone = hasAttention ? 'warn' : 'good';
  } else if (jobStatus === 'failed' || jobStatus === 'cancelled' || jobStatus === 'canceled') {
    statusKey = 'failed';
    statusLabel = jobStatus === 'failed' ? '調査失敗' : '調査中止';
    tone = 'bad';
  }

  const percent = total > 0
    ? Math.max(0, Math.min(100, Math.round((processed / total) * 100)))
    : (completed ? 100 : 0);
  return Object.assign(base, {
    jobId: String(job.id || ''),
    jobStatus: jobStatus,
    statusKey: statusKey,
    statusLabel: statusLabel,
    tone: tone,
    completed: completed,
    processed: processed,
    total: total,
    percent: percent,
    completedAt: completedAt,
    updatedAt: String(job.updated_at || job.last_heartbeat_at || job.created_at || ''),
    lastError: lastError,
  });
}

function listSourcePageSiteStatuses(options) {
  const input = options && typeof options === 'object' ? options : {};
  const cacheKey = 'source_page_site_status_v1';
  if (input.bypassCache !== true) {
    try {
      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.cached = true;
        return parsed;
      }
    } catch (error) {
      console.warn('Source page site status cache read skipped: ' + String(error.message || error));
    }
  }
  const setting = getSettingValue_('source_page_prospecting', { sites: [] }) || {};
  const sites = Array.isArray(setting.sites) ? setting.sites.filter(function (site) {
    return site && site.url;
  }) : [];
  const searchJobs = readSheetRecordFields_('search_jobs', [
    'id',
    'job_type',
    'status',
    'query_json',
    'total_count',
    'processed_count',
    'cursor_json',
    'last_error',
    'error_count',
    'last_heartbeat_at',
    'started_at',
    'finished_at',
    'created_at',
    'updated_at',
  ]);
  const parsedSearchJobs = searchJobs.map(function (job) {
    return { job: job, payload: parseSourcePageJobPayloadForStatus_(job) };
  });
  const items = sites.map(function (site) {
    return buildSourcePageSiteStatus_(site, parsedSearchJobs);
  });
  const result = {
    total: items.length,
    completed: items.filter(function (item) { return item.completed; }).length,
    running: items.filter(function (item) { return item.statusKey === 'running'; }).length,
    attention: items.filter(function (item) {
      return ['completed_attention', 'partial_completed', 'failed', 'attention'].indexOf(item.statusKey) !== -1;
    }).length,
    notStarted: items.filter(function (item) { return item.statusKey === 'not_started'; }).length,
    generatedAt: nowIso_(),
    items: items,
  };
  try {
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 300);
  } catch (error) {
    console.warn('Source page site status cache write skipped: ' + String(error.message || error));
  }
  return result;
}

function appendSourcePageResult_(jobId, result) {
  return appendSheetRecord_('search_results', {
    job_id: jobId || '',
    lead_id: result.leadId || '',
    query: result.query || '',
    result_type: result.resultType || 'source_page',
    title: result.title || '',
    url: result.url || '',
    snippet: result.snippet || '',
    rank: result.rank || '',
    raw_json: safeJsonStringify_(result.raw || {}),
    review_status: result.reviewStatus || 'unconfirmed',
    review_action: result.reviewAction || '',
    reviewed_at: result.reviewStatus === 'added' || result.reviewStatus === 'duplicate' ? nowIso_() : '',
  });
}

function fetchProspectingHtml_(url) {
  const targetUrl = normalizeUrl_(url);
  const response = UrlFetchApp.fetch(targetUrl, {
    method: 'get',
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 AppsScript AutoSalesListBot',
    },
  });
  const code = response.getResponseCode();
  const text = response.getContentText('UTF-8') || '';
  if (code < 200 || code >= 400) {
    throw new Error('Source page fetch failed: HTTP ' + code + ' ' + targetUrl);
  }
  return {
    url: targetUrl,
    html: text.slice(0, 600000),
  };
}

function extractSourcePageCandidates_(html, baseUrl, limit) {
  const sourceDomain = normalizeDomain_(baseUrl);
  const links = extractHtmlLinks_(html, baseUrl);
  const seen = {};
  const candidates = [];
  links.forEach(function (link) {
    if (!link.url || !/^https?:\/\//i.test(link.url)) return;
    const domain = normalizeDomain_(link.url);
    if (!domain) return;
    const external = sourceDomain && !isDomainOrSubdomain_(domain, sourceDomain);
    const official = external && isLikelyOfficialCandidateUrl_(link.url, sourceDomain);
    const text = cleanSourcePageText_(link.text || '');
    if (!official && !isSourcePageCandidateText_(text)) return;
    const facilityName = official && isGenericSourcePageText_(text)
      ? deriveSearchResultCompanyName_(link.url)
      : (text || deriveSearchResultCompanyName_(link.url));
    const key = [
      official ? 'official' : 'detail',
      official ? domain : link.url,
      normalizeCompanyName_(facilityName),
    ].join('|');
    if (seen[key]) return;
    seen[key] = true;
    candidates.push({
      facility_name: facilityName,
      text: text,
      url: link.url,
      detail_url: official ? '' : link.url,
      official_url: official ? link.url : '',
    });
  });
  return candidates.slice(0, Math.min(Math.max(Number(limit) || 5, 1), 30));
}

function extractFirstOfficialLinkFromHtml_(html, baseUrl, sourceDomain) {
  const links = extractHtmlLinks_(html, baseUrl);
  const preferred = links.find(function (link) {
    return link.url && isLikelyOfficialCandidateUrl_(link.url, sourceDomain) &&
      /公式|ホームページ|hp|website|site|web/i.test(String(link.text || '') + ' ' + String(link.url || ''));
  });
  if (preferred) return preferred.url;
  const first = links.find(function (link) {
    return link.url && isLikelyOfficialCandidateUrl_(link.url, sourceDomain);
  });
  return first ? first.url : '';
}

function extractContactFromOfficialPage_(officialUrl) {
  const result = {
    email: '',
    formUrl: '',
    checkedUrl: normalizeUrl_(officialUrl),
    checkedUrls: [],
    errorMessage: '',
  };
  const officialDomain = normalizeDomain_(result.checkedUrl);
  const queue = [{ url: result.checkedUrl, score: 1000 }];
  const queued = {};
  const visited = {};
  const errors = [];
  queued[result.checkedUrl] = true;

  const maxCheckedPages = 4;
  const maxQueuedPages = 6;
  while (queue.length && result.checkedUrls.length < maxCheckedPages) {
    const current = queue.shift();
    const currentUrl = normalizeUrl_(current.url);
    if (!currentUrl || visited[currentUrl]) continue;
    visited[currentUrl] = true;
    try {
      const page = fetchProspectingHtml_(currentUrl);
      const decoded = decodeContactDiscoveryHtml_(page.html);
      result.checkedUrls.push(currentUrl);
      const links = extractHtmlLinks_(decoded, currentUrl);
      const mailLink = links.find(function (link) { return link.email; });
      if (!result.email) {
        result.email = extractEmailFromSearchResult_(decoded) || (mailLink ? mailLink.email : '');
      }

      const embeddedFormUrl = extractEmbeddedContactFormUrl_(decoded, currentUrl);
      if (!result.formUrl && embeddedFormUrl) result.formUrl = embeddedFormUrl;
      if (!result.formUrl && isLikelyContactFormHtml_(decoded, currentUrl)) result.formUrl = currentUrl;

      rankContactPageLinks_(links, officialDomain).forEach(function (candidate) {
        if (!queued[candidate.url] && !visited[candidate.url] && queue.length < maxQueuedPages) {
          queued[candidate.url] = true;
          queue.push(candidate);
        }
        if (!result.formUrl && isKnownContactFormHost_(candidate.url)) {
          result.formUrl = candidate.url;
        }
      });
      queue.sort(function (left, right) { return right.score - left.score; });
    } catch (error) {
      errors.push(error.message || String(error));
    }
  }
  if (!result.email && !result.formUrl && errors.length) result.errorMessage = errors.slice(0, 3).join(' / ');
  return result;
}

function decodeContactDiscoveryHtml_(html) {
  let decoded = decodeHtmlEntitiesBasic_(html);
  decoded = decoded.replace(/(?:data-cfemail\s*=\s*["']?([0-9a-f]{4,})["']?|\/cdn-cgi\/l\/email-protection#([0-9a-f]{4,}))/gi, function (match, attributeHex, linkHex) {
    const email = decodeCloudflareEmailHex_(attributeHex || linkHex || '');
    return email ? match + ' ' + email + ' ' : match;
  });
  decoded = decoded.replace(/<[^>]{0,2000}>/g, function (tag) {
    const user = extractContactDataAttribute_(tag, ['data-user', 'data-name', 'data-account', 'data-local']);
    const domain = extractContactDataAttribute_(tag, ['data-domain', 'data-host']);
    const email = user && domain ? String(user).trim() + '@' + String(domain).trim() : '';
    return email && isValidEmailAddress_(email) ? tag + ' ' + email + ' ' : tag;
  });
  return decoded
    .replace(/\s*(?:\(at\)|\[at\]|＠)\s*/gi, '@')
    .replace(/\s*(?:\(dot\)|\[dot\])\s*/gi, '.');
}

function decodeCloudflareEmailHex_(encodedValue) {
  const encoded = String(encodedValue || '').trim();
  if (!/^[0-9a-f]+$/i.test(encoded) || encoded.length < 4 || encoded.length % 2 !== 0) return '';
  const key = parseInt(encoded.slice(0, 2), 16);
  if (!Number.isFinite(key)) return '';
  let decoded = '';
  for (let index = 2; index < encoded.length; index += 2) {
    decoded += String.fromCharCode(parseInt(encoded.slice(index, index + 2), 16) ^ key);
  }
  return isValidEmailAddress_(decoded) ? decoded.toLowerCase() : '';
}

function extractContactDataAttribute_(tag, names) {
  const source = String(tag || '');
  const attributeNames = Array.isArray(names) ? names : [];
  for (let index = 0; index < attributeNames.length; index += 1) {
    const escapedName = String(attributeNames[index] || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp('\\b' + escapedName + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
    if (match) return decodeHtmlEntitiesBasic_(match[1] || match[2] || match[3] || '');
  }
  return '';
}

function rankContactPageLinks_(links, officialDomain) {
  const seen = {};
  return (Array.isArray(links) ? links : []).map(function (link) {
    return {
      url: String(link && link.url || '').split('#')[0],
      score: scoreContactPageLink_(link, officialDomain),
    };
  }).filter(function (candidate) {
    if (!candidate.url || candidate.score < 60 || seen[candidate.url]) return false;
    seen[candidate.url] = true;
    return true;
  }).sort(function (left, right) {
    return right.score - left.score;
  }).slice(0, 6);
}

function scoreContactPageLink_(link, officialDomain) {
  const url = String(link && link.url || '').trim();
  if (!/^https?:\/\//i.test(url) || /\.(?:pdf|jpe?g|png|gif|webp|svg|zip)(?:$|\?)/i.test(url)) return -1000;
  const text = cleanSourcePageText_(link && link.text || '');
  const value = text + ' ' + url;
  const domain = normalizeDomain_(url);
  const sameOfficialDomain = Boolean(officialDomain && domain && isDomainOrSubdomain_(domain, officialDomain));
  let score = 0;
  if (/(?:お問い合わせ|お問合せ|問い合わせ|contact\s*us|inquiry)/i.test(text)) score += 120;
  if (/(?:contact|inquiry|otoiawase|toiawase)(?:[\/_\-.?=&]|$)/i.test(url)) score += 85;
  if (/(?:フォーム|メールフォーム|ご相談|資料請求)/i.test(text)) score += 65;
  if (/(?:form)(?:[\/_\-.?=&]|$)/i.test(url)) score += 40;
  if (sameOfficialDomain && /(?:会社概要|運営会社|運営者|事業者情報|施設概要|about\s*us|company|corporate|operator)/i.test(text)) score += 55;
  if (sameOfficialDomain && /(?:about|company|corporate|operator|profile)(?:[\/_\-.?=&]|$)/i.test(url)) score += 45;
  if (isKnownContactFormHost_(url)) score += 80;
  if (sameOfficialDomain) score += 15;
  else if (!isKnownContactFormHost_(url)) score -= 20;
  if (/(?:recruit|career|saiyo|採用|privacy|policy|login|member|newsletter|mailmag|メルマガ)/i.test(value)) score -= 120;
  if (/(?:reservation|booking|reserve|予約)/i.test(value)) score -= 50;
  if (/(?:access|交通アクセス|アクセスマップ|道順|地図)/i.test(value)) score -= 80;
  return score;
}

function isKnownContactFormHost_(url) {
  const domain = normalizeDomain_(url);
  if (isDomainOrSubdomain_(domain, 'docs.google.com')) return /\/forms\//i.test(String(url || ''));
  return [
    'forms.gle',
    'form.run',
    'formzu.com',
    'formzu.net',
    'tayori.com',
    'select-type.com',
    'jotform.com',
    'jotformpro.com',
    'kintoneapp.com',
    'forms.office.com',
    'form-mailer.jp',
    'formok.com',
    'share.hsforms.com',
  ].some(function (host) {
    return isDomainOrSubdomain_(domain, host);
  });
}

function extractEmbeddedContactFormUrl_(html, baseUrl) {
  const iframePattern = /<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;
  while ((match = iframePattern.exec(String(html || ''))) !== null) {
    const url = resolveSourcePageUrl_(match[1] || match[2] || match[3] || '', baseUrl);
    if (url && isKnownContactFormHost_(url)) return url;
  }
  return '';
}

function isLikelyContactFormHtml_(html, url) {
  const source = String(html || '');
  if (/<(?:form|div)\b[^>]*(?:wpcf7|mw_wp_form|mw-wp-form|ninja-forms|gform_wrapper|forminator|contact-form-7)/i.test(source) &&
      /(?:<textarea\b|name\s*=\s*["']?(?:message|comment|inquiry))/i.test(source)) return true;
  if (!/<form\b/i.test(source)) return false;
  const formPattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let match;
  while ((match = formPattern.exec(source)) !== null) {
    const formSource = String(match[1] || '') + ' ' + String(match[2] || '');
    const plainFormText = cleanSourcePageText_(formSource);
    const signals = formSource + ' ' + plainFormText + ' ' + String(url || '');
    if (/(?:newsletter|mailmag|メルマガ|検索|site\s*search|login|ログイン|reservation|booking|reserve|予約)/i.test(signals)) continue;
    const contactSignal = /(?:お問い合わせ|お問合せ|問い合わせ|contact|inquiry|ご相談|資料請求)/i.test(signals);
    const messageSignal = /(?:<textarea\b|name\s*=\s*["']?(?:message|comment|inquiry|body|content))/i.test(formSource);
    const identitySignal = /(?:type\s*=\s*["']?(?:email|tel)|name\s*=\s*["']?(?:name|email|mail|tel|phone))/i.test(formSource);
    if (contactSignal && messageSignal && identitySignal) return true;
  }
  return false;
}

function extractHtmlLinks_(html, baseUrl) {
  const links = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(String(html || ''))) !== null && links.length < 500) {
    const attrs = match[1] || '';
    const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!hrefMatch) continue;
    const rawHref = String(hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '').trim();
    const text = cleanSourcePageText_(match[2] || '');
    if (/^mailto:/i.test(rawHref)) {
      const mailtoValue = decodeUriComponentSafely_(rawHref.replace(/^mailto:/i, '').split('?')[0]);
      links.push({
        rawHref: rawHref,
        text: text,
        url: '',
        email: extractEmailFromSearchResult_(mailtoValue),
      });
      continue;
    }
    const url = resolveSourcePageUrl_(rawHref, baseUrl);
    if (!url) continue;
    links.push({
      rawHref: rawHref,
      text: text,
      url: url,
      email: '',
    });
  }
  return links;
}

function decodeUriComponentSafely_(value) {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, '%20'));
  } catch (error) {
    return String(value || '');
  }
}

function resolveSourcePageUrl_(href, baseUrl) {
  const raw = String(href || '').trim();
  if (!raw || /^#|^javascript:|^tel:|^fax:/i.test(raw)) return '';
  try {
    if (/^\/\//.test(raw)) {
      const protocol = String(baseUrl || '').match(/^https?:/i);
      return ((protocol && protocol[0]) || 'https:') + raw;
    }
    return new URL(raw, normalizeUrl_(baseUrl)).href.split('#')[0];
  } catch (error) {
    return '';
  }
}

function isLikelyOfficialCandidateUrl_(url, sourceDomain) {
  const domain = normalizeDomain_(url);
  if (!domain) return false;
  if (sourceDomain && isDomainOrSubdomain_(domain, sourceDomain)) return false;
  if (isKnownLeadListingDirectoryDomain_(domain)) return false;
  if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|docx?|xlsx?)(?:$|\?)/i.test(String(url || ''))) return false;
  const excludedHosts = [
    'facebook.com',
    'instagram.com',
    'x.com',
    'twitter.com',
    'linkedin.com',
    'youtube.com',
    'google.com',
    'maps.google.com',
    'map.yahoo.co.jp',
    'yahoo.co.jp',
    'jalan.net',
    'rakuten.co.jp',
    'booking.com',
    'agoda.com',
    'tripadvisor.jp',
    'tripadvisor.com',
    'ikyu.com',
    'navitime.co.jp',
    'hotpepper.jp',
    'gnavi.co.jp',
    'retty.me',
    'ozmall.co.jp',
    'asoview.com',
    'reserva.be',
    'airreserve.net',
  ];
  return !excludedHosts.some(function (host) {
    return isDomainOrSubdomain_(domain, host);
  });
}

function isKnownLeadListingDirectoryDomain_(domainOrUrl) {
  return isKnownNonAdvertiserLeadUrl_(domainOrUrl);
}

function isSourcePageCandidateText_(text) {
  const normalized = cleanSourcePageText_(text);
  if (!normalized || normalized.length < 2 || normalized.length > 120) return false;
  return !isGenericSourcePageText_(normalized);
}

function isGenericSourcePageText_(text) {
  return /^(詳細|詳しく見る|もっと見る|公式サイト|公式HP|ホームページ|予約|空室確認|プラン|アクセス|地図|一覧|施設一覧|TOP|HOME|MORE|VIEW|OPEN)$/i.test(String(text || '').trim());
}

function cleanSourcePageText_(value) {
  return decodeHtmlEntitiesBasic_(stripHtmlTags_(value))
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—|｜:：]+|[\s\-–—|｜:：]+$/g, '')
    .trim();
}

function stripHtmlTags_(value) {
  return String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
}

function decodeHtmlEntitiesBasic_(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, function (_match, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#(\d+);/g, function (_match, number) {
      return String.fromCharCode(parseInt(number, 10));
    });
}

function sourcePageLeadSourceId_(jobId, index, facilityName, officialUrl) {
  return [
    'source_page',
    jobId || 'manual',
    String(index + 1),
    normalizeDomain_(officialUrl),
    normalizeCompanyName_(facilityName).slice(0, 40),
  ].filter(Boolean).join(':').slice(0, 180);
}

function buildLeadSearchQuery_(lead, jobType) {
  const base = [lead.company_name, lead.facility_name, lead.address, lead.genre].filter(Boolean).join(' ');
  if (jobType === 'lead_form_url') {
    return [base, '問い合わせ OR お問い合わせ OR contact'].filter(Boolean).join(' ');
  }
  return [base, '公式サイト'].filter(Boolean).join(' ');
}

function isTourismAssociationListingSearchResult_(result) {
  const source = result && typeof result === 'object' ? result : {};
  const url = String(source.link || source.url || '').trim();
  if (!url) return false;
  if (isKnownNonAdvertiserLeadUrl_(url)) return true;

  let path = '';
  try {
    path = new URL(normalizeUrl_(url)).pathname.toLowerCase();
  } catch (error) {
    path = url.toLowerCase();
  }
  const text = [source.title, source.snippet].join(' ');
  const associationText = /(?:観光協会|公式観光(?:ガイド|情報)|観光情報(?:サイト|ポータル)|tourism association|official tourism guide)/i.test(text);
  const listingPath = /\/(?:attractions?|sightseeing|spots?|places?|articles?|archives?|guides?|guideposts?|features?|information|detail(?:[_/-]|$))(?:\/|$)/i.test(path);
  return associationText && listingPath;
}

function selectLeadSearchResult_(results, jobType, context) {
  const organic = Array.isArray(results) ? results : [];
  const excludedHosts = ['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'map.yahoo.co.jp', 'google.com', 'nap-camp.com'];
  const excludedDomains = getLeadCollectionExcludedDomainRecords_();
  const contactPattern = /(contact|inquiry|お問い合わせ|問い合わせ|お問合せ|toiawase|otoiawase)/i;
  const source = context && typeof context === 'object' ? context : {};
  const expectedName = normalizeCompanyName_(source.company_name || source.facility_name || '');
  const candidates = organic.filter(function (result) {
    const domain = normalizeDomain_(result.link || '');
    return domain && !isTourismAssociationListingSearchResult_(result) &&
      !isLeadCollectionExcludedUrl_(result.link || domain, excludedDomains) &&
      !excludedHosts.some(function (host) { return isDomainOrSubdomain_(domain, host); });
  }).map(function (result, index) {
    const searchableText = [result.title, result.snippet, result.link].join(' ');
    const normalizedText = normalizeCompanyName_(searchableText);
    let score = 100 - index;
    if (expectedName && normalizedText.indexOf(expectedName) !== -1) score += 140;
    if (/公式|official/i.test(searchableText)) score += 25;
    if (jobType === 'lead_form_url' && contactPattern.test(searchableText)) score += 180;
    if (/\/(?:spot|point|article|campsite|places?)\//i.test(String(result.link || ''))) score -= 20;
    return { result: result, score: score };
  }).sort(function (left, right) {
    return right.score - left.score;
  });

  if (jobType === 'lead_form_url') {
    const contact = candidates.find(function (candidate) {
      const result = candidate.result;
      return contactPattern.test(String(result.link || '') + ' ' + String(result.title || '') + ' ' + String(result.snippet || ''));
    });
    if (contact) return { url: contact.result.link, confidence: 0.9, source: contact.result };
  }

  const first = candidates[0] && candidates[0].result;
  return first ? { url: first.link, confidence: 0.7, source: first } : { url: '', confidence: 0, source: null };
}

function updateLeadFromSearchResult_(lead, result, jobType) {
  const leadId = requireId_(lead && lead.id);
  const searchResult = result && typeof result === 'object' ? result : {};
  return withScriptLock_('updateLeadFromSearchResult', function () {
    const current = getLeadById(leadId);
    const patch = {};
    let candidateWebsite = String(searchResult.website_url || (jobType !== 'lead_form_url' ? searchResult.url : '') || '').trim();
    let candidateForm = String(
      searchResult.form_url ||
      (jobType === 'lead_form_url' && searchResult.contact_verified !== true ? searchResult.url || searchResult.website_url : '') ||
      ''
    ).trim();
    const candidateEmail = String(searchResult.email || '').trim().toLowerCase();
    if (candidateWebsite && isLeadCollectionExcludedUrl_(candidateWebsite)) candidateWebsite = '';
    if (candidateForm && isLeadCollectionExcludedUrl_(candidateForm)) candidateForm = '';

    if (candidateWebsite && !String(current.website_url || '').trim()) patch.website_url = candidateWebsite;
    if (candidateEmail && isValidEmailAddress_(candidateEmail) && !isValidEmailAddress_(current.email)) patch.email = candidateEmail;
    if (candidateForm && !String(current.form_url || '').trim()) {
      patch.form_url = candidateForm;
      if (String(current.status || '') === '未対応') patch.status = 'フォーム対応中';
    }

    if (!Object.keys(patch).length) {
      return { updated: false, lead: current };
    }
    return {
      updated: true,
      lead: updateLeadLocked_(leadId, patch),
    };
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function domainCacheLookupFields_() {
  return [
    'id',
    'cache_key',
    'domain',
    'website_url',
    'form_url',
    'confidence',
    'source_json',
    'expires_at',
    'created_at',
    'updated_at',
  ];
}

function readDomainCache_(cacheKey) {
  const records = findSheetRecordsByExactFieldValues_('domain_cache', 'cache_key', [cacheKey], domainCacheLookupFields_());
  const now = new Date().getTime();
  const record = records.filter(function (item) {
    if (item.cache_key !== cacheKey) return false;
    if (!item.expires_at) return true;
    const expiresAt = new Date(item.expires_at).getTime();
    return !Number.isFinite(expiresAt) || expiresAt > now;
  }).sort(function (left, right) {
    return String(right.updated_at || right.created_at || '').localeCompare(String(left.updated_at || left.created_at || ''));
  })[0] || null;

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
  return withScriptLock_('writeDomainCache', function () {
    const existing = findSheetRecordsByExactFieldValues_(
      'domain_cache',
      'cache_key',
      [cacheKey],
      ['id', 'cache_key', 'created_at', 'updated_at']
    ).sort(function (left, right) {
      return String(right.updated_at || right.created_at || '').localeCompare(String(left.updated_at || left.created_at || ''));
    })[0] || null;

    if (existing) {
      return updateSheetRecord_('domain_cache', existing.id, record);
    }

    return appendSheetRecord_('domain_cache', record);
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function buildDomainCacheKey_(lead, jobType) {
  return [jobType, normalizeCompanyName_(lead.company_name), normalizeDomain_(lead.website_url || lead.form_url || lead.email_domain), String(lead.address || '').trim()].join('|');
}

function callSerperSearch_(query, options) {
  const input = options && typeof options === 'object' ? options : {};
  const serperKey = getSerperApiKey_();
  let searxngConfig = {};
  let searxngError = null;
  try {
    searxngConfig = readSearxngConfig_();
  } catch (error) {
    searxngError = createSearchProviderError_(
      'PC検索の設定を読み込めません: ' + String(error.message || error),
      'SEARXNG_CONFIG_INVALID',
      false
    );
  }
  const searxngReady = searxngConfig.enabled && searxngConfig.baseUrl && searxngConfig.accessToken;
  const skipSerper = isSerperSearchTemporarilyUnavailable_();
  let serperError = null;
  let searxngResult = null;

  if (searxngReady) {
    try {
      searxngResult = callSearxngSearch_(query, input);
      if ((searxngResult.organic || []).length > 0 || !serperKey || input.useSerperFallback === false) {
        return searxngResult;
      }
      if (skipSerper) {
        searxngResult.fallbackError = 'Serper予備は一時停止中です。';
        return searxngResult;
      }
    } catch (error) {
      searxngError = error;
    }
  }

  if (serperKey && !skipSerper) {
    try {
      const result = callSerperSearchDirect_(query, input);
      clearSerperSearchUnavailable_();
      if (searxngResult && (searxngResult.organic || []).length === 0) {
        result.fallbackFrom = 'searxng_empty';
      }
      return result;
    } catch (error) {
      serperError = error;
      if (isSearchProviderErrorRetryable_(error)) {
        markSerperSearchUnavailable_(error.message || String(error));
      }
    }
  }

  if (searxngResult) {
    searxngResult.fallbackError = serperError ? String(serperError.message || serperError) : (skipSerper ? 'Serper予備は一時停止中です。' : '');
    return searxngResult;
  }

  if (searxngError) {
    const messages = ['PC検索: ' + (searxngError.message || String(searxngError))];
    if (serperError) messages.push('Serper予備: ' + (serperError.message || String(serperError)));
    if (serperKey && skipSerper) messages.push('Serper予備: 一時停止中');
    throw createSearchProviderError_(
      '検索プロバイダーを利用できません。' + messages.join(' / '),
      'SEARCH_PROVIDERS_UNAVAILABLE',
      isSearchProviderErrorRetryable_(searxngError) || isSearchProviderErrorRetryable_(serperError) || Boolean(serperKey && skipSerper)
    );
  }
  if (serperError) throw serperError;
  if (!searxngReady && !serperKey) {
    throw createSearchProviderError_('PC検索またはSerper予備キーを設定してください。', 'SEARCH_PROVIDER_NOT_CONFIGURED', false);
  }
  throw createSearchProviderError_('検索プロバイダーを一時的に利用できません。', 'SEARCH_PROVIDERS_UNAVAILABLE', true);
}

function createSearchProviderError_(message, code, retryable) {
  const error = new Error(String(message || '検索プロバイダーでエラーが発生しました。'));
  error.code = String(code || 'SEARCH_PROVIDER_ERROR');
  error.retryable = retryable === true;
  return error;
}

function isSearchProviderErrorRetryable_(error) {
  if (!error) return false;
  if (typeof error.retryable === 'boolean') return error.retryable;
  const message = String(error.message || error || '');
  return /timed? out|timeout|一時的|接続でき|try again|quota exceeded|HTTP\s+(?:408|425|429|5\d\d)\b/i.test(message);
}

function isSearchProviderRetryableHttpStatus_(statusCode) {
  const code = Number(statusCode) || 0;
  return code === 408 || code === 425 || code === 429 || code >= 500;
}

function hasSearchProviderConfigured_() {
  if (getSerperApiKey_()) return true;
  try {
    const config = readSearxngConfig_();
    return Boolean(config.enabled && config.baseUrl && config.accessToken);
  } catch (error) {
    return false;
  }
}

function isSerperSearchTemporarilyUnavailable_() {
  try {
    return Boolean(CacheService.getScriptCache().get(SERPER_SEARCH_FAILURE_CACHE_KEY));
  } catch (error) {
    return false;
  }
}

function markSerperSearchUnavailable_(message) {
  try {
    CacheService.getScriptCache().put(
      SERPER_SEARCH_FAILURE_CACHE_KEY,
      String(message || 'unavailable').slice(0, 500),
      SERPER_SEARCH_FAILURE_CACHE_SECONDS
    );
  } catch (error) {
    // Cache failure must not block the fallback search.
  }
}

function clearSerperSearchUnavailable_() {
  try {
    CacheService.getScriptCache().remove(SERPER_SEARCH_FAILURE_CACHE_KEY);
  } catch (error) {
    // Cache cleanup is best effort.
  }
}

function callSerperSearchDirect_(query, options) {
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

  const creditInfo = extractSerperCreditInfo_(data, response.getAllHeaders ? response.getAllHeaders() : {}, {
    allowAccountBalance: false,
  });

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

  if (creditInfo.remainingLabel) {
    recordSerperActiveKeyCreditResult_(creditInfo);
  } else {
    maybeRefreshActiveSerperCredit_();
  }

  if (code < 200 || code >= 300) {
    throw createSearchProviderError_(
      'Serper request failed: HTTP ' + code + ' ' + String(data.message || text),
      'SERPER_HTTP_' + code,
      isSearchProviderRetryableHttpStatus_(code)
    );
  }

  return {
    organic: Array.isArray(data.organic) ? data.organic : [],
    raw: data,
    provider: 'serper',
  };
}

function callSearxngSearch_(query, options) {
  const input = options && typeof options === 'object' ? options : {};
  const config = readSearxngConfig_();
  const normalizedQuery = String(query || '').trim();
  const maxResults = Math.min(Math.max(Number(input.num) || 5, 1), 20);

  if (!config.enabled || !config.baseUrl || !config.accessToken) {
    throw new Error('PC検索が未設定または無効です。');
  }
  if (!normalizedQuery) throw new Error('検索キーワードが空です。');

  const endpoint = config.baseUrl + '/search' +
    '?q=' + encodeURIComponent(normalizedQuery) +
    '&format=json' +
    '&categories=general' +
    '&language=' + encodeURIComponent(SEARXNG_DEFAULT_LANGUAGE) +
    '&safesearch=0';
  let response;
  try {
    response = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      headers: {
        Accept: 'application/json',
        [SEARXNG_ACCESS_TOKEN_HEADER]: config.accessToken,
      },
      followRedirects: true,
      muteHttpExceptions: true,
    });
  } catch (error) {
    const message = error.message || String(error);
    recordSearxngStatus_(false, 0, message);
    logSerperUsage_({
      credits: 0,
      jobId: input.jobId || null,
      leadId: input.leadId || '',
      purpose: input.purpose || 'unknown',
      query: normalizedQuery,
      resultCount: 0,
      source: 'searxng:' + String(input.source || ''),
      status: 'error',
      errorMessage: message,
    });
    throw createSearchProviderError_(
      'PC検索へ接続できません。PC側の検索サービスを確認してください。',
      'SEARXNG_CONNECTION_FAILED',
      true
    );
  }

  const code = response.getResponseCode();
  const text = response.getContentText();
  let data = {};
  try {
    data = JSON.parse(text || '{}');
  } catch (error) {
    data = { raw: text };
  }

  if (code < 200 || code >= 300) {
    const errorMessage = String(data.error || data.message || ('HTTP ' + code));
    recordSearxngStatus_(false, 0, errorMessage);
    logSerperUsage_({
      credits: 0,
      jobId: input.jobId || null,
      leadId: input.leadId || '',
      purpose: input.purpose || 'unknown',
      query: normalizedQuery,
      resultCount: 0,
      source: 'searxng:' + String(input.source || ''),
      status: 'error',
      errorMessage: errorMessage,
    });
    throw createSearchProviderError_(
      'PC検索がエラーを返しました: HTTP ' + code + ' ' + errorMessage,
      'SEARXNG_HTTP_' + code,
      isSearchProviderRetryableHttpStatus_(code)
    );
  }

  const rawResults = Array.isArray(data.results) ? data.results : [];
  const organic = rawResults
    .filter(function (item) {
      return item && item.url && item.title;
    })
    .map(function (item, index) {
      return {
        title: String(item.title || ''),
        link: String(item.url || ''),
        snippet: String(item.content || ''),
        position: index + 1,
        source: 'searxng',
      };
    })
    .slice(0, maxResults);

  recordSearxngStatus_(true, organic.length, '');
  logSerperUsage_({
    credits: 0,
    jobId: input.jobId || null,
    leadId: input.leadId || '',
    purpose: input.purpose || 'unknown',
    query: normalizedQuery,
    resultCount: organic.length,
    source: 'searxng:' + String(input.source || ''),
    status: 'success',
    errorMessage: '',
  });

  return {
    organic: organic,
    raw: data,
    provider: 'searxng',
  };
}

function normalizeSearxngBaseUrl_(value) {
  let normalized = String(value || '').trim().replace(/\/+$/, '');
  normalized = normalized.replace(/\/search$/i, '');
  if (!normalized) return '';
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[^?#\s]*)?$/i.test(normalized)) {
    throw new Error('PC検索の公開URLはhttps://で始まるURLを入力してください。');
  }
  return normalized;
}

function readSearxngConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const baseUrl = normalizeSearxngBaseUrl_(properties.getProperty(PROPERTY_KEYS.SEARXNG_BASE_URL) || '');
  const accessToken = String(properties.getProperty(PROPERTY_KEYS.SEARXNG_ACCESS_TOKEN) || '').trim();
  const enabledValue = String(properties.getProperty(PROPERTY_KEYS.SEARXNG_ENABLED) || '').trim().toLowerCase();
  return {
    baseUrl: baseUrl,
    accessToken: accessToken,
    enabled: enabledValue !== 'false' && Boolean(baseUrl && accessToken),
  };
}

function getSearxngConfigInfo_() {
  const config = readSearxngConfig_();
  const properties = PropertiesService.getScriptProperties();
  let status = {};
  try {
    status = JSON.parse(String(properties.getProperty(PROPERTY_KEYS.SEARXNG_STATUS_JSON) || '{}')) || {};
  } catch (error) {
    status = {};
  }
  return {
    configured: Boolean(config.baseUrl && config.accessToken),
    enabled: config.enabled,
    baseUrl: config.baseUrl,
    tokenMask: config.accessToken ? maskSecret_(config.accessToken) : '',
    lastStatus: String(status.lastStatus || '未確認'),
    lastCheckedAt: String(status.lastCheckedAt || ''),
    lastError: String(status.lastError || ''),
    lastResultCount: status.lastResultCount === '' || status.lastResultCount === undefined ? '' : Number(status.lastResultCount),
  };
}

function recordSearxngStatus_(ok, resultCount, errorMessage) {
  PropertiesService.getScriptProperties().setProperty(PROPERTY_KEYS.SEARXNG_STATUS_JSON, JSON.stringify({
    lastStatus: ok ? '稼働中' : '接続失敗',
    lastCheckedAt: nowIso_(),
    lastError: String(errorMessage || ''),
    lastResultCount: Number(resultCount) || 0,
  }));
  clearReferenceDataCache_();
}

function fetchSerperCreditInfo_(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) {
    return {
      ok: false,
      errorMessage: 'Serper APIキーが空です。',
      remainingLabel: '',
      remainingZero: false,
    };
  }

  const errors = [];
  for (let index = 0; index < SERPER_CREDIT_ENDPOINTS.length; index += 1) {
    const endpoint = SERPER_CREDIT_ENDPOINTS[index];
    try {
      const response = UrlFetchApp.fetch(endpoint, {
        method: 'get',
        headers: {
          'X-API-KEY': key,
          Accept: 'application/json',
        },
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
      const creditInfo = extractSerperCreditInfo_(data, response.getAllHeaders ? response.getAllHeaders() : {}, {
        allowAccountBalance: true,
      });
      if (code >= 200 && code < 300 && creditInfo.remainingLabel) {
        return Object.assign({}, creditInfo, {
          ok: true,
          endpoint: endpoint,
          errorMessage: '',
        });
      }
      const message = String(data.message || data.error || text || '残量項目なし').slice(0, 180);
      errors.push(endpoint.replace('https://google.serper.dev', '') + ': HTTP ' + code + ' ' + message);
    } catch (error) {
      errors.push(endpoint.replace('https://google.serper.dev', '') + ': ' + (error.message || String(error)));
    }
  }

  return {
    ok: false,
    errorMessage: 'Serper残量APIから残量を取得できませんでした。' + errors.join(' / '),
    remainingLabel: '',
    remainingZero: false,
  };
}

function extractSerperCreditInfo_(payload, headers, options) {
  const config = options && typeof options === 'object' ? options : {};
  const headerRemaining = readNumericHeader_(headers, [
    'x-credits-left',
    'x-credit-left',
    'x-credits-remaining',
    'x-credit-remaining',
    'credits-remaining',
  ]);
  const remainingKeys = [
    'remainingCredits',
    'creditsRemaining',
    'remaining_credits',
    'credits_remaining',
  ];
  if (config.allowAccountBalance === true) {
    remainingKeys.push('creditBalance', 'credit_balance', 'balance');
  }
  const remaining = headerRemaining !== '' ? headerRemaining : findSerperCreditValue_(payload, remainingKeys, 0);
  const total = readNumericHeader_(headers, [
    'x-credits-total',
    'x-credit-limit',
    'x-credits-limit',
  ]) || findSerperCreditValue_(payload, [
    'totalCredits',
    'creditsTotal',
    'total_credits',
    'credits_total',
    'creditLimit',
    'credit_limit',
    'purchasedCredits',
    'purchased_credits',
    'initialCredits',
    'initial_credits',
  ], 0);
  const used = findSerperCreditValue_(payload, [
    'usedCredits',
    'creditsUsed',
    'used_credits',
    'credits_used',
    'consumedCredits',
    'consumed_credits',
  ], 0);
  const percent = readNumericHeader_(headers, [
    'x-credits-remaining-percent',
    'x-credit-remaining-percent',
  ]) || findSerperCreditValue_(payload, [
    'remainingPercent',
    'remainingPercentage',
    'creditRemainingPercent',
    'credit_remaining_percent',
  ], 0);
  return buildSerperCreditInfo_(remaining, total, used, percent);
}

function readNumericHeader_(headers, names) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const normalized = {};
  Object.keys(source).forEach(function (key) {
    normalized[String(key).toLowerCase()] = source[key];
  });
  for (let index = 0; index < names.length; index += 1) {
    const value = normalized[String(names[index]).toLowerCase()];
    if (value === undefined || value === null || value === '') continue;
    const numeric = normalizeSerperCreditNumber_(value);
    if (numeric !== '') return numeric;
  }
  return '';
}

function findSerperCreditValue_(value, keys, depth) {
  if (depth > 4 || value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'string') {
    return '';
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = findSerperCreditValue_(value[index], keys, depth + 1);
      if (nested !== '') return nested;
    }
    return '';
  }
  if (typeof value !== 'object') return '';

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const numeric = normalizeSerperCreditNumber_(value[key]);
    if (numeric !== '') return numeric;
  }

  const objectKeys = Object.keys(value);
  for (let index = 0; index < objectKeys.length; index += 1) {
    const nested = findSerperCreditValue_(value[objectKeys[index]], keys, depth + 1);
    if (nested !== '') return nested;
  }
  return '';
}

function normalizeSerperCreditNumber_(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value || '').replace(/,/g, '').trim();
  if (!text) return '';
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return '';
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : '';
}

function buildSerperCreditInfo_(remaining, total, used, percent) {
  const number = normalizeSerperCreditNumber_(remaining);
  let totalNumber = normalizeSerperCreditNumber_(total);
  const usedNumber = normalizeSerperCreditNumber_(used);
  if (totalNumber === '' && number !== '' && usedNumber !== '') {
    totalNumber = Math.max(number + usedNumber, number);
  }
  let percentNumber = normalizeSerperCreditPercent_(percent);
  if (percentNumber === '' && number !== '' && totalNumber !== '' && totalNumber > 0) {
    percentNumber = Math.max(0, Math.min(100, (number / totalNumber) * 100));
  }
  return {
    remainingLabel: number === '' ? '' : formatSerperCreditNumber_(number) + ' credits',
    remainingZero: number !== '' && number <= 0,
    remainingValue: number,
    totalValue: totalNumber,
    remainingPercent: percentNumber,
    lowCredit: percentNumber !== '' && percentNumber < SERPER_LOW_CREDIT_THRESHOLD_PERCENT,
  };
}

function normalizeSerperCreditPercent_(value) {
  const number = normalizeSerperCreditNumber_(value);
  if (number === '') return '';
  return Math.max(0, Math.min(100, number));
}

function formatSerperCreditNumber_(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value || '');
  return number.toLocaleString ? number.toLocaleString('en-US') : String(number);
}

function getSerperUsageCount_(range, records) {
  const usageRecords = Array.isArray(records)
    ? records
    : readSheetRecordFields_(
      'search_usage_logs',
      ['created_at', 'lead_id', 'credits', 'request_count'],
      { maxGapColumns: 0 }
    );
  return usageRecords.reduce(function (sum, record) {
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
    credits: entry.credits === 0 ? 0 : (entry.credits || 1),
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
  const records = harmonizeSerperCreditRecords_(readSerperApiKeyRecords_());
  const legacyKey = String(PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SERPER_API_KEY) || '').trim();
  const selected = selectPrimarySerperApiKeyRecord_(records);
  const configured = Boolean(selected && selected.key) || Boolean(legacyKey);
  const today = todayText_();
  const month = monthText_();
  const usageRecords = readSheetRecordFields_(
    'search_usage_logs',
    ['created_at', 'credits', 'request_count'],
    { maxGapColumns: 0 }
  );
  const todayUsed = getSerperUsageCount_({ day: today }, usageRecords);
  const monthUsed = getSerperUsageCount_({ month: month }, usageRecords);
  const creditStatus = buildSerperCreditStatusFromRecord_(selected);
  const actualRemaining = creditStatus.remainingLabel;
  const searxng = getSearxngConfigInfo_();
  const searchConfigured = configured || (searxng.configured && searxng.enabled);
  const sanitized = records.map(sanitizeSerperApiKeyRecord_);
  if (!sanitized.length && legacyKey) {
    sanitized.push({
      active: true,
      id: 'legacy-main',
      key_mask: maskSecret_(legacyKey),
      last_checked_at: '',
      last_error: '',
      last_remaining: '',
      last_remaining_percent: '',
      last_remaining_value: '',
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
    searchConfigured: searchConfigured,
    searxng: searxng,
    credit: {
      detail: configured
        ? (actualRemaining
          ? 'Serper残量 ' + actualRemaining + (creditStatus.percentKnown ? ' / ' + Math.round(creditStatus.remainingPercent * 10) / 10 + '%（20%未満で警告）' : ' / 残量率の基準を確認中')
          : '利用回数の上限なし / Serper残量の確認待ち')
        : 'Serper APIキーをPropertiesServiceへ保存してください。',
      label: configured ? (creditStatus.lowCredit ? 'Serper残量20%未満' : 'Serper利用可能') : 'Serper未設定',
      ready: configured,
      tone: configured ? (creditStatus.lowCredit ? 'warn' : 'ok') : 'warn',
    },
    key_mask: configured ? maskSecret_(selected && selected.key ? selected.key : legacyKey) : '',
    keys: sanitized,
    limits: {
      unlimited: true,
      alertThresholdPercent: SERPER_LOW_CREDIT_THRESHOLD_PERCENT,
      todayUsed: todayUsed,
      monthUsed: monthUsed,
      actualRemaining: actualRemaining,
      remainingValue: creditStatus.remainingValue,
      totalValue: creditStatus.totalValue,
      remainingPercent: creditStatus.remainingPercent,
      percentKnown: creditStatus.percentKnown,
      lowCredit: creditStatus.lowCredit,
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
    last_remaining_percent: record.last_remaining_percent === '' || record.last_remaining_percent === undefined ? '' : Number(record.last_remaining_percent),
    last_remaining_value: record.last_remaining_value === '' || record.last_remaining_value === undefined ? '' : Number(record.last_remaining_value),
    credit_total: record.credit_total === '' || record.credit_total === undefined ? '' : Number(record.credit_total),
    credit_total_source: record.credit_total_source || '',
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
          last_remaining_percent: record.last_remaining_percent === '' || record.last_remaining_percent === undefined ? '' : Number(record.last_remaining_percent),
          last_remaining_value: record.last_remaining_value === '' || record.last_remaining_value === undefined ? '' : Number(record.last_remaining_value),
          credit_total: record.credit_total === '' || record.credit_total === undefined ? '' : Number(record.credit_total),
          credit_total_source: String(record.credit_total_source || ''),
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
  clearReferenceDataCache_();
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
  return withScriptLock_('recordSerperActiveKeyTestResult', function () {
    const records = readSerperApiKeyRecords_();
    const selected = selectPrimarySerperApiKeyRecord_(records);
    if (!selected) return null;
    const now = nowIso_();
    const nextRecords = records.map(function (record) {
      if (record.id !== selected.id) return record;
      const creditStatus = buildSerperCreditStatusFromRecord_(record);
      return Object.assign({}, record, {
        last_checked_at: record.last_checked_at || '',
        last_error: ok ? (record.last_error || '') : errorMessage,
        last_remaining: record.last_remaining || '',
        last_search_error: ok ? '' : errorMessage,
        last_search_result_count: Number(resultCount || 0),
        last_search_status: ok ? '成功' : '失敗',
        last_search_test_at: now,
        last_status: ok ? (creditStatus.remainingZero ? '残量なし' : creditStatus.lowCredit ? '残量20%未満' : '利用可能') : 'エラー',
        updated_at: now,
      });
    });
    writeSerperApiKeyRecords_(nextRecords);
    return selected.id;
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function recordSerperActiveKeyCreditResult_(creditInfo) {
  return withScriptLock_('recordSerperActiveKeyCreditResult', function () {
    const records = readSerperApiKeyRecords_();
    const selected = selectPrimarySerperApiKeyRecord_(records);
    if (!selected) return null;
    const now = nowIso_();
    const nextRecords = records.map(function (record) {
      if (record.id !== selected.id) return record;
      return mergeSerperCreditRecord_(record, creditInfo, now);
    });
    writeSerperApiKeyRecords_(harmonizeSerperCreditRecords_(nextRecords));
    return selected.id;
  }, { waitMs: 6000, attempts: 5, retryDelayMs: 400 });
}

function mergeSerperCreditRecord_(record, creditInfo, checkedAt) {
  const current = record && typeof record === 'object' ? record : {};
  const result = creditInfo && typeof creditInfo === 'object' ? creditInfo : {};
  const remainingValue = normalizeSerperCreditNumber_(result.remainingValue !== undefined ? result.remainingValue : result.remainingLabel);
  const existingTotal = normalizeSerperCreditNumber_(current.credit_total);
  const apiTotal = normalizeSerperCreditNumber_(result.totalValue);
  let totalValue = apiTotal !== '' ? apiTotal : existingTotal;
  let totalSource = apiTotal !== '' ? 'api' : String(current.credit_total_source || '');
  if (remainingValue !== '' && (totalValue === '' || remainingValue > totalValue)) {
    totalValue = remainingValue;
    totalSource = 'observed_max';
  }
  let remainingPercent = normalizeSerperCreditPercent_(result.remainingPercent);
  if (remainingPercent === '' && remainingValue !== '' && totalValue !== '' && totalValue > 0) {
    remainingPercent = Math.max(0, Math.min(100, (remainingValue / totalValue) * 100));
  }
  const remainingZero = remainingValue !== '' && remainingValue <= 0;
  const lowCredit = remainingPercent !== '' && remainingPercent < SERPER_LOW_CREDIT_THRESHOLD_PERCENT;
  return Object.assign({}, current, {
    credit_total: totalValue,
    credit_total_source: totalSource,
    last_checked_at: checkedAt || nowIso_(),
    last_error: '',
    last_remaining: result.remainingLabel || (remainingValue === '' ? current.last_remaining || '' : formatSerperCreditNumber_(remainingValue) + ' credits'),
    last_remaining_percent: remainingPercent,
    last_remaining_value: remainingValue,
    last_status: remainingZero ? '残量なし' : lowCredit ? '残量20%未満' : '利用可能',
    updated_at: checkedAt || nowIso_(),
  });
}

function harmonizeSerperCreditRecords_(records) {
  const sourceRecords = Array.isArray(records) ? records : [];
  const groups = Object.create(null);
  sourceRecords.forEach(function (record) {
    const key = String(record && record.key || '').trim();
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  });

  const canonicalByKey = Object.create(null);
  Object.keys(groups).forEach(function (key) {
    const group = groups[key];
    if (group.length < 2) return;
    const newest = group
      .filter(function (record) {
        return normalizeSerperCreditNumber_(record.last_remaining_value !== undefined && record.last_remaining_value !== ''
          ? record.last_remaining_value
          : record.last_remaining) !== '';
      })
      .sort(function (left, right) {
        return String(right.last_checked_at || right.updated_at || '').localeCompare(String(left.last_checked_at || left.updated_at || ''));
      })[0];
    if (!newest) return;

    const remainingValue = normalizeSerperCreditNumber_(newest.last_remaining_value !== undefined && newest.last_remaining_value !== ''
      ? newest.last_remaining_value
      : newest.last_remaining);
    const apiTotalRecord = group
      .filter(function (record) {
        return record.credit_total_source === 'api' && normalizeSerperCreditNumber_(record.credit_total) !== '';
      })
      .sort(function (left, right) {
        return String(right.last_checked_at || right.updated_at || '').localeCompare(String(left.last_checked_at || left.updated_at || ''));
      })[0];
    const observedTotals = group
      .map(function (record) { return normalizeSerperCreditNumber_(record.credit_total); })
      .filter(function (value) { return value !== ''; });
    let totalValue = apiTotalRecord ? normalizeSerperCreditNumber_(apiTotalRecord.credit_total) : '';
    let totalSource = apiTotalRecord ? 'api' : '';
    if (totalValue === '' && observedTotals.length) {
      totalValue = Math.max.apply(null, observedTotals);
      totalSource = 'observed_max';
    }
    if (remainingValue !== '' && (totalValue === '' || remainingValue > totalValue)) {
      totalValue = remainingValue;
      totalSource = 'observed_max';
    }
    const remainingPercent = remainingValue !== '' && totalValue !== '' && totalValue > 0
      ? Math.max(0, Math.min(100, (remainingValue / totalValue) * 100))
      : normalizeSerperCreditPercent_(newest.last_remaining_percent);
    const remainingZero = remainingValue !== '' && remainingValue <= 0;
    const lowCredit = remainingPercent !== '' && remainingPercent < SERPER_LOW_CREDIT_THRESHOLD_PERCENT;
    canonicalByKey[key] = {
      credit_total: totalValue,
      credit_total_source: totalSource,
      last_checked_at: newest.last_checked_at || '',
      last_error: newest.last_error || '',
      last_remaining: newest.last_remaining || (remainingValue === '' ? '' : formatSerperCreditNumber_(remainingValue) + ' credits'),
      last_remaining_percent: remainingPercent,
      last_remaining_value: remainingValue,
      last_status: remainingZero ? '残量なし' : lowCredit ? '残量20%未満' : '利用可能',
    };
  });

  return sourceRecords.map(function (record) {
    const canonical = canonicalByKey[String(record && record.key || '').trim()];
    return canonical ? Object.assign({}, record, canonical) : record;
  });
}

function buildSerperCreditStatusFromRecord_(record) {
  const source = record && typeof record === 'object' ? record : {};
  const remainingValue = normalizeSerperCreditNumber_(source.last_remaining_value !== undefined && source.last_remaining_value !== '' ? source.last_remaining_value : source.last_remaining);
  const totalValue = normalizeSerperCreditNumber_(source.credit_total);
  let remainingPercent = normalizeSerperCreditPercent_(source.last_remaining_percent);
  if (remainingPercent === '' && remainingValue !== '' && totalValue !== '' && totalValue > 0) {
    remainingPercent = Math.max(0, Math.min(100, (remainingValue / totalValue) * 100));
  }
  return {
    remainingLabel: String(source.last_remaining || (remainingValue === '' ? '' : formatSerperCreditNumber_(remainingValue) + ' credits')).trim(),
    remainingValue: remainingValue,
    totalValue: totalValue,
    remainingPercent: remainingPercent,
    percentKnown: remainingPercent !== '',
    remainingZero: remainingValue !== '' && remainingValue <= 0,
    lowCredit: remainingPercent !== '' && remainingPercent < SERPER_LOW_CREDIT_THRESHOLD_PERCENT,
  };
}

function maybeRefreshActiveSerperCredit_() {
  const records = readSerperApiKeyRecords_();
  const selected = selectPrimarySerperApiKeyRecord_(records);
  if (!selected || !selected.key) return;
  const cache = CacheService.getScriptCache();
  const cacheKey = 'serper_credit_refresh_' + String(selected.id || 'main').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  try {
    if (cache.get(cacheKey)) return;
    cache.put(cacheKey, '1', SERPER_CREDIT_REFRESH_INTERVAL_SECONDS);
  } catch (error) {
    console.warn('Serper credit refresh throttle skipped: ' + error.message);
  }
  const result = fetchSerperCreditInfo_(selected.key);
  if (result.ok) recordSerperActiveKeyCreditResult_(result);
}

function appendSyncError_(operation, error, context) {
  logError_(operation, error, context || {});
}
