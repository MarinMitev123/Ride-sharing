package com.example.carpool.mail;

import com.example.carpool.config.AppMailProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Забравена парола: реални имейли → SMTP; тестови домейни (example.com и др.) → само конзола.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetMailService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);

    private final AppMailProperties appProperties;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public void deliverPasswordResetLink(String recipientEmail, String resetLink) {
        if (appProperties.isConsoleOnlyEmail(recipientEmail)) {
            log.info("Password reset (console only, test domain): {} -> {}", recipientEmail, resetLink);
            return;
        }

        if (!appProperties.getMail().isEnabled()) {
            log.info("Password reset (mail disabled, console): {} -> {}", recipientEmail, resetLink);
            return;
        }

        if (mailSender == null) {
            log.warn(
                    "app.mail.enabled=true but spring.mail is not configured. Reset link for {}: {}",
                    recipientEmail,
                    resetLink
            );
            return;
        }

        if (MailStartupValidator.isPlaceholderPassword(mailPassword)) {
            log.error(
                    "Gmail App Password липсва в application-local.yml. Reset link (копирай от тук): {}",
                    resetLink
            );
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            // Gmail изисква From = същият акаунт като username при SMTP
            String from = mailUsername != null && !mailUsername.isBlank()
                    ? mailUsername
                    : appProperties.getMail().getFrom();
            message.setFrom(from);
            message.setTo(recipientEmail);
            message.setSubject("Възстановяване на парола – Carpool");
            message.setText(buildBody(resetLink));
            mailSender.send(message);
            log.info("Password reset email sent to {}", recipientEmail);
        } catch (Exception e) {
            String hint = e.getMessage() != null && e.getMessage().contains("Authentication failed")
                    ? " Проверете Gmail App Password в application-local.yml (16 символа, не обикновената парола)."
                    : "";
            log.error(
                    "Failed to send password reset email to {}{} Fallback link: {}",
                    recipientEmail,
                    hint,
                    resetLink,
                    e
            );
        }
    }

    private static String buildBody(String resetLink) {
        return """
                Здравейте,

                Получихте тази заявка, защото е поискано възстановяване на парола за акаунт в Carpool.

                Отворете линка по-долу (валиден 30 минути):
                %s

                Ако не сте поискали смяна на парола, игнорирайте този имейл.

                Екипът на Carpool
                """.formatted(resetLink);
    }
}
