import os
import uuid
from pathlib import Path

import aiofiles
import httpx
from PIL import Image
import io

from app.core.config import settings


class ImageService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR) / "images"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.max_size = settings.MAX_IMAGE_SIZE
        self.timeout = 30.0
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

    async def download_and_save(self, url: str, recipe_id: str) -> str | None:
        """Download image from URL and save locally."""
        if not url:
            return None

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                content = response.content
                if len(content) > self.max_size:
                    return None

                # Generate filename - always save as JPEG after optimization
                filename = f"{recipe_id}.jpg"
                filepath = self.upload_dir / filename

                # Optimize and save the image
                await self._optimize_and_save(content, filepath)

                return f"images/{filename}"

        except Exception as e:
            print(f"Failed to download image: {e}")
            return None

    async def _optimize_and_save(self, content: bytes, filepath: Path) -> None:
        """Optimize image and save to disk."""
        # Open with PIL for optimization
        image = Image.open(io.BytesIO(content))

        # Convert to RGB if necessary (for JPEG)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # Resize if too large (max 1200px width)
        max_width = 1200
        if image.width > max_width:
            ratio = max_width / image.width
            new_size = (max_width, int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        # Save as optimized JPEG
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=85, optimize=True)
        output.seek(0)

        # Write to file
        async with aiofiles.open(str(filepath), "wb") as f:
            await f.write(output.read())

    def _get_extension(self, content_type: str) -> str:
        """Get file extension from content type."""
        mapping = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
        }
        return mapping.get(content_type.split(";")[0], ".jpg")

    def get_image_path(self, relative_path: str) -> Path:
        """Get full path to an image."""
        return Path(settings.UPLOAD_DIR) / relative_path

    async def delete_image(self, relative_path: str) -> bool:
        """Delete an image file."""
        if not relative_path:
            return True

        filepath = self.get_image_path(relative_path)
        try:
            if filepath.exists():
                filepath.unlink()
            return True
        except Exception:
            return False

    async def save_uploaded_file(self, content: bytes, recipe_id: str) -> str | None:
        """Save an uploaded image file."""
        try:
            if len(content) > self.max_size:
                return None

            # Generate filename - always save as JPEG after optimization
            filename = f"{recipe_id}.jpg"
            filepath = self.upload_dir / filename

            # Optimize and save the image
            await self._optimize_and_save(content, filepath)

            return f"images/{filename}"

        except Exception as e:
            print(f"Failed to save uploaded image: {e}")
            return None


image_service = ImageService()
