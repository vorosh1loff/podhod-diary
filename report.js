import { formatDate, formatStart, number, plural } from './model.js';
import { esc } from './views.js';

const reportMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function workoutReport(workouts, exercises, period, month) {
  const names = new Map(exercises.map(exercise => [exercise.id, exercise.name]));
  const byDate = new Map();
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date) ||
    (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
  for (const workout of sorted) {
    if (!byDate.has(workout.date)) byDate.set(workout.date, []);
    byDate.get(workout.date).push(workout);
  }
  const label = month ? reportMonth.format(new Date(period + '-01')) : formatDate(sorted[0].date);
  const total = plural(sorted.length, 'тренировка', 'тренировки', 'тренировок');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Отчёт о тренировках · ${label}</title>
<style>
  :root { color-scheme: light; font: 16px/1.45 system-ui, sans-serif; color: #182030; background: #fff; }
  body { max-width: 760px; margin: auto; padding: 24px 16px; overflow-wrap: anywhere; }
  h1, h2, h3, h4, p { margin: 0 0 8px; }
  header { padding-bottom: 16px; border-bottom: 2px solid #182030; }
  header p, .subtle { color: #4c5666; }
  section { margin-block: 26px; }
  article { margin-top: 16px; }
  .exercise { margin-top: 14px; break-inside: avoid; }
  h2, h3, h4 { break-after: avoid; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #d7dde5; text-align: right; }
  th:first-child { text-align: left; }
  thead { background: #f0f3f7; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<header><h1>Отчёт о тренировках</h1><p>${label} · ${total}</p></header>
${[...byDate].map(([date, records]) => `<section><h2>${formatDate(date)}</h2>
  ${records.map(workout => `<article><h3>${esc(workout.name)}</h3>
    ${workout.startedAt ? `<p class="subtle">Начало · ${formatStart(workout)}</p>` : ''}
    ${workout.items.map(item => `<div class="exercise">
      <h4>${esc(names.get(item.exerciseId) ?? item.name)}</h4>
      <p class="subtle">${plural(item.sets.length, 'подход', 'подхода', 'подходов')}</p>
      ${item.sets.length ? `<table><thead><tr><th scope="col">Подход</th><th scope="col">Вес, кг</th><th scope="col">Повторы</th></tr></thead>
      <tbody>${item.sets.map((set, index) => `<tr><th scope="row">${index + 1}</th><td>${number(set.kg)}</td><td>${number(set.reps)}</td></tr>`).join('')}</tbody></table>` : ''}
    </div>`).join('') || '<p class="subtle">Нет записанных упражнений.</p>'}
  </article>`).join('')}
</section>`).join('')}
</body>
</html>`;
}
