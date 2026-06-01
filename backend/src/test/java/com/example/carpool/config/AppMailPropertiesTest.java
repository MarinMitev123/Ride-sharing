package com.example.carpool.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AppMailPropertiesTest {

    @Test
    void isConsoleOnlyEmail_forExampleAndTestDomains() {
        AppMailProperties props = new AppMailProperties();
        assertThat(props.isConsoleOnlyEmail("test@example.com")).isTrue();
        assertThat(props.isConsoleOnlyEmail("user@mail.test.com")).isTrue();
        assertThat(props.isConsoleOnlyEmail("a@localhost")).isTrue();
    }

    @Test
    void isConsoleOnlyEmail_forRealGmail() {
        AppMailProperties props = new AppMailProperties();
        assertThat(props.isConsoleOnlyEmail("marin@gmail.com")).isFalse();
        assertThat(props.isConsoleOnlyEmail("name@abv.bg")).isFalse();
    }
}
