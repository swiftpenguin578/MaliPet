#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod engine;
use engine::{Bounds, Pet};
use std::{
    sync::Mutex,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

struct Runtime {
    pet: Pet,
    mask: Vec<u8>,
    ready: bool,
}
struct Shared(Mutex<Runtime>);

#[cfg(target_os = "macos")]
fn mouse_down() -> bool {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceButtonState(state_id: i32, button: u32) -> bool;
    }
    unsafe { CGEventSourceButtonState(0, 0) }
}
#[cfg(target_os = "windows")]
fn mouse_down() -> bool {
    unsafe { windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState(1) < 0 }
}
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn mouse_down() -> bool {
    false
}

fn bounds(m: &tauri::Monitor) -> Bounds {
    let a = m.work_area();
    Bounds {
        left: a.position.x as f64,
        top: a.position.y as f64,
        right: a.position.x as f64 + a.size.width as f64,
        bottom: a.position.y as f64 + a.size.height as f64,
    }
}
fn menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let paused = app.state::<Shared>().0.lock().unwrap().pet.frame.paused;
    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(
                app,
                "pause",
                if paused { "Resume" } else { "Pause" },
                true,
                None::<&str>,
            )?,
            &MenuItem::with_id(app, "home", "Bring Mali to this screen", true, None::<&str>)?,
            &MenuItem::with_id(app, "quit", "Quit MaliPet", true, None::<&str>)?,
        ],
    )
}
#[tauri::command]
fn ready(window: tauri::WebviewWindow, state: tauri::State<Shared>) -> Result<(), String> {
    let (x, y) = {
        let mut s = state.0.lock().unwrap();
        s.ready = true;
        (s.pet.x, s.pet.y)
    };
    window
        .set_position(tauri::PhysicalPosition::new(x as i32, y as i32))
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())
}
#[tauri::command]
fn hit_mask(mask: Vec<u8>, state: tauri::State<Shared>) -> Result<(), String> {
    if mask.len() != 70 * 55 {
        return Err("Invalid hit mask size".into());
    }
    state.0.lock().unwrap().mask = mask;
    Ok(())
}
#[tauri::command]
fn press(window: tauri::WebviewWindow, state: tauri::State<Shared>) -> Result<(), String> {
    let c = window.cursor_position().map_err(|e| e.to_string())?;
    state.0.lock().unwrap().pet.press((c.x, c.y));
    Ok(())
}
#[tauri::command]
fn release(state: tauri::State<Shared>) {
    state.0.lock().unwrap().pet.release();
}
#[tauri::command]
fn context_menu(window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<(), String> {
    let menu = menu(&app).map_err(|e| e.to_string())?;
    window.popup_menu(&menu).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ready,
            hit_mask,
            press,
            release,
            context_menu
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = app.get_webview_window("pet").unwrap();
            window.set_ignore_cursor_events(true)?;
            let monitor = window.primary_monitor()?.ok_or("No display available")?;
            let size = window.inner_size()?;
            let seed = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos() as u64;
            app.manage(Shared(Mutex::new(Runtime {
                pet: Pet::new(
                    bounds(&monitor),
                    size.width as f64,
                    size.height as f64,
                    window.scale_factor()?,
                    seed,
                ),
                mask: vec![0; 70 * 55],
                ready: false,
            })));
            // A small native tray/menu-bar affordance remains available even while paused.
            let mut rgba = vec![0u8; 32 * 32 * 4];
            for y in 5..28 {
                for x in 5..27 {
                    let head = (x as i32 - 16).pow(2) + (y as i32 - 18).pow(2) < 110;
                    let ears =
                        y < 14 && ((x < 13 && x >= y / 2 + 2) || (x > 19 && x <= 29 - y / 2));
                    if head || ears {
                        let i = (y * 32 + x) * 4;
                        rgba[i..i + 4].copy_from_slice(&[40, 40, 44, 255]);
                    }
                }
            }
            TrayIconBuilder::with_id("mali")
                .icon(tauri::image::Image::new_owned(rgba, 32, 32))
                .icon_as_template(true)
                .tooltip("MaliPet — click to pet, drag to move")
                .menu(&menu(app.handle())?)
                .show_menu_on_left_click(true)
                .build(app)?;
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last = Instant::now();
                let mut ignored = true;
                let mut monitor_refresh = Instant::now();
                let mut monitors = window.available_monitors().unwrap_or_default();
                loop {
                    std::thread::sleep(Duration::from_millis(33));
                    let now = Instant::now();
                    let dt = now.duration_since(last).as_secs_f64();
                    last = now;
                    let Ok(cursor) = window.cursor_position() else {
                        continue;
                    };
                    if monitor_refresh.elapsed() > Duration::from_secs(2) {
                        monitors = window
                            .available_monitors()
                            .unwrap_or_else(|_| monitors.clone());
                        monitor_refresh = now;
                    }
                    let Ok(size) = window.inner_size() else { break };
                    let scale = window.scale_factor().unwrap_or(1.0);
                    let (frame, x, y, ignore, ready) = {
                        let state = handle.state::<Shared>();
                        let mut s = state.0.lock().unwrap();
                        // During drag, follow the pointer's display; otherwise use the cat's center.
                        let point = if s.pet.pressed() {
                            (cursor.x, cursor.y)
                        } else {
                            (s.pet.x + s.pet.width / 2.0, s.pet.y + s.pet.height / 2.0)
                        };
                        let monitor = monitors
                            .iter()
                            .find(|m| {
                                let b = bounds(m);
                                point.0 >= b.left
                                    && point.0 < b.right
                                    && point.1 >= b.top
                                    && point.1 < b.bottom
                            })
                            .or_else(|| {
                                monitors.iter().min_by(|a, b| {
                                    let distance = |m: &tauri::Monitor| {
                                        let r = bounds(m);
                                        let dx = point.0 - point.0.clamp(r.left, r.right);
                                        let dy = point.1 - point.1.clamp(r.top, r.bottom);
                                        dx * dx + dy * dy
                                    };
                                    distance(a).total_cmp(&distance(b))
                                })
                            });
                        if let Some(m) = monitor {
                            s.pet
                                .relocate(bounds(m), size.width as f64, size.height as f64, scale);
                        }
                        if s.ready {
                            s.pet.tick(dt, (cursor.x, cursor.y), mouse_down());
                        }
                        let inside = engine::hit(
                            &s.mask,
                            cursor.x - s.pet.x,
                            cursor.y - s.pet.y,
                            s.pet.width,
                            s.pet.height,
                        );
                        (
                            s.pet.frame.clone(),
                            s.pet.x,
                            s.pet.y,
                            !(inside || s.pet.pressed()),
                            s.ready,
                        )
                    };
                    if !ready {
                        continue;
                    }
                    if ignored != ignore && window.set_ignore_cursor_events(ignore).is_ok() {
                        ignored = ignore;
                    }
                    if let Ok(pos) = window.outer_position() {
                        if pos.x != x.round() as i32 || pos.y != y.round() as i32 {
                            let _ = window.set_position(tauri::PhysicalPosition::new(
                                x.round() as i32,
                                y.round() as i32,
                            ));
                        }
                    }
                    if let Err(e) = window.emit("pet-frame", &frame) {
                        eprintln!("Pet render event: {e}");
                    }
                }
            });
            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => app.exit(0),
            "pause" => {
                app.state::<Shared>().0.lock().unwrap().pet.toggle_pause();
                if let (Some(tray), Ok(m)) = (app.tray_by_id("mali"), menu(app)) {
                    let _ = tray.set_menu(Some(m));
                }
            }
            "home" => {
                if let Some(w) = app.get_webview_window("pet") {
                    if let (Ok(c), Ok(monitors)) = (w.cursor_position(), w.available_monitors()) {
                        if let Some(m) = monitors.iter().find(|m| {
                            let b = bounds(m);
                            c.x >= b.left && c.x < b.right && c.y >= b.top && c.y < b.bottom
                        }) {
                            let state = app.state::<Shared>();
                            let mut s = state.0.lock().unwrap();
                            let b = bounds(m);
                            s.pet.x = b.left + (b.right - b.left - s.pet.width) / 2.0;
                            s.pet.y = b.top + 40.0;
                            s.pet.bounds = b;
                            s.pet.frame.falling = true;
                        }
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("MaliPet could not start");
}
