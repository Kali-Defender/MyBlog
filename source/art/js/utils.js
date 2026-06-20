/**
 * 艺术馆公共工具函数
 * 提供 Toast 提示、图片加载错误处理、时长格式化等
 */

(function(window) {
  'use strict';

  // 确保 art 命名空间存在
  window.art = window.art || {};

  const utils = {};

  /**
   * 显示 Toast 提示
   * @param {string} message - 提示文字
   * @param {number} [duration=2500] - 显示时长(ms)
   */
  utils.showToast = function(message, duration) {
    duration = duration || 2500;

    // 移除已有的 toast
    const existing = document.querySelector('.art-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'art-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 强制回流后添加显示类
    void toast.offsetWidth;
    toast.classList.add('art-show');

    setTimeout(function() {
      toast.classList.remove('art-show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  };

  /**
   * 处理图片加载错误（占位显示）
   * @param {HTMLImageElement} img - 图片元素
   * @param {string} [fallbackText='无封面'] - 备用文字
   */
  utils.handleImageError = function(img, fallbackText) {
    if (!img) return;
    fallbackText = fallbackText || '无封面';

    // 避免重复处理
    if (img.classList.contains('art-img-error')) return;

    img.classList.add('art-img-error');
    img.alt = fallbackText;

    // 尝试替换为纯色占位 SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#5c3d2e"/>
      <text x="200" y="200" text-anchor="middle" dy=".35em" fill="#d4a373" font-size="18" font-family="Georgia,serif">${fallbackText}</text>
    </svg>`;

    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  /**
   * 将秒数格式化为 mm:ss 或 hh:mm:ss
   * @param {number} totalSeconds - 总秒数
   * @returns {string}
   */
  utils.formatDuration = function(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '--:--';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = function(num) { return num.toString().padStart(2, '0'); };

    if (hours > 0) {
      return hours + ':' + pad(minutes) + ':' + pad(seconds);
    }
    return pad(minutes) + ':' + pad(seconds);
  };

  // 暴露到全局 art 命名空间
  window.art.utils = utils;

})(window);