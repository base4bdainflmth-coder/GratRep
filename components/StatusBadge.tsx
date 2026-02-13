import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';

  const normalizedStatus = status.toLowerCase().trim();

  if (normalizedStatus.includes('aprovado')) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
  } else if (normalizedStatus.includes('análise') || normalizedStatus.includes('analise')) {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
  } else if (normalizedStatus.includes('devolvido')) {
    // Special rule: Devolvido rows are black in table, but badge can be distinct or match
    bgColor = 'bg-gray-800';
    textColor = 'text-white';
  } else if (normalizedStatus.includes('cancelado')) {
    // Special rule: Cancelado rows are red in table
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
  } else if (normalizedStatus.includes('pendente')) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {status || 'N/A'}
    </span>
  );
};

export default StatusBadge;