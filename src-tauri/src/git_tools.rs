use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub is_clean: bool,
    pub staged: Vec<GitFile>,
    pub modified: Vec<GitFile>,
    pub untracked: Vec<GitFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

// 执行 Git 命令的辅助函数
fn run_git_command(path: &str, args: &[&str]) -> Result<(bool, String), String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .map_err(|e| format!("执行 git 命令失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok((true, stdout))
    } else {
        Ok((false, stderr))
    }
}

// 获取 Git 状态
#[tauri::command]
pub fn git_status(path: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    // 获取当前分支
    let (success, branch_output) = run_git_command(path.to_str().unwrap(), &["branch", "--show-current"])?;
    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("获取分支失败: {}", branch_output),
            data: None,
        });
    }
    let branch = branch_output.trim().to_string();

    // 获取状态
    let (success, status_output) = run_git_command(path.to_str().unwrap(), &["status", "--porcelain"])?;
    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("获取状态失败: {}", status_output),
            data: None,
        });
    }

    let mut staged = Vec::new();
    let mut modified = Vec::new();
    let mut untracked = Vec::new();

    for line in status_output.lines() {
        if line.is_empty() {
            continue;
        }

        let status = line[..2].trim().to_string();
        let file_path = line[3..].to_string();

        let git_file = GitFile {
            path: file_path,
            status: status.clone(),
        };

        if status.starts_with('M') || status.starts_with('A') || status.starts_with('D') {
            staged.push(git_file);
        } else if status.starts_with('?') {
            untracked.push(git_file);
        }
    }

    let git_status = GitStatus {
        branch,
        is_clean: staged.is_empty() && modified.is_empty() && untracked.is_empty(),
        staged,
        modified,
        untracked,
    };

    Ok(ToolResult {
        success: true,
        message: "获取 Git 状态成功".to_string(),
        data: Some(serde_json::json!(git_status)),
    })
}

// 获取 Git 日志
#[tauri::command]
pub fn git_log(path: String, limit: Option<i64>) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let limit = limit.unwrap_or(10);
    let format = "%H|%s|%an|%ai";

    let (success, output) = run_git_command(
        path.to_str().unwrap(),
        &["log", &format!("--max-count={}", limit), &format!("--format={}", format)],
    )?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("获取日志失败: {}", output),
            data: None,
        });
    }

    let commits: Vec<GitCommit> = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() == 4 {
                Some(GitCommit {
                    hash: parts[0].to_string(),
                    message: parts[1].to_string(),
                    author: parts[2].to_string(),
                    date: parts[3].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(ToolResult {
        success: true,
        message: format!("获取到 {} 条提交记录", commits.len()),
        data: Some(serde_json::json!(commits)),
    })
}

// 获取 Git Diff
#[tauri::command]
pub fn git_diff(path: String, file_path: Option<String>) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let mut args = vec!["diff"];
    if let Some(ref file) = file_path {
        args.push(file);
    }

    let (success, output) = run_git_command(path.to_str().unwrap(), &args)?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("获取 diff 失败: {}", output),
            data: None,
        });
    }

    Ok(ToolResult {
        success: true,
        message: "获取 diff 成功".to_string(),
        data: Some(serde_json::json!({
            "diff": output,
            "file": file_path,
        })),
    })
}

// Git Commit
#[tauri::command]
pub fn git_commit(path: String, message: String, files: Option<Vec<String>>) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    // 如果指定了文件，先 add
    if let Some(file_list) = files {
        for file in &file_list {
            let (success, output) = run_git_command(path.to_str().unwrap(), &["add", file])?;
            if !success {
                return Ok(ToolResult {
                    success: false,
                    message: format!("添加文件失败: {}", output),
                    data: None,
                });
            }
        }
    } else {
        // 否则 add 所有
        let (success, output) = run_git_command(path.to_str().unwrap(), &["add", "."])?;
        if !success {
            return Ok(ToolResult {
                success: false,
                message: format!("添加文件失败: {}", output),
                data: None,
            });
        }
    }

    // Commit
    let (success, output) = run_git_command(path.to_str().unwrap(), &["commit", "-m", &message])?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("提交失败: {}", output),
            data: None,
        });
    }

    Ok(ToolResult {
        success: true,
        message: "提交成功".to_string(),
        data: Some(serde_json::json!({
            "message": message,
            "output": output,
        })),
    })
}

// Git Push
#[tauri::command]
pub fn git_push(path: String, remote: Option<String>, branch: Option<String>) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let remote = remote.unwrap_or_else(|| "origin".to_string());
    let branch = branch.unwrap_or_else(|| "main".to_string());

    let (success, output) = run_git_command(path.to_str().unwrap(), &["push", &remote, &branch])?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("推送失败: {}", output),
            data: None,
        });
    }

    Ok(ToolResult {
        success: true,
        message: format!("推送到 {}/{} 成功", remote, branch),
        data: Some(serde_json::json!({
            "remote": remote,
            "branch": branch,
        })),
    })
}

// Git Pull
#[tauri::command]
pub fn git_pull(path: String, remote: Option<String>, branch: Option<String>) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let remote = remote.unwrap_or_else(|| "origin".to_string());
    let branch = branch.unwrap_or_else(|| "main".to_string());

    let (success, output) = run_git_command(path.to_str().unwrap(), &["pull", &remote, &branch])?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("拉取失败: {}", output),
            data: None,
        });
    }

    Ok(ToolResult {
        success: true,
        message: format!("从 {}/{} 拉取成功", remote, branch),
        data: Some(serde_json::json!({
            "remote": remote,
            "branch": branch,
            "output": output,
        })),
    })
}

// Git Create Branch
#[tauri::command]
pub fn git_create_branch(path: String, branch_name: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let (success, output) = run_git_command(path.to_str().unwrap(), &["checkout", "-b", &branch_name])?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("创建分支失败: {}", output),
            data: None,
        });
    }

    Ok(ToolResult {
        success: true,
        message: format!("创建并切换到分支: {}", branch_name),
        data: Some(serde_json::json!({
            "branch": branch_name,
        })),
    })
}

// Git Checkout
#[tauri::command]
pub fn git_checkout(path: String, branch_name: String) -> Result<ToolResult, String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Ok(ToolResult {
            success: false,
            message: format!("路径不存在: {}", path.display()),
            data: None,
        });
    }

    let (success, output) = run_git_command(path.to_str().unwrap(), &["checkout", &branch_name])?;

    if !success {
        return Ok(ToolResult {
            success: false,
            message: format!("切换分支失败: {}", output),
            data: None,
        });
    }

    Ok(ToolResult {
        success: true,
        message: format!("切换到分支: {}", branch_name),
        data: Some(serde_json::json!({
            "branch": branch_name,
        })),
    })
}
