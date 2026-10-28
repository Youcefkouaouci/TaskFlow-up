"use strict";

const { Router } = require("express");
const authenticate = require("../middlewares/authenticate");
const invitationController = require("../controllers/invitationController");

const router = Router();

// Consultation publique d'une invitation par son token avant connexion/inscription
router.get("/:token", invitationController.getByToken);

// Acceptation authentifiée d'une invitation pour rejoindre le groupe
router.post("/:token/accept", authenticate, invitationController.accept);

module.exports = router;
