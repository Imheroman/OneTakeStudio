package com.onetakesutdio.cloudapitest.controller;

import com.onetakesutdio.cloudapitest.dto.ItemRequestDto;
import com.onetakesutdio.cloudapitest.dto.ItemResponseDto;
import com.onetakesutdio.cloudapitest.service.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ResponseEntity<List<ItemResponseDto>> findAll() {
        return ResponseEntity.ok(itemService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ItemResponseDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok(itemService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ItemResponseDto> create(@RequestBody ItemRequestDto requestDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemService.create(requestDto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemResponseDto> update(@PathVariable Long id, @RequestBody ItemRequestDto requestDto) {
        return ResponseEntity.ok(itemService.update(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        itemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
