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
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 ${className}`}>
      <div className="relative">
        {instruction.coverImageUrl && (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={instruction.coverImageUrl}
              alt={`Cover for ${instruction.title}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{instruction.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-3">{instruction.description}</p>
          
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-medium">By {instruction.author}</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{instruction.category}</span>
            <span
              className="font-semibold"
              style={{ color: difficultyColor }}
            >
              {getDifficultyLabel(instruction.difficulty)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Steps:</span>
              <span className="font-semibold text-gray-900">{instruction.steps.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Parts:</span>
              <span className="font-semibold text-gray-900">{totalParts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Time:</span>
              <span className="font-semibold text-gray-900">{formatTime(totalTime)}</span>
            </div>
            {instruction.rating && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Rating:</span>
                <span className="font-semibold text-gray-900">{instruction.rating}/5</span>
              </div>
            )}
          </div>

          {instruction.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {instruction.tags.map((tag: string) => (
                <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Created {formatDate(instruction.createdAt)}
            </span>
            
            <div className="flex gap-2">
              {onView && (
                <button
                  type="button"
                  onClick={onView}
                  className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
                  aria-label="View instruction"
                >
                  View
                </button>
              )}
              
              {isEditable && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3 py-1 text-xs font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Edit instruction"
                >
                  Edit
                </button>
              )}
              
              {isEditable && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
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