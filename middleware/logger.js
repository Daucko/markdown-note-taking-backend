const logger = {
  info: (...args) => {
    console.log('[INFO]', ...args);
  },
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    // Check if the error is a Redis connection error or AggregateError
    const err = args[0];
    if (
      err instanceof Error &&
      err.message &&
      err.message.includes('ECONNREFUSED')
    ) {
      // Handle AggregateError with multiple errors (e.g., Redis client)
      if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
        err.errors.forEach((subErr) => {
          const address = subErr.address;
          const port = subErr.port;
          if (address && port) {
            console.error(
              `[ERROR][REDIS CONNECTION REFUSED] at ${address}:${port}`,
              subErr
            );
          } else {
            console.error('[ERROR][REDIS CONNECTION REFUSED]', subErr);
          }
        });
      } else {
        const address = err.address || (err.errors && err.errors[0]?.address);
        const port = err.port || (err.errors && err.errors[0]?.port);
        if (address && port) {
          console.error(
            `[ERROR][REDIS CONNECTION REFUSED] at ${address}:${port}`,
            ...args
          );
        } else {
          console.error('[ERROR][REDIS CONNECTION REFUSED]', ...args);
        }
      }
    } else {
      console.error('[ERROR]', ...args);
    }
  },
};

module.exports = logger;
