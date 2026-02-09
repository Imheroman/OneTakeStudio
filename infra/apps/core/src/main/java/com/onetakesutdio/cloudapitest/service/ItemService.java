package com.onetakesutdio.cloudapitest.service;

import com.onetakesutdio.cloudapitest.dto.ItemRequestDto;
import com.onetakesutdio.cloudapitest.dto.ItemResponseDto;
import com.onetakesutdio.cloudapitest.entity.Item;
import com.onetakesutdio.cloudapitest.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;

    public List<ItemResponseDto> findAll() {
        List<ItemResponseDto> result = itemRepository.findAll().stream()
                .map(ItemResponseDto::new)
                .toList();
        log.debug("findAll: count={}", result.size());
        return result;
    }

    public ItemResponseDto findById(Long id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("findById: Item not found: id={}", id);
                    return new IllegalArgumentException("Item not found: " + id);
                });
        log.debug("findById: id={}, name={}", id, item.getName());
        return new ItemResponseDto(item);
    }

    @Transactional
    public ItemResponseDto create(ItemRequestDto requestDto) {
        Item item = Item.builder()
                .name(requestDto.getName())
                .description(requestDto.getDescription())
                .price(requestDto.getPrice())
                .build();
        Item saved = itemRepository.save(item);
        log.info("create: id={}, name={}", saved.getId(), saved.getName());
        return new ItemResponseDto(saved);
    }

    @Transactional
    public ItemResponseDto update(Long id, ItemRequestDto requestDto) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("update: Item not found: id={}", id);
                    return new IllegalArgumentException("Item not found: " + id);
                });
        item.update(requestDto.getName(), requestDto.getDescription(), requestDto.getPrice());
        log.info("update: id={}, name={}", id, item.getName());
        return new ItemResponseDto(item);
    }

    @Transactional
    public void delete(Long id) {
        if (!itemRepository.existsById(id)) {
            log.warn("delete: Item not found: id={}", id);
            throw new IllegalArgumentException("Item not found: " + id);
        }
        itemRepository.deleteById(id);
        log.info("delete: id={}", id);
    }
}
