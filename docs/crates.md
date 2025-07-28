mavlink: This is the main, feature-rich crate for MAVLink in Rust. It's highly configurable and suitable for a wide range of applications, from ground control stations to embedded flight controllers.

Protocol Versions: Supports both MAVLink 1 and MAVLink 2.

Dialects: Comes with built-in support for common dialects like standard and ardupilotmega, which can be enabled via feature flags.

I/O: Provides handlers for UDP, TCP, and Serial connections.

Asynchronous Support: Integrates with tokio for non-blocking, asynchronous operations.

Embedded Friendly: Can be compiled in a no_std environment for bare-metal applications.

mavlink-core: A dependency of the main mavlink crate, this provides the core data structures and traits for MAVLink messages. You typically won't use this directly unless you have very specific needs.

mavlink-bindgen: This build-time utility is used by the mavlink crate to generate Rust code from the official MAVLink XML dialect definitions. It's invaluable if you need to work with a custom MAVLink dialect.

Higher-Level and Utility Crates
Beyond the core protocol, several other crates offer higher-level abstractions and alternative approaches, sometimes with a focus on specific use cases or improved ergonomics.

The Mavka Ecosystem
A newer, alternative ecosystem called Mavka is being developed with a focus on modularity, no_std applications, and extensibility.

mavspec: A tool for parsing MAVLink XML definitions and generating code. It's the foundation of the Mavka ecosystem and can be used to create custom MAVLink tooling.

mavio: A minimalistic and transport-agnostic library for MAVLink communication. It's designed to be lightweight and focuses on the stateless parts of the protocol, making it ideal for no_std and no_alloc environments.

maviola: A work-in-progress library built on top of mavio that aims to provide a high-level interface for MAVLink messaging, handling stateful features like message sequencing and automatic heartbeats.

Other Utilities
async-mavlink: A crate that provides a subscription-based model for handling MAVLink messages asynchronously. This can simplify the logic for applications that need to react to specific types of incoming messages.

blackboxer: A library and set of tools for capturing, logging, and replaying MAVLink messages. This is particularly useful for debugging and simulation.

Community Projects
The strength of the core Rust MAVLink crates is also demonstrated by the projects that build on top of them. These can serve as excellent examples of how to use the libraries in practice.

mavlink2rest: A server that exposes MAVLink messages over a RESTful API, making it easy to integrate with web applications and other services.

mavlink-camera-manager: An extensible, cross-platform server for controlling cameras that use the MAVLink camera protocol.

. For Onboard PX4 Module Development
This is for developers who want to write modules that run directly on the PX4 flight controller, alongside the existing C++ modules.

px4: This is the most important crate for on-controller development. It provides high-level Rust bindings to the core PX4 APIs, allowing you to write dynamically loadable modules in Rust. Its key features include:

Entry Point: Provides the #[px4_module] macro to create the necessary entry point for a PX4 module.

uORB Integration: Offers a safe interface to subscribe to and publish uORB topics, which is the primary mechanism for inter-module communication in PX4.

Logging: Integrates with the standard log crate (info!, warn!, error!) to use PX4's logging system.

Panic Handling: Catches panics within the Rust module to prevent them from crashing the entire flight controller.

px4-macros: A dependency of the px4 crate, this provides the procedural macros that simplify module creation.

Using the px4 crate, you can write custom flight logic, sensor drivers, or other applications in Rust and compile them into the PX4 firmware.

2. For Offboard Communication (Companion Computers)
   These crates are essential for communicating with a PX4-powered drone from an offboard computer (e.g., a Raspberry Pi, NVIDIA Jetson) for tasks like high-level mission control, computer vision, or data forwarding. Communication is typically done using the MAVLink protocol.

mavlink: The primary Rust implementation of the MAVLink protocol. It is feature-rich, supporting both MAVLink 1 and 2, various communication transports (UDP, TCP, Serial), and asynchronous I/O with tokio. It's highly configurable and allows you to generate code for custom MAVLink dialects.

mavio / Mavka Ecosystem: A newer, more modular alternative for MAVLink communication. It's designed to be lightweight and transport-agnostic, with a focus on no_std environments, making it very flexible.

rust-mavlink (and its ecosystem): This is the GitHub organization that hosts the mavlink crate and other related tools, representing the most mature and widely used MAVLink implementation in Rust.

3. For Flight Log Analysis
   After a flight, analyzing the detailed log data is crucial for tuning and diagnostics. PX4's primary logging format is ULog.

px4-ulog-rs: A dedicated crate for parsing PX4's ULog files. It provides a streaming API to efficiently read log data without loading the entire file into memory. This is perfect for building custom analysis tools, plotting utilities, or converting log data to other formats.

4. General Embedded and RTOS Crates
   For developers working at a lower level or interfacing with hardware that PX4 runs on, the broader embedded Rust ecosystem is highly relevant.

Hardware Abstraction Layer (HAL) Crates: Crates like stm32f4xx-hal, stm32f7xx-hal, and stm32h7xx-hal provide safe, high-level APIs for interacting with the peripherals (GPIO, SPI, I2C, etc.) of the microcontrollers commonly found on Pixhawk-standard flight controllers.

RTOS and Concurrency Frameworks:

RTIC (Real-Time Interrupt-driven Concurrency): A popular framework for building real-time applications with efficient and deadlock-free task scheduling.

Embassy: A modern, async-based embedded framework that provides a unified HAL and asynchronous runtime, making complex concurrent applications easier to write and reason about.

Official & C-Binding Client Libraries
These crates interface with the underlying rcl (ROS Client Library) C library, making them the most direct and feature-complete way to integrate with a standard ROS 2 system.

rclrs: This is the most prominent and actively developed client library, positioned as the de facto official Rust client library for ROS 2. It's part of the ros2-rust GitHub organization and aims for feature parity with the official rclcpp (C++) and rclpy (Python) libraries.

Integration: Tightly integrates with the ROS 2 colcon build system and environment.

Features: Supports topics, services, actions, parameters, and loaned (zero-copy) messages.

Best For: Developers who want a familiar ROS 2 development experience and need to ensure maximum compatibility with the existing ROS 2 ecosystem and tools.

r2r (Rust to ROS 2): This library offers a more "Rust-native" ergonomic experience by avoiding synchronous callbacks in favor of Rust's async/await syntax.

Build System: Can be used with cargo alone, without needing to fully hook into the colcon build system, which can simplify development workflows.

Asynchronous API: Its async-first design makes it particularly pleasant for handling complex, non-blocking operations with services and actions.

Best For: Projects that prioritize an idiomatic Rust async workflow and a more decoupled build process.

safe_drive: This crate focuses heavily on formal specification and safety. It aims to prevent common robotics software bugs at compile time through a more restrictive API.

Safety: Designed to be thread-safe and prevent common errors related to node and context initialization.

Best For: High-assurance systems where safety and predictability are paramount.

Pure Rust Client Libraries
This approach avoids linking to any C/C++ code and instead re-implements the ROS 2 protocols (like DDS/RTPS) in pure Rust.

ros2-client: A native Rust client library that uses RustDDS as its underlying middleware for communication.

No C Dependencies: Because it doesn't link to rcl or any C-based DDS vendor, it can offer a more self-contained deployment.

Async API: Like r2r, it uses Rust's async mechanisms for handling events, avoiding callbacks.

Best For: Users who want a pure Rust stack for performance, security, or cross-compilation reasons and don't need to be tied to a specific RMW (ROS Middleware) implementation.

Message and Utility Crates
These crates provide supporting functionality for working with ROS 2 in Rust.

rosidl_runtime_rs: A shared library used by rclrs for handling ROS 2 message generation. It provides the necessary traits and functions to work with the data structures defined in .msg and .srv files.

ros2_message: A utility for dynamically parsing and decoding ROS 2 messages, which is particularly useful for tools that need to inspect arbitrary message types at runtime, such as MCAP file readers.

ros2-interfaces-\*: A collection of crates (e.g., ros2-interfaces-humble, ros2-interfaces-rolling) that provide pre-generated Rust structs for the standard ROS 2 message packages. These are often used with ros2-client.

Sources

ardware Abstraction & Device-Specific Crates
These crates provide the essential link between your Rust code and the SDR hardware itself.

Universal Device Support
soapysdr: This is the most important crate for broad SDR hardware support. It provides Rust bindings for SoapySDR, a powerful, vendor-neutral hardware abstraction layer. By using this crate, you can write code that works with a huge variety of devices without being tied to a specific vendor's driver. Supported devices include:

RTL-SDR

LimeSDR

HackRF

BladeRF

Airspy

Ettus USRP

...and many more through SoapySDR's modular plugin system.

If you want your application to be portable across different SDRs, this is the crate to use.

RTL-SDR Specific
rtl-sdr: This is a direct, low-level Rust wrapper for the librtlsdr C library. It gives you full control over RTL-SDR devices, including setting the frequency, sample rate, and gain. It's an excellent choice if your project specifically targets the popular and affordable RTL-SDR dongles.

rtlsdr: Another popular set of bindings for librtlsdr, offering similar functionality for direct device control.

KrakenSDR
The KrakenSDR is a specialized, 5-channel coherent receiver based on the RTL-SDR. While there isn't a specific Rust crate named "krakensdr," its software stack can be controlled and interfaced with using Rust in a couple of ways:

Direct RTL-SDR Control: Since the KrakenSDR's channels are fundamentally RTL-SDRs, you can use the rtl-sdr or soapysdr crates to interface with the individual channels.

Interfacing with the DAQ/DSP Software: The official KrakenSDR software handles the complex task of coherent data acquisition and Direction of Arrival (DoA) processing. This software is primarily written in Python but can expose data and control interfaces (like ZeroMQ or TCP sockets). You can write a Rust application that communicates with the KrakenSDR's core software over these network interfaces to get processed data or send commands.

Signal Processing & Frameworks
Once you have raw I/Q samples from the SDR, you need to process them. These crates provide the building blocks for creating signal processing pipelines.

rustradio: This is a framework heavily inspired by GNU Radio, allowing you to build SDR applications as graphs of interconnected processing blocks. It provides a library of common blocks for tasks like filtering, resampling, and demodulation. It's designed to be a type-safe and performant alternative to GNU Radio for those who prefer to work entirely in Rust.

futuresdr: A modern, async-native SDR framework. It leverages Rust's asynchronous capabilities to build high-performance, data-driven flowgraphs. It aims to provide an easy-to-use, high-level API for creating complex signal processing applications and supports features like remote execution over the network.

num-complex: While not an SDR-specific crate, it's absolutely essential. It provides the Complex number type that is the foundation of all I/Q data processing in SDR.

In summary, Rust has a strong and capable set of tools for SDR. For the broadest hardware support, soapysdr is your best starting point. If you're building a complete application from the ground up, frameworks like rustradio and futuresdr offer powerful, high-performance alternatives to traditional tools like GNU Radio.

---

proj: This crate provides bindings to the industry-standard PROJ library, a powerful and highly accurate engine for coordinate transformations. Since it's a wrapper around a C library that has been the standard in GIS for decades, it is exceptionally reliable for production use. You'll use this for all your core Lat/Long and UTM conversions.

geo: This crate provides the fundamental data types you'll need, such as Point, LineString, and Polygon. It gives you the building blocks to represent waypoints, flight paths, and geofences in a type-safe way.

MGRS and UTM: geoconvert
While proj can handle UTM, you need a specific solution for MGRS (Military Grid Reference System).

geoconvert: This is an excellent, pure-Rust crate that is designed for straightforward conversions between the most common formats. It has direct, easy-to-use functions for converting between Lat/Long, UTM, and MGRS. Its focused API makes it perfect for a mission planner where you might need to display coordinates in multiple formats simultaneously.

Example Usage:

Rust

use geoconvert::{LatLon, Mgrs};

// Create a Lat/Lon coordinate
let coord_latlon = LatLon::create(40.7483, -73.9852).unwrap();

// Convert to an MGRS coordinate with 1-meter precision
let coord_mgrs = coord_latlon.to_mgrs(5);

println!("MGRS: {}", coord_mgrs);
// Outputs: MGRS: 18TXL4969299413
What3Words: what3words-api
What3Words is a proprietary geocoding system that requires API interaction. You can't perform the conversion offline.

what3words-api: This is the official and most direct crate for interacting with the What3Words REST API. It allows you to convert a 3-word address to coordinates and vice-versa. The crate supports both async and synchronous (blocking) operations, making it flexible for different application architectures.

Example Usage:

Rust

use what3words_api::{What3words, ConvertToCoordinates};

// Initialize the API with your key
let w3w = What3words::new("YOUR_API_KEY");

// Define the 3-word address to look up
let conversion = ConvertToCoordinates::new("filled.count.soap");

// Get the coordinates
if let Ok(response) = w3w.convert_to_coordinates(&conversion) {
if let Some(coords) = response.coordinates {
println!("Lat: {}, Lng: {}", coords.lat, coords.lng);
}
}
Summary of Recommended Crates
Coordinate System Recommended Crate(s) Key Feature
Lat/Long & UTM proj + geo Industry-standard accuracy for robust conversions.
MGRS geoconvert Simple, direct, and pure-Rust conversions.
What3Words what3words-api Official crate for interacting with the online API.
By combining these crates, you can build a highly capable and reliable mapping backend for your MAVLink mission planner, handling all the specified coordinate systems with ease and accuracy.

---
