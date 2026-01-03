#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    });

  #[cfg(target_os = "linux")]
  {
    builder = builder.plugin(tauri_plugin_mpris::init());
  }

  builder.run(tauri::generate_context!())
    .expect("error while running tauri application");
}
