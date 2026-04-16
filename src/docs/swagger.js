import swaggerUi from "swagger-ui-express";

const staffApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Watermelon Room Service Staff API",
    version: "1.0.0",
    description: "Interactive documentation for the authenticated staff management API.",
  },
  servers: [{ url: "/" }],
  tags: [
    {
      name: "Staff",
      description: "Authenticated staff CRUD operations.",
    },
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
      StaffUser: {
        type: "object",
        required: [
          "id",
          "firstName",
          "lastName",
          "birthday",
          "phoneNumber",
          "mailAddress",
          "role",
          "dateStart",
          "completedRequest",
        ],
        properties: {
          id: { type: "integer", example: 3 },
          firstName: { type: "string", maxLength: 20, example: "Laura" },
          lastName: { type: "string", maxLength: 20, example: "Stone" },
          birthday: {
            type: "string",
            format: "date",
            nullable: true,
            example: "1992-07-11",
          },
          phoneNumber: {
            type: "string",
            nullable: true,
            maxLength: 15,
            example: "+37060012345",
          },
          mailAddress: {
            type: "string",
            format: "email",
            maxLength: 100,
            example: "laura@hotel.local",
          },
          role: {
            type: "string",
            maxLength: 20,
            enum: ["manager", "front_desk", "housekeeping", "room_service", "maintenance"],
            example: "manager",
          },
          dateStart: {
            type: "string",
            format: "date",
            example: "2025-01-15",
          },
          completedRequest: {
            type: "integer",
            minimum: 0,
            example: 42,
          },
        },
      },
      StaffCreateRequest: {
        type: "object",
        required: [
          "firstName",
          "lastName",
          "mailAddress",
          "role",
          "dateStart",
          "completedRequest",
          "password",
        ],
        properties: {
          firstName: { type: "string", maxLength: 20, example: "Laura" },
          lastName: { type: "string", maxLength: 20, example: "Stone" },
          birthday: {
            type: "string",
            format: "date",
            nullable: true,
            example: "1992-07-11",
          },
          phoneNumber: {
            type: "string",
            nullable: true,
            maxLength: 15,
            example: "+37060012345",
          },
          mailAddress: {
            type: "string",
            format: "email",
            maxLength: 100,
            example: "laura@hotel.local",
          },
          role: {
            type: "string",
            maxLength: 20,
            enum: ["manager", "front_desk", "housekeeping", "room_service", "maintenance"],
            example: "manager",
          },
          dateStart: {
            type: "string",
            format: "date",
            example: "2025-01-15",
          },
          completedRequest: {
            type: "integer",
            minimum: 0,
            example: 0,
          },
          password: {
            type: "string",
            minLength: 6,
            maxLength: 72,
            example: "securePass123",
          },
        },
      },
      StaffUpdateRequest: {
        allOf: [{ $ref: "#/components/schemas/StaffCreateRequest" }],
        description: "Same as create, but password is optional when updating an existing staff user.",
        required: ["firstName", "lastName", "mailAddress", "role", "dateStart", "completedRequest"],
      },
      StaffListResponse: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/StaffUser" },
          },
        },
      },
      StaffItemResponse: {
        type: "object",
        required: ["item"],
        properties: {
          item: { $ref: "#/components/schemas/StaffUser" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error", "statusCode"],
        properties: {
          error: { type: "string", example: "Invalid staff payload" },
          statusCode: { type: "integer", example: 400 },
        },
      },
    },
  },
  paths: {
    "/api/staff": {
      get: {
        tags: ["Staff"],
        summary: "List staff users",
        security: [{ sessionCookie: [] }],
        responses: {
          200: {
            description: "Staff users returned successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StaffListResponse" },
              },
            },
          },
          401: {
            description: "Missing or invalid session cookie.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Authenticated user is not a staff user.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Staff"],
        summary: "Create a staff user",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StaffCreateRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Staff user created successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StaffItemResponse" },
              },
            },
          },
          400: {
            description: "Payload validation failed.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Missing or invalid session cookie.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Authenticated user is not a staff user.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          409: {
            description: "A staff user with the same email already exists.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/staff/{staffId}": {
      put: {
        tags: ["Staff"],
        summary: "Update a staff user",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "staffId",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "Staff user identifier.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StaffUpdateRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Staff user updated successfully.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StaffItemResponse" },
              },
            },
          },
          400: {
            description: "Path or body validation failed.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Missing or invalid session cookie.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Authenticated user is not a staff user.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "Staff user was not found.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          409: {
            description: "A staff user with the same email already exists.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Staff"],
        summary: "Delete a staff user",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "staffId",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "Staff user identifier.",
          },
        ],
        responses: {
          204: {
            description: "Staff user deleted successfully.",
          },
          400: {
            description: "Invalid staff id or self-delete attempt.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Missing or invalid session cookie.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Authenticated user is not a staff user.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "Staff user was not found.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
};

export function registerSwagger(app) {
  app.get("/docs/staff.json", (req, res) => {
    res.json(staffApiSpec);
  });

  app.use("/docs/staff", swaggerUi.serve, swaggerUi.setup(staffApiSpec, { customSiteTitle: "Staff API Docs" }));
}
