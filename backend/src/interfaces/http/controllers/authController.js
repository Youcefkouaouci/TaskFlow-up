"use strict";

const authUseCases = require("../../../application/identity/AuthUseCases");

async function register(req, res, next) {
  try {
    const result = await authUseCases.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authUseCases.login(req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authUseCases.forgotPassword(req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authUseCases.resetPassword(req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await authUseCases.getProfile(req.user?.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await authUseCases.updateProfile(req.user?.id, req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
};
