import arcjet from "@arcjet/next";
import { tokenBucket } from "@arcjet/next";

export const  aj = arcjet({
  key: process.env.ARCJET_KEY, // Get your site key from https://app.arcjet.com
  rules: [
    
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      characteristics: ["userId"], // track requests by a custom user ID
      refillRate: 50000, // refill 5 tokens per interval
      interval: 10, // refill every 10 seconds
      capacity: 100000, // bucket maximum capacity of 10 tokens
    }),
  ],
});