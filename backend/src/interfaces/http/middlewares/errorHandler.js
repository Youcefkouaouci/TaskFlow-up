"use strict";

const {
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  DomainException,
} = require("../../../domain/errors");

// Contrat API livret §4.2 : {"error":{"code":"...","message":"..."}}
const HTTP_MAP = [
  { type: ValidationException, status: 400, code: "INVALID_INPUT" },
  { type: UnauthorizedException, status: 401, code: "UNAUTHORIZED" },
  { type: ForbiddenException, status: 403, code: "FORBIDDEN" },
  { type: NotFoundException, status: 404, code: "NOT_FOUND" },
  { type: ConflictException, status: 409, code: "EMAIL_ALREADY_USED" },
  { type: DomainException, status: 422, code: "DOMAIN_ERROR" },
];

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const match = HTTP_MAP.find(({ type }) => err instanceof type);

  if (match) {
    return res
      .status(match.status)
      .json({ error: { code: err.code || match.code, message: err.message } });
  }

  console.error(err);
  res
    .status(500)
    .json({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
}

module.exports = errorHandler;
