import React, { useState } from 'react';

export interface GalleryImageCardProps {
  src: string;
  alt?: string;
  title: string;
  description?: string;
  author?: string;
  uploadDate?: string | Date;
  initialLiked?: boolean;
}

const formatDate = (date?: string | Date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
  src,
  alt = '',
  title,
  description,
  author,
  uploadDate,
  initialLiked = false,
}) => {
  const [liked, setLiked] = useState(initialLiked);

  return (
    <div
      className="gallery-image-card"
      tabIndex={0}
      aria-label={title}
      style={{
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        background: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 220,
        maxWidth: 320,
        width: '100%',
        margin: 'auto',
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingTop: '66%', background: '#f1f5f9' }}>
        <img
          src={src}
          alt={alt || title}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        />
        <button
          type="button"
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={() => setLiked(l => !l)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(255,255,255,0.85)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            fontSize: 20,
            color: liked ? '#e11d48' : '#64748b',
            transition: 'color 0.2s',
          }}
        >
          {liked ? '❤️' : '🤍'}
        </button>
      </div>
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{title}</div>
        {description && (
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8, lineHeight: 1.4 }}>{description}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto', fontSize: 13, color: '#64748b' }}>
          {author && <span style={{ marginRight: 8 }}>By {author}</span>}
          {uploadDate && <span>{formatDate(uploadDate)}</span>}
        </div>
      </div>
      {/* Storybook: Add stories for default, liked, with/without author, with/without description */}
    </div>
  );
};

export default GalleryImageCard; 