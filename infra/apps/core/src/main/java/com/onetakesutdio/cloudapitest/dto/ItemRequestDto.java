package com.onetakesutdio.cloudapitest.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ItemRequestDto {

    private String name;
    private String description;
    private Integer price;

    public ItemRequestDto(String name, String description, Integer price) {
        this.name = name;
        this.description = description;
        this.price = price;
    }
}
