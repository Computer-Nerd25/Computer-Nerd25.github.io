(function () {
  var ENDPOINT = 'https://api.aquadevs.com/v1/models';
  var FALLBACK = {
    primary: 'sonnet-4.6',
    secondary: 'opus-4.8',
    tertiary: 'qwen-3.7',
  };
  var SLOTS = ['primary', 'secondary', 'tertiary'];

  function byId(a, b) {
    return a.id.localeCompare(b.id);
  }

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function parseModels(payload) {
    if (!payload || !Array.isArray(payload.data)) return [];
    return payload.data
      .filter(function (m) { return m && m.id; })
      .map(function (m) {
        return {
          id: m.id,
          name: m.name || m.id,
          tier: m.tier || 'standard',
          type: m.type || 'text',
        };
      });
  }

  function splitChartPools(models) {
    var text = models.filter(function (m) { return m.type === 'text'; });
    return {
      standard: text.filter(function (m) { return m.tier !== 'premium'; }).sort(byId),
      premium: text.filter(function (m) { return m.tier === 'premium'; }).sort(byId),
      all: text.sort(byId),
    };
  }

  function pickRandomIds(pool, count, exclude) {
    exclude = exclude || [];
    var available = pool.filter(function (m) { return exclude.indexOf(m.id) === -1; });
    return shuffle(available).slice(0, count).map(function (m) { return m.id; });
  }

  function pickFeatured(pools) {
    var premiumPicks = pickRandomIds(pools.premium, 2);
    var primary = premiumPicks[0] || FALLBACK.primary;
    var secondary = premiumPicks[1] || pickRandomIds(pools.premium, 1, [primary])[0] || primary || FALLBACK.secondary;
    var tertiary = pickRandomIds(pools.standard, 1)[0] || pickRandomIds(pools.all, 1, [primary, secondary])[0] || FALLBACK.tertiary;

    return { primary: primary, secondary: secondary, tertiary: tertiary };
  }

  function pickRandomFromChart(pools) {
    return pickRandomIds(pools.all, 1)[0] || FALLBACK.primary;
  }

  function wireLiveModelCopy(el) {
    if (typeof attachCopyIconToModelEl === 'function') {
      attachCopyIconToModelEl(el);
    }
  }

  function wireAllLiveModelCopy() {
    document.querySelectorAll(
      '.live-model-id-primary, .live-model-id-secondary, .live-model-id-tertiary, .live-model-id-random'
    ).forEach(wireLiveModelCopy);
  }

  function applyFeaturedModels(ids, state) {
    SLOTS.forEach(function (slot) {
      var value = ids[slot] || FALLBACK[slot];
      document.querySelectorAll('.live-model-id-' + slot).forEach(function (el) {
        el.textContent = value;
        el.setAttribute('data-state', state);
        if (state !== 'loading') wireLiveModelCopy(el);
      });
    });
  }

  function applyRandomChartIds(pools, state) {
    document.querySelectorAll('.live-model-id-random').forEach(function (el) {
      el.textContent = pickRandomFromChart(pools);
      el.setAttribute('data-state', state);
      if (state !== 'loading') wireLiveModelCopy(el);
    });
  }

  function setLoadingPlaceholders() {
    SLOTS.forEach(function (slot) {
      document.querySelectorAll('.live-model-id-' + slot).forEach(function (el) {
        if (!el.textContent.trim() || el.getAttribute('data-state') === 'loading') {
          el.textContent = 'loading…';
          el.setAttribute('data-state', 'loading');
        }
      });
    });
    document.querySelectorAll('.live-model-id-random').forEach(function (el) {
      if (!el.textContent.trim() || el.getAttribute('data-state') === 'loading') {
        el.textContent = 'loading…';
        el.setAttribute('data-state', 'loading');
      }
    });
  }

  function renderList(listEl, models) {
    listEl.innerHTML = '';
    if (!models.length) {
      var empty = document.createElement('li');
      empty.textContent = 'no models';
      listEl.appendChild(empty);
      return;
    }
    models.forEach(function (model) {
      var li = document.createElement('li');
      var row = document.createElement('div');
      row.className = 'models-list__row';

      var idSpan = document.createElement('span');
      idSpan.className = 'models-list__id';
      idSpan.textContent = model.id;

      if (model.type && model.type !== 'text') {
        var typeSpan = document.createElement('span');
        typeSpan.className = 'models-list__type';
        typeSpan.textContent = model.type;
        idSpan.appendChild(typeSpan);
      }

      var copyBtn = typeof createCopyIconButton === 'function'
        ? createCopyIconButton(function () { return model.id; }, 'Copy ' + model.id)
        : null;

      var nameSpan = document.createElement('span');
      nameSpan.className = 'models-list__name';
      nameSpan.textContent = model.name;

      row.appendChild(idSpan);
      if (copyBtn) row.appendChild(copyBtn);
      li.appendChild(row);
      li.appendChild(nameSpan);
      listEl.appendChild(li);
    });
  }

  function setMeta(metaEl, text, isError) {
    metaEl.textContent = text;
    metaEl.classList.toggle('models-meta--error', !!isError);
  }

  function renderHubLists(pools) {
    var meta = document.getElementById('models-meta');
    var standardList = document.getElementById('models-standard');
    var premiumList = document.getElementById('models-premium');
    if (!meta || !standardList || !premiumList) return;

    renderList(standardList, pools.standard);
    renderList(premiumList, pools.premium);
    setMeta(meta, pools.all.length + ' models · live from api.aquadevs.com/v1/models', false);
  }

  function renderHubError(err) {
    var meta = document.getElementById('models-meta');
    var standardList = document.getElementById('models-standard');
    var premiumList = document.getElementById('models-premium');
    if (!meta) return;
    if (standardList) renderList(standardList, []);
    if (premiumList) renderList(premiumList, []);
    setMeta(meta, 'could not load models (' + err.message + ')', true);
  }

  async function init() {
    setLoadingPlaceholders();

    var meta = document.getElementById('models-meta');
    if (meta) setMeta(meta, 'fetching GET /v1/models…', false);

    try {
      var res = await fetch(ENDPOINT, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      var models = parseModels(await res.json());
      if (!models.length) throw new Error('empty model list');

      var pools = splitChartPools(models);
      var featured = pickFeatured(pools);

      applyFeaturedModels(featured, 'live');
      applyRandomChartIds(pools, 'live');
      renderHubLists(pools);
      wireAllLiveModelCopy();
    } catch (err) {
      applyFeaturedModels(FALLBACK, 'fallback');
      document.querySelectorAll('.live-model-id-random').forEach(function (el) {
        el.textContent = FALLBACK.primary;
        el.setAttribute('data-state', 'fallback');
        wireLiveModelCopy(el);
      });
      wireAllLiveModelCopy();
      renderHubError(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
