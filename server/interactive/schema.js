// Small helpers for strict JSON Schemas (structured outputs need every
// property listed in `required` and additionalProperties: false).
export const str = (description) => ({ type: "string", ...(description ? { description } : {}) });
export const int = (description) => ({ type: "integer", ...(description ? { description } : {}) });
export const bool = (description) => ({ type: "boolean", ...(description ? { description } : {}) });
export const oneOf = (values, description) => ({ type: "string", enum: values, ...(description ? { description } : {}) });
export const list = (items, description) => ({ type: "array", items, ...(description ? { description } : {}) });
export function obj(properties) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}
