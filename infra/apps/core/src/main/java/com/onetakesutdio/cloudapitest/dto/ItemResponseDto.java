package com.onetakesutdio.cloudapitest.dto;

import com.onetakesutdio.cloudapitest.entity.Item;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ItemResponseDto {

    private Long id;
    private String name;
    private String description;
    private Integer price;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ItemResponseDto(Item item) {
        this.id = item.getId();
        this.name = item.getName();
        this.description = item.getDescription();
        this.price = item.getPrice();
        this.createdAt = item.getCreatedAt();
        this.updatedAt = item.getUpdatedAt();
    }
}
