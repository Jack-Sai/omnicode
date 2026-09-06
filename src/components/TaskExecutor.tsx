import { useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Step {
  id: string;
  tool_name: string;
  params: Record<string, unknown>;
  status: StepStatus;
  result?: string;
  error_message?: string;
  retry_count: number;
}

export interface TaskPlan {
  id: string;
  steps: Step[];
  status: 'draft' | 'running' | 'completed' | 'failed';
}

interface TaskExecutorProps {
  task: TaskPlan;
  onExecute?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onRetry?: (taskId: string, stepId: string) => void;
}

const statusConfig: Record<StepStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock size={16} />, color: 'text-gray-400', label: '等待中' },
  running: { icon: <Loader2 size={16} className="animate-spin" />, color: 'text-blue-500', label: '执行中' },
  completed: { icon: <CheckCircle size={16} />, color: 'text-green-500', label: '已完成' },
  failed: { icon: <XCircle size={16} />, color: 'text-red-500', label: '失败' },
  cancelled: { icon: <Pause size={16} />, color: 'text-yellow-500', label: '已取消' },
};

export function TaskExecutor({ task, onExecute, onCancel, onRetry }: TaskExecutorProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const completedSteps = task.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-800">任务执行</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            task.status === 'running'
              ? 'bg-blue-100 text-blue-600'
              : task.status === 'completed'
              ? 'bg-green-100 text-green-600'
              : task.status === 'failed'
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {task.status === 'running' ? '执行中' : task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '草稿'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'draft' && (
            <button
              onClick={() => onExecute?.(task.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Play size={14} />
              执行
            </button>
          )}
          {task.status === 'running' && (
            <button
              onClick={() => onCancel?.(task.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              <Pause size={14} />
              取消
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>进度</span>
          <span>{completedSteps}/{totalSteps}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              task.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="divide-y divide-gray-100">
        {task.steps.map((step, index) => {
          const config = statusConfig[step.status];
          const isExpanded = expandedStep === step.id;

          return (
            <div key={step.id} className="px-4 py-3">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                <span className={config.color}>{config.icon}</span>
                <span className="flex-1 font-medium text-gray-800">{step.tool_name}</span>
                {step.retry_count > 0 && (
                  <span className="text-xs text-gray-400">重试 {step.retry_count} 次</span>
                )}
              </div>

              {/* Step Details */}
              {isExpanded && (
                <div className="mt-3 ml-9 space-y-2">
                  {/* Params */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">参数</div>
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(step.params, null, 2)}
                    </pre>
                  </div>

                  {/* Result */}
                  {step.result && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600 mb-1">结果</div>
                      <pre className="text-xs text-green-700 overflow-x-auto">{step.result}</pre>
                    </div>
                  )}

                  {/* Error */}
                  {step.error_message && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-xs text-red-600 mb-1">错误</div>
                      <pre className="text-xs text-red-700 overflow-x-auto">{step.error_message}</pre>
                    </div>
                  )}

                  {/* Actions */}
                  {step.status === 'failed' && onRetry && (
                    <button
                      onClick={() => onRetry(task.id, step.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <RotateCcw size={14} />
                      重试此步骤
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// DAG 可视化组件（简化版）
interface DAGVisualizerProps {
  steps: Step[];
}

export function DAGVisualizer({ steps }: DAGVisualizerProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        
        return (
          <div key={step.id} className="flex items-center gap-3">
            {/* Node */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              step.status === 'completed'
                ? 'border-green-300 bg-green-50'
                : step.status === 'running'
                ? 'border-blue-300 bg-blue-50'
                : step.status === 'failed'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <span className={config.color}>{config.icon}</span>
              <span className="text-sm font-medium text-gray-700">{step.tool_name}</span>
            </div>
            
            {/* Arrow */}
            {index < steps.length - 1 && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-gray-300" />
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
