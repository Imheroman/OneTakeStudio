package com.onetakesutdio.cloudapitest.service;

import com.onetakesutdio.cloudapitest.dto.ItemRequestDto;
import com.onetakesutdio.cloudapitest.dto.ItemResponseDto;
import com.onetakesutdio.cloudapitest.entity.Item;
import com.onetakesutdio.cloudapitest.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;

    public List<ItemResponseDto> findAll() {
        return itemRepository.findAll().stream()
                .map(ItemResponseDto::new)
                .toList();
    }

    public ItemResponseDto findById(Long id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + id));
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
        return new ItemResponseDto(saved);
    }

    @Transactional
    public ItemResponseDto update(Long id, ItemRequestDto requestDto) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + id));
        item.update(requestDto.getName(), requestDto.getDescription(), requestDto.getPrice());
        return new ItemResponseDto(item);
    }

    @Transactional
    public void delete(Long id) {
        if (!itemRepository.existsById(id)) {
            throw new IllegalArgumentException("Item not found: " + id);
        }
        itemRepository.deleteById(id);
    }
}
