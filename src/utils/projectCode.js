// Получить код проекта - только согласные буквы из названия
export function getProjectCode(name) {
  if (!name) return 'TASK';
  const vowels = 'AEIOUАЕЁИОУЫЭЮЯ';
  const lettersOnly = name.toUpperCase().replace(/[^A-ZА-ЯЁ]/g, '');
  let consonants = '';
  for (let ch of lettersOnly) {
    if (!vowels.includes(ch)) {
      consonants += ch;
    }
  }
  if (!consonants) consonants = lettersOnly || 'TASK';
  return consonants.substring(0, 5) || 'TASK';
}

// Адрес проекта. Выводится из названия один раз при создании и дальше
// не меняется — переименование проекта не должно ломать сохранённые ссылки
// и ярлыки PWA. Та же логика, что у кода задач выше.
const TRANSLIT = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya'
};

export function makeSlug(name) {
  const base = (name || '')
    .toLowerCase()
    .split('')
    .map(ch => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'project';
}

// Совпадения имён разводим числовым суффиксом: два «Surf» дадут surf и surf-2
export function uniqueSlug(name, taken) {
  const base = makeSlug(name);
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// У проектов, созданных до появления адресов, поля slug нет — досоздаём один раз
export function withSlugs(projects) {
  const taken = projects.map(p => p.slug).filter(Boolean);
  return projects.map(p => {
    if (p.slug) return p;
    const slug = uniqueSlug(p.name, taken);
    taken.push(slug);
    return { ...p, slug };
  });
}
