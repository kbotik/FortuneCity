"use strict";

const http = require("node:http");
const {WebSocketServer} = require("ws");
const {
    GameServer,
    MAX_MESSAGE_BYTES
} = require("./game-server");

const DEFAULT_PORT = 8080;
const DEFAULT_MAX_PLAYERS = 4;
const DEFAULT_PRODUCTION_ORIGIN = "https://kbotik.github.io";
const DEFAULT_DEVELOPMENT_ORIGINS =
    "http://localhost:4173,http://127.0.0.1:4173";

const parsedPort = Number(process.env.PORT);
const parsedMaxPlayers = Number(process.env.MAX_PLAYERS);
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number.isInteger(parsedPort) && parsedPort > 0
    ? parsedPort
    : DEFAULT_PORT;
const MAX_PLAYERS =
    Number.isInteger(parsedMaxPlayers) &&
    parsedMaxPlayers >= 2 &&
    parsedMaxPlayers <= DEFAULT_MAX_PLAYERS
        ? parsedMaxPlayers
        : DEFAULT_MAX_PLAYERS;
const CORS_ORIGIN =
    process.env.CORS_ORIGIN ||
    (
        NODE_ENV === "production"
            ? DEFAULT_PRODUCTION_ORIGIN
            : DEFAULT_DEVELOPMENT_ORIGINS
    );

if (NODE_ENV === "production" && CORS_ORIGIN === "*") {
    throw new Error(
        "CORS_ORIGIN=* is not allowed when NODE_ENV=production."
    );
}

const gameServer = new GameServer({maxPlayers: MAX_PLAYERS});

function isAllowedOrigin(origin) {
    if (CORS_ORIGIN === "*" || !origin) return true;

    return CORS_ORIGIN
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
        .includes(origin);
}

const httpServer = http.createServer((request, response) => {
    const requestUrl = new URL(
        request.url || "/",
        `http://${request.headers.host || "localhost"}`
    );

    if (requestUrl.pathname === "/health") {
        response.writeHead(200, {"content-type": "application/json"});
        response.end(JSON.stringify({
            status: "ok",
            ok: true,
            service: "fortunecity-game-server",
            rooms: gameServer.roomManager.rooms.size
        }));
        return;
    }

    response.writeHead(404, {"content-type": "application/json"});
    response.end(JSON.stringify({error: "NOT_FOUND"}));
});

const webSocketServer = new WebSocketServer({
    server: httpServer,
    maxPayload: MAX_MESSAGE_BYTES + 1024,
    verifyClient: ({origin}, done) => {
        if (!isAllowedOrigin(origin)) {
            done(false, 403, "Origin not allowed");
            return;
        }

        done(true);
    }
});

webSocketServer.on("connection", socket => {
    console.log("WebSocket client connected.");
    gameServer.attach(socket);
});

httpServer.listen(PORT, "127.0.0.1", () => {
    console.log(
        `FortuneCity server listening on port ${PORT} ` +
        `(NODE_ENV=${NODE_ENV}, CORS_ORIGIN=${CORS_ORIGIN})`
    );
});

let shuttingDown = false;

function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Stopping FortuneCity server...");

    for (const room of gameServer.roomManager.rooms.values()) {
        gameServer.roomManager.clearRoomTimers(room);
        room.players.forEach(player => {
            if (player.socket && player.socket.readyState === 1) {
                player.socket.close(1001, "Server shutdown");
            }
        });
    }

    webSocketServer.close(() => {
        httpServer.close(() => process.exit(0));
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
