mod db;
mod llm;
mod tools;
mod git_tools;
mod exec_tools;

use db::Database;
use llm::LlmState;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化数据库
    let db_path = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("omni-code")
        .join("omni-code.db");

    // 确保目录存在
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let database = Database::new(db_path.to_str().unwrap()).expect("Failed to initialize database");
    let db_state = Arc::new(database);
    let llm_state = LlmState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_state)
        .manage(llm_state)
        .invoke_handler(tauri::generate_handler![
            // 用户认证
            db::register_user,
            db::login_user,
            db::logout_user,
            db::verify_token,
            db::get_current_user,
            // 模型管理
            db::get_models,
            db::add_model,
            db::update_model,
            db::delete_model,
            // 对话管理
            db::get_conversations,
            db::add_conversation,
            db::update_conversation,
            db::delete_conversation,
            // 消息管理
            db::get_messages,
            db::add_message,
            // LLM 调用
            llm::send_chat_request,
            llm::send_chat_request_stream,
            llm::test_model_connection,
            // 文件工具
            tools::read_file,
            tools::write_file,
            tools::delete_file,
            tools::move_file,
            tools::create_directory,
            tools::list_directory,
            tools::search_files,
            tools::get_file_info,
            // 记忆系统
            db::add_memory,
            db::get_memories,
            db::update_memory,
            db::delete_memory,
            db::search_memories,
            // 插件系统
            db::add_plugin,
            db::get_plugins,
            db::update_plugin,
            db::delete_plugin,
            // 任务系统
            db::create_task,
            db::update_task,
            db::get_tasks,
            // Git 工具
            git_tools::git_status,
            git_tools::git_log,
            git_tools::git_diff,
            git_tools::git_commit,
            git_tools::git_push,
            git_tools::git_pull,
            git_tools::git_create_branch,
            git_tools::git_checkout,
            // 代码执行工具
            exec_tools::execute_python,
            exec_tools::execute_shell,
            exec_tools::execute_npm,
            exec_tools::execute_cargo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
