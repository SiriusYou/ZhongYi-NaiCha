/**
 * Utility functions for the WeChat mini-program
 */

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format time to HH:MM string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string
 */
const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format date and time to YYYY-MM-DD HH:MM string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date and time string
 */
const formatDateTime = (date) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

/**
 * Calculate age from birth date
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @returns {number} Age in years
 */
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Calculate BMI from height and weight
 * @param {number} height - Height in cm
 * @param {number} weight - Weight in kg
 * @returns {number} BMI value
 */
const calculateBMI = (height, weight) => {
  if (!height || !weight) return 0;
  
  // Convert height from cm to m
  const heightInM = height / 100;
  
  // BMI = weight / (height^2)
  return weight / (heightInM * heightInM);
};

/**
 * Get BMI category based on BMI value
 * @param {number} bmi - BMI value
 * @returns {string} BMI category
 */
const getBMICategory = (bmi) => {
  if (bmi < 18.5) {
    return '体重过轻';
  } else if (bmi >= 18.5 && bmi < 24.0) {
    return '体重正常';
  } else if (bmi >= 24.0 && bmi < 28.0) {
    return '超重';
  } else if (bmi >= 28.0) {
    return '肥胖';
  }
  
  return '未知';
};

/**
 * Format number to display with specified decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined) return '';
  return value.toFixed(decimals);
};

/**
 * Check if a date is today
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} True if date is today
 */
const isToday = (dateStr) => {
  const today = new Date();
  const date = new Date(dateStr);
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Format date string to friendly display format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} User-friendly date string
 */
const formatFriendlyDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isToday(dateStr)) {
    return '今天';
  } else if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return '昨天';
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  calculateAge,
  calculateBMI,
  getBMICategory,
  formatNumber,
  isToday,
  formatFriendlyDate
}; 