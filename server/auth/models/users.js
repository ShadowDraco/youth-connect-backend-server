"use strict";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const axios = require("axios");

const SECRET = process.env.SECRET || "secretstring";

const userModel = (sequelize, DataTypes) => {
  const model = sequelize.define("ConnectUsers", {
    username: { type: DataTypes.STRING, required: true, unique: true },
    password: { type: DataTypes.STRING, required: true },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      required: true,
      defaultValue: "user",
    },
    DOB: { type: DataTypes.DATEONLY, required: true }, // '03/06/2010'
    token: {
      type: DataTypes.VIRTUAL,
      get() {
        return jwt.sign(
          { username: this.username, capabilities: this.capabilities },
          SECRET
        );
      },
      set(tokenObj) {
        let token = jwt.sign(tokenObj, SECRET);
        return token;
      },
    },
    approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    capabilities: {
      type: DataTypes.VIRTUAL,
      get() {
        const acl = {
          user: ["read", "message"],
          admin: ["read", "message", "create", "update", "delete"],
        };
        return acl[this.role];
      },
    },
  });

  model.beforeCreate(async (user) => {
    let hashedPass = await bcrypt.hash(user.password, 10);
    user.password = hashedPass;
  });

  model.authenticateBasic = async function (username, password) {
    const user = await this.findOne({ where: { username } });
    console.log('found', user.username)
    const valid = await bcrypt.compare(password, user.password);
    if (valid) {
      console.log("VALID USER");
      return user;
    }
    throw new Error("Invalid User");
  };

  model.authenticateToken = async function (token) {
    try {
      const parsedToken = jwt.verify(token, SECRET);
      const user = this.findOne({ where: { username: parsedToken.username } });
      if (user) {
        return user;
      }
      throw new Error("User Not Found");
    } catch (e) {
      throw new Error(e.message);
    }
  };

  return model;
};

module.exports = userModel;
