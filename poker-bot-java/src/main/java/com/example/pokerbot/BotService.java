package com.example.pokerbot;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

@Service
public class BotService {
    private final PokerWebSocketClient pokerWebSocketClient;
    private final GeminiAiService geminiAiService;

    public BotService(PokerWebSocketClient pokerWebSocketClient, GeminiAiService geminiAiService) {
        this.pokerWebSocketClient = pokerWebSocketClient;
        this.geminiAiService = geminiAiService;
    }

    @PostConstruct
    public void startBot() {
        pokerWebSocketClient.connect();
    }
}

