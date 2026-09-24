package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"platform/internal/config"
	"platform/internal/database/models"
	"platform/internal/service"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

func AzureProviders(azureConfig config.AzureAuthConfig) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !azureEnabled(azureConfig) {
			return c.Status(200).JSON(fiber.Map{
				"providers": []fiber.Map{},
			})
		}
		return c.Status(200).JSON(fiber.Map{
			"providers": []fiber.Map{
				{
					"name":         "azure",
					"active":       true,
					"redirect_url": azureConfig.RedirectURL,
					"scopes":       azureConfig.Scopes,
				},
			},
		})
	}
}

func AzureLogin(authService *service.AuthService, azureConfig config.AzureAuthConfig) fiber.Handler {
	return func(c fiber.Ctx) error {
		if c.Params("name") != "azure" {
			return c.Status(400).JSON(fiber.Map{
				"error": "Provider not found",
			})
		}
		if !azureEnabled(azureConfig) {
			return c.Status(400).JSON(fiber.Map{
				"error": "Azure auth is not configured",
			})
		}

		// Generate nonce for additional entropy
		nonce := make([]byte, 16)
		_, err := rand.Read(nonce)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to generate nonce",
			})
		}

		// Encrypt state with user data
		stateData := map[string]interface{}{
			"client_ip": c.IP(),
			"timestamp": time.Now().Unix(),
			"nonce":     base64.URLEncoding.EncodeToString(nonce),
			"provider":  "azure",
		}

		encryptedState, err := authService.EncryptState(stateData)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to generate state",
			})
		}

		oauthConfig := azureOAuthConfig(azureConfig)
		authURL := oauthConfig.AuthCodeURL(
			encryptedState,
			oauth2.AccessTypeOffline,
			oauth2.SetAuthURLParam("response_mode", "form_post"),
		)

		return c.Redirect().Status(302).To(authURL)
	}
}

func AzureCallback(
	authService *service.AuthService,
	userService *service.UserService,
	azureConfig config.AzureAuthConfig,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if c.Params("name") != "azure" {
			return c.Status(400).JSON(fiber.Map{
				"error": "Provider not found",
			})
		}
		code := c.Query("code")
		encryptedState := c.Query("state")
		if code == "" {
			code = c.FormValue("code")
		}
		if encryptedState == "" {
			encryptedState = c.FormValue("state")
		}

		if code == "" {
			return c.Status(400).JSON(fiber.Map{
				"error": "Authorization code not found",
			})
		}

		// Decrypt and validate state
		stateData, err := authService.DecryptState(encryptedState)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid state - possible CSRF attack",
			})
		}

		// Validate timestamp (10 minutes max)
		timestamp, ok := stateData["timestamp"].(float64)
		if !ok || time.Now().Unix()-int64(timestamp) > 600 {
			return c.Status(400).JSON(fiber.Map{
				"error": "State expired",
			})
		}

		// Validate client IP matches
		clientIP, ok := stateData["client_ip"].(string)
		if !ok || clientIP != c.IP() {
			return c.Status(400).JSON(fiber.Map{
				"error": "Client IP mismatch - possible attack",
			})
		}

		if !azureEnabled(azureConfig) {
			return c.Status(400).JSON(fiber.Map{
				"error": "Azure auth is not configured",
			})
		}

		// Get provider name from state
		providerName, ok := stateData["provider"].(string)
		if !ok || providerName != "azure" {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid provider in state",
			})
		}

		// Exchange code for token
		oauthConfig := azureOAuthConfig(azureConfig)
		token, err := oauthConfig.Exchange(context.Background(), code)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to exchange token",
			})
		}

		userInfo, err := fetchAzureUserInfo(oauthConfig, token, azureUserInfoURL())
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to fetch user info",
			})
		}

		email := resolveAzureEmail(userInfo)
		if email == "" {
			email = emailFromIDToken(token)
		}
		if email == "" {
			return c.Status(400).JSON(fiber.Map{
				"error": "Azure user has no email",
			})
		}

		user, err := userService.GetByEmail(email)
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(500).JSON(fiber.Map{
					"error": "Failed to load user",
				})
			}
			user, err = userService.CreateExternalUser(email, models.SourceAzure)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{
					"error": "Failed to create user",
				})
			}
		} else if user.Source != models.SourceAzure {
			return c.Status(403).JSON(fiber.Map{
				"error": "Account already exists as a local user",
			})
		}

		groups, err := fetchAzureGroups(oauthConfig, token)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Azure groepen laden mislukt",
			})
		}

		adminGroup := strings.ToLower(strings.TrimSpace(azureConfig.AdminGroupName))
		userGroup := strings.ToLower(strings.TrimSpace(azureConfig.UserGroupName))
		isAdmin := adminGroup != "" && containsGroup(groups, adminGroup)
		isUser := userGroup != "" && containsGroup(groups, userGroup)
		if !isAdmin && !isUser {
			return c.Status(403).JSON(fiber.Map{
				"error":  "Azure user is not in the required groups",
				"groups": map[string]string{"user": userGroup, "admin": adminGroup},
			})
		}
		role := models.PlatformRoleUser
		if isAdmin {
			role = models.PlatformRoleAdmin
		}
		if err := userService.SetPlatformRole(user.ID, role); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "rol opslaan mislukt",
			})
		}

		jwtToken, err := authService.GenerateJWT(user.ID, user.Email, role)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to generate token",
			})
		}

		if azureConfig.FrontendLoginURL != "" {
			redirectURL, err := url.Parse(azureConfig.FrontendLoginURL)
			if err == nil {
				q := redirectURL.Query()
				q.Set("token", jwtToken)
				redirectURL.RawQuery = q.Encode()
				return c.Redirect().Status(302).To(redirectURL.String())
			}
		}

		return c.Status(200).JSON(fiber.Map{
			"token": jwtToken,
			"data": fiber.Map{
				"user": user,
			},
		})
	}
}

func AzureLogout(c fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"actions": "azure logout",
	})
}

type azureUserInfo struct {
	Email             string `json:"email"`
	PreferredUsername string `json:"preferred_username"`
	Mail              string `json:"mail"`
	UPN               string `json:"upn"`
	UserPrincipalName string `json:"userPrincipalName"`
	UniqueName        string `json:"unique_name"`
}

type azureGroup struct {
	DisplayName string `json:"displayName"`
	OdataType   string `json:"@odata.type"`
}

type azureGroupResponse struct {
	Value    []azureGroup `json:"value"`
	NextLink string       `json:"@odata.nextLink"`
}

func fetchAzureUserInfo(conf *oauth2.Config, token *oauth2.Token, userInfoURL string) (*azureUserInfo, error) {
	client := conf.Client(context.Background(), token)
	resp, err := client.Get(userInfoURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("user info status: %d", resp.StatusCode)
	}

	var out azureUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func fetchAzureGroups(conf *oauth2.Config, token *oauth2.Token) ([]string, error) {
	client := conf.Client(context.Background(), token)
	url := "https://graph.microsoft.com/v1.0/me/memberOf?$select=displayName"
	out := make([]string, 0)
	for url != "" {
		payload, err := fetchAzureGroupPage(client, url)
		if err != nil {
			return nil, err
		}
		for _, group := range payload.Value {
			if group.OdataType != "" && group.OdataType != "#microsoft.graph.group" {
				continue
			}
			name := strings.TrimSpace(group.DisplayName)
			if name != "" {
				out = append(out, strings.ToLower(name))
			}
		}
		url = payload.NextLink
	}

	return out, nil
}

func fetchAzureGroupPage(client *http.Client, pageURL string) (*azureGroupResponse, error) {
	resp, err := client.Get(pageURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("groups status: %d", resp.StatusCode)
	}

	var payload azureGroupResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	return &payload, nil
}

func containsGroup(groups []string, target string) bool {
	for _, group := range groups {
		if strings.EqualFold(group, target) {
			return true
		}
	}
	return false
}

func resolveAzureEmail(info *azureUserInfo) string {
	candidates := []string{
		info.Email,
		info.PreferredUsername,
		info.Mail,
		info.UPN,
		info.UserPrincipalName,
		info.UniqueName,
	}
	for _, value := range candidates {
		value = strings.TrimSpace(value)
		if value != "" {
			return strings.ToLower(value)
		}
	}
	return ""
}

func emailFromIDToken(token *oauth2.Token) string {
	raw, ok := token.Extra("id_token").(string)
	if !ok || raw == "" {
		return ""
	}
	parser := jwt.NewParser()
	claims := jwt.MapClaims{}
	if _, _, err := parser.ParseUnverified(raw, claims); err != nil {
		return ""
	}

	keys := []string{"email", "preferred_username", "upn", "unique_name"}
	for _, key := range keys {
		if val, ok := claims[key]; ok {
			if s, ok := val.(string); ok && strings.TrimSpace(s) != "" {
				return strings.ToLower(strings.TrimSpace(s))
			}
		}
	}
	return ""
}

func azureEnabled(conf config.AzureAuthConfig) bool {
	return conf.TenantId != "" &&
		conf.ClientId != "" &&
		conf.ClientSecret != "" &&
		conf.RedirectURL != "" &&
		conf.EncryptionKey != ""
}

func azureOAuthConfig(conf config.AzureAuthConfig) *oauth2.Config {
	scopes := parseScopes(conf.Scopes)
	base := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0", conf.TenantId)
	return &oauth2.Config{
		ClientID:     conf.ClientId,
		ClientSecret: conf.ClientSecret,
		RedirectURL:  conf.RedirectURL,
		Scopes:       scopes,
		Endpoint: oauth2.Endpoint{
			AuthURL:  fmt.Sprintf("%s/authorize", base),
			TokenURL: fmt.Sprintf("%s/token", base),
		},
	}
}

func azureUserInfoURL() string {
	return "https://graph.microsoft.com/oidc/userinfo"
}

func parseScopes(scopes string) []string {
	if strings.TrimSpace(scopes) == "" {
		return []string{"openid", "profile", "email"}
	}
	parts := strings.Split(scopes, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
