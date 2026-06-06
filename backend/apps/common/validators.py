from django.core.exceptions import ValidationError

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def validate_uploaded_image(upload):
    if not upload:
        return upload
    if upload.size > MAX_AVATAR_BYTES:
        raise ValidationError("Fichier trop volumineux (max 2 Mo).")
    content_type = getattr(upload, "content_type", "") or ""
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError("Format d'image non autorisé (JPEG, PNG, WebP, GIF).")
    return upload
