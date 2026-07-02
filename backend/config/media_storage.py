"""Stockage médias (S3 en prod, filesystem en dev)."""

from decouple import config


def configure_media_storage(settings_module) -> None:
    """Active S3 pour DEFAULT_FILE_STORAGE si USE_S3_MEDIA=true."""
    if not config("USE_S3_MEDIA", default=False, cast=bool):
        return

    if "storages" not in settings_module.INSTALLED_APPS:
        settings_module.INSTALLED_APPS = [
            *settings_module.INSTALLED_APPS,
            "storages",
        ]

    bucket = config("AWS_STORAGE_BUCKET_NAME")
    region = config("AWS_S3_REGION_NAME", default="af-south-1")
    custom_domain = config("AWS_S3_CUSTOM_DOMAIN", default="")

    settings_module.AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
    settings_module.AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
    settings_module.AWS_STORAGE_BUCKET_NAME = bucket
    settings_module.AWS_S3_REGION_NAME = region
    settings_module.AWS_S3_SIGNATURE_VERSION = "s3v4"
    settings_module.AWS_DEFAULT_ACL = None
    settings_module.AWS_QUERYSTRING_AUTH = False
    settings_module.AWS_S3_OBJECT_PARAMETERS = {
        "CacheControl": "max-age=86400",
    }

    if custom_domain:
        settings_module.AWS_S3_CUSTOM_DOMAIN = custom_domain
        settings_module.MEDIA_URL = f"https://{custom_domain}/media/"
    else:
        settings_module.MEDIA_URL = (
            f"https://{bucket}.s3.{region}.amazonaws.com/media/"
        )

    existing_storages = getattr(settings_module, "STORAGES", None) or {
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

    settings_module.STORAGES = {
        **existing_storages,
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "media",
                "file_overwrite": False,
            },
        },
    }
