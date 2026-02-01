package com.onetakesutdio.cloudapitest.controller;

import com.onetakesutdio.cloudapitest.dto.ItemRequestDto;
import com.onetakesutdio.cloudapitest.dto.ItemResponseDto;
import com.onetakesutdio.cloudapitest.service.ItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/test-api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ResponseEntity<List<ItemResponseDto>> findAll() {
        long start = System.currentTimeMillis();
        List<ItemResponseDto> result = itemService.findAll();
        log.info("[GET /test-api/items] count={} ({}ms)", result.size(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemResponseDto> findById(@PathVariable Long id) {
        long start = System.currentTimeMillis();
        ItemResponseDto result = itemService.findById(id);
        log.info("[GET /test-api/items/{}] found={} ({}ms)", id, result.getName(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<ItemResponseDto> create(@RequestBody ItemRequestDto requestDto) {
        long start = System.currentTimeMillis();
        log.info("[POST /test-api/items] request: name={}, price={}", requestDto.getName(), requestDto.getPrice());
        ItemResponseDto result = itemService.create(requestDto);
        log.info("[POST /test-api/items] created: id={} ({}ms)", result.getId(), System.currentTimeMillis() - start);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemResponseDto> update(@PathVariable Long id, @RequestBody ItemRequestDto requestDto) {
        long start = System.currentTimeMillis();
        log.info("[PUT /test-api/items/{}] request: name={}, price={}", id, requestDto.getName(), requestDto.getPrice());
        ItemResponseDto result = itemService.update(id, requestDto);
        log.info("[PUT /test-api/items/{}] updated ({}ms)", id, System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        long start = System.currentTimeMillis();
        log.info("[DELETE /test-api/items/{}] request", id);
        itemService.delete(id);
        log.info("[DELETE /test-api/items/{}] deleted ({}ms)", id, System.currentTimeMillis() - start);
        return ResponseEntity.noContent().build();
    }
}
