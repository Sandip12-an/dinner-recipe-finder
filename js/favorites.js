/**
 * Favorites Management Module
 * Persists bookmarked recipes to localStorage
 */

const FavoritesStore = (() => {
  const STORAGE_KEY = 'whats_for_dinner_favorites_v1';

  /**
   * Retrieve all saved recipes from localStorage
   */
  function getAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to read favorites from localStorage:', e);
      return [];
    }
  }

  /**
   * Check if a recipe is saved as favorite
   */
  function isFavorite(idMeal) {
    if (!idMeal) return false;
    const list = getAll();
    return list.some(item => String(item.idMeal) === String(idMeal));
  }

  /**
   * Add or remove a recipe from favorites
   * Returns true if added, false if removed
   */
  function toggle(meal) {
    if (!meal || !meal.idMeal) return false;
    let list = getAll();
    const existingIndex = list.findIndex(item => String(item.idMeal) === String(meal.idMeal));
    let isNowSaved = false;

    if (existingIndex > -1) {
      list.splice(existingIndex, 1);
      isNowSaved = false;
    } else {
      // Store compact representation
      list.unshift({
        idMeal: meal.idMeal,
        strMeal: meal.strMeal,
        strMealThumb: meal.strMealThumb,
        strCategory: meal.strCategory || '',
        strArea: meal.strArea || ''
      });
      isNowSaved = true;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { count: list.length, isSaved: isNowSaved, meal }
      }));
    } catch (e) {
      console.error('Failed to write favorites to localStorage:', e);
    }

    return isNowSaved;
  }

  /**
   * Get total number of saved recipes
   */
  function count() {
    return getAll().length;
  }

  return {
    getAll,
    isFavorite,
    toggle,
    count
  };
})();
