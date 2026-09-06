use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tracing::{info, warn, error, debug};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub stream: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<Choice>,
    pub usage: Option<Usage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Choice {
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamChunk {
    #[serde(default)]
    pub choices: Vec<StreamChoice>,
    #[serde(default)]
    pub usage: Option<serde_json::Value>,
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamChoice {
    #[serde(default)]
    pub delta: Delta,
    #[serde(default)]
    pub finish_reason: Option<String>,
    #[serde(default)]
    pub index: Option<u32>,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct Delta {
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamEvent {
    pub event_type: String,
    pub content: Option<String>,
    pub finish_reason: Option<String>,
}

pub struct LlmClient {
    client: Client,
}

impl LlmClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub async fn chat_completion(
        &self,
        endpoint: &str,
        api_key: Option<&str>,
        model: &str,
        messages: Vec<ChatMessage>,
        temperature: f64,
        max_tokens: u32,
    ) -> Result<ChatResponse, String> {
        let request = json!({
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": false,
        });

        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        if let Some(key) = api_key {
            headers.insert(
                "Authorization",
                format!("Bearer {}", key).parse().unwrap(),
            );
        }

        let response = self
            .client
            .post(endpoint)
            .headers(headers)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API 错误: {}", error_text));
        }

        let chat_response: ChatResponse = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        Ok(chat_response)
    }

    pub async fn chat_completion_stream(
        &self,
        endpoint: &str,
        api_key: Option<&str>,
        model: &str,
        messages: Vec<ChatMessage>,
        temperature: f64,
        max_tokens: u32,
    ) -> Result<reqwest::Response, String> {
        let request = json!({
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": true,
        });

        info!(
            "=== LLM Request ===\n\
             Endpoint: {}\n\
             Model: {}\n\
             Messages count: {}\n\
             Temperature: {}\n\
             Max tokens: {}\n\
             API key present: {}",
            endpoint,
            model,
            messages.len(),
            temperature,
            max_tokens,
            api_key.is_some()
        );
        debug!("Request body: {}", serde_json::to_string_pretty(&request).unwrap_or_default());

        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        if let Some(key) = api_key {
            headers.insert(
                "Authorization",
                format!("Bearer {}", key).parse().unwrap(),
            );
        }

        let response = self
            .client
            .post(endpoint)
            .headers(headers)
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                error!("Request failed: {}", e);
                format!("请求失败: {}", e)
            })?;

        let status = response.status();
        let headers = response.headers().clone();

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("API error {}: {}", status, error_text);
            return Err(format!("API 错误 ({}): {}", status, error_text));
        }

        // 记录响应头信息（调试用）
        info!(
            "=== LLM Response ===\n\
             Status: {}\n\
             Content-Type: {}\n\
             Transfer-Encoding: {}",
            status,
            headers.get("content-type").map(|v| v.to_str().unwrap_or("unknown")).unwrap_or("missing"),
            headers.get("transfer-encoding").map(|v| v.to_str().unwrap_or("unknown")).unwrap_or("missing"),
        );

        Ok(response)
    }
}

pub struct LlmState {
    pub client: Arc<LlmClient>,
}

impl LlmState {
    pub fn new() -> Self {
        Self {
            client: Arc::new(LlmClient::new()),
        }
    }
}

#[tauri::command]
pub async fn send_chat_request(
    endpoint: String,
    api_key: Option<String>,
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f64,
    max_tokens: u32,
    state: State<'_, LlmState>,
) -> Result<ChatResponse, String> {
    state
        .client
        .chat_completion(
            &endpoint,
            api_key.as_deref(),
            &model,
            messages,
            temperature,
            max_tokens,
        )
        .await
}

#[tauri::command]
pub async fn send_chat_request_stream(
    app: AppHandle,
    endpoint: String,
    api_key: Option<String>,
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f64,
    max_tokens: u32,
    request_id: String,
    state: State<'_, LlmState>,
) -> Result<(), String> {
    info!(
        "send_chat_request_stream called: request_id={} model={} endpoint={}",
        request_id, model, endpoint
    );

    let response = state
        .client
        .chat_completion_stream(
            &endpoint,
            api_key.as_deref(),
            &model,
            messages,
            temperature,
            max_tokens,
        )
        .await?;

    let mut stream = response.bytes_stream();
    let mut content_buffer = String::new();
    let mut buffer = String::new();
    let mut chunk_count = 0u32;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| {
            error!("Stream read error: {}", e);
            format!("读取流失败: {}", e)
        })?;
        let chunk_str = String::from_utf8_lossy(&chunk).to_string();
        buffer.push_str(&chunk_str);

        // 处理 SSE 格式
        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            // 处理 SSE 格式 (data: ...) 或 NDJSON 格式 (直接 JSON)
            let data = if line.starts_with("data:") {
                // 兼容 "data:" 和 "data: " 两种格式
                if line.starts_with("data: ") {
                    line[6..].trim().to_string()
                } else {
                    line[5..].trim().to_string()
                }
            } else {
                // NDJSON 格式，整行就是 JSON
                line.clone()
            };

            if data == "[DONE]" {
                info!("Stream [DONE] received, total chunks: {}", chunk_count);
                let _ = app.emit(
                    "chat-stream-chunk",
                    StreamEvent {
                        event_type: "done".to_string(),
                        content: None,
                        finish_reason: Some("stop".to_string()),
                    },
                );
                return Ok(());
            }

            // 跳过空数据
            if data.trim().is_empty() {
                continue;
            }

            // 尝试解析 JSON，失败时记录日志并跳过（不中断流）
            match serde_json::from_str::<StreamChunk>(&data) {
                Ok(chunk) => {
                    if chunk.choices.is_empty() {
                        // 没有 choices，可能是 usage 信息，跳过
                        debug!("Chunk without choices (likely usage): {}", &data[..data.len().min(200)]);
                        continue;
                    }
                    if let Some(choice) = chunk.choices.first() {
                        if let Some(content) = &choice.delta.content {
                            if !content.is_empty() {
                                chunk_count += 1;
                                content_buffer.push_str(content);
                                let _ = app.emit(
                                    "chat-stream-chunk",
                                    StreamEvent {
                                        event_type: "content".to_string(),
                                        content: Some(content.clone()),
                                        finish_reason: None,
                                    },
                                );
                            }
                        }
                        // 检查 finish_reason
                        if let Some(reason) = &choice.finish_reason {
                            info!("Chunk finish_reason: {} (total chunks: {})", reason, chunk_count);
                        }
                    }
                }
                Err(e) => {
                    warn!("SSE parse skipped: {} | data: {}", e, &data[..data.len().min(200)]);
                }
            }
        }
    }

    // 发送完成事件（流正常结束但未收到 [DONE]）
    info!("Stream ended without [DONE], total chunks: {}", chunk_count);
    let _ = app.emit(
        "chat-stream-chunk",
        StreamEvent {
            event_type: "done".to_string(),
            content: None,
            finish_reason: Some("stop".to_string()),
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn test_model_connection(
    endpoint: String,
    api_key: Option<String>,
    model: String,
    state: State<'_, LlmState>,
) -> Result<bool, String> {
    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Hello".to_string(),
    }];

    match state
        .client
        .chat_completion(&endpoint, api_key.as_deref(), &model, messages, 0.7, 10)
        .await
    {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
