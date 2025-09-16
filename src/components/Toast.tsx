import React, { useEffect } from 'react';

interface ToastProps {
  show: boolean;
  message: string;
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  show, 
  message, 
  duration = 2000, 
  type = 'success',
  onClose 
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          color: 'white',
          icon: '✅'
        };
      case 'error':
        return {
          backgroundColor: '#f44336',
          color: 'white',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: '#ff9800',
          color: 'white',
          icon: '⚠️'
        };
      case 'info':
        return {
          backgroundColor: '#2196F3',
          color: 'white',
          icon: 'ℹ️'
        };
      default:
        return {
          backgroundColor: '#4CAF50',
          color: 'white',
          icon: '✅'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: typeStyles.backgroundColor,
        color: typeStyles.color,
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: show ? 'toastSlideIn 0.3s ease-out' : 'toastSlideOut 0.3s ease-in',
        minWidth: '200px',
        maxWidth: '400px'
      }}
    >
      <span style={{ fontSize: '16px' }}>{typeStyles.icon}</span>
      <span>{message}</span>
      
      {/* 添加CSS动画样式 */}
      <style>
        {`
          @keyframes toastSlideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes toastSlideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Toast;