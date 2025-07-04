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
            log.info("Action taking based on hand: {} and table: {} - ", ctx.getPlayerHandString(), ctx.getCommunityCardsString(), responseBody);
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                String content = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                try {
                    return objectMapper.readValue(content, GeminiAction.class);
                } catch (Exception e) {
                    // fallback: try to parse actionType from string
                    GeminiAction fallback = new GeminiAction();
                    String action = content.trim().toLowerCase();
                    if (action.contains("fold")) {
                        fallback.actionType = "fold";
                    } else if (action.contains("call")) {
                        fallback.actionType = "call";
                    } else if (action.contains("raise")) {
                        fallback.actionType = "raise";
                        fallback.amount = 0;
                    } else if (action.contains("check")) {
                        fallback.actionType = "check";
                    } else {
                        fallback.actionType = "fold";
                    }
                    return fallback;
                }
            }
            GeminiAction def = new GeminiAction();
            def.actionType = "fold";
            return def;
        }
    }
    
    private String buildPrompt(GeminiContext ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a professional Texas Hold'em poker bot. ");
        sb.append("Given the following JSON context, recommend the statistically most advantageous move (fold, call, raise, or check). ");
        sb.append("Do NOT risk all your chips (go all-in or raise to all-in) unless the probability of winning the hand is above 95%. ");
        sb.append("If you choose to raise, suggest a statistically optimal amount to raise (within the allowed range). ");
        sb.append(
            "Reply ONLY with a single JSON object: { \"actionType\": string, \"amount\": number (required if actionType is 'raise', omit otherwise) }. Do not include any explanation or extra text.\n");
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
