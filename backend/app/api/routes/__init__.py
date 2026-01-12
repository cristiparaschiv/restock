from fastapi import APIRouter

from app.api.routes import auth, recipes, categories, collections, families, meal_plans, shopping_lists, stores, pantry, prices

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(collections.router, prefix="/collections", tags=["collections"])
api_router.include_router(families.router, prefix="/families", tags=["families"])
api_router.include_router(meal_plans.router, prefix="/meal-plans", tags=["meal-plans"])
api_router.include_router(shopping_lists.router, prefix="/shopping-lists", tags=["shopping-lists"])
api_router.include_router(stores.router, prefix="/stores", tags=["stores"])
api_router.include_router(pantry.router, prefix="/pantry", tags=["pantry"])
api_router.include_router(prices.router, prefix="/prices", tags=["prices"])
