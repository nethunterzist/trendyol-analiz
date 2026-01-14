/**
 * Category Configuration
 * Shared icons and color schemes for Trendyol categories
 */

export const CATEGORY_CONFIG = {
  'Elektronik': {
    icon: '💻',
    colors: 'from-blue-500 to-indigo-500'
  },
  'Moda': {
    icon: '👗',
    colors: 'from-pink-500 to-rose-500'
  },
  'Ev & Yaşam': {
    icon: '🏠',
    colors: 'from-green-500 to-emerald-500'
  },
  'Süpermarket': {
    icon: '🛒',
    colors: 'from-orange-500 to-amber-500'
  },
  'Kozmetik': {
    icon: '💄',
    colors: 'from-purple-500 to-violet-500'
  },
  'Ayakkabı & Çanta': {
    icon: '👞',
    colors: 'from-red-500 to-pink-500'
  },
  'Saat & Aksesuar': {
    icon: '⌚',
    colors: 'from-yellow-500 to-orange-500'
  },
  'Anne & Bebek': {
    icon: '👶',
    colors: 'from-cyan-500 to-blue-500'
  },
  'Spor & Outdoor': {
    icon: '⚽',
    colors: 'from-teal-500 to-cyan-500'
  },
  'Kitap': {
    icon: '📚',
    colors: 'from-indigo-500 to-purple-500'
  }
}

/**
 * Get category icon
 * @param {string} categoryName - Category name
 * @returns {string} Category icon emoji
 */
export function getCategoryIcon(categoryName) {
  return CATEGORY_CONFIG[categoryName]?.icon || '📦'
}

/**
 * Get category gradient colors
 * @param {string} categoryName - Category name
 * @returns {string} Tailwind gradient classes
 */
export function getCategoryColors(categoryName) {
  return CATEGORY_CONFIG[categoryName]?.colors || 'from-gray-500 to-slate-500'
}
