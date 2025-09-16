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
        
      case 'math': {
        const dependencies = Array.from(this.dependencyGraph.get(nodeId) || []);
        if (dependencies.length === 0) {
          return '0';
        } else if (dependencies.length === 1) {
          return this.generateExpression(dependencies[0], new Set(visited));
        } else {
          const left = this.generateExpression(dependencies[0], new Set(visited));
          const right = this.generateExpression(dependencies[1], new Set(visited));
          const operator = data.config.operator || '+';
          
          // 处理除法显示
          const displayOperator = operator === '/' ? '/' : operator;
          return `(${left} ${displayOperator} ${right})`;
        }
      }
        
      case 'comparison': {
        const dependencies = Array.from(this.dependencyGraph.get(nodeId) || []);
        if (dependencies.length < 2) {
          return 'true';
        }
        const left = this.generateExpression(dependencies[0], new Set(visited));
        const right = this.generateExpression(dependencies[1], new Set(visited));
        const operator = data.config.operator || '>';
        return `(${left} ${operator} ${right})`;
      }

      case 'logical': {
        const dependencies = Array.from(this.dependencyGraph.get(nodeId) || []);
        if (dependencies.length < 2) {
          return 'true';
        }
        const left = this.generateExpression(dependencies[0], new Set(visited));
        const right = this.generateExpression(dependencies[1], new Set(visited));
        const operator = data.config.operator || '&&';
        return `(${left} ${operator} ${right})`;
      }
        
      default:
        return `[未知表达式:${data.nodeType}]`;
    }
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

  private generateConditions(): string[] {
    const conditions: string[] = [];
    const conditionNodes = this.nodes.filter(n => (n.data as PsyLangNodeData).nodeType === 'condition');
    
    // 简化处理：为每个label节点生成基本条件
    const labelNodes = this.nodes.filter(n => (n.data as PsyLangNodeData).nodeType === 'label');
    
    labelNodes.forEach(node => {
      const data = node.data as PsyLangNodeData;
      const labelId = data.config.labelId || 0;
      const value = data.config.value || 'Unknown';
      
      // 查找对应的Output节点
      const outputNode = this.nodes.find(n => {
        const outputData = n.data as PsyLangNodeData;
        return outputData.nodeType === 'output' && outputData.config.outputId === labelId;
      });

      if (outputNode) {
        // 生成简单的条件判断
        conditions.push(
          `if (Output[${labelId}] >= 15) {`,
          `    Label[${labelId}] = "High"`,
          `} else if (Output[${labelId}] >= 10) {`,
          `    Label[${labelId}] = "Medium"`, 
          `} else {`,
          `    Label[${labelId}] = "Low"`,
          `}`
        );
      } else {
        // 直接赋值
        conditions.push(`Label[${labelId}] = "${value}"`);
      }
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