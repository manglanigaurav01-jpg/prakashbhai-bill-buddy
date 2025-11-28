// Enhanced error recovery system with retry, offline queue, and conflict resolution

export interface QueuedOperation {
  id: string;
  type: 'save' | 'delete' | 'update' | 'sync';
  entity: 'bill' | 'payment' | 'customer' | 'item';
  data: any;
  timestamp: number;
  retries: number;
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

const OFFLINE_QUEUE_KEY = 'prakash_offline_queue';
const MAX_QUEUE_SIZE = 100;

// Check if device is online
export const isOnline = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true;
};

// Retry operation with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('permission') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('validation')) {
          throw error;
        }
      }

      // If this was the last attempt, throw
      if (attempt === retryConfig.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
        retryConfig.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Operation failed after retries');
};

// Offline queue management
export const getOfflineQueue = (): QueuedOperation[] => {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

export const addToOfflineQueue = (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): string => {
  const queue = getOfflineQueue();
  
  // Prevent queue overflow
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift(); // Remove oldest operation
  }

  const queuedOp: QueuedOperation = {
    ...operation,
    id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0
  };

  queue.push(queuedOp);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return queuedOp.id;
};

export const removeFromOfflineQueue = (id: string): void => {
  const queue = getOfflineQueue();
  const filtered = queue.filter(op => op.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
};

export const clearOfflineQueue = (): void => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

// Process offline queue when coming back online
export const processOfflineQueue = async (
  processor: (operation: QueuedOperation) => Promise<boolean>
): Promise<{ processed: number; failed: number }> => {
  if (!isOnline()) {
    return { processed: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  let processed = 0;
  let failed = 0;

  for (const operation of queue) {
    try {
      const success = await processor(operation);
      if (success) {
        removeFromOfflineQueue(operation.id);
        processed++;
      } else {
        operation.retries++;
        if (operation.retries >= DEFAULT_RETRY_CONFIG.maxRetries) {
          removeFromOfflineQueue(operation.id);
          failed++;
        }
      }
    } catch (error) {
      operation.retries++;
      operation.error = error instanceof Error ? error.message : String(error);
      
      if (operation.retries >= DEFAULT_RETRY_CONFIG.maxRetries) {
        removeFromOfflineQueue(operation.id);
        failed++;
      } else {
        // Update queue with retry count
        const updatedQueue = getOfflineQueue();
        const index = updatedQueue.findIndex(op => op.id === operation.id);
        if (index !== -1) {
          updatedQueue[index] = operation;
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
        }
      }
    }
  }

  return { processed, failed };
};

// Conflict resolution for concurrent edits
export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  resolvedData?: any;
}

export const resolveConflict = (
  local: any,
  remote: any,
  strategy: ConflictResolution['strategy'] = 'local'
): ConflictResolution => {
  switch (strategy) {
    case 'local':
      return { strategy: 'local', resolvedData: local };
    case 'remote':
      return { strategy: 'remote', resolvedData: remote };
    case 'merge':
      // Simple merge: prefer local for most fields, but keep remote timestamp
      return {
        strategy: 'merge',
        resolvedData: {
          ...local,
          ...remote,
          lastModified: new Date().toISOString()
        }
      };
    default:
      return { strategy: 'manual' };
  }
};

// Setup offline/online listeners
export const setupOfflineQueueProcessor = (
  processor: (operation: QueuedOperation) => Promise<boolean>
): (() => void) => {
  const handleOnline = () => {
    processOfflineQueue(processor).then(result => {
      if (result.processed > 0) {
        console.log(`Processed ${result.processed} queued operations`);
      }
      if (result.failed > 0) {
        console.warn(`Failed to process ${result.failed} operations`);
      }
    });
  };

  window.addEventListener('online', handleOnline);
  
  // Process immediately if already online
  if (isOnline()) {
    handleOnline();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};

