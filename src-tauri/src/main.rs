// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Mutex;
use tauri::Manager;
use tauri::State;

// Application state for mission data
#[derive(Default)]
struct AppState {
    mission_items: Mutex<Vec<MissionItem>>,
}

// Mission item structure
#[derive(Serialize, Deserialize, Clone, Debug)]
struct MissionItem {
    id: String,
    #[serde(rename = "type")]
    item_type: String,
    name: String,
    params: WaypointParams,
    position: Option<Position>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct WaypointParams {
    lat: f64,
    lng: f64,
    alt: f64,
    speed: Option<f64>,
    action: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Position {
    lat: f64,
    lng: f64,
    alt: f64,
}

// Basic health check command
#[tauri::command]
fn health_check() -> String {
    "Modular C2 Backend is running".into()
}

// Get application info
#[tauri::command]
fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "Modular C2 Frontend",
        "version": "0.0.1",
        "backend_status": "operational"
    })
}

// Get loaded plugins
#[tauri::command]
fn get_loaded_plugins() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({
            "id": "mission-planner",
            "name": "Mission Planner",
            "description": "Mission planning and waypoint management",
            "icon": "map",
            "enabled": true
        }),
        serde_json::json!({
            "id": "sdr-suite",
            "name": "SDR Suite",
            "description": "Software Defined Radio visualization",
            "icon": "radio",
            "enabled": true
        })
    ]
}

// CLI command execution
#[tauri::command]
async fn run_cli_command(
    app_handle: tauri::AppHandle,
    command: String,
) -> Result<(), String> {
    // Validate command
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }

    // Execute command based on platform
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", &command])
            .output()
            .map_err(|e| format!("Failed to execute command: {}", e))?
    } else {
        Command::new("sh")
            .args(&["-c", &command])
            .output()
            .map_err(|e| format!("Failed to execute command: {}", e))?
    };

    // Emit stdout
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        app_handle
            .emit_all("cli-output", serde_json::json!({
                "line": line,
                "stream": "stdout"
            }))
            .map_err(|e| format!("Failed to emit stdout: {}", e))?;
    }

    // Emit stderr
    let stderr = String::from_utf8_lossy(&output.stderr);
    for line in stderr.lines() {
        app_handle
            .emit_all("cli-output", serde_json::json!({
                "line": line,
                "stream": "stderr"
            }))
            .map_err(|e| format!("Failed to emit stderr: {}", e))?;
    }

    // Emit termination event
    let exit_code = output.status.code().unwrap_or(-1);
    app_handle
        .emit_all("cli-terminated", serde_json::json!({
            "code": exit_code
        }))
        .map_err(|e| format!("Failed to emit termination: {}", e))?;

    Ok(())
}

// Get mission data
#[tauri::command]
fn get_mission_data(state: State<AppState>) -> Result<Vec<MissionItem>, String> {
    let items = state.mission_items.lock().map_err(|_| "Failed to lock state")?;
    Ok(items.clone())
}

// Add mission item
#[tauri::command]
fn add_mission_item(
    state: State<AppState>,
    item: MissionItem,
) -> Result<String, String> {
    let mut items = state.mission_items.lock().map_err(|_| "Failed to lock state")?;
    let item_id = item.id.clone();
    items.push(item);
    Ok(item_id)
}

// Update waypoint parameters
#[tauri::command]
fn update_waypoint_params(
    state: State<AppState>,
    item_id: String,
    params: WaypointParams,
) -> Result<(), String> {
    let mut items = state.mission_items.lock().map_err(|_| "Failed to lock state")?;
    
    if let Some(item) = items.iter_mut().find(|i| i.id == item_id) {
        item.params = params;
        Ok(())
    } else {
        Err("Mission item not found".to_string())
    }
}

// Reorder mission item
#[tauri::command]
fn reorder_mission_item(
    state: State<AppState>,
    item_id: String,
    new_index: usize,
) -> Result<(), String> {
    let mut items = state.mission_items.lock().map_err(|_| "Failed to lock state")?;
    
    // Find current index
    let current_index = items.iter().position(|i| i.id == item_id)
        .ok_or("Mission item not found")?;
    
    // Remove and reinsert at new position
    let item = items.remove(current_index);
    let insert_index = new_index.min(items.len());
    items.insert(insert_index, item);
    
    Ok(())
}

// Delete mission item
#[tauri::command]
fn delete_mission_item(
    state: State<AppState>,
    item_id: String,
) -> Result<(), String> {
    let mut items = state.mission_items.lock().map_err(|_| "Failed to lock state")?;
    items.retain(|i| i.id != item_id);
    Ok(())
}

// Select mission item (this is handled by frontend, but we provide the command for consistency)
#[tauri::command]
fn select_mission_item(item_id: Option<String>) -> Result<(), String> {
    // This is primarily handled by the frontend state
    // Backend can use this for logging or analytics
    if let Some(id) = item_id {
        println!("Mission item selected: {}", id);
    } else {
        println!("Mission item deselected");
    }
    Ok(())
}

// Initialize default mission data
fn initialize_mission_data() -> Vec<MissionItem> {
    vec![
        MissionItem {
            id: "mission-1".to_string(),
            item_type: "takeoff".to_string(),
            name: "Takeoff".to_string(),
            params: WaypointParams {
                lat: 37.7749,
                lng: -122.4194,
                alt: 100.0,
                speed: Some(5.0),
                action: None,
            },
            position: Some(Position {
                lat: 37.7749,
                lng: -122.4194,
                alt: 100.0,
            }),
        },
        MissionItem {
            id: "mission-2".to_string(),
            item_type: "waypoint".to_string(),
            name: "Waypoint 1".to_string(),
            params: WaypointParams {
                lat: 37.7849,
                lng: -122.4094,
                alt: 150.0,
                speed: Some(10.0),
                action: None,
            },
            position: Some(Position {
                lat: 37.7849,
                lng: -122.4094,
                alt: 150.0,
            }),
        },
    ]
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            mission_items: Mutex::new(initialize_mission_data()),
        })
        .invoke_handler(tauri::generate_handler![
            health_check,
            get_app_info,
            get_loaded_plugins,
            run_cli_command,
            get_mission_data,
            add_mission_item,
            update_waypoint_params,
            reorder_mission_item,
            delete_mission_item,
            select_mission_item
        ])
        .setup(|app| {
            // Initialize application
            println!("Modular C2 Frontend backend initialized");
            
            // Set up periodic SDR data emission (mock data for now)
            let app_handle = app.handle();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    
                    // Generate mock FFT data
                    let mut magnitudes = vec![];
                    for i in 0..256 {
                        let freq = i as f64 / 256.0;
                        let magnitude = -80.0 + 30.0 * (freq * std::f64::consts::PI * 4.0).sin() 
                            + rand::random::<f64>() * 10.0 - 5.0;
                        magnitudes.push(magnitude);
                    }
                    
                    let fft_data = serde_json::json!({
                        "centerFrequency": 100_000_000.0, // 100 MHz
                        "sampleRate": 2_000_000.0, // 2 MS/s
                        "magnitudes": magnitudes,
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as u64)
                            .unwrap_or(0)
                    });
                    
                    // Emit FFT data
                    let _ = app_handle.emit_all("sdr-fft-data", fft_data);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Fatal error running Tauri application: {}", e);
            std::process::exit(1);
        });
}

// Mock random number generator for FFT data
mod rand {
    pub fn random<T>() -> T
    where
        T: From<f64>,
    {
        // Simple pseudo-random for mock data
        let time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let value = ((time % 1000) as f64) / 1000.0;
        T::from(value)
    }
}