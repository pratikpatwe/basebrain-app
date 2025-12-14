/**
 * Network utilities for handling connectivity and retry logic.
 * Provides:
 * - Offline/online detection with event listeners
 * - Exponential backoff retry logic for failed requests
 */

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
}

/**
 * Subscribe to online/offline status changes
 * Returns an unsubscribe function
 */
export function subscribeToNetworkStatus(
    onOnline: () => void,
    onOffline: () => void
): () => void {
    if (typeof window === "undefined") {
        return () => { };
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
    };
}

/**
 * Configuration for exponential backoff
 */
export interface BackoffConfig {
    /** Initial delay in milliseconds (default: 1000) */
    initialDelay?: number;
    /** Maximum delay in milliseconds (default: 30000) */
    maxDelay?: number;
    /** Multiplier for each retry (default: 2) */
    multiplier?: number;
    /** Maximum number of retries (default: 5) */
    maxRetries?: number;
    /** Add jitter to prevent thundering herd (default: true) */
    jitter?: boolean;
}

const DEFAULT_BACKOFF_CONFIG: Required<BackoffConfig> = {
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    maxRetries: 5,
    jitter: true,
};

/**
 * Calculate delay for a given retry attempt with exponential backoff
 */
export function calculateBackoffDelay(
    attempt: number,
    config: BackoffConfig = {}
): number {
    const { initialDelay, maxDelay, multiplier, jitter } = {
        ...DEFAULT_BACKOFF_CONFIG,
        ...config,
    };

    // Calculate base delay: initialDelay * multiplier^attempt
    let delay = initialDelay * Math.pow(multiplier, attempt);

    // Cap at max delay
    delay = Math.min(delay, maxDelay);

    // Add jitter (±25%) to prevent thundering herd problem
    if (jitter) {
        const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
        delay = Math.floor(delay * jitterFactor);
    }

    return delay;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic
 * @param fn The async function to execute
 * @param config Backoff configuration
 * @param shouldRetry Optional function to determine if error is retryable
 * @returns The result of the function or throws after max retries
 */
export async function withExponentialBackoff<T>(
    fn: () => Promise<T>,
    config: BackoffConfig = {},
    shouldRetry: (error: unknown) => boolean = () => true
): Promise<T> {
    const { maxRetries } = { ...DEFAULT_BACKOFF_CONFIG, ...config };

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Check if online before attempting
            if (!isOnline()) {
                console.log("[Backoff] Offline, waiting for connection...");
                await waitForOnline();
            }

            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry this error
            if (!shouldRetry(error)) {
                throw error;
            }

            // Don't retry if we've exhausted attempts
            if (attempt >= maxRetries) {
                console.error(
                    `[Backoff] Max retries (${maxRetries}) exceeded`,
                    error
                );
                throw error;
            }

            const delay = calculateBackoffDelay(attempt, config);
            console.log(
                `[Backoff] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
                error
            );

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Wait for the browser to come back online
 * Returns a promise that resolves when online
 */
export function waitForOnline(): Promise<void> {
    return new Promise((resolve) => {
        if (isOnline()) {
            resolve();
            return;
        }

        const handleOnline = () => {
            window.removeEventListener("online", handleOnline);
            console.log("[Network] Back online");
            resolve();
        };

        window.addEventListener("online", handleOnline);
    });
}

/**
 * Create a managed retry state for tracking retry attempts
 */
export interface RetryState {
    attempt: number;
    lastError: unknown | null;
    isRetrying: boolean;
    nextRetryAt: number | null;
}

export function createRetryState(): RetryState {
    return {
        attempt: 0,
        lastError: null,
        isRetrying: false,
        nextRetryAt: null,
    };
}
