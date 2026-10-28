"use strict";

class DomainException extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = this.constructor.name;
    if (code) {
      this.code = code;
    }
  }
}

// 400 — données invalides (validation du domaine)
class ValidationException extends DomainException {}

// 401 — non authentifié
class UnauthorizedException extends DomainException {}

// 403 — authentifié mais pas le droit
class ForbiddenException extends DomainException {}

// 404 — ressource introuvable
class NotFoundException extends DomainException {}

// 409 — conflit (ex: email déjà pris)
class ConflictException extends DomainException {}

module.exports = {
  DomainException,
  ValidationException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
};
