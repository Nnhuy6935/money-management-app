import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppErrorCode } from '../exceptions/app-error-codes';

/**
 * Chuẩn hoá body lỗi: { statusCode, code, message, error }.
 * `code` là mã máy đọc được (NF-2); lỗi không gắn mã → suy ra từ HTTP status.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status: number = exception.getStatus();
    const raw = exception.getResponse();
    const body: Record<string, unknown> =
      typeof raw === 'string' ? { message: raw } : { ...raw };

    const message = body.message ?? exception.message;
    const code =
      typeof body.code === 'string'
        ? body.code
        : status === 400 && Array.isArray(message)
          ? AppErrorCode.VALIDATION_ERROR
          : (HttpStatus[status] ?? 'ERROR');

    response.status(status).json({
      statusCode: status,
      code,
      message,
      error: body.error ?? exception.name.replace(/Exception$/, ''),
    });
  }
}
