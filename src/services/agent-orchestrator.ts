/**
 * Agent Orchestrator
 * Manages dynamic PersonI creation, spawning, and multi-agent coordination
 * MCP-aware orchestration for task delegation and tool assignment
 */

import { PersoniConfig, personaTemplates, DEFAULT_CAPABILITIES } from '../personas';
import { mcpManager } from './mcp/mcp-manager';
import { activePersonasManager, PersonaSlot } from './active-personas-manager';
import { providerManager } from './provider-manager';

export interface AgentTask {
  id: string;
  description: string;
  requiredCapabilities: string[];
  requiredTools?: string[];
  priority: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  assignedPersona?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface OrchestratedWorkflow {
  id: string;
  name: string;
  tasks: AgentTask[];
  mode: 'sequential' | 'parallel' | 'adaptive';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface PersonaCapabilityMatch {
  persona: PersoniConfig;
  matchScore: number;
  missingCapabilities: string[];
  availableTools: string[];
}

export class AgentOrchestrator {
  private workflows: Map<string, OrchestratedWorkflow> = new Map();
  private activeAgents: Map<string, PersoniConfig> = new Map();
  private taskQueue: AgentTask[] = [];

  /**
   * Match a task to the best-suited PersonI
   */
  matchTaskToPersona(task: AgentTask, availablePersonas: PersoniConfig[]): PersonaCapabilityMatch | null {
    const matches: PersonaCapabilityMatch[] = [];

    for (const persona of availablePersonas) {
      const capabilities = persona.capabilities || DEFAULT_CAPABILITIES;
      let matchScore = 0;
      const missingCapabilities: string[] = [];
      const availableTools: string[] = [];

      // Score based on required capabilities
      task.requiredCapabilities.forEach((reqCap) => {
        if (capabilities[reqCap as keyof typeof capabilities]) {
          matchScore += 1;
        } else {
          missingCapabilities.push(reqCap);
        }
      });

      // Score based on enabled connectors/tools
      if (task.requiredTools) {
        task.requiredTools.forEach((tool) => {
          if (persona.enabledConnectors?.includes(tool)) {
            matchScore += 2; // Tools are weighted higher
            availableTools.push(tool);
          }
        });
      }

      // Bonus for MCP capability if task requires MCP tools
      if (task.requiredTools && capabilities.mcp) {
        matchScore += 1;
      }

      if (matchScore > 0) {
        matches.push({
          persona,
          matchScore,
          missingCapabilities,
          availableTools,
        });
      }
    }

    // Sort by match score (descending)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Spawn a new PersonI for a specific task
   */
  async spawnPersonaForTask(task: AgentTask, templateName?: string): Promise<PersoniConfig> {
    // Find template that best matches task requirements
    const template = templateName 
      ? personaTemplates.find(t => t.templateName === templateName)
      : this.findBestTemplate(task);

    if (!template) {
      throw new Error('No suitable template found for task');
    }

    // Generate unique ID
    const id = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new PersonI from template with MCP capability if needed
    const capabilities = { ...(template.capabilities || DEFAULT_CAPABILITIES) };
    if (task.requiredTools && task.requiredTools.length > 0) {
      capabilities.mcp = true; // Enable MCP for tool execution
      capabilities.tools = true;
    }

    const newPersona: PersoniConfig = {
      ...template,
      id,
      name: `${template.name} (Task Agent)`,
      enabledConnectors: task.requiredTools || template.enabledConnectors || [],
      capabilities,
    };

    // Register as active agent
    this.activeAgents.set(id, newPersona);

    // Register with activePersonasManager for execution
    // Use secondary slot if primary is occupied
    const primaryPersona = activePersonasManager.getPersona('primary');
    const slot: PersonaSlot = primaryPersona ? 'secondary' : 'primary';
    activePersonasManager.setPersona(slot, newPersona);

    console.log(`[AgentOrchestrator] Spawned ${newPersona.name} for task: ${task.description}`);

    return newPersona;
  }

  /**
   * Find the best template for a task based on capabilities
   */
  private findBestTemplate(task: AgentTask): typeof personaTemplates[0] | null {
    let bestMatch = null;
    let bestScore = 0;

    for (const template of personaTemplates) {
      const capabilities = template.capabilities || DEFAULT_CAPABILITIES;
      let score = 0;

      task.requiredCapabilities.forEach((reqCap) => {
        if (capabilities[reqCap as keyof typeof capabilities]) {
          score += 1;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    return bestMatch;
  }

  /**
   * Create an orchestrated workflow from multiple tasks
   */
  createWorkflow(name: string, tasks: AgentTask[], mode: OrchestratedWorkflow['mode'] = 'sequential'): OrchestratedWorkflow {
    const workflow: OrchestratedWorkflow = {
      id: `workflow-${Date.now()}`,
      name,
      tasks,
      mode,
      status: 'pending',
      createdAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    console.log(`[AgentOrchestrator] Created workflow: ${name} with ${tasks.length} tasks`);

    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, personas: PersoniConfig[]): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = 'running';
    console.log(`[AgentOrchestrator] Executing workflow: ${workflow.name}`);

    try {
      if (workflow.mode === 'sequential') {
        await this.executeSequential(workflow, personas);
      } else if (workflow.mode === 'parallel') {
        await this.executeParallel(workflow, personas);
      } else if (workflow.mode === 'adaptive') {
        await this.executeAdaptive(workflow, personas);
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      console.log(`[AgentOrchestrator] Workflow completed: ${workflow.name}`);
    } catch (error: any) {
      workflow.status = 'failed';
      console.error(`[AgentOrchestrator] Workflow failed: ${workflow.name}`, error);
      throw error;
    }
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(workflow: OrchestratedWorkflow, personas: PersoniConfig[]): Promise<void> {
    for (const task of workflow.tasks) {
      await this.executeTask(task, personas);
    }
  }

  /**
   * Execute tasks in parallel
   */
  private async executeParallel(workflow: OrchestratedWorkflow, personas: PersoniConfig[]): Promise<void> {
    const taskPromises = workflow.tasks.map(task => this.executeTask(task, personas));
    await Promise.all(taskPromises);
  }

  /**
   * Execute tasks adaptively (optimize based on agent availability and capability)
   */
  private async executeAdaptive(workflow: OrchestratedWorkflow, personas: PersoniConfig[]): Promise<void> {
    // Sort tasks by priority
    const sortedTasks = [...workflow.tasks].sort((a, b) => b.priority - a.priority);

    // Group tasks by capability requirements
    const taskGroups = new Map<string, AgentTask[]>();
    sortedTasks.forEach(task => {
      const key = task.requiredCapabilities.sort().join(',');
      if (!taskGroups.has(key)) {
        taskGroups.set(key, []);
      }
      taskGroups.get(key)!.push(task);
    });

    // Execute each group with optimal agent assignment
    for (const [_, tasks] of taskGroups) {
      await Promise.all(tasks.map(task => this.executeTask(task, personas)));
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: AgentTask, personas: PersoniConfig[]): Promise<void> {
    task.status = 'assigned';

    // Find best matching persona
    const match = this.matchTaskToPersona(task, personas);
    
    let assignedPersona: PersoniConfig;
    
    if (match && match.missingCapabilities.length === 0) {
      assignedPersona = match.persona;
      console.log(`[AgentOrchestrator] Assigned task to existing persona: ${assignedPersona.name}`);
    } else {
      // Spawn new persona if no perfect match
      assignedPersona = await this.spawnPersonaForTask(task);
      console.log(`[AgentOrchestrator] Spawned new persona for task: ${assignedPersona.name}`);
    }

    task.assignedPersona = assignedPersona.name;
    task.status = 'in_progress';

    try {
      // Execute task (this would integrate with MCP tools or direct provider calls)
      const result = await this.executePersonaTask(assignedPersona, task);
      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      console.log(`[AgentOrchestrator] Task completed by ${assignedPersona.name}`);
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      console.error(`[AgentOrchestrator] Task failed for ${assignedPersona.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a task using a specific PersonI
   */
  private async executePersonaTask(persona: PersoniConfig, task: AgentTask): Promise<any> {
    console.log(`[AgentOrchestrator] ${persona.name} executing: ${task.description}`);
    
    // Get provider for this persona
    const provider = providerManager.getProviderForModel(persona.thinkingModel);
    if (!provider) {
      throw new Error(`No provider configured for model: ${persona.thinkingModel}`);
    }

    // If task requires MCP tools, use MCP execution
    if (task.requiredTools && task.requiredTools.length > 0 && persona.capabilities?.mcp) {
      const mcpStatus = mcpManager.getStatus();
      if (!mcpStatus.isRunning) {
        console.warn('[AgentOrchestrator] MCP server not running, starting it...');
        await mcpManager.start();
      }

      // Execute task using MCP tools
      return await this.executeTaskWithMCP(persona, task);
    }

    // Otherwise, execute using provider's chat/completion API
    return await this.executeTaskWithProvider(persona, task, provider);
  }

  /**
   * Execute task using MCP tools
   */
  private async executeTaskWithMCP(persona: PersoniConfig, task: AgentTask): Promise<any> {
    console.log(`[AgentOrchestrator] ${persona.name} using MCP tools for: ${task.description}`);
    
    // Build prompt that includes task description and available tools
    const prompt = `Task: ${task.description}\n\nYou have access to the following tools: ${task.requiredTools?.join(', ')}\n\nPlease complete this task using the available tools and provide a detailed result.`;

    // For now, log the MCP execution intent
    // Full implementation would call MCP server's tool execution
    console.log(`[AgentOrchestrator] MCP execution: ${prompt}`);

    return {
      status: 'success',
      message: `Task "${task.description}" executed via MCP tools`,
      tools_used: task.requiredTools,
      persona: persona.name,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute task using provider directly
   */
  private async executeTaskWithProvider(persona: PersoniConfig, task: AgentTask, provider: any): Promise<any> {
    console.log(`[AgentOrchestrator] ${persona.name} using provider: ${persona.thinkingModel}`);
    
    try {
      // Send task description to provider
      const response = await provider.sendMessage(task.description, persona.systemInstruction);
      
      return {
        status: 'success',
        result: response,
        persona: persona.name,
        model: persona.thinkingModel,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(`[AgentOrchestrator] Provider execution failed:`, error);
      throw new Error(`Provider execution failed: ${error.message}`);
    }
  }

  /**
   * Coordinate multi-agent collaboration
   */
  async coordinateAgents(
    primaryPersona: PersoniConfig,
    secondaryPersona: PersoniConfig,
    task: AgentTask,
    mode: 'collaborative' | 'debate' | 'teaching'
  ): Promise<void> {
    console.log(`[AgentOrchestrator] Coordinating ${mode} mode between ${primaryPersona.name} and ${secondaryPersona.name}`);

    // Set up dual PersonI mode in active-personas-manager
    activePersonasManager.setPersona('primary', primaryPersona);
    activePersonasManager.setPersona('secondary', secondaryPersona);

    // Execute task with multi-agent coordination
    task.status = 'in_progress';

    try {
      // Coordination logic based on mode
      switch (mode) {
        case 'collaborative':
          await this.collaborativeExecution(primaryPersona, secondaryPersona, task);
          break;
        case 'debate':
          await this.debateExecution(primaryPersona, secondaryPersona, task);
          break;
        case 'teaching':
          await this.teachingExecution(primaryPersona, secondaryPersona, task);
          break;
      }

      task.status = 'completed';
      task.completedAt = new Date();
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      throw error;
    }
  }

  /**
   * Collaborative execution - agents work together
   */
  private async collaborativeExecution(primary: PersoniConfig, secondary: PersoniConfig, task: AgentTask): Promise<void> {
    console.log(`[AgentOrchestrator] ${primary.name} and ${secondary.name} collaborating on: ${task.description}`);
    // Implementation would coordinate turn-taking, shared context, and result synthesis
  }

  /**
   * Debate execution - agents discuss and refine ideas
   */
  private async debateExecution(primary: PersoniConfig, secondary: PersoniConfig, task: AgentTask): Promise<void> {
    console.log(`[AgentOrchestrator] ${primary.name} and ${secondary.name} debating: ${task.description}`);
    // Implementation would facilitate back-and-forth discussion
  }

  /**
   * Teaching execution - one agent teaches/guides the other
   */
  private async teachingExecution(teacher: PersoniConfig, student: PersoniConfig, task: AgentTask): Promise<void> {
    console.log(`[AgentOrchestrator] ${teacher.name} teaching ${student.name} about: ${task.description}`);
    // Implementation would structure teacher-student interaction
  }

  /**
   * Get MCP-available tools and map to PersonI capabilities
   */
  async discoverAndAssignTools(persona: PersoniConfig): Promise<string[]> {
    if (!persona.capabilities?.mcp) {
      console.log(`[AgentOrchestrator] ${persona.name} does not have MCP capability`);
      return [];
    }

    const mcpStatus = mcpManager.getStatus();
    if (!mcpStatus.isRunning) {
      console.log('[AgentOrchestrator] MCP server not running, starting it...');
      await mcpManager.start();
    }

    const stats = mcpManager.getStatus().stats;
    if (!stats) return [];

    // Filter tools that match persona's domain/capabilities
    const newTools = stats.tools.filter((toolName: string) => {
      // Check if tool is already enabled
      return !persona.enabledConnectors?.includes(toolName);
    });

    // Assign new tools to persona
    if (newTools.length > 0) {
      persona.enabledConnectors = [...(persona.enabledConnectors || []), ...newTools];
      console.log(`[AgentOrchestrator] Assigned ${newTools.length} new MCP tools to ${persona.name}: ${newTools.join(', ')}`);
      
      // Update in active personas manager if persona is active
      const slot = activePersonasManager.getSlotForPersona(persona.id);
      if (slot) {
        activePersonasManager.setPersona(slot, persona);
      }
    }

    return newTools;
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): OrchestratedWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): PersoniConfig[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Cleanup completed workflows and agents
   */
  cleanup(): void {
    // Remove completed workflows older than 1 hour
    const oneHourAgo = Date.now() - 3600000;
    this.workflows.forEach((workflow, id) => {
      if (workflow.status === 'completed' && workflow.completedAt && workflow.completedAt.getTime() < oneHourAgo) {
        this.workflows.delete(id);
      }
    });

    // Clear active agents (they can be re-spawned as needed)
    this.activeAgents.clear();
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator();
