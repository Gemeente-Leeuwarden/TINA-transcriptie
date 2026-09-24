package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"platform/internal/config"
	"platform/internal/database/models"
	"platform/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

type rabbitQueueInfo struct {
	Name                   string `json:"name"`
	Messages               int    `json:"messages"`
	MessagesReady          int    `json:"messages_ready"`
	MessagesUnacknowledged int    `json:"messages_unacknowledged"`
	Consumers              int    `json:"consumers"`
}

type rabbitQueueMessage struct {
	Payload         any             `json:"payload"`
	PayloadEncoding string          `json:"payload_encoding"`
	Properties      json.RawMessage `json:"properties"`
	Redelivered     bool            `json:"redelivered"`
	RoutingKey      string          `json:"routing_key"`
}

type rabbitQueueMessagesRequest struct {
	Count  int    `json:"count"`
	Action string `json:"action"`
}

func AdminRabbitMQQueues(
	authService *service.AuthService,
	rabbitConfig config.RabbitMQConfig,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if claims.Role != models.PlatformRoleAdmin {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": "alleen admins hebben toegang",
			})
		}

		vhost := url.PathEscape(rabbitConfig.VHost)
		target := fmt.Sprintf("http://%s:%s/api/queues/%s",
			rabbitConfig.Host,
			strconv.Itoa(rabbitConfig.MgmtPort),
			vhost,
		)
		req, err := http.NewRequestWithContext(c.Context(), http.MethodGet, target, nil)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "verzoek maken mislukt",
			})
		}
		req.SetBasicAuth(rabbitConfig.Username, rabbitConfig.Password)

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return c.Status(http.StatusBadGateway).JSON(fiber.Map{
				"error": "rabbitmq ophalen mislukt",
			})
		}
		defer res.Body.Close()

		if res.StatusCode < 200 || res.StatusCode >= 300 {
			return c.Status(http.StatusBadGateway).JSON(fiber.Map{
				"error": fmt.Sprintf("rabbitmq antwoord: %s", res.Status),
			})
		}

		var queues []rabbitQueueInfo
		if err := json.NewDecoder(res.Body).Decode(&queues); err != nil {
			return c.Status(http.StatusBadGateway).JSON(fiber.Map{
				"error": "rabbitmq data lezen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"queues": queues,
		})
	}
}

func AdminRabbitMQQueueMessages(
	authService *service.AuthService,
	rabbitConfig config.RabbitMQConfig,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if claims.Role != models.PlatformRoleAdmin {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": "alleen admins hebben toegang",
			})
		}

		queueName := c.Params("name")
		if queueName == "" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "queue naam is verplicht",
			})
		}

		var reqBody rabbitQueueMessagesRequest
		if err := c.Bind().JSON(&reqBody); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldige payload",
			})
		}

		count := reqBody.Count
		if count <= 0 {
			count = 10
		}
		if count > 50 {
			count = 50
		}
		action := reqBody.Action
		if action == "" {
			action = "peek"
		}
		if action != "peek" && action != "drop" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldige actie",
			})
		}
		ackMode := "ack_requeue_true"
		if action == "drop" {
			ackMode = "ack_requeue_false"
		}

		vhost := url.PathEscape(rabbitConfig.VHost)
		target := fmt.Sprintf("http://%s:%s/api/queues/%s/%s/get",
			rabbitConfig.Host,
			strconv.Itoa(rabbitConfig.MgmtPort),
			vhost,
			url.PathEscape(queueName),
		)

		body, err := json.Marshal(map[string]any{
			"count":    count,
			"ackmode":  ackMode,
			"encoding": "auto",
			"truncate": 50000,
		})
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "verzoek maken mislukt",
			})
		}

		req, err := http.NewRequestWithContext(c.Context(), http.MethodPost, target, bytes.NewReader(body))
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "verzoek maken mislukt",
			})
		}
		req.SetBasicAuth(rabbitConfig.Username, rabbitConfig.Password)
		req.Header.Set("Content-Type", "application/json")

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return c.Status(http.StatusBadGateway).JSON(fiber.Map{
				"error": "rabbitmq ophalen mislukt",
			})
		}
		defer res.Body.Close()

		if res.StatusCode < 200 || res.StatusCode >= 300 {
			return c.Status(http.StatusBadGateway).JSON(fiber.Map{
				"error": fmt.Sprintf("rabbitmq antwoord: %s", res.Status),
			})
		}

		var messages []rabbitQueueMessage
		if err := json.NewDecoder(res.Body).Decode(&messages); err != nil {
			return c.Status(http.StatusBadGateway).JSON(fiber.Map{
				"error": "rabbitmq data lezen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"messages": messages,
			"count":    len(messages),
		})
	}
}
