import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppErrorMessages } from './app-error-messages';

export class AppException {
  static transactionNotFound(id: number) {
    return new NotFoundException(AppErrorMessages.transaction.notFound(id));
  }

  static transactionAccessDenied() {
    return new ForbiddenException(AppErrorMessages.transaction.accessDenied);
  }

  static transactionDateRangeRequired() {
    return new BadRequestException(
      AppErrorMessages.transaction.dateRangeRequired,
    );
  }

  static transactionTypeNotFound() {
    return new BadRequestException(AppErrorMessages.transactionType.notFound);
  }

  static transactionTypeFlowMismatch(
    name: string,
    typeFlow: string,
    txFlow: string,
  ) {
    return new BadRequestException(
      AppErrorMessages.transactionType.flowMismatch(name, typeFlow, txFlow),
    );
  }

  static transactionTypeAccessDenied() {
    return new ForbiddenException(
      AppErrorMessages.transactionType.accessDenied,
    );
  }

  static transactionTypeDuplicate(code: string, flow: string) {
    return new ConflictException(
      AppErrorMessages.transactionType.duplicate(code, flow),
    );
  }
}
