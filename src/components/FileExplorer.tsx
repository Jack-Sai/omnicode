import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Folder, File, ChevronRight, ChevronDown, Home, RefreshCw, Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/cn';
import { Card, IconButton, Input } from './ui';

interface FileInfo {
  name: string;
  path: string;
  is_file: boolean;
  is_dir: boolean;
  size: number;
  modified: string | null;
}

interface FileExplorerProps {
  onSelect?: (path: string) => void;
  mode?: 'select' | 'browse';
}

export function FileExplorer({ onSelect, mode = 'browse' }: FileExplorerProps) {
  const { settings } = useAppStore();
  const [currentPath, setCurrentPath] = useState(settings.workspacePath || '~');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const result = await invoke<{ success: boolean; data: { files: FileInfo[] } }>(
        'list_directory',
        { path }
      );
      if (result.success && result.data) {
        setFiles(result.data.files);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('加载目录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleRefresh = () => loadDirectory(currentPath);
  const handleGoUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parent);
  };
  const handleGoHome = () => loadDirectory(settings.workspacePath || '~');
  const handleFileClick = (file: FileInfo) => {
    if (file.is_dir) loadDirectory(file.path);
    else if (onSelect) onSelect(file.path);
  };
  const toggleExpand = (path: string) => {
    const next = new Set(expandedDirs);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedDirs(next);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card padding="none" className="flex h-full flex-col overflow-hidden">
      {/* 工具栏 */}
      <div className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-2">
        <IconButton label="回到工作区" size="sm" onClick={handleGoHome}>
          <Home size={14} />
        </IconButton>
        <IconButton label="上级目录" size="sm" onClick={handleGoUp}>
          <ChevronRight size={14} className="rotate-180" />
        </IconButton>
        <IconButton label="刷新" size="sm" onClick={handleRefresh}>
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
        </IconButton>

        <span
          className="min-w-0 flex-1 truncate px-1 font-mono text-[11px] text-fg-muted"
          title={currentPath}
        >
          {currentPath}
        </span>

        <Input
          inputSize="sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索…"
          leadingIcon={<Search size={13} />}
          className="w-32 shrink-0"
        />
      </div>

      {/* 文件列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-xs text-fg-muted">
            <RefreshCw size={14} className="animate-spin" />
            加载中…
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-fg-muted">
            <Folder size={24} />
            <p className="text-xs">空目录</p>
          </div>
        ) : (
          <ul className="py-1">
            {filteredFiles.map((file) => (
              <li key={file.path}>
                <div
                  onClick={() => handleFileClick(file)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors duration-150',
                    'hover:bg-surface-hover',
                    mode === 'select' && file.is_file && 'hover:bg-accent-subtle'
                  )}
                >
                  {file.is_dir ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(file.path);
                        }}
                        className="shrink-0 text-fg-muted"
                      >
                        {expandedDirs.has(file.path) ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </button>
                      <Folder size={14} className="shrink-0 text-accent" />
                    </>
                  ) : (
                    <>
                      <span className="w-3 shrink-0" />
                      <File size={14} className="shrink-0 text-fg-muted" />
                    </>
                  )}

                  <span className="min-w-0 flex-1 truncate text-fg-secondary">{file.name}</span>

                  {file.is_file && (
                    <span className="shrink-0 font-mono text-[10px] text-fg-muted">
                      {formatSize(file.size)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
