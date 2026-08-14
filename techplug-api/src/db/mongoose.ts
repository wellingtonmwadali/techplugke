import mongoose from "mongoose";
import { config } from "../config/env.js";

export async function connectMongo(): Promise<void> {
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");


  });

  await mongoose.connect(config.mongodbUri, { dbName: "techplug" });
  console.log("MongoDB connected");
}

export function getConnectionState(): string {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] ?? "unknown";
}
