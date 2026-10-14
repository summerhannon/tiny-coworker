use tauri::{Emitter, Manager};

/// Shows or hides the Dock icon (and the app in the app switcher). macOS only.
#[tauri::command]
fn set_dock_visible(app: tauri::AppHandle, visible: bool) {
  #[cfg(target_os = "macos")]
  {
    let policy = if visible {
      tauri::ActivationPolicy::Regular
    } else {
      tauri::ActivationPolicy::Accessory
    };
    let _ = app.set_activation_policy(policy);
  }
  #[cfg(not(target_os = "macos"))]
  let _ = (app, visible);
}

/// Quits the app (from the menu bar's Quit item).
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
  app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![set_dock_visible, quit_app])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      // Clicking the Dock icon brings a hidden buddy back.
      if let tauri::RunEvent::Reopen { .. } = event {
        if let Some(w) = app.get_webview_window("main") {
          let _ = w.show();
          let _ = w.set_focus();
          let _ = app.emit("buddy-shown", ());
        }
      }
    });
}
