import { formatDate, formatStart, number, plural } from './model.js';

const reportMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const margin = 15;
const bottom = 280;
const rowHeight = 7;
const fontSize = 11;

async function createPdf() {
  const [, response] = await Promise.all([
    import('./vendor/jspdf-4.2.1.min.js'),
    fetch(new URL('./vendor/LiberationSans-Regular.ttf', import.meta.url)),
  ]);
  if (!response.ok) throw new Error('Шрифт для отчёта недоступен.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  const pdf = new globalThis.jspdf.jsPDF({ format: 'a4', compress: true, putOnlyUsedFonts: true });
  pdf.addFileToVFS('LiberationSans.ttf', btoa(chunks.join('')));
  pdf.addFont('LiberationSans.ttf', 'LiberationSans', 'normal');
  pdf.setFont('LiberationSans');
  return pdf;
}

export async function workoutReport(workouts, exercises, period, month) {
  const pdf = await createPdf();
  const names = new Map(exercises.map(exercise => [exercise.id, exercise.name]));
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date) ||
    (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
  const label = month ? reportMonth.format(new Date(period + '-01')) : formatDate(sorted[0].date);
  const total = plural(sorted.length, 'тренировка', 'тренировки', 'тренировок');
  const width = pdf.internal.pageSize.getWidth() - 2 * margin;
  let y = margin;

  function wrap(value, size) {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(value, width);
  }

  function text(value, size, spacing, color = '#182030') {
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    for (const line of Array.isArray(value) ? value : [value]) {
      pdf.text(line, margin, y, { baseline: 'top' });
      y += spacing;
    }
  }

  function header(continuation = false) {
    text('Отчёт о тренировках', continuation ? 14 : 22, continuation ? 7 : 11);
    text(continuation ? label : `${label} · ${total}`, 11, 8, '#4c5666');
    pdf.setDrawColor('#aab5c4');
    pdf.line(margin, y, margin + width, y);
    y += 7;
  }

  function nextPage() {
    pdf.addPage();
    y = margin;
    header(true);
  }

  function tableRow(cells, heading = false) {
    if (heading) {
      pdf.setFillColor('#edf1f6');
      pdf.rect(margin, y, width, rowHeight, 'F');
    }
    pdf.setFontSize(fontSize);
    pdf.setTextColor('#182030');
    pdf.text(cells[0], margin + 3, y + 1.7, { baseline: 'top' });
    pdf.text(cells[1], margin + width * 0.63, y + 1.7, { align: 'right', baseline: 'top' });
    pdf.text(cells[2], margin + width - 3, y + 1.7, { align: 'right', baseline: 'top' });
    y += rowHeight;
    pdf.setDrawColor('#d7dde5');
    pdf.line(margin, y, margin + width, y);
  }

  const columns = ['Подход', 'Вес, кг', 'Повторы'];
  const setCount = count => plural(count, 'подход', 'подхода', 'подходов');
  header();

  for (const workout of sorted) {
    const date = formatDate(workout.date);
    const context = workout.startedAt ? `${date} · ${formatStart(workout)}` : date;
    const title = wrap(workout.name, 16);
    if (y + 13 + title.length * 7 + 35 > bottom) nextPage();
    y += 3;
    text(context, 11, 6, '#4c5666');
    text(title, 16, 7);
    if (!workout.items.length) text('Нет записанных упражнений.', 11, 6, '#4c5666');

    for (const item of workout.items) {
      const name = names.get(item.exerciseId) ?? item.name;
      const heading = wrap(name, 13);
      const setRows = item.sets.length ? 2 * rowHeight : 0;
      if (y + 4 + heading.length * 6 + 6 + setRows > bottom) {
        nextPage();
        text(wrap(`${context} · ${workout.name}`, 10), 10, 5, '#4c5666');
      }
      y += 4;
      text(heading, 13, 6);
      text(setCount(item.sets.length), 10, 6, '#4c5666');
      if (!item.sets.length) continue;
      tableRow(columns, true);

      for (const [index, set] of item.sets.entries()) {
        if (y + rowHeight > bottom) {
          nextPage();
          text(wrap(`${context} · ${workout.name}`, 10), 10, 5, '#4c5666');
          text(wrap(`${name} (продолжение)`, 13), 13, 6);
          tableRow(columns, true);
        }
        tableRow([number(index + 1), number(set.kg), number(set.reps)]);
      }
    }
    y += 7;
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFontSize(9);
    pdf.setTextColor('#4c5666');
    pdf.text(`${page} / ${pages}`, margin + width, 288, { align: 'right' });
  }
  pdf.setProperties({ title: `Отчёт о тренировках · ${label}` });
  return pdf.output('arraybuffer');
}
