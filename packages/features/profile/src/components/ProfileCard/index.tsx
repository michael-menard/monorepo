import React from 'react';
import type { ProfileCardProps } from '../../types';
import { formatFullName, getInitials, generateAvatarPlaceholder } from '../../utils';

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onEdit,
  isEditable = false,
  className = '',
}) => {
  const fullName = formatFullName(profile);
  const initials = getInitials(profile);
  const avatarUrl = profile.avatar || generateAvatarPlaceholder(fullName);

  return (
    <div className={`profile-card ${className}`}>
      <div className="profile-card-header">
        <div className="profile-avatar">
          <img
            src={avatarUrl}
            alt={`${fullName}'s avatar`}
            className="avatar-image"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = generateAvatarPlaceholder(fullName);
            }}
          />
          {!profile.avatar && (
            <div className="avatar-placeholder">
              <span className="avatar-initials">{initials}</span>
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h2 className="profile-name">{fullName}</h2>
          {profile.username && (
            <p className="profile-username">@{profile.username}</p>
          )}
          {profile.email && (
            <p className="profile-email">{profile.email}</p>
          )}
        </div>

        {isEditable && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="edit-button"
            aria-label="Edit profile"
          >
            Edit
          </button>
        )}
      </div>

      {profile.bio && (
        <div className="profile-bio">
          <p>{profile.bio}</p>
        </div>
      )}

      <div className="profile-details">
        {profile.phone && (
          <div className="profile-detail">
            <span className="detail-label">Phone:</span>
            <span className="detail-value">{profile.phone}</span>
          </div>
        )}
        
        {profile.location && (
          <div className="profile-detail">
            <span className="detail-label">Location:</span>
            <span className="detail-value">{profile.location}</span>
          </div>
        )}
        
        {profile.website && (
          <div className="profile-detail">
            <span className="detail-label">Website:</span>
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-value link"
            >
              {profile.website}
            </a>
          </div>
        )}
        
        {profile.dateOfBirth && (
          <div className="profile-detail">
            <span className="detail-label">Birth Date:</span>
            <span className="detail-value">
              {profile.dateOfBirth.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {profile.socialLinks && (
        <div className="profile-social-links">
          <h3 className="social-links-title">Social Links</h3>
          <div className="social-links-grid">
            {profile.socialLinks.twitter && (
              <a
                href={profile.socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link twitter"
              >
                Twitter
              </a>
            )}
            {profile.socialLinks.linkedin && (
              <a
                href={profile.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link linkedin"
              >
                LinkedIn
              </a>
            )}
            {profile.socialLinks.github && (
              <a
                href={profile.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link github"
              >
                GitHub
              </a>
            )}
            {profile.socialLinks.instagram && (
              <a
                href={profile.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link instagram"
              >
                Instagram
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard; 