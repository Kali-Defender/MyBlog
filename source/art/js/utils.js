/**
 * 生活札记 utils.js 全板块统一嵌套架构版
 * movie/music/book：主体嵌套多篇感想；thought：扁平单条
 */
const Utils = (() => {
  let modalContainer = null;
  let modalMask = null;
  let modalContentBox = null;
  let tipToast = null;

  // 1 数据加载
  async function loadJson(fileName) {
    try {
      const res = await fetch(`/art/data/${fileName}`);
      if (!res.ok) throw new Error(`文件${fileName} 404`);
      const data = await res.json();
      return data;
    } catch (err) {
      showTip(`数据加载失败：${err.message}`, 3500);
      console.error(err);
      return [];
    }
  }

  // 根据主体id 获取嵌套主体(movie/music/book)
  async function getMainItemById(mainId, type) {
    const map = {
      movie: "movies.json",
      music: "music.json",
      book: "books.json"
    };
    const list = await loadJson(map[type]);
    return list.find(item => item.id === mainId) || null;
  }

  // 获取扁平随笔单条
  async function getThoughtById(articleId) {
    const list = await loadJson("thoughts.json");
    return list.find(item => item.id === articleId) || null;
  }

  // 加载全部数据
  async function loadAllData() {
    const [movies, music, books, thoughts] = await Promise.all([
      loadJson("movies.json"),
      loadJson("music.json"),
      loadJson("thoughts.json"),
      loadJson("books.json")
    ]);
    return { movies, music, books, thoughts };
  }

  // 2 日期格式化
  function formatDate(dateStr) {
    if (!dateStr) return "未知日期";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}年${m}月${day}`;
  }

  // 3 全局弹窗初始化
  function initModal() {
    if (modalContainer) return;
    modalContainer = document.createElement("div");
    modalContainer.style = `position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:24px`;
    modalMask = document.createElement("div");
    modalMask.style = `position:absolute;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px)`;
    modalContentBox = document.createElement("div");
    modalContentBox.className = "glass-card modal-content";
    modalContentBox.style = `width:100%;max-width:720px;max-height:85vh;overflow-y:auto;padding:28px;position:relative`;

    const footer = document.createElement("div");
    footer.className = "modal-footer";
    footer.style = "margin-top:24px;display:flex;justify-content:flex-end;gap:12px";
    const btn = document.createElement("button");
    btn.className = "modal-full-btn";
    btn.textContent = "查看完整感想";
    btn.style = "padding:8px 18px;border:none;border-radius:8px;background:rgba(255,255,255,0.12);color:#f7f8fc;transition:0.28s ease-out";
    btn.onmouseover = () => btn.style.background = "rgba(255,255,255,0.2)";
    btn.onmouseout = () => btn.style.background = "rgba(255,255,255,0.12)";
    footer.appendChild(btn);
    modalContentBox.appendChild(footer);
    modalContainer.append(modalMask, modalContentBox);
    document.body.appendChild(modalContainer);

    modalMask.onclick = closeModal;
    document.onkeydown = e => e.key === "Escape" && closeModal();
  }

  // 弹窗渲染：区分嵌套主体 / 扁平随笔
  function openModal(item) {
    initModal();
    modalContainer.style.display = "flex";
    const footer = modalContentBox.querySelector(".modal-footer");
    modalContentBox.innerHTML = "";
    modalContentBox.appendChild(footer);
    const wrap = document.createElement("div");
    wrap.className = "modal-body";
    wrap.style.marginBottom = "20px";

    // 分支1：嵌套主体 movie/music/book（带articles数组）
    if (Array.isArray(item.articles)) {
      // 封面
      if (item.cover) {
        const img = document.createElement("img");
        img.src = item.cover;
        img.loading = "lazy";
        img.style = "max-width:220px;margin:0 auto 16px;border-radius:10px";
        img.onerror = () => img.remove();
        wrap.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.style = "width:220px;height:140px;margin:0 auto 16px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:#888ca0;border-radius:10px";
        placeholder.textContent = "暂无封面";
        wrap.appendChild(placeholder);
      }

      const title = document.createElement("h3");
      title.style.fontSize = "1.4rem";
      title.style.marginBottom = "8px";
      title.textContent = item.title;
      wrap.appendChild(title);

      const dateLine = document.createElement("p");
      dateLine.style.color = "var(--text-weak)";
      dateLine.style.fontSize = "0.9rem";
      dateLine.textContent = `记录日期：${formatDate(item.recordDate)}`;
      wrap.appendChild(dateLine);

      // 标签
      const tagBox = renderTagList(item.tags);
      tagBox.style.marginBottom = "12px";
      wrap.appendChild(tagBox);

      // 分类拓展信息
      if (item.type === "movie") {
        const ext = document.createElement("p");
        ext.style.color = "var(--text-weak)";
        ext.textContent = `导演：${item.director} | 上映年份：${item.year}`;
        wrap.appendChild(ext);
      }
      if (item.type === "music") {
        const iframeWrap = document.createElement("div");
        iframeWrap.style = "margin:16px 0;width:100%;aspect-ratio:16/9";
        const iframe = document.createElement("iframe");
        iframe.src = `https://player.bilibili.com/player.html?bvid=${item.bvid}&as_wide=1`;
        iframe.style = "width:100%;height:100%;border:none;border-radius:8px;filter:brightness(0.92)";
        iframe.allow = "autoplay;fullscreen";
        iframeWrap.appendChild(iframe);
        wrap.appendChild(iframeWrap);
      }
      if (item.type === "book") {
        const ext = document.createElement("p");
        ext.style.color = "var(--text-weak)";
        ext.textContent = `作者：${item.author}`;
        wrap.appendChild(ext);
      }

      // 简介
      const summary = document.createElement("p");
      summary.style.marginTop = "12px";
      summary.style.lineHeight = "1.7";
      summary.textContent = item.summary;
      wrap.appendChild(summary);

      // 感想数量
      const countTip = document.createElement("p");
      countTip.style.marginTop = "16px";
      countTip.style.color = `var(--color-${item.type})`;
      countTip.textContent = `共${item.articles.length}篇感想`;
      wrap.appendChild(countTip);

      modalContentBox.prepend(wrap);
      // 跳转详情页 传主体ID
      modalContentBox.querySelector(".modal-full-btn").onclick = () => {
        window.location.href = `/art/article/index.html?id=${item.id}&type=${item.type}`;
        closeModal();
      };
    }
    // 分支2：扁平随笔 thought
    else {
      if (item.cover) {
        const img = document.createElement("img");
        img.src = item.cover;
        img.loading = "lazy";
        img.style = "max-width:220px;margin:0 auto 16px;border-radius:10px";
        img.onerror = () => img.remove();
        wrap.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.style = "width:220px;height:140px;margin:0 auto 16px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:#888ca0;border-radius:10px";
        placeholder.textContent = "无封面随笔";
        wrap.appendChild(placeholder);
      }
      const title = document.createElement("h3");
      title.style.fontSize = "1.4rem";
      title.textContent = item.title;
      wrap.appendChild(title);

      const dateLine = document.createElement("p");
      dateLine.style.color = "var(--text-weak)";
      dateLine.textContent = `记录日期：${formatDate(item.recordDate)}`;
      wrap.appendChild(dateLine);

      const tagBox = renderTagList(item.tags);
      wrap.appendChild(tagBox);

      const summary = document.createElement("p");
      summary.style.marginTop = "12px";
      summary.textContent = item.summary;
      wrap.appendChild(summary);

      modalContentBox.prepend(wrap);
      // 随笔跳转传单条id
      // 随笔跳转传单条id + type=thought
      modalContentBox.querySelector(".modal-full-btn").onclick = () => {
  // ✅直接写死字符串 "thought"，不要读取item.type
        window.location.href = `/art/article/index.html?id=${item.id}&type=thought`;
        closeModal();
      };
    }
  }

  function closeModal() {
    if (modalContainer) modalContainer.style.display = "none";
  }

  // 标签渲染
  function renderTagList(tags) {
    const wrap = document.createElement("div");
    wrap.style = "display:flex;flex-wrap:wrap;gap:6px";
    if (!Array.isArray(tags) || tags.length === 0) return wrap;
    tags.forEach(tag => {
      const span = document.createElement("span");
      span.style = "padding:3px 10px;border-radius:99px;background:rgba(255,255,255,0.08);font-size:0.8rem;color:#888ca0";
      span.textContent = tag;
      wrap.appendChild(span);
    });
    return wrap;
  }

  // 评分渲染
  function renderScore(num) {
    const wrap = document.createElement("div");
    wrap.style = "display:flex;gap:8px;align-items:center";
    const text = document.createElement("span");
    text.style.color = "var(--color-book)";
    text.textContent = `评分 ${num}/10`;
    wrap.appendChild(text);
    return wrap;
  }

  // 轻提示
  function showTip(text, delay = 2500) {
    if (!tipToast) {
      tipToast = document.createElement("div");
      tipToast.style = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z:9999;padding:10px 22px;border-radius:99px;background:rgba(0,0,0,0.85);color:#f7f8fc;backdrop-filter:blur(8px);opacity:0;transition:0.28s ease-out";
      document.body.appendChild(tipToast);
    }
    clearTimeout(tipToast._timer);
    tipToast.textContent = text;
    tipToast.style.opacity = "1";
    tipToast._timer = setTimeout(() => tipToast.style.opacity = "0", delay);
  }

  // 分页切片预留
  function slicePage(list, page = 1, size = 12) {
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  }

  // 根据路径读取markdown文本
async function loadMarkdown(mdUrl) {
  try{
    const res = await fetch(mdUrl);
    if(!res.ok) throw new Error("md文件不存在");
    let mdText = await res.text();
    // 简易渲染：换行、标题基础转换（极简版，够用）
    mdText = mdText.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    mdText = mdText.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    mdText = mdText.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
    mdText = mdText.replaceAll('\n', '<br>');
    return mdText;
  }catch(err){
    return "<p>感想正文加载失败</p>";
  }
}


  return {
    loadJson,
    loadMarkdown,
    getMainItemById,
    getThoughtById,
    loadAllData,
    formatDate,
    openModal,
    closeModal,
    renderTagList,
    renderScore,
    showTip,
    slicePage
  };
})();
