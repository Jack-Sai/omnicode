import { useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Badge, Button, Card, CodeBlock, ProgressBar, type BadgeTone } from './ui';

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

const STEP_STATUS: Record<StepStatus, { icon: React.ReactNode; tone: BadgeTone; label: string }> = {
  pending: { icon: <Clock size={14} />, tone: 'neutral', label: '等待中' },
  running: {
    icon: <Loader2 size={14} className="animate-spin" />,
    tone: 'info',
    label: '执行中',
  },
  completed: { icon: <CheckCircle size={14} />, tone: 'success', label: '已完成' },
  failed: { icon: <XCircle size={14} />, tone: 'danger', label: '失败' },
  cancelled: { icon: <Pause size={14} />, tone: 'warning', label: '已取消' },
};

const TASK_STATUS: Record<TaskPlan['status'], { tone: BadgeTone; label: string }> = {
  draft: { tone: 'neutral', label: '草稿' },
  running: { tone: 'info', label: '执行中' },
  completed: { tone: 'success', label: '已完成' },
  failed: { tone: 'danger', label: '失败' },
};

export function TaskExecutor({ task, onExecute, onCancel, onRetry }: TaskExecutorProps) {
  const { t } = useTranslation();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const completedSteps = task.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const taskStatus = TASK_STATUS[task.status];

  return (
    <Card padding="none" className="overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="truncate text-sm font-semibold text-fg">{t('task.title')}</h3>
          <Badge tone={taskStatus.tone}>{taskStatus.label}</Badge>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {task.status === 'draft' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Play size={13} />}
              onClick={() => onExecute?.(task.id)}
            >
              {t('task.execute')}
            </Button>
          )}
          {task.status === 'running' && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pause size={13} />}
              onClick={() => onCancel?.(task.id)}
            >
              {t('task.cancel')}
            </Button>
          )}
        </div>
      </div>

      {/* 进度 */}
      <div className="border-b border-line bg-inset px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-xs text-fg-muted">
          <span>{t('task.progress')}</span>
          <span className="font-medium text-fg-secondary">
            {completedSteps}/{totalSteps}
          </span>
        </div>
        <ProgressBar value={progress} tone={task.status === 'failed' ? 'danger' : 'accent'} />
      </div>

      {/* 步骤列表 */}
      <ul className="divide-y divide-line">
        {task.steps.map((step, index) => {
          const config = STEP_STATUS[step.status];
          const isExpanded = expandedStep === step.id;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-hover"
              >
                <span className="w-5 shrink-0 text-center font-mono text-xs text-fg-muted">
                  {index + 1}
                </span>
                <span
                  className={
                    step.status === 'completed'
                      ? 'shrink-0 text-success'
                      : step.status === 'running'
                        ? 'shrink-0 text-info'
                        : step.status === 'failed'
                          ? 'shrink-0 text-danger'
                          : 'shrink-0 text-fg-muted'
                  }
                >
                  {config.icon}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-fg">
                  {step.tool_name}
                </span>
                {step.retry_count > 0 && (
                  <span className="shrink-0 text-xs text-fg-muted">{t('task.retry')} {step.retry_count} {t('task.retry_count')}</span>
                )}
                <Badge tone={config.tone}>{config.label}</Badge>
              </button>

              {isExpanded && (
                <div className="space-y-2 px-4 pb-4 pl-12">
                  <div>
                    <p className="mb-1 text-xs font-medium text-fg-secondary">{t('task.params')}</p>
                    <CodeBlock>{JSON.stringify(step.params, null, 2)}</CodeBlock>
                  </div>

                  {step.result && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-success">{t('task.result')}</p>
                      <CodeBlock className="border-success-line bg-success-subtle text-success">
                        {step.result}
                      </CodeBlock>
                    </div>
                  )}

                  {step.error_message && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-danger">{t('task.error')}</p>
                      <CodeBlock className="border-danger-line bg-danger-subtle text-danger">
                        {step.error_message}
                      </CodeBlock>
                    </div>
                  )}

                  {step.status === 'failed' && onRetry && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RotateCcw size={13} />}
                      onClick={() => onRetry(task.id, step.id)}
                    >
                      {t('task.retry_step')}
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* DAG 可视化组件（简化版） */
interface DAGVisualizerProps {
  steps: Step[];
}

const NODE_TONE: Record<StepStatus, string> = {
  pending: 'border-line bg-inset text-fg-secondary',
  running: 'border-info-line bg-info-subtle text-info',
  completed: 'border-success-line bg-success-subtle text-success',
  failed: 'border-danger-line bg-danger-subtle text-danger',
  cancelled: 'border-warning-line bg-warning-subtle text-warning',
};

export function DAGVisualizer({ steps }: DAGVisualizerProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${NODE_TONE[step.status]}`}
          >
            {STEP_STATUS[step.status].icon}
            <span className="font-mono">{step.tool_name}</span>
          </div>

          {index < steps.length - 1 && (
            <div className="flex flex-col items-center py-1">
              <span className="h-3 w-px bg-line-strong" />
              <span className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-line-strong" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
