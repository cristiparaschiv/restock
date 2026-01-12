export interface UserPreferences {
  category_order?: string[];
  unit_system?: 'metric' | 'imperial';
}

export interface User {
  id: string;
  email: string;
  preferred_language: 'en' | 'ro';
  preferences: UserPreferences | null;
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Ingredient {
  amount: string | null;
  unit: string | null;
  name: string;
}

export interface NutritionInfo {
  calories_per_serving: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  nutrition_source?: string | null;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  tags: string[];
  source_url: string | null;
  original_language: string;
  is_favorite: boolean;
  is_shared: boolean;
  share_token: string | null;
  notes: string | null;
  rating: number | null;
  nutrition: NutritionInfo | null;
  family_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeShareResponse {
  share_token: string;
  share_url: string;
  is_shared: boolean;
}

export interface RecipeListResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Ingredient Search (Cook from Ingredients)
export interface RecipeMatchResult {
  recipe: Recipe;
  matched_ingredients: string[];
  missing_ingredients: string[];
  match_percentage: number;
  match_count: number;
  total_ingredients: number;
}

export interface IngredientSearchResponse {
  results: RecipeMatchResult[];
  total: number;
}

export interface RecipeCreate {
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions?: string[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  tags?: string[];
  language: 'en' | 'ro';
  nutrition?: NutritionInfo;
}

export interface RecipeFullResponse {
  id: string;
  title_en: string | null;
  title_ro: string | null;
  description_en: string | null;
  description_ro: string | null;
  ingredients_en: Ingredient[] | null;
  ingredients_ro: Ingredient[] | null;
  instructions_en: string[] | null;
  instructions_ro: string[] | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  tags: string[] | null;
  source_url: string | null;
  original_language: string;
  rating: number | null;
  nutrition: NutritionInfo | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeUpdate {
  title_en?: string;
  title_ro?: string;
  description_en?: string;
  description_ro?: string;
  ingredients_en?: Ingredient[];
  ingredients_ro?: Ingredient[];
  instructions_en?: string[];
  instructions_ro?: string[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  image_url?: string | null;
  tags?: string[];
  notes?: string;
  nutrition?: NutritionInfo;
}

// Recipe Import Preview
export interface RecipePreview {
  url: string;
  extraction_method: 'scraper' | 'custom' | 'ai';
  detected_language: 'en' | 'ro';
  title: string | null;
  description: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  tags: string[];
  nutrition: NutritionInfo | null;
}

export interface RecipeConfirmImport {
  url: string;
  language: 'en' | 'ro';
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  image_url?: string;
  tags?: string[];
  nutrition?: NutritionInfo;
}

// Categories
export interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  recipe_count: number;
  created_at: string;
  updated_at: string;
}

// Collections
export interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  cover_image_url: string | null;
  recipe_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionWithRecipes extends Collection {
  recipe_ids: string[];
}

export interface CollectionCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface CollectionUpdate {
  name?: string;
  description?: string;
  color?: string;
}

export interface CategoryCreate {
  name: string;
  color?: string;
  icon?: string;
}

export interface CategoryUpdate {
  name?: string;
  color?: string;
  icon?: string;
}

// Family Sharing
export interface FamilyMember {
  id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  member_count: number;
  members: FamilyMember[];
  created_at: string;
  updated_at: string;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  family_name: string;
  email: string;
  invited_by: string;
  inviter_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string | null;
}

export interface FamilyCreate {
  name: string;
}

// Meal Planning
export interface MealPlan {
  id: string;
  week_start: string;
  items: MealPlanItem[];
  family_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlanItem {
  id: string;
  recipe_id: string;
  recipe: Recipe;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes: string | null;
}

export interface MealPlanItemCreate {
  recipe_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
  notes?: string;
}

// Shopping Lists
export interface ShoppingList {
  id: string;
  name: string | null;
  meal_plan_id: string | null;
  store_id: string | null;
  items: ShoppingListItem[];
  family_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  ingredient_name: string;
  amount: string | null;
  unit: string | null;
  is_checked: boolean;
  category: string | null;
  source_recipes: { recipe_id: string; recipe_title: string }[];
}

// Nutrition
export interface DailyNutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealPlanNutrition {
  day_0: DailyNutrition;
  day_1: DailyNutrition;
  day_2: DailyNutrition;
  day_3: DailyNutrition;
  day_4: DailyNutrition;
  day_5: DailyNutrition;
  day_6: DailyNutrition;
}

// Stores
export interface Store {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  category_order: string[] | null;
  color: string | null;
  is_default: boolean;
  family_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreCreate {
  name: string;
  location?: string;
  notes?: string;
  category_order?: string[];
  color?: string;
  is_default?: boolean;
  family_id?: string;
}

// Pantry
export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'counter' | 'other';

export interface PantryItem {
  id: string;
  ingredient_name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
  location: StorageLocation;
  expiration_date: string | null;
  purchase_date: string | null;
  notes: string | null;
  min_quantity: string | null;
  store_id: string | null;
  family_id: string | null;
  days_until_expiration: number | null;
  is_expiring_soon: boolean;
  created_at: string;
  updated_at: string;
}

export interface PantryItemCreate {
  ingredient_name: string;
  amount?: string;
  unit?: string;
  category?: string;
  location?: StorageLocation;
  expiration_date?: string;
  purchase_date?: string;
  notes?: string;
  min_quantity?: string;
  store_id?: string;
  family_id?: string;
}

export interface PantryItemListResponse {
  items: PantryItem[];
  expiring_soon_count: number;
  total_count: number;
}

// Price History
export interface PriceHistory {
  id: string;
  ingredient_name: string;
  price: number;
  currency: string;
  amount: string | null;
  unit: string | null;
  store_id: string | null;
  store_name: string | null;
  recorded_date: string;
  notes: string | null;
  created_at: string;
}

export interface PriceHistoryCreate {
  ingredient_name: string;
  price: number;
  currency?: string;
  amount?: string;
  unit?: string;
  store_id?: string;
  recorded_date?: string;
  notes?: string;
  family_id?: string;
}

export interface PriceTrend {
  ingredient_name: string;
  current_price: number | null;
  average_price: number;
  min_price: number;
  max_price: number;
  price_change_percent: number | null;
  history: PriceHistory[];
}

// Shopping Suggestions
export type SuggestionReason = 'meal_plan' | 'low_stock' | 'expiring_soon';

export interface ShoppingSuggestion {
  ingredient_name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
  reason: SuggestionReason;
  source_recipes: string[] | null;
  current_pantry_amount: string | null;
  expiration_date: string | null;
}
