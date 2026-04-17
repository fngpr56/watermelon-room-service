const staffRoles = ["manager", "front_desk", "housekeeping", "room_service", "maintenance", "attendant"];

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Watermelon Room Service API",
    version: "1.0.0",
    description: "Interactive documentation for the authenticated staff and room management APIs.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Staff", description: "Authenticated staff CRUD operations." },
    { name: "Rooms", description: "Authenticated room CRUD operations." },
    { name: "Inventory", description: "Stock and inventory management." },
    { name: "Requests", description: "Room service requests." },
    { name: "Stocktaking", description: "Inventory stocktaking and audits." }
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "wrs_session",
        description: "Signed HTTP-only session cookie returned by POST /api/auth/login.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error", "statusCode"],
        properties: {
          error: { type: "string", example: "Invalid staff payload" },
          statusCode: { type: "integer", example: 400 },
        },
      },
      StaffUser: {
        type: "object",
        required: ["id", "firstName", "lastName", "birthday", "phoneNumber", "mailAddress", "role", "dateStart", "completedRequest"],
        properties: {
          id: { type: "integer", example: 3 },
          firstName: { type: "string", example: "Laura" },
          lastName: { type: "string", example: "Johnson" },
          birthday: { type: "string", format: "date", nullable: true, example: "1992-06-15" },
          phoneNumber: { type: "string", nullable: true, example: "+3725551001" },
          mailAddress: { type: "string", format: "email", example: "laura@watermelonhotel.com" },
          role: { type: "string", enum: staffRoles, example: "front_desk" },
          dateStart: { type: "string", format: "date", example: "2023-01-10" },
          completedRequest: { type: "integer", minimum: 0, example: 120 },
        },
      },
      StaffCreateRequest: {
        type: "object",
        required: ["firstName", "lastName", "mailAddress", "role", "dateStart", "completedRequest", "password"],
        properties: {
          firstName: { type: "string", maxLength: 20 },
          lastName: { type: "string", maxLength: 20 },
          birthday: { type: "string", format: "date", nullable: true },
          phoneNumber: { type: "string", nullable: true, maxLength: 15 },
          mailAddress: { type: "string", format: "email", maxLength: 100 },
          role: { type: "string", enum: staffRoles },
          dateStart: { type: "string", format: "date" },
          completedRequest: { type: "integer", minimum: 0 },
          password: { type: "string", minLength: 6, maxLength: 72 },
        },
      },
      StaffUpdateRequest: {
        allOf: [{ $ref: "#/components/schemas/StaffCreateRequest" }],
        required: ["firstName", "lastName", "mailAddress", "role", "dateStart", "completedRequest"],
      },
      StaffListResponse: {
        type: "object",
        required: ["items"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/StaffUser" } },
        },
      },
      StaffItemResponse: {
        type: "object",
        required: ["item"],
        properties: {
          item: { $ref: "#/components/schemas/StaffUser" },
        },
      },
      Room: {
        type: "object",
        required: ["id", "roomNumber", "owner", "dateIn", "dateOut"],
        properties: {
          id: { type: "integer", example: 4 },
          roomNumber: { type: "integer", example: 204 },
          owner: { type: "string", nullable: true, example: "Emily Brown" },
          dateIn: { type: "string", nullable: true, example: "2026-04-16T16:00" },
          dateOut: { type: "string", nullable: true, example: "2026-04-22T11:00" },
        },
      },
      RoomCreateRequest: {
        type: "object",
        required: ["roomNumber", "password"],
        properties: {
          roomNumber: { type: "integer", minimum: 1, example: 204 },
          owner: { type: "string", nullable: true, maxLength: 70 },
          dateIn: { type: "string", nullable: true, example: "2026-04-16T16:00" },
          dateOut: { type: "string", nullable: true, example: "2026-04-22T11:00" },
          password: { type: "string", minLength: 6, maxLength: 72 },
        },
      },
      RoomUpdateRequest: {
        allOf: [{ $ref: "#/components/schemas/RoomCreateRequest" }],
        required: ["roomNumber"],
      },
      RoomListResponse: {
        type: "object",
        required: ["items"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Room" } },
        },
      },
      RoomItemResponse: {
        type: "object",
        required: ["item"],
        properties: {
          item: { $ref: "#/components/schemas/Room" },
        },
      },
      InventoryItem: {
      type: "object",
      required: [
        "id",
        "name",
        "category",
        "unit",
        "quantityInStock",
        "quantityReserved",
        "lowStockThreshold"
      ],
      properties: {
        id: { type: "integer", example: 1 },
        name: { type: "string", example: "Water bottle" },
        category: { type: "string", example: "drinks" },
        unit: { type: "string", example: "pcs" },
        quantityInStock: { type: "integer", example: 120 },
        quantityReserved: { type: "integer", example: 10 },
        lowStockThreshold: { type: "integer", example: 5 },
      },
      },

    InventoryListResponse: {
    type: "object",
    required: ["items"],
    properties: {
        items: {
        type: "array",
        items: { $ref: "#/components/schemas/InventoryItem" }
        }
    }
    },

    InventoryItemResponse: {
    type: "object",
    required: ["item"],
    properties: {
        item: { $ref: "#/components/schemas/InventoryItem" }
    }
    },

    InventoryCreateRequest: {
    type: "object",
    required: ["name", "category", "unit", "quantityInStock"],
    properties: {
        name: { type: "string", maxLength: 100 },
        category: { type: "string", maxLength: 50 },
        unit: { type: "string", maxLength: 30 },

        quantityInStock: { type: "integer", minimum: 0 },

        quantityReserved: {
        type: "integer",
        minimum: 0,
        nullable: true,
        example: 0
        },

        lowStockThreshold: {
        type: "integer",
        minimum: 0,
        nullable: true,
        example: 5
        }
    }
    },

    InventoryUpdateRequest: {
    allOf: [
        { $ref: "#/components/schemas/InventoryCreateRequest" }
    ],
    required: ["name", "category", "unit", "quantityInStock"]
    },
  Request: {
    type: "object",
    required: ["id", "roomId", "fullRequest", "statusId"],
    properties: {
      id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
      roomId: { type: "integer", example: 204 },
      staffId: { type: "integer", nullable: true, example: 3 },
      fullRequest: { type: "string", example: "2 towels and 1 water bottle" },
      category: { type: "string", nullable: true, example: "housekeeping" },
      statusId: { type: "integer", example: 1 },
      notes: { type: "string", nullable: true, example: "Leave at the door" },
      requestDate: { type: "string", example: "2026-04-17T12:30:00" },
      completeDate: { type: "string", nullable: true, example: null }
    },
    example: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      roomId: 204,
      staffId: 3,
      fullRequest: "2 towels and 1 water bottle",
      category: "housekeeping",
      statusId: 1,
      notes: "Leave at the door",
      requestDate: "2026-04-17T12:30:00",
      completeDate: null
    }
  },
  StocktakingEntry: {
  type: "object",
  required: [
    "id",
    "inventoryItemId",
    "expectedCount",
    "physicalCount",
    "discrepancy",
    "createdAt"
  ],
  properties: {
    id: {
      type: "integer",
      example: 1
    },

    inventoryItemId: {
      type: "integer",
      example: 5
    },

    expectedCount: {
      type: "integer",
      minimum: 0,
      example: 100
    },

    physicalCount: {
      type: "integer",
      minimum: 0,
      example: 95
    },

    discrepancy: {
      type: "integer",
      example: -5
    },

    reason: {
      type: "string",
      nullable: true,
      enum: ["damaged", "theft", "miscounted", "supplier_error"],
      example: "miscounted"
    },

    createdAt: {
      type: "string",
      format: "date-time",
      example: "2026-04-17T12:00:00Z"
    }
  }
},

StocktakingListResponse: {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        $ref: "#/components/schemas/StocktakingEntry"
      }
    }
  }
},

StocktakingItemResponse: {
  type: "object",
  required: ["item"],
  properties: {
    item: {
      $ref: "#/components/schemas/StocktakingEntry"
    }
  }
},

StocktakingCreateRequest: {
  type: "object",
  required: ["inventoryItemId", "expectedCount", "physicalCount"],
  properties: {
    inventoryItemId: {
      type: "integer",
      example: 5
    },

    expectedCount: {
      type: "integer",
      minimum: 0,
      example: 100
    },

    physicalCount: {
      type: "integer",
      minimum: 0,
      example: 95
    },

    reason: {
      type: "string",
      nullable: true,
      enum: ["damaged", "theft", "miscounted", "supplier_error"],
      example: "damaged"
    }
  }
},

StocktakingUpdateRequest: {
  allOf: [
    {
      $ref: "#/components/schemas/StocktakingCreateRequest"
    }
  ],
  required: [
    "inventoryItemId",
    "expectedCount",
    "physicalCount"
  ]
}
    },
    
  },
  paths: {
    "/api/staff": {
      get: {
        tags: ["Staff"],
        summary: "List staff users",
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: "Staff users returned successfully.", content: { "application/json": { schema: { $ref: "#/components/schemas/StaffListResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Staff"],
        summary: "Create a staff user",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StaffCreateRequest" } } } },
        responses: {
          201: { description: "Staff user created successfully.", content: { "application/json": { schema: { $ref: "#/components/schemas/StaffItemResponse" } } } },
          400: { description: "Payload validation failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "A staff user with the same email already exists.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/staff/{staffId}": {
      put: {
        tags: ["Staff"],
        summary: "Update a staff user",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "staffId", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StaffUpdateRequest" } } } },
        responses: {
          200: { description: "Staff user updated successfully.", content: { "application/json": { schema: { $ref: "#/components/schemas/StaffItemResponse" } } } },
          400: { description: "Path or body validation failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Staff user was not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "A staff user with the same email already exists.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Staff"],
        summary: "Delete a staff user",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "staffId", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: {
          204: { description: "Staff user deleted successfully." },
          400: { description: "Invalid staff id or self-delete attempt.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Staff user was not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "List rooms",
        security: [{ sessionCookie: [] }],
        responses: {
          200: { description: "Rooms returned successfully.", content: { "application/json": { schema: { $ref: "#/components/schemas/RoomListResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      post: {
        tags: ["Rooms"],
        summary: "Create a room",
        security: [{ sessionCookie: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RoomCreateRequest" } } } },
        responses: {
          201: { description: "Room created successfully.", content: { "application/json": { schema: { $ref: "#/components/schemas/RoomItemResponse" } } } },
          400: { description: "Payload validation failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "A room with the same room number already exists.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/rooms/{roomId}": {
      put: {
        tags: ["Rooms"],
        summary: "Update a room",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "roomId", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RoomUpdateRequest" } } } },
        responses: {
          200: { description: "Room updated successfully.", content: { "application/json": { schema: { $ref: "#/components/schemas/RoomItemResponse" } } } },
          400: { description: "Path or body validation failed.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Room was not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "A room with the same room number already exists.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["Rooms"],
        summary: "Delete a room",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "roomId", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
        responses: {
          204: { description: "Room deleted successfully." },
          400: { description: "Invalid room id.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          401: { description: "Missing or invalid session cookie.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Authenticated user is not a staff user.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          404: { description: "Room was not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/inventory": {
    get: {
        tags: ["Inventory"],
        summary: "List inventory items",
        security: [{ sessionCookie: [] }],
        responses: {
        200: {
            description: "Inventory list returned successfully.",
            content: {
            "application/json": {
                schema: {
                $ref: "#/components/schemas/InventoryListResponse"
                }
            }
            }
        },
        401: {
            description: "Missing or invalid session cookie.",
            content: {
            "application/json": {
                schema: {
                $ref: "#/components/schemas/ErrorResponse"
                }
            }
            }
        },
        403: {
            description: "Not authorized.",
            content: {
            "application/json": {
                schema: {
                $ref: "#/components/schemas/ErrorResponse"
                }
            }
            }
        }
        }
    },

    post: {
        tags: ["Inventory"],
        summary: "Create inventory item",
        security: [{ sessionCookie: [] }],
        requestBody: {
        required: true,
        content: {
            "application/json": {
            schema: {
                $ref: "#/components/schemas/InventoryCreateRequest"
            }
            }
        }
        },
        responses: {
        201: {
            description: "Inventory item created successfully.",
            content: {
            "application/json": {
                schema: {
                $ref: "#/components/schemas/InventoryItemResponse"
                }
            }
            }
        },
        400: {
            description: "Validation error.",
            content: {
            "application/json": {
                schema: {
                $ref: "#/components/schemas/ErrorResponse"
                }
            }
            }
        },
        409: {
            description: "Inventory item with this name already exists.",
            content: {
            "application/json": {
                schema: {
                $ref: "#/components/schemas/ErrorResponse"
                }
            }
            }
        }
        }
    }
    },
    "/api/inventory/{inventoryId}": {
  put: {
    tags: ["Inventory"],
    summary: "Update inventory item",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "inventoryId",
        in: "path",
        required: true,
        schema: {
          type: "integer",
          minimum: 1
        }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/InventoryUpdateRequest"
          }
        }
      }
    },
    responses: {
      200: {
        description: "Inventory item updated successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/InventoryItemResponse"
            }
          }
        }
      },
      400: {
        description: "Invalid input.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      404: {
        description: "Inventory item not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },

  delete: {
    tags: ["Inventory"],
    summary: "Delete inventory item",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "inventoryId",
        in: "path",
        required: true,
        schema: {
          type: "integer",
          minimum: 1
        }
      }
    ],
    responses: {
      204: {
        description: "Inventory item deleted successfully."
      },
      404: {
        description: "Inventory item not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  }
},
"/api/inventory/{inventoryId}": {
  put: {
    tags: ["Inventory"],
    summary: "Update inventory item",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "inventoryId",
        in: "path",
        required: true,
        schema: {
          type: "integer",
          minimum: 1
        }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/InventoryUpdateRequest"
          }
        }
      }
    },
    responses: {
      200: {
        description: "Inventory item updated successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/InventoryItemResponse"
            }
          }
        }
      },
      400: {
        description: "Invalid input.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      404: {
        description: "Inventory item not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },

  delete: {
    tags: ["Inventory"],
    summary: "Delete inventory item",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "inventoryId",
        in: "path",
        required: true,
        schema: {
          type: "integer",
          minimum: 1
        }
      }
    ],
    responses: {
      204: {
        description: "Inventory item deleted successfully."
      },
      404: {
        description: "Inventory item not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  }
},
"/api/requests": {
  get: {
    tags: ["Requests"],
    summary: "List requests",
    security: [{ sessionCookie: [] }],
    responses: {
      200: {
        description: "Requests returned successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RequestListResponse"
            }
          }
        }
      },
      401: {
        description: "Missing or invalid session cookie.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      403: {
        description: "Authenticated user is not a staff user.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },

  post: {
    tags: ["Requests"],
    summary: "Create a request",
    security: [{ sessionCookie: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
        schema: {
        $ref: "#/components/schemas/Request"
        }
        }
      }
    },
    responses: {
      201: {
        description: "Request created successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RequestItemResponse"
            }
          }
        }
      },
      400: {
        description: "Payload validation failed.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      401: {
        description: "Missing or invalid session cookie.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      403: {
        description: "Authenticated user is not a staff user.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  }
},

"/api/requests/{requestId}": {
  put: {
    tags: ["Requests"],
    summary: "Update a request",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "requestId",
        in: "path",
        required: true,
        schema: {
        $ref: "#/components/schemas/Request"
        }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/RequestUpdateRequest"
          }
        }
      }
    },
    responses: {
      200: {
        description: "Request updated successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RequestItemResponse"
            }
          }
        }
      },
      400: {
        description: "Path or body validation failed.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      401: {
        description: "Missing or invalid session cookie.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      403: {
        description: "Authenticated user is not a staff user.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      404: {
        description: "Request was not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },

  delete: {
    tags: ["Requests"],
    summary: "Delete a request",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "requestId",
        in: "path",
        required: true,
        schema: {
        $ref: "#/components/schemas/Request"
        }
      }
    ],
    responses: {
      204: {
        description: "Request deleted successfully."
      },
      400: {
        description: "Invalid request id.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      401: {
        description: "Missing or invalid session cookie.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      403: {
        description: "Authenticated user is not a staff user.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      404: {
        description: "Request was not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  }
},
"/api/stocktaking": {
  get: {
    tags: ["Stocktaking"],
    summary: "List stocktaking entries",
    security: [{ sessionCookie: [] }],
    responses: {
      200: {
        description: "Stocktaking entries returned successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/StocktakingListResponse"
            }
          }
        }
      },
      401: {
        description: "Missing or invalid session cookie.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      403: {
        description: "Authenticated user is not a staff user.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },

  post: {
    tags: ["Stocktaking"],
    summary: "Create stocktaking entry",
    security: [{ sessionCookie: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/StocktakingCreateRequest"
          }
        }
      }
    },
    responses: {
      201: {
        description: "Stocktaking entry created successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/StocktakingItemResponse"
            }
          }
        }
      },
      400: {
        description: "Validation error.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      401: {
        description: "Missing or invalid session cookie.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      403: {
        description: "Authenticated user is not a staff user.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  }
},

"/api/stocktaking/{id}": {
  put: {
    tags: ["Stocktaking"],
    summary: "Update stocktaking entry",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: {
          type: "integer",
          minimum: 1
        }
      }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/StocktakingUpdateRequest"
          }
        }
      }
    },
    responses: {
      200: {
        description: "Stocktaking entry updated successfully.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/StocktakingItemResponse"
            }
          }
        }
      },
      400: {
        description: "Invalid input.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      },
      404: {
        description: "Stocktaking entry not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },

  delete: {
    tags: ["Stocktaking"],
    summary: "Delete stocktaking entry",
    security: [{ sessionCookie: [] }],
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: {
          type: "integer",
          minimum: 1
        }
      }
    ],
    responses: {
      204: {
        description: "Stocktaking entry deleted successfully."
      },
      404: {
        description: "Stocktaking entry not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  }
}
  },
};