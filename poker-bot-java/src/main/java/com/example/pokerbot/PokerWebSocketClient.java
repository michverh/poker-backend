package com.example.pokerbot;

import okhttp3.*;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import com.example.pokerbot.model.Card;
import com.example.pokerbot.model.GameState;

@Service
public class PokerWebSocketClient {
    private final OkHttpClient client = new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build();
    private final String wsUrl = "ws://localhost:8080";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<String> playerId = new AtomicReference<>(null);

    @Autowired
    private GeminiAiService geminiAiService;

    public void connect() {
        Request request = new Request.Builder().url(wsUrl).build();
        client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                // Send join message
                String joinMsg = "{\"type\":\"join\",\"payload\":{\"name\":\"GeminiBot\"}}";
                webSocket.send(joinMsg);
            }
            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    JsonNode root = objectMapper.readTree(text);
                    String type = root.path("type").asText();
                    JsonNode payload = root.path("payload");

                    switch (type) {
                        case "state":
                            GameState gameState = objectMapper.treeToValue(payload, GameState.class);
                            handleGameState(webSocket, gameState);
                            break;
                        case "player_hand":
                            Card[] hand = objectMapper.treeToValue(payload, Card[].class);
                            handlePlayerHand(hand);
                            break;
                        case "info":
                            // Optionally handle info
                            break;
                        case "error":
                            // Optionally handle error
                            break;
                        default:
                            // Unknown message type
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                t.printStackTrace();
            }
        });
    }

    private Card[] currentHand = null;
    private GameState latestGameState = null;

    private void handlePlayerHand(Card[] hand) {
        this.currentHand = hand;
    }

    private void handleGameState(WebSocket webSocket, GameState gameState) {
        this.latestGameState = gameState;
        // Find our playerId if not set
        if (playerId.get() == null) {
            gameState.players.stream()
                .filter(p -> "GeminiBot".equals(p.name))
                .findFirst()
                .ifPresent(p -> playerId.set(p.id));
        }
        // Only act if it's our turn and we are active
        String myId = playerId.get();
        if (myId != null && myId.equals(gameState.currentPlayerId)) {
            GameState.Player me = gameState.players.stream()
                .filter(p -> myId.equals(p.id))
                .findFirst().orElse(null);
            if (me != null && "active".equals(me.status) && currentHand != null) {
                try {
                    String gameStateJson = objectMapper.writeValueAsString(gameState);
                    String handJson = objectMapper.writeValueAsString(currentHand);
                    String action = geminiAiService.getBotAction(gameStateJson, handJson);
                    // For now, only support fold/call/check. Raise requires amount.
                    String actionMsg = "{\"type\":\"action\",\"payload\":{\"actionType\":\"" + action + "\"}}";
                    webSocket.send(actionMsg);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
