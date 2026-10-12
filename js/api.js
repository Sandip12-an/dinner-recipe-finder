/**
 * TheMealDB API Integration Module
 * Base endpoint: https://www.themealdb.com/api/json/v1/1/
 */

const MealAPI = (() => {
  const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

  /**
   * Helper to fetch and parse JSON safely
   */
  async function fetchJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('MealAPI fetch error:', err);
      return null;
    }
  }

  /**
   * Smart Search: Combines both ingredient search and meal name search
   * to ensure ingredients like "paneer", "chicken", "egg" or dish names
   * like "curry", "pasta", "soup" yield the best comprehensive results.
   */
  async function searchMeals(query) {
    if (!query || !query.trim()) return [];
    const cleanQuery = query.trim().toLowerCase();

    // Run both searches in parallel: by ingredient & by meal name
    const [byIngredientData, byNameData] = await Promise.all([
      fetchJSON(`${BASE_URL}/filter.php?i=${encodeURIComponent(cleanQuery)}`),
      fetchJSON(`${BASE_URL}/search.php?s=${encodeURIComponent(cleanQuery)}`)
    ]);

    const mealsMap = new Map();

    // Priority 1: Full meal objects from search.php (they contain area/category/ingredients)
    if (byNameData && Array.isArray(byNameData.meals)) {
      byNameData.meals.forEach(meal => {
        mealsMap.set(meal.idMeal, meal);
      });
    }

    // Priority 2: Ingredient filter results (if not already present)
    if (byIngredientData && Array.isArray(byIngredientData.meals)) {
      byIngredientData.meals.forEach(meal => {
        if (!mealsMap.has(meal.idMeal)) {
          mealsMap.set(meal.idMeal, {
            ...meal,
            strCategory: 'Ingredient Match',
            strArea: ''
          });
        }
      });
    }

    return Array.from(mealsMap.values());
  }

  /**
   * Fetch meals filtered by category (e.g. Vegetarian, Seafood, Dessert)
   */
  async function getMealsByCategory(category) {
    if (!category || category === 'all') {
      return await searchMeals('a'); // default popular meal selection
    }
    const data = await fetchJSON(`${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`);
    return data && Array.isArray(data.meals) ? data.meals : [];
  }

  /**
   * Fetch full recipe details by meal ID
   */
  async function getMealById(id) {
    if (!id) return null;
    const data = await fetchJSON(`${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`);
    if (data && Array.isArray(data.meals) && data.meals.length > 0) {
      return data.meals[0];
    }
    return null;
  }

  /**
   * Fetch a single random recipe ("Surprise Me" feature)
   */
  async function getRandomMeal() {
    const data = await fetchJSON(`${BASE_URL}/random.php`);
    if (data && Array.isArray(data.meals) && data.meals.length > 0) {
      return data.meals[0];
    }
    return null;
  }

  /**
   * Extract ingredients and measurements into a structured array
   */
  function extractIngredients(meal) {
    const ingredients = [];
    if (!meal) return ingredients;

    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        ingredients.push({
          name: ingredient.trim(),
          measure: measure ? measure.trim() : ''
        });
      }
    }
    return ingredients;
  }

  return {
    searchMeals,
    getMealsByCategory,
    getMealById,
    getRandomMeal,
    extractIngredients
  };
})();
