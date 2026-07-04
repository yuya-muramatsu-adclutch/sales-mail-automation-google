function listSheetRecords(sheetName, options) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const records = readSheetRecords_(sheet);
  const query = options && typeof options === 'object' ? options : {};
  const includeInactive = query.includeInactive === true;
  const includeArchived = query.includeArchived === true;
  const search = String(query.search || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(query.limit) || 200, 1), 1000);
  const offset = Math.max(Number(query.offset) || 0, 0);

  const filtered = records.filter(function (record) {
    if (!includeInactive && Object.prototype.hasOwnProperty.call(record, 'active') && normalizeBooleanLike_(record.active) === false) {
      return false;
    }
    if (!includeArchived && Object.prototype.hasOwnProperty.call(record, 'archived_at') && record.archived_at) {
      return false;
    }
    if (!search) {
      return true;
    }
    return Object.keys(record).some(function (key) {
      return String(record[key] || '').toLowerCase().indexOf(search) !== -1;
    });
  });

  filtered.sort(function (a, b) {
    return String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
  });

  return {
    total: filtered.length,
    offset: offset,
    limit: limit,
    items: filtered.slice(offset, offset + limit),
  };
}

function appendSheetRecord_(sheetName, record) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const headers = getHeaders_(sheet);
  const now = nowIso_();
  const nextRecord = Object.assign({}, record, {
    id: record.id || Utilities.getUuid(),
    created_at: record.created_at || now,
    updated_at: record.updated_at || now,
  });

  sheet.appendRow(headers.map(function (header) {
    return valueOrBlank_(nextRecord[header]);
  }));

  clearRuntimeCaches_(sheetName);
  return findRowById_(sheet, nextRecord.id).record;
}

function updateSheetRecord_(sheetName, id, patch) {
  const recordId = requireId_(id);
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const found = findRowById_(sheet, recordId);

  if (!found) {
    throw new Error(sheetName + ' not found: ' + recordId);
  }

  const headers = getHeaders_(sheet);
  const nextRecord = Object.assign({}, found.record, patch, {
    id: found.record.id,
    created_at: found.record.created_at,
    updated_at: nowIso_(),
  });

  writeRecordToRow_(sheet, found.rowNumber, headers, nextRecord);
  clearRuntimeCaches_(sheetName);
  return findRowById_(sheet, recordId).record;
}

function softDeleteSheetRecord_(sheetName, id) {
  const recordId = requireId_(id);
  const patch = { active: false };

  if (SHEET_DEFINITIONS[sheetName] && SHEET_DEFINITIONS[sheetName].indexOf('archived_at') !== -1) {
    patch.archived_at = nowIso_();
  }

  return updateSheetRecord_(sheetName, recordId, patch);
}

function findSheetRecordById_(sheetName, id) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const found = findRowById_(sheet, requireId_(id));
  return found ? found.record : null;
}

function normalizeBooleanLike_(value) {
  if (value === true || value === false) {
    return value;
  }
  const text = String(value || '').trim().toLowerCase();
  if (text === 'false' || text === '0' || text === 'no' || text === 'off' || text === 'いいえ') {
    return false;
  }
  return true;
}

function getSettingValue_(key, defaultValue) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, 'settings');
  const records = readSheetRecords_(sheet);
  const setting = records.find(function (record) {
    return record.key === key;
  });

  if (!setting) {
    return defaultValue;
  }

  if (setting.value_type === 'number') {
    const numberValue = Number(setting.value);
    return Number.isFinite(numberValue) ? numberValue : defaultValue;
  }

  if (setting.value_type === 'boolean') {
    return normalizeBooleanLike_(setting.value);
  }

  if (setting.value_type === 'json') {
    try {
      return JSON.parse(String(setting.value || '{}'));
    } catch (error) {
      return defaultValue;
    }
  }

  return setting.value === '' || setting.value === undefined || setting.value === null ? defaultValue : setting.value;
}

function setSettingValue(key, value, valueType, description) {
  return withScriptLock_('setSettingValue', function () {
    const spreadsheet = getOrCreateSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet, 'settings');
    const records = readSheetRecords_(sheet);
    const found = records.find(function (record) {
      return record.key === key;
    });
    const normalizedValueType = valueType || (typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'object' ? 'json' : 'string');
    const normalizedValue = normalizedValueType === 'json' ? safeJsonStringify_(value || {}) : String(value);

    if (found) {
      return updateSheetRecord_('settings', found.id, {
        key: key,
        value: normalizedValue,
        value_type: normalizedValueType,
        description: description || found.description || '',
      });
    }

    return appendSheetRecord_('settings', {
      key: key,
      value: normalizedValue,
      value_type: normalizedValueType,
      description: description || '',
    });
  });
}

function countRowsByDate_(sheetName, dateField, dateText) {
  const spreadsheet = getOrCreateSpreadsheet_();
  const sheet = ensureSheet_(spreadsheet, sheetName);
  const records = readSheetRecords_(sheet);
  return records.filter(function (record) {
    return String(record[dateField] || '').slice(0, 10) === dateText;
  }).length;
}

function clearRuntimeCaches_(changedSheetName) {
  if (changedSheetName === 'dashboard_cache') {
    return;
  }

  try {
    CacheService.getScriptCache().remove('dashboard_stats_v1');
    CacheService.getScriptCache().remove('dashboard_stats_v2');
  } catch (error) {
    console.warn('Cache clear skipped: ' + error.message);
  }
}
