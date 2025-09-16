import type { Node, Edge } from '@xyflow/react';
import { type PsyLangNodeData } from '../comp/New';

interface CodeGenerationResult {
  code: string;
  errors: string[];
  warnings: string[];
}

export class PsyLangCodeGenerator {
  private nodes: Node[];
  private edges: Edge[];
  private dependencyGraph: Map<string, Set<string>>;
  private reverseGraph: Map<string, Set<string>>;

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.dependencyGraph = new Map();
    this.reverseGraph = new Map();
    this.buildDependencyGraph();
  }

  private buildDependencyGraph() {
    // 初始化图
    this.nodes.forEach(node => {
      this.dependencyGraph.set(node.id, new Set());
      this.reverseGraph.set(node.id, new Set());
    });

    // 构建依赖关系
    this.edges.forEach(edge => {
      // target 依赖 source
      this.dependencyGraph.get(edge.target)?.add(edge.source);
      this.reverseGraph.get(edge.source)?.add(edge.target);
    });
  }

  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const visiting = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) {
        // 检测到循环依赖
        return false;
      }
      if (visited.has(nodeId)) {
        return true;
      }

      visiting.add(nodeId);
      
      // 先访问所有依赖
      const dependencies = this.dependencyGraph.get(nodeId) || new Set();
      for (const dep of dependencies) {
        if (!visit(dep)) {
          return false;
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
      return true;
    };

    // 访问所有节点
    for (const node of this.nodes) {
      if (!visited.has(node.id)) {
        if (!visit(node.id)) {
          return []; // 存在循环依赖
        }
      }
    }

    return result;
  }

  private getNodeById(nodeId: string): Node | null {
    return this.nodes.find(n => n.id === nodeId) || null;
  }

  private generateExpression(nodeId: string, visited = new Set<string>()): string {
    if (visited.has(nodeId)) {
      return `[循环引用:${nodeId}]`;
    }
    visited.add(nodeId);

    const node = this.getNodeById(nodeId);
    if (!node) return `[未知节点:${nodeId}]`;

    const data = node.data as PsyLangNodeData;

    switch (data.nodeType) {
      case 'answer':
        return `Answer[${data.config.questionId || 1}]`;
        
      case 'score':
        return `Score[${data.config.questionId || 1}]`;

      case 'number':
        return `${data.config.value || 0}`;
        
      case 'math': {
        const dependencies = Array.from(this.dependencyGraph.get(nodeId) || []);
        if (dependencies.length === 0) {
          return '0';
        } else if (dependencies.length === 1) {
          return this.generateExpression(dependencies[0], new Set(visited));
        } else {
          const operator = data.config.operator || '+';
          
          if (operator === '+' || operator === '*') {
            // 多输入运算符
            const expressions = dependencies.map(dep => 
              this.generateExpression(dep, new Set(visited))
            );
            return expressions.length > 1 ? 
              `(${expressions.join(` ${operator} `)})` : 
              expressions[0] || '0';
          } else {
            // 双输入运算符 (-, /)
            const inputA = this.getConnectedNode(nodeId, 'input-a');
            const inputB = this.getConnectedNode(nodeId, 'input-b');
            
            const left = inputA ? this.generateExpression(inputA, new Set(visited)) : '0';
            const right = inputB ? this.generateExpression(inputB, new Set(visited)) : '0';
            
            return `(${left} ${operator} ${right})`;
          }
        }
      }
        
      case 'comparison': {
        const inputA = this.getConnectedNode(nodeId, 'input-a');
        const inputB = this.getConnectedNode(nodeId, 'input-b');
        
        const left = inputA ? this.generateExpression(inputA, new Set(visited)) : '0';
        const right = inputB ? this.generateExpression(inputB, new Set(visited)) : '0';
        const operator = data.config.operator || '>';
        return `(${left} ${operator} ${right})`;
      }

      case 'logical': {
        const dependencies = Array.from(this.dependencyGraph.get(nodeId) || []);
        if (dependencies.length < 2) {
          return 'true';
        }
        const expressions = dependencies.map(dep => 
          this.generateExpression(dep, new Set(visited))
        );
        const operator = data.config.operator || '&&';
        return `(${expressions.join(` ${operator} `)})`;
      }
      
      case 'assign': {
        // 赋值节点返回其输入的表达式
        const valueInput = this.getConnectedNode(nodeId, 'value');
        return valueInput ? this.generateExpression(valueInput, new Set(visited)) : '0';
      }
        
      default:
        return `[未知表达式:${data.nodeType}]`;
    }
  }

  // 辅助方法：根据Handle ID获取连接的节点
  private getConnectedNode(nodeId: string, handleId?: string): string | null {
    const edge = this.edges.find(e => 
      e.target === nodeId && (e.targetHandle === handleId || (!e.targetHandle && !handleId))
    );
    return edge ? edge.source : null;
  }

  private generateAssignments(): string[] {
    const assignments: string[] = [];
    const outputNodes = this.nodes.filter(n => (n.data as PsyLangNodeData).nodeType === 'output');
    
    outputNodes.forEach(node => {
      const data = node.data as PsyLangNodeData;
      const dependencies = Array.from(this.dependencyGraph.get(node.id) || []);
      
      if (dependencies.length > 0) {
        const expression = this.generateExpression(dependencies[0]);
        assignments.push(`Output[${data.config.outputId || 0}] = ${expression}`);
      }
    });

    return assignments;
  }

  // 获取从指定Handle连接的节点
  private getConnectedNodesFromHandle(nodeId: string, handleId?: string): string[] {
    return this.edges
      .filter(e => e.source === nodeId && (e.sourceHandle === handleId || (!e.sourceHandle && !handleId)))
      .map(e => e.target);
  }

  // 生成分支中的语句
  private generateBranchStatements(nodeIds: string[], indent: string = '    '): string[] {
    const statements: string[] = [];
    
    nodeIds.forEach(nodeId => {
      const node = this.getNodeById(nodeId);
      if (!node) return;
      
      const data = node.data as PsyLangNodeData;
      
      switch (data.nodeType) {
        case 'output': {
          const dependencies = Array.from(this.dependencyGraph.get(nodeId) || []);
          if (dependencies.length > 0) {
            const expression = this.generateExpression(dependencies[0]);
            statements.push(`${indent}Output[${data.config.outputId || 0}] = ${expression};`);
          }
          break;
        }
        case 'label': {
          const value = data.config.value || 'Unknown';
          const labelId = data.config.labelId || 0;
          statements.push(`${indent}Label[${labelId}] = "${value}";`);
          break;
        }
        case 'assign': {
          // 赋值节点：将输入值赋给指定的Output
          const valueInput = this.getConnectedNode(nodeId, 'value');
          if (valueInput) {
            const expression = this.generateExpression(valueInput);
            const targetOutput = data.config.targetOutput || 1;
            statements.push(`${indent}Output[${targetOutput}] = ${expression};`);
          }
          break;
        }
      }
    });
    
    return statements;
  }

  // 递归生成条件链
  private generateConditionChain(nodeId: string, indent: string = ''): string[] {
    const node = this.getNodeById(nodeId);
    if (!node) return [];
    
    const data = node.data as PsyLangNodeData;
    if (data.nodeType !== 'condition') return [];
    
    const conditionType = (data.config.conditionType as string) || 'if';
    const lines: string[] = [];
    
    if (conditionType === 'if') {
      // If节点：需要条件表达式
      const conditionNode = this.getConnectedNode(nodeId, 'condition');
      const conditionExpr = conditionNode ? this.generateExpression(conditionNode) : 'true';
      
      lines.push(`${indent}if (${conditionExpr}) {`);
      
      // 生成true分支的语句
      const trueBranch = this.getConnectedNodesFromHandle(nodeId, 'true');
      const trueStatements = this.generateBranchStatements(trueBranch, indent + '    ');
      lines.push(...trueStatements);
      
      // 检查false分支是否连接到elseif
      const falseBranch = this.getConnectedNodesFromHandle(nodeId, 'false');
      if (falseBranch.length > 0) {
        const nextCondition = falseBranch.find(nodeId => {
          const nextNode = this.getNodeById(nodeId);
          return nextNode && (nextNode.data as PsyLangNodeData).nodeType === 'condition';
        });
        
        if (nextCondition) {
          // 有后续条件节点，递归生成
          lines.push(`${indent}} else `);
          const nextLines = this.generateConditionChain(nextCondition, indent);
          // 移除第一行的缩进，因为我们已经加了"} else "
          if (nextLines.length > 0) {
            nextLines[0] = nextLines[0].trim();
            lines.push(...nextLines);
          }
        } else {
          // false分支直接连接到output/label节点
          const falseStatements = this.generateBranchStatements(falseBranch, indent + '    ');
          if (falseStatements.length > 0) {
            lines.push(`${indent}} else {`);
            lines.push(...falseStatements);
            lines.push(`${indent}}`);
          } else {
            lines.push(`${indent}}`);
          }
        }
      } else {
        lines.push(`${indent}}`);
      }
      
    } else if (conditionType === 'elseif') {
      // ElseIf节点：需要条件表达式
      const conditionNode = this.getConnectedNode(nodeId, 'condition');
      const conditionExpr = conditionNode ? this.generateExpression(conditionNode) : 'true';
      
      lines.push(`if (${conditionExpr}) {`);
      
      // 生成true分支的语句
      const trueBranch = this.getConnectedNodesFromHandle(nodeId, 'true');
      const trueStatements = this.generateBranchStatements(trueBranch, indent + '    ');
      lines.push(...trueStatements);
      
      // 检查false分支
      const falseBranch = this.getConnectedNodesFromHandle(nodeId, 'false');
      if (falseBranch.length > 0) {
        const nextCondition = falseBranch.find(nodeId => {
          const nextNode = this.getNodeById(nodeId);
          return nextNode && (nextNode.data as PsyLangNodeData).nodeType === 'condition';
        });
        
        if (nextCondition) {
          lines.push(`${indent}} else `);
          const nextLines = this.generateConditionChain(nextCondition, indent);
          if (nextLines.length > 0) {
            nextLines[0] = nextLines[0].trim();
            lines.push(...nextLines);
          }
        } else {
          const falseStatements = this.generateBranchStatements(falseBranch, indent + '    ');
          if (falseStatements.length > 0) {
            lines.push(`${indent}} else {`);
            lines.push(...falseStatements);
            lines.push(`${indent}}`);
          } else {
            lines.push(`${indent}}`);
          }
        }
      } else {
        lines.push(`${indent}}`);
      }
      
    }
    
    return lines;
  }

  private generateConditions(): string[] {
    const conditions: string[] = [];
    
    // 找到所有的if节点（条件链的起始点）
    const ifNodes = this.nodes.filter(n => {
      const data = n.data as PsyLangNodeData;
      return data.nodeType === 'condition' && 
             (data.config.conditionType as string) === 'if';
    });
    
    // 为每个if节点生成条件链
    ifNodes.forEach(node => {
      const conditionLines = this.generateConditionChain(node.id);
      if (conditionLines.length > 0) {
        conditions.push(...conditionLines);
        conditions.push(''); // 添加空行分隔不同的条件组
      }
    });
    
    // 处理没有连接到条件链的独立Label节点
    const labelNodes = this.nodes.filter(n => {
      const data = n.data as PsyLangNodeData;
      if (data.nodeType !== 'label') return false;
      
      // 检查是否连接到条件节点
      const hasConditionInput = this.edges.some(edge => {
        const sourceNode = this.getNodeById(edge.source);
        return edge.target === n.id && sourceNode && 
               (sourceNode.data as PsyLangNodeData).nodeType === 'condition';
      });
      
      return !hasConditionInput;
    });
    
    // 为独立的Label节点生成简单赋值语句
    labelNodes.forEach(node => {
      const data = node.data as PsyLangNodeData;
      const labelId = data.config.labelId || 0;
      const value = data.config.value || 'Unknown';
      conditions.push(`Label[${labelId}] = "${value}";`);
    });
    
    return conditions;
  }

  generate(): CodeGenerationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查循环依赖
    const sortedNodes = this.topologicalSort();
    if (sortedNodes.length === 0 && this.nodes.length > 0) {
      errors.push('检测到循环依赖，无法生成代码');
      return { code: '', errors, warnings };
    }

    // 生成代码段
    const codeLines: string[] = [];
    
    // 添加注释头
    codeLines.push('# PsyLang Generated Code');
    codeLines.push('# Generated by PsyLang Visual Builder');
    codeLines.push('');

    // 生成赋值语句
    const assignments = this.generateAssignments();
    if (assignments.length > 0) {
      codeLines.push('# Calculate scores');
      codeLines.push(...assignments);
      codeLines.push('');
    }

    // 生成条件语句
    const conditions = this.generateConditions();
    if (conditions.length > 0) {
      codeLines.push('# Classification logic');
      codeLines.push(...conditions);
    }

    // 验证生成的代码
    const hasOutput = this.nodes.some(n => (n.data as PsyLangNodeData).nodeType === 'output');
    const hasInput = this.nodes.some(n => {
      const nodeType = (n.data as PsyLangNodeData).nodeType;
      return nodeType === 'answer' || nodeType === 'score';
    });

    if (!hasInput) {
      warnings.push('没有输入节点 (Answer/Score)');
    }
    if (!hasOutput) {
      warnings.push('没有输出节点 (Output)');
    }

    // 检查未连接的节点
    const unconnectedNodes = this.nodes.filter(node => {
      const hasIncoming = this.edges.some(edge => edge.target === node.id);
      const hasOutgoing = this.edges.some(edge => edge.source === node.id);
      const nodeType = (node.data as PsyLangNodeData).nodeType;
      
      // 输入节点不需要传入连接，输出节点不需要传出连接
      if (nodeType === 'answer' || nodeType === 'score') {
        return !hasOutgoing;
      }
      if (nodeType === 'output' || nodeType === 'label') {
        return !hasIncoming;
      }
      return !hasIncoming && !hasOutgoing;
    });

    if (unconnectedNodes.length > 0) {
      warnings.push(`发现 ${unconnectedNodes.length} 个未连接的节点`);
    }

    return {
      code: codeLines.join('\n'),
      errors,
      warnings
    };
  }
}