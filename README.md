# Omni Code

**为代码而生的本地智能体**

Omni Code 是一款面向编程场景的 AI 智能体桌面应用。用户通过自然语言描述目标，Agent 自主规划、调用工具、编写并执行代码。

## 核心特性

- **模型自由** - 支持云端 API（OpenAI/Anthropic/DeepSeek 等）或本地部署（Ollama/llama.cpp）
- **本地优先** - 所有数据默认存储在本地，账户系统纯离线运行
- **透明可审计** - Agent 的每一步思考与操作均对用户可见
- **用户主导** - 危险操作必须审批，用户始终拥有最终决定权
- **高度可扩展** - 支持自定义工具插件，用户可自由扩展 Agent 能力

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 (Rust + Web) |
| 数据库 | SQLite |
| 前端 | React 18 + TypeScript |
| UI | Tailwind CSS |
| 状态管理 | Zustand |

## 功能模块

- **对话系统** - 流式响应、多轮对话、历史记录
- **模型管理** - 多模型配置、健康检查、性能监控
- **记忆系统** - 短期/长期记忆、知识检索
- **工具系统** - 文件操作、Git 操作、代码执行
- **插件系统** - HTTP 远程工具注册、自定义扩展
- **任务执行** - DAG 计划、步骤追踪、审批流程

## 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm tauri dev
```

### 构建生产版本

```bash
pnpm tauri build
```

## 项目结构

```
omni-code/
├── src/                    # 前端代码
│   ├── components/         # React 组件
│   ├── store/              # Zustand 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── App.tsx             # 主应用
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── lib.rs          # Tauri 入口
│       ├── db.rs           # 数据库模块
│       ├── llm.rs          # LLM 调用
│       ├── tools.rs        # 文件工具
│       ├── git_tools.rs    # Git 工具
│       └── exec_tools.rs   # 代码执行
└── package.json
```

## 工具列表

### 文件工具
- `read_file` - 读取文件
- `write_file` - 写入文件
- `delete_file` - 删除文件/目录
- `move_file` - 移动/重命名
- `create_directory` - 创建目录
- `list_directory` - 列出目录内容
- `search_files` - 搜索文件

### Git 工具
- `git_status` - 获取仓库状态
- `git_log` - 查看提交历史
- `git_diff` - 查看变更差异
- `git_commit` - 提交代码
- `git_push` / `git_pull` - 推送/拉取
- `git_create_branch` / `git_checkout` - 分支管理

### 代码执行
- `execute_python` - 执行 Python 脚本
- `execute_shell` - 执行 Shell 命令
- `execute_npm` - 执行 npm 命令
- `execute_cargo` - 执行 cargo 命令

## 执行模式

| 模式 | 说明 |
|------|------|
| 手动审批 | 所有中风险及以上操作需要用户确认 |
| 自动审批 | 低风险自动执行，中高风险根据置信度判断 |
| 完全访问 | 所有操作直接执行（谨慎使用） |

## 许可证

MIT License
