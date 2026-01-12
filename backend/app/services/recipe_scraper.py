import json
import re
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from recipe_scrapers import scrape_html
from recipe_scrapers._exceptions import WebsiteNotImplementedError

from app.schemas.recipe import Ingredient
from app.services.custom_scrapers import get_custom_scraper


class RecipeScraperService:
    def __init__(self):
        self.timeout = 30.0
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    async def fetch_html(self, url: str) -> str:
        """Fetch HTML content from URL."""
        async with httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.text

    def parse_ingredient(self, ingredient_str: str) -> dict[str, Any]:
        """Parse ingredient string into structured format."""
        # Handle Romanian format: "100 g ingredient" or "2 linguri ingredient"
        # Also handle fractions and ranges

        # Pattern for amount (numbers, fractions, ranges like "1-2" or "1,5")
        amount_pattern = r'^([\d½¼¾⅓⅔⅛⅜⅝⅞,.\-\s]+)?'

        # Common units in English and Romanian
        units_en = r'(?:tbsp|tsp|tablespoons?|teaspoons?|cups?|oz|ounces?|lbs?|pounds?|g|kg|ml|l|liters?|pieces?|slices?|cloves?|pinch|dash|bunch|sprigs?|cans?|packages?)'
        units_ro = r'(?:lingur[iăaețe]*|lingurit[aăețe]*|can[iăa]*|gram[e]*|kilogram[e]*|bucăt[iăa]*|feli[ie]*|căt[eț]i|conserv[eăa]*|pachet[e]*|leg[aă]tur[iăa]*|firuri?|buc)'

        pattern = rf'^([\d½¼¾⅓⅔⅛⅜⅝⅞,.\-\s]+)?\s*({units_en}|{units_ro})?\s*(?:de\s+)?(.+)$'

        match = re.match(pattern, ingredient_str.strip(), re.IGNORECASE)
        if match:
            amount = (match.group(1) or "").strip()
            unit = (match.group(2) or "").strip()
            name = (match.group(3) or "").strip()

            # Clean up amount - replace comma with dot for decimals
            if amount:
                amount = amount.replace(',', '.')

            # If no proper match, use the whole string as name
            if not name:
                return {"amount": None, "unit": None, "name": ingredient_str.strip()}

            return {
                "amount": amount if amount else None,
                "unit": unit if unit else None,
                "name": name,
            }

        return {"amount": None, "unit": None, "name": ingredient_str.strip()}

    async def scrape_recipe(self, url: str) -> dict[str, Any]:
        """Scrape recipe from URL using recipe-scrapers library, custom scrapers, or AI fallback."""
        html = await self.fetch_html(url)
        domain = urlparse(url).netloc.lower().replace('www.', '')
        soup = BeautifulSoup(html, 'html.parser')

        # First try recipe-scrapers library
        try:
            scraper = scrape_html(html, org_url=url)
            result = self._extract_from_scraper(scraper, url, soup)
            result['extraction_method'] = 'scraper'
            return result
        except WebsiteNotImplementedError:
            pass

        # Try custom scraper
        custom_scraper = get_custom_scraper(domain, soup, url)
        if custom_scraper:
            result = self._extract_from_custom_scraper(custom_scraper, url, soup)
            result['extraction_method'] = 'custom'
            return result

        # Try AI fallback (only if configured)
        try:
            from app.services.ai_recipe_extractor import ai_recipe_extractor
            if ai_recipe_extractor.is_available():
                result = await ai_recipe_extractor.extract_recipe(html, url)
                result['extraction_method'] = 'ai'
                return result
        except ImportError:
            pass  # AI extractor module not available
        except ValueError as e:
            # AI extraction failed, fall through to error
            print(f"AI extraction failed: {e}")
        except Exception as e:
            print(f"AI extraction error: {e}")

        raise ValueError(
            f"Website '{domain}' is not supported by our scrapers. "
            "To import from unsupported sites, configure ANTHROPIC_API_KEY for AI extraction."
        )

    def _extract_from_scraper(self, scraper, url: str, soup: BeautifulSoup) -> dict[str, Any]:
        """Extract recipe data from recipe-scrapers object."""
        # Extract ingredients
        raw_ingredients = scraper.ingredients()
        ingredients = [self.parse_ingredient(ing) for ing in raw_ingredients]

        # Extract instructions
        instructions_text = scraper.instructions()
        if isinstance(instructions_text, str):
            instructions = [
                step.strip()
                for step in re.split(r'\n+|\d+\.\s+', instructions_text)
                if step.strip()
            ]
        else:
            instructions = instructions_text

        # Get times
        prep_time = self._safe_call(scraper.prep_time)
        cook_time = self._safe_call(scraper.cook_time)
        total_time = self._safe_call(scraper.total_time)

        # Get servings
        servings = None
        yields = self._safe_call(scraper.yields)
        if yields:
            match = re.search(r'\d+', str(yields))
            if match:
                servings = int(match.group())

        # Get image, title, description
        image_url = self._safe_call(scraper.image)
        title = self._safe_call(scraper.title) or ""
        description = self._safe_call(scraper.description)

        # Extract nutrition
        nutrition = self._extract_nutrition(scraper)

        # Extract tags
        tags = self._extract_tags(scraper, soup)

        return {
            "title": title,
            "description": description,
            "ingredients": ingredients,
            "instructions": instructions,
            "prep_time_minutes": prep_time,
            "cook_time_minutes": cook_time,
            "total_time_minutes": total_time,
            "servings": servings,
            "image_url": image_url,
            "source_url": url,
            "nutrition": nutrition,
            "tags": tags,
        }

    def _extract_from_custom_scraper(self, scraper, url: str, soup: BeautifulSoup) -> dict[str, Any]:
        """Extract recipe data from custom scraper object."""
        # Extract ingredients
        raw_ingredients = scraper.ingredients()
        ingredients = [self.parse_ingredient(ing) for ing in raw_ingredients]

        # Extract instructions
        instructions = scraper.instructions()
        if isinstance(instructions, str):
            instructions = [
                step.strip()
                for step in re.split(r'\n+|\d+\.\s+', instructions)
                if step.strip()
            ]

        # Get times
        prep_time = self._safe_call(scraper.prep_time)
        cook_time = self._safe_call(scraper.cook_time)
        total_time = self._safe_call(scraper.total_time)

        # Get servings
        servings = None
        yields = self._safe_call(scraper.yields)
        if yields:
            match = re.search(r'\d+', str(yields))
            if match:
                servings = int(match.group())

        # Get image, title, description
        image_url = self._safe_call(scraper.image)
        title = self._safe_call(scraper.title) or ""
        description = self._safe_call(scraper.description)

        # Extract tags from JSON-LD (custom scrapers don't have nutrition method)
        tags = self._extract_tags_from_jsonld(soup)

        return {
            "title": title,
            "description": description,
            "ingredients": ingredients,
            "instructions": instructions,
            "prep_time_minutes": prep_time,
            "cook_time_minutes": cook_time,
            "total_time_minutes": total_time,
            "servings": servings,
            "image_url": image_url,
            "source_url": url,
            "nutrition": None,  # Custom scrapers don't extract nutrition
            "tags": tags,
        }

    def _extract_nutrition(self, scraper) -> dict[str, Any] | None:
        """Extract nutrition info from recipe-scrapers object."""
        try:
            nutrients = scraper.nutrients()
            if not nutrients:
                return None

            return {
                "calories_per_serving": self._parse_nutrient(nutrients, 'calories'),
                "protein_g": self._parse_nutrient(nutrients, 'protein', 'proteinContent'),
                "carbs_g": self._parse_nutrient(nutrients, 'carbohydrates', 'carbohydrateContent'),
                "fat_g": self._parse_nutrient(nutrients, 'fat', 'fatContent'),
            }
        except Exception:
            return None

    def _parse_nutrient(self, nutrients: dict, *keys) -> float | int | None:
        """Parse a nutrient value from various possible keys."""
        for key in keys:
            value = nutrients.get(key)
            if value is not None:
                # Extract number from string like "350 kcal" or "25g"
                if isinstance(value, str):
                    match = re.search(r'[\d.]+', value)
                    if match:
                        num = float(match.group())
                        return int(num) if num.is_integer() else num
                elif isinstance(value, (int, float)):
                    return value
        return None

    def _extract_tags(self, scraper, soup: BeautifulSoup) -> list[str]:
        """Extract recipe tags from scraper and JSON-LD."""
        tags = set()

        # From recipe-scrapers methods
        try:
            category = self._safe_call(scraper.category)
            if category:
                if isinstance(category, list):
                    tags.update(category)
                else:
                    tags.add(str(category))
        except Exception:
            pass

        try:
            cuisine = self._safe_call(scraper.cuisine)
            if cuisine:
                if isinstance(cuisine, list):
                    tags.update(cuisine)
                else:
                    tags.add(str(cuisine))
        except Exception:
            pass

        # Also extract from JSON-LD
        jsonld_tags = self._extract_tags_from_jsonld(soup)
        tags.update(jsonld_tags)

        # Clean and filter tags
        return [t.strip() for t in tags if t and t.strip()]

    def _extract_tags_from_jsonld(self, soup: BeautifulSoup) -> list[str]:
        """Extract recipe tags from JSON-LD structured data."""
        tags = set()

        for script in soup.find_all('script', type='application/ld+json'):
            try:
                text = script.string
                if not text:
                    continue

                data = json.loads(text)

                # Handle @graph structure
                if '@graph' in data:
                    for item in data['@graph']:
                        self._extract_jsonld_recipe_tags(item, tags)
                else:
                    self._extract_jsonld_recipe_tags(data, tags)
            except (json.JSONDecodeError, AttributeError):
                continue

        return list(tags)

    def _extract_jsonld_recipe_tags(self, data: dict, tags: set):
        """Extract tags from a JSON-LD recipe object."""
        if not isinstance(data, dict):
            return

        # Check if this is a Recipe
        schema_type = data.get('@type', '')
        if isinstance(schema_type, list):
            is_recipe = 'Recipe' in schema_type
        else:
            is_recipe = schema_type == 'Recipe'

        if not is_recipe:
            return

        # Extract category
        category = data.get('recipeCategory')
        if category:
            if isinstance(category, list):
                tags.update(category)
            else:
                tags.add(str(category))

        # Extract cuisine
        cuisine = data.get('recipeCuisine')
        if cuisine:
            if isinstance(cuisine, list):
                tags.update(cuisine)
            else:
                tags.add(str(cuisine))

        # Extract keywords
        keywords = data.get('keywords')
        if keywords:
            if isinstance(keywords, str):
                # Keywords might be comma-separated
                tags.update(k.strip() for k in keywords.split(',') if k.strip())
            elif isinstance(keywords, list):
                tags.update(keywords)

    def _safe_call(self, func):
        """Safely call a function, returning None on any error."""
        try:
            return func()
        except Exception:
            return None


recipe_scraper_service = RecipeScraperService()
