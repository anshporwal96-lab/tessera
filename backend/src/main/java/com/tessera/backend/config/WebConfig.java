package com.tessera.backend.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final TesseraProperties properties;

    public WebConfig(TesseraProperties properties) {
        this.properties = properties;
    }

    /** All puzzle dates are UTC; tests replace this with a controllable clock. */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(properties.corsOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST")
                .allowedHeaders("Authorization", "Content-Type");
    }
}
