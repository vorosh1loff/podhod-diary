import { openStorage, readState, changeState } from './storage.js';
import { today, isDate, validSet, parseBackup, backupOf, plural } from './model.js';
import { icon } from './graphics.js';
import { esc, navigation, journal, calendar, catalog, workoutView, workoutBackLink, dataView, muscleFields, action } from './views.js';

const main = document.querySelector('#content');
const nav = document.querySelector('#nav');
const dialog = document.querySelector('#dialog');
const notice = document.querySelector('#notice');
const status = document.querySelector('#offline-status');
document.documentElement.classList.add('js');
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('podhod-training-diary') : null;
let state;
let pending = false;
let noticeTimer;
let dialogTrigger;
let submitDialog;
let search = '';

function getRoute() {
  const [page, id, fromDate] = location.hash.slice(1).split('/');
  return { page: ['calendar', 'exercises', 'data', 'workout'].includes(page) ? page : 'journal',
    id, fromDate: isDate(fromDate) ? fromDate : null };
}

function findEntry(items, id, label) {
  const entry = items.find(item => item.id === id);
  if (!entry) throw new Error(label + ' уже удалено или изменилось. Обновите страницу.');
  return entry;
}

function removeEntry(items, id) {
  const index = items.findIndex(item => item.id === id);
  if (index >= 0) items.splice(index, 1);
}

function render({ navigate = false } = {}) {
  if (!state) return;
  const { page, id, fromDate } = getRoute();
  nav.innerHTML = navigation(page === 'workout' ? (fromDate ? 'calendar' : 'journal') : page);
  switch (page) {
    case 'calendar':
      main.innerHTML = calendar(state, isDate(id) ? id : today());
      break;
    case 'exercises':
      main.innerHTML = catalog(state);
      if (main.querySelector('#catalog-search')) {
        main.querySelector('#catalog-search').value = search;
        filterRows(main, search);
      }
      break;
    case 'data':
      main.innerHTML = dataView(state, standalone);
      break;
    case 'workout': {
      const workout = state.workouts.find(entry => entry.id === id);
      main.innerHTML = workout ? workoutView(workout, fromDate) : `<h1>Тренировка не найдена</h1>${workoutBackLink(fromDate)}`;
      break;
    }
    default:
      main.innerHTML = journal(state);
  }
  if (navigate) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

function showNotice(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.classList.add('shown');
  noticeTimer = setTimeout(() => notice.classList.remove('shown'), 3500);
}

async function refresh() {
  if (!state || pending) return;
  try {
    const latest = await readState();
    if (latest.revision > state.revision && !pending) {
      state = latest;
      render();
    }
  } catch {
    showNotice('Не удалось прочитать изменения дневника.');
  }
}

async function save(change) {
  state = await changeState(change);
  channel?.postMessage('changed');
}

function restoreFocus(trigger) {
  if (trigger?.isConnected) {
    trigger.focus({ preventScroll: true });
    return;
  }
  if (!trigger) return;
  const match = [...main.querySelectorAll('[data-action]')].find(button =>
    ['action', 'id', 'set'].every(key => button.dataset[key] === trigger.dataset[key]));
  (match || main).focus({ preventScroll: true });
}

function openDialog({ title, content, label = 'Сохранить', danger = false, wide = false, submit, trigger = document.activeElement }) {
  const alreadyOpen = dialog.open;
  if (!alreadyOpen) dialogTrigger = trigger;
  submitDialog = submit;
  dialog.className = wide ? 'sheet wide' : 'sheet';
  dialog.innerHTML = `<div class="sheet-inner">
    <header class="sheet-header"><h2 id="dialog-title">${title}</h2>
      <button class="icon-button" type="button" data-action="close" aria-label="Закрыть">${icon('close')}</button>
    </header>
    <form id="dialog-form">
      <div class="sheet-body">${content}<p class="form-error" id="form-error" role="alert" hidden></p></div>
      ${submit ? `<footer class="sheet-footer">
        ${action('close', 'Отмена')}
        <button type="submit" class="button ${danger ? 'danger' : 'primary'}">${label}</button>
      </footer>` : ''}
    </form>
  </div>`;
  if (!alreadyOpen) dialog.showModal();
  const target = dialog.querySelector('[autofocus], input:not([type=checkbox])') || dialog.querySelector('[data-action=close]');
  target.focus({ preventScroll: true });
}

function failForm(error) {
  const node = dialog.querySelector('#form-error');
  node.textContent = error instanceof Error && !(error instanceof DOMException) ? error.message :
    'Не удалось сохранить данные. Проверьте доступное место и попробуйте ещё раз.';
  node.hidden = false;
  node.scrollIntoView({ block: 'nearest' });
}

dialog.addEventListener('close', () => {
  if (!dialog.open) {
    restoreFocus(dialogTrigger);
    dialogTrigger = null;
  }
});
dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });

dialog.addEventListener('submit', async event => {
  event.preventDefault();
  if (!submitDialog || pending) return;
  const form = event.target;
  const buttons = [...form.querySelectorAll('button'), dialog.querySelector('.sheet-header button')];
  const data = new FormData(form);
  pending = true;
  buttons.forEach(button => { button.disabled = true; });
  dialog.querySelector('#form-error').hidden = true;
  try {
    const result = await submitDialog(data);
    dialog.close();
    if (result?.route) location.hash = result.route;
    else render();
    if (result?.message) showNotice(result.message);
  } catch (error) {
    failForm(error);
  } finally {
    pending = false;
    buttons.forEach(button => { button.disabled = false; });
  }
});

function getName(data) {
  const name = String(data.get('name') ?? '').trim();
  if (!name || name.length > 80) throw new Error('Введите название длиной до 80 символов.');
  return name;
}

function editWorkout(workout) {
  openDialog({
    title: workout ? 'Редактировать тренировку' : 'Новая тренировка',
    content: `<label class="field">Название<input name="name" required maxlength="80" autocomplete="off" value="${esc(workout?.name || '')}" placeholder="Например, Спина и бицепс"></label>
      <label class="field">Дата<input name="date" type="date" required min="1000-01-01" max="9999-12-31" value="${workout?.date || today()}"></label>`,
    label: workout ? 'Сохранить' : 'Создать тренировку',
    submit: async data => {
      const name = getName(data);
      const date = data.get('date');
      if (!isDate(date)) throw new Error('Выберите корректную дату.');
      const id = workout?.id || crypto.randomUUID();
      await save(next => {
        if (workout) Object.assign(findEntry(next.workouts, id, 'Тренировка'), { name, date });
        else next.workouts.unshift({ id, name, date, items: [] });
      });
      return workout ? { message: 'Тренировка обновлена' } : { route: `workout/${id}`, message: 'Тренировка создана' };
    },
  });
}

function attachExercise(workout, exercise) {
  if (workout.items.some(item => item.exerciseId === exercise.id)) throw new Error('Это упражнение уже есть в тренировке.');
  workout.items.push({ ...exercise, exerciseId: exercise.id, id: crypto.randomUUID(), sets: [] });
}

function editExercise(exercise, workout, item) {
  const entry = item || exercise;
  openDialog({
    title: item ? 'Упражнение в тренировке' : exercise ? 'Редактировать упражнение' : 'Новое упражнение',
    wide: true,
    content: `${item ? '<p class="form-hint snapshot-hint">Изменения применятся к этой тренировке.</p>' : ''}
      <label class="field">Название<input name="name" required maxlength="80" autocomplete="off" value="${esc(entry?.name || '')}" placeholder="Например, Тяга гантели"></label>${muscleFields(entry)}`,
    label: workout && !item ? 'Создать и добавить' : 'Сохранить',
    submit: async data => {
      const name = getName(data);
      const primary = data.getAll('primary');
      const secondary = data.getAll('secondary');
      if (!primary.length) throw new Error('Отметьте хотя бы одну основную группу мышц.');
      const updated = { id: entry?.id || crypto.randomUUID(), name, primary, secondary };
      await save(next => {
        if (item) {
          const target = findEntry(next.workouts, workout.id, 'Тренировка');
          Object.assign(findEntry(target.items, item.id, 'Упражнение'), updated);
          return;
        }
        if (exercise) Object.assign(findEntry(next.exercises, exercise.id, 'Упражнение'), updated);
        else next.exercises.push(updated);
        if (workout) attachExercise(findEntry(next.workouts, workout.id, 'Тренировка'), updated);
      });
      return { message: item ? 'Упражнение обновлено' : workout ? 'Упражнение добавлено' : 'Каталог обновлён' };
    },
  });
}

function pickExercise(workout) {
  const attached = new Set(workout.items.map(item => item.exerciseId));
  const options = state.exercises.filter(item => !attached.has(item.id)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  openDialog({
    title: 'Добавить упражнение',
    content: `<div class="picker-new">${action('new-and-attach', 'Создать своё', 'plus', 'secondary')}</div>
      ${options.length ? `<label class="search-field">${icon('search', 20)}<input type="search" id="picker-search" aria-label="Найти упражнение" placeholder="Найти упражнение"></label>
      <ul class="picker-list">${options.map(item => `<li data-exercise-row data-search="${esc(item.name.toLocaleLowerCase('ru'))}">
        ${action('attach', esc(item.name), 'plus', 'picker-item', `data-id="${item.id}"`)}</li>`).join('')}</ul>
      <p id="catalog-empty" class="muted" hidden>Совпадений нет.</p>` : '<p class="muted">Доступных упражнений в каталоге пока нет.</p>'}`,
    trigger: document.activeElement,
  });
}

function editSet(workout, item, set) {
  const previous = item.sets.at(-1);
  const index = set ? item.sets.indexOf(set) + 1 : item.sets.length + 1;
  openDialog({
    title: `Подход ${index}`,
    content: `<p class="form-context">${esc(item.name)}</p>
      <div class="field-pair">
        <label class="field">Вес, кг<input name="kg" type="text" inputmode="decimal" required maxlength="7" autocomplete="off" value="${set ? set.kg : previous?.kg ?? ''}" placeholder="0"></label>
        <label class="field">Повторы<input name="reps" type="text" inputmode="numeric" required maxlength="3" autocomplete="off" value="${set ? set.reps : previous?.reps ?? ''}" placeholder="12"></label>
      </div><p class="form-hint">Для упражнения без дополнительного веса укажите 0 кг.</p>`,
    label: set ? 'Сохранить' : 'Записать подход',
    submit: async data => {
      const weight = String(data.get('kg')).trim().replace(',', '.');
      const repetitions = String(data.get('reps')).trim();
      const kg = Number(weight);
      const reps = Number(repetitions);
      if (!/^\d+(\.\d{1,2})?$/.test(weight) || !/^\d+$/.test(repetitions) || !validSet(kg, reps)) {
        throw new Error('Введите вес от 0 до 2 000 кг (до двух знаков после запятой) и от 1 до 999 повторов.');
      }
      await save(next => {
        const target = findEntry(findEntry(next.workouts, workout.id, 'Тренировка').items, item.id, 'Упражнение');
        if (set) Object.assign(findEntry(target.sets, set.id, 'Подход'), { kg, reps });
        else target.sets.push({ id: crypto.randomUUID(), kg, reps });
      });
      return { message: 'Подход сохранён' };
    },
  });
}

function confirmRemove(title, copy, change, route) {
  openDialog({
    title, content: `<p class="form-context">${copy}</p>`, label: 'Удалить', danger: true,
    submit: async () => {
      await save(change);
      return { route, message: 'Запись удалена' };
    },
  });
}

async function exportBackup() {
  const current = await readState();
  const blob = new Blob([JSON.stringify(backupOf(current), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `podhod-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function importBackup(file, trigger) {
  let backup;
  let revision;
  try {
    let raw;
    try {
      raw = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    } catch {
      throw new Error('Не удалось прочитать JSON. Выберите файл, сохранённый из дневника.');
    }
    backup = parseBackup(raw);
    revision = (await readState()).revision;
  } catch (error) {
    if (getRoute().page === 'data' && !dialog.open) {
      const message = error instanceof DOMException ? 'Не удалось открыть локальный дневник. Попробуйте ещё раз.' : error.message;
      openDialog({ title: 'Копия не открылась', content: `<p class="form-context">${esc(message)}</p>`, trigger });
    }
    return;
  }

  if (getRoute().page !== 'data' || dialog.open) return;
  openDialog({
    title: 'Заменить текущий дневник?',
    content: `<p class="form-context">В копии ${plural(backup.workouts.length, 'тренировка', 'тренировки', 'тренировок')} и ${plural(backup.exercises.length, 'упражнение', 'упражнения', 'упражнений')}. Восстановление заменит упражнения и историю на этом устройстве.</p>`,
    label: 'Восстановить', danger: true, trigger,
    submit: async () => {
      await save(next => {
        if (next.revision !== revision) throw new Error('Дневник изменился после выбора файла. Закройте окно и выберите файл снова.');
        Object.assign(next, backup);
      });
      return { message: 'Дневник восстановлен' };
    },
  });
}

function filterRows(container, query) {
  const normalized = query.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е');
  const rows = [...container.querySelectorAll('[data-exercise-row]')];
  if (!rows.length) return;
  for (const row of rows) row.hidden = !row.dataset.search.replaceAll('ё', 'е').includes(normalized);
  container.querySelector('#catalog-empty').hidden = rows.some(row => !row.hidden);
}

document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'catalog-search') {
    search = input.value;
    filterRows(main, search);
  } else if (input.id === 'picker-search') filterRows(dialog, input.value);
  else if (input.type === 'checkbox' && input.checked && ['primary', 'secondary'].includes(input.name)) {
    const other = input.name === 'primary' ? 'secondary' : 'primary';
    input.form.querySelector(`input[name="${other}"][value="${input.value}"]`).checked = false;
  }
});

document.addEventListener('change', event => {
  if (event.target.id !== 'backup-file') return;
  const [file] = event.target.files;
  event.target.value = '';
  if (file) void importBackup(file, main.querySelector('[data-action=select-backup]'));
});

document.addEventListener('click', async event => {
  if (event.target.closest('.skip')) {
    event.preventDefault();
    main.focus();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || !state || pending) return;
  const { action: command, id, set: setId } = button.dataset;
  const route = getRoute();
  const workout = state.workouts.find(entry => entry.id === route.id);
  const item = workout?.items.find(entry => entry.id === id);
  const exercise = state.exercises.find(entry => entry.id === id);
  const set = item?.sets.find(entry => entry.id === setId);
  switch (command) {
    case 'close': dialog.close(); break;
    case 'calendar-day':
    case 'calendar-prev':
    case 'calendar-next':
    case 'calendar-today':
      if (route.page !== 'calendar' || !isDate(button.dataset.date)) break;
      history.replaceState(null, '', `#calendar/${button.dataset.date}`);
      render();
      restoreFocus(button);
      break;
    case 'new-workout': editWorkout(); break;
    case 'edit-workout': if (workout) editWorkout(workout); break;
    case 'delete-workout':
      if (workout) confirmRemove('Удалить тренировку?', `«${esc(workout.name)}» и её подходы будут удалены из истории.`,
        next => removeEntry(next.workouts, workout.id), route.fromDate ? `calendar/${route.fromDate}` : 'journal');
      break;
    case 'new-exercise': editExercise(); break;
    case 'edit-exercise': if (exercise) editExercise(exercise); break;
    case 'delete-exercise':
      if (exercise) confirmRemove('Удалить из каталога?', `«${esc(exercise.name)}» исчезнет из каталога. Подходы в тренировках сохранятся.`,
        next => removeEntry(next.exercises, id));
      break;
    case 'choose-item': if (workout) pickExercise(workout); break;
    case 'new-and-attach': if (workout) editExercise(null, workout); break;
    case 'edit-item': if (item) editExercise(null, workout, item); break;
    case 'attach':
      if (!workout) break;
      pending = true;
      dialog.querySelectorAll('button').forEach(control => { control.disabled = true; });
      try {
        await save(next => attachExercise(findEntry(next.workouts, workout.id, 'Тренировка'),
          findEntry(next.exercises, id, 'Упражнение')));
        dialog.close();
        render();
        showNotice('Упражнение добавлено');
      } catch (error) {
        failForm(error);
      } finally {
        pending = false;
        dialog.querySelectorAll('button').forEach(control => { control.disabled = false; });
      }
      break;
    case 'delete-item':
      if (item) confirmRemove('Убрать упражнение?', `«${esc(item.name)}» и его подходы будут удалены из этой тренировки.`,
        next => removeEntry(findEntry(next.workouts, workout.id, 'Тренировка').items, id));
      break;
    case 'new-set': if (item) editSet(workout, item); break;
    case 'edit-set': if (set) editSet(workout, item, set); break;
    case 'delete-set':
      if (set) confirmRemove('Удалить подход?', 'Нагрузка и объём тренировки пересчитаются автоматически.',
        next => removeEntry(findEntry(findEntry(next.workouts, workout.id, 'Тренировка').items, id, 'Упражнение').sets, setId));
      break;
    case 'export':
      try { await exportBackup(); } catch { showNotice('Не удалось сохранить копию. Попробуйте ещё раз.'); }
      break;
    case 'select-backup': main.querySelector('#backup-file').click(); break;
  }
});

window.addEventListener('hashchange', () => {
  if (dialog.open && !pending) dialog.close();
  render({ navigate: true });
});
window.addEventListener('pageshow', refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
channel?.addEventListener('message', refresh);

async function enableOffline() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'Для офлайна нужен HTTPS';
    return;
  }
  const updateBadge = () => {
    const ready = Boolean(navigator.serviceWorker.controller);
    status.dataset.ready = String(ready);
    status.innerHTML = ready ? `${icon('check', 16)} Офлайн готов` : 'Подготовка офлайна…';
  };
  navigator.serviceWorker.addEventListener('controllerchange', updateBadge);
  updateBadge();
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    const watchWorker = worker => worker?.addEventListener('statechange', () => {
      if (worker.state === 'redundant' && !navigator.serviceWorker.controller) status.textContent = 'Офлайн не готов. Обновите страницу';
    });
    watchWorker(registration.installing);
    registration.addEventListener('updatefound', () => watchWorker(registration.installing));
    updateBadge();
    if (standalone) void navigator.storage?.persist?.().catch(() => {});
  } catch {
    status.textContent = 'Офлайн не готов. Обновите страницу';
  }
}

try {
  await openStorage();
  state = await readState();
  render();
  void enableOffline();
} catch {
  status.textContent = 'Хранилище недоступно';
  main.innerHTML = '<h1>Дневник не открылся</h1><p>Браузер не смог открыть локальные данные. Разрешите хранение данных сайта и обновите страницу.</p><a class="back-link" href="./">Открыть снова</a>';
}
