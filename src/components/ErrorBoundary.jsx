import React from 'react';

// Страховка от белого экрана. Без неё необработанная ошибка рендера гасит
// всё дерево React молча — ни следа на экране, только в консоли устройства,
// до которой в установленном приложении не добраться без кабеля и Safari
// Web Inspector. Здесь ошибка вместо этого остаётся видна прямо на экране —
// её можно просто сфотографировать
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          padding: '24px',
          paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
          background: '#111827',
          color: '#f9fafb',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          overflowY: 'auto'
        }}
      >
        <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          Something broke
        </h1>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
          Screenshot this and send it over — it's the exact error, not a guess.
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '12px',
            lineHeight: 1.5,
            background: '#1f2937',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          {/* Сообщение отдельно от стека: в Safari error.stack — это только
              кадры, без первой строки с текстом ошибки, как в V8. Без него на
              снимке экрана видны одни адреса, и по ним не сказать ничего */}
          {`${String(this.state.error)}\n\n${this.state.error?.stack || ''}`.trim()}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: '#166534',
            color: 'white',
            fontWeight: 500,
            border: 'none'
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
