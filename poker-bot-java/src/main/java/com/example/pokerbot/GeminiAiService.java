package com.example.pokerbot;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

import com.example.pokerbot.model.GeminiContext;
import com.example.pokerbot.model.GeminiAction;

@Slf4j
@Service
public class GeminiAiService {
    @Value("${gemini.api.key}")
    private String apiKey;
    
    private final OkHttpClient client = new OkHttpClient();
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private String playerName = "GeminiBot";
    
    public GeminiAction getBotAction(GeminiContext ctx) throws IOException {
        String prompt = buildPrompt(ctx);
        GeminiRequestBody requestBodyObj = new GeminiRequestBody(prompt);
        String requestBody = objectMapper.writeValueAsString(requestBodyObj);
        
        Request request = new Request.Builder()
            .url(GEMINI_API_URL)
            .header("X-goog-api-key", apiKey)
            .header("Content-Type", "application/json")
            .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unexpected code " + response);
            }
            String responseBody = response.body().string();
            String actionTypeForLog = null;
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                String content = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                // Remove markdown and parse JSON
                String json = content.replaceAll("(?s)```json|```|`", "").trim();
                GeminiAction actionObj = null;
                try {
                    actionObj = objectMapper.readValue(json, GeminiAction.class);
                    actionTypeForLog = actionObj.actionType;
                } catch (Exception e) {
                    // fallback: try to parse actionType from string
                    String action = json.trim().toLowerCase();
                    if (action.contains("fold")) actionTypeForLog = "fold";
                    else if (action.contains("call")) actionTypeForLog = "call";
                    else if (action.contains("raise")) actionTypeForLog = "raise";
                    else if (action.contains("check")) actionTypeForLog = "check";
                    else actionTypeForLog = "fold";
                }
                log.info("Action taking based on hand: {} and table: {} - {}", ctx.getPlayerHandString(), ctx.getCommunityCardsString(), actionTypeForLog);
                if (actionObj != null) return actionObj;
                GeminiAction fallback = new GeminiAction();
                fallback.actionType = actionTypeForLog;
                return fallback;
            }
            GeminiAction def = new GeminiAction();
            def.actionType = "fold";
            log.info("Action taking based on hand: {} and table: {} - {}", ctx.getPlayerHandString(), ctx.getCommunityCardsString(), "fold");
            return def;
        }
    }
    
    private String buildPrompt(GeminiContext ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
                  Given the following Texas Hold’em situation, suggest the best action (fold, check, call, bet, raise, or all-in) and explain why:
                  Stage: """+ ctx.bettingRound+ """
                  My hole cards: """+ ctx.getPlayerHandString() + """
                  Community cards: """ + ctx.getCommunityCardsString() + """
                  Pot size: """ + ctx.pot + """
                  Bet to call: """+ ctx.amountToCall + """
                  Minimum raise amount: """ + ctx.minimumRaiseAmount + """
                  My stack: """ + ctx.activePlayers.stream().filter(p -> p.name.equals(playerName)).findFirst().map(p -> p.chips).orElse(0) + """
                  Opponents remaining: """ + ctx.activePlayers.size() + """
                  Opponent stack sizes: """ + ctx.activePlayers.stream().filter(p -> !p.name.equals(playerName))
                        .map(p -> p.name + " (" + p.chips + ")").reduce((a, b) -> a + ", " + b).orElse("None") + """
                  Opponent actions so far: """ + ctx.activePlayers.stream()
                        .filter(p -> !p.name.equals(playerName))
                        .map(p -> p.name + " (" + p.currentBet + ")").reduce((a, b) -> a + ", " + b).orElse("None") + """
                  My position: """ + ctx.activePlayers.stream()
                        .filter(p -> p.name.equals(playerName))
                        .map(p -> p.name + " (position: " + p.currentBet + ")").findFirst().orElse("Unknown") + """
                  You are an expert poker player. Analyze the situation and provide a recommendation, make sure to check my stack size before making a decision and also the position relative to the dealer.
                  Don't call when you can check.
                  Please provide the recommended action (options contain 'fold', 'check', 'call', 'raise'), the amount to raise if applicable and the reasoning why\\n
                  Reply ONLY with a single JSON object: { \\"actionType\\": string, \\"amount\\": number (required if actionType is 'raise', omit otherwise, \\"reasoning\\": Explain why the decision was made) }.
                  Do not include any explanation or extra text.\\n");
                  """);
        try {
            String contextJson = objectMapper.writeValueAsString(ctx);
            sb.append("Context: ").append(contextJson).append("\n");
        } catch (Exception e) {
            sb.append("Context unavailable due to error.\n");
        }
        sb.append("Recommended action:");
        return sb.toString();
    }
    
    // POJO for Gemini API request body
    private static class GeminiRequestBody {
        public Content[] contents;
        
        public GeminiRequestBody(String prompt) {
            this.contents = new Content[] { new Content(prompt) };
        }
        
        private static class Content {
            public Part[] parts;
            
            public Content(String prompt) {
                this.parts = new Part[] { new Part(prompt) };
            }
        }
        
        private static class Part {
            public String text;
            
            public Part(String text) {
                this.text = text;
            }
        }
    }
}
