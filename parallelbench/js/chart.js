// ── Chart Page Logic ──
// Depends on: js/common.js (loaded first)

let selectedStrategies = new Set();
let currentModelStrategies = [];
let currentModelId = null;
let currentStrategyDataMap = null;
let allLeaderboardData = {};

// ── Accuracy Threshold Selector ──

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

function generateChartThresholdSelector(activeThreshold) {
  const container = document.getElementById('chart-threshold-selector');
  container.innerHTML = '';

  const thresholds = [];
  for (let t = 100; t >= 50; t -= 5) {
    thresholds.push(t);
  }

  const select = document.createElement('select');
  select.className = 'select';
  select.setAttribute('aria-label', 'Accuracy threshold');

  for (const threshold of thresholds) {
    const option = document.createElement('option');
    option.value = threshold;
    option.textContent = `${threshold}%`;
    if (threshold === activeThreshold) {
      option.selected = true;
    }
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    currentThreshold = Number(select.value);
    updateChartURL();
    renderCharts();
  });

  container.appendChild(select);

  return thresholds;
}

// ── Strategy Filter ──

function generateStrategyFilter(strategyIds) {
  const container = document.getElementById('strategy-filter');
  container.innerHTML = '';
  selectedStrategies.clear();

  currentModelStrategies = strategyIds.map((id) => ({
    id,
    displayName: strategyLookup[id] || id,
  }));

  for (const strategy of currentModelStrategies) {
    selectedStrategies.add(strategy.id);
    const color = STRATEGY_COLORS[strategy.id] || '#9A9A9A';

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = strategy.displayName;
    chip.dataset.strategyId = strategy.id;
    chip.style.setProperty('--chip-color', color);
    setStrategyChipActive(chip, true);

    chip.addEventListener('click', () => toggleStrategy(strategy.id, chip));
    chip.addEventListener('dblclick', () => isolateStrategy(strategy.id));
    container.appendChild(chip);
  }

  // Remove old listeners by replacing elements
  const allBtn = document.getElementById('strategy-filter-all');
  const noneBtn = document.getElementById('strategy-filter-none');
  const newAllBtn = allBtn.cloneNode(true);
  const newNoneBtn = noneBtn.cloneNode(true);
  allBtn.replaceWith(newAllBtn);
  noneBtn.replaceWith(newNoneBtn);

  newAllBtn.addEventListener('click', () => {
    selectedStrategies.clear();
    for (const s of currentModelStrategies) selectedStrategies.add(s.id);
    updateAllStrategyChipStyles(true);
    updateChartURL();
    renderCharts();
  });
  newNoneBtn.addEventListener('click', () => {
    selectedStrategies.clear();
    updateAllStrategyChipStyles(false);
    updateChartURL();
    renderCharts();
  });
}

function setStrategyChipActive(chip, active) {
  chip.className = active ? 'chip chip--strategy is-active' : 'chip chip--strategy';
  chip.setAttribute('aria-pressed', String(active));
}

function toggleStrategy(strategyId, chip) {
  if (selectedStrategies.has(strategyId)) {
    selectedStrategies.delete(strategyId);
    setStrategyChipActive(chip, false);
  } else {
    selectedStrategies.add(strategyId);
    setStrategyChipActive(chip, true);
  }
  updateChartURL();
  renderCharts();
}

function isolateStrategy(strategyId) {
  selectedStrategies.clear();
  selectedStrategies.add(strategyId);
  updateAllStrategyChipStyles(false);
  const chip = document.querySelector(
    `#strategy-filter button[data-strategy-id="${strategyId}"]`,
  );
  if (chip) setStrategyChipActive(chip, true);
  updateChartURL();
  renderCharts();
}

function updateAllStrategyChipStyles(active) {
  const chips = document.querySelectorAll(
    '#strategy-filter button[data-strategy-id]',
  );
  chips.forEach((chip) => setStrategyChipActive(chip, active));
}

function getFilteredStrategyDataMap(strategyDataMap) {
  const filtered = {};
  for (const [strategyId, info] of Object.entries(strategyDataMap)) {
    if (selectedStrategies.has(strategyId)) {
      filtered[strategyId] = info;
    }
  }
  return filtered;
}

// ── Chart Rendering ──

function collectTaskIds(strategyDataMap) {
  const taskIds = new Set();
  for (const strategyInfo of Object.values(strategyDataMap)) {
    for (const row of strategyInfo.data) {
      if (row.task !== 'avg') taskIds.add(row.task);
    }
  }
  return taskIds;
}

function purgePerTaskCharts() {
  const container = document.getElementById('per-task-charts');
  for (const el of container.querySelectorAll('[id^="chart-"]')) {
    Plotly.purge(el);
  }
}

function generatePerTaskCharts(strategyDataMap) {
  const container = document.getElementById('per-task-charts');
  purgePerTaskCharts();
  container.innerHTML = '';

  const allTaskIds = collectTaskIds(strategyDataMap);
  const visibleTaskIds = [...allTaskIds];

  if (visibleTaskIds.length === 0) {
    container.innerHTML =
      '<p class="status">No data available.</p>';
    return;
  }

  // Sort by task order in metadata.json
  const taskOrder = Object.values(modelsConfig.tasks).flatMap((cat) =>
    cat.items.map((t) => t.id),
  );
  visibleTaskIds.sort(
    (a, b) =>
      (taskOrder.indexOf(a) === -1 ? 999 : taskOrder.indexOf(a)) -
      (taskOrder.indexOf(b) === -1 ? 999 : taskOrder.indexOf(b)),
  );

  for (const taskId of visibleTaskIds) {
    const card = document.createElement('div');
    card.className = 'chart-card';

    const chartDiv = document.createElement('div');
    const chartDivId = `chart-${taskId}`;
    chartDiv.id = chartDivId;
    chartDiv.style.width = '100%';
    chartDiv.style.height = '450px';
    card.appendChild(chartDiv);
    container.appendChild(card);

    const traces = [];
    for (const [strategyId, strategyInfo] of Object.entries(strategyDataMap)) {
      const rows = strategyInfo.data
        .filter((row) => row.task === taskId)
        .sort((a, b) => a.tps - b.tps || b.accuracy - a.accuracy);
      if (rows.length === 0) continue;

      traces.push({
        x: rows.map((row) => row.tps),
        y: rows.map((row) => row.accuracy),
        mode: 'lines+markers',
        type: 'scatter',
        name: strategyInfo.displayName,
        marker: {
          size: 7,
          color: STRATEGY_COLORS[strategyId] || '#9A9A9A',
          line: { width: 1, color: 'white' },
        },
        line: {
          color: STRATEGY_COLORS[strategyId] || '#9A9A9A',
          width: 2,
        },
        hovertemplate:
          'TPS: %{x}<br>' +
          'Accuracy: %{y}%' +
          '<extra>' +
          strategyInfo.displayName +
          '</extra>',
      });
    }

    const layout = {
      title: {
        text: getTaskDisplayName(taskId),
        font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 15, color: '#151515' },
        x: 0.5,
      },
      xaxis: {
        title: {
          text: '# Tokens per Step (TPS)',
          font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 12, color: '#444444' },
        },
        tickvals: [1, 2, 4, 8, 16, 32, 64],
        gridcolor: '#ECECEC',
        zerolinecolor: '#D4D4D4',
        tickfont: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 11, color: '#7F7F7F' },
      },
      yaxis: {
        title: {
          text: 'Accuracy (%)',
          font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 12, color: '#444444' },
        },
        range: [0, 105],
        dtick: 10,
        gridcolor: '#ECECEC',
        zerolinecolor: '#D4D4D4',
        tickfont: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 11, color: '#7F7F7F' },
      },
      legend: {
        orientation: 'h',
        y: -0.45,
        x: 0.5,
        xanchor: 'center',
        yanchor: 'top',
        font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 10 },
      },
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      margin: { t: 40, r: 20, b: 220, l: 50 },
      hovermode: 'closest',
    };

    const config = {
      responsive: true,
      displayModeBar: false,
    };

    Plotly.newPlot(chartDivId, traces, layout, config);
  }
}

function generateAverageChart(strategyDataMap) {
  const container = document.getElementById('average-chart');
  Plotly.purge(container);

  const traces = [];
  for (const [strategyId, strategyInfo] of Object.entries(strategyDataMap)) {
    const rows = strategyInfo.data
      .filter((row) => row.task === 'avg')
      .sort((a, b) => a.tps - b.tps || b.accuracy - a.accuracy);
    if (rows.length === 0) continue;

    const color = STRATEGY_COLORS[strategyId] || '#9A9A9A';
    const hoverTpl =
      'TPS: %{x}<br>' +
      'Accuracy: %{y}%' +
      '<extra>' +
      strategyInfo.displayName +
      '</extra>';

    if (currentThreshold && rows.some((r) => r.accuracy < currentThreshold)) {
      // Background trace: full line at reduced opacity
      traces.push({
        x: rows.map((r) => r.tps),
        y: rows.map((r) => r.accuracy),
        mode: 'lines+markers',
        type: 'scatter',
        name: strategyInfo.displayName,
        legendgroup: strategyId,
        showlegend: true,
        opacity: 0.3,
        marker: { size: 7, color, line: { width: 1, color: 'white' } },
        line: { color, width: 2 },
        hovertemplate: hoverTpl,
      });

      // Overlay trace: above-threshold points at full opacity
      const aboveY = rows.map((r) =>
        r.accuracy >= currentThreshold ? r.accuracy : null,
      );
      if (aboveY.some((v) => v !== null)) {
        traces.push({
          x: rows.map((r) => r.tps),
          y: aboveY,
          mode: 'lines+markers',
          type: 'scatter',
          name: strategyInfo.displayName,
          legendgroup: strategyId,
          showlegend: false,
          connectgaps: false,
          marker: { size: 7, color, line: { width: 1, color: 'white' } },
          line: { color, width: 2 },
          hoverinfo: 'skip',
        });
      }
    } else {
      // All points above threshold or no threshold — single trace
      traces.push({
        x: rows.map((r) => r.tps),
        y: rows.map((r) => r.accuracy),
        mode: 'lines+markers',
        type: 'scatter',
        name: strategyInfo.displayName,
        marker: { size: 7, color, line: { width: 1, color: 'white' } },
        line: { color, width: 2 },
        hovertemplate: hoverTpl,
      });
    }
  }

  if (traces.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const shapes = [];
  if (currentThreshold) {
    shapes.push({
      type: 'line',
      x0: 0,
      x1: 1,
      xref: 'paper',
      y0: currentThreshold,
      y1: currentThreshold,
      line: { color: '#9A9A9A', width: 1.5, dash: 'dash' },
    });
  }

  const layout = {
    title: {
      text: 'Average Results',
      font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 15, color: '#151515' },
      x: 0.5,
    },
    xaxis: {
      title: {
        text: '# Tokens per Step (TPS)',
        font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 12, color: '#444444' },
      },
      tickvals: [1, 2, 4, 8, 16, 32],
      range: [0, 34],
      gridcolor: '#ECECEC',
      zerolinecolor: '#D4D4D4',
      tickfont: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 11, color: '#7F7F7F' },
    },
    yaxis: {
      title: {
        text: 'Accuracy (%)',
        font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 12, color: '#444444' },
      },
      range: [0, 105],
      dtick: 10,
      gridcolor: '#ECECEC',
      zerolinecolor: '#D4D4D4',
      tickfont: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 11, color: '#7F7F7F' },
    },
    shapes,
    legend: {
      orientation: 'h',
      y: -0.3,
      x: 0.5,
      xanchor: 'center',
      yanchor: 'top',
      font: { family: '"ABC Favorit", "Helvetica Neue", Arial, sans-serif', size: 10 },
    },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    margin: { t: 40, r: 20, b: 140, l: 50 },
    hovermode: 'closest',
  };

  const config = {
    responsive: true,
    displayModeBar: false,
  };

  Plotly.newPlot('average-chart', traces, layout, config);
}

// ── UI: Model Tabs ──

function generateModelTabs(models, activeModelId) {
  const selector = document.getElementById('model-selector');
  selector.innerHTML = '';

  const familyGroups = groupModelsByFamily(models);

  for (const group of familyGroups) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'control__row';

    const label = document.createElement('span');
    label.className = 'control__group-label';
    label.textContent = familyLookup[group.familyId] || group.familyId;
    groupDiv.appendChild(label);

    for (const model of group.models) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = model.displayName;
      button.dataset.modelId = model.id;

      const isActive = model.id === activeModelId;

      button.className = isActive ? 'chip is-active' : 'chip';
      button.setAttribute('aria-pressed', String(isActive));
      if (model.strategies.length === 0) {
        button.disabled = true;
        button.title = 'Coming soon';
      }

      button.addEventListener('click', () => handleModelSelection(model.id));
      groupDiv.appendChild(button);
    }

    selector.appendChild(groupDiv);
  }
}

// ── UI: State Management ──

function showLoading() {
  document.getElementById('chart-loading').hidden = false;
  document.getElementById('per-task-charts').innerHTML = '';
  document.getElementById('average-chart').style.visibility = 'hidden';
  document.getElementById('chart-empty').hidden = true;
}

function showEmpty() {
  document.getElementById('chart-loading').hidden = true;
  document.getElementById('per-task-charts').innerHTML = '';
  document.getElementById('average-chart').style.visibility = 'hidden';
  document.getElementById('chart-empty').hidden = false;
}

function showCharts() {
  document.getElementById('chart-loading').hidden = true;
  document.getElementById('chart-empty').hidden = true;
  document.getElementById('average-chart').style.visibility = 'visible';
}

// ── Main Logic ──

function renderCharts() {
  if (!currentStrategyDataMap) return;

  const filtered = getFilteredStrategyDataMap(currentStrategyDataMap);

  if (Object.keys(filtered).length === 0) {
    showEmpty();
    return;
  }

  showCharts();
  generateAverageChart(filtered);
  generatePerTaskCharts(filtered);
}

// ── URL Management ──

function getChartURLParams() {
  const params = new URLSearchParams(window.location.search);
  const model = params.get('model');
  const strategies = params.get('strategies');
  const threshold = params.get('threshold');
  return {
    model,
    strategies: strategies ? strategies.split(',') : null,
    threshold: threshold ? Number(threshold) : null,
  };
}

function updateChartURL() {
  const url = new URL(window.location);

  if (currentModelId) {
    url.searchParams.set('model', currentModelId);
  }

  const modelStrategyIds = currentModelStrategies.map((s) => s.id);
  const allSelected = modelStrategyIds.every((id) =>
    selectedStrategies.has(id),
  );
  if (allSelected || selectedStrategies.size === 0) {
    url.searchParams.delete('strategies');
  } else {
    url.searchParams.set('strategies', [...selectedStrategies].join(','));
  }

  if (currentThreshold && currentThreshold !== DEFAULT_THRESHOLD) {
    url.searchParams.set('threshold', currentThreshold);
  } else {
    url.searchParams.delete('threshold');
  }

  window.history.replaceState({}, '', url);
}

async function handleModelSelection(modelId) {
  currentModelId = modelId;
  const model = modelsConfig.models.find((m) => m.id === modelId);

  generateStrategyFilter(model.strategies);
  generateModelTabs(modelsConfig.models, modelId);
  updateChartURL();
  showLoading();

  currentStrategyDataMap = await loadAllDataForModel(model);

  updateChartURL();
  renderCharts();
}

// ── Initialization ──

async function initializeChart() {
  try {
    await initializeCommon();

    const urlParams = getChartURLParams();

    // Load leaderboard data for threshold options
    await loadAllLeaderboardData();

    // Determine threshold from available options
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

    // Render threshold selector
    generateChartThresholdSelector(currentThreshold);

    // Initialize model selection + chart data
    const requestedModel = urlParams.model
      ? modelsConfig.models.find(
          (m) => m.id === urlParams.model && m.strategies.length > 0,
        )
      : null;

    const initialModel =
      requestedModel ||
      modelsConfig.models.find((model) => model.strategies.length > 0);

    if (initialModel) {
      generateModelTabs(modelsConfig.models, initialModel.id);
      await handleModelSelection(initialModel.id);

      // Apply strategy filter from URL after model is loaded
      if (urlParams.strategies) {
        const validIds = new Set(initialModel.strategies);
        const filtered = urlParams.strategies.filter((id) => validIds.has(id));
        if (filtered.length > 0) {
          selectedStrategies.clear();
          filtered.forEach((id) => selectedStrategies.add(id));
          for (const chip of document.querySelectorAll(
            '#strategy-filter button[data-strategy-id]',
          )) {
            setStrategyChipActive(chip, selectedStrategies.has(chip.dataset.strategyId));
          }
          renderCharts();
        } else {
          const url = new URL(window.location);
          url.searchParams.delete('strategies');
          window.history.replaceState({}, '', url);
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize chart:', error);
  }
}

initializeChart();
