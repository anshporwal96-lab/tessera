package com.tessera.backend.config;

import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.Profiles;
import org.springframework.util.StringUtils;

/**
 * In the prod profile, refuse to start unless every required setting is
 * present, with a message that names the missing ones. (Without this, a missing
 * TESSERA_DB_URL surfaces as an obscure Hikari error.)
 */
public class RequiredSettingsCheck implements EnvironmentPostProcessor, Ordered {

    static final List<String> REQUIRED_IN_PROD =
            List.of("TESSERA_DB_URL", "TESSERA_DB_USER", "TESSERA_DB_PASSWORD", "TESSERA_CORS_ORIGINS");

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (!environment.acceptsProfiles(Profiles.of("prod"))) return;
        List<String> missing = REQUIRED_IN_PROD.stream()
                .filter(name -> !StringUtils.hasText(environment.getProperty(name)))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Missing required settings for the prod profile: " + String.join(", ", missing));
        }
    }

    @Override
    public int getOrder() {
        // After config files and profiles have been loaded.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
