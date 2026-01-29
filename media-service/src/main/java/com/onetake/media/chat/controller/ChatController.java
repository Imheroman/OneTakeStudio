package com.onetake.media.chat.controller;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.dto.ChatMessageResponse;
import com.onetake.media.chat.dto.ChatStatsResponse;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.service.ChatService;
import com.onetake.media.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/media/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChatMessageRequest request) {
        ChatMessageResponse response = chatService.sendMessage(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/external")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> receiveExternalMessage(
            @Valid @RequestBody ChatMessageRequest request) {
        ChatMessageResponse response = chatService.receiveExternalMessage(request);
        if (response == null) {
            return ResponseEntity.ok(ApiResponse.success(null)); // 중복 메시지
        }
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @PathVariable Long studioId,
            @RequestParam(defaultValue = "100") int limit) {
        List<ChatMessageResponse> response = chatService.getMessages(studioId, limit);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}/platform/{platform}")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessagesByPlatform(
            @PathVariable Long studioId,
            @PathVariable ChatPlatform platform) {
        List<ChatMessageResponse> response = chatService.getMessagesByPlatform(studioId, platform);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}/recent")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getRecentMessages(
            @PathVariable Long studioId,
            @RequestParam(defaultValue = "5") int minutes) {
        List<ChatMessageResponse> response = chatService.getRecentMessages(studioId, minutes);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}/highlighted")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getHighlightedMessages(
            @PathVariable Long studioId) {
        List<ChatMessageResponse> response = chatService.getHighlightedMessages(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{messageId}/highlight")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> highlightMessage(
            @PathVariable String messageId) {
        ChatMessageResponse response = chatService.highlightMessage(messageId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable String messageId) {
        chatService.deleteMessage(messageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/{studioId}/stats")
    public ResponseEntity<ApiResponse<ChatStatsResponse>> getChatStats(
            @PathVariable Long studioId) {
        ChatStatsResponse response = chatService.getChatStats(studioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
