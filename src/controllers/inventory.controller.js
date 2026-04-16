import { z } from "zod";
import { ApiError } from "../utils/apiError.js";

import {
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
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
const createInventorySchema = baseInventorySchema;

const updateInventorySchema = baseInventorySchema.partial();

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

/**
 * DB ERROR MAPPER
 */
function mapDbError(error) {
  if (error?.code === "ER_DUP_ENTRY") {
    return new ApiError(409, "Inventory item with this name already exists");
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

/**
 * CREATE
 */
export async function createInventoryRecord(req, res, next) {
  try {
    const payload = createInventorySchema.parse(normalizePayload(req.body));

    const item = await createInventoryItem(payload);

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

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}