package com.example.pokerbot;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import okhttp3.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;

@Service
public class GeminiAiService {
    @Value("${gemini.api.key}")
    private String apiKey;

    private final OkHttpClient client = new OkHttpClient();
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getBotAction(String gameState, String playerHand) throws IOException {
        String prompt = buildPrompt(gameState, playerHand);
        // Instruct Gemini to reply in strict JSON format, with a dynamic amount for raise
        prompt += "\nIf you choose to raise, suggest a statistically optimal amount to raise (within the allowed range). Respond ONLY with a single JSON object: { \"actionType\": string, \"amount\": number (required if actionType is 'raise', omit otherwise) }. Do not include any explanation or extra text.";
        String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + prompt.replace("\"", "\\\"") + "\"}]}]}";

        Request request = new Request.Builder()
                .url(GEMINI_API_URL + apiKey)
                .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code " + response);
            }
            String responseBody = response.body().string();
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                String content = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                return parseActionFromResponse(content);
            }
            return "{\"actionType\":\"fold\"}"; // Default to fold if no valid response
        }
    }

    private String buildPrompt(String gameState, String playerHand) {
        return "You are a professional Texas Hold'em poker bot. " +
                "Given the following game state and your private hand, recommend the statistically most advantageous move (fold, call, raise, or check). " +
                "Do NOT risk all your chips (go all-in or raise to all-in) unless the probability of winning the hand is above 95%. " +
                "If you choose to raise, suggest a statistically optimal amount to raise (within the allowed range). " +
                "Reply ONLY with one of: fold, call, raise, or check.\n" +
                "Game state: " + gameState + "\n" +
                "Your hand: " + playerHand + "\n" +
                "Recommended action:";
    }

    private String parseActionFromResponse(String content) {
        // Try to parse as JSON, fallback to legacy string parsing
        try {
            JsonNode node = objectMapper.readTree(content);
            if (node.has("actionType")) {
                return content; // Already JSON
            }
        } catch (Exception e) {
            // Fallback to legacy parsing
            String action = content.trim().toLowerCase();
            if (action.contains("fold")) return "{\"actionType\":\"fold\"}";
            if (action.contains("call")) return "{\"actionType\":\"call\"}";
            if (action.contains("raise")) return "{\"actionType\":\"raise\",\"amount\":0}";
            if (action.contains("check")) return "{\"actionType\":\"check\"}";
        }
        return "{\"actionType\":\"fold\"}";
    }
}
