package com.example.pokerbot.model;

import lombok.ToString;

@ToString
public class GeminiAction {
    public String actionType;
    public Integer amount; // nullable, only for raise
    public String reasoning; // Add reasoning field
}

