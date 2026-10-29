"use strict";

const { Router } = require("express");
const authenticate = require("../middlewares/authenticate");
const notificationController = require("../controllers/notificationController");

const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get("/", notificationController.listMyNotifications);
notificationRouter.patch(
  "/read-all",
  notificationController.markAllNotificationsAsRead
);
notificationRouter.patch(
  "/:notificationId/read",
  notificationController.markNotificationAsRead
);
notificationRouter.delete(
  "/:notificationId",
  notificationController.deleteNotification
);

module.exports = notificationRouter;
