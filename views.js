import { MUSCLES, number, plural, formatDate, formatStart, shortDate, workoutStats, currentWeek, today,
  INBODY_MAIN, INBODY_EXTRA, INBODY_SEGMENTS, INBODY_SEGMENT_FIELDS, INBODY_METRICS, DEFAULT_INBODY_METRIC } from './model.js';
import { icon, muscleArt } from './graphics.js';

export const esc = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const countExercises = n => plural(n, 'упражнение', 'упражнения', 'упражнений');
const countSets = n => plural(n, 'подход', 'подхода', 'подходов');
const countWorkouts = n => plural(n, 'тренировка', 'тренировки', 'тренировок');
export const action = (name, label, symbol, style = 'secondary', data = '') =>
  `<button type="button" class="button ${style}" data-action="${name}" ${data}>${symbol ? icon(symbol, 20) : ''}<span>${label}</span></button>`;
const iconButton = (name, label, symbol, data = '') =>
  `<button type="button" class="icon-button" data-action="${name}" aria-label="${label}" title="${label}" ${data}>${icon(symbol, 19)}</button>`;
const muscleNames = keys => keys.map(key => MUSCLES[key]).join(', ');

export function navigation(active) {
  return [
    ['journal', 'Дневник', 'journal'], ['calendar', 'Календарь', 'calendar'],
    ['exercises', 'Тренировки и упражнения', 'weights'], ['data', 'Копии', 'storage'],
  ].map(([route, label, symbol]) =>
    `<a href="#${route}" ${active === route ? 'aria-current="page"' : ''}>${icon(symbol, 20)}<span>${label}</span></a>`).join('');
}

export function historyView(workouts, date) {
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date) ||
    (b.startedAt || '').localeCompare(a.startedAt || ''));
  return `${workoutBackLink(date)}
    <div class="page-heading"><div><h1>История тренировок</h1><p>${countWorkouts(sorted.length)}</p></div></div>
    ${sorted.length ? `<table class="history-table"><thead><tr>
      <th scope="col">Дата</th><th scope="col">Тренировка</th><th scope="col"><span class="sr-only">Действия</span></th>
    </tr></thead><tbody>${sorted.map(workout => `<tr><td><time datetime="${workout.date}">${shortDate(workout.date)}</time></td>
      <th scope="row">${esc(workout.name)}</th>
      <td><a class="detail-link" href="#workout/${workout.id}/history${date ? `/${date}` : ''}" aria-label="Подробнее о тренировке «${esc(workout.name)}»">Подробнее</a></td>
    </tr>`).join('')}</tbody></table>` : '<p class="muted">Здесь появятся записи из календаря.</p>'}`;
}

function calendarRows(workouts, date) {
  return `<ul class="history-list">${workouts.map(workout => `<li class="calendar-record">
    <a class="history-row" href="#workout/${workout.id}/${date}">
      <span class="row-icon">${icon('weights', 21)}</span>
      <span class="row-copy"><strong>${esc(workout.name)}</strong><span>${formatStart(workout)}</span>
        <span class="calendar-edit-hint">Изменить упражнения</span>
      </span>
    </a>
    ${iconButton('delete-calendar', 'Удалить запись из календаря', 'trash', `data-id="${workout.id}"`)}
  </li>`).join('')}</ul>`;
}

export function journal(state) {
  let sets = 0;
  let volume = 0;
  for (const workout of state.workouts) {
    const totals = workoutStats(workout);
    sets += totals.sets;
    volume += totals.volume;
  }
  const currentDate = today();
  const week = currentWeek(state.workouts, currentDate);
  const count = week.days.reduce((sum, day) => sum + day.count, 0);
  return `
    <h1 class="sr-only">Дневник</h1>
    <section class="week-overview" aria-label="Итоги и календарь недели">
      <dl class="totals">
        ${metric('Тренировки на этой неделе', count)}
        ${metric('Подходы всего', sets)}
        ${metric('Кг всего', volume)}
      </dl>
      <ul class="week-strip" aria-label="Текущая неделя, с понедельника по воскресенье">
        ${week.days.map(({ date, count }, index) => `<li><a class="week-day" href="#calendar/${date}"
          ${count ? 'data-trained' : ''} ${date === currentDate ? 'aria-current="date"' : ''}
          aria-label="${formatDate(date)}, ${count ? countWorkouts(count) : 'без тренировок'}">
          <span>${weekdays[index]}</span><time datetime="${date}">${Number(date.slice(-2))}</time>
          <span class="week-fire" aria-hidden="true">${count ? icon('fire', 15) : ''}</span>
        </a></li>`).join('')}
      </ul>
    </section>
    ${nextTrainingView(state, currentDate)}
    ${loadView(week, state.loadUnit, week)}
    ${inbodySummary(state.measurements ?? [], state.inbodyMetric)}`;
}

function nextTrainingView({ templates = [], nextTraining }, currentDate) {
  const { templateId = '', date = '' } = nextTraining ?? {};
  return `<section class="next-training" aria-labelledby="next-training-title">
    <div class="next-training-heading">
      <div>
        <h2 id="next-training-title">Следующая тренировка</h2>
        <p id="next-training-past" class="muted" ${date && date < currentDate ? '' : 'hidden'}>Дата прошла</p>
      </div>
      <span id="next-training-reset" ${templates.length && (templateId || date) ? '' : 'hidden'}>${iconButton('clear-next-training', 'Очистить план', 'close')}</span>
    </div>
    ${templates.length ? `<div class="next-training-controls">
      <select id="next-training-template" aria-label="Тренировка по плану">
        <option value="">Выбрать</option>
        ${templates.map(template => `<option value="${esc(template.id)}" ${template.id === templateId ? 'selected' : ''}>${esc(template.name)}</option>`).join('')}
      </select>
      <label class="next-training-date">
        <span class="sr-only">Дата следующей тренировки</span>
        <input id="next-training-date" type="date" min="${currentDate}" max="9999-12-31" value="${esc(date)}">
        <span class="next-training-date-label" aria-hidden="true">${date ? shortDate(date) : 'Дата'}</span>
      </label>
    </div>` : '<p class="next-training-empty">Пока нет шаблонов. <a href="#exercises">К тренировкам</a></p>'}
  </section>`;
}

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function calendar(state, selectedDate) {
  const currentDate = today();
  const monthKey = selectedDate.slice(0, 7);
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const byDate = new Map();
  for (const workout of state.workouts) {
    if (!workout.date.startsWith(monthKey)) continue;
    if (!byDate.has(workout.date)) byDate.set(workout.date, []);
    byDate.get(workout.date).push(workout);
  }
  const selected = byDate.get(selectedDate) || [];
  const monthTitle = monthFormat.format(firstDay).replace(/\s*г\.$/, '');
  const previous = monthKey === '1000-01' ? 'disabled' :
    `data-date="${new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10)}"`;
  const next = monthKey === '9999-12' ? 'disabled' :
    `data-date="${new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)}"`;

  return `<div class="page-heading"><div><h1>Календарь</h1><p>Выберите день, чтобы открыть его тренировки.</p></div></div>
    <div class="calendar-layout">
      <section class="calendar-panel" aria-labelledby="calendar-month">
        <div class="calendar-top">
          ${iconButton('calendar-prev', 'Предыдущий месяц', 'previous', previous)}
          <h2 id="calendar-month">${monthTitle}</h2>
          ${iconButton('calendar-next', 'Следующий месяц', 'next', next)}
        </div>
        <div class="calendar-week" aria-hidden="true">${weekdays.map(day => `<span>${day}</span>`).join('')}</div>
        <div class="calendar-days" role="group" aria-label="Дни месяца">
          ${'<span aria-hidden="true"></span>'.repeat(offset)}
          ${Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const date = `${monthKey}-${String(day).padStart(2, '0')}`;
            const total = byDate.get(date)?.length || 0;
            const description = total ? countWorkouts(total) : 'без тренировок';
            return `<button class="calendar-day" type="button" data-action="calendar-day" data-id="${date}" data-date="${date}"
              ${total ? 'data-trained' : ''} ${date === currentDate ? 'aria-current="date"' : ''}
              aria-pressed="${date === selectedDate}" aria-label="${formatDate(date)}, ${description}">${day}</button>`;
          }).join('')}
        </div>
        <div class="calendar-footer">
          <span class="calendar-legend">День с тренировкой</span>
          ${currentDate.startsWith(monthKey) ? '' : iconButton('calendar-today', 'Перейти к текущей дате', 'calendar', `data-date="${currentDate}"`)}
        </div>
      </section>
      <section class="calendar-agenda" aria-labelledby="calendar-agenda-title">
        <div class="section-heading">
          <h2 id="calendar-agenda-title">${formatDate(selectedDate)}</h2>
          ${selected.length ? `<span class="muted">${countWorkouts(selected.length)}</span>` : ''}
        </div>
        ${action('start-workout', 'Тренируюсь', 'plus', 'primary', `data-date="${selectedDate}"`)}
        ${selected.length ? calendarRows(selected, selectedDate) : '<p class="muted">В этот день тренировок нет.</p>'}
      </section>
    </div>
    <div class="calendar-history"><a class="button secondary" href="#history/${selectedDate}">${icon('journal', 20)} История</a></div>`;
}

function metric(label, value) {
  return `<div class="metric"><dt>${label}</dt><dd>${number(value)}</dd></div>`;
}

export function catalog(state, selection) {
  const sorted = [...state.exercises].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const templates = state.templates ?? [];
  return `<div class="page-heading"><div><h1>Тренировки и упражнения</h1><p>Соберите тренировку и выберите её в календаре, когда начнёте.</p></div></div>
    <section aria-labelledby="programs-title">
      <div class="section-heading catalog-heading"><h2 id="programs-title">Мои тренировки <span class="catalog-count">${number(templates.length)}</span></h2>
        ${action('new-template', 'Новая тренировка', 'plus', 'primary')}</div>
      ${templates.length ? `<ul class="history-list">${templates.map(template => `<li>
        <a class="history-row" href="#template/${template.id}">
          <span class="row-icon">${icon('weights', 21)}</span>
          <span class="row-copy"><strong>${esc(template.name)}</strong><span>${countExercises(template.items.length)}</span></span>
          <span class="row-arrow">${icon('arrow', 20)}</span>
        </a></li>`).join('')}</ul>` : '<p class="muted">Здесь будут тренировки, которые можно повторять.</p>'}
    </section>
    <section class="section" aria-labelledby="exercise-catalog-title">
    <div class="section-heading catalog-heading"><h2 id="exercise-catalog-title">Мои упражнения <span class="catalog-count">${number(sorted.length)}</span></h2>
      <div class="catalog-actions">
        ${sorted.length || selection ? action('select-exercises', selection ? 'Отмена' : 'Выбрать', null) : ''}
        ${selection ? '' : action('new-exercise', 'Новое упражнение', 'plus', 'secondary')}
      </div></div>
    ${sorted.length ? `<label class="search-field">${icon('search', 20)}<input type="search" id="catalog-search" aria-label="Найти упражнение" placeholder="Найти упражнение"></label>` : ''}
    <ul class="catalog-list">${sorted.map(exercise => `<li class="catalog-row" data-exercise-row data-search="${esc(exercise.name.toLocaleLowerCase('ru'))}">
      <span class="row-icon">${icon('weights', 21)}</span>
      <span class="row-copy"><strong>${esc(exercise.name)}</strong><span>${muscleNames(exercise.primary)}</span>
      ${exercise.secondary.length ? `<span class="secondary-muscles">Дополнительно: ${muscleNames(exercise.secondary)}</span>` : ''}</span>
      ${selection ? `<label class="check-cell selection-check"><input type="checkbox" name="selected-exercise" value="${exercise.id}"
        aria-label="Выбрать «${esc(exercise.name)}»" ${selection.has(exercise.id) ? 'checked' : ''}></label>` : `<div class="row-actions">
        ${iconButton('edit-exercise', 'Редактировать упражнение', 'edit', `data-id="${exercise.id}"`)}
        ${iconButton('delete-exercise', 'Удалить упражнение', 'trash', `data-id="${exercise.id}"`)}
      </div>`}
    </li>`).join('')}</ul>
    <div class="empty" id="catalog-empty" ${sorted.length ? 'hidden' : ''}>
      <span class="row-icon">${icon('search', 22)}</span>
      <div><h3>${sorted.length ? 'Совпадений нет' : 'Каталог пуст'}</h3><p>${sorted.length ? 'Попробуйте другое название.' : 'Добавьте упражнение и выберите его группы мышц.'}</p></div>
    </div>
    ${selection ? `<div class="bulk-bar">
      <span id="bulk-count" aria-live="polite">Выбрано: ${selection.size}</span>
      ${action('delete-selected', 'Удалить выбранные', 'trash', 'danger', selection.size ? '' : 'disabled')}
    </div>` : ''}
    </section>`;
}

export function workoutView(workout, { date, history = false, template = false, unit } = {}) {
  const stats = workoutStats(workout);
  const canReorder = workout.items.length > 1;
  return `${workoutBackLink(date, history, template)}
    <div class="workout-head">
      <div class="page-heading"><div><h1>${esc(workout.name)}</h1><p>${template ? 'Шаблон тренировки' : `${formatDate(workout.date)} · ${workout.startedAt ? `начало в ${formatStart(workout)}` : formatStart(workout)}`}</p></div>
      <div class="row-actions">
        ${iconButton('edit-workout', 'Редактировать тренировку', 'edit')}
        ${iconButton('delete-workout', 'Удалить тренировку', 'trash')}
      </div></div>
      <div class="workout-totals"><span>${countExercises(workout.items.length)}</span><span>${countSets(stats.sets)}</span><span>${number(stats.volume)} кг объёма</span></div>
    </div>
    <section class="section" aria-labelledby="workout-items">
      <div class="section-heading exercise-section-heading">
        <h2 id="workout-items">Упражнения</h2>
        ${action('choose-item', 'Добавить упражнение', 'plus', 'primary')}
      </div>
      ${template ? '' : '<p class="muted session-edit-hint">Замены сохраняются только в этой записи тренировки.</p>'}
      ${canReorder ? '<p class="muted exercise-order-hint">Тяните за номер или нажмите, чтобы выбрать позицию.</p>' : ''}
      <div class="workout-items">
        ${workout.items.map((item, index) => `<article class="exercise-entry" data-exercise-id="${item.id}" tabindex="-1" aria-labelledby="exercise-title-${item.id}">
          <div class="entry-head">
            ${canReorder ? `<button type="button" class="exercise-grip" data-action="move-item" data-id="${item.id}"
              aria-label="Переместить «${esc(item.name)}», позиция ${index + 1}">${icon('grip', 14)}<span class="exercise-number">${index + 1}</span></button>` :
              `<span class="exercise-grip"><span class="sr-only">Позиция </span><span class="exercise-number">${index + 1}</span></span>`}
            <div class="row-copy"><h3 id="exercise-title-${item.id}">${esc(item.name)}</h3>
              ${item.note ? `<p class="exercise-note">${esc(item.note)}</p>` : ''}
              <span>${muscleNames(item.primary)}</span>
            </div>
            <div class="row-actions">
              ${iconButton('edit-item', 'Настроить упражнение в тренировке', 'edit', `data-id="${item.id}"`)}
              ${iconButton('delete-item', 'Убрать из тренировки', 'trash', `data-id="${item.id}"`)}
            </div>
          </div>
          ${item.sets.length ? `<table class="set-table"><thead><tr><th scope="col">Подход</th><th scope="col">Вес, кг</th><th scope="col">Повторы</th><th scope="col"><span class="sr-only">Действия</span></th></tr></thead><tbody>
            ${item.sets.map((set, index) => `<tr><th scope="row">${index + 1}</th><td>${number(set.kg)}</td><td>${number(set.reps)}</td>
              <td><div class="row-actions">${iconButton('edit-set', `Редактировать подход ${index + 1}`, 'edit', `data-id="${item.id}" data-set="${set.id}"`)}
              ${iconButton('delete-set', `Удалить подход ${index + 1}`, 'trash', `data-id="${item.id}" data-set="${set.id}"`)}</div></td></tr>`).join('')}
          </tbody></table>` : '<p class="empty-set">Запишите первый подход.</p>'}
          ${action('new-set', 'Добавить подход', 'plus', 'text-button', `data-id="${item.id}"`)}
        </article>`).join('')}
      </div>
      ${!workout.items.length ? '<p class="muted empty-workout">Выберите упражнение из каталога или создайте своё.</p>' : ''}
    </section>
    ${loadView(stats, unit)}`;
}

export function workoutBackLink(date, history = false, template = false) {
  const target = template ? 'exercises' : history ? `history${date ? `/${date}` : ''}` : `calendar${date ? `/${date}` : ''}`;
  const label = template ? 'К тренировкам' : history ? 'К истории' : 'К календарю';
  return `<a class="button secondary workout-back" href="#${target}">${icon('back', 19)} ${label}</a>`;
}

function loadView(stats, unit, week) {
  const kg = unit === 'kg';
  const values = kg ? stats.muscleKg : stats.load;
  const ranked = Object.keys(MUSCLES).sort((a, b) => values[b] - values[a]);
  const max = values[ranked[0]] || 1;
  return `<section class="load-panel section" aria-labelledby="load-title">
    <div class="section-heading load-heading">
      <h2 id="load-title">${week ? 'Нагрузка за неделю' : 'Нагрузка по мышцам'}</h2>
      <div class="unit-picker" role="group" aria-label="Единица нагрузки">
        ${action('load-unit', 'Кг', null, 'text-button', `data-id="kg" aria-pressed="${kg}"`)}
        ${action('load-unit', 'Баллы', null, 'text-button', `data-id="points" aria-pressed="${!kg}"`)}
      </div>
    </div>
    ${week ? `<p class="week-dates">Актуально на ${shortDate(week.start)} - ${shortDate(week.end)}</p>${muscleArt(values)}` : ''}
    <table class="muscle-table">
      <thead><tr><th scope="col">Группа мышц</th><th scope="col">${kg ? 'Кг' : 'Баллы'}</th></tr></thead>
      <tbody>${ranked.map(key => `<tr><th scope="row">${MUSCLES[key]}
        <div class="load-track" aria-hidden="true"><span style="--fraction:${values[key] / max}"></span></div>
        </th><td>${number(values[key])}</td></tr>`).join('')}</tbody>
    </table>
    <details class="method load-method">
      <summary class="button secondary">${icon('info', 18)} Как считаем ${icon('next', 14)}</summary>
      <p>Один подход даёт 1 балл каждой основной группе и 0,5 каждой вспомогательной.</p>
      <p>В кг считаем объём: вес × повторы. Для основной группы засчитывается весь объём подхода, для вспомогательной — половина. Поэтому значения по мышцам могут пересекаться.</p>
      <p>При 0 кг подход даёт баллы. Длина полос показывает нагрузку относительно самой нагруженной группы.</p>
    </details>
  </section>`;
}

export function dataView(state, standalone) {
  return `<div class="page-heading"><div><h1>Резервные копии</h1><p>Дневник хранится на этом устройстве. JSON-файл позволяет перенести его или восстановить после очистки данных.</p></div></div>
    <div class="data-list">
      <section class="data-row"><div class="row-icon">${icon('download')}</div><div><h2>Сохранить полную копию</h2>
      <p>В JSON входят тренировки и шаблоны, упражнения в сохранённом порядке, заметки, подходы, план следующей тренировки, замеры InBody и настройки отображения.</p>
      ${action('export', 'Скачать JSON', 'download', 'primary')}</div></section>
      <section class="data-row"><div class="row-icon">${icon('upload')}</div><div><h2>Восстановить дневник</h2>
      <p>На новом телефоне откройте дневник, выберите здесь сохранённый JSON и подтвердите восстановление. Полная копия заменит данные и настройки дневника на этом устройстве.</p>
      ${action('select-backup', 'Выбрать JSON', 'upload')}
      <input id="backup-file" type="file" accept=".json,application/json" hidden></div></section>
      ${standalone ? '' : `<section class="data-row"><div class="row-icon">${icon('info')}</div><div><h2>Установка на iPhone</h2>
      <p>В Safari откройте меню «Поделиться», выберите «На экран “Домой”» и включите «Открыть как веб‑приложение», если такой переключатель есть. Запустите дневник с иконки при включённом интернете и дождитесь зелёной надписи «offline».</p></div></section>`}
    </div>`;
}

export function muscleFields(exercise) {
  return `<fieldset class="muscle-fields"><legend>Группы мышц</legend>
    <p>Выберите хотя бы одну основную группу.</p>
    <div class="muscle-grid"><div class="muscle-grid-head">Группа</div><div class="muscle-grid-head">Основная</div><div class="muscle-grid-head">Помощь</div>
      ${Object.entries(MUSCLES).map(([key, name]) => `<div class="muscle-name">${name}</div>
        <label class="check-cell" title="${name}: основная"><input type="checkbox" name="primary" value="${key}" aria-label="${name}: основная" ${exercise?.primary.includes(key) ? 'checked' : ''}></label>
        <label class="check-cell" title="${name}: вспомогательная"><input type="checkbox" name="secondary" value="${key}" aria-label="${name}: вспомогательная" ${exercise?.secondary.includes(key) ? 'checked' : ''}></label>`).join('')}
    </div></fieldset>`;
}

const orderMeasurements = entries => [...entries].sort((a, b) => a.date.localeCompare(b.date));
const displayReading = (value, unit = '') => value === undefined ? '—' :
  `${number(value)}${unit === '%' ? '%' : unit ? ' ' + unit : ''}`;

export function measurementFields(entry) {
  const fields = (definitions, prefix = '') => Object.entries(definitions).map(([key, [label, unit]]) => {
    const name = prefix + key;
    return `<label class="field">${label}${unit ? ', ' + unit : ''}
      <input name="${name}" inputmode="decimal" maxlength="10" autocomplete="off"
        value="${entry?.values[name] ?? ''}" placeholder="—">
    </label>`;
  }).join('');
  return `<label class="field">Дата замера<input name="date" type="date" required min="1000-01-01" max="9999-12-31" value="${entry?.date ?? today()}"></label>
    <p class="form-hint inbody-form-hint">Заполните хотя бы один показатель. Пустые поля сохраняются как пропуски.</p>
    <div class="reading-fields">${fields(INBODY_MAIN)}</div>
    <details class="method"><summary>Дополнительные показатели</summary>
      <div class="reading-fields">${fields(INBODY_EXTRA)}</div>
    </details>
    <details class="method"><summary>Руки, ноги и торс</summary>
      <p class="muted">Проценты по сегментам вносятся относительно референса из отчёта.</p>
      ${Object.entries(INBODY_SEGMENTS).map(([segment, label]) => `<fieldset class="reading-segment">
        <legend>${label}</legend><div class="reading-fields">${fields(INBODY_SEGMENT_FIELDS, segment + '_')}</div>
      </fieldset>`).join('')}
    </details>`;
}

export function inbodyChart(entries, metricKey) {
  const [label, unit] = INBODY_METRICS[metricKey];
  const points = orderMeasurements(entries).filter(entry => entry.values[metricKey] !== undefined)
    .map(entry => ({ date: entry.date, timestamp: Date.parse(entry.date), value: entry.values[metricKey] }));
  if (!points.length) return '<p class="muted">Для этого показателя ещё нет замеров.</p>';
  if (points.length === 1) {
    return `<p class="muted">Один замер · ${shortDate(points[0].date)} · ${displayReading(points[0].value, unit)}. График появится после второго.</p>`;
  }
  const first = points[0];
  const last = points.at(-1);
  let low = first.value;
  let high = low;
  for (const { value } of points) {
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  const step = Math.max((high - low) / 4, 0.05);
  const min = Math.max(0, low - step);
  const max = high + step;
  const axis = [max, (min + max) / 2, min];
  const coordinates = points.map(point => ({
    ...point,
    x: 54 + 284 * (point.timestamp - first.timestamp) / (last.timestamp - first.timestamp),
    y: 17 + 112 * (max - point.value) / (max - min),
  }));
  return `<svg class="inbody-chart" viewBox="0 0 350 158" role="img" aria-label="${label}: от ${displayReading(first.value, unit)} до ${displayReading(last.value, unit)}">
    ${axis.map((value, i) => `<g><text x="47" y="${21 + i * 56}" text-anchor="end">${number(value)}</text><path d="M54 ${17 + i * 56}H338" class="chart-grid"/></g>`).join('')}
    <polyline class="chart-line" points="${coordinates.map(p => `${p.x},${p.y}`).join(' ')}"/>
    ${coordinates.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5"><title>${shortDate(p.date)} — ${displayReading(p.value, unit)}</title></circle>`).join('')}
    <text x="54" y="150">${shortDate(first.date)}</text>
    <text x="338" y="150" text-anchor="end">${shortDate(last.date)}</text>
  </svg>`;
}

function readingDelta(current, base, unit) {
  if (current === undefined || base === undefined) return '—';
  const change = Math.round((current - base) * 100) / 100;
  return `${change > 0 ? '+' : ''}${displayReading(change, unit === '%' ? 'п. п.' : unit)}`;
}

function inbodySummary(entries, metricKey = DEFAULT_INBODY_METRIC) {
  const sorted = orderMeasurements(entries);
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  const first = sorted.length > 1 ? sorted[0] : undefined;
  return `<section class="load-panel inbody-panel section" aria-labelledby="inbody-title">
    <div class="section-heading load-heading">
      <h2 id="inbody-title">Состав тела · InBody</h2>
      ${action('new-measurement', 'Новые показания', 'plus', 'primary')}
    </div>
    ${latest ? `<p class="muted">Последний замер · ${shortDate(latest.date)}</p>
      <dl class="reading-summary">${Object.entries(INBODY_MAIN).map(([key, [label, unit]]) => `<div>
        <dt>${label}</dt><dd>${displayReading(latest.values[key], unit)}</dd>
        ${previous && latest.values[key] !== undefined ? `<dd class="reading-delta">
          К прошлому: <span>${readingDelta(latest.values[key], previous.values[key], unit)}</span><br>
          К первому: <span>${readingDelta(latest.values[key], first.values[key], unit)}</span></dd>` : ''}
      </div>`).join('')}</dl>
      <label class="field chart-select">Показатель на графике<select id="inbody-metric">
        ${Object.entries(INBODY_METRICS).map(([key, [label, unit]]) => `<option value="${key}" ${key === metricKey ? 'selected' : ''}>${label}${unit ? ', ' + unit : ''}</option>`).join('')}
      </select></label>
      <div id="inbody-chart">${inbodyChart(sorted, metricKey)}</div>` :
      '<p class="muted">Добавьте первый замер. После второго здесь появится динамика.</p>'}
    <a href="#inbody" class="button secondary inbody-history-link">${icon('journal', 20)} История замеров</a>
  </section>`;
}

export function inbodyHistory(entries) {
  const sorted = orderMeasurements(entries).reverse();
  return `<a class="back-link" href="#journal">${icon('back', 19)} К дневнику</a>
    <div class="page-heading"><div><h1>История InBody</h1>
    <p>${plural(sorted.length, 'замер', 'замера', 'замеров')}</p></div></div>
    <div class="inbody-actions">
      ${action('new-measurement', 'Новые показания', 'plus', 'primary')}
      ${action('select-inbody', 'Импорт замеров', 'upload')}
      <input type="file" id="inbody-file" accept=".json,application/json" hidden>
    </div>
    ${sorted.length ? `<ul class="history-list">${sorted.map(entry => `<li>
      <a class="history-row" href="#inbody/${entry.id}">
        <span class="row-icon">${icon('calendar', 21)}</span>
        <span class="row-copy"><strong>${formatDate(entry.date)}</strong><span>Вес ${displayReading(entry.values.weight, 'кг')} · жир ${displayReading(entry.values.fatPercent, '%')}</span></span>
        <span class="row-arrow">${icon('arrow', 20)}</span>
      </a></li>`).join('')}</ul>` : '<p class="muted">Здесь будут все ваши замеры InBody.</p>'}`;
}

export function inbodyDetails(entry) {
  const back = `<a class="back-link" href="#inbody">${icon('back', 19)} К истории замеров</a>`;
  if (!entry) return `${back}<h1>Замер не найден</h1>`;
  const segments = Object.entries(INBODY_SEGMENTS).filter(([key]) =>
    Object.keys(INBODY_SEGMENT_FIELDS).some(field => entry.values[key + '_' + field] !== undefined));
  return `${back}<div class="page-heading"><div><h1>Замер InBody</h1><p>${formatDate(entry.date)}</p></div>
    <div class="row-actions">${iconButton('edit-measurement', 'Редактировать замер', 'edit')}
      ${iconButton('delete-measurement', 'Удалить замер', 'trash')}</div></div>
    <table class="muscle-table reading-table"><thead><tr><th scope="col">Показатель</th><th scope="col">Значение</th></tr></thead>
    <tbody>${Object.entries(INBODY_METRICS).filter(([key]) => entry.values[key] !== undefined)
      .map(([key, [label, unit]]) => `<tr><th scope="row">${label}</th><td>${displayReading(entry.values[key], unit)}</td></tr>`).join('') ||
      '<tr><td colspan="2">В этом замере заполнены данные по сегментам.</td></tr>'}</tbody></table>
    ${segments.length ? `<section class="section"><h2>Руки, ноги и торс</h2>
      <table class="muscle-table reading-table segment-table"><thead><tr><th scope="col">Сегмент</th><th scope="col">Безжировая</th><th scope="col">Жировая</th></tr></thead>
      <tbody>${segments.map(([key, label]) => `<tr><th scope="row">${label}</th>
        ${['lean', 'fat'].map(type => {
          const ref = entry.values[`${key}_${type}Ref`];
          return `<td>${displayReading(entry.values[`${key}_${type}Kg`], 'кг')}${ref === undefined ? '' : `<small>${displayReading(ref, '%')} от референса</small>`}</td>`;
        }).join('')}</tr>`).join('')}</tbody></table></section>` : ''}`;
}
