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
    private String playerName = "Team Redbull";
    
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
            String reasoningForLog = "No reasoning provided";
            
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
                    reasoningForLog = actionObj.reasoning != null ? actionObj.reasoning : "No reasoning provided";
                } catch (Exception e) {
                    // fallback: try to parse actionType from string
                    String action = json.trim().toLowerCase();
                    if (action.contains("fold")) actionTypeForLog = "fold";
                    else if (action.contains("call")) actionTypeForLog = "call";
                    else if (action.contains("raise")) actionTypeForLog = "raise";
                    else if (action.contains("check")) actionTypeForLog = "check";
                    else actionTypeForLog = "fold";
                    
                    reasoningForLog = "Failed to parse JSON response, used fallback action";
                }
                
                log.info("Betting Round: {}, Action taken based on hand: {} and table: {} - {} | Reasoning: {}",
                        ctx.bettingRound, ctx.getPlayerHandString(), ctx.getCommunityCardsString(), actionTypeForLog, reasoningForLog);
                
                if (actionObj != null) return actionObj;
                GeminiAction fallback = new GeminiAction();
                fallback.actionType = actionTypeForLog;
                fallback.reasoning = reasoningForLog;
                return fallback;
            }
            
            GeminiAction def = new GeminiAction();
            def.actionType = "fold";
            def.reasoning = "No valid response from AI, defaulting to fold";
            log.info("Betting Round: {}, Action taken based on hand: {} and table: {} - {} | Reasoning: {}",
                    ctx.bettingRound, ctx.getPlayerHandString(), ctx.getCommunityCardsString(), "fold", def.reasoning);
            return def;
        }
    }
    
    private String buildPrompt(GeminiContext ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
              Given the following Texas Hold'em situation, suggest the best action (fold, check, call, bet, raise, or all-in) and explain why:
              Stage: """+ ctx.bettingRound+ """
              My hole cards: """+ ctx.getPlayerHandString() + """
              Community cards: """ + ctx.getCommunityCardsString() + """
              Pot size: """ + ctx.pot + """
              AmountToCall: """ + ctx.amountToCall + """
              Bet to call: """+  (ctx.amountToCall - ctx.activePlayers.stream().filter(p -> p.name.equals(playerName)).findFirst().map(p -> p.currentBet).orElse(-1)) + """
              Minimum raise amount: """ + ctx.minimumRaiseAmount  + """
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
              
              IMPORTANT RULES:
              - DO NOT CALL DURING PRE-FLOP
              - If you can call without increasing the bet,
              - If "Bet to call" is 0, you MUST use "check" action, NEVER "call"
              - If "Bet to call" is greater than 0, you can "call" to match the bet or "fold" or "raise"
              - You are an expert poker player. Analyze the situation and provide a recommendation.
              - If AmountToCall is 0, don't fold
              
              Please provide the recommended action (options: 'fold', 'check', 'call', 'raise'), the amount to raise if applicable and the reasoning why.
              Reply ONLY with a single JSON object: { "actionType": string, "amount": number (required if actionType is 'raise', omit otherwise), "reasoning": "Explain why the decision was made" }.
              Do not include any explanation or extra text.""");
        try {
            String contextJson = objectMapper.writeValueAsString(ctx);
            sb.append("\nContext: ").append(contextJson).append("\n");
        } catch (Exception e) {
            sb.append("\nContext unavailable due to error.\n");
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