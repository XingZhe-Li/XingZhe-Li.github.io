const ROW_HEIGHT = 44;
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

/** A scroll-snap listbox: click, mouse wheel, touch, and keyboard share one value. */
export function createWheel(host, {id, label, items = [], value = null, onChange, placeholder = '请选择'}) {
  let options = [], selectedIndex = 0, disabled = false, frame = 0;
  host.innerHTML = `<div class="wheel-frame"><div class="wheel-band" aria-hidden="true"></div><div class="wheel-scroll" id="${id}" role="listbox" aria-label="${escape(label)}" tabindex="0"></div></div><p class="wheel-instruction">滚动或用 ↑ ↓ 选择</p>`;
  const list = host.querySelector('.wheel-scroll');
  const update = () => {
    for (const row of list.querySelectorAll('[data-wheel-index]')) {
      const index = Number(row.dataset.wheelIndex);
      row.classList.toggle('active', index === selectedIndex);
      row.setAttribute('aria-selected', String(index === selectedIndex));
    }
    list.setAttribute('aria-activedescendant', `${id}-option-${selectedIndex}`);
  };
  const select = (index, notify = true) => {
    if (disabled || !options.length) return;
    index = Math.max(0, Math.min(options.length - 1, index));
    const changed = index !== selectedIndex;
    selectedIndex = index; update();
    if (changed && notify) onChange?.(options[index].value);
  };
  const onScroll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => select(Math.round(list.scrollTop / ROW_HEIGHT)));
  };
  const onClick = event => {
    const row = event.target.closest('[data-wheel-index]');
    if (!row || disabled) return;
    const index = Number(row.dataset.wheelIndex);
    select(index); list.scrollTop = index * ROW_HEIGHT; list.focus({preventScroll:true});
  };
  const onKey = event => {
    const delta = {ArrowDown:1, ArrowUp:-1, PageDown:4, PageUp:-4}[event.key];
    if (delta === undefined && !['Home','End','Enter',' '].includes(event.key)) return;
    event.preventDefault();
    if (disabled) return;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : selectedIndex + (delta || 0);
    select(index); list.scrollTop = selectedIndex * ROW_HEIGHT;
  };
  list.addEventListener('scroll', onScroll, {passive:true});
  list.addEventListener('click', onClick);
  list.addEventListener('keydown', onKey);
  const setItems = (nextItems, nextValue = null) => {
    cancelAnimationFrame(frame);
    options = [{value:null,label:placeholder}, ...nextItems];
    selectedIndex = Math.max(0, options.findIndex(item => item.value === nextValue));
    list.innerHTML = `<div class="wheel-padding" aria-hidden="true"></div>${options.map((item,index)=>`<div class="wheel-option ${index === 0 ? 'placeholder-option' : ''} ${item.label.length>5?'long-option':''}" id="${id}-option-${index}" role="option" aria-selected="false" data-wheel-index="${index}"><span>${escape(item.label)}</span>${item.detail ? `<small>${escape(item.detail)}</small>` : ''}</div>`).join('')}<div class="wheel-padding" aria-hidden="true"></div>`;
    list.scrollTop = selectedIndex * ROW_HEIGHT; update();
  };
  setItems(items, value);
  return {
    setItems,
    setDisabled(next) {
      disabled = next; list.setAttribute('aria-disabled', String(next));
      list.tabIndex = next ? -1 : 0; host.classList.toggle('wheel-disabled', next);
    },
    destroy() {
      cancelAnimationFrame(frame);
      list.removeEventListener('scroll', onScroll); list.removeEventListener('click', onClick); list.removeEventListener('keydown', onKey);
    },
  };
}
