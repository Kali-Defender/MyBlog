document.addEventListener('DOMContentLoaded', function () {
  const PLACEHOLDER_TEXT = "搜索后端｜AI｜虚拟机｜操作系统笔记";
  const hotList = [
    { word: "JavaSE", show: "JavaSE" },
    { word: "VMware", show: "VMware虚拟机排错" },
    { word: "机器学习", show: "机器学习" },
    { word: "MySQL", show: "MySQL数据库" },
    { word: "操作系统", show: "操作系统笔记" },
    { word: "Git", show: "Git配置" }
  ];

  // 通用执行逻辑
  function buildSearchHot() {
    const searchInput = document.querySelector('.search-dialog input[type="text"]');
    if (!searchInput) return false;

    // 修改占位文字
    searchInput.placeholder = PLACEHOLDER_TEXT;

    // 防止重复创建
    if(document.querySelector('.search-hot-keyword')) return true;

    const wrap = document.createElement('div');
    wrap.className = 'search-hot-keyword';
    wrap.innerHTML = `<span class="search-hot-label">热门搜索：</span>`;

    hotList.forEach(item => {
      const tag = document.createElement('span');
      tag.className = 'search-hot-tag';
      tag.innerText = item.show;
      tag.dataset.word = item.word;
      tag.onclick = function () {
        searchInput.value = this.dataset.word;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      wrap.appendChild(tag);
    })

    const inputWrap = document.querySelector('.search-wrap');
    if(inputWrap) inputWrap.after(wrap);
    return true;
  }

  // ========== 方案：轮询检测弹窗（彻底摆脱按钮选择器依赖，最稳！）==========
  setInterval(function(){
    const dialog = document.querySelector('.search-dialog');
    if(dialog){
      buildSearchHot();
    }
  }, 500);
})
