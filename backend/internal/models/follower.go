package models

import (
	"time"
)

// Follower represents a follow relationship between users
type Follower struct {
	ID         string    `json:"id" db:"id"`
	FollowerID string    `json:"followerId" db:"follower_id"`
	FollowedID string    `json:"followedId" db:"followed_id"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
}

// FollowStatus represents whether a user is following another user
type FollowStatus struct {
	IsFollowing bool `json:"isFollowing"`
}

// UserWithFollowCount extends UserResponse with follower counts
type UserWithFollowCount struct {
	UserResponse
	FollowerCount  int  `json:"followerCount"`
	FollowingCount int  `json:"followingCount"`
	IsFollowing    bool `json:"isFollowing,omitempty"`
}
