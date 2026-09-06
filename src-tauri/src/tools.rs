use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_file: bool,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

// 读取文件
#[tauri::command]
pub fn read_file(path: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("文件不存在: {}", path.display()),
            data: None,
        });
    }
    
    match std::fs::read_to_string(path) {
        Ok(content) => Ok(ToolResult {
            success: true,
            message: "文件读取成功".to_string(),
            data: Some(serde_json::json!({
                "content": content,
                "path": path.display().to_string(),
            })),
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            message: format!("读取文件失败: {}", e),
            data: None,
        }),
    }
}

// 写入文件
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    
    // 确保父目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return Ok(ToolResult {
                    success: false,
                    message: format!("创建目录失败: {}", e),
                    data: None,
                });
            }
        }
    }
    
    match std::fs::write(path, &content) {
        Ok(_) => Ok(ToolResult {
            success: true,
            message: "文件写入成功".to_string(),
            data: Some(serde_json::json!({
                "path": path.display().to_string(),
                "bytes_written": content.len(),
            })),
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            message: format!("写入文件失败: {}", e),
            data: None,
        }),
    }
}

// 删除文件
#[tauri::command]
pub fn delete_file(path: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("文件不存在: {}", path.display()),
            data: None,
        });
    }
    
    if path.is_dir() {
        match std::fs::remove_dir_all(path) {
            Ok(_) => Ok(ToolResult {
                success: true,
                message: "目录删除成功".to_string(),
                data: Some(serde_json::json!({
                    "path": path.display().to_string(),
                    "type": "directory",
                })),
            }),
            Err(e) => Ok(ToolResult {
                success: false,
                message: format!("删除目录失败: {}", e),
                data: None,
            }),
        }
    } else {
        match std::fs::remove_file(path) {
            Ok(_) => Ok(ToolResult {
                success: true,
                message: "文件删除成功".to_string(),
                data: Some(serde_json::json!({
                    "path": path.display().to_string(),
                    "type": "file",
                })),
            }),
            Err(e) => Ok(ToolResult {
                success: false,
                message: format!("删除文件失败: {}", e),
                data: None,
            }),
        }
    }
}

// 移动/重命名文件
#[tauri::command]
pub fn move_file(source: String, destination: String) -> Result<ToolResult, String> {
    let source = Path::new(&source);
    let destination = Path::new(&destination);
    
    if !source.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("源文件不存在: {}", source.display()),
            data: None,
        });
    }
    
    // 确保目标父目录存在
    if let Some(parent) = destination.parent() {
        if !parent.exists() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return Ok(ToolResult {
                    success: false,
                    message: format!("创建目录失败: {}", e),
                    data: None,
                });
            }
        }
    }
    
    match std::fs::rename(source, destination) {
        Ok(_) => Ok(ToolResult {
            success: true,
            message: "文件移动成功".to_string(),
            data: Some(serde_json::json!({
                "source": source.display().to_string(),
                "destination": destination.display().to_string(),
            })),
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            message: format!("移动文件失败: {}", e),
            data: None,
        }),
    }
}

// 创建目录
#[tauri::command]
pub fn create_directory(path: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    
    match std::fs::create_dir_all(path) {
        Ok(_) => Ok(ToolResult {
            success: true,
            message: "目录创建成功".to_string(),
            data: Some(serde_json::json!({
                "path": path.display().to_string(),
            })),
        }),
        Err(e) => Ok(ToolResult {
            success: false,
            message: format!("创建目录失败: {}", e),
            data: None,
        }),
    }
}

// 列出目录内容
#[tauri::command]
pub fn list_directory(path: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("目录不存在: {}", path.display()),
            data: None,
        });
    }
    
    if !path.is_dir() {
        return Ok(ToolResult {
            success: false,
            message: format!("不是目录: {}", path.display()),
            data: None,
        });
    }
    
    let mut files = Vec::new();
    
    match std::fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let metadata = entry.metadata().ok();
                let file_info = FileInfo {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: entry.path().display().to_string(),
                    is_file: metadata.as_ref().map(|m| m.is_file()).unwrap_or(false),
                    is_dir: metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                    size: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                    modified: metadata
                        .and_then(|m| m.modified().ok())
                        .map(|t| {
                            let datetime: chrono::DateTime<chrono::Utc> = t.into();
                            datetime.to_rfc3339()
                        }),
                };
                files.push(file_info);
            }
            
            // 按类型和名称排序
            files.sort_by(|a, b| {
                if a.is_dir != b.is_dir {
                    return b.is_dir.cmp(&a.is_dir);
                }
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            });
            
            Ok(ToolResult {
                success: true,
                message: "目录列表获取成功".to_string(),
                data: Some(serde_json::json!({
                    "path": path.display().to_string(),
                    "files": files,
                })),
            })
        }
        Err(e) => Ok(ToolResult {
            success: false,
            message: format!("读取目录失败: {}", e),
            data: None,
        }),
    }
}

// 搜索文件
#[tauri::command]
pub fn search_files(path: String, pattern: String, max_results: Option<usize>) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    let max = max_results.unwrap_or(100);
    
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("目录不存在: {}", path.display()),
            data: None,
        });
    }
    
    let mut results = Vec::new();
    let pattern_lower = pattern.to_lowercase();
    
    for entry in WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| !e.file_name().to_string_lossy().starts_with('.'))
    {
        if results.len() >= max {
            break;
        }
        
        let name = entry.file_name().to_string_lossy().to_string();
        if name.to_lowercase().contains(&pattern_lower) {
            let metadata = entry.metadata().ok();
            results.push(FileInfo {
                name,
                path: entry.path().display().to_string(),
                is_file: metadata.as_ref().map(|m| m.is_file()).unwrap_or(false),
                is_dir: metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                size: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                modified: metadata
                    .and_then(|m| m.modified().ok())
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Utc> = t.into();
                        datetime.to_rfc3339()
                    }),
            });
        }
    }
    
    Ok(ToolResult {
        success: true,
        message: format!("找到 {} 个结果", results.len()),
        data: Some(serde_json::json!({
            "pattern": pattern,
            "results": results,
        })),
    })
}

// 获取文件信息
#[tauri::command]
pub fn get_file_info(path: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("文件不存在: {}", path.display()),
            data: None,
        });
    }
    
    match std::fs::metadata(path) {
        Ok(metadata) => {
            let file_info = FileInfo {
                name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                path: path.display().to_string(),
                is_file: metadata.is_file(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                modified: metadata
                    .modified()
                    .ok()
                    .map(|t| {
                        let datetime: chrono::DateTime<chrono::Utc> = t.into();
                        datetime.to_rfc3339()
                    }),
            };
            
            Ok(ToolResult {
                success: true,
                message: "文件信息获取成功".to_string(),
                data: Some(serde_json::json!(file_info)),
            })
        }
        Err(e) => Ok(ToolResult {
            success: false,
            message: format!("获取文件信息失败: {}", e),
            data: None,
        }),
    }
}
