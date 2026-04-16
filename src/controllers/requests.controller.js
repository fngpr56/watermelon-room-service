/**
 * Placeholder: list all requests for staff dashboard.
 */
export async function getRequests(req, res) {
  res.json({
    items: [],
  });
}

/**
 * Placeholder: create a new guest request.
 */
export async function createRequest(req, res) {
  res.status(201).json({
    message: "Request endpoint scaffolded",
  });
}