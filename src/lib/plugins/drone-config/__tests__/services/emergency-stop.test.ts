/**
 * Emergency Stop Service Tests
 * Validates < 1ms response time requirement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    EmergencyStopService, 
    emergencyStop, 
    isEmergencyStopped,
    getEmergencyMetrics 
} from '../../services/emergency-stop';

describe('EmergencyStopService', () => {
    beforeEach(() => {
        // Reset emergency state
        vi.clearAllMocks();
        EmergencyStopService['emergencyFlag'] = false;
        EmergencyStopService['responseTimeHistory'] = [];
        EmergencyStopService['maxResponseTime'] = 0;
    });
    
    describe('Response Time Compliance', () => {
        it('should trigger emergency stop in < 1ms', () => {
            const iterations = 100;
            const times: number[] = [];
            
            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                emergencyStop();
                const elapsed = performance.now() - start;
                times.push(elapsed);
                
                // Reset for next iteration
                EmergencyStopService['emergencyFlag'] = false;
            }
            
            const maxTime = Math.max(...times);
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            
            console.log(`Emergency Stop Performance: Max=${maxTime.toFixed(3)}ms, Avg=${avgTime.toFixed(3)}ms`);
            
            // Critical assertion: ALL iterations must be < 1ms
            expect(maxTime).toBeLessThan(1.0);
            expect(avgTime).toBeLessThan(0.5); // Average should be well under limit
        });
        
        it('should set emergency flag synchronously', () => {
            expect(isEmergencyStopped()).toBe(false);
            
            const start = performance.now();
            emergencyStop();
            const elapsed = performance.now() - start;
            
            // Flag must be set immediately
            expect(isEmergencyStopped()).toBe(true);
            expect(elapsed).toBeLessThan(0.1); // Flag setting should be near-instant
        });
    });
    
    describe('Performance Metrics', () => {
        it('should track response time history', () => {
            // Trigger multiple stops
            for (let i = 0; i < 5; i++) {
                emergencyStop();
                EmergencyStopService['emergencyFlag'] = false;
            }
            
            const metrics = getEmergencyMetrics();
            expect(metrics.avgResponseTime).toBeGreaterThan(0);
            expect(metrics.maxResponseTime).toBeGreaterThan(0);
            expect(metrics.violations).toBe(0); // Should have no violations
        });
        
        it('should detect response time violations', () => {
            // Simulate a violation by manipulating the history
            EmergencyStopService['responseTimeHistory'] = [0.5, 0.7, 1.2, 0.3];
            EmergencyStopService['maxResponseTime'] = 1.2;
            
            const metrics = getEmergencyMetrics();
            expect(metrics.violations).toBe(1);
            expect(metrics.maxResponseTime).toBe(1.2);
        });
    });
    
    describe('Hardware Integration', () => {
        it('should use pre-allocated command buffer', () => {
            // Verify buffer is pre-allocated
            const buffer = EmergencyStopService['EMERGENCY_COMMAND_BUFFER'];
            expect(buffer).toBeDefined();
            expect(buffer.byteLength).toBeGreaterThan(0);
        });
        
        it('should handle Tauri IPC unavailability gracefully', () => {
            // Remove Tauri IPC
            const originalIPC = window.__TAURI_IPC__;
            window.__TAURI_IPC__ = undefined;
            
            // Should not throw
            expect(() => emergencyStop()).not.toThrow();
            expect(isEmergencyStopped()).toBe(true);
            
            // Restore
            window.__TAURI_IPC__ = originalIPC;
        });
    });
    
    describe('Reset Functionality', () => {
        it('should require safety code for reset', async () => {
            emergencyStop();
            expect(isEmergencyStopped()).toBe(true);
            
            // Invalid code should fail
            const result1 = await EmergencyStopService.resetEmergencyStop('WRONG_CODE');
            expect(result1).toBe(false);
            expect(isEmergencyStopped()).toBe(true);
            
            // Valid code should succeed
            vi.mocked(window.__TAURI_IPC__ || vi.fn()).mockImplementation(() => {});
            const result2 = await EmergencyStopService.resetEmergencyStop('CONFIRM_SAFE_TO_RESET');
            expect(result2).toBe(true);
            expect(isEmergencyStopped()).toBe(false);
        });
    });
    
    describe('Stress Testing', () => {
        it('should maintain performance under rapid triggers', () => {
            const rapidTriggers = 1000;
            const times: number[] = [];
            
            for (let i = 0; i < rapidTriggers; i++) {
                const start = performance.now();
                emergencyStop();
                const elapsed = performance.now() - start;
                times.push(elapsed);
                EmergencyStopService['emergencyFlag'] = false;
            }
            
            const violations = times.filter(t => t >= 1.0).length;
            const percentileTime = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)];
            
            console.log(`Stress Test: ${rapidTriggers} triggers, ${violations} violations, 99th percentile: ${percentileTime.toFixed(3)}ms`);
            
            // Even under stress, violations should be minimal
            expect(violations / rapidTriggers).toBeLessThan(0.01); // < 1% violation rate
            expect(percentileTime).toBeLessThan(1.0); // 99th percentile < 1ms
        });
    });
});

// Mock Tauri invoke for tests
vi.mock('@tauri-apps/api/tauri', () => ({
    invoke: vi.fn().mockResolvedValue(undefined)
}));