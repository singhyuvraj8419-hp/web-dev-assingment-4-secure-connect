// src/middleware/validateInput.js

/**
 * Standard email format validator.
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email) && email.length <= 100;
}

/**
 * Validates signup payload: username, email, password.
 */
function validateSignup(req, res, next) {
  const { username, email, password } = req.body || {};

  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: { message: 'Username is required and must be a string.' },
    });
  }

  const usernameTrimmed = username.trim();
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  if (!usernameRegex.test(usernameTrimmed)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Username must be between 3 and 30 characters and contain only letters, numbers, and underscores.',
      },
    });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: { message: 'A valid email address is required.' },
    });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      error: { message: 'Password is required and must be at least 8 characters long.' },
    });
  }

  if (password.length > 128) {
    return res.status(400).json({
      success: false,
      error: { message: 'Password must not exceed 128 characters.' },
    });
  }

  // Sanitize trimmed values back to req.body
  req.body.username = usernameTrimmed;
  req.body.email = email.trim().toLowerCase();

  next();
}

/**
 * Validates login payload: email and password.
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Email is required.' },
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: { message: 'Password is required.' },
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

/**
 * Validates note creation payload: title and content.
 */
function validateNoteCreate(req, res, next) {
  const { title, content } = req.body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Note title is required and must not be empty.' },
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({
      success: false,
      error: { message: 'Note title must not exceed 200 characters.' },
    });
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Note content is required and must not be empty.' },
    });
  }

  if (content.trim().length > 10000) {
    return res.status(400).json({
      success: false,
      error: { message: 'Note content must not exceed 10,000 characters.' },
    });
  }

  req.body.title = title.trim();
  req.body.content = content.trim();

  next();
}

/**
 * Validates note update payload: at least one of title or content.
 */
function validateNoteUpdate(req, res, next) {
  const { title, content } = req.body || {};

  const hasTitle = typeof title === 'string';
  const hasContent = typeof content === 'string';

  if (!hasTitle && !hasContent) {
    return res.status(400).json({
      success: false,
      error: { message: 'At least one field (title or content) must be provided for update.' },
    });
  }

  if (hasTitle) {
    if (!title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Note title cannot be blank.' },
      });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        error: { message: 'Note title must not exceed 200 characters.' },
      });
    }
    req.body.title = title.trim();
  }

  if (hasContent) {
    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Note content cannot be blank.' },
      });
    }
    if (content.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        error: { message: 'Note content must not exceed 10,000 characters.' },
      });
    }
    req.body.content = content.trim();
  }

  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateNoteCreate,
  validateNoteUpdate,
};
