"use strict";

const http = require("node:http");
const {WebSocketServer} = require("ws");
const {GameServer} = require("./game-server");

const PORT = Number(process.env.PORT || 8080);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS || 4);

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
    if (request.url === "/health") {
        response.writeHead(200, {"content-type": "application/json"});
        response.end(JSON.stringify({
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
    maxPayload: 16 * 1024,
    verifyClient: ({origin}, done) => {
        if (!isAllowedOrigin(origin)) {
            done(false, 403, "Origin not allowed");
            return;
        }

        done(true);
    }
});

webSocketServer.on("connection", socket => {
    gameServer.attach(socket);
});

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(
        `FortuneCity server listening on port ${PORT} ` +
        `(CORS_ORIGIN=${CORS_ORIGIN})`
    );
});

function shutdown() {
    for (const room of gameServer.roomManager.rooms.values()) {
        gameServer.roomManager.clearRoomTimers(room);
    }

    webSocketServer.close();
    httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
