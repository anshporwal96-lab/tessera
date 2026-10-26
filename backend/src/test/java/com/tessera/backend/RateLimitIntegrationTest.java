package com.tessera.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.tessera.backend.support.TestDatabaseConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "tessera.rate-limit.register.capacity=2",
    "tessera.rate-limit.register.refill-per-minute=1",
    "tessera.rate-limit.read.capacity=3",
})
@AutoConfigureMockMvc
@Import(TestDatabaseConfig.class)
class RateLimitIntegrationTest {

    @Autowired MockMvc mvc;

    @Test
    void registrationIsLimitedPerClientIp() throws Exception {
        mvc.perform(post("/api/players").with(r -> { r.setRemoteAddr("10.0.0.1"); return r; })).andExpect(status().isCreated());
        mvc.perform(post("/api/players").with(r -> { r.setRemoteAddr("10.0.0.1"); return r; })).andExpect(status().isCreated());
        mvc.perform(post("/api/players").with(r -> { r.setRemoteAddr("10.0.0.1"); return r; }))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(jsonPath("$.error").value("rate-limited"));
        // A different client is unaffected.
        mvc.perform(post("/api/players").with(r -> { r.setRemoteAddr("10.0.0.2"); return r; })).andExpect(status().isCreated());
    }

    @Test
    void readsAreLimitedButHealthChecksAreNot() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/daily/2026-10-27/summary").with(r -> { r.setRemoteAddr("10.0.0.9"); return r; }))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/daily/2026-10-27/summary").with(r -> { r.setRemoteAddr("10.0.0.9"); return r; }))
                .andExpect(status().isTooManyRequests());
        mvc.perform(get("/actuator/health").with(r -> { r.setRemoteAddr("10.0.0.9"); return r; })).andExpect(status().isOk());
    }
}
