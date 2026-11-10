import { openStorage, readState, changeState } from './storage.js';
import { today, isDate, validSet, parseBackup, backupOf, plural, formatDate, shortDate, NOTE_LIMIT, validNote,
  DEFAULT_INBODY_METRIC, INBODY_FIELDS, INBODY_METRICS, parseMeasurement, parseMeasurements } from './model.js';
import { icon } from './graphics.js';
import { enableExerciseReorder } from './exercise-reorder.js';
import { esc, navigation, journal, calendar, historyView, catalog, workoutView, workoutBackLink, dataView, muscleFields, action,
  measurementFields, inbodyChart, inbodyHistory, inbodyDetails } from './views.js';

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
let selectedExercises = null;
let displayedDay;
const cancelExerciseReorder = enableExerciseReorder(main, dropExercise);

function getRoute() {
  const [page, id, context, originDate] = location.hash.slice(1).split('/');
  const fromHistory = context === 'history';
  const date = fromHistory ? originDate : context;
  return { page: ['calendar', 'history', 'exercises', 'data', 'workout', 'template', 'inbody'].includes(page) ? page : 'journal',
    id, fromHistory, fromDate: isDate(date) ? date : null };
}

const trainingList = (data, template) => template ? (data.templates ?? []) : data.workouts;

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
  cancelExerciseReorder();
  const { page, id, fromDate, fromHistory } = getRoute();
  displayedDay = today();
  if (page !== 'exercises') selectedExercises = null;
  const active = page === 'template' ? 'exercises' : ['history', 'workout'].includes(page) ? 'calendar' : page === 'inbody' ? 'journal' : page;
  nav.innerHTML = navigation(active);
  switch (page) {
    case 'calendar':
      main.innerHTML = calendar(state, isDate(id) ? id : today());
      break;
    case 'history':
      main.innerHTML = historyView(state.workouts, isDate(id) ? id : null);
      break;
    case 'exercises':
      if (selectedExercises) {
        const ids = new Set(state.exercises.map(exercise => exercise.id));
        for (const id of selectedExercises) if (!ids.has(id)) selectedExercises.delete(id);
      }
      main.innerHTML = catalog(state, selectedExercises);
      if (main.querySelector('#catalog-search')) {
        main.querySelector('#catalog-search').value = search;
        filterRows(main, search);
      }
      break;
    case 'data':
      main.innerHTML = dataView(state, standalone);
      break;
    case 'inbody': {
      const entries = state.measurements ?? [];
      main.innerHTML = id ? inbodyDetails(entries.find(entry => entry.id === id)) : inbodyHistory(entries);
      break;
    }
    case 'workout':
    case 'template': {
      const template = page === 'template';
      const workout = trainingList(state, template).find(entry => entry.id === id);
      const date = fromDate || (!fromHistory ? workout?.date : null);
      main.innerHTML = workout
        ? workoutView(workout, { date, history: fromHistory, template, unit: state.loadUnit })
        : `<h1>Тренировка не найдена</h1>${workoutBackLink(date, fromHistory, template)}`;
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
    if (!pending && (latest.revision > state.revision || displayedDay !== today())) {
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
  if (!alreadyOpen) {
    dialogTrigger = trigger?.matches('button, a') ? trigger : null;
    if (document.activeElement.matches('input, textarea')) document.activeElement.blur();
  }
  submitDialog = submit;
  dialog.className = wide ? 'sheet wide' : 'sheet';
  dialog.innerHTML = `<div class="sheet-inner">
    <header class="sheet-header"><h2 id="dialog-title">${title}</h2>
      <button class="icon-button" type="button" data-action="close" aria-label="Закрыть" autofocus>${icon('close')}</button>
    </header>
    <form id="dialog-form">
      <div class="sheet-body">${content}<p class="form-error" id="form-error" role="alert" hidden></p></div>
      ${submit ? `<footer class="sheet-footer">
        ${action('close', 'Отмена')}
        <button type="submit" class="button ${danger ? 'danger' : 'primary'}">${label}</button>
      </footer>` : ''}
    </form>
  </div>`;
  positionDialog();
  if (!alreadyOpen) dialog.showModal();
  else dialog.querySelector('.sheet-header button').focus({ preventScroll: true });
}

function positionDialog() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  dialog.style.setProperty('--sheet-viewport-height', `${viewport.height}px`);
  dialog.style.setProperty('--sheet-viewport-center', `${viewport.offsetTop + viewport.height / 2}px`);
}

for (const event of ['resize', 'scroll']) {
  window.visualViewport?.addEventListener(event, () => {
    if (!dialog.open) return;
    positionDialog();
    const body = dialog.querySelector('.sheet-body');
    const field = document.activeElement;
    if (!body.contains(field)) return;
    const bounds = body.getBoundingClientRect();
    const target = field.getBoundingClientRect();
    if (target.bottom > bounds.bottom) body.scrollTop += target.bottom - bounds.bottom + 8;
    else if (target.top < bounds.top) body.scrollTop += target.top - bounds.top - 8;
  });
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
dialog.addEventListener('invalid', event => {
  event.preventDefault();
  if (event.target === event.target.form.querySelector('input:invalid, textarea:invalid, select:invalid')) {
    failForm(new Error('Проверьте обязательные поля и допустимые значения.'));
  }
}, true);

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

function editWorkout(workout, template) {
  openDialog({
    title: workout ? 'Редактировать тренировку' : 'Новая тренировка',
    content: `<label class="field">Название<input name="name" required maxlength="80" autocomplete="off" value="${esc(workout?.name || '')}" placeholder="Например, Спина и бицепс"></label>
      ${template ? '' : `<label class="field">Дата<input name="date" type="date" required min="1000-01-01" max="9999-12-31" value="${workout.date}"></label>`}`,
    label: workout ? 'Сохранить' : 'Создать тренировку',
    submit: async data => {
      const name = getName(data);
      const date = data.get('date');
      if (!template && !isDate(date)) throw new Error('Выберите корректную дату.');
      const id = workout?.id || crypto.randomUUID();
      const fields = template ? { name } : { name, date };
      await save(next => {
        if (workout) Object.assign(findEntry(trainingList(next, template), id, 'Тренировка'), fields);
        else (next.templates ??= []).unshift({ id, name, items: [] });
      });
      return workout ? { message: 'Тренировка обновлена' } : { route: `template/${id}`, message: 'Тренировка создана' };
    },
  });
}

function startWorkout(date) {
  const templates = state.templates ?? [];
  if (!templates.length) {
    openDialog({
      title: 'Выберите тренировку',
      content: '<p class="form-context">Сначала создайте тренировку с упражнениями.</p><a class="back-link" href="#exercises">К тренировкам и упражнениям</a>',
    });
    return;
  }
  openDialog({
    title: 'Тренируюсь',
    content: `<p class="form-context">${formatDate(date)}</p>
      <fieldset class="program-options"><legend>Выберите тренировку</legend>
        ${templates.map(template => `<label><input type="radio" name="template" value="${template.id}" required>
          <span>${esc(template.name)}</span></label>`).join('')}
      </fieldset>`,
    label: 'Добавить в календарь',
    submit: async data => {
      const id = crypto.randomUUID();
      const startedAt = new Date().toISOString();
      await save(next => {
        const template = findEntry(trainingList(next, true), data.get('template'), 'Тренировка');
        next.workouts.unshift({ id, name: template.name, items: structuredClone(template.items), date, startedAt });
        if (next.nextTraining?.templateId === template.id && next.nextTraining.date === date) next.nextTraining = null;
      });
      return { route: `workout/${id}/${date}`, message: 'Тренировка добавлена в календарь' };
    },
  });
}

function attachExercise(workout, exercise) {
  if (workout.items.some(item => item.exerciseId === exercise.id)) throw new Error('Это упражнение уже есть в тренировке.');
  workout.items.push({ ...exercise, exerciseId: exercise.id, id: crypto.randomUUID(), sets: [] });
}

function moveExercise(next, workoutId, template, itemId, anchorId, after) {
  const { items } = findEntry(trainingList(next, template), workoutId, 'Тренировка');
  const item = findEntry(items, itemId, 'Упражнение');
  const anchor = findEntry(items, anchorId, 'Упражнение');
  if (item === anchor) return;
  items.splice(items.indexOf(item), 1);
  items.splice(items.indexOf(anchor) + (after ? 1 : 0), 0, item);
}

async function dropExercise(handle, anchorId, after) {
  if (pending || dialog.open) return;
  const hash = location.hash;
  const { page, id } = getRoute();
  pending = true;
  try {
    await save(next => moveExercise(next, id, page === 'template', handle.dataset.id, anchorId, after));
    if (location.hash === hash) {
      render();
      restoreFocus(handle);
    }
    showNotice('Порядок упражнений сохранён');
  } catch {
    showNotice('Не удалось сохранить порядок упражнений.');
  } finally {
    pending = false;
    void refresh();
  }
}

function chooseExercisePosition(workout, item, template, trigger) {
  const position = workout.items.indexOf(item);
  openDialog({
    title: 'Переместить упражнение', trigger,
    content: `<p class="form-context">${esc(item.name)}</p>
      <label class="field">Новая позиция<select name="position">
        ${workout.items.map(({ id }, index) => `<option value="${id}" ${index === position ? 'selected' : ''}>${index + 1}${index === position ? ' (текущая)' : ''}</option>`).join('')}
      </select></label>`,
    submit: async data => {
      const anchorId = data.get('position');
      if (anchorId === item.id) return;
      const after = workout.items.findIndex(entry => entry.id === anchorId) > position;
      await save(next => moveExercise(next, workout.id, template, item.id, anchorId, after));
      return { message: 'Порядок упражнений сохранён' };
    },
  });
}

function editExercise(exercise, workout, item, template = false) {
  const entry = item || exercise;
  openDialog({
    title: item ? 'Упражнение в тренировке' : exercise ? 'Редактировать упражнение' : 'Новое упражнение',
    wide: true,
    content: `${item ? '<p class="form-hint snapshot-hint">Изменения применятся к этой тренировке.</p>' : ''}
      <label class="field">Название<input name="name" required maxlength="80" autocomplete="off" value="${esc(entry?.name || '')}" placeholder="Например, Тяга гантели"></label>
      <label class="field">Заметка (необязательно)<textarea name="note" maxlength="${NOTE_LIMIT}" rows="2" placeholder="Например, сиденье на 3, спинка на 5">${esc(entry?.note || '')}</textarea></label>
      ${muscleFields(entry)}`,
    label: workout && !item ? 'Создать и добавить' : 'Сохранить',
    submit: async data => {
      const name = getName(data);
      const note = String(data.get('note') ?? '').trim();
      if (!validNote(note)) throw new Error(`Заметка должна быть не длиннее ${NOTE_LIMIT} символов.`);
      const primary = data.getAll('primary');
      const secondary = data.getAll('secondary');
      if (!primary.length) throw new Error('Отметьте хотя бы одну основную группу мышц.');
      const updated = { id: entry?.id || crypto.randomUUID(), name, primary, secondary, note };
      await save(next => {
        if (item) {
          const target = findEntry(trainingList(next, template), workout.id, 'Тренировка');
          Object.assign(findEntry(target.items, item.id, 'Упражнение'), updated);
          return;
        }
        if (exercise) Object.assign(findEntry(next.exercises, exercise.id, 'Упражнение'), updated);
        else next.exercises.push(updated);
        if (workout) attachExercise(findEntry(trainingList(next, template), workout.id, 'Тренировка'), updated);
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

function editSet(workout, item, set, template) {
  const previous = item.sets.at(-1);
  const index = set ? item.sets.indexOf(set) + 1 : item.sets.length + 1;
  openDialog({
    title: `Подход ${index}`,
    content: `<p class="form-context">${esc(item.name)}</p>
      <div class="field-pair">
        <label class="field">Вес, кг<input name="kg" type="text" inputmode="decimal" required maxlength="7" autocomplete="off" value="${set ? set.kg : previous?.kg ?? ''}" placeholder="0"></label>
        <label class="field">Повторы<input name="reps" type="text" inputmode="numeric" required maxlength="3" autocomplete="off" value="${set ? set.reps : previous?.reps ?? ''}" placeholder="12"></label>
      </div>
      ${template && !set ? '<label class="field repeat-field">Количество подходов<input name="count" type="number" min="1" max="99" step="1" inputmode="numeric" value="1" required></label>' : ''}
      <p class="form-hint">Для упражнения без дополнительного веса укажите 0 кг.</p>`,
    label: set ? 'Сохранить' : 'Записать подход',
    submit: async data => {
      const weight = String(data.get('kg')).trim().replace(',', '.');
      const repetitions = String(data.get('reps')).trim();
      const kg = Number(weight);
      const reps = Number(repetitions);
      const count = Number(data.get('count') ?? 1);
      if (!Number.isInteger(count) || count < 1 || count > 99) throw new Error('Укажите от 1 до 99 подходов.');
      if (!/^\d+(\.\d{1,2})?$/.test(weight) || !/^\d+$/.test(repetitions) || !validSet(kg, reps)) {
        throw new Error('Введите вес от 0 до 2 000 кг (до двух знаков после запятой) и от 1 до 999 повторов.');
      }
      await save(next => {
        const target = findEntry(findEntry(trainingList(next, template), workout.id, 'Тренировка').items, item.id, 'Упражнение');
        if (set) Object.assign(findEntry(target.sets, set.id, 'Подход'), { kg, reps });
        else target.sets.push(...Array.from({ length: count }, () => ({ id: crypto.randomUUID(), kg, reps })));
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

function editMeasurement(entry) {
  openDialog({
    title: entry ? 'Редактировать замер' : 'Новые показания InBody',
    wide: true,
    content: measurementFields(entry),
    submit: async data => {
      const values = {};
      for (const [key, [label]] of Object.entries(INBODY_FIELDS)) {
        const raw = String(data.get(key) ?? '').trim().replace(',', '.');
        if (!raw) continue;
        if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error(`Проверьте число в поле «${label}».`);
        values[key] = Number(raw);
      }
      const record = parseMeasurement({ id: entry?.id ?? crypto.randomUUID(), date: data.get('date'), values });
      await save(next => {
        const entries = next.measurements ??= [];
        if (entries.some(item => item.id !== record.id && item.date === record.date)) {
          throw new Error('На эту дату уже есть замер. Его можно изменить в истории.');
        }
        if (entry) Object.assign(findEntry(entries, entry.id, 'Измерение'), record);
        else entries.push(record);
      });
      return { message: 'Замер сохранён' };
    },
  });
}

async function readJson(file) {
  try {
    return JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Не удалось прочитать JSON. Проверьте выбранный файл.');
  }
}

async function importMeasurements(file, trigger) {
  let entries;
  try {
    const raw = await readJson(file);
    if (raw?.format !== 'podhod-inbody' || raw.version !== 1) throw new Error('Выберите файл истории InBody для «Подхода».');
    entries = parseMeasurements(raw.measurements);
  } catch (error) {
    if (getRoute().page === 'inbody' && !dialog.open) {
      openDialog({ title: 'Замеры не прочитаны', content: `<p class="form-context">${esc(error.message)}</p>`, trigger });
    }
    return;
  }
  if (getRoute().page !== 'inbody' || dialog.open) return;
  openDialog({
    title: 'Импорт замеров InBody',
    content: `<p class="form-context">Замеров в файле: ${entries.length}. Даты, уже сохранённые в истории, будут пропущены.</p>`,
    label: 'Добавить замеры', trigger,
    submit: async () => {
      let added = 0;
      await save(next => {
        const saved = next.measurements ??= [];
        const dates = new Set(saved.map(entry => entry.date));
        const ids = new Set(saved.map(entry => entry.id));
        for (const entry of entries) {
          if (dates.has(entry.date)) continue;
          const id = ids.has(entry.id) ? crypto.randomUUID() : entry.id;
          saved.push({ ...entry, id });
          dates.add(entry.date);
          ids.add(id);
          added += 1;
        }
      });
      return { message: `Добавлено замеров: ${added}` };
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
    backup = parseBackup(await readJson(file));
    revision = (await readState()).revision;
  } catch (error) {
    if (getRoute().page === 'data' && !dialog.open) {
      const message = error instanceof DOMException ? 'Не удалось открыть локальный дневник. Попробуйте ещё раз.' : error.message;
      openDialog({ title: 'Копия не открылась', content: `<p class="form-context">${esc(message)}</p>`, trigger });
    }
    return;
  }

  if (getRoute().page !== 'data' || dialog.open) return;
  const fullCopy = backup.inbodyMetric !== undefined;
  openDialog({
    title: 'Заменить текущий дневник?',
    content: `<p class="form-context">В копии ${plural(backup.workouts.length, 'тренировка', 'тренировки', 'тренировок')} и ${plural(backup.exercises.length, 'упражнение', 'упражнения', 'упражнений')}. Шаблонов тренировок — ${backup.templates.length}.${backup.measurements ? ` Замеров InBody — ${backup.measurements.length}.` : ''}</p>
      <p class="form-context restore-summary">${fullCopy
        ? 'Полная копия заменит текущие данные и настройки дневника.'
        : `Копия заменит каталог, шаблоны, историю тренировок и план следующей тренировки. ${backup.measurements ? 'Замеры InBody тоже будут заменены.' : 'Текущие замеры InBody сохранятся.'}`}</p>`,
    label: 'Восстановить', danger: true, trigger,
    submit: async () => {
      await save(next => {
        if (next.revision !== revision) throw new Error('Дневник изменился после выбора файла. Закройте окно и выберите файл снова.');
        Object.assign(next, backup);
      });
      search = '';
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

async function updateNextTraining(field, value) {
  const controls = main.querySelector('.next-training-controls');
  try {
    if (field === 'date' && value && (!isDate(value) || value < today())) {
      throw new Error('Выберите сегодняшнюю дату или позже.');
    }
    await save(next => {
      if (field === 'templateId' && value) findEntry(trainingList(next, true), value, 'Тренировка');
      const plan = field ? { templateId: '', date: '', ...next.nextTraining, [field]: value } : null;
      next.nextTraining = plan?.templateId || plan?.date ? plan : null;
    });
  } catch (error) {
    showNotice(error instanceof DOMException ? 'Не удалось сохранить план тренировки.' : error.message);
  }
  if (!controls.isConnected) return;
  const { templateId = '', date = '' } = state.nextTraining ?? {};
  controls.querySelector('#next-training-template').value = templateId;
  controls.querySelector('#next-training-date').value = date;
  controls.querySelector('.next-training-date-label').textContent = date ? shortDate(date) : 'Дата';
  const reset = main.querySelector('#next-training-reset');
  reset.hidden = !templateId && !date;
  if (!field && reset.hidden) controls.querySelector('#next-training-template').focus({ preventScroll: true });
  main.querySelector('#next-training-past').hidden = !date || date >= today();
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

document.addEventListener('change', async event => {
  const input = event.target;
  if (input.id === 'next-training-template' || input.id === 'next-training-date') {
    void updateNextTraining(input.id === 'next-training-template' ? 'templateId' : 'date', input.value);
    return;
  }
  if (input.id === 'inbody-metric' && Object.hasOwn(INBODY_METRICS, input.value)) {
    const metric = input.value;
    const chart = main.querySelector('#inbody-chart');
    chart.innerHTML = inbodyChart(state.measurements ?? [], metric);
    try {
      await save(next => { next.inbodyMetric = metric; });
    } catch {
      if (input.isConnected && input.value === metric) {
        input.value = state.inbodyMetric ?? DEFAULT_INBODY_METRIC;
        chart.innerHTML = inbodyChart(state.measurements ?? [], input.value);
      }
      showNotice('Не удалось сохранить показатель InBody.');
    }
    return;
  }
  if (input.name === 'selected-exercise' && selectedExercises) {
    if (input.checked) selectedExercises.add(input.value);
    else selectedExercises.delete(input.value);
    main.querySelector('#bulk-count').textContent = `Выбрано: ${selectedExercises.size}`;
    main.querySelector('[data-action="delete-selected"]').disabled = !selectedExercises.size;
    return;
  }
  if (!['backup-file', 'inbody-file'].includes(input.id)) return;
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  if (input.id === 'inbody-file') void importMeasurements(file, main.querySelector('[data-action=select-inbody]'));
  else void importBackup(file, main.querySelector('[data-action=select-backup]'));
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
  const template = route.page === 'template';
  const workout = trainingList(state, template).find(entry => entry.id === route.id);
  const item = workout?.items.find(entry => entry.id === id);
  const exercise = state.exercises.find(entry => entry.id === id);
  const set = item?.sets.find(entry => entry.id === setId);
  switch (command) {
    case 'close': dialog.close(); break;
    case 'clear-next-training': void updateNextTraining(null); break;
    case 'new-measurement': editMeasurement(); break;
    case 'select-inbody': main.querySelector('#inbody-file').click(); break;
    case 'edit-measurement':
    case 'delete-measurement': {
      const entry = state.measurements?.find(entry => entry.id === route.id);
      if (!entry) break;
      if (command === 'edit-measurement') editMeasurement(entry);
      else confirmRemove('Удалить замер?', `Показания за ${formatDate(entry.date)} будут удалены из истории InBody.`,
        next => removeEntry(next.measurements ?? [], entry.id), 'inbody');
      break;
    }
    case 'calendar-day':
    case 'calendar-prev':
    case 'calendar-next':
    case 'calendar-today':
      if (route.page !== 'calendar' || !isDate(button.dataset.date)) break;
      history.replaceState(null, '', `#calendar/${button.dataset.date}`);
      render();
      restoreFocus(command === 'calendar-today' ? main.querySelector('.calendar-day[aria-current="date"]') : button);
      break;
    case 'new-template': editWorkout(null, true); break;
    case 'start-workout':
      if (route.page === 'calendar' && isDate(button.dataset.date)) startWorkout(button.dataset.date);
      break;
    case 'edit-workout': if (workout) editWorkout(workout, template); break;
    case 'delete-workout':
    case 'delete-calendar': {
      const record = command === 'delete-calendar' ? state.workouts.find(entry => entry.id === id) : workout;
      if (!record) break;
      const date = route.fromDate || record.date;
      const back = template ? 'exercises' : route.fromHistory ? `history${route.fromDate ? `/${route.fromDate}` : ''}` : `calendar/${date}`;
      confirmRemove(template ? 'Удалить шаблон?' : 'Удалить запись тренировки?',
        template ? `«${esc(record.name)}» будет удалена из списка шаблонов. Записи в календаре сохранятся.` :
          `«${esc(record.name)}» и её подходы будут удалены из календаря и истории. Нагрузка пересчитается.`,
        next => {
          const list = trainingList(next, template);
          removeEntry(list, record.id);
          if (template && (next.nextTraining?.templateId === record.id || !list.length)) next.nextTraining = null;
        }, command === 'delete-calendar' ? undefined : back);
      break;
    }
    case 'select-exercises':
      selectedExercises = selectedExercises ? null : new Set();
      render();
      restoreFocus(button);
      break;
    case 'delete-selected': {
      if (!selectedExercises?.size) break;
      const ids = new Set(selectedExercises);
      confirmRemove('Удалить выбранные упражнения?',
        `Будет удалено из каталога: ${ids.size}. Упражнения в сохранённых тренировках и истории сохранятся.`,
        next => { next.exercises = next.exercises.filter(exercise => !ids.has(exercise.id)); });
      break;
    }
    case 'load-unit':
      if (!['kg', 'points'].includes(id) || (state.loadUnit ?? 'points') === id) break;
      pending = true;
      try {
        await save(next => { next.loadUnit = id; });
        render();
        restoreFocus(button);
      } catch {
        showNotice('Не удалось сохранить единицу нагрузки.');
      } finally {
        pending = false;
      }
      break;
    case 'new-exercise': editExercise(); break;
    case 'edit-exercise': if (exercise) editExercise(exercise); break;
    case 'delete-exercise':
      if (exercise) confirmRemove('Удалить из каталога?', `«${esc(exercise.name)}» исчезнет из каталога. Подходы в тренировках сохранятся.`,
        next => removeEntry(next.exercises, id));
      break;
    case 'choose-item': if (workout) pickExercise(workout); break;
    case 'move-item': if (item) chooseExercisePosition(workout, item, template, button); break;
    case 'new-and-attach': if (workout) editExercise(null, workout, null, template); break;
    case 'edit-item': if (item) editExercise(null, workout, item, template); break;
    case 'attach':
      if (!workout) break;
      pending = true;
      dialog.querySelectorAll('button').forEach(control => { control.disabled = true; });
      try {
        await save(next => attachExercise(findEntry(trainingList(next, template), workout.id, 'Тренировка'),
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
        next => removeEntry(findEntry(trainingList(next, template), workout.id, 'Тренировка').items, id));
      break;
    case 'new-set': if (item) editSet(workout, item, null, template); break;
    case 'edit-set': if (set) editSet(workout, item, set, template); break;
    case 'delete-set':
      if (set) confirmRemove('Удалить подход?', 'Нагрузка и объём тренировки пересчитаются автоматически.',
        next => removeEntry(findEntry(findEntry(trainingList(next, template), workout.id, 'Тренировка').items, id, 'Упражнение').sets, setId));
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
    status.textContent = ready ? 'offline' : 'Подготовка офлайна…';
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
