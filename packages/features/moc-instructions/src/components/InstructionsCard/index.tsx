import React from 'react';
import type { MockInstructionCardProps } from '../../schemas';
import {
  formatTime,
  calculateTotalParts,
  calculateTotalTime,
  getDifficultyColor,
  getDifficultyLabel,
  formatDate,
} from '../../utils';

export const InstructionsCard: React.FC<MockInstructionCardProps> = ({
  instruction,
  onView,
  onEdit,
  onDelete,
  isEditable = false,
  className = '',
}) => {
  const totalParts = calculateTotalParts(instruction);
  const totalTime = calculateTotalTime(instruction);
  const difficultyColor = getDifficultyColor(instruction.difficulty);

  return (
    <div className={`moc-instruction-card ${className}`}>
      <div className="card-header">
        {instruction.coverImage && (
          <div className="cover-image">
            <img
              src={instruction.coverImage}
              alt={`Cover for ${instruction.title}`}
              className="cover-img"
            />
          </div>
        )}
        
        <div className="card-content">
          <h3 className="instruction-title">{instruction.title}</h3>
          <p className="instruction-description">{instruction.description}</p>
          
          <div className="instruction-meta">
            <span className="author">By {instruction.author}</span>
            <span className="category">{instruction.category}</span>
            <span
              className="difficulty"
              style={{ color: difficultyColor }}
            >
              {getDifficultyLabel(instruction.difficulty)}
            </span>
          </div>

          <div className="instruction-stats">
            <div className="stat">
              <span className="stat-label">Steps:</span>
              <span className="stat-value">{instruction.steps.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Parts:</span>
              <span className="stat-value">{totalParts}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Time:</span>
              <span className="stat-value">{formatTime(totalTime)}</span>
            </div>
            {instruction.rating && (
              <div className="stat">
                <span className="stat-label">Rating:</span>
                <span className="stat-value">{instruction.rating}/5</span>
              </div>
            )}
          </div>

          {instruction.tags.length > 0 && (
            <div className="instruction-tags">
              {instruction.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="instruction-footer">
            <span className="created-date">
              Created {formatDate(instruction.createdAt)}
            </span>
            
            <div className="card-actions">
              {onView && (
                <button
                  type="button"
                  onClick={onView}
                  className="view-button"
                  aria-label="View instruction"
                >
                  View
                </button>
              )}
              
              {isEditable && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="edit-button"
                  aria-label="Edit instruction"
                >
                  Edit
                </button>
              )}
              
              {isEditable && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="delete-button"
                  aria-label="Delete instruction"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsCard; 