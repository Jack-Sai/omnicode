import { useState } from 'react';
import { Check, X, AlertTriangle, File, Terminal, Trash2, Edit } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

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

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const riskLabels: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const toolIcons: Record<string, React.ReactNode> = {
  read_file: <File size={16} />,
  write_file: <Edit size={16} />,
  delete_file: <Trash2 size={16} />,
  execute_shell: <Terminal size={16} />,
};

export function ApprovalCard({ toolCall, onApprove, onReject, onModify }: ApprovalCardProps) {
  const [showParams, setShowParams] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedParams, setEditedParams] = useState(JSON.stringify(toolCall.params, null, 2));

  const colors = riskColors[toolCall.riskLevel];

  const handleSaveEdit = () => {
    try {
      const newParams = JSON.parse(editedParams);
      onModify?.(toolCall.id, newParams);
      setEditing(false);
    } catch (e) {
      alert('JSON 格式错误');
    }
  };

  return (
    <div className={`border ${colors.border} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className={`${colors.bg} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {toolIcons[toolCall.toolName] || <File size={16} />}
          <span className="font-medium text-gray-800">{toolCall.toolName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
            {riskLabels[toolCall.riskLevel]}
          </span>
        </div>
        {toolCall.riskLevel === 'high' && (
          <AlertTriangle size={16} className="text-red-500" />
        )}
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-sm text-gray-600">{toolCall.description}</p>
      </div>

      {/* Params Toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowParams(!showParams)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {showParams ? '隐藏参数' : '查看参数'}
        </button>
      </div>

      {/* Params */}
      {showParams && (
        <div className="px-4 pb-3">
          {editing ? (
            <div>
              <textarea
                value={editedParams}
                onChange={(e) => setEditedParams(e.target.value)}
                className="w-full h-32 p-2 text-xs font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <pre className="p-2 text-xs bg-gray-50 rounded overflow-x-auto">
              {JSON.stringify(toolCall.params, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => onApprove(toolCall.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Check size={16} />
          批准
        </button>
        {onModify && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            修改参数
          </button>
        )}
        <button
          onClick={() => onReject(toolCall.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <X size={16} />
          拒绝
        </button>
      </div>
    </div>
  );
}

// 审批队列组件
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
  const { settings } = useAppStore();

  if (toolCalls.length === 0) {
    return null;
  }

  const hasHighRisk = toolCalls.some((tc) => tc.riskLevel === 'high');

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-800">
          待审批操作 ({toolCalls.length})
        </h3>
        {settings.executionMode === 'auto' && !hasHighRisk && (
          <span className="text-xs text-gray-500">自动审批模式</span>
        )}
      </div>

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

      {/* Batch Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        {onApproveAll && (
          <button
            onClick={onApproveAll}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            全部批准
          </button>
        )}
        {onRejectAll && (
          <button
            onClick={onRejectAll}
            className="flex-1 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            全部拒绝
          </button>
        )}
      </div>
    </div>
  );
}
