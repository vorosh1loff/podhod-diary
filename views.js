import { MUSCLES, number, plural, formatDate, workoutStats, today } from './model.js';
import { icon, plateArt } from './graphics.js';

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
    ['exercises', 'Упражнения', 'weights'], ['data', 'Копии', 'storage'],
  ].map(([route, label, symbol]) =>
    `<a href="#${route}" ${active === route ? 'aria-current="page"' : ''}>${icon(symbol, 20)}<span>${label}</span></a>`).join('');
}

function historyRows(workouts, calendarDate) {
  return `<ul class="history-list">${workouts.map(workout => {
    const stats = workoutStats(workout);
    return `<li><a class="history-row" href="#workout/${workout.id}${calendarDate ? `/${calendarDate}` : ''}">
      <span class="row-icon">${icon(calendarDate ? 'weights' : 'calendar', 21)}</span>
      <span class="row-copy"><strong>${esc(workout.name)}</strong><span>${calendarDate ? countExercises(workout.items.length) : formatDate(workout.date)}</span></span>
      <span class="row-stats">${calendarDate ? '' : countExercises(workout.items.length)}<small>${countSets(stats.sets)}</small></span>
      <span class="row-arrow">${icon('arrow', 20)}</span>
    </a></li>`;
  }).join('')}</ul>`;
}

export function journal(state) {
  let sets = 0;
  let volume = 0;
  for (const workout of state.workouts) {
    const totals = workoutStats(workout);
    sets += totals.sets;
    volume += totals.volume;
  }
  const sorted = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));
  return `
    <section class="intro">
      ${plateArt}
      <div class="intro-copy">
        <h1>Тренировочный<br>дневник</h1>
        <p>Записывайте подходы и смотрите, какие группы мышц поработали.</p>
        ${action('new-workout', 'Новая тренировка', 'plus', 'primary')}
      </div>
    </section>
    <section class="totals" aria-label="Итоги за всё время">
      ${metric('Тренировки', state.workouts.length, 'calendar')}
      ${metric('Подходы', sets, 'layers')}
      ${metric('Объём, кг', volume, 'weights')}
    </section>
    <section aria-labelledby="history-title" class="section">
      <div class="section-heading"><h2 id="history-title">История тренировок</h2>${sorted.length ? `<span class="muted">${countWorkouts(sorted.length)}</span>` : ''}</div>
      ${sorted.length ? historyRows(sorted) : `<div class="empty">
        <span class="row-icon">${icon('journal', 24)}</span>
        <div><h3>Здесь будет ваша история</h3><p>Создайте тренировку, добавьте упражнение и запишите первый подход.</p></div>
      </div>`}
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
          ${action('calendar-today', 'Сегодня', null, 'text-button', `data-date="${currentDate}"`)}
        </div>
      </section>
      <section class="calendar-agenda" aria-labelledby="calendar-agenda-title">
        <div class="section-heading">
          <h2 id="calendar-agenda-title">${formatDate(selectedDate)}</h2>
          ${selected.length ? `<span class="muted">${countWorkouts(selected.length)}</span>` : ''}
        </div>
        ${selected.length ? historyRows(selected, selectedDate) : '<p class="muted">В этот день тренировок нет.</p>'}
      </section>
    </div>`;
}

function metric(label, value, symbol) {
  return `<div class="metric"><span class="metric-label">${icon(symbol, 17)}${label}</span><strong>${number(value)}</strong></div>`;
}

export function catalog(state) {
  const sorted = [...state.exercises].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return `<div class="page-heading"><div><h1>Упражнения</h1><p>Каталог и группы мышц для расчёта нагрузки.</p></div>
    ${action('new-exercise', 'Новое упражнение', 'plus', 'primary')}</div>
    ${sorted.length ? `<label class="search-field">${icon('search', 20)}<input type="search" id="catalog-search" aria-label="Найти упражнение" placeholder="Найти упражнение"></label>` : ''}
    <ul class="catalog-list">${sorted.map(exercise => `<li class="catalog-row" data-exercise-row data-search="${esc(exercise.name.toLocaleLowerCase('ru'))}">
      <span class="row-icon">${icon('weights', 21)}</span>
      <span class="row-copy"><strong>${esc(exercise.name)}</strong><span>${muscleNames(exercise.primary)}</span>
      ${exercise.secondary.length ? `<span class="secondary-muscles">Дополнительно: ${muscleNames(exercise.secondary)}</span>` : ''}</span>
      <div class="row-actions">
        ${iconButton('edit-exercise', 'Редактировать упражнение', 'edit', `data-id="${exercise.id}"`)}
        ${iconButton('delete-exercise', 'Удалить упражнение', 'trash', `data-id="${exercise.id}"`)}
      </div>
    </li>`).join('')}</ul>
    <div class="empty" id="catalog-empty" ${sorted.length ? 'hidden' : ''}>
      <span class="row-icon">${icon('search', 22)}</span>
      <div><h3>${sorted.length ? 'Совпадений нет' : 'Каталог пуст'}</h3><p>${sorted.length ? 'Попробуйте другое название.' : 'Добавьте упражнение и выберите его группы мышц.'}</p></div>
    </div>`;
}

export function workoutView(workout, calendarDate) {
  const stats = workoutStats(workout);
  return `${workoutBackLink(calendarDate)}
    <div class="workout-head">
      <div class="page-heading"><div><h1>${esc(workout.name)}</h1><p>${formatDate(workout.date)}</p></div>
      <div class="row-actions">
        ${iconButton('edit-workout', 'Редактировать тренировку', 'edit')}
        ${iconButton('delete-workout', 'Удалить тренировку', 'trash')}
      </div></div>
      <div class="workout-totals"><span>${countExercises(workout.items.length)}</span><span>${countSets(stats.sets)}</span><span>${number(stats.volume)} кг объёма</span></div>
    </div>
    <section class="section" aria-labelledby="workout-items">
      <div class="section-heading"><h2 id="workout-items">Упражнения</h2></div>
      <div class="workout-items">
        ${workout.items.map(item => `<article class="exercise-entry">
          <div class="entry-head">
            <div class="row-copy"><h3>${esc(item.name)}</h3>
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
      ${action('choose-item', 'Добавить упражнение', 'plus', 'primary add-exercise')}
    </section>
    ${loadView(stats)}`;
}

export function workoutBackLink(calendarDate) {
  return `<a class="back-link" href="#${calendarDate ? `calendar/${calendarDate}` : 'journal'}">${icon('back', 19)} ${calendarDate ? 'К календарю' : 'К истории'}</a>`;
}

function loadView({ load, sets }) {
  const ranked = Object.entries(load).filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1]);
  const max = ranked[0]?.[1] || 1;
  return `<section class="load-panel section" aria-labelledby="load-title">
    <div class="section-heading"><h2 id="load-title">Нагрузка по мышцам</h2>${sets ? `<span>${countSets(sets)}</span>` : ''}</div>
    ${ranked.length ? `<ul class="load-list">${ranked.map(([key, value]) => `<li>
      <div class="load-label"><span>${MUSCLES[key]}</span><strong>${number(value)}</strong></div>
      <div class="load-track" aria-hidden="true"><span style="--fraction:${value / max}"></span></div>
    </li>`).join('')}</ul>` : '<p class="load-empty">Здесь появится нагрузка, когда вы запишете первый подход.</p>'}
    <details class="method"><summary>${icon('info', 18)} Как считаем</summary>
      <p>За каждый записанный подход каждая основная группа получает 1 балл, каждая вспомогательная — 0,5. Например, три подхода жима дают 3 балла груди и по 1,5 трицепсу и плечам.</p>
      <p>Самая длинная полоса соответствует максимальному баллу в этой тренировке. Вес и повторы влияют на объём (кг × повторы), а баллы показывают число подходов с учётом роли мышцы.</p>
    </details>
  </section>`;
}

export function dataView(state, standalone) {
  return `<div class="page-heading"><div><h1>Резервные копии</h1><p>Дневник хранится на этом устройстве. JSON-файл позволяет перенести его или восстановить после очистки данных.</p></div></div>
    <div class="data-list">
      <section class="data-row"><div class="row-icon">${icon('download')}</div><div><h2>Сохранить копию</h2>
      <p>${countWorkouts(state.workouts.length)} и ${countExercises(state.exercises.length)} в одном файле.</p>
      ${action('export', 'Скачать JSON', 'download', 'primary')}</div></section>
      <section class="data-row"><div class="row-icon">${icon('upload')}</div><div><h2>Восстановить дневник</h2>
      <p>Выбранная копия заменит текущий дневник после вашего подтверждения.</p>
      ${action('select-backup', 'Выбрать JSON', 'upload')}
      <input id="backup-file" type="file" accept=".json,application/json" hidden></div></section>
      ${standalone ? '' : `<section class="data-row"><div class="row-icon">${icon('info')}</div><div><h2>Установка на iPhone</h2>
      <p>В Safari откройте меню «Поделиться», выберите «На экран “Домой”» и включите «Открыть как веб‑приложение», если такой переключатель есть. Запустите дневник с иконки при включённом интернете и дождитесь надписи «Офлайн готов».</p></div></section>`}
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
