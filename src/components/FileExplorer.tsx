import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Home,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

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

  const handleRefresh = () => {
    loadDirectory(currentPath);
  };

  const handleGoUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parent);
  };

  const handleGoHome = () => {
    loadDirectory(settings.workspacePath || '~');
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.is_dir) {
      loadDirectory(file.path);
    } else if (onSelect) {
      onSelect(file.path);
    }
  };

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200">
        <button
          onClick={handleGoHome}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="回到工作区"
        >
          <Home size={16} />
        </button>
        <button
          onClick={handleGoUp}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="上级目录"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <button
          onClick={handleRefresh}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="刷新"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
        
        <div className="flex-1 px-2 text-sm text-gray-600 truncate" title={currentPath}>
          {currentPath}
        </div>
        
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            className="pl-7 pr-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <RefreshCw size={20} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Folder size={32} className="mb-2" />
            <p className="text-sm">空目录</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => handleFileClick(file)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  file.is_dir
                    ? 'hover:bg-blue-50'
                    : 'hover:bg-gray-50'
                } ${mode === 'select' && file.is_file ? 'hover:bg-blue-100' : ''}`}
              >
                {file.is_dir ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(file.path);
                      }}
                      className="p-0.5 text-gray-400"
                    >
                      {expandedDirs.has(file.path) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    <Folder size={16} className="text-blue-500" />
                  </>
                ) : (
                  <>
                    <span className="w-[14px]" />
                    <File size={16} className="text-gray-500" />
                  </>
                )}
                
                <span className="flex-1 text-sm truncate text-gray-700">
                  {file.name}
                </span>
                
                {file.is_file && (
                  <span className="text-xs text-gray-400">
                    {formatSize(file.size)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
