// hooks/useToast.js
import { useState, useCallback, createContext, useContext } from 'react';

// Context oluştur
const ToastContext = createContext(null);

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, title, description, variant, duration };
    
    setToasts((prev) => [...prev, newToast]);

    // Otomatik kaldır
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              background: t.variant === 'destructive' ? '#ef4444' : t.variant === 'warning' ? '#f59e0b' : '#22c55e',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              minWidth: '300px',
              animation: 'slideIn 0.3s ease'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{t.title}</div>
            {t.description && (
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{t.description}</div>
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}