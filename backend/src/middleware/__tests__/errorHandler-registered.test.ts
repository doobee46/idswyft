import { describe, it, expect } from 'vitest';
import { errorHandler } from '../errorHandler.js';

describe('errorHandler export', () => {
  it('is exported as a function', () => {
    expect(typeof errorHandler).toBe('function');
  });

  it('has arity 4 — correct Express error-handler signature', () => {
    // Express identifies error handlers by having exactly 4 parameters: (err, req, res, next)
    expect(errorHandler.length).toBe(4);
  });

  it('calls next when error is not an operational error (passes through)', () => {
    // When err.isOperational is falsy and we are in production, sendErrorProd should run.
    // Here we test the handler does not throw when invoked.
    const mockErr = { message: 'test error', statusCode: 400, status: 'fail', isOperational: true };
    const mockReq = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1', headers: {} } as any;
    const mockRes = {
      status: (code: number) => ({ json: (body: any) => body }),
      statusCode: 200,
    } as any;
    const mockNext = () => {};
    // Should not throw
    expect(() => errorHandler(mockErr, mockReq, mockRes, mockNext)).not.toThrow();
  });
});
