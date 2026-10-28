"use strict";

const User = require("../user/UserSchema");
const Group = require("../group/GroupSchema");
const GroupInvitation = require("../invitation/GroupInvitationSchema");
const Project = require("../project/ProjectSchema");
const Task = require("../task/TaskSchema");
const Message = require("../message/MessageSchema");
const File = require("../file/FileSchema");

module.exports = {
  User,
  Group,
  GroupInvitation,
  Project,
  Task,
  Message,
  File,
};
