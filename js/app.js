/**
 * Main Application Controller for "What's for Dinner?"
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const btnSearchSubmit = document.getElementById('btn-search-submit');
  
  const filterPills = document.getElementById('filter-pills');
  const recipesGrid = document.getElementById('recipes-grid');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const emptyTitle = document.getElementById('empty-title');
  const emptyDescription = document.getElementById('empty-description');
  const btnResetSearch = document.getElementById('btn-reset-search');

  const resultsHeading = document.getElementById('results-heading');
  const resultsCountPill = document.getElementById('results-count-pill');
  const tabAllRecipes = document.getElementById('tab-all-recipes');
  const tabFavoriteRecipes = document.getElementById('tab-favorite-recipes');
  const tabFavCounter = document.getElementById('tab-fav-counter');
  const favoritesCountHeader = document.getElementById('favorites-count');
  const btnToggleFavorites = document.getElementById('btn-toggle-favorites');
  const btnSurpriseHeader = document.getElementById('btn-surprise-header');

  const recipeModal = document.getElementById('recipe-modal');
  const modalContainer = document.getElementById('modal-container');
  const modalContent = document.getElementById('modal-content');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const toastContainer = document.getElementById('toast-container');

  // Application State
  let currentMeals = [];
  let currentActiveTab = 'all'; // 'all' or 'favorites'
  let activeCategory = 'all';

  // --- Initial Setup ---
  initApp();

  async function initApp() {
    updateFavoritesBadge();
    setupEventListeners();
    await loadInitialMeals();
  }

  /**
   * Loads initial recipes (popular dinner favorites)
   */
  async function loadInitialMeals() {
    showLoading(true);
    resultsHeading.textContent = 'Featured Delicious Meals';
    try {
      // Default query 'chicken' or category to populate rich starter meals
      const meals = await MealAPI.searchMeals('chicken');
      currentMeals = meals || [];
      renderRecipes(currentMeals);
    } catch (err) {
      console.error(err);
      showEmptyState('Unable to load recipes', 'Please check your internet connection and try again.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Set up all UI event listeners
   */
  function setupEventListeners() {
    // Search form submission
    searchForm.addEventListener('submit', handleSearch);

    // Search input clearing & input changes
    searchInput.addEventListener('input', () => {
      btnClearSearch.style.display = searchInput.value.trim() ? 'inline-flex' : 'none';
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.style.display = 'none';
      searchInput.focus();
    });

    // Reset button in empty state
    btnResetSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.style.display = 'none';
      setActiveCategoryPill('all');
      switchTab('all');
      loadInitialMeals();
    });

    // Category filter pills
    filterPills.addEventListener('click', async (e) => {
      const pill = e.target.closest('.pill-btn');
      if (!pill) return;

      const category = pill.dataset.category;
      if (!category) return;

      setActiveCategoryPill(category);
      searchInput.value = '';
      btnClearSearch.style.display = 'none';
      switchTab('all');

      await filterByCategory(category);
    });

    // Surprise Me Button
    btnSurpriseHeader.addEventListener('click', handleSurpriseMe);

    // View tab switching (All vs Favorites)
    tabAllRecipes.addEventListener('click', () => switchTab('all'));
    tabFavoriteRecipes.addEventListener('click', () => switchTab('favorites'));
    btnToggleFavorites.addEventListener('click', () => switchTab('favorites'));

    // Modal close listeners
    btnCloseModal.addEventListener('click', closeModal);
    recipeModal.addEventListener('click', (e) => {
      if (e.target === recipeModal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && recipeModal.classList.contains('open')) {
        closeModal();
      }
    });

    // Listen to Favorites storage updates
    window.addEventListener('favoritesUpdated', (e) => {
      updateFavoritesBadge();
      if (currentActiveTab === 'favorites') {
        renderFavoritesView();
      } else {
        // Refresh heart icons in existing rendered cards
        updateRenderedCardFavIcons();
      }
    });
  }

  /**
   * Handle Search Form submission
   */
  async function handleSearch(e) {
    if (e) e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    switchTab('all');
    setActiveCategoryPill(null); // clear category pill highlights
    showLoading(true);
    resultsHeading.textContent = `Results for "${query}"`;

    try {
      const meals = await MealAPI.searchMeals(query);
      currentMeals = meals || [];
      if (currentMeals.length === 0) {
        showEmptyState(
          `No recipes found for "${query}"`,
          'Try typing another common ingredient like paneer, potato, beef, rice, or search by dish name.'
        );
      } else {
        renderRecipes(currentMeals);
      }
    } catch (err) {
      console.error(err);
      showEmptyState('Something went wrong', 'Could not complete the search. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Filter meals by Category
   */
  async function filterByCategory(category) {
    activeCategory = category;
    showLoading(true);

    if (category === 'all') {
      resultsHeading.textContent = 'Featured Delicious Meals';
      await loadInitialMeals();
      return;
    }

    resultsHeading.textContent = `${category} Recipes`;

    try {
      const meals = await MealAPI.getMealsByCategory(category);
      currentMeals = meals || [];
      if (currentMeals.length === 0) {
        showEmptyState(`No recipes found in ${category}`, 'Please try choosing a different category.');
      } else {
        renderRecipes(currentMeals);
      }
    } catch (err) {
      console.error(err);
      showEmptyState('Error loading category', 'Please check your connection and try again.');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Surprise Me Handler — Picks a random recipe and directly opens detail view!
   */
  async function handleSurpriseMe() {
    btnSurpriseHeader.disabled = true;
    const originalText = btnSurpriseHeader.innerHTML;
    btnSurpriseHeader.innerHTML = `<span>🎲</span><span>Rolling...</span>`;

    try {
      const randomMeal = await MealAPI.getRandomMeal();
      if (randomMeal) {
        showToast(`🎲 Surprise! Here is "${randomMeal.strMeal}"`);
        openRecipeModal(randomMeal);
      } else {
        showToast('Could not fetch random recipe. Try again!');
      }
    } catch (err) {
      console.error(err);
      showToast('Error picking surprise recipe.');
    } finally {
      btnSurpriseHeader.disabled = false;
      btnSurpriseHeader.innerHTML = originalText;
    }
  }

  /**
   * Render recipe cards into the grid
   */
  function renderRecipes(meals) {
    recipesGrid.innerHTML = '';
    emptyState.style.display = 'none';
    recipesGrid.style.display = 'grid';

    resultsCountPill.textContent = `${meals.length} recipe${meals.length === 1 ? '' : 's'}`;

    meals.forEach(meal => {
      const isFav = FavoritesStore.isFavorite(meal.idMeal);
      const card = document.createElement('article');
      card.className = 'recipe-card';
      card.setAttribute('data-id', meal.idMeal);

      const categoryTag = meal.strCategory ? `<span class="card-tag">${meal.strCategory}</span>` : '';
      const areaTag = meal.strArea ? `<span class="card-tag">🌍 ${meal.strArea}</span>` : '';

      card.innerHTML = `
        <div class="card-image-wrap">
          <img 
            src="${meal.strMealThumb}" 
            alt="${escapeHtml(meal.strMeal)}" 
            class="card-img" 
            loading="lazy" 
          />
          ${meal.strCategory ? `<span class="card-badge">${meal.strCategory}</span>` : ''}
          <button 
            type="button" 
            class="card-fav-btn ${isFav ? 'is-favorite' : ''}" 
            title="${isFav ? 'Remove from favorites' : 'Save to favorites'}"
            aria-label="${isFav ? 'Remove from favorites' : 'Save to favorites'}"
          >
            ${isFav ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="card-content">
          <h3 class="card-title" title="${escapeHtml(meal.strMeal)}">${escapeHtml(meal.strMeal)}</h3>
          <div class="card-tags">
            ${areaTag}
            ${categoryTag}
          </div>
          <div class="card-actions">
            <button type="button" class="card-btn-view" data-id="${meal.idMeal}">
              <span>View Recipe & Steps</span>
              <span>→</span>
            </button>
          </div>
        </div>
      `;

      // Favorite toggle button
      const favBtn = card.querySelector('.card-fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const saved = FavoritesStore.toggle(meal);
        favBtn.classList.toggle('is-favorite', saved);
        favBtn.innerHTML = saved ? '❤️' : '🤍';
        favBtn.title = saved ? 'Remove from favorites' : 'Save to favorites';
        showToast(saved ? `❤️ Added "${meal.strMeal}" to favorites!` : `Removed from favorites.`);
      });

      // View recipe details on card click
      const viewBtn = card.querySelector('.card-btn-view');
      viewBtn.addEventListener('click', () => loadAndOpenRecipeModal(meal.idMeal));

      // Click anywhere on card (except fav button) to view
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-fav-btn')) {
          loadAndOpenRecipeModal(meal.idMeal);
        }
      });

      recipesGrid.appendChild(card);
    });
  }

  /**
   * Switch between All Recipes and Favorites tabs
   */
  function switchTab(tab) {
    currentActiveTab = tab;
    if (tab === 'all') {
      tabAllRecipes.classList.add('active');
      tabFavoriteRecipes.classList.remove('active');
      emptyState.style.display = 'none';

      if (currentMeals.length > 0) {
        renderRecipes(currentMeals);
      } else {
        loadInitialMeals();
      }
    } else {
      tabAllRecipes.classList.remove('active');
      tabFavoriteRecipes.classList.add('active');
      renderFavoritesView();
    }
  }

  /**
   * Render the saved favorites list
   */
  function renderFavoritesView() {
    resultsHeading.textContent = 'Your Saved Favorite Recipes';
    const favs = FavoritesStore.getAll();
    if (favs.length === 0) {
      showEmptyState(
        'No Saved Recipes Yet',
        'Click the ❤️ heart icon on any recipe card to save it here for quick access later!'
      );
      resultsCountPill.textContent = '0 recipes';
    } else {
      renderRecipes(favs);
    }
  }

  /**
   * Fetch full recipe details and open modal
   */
  async function loadAndOpenRecipeModal(mealId) {
    showToast('Loading recipe details...');
    try {
      const fullMeal = await MealAPI.getMealById(mealId);
      if (fullMeal) {
        openRecipeModal(fullMeal);
      } else {
        showToast('Recipe details could not be found.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error opening recipe.');
    }
  }

  /**
   * Populate and display the recipe detail modal
   */
  function openRecipeModal(meal) {
    const isFav = FavoritesStore.isFavorite(meal.idMeal);
    const ingredients = MealAPI.extractIngredients(meal);

    const ingredientsHTML = ingredients.map((item, idx) => `
      <label class="ingredient-item" for="ing-${idx}">
        <input type="checkbox" id="ing-${idx}" />
        <span class="ingredient-measure">${escapeHtml(item.measure)}</span>
        <span class="ingredient-name">${escapeHtml(item.name)}</span>
      </label>
    `).join('');

    const youtubeBtn = meal.strYoutube ? `
      <a href="${meal.strYoutube}" target="_blank" rel="noopener noreferrer" class="btn-youtube">
        <span>▶ Watch Video Tutorial</span>
      </a>
    ` : '';

    const sourceBtn = meal.strSource ? `
      <a href="${meal.strSource}" target="_blank" rel="noopener noreferrer" class="btn-source">
        <span>📖 Original Recipe Source</span>
      </a>
    ` : '';

    modalContent.innerHTML = `
      <div class="modal-hero">
        <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" />
        <div class="modal-hero-gradient"></div>
        <div class="modal-hero-badge-wrap">
          ${meal.strCategory ? `<span class="modal-badge">🍽 ${meal.strCategory}</span>` : ''}
          ${meal.strArea ? `<span class="modal-badge">🌍 ${meal.strArea} Cuisine</span>` : ''}
        </div>
      </div>

      <div class="modal-content-wrap">
        <div class="modal-title-row">
          <h2 class="modal-recipe-title" id="modal-recipe-title">${escapeHtml(meal.strMeal)}</h2>
          <button 
            type="button" 
            class="btn-modal-fav ${isFav ? 'is-favorite' : ''}" 
            id="modal-fav-toggle" 
            title="${isFav ? 'Remove from favorites' : 'Save to favorites'}"
          >
            ${isFav ? '❤️' : '🤍'}
          </button>
        </div>

        <h3 class="modal-section-title">
          <span>🥕 Ingredients & Checklist</span>
          <span style="font-size: 0.85rem; color: var(--text-dim); font-weight: normal;">(Check off as you cook)</span>
        </h3>
        <div class="ingredients-list">
          ${ingredientsHTML || '<p class="text-muted">No specific ingredient list provided.</p>'}
        </div>

        <h3 class="modal-section-title">👨‍🍳 Cooking Instructions</h3>
        <div class="instructions-text">
          ${escapeHtml(meal.strInstructions || 'No step-by-step instructions available for this recipe.')}
        </div>

        <div class="modal-actions-bar">
          ${youtubeBtn}
          ${sourceBtn}
        </div>
      </div>
    `;

    // Modal favorite button
    const modalFavBtn = modalContent.querySelector('#modal-fav-toggle');
    modalFavBtn.addEventListener('click', () => {
      const saved = FavoritesStore.toggle(meal);
      modalFavBtn.classList.toggle('is-favorite', saved);
      modalFavBtn.innerHTML = saved ? '❤️' : '🤍';
      showToast(saved ? `❤️ Saved "${meal.strMeal}"!` : `Removed from favorites.`);
    });

    // Show modal
    recipeModal.style.display = 'flex';
    // Trigger CSS opacity transition
    requestAnimationFrame(() => {
      recipeModal.classList.add('open');
      document.body.style.overflow = 'hidden'; // prevent background scrolling
    });
  }

  function closeModal() {
    recipeModal.classList.remove('open');
    setTimeout(() => {
      recipeModal.style.display = 'none';
      document.body.style.overflow = '';
      modalContent.innerHTML = '';
    }, 250);
  }

  /**
   * Helper: Show loading state skeletons
   */
  function showLoading(isLoading) {
    if (isLoading) {
      loadingState.style.display = 'grid';
      recipesGrid.style.display = 'none';
      emptyState.style.display = 'none';
    } else {
      loadingState.style.display = 'none';
    }
  }

  /**
   * Helper: Show Empty State with custom message
   */
  function showEmptyState(title, description) {
    recipesGrid.style.display = 'none';
    emptyState.style.display = 'block';
    emptyTitle.textContent = title;
    emptyDescription.textContent = description;
    resultsCountPill.textContent = '0 recipes';
  }

  /**
   * Update all badge counters across the app
   */
  function updateFavoritesBadge() {
    const count = FavoritesStore.count();
    favoritesCountHeader.textContent = count;
    tabFavCounter.textContent = count;
  }

  /**
   * Refresh favorite heart icons on already rendered cards
   */
  function updateRenderedCardFavIcons() {
    const cards = recipesGrid.querySelectorAll('.recipe-card');
    cards.forEach(card => {
      const id = card.getAttribute('data-id');
      const btn = card.querySelector('.card-fav-btn');
      if (btn && id) {
        const isFav = FavoritesStore.isFavorite(id);
        btn.classList.toggle('is-favorite', isFav);
        btn.innerHTML = isFav ? '❤️' : '🤍';
      }
    });
  }

  /**
   * Set active visual state for category pill
   */
  function setActiveCategoryPill(category) {
    const pills = filterPills.querySelectorAll('.pill-btn');
    pills.forEach(pill => {
      if (category && pill.dataset.category === category) {
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
      } else {
        pill.classList.remove('active');
        pill.setAttribute('aria-selected', 'false');
      }
    });
  }

  /**
   * Toast notification helper
   */
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Sanitize text helper
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
