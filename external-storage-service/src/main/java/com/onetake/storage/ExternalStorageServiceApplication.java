package com.onetake.storage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class ExternalStorageServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExternalStorageServiceApplication.class, args);
    }
}
