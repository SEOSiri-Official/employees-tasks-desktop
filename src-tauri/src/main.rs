#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use serde::{Deserialize, Serialize};

#[tauri::command]
fn get_portal_url() -> String {
    "https://board.seosiri.com".to_string()
}

#[tauri::command]
fn get_key_issuer_url() -> String {
    "https://developers.seosiri.com/#key-issuer".to_string()
}

#[tauri::command]
fn update_tray_status(app_handle: tauri::AppHandle, urgent: usize, progress: usize) {
    if let Some(tray) = app_handle.tray_by_id("main_tray") {
        let tooltip_msg = format!("SEOSiri Task Sentinel\n● Urgent: {}\n● In Flight: {}", urgent, progress);
        let _ = tray.set_tooltip(Some(tooltip_msg));
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // Native Context Menu
            let title_item = MenuItem::with_id(&handle, "title", "SEOSiri Task Sentinel (v2.1.0)", false, None::<&str>)?;
            let sep1 = tauri::menu::PredefinedMenuItem::separator(&handle)?;
            let board_item = MenuItem::with_id(&handle, "open_board", "🌐 Open Command Board (board.seosiri.com)", true, None::<&str>)?;
            let issuer_item = MenuItem::with_id(&handle, "open_issuer", "🔑 Open API Key Issuer Desk", true, None::<&str>)?;
            let sep2 = tauri::menu::PredefinedMenuItem::separator(&handle)?;
            let quit_item = MenuItem::with_id(&handle, "quit", "❌ Exit Sentinel Daemon", true, None::<&str>)?;

            let menu = Menu::with_items(&handle, &[
                &title_item,
                &sep1,
                &board_item,
                &issuer_item,
                &sep2,
                &quit_item,
            ])?;

            let mut tray_builder = TrayIconBuilder::with_id("main_tray")
                .menu(&menu)
                .tooltip("SEOSiri Enterprise Task Sentinel (v2.1.0)");

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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_portal_url, get_key_issuer_url, update_tray_status])
        .run(tauri::generate_context!())
        .expect("error while running SEOSiri Task Sentinel");
}
