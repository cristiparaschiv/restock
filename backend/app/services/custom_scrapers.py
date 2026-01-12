"""Custom recipe scrapers for sites not supported by recipe-scrapers library."""

import re
from typing import Any
from bs4 import BeautifulSoup, NavigableString


class SavoriUrbaneScraper:
    """Scraper for savoriurbane.com - Romanian recipe website using EasyRecipe plugin."""

    def __init__(self, soup: BeautifulSoup, url: str):
        self.soup = soup
        self.url = url
        self.ers_container = soup.find('div', class_='easyrecipe')

    def title(self) -> str:
        """Extract recipe title."""
        # Try ERS name first
        ers_name = self.soup.find('div', class_='ERSName')
        if ers_name:
            return ers_name.get_text(strip=True)

        # Fall back to entry title
        entry_title = self.soup.find('h1', class_='entry-title')
        if entry_title:
            return entry_title.get_text(strip=True)

        return ""

    def description(self) -> str | None:
        """Extract recipe description."""
        ers_summary = self.soup.find('div', class_='ERSSummary')
        if ers_summary:
            return ers_summary.get_text(strip=True)

        # Try meta description
        meta = self.soup.find('meta', {'name': 'description'})
        if meta and meta.get('content'):
            return meta['content']

        return None

    def ingredients(self) -> list[str]:
        """Extract ingredients list."""
        ingredients = []

        ers_ingredients = self.soup.find('div', class_='ERSIngredients')
        if ers_ingredients:
            # Get ALL li elements (including nested ones)
            all_lis = ers_ingredients.find_all('li')
            for li in all_lis:
                # Get direct text content only (not nested li text)
                direct_text = self._get_direct_text_only(li)
                if direct_text and len(direct_text) > 1:
                    ingredients.append(direct_text)

        return ingredients

    def _get_direct_text_only(self, element) -> str:
        """Get only direct text from element, excluding nested element text."""
        texts = []
        for child in element.children:
            if isinstance(child, NavigableString):
                text = str(child).strip()
                if text:
                    texts.append(text)
            elif child.name in ['span', 'strong', 'em', 'b', 'i', 'a']:
                # Include inline elements but not nested ul/li
                if child.name != 'a' or 'ERSPrintBtn' not in child.get('class', []):
                    text = child.get_text(strip=True)
                    if text:
                        texts.append(text)

        return ' '.join(texts).strip()

    def instructions(self) -> list[str]:
        """Extract cooking instructions."""
        instructions = []

        # Try ERSInstructions first
        ers_instructions = self.soup.find('div', class_='ERSInstructions')
        if ers_instructions:
            items = ers_instructions.find_all(['li', 'p'])
            for item in items:
                text = item.get_text(strip=True)
                if text and len(text) > 10:
                    instructions.append(text)
            if instructions:
                return instructions

        # Cooking verbs to identify instruction content
        cooking_verbs = [
            'se amestecă', 'se pune', 'se adaugă', 'se coace', 'se fierbe',
            'se taie', 'se lasă', 'se frige', 'se unge', 'se condimenteaz',
            'se servește', 'se stoarce', 'se încălzește', 'se stinge',
            'se pun', 'se formeaz', 'se adaug', 'se toac', 'se testeaz',
            'punem', 'adăugăm', 'amestecăm', 'lăsăm', 'turnăm', 'presărăm',
            'tăiem', 'coacem', 'prăjim', 'fierbem', 'scoatem', 'formăm',
            'opărim', 'strecurăm', 'condimentăm', 'servim', 'ungem',
            'frământăm', 'întindem', 'rulăm', 'legăm', 'introducem',
            'acoperim', 'marinăm', 'umplem', 'presăm', 'tocăm', 'călim',
            'adaugam', 'amestecam', 'lasam', 'turnam', 'presaram',
            'taiem', 'coacem', 'prajim', 'fierbem', 'scoatem', 'formam',
        ]

        # Markers that indicate start of instructions
        start_markers = ['cum se face', 'cum se fac', 'mod de preparare',
                        'instrucțiuni', 'preparare:', 'metoda de preparare']

        # End markers - must be at start of sentence to avoid false positives
        end_phrase_markers = ['alte știri culinare', 'alte retete', 'alte rețete',
                              'pofta buna', 'poftă bună']

        # Get the content container - try various possible class names
        entry_content = (
            self.soup.find('div', class_='entry-content') or
            self.soup.find('div', class_='td-post-content') or
            self.soup.find('article')
        )
        if not entry_content:
            return instructions

        # Get the full text and split into sentences
        full_text = entry_content.get_text(separator='\n')

        # Split by newlines and periods to get individual statements
        sentences = []
        for line in full_text.split('\n'):
            line = line.strip()
            if len(line) > 20:
                # Further split by period followed by uppercase letter
                parts = re.split(r'\.(?=[A-ZĂÂÎȘȚ])', line)
                for part in parts:
                    part = part.strip()
                    if len(part) > 20:
                        sentences.append(part + ('.' if not part.endswith('.') else ''))

        # Find where instructions start
        in_instructions = False
        for sentence in sentences:
            sentence_lower = sentence.lower()

            # Check for end markers
            if any(marker in sentence_lower for marker in end_phrase_markers):
                if in_instructions and instructions:
                    break
                continue

            # Check for start markers
            if any(marker in sentence_lower for marker in start_markers):
                in_instructions = True
                continue

            # Skip very short sentences
            if len(sentence) < 30:
                continue

            # If we're in instructions section, add sentences with cooking verbs
            if in_instructions:
                has_verb = any(verb in sentence_lower for verb in cooking_verbs)

                # Skip sentences that are clearly not instructions
                skip_patterns = [
                    r'^În\s+Ardeal',  # Regional commentary
                    r'^Ce\s+spune',  # Questions/commentary
                    r'^Bineinteles',  # Commentary
                    r'^Tare\s+bun',  # Commentary
                    r'^Din\s+cantitat',  # Yield info (not instruction)
                    r'^DUPĂ\s+CASETA',  # Meta-text about video
                    r'^Vă\s+invit',  # Invitations to watch video
                    r'^Aici\s+vedeți',  # References to other content
                    r'rețeta\s+video',  # Video recipe references
                    r'vezi\s+video',
                ]
                if any(re.search(p, sentence, re.IGNORECASE) for p in skip_patterns):
                    continue

                # Also check if sentence starts with instructional pattern
                starts_instructional = bool(re.match(
                    r'^(Se\s+|Punem|Adăugăm|Amestecăm|Lăsăm|Turnăm|Tăiem|'
                    r'Când\s+|După\s+ce|Apoi\s+|La\s+final|Pentru\s+a\s+|'
                    r'Dacă\s+|Înainte\s+|Inainte\s+|Pana\s+|Până\s+|'
                    r'Cu\s+mâinile|Cu\s+mainile|Cine\s+dorește|'
                    r'Separat\s+|Tot\s+acum|Cand\s+|Când\s+)',
                    sentence, re.IGNORECASE
                ))

                # Must have a cooking verb to be considered an instruction
                if has_verb and (starts_instructional or len(sentence) < 200):
                    # Avoid URLs, image references
                    if 'http' in sentence.lower() or 'wp-content' in sentence.lower():
                        continue
                    # Avoid self-promotional content
                    if 'savori urbane' in sentence_lower and len(sentence) < 100:
                        continue
                    # Avoid duplicate content
                    if not any(sentence[:40] in existing for existing in instructions):
                        instructions.append(sentence)

        # If we found instructions, clean them up and return
        if instructions:
            # Remove any trailing promotional content from last instruction
            cleaned = []
            for instr in instructions:
                # Skip very short fragments that are clearly incomplete
                if len(instr) < 30:
                    continue
                # Skip sentences that start with ". " (fragment continuation)
                if instr.startswith('. '):
                    instr = instr[2:].strip()
                    if len(instr) < 30:
                        continue
                # Trim at promotional phrases
                for phrase in ['Aici vedeti', 'Aici vedeți', 'am explicat aici',
                              'vezi video', 'Vezi video']:
                    if phrase in instr:
                        idx = instr.find(phrase)
                        if idx > 50:  # Keep at least 50 chars
                            instr = instr[:idx].strip()
                            if instr.endswith(',') or instr.endswith('–'):
                                instr = instr[:-1].strip()
                if len(instr) > 30:
                    cleaned.append(instr)

            # If we only found 1-2 very short instructions, it's probably not
            # a proper recipe with text instructions (likely video-only)
            if len(cleaned) <= 2 and all(len(i) < 80 for i in cleaned):
                return []

            return cleaned

        return instructions

    def image(self) -> str | None:
        """Extract main recipe image."""
        # Try Open Graph image first (usually the best quality)
        og_img = self.soup.find('meta', property='og:image')
        if og_img and og_img.get('content'):
            return og_img['content']

        # Try ERS image
        ers_img = self.soup.find('img', class_='ERSImage')
        if ers_img:
            return ers_img.get('src') or ers_img.get('data-src')

        # Try first image in article
        article = self.soup.find('article')
        if article:
            for img in article.find_all('img'):
                src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
                if src:
                    # Skip small images, icons, and gravatars
                    if 'gravatar' not in src and 'icon' not in src.lower():
                        if 'wp-content/uploads' in src:
                            return src

        return None

    def prep_time(self) -> int | None:
        """Extract preparation time in minutes."""
        return self._extract_time('prep')

    def cook_time(self) -> int | None:
        """Extract cooking time in minutes."""
        return self._extract_time('cook')

    def total_time(self) -> int | None:
        """Extract total time in minutes."""
        return self._extract_time('total')

    def _extract_time(self, time_type: str) -> int | None:
        """Extract time value from ERS time elements or text."""
        # Try ERS time elements
        time_divs = self.soup.find_all('div', class_='ERSTime')
        time_spans = self.soup.find_all('span', class_='ERSTime')

        for elem in time_divs + time_spans:
            text = elem.get_text(strip=True).lower()

            # Match time type
            type_matches = {
                'prep': ['prep', 'preparare', 'pregătire'],
                'cook': ['cook', 'gătire', 'coacere', 'fierbere', 'prăjire'],
                'total': ['total', 'totală']
            }

            if any(marker in text for marker in type_matches.get(time_type, [])):
                # Extract number
                numbers = re.findall(r'\d+', text)
                if numbers:
                    minutes = int(numbers[0])
                    # Check if it's hours
                    if 'or' in text or 'hour' in text or 'h' in text:
                        minutes *= 60
                    return minutes

        return None

    def yields(self) -> str | None:
        """Extract serving size."""
        # Try ERS yield
        ers_yield = self.soup.find('div', class_='ERSYield')
        if ers_yield:
            return ers_yield.get_text(strip=True)

        ers_yield_span = self.soup.find('span', class_='ERSYield')
        if ers_yield_span:
            return ers_yield_span.get_text(strip=True)

        # Try to find in text
        article = self.soup.find('article')
        if article:
            text = article.get_text()
            serves_pattern = re.compile(r'(\d+)\s*(porții|portii|persoane|serviri)', re.IGNORECASE)
            match = serves_pattern.search(text)
            if match:
                return f"{match.group(1)} porții"

        return None


# Registry of custom scrapers by domain
CUSTOM_SCRAPERS = {
    'savoriurbane.com': SavoriUrbaneScraper,
}


def get_custom_scraper(domain: str, soup: BeautifulSoup, url: str):
    """Get custom scraper for domain if available."""
    # Normalize domain
    domain = domain.lower().replace('www.', '')

    if domain in CUSTOM_SCRAPERS:
        return CUSTOM_SCRAPERS[domain](soup, url)

    return None
