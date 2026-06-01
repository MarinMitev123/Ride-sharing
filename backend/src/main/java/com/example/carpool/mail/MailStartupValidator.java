package com.example.carpool.mail;

import com.example.carpool.config.AppMailProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Предупрежда при старт, ако SMTP паролата липсва или е placeholder.
 */
@Component
@ConditionalOnProperty(name = "app.mail.enabled", havingValue = "true")
@RequiredArgsConstructor
public class MailStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(MailStartupValidator.class);

    private final AppMailProperties appMailProperties;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @PostConstruct
    void checkMailConfig() {
        if (isPlaceholderPassword(mailPassword)) {
            log.warn("""
                    
                    ========== Gmail SMTP не е конфигуриран ==========
                    В application-local.yml задайте spring.mail.password с Gmail App Password
                    (https://myaccount.google.com/apppasswords – нужна е 2FA).
                    Докато паролата е грешна, имейлите НЯМА да се изпращат.
                    При „Забравена парола“ линкът ще се появява в тази конзола (Fallback link).
                    ==================================================
                    """);
            return;
        }
        if (mailUsername == null || mailUsername.isBlank()) {
            log.warn("spring.mail.username е празен – задайте вашия Gmail в application-local.yml");
            return;
        }
        String from = appMailProperties.getMail().getFrom();
        if (from != null && !from.contains(mailUsername)) {
            log.warn(
                    "app.mail.from ({}) трябва да съвпада с spring.mail.username ({}) за Gmail",
                    from,
                    mailUsername
            );
        }
        log.info("Gmail SMTP конфигуриран за изпращане на имейли (username: {})", mailUsername);
    }

    static boolean isPlaceholderPassword(String password) {
        if (password == null || password.isBlank()) {
            return true;
        }
        String p = password.trim();
        return p.contains("ПОСТАВИ")
                || p.equalsIgnoreCase("your-app-password")
                || p.length() < 16;
    }
}
