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
  if (text === '' || text === 'false' || text === '0' || text === 'no' || text === 'off' || text === 'いいえ') {
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

function listCustomFieldDefinitions(options) {
  const query = options && typeof options === 'object' ? options : {};
  const includeInactive = query.includeInactive === true;
  const genreId = String(query.genreId || query.genre_id || '').trim();
  const genreName = String(query.genre || '').trim();
  const records = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'custom_field_definitions'));
  const items = records.filter(function (record) {
    if (!includeInactive && normalizeBooleanLike_(record.active) === false) return false;
    if (genreId && String(record.genre_id || '') !== genreId) return false;
    if (genreName && String(record.genre || '') !== genreName) return false;
    return true;
  }).map(normalizeCustomFieldDefinitionRecord_);

  items.sort(function (a, b) {
    return Number(a.sort_order || 100) - Number(b.sort_order || 100) ||
      String(a.label || '').localeCompare(String(b.label || ''), 'ja');
  });

  return {
    total: items.length,
    items: items,
  };
}

function saveCustomFieldDefinition(input) {
  return withScriptLock_('saveCustomFieldDefinition', function () {
    const normalized = normalizeCustomFieldDefinitionInput_(input || {});
    const sheet = ensureSheet_(getOrCreateSpreadsheet_(), 'custom_field_definitions');
    const records = readSheetRecords_(sheet);
    const duplicate = records.find(function (record) {
      return normalizeBooleanLike_(record.active) !== false &&
        String(record.genre_id || '') === normalized.genre_id &&
        String(record.field_key || '') === normalized.field_key &&
        (!normalized.id || String(record.id || '') !== normalized.id);
    });

    if (duplicate) {
      throw new Error('同じジャンルに同じ差し込み名のカスタム項目があります。');
    }

    if (normalized.id) {
      return normalizeCustomFieldDefinitionRecord_(updateSheetRecord_('custom_field_definitions', normalized.id, normalized));
    }

    return normalizeCustomFieldDefinitionRecord_(appendSheetRecord_('custom_field_definitions', normalized));
  });
}

function updateCustomFieldDefinition(id, patch) {
  return withScriptLock_('updateCustomFieldDefinition', function () {
    const recordId = requireId_(id);
    const updates = normalizeCustomFieldDefinitionPatch_(patch || {});
    return normalizeCustomFieldDefinitionRecord_(updateSheetRecord_('custom_field_definitions', recordId, updates));
  });
}

function getListViewSetting(genreId) {
  const normalizedGenreId = String(genreId || '').trim();
  if (!normalizedGenreId) return null;
  const records = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'list_view_settings'));
  const record = records.find(function (item) {
    return String(item.genre_id || '') === normalizedGenreId;
  });
  return record ? normalizeListViewSettingRecord_(record) : null;
}

function listListViewSettings(options) {
  const query = options && typeof options === 'object' ? options : {};
  const genreId = String(query.genreId || query.genre_id || '').trim();
  let items = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'list_view_settings')).map(normalizeListViewSettingRecord_);
  if (genreId) {
    items = items.filter(function (item) {
      return String(item.genre_id || '') === genreId;
    });
  }
  return {
    total: items.length,
    items: items,
  };
}

function saveListViewSettings(input) {
  return withScriptLock_('saveListViewSettings', function () {
    const payload = input && typeof input === 'object' ? input : {};
    const genre = findGenreForInput_(payload.genre_id || payload.genreId, payload.genre);
    const columns = normalizeListViewColumns_(payload.columns || []);
    const records = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'list_view_settings'));
    const existing = records.find(function (record) {
      return String(record.genre_id || '') === genre.id;
    });
    const nextRecord = {
      genre_id: genre.id,
      genre: genre.name,
      columns_json: safeJsonStringify_(columns),
    };

    if (existing) {
      return normalizeListViewSettingRecord_(updateSheetRecord_('list_view_settings', existing.id, nextRecord));
    }

    return normalizeListViewSettingRecord_(appendSheetRecord_('list_view_settings', nextRecord));
  });
}

function normalizeCustomFieldDefinitionInput_(input) {
  const genre = findGenreForInput_(input.genre_id || input.genreId, input.genre);
  const label = String(input.label || '').trim();
  const fieldKey = normalizeCustomFieldKey_(input.field_key || input.fieldKey || label);
  const inputType = String(input.input_type || input.inputType || 'text').trim();

  if (!label) throw new Error('項目名は必須です。');
  if (!fieldKey) throw new Error('差し込み名は必須です。');
  if (['text', 'number', 'date', 'select', 'checkbox', 'url', 'email'].indexOf(inputType) === -1) {
    throw new Error('入力形式が不正です: ' + inputType);
  }

  const normalized = {
    genre_id: genre.id,
    genre: genre.name,
    field_key: fieldKey,
    label: label,
    input_type: inputType,
    options_json: safeJsonStringify_(normalizeOptionsList_(input.options || input.options_json || input.optionsText || input.options_text || '')),
    list_visible: normalizeBooleanLike_(input.list_visible || input.listVisible),
    detail_visible: input.detail_visible === undefined && input.detailVisible === undefined ? true : normalizeBooleanLike_(input.detail_visible || input.detailVisible),
    template_enabled: input.template_enabled === undefined && input.templateEnabled === undefined ? true : normalizeBooleanLike_(input.template_enabled || input.templateEnabled),
    required: normalizeBooleanLike_(input.required),
    active: input.active === undefined ? true : normalizeBooleanLike_(input.active),
    sort_order: normalizeSortOrder_(input.sort_order || input.sortOrder, 100),
  };

  if (input.id) normalized.id = String(input.id).trim();
  return normalized;
}

function normalizeCustomFieldDefinitionPatch_(patch) {
  const updates = {};
  if (patch.genre_id || patch.genreId || patch.genre) {
    const genre = findGenreForInput_(patch.genre_id || patch.genreId, patch.genre);
    updates.genre_id = genre.id;
    updates.genre = genre.name;
  }
  if (patch.field_key !== undefined || patch.fieldKey !== undefined) updates.field_key = normalizeCustomFieldKey_(patch.field_key || patch.fieldKey);
  if (patch.label !== undefined) updates.label = String(patch.label || '').trim();
  if (patch.input_type !== undefined || patch.inputType !== undefined) {
    const inputType = String(patch.input_type || patch.inputType || '').trim();
    if (['text', 'number', 'date', 'select', 'checkbox', 'url', 'email'].indexOf(inputType) === -1) {
      throw new Error('入力形式が不正です: ' + inputType);
    }
    updates.input_type = inputType;
  }
  if (patch.options !== undefined || patch.options_json !== undefined || patch.optionsText !== undefined || patch.options_text !== undefined) {
    updates.options_json = safeJsonStringify_(normalizeOptionsList_(patch.options || patch.options_json || patch.optionsText || patch.options_text || ''));
  }
  ['list_visible', 'detail_visible', 'template_enabled', 'required', 'active'].forEach(function (field) {
    const camel = field.replace(/_([a-z])/g, function (_match, char) { return char.toUpperCase(); });
    if (patch[field] !== undefined || patch[camel] !== undefined) {
      updates[field] = normalizeBooleanLike_(patch[field] !== undefined ? patch[field] : patch[camel]);
    }
  });
  if (patch.sort_order !== undefined || patch.sortOrder !== undefined) updates.sort_order = normalizeSortOrder_(patch.sort_order || patch.sortOrder, 100);
  return updates;
}

function normalizeCustomFieldDefinitionRecord_(record) {
  const normalized = Object.assign({}, record);
  normalized.options = parseJsonArray_(record.options_json);
  normalized.list_visible = normalizeBooleanLike_(record.list_visible);
  normalized.detail_visible = record.detail_visible === '' ? true : normalizeBooleanLike_(record.detail_visible);
  normalized.template_enabled = record.template_enabled === '' ? true : normalizeBooleanLike_(record.template_enabled);
  normalized.required = normalizeBooleanLike_(record.required);
  normalized.active = record.active === '' ? true : normalizeBooleanLike_(record.active);
  normalized.sort_order = normalizeSortOrder_(record.sort_order, 100);
  normalized.genres = normalized.genre ? { name: normalized.genre } : null;
  return normalized;
}

function normalizeListViewSettingRecord_(record) {
  const normalized = Object.assign({}, record);
  normalized.columns = normalizeListViewColumns_(parseJsonArray_(record.columns_json));
  normalized.genres = normalized.genre ? { name: normalized.genre } : null;
  return normalized;
}

function normalizeListViewColumns_(columns) {
  const array = Array.isArray(columns) ? columns : [];
  return array.map(function (column, index) {
    return {
      key: String(column.key || '').trim(),
      label: String(column.label || column.key || '').trim(),
      visible: column.visible === undefined ? true : normalizeBooleanLike_(column.visible),
      order: normalizeSortOrder_(column.order, index + 1),
      custom: normalizeBooleanLike_(column.custom),
    };
  }).filter(function (column) {
    return column.key && column.label;
  }).sort(function (a, b) {
    return Number(a.order || 0) - Number(b.order || 0);
  });
}

function findGenreForInput_(genreId, genreName) {
  const id = String(genreId || '').trim();
  const name = String(genreName || '').trim();
  const genres = readSheetRecords_(ensureSheet_(getOrCreateSpreadsheet_(), 'genres'));
  const found = genres.find(function (genre) {
    return (id && String(genre.id || '') === id) || (name && String(genre.name || '') === name);
  });

  if (!found) {
    throw new Error('ジャンルが見つかりません。先にジャンルを選択してください。');
  }

  return {
    id: String(found.id || ''),
    name: String(found.name || ''),
  };
}

function normalizeCustomFieldKey_(value) {
  return String(value || '')
    .trim()
    .replace(/[ \t\n\r　]+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}

function normalizeOptionsList_(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
  }
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
    }
  } catch (error) {
    // Treat the value as comma-separated text.
  }
  return text.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
}

function parseJsonArray_(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeSortOrder_(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.floor(numberValue)) : fallback;
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
    CacheService.getScriptCache().remove('dashboard_stats_v3');
    CacheService.getScriptCache().remove('dashboard_stats_v4');
  } catch (error) {
    console.warn('Cache clear skipped: ' + error.message);
  }
}
