package com.onetakesutdio.cloudapitest.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/test-api/redis")
@RequiredArgsConstructor
public class RedisTestController {

    private static final String KEY_PREFIX = "test:";
    private final StringRedisTemplate redisTemplate;

    @PostMapping
    public ResponseEntity<Map<String, String>> set(@RequestBody Map<String, String> body) {
        String key = body.get("key");
        String value = body.get("value");
        if (key == null || value == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "key and value are required"));
        }
        redisTemplate.opsForValue().set(KEY_PREFIX + key, value);
        log.info("[Redis SET] key={}, value={}", key, value);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("key", key, "value", value, "status", "saved"));
    }

    @GetMapping("/{key}")
    public ResponseEntity<Map<String, String>> get(@PathVariable String key) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + key);
        if (value == null) {
            log.info("[Redis GET] key={} not found", key);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("key", key, "status", "not found"));
        }
        log.info("[Redis GET] key={}, value={}", key, value);
        return ResponseEntity.ok(Map.of("key", key, "value", value));
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String key) {
        Boolean deleted = redisTemplate.delete(KEY_PREFIX + key);
        log.info("[Redis DELETE] key={}, deleted={}", key, deleted);
        return ResponseEntity.ok(Map.of("key", key, "status", Boolean.TRUE.equals(deleted) ? "deleted" : "not found"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listAll() {
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
        log.info("[Redis LIST] found {} keys", keys != null ? keys.size() : 0);
        return ResponseEntity.ok(Map.of("keys", keys != null ? keys : Set.of()));
    }
}
