package com.tessera.backend.web;

import com.tessera.backend.words.EmptyWordPoolException;
import java.time.format.DateTimeParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ErrorBody(String error, String message) {}

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> api(ApiException e) {
        return ResponseEntity.status(e.status()).body(new ErrorBody(e.code(), e.getMessage()));
    }

    @ExceptionHandler({DateTimeParseException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorBody> badDate(Exception e) {
        return ResponseEntity.badRequest().body(new ErrorBody("invalid-date", "Dates must look like 2026-10-27"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentNotValidException.class})
    ResponseEntity<ErrorBody> badBody(Exception e) {
        return ResponseEntity.badRequest().body(new ErrorBody("invalid-request", "Request body is missing or malformed"));
    }

    @ExceptionHandler(EmptyWordPoolException.class)
    ResponseEntity<ErrorBody> noWords(EmptyWordPoolException e) {
        log.error(e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorBody("no-puzzle", "Today's puzzle is not available. Please try again later."));
    }
}
