/* GitHub 风格提交热力图（博客仓库版）
 * 数据源：GitHub 官方 commits 接口，统计指定仓库近一年的提交活跃度。
 * 无需 token，但未鉴权限流为 60 次/小时/IP，个人博客足够用。
 */
(function () {
  'use strict';

  var CELL_SIZE = 10; // 与 gh-heatmap.css 中 --gh-cell-size 保持一致
  var CELL_GAP = 2;   // 与 --gh-cell-gap 保持一致
  var STRIDE = CELL_SIZE + CELL_GAP;
  var DAY_MS = 86400000;
  var TZ_OFFSET_HOURS = 8; // Asia/Shanghai，按需修改
  var MAX_PAGES = 5;       // 最多拉取页数（每页 100 条，共 500 条，防死循环）

  // 把 UTC 时间转成目标时区的 YYYY-MM-DD
  function localKey(iso) {
    if (!iso) return '';
    return new Date(new Date(iso).getTime() + TZ_OFFSET_HOURS * 3600000).toISOString().slice(0, 10);
  }

  function todayKey() {
    return localKey(new Date().toISOString());
  }

  function addDays(dateKey, delta) {
    var d = new Date(dateKey + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  // 拉取仓库提交，自动跟随 Link 分页
  function fetchCommits(repo, sinceIso) {
    var base = 'https://api.github.com/repos/' + repo + '/commits?since=' + sinceIso + '&per_page=100';
    var all = [];
    function load(url) {
      return fetch(url).then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var link = resp.headers.get('Link') || '';
        return resp.json().then(function (page) {
          all = all.concat(page);
          var m = /<([^>]+)>;\s*rel="next"/.exec(link);
          if (m && page.length === 100 && all.length < MAX_PAGES * 100) {
            return load(m[1]);
          }
          return all;
        });
      });
    }
    return load(base);
  }

  // 用四分位计算色阶（GitHub 绿板同款算法）
  function buildLevelFn(counts) {
    var vals = counts.filter(function (c) { return c > 0; }).sort(function (a, b) { return a - b; });
    if (!vals.length) {
      return function () { return 0; };
    }
    var uniq = [];
    vals.forEach(function (v) { if (uniq[uniq.length - 1] !== v) uniq.push(v); });
    var t = [
      uniq[Math.floor(uniq.length * 0.25)],
      uniq[Math.floor(uniq.length * 0.5)],
      uniq[Math.floor(uniq.length * 0.75)]
    ].filter(function (v, i, a) { return v != null && a.indexOf(v) === i; })
      .sort(function (a, b) { return a - b; });
    return function (count) {
      if (count <= 0) return 0;
      if (!t.length) return 4;
      if (count <= t[0]) return 1;
      if (t.length >= 2 && count <= t[1]) return 2;
      if (t.length >= 3 && count <= t[2]) return 3;
      return 4;
    };
  }

  function render(grid, monthsEl, list, repo) {
    var first = list[0].date;
    var offset = new Date(first + 'T00:00:00Z').getUTCDay(); // 0=周日
    var weeks = Math.ceil((list.length + offset) / 7);
    var frag = document.createDocumentFragment();

    // 月份标签
    if (monthsEl) {
      monthsEl.style.width = (weeks * STRIDE - CELL_GAP) + 'px';
      monthsEl.innerHTML = '';
      var lastMonth = -1;
      for (var i = 0; i < list.length; i++) {
        var m = parseInt(list[i].date.slice(5, 7), 10);
        if (m !== lastMonth) {
          var label = document.createElement('span');
          label.textContent = m + '月';
          label.style.left = (Math.floor((i + offset) / 7) * STRIDE) + 'px';
          monthsEl.appendChild(label);
          lastMonth = m;
        }
      }
    }

    // 前导空位：第一列从周日对齐
    for (var k = 0; k < offset; k++) {
      var empty = document.createElement('span');
      empty.className = 'gh-cell gh-cell--empty';
      empty.setAttribute('aria-hidden', 'true');
      frag.appendChild(empty);
    }

    // 单元格
    for (var j = 0; j < list.length; j++) {
      var item = list[j];
      var cell = document.createElement('a');
      cell.className = 'gh-cell';
      cell.setAttribute('data-level', item.level);
      cell.title = item.date + '：' + item.count + ' 次提交';
      cell.href = 'https://github.com/' + repo + '/commits/main?since=' + item.date + '&until=' + item.date;
      cell.setAttribute('target', '_blank');
      cell.setAttribute('rel', 'noopener noreferrer');
      frag.appendChild(cell);
    }

    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  function init(el) {
    var repo = (el.getAttribute('data-repo') || '').trim();
    var grid = el.querySelector('.gh-heatmap__grid');
    if (!repo || !grid) {
      return;
    }

    var monthsEl = el.querySelector('.gh-heatmap__months');
    var totalEl = el.querySelector('.gh-heatmap__total');
    var link = el.querySelector('.gh-heatmap__link');
    if (link) {
      link.href = 'https://github.com/' + repo;
    }

    // 多取 2 天，避免时区换算把边界日期的提交漏掉
    var sinceIso = addDays(todayKey(), -366) + 'T00:00:00Z';
    fetchCommits(repo, sinceIso).then(function (commits) {
      var countMap = {};
      commits.forEach(function (c) {
        var d = localKey(c.commit && c.commit.author && c.commit.author.date);
        if (d) {
          countMap[d] = (countMap[d] || 0) + 1;
        }
      });

      // 生成最近 365 天的完整日期序列（无提交的日子补 0）
      var end = todayKey();
      var list = [];
      var counts = [];
      for (var i = 364; i >= 0; i--) {
        var d = addDays(end, -i);
        var count = countMap[d] || 0;
        counts.push(count);
        list.push({ date: d, count: count });
      }

      var levelFn = buildLevelFn(counts);
      list.forEach(function (item) { item.level = levelFn(item.count); });

      if (totalEl) {
        totalEl.textContent = commits.length;
      }

      render(grid, monthsEl, list, repo);
    }).catch(function () {
      el.classList.add('gh-heatmap--error');
      grid.innerHTML = '<span class="gh-heatmap__error">提交数据加载失败，<a href="https://github.com/' + repo + '/commits/main" target="_blank" rel="noopener noreferrer">前往仓库查看</a></span>';
    });
  }

  function boot() {
    var els = document.querySelectorAll('.gh-heatmap');
    for (var i = 0; i < els.length; i++) {
      init(els[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
