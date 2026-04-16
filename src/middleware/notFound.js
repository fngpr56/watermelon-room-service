/**
 * Handles unknown routes.
 */
export function notFound(req, res) {
  if (req.accepts("html")) {
    return res.redirect("/login");
  }

  res.status(404).json({
    error: "Route not found",
    statusCode: 404,
  });
}