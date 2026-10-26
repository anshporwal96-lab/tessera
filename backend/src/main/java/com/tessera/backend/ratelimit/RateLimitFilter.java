package com.tessera.backend.ratelimit;

import com.tessera.backend.ratelimit.RateLimiter.Kind;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Applies {@link RateLimiter} to /api/**, keyed by client IP. In the prod
 * profile the IP comes from X-Forwarded-For set by the reverse proxy
 * (server.forward-headers-strategy=framework), so the API must not be reachable
 * except through that proxy.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter limiter;

    public RateLimitFilter(RateLimiter limiter) {
        this.limiter = limiter;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !limiter.enabled() || !request.getRequestURI().startsWith("/api/") || "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long retryAfter = limiter.check(classify(request), request.getRemoteAddr());
        if (retryAfter > 0) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(retryAfter));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"error\":\"rate-limited\",\"message\":\"Too many requests. Please wait a moment and try again.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    static Kind classify(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if ("POST".equals(request.getMethod())) {
            if (uri.equals("/api/players")) return Kind.REGISTER;
            if (uri.endsWith("/guesses")) return Kind.GUESS;
        }
        return Kind.READ;
    }
}
