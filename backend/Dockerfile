# syntax=docker/dockerfile:1

# ---- Build -----------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /src
# Resolve dependencies in their own layer so code changes don't re-download them.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
# Tests need an embedded PostgreSQL; they run in CI / locally (./mvnw test), not in the image build.
RUN mvn -B -q package -DskipTests && cp target/tessera-backend-*.jar /app.jar

# ---- Run -------------------------------------------------------------------
FROM eclipse-temurin:21-jre
RUN groupadd --system tessera && useradd --system --gid tessera --uid 10001 --no-create-home tessera
WORKDIR /app
COPY --from=build /app.jar app.jar
USER tessera

ENV SPRING_PROFILES_ACTIVE=prod \
    PORT=8080 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080

# exec so the JVM receives SIGTERM directly and shuts down gracefully.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
