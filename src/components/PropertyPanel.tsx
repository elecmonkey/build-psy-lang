import React from 'react';
import { PsyLangNodeData } from '../comp/New';

interface PropertyPanelProps {
  selectedNode: { id: string; data: PsyLangNodeData } | null;
  onUpdateNode: (nodeId: string, newData: Partial<PsyLangNodeData>) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedNode, onUpdateNode }) => {
  if (!selectedNode) {
    return (
      <div style={{
        width: '280px',
        height: '100%',
        background: '#fafafa',
        borderLeft: '1px solid #e0e0e0',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#666',
          marginTop: '50px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚙️</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>属性面板</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            选择一个节点查看其属性
          </div>
        </div>
      </div>
    );
  }

  const { id, data } = selectedNode;
  
  const updateConfig = (key: string, value: string | number) => {
    onUpdateNode(id, {
      config: { ...data.config, [key]: value }
    });
  };

  const renderConfigForm = () => {
    switch (data.nodeType) {
      case 'answer':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                题目编号
              </label>
              <input
                type="number"
                min="1"
                value={data.config.questionId || 1}
                onChange={(e) => updateConfig('questionId', parseInt(e.target.value) || 1)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        );

      case 'score':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                题目编号
              </label>
              <input
                type="number"
                min="1"
                value={data.config.questionId || 1}
                onChange={(e) => updateConfig('questionId', parseInt(e.target.value) || 1)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        );

      case 'math':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                运算符
              </label>
              <select
                value={data.config.operator || '+'}
                onChange={(e) => updateConfig('operator', e.target.value)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="+">+ (加法)</option>
                <option value="-">- (减法)</option>
                <option value="*">× (乘法)</option>
                <option value="/">÷ (除法)</option>
              </select>
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                比较运算符
              </label>
              <select
                value={data.config.operator || '>'}
                onChange={(e) => updateConfig('operator', e.target.value)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value=">">&gt; (大于)</option>
                <option value="<">&lt; (小于)</option>
                <option value=">=">&gt;= (大于等于)</option>
                <option value="<=">&lt;= (小于等于)</option>
                <option value="==">== (等于)</option>
                <option value="!=">!= (不等于)</option>
              </select>
            </div>
          </div>
        );

      case 'logical':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                逻辑运算符
              </label>
              <select
                value={data.config.operator || '&&'}
                onChange={(e) => updateConfig('operator', e.target.value)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="&&">&& (逻辑与)</option>
                <option value="||">|| (逻辑或)</option>
              </select>
            </div>
          </div>
        );

      case 'output':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                输出编号
              </label>
              <input
                type="number"
                min="0"
                value={data.config.outputId || 0}
                onChange={(e) => updateConfig('outputId', parseInt(e.target.value) || 0)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                对应 Output[{data.config.outputId || 0}]
              </div>
            </div>
          </div>
        );

      case 'label':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                标签编号
              </label>
              <input
                type="number"
                min="0"
                value={data.config.labelId || 0}
                onChange={(e) => updateConfig('labelId', parseInt(e.target.value) || 0)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                对应 Label[{data.config.labelId || 0}]
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                标签值
              </label>
              <input
                type="text"
                value={data.config.value || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
                placeholder="High, Medium, Low..."
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        );

      case 'condition':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                条件类型
              </label>
              <select
                value={data.config.conditionType || 'if'}
                onChange={(e) => updateConfig('conditionType', e.target.value)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="if">If (如果)</option>
                <option value="elseif">Else If (否则如果)</option>
              </select>
            </div>
          </div>
        );
      
      case 'assign':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                目标输出编号
              </label>
              <input
                type="number"
                min="1"
                value={data.config.targetOutput || 1}
                onChange={(e) => updateConfig('targetOutput', parseInt(e.target.value) || 1)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                数值
              </label>
              <input
                type="number"
                step="any"
                value={data.config.value || 0}
                onChange={(e) => updateConfig('value', parseFloat(e.target.value) || 0)}
                style={{
                  width: 'calc(100% - 4px)',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getNodeTypeDisplay = (nodeType: string) => {
    const typeMap: Record<string, string> = {
      'answer': 'Answer 输入节点',
      'score': 'Score 输入节点',
      'sum': 'Sum 总分节点',
      'number': '数字节点',
      'math': '数学运算节点',
      'comparison': '比较运算节点',
      'logical': '逻辑运算节点',
      'output': 'Output 输出节点',
      'label': 'Label 标签节点',
      'condition': '条件判断节点',
      'assign': '赋值操作节点'
    };
    return typeMap[nodeType] || nodeType;
  };

  return (
    <div style={{
      width: '280px',
      height: '100%',
      background: '#fafafa',
      borderLeft: '1px solid #e0e0e0',
      padding: '20px',
      overflowY: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#333'
      }}>
        节点属性
      </h3>

      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>节点ID</div>
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: '13px', 
            color: '#333',
            background: '#f5f5f5',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            {id}
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>节点类型</div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>
            {getNodeTypeDisplay(data.nodeType)}
          </div>
        </div>
      </div>

      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px'
      }}>
        <h4 style={{
          margin: '0 0 15px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: '#333'
        }}>
          节点配置
        </h4>
        {renderConfigForm()}
      </div>
    </div>
  );
};

export default PropertyPanel;