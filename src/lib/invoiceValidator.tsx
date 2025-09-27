export const invoiceCollectionValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["vendor","amount","currency","date","tags","uploadedAt","processed"],
    additionalProperties: false,
    properties: {
      _id: {},
      vendor: { bsonType: "string", minLength: 1 },
      amount: { bsonType: ["double","int","long","decimal"] },
      currency: { enum: ["USD"] },
      date: { bsonType: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
      invoiceNumber: { bsonType: "string" },
      description: { bsonType: "string" },
      summary: { bsonType: "string" },
      tags: { bsonType: "array", items: { bsonType: "string", minLength: 1 } },
      category: { bsonType: "string" },
      lineItems: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["item","quantity","unitPrice","currency"],
          additionalProperties: false,
          properties: {
            item: { bsonType: "string" },
            quantity: { bsonType: ["int","long"], minimum: 1 },
            unitPrice: { bsonType: ["double","decimal","int","long"] },
            currency: { enum: ["USD"] }
          }
        }
      },
      embedding: {
        bsonType: "array",
        minItems: 1536,
        maxItems: 1536,
        items: { bsonType: "double" }
      },
      filename: { bsonType: "string" },
      uploadedAt: { bsonType: "date" },
      processed: { bsonType: "bool" }
    }
  }
};
