import { useState } from 'react';
import { Check, X, AlertTriangle, File, Terminal, Edit, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';
import { Badge, Button, Card, CardHeader, CodeBlock, type BadgeTone } from './ui';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ToolCall {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  riskLevel: RiskLevel;
  description: string;
}

interface ApprovalCardProps {
  toolCall: ToolCall;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify?: (id: string, newParams: Record<string, unknown>) => void;
}

const RISK_TONE: Record<RiskLevel, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  read_file: <File size={14} />,
  write_file: <Edit size={14} />,
  delete_file: <X size={14} />,
  execute_shell: <Terminal size={14} />,
};

export function ApprovalCard({ toolCall, onApprove, onReject, onModify }: ApprovalCardProps) {
  const { t } = useTranslation();
  const [showParams, setShowParams] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedParams, setEditedParams] = useState(JSON.stringify(toolCall.params, null, 2));

  const tone = RISK_TONE[toolCall.riskLevel];

  const handleSaveEdit = () => {
    try {
      onModify?.(toolCall.id, JSON.parse(editedParams));
      setEditing(false);
    } catch {
      alert(t('approval.json_error'));
    }
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-fg-muted">
            {TOOL_ICONS[toolCall.toolName] || <File size={14} />}
          </span>
          <span className="truncate font-mono text-xs font-medium text-fg">
            {toolCall.toolName}
          </span>
          <Badge tone={tone}>{RISK_LABEL[toolCall.riskLevel]}</Badge>
        </div>
        {toolCall.riskLevel === 'high' && (
          <AlertTriangle size={14} className="shrink-0 text-danger" />
        )}
      </div>

      <p className="px-4 py-3 text-xs leading-relaxed text-fg-secondary">{toolCall.description}</p>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setShowParams(!showParams)}
          className="text-[11px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          {showParams ? t('approval.hide_params') : t('approval.view_params')}
        </button>
      </div>

      {showParams && (
        <div className="px-4 pb-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editedParams}
                onChange={(e) => setEditedParams(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-line bg-inset p-2.5 font-mono text-xs text-fg outline-none focus:border-accent focus:shadow-[var(--shadow-focus)]"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                  {t('approval.save')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                  {t('approval.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <CodeBlock>{JSON.stringify(toolCall.params, null, 2)}</CodeBlock>
          )}
        </div>
      )}

      <div className="flex gap-2 border-t border-line px-4 py-3">
        <Button
          variant="success"
          size="sm"
          icon={<Check size={14} />}
          className="flex-1"
          onClick={() => onApprove(toolCall.id)}
        >
          {t('approval.approve')}
        </Button>
        {onModify && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t('approval.modify')}
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          icon={<X size={14} />}
          className="flex-1"
          onClick={() => onReject(toolCall.id)}
        >
          {t('approval.reject')}
        </Button>
      </div>
    </Card>
  );
}

interface ApprovalQueueProps {
  toolCalls: ToolCall[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify?: (id: string, newParams: Record<string, unknown>) => void;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
}

export function ApprovalQueue({
  toolCalls,
  onApprove,
  onReject,
  onModify,
  onApproveAll,
  onRejectAll,
}: ApprovalQueueProps) {
  const { t } = useTranslation();
  const { settings } = useAppStore();
  if (toolCalls.length === 0) return null;

  const hasHighRisk = toolCalls.some((tc) => tc.riskLevel === 'high');

  return (
    <Card padding="lg">
      <CardHeader
        title={t('approval.pending').replace('{count}', String(toolCalls.length))}
        actions={
          settings.executionMode === 'auto' && !hasHighRisk ? (
            <Badge tone="info">{t('approval.auto_mode')}</Badge>
          ) : undefined
        }
        className="mb-4"
      />

      <div className="space-y-3">
        {toolCalls.map((tc) => (
          <ApprovalCard
            key={tc.id}
            toolCall={tc}
            onApprove={onApprove}
            onReject={onReject}
            onModify={onModify}
          />
        ))}
      </div>

      {(onApproveAll || onRejectAll) && (
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          {onApproveAll && (
            <Button
              variant="success"
              size="sm"
              icon={<ShieldCheck size={14} />}
              className="flex-1"
              onClick={onApproveAll}
            >
              {t('approval.approve_all')}
            </Button>
          )}
          {onRejectAll && (
            <Button
              variant="danger"
              size="sm"
              icon={<X size={14} />}
              className="flex-1"
              onClick={onRejectAll}
            >
              {t('approval.reject_all')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
