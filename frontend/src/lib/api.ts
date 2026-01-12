import { Token, User, UserPreferences, Recipe, RecipeListResponse, RecipeCreate, RecipeFullResponse, RecipeUpdate, RecipePreview, RecipeConfirmImport, RecipeShareResponse, IngredientSearchResponse, Category, CategoryCreate, CategoryUpdate, Collection, CollectionWithRecipes, CollectionCreate, CollectionUpdate, Family, FamilyCreate, FamilyInvite, MealPlan, MealPlanItem, MealPlanItemCreate, ShoppingList, MealPlanNutrition, Store, StoreCreate, PantryItem, PantryItemCreate, PantryItemListResponse, StorageLocation, PriceHistory, PriceHistoryCreate, PriceTrend, ShoppingSuggestion } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(tokens: Token) {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      // Try to refresh token
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          throw new Error(await retryResponse.text());
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || 'An error occurred');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (response.ok) {
        const tokens: Token = await response.json();
        this.setTokens(tokens);
        return true;
      }
    } catch {
      // Refresh failed
    }
    this.clearTokens();
    return false;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Auth endpoints
  async register(email: string, password: string, preferredLanguage: string = 'en'): Promise<Token> {
    const tokens = await this.fetch<Token>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, preferred_language: preferredLanguage }),
    });
    this.setTokens(tokens);
    return tokens;
  }

  async login(email: string, password: string): Promise<Token> {
    const tokens = await this.fetch<Token>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(tokens);
    return tokens;
  }

  logout() {
    this.clearTokens();
  }

  async getCurrentUser(): Promise<User> {
    return this.fetch<User>('/api/auth/me');
  }

  async updateUserPreferences(
    preferredLanguage?: string,
    preferences?: Partial<UserPreferences>
  ): Promise<User> {
    const params = new URLSearchParams();
    if (preferredLanguage) {
      params.append('preferred_language', preferredLanguage);
    }
    if (preferences) {
      params.append('preferences', JSON.stringify(preferences));
    }
    return this.fetch<User>(`/api/auth/me?${params.toString()}`, {
      method: 'PATCH',
    });
  }

  // Recipe endpoints
  async importRecipe(url: string): Promise<Recipe> {
    return this.fetch<Recipe>('/api/recipes/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async previewImport(url: string): Promise<RecipePreview> {
    return this.fetch<RecipePreview>('/api/recipes/preview', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async confirmImport(data: RecipeConfirmImport): Promise<Recipe> {
    return this.fetch<Recipe>('/api/recipes/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRecipe(data: RecipeCreate): Promise<Recipe> {
    return this.fetch<Recipe>('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRecipes(
    page: number = 1,
    perPage: number = 20,
    search?: string,
    favorite?: boolean,
    categoryId?: string,
    maxTime?: number,
    hasNutrition?: boolean,
    minRating?: number
  ): Promise<RecipeListResponse> {
    let endpoint = `/api/recipes?page=${page}&per_page=${perPage}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    if (favorite) {
      endpoint += `&favorite=true`;
    }
    if (categoryId) {
      endpoint += `&category_id=${categoryId}`;
    }
    if (maxTime) {
      endpoint += `&max_time=${maxTime}`;
    }
    if (hasNutrition) {
      endpoint += `&has_nutrition=true`;
    }
    if (minRating) {
      endpoint += `&min_rating=${minRating}`;
    }
    return this.fetch<RecipeListResponse>(endpoint);
  }

  async getRecipe(id: string, lang?: string): Promise<Recipe> {
    let endpoint = `/api/recipes/${id}`;
    if (lang) {
      endpoint += `?lang=${lang}`;
    }
    return this.fetch<Recipe>(endpoint);
  }

  async getRecipeFull(id: string): Promise<RecipeFullResponse> {
    return this.fetch<RecipeFullResponse>(`/api/recipes/${id}/full`);
  }

  async updateRecipe(id: string, data: RecipeUpdate): Promise<Recipe> {
    return this.fetch<Recipe>(`/api/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRecipe(id: string): Promise<void> {
    return this.fetch<void>(`/api/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadRecipeImage(id: string, file: File): Promise<Recipe> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}/api/recipes/${id}/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to upload image' }));
      throw new Error(error.detail || 'Failed to upload image');
    }

    return response.json();
  }

  async deleteRecipeImage(id: string): Promise<void> {
    return this.fetch<void>(`/api/recipes/${id}/image`, {
      method: 'DELETE',
    });
  }

  async retranslateRecipe(id: string): Promise<Recipe> {
    return this.fetch<Recipe>(`/api/recipes/${id}/retranslate`, {
      method: 'POST',
    });
  }

  async toggleFavorite(id: string): Promise<{ is_favorite: boolean }> {
    return this.fetch<{ is_favorite: boolean }>(`/api/recipes/${id}/favorite`, {
      method: 'PATCH',
    });
  }

  async updateRating(id: string, rating: number | null): Promise<{ rating: number | null }> {
    const endpoint = rating !== null
      ? `/api/recipes/${id}/rating?rating=${rating}`
      : `/api/recipes/${id}/rating`;
    return this.fetch<{ rating: number | null }>(endpoint, {
      method: 'PATCH',
    });
  }

  // Ingredient search (Cook from Ingredients)
  async searchByIngredients(
    ingredients: string[],
    minMatchPercentage: number = 0
  ): Promise<IngredientSearchResponse> {
    let endpoint = `/api/recipes/search-by-ingredients`;
    if (minMatchPercentage > 0) {
      endpoint += `?min_match_percentage=${minMatchPercentage}`;
    }
    return this.fetch<IngredientSearchResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ ingredients }),
    });
  }

  async getIngredientSuggestions(query: string): Promise<{ suggestions: string[] }> {
    return this.fetch<{ suggestions: string[] }>(
      `/api/recipes/ingredient-suggestions?query=${encodeURIComponent(query)}`
    );
  }

  // Recipe sharing
  async enableSharing(recipeId: string): Promise<RecipeShareResponse> {
    return this.fetch<RecipeShareResponse>(`/api/recipes/${recipeId}/share`, {
      method: 'POST',
    });
  }

  async disableSharing(recipeId: string): Promise<void> {
    return this.fetch<void>(`/api/recipes/${recipeId}/share`, {
      method: 'DELETE',
    });
  }

  async getSharedRecipe(token: string, lang?: string): Promise<Recipe> {
    let endpoint = `/api/recipes/share/${token}`;
    if (lang) {
      endpoint += `?lang=${lang}`;
    }
    // Public endpoint - no auth needed
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Recipe not found' }));
      throw new Error(error.detail || 'Recipe not found');
    }
    return response.json();
  }

  // Category endpoints
  async getCategories(): Promise<Category[]> {
    const response = await this.fetch<{ categories: Category[] }>('/api/categories');
    return response.categories;
  }

  async createCategory(data: CategoryCreate): Promise<Category> {
    return this.fetch<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: CategoryUpdate): Promise<Category> {
    return this.fetch<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<void> {
    return this.fetch<void>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async addRecipeToCategory(recipeId: string, categoryId: string): Promise<void> {
    return this.fetch<void>(`/api/recipes/${recipeId}/categories/${categoryId}`, {
      method: 'POST',
    });
  }

  async removeRecipeFromCategory(recipeId: string, categoryId: string): Promise<void> {
    return this.fetch<void>(`/api/recipes/${recipeId}/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Collection endpoints
  async getCollections(): Promise<Collection[]> {
    const response = await this.fetch<{ collections: Collection[] }>('/api/collections');
    return response.collections;
  }

  async getCollection(id: string): Promise<CollectionWithRecipes> {
    return this.fetch<CollectionWithRecipes>(`/api/collections/${id}`);
  }

  async createCollection(data: CollectionCreate): Promise<Collection> {
    return this.fetch<Collection>('/api/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCollection(id: string, data: CollectionUpdate): Promise<Collection> {
    return this.fetch<Collection>(`/api/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCollection(id: string): Promise<void> {
    return this.fetch<void>(`/api/collections/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadCollectionCover(id: string, file: File): Promise<Collection> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}/api/collections/${id}/cover`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to upload cover' }));
      throw new Error(error.detail || 'Failed to upload cover');
    }

    return response.json();
  }

  async deleteCollectionCover(id: string): Promise<void> {
    return this.fetch<void>(`/api/collections/${id}/cover`, {
      method: 'DELETE',
    });
  }

  async addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
    return this.fetch<void>(`/api/collections/${collectionId}/recipes/${recipeId}`, {
      method: 'POST',
    });
  }

  async removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<void> {
    return this.fetch<void>(`/api/collections/${collectionId}/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  }

  // Family endpoints
  async getFamilies(): Promise<Family[]> {
    const response = await this.fetch<{ families: Family[] }>('/api/families');
    return response.families;
  }

  async getFamily(id: string): Promise<Family> {
    return this.fetch<Family>(`/api/families/${id}`);
  }

  async createFamily(data: FamilyCreate): Promise<Family> {
    return this.fetch<Family>('/api/families', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFamily(id: string, name: string): Promise<Family> {
    return this.fetch<Family>(`/api/families/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteFamily(id: string): Promise<void> {
    return this.fetch<void>(`/api/families/${id}`, {
      method: 'DELETE',
    });
  }

  async regenerateFamilyInviteCode(id: string): Promise<Family> {
    return this.fetch<Family>(`/api/families/${id}/regenerate-code`, {
      method: 'POST',
    });
  }

  async joinFamily(inviteCode: string): Promise<{ family: Family; message: string }> {
    return this.fetch<{ family: Family; message: string }>(`/api/families/join/${inviteCode}`, {
      method: 'POST',
    });
  }

  async inviteToFamily(familyId: string, email: string): Promise<FamilyInvite> {
    return this.fetch<FamilyInvite>(`/api/families/${familyId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getPendingInvites(): Promise<FamilyInvite[]> {
    const response = await this.fetch<{ invites: FamilyInvite[] }>('/api/families/invites/pending');
    return response.invites;
  }

  async acceptInvite(inviteId: string): Promise<{ family: Family; message: string }> {
    return this.fetch<{ family: Family; message: string }>(`/api/families/invites/${inviteId}/accept`, {
      method: 'POST',
    });
  }

  async declineInvite(inviteId: string): Promise<void> {
    return this.fetch<void>(`/api/families/invites/${inviteId}/decline`, {
      method: 'POST',
    });
  }

  async removeFamilyMember(familyId: string, userId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateMemberRole(familyId: string, userId: string, role: 'admin' | 'member'): Promise<{ role: string }> {
    return this.fetch<{ role: string }>(`/api/families/${familyId}/members/${userId}/role?role=${role}`, {
      method: 'PATCH',
    });
  }

  async shareRecipeToFamily(familyId: string, recipeId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/share/recipe/${recipeId}`, {
      method: 'POST',
    });
  }

  async unshareRecipeFromFamily(familyId: string, recipeId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/share/recipe/${recipeId}`, {
      method: 'DELETE',
    });
  }

  async shareShoppingListToFamily(familyId: string, listId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/share/shopping-list/${listId}`, {
      method: 'POST',
    });
  }

  async unshareShoppingListFromFamily(familyId: string, listId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/share/shopping-list/${listId}`, {
      method: 'DELETE',
    });
  }

  async shareMealPlanToFamily(familyId: string, planId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/share/meal-plan/${planId}`, {
      method: 'POST',
    });
  }

  async unshareMealPlanFromFamily(familyId: string, planId: string): Promise<void> {
    return this.fetch<void>(`/api/families/${familyId}/share/meal-plan/${planId}`, {
      method: 'DELETE',
    });
  }

  // Meal Plan endpoints
  async getCurrentMealPlan(): Promise<MealPlan> {
    return this.fetch<MealPlan>('/api/meal-plans/current');
  }

  async getMealPlan(weekStart: string): Promise<MealPlan> {
    return this.fetch<MealPlan>(`/api/meal-plans?week_start=${weekStart}`);
  }

  async addMealPlanItem(planId: string, data: MealPlanItemCreate): Promise<MealPlanItem> {
    return this.fetch<MealPlanItem>(`/api/meal-plans/${planId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMealPlanItem(planId: string, itemId: string, data: Partial<MealPlanItemCreate>): Promise<MealPlanItem> {
    return this.fetch<MealPlanItem>(`/api/meal-plans/${planId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeMealPlanItem(planId: string, itemId: string): Promise<void> {
    return this.fetch<void>(`/api/meal-plans/${planId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async getMealPlanNutrition(planId: string): Promise<MealPlanNutrition> {
    return this.fetch<MealPlanNutrition>(`/api/meal-plans/${planId}/nutrition`);
  }

  // Shopping List endpoints
  async getShoppingLists(): Promise<ShoppingList[]> {
    const response = await this.fetch<{ shopping_lists: ShoppingList[] }>('/api/shopping-lists');
    return response.shopping_lists;
  }

  async getShoppingList(id: string): Promise<ShoppingList> {
    return this.fetch<ShoppingList>(`/api/shopping-lists/${id}`);
  }

  async createShoppingList(name?: string, mealPlanId?: string): Promise<ShoppingList> {
    return this.fetch<ShoppingList>('/api/shopping-lists', {
      method: 'POST',
      body: JSON.stringify({ name, meal_plan_id: mealPlanId }),
    });
  }

  async generateShoppingListFromMealPlan(mealPlanId: string): Promise<ShoppingList> {
    return this.fetch<ShoppingList>(`/api/shopping-lists/from-meal-plan/${mealPlanId}`, {
      method: 'POST',
    });
  }

  async toggleShoppingListItem(listId: string, itemId: string): Promise<{ is_checked: boolean }> {
    return this.fetch<{ is_checked: boolean }>(`/api/shopping-lists/${listId}/items/${itemId}/check`, {
      method: 'PATCH',
    });
  }

  async addShoppingListItem(listId: string, data: { ingredient_name: string; amount?: string; unit?: string }): Promise<void> {
    return this.fetch<void>(`/api/shopping-lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeShoppingListItem(listId: string, itemId: string): Promise<void> {
    return this.fetch<void>(`/api/shopping-lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async clearCheckedItems(listId: string): Promise<void> {
    return this.fetch<void>(`/api/shopping-lists/${listId}/clear-checked`, {
      method: 'POST',
    });
  }

  async deleteShoppingList(id: string): Promise<void> {
    return this.fetch<void>(`/api/shopping-lists/${id}`, {
      method: 'DELETE',
    });
  }

  async getShoppingSuggestions(): Promise<ShoppingSuggestion[]> {
    const response = await this.fetch<{ suggestions: ShoppingSuggestion[] }>('/api/shopping-lists/suggestions/smart');
    return response.suggestions;
  }

  // Help/Info endpoints
  async getSupportedSites(): Promise<{
    library_sites: string[];
    custom_sites: string[];
    total_count: number;
    ai_extraction_available: boolean;
  }> {
    return this.fetch('/api/recipes/supported-sites');
  }

  // Store endpoints
  async getStores(): Promise<Store[]> {
    const response = await this.fetch<{ stores: Store[] }>('/api/stores');
    return response.stores;
  }

  async getStore(id: string): Promise<Store> {
    return this.fetch<Store>(`/api/stores/${id}`);
  }

  async createStore(data: StoreCreate): Promise<Store> {
    return this.fetch<Store>('/api/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStore(id: string, data: Partial<StoreCreate>): Promise<Store> {
    return this.fetch<Store>(`/api/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStore(id: string): Promise<void> {
    return this.fetch<void>(`/api/stores/${id}`, {
      method: 'DELETE',
    });
  }

  async setDefaultStore(id: string): Promise<Store> {
    return this.fetch<Store>(`/api/stores/${id}/set-default`, {
      method: 'POST',
    });
  }

  // Pantry endpoints
  async getPantryItems(location?: StorageLocation): Promise<PantryItemListResponse> {
    const params = location ? `?location=${location}` : '';
    return this.fetch<PantryItemListResponse>(`/api/pantry${params}`);
  }

  async getPantryItem(id: string): Promise<PantryItem> {
    return this.fetch<PantryItem>(`/api/pantry/${id}`);
  }

  async createPantryItem(data: PantryItemCreate): Promise<PantryItem> {
    return this.fetch<PantryItem>('/api/pantry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePantryItem(id: string, data: Partial<PantryItemCreate>): Promise<PantryItem> {
    return this.fetch<PantryItem>(`/api/pantry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePantryItem(id: string): Promise<void> {
    return this.fetch<void>(`/api/pantry/${id}`, {
      method: 'DELETE',
    });
  }

  async getExpiringItems(days: number = 7): Promise<{ items: PantryItem[] }> {
    return this.fetch<{ items: PantryItem[] }>(`/api/pantry/expiring?days=${days}`);
  }

  async addPantryItemFromShoppingItem(
    shoppingItemId: string,
    data: { expiration_date?: string; location?: StorageLocation; notes?: string }
  ): Promise<PantryItem> {
    return this.fetch<PantryItem>('/api/pantry/from-shopping-item', {
      method: 'POST',
      body: JSON.stringify({ shopping_list_item_id: shoppingItemId, ...data }),
    });
  }

  async searchPantryItems(query: string): Promise<PantryItemListResponse> {
    return this.fetch<PantryItemListResponse>(`/api/pantry/search?q=${encodeURIComponent(query)}`);
  }

  // Price History endpoints
  async getPriceHistory(ingredientName?: string): Promise<{ history: PriceHistory[] }> {
    const params = ingredientName ? `?ingredient_name=${encodeURIComponent(ingredientName)}` : '';
    return this.fetch<{ history: PriceHistory[] }>(`/api/prices${params}`);
  }

  async getIngredientPriceHistory(ingredientName: string): Promise<{ history: PriceHistory[] }> {
    return this.fetch<{ history: PriceHistory[] }>(`/api/prices/ingredient/${encodeURIComponent(ingredientName)}`);
  }

  async recordPrice(data: PriceHistoryCreate): Promise<PriceHistory> {
    return this.fetch<PriceHistory>('/api/prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPriceTrends(): Promise<{ ingredients: PriceTrend[] }> {
    return this.fetch<{ ingredients: PriceTrend[] }>('/api/prices/trends');
  }

  async deletePrice(id: string): Promise<void> {
    return this.fetch<void>(`/api/prices/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
