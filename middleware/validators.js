const { body, param, validationResult } = require("express-validator");

// Middleware ตรวจ validation errors
const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// Signup validation
const signupValidation = [
  body("firstname")
    .trim()
    .isString()
    .isLength({ min: 1, max: 50 })
    .escape()
    .withMessage("First name must be 1-50 characters"),
  
  body("lastname")
    .trim()
    .isString()
    .isLength({ min: 1, max: 50 })
    .escape()
    .withMessage("Last name must be 1-50 characters"),
  
  body("username")
    .trim()
    .isString()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Username must be alphanumeric with _ or -"),
  
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email format"),
  
  body("password")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters"),
  
  body("phone")
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .isLength({ max: 20 })
    .withMessage("Invalid phone format"),
  
  body("role")
    .isIn(["expert", "pet-owner"])
    .withMessage("Invalid role"),
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email format"),
  
  body("password")
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("Password required"),
];

const createPetValidation = [
  body("name").notEmpty().withMessage("Pet name is required"),
  body("breed").notEmpty().withMessage("Breed is required"),
  body("gender")
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),
  body("species").notEmpty().withMessage("Species is required"),
  body("group_id").notEmpty().withMessage("group_id is required"),

  body("age_years")
    .isInt({ min: 0, max: 30 })
    .withMessage("age_years must be between 0–30"),

  body("age_months")
    .isInt({ min: 0, max: 11 })
    .withMessage("age_months must be between 0–11"),

  body("spay_neuter_status")
    .isBoolean()
    .withMessage("spay_neuter_status must be true or false"),
];

const addRecordValidator = [
  param("petId").isMongoId().withMessage("Invalid pet ID"),

  body("date").notEmpty().withMessage("Date is required"),
  body("bcs_score")
    .isInt({ min: 1, max: 9 })
    .withMessage("BCS score must be between 1–9"),

  body("weight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Weight must be a positive number"),

  // image URLs optional แต่ตรวจให้ปลอดภัยขึ้น
  body("front_image_url").optional().isString(),
  body("back_image_url").optional().isString(),
  body("left_image_url").optional().isString(),
  body("right_image_url").optional().isString(),
  body("top_image_url").optional().isString(),
];

const createGroupValidator = [
  body("group_name")
    .notEmpty()
    .withMessage("group_name is required")
    .isString()
    .withMessage("group_name must be a string"),
];

module.exports = {
  validate,
  signupValidation,
  loginValidation,
  createPetValidation,
  addRecordValidator,
  createGroupValidator,
};
