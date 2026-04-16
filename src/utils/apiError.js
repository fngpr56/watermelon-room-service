/**
 * Standard API error with HTTP status code.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}