import { SlotType } from '../types';

export const getPhaseColor = (name: string) => {
  const n = name.toLowerCase();
  if (n === 'blank' || n === 'unscheduled') return '#FFFFFF';
  if (n.includes('orientation')) return '#A6A6A6';
  if (n.includes('co-curricular')) return '#FFC000';
  if (n.includes('university')) return '#FF00FF';
  if (n.includes('mid term') || n.includes('sessional') || n.includes('exam') || n.includes('ia')) return '#FFFF00';
  if (n.includes('clinical')) return '#00B0F0';
  if (n.includes('prep')) return '#C6E0B4';
  if (n.includes('vacation') || n.includes('diwali') || n.includes('holi')) return '#FF0000';
  if (n.includes('lab') || n.includes('skill') || n.includes('live class')) return '#92D050';
  if (n.includes('theory')) return '#FF99CC';
  return '#FFFFFF';
};

export const getSlotColor = (type: string) => {
  switch (type) {
    case SlotType.THEORY: return '#FF99CC';
    case SlotType.LAB: return '#92D050';
    case SlotType.CLINICAL: return '#00B0F0';
    case SlotType.CO_CURRICULAR: return '#FFC000';
    case SlotType.CA: return '#FFC000';
    case SlotType.PREP_LEAVE: return '#C6E0B4';
    case SlotType.EXAM: return '#FFFF00';
    case SlotType.ORIENTATION: return '#A6A6A6';
    default: return '#A6A6A6';
  }
};
