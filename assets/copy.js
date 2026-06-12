var COPY_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">' +
  '<rect x="5.5" y="5.5" width="8" height="8" rx="1"></rect>' +
  '<path d="M3.5 10.5V3.5a1 1 0 0 1 1-1h7"></path>' +
  '</svg>';

var CHECK_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
  '<path d="M3.5 8.5l3 3 6-6"></path>' +
  '</svg>';

function flashCopyIcon(btn) {
  if (!btn) return;
  btn.classList.add('copied');
  btn.innerHTML = CHECK_ICON_SVG;
  setTimeout(function () {
    btn.classList.remove('copied');
    btn.innerHTML = COPY_ICON_SVG;
  }, 1500);
}

function copyText(text, feedbackEl) {
  if (!text || text === 'loading…') return Promise.resolve(false);

  return navigator.clipboard.writeText(text).then(function () {
    if (feedbackEl && feedbackEl.classList.contains('copy-icon-btn')) {
      flashCopyIcon(feedbackEl);
    }
    return true;
  });
}

function createCopyIconButton(getText, label) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-icon-btn';
  btn.setAttribute('aria-label', label || 'Copy');
  btn.innerHTML = COPY_ICON_SVG;
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var text = typeof getText === 'function' ? getText() : getText;
    copyText(text, btn);
  });
  return btn;
}

function attachCopyIconToModelEl(el) {
  if (el.dataset.copyWired) return;
  el.dataset.copyWired = '1';

  var host = el.closest('code.inline') || el.parentElement;
  if (!host || host.querySelector('.copy-icon-btn')) return;

  host.classList.add('live-model-chip');
  host.appendChild(createCopyIconButton(function () {
    if (el.getAttribute('data-state') === 'loading') return '';
    return el.textContent.trim();
  }, 'Copy model ID'));
}

function copyFromModelEl(el) {
  return copyText(el.textContent.trim());
}

function copyFromEl(id, btn) {
  var text = document.getElementById(id).textContent;
  return copyText(text).then(function (ok) {
    if (ok) flashCopyIcon(btn);
  });
}

function initCopyButtons() {
  document.querySelectorAll('.copy-button').forEach(function (btn) {
    if (btn.dataset.iconWired) return;
    btn.dataset.iconWired = '1';
    btn.textContent = '';
    btn.setAttribute('aria-label', 'Copy');
    btn.classList.add('copy-icon-btn');
    btn.innerHTML = COPY_ICON_SVG;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCopyButtons);
} else {
  initCopyButtons();
}
