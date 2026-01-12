from uuid import UUID
from math import ceil

from fastapi import APIRouter, HTTPException, status, Query, UploadFile, File
from sqlalchemy import select, func
from langdetect import detect, LangDetectException

from app.api.deps import DbSession, CurrentUser
from app.models.recipe import Recipe
from app.schemas.recipe import (
    RecipeCreate,
    RecipeUpdate,
    RecipeResponse,
    RecipeFullResponse,
    RecipeImport,
    RecipeListResponse,
    RecipePreviewResponse,
    RecipeConfirmImport,
    RecipeShareResponse,
    Ingredient,
    NutritionInfo,
)
from app.services.recipe_scraper import recipe_scraper_service
from app.services.translator import translator_service
from app.services.image_service import image_service
from app.services.custom_scrapers import CUSTOM_SCRAPERS

router = APIRouter()


@router.get("/supported-sites")
async def get_supported_sites():
    """Get list of supported recipe websites."""
    from recipe_scrapers import SCRAPERS

    # Get sites from recipe-scrapers library
    library_sites = set()
    for scraper in SCRAPERS.values():
        if hasattr(scraper, 'host'):
            try:
                host = scraper.host()
                if host:
                    library_sites.add(host)
            except Exception:
                pass

    # Get custom scrapers
    custom_sites = list(CUSTOM_SCRAPERS.keys())

    # Check if AI extraction is available
    from app.services.ai_recipe_extractor import ai_recipe_extractor
    ai_available = ai_recipe_extractor.is_available()

    return {
        "library_sites": sorted(library_sites),
        "custom_sites": custom_sites,
        "total_count": len(library_sites) + len(custom_sites),
        "ai_extraction_available": ai_available,
    }


def recipe_to_response(recipe: Recipe, lang: str = "en") -> RecipeResponse:
    """Convert Recipe model to localized response."""
    ingredients = recipe.get_ingredients(lang) or []
    instructions = recipe.get_instructions(lang) or []

    # Build nutrition info if any nutrition data exists
    nutrition = None
    if any([recipe.calories_per_serving, recipe.protein_g, recipe.carbs_g, recipe.fat_g]):
        nutrition = NutritionInfo(
            calories_per_serving=recipe.calories_per_serving,
            protein_g=recipe.protein_g,
            carbs_g=recipe.carbs_g,
            fat_g=recipe.fat_g,
            nutrition_source=recipe.nutrition_source,
        )

    return RecipeResponse(
        id=recipe.id,
        title=recipe.get_title(lang) or recipe.get_title("en") or "",
        description=recipe.get_description(lang) or recipe.get_description("en"),
        ingredients=[Ingredient(**ing) if isinstance(ing, dict) else ing for ing in ingredients],
        instructions=instructions,
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        total_time_minutes=recipe.total_time_minutes,
        servings=recipe.servings,
        image_url=f"/uploads/{recipe.image_path}" if recipe.image_path else recipe.original_image_url,
        tags=recipe.tags or [],
        source_url=recipe.source_url,
        original_language=recipe.original_language,
        is_favorite=recipe.is_favorite,
        is_shared=recipe.is_shared,
        share_token=recipe.share_token,
        notes=recipe.notes,
        rating=recipe.rating,
        nutrition=nutrition,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
    )


@router.post("/import", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def import_recipe(
    data: RecipeImport,
    current_user: CurrentUser,
    db: DbSession,
):
    """Import a recipe from a URL."""
    try:
        # Scrape the recipe
        scraped = await recipe_scraper_service.scrape_recipe(str(data.url))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import recipe: {str(e)}",
        )

    # Detect language from title and description
    text_to_detect = f"{scraped['title']} {scraped.get('description', '')}"
    try:
        detected_lang = detect(text_to_detect)
        # Only accept en or ro, default to en
        original_lang = detected_lang if detected_lang in ("en", "ro") else "en"
    except LangDetectException:
        original_lang = "en"

    # Create recipe object
    recipe = Recipe(
        user_id=current_user.id,
        original_language=original_lang,
        source_url=str(data.url),
        prep_time_minutes=scraped.get("prep_time_minutes"),
        cook_time_minutes=scraped.get("cook_time_minutes"),
        total_time_minutes=scraped.get("total_time_minutes"),
        servings=scraped.get("servings"),
        original_image_url=scraped.get("image_url"),
    )

    # Set content in original language
    if original_lang == "en":
        recipe.title_en = scraped["title"]
        recipe.description_en = scraped.get("description")
        recipe.ingredients_en = scraped["ingredients"]
        recipe.instructions_en = scraped["instructions"]
    else:
        recipe.title_ro = scraped["title"]
        recipe.description_ro = scraped.get("description")
        recipe.ingredients_ro = scraped["ingredients"]
        recipe.instructions_ro = scraped["instructions"]

    # Save first to get ID
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)

    # Download and save image
    if scraped.get("image_url"):
        image_path = await image_service.download_and_save(
            scraped["image_url"],
            str(recipe.id),
        )
        if image_path:
            recipe.image_path = image_path

    # Translate to other language
    try:
        target_lang = "ro" if original_lang == "en" else "en"

        translated_title = await translator_service.translate(
            scraped["title"],
            original_lang,
            target_lang,
        )

        translated_description = None
        if scraped.get("description"):
            translated_description = await translator_service.translate(
                scraped["description"],
                original_lang,
                target_lang,
            )

        translated_ingredients = await translator_service.translate_ingredients(
            scraped["ingredients"],
            original_lang,
            target_lang,
        )

        translated_instructions = await translator_service.translate_list(
            scraped["instructions"],
            original_lang,
            target_lang,
        )

        if target_lang == "en":
            recipe.title_en = translated_title
            recipe.description_en = translated_description
            recipe.ingredients_en = translated_ingredients
            recipe.instructions_en = translated_instructions
        else:
            recipe.title_ro = translated_title
            recipe.description_ro = translated_description
            recipe.ingredients_ro = translated_ingredients
            recipe.instructions_ro = translated_instructions

    except Exception as e:
        # Translation failed, but recipe is still saved
        print(f"Translation failed: {e}")

    await db.commit()
    await db.refresh(recipe)

    return recipe_to_response(recipe, current_user.preferred_language)


@router.post("/preview", response_model=RecipePreviewResponse)
async def preview_import(
    data: RecipeImport,
    current_user: CurrentUser,
):
    """Preview a recipe from a URL without saving."""
    try:
        scraped = await recipe_scraper_service.scrape_recipe(str(data.url))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scrape recipe: {str(e)}",
        )

    # Detect language
    text_to_detect = f"{scraped.get('title', '')} {scraped.get('description', '')}"
    try:
        detected_lang = detect(text_to_detect)
        detected_language = detected_lang if detected_lang in ("en", "ro") else "en"
    except LangDetectException:
        detected_language = "en"

    # Convert ingredients to schema format
    ingredients = []
    for ing in scraped.get("ingredients", []):
        if isinstance(ing, dict):
            ingredients.append(Ingredient(**ing))
        elif isinstance(ing, str):
            ingredients.append(Ingredient(name=ing))

    # Build nutrition info if available
    nutrition = None
    scraped_nutrition = scraped.get("nutrition")
    if scraped_nutrition:
        nutrition = NutritionInfo(
            calories_per_serving=scraped_nutrition.get("calories_per_serving"),
            protein_g=scraped_nutrition.get("protein_g"),
            carbs_g=scraped_nutrition.get("carbs_g"),
            fat_g=scraped_nutrition.get("fat_g"),
        )

    return RecipePreviewResponse(
        url=str(data.url),
        extraction_method=scraped.get("extraction_method", "scraper"),
        detected_language=detected_language,
        title=scraped.get("title"),
        description=scraped.get("description"),
        ingredients=ingredients,
        instructions=scraped.get("instructions", []),
        prep_time_minutes=scraped.get("prep_time_minutes"),
        cook_time_minutes=scraped.get("cook_time_minutes"),
        total_time_minutes=scraped.get("total_time_minutes"),
        servings=scraped.get("servings"),
        image_url=scraped.get("image_url"),
        tags=scraped.get("tags", []),
        nutrition=nutrition,
    )


@router.post("/confirm", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def confirm_import(
    data: RecipeConfirmImport,
    current_user: CurrentUser,
    db: DbSession,
):
    """Save a previewed recipe after user confirmation/edits."""
    original_lang = data.language

    # Create recipe object
    recipe = Recipe(
        user_id=current_user.id,
        original_language=original_lang,
        source_url=data.url,
        prep_time_minutes=data.prep_time_minutes,
        cook_time_minutes=data.cook_time_minutes,
        servings=data.servings,
        tags=data.tags if data.tags else None,
        original_image_url=data.image_url,
    )

    # Calculate total time
    if data.prep_time_minutes or data.cook_time_minutes:
        recipe.total_time_minutes = (data.prep_time_minutes or 0) + (data.cook_time_minutes or 0)

    # Set nutrition if provided
    if data.nutrition:
        recipe.calories_per_serving = data.nutrition.calories_per_serving
        recipe.protein_g = data.nutrition.protein_g
        recipe.carbs_g = data.nutrition.carbs_g
        recipe.fat_g = data.nutrition.fat_g
        recipe.nutrition_source = data.nutrition.nutrition_source or "imported"

    # Convert ingredients
    ingredients = [ing.model_dump() for ing in data.ingredients]

    # Set content in original language
    if original_lang == "en":
        recipe.title_en = data.title
        recipe.description_en = data.description
        recipe.ingredients_en = ingredients
        recipe.instructions_en = data.instructions
    else:
        recipe.title_ro = data.title
        recipe.description_ro = data.description
        recipe.ingredients_ro = ingredients
        recipe.instructions_ro = data.instructions

    # Save first to get ID
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)

    # Download and save image
    if data.image_url:
        image_path = await image_service.download_and_save(
            data.image_url,
            str(recipe.id),
        )
        if image_path:
            recipe.image_path = image_path

    # Translate to other language
    try:
        target_lang = "ro" if original_lang == "en" else "en"

        translated_title = await translator_service.translate(
            data.title,
            original_lang,
            target_lang,
        )

        translated_description = None
        if data.description:
            translated_description = await translator_service.translate(
                data.description,
                original_lang,
                target_lang,
            )

        translated_ingredients = await translator_service.translate_ingredients(
            ingredients,
            original_lang,
            target_lang,
        )

        translated_instructions = await translator_service.translate_list(
            data.instructions,
            original_lang,
            target_lang,
        )

        if target_lang == "en":
            recipe.title_en = translated_title
            recipe.description_en = translated_description
            recipe.ingredients_en = translated_ingredients
            recipe.instructions_en = translated_instructions
        else:
            recipe.title_ro = translated_title
            recipe.description_ro = translated_description
            recipe.ingredients_ro = translated_ingredients
            recipe.instructions_ro = translated_instructions

    except Exception as e:
        print(f"Translation failed: {e}")

    await db.commit()
    await db.refresh(recipe)

    return recipe_to_response(recipe, current_user.preferred_language)


@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    data: RecipeCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new recipe manually."""
    recipe = Recipe(
        user_id=current_user.id,
        original_language=data.language,
        prep_time_minutes=data.prep_time_minutes,
        cook_time_minutes=data.cook_time_minutes,
        servings=data.servings,
        tags=data.tags,
    )

    # Set nutrition if provided
    if data.nutrition:
        recipe.calories_per_serving = data.nutrition.calories_per_serving
        recipe.protein_g = data.nutrition.protein_g
        recipe.carbs_g = data.nutrition.carbs_g
        recipe.fat_g = data.nutrition.fat_g
        recipe.nutrition_source = data.nutrition.nutrition_source or "manual"

    # Calculate total time
    if data.prep_time_minutes or data.cook_time_minutes:
        recipe.total_time_minutes = (data.prep_time_minutes or 0) + (data.cook_time_minutes or 0)

    # Set content in specified language
    ingredients = [ing.model_dump() for ing in data.ingredients]
    instructions = data.instructions or []

    if data.language == "en":
        recipe.title_en = data.title
        recipe.description_en = data.description
        recipe.ingredients_en = ingredients
        recipe.instructions_en = instructions
    else:
        recipe.title_ro = data.title
        recipe.description_ro = data.description
        recipe.ingredients_ro = ingredients
        recipe.instructions_ro = instructions

    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)

    # Translate to other language
    try:
        target_lang = "ro" if data.language == "en" else "en"

        translated_title = await translator_service.translate(
            data.title,
            data.language,
            target_lang,
        )

        translated_description = None
        if data.description:
            translated_description = await translator_service.translate(
                data.description,
                data.language,
                target_lang,
            )

        translated_ingredients = await translator_service.translate_ingredients(
            ingredients,
            data.language,
            target_lang,
        )

        translated_instructions = await translator_service.translate_list(
            instructions,
            data.language,
            target_lang,
        )

        if target_lang == "en":
            recipe.title_en = translated_title
            recipe.description_en = translated_description
            recipe.ingredients_en = translated_ingredients
            recipe.instructions_en = translated_instructions
        else:
            recipe.title_ro = translated_title
            recipe.description_ro = translated_description
            recipe.ingredients_ro = translated_ingredients
            recipe.instructions_ro = translated_instructions

        await db.commit()
        await db.refresh(recipe)

    except Exception as e:
        print(f"Translation failed: {e}")

    return recipe_to_response(recipe, current_user.preferred_language)


@router.get("", response_model=RecipeListResponse)
async def list_recipes(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
    favorite: bool | None = None,
    category_id: str | None = None,
    max_time: int | None = Query(None, description="Maximum total time in minutes"),
    has_nutrition: bool | None = Query(None, description="Filter recipes with nutrition info"),
    min_rating: int | None = Query(None, ge=1, le=5, description="Minimum rating (1-5)"),
    family_id: str | None = Query(None, description="Filter by family ID"),
):
    """List all recipes for the current user and their families."""
    lang = current_user.preferred_language
    from sqlalchemy import or_, cast, String
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Base query - user's own recipes OR recipes shared with user's families
    if user_family_ids:
        query = select(Recipe).where(
            or_(
                Recipe.user_id == current_user.id,
                Recipe.family_id.in_(user_family_ids),
            )
        )
    else:
        query = select(Recipe).where(Recipe.user_id == current_user.id)

    # Filter by specific family if requested
    if family_id:
        query = query.where(Recipe.family_id == family_id)

    # Search filter - search title, description, and ingredients
    if search:
        search_term = f"%{search}%"
        if lang == "en":
            query = query.where(
                or_(
                    Recipe.title_en.ilike(search_term),
                    Recipe.description_en.ilike(search_term),
                    cast(Recipe.ingredients_en, String).ilike(search_term),
                )
            )
        else:
            query = query.where(
                or_(
                    Recipe.title_ro.ilike(search_term),
                    Recipe.description_ro.ilike(search_term),
                    cast(Recipe.ingredients_ro, String).ilike(search_term),
                )
            )

    # Favorite filter
    if favorite is True:
        query = query.where(Recipe.is_favorite == True)

    # Time filter - filter by total_time or sum of prep+cook
    if max_time is not None:
        query = query.where(
            or_(
                Recipe.total_time_minutes <= max_time,
                (Recipe.prep_time_minutes + Recipe.cook_time_minutes) <= max_time,
            )
        )

    # Nutrition filter
    if has_nutrition is True:
        query = query.where(Recipe.calories_per_serving.isnot(None))

    # Rating filter
    if min_rating is not None:
        query = query.where(Recipe.rating >= min_rating)

    # Category filter
    if category_id:
        from app.models.recipe import recipe_categories
        query = query.join(recipe_categories).where(
            recipe_categories.c.category_id == category_id
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar() or 0

    # Pagination
    query = query.order_by(Recipe.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    recipes = result.scalars().all()

    return RecipeListResponse(
        recipes=[recipe_to_response(r, lang) for r in recipes],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=ceil(total / per_page) if total > 0 else 1,
    )


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    lang: str | None = None,
):
    """Get a single recipe by ID."""
    from sqlalchemy import or_
    from app.models.family import FamilyMember

    # Get user's family IDs
    family_result = await db.execute(
        select(FamilyMember.family_id).where(FamilyMember.user_id == current_user.id)
    )
    user_family_ids = [row[0] for row in family_result]

    # Query for recipe - owned by user OR shared with user's family
    if user_family_ids:
        result = await db.execute(
            select(Recipe).where(
                Recipe.id == recipe_id,
                or_(
                    Recipe.user_id == current_user.id,
                    Recipe.family_id.in_(user_family_ids),
                ),
            )
        )
    else:
        result = await db.execute(
            select(Recipe).where(
                Recipe.id == recipe_id,
                Recipe.user_id == current_user.id,
            )
        )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    display_lang = lang if lang in ("en", "ro") else current_user.preferred_language
    return recipe_to_response(recipe, display_lang)


@router.get("/{recipe_id}/full", response_model=RecipeFullResponse)
async def get_recipe_full(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single recipe with all language versions."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Build nutrition info if any nutrition data exists
    nutrition = None
    if any([recipe.calories_per_serving, recipe.protein_g, recipe.carbs_g, recipe.fat_g]):
        nutrition = NutritionInfo(
            calories_per_serving=recipe.calories_per_serving,
            protein_g=recipe.protein_g,
            carbs_g=recipe.carbs_g,
            fat_g=recipe.fat_g,
            nutrition_source=recipe.nutrition_source,
        )

    return RecipeFullResponse(
        id=recipe.id,
        title_en=recipe.title_en,
        title_ro=recipe.title_ro,
        description_en=recipe.description_en,
        description_ro=recipe.description_ro,
        ingredients_en=[Ingredient(**ing) for ing in (recipe.ingredients_en or [])],
        ingredients_ro=[Ingredient(**ing) for ing in (recipe.ingredients_ro or [])],
        instructions_en=recipe.instructions_en or [],
        instructions_ro=recipe.instructions_ro or [],
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        total_time_minutes=recipe.total_time_minutes,
        servings=recipe.servings,
        image_url=f"/uploads/{recipe.image_path}" if recipe.image_path else recipe.original_image_url,
        tags=recipe.tags or [],
        source_url=recipe.source_url,
        original_language=recipe.original_language,
        rating=recipe.rating,
        nutrition=nutrition,
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
    )


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    data: RecipeUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a recipe."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Update fields if provided
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field.endswith("_en") or field.endswith("_ro"):
            if "ingredients" in field and value is not None:
                value = [ing.model_dump() if hasattr(ing, "model_dump") else ing for ing in value]
            setattr(recipe, field, value)
        elif field == "tags":
            recipe.tags = value
        elif field == "notes":
            recipe.notes = value
        elif field in ("prep_time_minutes", "cook_time_minutes", "servings"):
            setattr(recipe, field, value)
        elif field == "image_url":
            # Handle image URL changes
            if value is None or value == "":
                # Clear image
                if recipe.image_path:
                    await image_service.delete_image(recipe.image_path)
                    recipe.image_path = None
                recipe.original_image_url = None
            elif value != recipe.original_image_url:
                # New URL provided - download and save
                if recipe.image_path:
                    await image_service.delete_image(recipe.image_path)
                image_path = await image_service.download_and_save(value, str(recipe.id))
                if image_path:
                    recipe.image_path = image_path
                recipe.original_image_url = value
        elif field == "nutrition" and value is not None:
            # Update nutrition fields
            recipe.calories_per_serving = value.get("calories_per_serving")
            recipe.protein_g = value.get("protein_g")
            recipe.carbs_g = value.get("carbs_g")
            recipe.fat_g = value.get("fat_g")
            recipe.nutrition_source = value.get("nutrition_source") or "manual"

    # Recalculate total time
    if recipe.prep_time_minutes or recipe.cook_time_minutes:
        recipe.total_time_minutes = (recipe.prep_time_minutes or 0) + (recipe.cook_time_minutes or 0)

    await db.commit()
    await db.refresh(recipe)

    return recipe_to_response(recipe, current_user.preferred_language)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a recipe."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Delete associated image
    if recipe.image_path:
        await image_service.delete_image(recipe.image_path)

    await db.delete(recipe)
    await db.commit()


@router.post("/{recipe_id}/image", response_model=RecipeResponse)
async def upload_recipe_image(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
):
    """Upload an image for a recipe."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
        )

    # Get recipe
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Read file content
    content = await file.read()

    # Delete old image if exists
    if recipe.image_path:
        await image_service.delete_image(recipe.image_path)

    # Save new image
    image_path = await image_service.save_uploaded_file(content, str(recipe.id))

    if not image_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to save image. File may be too large (max 10MB).",
        )

    recipe.image_path = image_path
    recipe.original_image_url = None  # Clear any URL since we have a local file now

    await db.commit()
    await db.refresh(recipe)

    return recipe_to_response(recipe, current_user.preferred_language)


@router.delete("/{recipe_id}/image", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe_image(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Delete a recipe's image."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    if recipe.image_path:
        await image_service.delete_image(recipe.image_path)
        recipe.image_path = None

    recipe.original_image_url = None

    await db.commit()


@router.post("/{recipe_id}/retranslate", response_model=RecipeResponse)
async def retranslate_recipe(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Re-translate a recipe from original language to the other language."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    original_lang = recipe.original_language
    target_lang = "ro" if original_lang == "en" else "en"

    # Get original content
    title = recipe.get_title(original_lang)
    description = recipe.get_description(original_lang)
    ingredients = recipe.get_ingredients(original_lang) or []
    instructions = recipe.get_instructions(original_lang) or []

    try:
        translated_title = await translator_service.translate(title, original_lang, target_lang)
        translated_description = await translator_service.translate(description, original_lang, target_lang) if description else None
        translated_ingredients = await translator_service.translate_ingredients(ingredients, original_lang, target_lang)
        translated_instructions = await translator_service.translate_list(instructions, original_lang, target_lang)

        if target_lang == "en":
            recipe.title_en = translated_title
            recipe.description_en = translated_description
            recipe.ingredients_en = translated_ingredients
            recipe.instructions_en = translated_instructions
        else:
            recipe.title_ro = translated_title
            recipe.description_ro = translated_description
            recipe.ingredients_ro = translated_ingredients
            recipe.instructions_ro = translated_instructions

        await db.commit()
        await db.refresh(recipe)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}",
        )

    return recipe_to_response(recipe, current_user.preferred_language)


@router.patch("/{recipe_id}/favorite")
async def toggle_favorite(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Toggle favorite status of a recipe."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    recipe.is_favorite = not recipe.is_favorite
    await db.commit()
    await db.refresh(recipe)

    return {"is_favorite": recipe.is_favorite}


@router.patch("/{recipe_id}/rating")
async def update_rating(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    rating: int | None = Query(None, ge=1, le=5, description="Rating from 1-5, or null to clear"),
):
    """Update recipe rating (1-5 stars) or clear it."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    recipe.rating = rating
    await db.commit()
    await db.refresh(recipe)

    return {"rating": recipe.rating}


def generate_share_token() -> str:
    """Generate a URL-safe share token."""
    import secrets
    import string
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))


@router.get("/share/{share_token}", response_model=RecipeResponse)
async def get_shared_recipe(
    share_token: str,
    db: DbSession,
    lang: str | None = None,
):
    """Get a shared recipe by its share token (public, no auth required)."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.share_token == share_token,
            Recipe.is_shared == True,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared recipe not found",
        )

    display_lang = lang if lang in ("en", "ro") else recipe.original_language
    return recipe_to_response(recipe, display_lang)


@router.post("/{recipe_id}/share", response_model=RecipeShareResponse)
async def enable_sharing(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Enable sharing for a recipe and return the share URL."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Generate token if not already shared
    if not recipe.share_token:
        recipe.share_token = generate_share_token()

    recipe.is_shared = True
    await db.commit()
    await db.refresh(recipe)

    return RecipeShareResponse(
        share_token=recipe.share_token,
        share_url=f"/recipes/share/{recipe.share_token}",
        is_shared=True,
    )


@router.delete("/{recipe_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def disable_sharing(
    recipe_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """Disable sharing for a recipe."""
    result = await db.execute(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.user_id == current_user.id,
        )
    )
    recipe = result.scalar_one_or_none()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    recipe.is_shared = False
    # Keep the token in case they want to re-enable sharing
    await db.commit()


# Cook from Ingredients Feature

from pydantic import BaseModel
from typing import List


class IngredientSearchRequest(BaseModel):
    ingredients: List[str]


class RecipeMatchResponse(BaseModel):
    recipe: RecipeResponse
    matched_ingredients: List[str]
    missing_ingredients: List[str]
    match_percentage: float
    match_count: int
    total_ingredients: int


class IngredientSearchResponse(BaseModel):
    results: List[RecipeMatchResponse]
    total: int


@router.post("/search-by-ingredients", response_model=IngredientSearchResponse)
async def search_by_ingredients(
    data: IngredientSearchRequest,
    current_user: CurrentUser,
    db: DbSession,
    min_match_percentage: int = Query(0, ge=0, le=100, description="Minimum match percentage"),
):
    """Search recipes by ingredients user has available.

    Returns recipes sorted by match percentage (highest first).
    Matching is done case-insensitively against ingredient names.
    """
    if not data.ingredients:
        return IngredientSearchResponse(results=[], total=0)

    lang = current_user.preferred_language

    # Get all user's recipes
    result = await db.execute(
        select(Recipe).where(Recipe.user_id == current_user.id)
    )
    recipes = result.scalars().all()

    # Normalize search ingredients for comparison
    search_ingredients = {ing.lower().strip() for ing in data.ingredients if ing.strip()}

    matches = []
    for recipe in recipes:
        # Get ingredients for the recipe
        ingredients_data = recipe.get_ingredients(lang) or recipe.get_ingredients("en") or []

        # Extract ingredient names
        recipe_ingredient_names = []
        for ing in ingredients_data:
            if isinstance(ing, dict):
                name = ing.get("name", "").lower().strip()
            else:
                name = str(ing).lower().strip()
            if name:
                recipe_ingredient_names.append(name)

        if not recipe_ingredient_names:
            continue

        # Find matches - check if any search ingredient is contained in any recipe ingredient
        matched = []
        for search_ing in search_ingredients:
            for recipe_ing in recipe_ingredient_names:
                if search_ing in recipe_ing or recipe_ing in search_ing:
                    matched.append(search_ing)
                    break

        # Calculate match percentage
        total_recipe_ingredients = len(recipe_ingredient_names)
        match_count = len(matched)
        match_percentage = (match_count / total_recipe_ingredients) * 100 if total_recipe_ingredients > 0 else 0

        # Skip if below minimum match percentage
        if match_percentage < min_match_percentage:
            continue

        # Find missing ingredients (recipe ingredients not matched)
        missing = []
        for recipe_ing in recipe_ingredient_names:
            is_matched = False
            for search_ing in search_ingredients:
                if search_ing in recipe_ing or recipe_ing in search_ing:
                    is_matched = True
                    break
            if not is_matched:
                missing.append(recipe_ing)

        matches.append({
            "recipe": recipe_to_response(recipe, lang),
            "matched_ingredients": list(matched),
            "missing_ingredients": missing,
            "match_percentage": round(match_percentage, 1),
            "match_count": match_count,
            "total_ingredients": total_recipe_ingredients,
        })

    # Sort by match percentage (descending), then by match count (descending)
    matches.sort(key=lambda x: (-x["match_percentage"], -x["match_count"]))

    return IngredientSearchResponse(
        results=[RecipeMatchResponse(**m) for m in matches],
        total=len(matches),
    )


@router.get("/ingredient-suggestions")
async def get_ingredient_suggestions(
    current_user: CurrentUser,
    db: DbSession,
    query: str = Query(..., min_length=2, description="Search query for ingredient name"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
):
    """Get autocomplete suggestions for ingredient names.

    Searches through all ingredients in user's recipes and returns
    unique ingredient names that match the query.
    """
    lang = current_user.preferred_language
    query_lower = query.lower().strip()

    # Get all user's recipes
    result = await db.execute(
        select(Recipe).where(Recipe.user_id == current_user.id)
    )
    recipes = result.scalars().all()

    # Collect all unique ingredient names
    all_ingredients = set()
    for recipe in recipes:
        ingredients_data = recipe.get_ingredients(lang) or recipe.get_ingredients("en") or []
        for ing in ingredients_data:
            if isinstance(ing, dict):
                name = ing.get("name", "").strip()
            else:
                name = str(ing).strip()
            if name:
                all_ingredients.add(name)

    # Filter by query and return matches
    suggestions = [
        ing for ing in all_ingredients
        if query_lower in ing.lower()
    ]

    # Sort by relevance (starts with query first, then contains)
    suggestions.sort(key=lambda x: (
        not x.lower().startswith(query_lower),  # False sorts before True
        len(x),  # Shorter names first
        x.lower(),  # Alphabetical
    ))

    return {"suggestions": suggestions[:limit]}
