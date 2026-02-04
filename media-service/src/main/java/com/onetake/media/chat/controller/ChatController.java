package com.onetake.media.chat.controller;

import com.onetake.media.chat.dto.ChatMessageRequest;
import com.onetake.media.chat.dto.ChatMessageResponse;
import com.onetake.media.chat.dto.ChatStatsResponse;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.service.ChatService;
import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.global.resolver.StudioIdResolver;
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
    private final StudioIdResolver studioIdResolver;

    @PostMapping
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChatMessageRequest request) {
        Long studioId = studioIdResolver.resolveStudioId(request.getStudioId());
        ChatMessageResponse response = chatService.sendMessage(userId, studioId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/external")
    public ResponseEntity<ApiResponse<Void>> receiveExternalMessage(
            @Valid @RequestBody ChatMessageRequest request) {
        Long studioId = studioIdResolver.resolveStudioId(request.getStudioId());
        chatService.receiveExternalMessage(studioId, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/{studioId}")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(
            @PathVariable String studioId,
            @RequestParam(defaultValue = "100") int limit) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<ChatMessageResponse> response = chatService.getMessages(resolvedStudioId, limit);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}/platform/{platform}")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessagesByPlatform(
            @PathVariable String studioId,
            @PathVariable ChatPlatform platform) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<ChatMessageResponse> response = chatService.getMessagesByPlatform(resolvedStudioId, platform);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}/recent")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getRecentMessages(
            @PathVariable String studioId,
            @RequestParam(defaultValue = "5") int minutes) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<ChatMessageResponse> response = chatService.getRecentMessages(resolvedStudioId, minutes);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{studioId}/highlighted")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getHighlightedMessages(
            @PathVariable String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        List<ChatMessageResponse> response = chatService.getHighlightedMessages(resolvedStudioId);
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
            @PathVariable String studioId) {
        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        ChatStatsResponse response = chatService.getChatStats(resolvedStudioId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
