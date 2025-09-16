import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Handle, Position } from '@xyflow/react';
import type { Node, Edge, NodeTypes, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './New.css';
import NodePanel from '../components/NodePanel';
import PropertyPanel from '../components/PropertyPanel';
import { PsyLangCodeGenerator } from '../utils/codeGenerator';

// 工具函数：检查Handle是否已连接
const isHandleConnected = (nodeId: string, handleId: string | undefined, handleType: 'source' | 'target', edges: Edge[]): boolean => {
  return edges.some(edge => {
    if (handleType === 'source') {
      return edge.source === nodeId && (edge.sourceHandle === handleId || (!edge.sourceHandle && !handleId));
    } else {
      return edge.target === nodeId && (edge.targetHandle === handleId || (!edge.targetHandle && !handleId));
    }
  });
};

// 工具函数：获取Handle的连接数量
const getHandleConnectionCount = (nodeId: string, handleId: string | undefined, handleType: 'source' | 'target', edges: Edge[]): number => {
  return edges.filter(edge => {
    if (handleType === 'source') {
      return edge.source === nodeId && (edge.sourceHandle === handleId || (!edge.sourceHandle && !handleId));
    } else {
      return edge.target === nodeId && (edge.targetHandle === handleId || (!edge.targetHandle && !handleId));
    }
  }).length;
};

// 连接点类型定义
export enum HandleDataType {
  NUMBER = 'number',    // 数字节点
  BOOLEAN = 'boolean',  // 布尔节点
  EXECUTION = 'execution' // 执行节点
}

// 获取节点Handle的数据类型
const getHandleDataType = (nodeId: string, handleId: string | undefined, handleType: 'source' | 'target', nodes: Node[]): HandleDataType | null => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  
  const nodeType = node.data.nodeType;
  const config = node.data.config as any;
  
  if (handleType === 'source') {
    // 输出端类型
    switch (nodeType) {
      case 'answer':
      case 'score':
      case 'number':
      case 'math':
        return HandleDataType.NUMBER;
      case 'comparison':
      case 'logical':
        return HandleDataType.BOOLEAN;
      case 'condition':
        return HandleDataType.EXECUTION;
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
      case 'condition':
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
      case 'output':
        return HandleDataType.NUMBER;
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

// 创建带连接状态检测的Handle组件
interface SmartHandleProps {
  type: 'source' | 'target';
  position: Position;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  nodeId: string;
  edges: Edge[];
}

const SmartHandle: React.FC<SmartHandleProps> = ({ 
  type, position, className, style, id, nodeId, edges 
}) => {
  const isConnected = isHandleConnected(nodeId, id, type, edges);
  
  return (
    <Handle
      type={type}
      position={position}
      className={className}
      style={style}
      id={id}
      data-connected={isConnected}
    />
  );
};

// 节点类型定义
export interface PsyLangNodeData {
  label: string;
  nodeType: 'answer' | 'score' | 'math' | 'comparison' | 'logical' | 'output' | 'label' | 'condition' | 'number';
  config: Record<string, unknown>;
  inputs?: Array<{ id: string; type: string; label: string }>;
  outputs?: Array<{ id: string; type: string; label: string }>;
}

// Answer 输入节点组件
const AnswerNode: React.FC<{ data: PsyLangNodeData; id: string }> = ({ data, id }) => {
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
        题目 {data.config.questionId || 1}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="square"
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
        题目 {data.config.questionId || 1}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="square"
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
        {data.config.value || 0}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="square"
      />
    </div>
  );
};

// 数学运算节点组件
const MathNode: React.FC<{ data: PsyLangNodeData }> = ({ data }) => {
  const operator = data.config.operator || '+';
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
        <Handle
          type="target"
          position={Position.Left}
          id="multi-input"
          className="square"
        />
      ) : (
        // 双输入：两个圆形端口
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="input-a"
            className="circle-small"
            style={{ top: '30%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="input-b"
            className="circle-small"
            style={{ top: '70%' }}
          />
        </>
      )}
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Math</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e65100' }}>
        {operator}
      </div>
      {/* 多输出：方形端口 */}
      <Handle
        type="source"
        position={Position.Right}
        className="square"
      />
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
      <Handle
        type="target"
        position={Position.Left}
        className="circle"
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Output</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Output[{data.config.outputId || 1}]
      </div>
    </div>
  );
};

// 逻辑运算节点组件 (与或支持多输入)
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
      <Handle
        type="target"
        position={Position.Left}
        id="multi-input"
        className="square"
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Logic</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#616161' }}>
        {data.config.operator || '&&'}
      </div>
      {/* 多输出：方形端口 */}
      <Handle
        type="source"
        position={Position.Right}
        className="square"
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
      <Handle
        type="target"
        position={Position.Left}
        id="input-a"
        className="circle-small"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input-b"
        className="circle-small"
        style={{ top: '70%' }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Compare</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f57c00' }}>
        {data.config.operator || '>'}
      </div>
      {/* 多输出：方形端口 */}
      <Handle
        type="source"
        position={Position.Right}
        className="square"
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
          <Handle
            type="target"
            position={Position.Left}
            id="condition"
            className="circle"
            style={{ top: '25%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="execution"
            className="circle"
            style={{ top: '75%' }}
          />
        </>
      ) : (
        // If节点：只有条件输入
        <Handle
          type="target"
          position={Position.Left}
          id="condition"
          className="circle"
        />
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
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="square"
        style={{ 
          top: '30%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="square"
        style={{ 
          top: '70%',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* 视觉标签 */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '25%',
        fontSize: '9px',
        color: '#7b1fa2',
        fontWeight: 'bold',
        transform: 'translateY(-50%)'
      }}>
        T
      </div>
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '75%',
        fontSize: '9px',
        color: '#7b1fa2',
        fontWeight: 'bold',
        transform: 'translateY(-50%)'
      }}>
        F
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
      <Handle
        type="target"
        position={Position.Left}
        className="circle"
      />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Label</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Label[{data.config.labelId || 0}]
      </div>
      <div style={{ fontSize: '10px', color: '#888', marginTop: '5px' }}>
        "{data.config.value || 'value'}"
      </div>
    </div>
  );
};

// 定义节点类型
const nodeTypes: NodeTypes = {
  answer: AnswerNode,
  score: ScoreNode,
  number: NumberNode,
  math: MathNode,
  comparison: ComparisonNode,
  logical: LogicalNode,
  output: OutputNode,
  label: LabelNode,
  condition: ConditionNode,
};

// 初始节点和边
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'answer',
    position: { x: 50, y: 50 },
    data: { 
      label: 'Answer[1]', 
      nodeType: 'answer', 
      config: { questionId: 1 } 
    },
  },
  {
    id: '2',
    type: 'answer',
    position: { x: 50, y: 150 },
    data: { 
      label: 'Answer[2]', 
      nodeType: 'answer', 
      config: { questionId: 2 } 
    },
  },
  {
    id: '3',
    type: 'score',
    position: { x: 50, y: 250 },
    data: { 
      label: 'Score[1]', 
      nodeType: 'score', 
      config: { questionId: 1 } 
    },
  },
  {
    id: '4',
    type: 'math',
    position: { x: 300, y: 100 },
    data: { 
      label: 'Add', 
      nodeType: 'math', 
      config: { operator: '+' } 
    },
  },
  {
    id: '5',
    type: 'math',
    position: { x: 300, y: 200 },
    data: { 
      label: 'Multiply', 
      nodeType: 'math', 
      config: { operator: '*' } 
    },
  },
  {
    id: '6',
    type: 'output',
    position: { x: 550, y: 100 },
    data: { 
      label: 'Output[0]', 
      nodeType: 'output', 
      config: { outputId: 0 } 
    },
  },
  {
    id: '7',
    type: 'output',
    position: { x: 550, y: 200 },
    data: { 
      label: 'Output[1]', 
      nodeType: 'output', 
      config: { outputId: 1 } 
    },
  },
  {
    id: '8',
    type: 'label',
    position: { x: 550, y: 300 },
    data: { 
      label: 'Label[0]', 
      nodeType: 'label', 
      config: { labelId: 0, value: 'High' } 
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-6', source: '4', target: '6' },
  { id: 'e5-7', source: '5', target: '7' },
];
 
export default function PsyLangBuilder() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [nodeIdCounter, setNodeIdCounter] = useState(10);

  // 更新Handle的连接状态
  useEffect(() => {
    const updateHandleStates = () => {
      // 找到所有Handle元素并更新data-connected属性
      const handleElements = document.querySelectorAll('.react-flow__handle');
      
      handleElements.forEach((handleElement) => {
        const handle = handleElement as HTMLElement;
        
        // 从DOM中获取节点ID（需要从父元素获取）
        let nodeElement = handle.closest('.react-flow__node');
        if (!nodeElement) return;
        
        const nodeId = nodeElement.getAttribute('data-id');
        if (!nodeId) return;
        
        // 获取Handle的类型和ID
        const isSource = handle.classList.contains('react-flow__handle-source');
        const isTarget = handle.classList.contains('react-flow__handle-target');
        const handleType = isSource ? 'source' : 'target';
        
        // 从Handle的class中获取ID（ReactFlow会添加特殊class）
        const handleId = handle.getAttribute('data-handleid');
        
        // 检查连接状态
        const connected = isHandleConnected(nodeId, handleId, handleType, edges);
        
        // 设置data属性
        handle.setAttribute('data-connected', connected.toString());
      });
    };

    // 延迟执行以确保DOM已更新
    setTimeout(updateHandleStates, 100);
  }, [edges, nodes]);
 
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      
      // 处理节点选择
      const selectionChanges = changes.filter(change => change.type === 'select');
      if (selectionChanges.length > 0) {
        const selected = changes
          .filter(change => change.type === 'select' && change.selected)
          .map(change => change.id);
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
        
        // 数学节点的双输入Handle是单连接
        if (nodeType === 'math') {
          const operator = (targetNode.data.config as any).operator as string;
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
        const existingConnections = getHandleConnectionCount(target, targetHandle || undefined, 'target', edges);
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
      number: { value: 0 },
      math: { operator: '+' },
      comparison: { operator: '>' },
      logical: { operator: '&&' },
      output: { outputId: 1 },
      label: { labelId: 1, value: 'High' },
      condition: { conditionType: 'if' },
      if: { conditionType: 'if' },
      elseif: { conditionType: 'elseif' }
    };

    // 使用自定义配置或默认配置
    const finalConfig = customConfig || nodeConfigs[nodeType as keyof typeof nodeConfigs] || {};
    
    // 将 if/elseif 映射到 condition 节点类型
    const actualNodeType = (nodeType === 'if' || nodeType === 'elseif') ? 'condition' : nodeType;
    
    // 根据节点类型和配置生成标签
    let nodeLabel = '';
    switch (nodeType) {
      case 'answer':
        nodeLabel = `Answer[${(finalConfig as any).questionId || 1}]`;
        break;
      case 'score':
        nodeLabel = `Score[${(finalConfig as any).questionId || 1}]`;
        break;
      case 'number':
        nodeLabel = `${(finalConfig as any).value || 0}`;
        break;
      case 'math':
        nodeLabel = `${(finalConfig as any).operator || '+'}`;
        break;
      case 'comparison':
        nodeLabel = `${(finalConfig as any).operator || '>'}`;
        break;
      case 'logical':
        nodeLabel = `${(finalConfig as any).operator || '&&'}`;
        break;
      case 'output':
        nodeLabel = `Output[${(finalConfig as any).outputId || 1}]`;
        break;
      case 'label':
        nodeLabel = `Label[${(finalConfig as any).labelId || 1}]`;
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
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, ...newData }
        };
      }
      return node;
    }));
  }, []);

  // 获取选中的节点
  const selectedNode = useMemo(() => {
    if (selectedNodes.length === 1) {
      const node = nodes.find(n => n.id === selectedNodes[0]);
      return node ? { id: node.id, data: node.data as PsyLangNodeData } : null;
    }
    return null;
  }, [selectedNodes, nodes]);

  // 生成代码
  const generatedCode = useMemo(() => {
    const generator = new PsyLangCodeGenerator(nodes, edges);
    return generator.generate();
  }, [nodes, edges]);
 
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* 左侧工具面板 */}
      <NodePanel onAddNode={onAddNode} />
      
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
            {generatedCode.errors.length === 0 && (
              <span style={{ color: '#4CAF50', fontSize: '12px' }}>✅ 语法正确</span>
            )}
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