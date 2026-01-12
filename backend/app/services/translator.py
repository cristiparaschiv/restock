import httpx
from typing import Any

from app.core.config import settings


# Cooking unit translations between English and Romanian
UNIT_TRANSLATIONS = {
    # English to Romanian
    "en_to_ro": {
        # Volume - spoons
        "tbsp": "lingură",
        "tbsps": "linguri",
        "tablespoon": "lingură",
        "tablespoons": "linguri",
        "tsp": "linguriță",
        "tsps": "lingurițe",
        "teaspoon": "linguriță",
        "teaspoons": "lingurițe",
        # Volume - cups
        "cup": "cană",
        "cups": "căni",
        "c": "cană",
        # Volume - liquid
        "ml": "ml",
        "milliliter": "mililitru",
        "milliliters": "mililitri",
        "l": "l",
        "liter": "litru",
        "liters": "litri",
        "litre": "litru",
        "litres": "litri",
        "fl oz": "ml",
        "fluid ounce": "uncie lichidă",
        "fluid ounces": "uncii lichide",
        "pint": "pintă",
        "pints": "pinte",
        "quart": "quart",
        "quarts": "quarturi",
        "gallon": "galon",
        "gallons": "galoane",
        # Weight
        "g": "g",
        "gram": "gram",
        "grams": "grame",
        "kg": "kg",
        "kilogram": "kilogram",
        "kilograms": "kilograme",
        "oz": "uncie",
        "ounce": "uncie",
        "ounces": "uncii",
        "lb": "livră",
        "lbs": "livre",
        "pound": "livră",
        "pounds": "livre",
        # Small amounts
        "pinch": "vârf de cuțit",
        "pinches": "vârfuri de cuțit",
        "dash": "strop",
        "dashes": "stropi",
        "drop": "picătură",
        "drops": "picături",
        # Pieces
        "piece": "bucată",
        "pieces": "bucăți",
        "slice": "felie",
        "slices": "felii",
        "clove": "cățel",
        "cloves": "căței",
        "head": "căpățână",
        "heads": "căpățâni",
        "bunch": "legătură",
        "bunches": "legături",
        "sprig": "rămurică",
        "sprigs": "rămurice",
        "stalk": "tulpină",
        "stalks": "tulpini",
        "leaf": "frunză",
        "leaves": "frunze",
        # Containers
        "can": "conservă",
        "cans": "conserve",
        "jar": "borcan",
        "jars": "borcane",
        "bottle": "sticlă",
        "bottles": "sticle",
        "package": "pachet",
        "packages": "pachete",
        "bag": "pungă",
        "bags": "pungi",
        "box": "cutie",
        "boxes": "cutii",
        # Other common
        "large": "mare",
        "medium": "mediu",
        "small": "mic",
        "whole": "întreg",
        "half": "jumătate",
        "quarter": "sfert",
        "handful": "pumn",
        "handfuls": "pumni",
        "serving": "porție",
        "servings": "porții",
    },
    # Romanian to English
    "ro_to_en": {
        # Volume - spoons
        "lingură": "tbsp",
        "linguri": "tbsp",
        "linguriță": "tsp",
        "lingurițe": "tsp",
        # Volume - cups
        "cană": "cup",
        "căni": "cups",
        # Volume - liquid
        "ml": "ml",
        "mililitru": "milliliter",
        "mililitri": "milliliters",
        "l": "l",
        "litru": "liter",
        "litri": "liters",
        "uncie lichidă": "fluid ounce",
        "uncii lichide": "fluid ounces",
        "pintă": "pint",
        "pinte": "pints",
        "galon": "gallon",
        "galoane": "gallons",
        # Weight
        "g": "g",
        "gram": "gram",
        "grame": "grams",
        "kg": "kg",
        "kilogram": "kilogram",
        "kilograme": "kilograms",
        "uncie": "oz",
        "uncii": "oz",
        "livră": "lb",
        "livre": "lbs",
        # Small amounts
        "vârf de cuțit": "pinch",
        "vârfuri de cuțit": "pinches",
        "strop": "dash",
        "stropi": "dashes",
        "picătură": "drop",
        "picături": "drops",
        # Pieces
        "bucată": "piece",
        "bucăți": "pieces",
        "felie": "slice",
        "felii": "slices",
        "cățel": "clove",
        "căței": "cloves",
        "căpățână": "head",
        "căpățâni": "heads",
        "legătură": "bunch",
        "legături": "bunches",
        "rămurică": "sprig",
        "rămurice": "sprigs",
        "tulpină": "stalk",
        "tulpini": "stalks",
        "frunză": "leaf",
        "frunze": "leaves",
        # Containers
        "conservă": "can",
        "conserve": "cans",
        "borcan": "jar",
        "borcane": "jars",
        "sticlă": "bottle",
        "sticle": "bottles",
        "pachet": "package",
        "pachete": "packages",
        "pungă": "bag",
        "pungi": "bags",
        "cutie": "box",
        "cutii": "boxes",
        # Other common
        "mare": "large",
        "mediu": "medium",
        "mic": "small",
        "întreg": "whole",
        "jumătate": "half",
        "sfert": "quarter",
        "pumn": "handful",
        "pumni": "handfuls",
        "porție": "serving",
        "porții": "servings",
    },
}


class TranslatorService:
    def __init__(self):
        self.base_url = settings.LIBRETRANSLATE_URL
        self.timeout = 30.0

    def translate_unit(self, unit: str, source_lang: str, target_lang: str) -> str:
        """Translate cooking unit using predefined mappings."""
        if not unit or source_lang == target_lang:
            return unit

        # Normalize unit for lookup
        unit_lower = unit.lower().strip()

        # Select the appropriate translation dictionary
        if source_lang == "en" and target_lang == "ro":
            translations = UNIT_TRANSLATIONS["en_to_ro"]
        elif source_lang == "ro" and target_lang == "en":
            translations = UNIT_TRANSLATIONS["ro_to_en"]
        else:
            return unit

        # Direct lookup
        if unit_lower in translations:
            translated = translations[unit_lower]
            # Preserve original capitalization if first letter was uppercase
            if unit[0].isupper():
                return translated.capitalize()
            return translated

        # Try to match partial units (e.g., "15-oz" -> keep number, translate unit)
        for eng_unit, trans_unit in translations.items():
            if eng_unit in unit_lower:
                return unit_lower.replace(eng_unit, trans_unit)

        # No translation found, return original
        return unit

    async def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
    ) -> str:
        """Translate text using LibreTranslate API."""
        if not text or source_lang == target_lang:
            return text

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/translate",
                json={
                    "q": text,
                    "source": source_lang,
                    "target": target_lang,
                    "format": "text",
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("translatedText", text)

    async def translate_list(
        self,
        items: list[str],
        source_lang: str,
        target_lang: str,
    ) -> list[str]:
        """Translate a list of strings."""
        if not items or source_lang == target_lang:
            return items

        translated = []
        for item in items:
            result = await self.translate(item, source_lang, target_lang)
            translated.append(result)
        return translated

    async def translate_ingredients(
        self,
        ingredients: list[dict[str, Any]],
        source_lang: str,
        target_lang: str,
    ) -> list[dict[str, Any]]:
        """Translate ingredient names and units."""
        if not ingredients or source_lang == target_lang:
            return ingredients

        translated = []
        for ing in ingredients:
            new_ing = ing.copy()

            # Translate ingredient name using LibreTranslate
            if ing.get("name"):
                new_ing["name"] = await self.translate(
                    ing["name"],
                    source_lang,
                    target_lang,
                )

            # Translate unit using predefined mappings (more accurate for cooking)
            if ing.get("unit"):
                new_ing["unit"] = self.translate_unit(
                    ing["unit"],
                    source_lang,
                    target_lang,
                )

            translated.append(new_ing)
        return translated

    async def detect_language(self, text: str) -> str:
        """Detect the language of the given text using LibreTranslate."""
        if not text:
            return "en"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/detect",
                    json={"q": text},
                )
                response.raise_for_status()
                data = response.json()
                if data and len(data) > 0:
                    detected = data[0].get("language", "en")
                    # Only return en or ro, default to en for others
                    return detected if detected in ("en", "ro") else "en"
            except Exception:
                pass
        return "en"

    async def is_available(self) -> bool:
        """Check if LibreTranslate service is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/languages")
                return response.status_code == 200
        except Exception:
            return False


translator_service = TranslatorService()
