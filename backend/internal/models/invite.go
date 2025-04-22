// backend/internal/models/invite.go (new file)
package models

import (
	"time"
)

// InviteCode represents an invite code for registration
type InviteCode struct {
	ID             string     `json:"id" db:"id"`
	Code           string     `json:"code" db:"code"`
	CreatedBy      string     `json:"createdBy" db:"created_by"`
	UsedBy         *string    `json:"usedBy,omitempty" db:"used_by"`
	UsedByUsername *string    `json:"usedByUsername,omitempty" db:"used_by_username"`
	UsedAt         *time.Time `json:"usedAt,omitempty" db:"used_at"`
	ExpiresAt      *time.Time `json:"expiresAt,omitempty" db:"expires_at"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
}
