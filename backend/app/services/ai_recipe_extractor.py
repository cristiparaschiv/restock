"""AI-powered recipe extraction using Anthropic API."""
import json
import os
import re
from typing import Any

from bs4 import BeautifulSoup


class AIRecipeExtractor:
    """Extract recipe data from HTML using Claude.

    Requires ANTHROPIC_API_KEY environment variable.
    """

    def __init__(self):
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
        self._anthropic_client = None

    def is_available(self) -> bool:
        """Check if Anthropic API is configured."""
        return bool(self.anthropic_api_key)

    @property
    def anthropic_client(self):
        """Lazy-load the Anthropic client."""
        if self._anthropic_client is None:
            if not self.anthropic_api_key:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            import anthropic
            self._anthropic_client = anthropic.Anthropic(api_key=self.anthropic_api_key)
        return self._anthropic_client

    def _clean_html(self, html: str) -> str:
        """Clean HTML to reduce token usage while preserving recipe content."""
        soup = BeautifulSoup(html, 'html.parser')

        # Remove non-content elements
        for tag in soup.find_all(['script', 'style', 'nav', 'header', 'footer',
                                   'aside', 'noscript', 'iframe', 'svg', 'form',
                                   'meta', 'link', 'comment']):
            tag.decompose()

        # Remove ads and social media elements
        for tag in soup.find_all(class_=lambda x: x and any(
            ad in str(x).lower() for ad in ['ad-', 'ads-', 'social', 'share', 'comment', 'sidebar']
        )):
            tag.decompose()

        # Try to find the main recipe content first
        recipe_content = None
        for selector in ['article', '.recipe', '.recipe-content', '[itemtype*="Recipe"]', 'main', '.post-content', '.entry-content']:
            found = soup.select_one(selector)
            if found:
                recipe_content = found.get_text(separator='\n', strip=True)
                break

        # Fall back to full page text if no recipe container found
        text = recipe_content if recipe_content else soup.get_text(separator='\n', strip=True)

        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)

        # Limit to 50k characters
        if len(text) > 50000:
            text = text[:50000] + "\n[Content truncated...]"

        return text

    def _get_extraction_prompt(self, url: str, content: str) -> str:
        """Generate the extraction prompt."""
        return f"""Extract recipe information from the following webpage content.
The URL is: {url}

Return ONLY a valid JSON object with this exact structure (no other text):
{{
    "title": "Recipe title",
    "description": "Brief description of the recipe",
    "ingredients": [
        {{"amount": "1", "unit": "cup", "name": "flour"}},
        {{"amount": "2", "unit": "tbsp", "name": "sugar"}}
    ],
    "instructions": [
        "Step 1 description",
        "Step 2 description"
    ],
    "prep_time_minutes": 15,
    "cook_time_minutes": 30,
    "total_time_minutes": 45,
    "servings": 4,
    "image_url": "https://example.com/image.jpg",
    "tags": ["Italian", "Dinner"],
    "nutrition": {{
        "calories_per_serving": 350,
        "protein_g": 25,
        "carbs_g": 30,
        "fat_g": 15
    }}
}}

Rules:
- For ingredients, split into amount, unit, and name when possible
- If a field is not found, set it to null
- Instructions must be an array of strings
- Return ONLY the JSON, no explanation

Webpage content:
{content}"""

    async def extract_recipe(self, html: str, url: str) -> dict[str, Any]:
        """Use Claude to extract structured recipe data from HTML content."""
        if not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        cleaned_content = self._clean_html(html)
        print(f"Anthropic: Processing {len(cleaned_content)} chars from {url}")
        prompt = self._get_extraction_prompt(url, cleaned_content)

        try:
            response_text = await self._call_anthropic(prompt)
            return self._parse_response(response_text, url)
        except Exception as e:
            print(f"Anthropic extraction failed: {type(e).__name__}: {e}")
            raise ValueError(f"AI extraction failed: {e}")

    async def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic API for text generation."""
        message = self.anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return message.content[0].text

    def _parse_response(self, response_text: str, url: str) -> dict[str, Any]:
        """Parse AI response into structured recipe data."""
        try:
            # Try to extract JSON if wrapped in code blocks
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                response_text = json_match.group(1)

            # Try to find JSON object in response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                response_text = json_match.group(0)

            data = json.loads(response_text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")

        return self._normalize_response(data, url)

    def _normalize_response(self, data: dict, url: str) -> dict[str, Any]:
        """Normalize AI response to match the expected scraper format."""
        # Ensure ingredients are in the right format
        ingredients = []
        for ing in data.get('ingredients', []):
            if isinstance(ing, dict):
                ingredients.append({
                    'amount': ing.get('amount'),
                    'unit': ing.get('unit'),
                    'name': ing.get('name', ''),
                })
            elif isinstance(ing, str):
                ingredients.append({
                    'amount': None,
                    'unit': None,
                    'name': ing,
                })

        # Ensure instructions are a list of strings
        instructions = data.get('instructions', [])
        if isinstance(instructions, str):
            instructions = [s.strip() for s in instructions.split('\n') if s.strip()]

        # Normalize nutrition
        nutrition = None
        raw_nutrition = data.get('nutrition')
        if raw_nutrition and isinstance(raw_nutrition, dict):
            nutrition = {
                'calories_per_serving': raw_nutrition.get('calories_per_serving'),
                'protein_g': raw_nutrition.get('protein_g'),
                'carbs_g': raw_nutrition.get('carbs_g'),
                'fat_g': raw_nutrition.get('fat_g'),
            }
            # Only include if at least one value exists
            if not any(v for v in nutrition.values()):
                nutrition = None

        return {
            'title': data.get('title', 'Untitled Recipe'),
            'description': data.get('description'),
            'ingredients': ingredients,
            'instructions': instructions,
            'prep_time_minutes': data.get('prep_time_minutes'),
            'cook_time_minutes': data.get('cook_time_minutes'),
            'total_time_minutes': data.get('total_time_minutes'),
            'servings': data.get('servings'),
            'image_url': data.get('image_url'),
            'source_url': url,
            'tags': data.get('tags', []),
            'nutrition': nutrition,
        }


# Singleton instance
ai_recipe_extractor = AIRecipeExtractor()
