import dotenv from "dotenv";
dotenv.config(); // Setup .env

import express from "express";
import * as http from "http";
import path from "path";
import { GameRoutes, gameSubRoute, RestoreRoutes, restoreSubRoute, setupWebsocketAPI } from "./api";
import config from "./config";
import gameStore from "./gameStore";

const app = express();
const server = http.createServer(app);

app.set("trust proxy", 1); // Trust first proxy

app.use(express.json());

// Warn if config.server.allowed_origins has not been set
if (config.server.allowed_origins === undefined) {
  console.warn(
    "config.server.allowed_origins has not been set. This is the equivalent of setting CORS to *"
  );
}

// Setup CORS as per server.allowed_origins
app.use((req, res, next) => {
  const origin = (req.get("origin") || req.get("referrer")) ?? "";
  if (
    config.server.allowed_origins === undefined ||
    config.server.allowed_origins.indexOf(origin) !== -1
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Setup the serving of the frontend React app
const clientBuildDirectory = path.join(__dirname, config.client.relative_build_directory);
app.use(express.static(clientBuildDirectory)); // Non-index.html files
config.client.routes.forEach((route) =>
  app.use(route, express.static(path.join(clientBuildDirectory, "index.html")))
);

// REST API Endpoints
app.use(gameSubRoute, GameRoutes);
app.use(restoreSubRoute, RestoreRoutes);

// Websocket handler
setupWebsocketAPI(server);

// Recover any games that existed before this process started (e.g. a host's
// idle spin-down), then start accepting connections. Everything else in the
// app stays synchronous against the in-memory store — this is the only
// place that awaits persistence.
gameStore.rehydrate().then((count) => {
  if (count > 0) console.log(`Restored ${count} game(s) from persistence`);

  server.listen(config.server.port, () => {
    console.log(`Listening on ${config.server.port}`);
  });
});
