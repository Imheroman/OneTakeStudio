package com.onetakesutdio.cloudapitest.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/test-api")
    public String index() {
        return "index";
    }
}
