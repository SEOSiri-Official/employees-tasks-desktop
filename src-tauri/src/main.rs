#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskStats {
    pub total: usize,
    pub urgent: usize,
    pub in_progress: usize,
    pub pending: usize,
    pub completed: usize,
}

#[tauri::command]
fn get_portal_url() -> String {
    "https://board.seosiri.com".to_string()
}

#[tauri::command]
fn get_key_issuer_url() -> String {
    "https://developers.seosiri.com/#key-issuer".to_string()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // 1. Build Native Context Menu
            let title_item = MenuItem::with_id(&handle, "title", "SEOSiri Task Sentinel (v2.0.0)", false, None::<&str>)?;
            let sep1 = tauri::menu::PredefinedMenuItem::separator(&handle)?;
            let status_item = MenuItem::with_id(&handle, "status", "● Status: Initializing...", false, None::<&str>)?;
            let sep2 = tauri::menu::PredefinedMenuItem::separator(&handle)?;
            let board_item = MenuItem::with_id(&handle, "open_board", "🌐 Open Command Board (board.seosiri.com)", true, None::<&str>)?;
            let issuer_item = MenuItem::with_id(&handle, "open_issuer", "🔑 Open API Key Issuer Desk", true, None::<&str>)?;
            let sep3 = tauri::menu::PredefinedMenuItem::separator(&handle)?;
            let quit_item = MenuItem::with_id(&handle, "quit", "❌ Exit Sentinel Daemon", true, None::<&str>)?;

            let menu = Menu::with_items(&handle, &[
                &title_item,
                &sep1,
                &status_item,
                &sep2,
                &board_item,
                &issuer_item,
                &sep3,
                &quit_item,
            ])?;

            // 2. Initialize Native System Tray with Default Icon
            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("SEOSiri Enterprise Task Sentinel");

            if let Some(default_icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(default_icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "open_board" => {
                            let _ = open::that("https://board.seosiri.com");
                        }
                        "open_issuer" => {
                            let _ = open::that("https://developers.seosiri.com/#key-issuer");
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // 3. Background Async Worker: Polls tasks.seosiri.com every 15s (<15MB RAM)
            let background_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                loop {
                    if let Ok(res) = client
                        .get("https://tasks.seosiri.com/v1/tasks")
                        .header("X-Employee-ID", "ETMAGJUMR62")
                        .send()
                        .await
                    {
                        if let Ok(json) = res.json::<serde_json::Value>().await {
                            if let Some(tasks) = json.get("tasks").and_then(|t| t.as_array()) {
                                let urgent = tasks.iter().filter(|t| t["status"] == "URGENT").count();
                                let progress = tasks.iter().filter(|t| t["status"] == "PROGRESS").count();
                                
                                let _ = background_handle.emit(
                                    "telemetry_update",
                                    serde_json::json!({
                                        "total": tasks.len(),
                                        "urgent": urgent,
                                        "progress": progress,
                                        "timestamp": chrono::Utc::now().to_rfc3339()
                                    }),
                                );
                            }
                        }
                    }
                    tokio::time::sleep(Duration::from_secs(15)).await;
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_portal_url, get_key_issuer_url])
        .run(tauri::generate_context!())
        .expect("error while running SEOSiri Task Sentinel");
}
