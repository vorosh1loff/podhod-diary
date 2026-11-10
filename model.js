export const MUSCLES = {
  chest: 'Грудь', back: 'Спина', shoulders: 'Плечи', biceps: 'Бицепс',
  triceps: 'Трицепс', forearms: 'Предплечья', abs: 'Корпус',
  quads: 'Квадрицепсы', hamstrings: 'Задняя поверхность бедра', glutes: 'Ягодицы', calves: 'Икры',
};

const starters = [
  ['Жим лёжа', ['chest'], ['triceps', 'shoulders']],
  ['Тяга верхнего блока', ['back'], ['biceps', 'forearms']],
  ['Присед со штангой', ['quads', 'glutes'], ['abs']],
  ['Румынская тяга', ['hamstrings', 'glutes'], ['back', 'forearms']],
  ['Жим гантелей сидя', ['shoulders'], ['triceps']],
  ['Подтягивания', ['back'], ['biceps', 'forearms']],
  ['Сгибание рук с гантелями', ['biceps'], ['forearms']],
  ['Разгибание рук на блоке', ['triceps'], []],
  ['Отжимания', ['chest'], ['triceps', 'shoulders', 'abs']],
  ['Скручивания', ['abs'], []],
  ['Ягодичный мост', ['glutes'], ['hamstrings']],
  ['Подъёмы на носки', ['calves'], []],
];

export const initialState = () => ({
  exercises: starters.map(([name, primary, secondary], index) => ({ id: `base-${index + 1}`, name, primary, secondary })),
  workouts: [],
  revision: 0,
});

export function today() {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(value => String(value).padStart(2, '0')).join('-');
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format;
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatDate = value => dateFormat.format(new Date(value)).replace(/\s*г\.$/, '');
export const plural = (value, one, few, many) => {
  const ending = value % 10;
  const teen = value % 100 >= 11 && value % 100 <= 14;
  return `${number(value)} ${!teen && ending === 1 ? one : !teen && ending >= 2 && ending <= 4 ? few : many}`;
};

export function workoutStats(workout) {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  const load = Object.fromEntries(Object.keys(MUSCLES).map(key => [key, 0]));
  for (const item of workout.items) {
    sets += item.sets.length;
    for (const set of item.sets) {
      reps += set.reps;
      volume += set.kg * set.reps;
    }
    for (const key of item.primary) load[key] += item.sets.length;
    for (const key of item.secondary) load[key] += item.sets.length * 0.5;
  }
  return { sets, reps, volume, load };
}

const check = (valid, message) => { if (!valid) throw new Error(message); };
const isID = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const isName = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 80;
export const NOTE_LIMIT = 160;
export const validNote = value => typeof value === 'string' && value.length <= NOTE_LIMIT;
const hasUniqueIDs = items => new Set(items.map(item => item.id)).size === items.length;
const validGroups = items => Array.isArray(items) && items.length <= Object.keys(MUSCLES).length &&
  items.every(key => typeof key === 'string' && Object.hasOwn(MUSCLES, key));
export const validSet = (kg, reps) => typeof kg === 'number' && Number.isFinite(kg) &&
  kg >= 0 && kg <= 2000 && Math.abs(kg * 100 - Math.round(kg * 100)) < 1e-7 &&
  Number.isInteger(reps) && reps >= 1 && reps <= 999;

export function backupOf(state) {
  return { format: 'podhod-training-diary', version: 1, exportedAt: new Date().toISOString(),
    exercises: state.exercises, workouts: state.workouts };
}

export function parseBackup(value) {
  check(value?.format === 'podhod-training-diary' && value.version === 1,
    'Этот файл не распознан как резервная копия «Подхода» версии 1.');
  check(Array.isArray(value.exercises) && Array.isArray(value.workouts), 'В файле нет корректных списков упражнений и тренировок.');

  function exercise(value) {
    check(isID(value?.id) && isName(value.name), 'У упражнения отсутствует название или идентификатор.');
    const { id, name, primary, secondary, note } = value;
    check(validGroups(primary) && primary.length > 0 && validGroups(secondary) &&
      new Set([...primary, ...secondary]).size === primary.length + secondary.length,
    'Проверьте основные и вспомогательные группы мышц в файле.');
    check(note === undefined || validNote(note), `Заметка к упражнению должна быть текстом до ${NOTE_LIMIT} символов.`);
    return { id, name: name.trim(), primary: [...primary], secondary: [...secondary],
      ...(note?.trim() ? { note: note.trim() } : {}) };
  }

  const exercises = value.exercises.map(exercise);
  const workouts = value.workouts.map(entry => {
    check(isID(entry?.id) && isName(entry.name) && isDate(entry.date) && Array.isArray(entry.items),
      'В файле есть тренировка с неверной датой или структурой.');
    const items = entry.items.map(item => {
      const snapshot = exercise(item);
      check(isID(item.exerciseId) && Array.isArray(item.sets), 'В упражнении повреждён список подходов.');
      const sets = item.sets.map(set => {
        check(isID(set?.id) && validSet(set.kg, set.reps), 'В файле есть подход с неверным весом или числом повторений.');
        return { id: set.id, kg: set.kg, reps: set.reps };
      });
      check(hasUniqueIDs(sets), 'В файле повторяются идентификаторы подходов.');
      return { ...snapshot, exerciseId: item.exerciseId, sets };
    });
    check(hasUniqueIDs(items) && new Set(items.map(item => item.exerciseId)).size === items.length,
      'В одной тренировке повторяются упражнения.');
    return { id: entry.id, name: entry.name.trim(), date: entry.date, items };
  });
  check(hasUniqueIDs(exercises) && hasUniqueIDs(workouts), 'В файле повторяются идентификаторы записей.');
  return { exercises, workouts };
}
