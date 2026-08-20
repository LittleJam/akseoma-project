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
