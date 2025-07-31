/**
 * MAVLink Service - NASA JPL Rule 4 compliant
 * Delegates to focused sub-services for connection, parsing, commands, and telemetry
 * Re-exports the refactored implementation to maintain API compatibility
 */

export { MAVLinkService } from './mavlink-service-refactored';
export { getMAVLinkService, MAVCommands } from './mavlink-service-legacy';