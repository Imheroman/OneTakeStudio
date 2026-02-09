FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]