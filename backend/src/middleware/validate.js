/*
 * Validation middleware shared by route files.
 * This file collects express-validator results after route-specific validation
 * rules run. If validation fails, it stops the request and returns a 422 error.
 */

// Reads validation errors accumulated by express-validator rules on the route.
const { validationResult } = require('express-validator');
// Wraps validation failures in the application's standard error shape.
const HttpError = require('../utils/httpError');

// Sends a 422 response when request body or params do not match route requirements.
function validate(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  next(new HttpError(422, 'Validation failed.', result.array()));
}

// Exports a single middleware function reused by multiple route definitions.
module.exports = validate;
