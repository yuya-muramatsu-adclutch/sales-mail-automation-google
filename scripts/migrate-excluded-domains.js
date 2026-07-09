#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_REPO = process.env.SOURCE_REPO || '/Users/muramatsuyuuya/Documents/自動営業システム';
const SOURCE_ENV = process.env.SOURCE_ENV || path.join(SOURCE_REPO, '.env.local');
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec';
const CLASP_RC = process.env.CLASP_RC || path.join(process.env.HOME || '', '.clasprc.json');
const WRITE_CHUNK_SIZE = Number(process.env.WRITE_CHUNK_SIZE || 250);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    sourceJson: valueAfter(args, '--source-json') || '',
  };
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? '' : String(args[index + 1] || '').trim();
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

function normalizeDomain(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, '');
  } catch (error) {
    return text
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split('?')[0]
      .trim()
      .toLowerCase()
      .replace(/^www\./, '');
  }
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

async function fetchSourceExcludedDomains(options) {
  if (options.sourceJson) {
    const parsed = JSON.parse(fs.readFileSync(options.sourceJson, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed.excludedDomains || parsed.excluded_domains || [];
  }
  const env = loadEnv(SOURCE_ENV);
  const source = await fetchAllSupabase(env, 'excluded_domains', {
    select: 'id,domain,reason,active,created_at,updated_at',
    order: 'updated_at.desc',
  });
  return source.rows;
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

function normalizeSourceRecord(record) {
  const domain = normalizeDomain(record.domain);
  if (!domain) return null;
  return {
    domain,
    reason: String(record.reason || '旧アプリから引き継ぎ').trim() || '旧アプリから引き継ぎ',
    active: record.active === undefined ? true : Boolean(record.active),
  };
}

function uniqueByDomain(records) {
  const map = new Map();
  for (const record of records) {
    const normalized = normalizeSourceRecord(record);
    if (!normalized) continue;
    if (!map.has(normalized.domain) || normalized.active) map.set(normalized.domain, normalized);
  }
  return Array.from(map.values()).sort((left, right) => left.domain.localeCompare(right.domain));
}

async function main() {
  const options = parseArgs();
  const sourceRows = uniqueByDomain(await fetchSourceExcludedDomains(options));
  const token = await getGoogleAccessToken();
  const target = await webAppPost(token, 'listExcludedDomains', {
    limit: 1000,
    includeInactive: true,
  });
  const existingByDomain = new Map((target.items || []).map((item) => [normalizeDomain(item.domain), item]));
  const planned = sourceRows.map((row) => {
    const existing = existingByDomain.get(row.domain);
    return {
      action: existing ? 'update' : 'insert',
      id: existing ? existing.id : '',
      domain: row.domain,
      reason: row.reason,
      active: row.active,
    };
  });

  const summary = {
    source: options.sourceJson || SOURCE_ENV,
    sourceRows: sourceRows.length,
    targetExistingRows: (target.items || []).length,
    inserts: planned.filter((row) => row.action === 'insert').length,
    updates: planned.filter((row) => row.action === 'update').length,
    dryRun: options.dryRun,
    sample: planned.slice(0, 5).map((row) => ({
      action: row.action,
      domain: row.domain,
      reason: row.reason,
      active: row.active,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (options.dryRun) return;

  let completed = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (let start = 0; start < sourceRows.length; start += WRITE_CHUNK_SIZE) {
    const chunk = sourceRows.slice(start, start + WRITE_CHUNK_SIZE);
    const result = await webAppPost(token, 'importExcludedDomains', {
      records: chunk,
    });
    completed += chunk.length;
    inserted += Number(result.inserted || 0);
    updated += Number(result.updated || 0);
    skipped += Number(result.skipped || 0);
    console.log(`imported ${completed}/${sourceRows.length}`);
  }
  const after = await webAppPost(token, 'listExcludedDomains', {
    limit: 1000,
    includeInactive: true,
  });
  console.log(JSON.stringify({ ok: true, imported: completed, inserted, updated, skipped, targetRows: (after.items || []).length }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
