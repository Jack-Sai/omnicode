use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

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
    pub choices: Vec<StreamChoice>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamChoice {
    pub delta: Delta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Delta {
    pub role: Option<String>,
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

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("读取流失败: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk).to_string();
        buffer.push_str(&chunk_str);

        // 处理 SSE 格式
        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            if line.starts_with("data: ") {
                let data = &line[6..];

                if data == "[DONE]" {
                    // 流结束
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

                if let Ok(chunk) = serde_json::from_str::<StreamChunk>(data) {
                    if let Some(choice) = chunk.choices.first() {
                        if let Some(content) = &choice.delta.content {
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
                }
            }
        }
    }

    // 发送完成事件
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
