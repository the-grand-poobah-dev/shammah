/**
 * Shammah Structured Server Logger
 * Provides sanitized, structured logging for Next.js App Router API routes.
 * Never prints secret values or sensitive personal data to logs.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'key',
  'authorization',
  'cookie',
  'phone',
  'phonenumber',
  'card',
  'pin',
]);

function sanitize(data) {
  if (data == null) return data;
  if (typeof data !== 'object') {
    if (typeof data === 'string' && data.length > 500) {
      return data.slice(0, 500) + '...[truncated]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 20).map(sanitize);
  }

  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    const lowerKey = k.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('key')) {
      clean[k] = typeof v === 'string' ? `[REDACTED len=${v.length}]` : '[REDACTED]';
    } else {
      clean[k] = sanitize(v);
    }
  }
  return clean;
}

export function logInfo(message, context = {}) {
  const entry = {
    level: 'INFO',
    timestamp: new Date().toISOString(),
    message,
    ...sanitize(context),
  };
  console.log(JSON.stringify(entry));
}

export function logWarn(message, context = {}) {
  const entry = {
    level: 'WARN',
    timestamp: new Date().toISOString(),
    message,
    ...sanitize(context),
  };
  console.warn(JSON.stringify(entry));
}

export function logError(message, error = null, context = {}) {
  const entry = {
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    message,
    error: error?.message || (typeof error === 'string' ? error : 'Unknown error'),
    ...sanitize(context),
  };
  console.error(JSON.stringify(entry));
}

/**
 * Creates a route logger helper that measures elapsed request time.
 */
export function createRouteLogger(req, routeName = 'api') {
  const startTime = Date.now();
  const method = req?.method || 'GET';
  const url = req?.url || routeName;

  return {
    success(status = 200, extra = {}) {
      const durationMs = Date.now() - startTime;
      logInfo(`${method} ${routeName} - ${status}`, {
        route: routeName,
        status,
        durationMs,
        ...extra,
      });
    },
    error(status = 500, err = null, extra = {}) {
      const durationMs = Date.now() - startTime;
      logError(`${method} ${routeName} failed - ${status}`, err, {
        route: routeName,
        status,
        durationMs,
        ...extra,
      });
    },
  };
}
