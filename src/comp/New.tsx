import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Handle, Position } from '@xyflow/react';
import type { Node, Edge, NodeTypes, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './New.css';
import NodePanel from '../components/NodePanel';
import PropertyPanel from '../components/PropertyPanel';
import { PsyLangCodeGenerator } from '../utils/codeGenerator';

// localStorage 键名
const STORAGE_KEYS = {
  NODES: 'psylang-builder-nodes',
  EDGES: 'psylang-builder-edges',
  NODE_COUNTER: 'psylang-builder-node-counter'
};

// 保存数据到 localStorage
const saveToLocalStorage = (nodes: Node[], edges: Edge[], nodeCounter: number) => {
  try {
    localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(nodes));
    localStorage.setItem(STORAGE_KEYS.EDGES, JSON.stringify(edges));
    localStorage.setItem(STORAGE_KEYS.NODE_COUNTER, JSON.stringify(nodeCounter));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

// 从 localStorage 加载数据
const loadFromLocalStorage = () => {
  try {
    const savedNodes = localStorage.getItem(STORAGE_KEYS.NODES);
    const savedEdges = localStorage.getItem(STORAGE_KEYS.EDGES);
    const savedCounter = localStorage.getItem(STORAGE_KEYS.NODE_COUNTER);
    
    return {
      nodes: savedNodes ? JSON.parse(savedNodes) : null,
      edges: savedEdges ? JSON.parse(savedEdges) : null,
      nodeCounter: savedCounter ? JSON.parse(savedCounter) : null
    };
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return { nodes: null, edges: null, nodeCounter: null };
  }
};

// 连接点类型定义
export const HandleDataType = {
  NUMBER: 'number',    // 数字节点
  BOOLEAN: 'boolean',  // 布尔节点
  EXECUTION: 'execution' // 执行节点
} as const;

export type HandleDataType = typeof HandleDataType[keyof typeof HandleDataType];

// 智能Handle组件，根据类型自动应用正确的样式
interface SmartHandleProps {
  type: 'source' | 'target';
  position: Position;
  id?: string;
  dataType: HandleDataType;
  isMultiple?: boolean; // true=多连接(方形), false=单连接(圆形)
  style?: React.CSSProperties;
}

const SmartHandle: React.FC<SmartHandleProps> = ({ 
  type, 
  position, 
  id, 
  dataType, 
  isMultiple = false,
  style = undefined
}) => {
  // 根据数据类型确定颜色
  const getColor = () => {
    switch (dataType) {
      case HandleDataType.NUMBER: return '#e53e3e';     // 红色
      case HandleDataType.BOOLEAN: return '#3182ce';    // 蓝色  
      case HandleDataType.EXECUTION: return '#38a169';  // 浅绿色
      default: return '#718096'; // 灰色作为默认
    }
  };

  // 根据连接类型确定形状
  const getShapeClass = () => {
    return isMultiple ? 'handle-square' : 'handle-circle';
  };

  // 根据输入/输出类型确定填充
  const getFillClass = () => {
    return type === 'source' ? 'handle-filled' : 'handle-hollow';
  };

  const color = getColor();
  const shapeClass = getShapeClass();
  const fillClass = getFillClass();

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`${shapeClass} ${fillClass}`}
      style={{
        '--handle-color': color,
        ...style
      } as React.CSSProperties}
    />
  );
};

// 获取节点Handle的数据类型
const getHandleDataType = (nodeId: string, handleId: string | undefined, handleType: 'source' | 'target', nodes: Node[]): HandleDataType | null => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  
  const nodeType = node.data.nodeType;
  const config = node.data.config as Record<string, unknown>;
  
  if (handleType === 'source') {
    // 输出端类型
    switch (nodeType) {
      case 'answer':
      case 'score':
      case 'sum':
      case 'number':
      case 'math':
        return HandleDataType.NUMBER;
      case 'comparison':
      case 'logical':
        return HandleDataType.BOOLEAN;
      case 'condition':
        return HandleDataType.EXECUTION;
      case 'assign':
        return HandleDataType.NUMBER;
      default:
        return null;
    }
  } else {
    // 输入端类型
    switch (nodeType) {
      case 'math':
        return HandleDataType.NUMBER;
      case 'comparison':
        return HandleDataType.NUMBER;
      case 'logical':
        return HandleDataType.BOOLEAN;
      case 'condition': {
        // Condition节点的输入端类型取决于配置
        const conditionType = config?.conditionType || 'if';
        if (conditionType === 'elseif') {
          // ElseIf节点有两个输入：布尔条件和执行流
          if (handleId === 'condition') {
            return HandleDataType.BOOLEAN;
          } else if (handleId === 'execution') {
            return HandleDataType.EXECUTION;
          }
        } else {
          // If节点只接受布尔条件
          return HandleDataType.BOOLEAN;
        }
        return HandleDataType.BOOLEAN;
      }
      case 'output':
        return HandleDataType.NUMBER;
      case 'assign':
        // 赋值节点有两个输入端：数值输入(value)和执行流输入(execution)
        if (handleId === 'value') {
          return HandleDataType.NUMBER;
        } else if (handleId === 'execution') {
          return HandleDataType.EXECUTION;
        }
        return null;
      case 'label':
        return HandleDataType.EXECUTION;
      default:
        return null;
    }
  }
};

// 检查两个Handle类型是否兼容
const areHandleTypesCompatible = (sourceType: HandleDataType | null, targetType: HandleDataType | null): boolean => {
  if (!sourceType || !targetType) return false;
  return sourceType === targetType;
};


// 节点类型定义
export interface PsyLangNodeData extends Record<string, unknown> {
  label: string;
  // 更新节点类型定义，包含 sum
  nodeType: 'answer' | 'score' | 'sum' | 'math' | 'comparison' | 'logical' | 'output' | 'label' | 'condition' | 'number' | 'assign';
  config: Record<string, unknown>;
  inputs?: Array<{ id: string; type: string; label: string }>;
  outputs?: Array<{ id: string; type: string; label: string }>;
}

// Answer 输入节点组件
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AnswerNode: React.FC<{ data: PsyLangNodeData; id: string }> = ({ data, id: _id }) => {
  return (
    <div style={{
      background: '#e1f5fe',
      border: '2px solid #01579b',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Answer</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        题目 {(data.config.questionId as number) || 1}
      </div>
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.NUMBER}
        isMultiple={true}
      />
    </div>
  );
};

// Score 输入节点组件
const ScoreNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  return (
    <div style={{
      background: '#f3e5f5',
      border: '2px solid #4a148c',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Score</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        题目 {(data.config.questionId as number) || 1}
      </div>
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.NUMBER}
        isMultiple={true}
      />
    </div>
  );
};

// Sum 总分输入节点组件
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SumNode: React.FC<{ data: PsyLangNodeData }> = ({ data: _data }) => {
  return (
    <div style={{
      background: '#e8f5e8',
      border: '2px solid #388e3c',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Sum</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        总分
      </div>
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.NUMBER}
        isMultiple={true}
      />
    </div>
  );
};

// 数字节点组件
const NumberNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  return (
    <div style={{
      background: '#e8eaf6',
      border: '2px solid #3f51b5',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '80px',
      textAlign: 'center',
      position: 'relative'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Number</div>
      <div style={{ fontSize: '14px', color: '#333' }}>
        {(data.config.value as number) || 0}
      </div>
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.NUMBER}
        isMultiple={true}
      />
    </div>
  );
};

// 数学运算节点组件
const MathNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  const operator = (data.config.operator as string) || '+';
  const isMultiInput = operator === '+' || operator === '*'; // 加法和乘法支持多输入
  
  return (
    <div style={{
      background: '#fff3e0',
      border: '2px solid #e65100',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      {isMultiInput ? (
        // 多输入：方形端口
        <SmartHandle
          type="target"
          position={Position.Left}
          id="multi-input"
          dataType={HandleDataType.NUMBER}
          isMultiple={true}
        />
      ) : (
        // 双输入：两个圆形端口
        <>
          <SmartHandle
            type="target"
            position={Position.Left}
            id="input-a"
            dataType={HandleDataType.NUMBER}
            isMultiple={false}
            style={{ top: '30%' }}
          />
          <SmartHandle
            type="target"
            position={Position.Left}
            id="input-b"
            dataType={HandleDataType.NUMBER}
            isMultiple={false}
            style={{ top: '70%' }}
          />
        </>
      )}
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Math</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e65100' }}>
        {operator}
      </div>
      {/* 输出端：方形端口 */}
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.NUMBER}
        isMultiple={true}
      />
    </div>
  );
};

// Assign 赋值节点组件
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AssignNode: React.FC<{ data: PsyLangNodeData }> = ({ data: _data }) => {
  return (
    <div style={{
      background: '#fff3e0',
      border: '2px solid #f57c00',
      borderRadius: '8px',
      padding: '15px 10px',
      minWidth: '120px',
      height: '80px',
      textAlign: 'center',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* 执行输入端Handle（上方） */}
      <SmartHandle
        type="target"
        position={Position.Top}
        id="execution"
        dataType={HandleDataType.EXECUTION}
        isMultiple={false}
        style={{ left: '50%' }}
      />
      
      {/* 数值输入端Handle（左侧） */}
      <SmartHandle
        type="target"
        position={Position.Left}
        id="value"
        dataType={HandleDataType.NUMBER}
        isMultiple={false}
        style={{ top: '50%' }}
      />

      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f57c00' }}>
        赋值
      </div>

      {/* 数值输出端Handle（右侧） */}
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.NUMBER}
        isMultiple={true}
        style={{ top: '50%' }}
      />
      
      {/* 端口标注 */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '8px',
        color: '#f57c00',
        fontWeight: 'bold'
      }}>
        执行
      </div>
      
      <div style={{
        position: 'absolute',
        left: '15px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '8px',
        color: '#f57c00',
        fontWeight: 'bold'
      }}>
        数值
      </div>
      
      <div style={{
        position: 'absolute',
        right: '15px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '8px',
        color: '#f57c00',
        fontWeight: 'bold'
      }}>
        目标
      </div>
    </div>
  );
};

// Output 输出节点组件
const OutputNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  return (
    <div style={{
      background: '#e8f5e8',
      border: '2px solid #2e7d32',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      <SmartHandle
        type="target"
        position={Position.Left}
        dataType={HandleDataType.NUMBER}
        isMultiple={false}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Output</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Output[{(data.config.outputId as number) || 1}]
      </div>
    </div>
  );
};

// 逻辑运算节点组件 (且或支持多输入)
const LogicalNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  return (
    <div style={{
      background: '#f8f8f8',
      border: '2px solid #616161',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      {/* 多输入：方形端口 */}
      <SmartHandle
        type="target"
        position={Position.Left}
        id="multi-input"
        dataType={HandleDataType.BOOLEAN}
        isMultiple={true}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Logic</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#616161' }}>
        {(data.config.operator as string) || '&&'}
      </div>
      {/* 多输出：方形端口 */}
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.BOOLEAN}
        isMultiple={true}
      />
    </div>
  );
};

// 比较运算节点组件 (双输入)
const ComparisonNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  return (
    <div style={{
      background: '#fef7e0',
      border: '2px solid #f57c00',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      {/* 双输入：两个圆形端口 */}
      <SmartHandle
        type="target"
        position={Position.Left}
        id="input-a"
        dataType={HandleDataType.NUMBER}
        isMultiple={false}
        style={{ top: '30%' }}
      />
      <SmartHandle
        type="target"
        position={Position.Left}
        id="input-b"
        dataType={HandleDataType.NUMBER}
        isMultiple={false}
        style={{ top: '70%' }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Compare</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f57c00' }}>
        {(data.config.operator as string) || '>'}
      </div>
      {/* 多输出：方形端口 */}
      <SmartHandle
        type="source"
        position={Position.Right}
        dataType={HandleDataType.BOOLEAN}
        isMultiple={true}
      />
    </div>
  );
};

// 条件节点组件
const ConditionNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  const conditionType = (data.config.conditionType as string) || 'if';
  
  return (
    <div style={{
      background: '#f3e5f5',
      border: '2px solid #7b1fa2',
      borderRadius: '8px',
      padding: '15px 10px',
      minWidth: '120px',
      height: '100px',  // 统一高度，都有两个输出
      textAlign: 'center',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* 输入端Handle */}
      {conditionType === 'elseif' ? (
        // ElseIf节点：条件输入和执行输入
        <>
          <SmartHandle
            type="target"
            position={Position.Left}
            id="condition"
            dataType={HandleDataType.BOOLEAN}
            isMultiple={false}
            style={{ top: '25%' }}
          />
          <SmartHandle
            type="target"
            position={Position.Left}
            id="execution"
            dataType={HandleDataType.EXECUTION}
            isMultiple={false}
            style={{ top: '75%' }}
          />
          {/* ElseIf节点的输入标注 */}
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '25%',
            transform: 'translateY(-50%)',
            fontSize: '8px',
            color: '#7b1fa2',
            fontWeight: 'bold'
          }}>
            条件
          </div>
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '75%',
            transform: 'translateY(-50%)',
            fontSize: '8px',
            color: '#7b1fa2',
            fontWeight: 'bold'
          }}>
            执行
          </div>
        </>
      ) : (
        // If节点：只有条件输入
        <>
          <SmartHandle
            type="target"
            position={Position.Left}
            id="condition"
            dataType={HandleDataType.BOOLEAN}
            isMultiple={false}
            style={{ top: '50%' }}
          />
          {/* If节点的输入标注 */}
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '8px',
            color: '#7b1fa2',
            fontWeight: 'bold'
          }}>
            条件
          </div>
        </>
      )}
      
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '5px',
        fontSize: '14px'
      }}>
        {conditionType === 'if' ? 'If' : 'Else If'}
      </div>
      <div style={{ 
        fontSize: '11px', 
        color: '#666',
        opacity: 0.8
      }}>
        {conditionType}
      </div>
      
      {/* 输出端Handle - 统一为true和false两个输出 */}
      <SmartHandle
        type="source"
        position={Position.Right}
        id="true"
        dataType={HandleDataType.EXECUTION}
        isMultiple={true}
        style={{ top: '30%' }}
      />
      <SmartHandle
        type="source"
        position={Position.Right}
        id="false"
        dataType={HandleDataType.EXECUTION}
        isMultiple={true}
        style={{ top: '70%' }}
      />
      
      {/* 视觉标签 */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '30%',
        fontSize: '9px',
        color: '#7b1fa2',
        fontWeight: 'bold',
        transform: 'translateY(-50%)'
      }}>
        如此
      </div>
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '70%',
        fontSize: '9px',
        color: '#7b1fa2',
        fontWeight: 'bold',
        transform: 'translateY(-50%)'
      }}>
        否则
      </div>
    </div>
  );
};

// 标签节点组件
const LabelNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  return (
    <div style={{
      background: '#fce4ec',
      border: '2px solid #c2185b',
      borderRadius: '8px',
      padding: '10px',
      minWidth: '120px',
      textAlign: 'center',
      position: 'relative'
    }}>
      {/* 单输入：圆形端口 */}
      <SmartHandle
        type="target"
        position={Position.Left}
        dataType={HandleDataType.EXECUTION}
        isMultiple={false}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Label</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Label[{(data.config.labelId as number) || 0}]
      </div>
      <div style={{ fontSize: '10px', color: '#888', marginTop: '5px' }}>
        "{(data.config.value as string) || 'value'}"
      </div>
    </div>
  );
};

// 定义节点类型
const nodeTypes: NodeTypes = {
  answer: AnswerNode,
  score: ScoreNode,
  sum: SumNode,
  number: NumberNode,
  math: MathNode,
  comparison: ComparisonNode,
  logical: LogicalNode,
  output: OutputNode,
  label: LabelNode,
  condition: ConditionNode,
  assign: AssignNode,
};

// 初始节点和边
const initialNodes: Node[] = [
  // 输入节点
  {
    id: '1',
    type: 'sum',
    position: { x: 200, y: 80 },
    data: { 
      label: 'Sum', 
      nodeType: 'sum', 
      config: undefined 
    },
  },
  {
    id: '2',
    type: 'score',
    position: { x: 200, y: 170 },
    data: { 
      label: 'Score[1]', 
      nodeType: 'score', 
      config: { questionId: 1 } 
    },
  },
  {
    id: '3',
    type: 'answer',
    position: { x: 200, y: 350 },
    data: { 
      label: 'Answer[1]', 
      nodeType: 'answer', 
      config: { questionId: 1 } 
    },
  },
  // 额外的Sum节点用于Label分级
  {
    id: '26',
    type: 'sum',
    position: { x: 240, y: 600 },
    data: { 
      label: 'Sum', 
      nodeType: 'sum', 
      config: undefined 
    },
  },
  {
    id: '27',
    type: 'sum',
    position: { x: 250, y: 800 },
    data: { 
      label: 'Sum', 
      nodeType: 'sum', 
      config: undefined 
    },
  },
  
  // 数字节点
  {
    id: '4',
    type: 'number',
    position: { x: 220, y: 250 },
    data: { 
      label: '2', 
      nodeType: 'number', 
      config: { value: 2 } 
    },
  },
  {
    id: '5',
    type: 'number',
    position: { x: 220, y: 450 },
    data: { 
      label: '1', 
      nodeType: 'number', 
      config: { value: 1 } 
    },
  },
  {
    id: '6',
    type: 'number',
    position: { x: 800, y: 300 },
    data: { 
      label: '0', 
      nodeType: 'number', 
      config: { value: 0 } 
    },
  },
  {
    id: '7',
    type: 'number',
    position: { x: 800, y: 500 },
    data: { 
      label: '1', 
      nodeType: 'number', 
      config: { value: 1 } 
    },
  },
  {
    id: '8',
    type: 'number',
    position: { x: 250, y: 700 },
    data: { 
      label: '70', 
      nodeType: 'number', 
      config: { value: 70 } 
    },
  },
  {
    id: '9',
    type: 'number',
    position: { x: 250, y: 900 },
    data: { 
      label: '50', 
      nodeType: 'number', 
      config: { value: 50 } 
    },
  },
  
  // 运算节点
  {
    id: '10',
    type: 'math',
    position: { x: 400, y: 200 },
    data: { 
      label: '*', 
      nodeType: 'math', 
      config: { operator: '*' } 
    },
  },
  {
    id: '11',
    type: 'math',
    position: { x: 600, y: 150 },
    data: { 
      label: '+', 
      nodeType: 'math', 
      config: { operator: '+' } 
    },
  },
  {
    id: '12',
    type: 'comparison',
    position: { x: 400, y: 400 },
    data: { 
      label: '==', 
      nodeType: 'comparison', 
      config: { operator: '==' } 
    },
  },
  {
    id: '13',
    type: 'comparison',
    position: { x: 420, y: 700 },
    data: { 
      label: '>=', 
      nodeType: 'comparison', 
      config: { operator: '>=' } 
    },
  },
  {
    id: '14',
    type: 'comparison',
    position: { x: 450, y: 825 },
    data: { 
      label: '>=', 
      nodeType: 'comparison', 
      config: { operator: '>=' } 
    },
  },
  
  // 条件节点
  {
    id: '15',
    type: 'condition',
    position: { x: 600, y: 400 },
    data: { 
      label: 'If', 
      nodeType: 'condition', 
      config: { conditionType: 'if' } 
    },
  },
  {
    id: '16',
    type: 'condition',
    position: { x: 600, y: 700 },
    data: { 
      label: 'If', 
      nodeType: 'condition', 
      config: { conditionType: 'if' } 
    },
  },
  {
    id: '17',
    type: 'condition',
    position: { x: 850, y: 825 },
    data: { 
      label: 'Else If', 
      nodeType: 'condition', 
      config: { conditionType: 'elseif' } 
    },
  },
  
  // 赋值节点 (与if节点中线400对齐，上下对称)
  {
    id: '18',
    type: 'assign',
    position: { x: 950, y: 300 },
    data: { 
      label: 'Assign', 
      nodeType: 'assign', 
      config: { targetOutput: 2 } 
    },
  },
  {
    id: '19',
    type: 'assign',
    position: { x: 950, y: 450 },
    data: { 
      label: 'Assign', 
      nodeType: 'assign', 
      config: { targetOutput: 2 } 
    },
  },
  
  // 输出节点
  {
    id: '20',
    type: 'output',
    position: { x: 800, y: 150 },
    data: { 
      label: 'Output[1]', 
      nodeType: 'output', 
      config: { outputId: 1 } 
    },
  },
  {
    id: '21',
    type: 'output',
    position: { x: 1200, y: 300 },
    data: { 
      label: 'Output[2]', 
      nodeType: 'output', 
      config: { outputId: 2 } 
    },
  },
  {
    id: '22',
    type: 'output',
    position: { x: 1200, y: 500 },
    data: { 
      label: 'Output[2]', 
      nodeType: 'output', 
      config: { outputId: 2 } 
    },
  },
  
  // 标签节点
  {
    id: '23',
    type: 'label',
    position: { x: 950, y: 650 },
    data: { 
      label: 'Label[0]', 
      nodeType: 'label', 
      config: { labelId: 0, value: '正常' } 
    },
  },
  {
    id: '24',
    type: 'label',
    position: { x: 1150, y: 675 },
    data: { 
      label: 'Label[0]', 
      nodeType: 'label', 
      config: { labelId: 0, value: '轻微' } 
    },
  },
  {
    id: '25',
    type: 'label',
    position: { x: 1150, y: 800 },
    data: { 
      label: 'Label[0]', 
      nodeType: 'label', 
      config: { labelId: 0, value: '异常' } 
    },
  },
];

const initialEdges: Edge[] = [
  // Output1 = Sum + 2*Score1 的连接
  { id: 'e2-10', source: '2', target: '10' },  // Score1 -> 乘法
  { id: 'e4-10', source: '4', target: '10' },  // 2 -> 乘法
  { id: 'e1-11', source: '1', target: '11' },  // Sum -> 加法
  { id: 'e10-11', source: '10', target: '11' }, // 乘法结果 -> 加法
  { id: 'e11-20', source: '11', target: '20' }, // 加法结果 -> Output1
  
  // If Answer==1 则 Output2=0 否则 Output2=1 的连接 (通过assign节点)
  { id: 'e3-12', source: '3', target: '12', targetHandle: 'input-a' },  // Answer1 -> 比较input-a
  { id: 'e5-12', source: '5', target: '12', targetHandle: 'input-b' },  // 1 -> 比较input-b
  { id: 'e12-15', source: '12', target: '15', targetHandle: 'condition' }, // 比较结果 -> If条件
  
  // true分支: 0 -> assign -> Output2
  { id: 'e6-18', source: '6', target: '18', targetHandle: 'value' },  // 0 -> assign(value)
  { id: 'e15-18', source: '15', target: '18', sourceHandle: 'true', targetHandle: 'execution' }, // If true -> assign(execution)
  { id: 'e18-21', source: '18', target: '21' },  // assign -> Output2
  
  // false分支: 1 -> assign -> Output2
  { id: 'e7-19', source: '7', target: '19', targetHandle: 'value' },  // 1 -> assign(value)
  { id: 'e15-19', source: '15', target: '19', sourceHandle: 'false', targetHandle: 'execution' }, // If false -> assign(execution)
  { id: 'e19-22', source: '19', target: '22' },  // assign -> Output2
  
  // Label分级的连接 (使用独立的Sum节点)
  { id: 'e26-13', source: '26', target: '13', targetHandle: 'input-a' },  // Sum -> 比较70 input-a
  { id: 'e8-13', source: '8', target: '13', targetHandle: 'input-b' },  // 70 -> 比较 input-b
  { id: 'e27-14', source: '27', target: '14', targetHandle: 'input-a' },  // Sum -> 比较50 input-a
  { id: 'e9-14', source: '9', target: '14', targetHandle: 'input-b' },  // 50 -> 比较 input-b
  { id: 'e13-16', source: '13', target: '16', targetHandle: 'condition' }, // >=70 -> If
  { id: 'e14-17', source: '14', target: '17', targetHandle: 'condition' }, // >=50 -> ElseIf
  { id: 'e16-17', source: '16', target: '17', sourceHandle: 'false', targetHandle: 'execution' }, // If false -> ElseIf
  { id: 'e16-23', source: '16', target: '23', sourceHandle: 'true' },   // >=70 -> 正常
  { id: 'e17-24', source: '17', target: '24', sourceHandle: 'true' },   // >=50 -> 轻微
  { id: 'e17-25', source: '17', target: '25', sourceHandle: 'false' },  // <50 -> 异常
];
 
export default function PsyLangBuilder() {
  // 从 localStorage 加载保存的数据
  const savedData = loadFromLocalStorage();
  
  const [nodes, setNodes] = useState(savedData.nodes || initialNodes);
  const [edges, setEdges] = useState(savedData.edges || initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [nodeIdCounter, setNodeIdCounter] = useState(savedData.nodeCounter || 28);

  // 自动保存功能：当 nodes, edges, nodeIdCounter 变化时保存到 localStorage
  useEffect(() => {
    saveToLocalStorage(nodes, edges, nodeIdCounter);
  }, [nodes, edges, nodeIdCounter]);

 
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      
      // 处理节点选择
      const selectionChanges = changes.filter(change => change.type === 'select');
      if (selectionChanges.length > 0) {
        const selected = changes
          .filter(change => change.type === 'select' && change.selected)
          .map(change => 'id' in change ? change.id : '')
          .filter(id => id !== '');
        setSelectedNodes(selected);
      }
    },
    [],
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  
  const onConnect = useCallback(
    (params: Connection) => {
      // 检查连接限制
      const { source, target, sourceHandle, targetHandle } = params;
      
      if (!source || !target) return;
      
      // 获取源节点和目标节点信息
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);
      if (!sourceNode || !targetNode) return;
      
      // 1. 检查Handle数据类型是否兼容
      const sourceDataType = getHandleDataType(source, sourceHandle || undefined, 'source', nodes);
      const targetDataType = getHandleDataType(target, targetHandle || undefined, 'target', nodes);
      
      if (!areHandleTypesCompatible(sourceDataType, targetDataType)) {
        console.log(`类型不匹配: ${sourceDataType} -> ${targetDataType}`);
        return; // 拒绝连接
      }
      
      // 2. 检查目标Handle是否为单连接类型
      const isSingleConnection = () => {
        const nodeType = targetNode.data.nodeType;
        
        // 单连接的节点类型和Handle
        if (nodeType === 'output' || nodeType === 'label') {
          return true;
        }
        
        // Condition节点的连接限制
        if (nodeType === 'condition') {
          // 所有condition节点的输入都是单连接
          return true;
        }
        
        // Assign节点的连接限制
        if (nodeType === 'assign') {
          // 所有assign节点的输入都是单连接
          return true;
        }
        
        // 数学节点的双输入Handle是单连接
        if (nodeType === 'math') {
          const operator = (targetNode.data.config as Record<string, unknown>).operator as string;
          if ((operator === '-' || operator === '/') && 
              (targetHandle === 'input-a' || targetHandle === 'input-b')) {
            return true;
          }
        }
        
        // 比较节点的双输入Handle是单连接
        if (nodeType === 'comparison' && 
            (targetHandle === 'input-a' || targetHandle === 'input-b')) {
          return true;
        }
        
        return false;
      };
      
      // 3. 如果是单连接Handle，检查是否已有连接
      if (isSingleConnection()) {
        const existingConnections = edges.filter(edge => 
          edge.target === target && (edge.targetHandle === targetHandle || (!edge.targetHandle && !targetHandle))
        ).length;
        if (existingConnections > 0) {
          console.log('单连接Handle已有连接，拒绝新连接');
          return; // 拒绝连接
        }
      }
      
      // 允许连接
      console.log(`连接成功: ${sourceDataType} -> ${targetDataType}`);
      setEdges((eds) => addEdge(params, eds));
    },
    [nodes, edges],
  );

  const onAddNode = useCallback((nodeType: string, customConfig?: Record<string, unknown>) => {
    const newNodeId = nodeIdCounter.toString();
    setNodeIdCounter(prev => prev + 1);
    
    const nodeConfigs: Record<string, Record<string, unknown>> = {
      answer: { questionId: 1 },
      score: { questionId: 1 },
      sum: {},  // Sum节点不需要配置
      number: { value: 0 },
      math: { operator: '+' },
      comparison: { operator: '>' },
      logical: { operator: '&&' },
      output: { outputId: 1 },
      label: { labelId: 1, value: 'High' },
      condition: { conditionType: 'if' },
      if: { conditionType: 'if' },
      elseif: { conditionType: 'elseif' },
      assign: { targetOutput: 1 }
    };

    // 使用自定义配置或默认配置
    const finalConfig = customConfig || nodeConfigs[nodeType as keyof typeof nodeConfigs] || undefined;
    
    // 将 if/elseif 映射到 condition 节点类型
    const actualNodeType = (nodeType === 'if' || nodeType === 'elseif') ? 'condition' : nodeType;
    
    // 根据节点类型和配置生成标签
    let nodeLabel = '';
    switch (nodeType) {
      case 'answer':
        nodeLabel = `Answer[${((finalConfig as Record<string, unknown>).questionId as number) || 1}]`;
        break;
      case 'score':
        nodeLabel = `Score[${((finalConfig as Record<string, unknown>).questionId as number) || 1}]`;
        break;
      case 'number':
        nodeLabel = `${((finalConfig as Record<string, unknown>).value as number) || 0}`;
        break;
      case 'math':
        nodeLabel = `${((finalConfig as Record<string, unknown>).operator as string) || '+'}`;
        break;
      case 'comparison':
        nodeLabel = `${((finalConfig as Record<string, unknown>).operator as string) || '>'}`;
        break;
      case 'logical':
        nodeLabel = `${((finalConfig as Record<string, unknown>).operator as string) || '&&'}`;
        break;
      case 'output':
        nodeLabel = `Output[${((finalConfig as Record<string, unknown>).outputId as number) || 1}]`;
        break;
      case 'label':
        nodeLabel = `Label[${((finalConfig as Record<string, unknown>).labelId as number) || 1}]`;
        break;
      case 'condition':
        nodeLabel = `Condition`;
        break;
      case 'if':
        nodeLabel = `If`;
        break;
      case 'elseif':
        nodeLabel = `Else If`;
        break;
      default:
        nodeLabel = nodeType;
    }

    const newNode: Node = {
      id: newNodeId,
      type: actualNodeType,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: nodeLabel,
        nodeType: actualNodeType as PsyLangNodeData['nodeType'],
        config: finalConfig
      }
    };

    setNodes(prevNodes => [...prevNodes, newNode]);
  }, [nodeIdCounter]);

  const onUpdateNode = useCallback((nodeId: string, newData: Partial<PsyLangNodeData>) => {
    setNodes(prevNodes => {
      const oldNode = prevNodes.find(n => n.id === nodeId);
      if (!oldNode) return prevNodes;
      
      const oldConfig = (oldNode.data.config as Record<string, unknown>) || {};
      const newConfig = { ...oldConfig, ...(newData.config) };
      const nodeType = oldNode.data.nodeType;
      
      // 检查是否需要处理连接线
      let needsEdgeUpdate = false;
      let preserveConnections: string[] = []; // 需要保留的连接类型
      let clearConnections: string[] = []; // 需要清除的连接类型
      
      if (nodeType === 'math') {
        const oldOperator = (oldConfig.operator as string) || '';
        const newOperator = newConfig.operator as string;
        
        if (oldOperator !== newOperator) {
          const oldIsMulti = oldOperator === '+' || oldOperator === '*';
          const newIsMulti = newOperator === '+' || newOperator === '*';
          
          if (oldIsMulti === newIsMulti) {
            // 同类型切换，动作R（保留所有连接）
            preserveConnections = ['all'];
          } else {
            // 不同类型切换，清除输入端连接，保留输出端
            clearConnections = ['input'];
            preserveConnections = ['output'];
          }
          needsEdgeUpdate = true;
        }
      } else if (nodeType === 'condition') {
        const oldConditionType = (oldConfig.conditionType as string) || '';
        const newConditionType = newConfig.conditionType as string;
        
        if (oldConditionType !== newConditionType) {
          if ((oldConditionType === 'if' && newConditionType === 'elseif') || 
              (oldConditionType === 'elseif' && newConditionType === 'if')) {
            // if ↔ elseif：条件端保留，执行端清除，输出端保留
            preserveConnections = ['condition', 'output'];
            clearConnections = ['execution'];
          }
          needsEdgeUpdate = true;
        }
      } else if (nodeType === 'comparison') {
        const oldOperator = (oldConfig.operator as string) || '';
        const newOperator = newConfig.operator as string;
        
        if (oldOperator !== newOperator) {
          // 比较运算符一律动作R
          preserveConnections = ['all'];
          needsEdgeUpdate = true;
        }
      } else if (nodeType === 'logical') {
        const oldOperator = (oldConfig.operator as string) || '';
        const newOperator = newConfig.operator as string;
        
        if (oldOperator !== newOperator) {
          // 逻辑运算符一律动作R（保留所有连接）
          preserveConnections = ['all'];
          needsEdgeUpdate = true;
        }
      }
      
      // 更新节点
      const updatedNodes = prevNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData }
          };
        }
        return node;
      });
      
      // 如果需要更新连接线，立即处理
      if (needsEdgeUpdate) {
        setEdges(prevEdges => {
          return prevEdges.filter(edge => {
            const isTargetEdge = edge.target === nodeId;
            const isSourceEdge = edge.source === nodeId;
            
            if (!isTargetEdge && !isSourceEdge) return true;
            
            // 保留所有连接
            if (preserveConnections.includes('all')) return true;
            
            // 处理输入端连接
            if (isTargetEdge) {
              if (clearConnections.includes('input')) return false;
              
              const handleId = edge.targetHandle;
              if (clearConnections.includes('execution') && handleId === 'execution') return false;
              if (preserveConnections.includes('condition') && handleId === 'condition') return true;
              if (preserveConnections.includes('input')) return true;
              
              return !clearConnections.includes(handleId || 'default');
            }
            
            // 处理输出端连接
            if (isSourceEdge) {
              if (preserveConnections.includes('output') || preserveConnections.includes('all')) return true;
              return !clearConnections.includes('output');
            }
            
            return true;
          });
        });
      }
      
      return updatedNodes;
    });
  }, [setEdges]);

  // 获取选中的节点
  const selectedNode = useMemo(() => {
    if (selectedNodes.length === 1) {
      const node = nodes.find(n => n.id === selectedNodes[0]);
      if (node && node.data && typeof node.data === 'object' && 'nodeType' in node.data && 'label' in node.data) {
        return { id: node.id, data: node.data as unknown as PsyLangNodeData };
      }
      return null;
    }
    return null;
  }, [selectedNodes, nodes]);

  // 重置为初始状态
  const handleResetToInitial = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setNodeIdCounter(28);
    setSelectedNodes([]);
  }, []);

  // 清空画布
  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setNodeIdCounter(1);
    setSelectedNodes([]);
  }, []);

  // 生成代码
  const generatedCode = useMemo(() => {
    const generator = new PsyLangCodeGenerator(nodes, edges);
    return generator.generate();
  }, [nodes, edges]);

  // 复制代码到剪贴板
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode.code || '');
      // 这里可以添加成功提示，但为了简洁暂不添加
    } catch (error) {
      console.warn('Failed to copy code:', error);
      // 降级方案：使用 document.execCommand
      const textArea = document.createElement('textarea');
      textArea.value = generatedCode.code || '';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackError) {
        console.warn('Fallback copy also failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  }, [generatedCode.code]);
 
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* 左侧工具面板 */}
      <NodePanel 
        onAddNode={onAddNode} 
        onResetToInitial={handleResetToInitial}
        onClearCanvas={handleClearCanvas}
      />
      
      {/* 中间画布区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ 
          height: '40px', 
          background: '#f5f5f5', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 20px',
          borderBottom: '1px solid #ddd',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>PsyLang 可视化构建器</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {generatedCode.errors.length > 0 && (
              <span style={{ color: '#f44336', fontSize: '14px' }}>
                ❌ {generatedCode.errors.length} 错误
              </span>
            )}
            {generatedCode.warnings.length > 0 && (
              <span style={{ color: '#ff9800', fontSize: '14px' }}>
                ⚠️ {generatedCode.warnings.length} 警告
              </span>
            )}
            <span style={{ color: '#666', fontSize: '14px' }}>
              节点: {nodes.length} | 连接: {edges.length}
            </span>
          </div>
        </div>
        
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: '#fafafa' }}
            selectNodesOnDrag={false}
          />
        </div>
        
        <div style={{
          height: '200px',
          background: '#2d2d2d',
          color: '#fff',
          padding: '15px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '14px',
          borderTop: '1px solid #ddd',
          flexShrink: 0
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#4CAF50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>生成的 PsyLang 代码:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {generatedCode.errors.length === 0 && (
                <span style={{ color: '#4CAF50', fontSize: '12px' }}>✅ 语法正确</span>
              )}
              {/* 复制按钮 */}
              <button
                onClick={handleCopyCode}
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
                title="复制代码"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4CAF50"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
          
          {generatedCode.errors.length > 0 && (
            <div style={{ marginBottom: '10px', color: '#f44336' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>错误:</div>
              {generatedCode.errors.map((error, index) => (
                <div key={index} style={{ fontSize: '12px', marginBottom: '2px' }}>
                  • {error}
                </div>
              ))}
            </div>
          )}
          
          {generatedCode.warnings.length > 0 && (
            <div style={{ marginBottom: '10px', color: '#ff9800' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>警告:</div>
              {generatedCode.warnings.map((warning, index) => (
                <div key={index} style={{ fontSize: '12px', marginBottom: '2px' }}>
                  • {warning}
                </div>
              ))}
            </div>
          )}
          
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {generatedCode.code || '# 暂无代码生成...'}
          </pre>
        </div>
      </div>
      
      {/* 右侧属性面板 */}
      <PropertyPanel 
        selectedNode={selectedNode}
        onUpdateNode={onUpdateNode}
      />
    </div>
  );
}