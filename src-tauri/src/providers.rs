//! 模型服务商预设
//!
//! 把各家的接入信息（端点、默认模型、文档地址）集中在这里，
//! 前端通过 `get_provider_presets` 拉取，避免前后端各维护一份导致漂移。

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderPreset {
    pub id: String,
    pub name: String,
    /// 完整的聊天补全地址
    pub endpoint: String,
    /// api | local
    pub source_type: String,
    /// 该服务商常用模型标识，用于前端下拉建议
    pub default_models: Vec<String>,
    /// 默认上下文窗口
    pub default_context_length: i64,
    pub docs_url: String,
}

fn preset(
    id: &str,
    name: &str,
    endpoint: &str,
    source_type: &str,
    default_models: &[&str],
    default_context_length: i64,
    docs_url: &str,
) -> ProviderPreset {
    ProviderPreset {
        id: id.to_string(),
        name: name.to_string(),
        endpoint: endpoint.to_string(),
        source_type: source_type.to_string(),
        default_models: default_models.iter().map(|m| m.to_string()).collect(),
        default_context_length,
        docs_url: docs_url.to_string(),
    }
}

pub fn all_presets() -> Vec<ProviderPreset> {
    vec![
        preset(
            "openai",
            "OpenAI",
            "https://api.openai.com/v1/chat/completions",
            "api",
            &["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "o3", "o4-mini"],
            128_000,
            "https://platform.openai.com/docs/api-reference",
        ),
        preset(
            "anthropic",
            "Anthropic",
            "https://api.anthropic.com/v1/messages",
            "api",
            &[
                "claude-opus-4-6",
                "claude-sonnet-4-6",
                "claude-haiku-4-5",
            ],
            200_000,
            "https://docs.anthropic.com/en/api/messages",
        ),
        preset(
            "zhipu",
            "智谱 AI（GLM）",
            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            "api",
            &[
                "glm-5.3",
                "glm-5.2",
                "glm-4.6",
                "glm-4.6v",
                "glm-4.5-air",
                "glm-4-flash",
            ],
            128_000,
            "https://docs.bigmodel.cn/cn/guide/develop/http/introduction",
        ),
        preset(
            "deepseek",
            "DeepSeek",
            "https://api.deepseek.com/v1/chat/completions",
            "api",
            &["deepseek-chat", "deepseek-reasoner"],
            64_000,
            "https://api-docs.deepseek.com",
        ),
        preset(
            "moonshot",
            "月之暗面",
            "https://api.moonshot.cn/v1/chat/completions",
            "api",
            &["kimi-k2", "moonshot-v1-128k", "moonshot-v1-32k"],
            128_000,
            "https://platform.moonshot.cn/docs/api/chat",
        ),
        preset(
            "ollama",
            "Ollama（本地）",
            "http://localhost:11434/api/chat",
            "local",
            &["qwen3", "llama3.1", "deepseek-r1", "glm4"],
            32_768,
            "https://github.com/ollama/ollama/blob/main/docs/api.md",
        ),
        preset(
            "custom",
            "自定义",
            "",
            "api",
            &[],
            4_096,
            "",
        ),
    ]
}

/// 按 id 查找预设，用于后端按服务商做差异化处理
pub fn find_preset(id: &str) -> Option<ProviderPreset> {
    all_presets().into_iter().find(|p| p.id == id)
}

#[tauri::command]
pub fn get_provider_presets() -> Vec<ProviderPreset> {
    all_presets()
}
