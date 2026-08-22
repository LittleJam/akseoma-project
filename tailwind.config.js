/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
