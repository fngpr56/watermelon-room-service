/**
 * Handles unknown routes.
 */
export function notFound(req, res) {
  res.status(404).json({
    error: "Route not found",
    statusCode: 404,
  });
}