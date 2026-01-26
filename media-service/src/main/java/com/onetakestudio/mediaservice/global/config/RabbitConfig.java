package com.onetakestudio.mediaservice.global.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String EXCHANGE_NAME = "media.exchange";
    public static final String RECORDING_STOPPED_QUEUE = "recording.stopped.queue";
    public static final String RECORDING_STOPPED_ROUTING_KEY = "recording.stopped";

    @Bean
    public TopicExchange mediaExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue recordingStoppedQueue() {
        return new Queue(RECORDING_STOPPED_QUEUE, true);
    }

    @Bean
    public Binding recordingStoppedBinding(Queue recordingStoppedQueue, TopicExchange mediaExchange) {
        return BindingBuilder.bind(recordingStoppedQueue).to(mediaExchange).with(RECORDING_STOPPED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter messageConverter) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter);
        return rabbitTemplate;
    }
}
