import { z } from "zod";
import { int64, minimum } from "zod/mini";

export const WebsiteAddSchema = z.object({
  url: z.url(),
  interval: z.int().min(10, "minimum interval should be 10 sec"),
});

export const WebsiteStatusSchema = z.object({
  website_id: z.string(),
  duration: z.preprocess(
    (v) => (typeof v == "string" ? parseInt(v, 10) : v),
    z.number().min(0),
  ),
});

export type WebsiteAddSchemaType = z.infer<typeof WebsiteAddSchema>;
export type WebsiteStatusSchemaType = z.infer<typeof WebsiteStatusSchema>;
