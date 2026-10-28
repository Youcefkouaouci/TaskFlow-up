const { Router } = require("express");
const authenticate = require("../middlewares/authenticate");
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
} = require("../controllers/authController");

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);
router.patch("/profile", authenticate, updateProfile);

module.exports = router;
