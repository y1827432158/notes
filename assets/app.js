/* 算法刷题知识点 — 静态笔记站
   零依赖：笔记是 Markdown，页面端渲染。 */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const BASE = 'notes/';

  const state = {
    meta: null,
    chapters: [],          // { id, file, title, sections, md, lines }
    byId: new Map(),
    current: null,
    query: '',
  };

  /* ---------- 小工具 ---------- */

  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));

  const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} 加载失败（HTTP ${res.status}）`);
    return res.text();
  }

  /* ---------- Markdown 渲染 ---------- */

  // 公式先抽成占位符，避免 marked 把 _ ^ * 当成 Markdown 语法；
  // 代码片段（``` 和 `）跳过，免得 $ 被误认成公式。
  function renderMarkdown(md) {
    const store = [];
    const stash = (s) => {
      store.push(s);
      return '' + (store.length - 1) + '';
    };

    const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/);
    for (let i = 0; i < parts.length; i += 2) {
      parts[i] = parts[i]
        .replace(/\$\$[\s\S]+?\$\$/g, stash)
        .replace(/(?<![\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, stash);
    }

    let html = marked.parse(parts.join(''));
    // 还原公式：转义后塞回去，随后交给 KaTeX
    html = html.replace(/(\d+)/g, (_, i) => escapeHtml(store[+i]));
    return html;
  }

  /* ---------- 解析一篇笔记 ---------- */

  function parseDoc(file, md) {
    const lines = md.split('\n');
    const sections = [];
    let title = null;
    let inFence = false;

    for (const line of lines) {
      if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
      if (inFence) continue;

      let m;
      if (!title && (m = line.match(/^#\s+(.+?)\s*$/))) {
        title = m[1];
      } else if ((m = line.match(/^##\s+(.+?)\s*$/))) {
        sections.push({ title: m[1], id: null });
      }
    }

    // 小节 id：标题里有编号（1.1）就用编号，否则退化成 s0/s1
    sections.forEach((sec, i) => {
      const m = sec.title.match(/^(\d+(?:\.\d+)*)/);
      sec.id = m ? m[1] : 's' + i;
    });

    return {
      id: file.replace(/\.md$/, ''),
      file,
      title: title || file,
      sections,
      md,
      lines,
    };
  }

  /* ---------- 目录树 ---------- */

  function renderToc() {
    const toc = $('#toc');
    toc.innerHTML = '';

    state.chapters.forEach((ch, i) => {
      const group = document.createElement('div');
      group.className = 'toc-group';
      group.dataset.id = ch.id;

      const head = document.createElement('div');
      head.className = 'toc-ch';
      head.innerHTML = `<span class="idx">${String(i + 1).padStart(2, '0')}</span><span>${escapeHtml(ch.title)}</span>`;
      head.addEventListener('click', () => { location.hash = '#/' + ch.id; });
      group.appendChild(head);

      if (ch.sections.length) {
        const ul = document.createElement('ul');
        ul.className = 'toc-secs';
        ch.sections.forEach((sec) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#/${ch.id}/${encodeURIComponent(sec.id)}`;
          a.textContent = sec.title;
          a.dataset.sec = sec.id;
          li.appendChild(a);
          ul.appendChild(li);
        });
        group.appendChild(ul);
      }

      toc.appendChild(group);
    });

    $('#metaInfo').innerHTML = (state.meta && state.meta.subtitle
      ? escapeHtml(state.meta.subtitle) + '<br>' : '')
      + `${state.chapters.length} 章 · ${state.chapters.reduce((n, c) => n + c.sections.length, 0)} 个知识点`;
  }

  function markActive(chapterId, sectionId) {
    document.querySelectorAll('.toc-ch').forEach((el) => {
      el.classList.toggle('active', el.parentElement.dataset.id === chapterId);
    });
    document.querySelectorAll('.toc-group').forEach((el) => {
      el.classList.toggle('open', el.dataset.id === chapterId);
    });
    document.querySelectorAll('.toc-secs a').forEach((el) => {
      el.classList.toggle('active', !!sectionId && el.dataset.sec === sectionId);
    });
  }

  /* ---------- 渲染章节 ---------- */

  function enhance(doc) {
    // 代码高亮 + 复制按钮
    doc.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      if (code && window.hljs) {
        try { hljs.highlightElement(code); } catch (_) { /* 高亮失败不影响阅读 */ }
      }
      if (pre.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = '复制';
      btn.addEventListener('click', async () => {
        const text = (code || pre).innerText;
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (__) { /* 忽略 */ }
          ta.remove();
        }
        btn.textContent = '已复制';
        btn.classList.add('done');
        setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('done'); }, 1400);
      });
      pre.appendChild(btn);
    });

    // 表格套一层，窄屏时自己横向滚动
    doc.querySelectorAll('table').forEach((t) => {
      if (t.parentElement.classList.contains('table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });

    // 数学公式
    if (window.renderMathInElement) {
      try {
        renderMathInElement(doc, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
          ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
        });
      } catch (_) { /* 忽略 */ }
    }
  }

  function renderChapter(ch) {
    const doc = $('#doc');
    doc.innerHTML = renderMarkdown(ch.md);

    // 给 h2 挂上 id，供锚点跳转
    doc.querySelectorAll('h2').forEach((h, i) => {
      if (ch.sections[i]) h.id = ch.sections[i].id;
    });

    enhance(doc);
    doc.appendChild(buildPager(ch));
  }

  function buildPager(ch) {
    const idx = state.chapters.indexOf(ch);
    const prev = state.chapters[idx - 1];
    const next = state.chapters[idx + 1];
    const nav = document.createElement('nav');
    nav.className = 'pager';

    const mk = (target, dir, cls) => {
      const a = document.createElement('a');
      a.href = '#/' + target.id;
      a.className = cls;
      a.innerHTML = `<span class="dir">${dir}</span><span class="ttl">${escapeHtml(target.title)}</span>`;
      return a;
    };

    if (prev) nav.appendChild(mk(prev, '← 上一篇', 'prev'));
    else nav.appendChild(Object.assign(document.createElement('span'), { className: 'spacer' }));

    if (next) nav.appendChild(mk(next, '下一篇 →', 'next'));
    else nav.appendChild(Object.assign(document.createElement('span'), { className: 'spacer' }));

    return nav;
  }

  /* ---------- 搜索 ---------- */

  function runSearch(q) {
    const needle = q.trim().toLowerCase();
    const hits = [];
    if (!needle) return hits;

    for (const ch of state.chapters) {
      let inFence = false;
      for (let i = 0; i < ch.lines.length; i++) {
        const raw = ch.lines[i];
        if (/^\s*```/.test(raw)) { inFence = !inFence; continue; }
        if (inFence || !raw.trim()) continue;
        if (raw.toLowerCase().includes(needle)) {
          hits.push({ ch, line: raw.trim(), mono: raw.trim().length < 40 });
        }
      }
    }
    return hits;
  }

  function renderSearch(q) {
    const hits = runSearch(q);
    const doc = $('#doc');
    const re = new RegExp(escapeReg(q.trim()), 'gi');

    let html = `<p class="search-head">「<b>${escapeHtml(q.trim())}</b>」找到 <b>${hits.length}</b> 处`
      + (hits.length > 80 ? '（只显示前 80 条）' : '') + '</p>';

    if (!hits.length) {
      html += '<div class="loading">没找到。换个关键词试试，比如「哈希」「位运算」「auto」。</div>';
      doc.innerHTML = html;
      return;
    }

    html += hits.slice(0, 80).map((h, i) => {
      const text = escapeHtml(h.line).replace(re, (m) => `<mark>${m}</mark>`);
      return `<a class="hit" data-i="${i}" href="#/${h.ch.id}">`
        + `<span class="hit-ch">${escapeHtml(h.ch.title)}</span>`
        + `<span class="hit-text${h.mono ? ' mono' : ''}">${text}</span></a>`;
    }).join('');

    doc.innerHTML = html;

    doc.querySelectorAll('.hit').forEach((el) => {
      const h = hits[+el.dataset.i];
      // 点结果先跳章节，再滚到对应小节
      el.addEventListener('click', () => {
        const sec = h.ch.sections.find((s) =>
          h.line.includes(s.title) || s.title.includes(h.line.slice(0, 12)));
        sessionStorage.setItem('pendingSec', sec ? sec.id : '');
      });
    });
  }

  /* ---------- 路由 ---------- */

  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const [chapterId, sectionId] = hash.split('/');

    closeSidebar();

    if (!chapterId) {
      location.replace('#/' + state.chapters[0].id);
      return;
    }

    const ch = state.byId.get(chapterId) || state.chapters[0];
    if (ch !== state.current) {
      state.current = ch;
      renderChapter(ch);
    }

    // 待跳转的小节（来自搜索结果）
    const pending = sessionStorage.getItem('pendingSec');
    sessionStorage.removeItem('pendingSec');
    const target = sectionId || pending;

    markActive(ch.id, target);

    if (target) {
      const el = document.getElementById(target);
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
        return;
      }
    }
    window.scrollTo({ top: 0 });
  }

  /* ---------- 主题 ---------- */

  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'auto') html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', theme);

    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#hljsDark').disabled = !dark;
    $('#hljsLight').disabled = dark;
    localStorage.setItem('theme', theme);
  }

  function toggleTheme() {
    const cur = localStorage.getItem('theme') || 'auto';
    const dark = cur === 'dark' || (cur === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(dark ? 'light' : 'dark');
  }

  /* ---------- 侧栏抽屉 ---------- */

  const openSidebar = () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); };
  const closeSidebar = () => { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); };

  /* ---------- 启动 ---------- */

  async function init() {
    applyTheme(localStorage.getItem('theme') || 'auto');

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#menuBtn').addEventListener('click', () => {
      $('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
    });
    $('#scrim').addEventListener('click', closeSidebar);

    const input = $('#searchInput');
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.query = input.value;
        if (state.query.trim()) {
          renderSearch(state.query);
          markActive(null, null);
          history.replaceState(null, '', '#/');
          window.scrollTo({ top: 0 });
        } else {
          route();
        }
      }, 160);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; input.blur(); state.query = ''; route(); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });

    window.addEventListener('hashchange', route);

    const toTop = $('#toTop');
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('show', window.scrollY > 400);
    }, { passive: true });

    // 载入笔记
    try {
      marked.setOptions({ gfm: true, breaks: false });
      const manifest = JSON.parse(await fetchText(BASE + 'manifest.json'));
      const docs = await Promise.all(manifest.files.map(async (f) => parseDoc(f, await fetchText(BASE + f))));

      state.meta = manifest;
      state.chapters = docs;
      state.byId = new Map(docs.map((d) => [d.id, d]));
      document.title = manifest.title || document.title;

      renderToc();
      route();
    } catch (err) {
      $('#doc').innerHTML = `<div class="error">笔记加载失败：${escapeHtml(err.message)}<br>`
        + '本地直接双击 index.html 打不开（浏览器禁止读本地文件），'
        + '请在当前目录执行 <code>python -m http.server</code> 后访问 http://localhost:8000</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
