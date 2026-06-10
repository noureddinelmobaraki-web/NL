/**
 * يحسب نسبة تقدم الكلمة بناءً على الوقت الحالي.
 */
export const computeWordProgress = (
  currentTime: number,
  startTime: number,
  endTime: number
): number => {
  if (currentTime < startTime) return 0;
  if (currentTime > endTime) return 100;
  
  const progress = ((currentTime - startTime) / (endTime - startTime)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};
