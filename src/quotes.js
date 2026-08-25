// Фразы со смыслом из кино, мультфильмов и книг — показываются над расписанием.
// Подобраны короткие: строка над сеткой не должна превращаться в абзац.
export const QUOTES = [
  { text: 'All we have to decide is what to do with the time that is given us.', source: 'Gandalf, The Lord of the Rings' },
  { text: 'Yesterday is history, tomorrow is a mystery, but today is a gift.', source: 'Master Oogway, Kung Fu Panda' },
  { text: 'Do. Or do not. There is no try.', source: 'Yoda, The Empire Strikes Back' },
  { text: 'Get busy living, or get busy dying.', source: 'The Shawshank Redemption' },
  { text: 'Hope is a good thing, maybe the best of things.', source: 'Andy Dufresne, The Shawshank Redemption' },
  { text: 'It is our choices that show what we truly are, far more than our abilities.', source: 'Albus Dumbledore, Harry Potter' },
  { text: 'It does not do to dwell on dreams and forget to live.', source: 'Albus Dumbledore, Harry Potter' },
  { text: 'Carpe diem. Seize the day.', source: 'John Keating, Dead Poets Society' },
  { text: 'Why do we fall? So that we can learn to pick ourselves up.', source: 'Thomas Wayne, Batman Begins' },
  { text: 'The night is darkest just before the dawn. And the dawn is coming.', source: 'Harvey Dent, The Dark Knight' },
  { text: 'Not all those who wander are lost.', source: 'J. R. R. Tolkien, The Fellowship of the Ring' },
  { text: 'Even the smallest person can change the course of the future.', source: 'Galadriel, The Lord of the Rings' },
  { text: 'The past can hurt. But you can either run from it, or learn from it.', source: 'Rafiki, The Lion King' },
  { text: 'Just keep swimming.', source: 'Dory, Finding Nemo' },
  { text: 'Adventure is out there!', source: 'Up' },
  { text: 'Anyone can cook.', source: 'Chef Gusteau, Ratatouille' },
  { text: 'Your only limit is your soul.', source: 'Chef Gusteau, Ratatouille' },
  { text: 'To infinity and beyond!', source: 'Buzz Lightyear, Toy Story' },
  { text: 'Today is a good day to try.', source: 'Quasimodo, The Hunchback of Notre Dame' },
  { text: 'The flower that blooms in adversity is the most rare and beautiful of all.', source: 'The Emperor, Mulan' },
  { text: 'It is only with the heart that one can see rightly.', source: 'Antoine de Saint-Exupéry, The Little Prince' },
  { text: 'You become responsible, forever, for what you have tamed.', source: 'Antoine de Saint-Exupéry, The Little Prince' },
  { text: 'It is not enough to be busy. The question is: what are we busy about?', source: 'Henry David Thoreau' },
  { text: 'Once you have met someone, you never really forget them.', source: 'Zeniba, Spirited Away' },
  { text: 'A heart is a heavy burden.', source: "Howl's Moving Castle" },
  { text: 'Every man dies. Not every man really lives.', source: 'William Wallace, Braveheart' },
  { text: 'With great power comes great responsibility.', source: 'Uncle Ben, Spider-Man' },
  { text: 'Life is like a box of chocolates. You never know what you are gonna get.', source: 'Forrest Gump' },
  { text: 'Roads? Where we are going we do not need roads.', source: 'Doc Brown, Back to the Future' },
  { text: 'We accept the love we think we deserve.', source: 'Stephen Chbosky, The Perks of Being a Wallflower' }
];

// Индекс считаем от даты, а не через Math.random: компонент перерисовывается на каждое
// нажатие клавиши в полях расписания, и случайная фраза скакала бы при вводе.
// Date.UTC — чтобы переход на зимнее/летнее время не сдвигал номер дня.
export const getQuoteForDate = (date = new Date(), offset = 0) => {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const index = (((dayNumber + offset) % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[index];
};
