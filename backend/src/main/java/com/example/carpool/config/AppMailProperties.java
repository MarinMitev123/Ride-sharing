package com.example.carpool.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppMailProperties {

    private final Frontend frontend = new Frontend();
    private final Mail mail = new Mail();

    @Getter
    @Setter
    public static class Frontend {
        /** Базов URL на React (без накрайна /) – за линк при reset на парола. */
        private String baseUrl = "http://localhost:5173";
    }

    @Getter
    @Setter
    public static class Mail {
        /** true + spring.mail.* → изпращане по имейл за „реални“ адреси. */
        private boolean enabled = false;
        private String from = "Carpool <noreply@carpool.local>";
        /**
         * Домейни, при които линкът само в конзолата (test@example.com и др.).
         * Запетая-разделен списък.
         */
        private String consoleOnlyDomains = "example.com,test.com,localhost,invalid,test";
    }

    public Set<String> consoleOnlyDomainSet() {
        return Arrays.stream(mail.getConsoleOnlyDomains().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    public boolean isConsoleOnlyEmail(String email) {
        if (email == null || !email.contains("@")) {
            return true;
        }
        String domain = email.substring(email.indexOf('@') + 1).trim().toLowerCase(Locale.ROOT);
        for (String blocked : consoleOnlyDomainSet()) {
            if (domain.equals(blocked) || domain.endsWith("." + blocked)) {
                return true;
            }
        }
        return false;
    }
}
