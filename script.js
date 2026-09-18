'use strict';

// Each edge is undirected. Every stage is connected and has zero or two odd-degree vertices.
const stages = [
  { name: 'はじめの三角', nodes: [[200,65],[80,285],[320,285]], edges: [[0,1],[1,2],[2,0]] },
  { name: '小さなおうち', nodes: [[200,45],[90,145],[310,145],[90,285],[310,285]], edges: [[0,1],[0,2],[1,2],[1,3],[3,4],[4,2]] },
  { name: '斜めのよりみち', nodes: [[200,45],[90,145],[310,145],[90,285],[310,285]], edges: [[0,1],[0,2],[1,2],[1,3],[3,4],[4,2],[3,2]] },
  { name: '六角のひみつ', nodes: [[200,40],[325,110],[325,250],[200,320],[75,250],[75,110]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,2],[2,4],[4,0]] },
  { name: '最後のよりみち', nodes: [[75,55],[200,55],[325,55],[75,180],[200,180],[325,180],[75,305],[200,305],[325,305]], edges: [[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[0,3],[3,6],[1,4],[4,7],[2,5],[5,8],[1,3],[5,7]] }
];
const board = document.querySelector('#board');
const message = document.querySelector('#message');
const nextButton = document.querySelector('#next');
const progress = document.querySelector('.progress');
const NS = 'http://www.w3.org/2000/svg';
let stageIndex = 0;
let current = null;
let used = new Set();
let visited = new Set();
let pointerId = null;
let lastHit = null;

function svgElement(tag, attrs) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}
function announce(text, type = '') {
  message.textContent = text;
  message.className = type;
}
function render() {
  const stage = stages[stageIndex];
  board.replaceChildren();
  stage.edges.forEach(([a,b], index) => {
    board.append(svgElement('line', { x1: stage.nodes[a][0], y1: stage.nodes[a][1], x2: stage.nodes[b][0], y2: stage.nodes[b][1], class: `edge${used.has(index) ? ' used' : ''}` }));
  });
  stage.nodes.forEach(([x,y], index) => {
    const node = svgElement('g', { class: `node${visited.has(index) ? ' visited' : ''}${current === index ? ' current' : ''}`, transform: `translate(${x} ${y})`, tabindex: '0', role: 'button', 'aria-label': `頂点${index + 1}${current === index ? '、現在地' : ''}`, 'data-node': index });
    node.append(svgElement('circle', { r: 25, fill: 'transparent' }), svgElement('circle', { r: 23, class: 'halo' }), svgElement('circle', { r: 16, class: 'dot' }));
    const label = svgElement('text', { 'text-anchor': 'middle', dy: '.35em' });
    label.textContent = index + 1;
    node.append(label);
    board.append(node);
  });
  document.querySelector('#used-count').textContent = used.size;
  document.querySelector('#total-count').textContent = ` / ${stage.edges.length}`;
  document.querySelector('#progress-fill').style.width = `${used.size / stage.edges.length * 100}%`;
  progress.setAttribute('aria-valuenow', used.size);
  progress.setAttribute('aria-valuemax', stage.edges.length);
  nextButton.disabled = used.size !== stage.edges.length;
}
function choose(index) {
  const stage = stages[stageIndex];
  if (used.size === stage.edges.length || index === current) return;
  if (current === null) {
    current = index;
    visited.add(index);
    announce('スタート！ 線でつながった隣の点へ進もう。');
  } else {
    const edge = stage.edges.findIndex(([a,b]) => (a === current && b === index) || (b === current && a === index));
    if (edge === -1) return announce('線でつながっている隣の点を選んでね。', 'warning');
    if (used.has(edge)) return announce('その線は通過済み。まだ通っていない線を選ぼう。', 'warning');
    used.add(edge);
    current = index;
    visited.add(index);
    if (used.size === stage.edges.length) {
      announce(stageIndex === stages.length - 1 ? '全5ステージクリア！ すべての線がつながりました。' : 'クリア！ きれいな一筆ができました。', 'success');
    } else if (!stage.edges.some(([a,b], i) => !used.has(i) && (a === current || b === current))) {
      announce('行き止まり！ 「やり直す」で、別の順番や出発点を試そう。', 'warning');
    } else announce('いい調子。まだ通っていない線をつなごう。');
  }
  render();
}
function startStage() {
  current = null;
  used = new Set();
  visited = new Set();
  pointerId = null;
  lastHit = null;
  document.querySelector('#stage-number').textContent = `STAGE ${String(stageIndex + 1).padStart(2, '0')} / 05`;
  document.querySelector('#stage-name').textContent = stages[stageIndex].name;
  nextButton.textContent = stageIndex === stages.length - 1 ? 'もう一度あそぶ ↺' : '次のステージ →';
  announce('好きな点を選んで、はじめよう。');
  render();
}
// Convert screen coordinates using the SVG matrix so touch targets stay accurate at any size.
function hitNode(event) {
  const matrix = board.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  const index = stages[stageIndex].nodes.findIndex(([x,y]) => Math.hypot(point.x-x, point.y-y) <= 25);
  return index < 0 ? null : index;
}
board.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
  pointerId = event.pointerId;
  board.setPointerCapture(pointerId);
  lastHit = hitNode(event);
  if (lastHit !== null) choose(lastHit);
});
board.addEventListener('pointermove', event => {
  if (event.pointerId !== pointerId) return;
  const hit = hitNode(event);
  if (hit !== null && hit !== lastHit) choose(hit);
  lastHit = hit;
});
function endPointer(event) {
  if (event.pointerId !== pointerId) return;
  pointerId = null;
  lastHit = null;
}
board.addEventListener('pointerup', endPointer);
board.addEventListener('pointercancel', endPointer);
board.addEventListener('lostpointercapture', endPointer);
board.addEventListener('keydown', event => {
  const node = event.target.closest('[data-node]');
  if (node && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    const index = Number(node.dataset.node);
    choose(index);
    board.querySelector(`[data-node="${index}"]`).focus();
  }
});
// Support synthesized clicks from assistive technology without duplicating pointer input.
board.addEventListener('click', event => {
  if (event.detail !== 0) return;
  const node = event.target.closest('[data-node]');
  if (node) choose(Number(node.dataset.node));
});
document.querySelector('#reset').addEventListener('click', startStage);
nextButton.addEventListener('click', () => {
  if (used.size !== stages[stageIndex].edges.length) return;
  stageIndex = (stageIndex + 1) % stages.length;
  startStage();
});
startStage();

// Record one visit per page load without waiting for the response or retrying.
try {
  fetch('https://script.google.com/macros/s/AKfycbxssCIHsD-N97SHxNC_GN0ihYeC0qy-lb-EY0KmSs6Gnztaph1sITMerLVEnNWOGkYc/exec?app=one-stroke-puzzle', {
    method: 'GET',
    mode: 'no-cors',
    cache: 'no-store',
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
} catch {
  // Access logging must never interrupt the game.
}
