#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_REPO = process.env.SOURCE_REPO || '/Users/muramatsuyuuya/Documents/自動営業システム';
const SOURCE_ENV = process.env.SOURCE_ENV || path.join(SOURCE_REPO, '.env.local');
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec';
const CLASP_RC = process.env.CLASP_RC || path.join(process.env.HOME || '', '.clasprc.json');
const WRITE_CHUNK_SIZE = Number(process.env.WRITE_CHUNK_SIZE || 50);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    skipTemplates: args.includes('--skip-templates'),
    skipHistories: args.includes('--skip-histories'),
  };
}

function loadEnv(file) {
  const env = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function required(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function supabaseHeaders(env, extra = {}) {
  const key = required(env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

async function supabaseGet(env, table, params, options = {}) {
  const baseUrl = required(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  const url = new URL(`${baseUrl}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: supabaseHeaders(env, options.headers || {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Failed to parse Supabase response for ${table}: ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`Supabase ${table} request failed: ${response.status} ${JSON.stringify(data).slice(0, 500)}`);
  }
  return {
    data,
    count: parseContentRangeCount(response.headers.get('content-range')),
  };
}

function parseContentRangeCount(value) {
  if (!value) return null;
  const match = String(value).match(/\/(\d+|\*)$/);
  return match && match[1] !== '*' ? Number(match[1]) : null;
}

async function fetchAllSupabase(env, table, params, pageSize = 1000) {
  const rows = [];
  let total = null;
  for (let offset = 0; ; offset += pageSize) {
    const page = await supabaseGet(
      env,
      table,
      {
        ...params,
        limit: pageSize,
        offset,
      },
      { headers: { Prefer: 'count=exact' } }
    );
    if (total === null && Number.isFinite(page.count)) total = page.count;
    const data = Array.isArray(page.data) ? page.data : [];
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return { rows, total: total ?? rows.length };
}

async function getGoogleAccessToken() {
  const clasp = JSON.parse(fs.readFileSync(CLASP_RC, 'utf8'));
  const profile = clasp.tokens && (clasp.tokens.default || Object.values(clasp.tokens)[0]);
  if (!profile) throw new Error(`No clasp OAuth profile found in ${CLASP_RC}.`);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required(profile.client_id, 'clasp client_id'),
      client_secret: required(profile.client_secret, 'clasp client_secret'),
      refresh_token: required(profile.refresh_token, 'clasp refresh_token'),
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google token refresh failed: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data.access_token;
}

async function webAppPost(token, action, data = {}) {
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, data }),
    redirect: 'follow',
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Web app returned non-JSON for ${action}: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
  if (!response.ok || !parsed.ok) {
    throw new Error(`Web app ${action} failed: HTTP ${response.status} ${JSON.stringify(parsed).slice(0, 500)}`);
  }
  return parsed.result;
}

function normalizeTemplateType(value) {
  const text = String(value || 'initial').trim();
  if (['initial', 'followup_2m', 'form'].includes(text)) return text;
  if (/follow/i.test(text)) return 'followup_2m';
  if (/form|フォーム|inquiry/i.test(text)) return 'form';
  return 'initial';
}

function boolOrDefault(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (value === true || value === false) return value;
  const text = String(value).trim().toLowerCase();
  return !['false', '0', 'no', 'off', 'いいえ'].includes(text);
}

function mapTemplates(rows, genreById) {
  return rows.map((row) => ({
    id: String(row.id || '').trim(),
    genre: row.genre_id ? String(genreById.get(row.genre_id) || '').trim() : '',
    template_type: normalizeTemplateType(row.template_type),
    name: String(row.name || '').trim(),
    subject: String(row.subject || '').trim(),
    body: String(row.body || ''),
    is_production: boolOrDefault(row.is_production, false),
    production_enabled_at: row.production_enabled_at || '',
    last_test_sent_at: row.last_test_sent_at || '',
    version: Number(row.version || 1),
    active: boolOrDefault(row.active, true),
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  })).filter((row) => row.id && row.name && row.body);
}

function mapHistories(rows) {
  return rows.map((row) => ({
    id: String(row.id || '').trim(),
    lead_id: row.lead_id || '',
    sent_at: row.sent_at || row.created_at || '',
    send_type: row.send_type || '初回メール',
    to_email: row.to_email || '',
    company_name: row.company_name || '',
    facility_name: row.facility_name || '',
    genre: row.genre || '',
    template_id: row.template_id || '',
    template_name: row.template_name || '',
    subject: row.subject || '',
    body: row.body || '',
    send_result: row.send_result || '成功',
    error_message: row.error_message || '',
    gmail_message_id: row.gmail_message_id || '',
    gmail_thread_id: row.gmail_thread_id || '',
    sender_name: row.sender_name || '',
    created_at: row.created_at || row.sent_at || '',
  })).filter((row) => row.id);
}

function auditSettings(settings) {
  const keys = settings.map((row) => String(row.key || '').trim()).filter(Boolean).sort();
  const sensitivePattern = /secret|token|password|credential|api[_-]?key|client[_-]?secret/i;
  const operationalPattern = /send|mail|gmail|calendar|serper|reply|auto|window|limit|batch|collection|prospect|template/i;
  const transientPattern = /job|cache|cursor|lock|tmp|temporary|progress|background/i;
  const stableOperationalKeys = keys.filter((key) => (
    operationalPattern.test(key) &&
    !sensitivePattern.test(key) &&
    !transientPattern.test(key) &&
    key.indexOf(':') === -1
  ));
  return {
    totalKeys: keys.length,
    stableOperationalKeys: stableOperationalKeys.slice(0, 80),
    stableOperationalKeyCount: stableOperationalKeys.length,
    operationalLikeKeyCount: keys.filter((key) => operationalPattern.test(key)).length,
    sensitiveLikeKeyCount: keys.filter((key) => sensitivePattern.test(key)).length,
    transientLikeKeyCount: keys.filter((key) => transientPattern.test(key)).length,
  };
}

async function fetchSourceMailData() {
  const env = loadEnv(SOURCE_ENV);
  const [templates, histories, genres, appSettings] = await Promise.all([
    fetchAllSupabase(env, 'email_templates', {
      select: 'id,genre_id,template_type,name,subject,body,is_production,production_enabled_at,last_test_sent_at,version,active,created_at,updated_at',
      order: 'created_at.asc',
    }, 1000),
    fetchAllSupabase(env, 'send_histories', {
      select: 'id,lead_id,sent_at,send_type,to_email,company_name,facility_name,genre,template_id,template_name,subject,body,send_result,error_message,gmail_message_id,gmail_thread_id,sender_name,created_at',
      order: 'sent_at.asc',
    }, 1000),
    fetchAllSupabase(env, 'genres', { select: 'id,name' }, 1000),
    fetchAllSupabase(env, 'app_settings', { select: 'key', order: 'key.asc' }, 1000),
  ]);
  const genreById = new Map(genres.rows.map((genre) => [genre.id, genre.name]));
  return {
    templates: mapTemplates(templates.rows, genreById),
    histories: mapHistories(histories.rows),
    settingsAudit: auditSettings(appSettings.rows),
    sourceTotals: {
      templates: templates.total,
      histories: histories.total,
      appSettings: appSettings.total,
    },
  };
}

async function importInChunks(token, action, records, label, dryRun) {
  let completed = 0;
  const totals = { inserted: 0, updated: 0, existing: 0, skipped: 0, total: records.length };
  for (let start = 0; start < records.length; start += WRITE_CHUNK_SIZE) {
    const chunk = records.slice(start, start + WRITE_CHUNK_SIZE);
    const result = await webAppPost(token, action, {
      records: chunk,
      dryRun,
    });
    completed += chunk.length;
    totals.inserted += Number(result.inserted || 0);
    totals.updated += Number(result.updated || 0);
    totals.existing += Number(result.existing || 0);
    totals.skipped += Number(result.skipped || 0);
    console.log(`${dryRun ? 'planned' : 'imported'} ${label} ${completed}/${records.length}`);
  }
  return totals;
}

async function main() {
  const options = parseArgs();
  const source = await fetchSourceMailData();
  const token = await getGoogleAccessToken();
  const targetTemplates = await webAppPost(token, 'listEmailTemplates', { limit: 1000, includeInactive: true });
  const targetHistories = await webAppPost(token, 'listSheetRecords', {
    sheetName: 'send_histories',
    limit: 1,
    includeInactive: true,
  });

  console.log(JSON.stringify({
    source: SOURCE_ENV,
    sourceTotals: source.sourceTotals,
    mappedRows: {
      templates: source.templates.length,
      histories: source.histories.length,
    },
    targetExistingRows: {
      templates: targetTemplates.total,
      histories: targetHistories.total,
    },
    settingsAudit: source.settingsAudit,
    dryRun: options.dryRun,
  }, null, 2));

  const result = {
    ok: true,
    dryRun: options.dryRun,
    templates: { skippedByOption: options.skipTemplates },
    histories: { skippedByOption: options.skipHistories },
    settingsAudit: source.settingsAudit,
  };

  if (!options.skipTemplates) {
    result.templates = await importInChunks(token, 'importEmailTemplates', source.templates, 'templates', options.dryRun);
  }
  if (!options.skipHistories) {
    result.histories = await importInChunks(token, 'importSendHistories', source.histories, 'send histories', options.dryRun);
  }

  const afterTemplates = await webAppPost(token, 'listEmailTemplates', { limit: 1000, includeInactive: true });
  const afterHistories = await webAppPost(token, 'listSheetRecords', {
    sheetName: 'send_histories',
    limit: 1,
    includeInactive: true,
  });
  result.targetRows = {
    templates: afterTemplates.total,
    histories: afterHistories.total,
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
