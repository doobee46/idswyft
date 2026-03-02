// Stub for winston — used in test environment where the package is not installed
const noop = () => {};
const transport = class { constructor() {} };
const logger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  verbose: noop,
};

const winston = {
  createLogger: () => logger,
  format: {
    combine: () => ({}),
    timestamp: () => ({}),
    errors: () => ({}),
    json: () => ({}),
    colorize: () => ({}),
    printf: () => ({}),
  },
  transports: {
    Console: transport,
    File: transport,
  },
};

export default winston;
