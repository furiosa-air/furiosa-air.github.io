// ── Leaderboard Page Logic ──
// Depends on: js/common.js (loaded first)

let allLeaderboardData = {};
let filteredModelId = null;
let filteredStrategyId = null;
let filteredFamilyId = null;

// ── Filter Icon ──

const FILTER_ICON_SVG =
  '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>';

function createFilterButton(type, id, displayName, isActive) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = isActive ? 'Remove filter' : `Filter by ${displayName}`;
  btn.setAttribute('aria-label', btn.title);
  btn.className = isActive ? 'filter-toggle is-active' : 'filter-toggle';
  btn.innerHTML = FILTER_ICON_SVG;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFilter(type, id);
  });
  return btn;
}

// ── Filter Functions ──

function toggleFilter(type, id) {
  if (type === 'model') {
    filteredModelId = filteredModelId === id ? null : id;
  } else if (type === 'strategy') {
    filteredStrategyId = filteredStrategyId === id ? null : id;
  } else if (type === 'family') {
    filteredFamilyId = filteredFamilyId === id ? null : id;
  }
  updateLeaderboardURL();
  renderActiveFilters();
  renderCombinedLeaderboardTable();
}

function clearFilter(type) {
  if (type === 'model') filteredModelId = null;
  else if (type === 'strategy') filteredStrategyId = null;
  else if (type === 'family') filteredFamilyId = null;
  updateLeaderboardURL();
  renderActiveFilters();
  renderCombinedLeaderboardTable();
}

function renderActiveFilters() {
  const container = document.getElementById('active-filters');
  container.innerHTML = '';

  const filters = [];
  if (filteredFamilyId) {
    filters.push({
      type: 'family',
      label: 'Family',
      value: familyLookup[filteredFamilyId] || filteredFamilyId,
    });
  }
  if (filteredModelId) {
    const model = modelsConfig.models.find((m) => m.id === filteredModelId);
    filters.push({
      type: 'model',
      label: 'Model',
      value: model?.displayName || filteredModelId,
    });
  }
  if (filteredStrategyId) {
    filters.push({
      type: 'strategy',
      label: 'Method',
      value: strategyLookup[filteredStrategyId] || filteredStrategyId,
    });
  }

  container.hidden = filters.length === 0;
  if (filters.length === 0) return;

  for (const filter of filters) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'filter-chip__label';
    labelSpan.textContent = filter.label + ':';

    const valueSpan = document.createElement('span');
    valueSpan.textContent = filter.value;

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', `Remove ${filter.label} filter`);
    clearBtn.innerHTML =
      '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    clearBtn.addEventListener('click', () => clearFilter(filter.type));

    chip.appendChild(labelSpan);
    chip.appendChild(valueSpan);
    chip.appendChild(clearBtn);
    container.appendChild(chip);
  }
}

// ── Data Loading ──

async function loadAllLeaderboardData() {
  allLeaderboardData = {};
  const loadPromises = modelsConfig.models
    .filter((m) => m.strategies.length > 0)
    .map(async (model) => {
      const data = await loadLeaderboardData(model.id);
      if (data) {
        allLeaderboardData[model.id] = data;
      }
    });
  await Promise.all(loadPromises);
}

// ── Combined Leaderboard Table ──

function generateCombinedThresholdSelector(activeThreshold) {
  const container = document.getElementById('combined-threshold-selector');
  container.innerHTML = '';

  const allThresholds = new Set();
  for (const data of Object.values(allLeaderboardData)) {
    for (const t of data.thresholds) {
      allThresholds.add(t);
    }
  }
  const thresholds = [...allThresholds].sort((a, b) => b - a);

  for (const threshold of thresholds) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${threshold}%`;
    button.dataset.threshold = threshold;

    button.className = threshold === activeThreshold ? 'chip is-active' : 'chip';

    button.addEventListener('click', () => {
      currentThreshold = threshold;
      generateCombinedThresholdSelector(threshold);
      renderCombinedLeaderboardTable();
      updateLeaderboardURL();
    });

    container.appendChild(button);
  }

  return thresholds;
}

function renderCombinedLeaderboardTable() {
  const tableBody = document.getElementById('combined-leaderboard-table-body');

  const modelDisplayNames = {};
  for (const model of modelsConfig.models) {
    modelDisplayNames[model.id] = model.displayName;
  }

  const entries = [];
  for (const [modelId, data] of Object.entries(allLeaderboardData)) {
    const familyId = modelFamilyMap[modelId] || '';
    if (filteredFamilyId && familyId !== filteredFamilyId) continue;
    if (filteredModelId && modelId !== filteredModelId) continue;
    for (const [strategyId, thresholdData] of Object.entries(data.results)) {
      if (filteredStrategyId && strategyId !== filteredStrategyId) continue;
      const tps = thresholdData[String(currentThreshold)];
      if (tps !== undefined) {
        entries.push({
          modelId,
          modelDisplayName: modelDisplayNames[modelId] || modelId,
          modelUrl: modelUrlLookup[modelId] || null,
          familyId,
          familyDisplayName: familyLookup[familyId] || familyId,
          strategyId,
          strategyDisplayName: strategyLookup[strategyId] || strategyId,
          strategyUrl: strategyUrlLookup[strategyId] || null,
          tps,
        });
      }
    }
  }

  entries.sort((a, b) => b.tps - a.tps);

  tableBody.innerHTML = '';

  if (entries.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="empty">No methods meet this accuracy threshold.</td></tr>';
    return;
  }

  entries.forEach((entry, index) => {
    const color = STRATEGY_COLORS[entry.strategyId] || '#9A9A9A';
    const row = document.createElement('tr');

    const rankCell = document.createElement('td');
    rankCell.className = 'rank';
    rankCell.textContent = index + 1;

    // Family cell with filter
    const familyCell = document.createElement('td');
    const familyWrapper = document.createElement('div');
    familyWrapper.className = 'cell';
    const familyText = document.createElement('span');
    familyText.className = 'muted';
    familyText.textContent = entry.familyDisplayName;
    familyWrapper.appendChild(familyText);
    familyWrapper.appendChild(
      createFilterButton(
        'family',
        entry.familyId,
        entry.familyDisplayName,
        filteredFamilyId === entry.familyId,
      ),
    );
    familyCell.appendChild(familyWrapper);

    // Model cell with filter
    const modelCell = document.createElement('td');
    const modelWrapper = document.createElement('div');
    modelWrapper.className = 'cell';
    if (entry.modelUrl) {
      const modelLink = document.createElement('a');
      modelLink.href = entry.modelUrl;
      modelLink.target = '_blank';
      modelLink.rel = 'noopener noreferrer';
      modelLink.textContent = entry.modelDisplayName;
      modelWrapper.appendChild(modelLink);
    } else {
      const modelText = document.createElement('span');
      modelText.textContent = entry.modelDisplayName;
      modelWrapper.appendChild(modelText);
    }
    modelWrapper.appendChild(
      createFilterButton(
        'model',
        entry.modelId,
        entry.modelDisplayName,
        filteredModelId === entry.modelId,
      ),
    );
    modelCell.appendChild(modelWrapper);

    // Strategy cell with filter
    const strategyCell = document.createElement('td');
    const cellWrapper = document.createElement('div');
    cellWrapper.className = 'cell';
    const colorDot = document.createElement('span');
    colorDot.className = 'dot';
    colorDot.style.backgroundColor = color;

    const strategyLeftGroup = document.createElement('div');
    strategyLeftGroup.className = 'cell__main';
    strategyLeftGroup.appendChild(colorDot);

    if (entry.strategyUrl) {
      const nameLink = document.createElement('a');
      nameLink.href = entry.strategyUrl;
      nameLink.target = '_blank';
      nameLink.rel = 'noopener noreferrer';
      nameLink.textContent = entry.strategyDisplayName;
      strategyLeftGroup.appendChild(nameLink);
    } else {
      const nameSpan = document.createElement('span');
      nameSpan.textContent = entry.strategyDisplayName;
      strategyLeftGroup.appendChild(nameSpan);
    }

    cellWrapper.appendChild(strategyLeftGroup);
    cellWrapper.appendChild(
      createFilterButton(
        'strategy',
        entry.strategyId,
        entry.strategyDisplayName,
        filteredStrategyId === entry.strategyId,
      ),
    );
    strategyCell.appendChild(cellWrapper);

    const tpsCell = document.createElement('td');
    tpsCell.className = 'num';
    tpsCell.textContent = Number(entry.tps).toFixed(2);

    row.appendChild(rankCell);
    row.appendChild(familyCell);
    row.appendChild(modelCell);
    row.appendChild(strategyCell);
    row.appendChild(tpsCell);
    tableBody.appendChild(row);
  });
}

// ── URL Management ──

function getLeaderboardURLParams() {
  const params = new URLSearchParams(window.location.search);
  const threshold = params.get('threshold');
  const model = params.get('model');
  const strategy = params.get('strategy');
  const family = params.get('family');
  // Backward compatibility: read old 'models' param
  const models = params.get('models');
  return {
    threshold: threshold ? Number(threshold) : null,
    model: model || (models ? models.split(',')[0] : null),
    strategy: strategy || null,
    family: family || null,
  };
}

function updateLeaderboardURL() {
  const url = new URL(window.location);

  if (currentThreshold && currentThreshold !== DEFAULT_THRESHOLD) {
    url.searchParams.set('threshold', currentThreshold);
  } else {
    url.searchParams.delete('threshold');
  }

  // Clean up old param
  url.searchParams.delete('models');

  if (filteredModelId) {
    url.searchParams.set('model', filteredModelId);
  } else {
    url.searchParams.delete('model');
  }

  if (filteredStrategyId) {
    url.searchParams.set('strategy', filteredStrategyId);
  } else {
    url.searchParams.delete('strategy');
  }

  if (filteredFamilyId) {
    url.searchParams.set('family', filteredFamilyId);
  } else {
    url.searchParams.delete('family');
  }

  window.history.replaceState({}, '', url);
}

// ── Initialization ──

async function initializeLeaderboard() {
  try {
    await initializeCommon();

    const urlParams = getLeaderboardURLParams();

    // Load all leaderboard data
    await loadAllLeaderboardData();

    // Determine initial threshold
    const allThresholds = new Set();
    for (const data of Object.values(allLeaderboardData)) {
      for (const t of data.thresholds) {
        allThresholds.add(t);
      }
    }
    const sortedThresholds = [...allThresholds].sort((a, b) => b - a);

    if (
      urlParams.threshold &&
      sortedThresholds.includes(urlParams.threshold)
    ) {
      currentThreshold = urlParams.threshold;
    } else if (sortedThresholds.includes(DEFAULT_THRESHOLD)) {
      currentThreshold = DEFAULT_THRESHOLD;
    } else if (sortedThresholds.length > 0) {
      currentThreshold = sortedThresholds[0];
    }

    // Apply filters from URL
    if (
      urlParams.family &&
      modelsConfig.modelFamilies.some((f) => f.id === urlParams.family)
    ) {
      filteredFamilyId = urlParams.family;
    }
    if (urlParams.model && allLeaderboardData[urlParams.model]) {
      filteredModelId = urlParams.model;
    }
    if (
      urlParams.strategy &&
      modelsConfig.strategies.some((s) => s.id === urlParams.strategy)
    ) {
      filteredStrategyId = urlParams.strategy;
    }

    // Render
    generateCombinedThresholdSelector(currentThreshold);
    renderActiveFilters();
    renderCombinedLeaderboardTable();

    // Hide loading, show table
    document.getElementById('leaderboard-loading').hidden = true;
    document.getElementById('leaderboard-table-wrapper').hidden = false;
  } catch (error) {
    console.error('Failed to initialize leaderboard:', error);
  }
}

initializeLeaderboard();
