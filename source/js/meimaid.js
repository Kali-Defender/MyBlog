// source/js/mermaid.js
mermaid.initialize({
  startOnLoad: true,
  theme: 'default'
});
document.addEventListener('pjax:complete', function(){
  mermaid.init(undefined, document.querySelectorAll('.mermaid'));
})
