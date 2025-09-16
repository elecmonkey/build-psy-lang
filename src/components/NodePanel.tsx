import React, { useState } from 'react';
import HelpModal from './HelpModal';

interface NodeConfig {
  questionId?: number;
  outputId?: number;
  labelId?: number;
  value?: string | number;
  operator?: string;
  [key: string]: unknown;
}

interface NodePanelProps {
  onAddNode: (nodeType: string, config?: NodeConfig) => void;
}

interface NodeItem {
  type: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  hasInput?: boolean;
}

const NodePanel: React.FC<NodePanelProps> = ({ onAddNode }) => {
  const [answerIndex, setAnswerIndex] = useState('1');
  const [scoreIndex, setScoreIndex] = useState('1');
  const [outputIndex, setOutputIndex] = useState('1');
  const [labelIndex, setLabelIndex] = useState('1');
  const [numberValue, setNumberValue] = useState('0');
  const [mathOperator, setMathOperator] = useState('+');
  const [comparisonOperator, setComparisonOperator] = useState('>');
  const [logicalOperator, setLogicalOperator] = useState('&&');
  const [answerError, setAnswerError] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [outputError, setOutputError] = useState('');
  const [labelError, setLabelError] = useState('');
  const [numberError, setNumberError] = useState('');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const validateIndex = (value: string): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && num >= 1 && Number.isInteger(num);
  };

  const validateNumber = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num);
  };

  const handleAddAnswer = () => {
    if (!validateIndex(answerIndex)) {
      setAnswerError('请输入大于等于1的整数');
      return;
    }
    setAnswerError('');
    onAddNode('answer', { questionId: parseInt(answerIndex) });
  };

  const handleAddScore = () => {
    if (!validateIndex(scoreIndex)) {
      setScoreError('请输入大于等于1的整数');
      return;
    }
    setScoreError('');
    onAddNode('score', { questionId: parseInt(scoreIndex) });
  };

  const handleAddOutput = () => {
    if (!validateIndex(outputIndex)) {
      setOutputError('请输入大于等于1的整数');
      return;
    }
    setOutputError('');
    onAddNode('output', { outputId: parseInt(outputIndex) });
  };

  const handleAddLabel = () => {
    if (!validateIndex(labelIndex)) {
      setLabelError('请输入大于等于1的整数');
      return;
    }
    setLabelError('');
    onAddNode('label', { labelId: parseInt(labelIndex), value: 'High' });
  };

  const handleAddMath = () => {
    onAddNode('math', { operator: mathOperator });
  };

  const handleAddComparison = () => {
    onAddNode('comparison', { operator: comparisonOperator });
  };

  const handleAddLogical = () => {
    onAddNode('logical', { operator: logicalOperator });
  };

  const handleAddNumber = () => {
    if (!validateNumber(numberValue)) {
      setNumberError('请输入有效数字');
      return;
    }
    setNumberError('');
    onAddNode('number', { value: parseFloat(numberValue) });
  };

  const nodeCategories = [
    {
      title: '输入节点',
      color: '#2196F3',
      nodes: [
        { type: 'answer', label: 'Answer', icon: 'A', description: '答案输入', color: '#e1f5fe', hasInput: true },
        { type: 'score', label: 'Score', icon: 'S', description: '分数输入', color: '#f3e5f5', hasInput: true },
        { type: 'sum', label: 'Sum', icon: '∑', description: '总分', color: '#e8f5e8' },
        { type: 'number', label: '数字', icon: '#', description: '自由数字', color: '#e8eaf6', hasInput: true },
      ]
    },
    {
      title: '运算节点', 
      color: '#FF9800',
      nodes: [
        { type: 'math', label: '数学运算', icon: '+', description: '四则运算', color: '#fff3e0', hasInput: true },
        { type: 'comparison', label: '比较运算', icon: '>', description: '大小比较', color: '#fef7e0', hasInput: true },
        { type: 'logical', label: '逻辑运算', icon: '&', description: '与或运算', color: '#f8f8f8', hasInput: true },
      ]
    },
    {
      title: '输出节点',
      color: '#4CAF50', 
      nodes: [
        { type: 'output', label: 'Output', icon: 'O', description: '数值输出', color: '#e8f5e8', hasInput: true },
        { type: 'label', label: 'Label', icon: 'L', description: '标签输出', color: '#fce4ec', hasInput: true },
      ]
    },
    {
      title: '控制节点',
      color: '#9C27B0',
      nodes: [
        { type: 'if', label: 'If', icon: 'IF', description: '如果条件', color: '#f3e5f5' },
        { type: 'elseif', label: 'Else If', icon: 'EI', description: '否则如果', color: '#f3e5f5' },
        { type: 'assign', label: 'Assign', icon: '=', description: '赋值操作', color: '#fff3e0' },
      ]
    }
  ];

  const renderInputNode = (node: NodeItem, categoryColor: string) => {
    const isAnswer = node.type === 'answer';
    const isScore = node.type === 'score';
    const isOutput = node.type === 'output';
    const isLabel = node.type === 'label';
    const isNumber = node.type === 'number';
    const isMath = node.type === 'math';
    const isComparison = node.type === 'comparison';
    const isLogical = node.type === 'logical';
    
    let currentValue = '';
    let setValue: (value: string) => void = () => {};
    let error = '';
    let handleAdd: () => void = () => {};
    let placeholder = '下标';
    let isSelectInput = false;
    let selectOptions: Array<{value: string, label: string}> = [];

    if (isAnswer) {
      currentValue = answerIndex;
      setValue = setAnswerIndex;
      error = answerError;
      handleAdd = handleAddAnswer;
    } else if (isScore) {
      currentValue = scoreIndex;
      setValue = setScoreIndex;
      error = scoreError;
      handleAdd = handleAddScore;
    } else if (isOutput) {
      currentValue = outputIndex;
      setValue = setOutputIndex;
      error = outputError;
      handleAdd = handleAddOutput;
      placeholder = '输出编号';
    } else if (isLabel) {
      currentValue = labelIndex;
      setValue = setLabelIndex;
      error = labelError;
      handleAdd = handleAddLabel;
      placeholder = '标签编号';
    } else if (isNumber) {
      currentValue = numberValue;
      setValue = setNumberValue;
      error = numberError;
      handleAdd = handleAddNumber;
      placeholder = '数字值';
    } else if (isMath) {
      currentValue = mathOperator;
      setValue = setMathOperator;
      handleAdd = handleAddMath;
      isSelectInput = true;
      selectOptions = [
        { value: '+', label: '+ (加法)' },
        { value: '-', label: '- (减法)' },
        { value: '*', label: '× (乘法)' },
        { value: '/', label: '÷ (除法)' }
      ];
    } else if (isComparison) {
      currentValue = comparisonOperator;
      setValue = setComparisonOperator;
      handleAdd = handleAddComparison;
      isSelectInput = true;
      selectOptions = [
        { value: '>', label: '> (大于)' },
        { value: '<', label: '< (小于)' },
        { value: '>=', label: '>= (大于等于)' },
        { value: '<=', label: '<= (小于等于)' },
        { value: '==', label: '== (等于)' },
        { value: '!=', label: '!= (不等于)' }
      ];
    } else if (isLogical) {
      currentValue = logicalOperator;
      setValue = setLogicalOperator;
      handleAdd = handleAddLogical;
      isSelectInput = true;
      selectOptions = [
        { value: '&&', label: '&& (与)' },
        { value: '||', label: '|| (或)' }
      ];
    }

    return (
      <div key={node.type} style={{
        background: node.color,
        border: `1px solid ${categoryColor}80`,
        borderRadius: '6px',
        padding: '12px',
        fontSize: '13px',
        borderColor: error ? '#f44336' : `${categoryColor}80`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            background: categoryColor,
            color: 'white',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {node.icon}
          </div>
          <div>
            <div style={{ fontWeight: '500', color: '#333' }}>
              {node.label}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              {node.description}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {isSelectInput ? (
            <select
              value={currentValue}
              onChange={(e) => setValue(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 6px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                fontSize: '12px',
                background: 'white'
              }}
            >
              {selectOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => {
                setValue(e.target.value);
                if (isAnswer) setAnswerError('');
                else if (isScore) setScoreError('');
                else if (isOutput) setOutputError('');
                else if (isLabel) setLabelError('');
                else if (isNumber) setNumberError('');
              }}
              placeholder={placeholder}
              style={{
                flex: 1,
                padding: '4px 6px',
                border: `1px solid ${error ? '#f44336' : '#ddd'}`,
                borderRadius: '3px',
                fontSize: '12px'
              }}
            />
          )}
          <button
            onClick={handleAdd}
            style={{
              padding: '4px 8px',
              background: categoryColor,
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            添加
          </button>
        </div>
        
        {error && (
          <div style={{
            fontSize: '10px',
            color: '#f44336',
            marginTop: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  };

  const renderRegularNode = (node: NodeItem, categoryColor: string) => {
    return (
      <div
        key={node.type}
        onClick={() => onAddNode(node.type)}
        style={{
          background: node.color,
          border: `1px solid ${categoryColor}80`,
          borderRadius: '6px',
          padding: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = categoryColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = `${categoryColor}80`;
        }}
      >
        <div style={{
          width: '24px',
          height: '24px',
          background: categoryColor,
          color: 'white',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {node.icon}
        </div>
        <div>
          <div style={{ fontWeight: '500', color: '#333' }}>
            {node.label}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {node.description}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: '250px',
      height: '100%',
      background: '#fafafa',
      borderRight: '1px solid #e0e0e0',
      padding: '15px',
      overflowY: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#333'
        }}>
          节点工具箱
        </h3>
        <button
          onClick={() => setIsHelpModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="使用指南"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#666"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <circle cx="12" cy="17" r="0.5" fill="#666"/>
          </svg>
        </button>
      </div>

      {nodeCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} style={{ marginBottom: '25px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: category.color,
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: `2px solid ${category.color}30`
          }}>
            {category.title}
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {category.nodes.map((node) => (
              (node as any).hasInput 
                ? renderInputNode(node, category.color)
                : renderRegularNode(node, category.color)
            ))}
          </div>
        </div>
      ))}

      <HelpModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};

export default NodePanel;