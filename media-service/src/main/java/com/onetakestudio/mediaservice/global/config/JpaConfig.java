package com.onetakestudio.mediaservice.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.onetakestudio.mediaservice")
public class JpaConfig {
}
