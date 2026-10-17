import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppErrorCode } from './app-error-codes';
import { AppErrorMessages } from './app-error-messages';

type ExceptionCtor = new (body: {
  code: AppErrorCode;
  message: string;
}) => Error;

const coded = (Ctor: ExceptionCtor, code: AppErrorCode, message: string) =>
  new Ctor({ code, message });

/** Nest không có sẵn TooManyRequestsException. */
class TooManyRequestsException extends HttpException {
  constructor(body: { code: AppErrorCode; message: string }) {
    super(body, HttpStatus.TOO_MANY_REQUESTS);
  }
}

const M = AppErrorMessages;
const C = AppErrorCode;

export class AppException {
  static invalidCredentials() {
    return coded(
      UnauthorizedException,
      C.INVALID_CREDENTIALS,
      M.auth.invalidCredentials,
    );
  }

  static invalidRefreshToken() {
    return coded(
      UnauthorizedException,
      C.INVALID_REFRESH_TOKEN,
      M.auth.invalidRefreshToken,
    );
  }

  static emailInUse() {
    return coded(ConflictException, C.EMAIL_IN_USE, M.auth.emailInUse);
  }

  static idempotencyKeyReused() {
    return coded(
      UnprocessableEntityException,
      C.IDEMPOTENCY_KEY_REUSED,
      M.idempotency.reused,
    );
  }

  static idempotencyKeyInProgress() {
    return coded(
      ConflictException,
      C.IDEMPOTENCY_KEY_IN_PROGRESS,
      M.idempotency.inProgress,
    );
  }

  static invalidTypeReference() {
    return coded(
      BadRequestException,
      C.INVALID_REFERENCE,
      M.reference.invalidType,
    );
  }

  static invalidPaymentMethodReference() {
    return coded(
      BadRequestException,
      C.INVALID_REFERENCE,
      M.reference.invalidPaymentMethod,
    );
  }

  static invalidImage(message: string) {
    return coded(BadRequestException, C.INVALID_IMAGE, message);
  }

  static transactionNotFound(id: string) {
    return coded(
      NotFoundException,
      C.TRANSACTION_NOT_FOUND,
      M.transaction.notFound(id),
    );
  }

  static transactionDateRangeRequired() {
    return coded(
      BadRequestException,
      C.DATE_RANGE_REQUIRED,
      M.transaction.dateRangeRequired,
    );
  }

  static transactionTypeNotFound(id: string) {
    return coded(
      NotFoundException,
      C.TYPE_NOT_FOUND,
      M.transactionType.notFound(id),
    );
  }

  static transactionTypeFlowMismatch(
    name: string,
    typeFlow: string,
    txFlow: string,
  ) {
    return coded(
      BadRequestException,
      C.TYPE_FLOW_MISMATCH,
      M.transactionType.flowMismatch(name, typeFlow, txFlow),
    );
  }

  static transactionTypeDuplicate(code: string, flow: string) {
    return coded(
      ConflictException,
      C.TYPE_DUPLICATE,
      M.transactionType.duplicate(code, flow),
    );
  }

  static transactionTypeColorInUse(color: string) {
    return coded(
      ConflictException,
      C.TYPE_COLOR_IN_USE,
      M.transactionType.colorInUse(color),
    );
  }

  static defaultTypeReadOnly() {
    return coded(
      ForbiddenException,
      C.DEFAULT_TYPE_READ_ONLY,
      M.transactionType.defaultReadOnly,
    );
  }

  static fallbackTypeMissing(flow: string) {
    return coded(
      ConflictException,
      C.FALLBACK_TYPE_MISSING,
      M.transactionType.fallbackMissing(flow),
    );
  }

  static paymentMethodNotFound(id: string) {
    return coded(
      NotFoundException,
      C.PAYMENT_METHOD_NOT_FOUND,
      M.paymentMethod.notFound(id),
    );
  }

  static paymentMethodColorInUse(color: string) {
    return coded(
      ConflictException,
      C.PAYMENT_METHOD_COLOR_IN_USE,
      M.paymentMethod.colorInUse(color),
    );
  }

  static defaultPaymentMethodReadOnly() {
    return coded(
      ForbiddenException,
      C.DEFAULT_PAYMENT_METHOD_READ_ONLY,
      M.paymentMethod.defaultReadOnly,
    );
  }

  static fallbackPaymentMethodMissing() {
    return coded(
      ConflictException,
      C.FALLBACK_PAYMENT_METHOD_MISSING,
      M.paymentMethod.fallbackMissing,
    );
  }

  static rateLimited() {
    return coded(TooManyRequestsException, C.RATE_LIMITED, M.user.rateLimited);
  }

  static inviteIdNotFound() {
    return coded(NotFoundException, C.USER_NOT_FOUND, M.user.inviteIdNotFound);
  }

  static transactionNotCreator() {
    return coded(
      ForbiddenException,
      C.TRANSACTION_NOT_CREATOR,
      M.group.transactionNotCreator,
    );
  }

  static invalidGroupReference() {
    return coded(
      BadRequestException,
      C.INVALID_REFERENCE,
      'Nhóm không tồn tại hoặc bạn không phải thành viên',
    );
  }

  static groupNotFound(id: string) {
    return coded(NotFoundException, C.GROUP_NOT_FOUND, M.group.notFound(id));
  }

  static groupArchived() {
    return coded(ConflictException, C.GROUP_ARCHIVED, M.group.archived);
  }

  static groupOwnerOnly() {
    return coded(ForbiddenException, C.GROUP_OWNER_ONLY, M.group.ownerOnly);
  }

  static groupOwnerCannotLeave() {
    return coded(
      ConflictException,
      C.GROUP_OWNER_CANNOT_LEAVE,
      M.group.ownerCannotLeave,
    );
  }

  static groupMemberNotFound() {
    return coded(
      NotFoundException,
      C.GROUP_MEMBER_NOT_FOUND,
      M.group.memberNotFound,
    );
  }

  static groupCannotRemoveOwner() {
    return coded(
      BadRequestException,
      C.GROUP_CANNOT_REMOVE_OWNER,
      M.group.cannotRemoveOwner,
    );
  }

  static groupTransferToSelf() {
    return coded(
      BadRequestException,
      C.GROUP_TRANSFER_TO_SELF,
      M.group.transferToSelf,
    );
  }

  static groupAlreadyMember() {
    return coded(
      ConflictException,
      C.GROUP_ALREADY_MEMBER,
      M.group.alreadyMember,
    );
  }

  static groupInviteSelf() {
    return coded(BadRequestException, C.GROUP_INVITE_SELF, M.group.inviteSelf);
  }

  static invitationNotFound(id: string) {
    return coded(
      NotFoundException,
      C.INVITATION_NOT_FOUND,
      M.invitation.notFound(id),
    );
  }

  static invitationAccessDenied() {
    return coded(
      ForbiddenException,
      C.INVITATION_ACCESS_DENIED,
      M.invitation.accessDenied,
    );
  }

  static invitationAlreadyPending() {
    return coded(
      ConflictException,
      C.INVITATION_ALREADY_PENDING,
      M.invitation.alreadyPending,
    );
  }

  static invitationNotPending() {
    return coded(
      ConflictException,
      C.INVITATION_NOT_PENDING,
      M.invitation.notPending,
    );
  }

  static invitationExpired() {
    return coded(ConflictException, C.INVITATION_EXPIRED, M.invitation.expired);
  }

  static friendCannotAddSelf() {
    return coded(
      BadRequestException,
      C.FRIEND_CANNOT_ADD_SELF,
      M.friend.cannotAddSelf,
    );
  }

  static friendUserNotFound(id: string) {
    return coded(
      NotFoundException,
      C.FRIEND_USER_NOT_FOUND,
      M.friend.userNotFound(id),
    );
  }

  static friendRequestNotFound(id: string) {
    return coded(
      NotFoundException,
      C.FRIEND_REQUEST_NOT_FOUND,
      M.friend.requestNotFound(id),
    );
  }

  static friendAlreadyFriends() {
    return coded(
      ConflictException,
      C.FRIEND_ALREADY_FRIENDS,
      M.friend.alreadyFriends,
    );
  }

  static friendRequestAlreadySent() {
    return coded(
      ConflictException,
      C.FRIEND_REQUEST_ALREADY_SENT,
      M.friend.requestAlreadySent,
    );
  }

  static friendRequestAlreadyPending() {
    return coded(
      ConflictException,
      C.FRIEND_REQUEST_ALREADY_PENDING,
      M.friend.requestAlreadyPending,
    );
  }

  static friendNotFriends() {
    return coded(
      BadRequestException,
      C.FRIEND_NOT_FRIENDS,
      M.friend.notFriends,
    );
  }

  static friendRequestAccessDenied() {
    return coded(
      ForbiddenException,
      C.FRIEND_REQUEST_ACCESS_DENIED,
      M.friend.requestAccessDenied,
    );
  }
}
