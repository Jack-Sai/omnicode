use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
}

// 执行 Python 脚本
#[tauri::command]
pub fn execute_python(
    path: String,
    script: String,
    args: Option<Vec<String>>,
    timeout_secs: Option<u64>,
) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let timeout = timeout_secs.unwrap_or(60);
    
    // 创建临时 Python 文件
    let temp_file = path.join("_temp_script.py");
    std::fs::write(&temp_file, &script)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;

    let start = std::time::Instant::now();
    
    let mut cmd = Command::new("python");
    cmd.arg(temp_file.to_str().unwrap());
    cmd.current_dir(path);
    
    if let Some(script_args) = args {
        for arg in script_args {
            cmd.arg(arg);
        }
    }

    let output = cmd
        .output()
        .map_err(|e| format!("执行 Python 脚本失败: {}", e))?;

    let duration = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    // 清理临时文件
    let _ = std::fs::remove_file(&temp_file);

    let result = ExecutionResult {
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        exit_code,
        duration_ms: duration,
    };

    if exit_code == 0 {
        Ok(ToolResult {
            success: true,
            message: "Python 脚本执行成功".to_string(),
            data: Some(serde_json::json!(result)),
        })
    } else {
        Ok(ToolResult {
            success: false,
            message: format!("Python 脚本执行失败，退出码: {}", exit_code),
            data: Some(serde_json::json!(result)),
        })
    }
}

// 执行 Shell 命令
#[tauri::command]
pub fn execute_shell(
    path: String,
    command: String,
    timeout_secs: Option<u64>,
) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let timeout = timeout_secs.unwrap_or(60);
    
    let start = std::time::Instant::now();
    
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .current_dir(path)
            .output()
            .map_err(|e| format!("执行命令失败: {}", e))?
    } else {
        Command::new("sh")
            .args(["-c", &command])
            .current_dir(path)
            .output()
            .map_err(|e| format!("执行命令失败: {}", e))?
    };

    let duration = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    let result = ExecutionResult {
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        exit_code,
        duration_ms: duration,
    };

    if exit_code == 0 {
        Ok(ToolResult {
            success: true,
            message: "命令执行成功".to_string(),
            data: Some(serde_json::json!(result)),
        })
    } else {
        Ok(ToolResult {
            success: false,
            message: format!("命令执行失败，退出码: {}", exit_code),
            data: Some(serde_json::json!(result)),
        })
    }
}

// 执行 npm 命令
#[tauri::command]
pub fn execute_npm(
    path: String,
    command: String,
    args: Option<Vec<String>>,
    timeout_secs: Option<u64>,
) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let timeout = timeout_secs.unwrap_or(120);
    
    let start = std::time::Instant::now();
    
    let mut cmd = Command::new("npm");
    cmd.arg(&command);
    cmd.current_dir(path);
    
    if let Some(npm_args) = args {
        for arg in npm_args {
            cmd.arg(arg);
        }
    }

    let output = cmd
        .output()
        .map_err(|e| format!("执行 npm 命令失败: {}", e))?;

    let duration = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    let result = ExecutionResult {
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        exit_code,
        duration_ms: duration,
    };

    if exit_code == 0 {
        Ok(ToolResult {
            success: true,
            message: format!("npm {} 执行成功", command),
            data: Some(serde_json::json!(result)),
        })
    } else {
        Ok(ToolResult {
            success: false,
            message: format!("npm {} 执行失败，退出码: {}", command, exit_code),
            data: Some(serde_json::json!(result)),
        })
    }
}

// 执行 cargo 命令
#[tauri::command]
pub fn execute_cargo(
    path: String,
    command: String,
    args: Option<Vec<String>>,
    timeout_secs: Option<u64>,
) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let timeout = timeout_secs.unwrap_or(180);
    
    let start = std::time::Instant::now();
    
    let mut cmd = Command::new("cargo");
    cmd.arg(&command);
    cmd.current_dir(path);
    
    if let Some(cargo_args) = args {
        for arg in cargo_args {
            cmd.arg(arg);
        }
    }

    let output = cmd
        .output()
        .map_err(|e| format!("执行 cargo 命令失败: {}", e))?;

    let duration = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    let result = ExecutionResult {
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        exit_code,
        duration_ms: duration,
    };

    if exit_code == 0 {
        Ok(ToolResult {
            success: true,
            message: format!("cargo {} 执行成功", command),
            data: Some(serde_json::json!(result)),
        })
    } else {
        Ok(ToolResult {
            success: false,
            message: format!("cargo {} 执行失败，退出码: {}", command, exit_code),
            data: Some(serde_json::json!(result)),
        })
    }
}
