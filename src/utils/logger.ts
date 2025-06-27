export class Logger {
    private static instance: Logger;

    private constructor() {
        // Private constructor to enforce Singleton pattern
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    // Logs general information or game events
    public info(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[${timestamp}] INFO: ${message}`, data);
        } else {
            console.log(`[${timestamp}] INFO: ${message}`);
        }
    }

    // Logs warnings
    public warn(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        if (data) {
            console.warn(`[${timestamp}] WARN: ${message}`, data);
        } else {
            console.warn(`[${timestamp}] WARN: ${message}`);
        }
    }

    // Logs errors
    public error(message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        if (error) {
            console.error(`[${timestamp}] ERROR: ${message}`, error);
        } else {
            console.error(`[${timestamp}] ERROR: ${message}`);
        }
    }

    // Logs game state for persistence (simulated)
    public logGameState(state: any): void {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] GAME STATE SNAPSHOT:`, JSON.stringify(state, null, 2));
        // In a real scenario, this JSON would be written to a persistent storage.
    }
}

// Export a singleton instance
export const logger = Logger.getInstance();

