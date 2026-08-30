/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Пороги перестроения. Стандартные имена Tailwind сохранены со стандартными
    // значениями — на них держится существующая разметка. Добавлены три своих,
    // под реальные пороги приложения, которые раньше были вписаны пикселями по месту.
    // Список задан целиком, а не через extend: Tailwind выводит медиазапросы в порядке
    // объявления, и только так свои пороги встают между стандартными, а не после них.
    screens: {
      sm: '640px',
      md: '768px',
      cards: '900px',   // помещается вторая карточка дня в Расписании
      lg: '1024px',
      xl: '1280px',
      wide: '1400px',   // четыре колонки: дни недели 4×2 и сетка заметок
      '2xl': '1536px',
      ultra: '1600px'   // пятая колонка заметок
    },
    extend: {
      // Размеры текста: четыре роли на всё приложение, больше нигде размер
      // на глаз не выбираем. Значения равны тем, что уже стоят по месту,
      // поэтому подстановка ничего не сдвигает визуально.
      fontSize: {
        title: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'title-lg': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        section: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em', fontWeight: '500' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }]
      },

      // Высота элементов управления: обычная и мелкая внутри карточек
      height: { control: '2.25rem', 'control-sm': '1.75rem', 'day-card': '315px' },
      minHeight: { control: '2.25rem', 'control-sm': '1.75rem' },
      width: { control: '2.25rem', 'control-sm': '1.75rem' },

      // Слои. Раньше боковое меню (z-50) перекрывало окно заметки (z-40) —
      // теперь порядок задан явно и один раз
      zIndex: { dropdown: '30', sidebar: '40', modal: '50', viewer: '60', toast: '70' },

      // Ширины контента: узкая колонка для форм и предельная ширина окна
      maxWidth: { prose: '48rem', modal: '56rem' },

      // Микро-интеракции: каждая анимация отвечает ровно за одну реакцию на действие юзера
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        // всплывающие панели (пикеры стикеров и цвета)
        'pop-in': {
          from: { opacity: '0', transform: 'scale(.96) translateY(-4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        // тосты: приезжают справа, оттуда же где появляются
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(1rem) scale(.96)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' }
        },
        'dialog-in': {
          from: { opacity: '0', transform: 'scale(.96) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        // подтверждение отметки чекбокса
        'check-pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' }
        },
        // «живой» индикатор: идёт таймер / идёт синхронизация
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(22,101,52,.5)' },
          '70%': { boxShadow: '0 0 0 14px rgba(22,101,52,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(22,101,52,0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'pop-in': 'pop-in .14s ease-out',
        'toast-in': 'toast-in .22s cubic-bezier(.16,1,.3,1)',
        'dialog-in': 'dialog-in .18s cubic-bezier(.16,1,.3,1)',
        'check-pop': 'check-pop .28s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-out infinite'
      }
    },
  },
  plugins: [],
}
