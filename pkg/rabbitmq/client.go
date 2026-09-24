package rabbitmq

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Client struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewClient(host string, port int, username, password, vhost string) (*Client, error) {
	uri := fmt.Sprintf("amqp://%s:%s@%s:%d/%s",
		username, password, host, port, vhost,
	)

	conn, err := amqp.Dial(uri)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open RabbitMQ channel: %w", err)
	}

	return &Client{conn: conn, channel: ch}, nil
}

func (c *Client) Publish(exchange string, routingKey string, body []byte) error {
	return c.channel.Publish(exchange, routingKey, false, false, amqp.Publishing{
		ContentType: "application/octet-stream",
		Body:        body,
	})
}

func (c *Client) DeclareQueue(name string) (amqp.Queue, error) {
	return c.channel.QueueDeclare(
		name,
		true,
		false,
		false,
		false,
		nil,
	)
}

func (c *Client) Subscribe(queue string, handler func([]byte)) error {
	msgs, err := c.channel.Consume(queue, "", true, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("failed to consume from queue %s: %w", queue, err)
	}

	go func() {
		for msg := range msgs {
			handler(msg.Body)
		}
	}()

	return nil
}

func (c *Client) Close() error {
	if err := c.channel.Close(); err != nil {
		return err
	}
	return c.conn.Close()
}
