/**
 * HTTP handlers for the runner request queue and its accept/decline/complete actions.
 */
import { ApiError } from "../utils/apiError.js";
import {
  emitInventoryUpdated,
  emitReceptionistOverviewUpdated,
  emitRunnerRequestUpdated,
} from "../sockets/index.js";
import {
  acceptRunnerRequest,
  completeRunnerRequest,
  declineRunnerRequest,
  listRunnerRequests,
} from "../services/runner.service.js";

function parseRequestId(value) {
  const requestId = String(value || "").trim();

  if (!requestId) {
    throw new ApiError(400, "Invalid runner request id");
  }

  return requestId;
}

function mapDbError(error) {
  if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146 || error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054) {
    return new ApiError(409, "Database schema is out of date. Run sql/migrate_inventory_assignments.sql.");
  }

  return error;
}

export async function getRunnerQueue(req, res, next) {
  try {
    const items = await listRunnerRequests();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function acceptRunnerQueueRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.requestId);
    const item = await acceptRunnerRequest(requestId, req.session);
    emitRunnerRequestUpdated({ requestId, changeType: "runner-request-accepted" });
    emitReceptionistOverviewUpdated({ requestId, changeType: "runner-request-accepted" });
    res.json({ item });
  } catch (error) {
    next(mapDbError(error));
  }
}

export async function declineRunnerQueueRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.requestId);
    const item = await declineRunnerRequest(requestId, req.session);
    emitRunnerRequestUpdated({ requestId, changeType: "runner-request-declined" });
    emitInventoryUpdated({ requestId, changeType: "runner-request-declined" });
    emitReceptionistOverviewUpdated({ requestId, changeType: "runner-request-declined" });
    res.json({ item });
  } catch (error) {
    next(mapDbError(error));
  }
}

export async function completeRunnerQueueRequest(req, res, next) {
  try {
    const requestId = parseRequestId(req.params.requestId);
    const item = await completeRunnerRequest(requestId, req.session);
    emitRunnerRequestUpdated({ requestId, changeType: "runner-request-completed" });
    emitInventoryUpdated({ requestId, changeType: "runner-request-completed" });
    emitReceptionistOverviewUpdated({ requestId, changeType: "runner-request-completed" });
    res.json({ item });
  } catch (error) {
    next(mapDbError(error));
  }
}