FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp verify
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/campus-pantry-api-0.1.0.jar app.jar
ENV SPRING_PROFILES_ACTIVE=vercel PORT=8080
USER 10001
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=60.0","-XX:+ExitOnOutOfMemoryError","-jar","app.jar"]
