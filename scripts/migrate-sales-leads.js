#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_REPO = process.env.SOURCE_REPO || '/Users/muramatsuyuuya/Documents/自動営業システム';
const SOURCE_ENV = process.env.SOURCE_ENV || path.join(SOURCE_REPO, '.env.local');
const TARGET_SPREADSHEET_ID = process.env.TARGET_SPREADSHEET_ID || '1IuJrWB7RGd2qIFDlhe5lfKaBnmUKN4RcnxdFFTuluZY';
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwJcZuTk-7wuFJapBdo4dk-yj64hFHk71BMuJxO-pl9BWpui3kOt17lmPT_7LfnZ0OV-g/exec';
const CLASP_RC = process.env.CLASP_RC || path.join(process.env.HOME || '', '.clasprc.json');
const SHEET_NAME = 'leads';
const WRITE_CHUNK_SIZE = Number(process.env.WRITE_CHUNK_SIZE || 250);

const LEAD_HEADERS = [
  'id',
  'source',
  'source_id',
  'external_id',
  'genre',
  'company_name',
  'normalized_company_name',
  'facility_name',
  'email',
  'email_domain',
  'phone',
  'website_url',
  'website_domain',
  'form_url',
  'address',
  'status',
  'send_ng',
  'send_ng_reason',
  'send_ng_memo',
  'no_action_reason',
  'no_action_memo',
  'reply_checked',
  'form_status',
  'next_send_at',
  'last_sent_at',
  'last_gmail_thread_id',
  'send_count',
  'deal_status',
  'meeting_start_at',
  'meeting_end_at',
  'contact_name',
  'contact_email',
  'meeting_memo',
  'lost_reason',
  'decline_reason',
  'calendar_event_id',
  'google_meet_url',
  'calendar_auto_created_at',
  'custom_fields_json',
  'source_payload_json',
  'owner',
  'notes',
  'created_at',
  'updated_at',
  'archived_at',
];

const SOURCE_LEAD_SELECT = [
  'id',
  'source',
  'source_id',
  'external_id',
  'genre_id',
  'company_name',
  'normalized_company_name',
  'facility_name',
  'email',
  'email_domain',
  'phone',
  'website_url',
  'form_url',
  'address',
  'status',
  'send_ng',
  'send_ng_reason_id',
  'send_ng_memo',
  'no_action_reason_id',
  'no_action_memo',
  'reply_checked',
  'form_status',
  'next_send_at',
  'last_sent_at',
  'last_gmail_thread_id',
  'deal_status',
  'meeting_start_at',
  'meeting_end_at',
  'contact_name',
  'contact_email',
  'meeting_memo',
  'lost_reason_id',
  'decline_reason',
  'calendar_event_id',
  'google_meet_url',
  'calendar_auto_created_at',
  'custom_fields',
  'source_payload',
  'created_at',
  'updated_at',
  'genres(name)',
].join(',');

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
  const headers = supabaseHeaders(env, options.headers || {});
  const response = await fetch(url, { headers });
  const text = await response.text();
  let data;
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

async function fetchSourceData(env) {
  const [leads, reasons, histories] = await Promise.all([
    fetchAllSupabase(
      env,
      'sales_leads',
      {
        select: SOURCE_LEAD_SELECT,
        order: 'created_at.asc',
      },
      1000
    ),
    fetchAllSupabase(env, 'reasons', { select: 'id,category,name' }, 1000),
    fetchAllSupabase(env, 'send_histories', { select: 'lead_id' }, 1000),
  ]);
  return {
    leads: leads.rows,
    leadTotal: leads.total,
    reasonById: new Map(reasons.rows.map((reason) => [reason.id, reason])),
    sendCountByLeadId: histories.rows.reduce((map, history) => {
      if (history.lead_id) map.set(history.lead_id, (map.get(history.lead_id) || 0) + 1);
      return map;
    }, new Map()),
  };
}

function normalizeDomain(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.replace(/^www\./, '');
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

function stringifyJson(value) {
  if (value === undefined || value === null || value === '') return '';
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function blankIfNull(value) {
  return value === undefined || value === null ? '' : value;
}

function reasonName(reasonById, id) {
  if (!id) return '';
  const reason = reasonById.get(id);
  return reason ? reason.name || '' : '';
}

function mapLeadToTargetRow(lead, context) {
  const websiteDomain = normalizeDomain(lead.website_url || lead.form_url || lead.email_domain || '');
  const customFields = lead.custom_fields && typeof lead.custom_fields === 'object' ? lead.custom_fields : {};
  const sourcePayload = lead.source_payload && typeof lead.source_payload === 'object' ? lead.source_payload : {};
  return [
    lead.id,
    blankIfNull(lead.source),
    blankIfNull(lead.source_id),
    blankIfNull(lead.external_id),
    blankIfNull(lead.genres && lead.genres.name),
    blankIfNull(lead.company_name),
    blankIfNull(lead.normalized_company_name),
    blankIfNull(lead.facility_name),
    blankIfNull(lead.email),
    blankIfNull(lead.email_domain),
    blankIfNull(lead.phone),
    blankIfNull(lead.website_url),
    websiteDomain,
    blankIfNull(lead.form_url),
    blankIfNull(lead.address),
    blankIfNull(lead.status) || '未対応',
    Boolean(lead.send_ng),
    reasonName(context.reasonById, lead.send_ng_reason_id),
    blankIfNull(lead.send_ng_memo),
    reasonName(context.reasonById, lead.no_action_reason_id),
    blankIfNull(lead.no_action_memo),
    Boolean(lead.reply_checked),
    blankIfNull(lead.form_status) || '未対応',
    blankIfNull(lead.next_send_at),
    blankIfNull(lead.last_sent_at),
    blankIfNull(lead.last_gmail_thread_id),
    context.sendCountByLeadId.get(lead.id) || 0,
    blankIfNull(lead.deal_status) || '未設定',
    blankIfNull(lead.meeting_start_at),
    blankIfNull(lead.meeting_end_at),
    blankIfNull(lead.contact_name),
    blankIfNull(lead.contact_email),
    blankIfNull(lead.meeting_memo),
    reasonName(context.reasonById, lead.lost_reason_id),
    blankIfNull(lead.decline_reason),
    blankIfNull(lead.calendar_event_id),
    blankIfNull(lead.google_meet_url),
    blankIfNull(lead.calendar_auto_created_at),
    stringifyJson(customFields),
    stringifyJson(sourcePayload),
    '',
    blankIfNull(customFields.notes || customFields.memo || ''),
    blankIfNull(lead.created_at),
    blankIfNull(lead.updated_at),
    '',
  ];
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

async function sheetsRequest(token, pathSuffix, options = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${TARGET_SPREADSHEET_ID}${pathSuffix}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Failed to parse Sheets response: ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`Sheets request failed: ${response.status} ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
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

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
    replace: args.has('--replace'),
  };
}

async function main() {
  const options = parseArgs();
  const env = loadEnv(SOURCE_ENV);
  const source = await fetchSourceData(env);
  const rows = source.leads.map((lead) => mapLeadToTargetRow(lead, source));
  const token = await getGoogleAccessToken();
  const targetBefore = await webAppPost(token, 'listLeads', { limit: 1, includeArchived: true });

  const duplicateIds = new Set();
  for (const row of rows) {
    if (duplicateIds.has(row[0])) throw new Error(`Duplicate source lead id: ${row[0]}`);
    duplicateIds.add(row[0]);
  }

  const summary = {
    sourceRepo: SOURCE_REPO,
    sourceLeadTotal: source.leadTotal,
    mappedRows: rows.length,
    targetSpreadsheetId: TARGET_SPREADSHEET_ID,
    webAppUrl: WEB_APP_URL,
    targetExistingRows: Number(targetBefore.total || 0),
    dryRun: options.dryRun,
    replace: options.replace,
    firstRows: rows.slice(0, 3).map((row) => ({
      id: row[0],
      source: row[1],
      genre: row[4],
      company_name: row[5],
      facility_name: row[7],
      email: row[8],
      website_url: row[11],
      status: row[15],
      send_count: row[26],
    })),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (options.dryRun) return;
  if (Number(targetBefore.total || 0) > 0 && !options.replace) {
    throw new Error(`Target leads already has ${targetBefore.total} rows. Re-run with --replace to clear and migrate.`);
  }

  await webAppPost(token, 'prepareLeadMigration', {
    totalRows: rows.length,
    replace: options.replace,
  });
  for (let start = 0; start < rows.length; start += WRITE_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + WRITE_CHUNK_SIZE);
    await webAppPost(token, 'writeLeadMigrationRows', {
      startRow: start + 2,
      rows: chunk,
    });
    console.log(`wrote ${start + chunk.length}/${rows.length}`);
  }
  const finalized = await webAppPost(token, 'finalizeLeadMigration', {
    expectedRows: rows.length,
    source: SOURCE_REPO,
  });
  const targetAfter = await webAppPost(token, 'listLeads', { limit: 1, includeArchived: true });
  console.log(JSON.stringify({ ok: true, finalized, targetTotal: targetAfter.total }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
