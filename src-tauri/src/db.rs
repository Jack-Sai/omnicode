use rusqlite::{Connection, params};
use std::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, SaltString},
    Argon2, PasswordVerifier,
};

pub struct Database {
    pub conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub phone: String,
    pub display_name: String,
    pub created_at: String,
    pub last_login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserWithPassword {
    pub id: String,
    pub phone: String,
    pub password_hash: String,
    pub display_name: String,
    pub created_at: String,
    pub last_login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub phone: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub phone: String,
    pub password: String,
    pub display_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub user: Option<User>,
    pub token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub model_identifier: String,
    pub context_length: i64,
    pub temperature: f64,
    pub is_default: bool,
    pub status: String,
    pub source_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub reasoning: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Memory {
    pub id: String,
    pub user_id: String,
    pub content: String,
    pub memory_type: String,
    pub importance: f64,
    pub access_count: i64,
    pub created_at: String,
    pub last_accessed: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Plugin {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub plugin_type: String,
    pub version: String,
    pub enabled: bool,
    pub config: Option<String>,
    pub endpoint: Option<String>,
    pub method: Option<String>,
    pub schema: Option<String>,
    pub auth_config: Option<String>,
    pub installed_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub conversation_id: String,
    pub user_id: String,
    pub status: String,
    pub plan: Option<String>,
    pub result: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Step {
    pub id: String,
    pub task_id: String,
    pub tool_name: String,
    pub params: Option<String>,
    pub result: Option<String>,
    pub status: String,
    pub retry_count: i64,
    pub error_message: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(db_path)?;
        
        // 创建表
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                phone TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                api_key TEXT,
                model_identifier TEXT NOT NULL,
                context_length INTEGER DEFAULT 4096,
                temperature REAL DEFAULT 0.7,
                is_default BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'offline',
                source_type TEXT DEFAULT 'api',
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                reasoning TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );

            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                memory_type TEXT NOT NULL DEFAULT 'short',
                importance REAL DEFAULT 0.5,
                access_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                last_accessed TEXT,
                metadata TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS plugins (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                plugin_type TEXT NOT NULL DEFAULT 'tool',
                version TEXT DEFAULT '1.0.0',
                enabled BOOLEAN DEFAULT 1,
                config TEXT,
                endpoint TEXT,
                method TEXT,
                schema TEXT,
                auth_config TEXT,
                installed_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                plan TEXT,
                result TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS steps (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                params TEXT,
                result TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                retry_count INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            );
            "
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

// Tauri Commands

#[tauri::command]
pub fn get_models(state: State<'_, Database>) -> Result<Vec<Model>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, provider, endpoint, api_key, model_identifier, context_length, temperature, is_default, status, source_type FROM models")
        .map_err(|e| e.to_string())?;

    let models = stmt
        .query_map([], |row| {
            Ok(Model {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                endpoint: row.get(3)?,
                api_key: row.get(4)?,
                model_identifier: row.get(5)?,
                context_length: row.get(6)?,
                temperature: row.get(7)?,
                is_default: row.get(8)?,
                status: row.get(9)?,
                source_type: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(models)
}

#[tauri::command]
pub fn add_model(
    state: State<'_, Database>,
    model: Model,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO models (id, name, provider, endpoint, api_key, model_identifier, context_length, temperature, is_default, status, source_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            model.id,
            model.name,
            model.provider,
            model.endpoint,
            model.api_key,
            model.model_identifier,
            model.context_length,
            model.temperature,
            model.is_default,
            model.status,
            model.source_type,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_model(
    state: State<'_, Database>,
    id: String,
    model: Model,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE models SET name = ?1, provider = ?2, endpoint = ?3, api_key = ?4, model_identifier = ?5, context_length = ?6, temperature = ?7, is_default = ?8, status = ?9, source_type = ?10 WHERE id = ?11",
        params![
            model.name,
            model.provider,
            model.endpoint,
            model.api_key,
            model.model_identifier,
            model.context_length,
            model.temperature,
            model.is_default,
            model.status,
            model.source_type,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_model(state: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM models WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_conversations(state: State<'_, Database>) -> Result<Vec<Conversation>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let conversations = stmt
        .query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(conversations)
}

#[tauri::command]
pub fn add_conversation(
    state: State<'_, Database>,
    conversation: Conversation,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![
            conversation.id,
            conversation.title,
            conversation.created_at,
            conversation.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_conversation(
    state: State<'_, Database>,
    id: String,
    title: Option<String>,
    updated_at: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    if let Some(title) = title {
        conn.execute(
            "UPDATE conversations SET title = ?1 WHERE id = ?2",
            params![title, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    if let Some(updated_at) = updated_at {
        conn.execute(
            "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
            params![updated_at, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_conversation(state: State<'_, Database>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM messages WHERE conversation_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_messages(
    state: State<'_, Database>,
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, conversation_id, role, content, reasoning, created_at FROM messages WHERE conversation_id = ?1 ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let messages = stmt
        .query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                reasoning: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(messages)
}

#[tauri::command]
pub fn add_message(state: State<'_, Database>, message: Message) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, reasoning, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            message.id,
            message.conversation_id,
            message.role,
            message.content,
            message.reasoning,
            message.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// 用户认证相关命令

#[tauri::command]
pub fn register_user(
    state: State<'_, Database>,
    request: RegisterRequest,
) -> Result<AuthResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    // 检查手机号是否已存在
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE phone = ?1",
            params![request.phone],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?
        > 0;
    
    if exists {
        return Ok(AuthResponse {
            success: false,
            message: "该手机号已注册".to_string(),
            user: None,
            token: None,
        });
    }
    
    // 生成密码哈希
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(request.password.as_bytes(), &salt)
        .map_err(|e| format!("密码哈希失败: {}", e))?
        .to_string();
    
    // 创建用户
    let user_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO users (id, phone, password_hash, display_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![user_id, request.phone, password_hash, request.display_name, now],
    )
    .map_err(|e| e.to_string())?;
    
    // 生成会话 token
    let token = uuid::Uuid::new_v4().to_string();
    let expires_at = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();
    
    conn.execute(
        "INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![uuid::Uuid::new_v4().to_string(), user_id, token.clone(), now, expires_at],
    )
    .map_err(|e| e.to_string())?;
    
    let user = User {
        id: user_id,
        phone: request.phone,
        display_name: request.display_name,
        created_at: now,
        last_login: None,
    };
    
    Ok(AuthResponse {
        success: true,
        message: "注册成功".to_string(),
        user: Some(user),
        token: Some(token),
    })
}

#[tauri::command]
pub fn login_user(
    state: State<'_, Database>,
    request: LoginRequest,
) -> Result<AuthResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    // 查找用户
    let user_data: Option<UserWithPassword> = conn
        .query_row(
            "SELECT id, phone, password_hash, display_name, created_at, last_login FROM users WHERE phone = ?1",
            params![request.phone],
            |row| {
                Ok(UserWithPassword {
                    id: row.get(0)?,
                    phone: row.get(1)?,
                    password_hash: row.get(2)?,
                    display_name: row.get(3)?,
                    created_at: row.get(4)?,
                    last_login: row.get(5)?,
                })
            },
        )
        .ok();
    
    match user_data {
        Some(user_data) => {
            // 验证密码
            let parsed_hash = PasswordHash::new(&user_data.password_hash)
                .map_err(|e| format!("密码哈希解析失败: {}", e))?;
            
            let password_valid = Argon2::default()
                .verify_password(request.password.as_bytes(), &parsed_hash)
                .is_ok();
            
            if !password_valid {
                return Ok(AuthResponse {
                    success: false,
                    message: "密码错误".to_string(),
                    user: None,
                    token: None,
                });
            }
            
            // 更新最后登录时间
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE users SET last_login = ?1 WHERE id = ?2",
                params![now, user_data.id],
            )
            .map_err(|e| e.to_string())?;
            
            // 生成新 token
            let token = uuid::Uuid::new_v4().to_string();
            let expires_at = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();
            
            conn.execute(
                "INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![uuid::Uuid::new_v4().to_string(), user_data.id, token.clone(), now, expires_at],
            )
            .map_err(|e| e.to_string())?;
            
            let user = User {
                id: user_data.id,
                phone: user_data.phone,
                display_name: user_data.display_name,
                created_at: user_data.created_at,
                last_login: Some(now),
            };
            
            Ok(AuthResponse {
                success: true,
                message: "登录成功".to_string(),
                user: Some(user),
                token: Some(token),
            })
        }
        None => Ok(AuthResponse {
            success: false,
            message: "用户不存在".to_string(),
            user: None,
            token: None,
        }),
    }
}

#[tauri::command]
pub fn logout_user(
    state: State<'_, Database>,
    token: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE token = ?1", params![token])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn verify_token(
    state: State<'_, Database>,
    token: String,
) -> Result<Option<User>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    let session = conn
        .query_row(
            "SELECT user_id, expires_at FROM sessions WHERE token = ?1",
            params![token],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                ))
            },
        )
        .ok();
    
    match session {
        Some((user_id, expires_at)) => {
            // 检查是否过期
            if chrono::DateTime::parse_from_rfc3339(&expires_at)
                .map(|dt| dt < chrono::Utc::now())
                .unwrap_or(true)
            {
                // 删除过期 session
                conn.execute("DELETE FROM sessions WHERE token = ?1", params![token])
                    .map_err(|e| e.to_string())?;
                return Ok(None);
            }
            
            // 获取用户信息
            let user = conn
                .query_row(
                    "SELECT id, phone, display_name, created_at, last_login FROM users WHERE id = ?1",
                    params![user_id],
                    |row| {
                        Ok(User {
                            id: row.get(0)?,
                            phone: row.get(1)?,
                            display_name: row.get(2)?,
                            created_at: row.get(3)?,
                            last_login: row.get(4)?,
                        })
                    },
                )
                .ok();
            
            Ok(user)
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn get_current_user(
    state: State<'_, Database>,
    token: String,
) -> Result<Option<User>, String> {
    verify_token(state, token)
}

// 记忆系统命令

#[tauri::command]
pub fn add_memory(
    state: State<'_, Database>,
    memory: Memory,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO memories (id, user_id, content, memory_type, importance, access_count, created_at, last_accessed, metadata) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            memory.id,
            memory.user_id,
            memory.content,
            memory.memory_type,
            memory.importance,
            memory.access_count,
            memory.created_at,
            memory.last_accessed,
            memory.metadata,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_memories(
    state: State<'_, Database>,
    user_id: String,
    memory_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Memory>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    
    let mut query = String::from(
        "SELECT id, user_id, content, memory_type, importance, access_count, created_at, last_accessed, metadata FROM memories WHERE user_id = ?1"
    );
    
    if let Some(ref mt) = memory_type {
        query.push_str(&format!(" AND memory_type = '{}'", mt));
    }
    
    query.push_str(&format!(" ORDER BY importance DESC, created_at DESC LIMIT {}", limit));
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let memories = stmt
        .query_map(params![user_id], |row| {
            Ok(Memory {
                id: row.get(0)?,
                user_id: row.get(1)?,
                content: row.get(2)?,
                memory_type: row.get(3)?,
                importance: row.get(4)?,
                access_count: row.get(5)?,
                created_at: row.get(6)?,
                last_accessed: row.get(7)?,
                metadata: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(memories)
}

#[tauri::command]
pub fn update_memory(
    state: State<'_, Database>,
    id: String,
    content: Option<String>,
    importance: Option<f64>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    if let Some(content) = content {
        conn.execute(
            "UPDATE memories SET content = ?1 WHERE id = ?2",
            params![content, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    if let Some(importance) = importance {
        conn.execute(
            "UPDATE memories SET importance = ?1 WHERE id = ?2",
            params![importance, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    // 更新访问时间和次数
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE memories SET last_accessed = ?1, access_count = access_count + 1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_memory(
    state: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM memories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_memories(
    state: State<'_, Database>,
    user_id: String,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<Memory>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(10);
    
    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, content, memory_type, importance, access_count, created_at, last_accessed, metadata FROM memories WHERE user_id = ?1 AND content LIKE ?2 ORDER BY importance DESC LIMIT ?3"
        )
        .map_err(|e| e.to_string())?;
    
    let search_pattern = format!("%{}%", query);
    let memories = stmt
        .query_map(params![user_id, search_pattern, limit], |row| {
            Ok(Memory {
                id: row.get(0)?,
                user_id: row.get(1)?,
                content: row.get(2)?,
                memory_type: row.get(3)?,
                importance: row.get(4)?,
                access_count: row.get(5)?,
                created_at: row.get(6)?,
                last_accessed: row.get(7)?,
                metadata: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(memories)
}

// 插件系统命令

#[tauri::command]
pub fn add_plugin(
    state: State<'_, Database>,
    plugin: Plugin,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO plugins (id, user_id, name, description, plugin_type, version, enabled, config, endpoint, method, schema, auth_config, installed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            plugin.id,
            plugin.user_id,
            plugin.name,
            plugin.description,
            plugin.plugin_type,
            plugin.version,
            plugin.enabled,
            plugin.config,
            plugin.endpoint,
            plugin.method,
            plugin.schema,
            plugin.auth_config,
            plugin.installed_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_plugins(
    state: State<'_, Database>,
    user_id: String,
) -> Result<Vec<Plugin>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, name, description, plugin_type, version, enabled, config, endpoint, method, schema, auth_config, installed_at FROM plugins WHERE user_id = ?1 ORDER BY installed_at DESC"
        )
        .map_err(|e| e.to_string())?;
    
    let plugins = stmt
        .query_map(params![user_id], |row| {
            Ok(Plugin {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                plugin_type: row.get(4)?,
                version: row.get(5)?,
                enabled: row.get(6)?,
                config: row.get(7)?,
                endpoint: row.get(8)?,
                method: row.get(9)?,
                schema: row.get(10)?,
                auth_config: row.get(11)?,
                installed_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(plugins)
}

#[tauri::command]
pub fn update_plugin(
    state: State<'_, Database>,
    id: String,
    enabled: Option<bool>,
    config: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    
    if let Some(enabled) = enabled {
        conn.execute(
            "UPDATE plugins SET enabled = ?1 WHERE id = ?2",
            params![enabled, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    if let Some(config) = config {
        conn.execute(
            "UPDATE plugins SET config = ?1 WHERE id = ?2",
            params![config, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_plugin(
    state: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM plugins WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// 任务系统命令

#[tauri::command]
pub fn create_task(
    state: State<'_, Database>,
    task: Task,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO tasks (id, conversation_id, user_id, status, plan, result, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            task.id,
            task.conversation_id,
            task.user_id,
            task.status,
            task.plan,
            task.result,
            task.created_at,
            task.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_task(
    state: State<'_, Database>,
    id: String,
    status: Option<String>,
    plan: Option<String>,
    result: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    
    if let Some(status) = status {
        conn.execute(
            "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    if let Some(plan) = plan {
        conn.execute(
            "UPDATE tasks SET plan = ?1 WHERE id = ?2",
            params![plan, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    if let Some(result) = result {
        conn.execute(
            "UPDATE tasks SET result = ?1 WHERE id = ?2",
            params![result, id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn get_tasks(
    state: State<'_, Database>,
    conversation_id: String,
) -> Result<Vec<Task>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, user_id, status, plan, result, created_at, updated_at FROM tasks WHERE conversation_id = ?1 ORDER BY created_at DESC"
        )
        .map_err(|e| e.to_string())?;
    
    let tasks = stmt
        .query_map(params![conversation_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                user_id: row.get(2)?,
                status: row.get(3)?,
                plan: row.get(4)?,
                result: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(tasks)
}
