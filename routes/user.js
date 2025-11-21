const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticateToken = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const {
  validate,
  signupValidation,
  loginValidation,
} = require("../middleware/validators");
const logger = require("../config/logger");
const { loginLimiter } = require("../middleware/rateLimiter");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION;

if (!POLICY_VERSION) {
  console.warn("POLICY_VERSION not set, using default 'v1.0'");
}

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id.toString() },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

/**
 * @route POST /api/users/signup
 */
router.post("/signup", validate(signupValidation), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn("Signup validation failed", {
      errors: errors.array(),
      ip: req.ip,
    });
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstname, lastname, username, email, password, phone, role } =
    req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      logger.warn("Signup attempt with existing credentials", {
        email,
        username,
        existingField: existingUser.email === email ? "email" : "username",
        ip: req.ip,
      });
      return res.status(400).json({
        error: "Email or username already in use",
      });
    }

    const privacyConsentData = {
      accepted: true,
      acceptedAt: new Date(),
      policyVersion: POLICY_VERSION || "v1.0",
    };

    const newUser = new User({
      firstname,
      lastname,
      username,
      email,
      password,
      phone,
      role,
      privacyConsent: privacyConsentData,
    });

    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser);
    newUser.refreshToken = refreshToken;
    await newUser.save();

    logger.info("New user registered", {
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      ip: req.ip,
    });

    res.status(201).json({
      message: "User created successfully",
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (err) {
    logger.error("Signup error", {
      error: err.message,
      stack: err.stack,
      userData: {
        username: req.body.username,
        email: req.body.email,
        role: req.body.role,
      },
      ip: req.ip,
    });

    if (err.name === "ValidationError") {
      return res.status(400).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Invalid data provided"
            : err.message,
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Email or username already in use",
      });
    }

    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  }
});

/**
 * @route POST /api/users/login
 */
router.post(
  "/login",
  loginLimiter,
  validate(loginValidation),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Login validation failed", {
        errors: errors.array(),
        ip: req.ip,
      });
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // ✅ validator ตรวจแล้วว่าเป็น string
      const user = await User.findOne({ email });

      if (!user) {
        logger.warn("Login attempt with non-existent email", {
          email,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        logger.warn("Login attempt with incorrect password", {
          userId: user._id,
          email,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        });
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      user.refreshToken = refreshToken;
      await user.save();

      logger.info("User logged in successfully", {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ message: "Login successful", accessToken, refreshToken });
    } catch (err) {
      logger.error("Login error", {
        error: err.message,
        stack: err.stack,
        email: req.body.email,
        ip: req.ip,
      });

      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private (requires JWT token)
 */
router.get(
  "/me",
  authenticateToken(["expert", "pet-owner"]),
  async (req, res) => {
    try {
      if (!req.user.id.match(/^[0-9a-fA-F]{24}$/)) {
        logger.warn("Invalid user ID format in get profile", {
          userId: req.user.id,
          ip: req.ip,
        });
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await User.findById(req.user.id).select("-password");

      if (!user) {
        logger.warn("User not found for valid token", {
          userId: req.user.id,
          ip: req.ip,
        });
        return res.status(404).json({ error: "User not found" });
      }

      logger.info("User profile accessed", {
        userId: user._id,
        username: user.username,
        ip: req.ip,
      });

      res.json({
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        privacyConsent: user.privacyConsent,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (err) {
      logger.error("Get user profile error", {
        error: err.message,
        stack: err.stack,
        userId: req.user?.id,
        ip: req.ip,
      });

      res.status(500).json({
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
      });
    }
  }
);

/** * @route POST /api/users/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn("Missing refresh token in token refresh attempt", {
      ip: req.ip,
    });
    return res.status(401).json({ error: "Missing refresh token" });
  }

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      logger.warn("Invalid refresh token attempt", {
        ip: req.ip,
      });
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          logger.warn("Expired or invalid refresh token attempt", {
            userId: user._id,
            ip: req.ip,
          });
          return res
            .status(403)
            .json({ error: "Expired or invalid refresh token" });
        }

        const { accessToken, refreshToken: newRefreshToken } =
          generateTokens(user);

        // update refresh token ใน DB
        user.refreshToken = newRefreshToken;
        await user.save();

        logger.info("Refresh token rotated successfully", {
          userId: user._id,
          ip: req.ip,
        });

        res.json({
          accessToken,
          refreshToken: newRefreshToken,
        });
      }
    );
  } catch (err) {
    logger.error("Token refresh error", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
    });
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route POST /api/users/google-login
 * @desc Verify Google idToken from Flutter & login/register user
 */
router.post("/google-login", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    logger.warn("Missing idToken in Google login attempt", {
      ip: req.ip,
    });
    return res.status(400).json({ error: "Missing idToken" });
  }

  try {
    // verify token กับ Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub; // unique Google user id
    const email = payload.email;
    const name = payload.name;

    // ตรวจสอบว่าผู้ใช้มีอยู่ใน DB หรือยัง
    let user = await User.findOne({ email });

    if (!user) {
      // ถ้าไม่มี → สร้าง user ใหม่
      user = new User({
        firstname: name.split(" ")[0],
        lastname: name.split(" ")[1] || "",
        email,
        username: email,
        password: null, // OAuth user ไม่มี password
        role: "pet-owner", // default role
        privacyConsent: {
          accepted: true,
          acceptedAt: new Date(),
          policyVersion: POLICY_VERSION || "v1.0",
        },
      });

      await user.save();
    }

    // สร้าง JWT ของระบบเอง
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    logger.info("User logged in via Google", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
    });

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error("Google login error", {
      error: err.message,
      stack: err.stack,
      ip: req.ip,
    });
    res.status(401).json({ error: "Invalid idToken" });
  }
});

module.exports = router;
