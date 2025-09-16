import React, { useEffect, useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: `rgba(0, 0, 0, ${isAnimating ? '0.5' : '0'})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        margin: '20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        transform: `scale(${isAnimating ? '1' : '0.8'}) translateY(${isAnimating ? '0' : '20px'})`,
        opacity: isAnimating ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* 标题栏 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #eee',
          paddingBottom: '15px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#333'
          }}>
            💡 使用指南
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        {/* 核心原则 */}
        <div style={{ 
          marginBottom: '25px',
          textAlign: 'center',
          background: '#f5f5f5',
          color: '#333',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid #e0e0e0'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '800',
            letterSpacing: '1px'
          }}>
            同色相连，虚实相连，方多圆单！
          </div>
        </div>

        {/* 颜色原则 */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '15px'
          }}>
            🎨 端口颜色
          </h3>
          
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#e53e3e',
                  borderRadius: '50%',
                  border: '2px solid #c53030'
                }}></div>
                <span style={{ fontSize: '14px' }}>
                  红色 = 数字类型 (NUMBER)
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#3182ce',
                  borderRadius: '50%',
                  border: '2px solid #2c5aa0'
                }}></div>
                <span style={{ fontSize: '14px' }}>
                  蓝色 = 布尔类型 (BOOLEAN)
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#38a169',
                  borderRadius: '50%',
                  border: '2px solid #2f855a'
                }}></div>
                <span style={{ fontSize: '14px' }}>
                  绿色 = 执行类型 (EXECUTION)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 形状和填充原则 */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '12px'
          }}>
            🔸 端口形状和填充
          </h3>
          
          <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#666',
                borderRadius: '50%'
              }}></div>
              <span><strong>圆形</strong> = 单连接端口</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#666',
                borderRadius: '2px'
              }}></div>
              <span><strong>方形</strong> = 多连接端口</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#666',
                borderRadius: '50%'
              }}></div>
              <span><strong>实心</strong> = 输出端口</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: 'white',
                border: '2px solid #666',
                borderRadius: '50%'
              }}></div>
              <span><strong>空心</strong> = 输入端口</span>
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#333',
            marginBottom: '12px'
          }}>
            📝 操作指南
          </h3>
          
          <ul style={{
            margin: 0,
            paddingLeft: '18px',
            lineHeight: '1.6',
            fontSize: '14px',
            color: '#555'
          }}>
            <li>Answer/Score需要输入≥1的下标</li>
            <li>Output/Label需要输入≥1的编号</li>
            <li>数字节点可输入任意数值</li>
            <li>运算节点可选择具体类型</li>
            <li>拖拽连接线连接节点</li>
            <li>只能连接相同颜色的端口</li>
            <li>选中节点查看属性面板</li>
            <li>按Delete删除选中项</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;