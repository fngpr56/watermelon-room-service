/**
 * HTTP handlers for inventory item CRUD and room assignment operations.
 */
import { z } from "zod";
import { ApiError } from "../utils/apiError.js";
import { emitInventoryUpdated, emitReceptionistOverviewUpdated } from "../sockets/index.js";

import {
  assignInventoryToRoom,
  createInventoryItem,
  deleteInventoryAssignment,
  deleteInventoryItem,
  listInventoryAssignments,
  listInventoryItems,
  updateInventoryAssignment,
  updateInventoryItem,
} from "../services/inventory.service.js";

/**
 * BASE SCHEMA
 */
const baseInventorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  unit: z.string().trim().min(1).max(30),

  quantityInStock: z.number().int().min(0),
  quantityReserved: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

/**
 * CREATE / UPDATE
 */
const createInventorySchema = baseInventorySchema.refine(
  (payload) => payload.quantityReserved <= payload.quantityInStock,
  {
    message: "Reserved quantity cannot exceed stock quantity",
    path: ["quantityReserved"],
  }
);

const updateInventorySchema = baseInventorySchema.partial();

const inventoryAssignmentSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  roomId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  status: z.enum(["started", "in_progress", "completed"]),
  notes: z.string().trim().max(255).nullable().optional(),
});

/**
 * ID PARSER
 */
function parseInventoryId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Invalid inventory item id");
  }

  return id;
}

function parseAssignmentId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Invalid inventory assignment id");
  }

  return id;
}

/**
 * NORMALIZER
 */
function normalizePayload(body) {
  return {
    name: body?.name ? String(body.name).trim() : undefined,
    category: body?.category ? String(body.category).trim() : undefined,
    unit: body?.unit ? String(body.unit).trim() : undefined,

    quantityInStock:
      body?.quantityInStock !== undefined
        ? Number(body.quantityInStock)
        : undefined,

    quantityReserved:
      body?.quantityReserved !== undefined
        ? Number(body.quantityReserved)
        : undefined,

    lowStockThreshold:
      body?.lowStockThreshold !== undefined
        ? Number(body.lowStockThreshold)
        : undefined,
  };
}

function normalizeAssignmentPayload(body) {
  return {
    inventoryItemId: Number(body?.inventoryItemId),
    roomId: Number(body?.roomId),
    quantity: Number(body?.quantity),
    status: body?.status ? String(body.status).trim() : "started",
    notes: body?.notes ? String(body.notes).trim() : null,
  };
}

/**
 * DB ERROR MAPPER
 */
function mapDbError(error) {
  if (error?.code === "ER_DUP_ENTRY") {
    return new ApiError(409, "Inventory item with this name already exists");
  }

  if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146 || error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054) {
    return new ApiError(409, "Database schema is out of date. Run sql/migrate_inventory_assignments.sql.");
  }

  if (error?.code === "ER_ROW_IS_REFERENCED_2") {
    return new ApiError(409, "Inventory item cannot be deleted while it is referenced by requests, assignments, or transactions");
  }

  return error;
}

/**
 * LIST
 */
export async function getInventory(req, res, next) {
  try {
    const items = await listInventoryItems();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryAssignments(req, res, next) {
  try {
    const items = await listInventoryAssignments();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

/**
 * CREATE
 */
export async function createInventoryRecord(req, res, next) {
  try {
    const payload = createInventorySchema.parse(normalizePayload(req.body));

    const item = await createInventoryItem(payload);
    emitInventoryUpdated({ inventoryItemId: item.id, changeType: "item-created" });
    emitReceptionistOverviewUpdated({ inventoryItemId: item.id, changeType: "inventory-item-created" });

    res.status(201).json({ item });
  } catch (error) {
    next(
      error.name === "ZodError"
        ? new ApiError(400, "Invalid inventory payload")
        : mapDbError(error)
    );
  }
}

/**
 * UPDATE
 */
export async function updateInventoryRecord(req, res, next) {
  try {
    const id = parseInventoryId(req.params.inventoryId);

    const payload = updateInventorySchema.parse(normalizePayload(req.body));

    const item = await updateInventoryItem(id, payload);
    emitInventoryUpdated({ inventoryItemId: item.id, changeType: "item-updated" });
    emitReceptionistOverviewUpdated({ inventoryItemId: item.id, changeType: "inventory-item-updated" });

    res.json({ item });
  } catch (error) {
    next(
      error.name === "ZodError"
        ? new ApiError(400, "Invalid inventory payload")
        : mapDbError(error)
    );
  }
}

/**
 * DELETE
 */
export async function removeInventory(req, res, next) {
  try {
    const id = parseInventoryId(req.params.inventoryId);

    await deleteInventoryItem(id);
    emitInventoryUpdated({ inventoryItemId: id, changeType: "item-deleted" });
    emitReceptionistOverviewUpdated({ inventoryItemId: id, changeType: "inventory-item-deleted" });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createInventoryAssignmentRecord(req, res, next) {
  try {
    const payload = inventoryAssignmentSchema.parse(normalizeAssignmentPayload(req.body));
    const item = await assignInventoryToRoom(payload, req.session);
    emitInventoryUpdated({
      inventoryItemId: item.inventoryItem.id,
      roomId: item.room.id,
      assignmentId: item.id,
      changeType: "assignment-created",
    });
    emitReceptionistOverviewUpdated({
      inventoryItemId: item.inventoryItem.id,
      roomId: item.room.id,
      assignmentId: item.id,
      changeType: "inventory-assignment-created",
    });
    res.status(201).json({ item });
  } catch (error) {
    next(
      error.name === "ZodError"
        ? new ApiError(400, "Invalid inventory assignment payload")
        : mapDbError(error)
    );
  }
}

export async function updateInventoryAssignmentRecord(req, res, next) {
  try {
    const assignmentId = parseAssignmentId(req.params.assignmentId);
    const payload = inventoryAssignmentSchema.parse(normalizeAssignmentPayload(req.body));
    const item = await updateInventoryAssignment(assignmentId, payload, req.session);
    emitInventoryUpdated({
      inventoryItemId: item.inventoryItem.id,
      roomId: item.room.id,
      assignmentId: item.id,
      changeType: "assignment-updated",
    });
    emitReceptionistOverviewUpdated({
      inventoryItemId: item.inventoryItem.id,
      roomId: item.room.id,
      assignmentId: item.id,
      changeType: "inventory-assignment-updated",
    });
    res.json({ item });
  } catch (error) {
    next(
      error.name === "ZodError"
        ? new ApiError(400, "Invalid inventory assignment payload")
        : mapDbError(error)
    );
  }
}

export async function removeInventoryAssignmentRecord(req, res, next) {
  try {
    const assignmentId = parseAssignmentId(req.params.assignmentId);
    const item = await deleteInventoryAssignment(assignmentId, req.session);
    emitInventoryUpdated({
      inventoryItemId: item.inventoryItem.id,
      roomId: item.room.id,
      assignmentId: item.id,
      changeType: "assignment-deleted",
    });
    emitReceptionistOverviewUpdated({
      inventoryItemId: item.inventoryItem.id,
      roomId: item.room.id,
      assignmentId: item.id,
      changeType: "inventory-assignment-deleted",
    });
    res.status(204).send();
  } catch (error) {
    next(mapDbError(error));
  }
}