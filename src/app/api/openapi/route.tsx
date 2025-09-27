import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Invoice RAG API",
    version: "1.0.0",
    description: "APIs for invoice upload, parsing, metrics, and vector search",
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: [
    { name: "Health" },
    { name: "Setup" },
    { name: "Invoices" },
    { name: "Metrics" },
    { name: "Search" },
    { name: "Maintenance" }
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check for MongoDB",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" }}}},
          "500": { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }}}}
        }
      }
    },
    "/api/setup": {
      post: {
        tags: ["Setup"],
        summary: "Ensure DB, collection, validator, scalar indexes, and vector index",
        responses: {
          "200": { description: "Setup OK", content: { "application/json": { schema: { $ref: "#/components/schemas/OkMessage" }}}},
          "500": { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }}}}
        }
      }
    },
    "/api/invoices/batch": {
      post: {
        tags: ["Invoices"],
        summary: "Upload invoice images in batch; parse via GPT-4o-mini; dedupe; store with embeddings",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" }
                  }
                },
                required: ["files"]
              }
            }
          }
        },
        responses: {
          "200": { description: "Processed", content: { "application/json": { schema: { $ref: "#/components/schemas/BatchUploadResponse" }}}},
          "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }}}},
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }}}}
        }
      }
    },
    "/api/query": {
      post: {
        tags: ["Search"],
        summary: "Vector search with optional NL-derived or explicit structured filters",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QueryRequest" },
              examples: {
                nl: {
                  value: { query: "electronics under $100 in 2013", k: 10 }
                },
                explicit: {
                  value: {
                    query: "thin client computers",
                    k: 5,
                    filters: { amount: { "$lte": 100 }, date: { "$gte": "2013-01-01", "$lte": "2013-12-31" } }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Matches", content: { "application/json": { schema: { $ref: "#/components/schemas/QueryResponse" }}}},
          "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }}}},
          "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }}}}
        }
      }
    },
    "/api/metrics/categories": {
      get: {
        tags: ["Metrics"],
        summary: "Spend & counts grouped by category (Uncategorized handled)",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/CategoriesResponse" }}}}
        }
      }
    },
    "/api/metrics/recent": {
      get: {
        tags: ["Metrics"],
        summary: "Most recent invoices",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 10 }, required: false, description: "Number of invoices" }
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/RecentResponse" }}}}
        }
      }
    },
    "/api/metrics/total": {
      get: {
        tags: ["Metrics"],
        summary: "Total spent (sum of amounts)",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/TotalResponse" }}}}
        }
      }
    },
    "/api/metrics/count": {
      get: {
        tags: ["Metrics"],
        summary: "Total invoices processed",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/CountResponse" }}}}
        }
      }
    },
    "/api/metrics/timeseries": {
      get: {
        tags: ["Metrics"],
        summary: "Spend per month (YYYY-MM)",
        parameters: [
          { name: "months", in: "query", schema: { type: "integer", default: 12 }, required: false, description: "How many months back" }
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/TimeseriesResponse" }}}}
        }
      }
    },
    "/api/maintenance/backfill-category": {
      post: {
        tags: ["Maintenance"],
        summary: "Backfill category for docs missing it (best-effort categorize)",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/BackfillResponse" }}}}
        }
      }
    }
  },
  components: {
    schemas: {
      LineItem: {
        type: "object",
        properties: {
          item: { type: "string" },
          quantity: { type: "integer" },
          unitPrice: { type: "number" },
          currency: { type: "string", enum: ["USD"] }
        },
        required: ["item", "quantity", "unitPrice", "currency"]
      },
      Invoice: {
        type: "object",
        properties: {
          _id: { type: "string" },
          vendor: { type: "string" },
          invoiceNumber: { type: "string" },
          date: { type: "string", example: "2013-04-13" },
          amount: { type: "number" },
          currency: { type: "string", enum: ["USD"] },
          summary: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          category: { type: "string" },
          lineItems: { type: "array", items: { $ref: "#/components/schemas/LineItem" } },
          filename: { type: "string" },
          uploadedAt: { type: "string", format: "date-time" },
          processed: { type: "boolean" },
          score: { type: "number", description: "Vector similarity score (search only)" }
        },
        required: ["vendor", "amount", "currency", "date", "processed"]
      },
      BatchUploadResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                file: { type: "string" },
                insertedId: { type: "string" },
                skipped: { type: "boolean" },
                reason: { type: "string" },
                raw: { type: "string" },
                parsed: { $ref: "#/components/schemas/Invoice" }
              }
            }
          }
        }
      },
      QueryRequest: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural language query" },
          k: { type: "integer", default: 5 },
          filters: {
            type: "object",
            description: "Mongo-style filters (optional)",
            additionalProperties: true
          }
        }
      },
      QueryResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          filters: { type: "object", additionalProperties: true },
          matches: {
            type: "array",
            items: { $ref: "#/components/schemas/Invoice" }
          }
        }
      },
      CategoriesResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                total: { type: "number" },
                count: { type: "integer" }
              }
            }
          }
        }
      },
      RecentResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          recent: {
            type: "array",
            items: {
              type: "object",
              properties: {
                vendor: { type: "string" },
                invoiceNumber: { type: "string" },
                amount: { type: "number" },
                date: { type: "string" },
                category: { type: "string" }
              }
            }
          }
        }
      },
      TotalResponse: {
        type: "object",
        properties: { ok: { type: "boolean" }, totalSpent: { type: "number" } }
      },
      CountResponse: {
        type: "object",
        properties: { ok: { type: "boolean" }, invoicesProcessed: { type: "integer" } }
      },
      TimeseriesResponse: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          timeseries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string", example: "2013-04" },
                total: { type: "number" },
                count: { type: "integer" }
              }
            }
          }
        }
      },
      BackfillResponse: {
        type: "object",
        properties: { ok: { type: "boolean" }, updated: { type: "integer" } }
      },
      HealthResponse: {
        type: "object",
        properties: { ok: { type: "boolean" }, mongo: { type: "boolean" } }
      },
      OkMessage: {
        type: "object",
        properties: { ok: { type: "boolean" }, message: { type: "string" } }
      },
      Error: {
        type: "object",
        properties: { ok: { type: "boolean" }, error: { type: "string" } }
      }
    }
  }
} as const;

export async function GET() {
  return NextResponse.json(openapi);
}
