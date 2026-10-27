"use strict";

const {
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  DomainException,
} = require("../../../domain/errors");

const HTTP_MAP = [
  { type: ValidationException, status: 400 },
  { type: UnauthorizedException, status: 401 },
  { type: ForbiddenException, status: 403 },
  { type: NotFoundException, status: 404 },
  { type: ConflictException, status: 409 },
  { type: DomainException, status: 422 },
];

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const match = HTTP_MAP.find(({ type }) => err instanceof type);

  if (match) {
    return res.status(match.status).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = errorHandler;
