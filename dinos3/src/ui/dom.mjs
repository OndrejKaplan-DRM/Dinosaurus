// Drobné pomůcky pro stavbu nabídek bez knihoven.

/** h('button', { class: 'primary', onclick }, 'Text', dalšíUzel) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'hidden' || k === 'disabled' || k === 'checked') el[k] = Boolean(v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
}

export const fmt = (n) => Math.floor(n).toLocaleString('cs-CZ');

/** Prvky, na které může v daném kontejneru přijít fokus, v pořadí na obrazovce. */
export function focusables(container) {
  return [...container.querySelectorAll('button, input, select, [tabindex="0"]')].filter((el) => !el.disabled && el.offsetParent !== null);
}
